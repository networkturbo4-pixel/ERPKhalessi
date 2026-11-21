<?php
/**
 * GastroERP - Marketing Web Push (VAPID ES256 + RFC 8291 aes128gcm) & Cron de Campañas
 * Compatible con Android, Apple iOS 16.4+ (PWA), Windows y macOS sin dependencias externas.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$configLocalPath = __DIR__ . '/config.local.php';
if (is_file($configLocalPath)) {
    require_once $configLocalPath;
}

function mkt_json(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function mkt_b64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function mkt_b64url_decode(string $data): string
{
    $pad = strlen($data) % 4;
    if ($pad > 0) {
        $data .= str_repeat('=', 4 - $pad);
    }
    $decoded = base64_decode(strtr($data, '-_', '+/'), true);
    return $decoded === false ? '' : $decoded;
}

function mkt_storage_dir(): string
{
    $dir = __DIR__ . '/storage';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

function mkt_read_json_file(string $path, array $default = []): array
{
    if (!is_file($path)) {
        return $default;
    }
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') {
        return $default;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $default;
}

function mkt_write_json_file(string $path, array $data): void
{
    @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function mkt_get_or_create_cron_key(): string
{
    if (defined('MARKETING_CRON_KEY') && is_string(MARKETING_CRON_KEY) && MARKETING_CRON_KEY !== '') {
        return MARKETING_CRON_KEY;
    }
    $file = mkt_storage_dir() . '/marketing-cron-key.txt';
    if (is_file($file)) {
        $existing = trim((string) @file_get_contents($file));
        if ($existing !== '') {
            return $existing;
        }
    }
    $newKey = bin2hex(random_bytes(16));
    @file_put_contents($file, $newKey, LOCK_EX);
    return $newKey;
}

function mkt_ec_public_from_pem(string $pem): string
{
    $key = openssl_pkey_get_public($pem);
    if (!$key) {
        throw new RuntimeException('No se pudo leer la clave pública EC.');
    }
    $details = openssl_pkey_get_details($key);
    if (!is_array($details) || empty($details['ec']['x']) || empty($details['ec']['y'])) {
        throw new RuntimeException('Detalles EC P-256 inválidos.');
    }
    $x = str_pad($details['ec']['x'], 32, "\x00", STR_PAD_LEFT);
    $y = str_pad($details['ec']['y'], 32, "\x00", STR_PAD_LEFT);
    return "\x04" . $x . $y;
}

function mkt_get_or_create_vapid(): array
{
    $file = mkt_storage_dir() . '/marketing-vapid.json';
    $existing = mkt_read_json_file($file);
    if (!empty($existing['publicKey']) && !empty($existing['privatePem'])) {
        return $existing;
    }

    $res = openssl_pkey_new([
        'curve_name' => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);
    if (!$res) {
        throw new RuntimeException('OpenSSL no pudo generar llaves EC P-256 para Web Push.');
    }
    $privatePem = '';
    if (!openssl_pkey_export($res, $privatePem)) {
        throw new RuntimeException('No se pudo exportar la llave privada VAPID.');
    }
    $details = openssl_pkey_get_details($res);
    $pubPem = (string) ($details['key'] ?? '');
    $rawPub = mkt_ec_public_from_pem($pubPem);

    $vapid = [
        'publicKey' => mkt_b64url_encode($rawPub),
        'privatePem' => $privatePem,
        'publicPem' => $pubPem,
        'createdAt' => gmdate('c'),
    ];
    mkt_write_json_file($file, $vapid);
    return $vapid;
}

function mkt_der_to_raw_sig(string $der): string
{
    $offset = 0;
    if (ord($der[$offset++]) !== 0x30) {
        throw new RuntimeException('Firma DER inválida.');
    }
    $len = ord($der[$offset++]);
    if ($len & 0x80) {
        $offset += ($len & 0x7f);
    }
    if (ord($der[$offset++]) !== 0x02) {
        throw new RuntimeException('Firma DER R inválida.');
    }
    $rLen = ord($der[$offset++]);
    $r = substr($der, $offset, $rLen);
    $offset += $rLen;

    if (ord($der[$offset++]) !== 0x02) {
        throw new RuntimeException('Firma DER S inválida.');
    }
    $sLen = ord($der[$offset++]);
    $s = substr($der, $offset, $sLen);

    $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
    return substr($r, -32) . substr($s, -32);
}

function mkt_sign_vapid_jwt(string $endpoint, string $privatePem): string
{
    $parts = parse_url($endpoint);
    if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        throw new RuntimeException('Endpoint de suscripción inválido.');
    }
    $aud = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
    $header = mkt_b64url_encode((string) json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $payload = mkt_b64url_encode((string) json_encode([
        'aud' => $aud,
        'exp' => time() + 43200,
        'sub' => 'mailto:marketing@gastroerp.com',
    ], JSON_UNESCAPED_SLASHES));

    $signingInput = "{$header}.{$payload}";
    $derSig = '';
    if (!openssl_sign($signingInput, $derSig, $privatePem, OPENSSL_ALGO_SHA256)) {
        throw new RuntimeException('Error firmando JWT VAPID ES256.');
    }
    $rawSig = mkt_der_to_raw_sig($derSig);
    return $signingInput . '.' . mkt_b64url_encode($rawSig);
}

function mkt_raw_pub_to_pem(string $rawPub65): string
{
    // DER SubjectPublicKeyInfo prefix for uncompressed EC P-256 (prime256v1)
    $derPrefix = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200');
    $der = $derPrefix . $rawPub65;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

function mkt_encrypt_webpush_aes128gcm(string $plaintext, string $uaPubB64, string $authB64): string
{
    $uaPub = mkt_b64url_decode($uaPubB64);
    $authSecret = mkt_b64url_decode($authB64);
    if (strlen($uaPub) !== 65 || strlen($authSecret) !== 16) {
        throw new RuntimeException('Llaves p256dh/auth inválidas en la suscripción.');
    }

    $ephemeral = openssl_pkey_new([
        'curve_name' => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);
    if (!$ephemeral) {
        throw new RuntimeException('No se pudo generar llave efímera ECDH.');
    }
    $ephemeralDetails = openssl_pkey_get_details($ephemeral);
    $asPub = mkt_ec_public_from_pem((string) $ephemeralDetails['key']);
    $peerPubPem = mkt_raw_pub_to_pem($uaPub);
    $peerKey = openssl_pkey_get_public($peerPubPem);
    if (!$peerKey) {
        throw new RuntimeException('No se pudo importar p256dh del suscriptor.');
    }

    $sharedSecret = openssl_pkey_derive($peerKey, $ephemeral, 32);
    if ($sharedSecret === false) {
        throw new RuntimeException('No se pudo derivar secreto compartido ECDH.');
    }

    $salt = random_bytes(16);
    $prkKey = hash_hmac('sha256', $sharedSecret, $authSecret, true);
    $keyInfo = "WebPush: info\x00" . $uaPub . $asPub . "\x01";
    $ikm = hash_hmac('sha256', $keyInfo, $prkKey, true);

    $prk = hash_hmac('sha256', $ikm, $salt, true);
    $cek = substr(hash_hmac('sha256', "Content-Encoding: aes128gcm\x00\x01", $prk, true), 0, 16);
    $nonce = substr(hash_hmac('sha256', "Content-Encoding: nonce\x00\x01", $prk, true), 0, 12);

    $padded = $plaintext . "\x02";
    $tag = '';
    $ciphertext = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    if ($ciphertext === false) {
        throw new RuntimeException('Error cifrando payload aes128gcm.');
    }

    return $salt . pack('N', 4096) . chr(65) . $asPub . $ciphertext . $tag;
}

function mkt_send_single_push(array $sub, string $jsonPayload, array $vapid): array
{
    $endpoint = (string) ($sub['endpoint'] ?? '');
    $p256dh = (string) ($sub['keys']['p256dh'] ?? '');
    $auth = (string) ($sub['keys']['auth'] ?? '');
    if ($endpoint === '' || $p256dh === '' || $auth === '') {
        return ['ok' => false, 'status' => 400, 'expired' => true, 'error' => 'Suscripción incompleta'];
    }

    $jwt = mkt_sign_vapid_jwt($endpoint, (string) $vapid['privatePem']);
    $encrypted = mkt_encrypt_webpush_aes128gcm($jsonPayload, $p256dh, $auth);

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'TTL: 86400',
            'Urgency: high',
            "Authorization: vapid t={$jwt}, k={$vapid['publicKey']}",
        ],
        CURLOPT_POSTFIELDS => $encrypted,
        CURLOPT_TIMEOUT => 12,
    ]);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    $expired = ($code === 404 || $code === 410);
    return [
        'ok' => $code >= 200 && $code < 300,
        'status' => $code,
        'expired' => $expired,
        'error' => $err ?: ($code >= 300 ? "HTTP {$code} {$resp}" : ''),
    ];
}

function mkt_dispatch_campaign_push(array $campaign, array $vapid): array
{
    $subsFile = mkt_storage_dir() . '/marketing_push_subscriptions.json';
    $subs = mkt_read_json_file($subsFile);
    if (empty($subs)) {
        return ['sent' => 0, 'failed' => 0, 'total' => 0];
    }

    $targetCustId = trim((string) ($campaign['targetCustomerId'] ?? ''));
    $targetPhone = preg_replace('/\D+/', '', (string) ($campaign['targetCustomerPhone'] ?? ''));

    $targets = array_values(array_filter($subs, static function ($s) use ($targetCustId, $targetPhone) {
        if ($targetCustId === '' && $targetPhone === '') {
            return true;
        }
        $subCust = (string) ($s['customerId'] ?? '');
        $subPhone = preg_replace('/\D+/', '', (string) ($s['customerPhone'] ?? ''));
        return ($targetCustId !== '' && $subCust === $targetCustId)
            || ($targetPhone !== '' && $subPhone !== '' && $subPhone === $targetPhone);
    }));

    $payloadArr = [
        'title' => (string) ($campaign['title'] ?? 'Gastro Restaurante'),
        'body' => (string) ($campaign['body'] ?? ''),
        'url' => (string) ($campaign['targetUrl'] ?? '/'),
        'tag' => 'gastro-mkt-' . ($campaign['id'] ?? time()),
    ];
    if (!empty($campaign['imageUrl'])) {
        $payloadArr['image'] = (string) $campaign['imageUrl'];
    }
    $jsonPayload = (string) json_encode($payloadArr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $sent = 0;
    $failed = 0;
    $expiredEndpoints = [];
    foreach ($targets as $sub) {
        try {
            $res = mkt_send_single_push($sub, $jsonPayload, $vapid);
            if ($res['ok']) {
                $sent++;
            } else {
                $failed++;
                if ($res['expired']) {
                    $expiredEndpoints[(string) $sub['endpoint']] = true;
                }
            }
        } catch (Throwable $e) {
            $failed++;
        }
    }

    if (!empty($expiredEndpoints)) {
        $subs = array_values(array_filter($subs, static fn($s) => empty($expiredEndpoints[(string) ($s['endpoint'] ?? '')])));
        mkt_write_json_file($subsFile, $subs);
    }

    return ['sent' => $sent, 'failed' => $failed, 'total' => count($targets)];
}

function mkt_run_due_campaigns(): array
{
    $campaignsFile = mkt_storage_dir() . '/marketing_scheduled_campaigns.json';
    $campaigns = mkt_read_json_file($campaignsFile);
    if (empty($campaigns)) {
        return ['processed' => 0, 'sent' => 0];
    }

    $vapid = mkt_get_or_create_vapid();
    $now = time();
    $processed = 0;
    $totalSent = 0;

    foreach ($campaigns as &$c) {
        if (($c['status'] ?? '') !== 'scheduled') {
            continue;
        }
        $ts = strtotime((string) ($c['scheduledAt'] ?? ''));
        if ($ts === false || $ts > $now) {
            continue;
        }

        $processed++;
        $channel = (string) ($c['channel'] ?? 'web_push');
        $sentCount = 0;
        $failedCount = 0;
        $errMessages = [];

        if ($channel === 'web_push' || $channel === 'both') {
            $pushRes = mkt_dispatch_campaign_push($c, $vapid);
            $sentCount += $pushRes['sent'];
            $failedCount += $pushRes['failed'];
        }

        if (($channel === 'google_wallet' || $channel === 'both') && !empty($c['issuerId'])) {
            // Reenviar a google-wallet.php internamente vía HTTP local si está disponible
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $gwUrl = "{$scheme}://{$host}/api/google-wallet.php";
            $ch = curl_init($gwUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode([
                    'action' => 'send-promo',
                    'issuerId' => (string) $c['issuerId'],
                    'classSuffix' => (string) ($c['classSuffix'] ?? 'gastro_loyalty_v1'),
                    'header' => (string) ($c['title'] ?? ''),
                    'body' => (string) ($c['body'] ?? ''),
                    'promoUrl' => (string) ($c['targetUrl'] ?? ''),
                    'messageType' => 'TEXT_AND_NOTIFY',
                    'targetCustomerId' => (string) ($c['targetCustomerId'] ?? ''),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                CURLOPT_TIMEOUT => 10,
            ]);
            $gwResp = curl_exec($ch);
            $gwCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($gwCode >= 400 || $gwResp === false) {
                $errMessages[] = 'Google Wallet devolvió error.';
            } else {
                $sentCount++;
            }
        }

        $c['status'] = empty($errMessages) ? 'sent' : 'failed';
        $c['sentAt'] = gmdate('c');
        $c['sentCount'] = $sentCount;
        $c['failedCount'] = $failedCount;
        if (!empty($errMessages)) {
            $c['error'] = implode(' ', $errMessages);
        }
        $totalSent += $sentCount;
    }
    unset($c);

    if ($processed > 0) {
        mkt_write_json_file($campaignsFile, $campaigns);
    }

    return ['processed' => $processed, 'sent' => $totalSent];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$subsFile = mkt_storage_dir() . '/marketing_push_subscriptions.json';
$campaignsFile = mkt_storage_dir() . '/marketing_scheduled_campaigns.json';

if ($method === 'GET') {
    $action = (string) ($_GET['action'] ?? 'stats');

    if ($action === 'vapid-public-key') {
        $vapid = mkt_get_or_create_vapid();
        mkt_json(200, ['success' => true, 'publicKey' => $vapid['publicKey']]);
    }

    if ($action === 'stats') {
        $subs = mkt_read_json_file($subsFile);
        $byPlatform = ['android' => 0, 'ios' => 0, 'windows' => 0, 'macos' => 0, 'other' => 0];
        foreach ($subs as $s) {
            $p = (string) ($s['platform'] ?? 'other');
            if (!isset($byPlatform[$p])) {
                $p = 'other';
            }
            $byPlatform[$p]++;
        }
        mkt_json(200, [
            'success' => true,
            'totalSubscribers' => count($subs),
            'byPlatform' => $byPlatform,
            'subscribers' => array_map(static fn($s) => [
                'id' => $s['id'] ?? '',
                'endpoint' => $s['endpoint'] ?? '',
                'customerId' => $s['customerId'] ?? '',
                'customerName' => $s['customerName'] ?? '',
                'customerPhone' => $s['customerPhone'] ?? '',
                'platform' => $s['platform'] ?? 'other',
                'createdAt' => $s['createdAt'] ?? '',
            ], $subs),
            'cronKey' => mkt_get_or_create_cron_key(),
        ]);
    }

    if ($action === 'campaigns') {
        $campaigns = mkt_read_json_file($campaignsFile);
        mkt_json(200, ['success' => true, 'campaigns' => $campaigns]);
    }

    if ($action === 'run-scheduled') {
        $expected = mkt_get_or_create_cron_key();
        $provided = (string) ($_GET['cron_key'] ?? '');
        if ($provided !== '' && !hash_equals($expected, $provided)) {
            mkt_json(401, ['success' => false, 'error' => 'cron_key inválido.']);
        }
        $summary = mkt_run_due_campaigns();
        mkt_json(200, ['success' => true] + $summary);
    }

    mkt_json(400, ['success' => false, 'error' => 'Acción GET no soportada.']);
}

if ($method !== 'POST') {
    mkt_json(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$body = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($body)) {
    mkt_json(400, ['success' => false, 'error' => 'JSON inválido.']);
}

$action = (string) ($body['action'] ?? '');

if ($action === 'subscribe') {
    $sub = $body['subscription'] ?? null;
    if (!is_array($sub) || empty($sub['endpoint']) || empty($sub['keys']['p256dh']) || empty($sub['keys']['auth'])) {
        mkt_json(400, ['success' => false, 'error' => 'Objeto subscription inválido.']);
    }

    $subs = mkt_read_json_file($subsFile);
    $endpoint = (string) $sub['endpoint'];
    $record = [
        'id' => 'push-' . substr(sha1($endpoint), 0, 12),
        'endpoint' => $endpoint,
        'keys' => [
            'p256dh' => (string) $sub['keys']['p256dh'],
            'auth' => (string) $sub['keys']['auth'],
        ],
        'customerId' => trim((string) ($body['customerId'] ?? '')),
        'customerName' => trim((string) ($body['customerName'] ?? '')),
        'customerPhone' => trim((string) ($body['customerPhone'] ?? '')),
        'platform' => in_array(($body['platform'] ?? 'other'), ['android', 'ios', 'windows', 'macos', 'other'], true)
            ? (string) $body['platform']
            : 'other',
        'tenantId' => trim((string) ($body['tenantId'] ?? '')),
        'createdAt' => gmdate('c'),
    ];

    $found = false;
    foreach ($subs as &$existing) {
        if (($existing['endpoint'] ?? '') === $endpoint) {
            $existing = array_merge($existing, $record);
            $found = true;
            break;
        }
    }
    unset($existing);
    if (!$found) {
        array_unshift($subs, $record);
    }
    mkt_write_json_file($subsFile, $subs);
    mkt_json(200, ['success' => true, 'id' => $record['id'], 'totalSubscribers' => count($subs)]);
}

if ($action === 'send-push') {
    $vapid = mkt_get_or_create_vapid();
    $res = mkt_dispatch_campaign_push($body, $vapid);
    $campaigns = mkt_read_json_file($campaignsFile);
    array_unshift($campaigns, [
        'id' => (string) ($body['id'] ?? ('mkt-' . time())),
        'title' => (string) ($body['title'] ?? ''),
        'body' => (string) ($body['body'] ?? ''),
        'imageUrl' => !empty($body['imageUrl']) ? (string) $body['imageUrl'] : null,
        'targetUrl' => !empty($body['targetUrl']) ? (string) $body['targetUrl'] : null,
        'segment' => !empty($body['targetCustomerId']) ? 'single_customer' : 'all',
        'channel' => 'web_push',
        'targetCustomerId' => !empty($body['targetCustomerId']) ? (string) $body['targetCustomerId'] : null,
        'targetCustomerPhone' => !empty($body['targetCustomerPhone']) ? (string) $body['targetCustomerPhone'] : null,
        'scheduledAt' => gmdate('c'),
        'status' => ($res['sent'] ?? 0) > 0 || ($res['total'] ?? 0) === 0 ? 'sent' : 'failed',
        'sentCount' => $res['sent'] ?? 0,
        'failedCount' => $res['failed'] ?? 0,
        'createdAt' => gmdate('c'),
        'sentAt' => gmdate('c'),
    ]);
    $campaigns = array_slice($campaigns, 0, 100);
    mkt_write_json_file($campaignsFile, $campaigns);
    mkt_json(200, ['success' => true] + $res);
}

if ($action === 'schedule') {
    $campaign = $body['campaign'] ?? null;
    if (!is_array($campaign) || empty($campaign['id']) || empty($campaign['title'])) {
        mkt_json(400, ['success' => false, 'error' => 'Datos de campaña inválidos.']);
    }
    $campaigns = mkt_read_json_file($campaignsFile);
    array_unshift($campaigns, $campaign);
    $campaigns = array_slice($campaigns, 0, 100);
    mkt_write_json_file($campaignsFile, $campaigns);
    mkt_json(200, ['success' => true, 'campaign' => $campaign]);
}

if ($action === 'cancel' || $action === 'delete') {
    $id = (string) ($body['id'] ?? '');
    $campaigns = mkt_read_json_file($campaignsFile);
    if ($action === 'delete') {
        $campaigns = array_values(array_filter($campaigns, static fn($c) => ($c['id'] ?? '') !== $id));
    } else {
        foreach ($campaigns as &$c) {
            if (($c['id'] ?? '') === $id && ($c['status'] ?? '') === 'scheduled') {
                $c['status'] = 'cancelled';
            }
        }
        unset($c);
    }
    mkt_write_json_file($campaignsFile, $campaigns);
    mkt_json(200, ['success' => true, 'campaigns' => $campaigns]);
}

if ($action === 'run-scheduled') {
    $summary = mkt_run_due_campaigns();
    mkt_json(200, ['success' => true] + $summary);
}

mkt_json(400, ['success' => false, 'error' => 'Acción POST no reconocida.']);
