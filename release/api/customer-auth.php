<?php
/**
 * Autenticación y perfil de clientes de Tienda Virtual (sin exponer cuentas ni CRM al público).
 *   GET  /api/customer-auth.php                     -> Perfil vigente del cliente (requiere X-Customer-Token)
 *   POST /api/customer-auth.php {action:'register'} -> Registro de cuenta + sincronización CRM
 *   POST /api/customer-auth.php {action:'login'}    -> Inicio de sesión (con rate limiting por IP)
 *   POST /api/customer-auth.php {action:'sync_profile'} -> Actualiza solo la cuenta del cliente autenticado
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

header('Cache-Control: no-store, no-cache, must-revalidate');

const CUST_ACCOUNTS_KEY = 'kh_store_customer_accounts_v1';
const CUST_CRM_KEY = 'kh_customers_crm_v1';
const CUST_BENEFITS_KEY = 'kh_erp_benefits_v1';
const CUST_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 días
const CUST_PBKDF2_ITERATIONS = 100000;
const CUST_LOGIN_MAX_ATTEMPTS = 10;
const CUST_LOGIN_WINDOW = 300;

function custDigits(string $raw): string {
    return preg_replace('/\D+/', '', $raw) ?? '';
}

function custNormalizePhone(string $raw): string {
    $digits = custDigits($raw);
    if ($digits === '') return '';
    if (strlen($digits) === 11 && strncmp($digits, '51', 2) === 0) {
        return substr($digits, 2);
    }
    return $digits;
}

function custHashPassword(string $password): string {
    $salt = random_bytes(16);
    $derived = hash_pbkdf2('sha256', $password, $salt, CUST_PBKDF2_ITERATIONS, 32, true);
    return 'pbkdf2$' . CUST_PBKDF2_ITERATIONS . '$' . base64_encode($salt) . '$' . base64_encode($derived);
}

function custVerifyPassword(string $password, string $stored): bool {
    if ($stored === '') return false;
    if (strncmp($stored, 'pbkdf2$', 7) !== 0) {
        return hash_equals($stored, $password);
    }
    $parts = explode('$', $stored);
    if (count($parts) !== 4) return false;
    $iterations = (int)$parts[1];
    if ($iterations < 1000) return false;
    $salt = base64_decode($parts[2], true);
    $expected = base64_decode($parts[3], true);
    if ($salt === false || $expected === false) return false;
    $actual = hash_pbkdf2('sha256', $password, $salt, $iterations, strlen($expected), true);
    return hash_equals($expected, $actual);
}

function custSignToken(string $accountId): string {
    $payload = b64u(json_encode([
        'role' => 'customer',
        'sub'  => $accountId,
        'iat'  => time(),
        'exp'  => time() + CUST_TOKEN_TTL,
    ]));
    $sig = b64u(hash_hmac('sha256', $payload, tokenSecret(), true));
    return $payload . '.' . $sig;
}

function custRequestToken(): string {
    if (!empty($_SERVER['HTTP_X_CUSTOMER_TOKEN'])) {
        return trim((string)$_SERVER['HTTP_X_CUSTOMER_TOKEN']);
    }
    if (!empty($_SERVER['REDIRECT_HTTP_X_CUSTOMER_TOKEN'])) {
        return trim((string)$_SERVER['REDIRECT_HTTP_X_CUSTOMER_TOKEN']);
    }
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $hk => $hv) {
                if (strtolower((string)$hk) === 'x-customer-token' && trim((string)$hv) !== '') {
                    return trim((string)$hv);
                }
            }
        }
    }
    return '';
}

function custVerifyToken(string $token): ?array {
    $claims = verifyToken($token);
    if (!$claims || ($claims['role'] ?? '') !== 'customer' || empty($claims['sub'])) {
        return null;
    }
    return $claims;
}

function custSanitizeAccount(array $acc): array {
    $out = $acc;
    $out['password'] = '';
    return $out;
}

function custLoadArray(PDO $pdo, string $key): array {
    $raw = kvGet($pdo, $key);
    if ($raw === null) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function custSaveArray(PDO $pdo, string $key, array $arr): void {
    kvSet($pdo, $key, json_encode(array_values($arr), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function custRateLimitFile(): string {
    $ipHash = hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $dir = __DIR__ . '/.rate_limit';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    if (is_dir($dir) && is_writable($dir)) {
        return $dir . '/cust_auth_' . $ipHash . '.json';
    }
    return rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'kh_cust_auth_' . $ipHash . '.json';
}

function custCheckLoginRateLimit(): void {
    $file = custRateLimitFile();
    if (!is_file($file)) return;
    $data = json_decode((string)@file_get_contents($file), true);
    if (!is_array($data)) return;
    $now = time();
    $attempts = array_values(array_filter($data['attempts'] ?? [], fn($ts) => is_int($ts) && ($now - $ts) < CUST_LOGIN_WINDOW));
    if (count($attempts) >= CUST_LOGIN_MAX_ATTEMPTS) {
        $retryAfter = max(1, CUST_LOGIN_WINDOW - ($now - min($attempts)));
        header('Retry-After: ' . $retryAfter);
        sendResponse(['ok' => false, 'error' => 'Demasiados intentos. Espera unos minutos antes de reintentar.'], 429);
    }
}

function custRecordLoginFailure(): void {
    $file = custRateLimitFile();
    $now = time();
    $attempts = [];
    if (is_file($file)) {
        $data = json_decode((string)@file_get_contents($file), true);
        if (is_array($data) && isset($data['attempts']) && is_array($data['attempts'])) {
            $attempts = array_values(array_filter($data['attempts'], fn($ts) => is_int($ts) && ($now - $ts) < CUST_LOGIN_WINDOW));
        }
    }
    $attempts[] = $now;
    @file_put_contents($file, json_encode(['attempts' => $attempts]), LOCK_EX);
}

function custClearLoginRateLimit(): void {
    $file = custRateLimitFile();
    if (is_file($file)) @unlink($file);
}

/** Sincroniza una cuenta de tienda con la cartera CRM y devuelve el ID CRM resultante. */
function custUpsertIntoCrm(PDO $pdo, array $acc, string $tenantId = 'tenant-1'): string {
    $crmList = custLoadArray($pdo, CUST_CRM_KEY);
    $emailClean = strtolower(trim((string)($acc['email'] ?? '')));
    $phoneDigits = custDigits((string)($acc['phone'] ?? ''));
    $dniClean = custDigits((string)($acc['dni'] ?? ''));
    $crmId = trim((string)($acc['crmCustomerId'] ?? ''));

    $defaultAddr = '';
    $defaultRef = '';
    if (!empty($acc['addresses']) && is_array($acc['addresses'])) {
        $chosen = $acc['addresses'][0];
        foreach ($acc['addresses'] as $a) {
            if (is_array($a) && !empty($a['isDefault'])) {
                $chosen = $a;
                break;
            }
        }
        if (is_array($chosen)) {
            $defaultAddr = (string)($chosen['streetAddress'] ?? '');
            $defaultRef = (string)($chosen['reference'] ?? '');
        }
    }

    $nowIso = gmdate('c');
    $matchedIndex = -1;
    foreach ($crmList as $idx => $c) {
        if (!is_array($c)) continue;
        if (
            ($crmId !== '' && (string)($c['id'] ?? '') === $crmId) ||
            ($emailClean !== '' && strtolower(trim((string)($c['email'] ?? ''))) === $emailClean) ||
            (strlen($phoneDigits) >= 7 && custDigits((string)($c['whatsapp'] ?? '')) === $phoneDigits) ||
            (strlen($dniClean) >= 8 && custDigits((string)($c['dni'] ?? '')) === $dniClean)
        ) {
            $matchedIndex = $idx;
            break;
        }
    }

    if ($matchedIndex >= 0) {
        $existing = $crmList[$matchedIndex];
        $resolvedId = (string)($existing['id'] ?? ('cust-' . round(microtime(true) * 1000)));
        $crmList[$matchedIndex] = array_merge($existing, [
            'id'            => $resolvedId,
            'dni'           => $dniClean !== '' ? $dniClean : (string)($existing['dni'] ?? ''),
            'fullName'      => trim((string)($acc['fullName'] ?? ($existing['fullName'] ?? 'Cliente'))),
            'email'         => $emailClean !== '' ? $emailClean : (string)($existing['email'] ?? ''),
            'whatsapp'      => (string)($acc['phone'] ?? ($existing['whatsapp'] ?? '')),
            'address'       => $defaultAddr !== '' ? $defaultAddr : (string)($existing['address'] ?? ''),
            'reference'     => $defaultRef !== '' ? $defaultRef : (string)($existing['reference'] ?? ''),
            'loyaltyPoints' => isset($acc['points']) ? (int)$acc['points'] : (int)($existing['loyaltyPoints'] ?? 0),
            'updatedAt'     => $nowIso,
        ]);
        custSaveArray($pdo, CUST_CRM_KEY, $crmList);
        return $resolvedId;
    }

    $newCrmId = $crmId !== '' ? $crmId : ('cust-' . round(microtime(true) * 1000) . '-' . bin2hex(random_bytes(2)));
    array_unshift($crmList, [
        'id'            => $newCrmId,
        'dni'           => $dniClean,
        'fullName'      => trim((string)($acc['fullName'] ?? 'Cliente')),
        'email'         => $emailClean,
        'whatsapp'      => (string)($acc['phone'] ?? ''),
        'address'       => $defaultAddr,
        'reference'     => $defaultRef,
        'loyaltyPoints' => (int)($acc['points'] ?? 0),
        'tenantId'      => $tenantId !== '' ? $tenantId : 'tenant-1',
        'createdAt'     => $nowIso,
        'updatedAt'     => $nowIso,
    ]);
    custSaveArray($pdo, CUST_CRM_KEY, $crmList);
    return $newCrmId;
}

