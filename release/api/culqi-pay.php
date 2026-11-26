<?php
/**
 * Pasarela de Pago Culqi (Cobro directo por Enlace de Pedido + Webhook oficial de Culqi)
 * - POST /api/culqi-pay.php           -> Cobra token Culqi (sk_test_/sk_live_) o valida sandbox,
 *                                        marca el pedido como 'pagado' en kh_orders_list,
 *                                        emite SSE a Cocina KDS / POS / Bandeja y notifica por WhatsApp.
 * - POST /api/culqi-pay.php?webhook=1 -> Recibe eventos webhook de Culqi (charge.creation.succeeded,
 *                                        order.status.changed) para confirmar pagos asincronos.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

header('Cache-Control: no-store, no-cache, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['ok' => false, 'error' => 'Metodo no permitido'], 405);
}

$pdo = getDbConnection();
kvInit($pdo);

$rawBody = file_get_contents('php://input');
$payload = json_decode((string)$rawBody, true);
if (!is_array($payload)) {
    sendResponse(['ok' => false, 'error' => 'JSON invalido'], 400);
}

/**
 * Difunde el cambio de clave al bus SSE local/Node.
 */
function notifyRealtimeBus(string $key, string $type = 'new_order'): void {
    $secret = defined('ERP_REALTIME_SECRET')
        ? (string)ERP_REALTIME_SECRET
        : (string)(getenv('ERP_REALTIME_SECRET') ?: '');
    $targets = [];
    if (!empty($_SERVER['HTTP_HOST'])) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $targets[] = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/realtime/broadcast';
    }
    $targets[] = 'http://127.0.0.1:3000/broadcast';
    $targets[] = 'http://127.0.0.1:3000/realtime/broadcast';
    $targets[] = 'http://127.0.0.1:3001/broadcast';

    $body = json_encode([
        'key'       => $key,
        'action'    => 'set',
        'large'     => true,
        'eventHint' => $type,
        'type'      => $type,
        'ts'        => round(microtime(true) * 1000),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $curlHeaders = ['Content-Type: application/json'];
    $streamHeaders = "Content-Type: application/json\r\n";
    if ($secret !== '') {
        $curlHeaders[] = 'X-ERP-Token: ' . $secret;
        $streamHeaders .= "X-ERP-Token: {$secret}\r\n";
    }

    foreach ($targets as $url) {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST              => true,
                CURLOPT_POSTFIELDS        => $body,
                CURLOPT_HTTPHEADER        => $curlHeaders,
                CURLOPT_RETURNTRANSFER    => true,
                CURLOPT_CONNECTTIMEOUT_MS => 600,
                CURLOPT_TIMEOUT_MS        => 900,
                CURLOPT_SSL_VERIFYPEER    => false,
                CURLOPT_SSL_VERIFYHOST    => 0,
            ]);
            $resp = @curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($resp !== false && $code >= 200 && $code < 300) {
                break;
            }
        } else {
            $ctx = stream_context_create([
                'http' => [
                    'method'  => 'POST',
                    'header'  => $streamHeaders,
                    'content' => $body,
                    'timeout' => 0.7,
                ],
                'ssl' => [
                    'verify_peer'      => false,
                    'verify_peer_name' => false,
                ],
            ]);
            if (@file_get_contents($url, false, $ctx) !== false) {
                break;
            }
        }
    }
}

/**
 * Envía mensaje de confirmación al cliente por WhatsApp Cloud API si está configurado
 * y registra el mensaje en kh_whatsapp_conversations_v1 para la Bandeja Omnicanal.
 */
