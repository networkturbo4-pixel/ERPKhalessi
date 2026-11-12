<?php
/**
 * Conexión Centralizada a MySQL mediante PDO
 * Khalessi Pizza ERP - Backend API para cPanel
 */

// Cabeceras HTTP para permitir comunicación con React (CORS) y formato JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-ERP-Token, X-Client-Id");
header("Content-Type: application/json; charset=UTF-8");

// Manejo de preflight OPTIONS en navegadores modernos
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Las credenciales reales viven en config.local.php (no versionado)
if (file_exists(__DIR__ . '/config.local.php')) {
    require __DIR__ . '/config.local.php';
}
defined('DB_HOST') || define('DB_HOST', 'localhost');
defined('DB_USER') || define('DB_USER', 'pizzjkyq_erpkhale');
defined('DB_PASS') || define('DB_PASS', 'Khalessi2026@');
defined('DB_NAME') || define('DB_NAME', 'pizzjkyq_khalessierp');
defined('DB_CHARSET') || define('DB_CHARSET', 'utf8mb4');
defined('ADMIN_BOOTSTRAP_PIN') || define('ADMIN_BOOTSTRAP_PIN', '230825');

function getDbConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Error de conexión a la base de datos MySQL en cPanel',
                'details' => $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
    return $pdo;
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}
