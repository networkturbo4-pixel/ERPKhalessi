/**
 * Khalessi Pizza ERP - Servidor Real-Time SSE para cPanel
 * Diseñado para alta concurrencia (20+ sucursales y miles de pantallas)
 * Cero dependencias externas.
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;
const clients = new Map(); // clientId -> { res, branchId, connectedAt }

// Heartbeat cada 20 segundos
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
  const pathname = (parsedUrl.pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';

  // Cabeceras CORS globales
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Id, X-ERP-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. CANAL SSE STREAMING: Cualquier URL que termine o contenga "stream"
  if (pathname.includes('stream')) {
    const clientId = parsedUrl.query.clientId || `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const branchId = parsedUrl.query.branchId || 'all';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Vital para evitar buffering en Nginx/LiteSpeed cPanel
    });

    // Enviar frame de conexión
    res.write(`data: ${JSON.stringify({ action: 'connected', clientId, connectedAt: new Date().toISOString() })}\n\n`);

    clients.set(clientId, { res, branchId, connectedAt: Date.now() });

    req.on('close', () => clients.delete(clientId));
    req.on('error', () => clients.delete(clientId));
    return;
  }

  // 2. BROADCAST DE EVENTOS: Cualquier POST que contenga "broadcast"
  if (pathname.includes('broadcast') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.destroy();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
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
          } catch (err) {
            clients.delete(clientId);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, delivered, totalClients: clients.size }));
      } catch (err) {
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

server.listen(PORT, () => {
  console.log(`[Khalessi Realtime Node.js] Escuchando en puerto ${PORT}`);
});
