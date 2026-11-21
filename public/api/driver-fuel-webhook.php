<?php
/**
 * Webhook de Gastos de Combustible para Motorizados
 * POST /api/driver-fuel-webhook.php
 *
 * Autenticación:
 *  - Header `X-Webhook-Secret: <DRIVER_WEBHOOK_SECRET>` (definido en config.local.php), o
 *  - Token ERP válido (`Authorization: Bearer <token>`).
 *
 * Acepta JSON estructurado o texto corto (ej. WhatsApp / n8n / Make):
 *  { "text": "gasolina 30 ruta", "phone": "51999888777", "tenantId": "tenant-1" }
 *  { "amount": 30, "driverId": "usr-4", "driverName": "Carlos", "source": "caja_chica" }
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

const KH_FUEL_WEBHOOK_KEY = 'gastro_delivery_fuel_v1';

$pdo = getDbConnection();
kvInit($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'error' => 'Método no permitido. Usa POST.'], 405);
}

// 1. Validar autenticación (secreto de webhook o token ERP)
$configuredSecret = defined('DRIVER_WEBHOOK_SECRET') ? trim((string)constant('DRIVER_WEBHOOK_SECRET')) : '';
$headerSecret = isset($_SERVER['HTTP_X_WEBHOOK_SECRET']) ? trim((string)$_SERVER['HTTP_X_WEBHOOK_SECRET']) : '';
$querySecret = isset($_GET['secret']) ? trim((string)$_GET['secret']) : '';
$providedSecret = $headerSecret !== '' ? $headerSecret : $querySecret;

$token = requestToken();
$admin = $token !== '' ? verifyToken($token) : null;

$authorizedBySecret = $configuredSecret !== '' && $providedSecret !== '' && hash_equals($configuredSecret, $providedSecret);
if (!$authorizedBySecret && $admin === null) {
    sendResponse(['success' => false, 'error' => 'No autorizado. Configura DRIVER_WEBHOOK_SECRET o envía un token válido.'], 401);
}

/**
 * Envía una respuesta al chat de Telegram si TELEGRAM_BOT_TOKEN está configurado.
 */
function sendTelegramReply(string $chatId, string $text): void {
    $botToken = defined('TELEGRAM_BOT_TOKEN') ? trim((string)constant('TELEGRAM_BOT_TOKEN')) : '';
    if ($botToken === '' || $chatId === '' || $text === '') {
        return;
    }
    $url = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
    $payload = json_encode([
        'chat_id' => $chatId,
        'text'    => $text,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => 5,
        ]);
        @curl_exec($ch);
        @curl_close($ch);
    } else {
        $ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 5,
            ],
        ]);
        @file_get_contents($url, false, $ctx);
    }
}

// 2. Leer payload JSON, form-urlencoded o actualización nativa de Telegram Bot API
$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody, true);
if (!is_array($input)) {
    $input = $_POST;
}
if (!is_array($input) || empty($input)) {
    sendResponse(['success' => false, 'error' => 'Payload vacío o inválido'], 400);
}

$telegramChatId = '';
$telegramDriverId = '';
$telegramDriverName = '';

if (isset($input['message']) && is_array($input['message'])) {
    $tgMsg = $input['message'];
    $telegramChatId = isset($tgMsg['chat']['id']) ? (string)$tgMsg['chat']['id'] : '';
    $rawText = isset($tgMsg['text']) && is_string($tgMsg['text']) ? trim($tgMsg['text']) : '';
    $from = is_array($tgMsg['from'] ?? null) ? $tgMsg['from'] : [];
    if (isset($from['id'])) {
        $telegramDriverId = 'tg-' . (string)$from['id'];
    }
    $first = trim((string)($from['first_name'] ?? ''));
    $last = trim((string)($from['last_name'] ?? ''));
    $telegramDriverName = trim($first . ' ' . $last);
    if ($telegramDriverName === '' && !empty($from['username'])) {
        $telegramDriverName = '@' . trim((string)$from['username']);
    }
} else {
    $rawText = '';
    foreach (['text', 'message', 'body'] as $textKey) {
        if (isset($input[$textKey]) && is_string($input[$textKey]) && trim($input[$textKey]) !== '') {
            $rawText = trim($input[$textKey]);
            break;
        }
    }
}

if ($telegramChatId !== '' && ($rawText === '/start' || $rawText === '/ayuda' || $rawText === '/help')) {
    $helpMsg = "Hola {$telegramDriverName}! Para registrar tu gasolina envía:\n• gasolina 30 (si salió de caja chica)\n• gasolina 30 ruta (si lo pagaste del efectivo cobrado)";
    sendTelegramReply($telegramChatId, $helpMsg);
    sendResponse(['success' => true, 'replyText' => $helpMsg]);
}

// 3. Extraer monto (explícito o desde texto tipo "gasolina 30 ruta")
$amount = 0.0;
if (isset($input['amount']) && is_numeric($input['amount'])) {
    $amount = round(floatval($input['amount']), 2);
} elseif ($rawText !== '' && preg_match('/(\d+(?:[.,]\d{1,2})?)/', $rawText, $m)) {
    $amount = round(floatval(str_replace(',', '.', $m[1])), 2);
}

