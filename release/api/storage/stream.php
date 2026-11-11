<?php
/**
 * Endpoint de Server-Sent Events (SSE) para Apache / cPanel
 * /api/storage/stream
 */

header('Content-Type: text/event-stream; charset=UTF-8');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Nginx / LiteSpeed reverse-proxy

// Enviar frame inicial de bienvenida para confirmar MIME text/event-stream
echo ": ping\n\n";
echo "data: " . json_encode(['action' => 'connected', 'timestamp' => time()]) . "\n\n";

if (ob_get_level() > 0) {
    ob_flush();
}
flush();
exit();
