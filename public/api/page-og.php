<?php
/**
 * Inyecta metadatos Open Graph dinámicos en index.html para URLs cortas (/p/{slug})
 * permitiendo vistas previas enriquecidas en WhatsApp, Facebook, X, LinkedIn y Telegram.
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
            $rawImg = (string)($seo['ogImage'] ?? '');
            if ($serveImg) {
                ogServeDataUrlImage($rawImg);
            }

            $baseUrl = ogBuildBaseUrl();
            $proxyImgUrl = "{$baseUrl}/api/page-og.php?slug=" . rawurlencode($slug) . "&img=1";
            $image = ogResolveImageUrl($rawImg, $proxyImgUrl);
            if ($image === '' && !empty($seoCfg['ogImage'])) {
                $image = ogResolveImageUrl((string)$seoCfg['ogImage'], "{$baseUrl}/api/store-og.php?img=1");
            }

            $title = (string)($seo['ogTitle'] ?: $matched['title'] ?: $companyName);
            $desc = (string)($seo['ogDescription'] ?: ($seoCfg['ogDescription'] ?? ''));
            $url = "{$baseUrl}/p/" . rawurlencode($slug);

            $html = ogInjectHead($html, [
                'title' => $title,
                'description' => $desc,
                'canonical' => $url,
                'ogTitle' => $title,
                'ogDescription' => $desc,
                'ogImage' => $image,
                'ogType' => (string)($seo['ogType'] ?: 'website'),
                'ogUrl' => $url,
                'ogSiteName' => (string)($seoCfg['ogSiteName'] ?? $companyName),
                'locale' => (string)($seoCfg['locale'] ?? 'es_PE'),
                'twitterCard' => $image !== '' ? 'summary_large_image' : 'summary',
            ]);
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
