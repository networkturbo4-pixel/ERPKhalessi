<?php
/**
 * Inicio de sesión de administrador para escritura en el servidor.
 *   POST /api/auth.php  {"pin":"12345678"}  ->  {success, token, expires}
 * El PIN se valida contra los usuarios guardados en el servidor. Mientras el servidor
 * aún no tenga ajustes (primera vez), se acepta ADMIN_BOOTSTRAP_PIN de config.local.php.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'error' => 'Método no permitido'], 405);
}

$pdo = getDbConnection();
kvInit($pdo);

$input = json_decode(file_get_contents('php://input'), true);
$pin = is_array($input) && isset($input['pin']) ? preg_replace('/\D/', '', (string)$input['pin']) : '';

function fail(): void {
    usleep(700000); // frena la fuerza bruta
    sendResponse(['success' => false, 'error' => 'Credencial no autorizada'], 401);
}

if (!in_array(strlen($pin), [4, 6, 8], true)) fail();

$settingsRaw = kvGet($pdo, KH_SETTINGS_KEY);

if ($settingsRaw !== null) {
    $settings = json_decode($settingsRaw, true);
    $users = is_array($settings) && isset($settings['users']) && is_array($settings['users']) ? $settings['users'] : [];

    $matched = null;
    foreach ($users as $u) {
        if (isset($u['pin']) && hash_equals((string)$u['pin'], $pin)) { $matched = $u; break; }
    }
    if ($matched === null || (isset($matched['status']) && $matched['status'] === 'suspended')) fail();

    // Solo roles con permiso de configuración pueden escribir en el servidor
    $isAdminRole = (isset($matched['roleId']) && $matched['roleId'] === 'role-admin');
    if (!$isAdminRole) {
        $rbacRaw = kvGet($pdo, KH_RBAC_KEY);
        $rbac = $rbacRaw ? json_decode($rbacRaw, true) : null;
        if (is_array($rbac) && isset($rbac['roles']) && is_array($rbac['roles'])) {
            foreach ($rbac['roles'] as $role) {
                if (isset($role['id'], $matched['roleId']) && $role['id'] === $matched['roleId']
                    && isset($role['permissions']) && in_array('settings:manage', $role['permissions'], true)) {
                    $isAdminRole = true;
                    break;
                }
            }
        }
    }
    if (!$isAdminRole) fail();

    $t = createToken((string)($matched['id'] ?? ''), (string)($matched['name'] ?? 'Admin'));
    sendResponse(['success' => true, 'token' => $t['token'], 'expires' => $t['expires']]);
}

// Primera vez: el servidor no tiene usuarios todavía
if (defined('ADMIN_BOOTSTRAP_PIN') && ADMIN_BOOTSTRAP_PIN !== '' && hash_equals((string)ADMIN_BOOTSTRAP_PIN, $pin)) {
    $t = createToken('bootstrap', 'Administrador inicial');
    sendResponse(['success' => true, 'token' => $t['token'], 'expires' => $t['expires'], 'bootstrap' => true]);
}

fail();
