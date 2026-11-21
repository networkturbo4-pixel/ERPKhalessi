<?php
/**
 * Bot Asistente de Pedidos (Proxy Seguro Google Gemini + Sincronización de Gustos)
 * GastroERP
 */
require_once __DIR__ . '/config.php';

if (!defined('GEMINI_API_KEY')) {
    $envKey = getenv('GEMINI_API_KEY');
    define('GEMINI_API_KEY', $envKey !== false ? $envKey : '');
}
if (!defined('GEMINI_MODEL')) {
    $envModel = getenv('GEMINI_MODEL');
    define('GEMINI_MODEL', ($envModel !== false && $envModel !== '') ? $envModel : 'gemini-2.5-flash');
}

$storageDir = __DIR__ . '/storage';
$prefsFile = $storageDir . '/bot_preferences.json';

function loadAllBotPrefs($file) {
    if (!file_exists($file)) return [];
    $raw = @file_get_contents($file);
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function saveAllBotPrefs($dir, $file, $data) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    @file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'prefs';
    if ($action === 'prefs') {
        $all = loadAllBotPrefs($prefsFile);
        $userKey = trim((string)($_GET['userKey'] ?? ''));
        if ($userKey !== '') {
            sendResponse(['success' => true, 'preferences' => $all[$userKey] ?? null]);
        }
        sendResponse(['success' => true, 'preferencesMap' => $all]);
    }
    sendResponse(['success' => false, 'error' => 'Acción GET no soportada'], 400);
}

if ($method !== 'POST') {
    sendResponse(['success' => false, 'error' => 'Método no permitido'], 405);
}

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);
if (!is_array($body)) {
    sendResponse(['success' => false, 'error' => 'JSON inválido'], 400);
}

$action = $body['action'] ?? 'chat';

if ($action === 'save_prefs') {
    $userKey = trim((string)($body['userKey'] ?? ''));
    $prefs = $body['preferences'] ?? null;
    if ($userKey === '' || !is_array($prefs)) {
        sendResponse(['success' => false, 'error' => 'userKey y preferences requeridos'], 400);
    }
    $all = loadAllBotPrefs($prefsFile);
    $all[$userKey] = $prefs;
    saveAllBotPrefs($storageDir, $prefsFile, $all);
    sendResponse(['success' => true]);
}

// Chat con Google Gemini
$query = trim((string)($body['query'] ?? ''));
if ($query === '') {
    sendResponse(['success' => false, 'error' => 'Consulta vacía'], 400);
}

if (GEMINI_API_KEY === '') {
    // Sin API key configurada: indicar al frontend usar el motor local sin error
    sendResponse(['success' => false, 'fallback' => true, 'reason' => 'GEMINI_API_KEY no configurada']);
}

$storeName = (string)($body['storeName'] ?? 'Gastro Restaurante');
$branchName = (string)($body['branchName'] ?? '');
$customerName = (string)($body['customerName'] ?? '');
$catalog = is_array($body['catalog'] ?? null) ? $body['catalog'] : [];
$preferences = is_array($body['preferences'] ?? null) ? $body['preferences'] : [];
$activeOrders = is_array($body['activeOrders'] ?? null) ? $body['activeOrders'] : [];

$systemPrompt = "Eres el asistente de pedidos de {$storeName}" . ($branchName !== '' ? " (Sucursal: {$branchName})" : "") . ". "
    . "Responde SIEMPRE en JSON válido con esta estructura exacta: "
    . '{"reply": "texto breve y amigable en español peruano (máx 2-3 oraciones)", "suggestedProductIds": ["id1", "id2"], "quickReplies": ["opción 1", "opción 2"], "action": null}. '
    . 'El campo "action" solo puede ser null, "start_checkout" (si el cliente quiere pagar o finalizar su compra) o "repeat_last_order" (si pide repetir su último pedido). '
    . "Solo recomienda IDs que existan en el catálogo entregado. No inventes precios ni productos.\n\n"
    . ($customerName !== '' ? "Cliente actual: {$customerName}\n" : "")
    . (!empty($preferences) ? "Gustos recordados del cliente: " . json_encode($preferences, JSON_UNESCAPED_UNICODE) . "\n" : "")
    . (!empty($activeOrders) ? "Pedidos activos del cliente: " . json_encode($activeOrders, JSON_UNESCAPED_UNICODE) . "\n" : "")
    . "Catálogo disponible: " . json_encode(array_slice($catalog, 0, 50), JSON_UNESCAPED_UNICODE);

$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode(GEMINI_MODEL) . ':generateContent?key=' . rawurlencode(GEMINI_API_KEY);

$payload = [
    'systemInstruction' => [
        'parts' => [['text' => $systemPrompt]],
    ],
    'contents' => [
        [
            'role' => 'user',
            'parts' => [['text' => $query]],
        ],
    ],
    'generationConfig' => [
        'temperature' => 0.4,
        'maxOutputTokens' => 512,
        'responseMimeType' => 'application/json',
    ],
];

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_TIMEOUT => 12,
]);

$responseRaw = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($responseRaw === false || $httpCode < 200 || $httpCode >= 300) {
    error_log('[GastroERP OrderBot Gemini] HTTP ' . $httpCode . ' ' . $curlErr);
    sendResponse(['success' => false, 'fallback' => true, 'reason' => 'Error de comunicación con Gemini']);
}

$decoded = json_decode($responseRaw, true);
$text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
$parsed = json_decode($text, true);

if (!is_array($parsed) || empty($parsed['reply'])) {
    sendResponse(['success' => false, 'fallback' => true, 'reason' => 'Respuesta no estructurada']);
}

sendResponse([
    'success' => true,
    'data' => [
        'reply' => (string)$parsed['reply'],
        'suggestedProductIds' => is_array($parsed['suggestedProductIds'] ?? null) ? $parsed['suggestedProductIds'] : [],
        'quickReplies' => is_array($parsed['quickReplies'] ?? null) ? array_slice($parsed['quickReplies'], 0, 4) : [],
        'action' => $parsed['action'] ?? null,
    ],
]);
