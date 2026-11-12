<?php
/**
 * Proxy Server-to-Server para Factúralo PRO (docs.facturalo.pe)
 * Resuelve restricciones de CORS impuestas por navegadores al consultar DNI, RUC y emitir facturas.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-ERP-Token, X-Client-Id");
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

if (!$payload || empty($payload['targetUrl']) || !is_string($payload['targetUrl'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'targetUrl es requerido']);
    exit();
}

$targetUrl = filter_var(trim($payload['targetUrl']), FILTER_VALIDATE_URL);
$parsedUrl = $targetUrl ? parse_url($targetUrl) : false;
$scheme = strtolower((string)($parsedUrl['scheme'] ?? ''));
$host = strtolower((string)($parsedUrl['host'] ?? ''));

// Lista blanca de dominios permitidos para prevenir SSRF
$allowedSuffixes = ['facturalo.pe', 'apisperu.com', 'apis.net.pe', 'sunat.gob.pe'];
$isAllowedHost = false;
foreach ($allowedSuffixes as $suffix) {
    if ($host === $suffix || substr($host, -strlen('.' . $suffix)) === '.' . $suffix) {
        $isAllowedHost = true;
        break;
    }
}

if (!$targetUrl || $scheme !== 'https' || !$isAllowedHost) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'URL de destino no permitida por política de seguridad (solo HTTPS Factúralo/SUNAT)']);
    exit();
}

// Bloquear resolución a IPs privadas o de loopback
$resolvedIp = gethostbyname($host);
if ($resolvedIp && filter_var($resolvedIp, FILTER_VALIDATE_IP)) {
    if (!filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Destino interno bloqueado']);
        exit();
    }
}

$method = strtoupper((string)($payload['method'] ?? 'GET'));
if (!in_array($method, ['GET', 'POST', 'PUT'], true)) {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método HTTP inválido']);
    exit();
}

$headersIn = is_array($payload['headers'] ?? null) ? $payload['headers'] : [];

// Para operaciones de emisión/escritura (POST/PUT), exigir token ERP o llave de API Factúralo
if ($method !== 'GET') {
    $erpToken = requestToken();
    $hasErpSession = verifyToken($erpToken) !== null;
    $hasFacturaloAuth = !empty($headersIn['Authorization']) || !empty($headersIn['authorization']);
    if (!$hasErpSession && !$hasFacturaloAuth) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'No autorizado para emitir documentos']);
        exit();
    }
}

$body = isset($payload['body']) ? (is_string($payload['body']) ? $payload['body'] : json_encode($payload['body'])) : null;

$curlHeaders = [];
foreach ($headersIn as $k => $v) {
    if (!is_string($k) || (!is_string($v) && !is_numeric($v))) continue;
    $cleanK = preg_replace('/[^A-Za-z0-9\-]/', '', $k);
    $cleanV = preg_replace('/[\r\n]/', '', (string)$v);
    if ($cleanK !== '') {
        $curlHeaders[] = "$cleanK: $cleanV";
    }
}

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

if ($body && ($method === 'POST' || $method === 'PUT')) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Error de conexión cURL: ' . $curlError]);
    exit();
}

$parsed = json_decode($response, true);
echo json_encode([
    'ok' => ($httpCode >= 200 && $httpCode < 300),
    'status' => $httpCode,
    'data' => $parsed !== null ? $parsed : $response
]);
