/**
 * Khalessi Pizza ERP - Servidor Real-Time SSE para cPanel
 * Diseñado para alta concurrencia (20+ sucursales y miles de pantallas)
 * Cero dependencias externas.
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');

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

  // 3. ESTADO Y HEALTH CHECK: Cualquier otra consulta GET
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify(
      {
        status: 'online',
        service: 'Khalessi ERP Realtime Engine (Node.js)',
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
  console.error('[Khalessi Realtime Node.js] Server error:', err);
});

process.on('uncaughtException', err => {
  console.error('[Khalessi Realtime Node.js] Uncaught exception:', err);
});

process.on('unhandledRejection', reason => {
  console.error('[Khalessi Realtime Node.js] Unhandled rejection:', reason);
});

server.listen(PORT, () => {
  console.log(`[Khalessi Realtime Node.js] Escuchando en puerto ${PORT}`);
});