function notifyWhatsAppOrderPaid(PDO $pdo, array $order, string $ref): void {
    $phone = preg_replace('/\D+/', '', (string)($order['customerPhone'] ?? ''));
    $orderNum = (string)($order['orderNumber'] ?? '#KH');
    $total = number_format((float)($order['total'] ?? 0), 2, '.', '');
    $confirmText = "✅ *¡Pago confirmado!*\n"
        . "Recibimos tu pago de *S/ {$total}* para el pedido *{$orderNum}* (Ref: `{$ref}`).\n"
        . "Tu pedido acaba de pasar automáticamente a *Cocina* 🍕🔥. Te avisaremos apenas salga listo.";

    // 1. Actualizar hilo en kh_whatsapp_conversations_v1
    if ($phone !== '') {
        $convRaw = kvGet($pdo, 'kh_whatsapp_conversations_v1');
        $convs = $convRaw ? json_decode($convRaw, true) : null;
        if (is_array($convs)) {
            $updated = false;
            $nowIso = gmdate('c');
            foreach ($convs as &$c) {
                $cPhone = preg_replace('/\D+/', '', (string)($c['customerPhone'] ?? ''));
                $linked = (string)($c['linkedOrderNumber'] ?? '');
                if (($cPhone !== '' && substr($cPhone, -9) === substr($phone, -9)) || ($linked !== '' && $linked === $orderNum)) {
                    if (!isset($c['messages']) || !is_array($c['messages'])) $c['messages'] = [];
                    $c['messages'][] = [
                        'id'         => 'wa_pay_' . uniqid(),
                        'sender'     => 'bot',
                        'senderName' => 'Pasarela Culqi',
                        'text'       => $confirmText,
                        'timestamp'  => $nowIso,
                        'status'     => 'delivered',
                    ];
                    $c['lastMessageAt'] = $nowIso;
                    $tags = isset($c['tags']) && is_array($c['tags']) ? $c['tags'] : [];
                    $tags = array_values(array_filter($tags, fn($t) => $t !== 'Pendiente Pago'));
                    if (!in_array('Pedido Activo', $tags, true)) $tags[] = 'Pedido Activo';
                    $c['tags'] = $tags;
                    $updated = true;
                    break;
                }
            }
            unset($c);
            if ($updated) {
                kvSet($pdo, 'kh_whatsapp_conversations_v1', json_encode($convs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
                notifyRealtimeBus('kh_whatsapp_conversations_v1', 'generic');
            }
        }
    }

    // 2. Enviar por Meta WhatsApp Cloud API si hay credenciales activas
    if ($phone === '') return;
    $waCfgRaw = kvGet($pdo, 'kh_whatsapp_config_v1');
    $waCfg = $waCfgRaw ? json_decode($waCfgRaw, true) : null;
    if (!is_array($waCfg)) return;

    $tenantId = (string)($order['tenantId'] ?? '');
    $creds = null;
    $mode = (string)($waCfg['numberMode'] ?? $waCfg['routingMode'] ?? 'centralized');
    $central = $waCfg['centralizedCredentials'] ?? $waCfg['centralCredentials'] ?? null;
    if ($mode === 'per_branch' && !empty($waCfg['branchCredentials'][$tenantId]['enabled'])) {
        $creds = $waCfg['branchCredentials'][$tenantId];
    } elseif (is_array($central) && !empty($central['enabled'])) {
        $creds = $central;
    }
    if (!is_array($creds)) return;

    $phoneNumberId = trim((string)($creds['phoneNumberId'] ?? ''));
    $accessToken = trim((string)($creds['accessToken'] ?? ''));
    $apiVersion = trim((string)($creds['apiVersion'] ?? 'v21.0')) ?: 'v21.0';
    if ($phoneNumberId === '' || $accessToken === '') return;

    if (strlen($phone) === 9 && $phone[0] === '9') {
        $phone = '51' . $phone;
    }

    $url = "https://graph.facebook.com/{$apiVersion}/{$phoneNumberId}/messages";
    $waBody = json_encode([
        'messaging_product' => 'whatsapp',
        'recipient_type'    => 'individual',
        'to'                => $phone,
        'type'              => 'text',
        'text'              => ['preview_url' => false, 'body' => $confirmText],
    ], JSON_UNESCAPED_UNICODE);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $accessToken,
            ],
            CURLOPT_POSTFIELDS     => $waBody,
        ]);
        @curl_exec($ch);
        curl_close($ch);
    }
}

/**
 * Marca un pedido como pagado en kh_orders_list y dispara SSE + WhatsApp.
 */
