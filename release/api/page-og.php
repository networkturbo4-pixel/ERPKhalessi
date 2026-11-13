<?php
/**
 * Inyecta metadatos Open Graph dinámicos en index.html para URLs cortas (/p/{slug})
 * permitiendo vistas previas enriquecidas en WhatsApp, Facebook, X, LinkedIn y Telegram.
 */
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$indexPath = dirname(__DIR__) . '/index.html';
if (!is_file($indexPath)) {
    http_response_code(404);
    echo 'index.html not found';
    exit;
}

$html = file_get_contents($indexPath);
$slug = isset($_GET['slug']) ? trim((string)$_GET['slug']) : '';

if ($slug === '') {
    echo $html;
    exit;
}

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/storage-lib.php';
    header('Content-Type: text/html; charset=UTF-8');

    $pdo = getDbConnection();
    kvInit($pdo);
    $rawBuilder = kvGet($pdo, 'kh_store_builder_v2');

    if ($rawBuilder) {
        $builder = json_decode($rawBuilder, true);
        $pages = is_array($builder['customPages'] ?? null) ? $builder['customPages'] : [];
        $matched = null;
        foreach ($pages as $p) {
            if (isset($p['slug']) && strcasecmp((string)$p['slug'], $slug) === 0) {
                if (($p['status'] ?? 'published') === 'published') {
                    $matched = $p;
                }
                break;
            }
        }

        if ($matched) {
            $seo = is_array($matched['seo'] ?? null) ? $matched['seo'] : [];
            $title = htmlspecialchars((string)($seo['ogTitle'] ?: $matched['title'] ?: 'Página'), ENT_QUOTES, 'UTF-8');
            $desc = htmlspecialchars((string)($seo['ogDescription'] ?: ''), ENT_QUOTES, 'UTF-8');
            $image = htmlspecialchars((string)($seo['ogImage'] ?: ''), ENT_QUOTES, 'UTF-8');
            $ogType = htmlspecialchars((string)($seo['ogType'] ?: 'website'), ENT_QUOTES, 'UTF-8');
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $url = htmlspecialchars("{$scheme}://{$host}/p/{$slug}", ENT_QUOTES, 'UTF-8');

            $metaTags = "\n  <meta property=\"og:title\" content=\"{$title}\" />"
                . "\n  <meta property=\"og:description\" content=\"{$desc}\" />"
                . "\n  <meta property=\"og:type\" content=\"{$ogType}\" />"
                . "\n  <meta property=\"og:url\" content=\"{$url}\" />"
                . ($image !== '' ? "\n  <meta property=\"og:image\" content=\"{$image}\" />" : '')
                . "\n  <meta name=\"description\" content=\"{$desc}\" />"
                . "\n  <meta name=\"twitter:card\" content=\"" . ($image !== '' ? 'summary_large_image' : 'summary') . "\" />"
                . "\n  <meta name=\"twitter:title\" content=\"{$title}\" />"
                . "\n  <meta name=\"twitter:description\" content=\"{$desc}\" />"
                . ($image !== '' ? "\n  <meta name=\"twitter:image\" content=\"{$image}\" />" : '')
                . "\n";

            $html = preg_replace('/<title>.*?<\/title>/is', "<title>{$title}</title>", $html, 1);
            $html = str_replace('</head>', $metaTags . '</head>', $html);
        }
    }
} catch (Throwable $e) {
    // Fallback silencioso a index.html estándar
}

echo $html;
