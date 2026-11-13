<?php
/**
 * Test de Conexión de Base de Datos (Solo Administradores Autenticados)
 * GET /api/test.php -> Verifica si la conexión con MySQL está operativa
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'error' => 'Método no permitido'], 405);
}

$token = requestToken();
$admin = $token !== '' ? verifyToken($token) : null;
if ($admin === null) {
    sendResponse(['success' => false, 'error' => 'No autorizado'], 401);
}
if (($admin['roleId'] ?? '') !== 'role-admin') {
    sendResponse(['success' => false, 'error' => 'Requiere permisos de administrador'], 403);
}

try {
    $pdo = getDbConnection();
    $stmt = $pdo->query("SELECT NOW() AS server_time");
    $info = $stmt->fetch();

    $countTenants = $pdo->query("SELECT COUNT(*) AS total FROM tenants")->fetchColumn();
    $countProducts = $pdo->query("SELECT COUNT(*) AS total FROM products")->fetchColumn();

    sendResponse([
        'success'     => true,
        'message'     => 'Conexión operativa a MySQL',
        'server_time' => $info['server_time'] ?? null,
        'stats'       => [
            'total_sucursales' => (int)$countTenants,
            'total_productos'  => (int)$countProducts,
        ]
    ]);
} catch (Throwable $e) {
    error_log('[Khalessi ERP test.php] Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'error'   => 'Falló la prueba de conexión',
    ], 500);
}