function markOrderPaidInStorage(PDO $pdo, string $orderId, string $orderNumber, string $ref, string $methodUsed): ?array {
    $raw = kvGet($pdo, 'kh_orders_list');
    $orders = $raw ? json_decode($raw, true) : null;
    if (!is_array($orders)) return null;

    $found = null;
    $nowIso = gmdate('c');
    foreach ($orders as &$ord) {
        if (!is_array($ord)) continue;
        $matchId = ($orderId !== '' && (string)($ord['id'] ?? '') === $orderId);
        $matchNum = ($orderNumber !== '' && (string)($ord['orderNumber'] ?? '') === $orderNumber);
        if ($matchId || $matchNum) {
            if (($ord['paymentStatus'] ?? '') === 'pagado') {
                return $ord;
            }
            $ord['paymentStatus'] = 'pagado';
            $ord['paymentMethod'] = $methodUsed === 'yape' ? 'yape_plin' : 'culqi';
            $ord['culqiReference'] = $ref;
            $ord['paidAt'] = $nowIso;
            $ord['updatedAt'] = $nowIso;
            if (($ord['status'] ?? '') === 'pendiente' || empty($ord['status'])) {
                $ord['status'] = 'recibido';
            }
            $found = $ord;
            break;
        }
    }
    unset($ord);

    if ($found === null) return null;

    kvSet($pdo, 'kh_orders_list', json_encode($orders, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    notifyRealtimeBus('kh_orders_list', 'new_order');
    notifyWhatsAppOrderPaid($pdo, $found, $ref);
    return $found;
}

// =========================================================================
// MODO 1: WEBHOOK OFICIAL DE CULQI (?webhook=1)
// =========================================================================
if (isset($_GET['webhook']) && $_GET['webhook'] === '1') {
    $whSettingsRaw = kvGet($pdo, KH_SETTINGS_KEY);
    $whSettings = $whSettingsRaw ? json_decode($whSettingsRaw, true) : [];
    $whCulqiCfg = $whSettings['companyInfo']['culqiConfig'] ?? [];
    $expectedWhSecret = trim((string)($whCulqiCfg['webhookSecret'] ?? getenv('CULQI_WEBHOOK_SECRET') ?: ''));
    if ($expectedWhSecret === '') {
        sendResponse(['ok' => false, 'error' => 'Webhook Culqi no configurado (falta webhookSecret)'], 403);
    }
    $providedWhSecret = trim((string)(
        $_SERVER['HTTP_X_CULQI_WEBHOOK_SECRET']
        ?? $_SERVER['HTTP_X_WEBHOOK_SECRET']
        ?? $_GET['secret']
        ?? ''
    ));
    if ($providedWhSecret === '' || !hash_equals($expectedWhSecret, $providedWhSecret)) {
        sendResponse(['ok' => false, 'error' => 'Firma o secreto de webhook inválido'], 401);
    }

    $eventType = (string)($payload['type'] ?? '');
    $eventData = $payload['data'] ?? [];
    if (is_string($eventData)) {
        $decoded = json_decode($eventData, true);
        if (is_array($decoded)) $eventData = $decoded;
    }

    $isPaidEvent =
        $eventType === 'charge.creation.succeeded' ||
        ($eventType === 'order.status.changed' && strtolower((string)($eventData['state'] ?? '')) === 'paid');

    if (!$isPaidEvent || !is_array($eventData)) {
        sendResponse(['ok' => true, 'ignored' => true, 'type' => $eventType]);
    }

    $meta = is_array($eventData['metadata'] ?? null) ? $eventData['metadata'] : [];
    $orderId = (string)($meta['order_id'] ?? $eventData['order_number'] ?? '');
    $orderNum = (string)($meta['order_number'] ?? '');
    $ref = (string)($eventData['id'] ?? $eventData['reference_code'] ?? ('CULQI-WH-' . time()));

    $updated = markOrderPaidInStorage($pdo, $orderId, $orderNum, $ref, 'culqi');
    sendResponse([
        'ok'      => true,
        'matched' => $updated !== null,
        'orderId' => $updated['id'] ?? null,
    ]);
}

// =========================================================================
// MODO 2: COBRO DIRECTO DESDE ENLACE DE PAGO (/pagar/:orderId)
// =========================================================================
$orderId = trim((string)($payload['orderId'] ?? ''));
$tokenId = trim((string)($payload['tokenId'] ?? ''));
$email = trim((string)($payload['email'] ?? 'cliente@pizzakhalessi.com'));
$methodUsed = trim((string)($payload['methodUsed'] ?? 'tarjeta'));
$isSandbox = !empty($payload['sandbox']);

if ($orderId === '') {
    sendResponse(['ok' => false, 'error' => 'Falta orderId'], 400);
}

$ordersRaw = kvGet($pdo, 'kh_orders_list');
$orders = $ordersRaw ? json_decode($ordersRaw, true) : [];
$targetOrder = null;
if (is_array($orders)) {
    foreach ($orders as $o) {
        if (is_array($o) && (string)($o['id'] ?? '') === $orderId) {
            $targetOrder = $o;
            break;
        }
    }
}

if ($targetOrder === null) {
    sendResponse(['ok' => false, 'error' => 'Pedido no encontrado en el servidor'], 404);
}

if (($targetOrder['paymentStatus'] ?? '') === 'pagado') {
    sendResponse([
        'ok'        => true,
        'alreadyPaid' => true,
        'reference' => $targetOrder['culqiReference'] ?? 'PAGADO',
        'order'     => $targetOrder,
    ]);
}

// Resolver Secret Key de Culqi desde gastro_erp_settings_v3 (nunca expuesta al navegador)
$settingsRaw = kvGet($pdo, KH_SETTINGS_KEY);
$settings = $settingsRaw ? json_decode($settingsRaw, true) : [];
$culqiCfg = $settings['companyInfo']['culqiConfig'] ?? [];
$env = (string)($culqiCfg['environment'] ?? 'test');
$secretKey = $env === 'live'
    ? trim((string)($culqiCfg['liveSecretKey'] ?? $culqiCfg['secretKey'] ?? ''))
    : trim((string)($culqiCfg['testSecretKey'] ?? $culqiCfg['secretKey'] ?? ''));

$hasRealSecret = preg_match('/^sk_(test|live)_[A-Za-z0-9]{12,}$/', $secretKey) === 1;
$chargeReference = '';

if ($env === 'live' || $hasRealSecret) {
    if ($isSandbox) {
        sendResponse(['ok' => false, 'error' => 'El modo sandbox está deshabilitado cuando existe una llave secreta de Culqi configurada.'], 400);
    }
    if ($tokenId === '' || strpos($tokenId, 'tkn_') !== 0) {
        sendResponse(['ok' => false, 'error' => 'Token de pago Culqi inválido o ausente.'], 400);
    }
    if (!$hasRealSecret) {
        sendResponse(['ok' => false, 'error' => 'Falta configurar la llave secreta de producción de Culqi.'], 500);
    }
    // Cobro real contra Culqi Charges API v2 usando el monto autoritativo del pedido
    $amountCents = max(100, (int)round(((float)($targetOrder['total'] ?? 0)) * 100));
    $chargePayload = json_encode([
        'amount'        => $amountCents,
        'currency_code' => 'PEN',
        'email'         => filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : 'cliente@pizzakhalessi.com',
        'source_id'     => $tokenId,
        'description'   => 'Pedido ' . ($targetOrder['orderNumber'] ?? $orderId),
        'metadata'      => [
            'order_id'     => $orderId,
            'order_number' => (string)($targetOrder['orderNumber'] ?? ''),
            'tenant_id'    => (string)($targetOrder['tenantId'] ?? ''),
        ],
    ], JSON_UNESCAPED_UNICODE);

    if (!function_exists('curl_init')) {
        sendResponse(['ok' => false, 'error' => 'Extensión cURL no habilitada en el servidor PHP'], 500);
    }

    $ch = curl_init('https://api.culqi.com/v2/charges');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $secretKey,
        ],
        CURLOPT_POSTFIELDS     => $chargePayload,
    ]);
    $respBody = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($respBody === false) {
        sendResponse(['ok' => false, 'error' => 'Error de conexión con Culqi: ' . $curlErr], 502);
    }

    $respJson = json_decode((string)$respBody, true);
    if ($httpCode < 200 || $httpCode >= 300 || !is_array($respJson) || empty($respJson['id'])) {
        $errMsg = is_array($respJson)
            ? (string)($respJson['user_message'] ?? $respJson['merchant_message'] ?? 'Culqi rechazó el cargo')
            : 'Culqi rechazó el cargo';
        sendResponse(['ok' => false, 'error' => $errMsg], 402);
    }

    $chargeReference = (string)$respJson['id'];
} else {
    // Modo Sandbox puro (solo permitido cuando env !== 'live' y no hay Secret Key real configurada)
    $chargeReference = $tokenId !== '' ? $tokenId : ('CULQI-LINK-' . strtoupper(substr(md5($orderId . microtime()), 0, 8)));
}

$updatedOrder = markOrderPaidInStorage($pdo, $orderId, '', $chargeReference, $methodUsed);
if ($updatedOrder === null) {
    sendResponse(['ok' => false, 'error' => 'No se pudo actualizar el pedido'], 500);
}

sendResponse([
    'ok'        => true,
    'reference' => $chargeReference,
    'order'     => $updatedOrder,
]);