if ($amount <= 0) {
    if ($telegramChatId !== '') {
        $errMsg = 'No detecté un monto válido. Ejemplo: "gasolina 30" o "gasolina 25 ruta".';
        sendTelegramReply($telegramChatId, $errMsg);
        sendResponse(['success' => false, 'error' => $errMsg]);
    }
    sendResponse(['success' => false, 'error' => 'No se detectó un monto válido mayor a 0'], 400);
}

// 4. Determinar fuente de pago ('caja_chica' | 'efectivo_ruta')
$source = isset($input['source']) && is_string($input['source']) ? trim($input['source']) : '';
if ($source !== 'caja_chica' && $source !== 'efectivo_ruta') {
    if ($rawText !== '' && preg_match('/\b(ruta|bolsillo|cobrado|propio)\b/i', $rawText)) {
        $source = 'efectivo_ruta';
    } else {
        $source = 'caja_chica';
    }
}

// 5. Resolver motorizado por driverId, teléfono o nombre usando RBAC/HR almacenado
$driverId = isset($input['driverId']) && is_string($input['driverId']) ? trim($input['driverId']) : '';
$driverName = isset($input['driverName']) && is_string($input['driverName']) ? trim($input['driverName']) : '';
$phone = isset($input['phone']) && is_string($input['phone']) ? preg_replace('/\D/', '', $input['phone']) : '';
$tenantId = isset($input['tenantId']) && is_string($input['tenantId']) && trim($input['tenantId']) !== ''
    ? substr(trim($input['tenantId']), 0, 64)
    : '';

if ($driverId === '' && $phone !== '') {
    $hrRaw = kvGet($pdo, 'gastro_erp_hr_v1');
    if ($hrRaw !== null) {
        $hrData = json_decode($hrRaw, true);
        $profiles = is_array($hrData['profiles'] ?? null) ? $hrData['profiles'] : [];
        foreach ($profiles as $uid => $profile) {
            if (!is_array($profile)) continue;
            $pPhone = preg_replace('/\D/', '', (string)($profile['phone'] ?? ''));
            if ($pPhone !== '' && (substr($phone, -9) === substr($pPhone, -9))) {
                $driverId = (string)($profile['userId'] ?? $uid);
                if ($driverName === '' && !empty($profile['fullName'])) {
                    $driverName = (string)$profile['fullName'];
                }
                break;
            }
        }
    }
}

if ($driverId === '' && $telegramDriverId !== '') {
    $driverId = $telegramDriverId;
    if ($driverName === '' && $telegramDriverName !== '') {
        $driverName = $telegramDriverName;
    }
}

if ($driverId === '' && $admin !== null) {
    $driverId = (string)($admin['id'] ?? $admin['sub'] ?? $admin['username'] ?? '');
    if ($driverName === '') {
        $driverName = (string)($admin['name'] ?? $admin['username'] ?? 'Motorizado');
    }
}

if ($driverId === '') {
    $driverId = $phone !== '' ? ('wa-' . substr($phone, -9)) : 'driver-webhook';
}
if ($driverName === '') {
    $driverName = $phone !== '' ? ('Motorizado ' . substr($phone, -4)) : 'Motorizado';
}
if ($tenantId === '') {
    $tenantId = 'tenant-1';
}

$note = isset($input['note']) && is_string($input['note']) && trim($input['note']) !== ''
    ? substr(trim($input['note']), 0, 240)
    : ($rawText !== '' ? substr('Webhook: ' . $rawText, 0, 240) : 'Recarga vía webhook');

$entry = [
    'id'         => 'fuel-' . bin2hex(random_bytes(6)),
    'driverId'   => substr($driverId, 0, 64),
    'driverName' => substr($driverName, 0, 120),
    'tenantId'   => $tenantId,
    'amount'     => $amount,
    'source'     => $source,
    'note'       => $note,
    'createdAt'  => gmdate('c'),
];

if (isset($input['odometerKm']) && is_numeric($input['odometerKm'])) {
    $entry['odometerKm'] = max(0, floatval($input['odometerKm']));
}

// 6. Guardar en kv_storage y calcular acumulado del día para el motorizado
$rawList = kvGet($pdo, KH_FUEL_WEBHOOK_KEY);
$entries = $rawList ? json_decode($rawList, true) : [];
if (!is_array($entries)) {
    $entries = [];
}

array_unshift($entries, $entry);
if (count($entries) > 1000) {
    $entries = array_slice($entries, 0, 1000);
}

kvSet($pdo, KH_FUEL_WEBHOOK_KEY, json_encode(array_values($entries), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

$todayPrefix = substr($entry['createdAt'], 0, 10);
$todayDriverTotal = 0.0;
foreach ($entries as $item) {
    if (!is_array($item)) continue;
    if (($item['driverId'] ?? '') === $entry['driverId'] && substr((string)($item['createdAt'] ?? ''), 0, 10) === $todayPrefix) {
        $todayDriverTotal += floatval($item['amount'] ?? 0);
    }
}

$replyText = sprintf(
    'Combustible registrado: S/ %.2f (%s). Acumulado hoy para %s: S/ %.2f.',
    $entry['amount'],
    $entry['source'] === 'efectivo_ruta' ? 'Efectivo de ruta' : 'Caja chica',
    $entry['driverName'],
    $todayDriverTotal
);

if ($telegramChatId !== '') {
    sendTelegramReply($telegramChatId, $replyText);
}

sendResponse([
    'success'          => true,
    'data'             => $entry,
    'todayDriverTotal' => round($todayDriverTotal, 2),
    'replyText'        => $replyText,
]);
