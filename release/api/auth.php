<?php
/**
 * Inicio de sesión de personal ERP para sincronización autenticada con el servidor.
 *   POST /api/auth.php  {"pin":"12345678"}  ->  {success, token, expires, user}
 * El PIN se valida contra los colaboradores guardados en kv_storage, tabla MySQL `users`
 * o contra el PIN de administración de rescate/bootstrap (ADMIN_BOOTSTRAP_PIN en config.local.php)
 * únicamente mientras no existan usuarios configurados.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'error' => 'Método no permitido'], 405);
}

// --- Rate limiting por IP contra fuerza bruta de PIN ---
const AUTH_MAX_ATTEMPTS = 5;
const AUTH_WINDOW_SECONDS = 300; // 5 minutos

function getClientIpKey(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return hash('sha256', (string)$ip);
}

function getRateLimitFile(): string {
    $dir = __DIR__ . '/.rate_limit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    if (is_dir($dir) && is_writable($dir)) {
        return $dir . '/auth_' . getClientIpKey() . '.json';
    }
    return rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'kh_auth_' . getClientIpKey() . '.json';
}

function checkRateLimit(): void {
    $file = getRateLimitFile();
    if (!is_file($file)) return;
    $raw = @file_get_contents($file);
    $data = $raw ? json_decode($raw, true) : null;
    if (!is_array($data)) return;

    $now = time();
    $attempts = array_values(array_filter($data['attempts'] ?? [], fn($ts) => is_int($ts) && ($now - $ts) < AUTH_WINDOW_SECONDS));
    if (count($attempts) >= AUTH_MAX_ATTEMPTS) {
        $oldest = min($attempts);
        $retryAfter = max(1, AUTH_WINDOW_SECONDS - ($now - $oldest));
        header('Retry-After: ' . $retryAfter);
        sendResponse([
            'success' => false,
            'error'   => 'Demasiados intentos fallidos. Intenta nuevamente en unos minutos.',
        ], 429);
    }
}

function recordFailedAttempt(): void {
    $file = getRateLimitFile();
    $now = time();
    $attempts = [];
    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $data = $raw ? json_decode($raw, true) : null;
        if (is_array($data) && isset($data['attempts']) && is_array($data['attempts'])) {
            $attempts = array_values(array_filter($data['attempts'], fn($ts) => is_int($ts) && ($now - $ts) < AUTH_WINDOW_SECONDS));
        }
    }
    $attempts[] = $now;
    @file_put_contents($file, json_encode(['attempts' => $attempts]), LOCK_EX);
}

function clearRateLimit(): void {
    $file = getRateLimitFile();
    if (is_file($file)) {
        @unlink($file);
    }
}

checkRateLimit();

$pdo = getDbConnection();
kvInit($pdo);

$input = json_decode(file_get_contents('php://input'), true);
$pin = is_array($input) && isset($input['pin']) ? preg_replace('/\D/', '', (string)$input['pin']) : '';

function failAuth(): void {
    recordFailedAttempt();
    usleep(200000); // 200ms contra fuerza bruta
    sendResponse(['success' => false, 'error' => 'Credencial no autorizada'], 401);
}

if (!in_array(strlen($pin), [4, 6, 8], true)) {
    failAuth();
}

$settingsRaw = kvGet($pdo, KH_SETTINGS_KEY);
$matched = null;
$hasConfiguredUsers = false;

if ($settingsRaw !== null) {
    $settings = json_decode($settingsRaw, true);
    $users = is_array($settings) && isset($settings['users']) && is_array($settings['users']) ? $settings['users'] : [];
    if (count($users) > 0) {
        $hasConfiguredUsers = true;
    }

    foreach ($users as $u) {
        if (isset($u['pin']) && hash_equals(preg_replace('/\D/', '', (string)$u['pin']), $pin)) {
            $matched = $u;
            break;
        }
    }
}

// Respaldo: buscar en tabla relacional `users` de MySQL si existe
if ($matched === null) {
    try {
        $st = $pdo->prepare("SELECT id, name, role, pin, is_active FROM users WHERE pin = :pin LIMIT 1");
        $st->execute([':pin' => $pin]);
        $dbUser = $st->fetch();
        if ($dbUser && (!isset($dbUser['is_active']) || (int)$dbUser['is_active'] === 1)) {
            $roleMap = [
                'superadmin' => 'role-admin',
                'admin'      => 'role-admin',
                'gerente'    => 'role-manager',
                'cajero'     => 'role-cashier',
                'cocina'     => 'role-kitchen',
                'repartidor' => 'role-driver',
            ];
            $rKey = strtolower((string)($dbUser['role'] ?? 'admin'));
            $matched = [
                'id'     => (string)$dbUser['id'],
                'name'   => (string)$dbUser['name'],
                'roleId' => $roleMap[$rKey] ?? 'role-admin',
                'status' => 'active',
            ];
        }
    } catch (Throwable $e) {
        // Ignorar si la tabla relacional aún no fue creada
    }
}

// Rescate maestro: ADMIN_BOOTSTRAP_PIN definido en config.local.php siempre permite acceso administrativo de respaldo
if ($matched === null) {
    if (defined('ADMIN_BOOTSTRAP_PIN') && ADMIN_BOOTSTRAP_PIN !== '' && hash_equals((string)ADMIN_BOOTSTRAP_PIN, $pin)) {
        $matched = [
            'id'     => 'bootstrap',
            'name'   => 'Super Administrador',
            'roleId' => 'role-admin',
            'status' => 'active',
        ];
    }
}

if ($matched === null || (isset($matched['status']) && $matched['status'] === 'suspended')) {
    failAuth();
}

clearRateLimit();

$uid = (string)($matched['id'] ?? 'bootstrap');
$uname = (string)($matched['name'] ?? 'Colaborador');
$roleId = (string)($matched['roleId'] ?? 'role-admin');

$t = createToken($uid, $uname, $roleId);
sendResponse([
    'success' => true,
    'token'   => $t['token'],
    'expires' => $t['expires'],
    'user'    => [
        'id'     => $uid,
        'name'   => $uname,
        'roleId' => $roleId,
    ],
]);
