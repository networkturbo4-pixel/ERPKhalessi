<?php
/**
 * Sirve dinámicamente el Favicon oficial de la marca guardado en Configuración > Identidad.
 * GET /api/favicon.php
 */

@ini_set('display_errors', '0');

$fallbackSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#18181b"/><circle cx="32" cy="32" r="18" fill="none" stroke="#e11d48" stroke-width="4"/></svg>';

if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}
defined('DB_HOST') || define('DB_HOST', 'localhost');
defined('DB_USER') || define('DB_USER', 'pizzjkyq_erpkhale');
defined('DB_PASS') || define('DB_PASS', 'Khalessi2026@');
defined('DB_NAME') || define('DB_NAME', 'pizzjkyq_khalessierp');
defined('DB_CHARSET') || define('DB_CHARSET', 'utf8mb4');

header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=120');

try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $st = $pdo->prepare("SELECT v FROM kv_storage WHERE k = 'khalessi_erp_settings_v3' LIMIT 1");
    $st->execute();
    $raw = $st->fetchColumn();

    if ($raw !== false && is_string($raw)) {
        $settings = json_decode($raw, true);
        $cust = is_array($settings) && isset($settings['customization']) && is_array($settings['customization'])
            ? $settings['customization']
            : [];

        $icon = '';
        foreach (['favicon', 'storeHeaderLogo', 'logoDark', 'logoLight'] as $field) {
            if (!empty($cust[$field]) && is_string($cust[$field])) {
                $icon = trim($cust[$field]);
                break;
            }
        }

        if ($icon !== '') {
            if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s', $icon, $matches)) {
                $mime = $matches[1];
                $binary = base64_decode($matches[2], true);
                if ($binary !== false && strlen($binary) > 0) {
                    header('Content-Type: ' . $mime);
                    header('Content-Length: ' . strlen($binary));
                    echo $binary;
                    exit();
                }
            } elseif (preg_match('/^https?:\/\//i', $icon)) {
                header('Location: ' . $icon, true, 302);
                exit();
            }
        }
    }
} catch (Throwable $e) {
    // Fallback limpio a SVG
}

header('Content-Type: image/svg+xml; charset=UTF-8');
echo $fallbackSvg;