$pdo = getDbConnection();
kvInit($pdo);
$method = $_SERVER['REQUEST_METHOD'];

// GET /api/customer-auth.php -> Perfil actual autenticado
if ($method === 'GET') {
    $claims = custVerifyToken(custRequestToken());
    if (!$claims) {
        sendResponse(['ok' => false, 'error' => 'Sesión de cliente no válida'], 401);
    }

    $accounts = custLoadArray($pdo, CUST_ACCOUNTS_KEY);
    $found = null;
    foreach ($accounts as $acc) {
        if (is_array($acc) && (string)($acc['id'] ?? '') === (string)$claims['sub']) {
            $found = $acc;
            break;
        }
    }

    if (!$found) {
        sendResponse(['ok' => false, 'deleted' => true, 'error' => 'Cuenta eliminada'], 404);
    }

    // Sincronizar puntos más recientes desde CRM si un administrador los actualizó
    $crmList = custLoadArray($pdo, CUST_CRM_KEY);
    $crmId = (string)($found['crmCustomerId'] ?? '');
    if ($crmId !== '') {
        foreach ($crmList as $c) {
            if (is_array($c) && (string)($c['id'] ?? '') === $crmId && isset($c['loyaltyPoints'])) {
                $crmTs = strtotime((string)($c['updatedAt'] ?? '')) ?: 0;
                $accTs = strtotime((string)($found['updatedAt'] ?? '')) ?: 0;
                if ($crmTs > $accTs && (int)$c['loyaltyPoints'] !== (int)($found['points'] ?? 0)) {
                    $found['points'] = (int)$c['loyaltyPoints'];
                    $found['updatedAt'] = (string)$c['updatedAt'];
                }
                break;
            }
        }
    }

    sendResponse(['ok' => true, 'account' => custSanitizeAccount($found)]);
}

