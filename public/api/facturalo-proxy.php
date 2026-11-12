<?php
/**
 * Proxy Server-to-Server para Factúralo PRO (docs.facturalo.pe)
 * Resuelve restricciones de CORS impuestas por navegadores al consultar DNI, RUC y emitir facturas.
 */
require_once __DIR__ . '/config.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit();
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!$payload || empty($payload['targetUrl'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'targetUrl es requerido']);
    exit();
}

$targetUrl = filter_var($payload['targetUrl'], FILTER_VALIDATE_URL);
if (!$targetUrl) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'targetUrl inválido']);
    exit();
}

$method = strtoupper($payload['method'] ?? 'GET');
$headersIn = $payload['headers'] ?? [];
$body = isset($payload['body']) ? (is_string($payload['body']) ? $payload['body'] : json_encode($payload['body'])) : null;

$curlHeaders = [];
foreach ($headersIn as $k => $v) {
    $curlHeaders[] = "$k: $v";
}

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

if ($body && ($method === 'POST' || $method === 'PUT')) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error de conexión cURL: ' . $curlError]);
    exit();
}

$parsed = json_decode($response, true);
echo json_encode([
    'ok' => ($httpCode >= 200 && $httpCode < 300),
    'status' => $httpCode,
    'data' => $parsed !== null ? $parsed : $response
]);
