<?php
/**
 * Endpoint de Menú y Catálogo de Productos
 * GET /api/products.php -> Retorna todas las categorías con sus productos
 */

require_once __DIR__ . '/config.php';
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'error' => 'Método no permitido'], 405);
}

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
} catch (Exception $e) {
    sendResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
