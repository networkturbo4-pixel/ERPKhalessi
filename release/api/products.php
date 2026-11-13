<?php
/**
 * Endpoint de Menú y Catálogo de Productos
 * GET /api/products.php -> Retorna todas las categorías con sus productos (requiere token ERP)
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

$pdo = getDbConnection();

try {
    // 1. Obtener Categorías
    $catStmt = $pdo->query("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC");
    $categories = $catStmt->fetchAll();

    // 2. Obtener Productos
    $prodStmt = $pdo->query("SELECT * FROM products WHERE is_available = 1 ORDER BY created_at DESC");
    $products = $prodStmt->fetchAll();

    sendResponse([
        'success'    => true,
        'categories' => $categories,
        'products'   => $products,
    ]);
} catch (Throwable $e) {
    error_log('[Khalessi ERP products.php] Query error: ' . $e->getMessage());
    sendResponse(['success' => false, 'error' => 'Error al consultar productos'], 500);
}