if ($method !== 'POST') {
    sendResponse(['ok' => false, 'error' => 'Método no permitido'], 405);
}

$input = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($input)) {
    sendResponse(['ok' => false, 'error' => 'Cuerpo JSON inválido'], 400);
}

$action = trim((string)($input['action'] ?? ''));

// --- REGISTRO ---
if ($action === 'register') {
    $fullName = trim((string)($input['fullName'] ?? ''));
    $emailClean = strtolower(trim((string)($input['email'] ?? '')));
    $phoneClean = custNormalizePhone((string)($input['phone'] ?? ''));
    $phoneDigits = custDigits($phoneClean);
    $dniClean = trim((string)($input['dni'] ?? ''));
    $password = (string)($input['password'] ?? '');
    $tenantId = trim((string)($input['tenantId'] ?? 'tenant-1'));

    if ($fullName === '' || $emailClean === '' || $phoneClean === '' || $password === '') {
        sendResponse(['ok' => false, 'error' => 'Completa todos los campos obligatorios.'], 400);
    }

    $accounts = custLoadArray($pdo, CUST_ACCOUNTS_KEY);
    foreach ($accounts as $a) {
        if (!is_array($a)) continue;
        $aEmail = strtolower(trim((string)($a['email'] ?? '')));
        $aPhoneDigits = custDigits((string)($a['phone'] ?? ''));
        if ($aEmail === $emailClean || (strlen($phoneDigits) >= 7 && $aPhoneDigits === $phoneDigits)) {
            sendResponse(['ok' => false, 'error' => 'Ya existe una cuenta registrada con ese correo o número celular.'], 409);
        }
    }

    // Leer configuración de puntos de bienvenida desde kh_erp_benefits_v1
    $awardOnRegister = true;
    $welcomeAmount = 1;
    $rawBenefits = kvGet($pdo, CUST_BENEFITS_KEY);
    if ($rawBenefits !== null) {
        $parsedB = json_decode($rawBenefits, true);
        if (is_array($parsedB) && isset($parsedB['pointsConfig']) && is_array($parsedB['pointsConfig'])) {
            if (isset($parsedB['pointsConfig']['awardPointOnRegister']) && is_bool($parsedB['pointsConfig']['awardPointOnRegister'])) {
                $awardOnRegister = $parsedB['pointsConfig']['awardPointOnRegister'];
            }
            if (isset($parsedB['pointsConfig']['welcomePointsAmount']) && is_numeric($parsedB['pointsConfig']['welcomePointsAmount']) && $parsedB['pointsConfig']['welcomePointsAmount'] > 0) {
                $welcomeAmount = (int)round((float)$parsedB['pointsConfig']['welcomePointsAmount']);
            }
        }
    }

    $nowIso = gmdate('c');
    $nowMs = (int)round(microtime(true) * 1000);
    $initialPoints = $awardOnRegister ? $welcomeAmount : 0;
    $initialHistory = $awardOnRegister ? [[
        'id'     => 'pt-init-' . $nowMs,
        'date'   => $nowIso,
        'delta'  => $welcomeAmount,
        'reason' => 'Bono de Bienvenida Club Gastro',
    ]] : [];

    $newAccount = [
        'id'             => 'cust-acc-' . $nowMs . '-' . bin2hex(random_bytes(2)),
        'fullName'       => $fullName,
        'dni'            => $dniClean,
        'phone'          => $phoneClean,
        'email'          => $emailClean,
        'password'       => custHashPassword($password),
        'addresses'      => [],
        'paymentMethods' => [],
        'orderIds'       => [],
        'points'         => $initialPoints,
        'pointsHistory'  => $initialHistory,
        'createdAt'      => $nowIso,
        'updatedAt'      => $nowIso,
    ];

    $newAccount['crmCustomerId'] = custUpsertIntoCrm($pdo, $newAccount, $tenantId);
    array_unshift($accounts, $newAccount);
    custSaveArray($pdo, CUST_ACCOUNTS_KEY, $accounts);

    $token = custSignToken($newAccount['id']);
    sendResponse([
        'ok'      => true,
        'token'   => $token,
        'account' => custSanitizeAccount($newAccount),
    ]);
}

