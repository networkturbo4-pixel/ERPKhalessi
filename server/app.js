/**
 * Khalessi Pizza ERP - Servidor Real-Time SSE & WebSocket para cPanel
 * Diseñado para alta concurrencia (hasta miles de conexiones simultáneas y 20+ sucursales)
 * Utiliza módulos nativos de Node.js (0 dependencias externas) para máxima estabilidad en cPanel.
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;
const clients = new Map(); // clientId -> { res, branchId, connectedAt }

// Limpieza periódica de clientes desconectados y Heartbeat ping cada 20 segundos
setInterval(() => {
  const pingData = `: ping ${Date.now()}\n\n`;
  for (const [clientId, client] of clients.entries()) {
    try {
      client.res.write(pingData);
    } catch (err) {
      clients.delete(clientId);
    }
  }
}, 20000);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Id, X-ERP-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Estado y Monitoreo (Health Check)
  if (pathname === '' || pathname === '/' || pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'online',
        service: 'Khalessi ERP Realtime Engine (Node.js)',
        connectedClients: clients.size,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // 2. Endpoint SSE Stream: /realtime/stream, /stream, /api/storage/stream
  if (
    pathname === '/api/storage/stream' ||
    pathname === '/stream' ||
    pathname === '/realtime/stream' ||
    pathname === '/realtime/api/storage/stream'
  ) {
    const clientId = parsedUrl.query.clientId || `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const branchId = parsedUrl.query.branchId || 'all';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Evita buffering en Nginx / LiteSpeed en cPanel
    });

    // Enviar bienvenida inmediata
    res.write(`data: ${JSON.stringify({ action: 'connected', clientId, connectedAt: new Date().toISOString() })}\n\n`);

    clients.set(clientId, { res, branchId, connectedAt: Date.now() });

    req.on('close', () => {
      clients.delete(clientId);
    });

    req.on('error', () => {
      clients.delete(clientId);
    });
    return;
  }

  // 3. Endpoint de Broadcast de Eventos: POST /realtime/broadcast, /broadcast, /api/storage/broadcast
  if (
    (pathname === '/api/storage/broadcast' ||
      pathname === '/broadcast' ||
      pathname === '/realtime/broadcast' ||
      pathname === '/realtime/api/storage/broadcast') &&
    req.method === 'POST'
  ) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.destroy(); // Límite de seguridad 5MB
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const rawMessage = `data: ${JSON.stringify(payload)}\n\n`;
        const senderId = payload.senderId;
        const targetBranch = payload.branchId;

        let delivered = 0;
        for (const [clientId, client] of clients.entries()) {
          // No hacer eco al emisor
          if (senderId && clientId === senderId) continue;

          // Si el mensaje está destinado a una sucursal específica
          if (targetBranch && targetBranch !== 'all' && client.branchId !== 'all' && client.branchId !== targetBranch) {
            continue;
          }

          try {
            client.res.write(rawMessage);
            delivered++;
          } catch (err) {
            clients.delete(clientId);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, delivered, totalClients: clients.size }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 4. Ruta no encontrada
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`[Khalessi Realtime Node.js] Servidor escuchando en el puerto ${PORT}`);
});
