<?php
/**
 * Inyecta metadatos Open Graph dinámicos en index.html para URLs de producto (/producto/{slug})
 * permitiendo vistas previas enriquecidas (foto, nombre y precio) en WhatsApp, Facebook y Telegram.
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

function toProductSlugSimple(string $name): string {
    $s = mb_strtolower(trim($name), 'UTF-8');
    $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim((string)$s, '-');
}

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/storage-lib.php';

    $pdo = getDbConnection();
    kvInit($pdo);
    $rawProducts = kvGet($pdo, 'kh_catalog_products');

    if ($rawProducts) {
        $products = json_decode($rawProducts, true);
        if (is_array($products)) {
            $matched = null;
            foreach ($products as $prod) {
                $prodSlug = isset($prod['name']) ? toProductSlugSimple((string)$prod['name']) : '';
                if ($prodSlug !== '' && strcasecmp($prodSlug, $slug) === 0) {
                    $matched = $prod;
                    break;
                }
            }

            if ($matched) {
                $rawPrice = $matched['basePrice'] ?? 0;
                if (!empty($matched['hasSizes']) && !empty($matched['sizes']) && is_array($matched['sizes'])) {
                    $rawPrice = $matched['sizes'][0]['price'] ?? $rawPrice;
                }
                $price = number_format((float)$rawPrice, 2);
                $title = htmlspecialchars((string)($matched['name'] ?? 'Pizza Khalessi') . " — S/ {$price}", ENT_QUOTES, 'UTF-8');
                $desc = htmlspecialchars((string)($matched['description'] ?? 'Pídelo en línea en Pizza Khalessi.'), ENT_QUOTES, 'UTF-8');
                $image = htmlspecialchars((string)($matched['imageUrl'] ?? ''), ENT_QUOTES, 'UTF-8');
                $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $url = htmlspecialchars("{$scheme}://{$host}/producto/{$slug}", ENT_QUOTES, 'UTF-8');

                $metaTags = "\n  <meta property=\"og:title\" content=\"{$title}\" />"
                    . "\n  <meta property=\"og:description\" content=\"{$desc}\" />"
                    . "\n  <meta property=\"og:type\" content=\"product\" />"
                    . "\n  <meta property=\"og:url\" content=\"{$url}\" />"
                    . ($image !== '' ? "\n  <meta property=\"og:image\" content=\"{$image}\" />" : '')
                    . "\n  <meta name=\"twitter:card\" content=\"summary_large_image\" />"
                    . "\n  <meta name=\"twitter:title\" content=\"{$title}\" />"
                    . "\n  <meta name=\"twitter:description\" content=\"{$desc}\" />";

                $html = preg_replace('/<title>.*?<\/title>/is', "<title>{$title}</title>{$metaTags}", $html, 1);
            }
        }
    }
} catch (Throwable $e) {
    // Fallback silencioso a index.html estándar
}

echo $html;
