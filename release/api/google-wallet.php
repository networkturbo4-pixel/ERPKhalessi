<?php
/**
 * Khalessi Pizza ERP - Google Wallet Loyalty Pass API
 * Firma JWT (RS256) para "Agregar a Google Wallet" y sincroniza puntos en tiempo real.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$configLocalPath = __DIR__ . '/config.local.php';
if (is_file($configLocalPath)) {
    require_once $configLocalPath;
}

function gw_json_response(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function gw_base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function gw_find_service_account(): ?array
{
    $candidates = [];

    if (defined('GOOGLE_WALLET_SERVICE_ACCOUNT_PATH') && is_string(GOOGLE_WALLET_SERVICE_ACCOUNT_PATH) && GOOGLE_WALLET_SERVICE_ACCOUNT_PATH !== '') {
        $candidates[] = GOOGLE_WALLET_SERVICE_ACCOUNT_PATH;
    }
    $envPath = getenv('GOOGLE_WALLET_SA_PATH');
    if (is_string($envPath) && $envPath !== '') {
        $candidates[] = $envPath;
    }
    $candidates[] = __DIR__ . '/storage/google-wallet-sa.json';
    $candidates[] = dirname(__DIR__, 2) . '/data/google-wallet-sa.json';

    foreach ($candidates as $path) {
        if (!is_string($path) || $path === '' || !is_file($path) || !is_readable($path)) {
            continue;
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            continue;
        }
        $decoded = json_decode($raw, true);
        if (
            is_array($decoded) &&
            !empty($decoded['client_email']) &&
            !empty($decoded['private_key']) &&
            is_string($decoded['client_email']) &&
            is_string($decoded['private_key'])
        ) {
            return [
                'path' => $path,
                'data' => $decoded,
            ];
        }
    }

    return null;
}

function gw_sign_jwt(array $header, array $payload, string $privateKeyPem): string
{
    $segments = [
        gw_base64url_encode((string) json_encode($header, JSON_UNESCAPED_SLASHES)),
        gw_base64url_encode((string) json_encode($payload, JSON_UNESCAPED_SLASHES)),
    ];
    $signingInput = implode('.', $segments);

    $signature = '';
    $ok = openssl_sign($signingInput, $signature, $privateKeyPem, OPENSSL_ALGO_SHA256);
    if (!$ok) {
        throw new RuntimeException('No se pudo firmar el JWT con la llave privada (RS256).');
    }

    $segments[] = gw_base64url_encode($signature);
    return implode('.', $segments);
}

function gw_sanitize_id(string $value, int $maxLen = 64): string
{
    $clean = preg_replace('/[^A-Za-z0-9_.\-]/', '_', $value);
    $clean = trim((string) $clean, '_');
    if ($clean === '') {
        $clean = 'item';
    }
    return substr($clean, 0, $maxLen);
}

function gw_is_https_url(?string $url): bool
{
    if (!is_string($url) || trim($url) === '') {
        return false;
    }
    return (bool) preg_match('/^https:\/\/.+/i', trim($url));
}

function gw_get_access_token(array $sa): string
{
    $now = time();
    $jwt = gw_sign_jwt(
        ['alg' => 'RS256', 'typ' => 'JWT'],
        [
            'iss' => $sa['client_email'],
            'scope' => 'https://www.googleapis.com/auth/wallet_object.issuer',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ],
        $sa['private_key']
    );

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]),
        CURLOPT_TIMEOUT => 12,
    ]);
    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($response === false || $httpCode >= 400) {
        throw new RuntimeException('Error obteniendo token OAuth2 de Google: ' . ($curlErr ?: (string) $response));
    }

    $json = json_decode((string) $response, true);
    if (!is_array($json) || empty($json['access_token'])) {
        throw new RuntimeException('Respuesta OAuth2 inválida de Google.');
    }

    return (string) $json['access_token'];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $action = (string) ($_GET['action'] ?? 'status');
    if ($action === 'status') {
        $saInfo = gw_find_service_account();
        gw_json_response(200, [
            'success' => true,
            'configured' => $saInfo !== null,
            'serviceAccountEmail' => $saInfo ? (string) $saInfo['data']['client_email'] : null,
            'mode' => $saInfo ? 'production' : 'unconfigured',
        ]);
    }
    gw_json_response(400, ['success' => false, 'error' => 'Acción GET no soportada.']);
}

if ($method !== 'POST') {
    gw_json_response(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody ?: '{}', true);
if (!is_array($body)) {
    gw_json_response(400, ['success' => false, 'error' => 'JSON inválido.']);
}

$action = (string) ($body['action'] ?? '');
$saInfo = gw_find_service_account();

if (!$saInfo) {
    gw_json_response(503, [
        'success' => false,
        'code' => 'SERVICE_ACCOUNT_MISSING',
        'error' => 'No se encontró el archivo google-wallet-sa.json en el servidor.',
    ]);
}

$sa = $saInfo['data'];
$issuerId = preg_replace('/[^0-9]/', '', (string) ($body['issuerId'] ?? ''));
if ($issuerId === '') {
    gw_json_response(400, ['success' => false, 'error' => 'Issuer ID de Google Wallet es obligatorio.']);
}

$classSuffix = gw_sanitize_id((string) ($body['classSuffix'] ?? 'khalessi_loyalty_v1'));
$rawCustomerId = trim((string) ($body['customerId'] ?? ''));
$customerId = $rawCustomerId !== '' ? gw_sanitize_id($rawCustomerId) : '';
if ($action !== 'send-promo' && $customerId === '') {
    gw_json_response(400, ['success' => false, 'error' => 'ID de cliente es obligatorio.']);
}

$classId = "{$issuerId}.{$classSuffix}";
$objectId = "{$issuerId}.khalessi_cust_{$customerId}";
$points = max(0, (int) round((float) ($body['points'] ?? 0)));
$goal = max(1, (int) round((float) ($body['goal'] ?? 8)));
$activeStamps = min($goal, $points);
$remainingStamps = max(0, $goal - $activeStamps);

$stampBar = $goal <= 12
    ? trim(str_repeat('● ', $activeStamps) . str_repeat('○ ', $remainingStamps))
    : "{$activeStamps} / {$goal}";
$stampPizzaBar = $goal <= 12
    ? trim(str_repeat('🍕 ', $activeStamps) . str_repeat('⚪ ', $remainingStamps))
    : str_repeat('🍕', min(8, $activeStamps)) . " ({$activeStamps}/{$goal})";
$stampStatusText = $remainingStamps === 0
    ? '¡Cartilla completa! Ya puedes canjear tu premio en tienda o web.'
    : "Llevas {$activeStamps} de {$goal} sellos. Te " . ($remainingStamps === 1 ? 'falta 1 sello' : "faltan {$remainingStamps} sellos") . ' para tu premio.';

$isHttpsRequest = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$hostHeader = preg_replace('/[^A-Za-z0-9.\-:]/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
$hexBgClean = ltrim((string) ($body['hexBackgroundColor'] ?? '18181b'), '#');
if (!preg_match('/^[0-9A-Fa-f]{6}$/', $hexBgClean)) {
    $hexBgClean = '18181b';
}
$dynamicHeroUrl = ($isHttpsRequest && $hostHeader !== '' && stripos($hostHeader, 'localhost') === false)
    ? "https://{$hostHeader}/api/google-wallet-stamps.php?points={$points}&goal={$goal}&bg={$hexBgClean}&accent=f59e0b"
    : '';

if ($action === 'create-save-link') {
    $issuerName = trim((string) ($body['issuerName'] ?? 'Khalessi Pizza')) ?: 'Khalessi Pizza';
    $programName = trim((string) ($body['programName'] ?? 'Tarjeta de Puntos Khalessi')) ?: 'Tarjeta de Puntos Khalessi';
    $subtitle = trim((string) ($body['subtitle'] ?? 'Acumula puntos en cada compra y canjea premios.'));
    $customerName = trim((string) ($body['customerName'] ?? 'Cliente Khalessi')) ?: 'Cliente Khalessi';
    $accountId = trim((string) ($body['customerPhone'] ?? $customerId)) ?: $customerId;
    $hexBg = (string) ($body['hexBackgroundColor'] ?? '#18181b');
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $hexBg)) {
        $hexBg = '#18181b';
    }
    $rawBarcodeType = (string) ($body['barcodeType'] ?? 'QR_CODE');
    $barcodeType = $rawBarcodeType === 'NONE' ? 'NONE' : ($rawBarcodeType === 'CODE_128' ? 'CODE_128' : 'QR_CODE');

    $logoUrl = isset($body['logoUrl']) ? trim((string) $body['logoUrl']) : '';
    $resolvedLogoUrl = gw_is_https_url($logoUrl)
        ? $logoUrl
        : 'https://www.gstatic.com/images/branding/product/2x/wallet_48dp.png';

    $loyaltyClass = [
        'id' => $classId,
        'issuerName' => $issuerName,
        'programName' => $programName,
        'hexBackgroundColor' => $hexBg,
        'reviewStatus' => 'UNDER_REVIEW',
        'programLogo' => [
            'sourceUri' => ['uri' => $resolvedLogoUrl],
            'contentDescription' => [
                'defaultValue' => ['language' => 'es', 'value' => $issuerName],
            ],
        ],
    ];

    $heroImageUrl = isset($body['heroImageUrl']) ? trim((string) $body['heroImageUrl']) : '';
    if (gw_is_https_url($heroImageUrl)) {
        $loyaltyClass['heroImage'] = [
            'sourceUri' => ['uri' => $heroImageUrl],
            'contentDescription' => [
                'defaultValue' => ['language' => 'es', 'value' => $programName],
            ],
        ];
    }

    if (!empty($body['locations']) && is_array($body['locations'])) {
        $validLocs = [];
        foreach ($body['locations'] as $loc) {
            if (is_array($loc) && isset($loc['latitude'], $loc['longitude']) && is_numeric($loc['latitude']) && is_numeric($loc['longitude'])) {
                $validLocs[] = [
                    'latitude' => (float) $loc['latitude'],
                    'longitude' => (float) $loc['longitude'],
                ];
            }
            if (count($validLocs) >= 10) {
                break;
            }
        }
        if (!empty($validLocs)) {
            $loyaltyClass['locations'] = $validLocs;
        }
    }

    $loyaltyObject = [
        'id' => $objectId,
        'classId' => $classId,
        'state' => 'ACTIVE',
        'accountId' => $accountId,
        'accountName' => $customerName,
        'loyaltyPoints' => [
            'label' => 'Puntos',
            'balance' => ['int' => $points],
        ],
        'secondaryLoyaltyPoints' => [
            'label' => 'Sellos',
            'balance' => ['string' => "{$stampBar} ({$activeStamps}/{$goal})"],
        ],
        'textModulesData' => [
            [
                'id' => 'stamps_progress',
                'header' => "Sellos Marcados ({$activeStamps} / {$goal})",
                'body' => "{$stampPizzaBar}\n{$stampStatusText}",
            ],
            [
                'id' => 'program_info',
                'header' => 'Programa de Puntos',
                'body' => $subtitle !== '' ? $subtitle : 'Presenta este código en caja para sumar o canjear puntos.',
            ],
        ],
    ];

    if ($barcodeType !== 'NONE') {
        $loyaltyObject['barcode'] = [
            'type' => $barcodeType,
            'value' => "KHALESSI:LOYALTY:{$customerId}",
            'alternateText' => $accountId,
        ];
    }

    if ($dynamicHeroUrl !== '') {
        $loyaltyObject['heroImage'] = [
            'sourceUri' => ['uri' => $dynamicHeroUrl],
            'contentDescription' => [
                'defaultValue' => ['language' => 'es', 'value' => "Sellos {$activeStamps} de {$goal}"],
            ],
        ];
    }

    $origins = [];
    if (!empty($_SERVER['HTTP_ORIGIN']) && is_string($_SERVER['HTTP_ORIGIN']) && preg_match('/^https:\/\//i', $_SERVER['HTTP_ORIGIN'])) {
        $origins[] = $_SERVER['HTTP_ORIGIN'];
    }

    $claims = [
        'iss' => $sa['client_email'],
        'aud' => 'google',
        'typ' => 'savetowallet',
        'iat' => time(),
        'payload' => [
            'loyaltyClasses' => [$loyaltyClass],
            'loyaltyObjects' => [$loyaltyObject],
        ],
    ];
    if (!empty($origins)) {
        $claims['origins'] = $origins;
    }

    try {
        $jwt = gw_sign_jwt(['alg' => 'RS256', 'typ' => 'JWT'], $claims, $sa['private_key']);

        // Si la clase/objeto ya existían en Google Wallet, actualizarlos vía PATCH
        try {
            $accessToken = gw_get_access_token($sa);
            $classPatchUrl = 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/' . rawurlencode($classId);
            $classPatchPayload = [
                'issuerName' => $issuerName,
                'programName' => $programName,
                'hexBackgroundColor' => $hexBg,
                'programLogo' => $loyaltyClass['programLogo'],
            ];
            if (!empty($loyaltyClass['heroImage'])) {
                $classPatchPayload['heroImage'] = $loyaltyClass['heroImage'];
            }
            if (!empty($loyaltyClass['locations'])) {
                $classPatchPayload['locations'] = $loyaltyClass['locations'];
            }
            $chClass = curl_init($classPatchUrl);
            curl_setopt_array($chClass, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST => 'PATCH',
                CURLOPT_HTTPHEADER => [
                    "Authorization: Bearer {$accessToken}",
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode($classPatchPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                CURLOPT_TIMEOUT => 8,
            ]);
            curl_exec($chClass);
            curl_close($chClass);

            $patchUrl = 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/' . rawurlencode($objectId);
            $patchPayload = [
                'loyaltyPoints' => $loyaltyObject['loyaltyPoints'],
                'secondaryLoyaltyPoints' => $loyaltyObject['secondaryLoyaltyPoints'],
                'textModulesData' => $loyaltyObject['textModulesData'],
                'barcode' => $loyaltyObject['barcode'] ?? null,
            ];
            if (!empty($loyaltyObject['heroImage'])) {
                $patchPayload['heroImage'] = $loyaltyObject['heroImage'];
            }
            $ch = curl_init($patchUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST => 'PATCH',
                CURLOPT_HTTPHEADER => [
                    "Authorization: Bearer {$accessToken}",
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode($patchPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                CURLOPT_TIMEOUT => 8,
            ]);
            curl_exec($ch);
            curl_close($ch);
        } catch (Throwable $ignored) {
            // Si aún no existe (404) o falla red, el JWT savetowallet lo creará al guardar
        }

        gw_json_response(200, [
            'success' => true,
            'saveUrl' => "https://pay.google.com/gp/v/save/{$jwt}",
            'classId' => $classId,
            'objectId' => $objectId,
        ]);
    } catch (Throwable $e) {
        gw_json_response(500, ['success' => false, 'error' => $e->getMessage()]);
    }
}

if ($action === 'sync-points') {
    try {
        $accessToken = gw_get_access_token($sa);
        $patchUrl = 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/' . rawurlencode($objectId);
        $patchPayload = [
            'loyaltyPoints' => [
                'label' => 'Puntos',
                'balance' => ['int' => $points],
            ],
            'secondaryLoyaltyPoints' => [
                'label' => 'Sellos',
                'balance' => ['string' => "{$stampBar} ({$activeStamps}/{$goal})"],
            ],
            'textModulesData' => [
                [
                    'id' => 'stamps_progress',
                    'header' => "Sellos Marcados ({$activeStamps} / {$goal})",
                    'body' => "{$stampPizzaBar}\n{$stampStatusText}",
                ],
            ],
        ];
        if ($barcodeType !== 'NONE') {
        $loyaltyObject['barcode'] = [
            'type' => $barcodeType,
            'value' => "KHALESSI:LOYALTY:{$customerId}",
            'alternateText' => $accountId,
        ];
    }

    if ($dynamicHeroUrl !== '') {
            $patchPayload['heroImage'] = [
                'sourceUri' => ['uri' => $dynamicHeroUrl],
                'contentDescription' => [
                    'defaultValue' => ['language' => 'es', 'value' => "Sellos {$activeStamps} de {$goal}"],
                ],
            ];
        }
        $patchBody = json_encode($patchPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $ch = curl_init($patchUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'PATCH',
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$accessToken}",
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $patchBody,
            CURLOPT_TIMEOUT => 12,
        ]);
        $resp = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 404) {
            gw_json_response(200, [
                'success' => true,
                'synced' => false,
                'reason' => 'object_not_found',
            ]);
        }
        if ($code >= 400 || $resp === false) {
            gw_json_response(502, [
                'success' => false,
                'error' => 'Google Wallet API devolvió error al sincronizar.',
                'status' => $code,
            ]);
        }

        gw_json_response(200, [
            'success' => true,
            'synced' => true,
            'objectId' => $objectId,
            'points' => $points,
        ]);
    } catch (Throwable $e) {
        gw_json_response(500, ['success' => false, 'error' => $e->getMessage()]);
    }
}

if ($action === 'send-promo') {
    $header = substr(trim((string) ($body['header'] ?? '')), 0, 80);
    $rawBodyText = substr(trim((string) ($body['body'] ?? '')), 0, 400);
    $promoUrl = trim((string) ($body['promoUrl'] ?? ''));

    if ($header === '' || $rawBodyText === '') {
        gw_json_response(400, ['success' => false, 'error' => 'Título y mensaje son obligatorios.']);
    }

    $finalBody = gw_is_https_url($promoUrl) ? "{$rawBodyText}\n{$promoUrl}" : $rawBodyText;
    $messageType = ((string) ($body['messageType'] ?? 'TEXT_AND_NOTIFY')) === 'TEXT' ? 'TEXT' : 'TEXT_AND_NOTIFY';
    $targetCust = trim((string) ($body['targetCustomerId'] ?? ''));

    $targetEndpoint = $targetCust !== ''
        ? 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/' . rawurlencode("{$issuerId}.khalessi_cust_" . gw_sanitize_id($targetCust)) . '/addMessage'
        : 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/' . rawurlencode($classId) . '/addMessage';

    try {
        $accessToken = gw_get_access_token($sa);
        $msgId = 'promo_' . time();
        $msgPayload = json_encode([
            'message' => [
                'id' => $msgId,
                'header' => $header,
                'body' => $finalBody,
                'messageType' => $messageType,
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $ch = curl_init($targetEndpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$accessToken}",
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $msgPayload,
            CURLOPT_TIMEOUT => 12,
        ]);
        $resp = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code >= 400 || $resp === false) {
            $errMsg = 'Error enviando notificación a Google Wallet.';
            $decoded = json_decode((string) $resp, true);
            if (is_array($decoded) && !empty($decoded['error']['message'])) {
                $errMsg = (string) $decoded['error']['message'];
            }
            gw_json_response(502, ['success' => false, 'error' => $errMsg]);
        }

        gw_json_response(200, ['success' => true, 'messageId' => $msgId]);
    } catch (Throwable $e) {
        gw_json_response(500, ['success' => false, 'error' => $e->getMessage()]);
    }
}

gw_json_response(400, ['success' => false, 'error' => 'Acción POST no reconocida.']);
