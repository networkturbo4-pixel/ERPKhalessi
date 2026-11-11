<?php
/**
 * Test de Conexión de Base de Datos
 * GET /api/test.php -> Verifica si la conexión con MySQL en cPanel está operativa
 */

require_once __DIR__ . '/config.php';

try {
    $pdo = getDbConnection();
    $stmt = $pdo->query("SELECT DATABASE() AS current_db, VERSION() AS mysql_version, NOW() AS server_time");
    $info = $stmt->fetch();

    $countTenants = $pdo->query("SELECT COUNT(*) AS total FROM tenants")->fetchColumn();
    $countProducts = $pdo->query("SELECT COUNT(*) AS total FROM products")->fetchColumn();

    sendResponse([
        'success'        => true,
        'message'        => '¡Conexión exitosa a MySQL en cPanel!',
        'database'       => $info['current_db'],
        'mysql_version'  => $info['mysql_version'],
        'server_time'    => $info['server_time'],
        'stats' => [
            'total_sucursales' => (int)$countTenants,
            'total_productos'  => (int)$countProducts,
        ]
    ]);
} catch (Exception $e) {
    sendResponse([
        'success' => false,
        'error'   => 'Fallo la prueba de conexión',
        'details' => $e->getMessage()
    ], 500);
}
