<?php
/**
 * Almacenamiento compartido (reemplaza al plugin de Vite en producción).
 *   GET    /api/storage            -> registro clave/valor (público: solo datos de la tienda, sin secretos)
 *   GET    /api/storage/{key}      -> {data: "..."}
 *   POST   /api/storage/{key}      -> guarda (solo administradores con token)
 *   DELETE /api/storage/{key}      -> elimina (solo administradores con token)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

$pdo = getDbConnection();
kvInit($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$key = isset($_GET['key']) ? urldecode((string)$_GET['key']) : null;

$token = requestToken();
$admin = $token !== '' ? verifyToken($token) : null;

header('Cache-Control: no-store');

function readableFor(string $k, bool $isAdmin): bool {
    if (!in_array($k, KH_SYNC_KEYS, true)) return false;
    return $isAdmin || in_array($k, KH_PUBLIC_READ_KEYS, true);
}

function valueFor(string $k, string $v, bool $isAdmin): string {
    if (!$isAdmin && $k === KH_SETTINGS_KEY) return sanitizeSettingsForPublic($v);
    return $v;
}

if ($method === 'GET') {
    if ($key === null) {
        $out = [];
        foreach (KH_SYNC_KEYS as $k) {
            if (!readableFor($k, $admin !== null)) continue;
            $v = kvGet($pdo, $k);
            if ($v !== null) $out[$k] = valueFor($k, $v, $admin !== null);
        }
        $body = json_encode($out === [] ? new stdClass() : $out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $hash = md5(($admin ? 'a' : 'p') . $body);
        header('X-Content-Hash: ' . $hash);
        if (isset($_GET['h']) && hash_equals($hash, (string)$_GET['h'])) {
            echo json_encode(['unchanged' => true]);
            exit();
        }
        echo $body;
        exit();
    }

    if (!validKey($key) || !readableFor($key, $admin !== null)) {
        sendResponse(['error' => 'Not found'], 404);
    }
    $v = kvGet($pdo, $key);
    if ($v === null) sendResponse(['error' => 'Not found'], 404);
    sendResponse(['data' => valueFor($key, $v, $admin !== null)]);
}

if ($method === 'POST' || $method === 'DELETE') {
    // Token enviado pero inválido/vencido: el cliente debe volver a iniciar sesión
    if ($token !== '' && $admin === null) {
        sendResponse(['error' => 'Token inválido o vencido'], 401);
    }
    // Visitantes anónimos (tienda): se acepta y se ignora, sin generar reintentos
    if ($admin === null || !validKey($key) || !in_array($key, KH_SYNC_KEYS, true)) {
        sendResponse(['success' => true, 'ignored' => true]);
    }

    if ($method === 'DELETE') {
        kvDelete($pdo, $key);
        sendResponse(['success' => true]);
    }

    $raw = file_get_contents('php://input');
    if (strlen($raw) > 16 * 1024 * 1024) {
        sendResponse(['error' => 'Payload demasiado grande'], 413);
    }
    $input = json_decode($raw, true);
    if (!is_array($input) || !isset($input['data'])) {
        sendResponse(['error' => 'Cuerpo JSON inválido'], 400);
    }
    $data = is_string($input['data']) ? $input['data'] : json_encode($input['data'], JSON_UNESCAPED_UNICODE);
    kvSet($pdo, $key, $data);

    // Notificar al motor Node.js SSE si está encendido en cPanel
    @file_get_contents('http://127.0.0.1:3000/broadcast', false, stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n",
            'content' => json_encode(['action' => 'set', 'key' => $key]),
            'timeout' => 0.1
        ]
    ]));

    sendResponse(['success' => true]);
}

sendResponse(['error' => 'Método no permitido'], 405);