// --- LOGIN ---
if ($action === 'login') {
    custCheckLoginRateLimit();

    $identifier = strtolower(trim((string)($input['identifier'] ?? '')));
    $idDigits = custDigits($identifier);
    $password = (string)($input['password'] ?? '');

    if ($identifier === '' || $password === '') {
        sendResponse(['ok' => false, 'error' => 'Ingresa tu correo/celular y contraseña.'], 400);
    }

    $accounts = custLoadArray($pdo, CUST_ACCOUNTS_KEY);
    $matchIdx = -1;
    foreach ($accounts as $idx => $a) {
        if (!is_array($a)) continue;
        $aEmail = strtolower(trim((string)($a['email'] ?? '')));
        $aPhoneDigits = custDigits((string)($a['phone'] ?? ''));
        if ($aEmail === $identifier || (strlen($idDigits) >= 7 && $aPhoneDigits === $idDigits)) {
            $matchIdx = $idx;
            break;
        }
    }

    if ($matchIdx < 0 || !custVerifyPassword($password, (string)($accounts[$matchIdx]['password'] ?? ''))) {
        custRecordLoginFailure();
        usleep(180000);
        sendResponse(['ok' => false, 'error' => 'Correo/celular o contraseña incorrectos. Verifica tus datos.'], 401);
    }

    custClearLoginRateLimit();
    $account = $accounts[$matchIdx];

    // Actualizar contraseñas heredadas sin hash PBKDF2
    if (strncmp((string)($account['password'] ?? ''), 'pbkdf2$', 7) !== 0) {
        $account['password'] = custHashPassword($password);
        $accounts[$matchIdx] = $account;
        custSaveArray($pdo, CUST_ACCOUNTS_KEY, $accounts);
    }

    $token = custSignToken((string)$account['id']);
    sendResponse([
        'ok'      => true,
        'token'   => $token,
        'account' => custSanitizeAccount($account),
    ]);
}

