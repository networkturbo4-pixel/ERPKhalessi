/**
 * GastroERP - Servidor Real-Time SSE para cPanel
 * Diseñado para alta concurrencia (20+ sucursales y miles de pantallas)
 * Cero dependencias externas.
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { handleWhatsAppRoute } = require('./whatsappEngine');

// Carga configuración generada por el instalador (server/config.json) si existe
try {
  const localCfgPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(localCfgPath)) {
    const localCfg = JSON.parse(fs.readFileSync(localCfgPath, 'utf8'));
    if (localCfg && typeof localCfg === 'object') {
      for (const [k, v] of Object.entries(localCfg)) {
        if (v !== undefined && v !== null && v !== '' && !process.env[k]) {
          process.env[k] = String(v);
        }
      }
    }
  }
} catch (err) {
  console.warn('[GastroERP Realtime Node.js] No se pudo leer server/config.json:', err.message);
}

const PORT = process.env.PORT || 3000;
const MAX_CLIENTS = Number.parseInt(process.env.ERP_MAX_SSE_CLIENTS || '2000', 10);
const MAX_CLIENTS_PER_IP = Number.parseInt(process.env.ERP_MAX_SSE_PER_IP || '30', 10);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQ = Number.parseInt(process.env.ERP_RATE_LIMIT_PER_MIN || '120', 10);
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const RAW_ALLOWED_ORIGIN = String(process.env.CORS_ALLOWED_ORIGIN || '').trim();
const ALLOWED_ORIGINS = RAW_ALLOWED_ORIGIN
  ? RAW_ALLOWED_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const clients = new Map(); // clientId -> { res, branchId, ip, connectedAt }
const ipRateWindows = new Map(); // ip -> { count, resetAt }
const driverFleetMap = new Map(); // driverId -> { driverId, driverName, tenantId, lat, lng, heading, speedKmh, accuracyM, batteryPct, status, activeOrderId, timestamp }
const driverTrailsMap = new Map(); // driverId -> Array<{ lat, lng, speedKmh, heading, status, orderId, timestamp }>

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim().slice(0, 64);
  }
  return String(req.socket?.remoteAddress || 'unknown').slice(0, 64);
}

function isLocalIp(ip) {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function isRateLimited(ip) {
  if (isLocalIp(ip)) return false;
  const now = Date.now();
  const entry = ipRateWindows.get(ip);
  if (!entry || now >= entry.resetAt) {
    ipRateWindows.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQ;
}

function countClientsForIp(ip) {
  let count = 0;
  for (const client of clients.values()) {
    if (client.ip === ip) count += 1;
  }
  return count;
}

function resolveAllowedCorsOrigin(req) {
  const reqOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  if (ALLOWED_ORIGINS.includes('*')) {
    return '*';
  }
  if (ALLOWED_ORIGINS.length > 0) {
    return reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : '';
  }
  // Sin CORS_ALLOWED_ORIGIN explícito: permitir únicamente mismo origen (host == origin host)
  if (reqOrigin && req.headers.host) {
    try {
      const originHost = new URL(reqOrigin).host;
      if (originHost === req.headers.host) {
        return reqOrigin;
      }
    } catch {
      return '';
    }
  }
  return '';
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}

function safeTokenEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || b.length === 0) {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Heartbeat cada 20 segundos y limpieza de ventanas de rate limit expiradas
const heartbeatTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRateWindows.entries()) {
    if (now >= entry.resetAt) {
      ipRateWindows.delete(ip);
    }
  }
  const pingData = `: ping ${now}\n\n`;
  for (const [clientId, client] of clients.entries()) {
    try {
      client.res.write(pingData);
    } catch  {
      clients.delete(clientId);
    }
  }
}, 20000);
heartbeatTimer.unref();

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url || '/', true);
  const pathname = (parsedUrl.pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  const apiPathname = pathname.startsWith('/realtime/api/')
    ? pathname.slice('/realtime'.length)
    : pathname;
  const clientIp = getClientIp(req);

  // Cabeceras de seguridad y CORS restrictivo
  applySecurityHeaders(res);
  const corsOrigin = resolveAllowedCorsOrigin(req);
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    if (corsOrigin !== '*') {
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Id, X-ERP-Token');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const isBroadcastRoute = (pathname === '/broadcast' || pathname === '/realtime/broadcast') && req.method === 'POST';
  if (!isBroadcastRoute && isRateLimited(clientIp)) {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
    res.end(JSON.stringify({ success: false, error: 'Too many requests' }));
    return;
  }

  // 1. CANAL SSE STREAMING (rutas exactas)
  if ((pathname === '/stream' || pathname === '/realtime/stream') && req.method === 'GET') {
    const streamTokenSecret = String(
      process.env.ERP_STREAM_TOKEN ||
      (process.env.ERP_SSE_REQUIRE_TOKEN === 'true' ? process.env.ERP_REALTIME_SECRET || '' : '')
    ).trim();
    if (streamTokenSecret) {
      const providedStreamToken = String(
        parsedUrl.query.token || req.headers['x-erp-token'] || req.headers['authorization'] || ''
      )
        .replace(/^Bearer\s+/i, '')
        .trim();
      if (!safeTokenEquals(providedStreamToken, streamTokenSecret)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized SSE stream' }));
        return;
      }
    }

    if (clients.size >= MAX_CLIENTS || countClientsForIp(clientIp) >= MAX_CLIENTS_PER_IP) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Too many active SSE connections' }));
      return;
    }

    const rawClientId = String(parsedUrl.query.clientId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    const clientId = rawClientId || `cli_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const branchId = String(parsedUrl.query.branchId || 'all').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'all';

    // Cerrar conexión anterior si el mismo clientId se reconecta
    const existingClient = clients.get(clientId);
    if (existingClient) {
      try {
        existingClient.res.end();
      } catch {
        // ignore
      }
      clients.delete(clientId);
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Vital para evitar buffering en Nginx/LiteSpeed cPanel
    });

    // Enviar frame de conexión
    res.write(`data: ${JSON.stringify({ action: 'connected', clientId, connectedAt: new Date().toISOString() })}\n\n`);

    clients.set(clientId, { res, branchId, ip: clientIp, connectedAt: Date.now() });

    const cleanup = () => {
      const current = clients.get(clientId);
      if (current && current.res === res) {
        clients.delete(clientId);
      }
    };
    req.on('close', cleanup);
    req.on('error', cleanup);
    res.on('error', cleanup);
    return;
  }

  // 2. BROADCAST DE EVENTOS (rutas exactas, secreto obligatorio)
  if ((pathname === '/broadcast' || pathname === '/realtime/broadcast') && req.method === 'POST') {
    const sharedSecret = String(process.env.ERP_REALTIME_SECRET || '').trim();
    if (!sharedSecret) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Realtime broadcast secret not configured' }));
      return;
    }

    const providedToken = String(req.headers['x-erp-token'] || req.headers['authorization'] || '')
      .replace(/^Bearer\s+/i, '')
      .trim();
    if (!safeTokenEquals(providedToken, sharedSecret)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized realtime broadcast' }));
      return;
    }

    const chunks = [];
    let totalBytes = 0;
    let aborted = false;

    req.on('data', chunk => {
      if (aborted) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload Too Large (max 5MB)' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (aborted) return;
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(body || '{}');
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid payload object' }));
          return;
        }

        const rawMessage = `data: ${JSON.stringify(payload)}\n\n`;
        const senderId = payload.senderId;
        const targetBranch = payload.branchId;

        let delivered = 0;
        for (const [clientId, client] of clients.entries()) {
          if (senderId && clientId === senderId) continue;
          if (targetBranch && targetBranch !== 'all' && client.branchId !== 'all' && client.branchId !== targetBranch) {
            continue;
          }
          try {
            client.res.write(rawMessage);
            delivered++;
          } catch  {
            clients.delete(clientId);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, delivered, totalClients: clients.size }));
      } catch  {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 2B. CULQI TOKENIZATION: Guardar tarjeta (Customer + Card)
  if (apiPathname === '/api/culqi/save-card' && req.method === 'POST') {
    const chunks = [];
    let bodyBytes = 0;
    let aborted = false;

    req.on('data', chunk => {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload too large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', async () => {
      if (aborted) return;
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const secretKey = String(process.env.CULQI_SECRET_KEY || '').trim();
        if (!secretKey) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, reason: 'missing_secret_key' }));
          return;
        }

        const {
          email,
          firstName = 'Cliente',
          lastName = 'Gastro',
          phoneNumber = '999999999',
          address = 'Lima, Peru',
          addressCity = 'Lima',
          countryCode = 'PE',
          tokenId,
          existingCustomerId,
        } = payload;

        if (!email || !tokenId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'email y tokenId son requeridos' }));
          return;
        }

        let customerId = existingCustomerId || '';
        if (!customerId) {
          const custResp = await fetch('https://api.culqi.com/v2/customers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${secretKey}`,
            },
            body: JSON.stringify({
              first_name: String(firstName).slice(0, 50),
              last_name: String(lastName).slice(0, 50),
              email: String(email).trim(),
              address: String(address).slice(0, 100),
              address_city: String(addressCity).slice(0, 30),
              country_code: countryCode,
              phone_number: String(phoneNumber).replace(/\D/g, '').slice(-9) || '999999999',
            }),
          });
          const custData = await custResp.json();
          if (!custResp.ok || !custData?.id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: custData?.user_message || custData?.merchant_message || 'Error al crear cliente en Culqi' }));
            return;
          }
          customerId = custData.id;
        }

        const cardResp = await fetch('https://api.culqi.com/v2/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secretKey}`,
          },
          body: JSON.stringify({
            customer_id: customerId,
            token_id: tokenId,
          }),
        });
        const cardData = await cardResp.json();
        if (!cardResp.ok || !cardData?.id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: cardData?.user_message || cardData?.merchant_message || 'Error al guardar tarjeta en Culqi' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            mode: 'live_culqi',
            customerId,
            cardId: cardData.id,
            brand: cardData?.source?.iin?.card_brand || undefined,
            last4: cardData?.source?.last_four || undefined,
          })
        );
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Error interno en Culqi save-card' }));
      }
    });
    return;
  }

  // 2C. CULQI ONE-CLICK CHARGE: Cobrar con tarjeta guardada (crd_...)
  if (apiPathname === '/api/culqi/charge-saved' && req.method === 'POST') {
    const chunks = [];
    let bodyBytes = 0;
    let aborted = false;

    req.on('data', chunk => {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload too large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', async () => {
      if (aborted) return;
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const secretKey = String(process.env.CULQI_SECRET_KEY || '').trim();
        if (!secretKey) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, reason: 'missing_secret_key' }));
          return;
        }

        const { amountCents, currencyCode = 'PEN', email, sourceId, description = 'Pedido Gastro Restaurante' } = payload;
        if (!amountCents || !email || !sourceId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'amountCents, email y sourceId son requeridos' }));
          return;
        }

        const chargeResp = await fetch('https://api.culqi.com/v2/charges', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secretKey}`,
          },
          body: JSON.stringify({
            amount: Number(amountCents),
            currency_code: currencyCode,
            email: String(email).trim(),
            source_id: String(sourceId).trim(),
            description: String(description).slice(0, 80),
          }),
        });
        const chargeData = await chargeResp.json();
        if (!chargeResp.ok || !chargeData?.id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: chargeData?.user_message || chargeData?.merchant_message || 'Cargo rechazado por Culqi' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            chargeId: chargeData.id,
            referenceCode: chargeData.reference_code || chargeData.id,
          })
        );
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Error interno en Culqi charge-saved' }));
      }
    });
    return;
  }

  // 2D. WHATSAPP CLOUD API (Meta Webhook, Chatbot Engine & Tracking)
  if (apiPathname.startsWith('/api/whatsapp/')) {
    const broadcastSseEvent = (payload) => {
      const rawMessage = `data: ${JSON.stringify(payload)}\n\n`;
      const targetBranch = payload.branchId;
      for (const [clientId, client] of clients.entries()) {
        if (targetBranch && targetBranch !== 'all' && client.branchId !== 'all' && client.branchId !== targetBranch) {
          continue;
        }
        try {
          client.res.write(rawMessage);
        } catch {
          clients.delete(clientId);
        }
      }
    };
    Promise.resolve(handleWhatsAppRoute(req, res, parsedUrl, apiPathname, MAX_BODY_BYTES, broadcastSseEvent)).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'WhatsApp route error' }));
      }
    });
    return;
  }

  // 2E. DELIVERY REAL-TIME GPS TRACKING & FLEET
  if (apiPathname === '/api/delivery/location' && req.method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk;
      if (rawBody.length > MAX_BODY_BYTES) req.destroy();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(rawBody || '{}');
        if (!data.driverId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'driverId required' }));
          return;
        }
        const nowIso = data.timestamp || new Date().toISOString();
        const ping = {
          driverId: String(data.driverId),
          driverName: String(data.driverName || 'Motorizado'),
          tenantId: String(data.tenantId || 'tenant-1'),
          lat: Number(data.lat),
          lng: Number(data.lng),
          heading: data.heading !== undefined ? Number(data.heading) : undefined,
          speedKmh: data.speedKmh !== undefined ? Number(data.speedKmh) : undefined,
          accuracyM: data.accuracyM !== undefined ? Number(data.accuracyM) : undefined,
          batteryPct: data.batteryPct !== undefined ? Number(data.batteryPct) : undefined,
          status: String(data.status || 'disponible'),
          activeOrderId: data.activeOrderId ? String(data.activeOrderId) : undefined,
          timestamp: nowIso,
        };
        driverFleetMap.set(ping.driverId, ping);
        if (Number.isFinite(ping.lat) && Number.isFinite(ping.lng)) {
          const prevTrail = driverTrailsMap.get(ping.driverId) || [];
          const nextTrail = [
            ...prevTrail.slice(-499),
            {
              lat: ping.lat,
              lng: ping.lng,
              speedKmh: ping.speedKmh,
              heading: ping.heading,
              status: ping.status,
              orderId: ping.activeOrderId,
              timestamp: nowIso,
            },
          ];
          driverTrailsMap.set(ping.driverId, nextTrail);
        }

        const ssePayload = `data: ${JSON.stringify({
          type: 'driver_location_update',
          branchId: ping.tenantId,
          ping,
        })}\n\n`;
        for (const [clientId, client] of clients.entries()) {
          if (client.branchId !== 'all' && ping.tenantId !== 'all' && client.branchId !== ping.tenantId) {
            continue;
          }
          try {
            client.res.write(ssePayload);
          } catch {
            clients.delete(clientId);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, ping }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Invalid JSON' }));
      }
    });
    return;
  }

  if (apiPathname === '/api/delivery/fleet' && req.method === 'GET') {
    const branchFilter = parsedUrl.query?.branchId || 'all';
    const driverFilter = parsedUrl.query?.driverId || '';
    const drivers = [];
    for (const d of driverFleetMap.values()) {
      if (branchFilter !== 'all' && d.tenantId !== branchFilter && d.tenantId !== 'all') continue;
      if (driverFilter && d.driverId !== driverFilter) continue;
      drivers.push(d);
    }
    const trails = {};
    if (driverFilter) {
      trails[driverFilter] = driverTrailsMap.get(driverFilter) || [];
    } else {
      for (const d of drivers) {
        trails[d.driverId] = driverTrailsMap.get(d.driverId) || [];
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, drivers, trails, timestamp: new Date().toISOString() }));
    return;
  }

  // 3. ESTADO Y HEALTH CHECK: Cualquier otra consulta GET
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify(
      {
        status: 'online',
        service: 'GastroERP Realtime Engine (Node.js)',
        connectedClients: clients.size,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        pathRequested: pathname,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
});

server.on('error', err => {
  console.error('[GastroERP Realtime Node.js] Server error:', err);
});

process.on('uncaughtException', err => {
  console.error('[GastroERP Realtime Node.js] Uncaught exception:', err);
});

process.on('unhandledRejection', reason => {
  console.error('[GastroERP Realtime Node.js] Unhandled rejection:', reason);
});

server.listen(PORT, () => {
  console.log(`[GastroERP Realtime Node.js] Escuchando en puerto ${PORT}`);
});
