<?php
/**
 * Inyecta metadatos Open Graph dinámicos en index.html para URLs de producto (/producto/{slug})
 * permitiendo vistas previas enriquecidas (foto, nombre y precio) en WhatsApp, Facebook y Telegram.
 */
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/og-helper.php';

$slug = isset($_GET['slug']) ? trim((string)$_GET['slug']) : '';
$serveImg = isset($_GET['img']) && $_GET['img'] === '1';

$indexPath = dirname(__DIR__) . '/index.html';
if (!$serveImg && !is_file($indexPath)) {
    http_response_code(404);
    echo 'index.html not found';
    exit;
}

$html = $serveImg ? '' : file_get_contents($indexPath);

if ($slug === '') {
    if ($serveImg) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: text/html; charset=UTF-8');
    echo $html;
    exit;
}

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/storage-lib.php';

    $pdo = getDbConnection();
    kvInit($pdo);

    $rawSettings = kvGet($pdo, 'gastro_erp_settings_v3');
    $settings = $rawSettings ? json_decode($rawSettings, true) : [];
    $seoCfg = is_array($settings['customization']['seoConfig'] ?? null)
        ? $settings['customization']['seoConfig']
        : [];
    $companyName = (string)($settings['companyInfo']['commercialName'] ?? 'Gastro Restaurante');

    $rawProducts = kvGet($pdo, 'kh_catalog_products');
    if ($rawProducts) {
        $products = json_decode($rawProducts, true);
        if (is_array($products)) {
            $matched = null;
            foreach ($products as $prod) {
                $prodSlug = isset($prod['name']) ? ogToSlug((string)$prod['name']) : '';
                $prodId = (string)($prod['id'] ?? '');
                if (
                    ($prodSlug !== '' && strcasecmp($prodSlug, $slug) === 0) ||
                    ($prodId !== '' && strcasecmp($prodId, $slug) === 0)
                ) {
                    $matched = $prod;
                    break;
                }
            }

            if ($matched) {
                $rawImg = (string)($matched['imageUrl'] ?? '');
                if ($serveImg) {
                    ogServeDataUrlImage($rawImg);
                }

                $baseUrl = ogBuildBaseUrl();
                $proxyImgUrl = "{$baseUrl}/api/product-og.php?slug=" . rawurlencode($slug) . "&img=1";
                $image = ogResolveImageUrl($rawImg, $proxyImgUrl);
                if ($image === '' && !empty($seoCfg['ogImage'])) {
                    $image = ogResolveImageUrl((string)$seoCfg['ogImage'], "{$baseUrl}/api/store-og.php?img=1");
                }

                $rawPrice = $matched['basePrice'] ?? 0;
                if (!empty($matched['hasSizes']) && !empty($matched['sizes']) && is_array($matched['sizes'])) {
                    foreach ($matched['sizes'] as $sz) {
                        if (!isset($sz['enabled']) || $sz['enabled']) {
                            $rawPrice = $sz['price'] ?? $rawPrice;
                            break;
                        }
                    }
                }
                $price = number_format((float)$rawPrice, 2);
                $title = (string)($matched['name'] ?? $companyName) . " — S/ {$price}";
                $desc = trim((string)($matched['description'] ?? ''));
                if ($desc === '') {
                    $desc = "Pídelo en línea en {$companyName}.";
                }
                $url = "{$baseUrl}/producto/" . rawurlencode($slug);

                $html = ogInjectHead($html, [
                    'title' => $title,
                    'description' => $desc,
                    'canonical' => $url,
                    'ogTitle' => $title,
                    'ogDescription' => $desc,
                    'ogImage' => $image,
                    'ogType' => 'product',
                    'ogUrl' => $url,
                    'ogSiteName' => (string)($seoCfg['ogSiteName'] ?? $companyName),
                    'locale' => (string)($seoCfg['locale'] ?? 'es_PE'),
                    'twitterCard' => $image !== '' ? 'summary_large_image' : 'summary',
                ]);
            }
        }
    }
} catch (Throwable $e) {
    // Fallback silencioso a index.html estándar
}

if ($serveImg) {
    http_response_code(404);
    exit;
}

header('Content-Type: text/html; charset=UTF-8');
echo $html;