// --- SINCRONIZAR PERFIL PROPIO ---
if ($action === 'sync_profile') {
    $claims = custVerifyToken(custRequestToken());
    if (!$claims) {
        sendResponse(['ok' => false, 'error' => 'Sesión de cliente no válida'], 401);
    }

    $incoming = $input['account'] ?? null;
    if (!is_array($incoming) || (string)($incoming['id'] ?? '') !== (string)$claims['sub']) {
        sendResponse(['ok' => false, 'error' => 'No autorizado para modificar esta cuenta'], 403);
    }

    $accounts = custLoadArray($pdo, CUST_ACCOUNTS_KEY);
    $matchIdx = -1;
    foreach ($accounts as $idx => $a) {
        if (is_array($a) && (string)($a['id'] ?? '') === (string)$claims['sub']) {
            $matchIdx = $idx;
            break;
        }
    }

    if ($matchIdx < 0) {
        sendResponse(['ok' => false, 'deleted' => true, 'error' => 'Cuenta eliminada'], 404);
    }

    $existing = $accounts[$matchIdx];
    $updated = array_merge($existing, [
        'fullName'       => trim((string)($incoming['fullName'] ?? ($existing['fullName'] ?? ''))),
        'dni'            => trim((string)($incoming['dni'] ?? ($existing['dni'] ?? ''))),
        'phone'          => custNormalizePhone((string)($incoming['phone'] ?? ($existing['phone'] ?? ''))),
        'email'          => strtolower(trim((string)($incoming['email'] ?? ($existing['email'] ?? '')))),
        'addresses'      => is_array($incoming['addresses'] ?? null) ? $incoming['addresses'] : ($existing['addresses'] ?? []),
        'paymentMethods' => is_array($incoming['paymentMethods'] ?? null) ? $incoming['paymentMethods'] : ($existing['paymentMethods'] ?? []),
        'orderIds'       => is_array($incoming['orderIds'] ?? null) ? $incoming['orderIds'] : ($existing['orderIds'] ?? []),
        'points'         => isset($incoming['points']) && is_numeric($incoming['points']) ? max(0, (int)$incoming['points']) : (int)($existing['points'] ?? 0),
        'pointsHistory'  => is_array($incoming['pointsHistory'] ?? null) ? $incoming['pointsHistory'] : ($existing['pointsHistory'] ?? []),
        'password'       => (string)($existing['password'] ?? ''), // Nunca sobrescribir hash desde sync_profile
        'updatedAt'      => gmdate('c'),
    ]);

    $tenantId = trim((string)($input['tenantId'] ?? 'tenant-1'));
    $updated['crmCustomerId'] = custUpsertIntoCrm($pdo, $updated, $tenantId);
    $accounts[$matchIdx] = $updated;
    custSaveArray($pdo, CUST_ACCOUNTS_KEY, $accounts);

    sendResponse([
        'ok'      => true,
        'account' => custSanitizeAccount($updated),
    ]);
}

sendResponse(['ok' => false, 'error' => 'Acción inválida'], 400);
