<?php
/**
 * SSR SEO, Open Graph, Schema.org JSON-LD, robots.txt y llms.txt para:
 * - Tienda principal (/)
 * - Bolsa de Trabajo (/trabaja y /trabaja/{slug})
 * - /robots.txt y /llms.txt dinámicos
 */
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/og-helper.php';

$route = isset($_GET['route']) ? trim((string)$_GET['route']) : 'home';
$slug = isset($_GET['slug']) ? trim((string)$_GET['slug']) : '';
$serveImg = isset($_GET['img']) && $_GET['img'] === '1';

$indexPath = dirname(__DIR__) . '/index.html';
if (!$serveImg && !in_array($route, ['robots', 'llms'], true) && !is_file($indexPath)) {
    http_response_code(404);
    echo 'index.html not found';
    exit;
}

$html = (!$serveImg && !in_array($route, ['robots', 'llms'], true)) ? file_get_contents($indexPath) : '';

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/storage-lib.php';

    $pdo = getDbConnection();
    kvInit($pdo);

    $rawSettings = kvGet($pdo, 'khalessi_erp_settings_v3');
    $settings = $rawSettings ? json_decode($rawSettings, true) : [];
    $seo = is_array($settings['customization']['seoConfig'] ?? null)
        ? $settings['customization']['seoConfig']
        : [];
    $company = is_array($settings['companyInfo'] ?? null) ? $settings['companyInfo'] : [];
    $companyName = (string)($company['commercialName'] ?? ($settings['customization']['appName'] ?? 'Pizza Khalessi'));

    $baseUrl = ogBuildBaseUrl();
    $canonicalBase = rtrim((string)($seo['canonicalUrl'] ?? $baseUrl), '/');
    if ($canonicalBase === '') $canonicalBase = $baseUrl;

    if ($serveImg) {
        $rawOgImg = (string)($seo['ogImage'] ?? '');
        ogServeDataUrlImage($rawOgImg);
    }

    $ogImage = ogResolveImageUrl(
        (string)($seo['ogImage'] ?? ''),
        "{$baseUrl}/api/store-og.php?img=1"
    );

    // 1. Dynamic /robots.txt
    if ($route === 'robots') {
        header('Content-Type: text/plain; charset=UTF-8');
        $robotsIndex = !isset($seo['robotsIndex']) || (bool)$seo['robotsIndex'];
        $allowAi = !isset($seo['allowAiCrawlers']) || (bool)$seo['allowAiCrawlers'];

        $lines = [
            '# Robots.txt generado por Khalessi Pizza ERP',
            'User-agent: *',
            $robotsIndex ? 'Allow: /' : 'Disallow: /',
            'Disallow: /admin',
            '',
            '# Buscadores de IA (ChatGPT, Perplexity, Claude, Google AI)',
        ];
        $aiBots = ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];
        foreach ($aiBots as $bot) {
            $lines[] = "User-agent: {$bot}";
            $lines[] = $allowAi ? 'Allow: /' : 'Disallow: /';
        }
        $lines[] = '';
        $lines[] = "Sitemap: {$canonicalBase}/sitemap.xml";
        $lines[] = "# LLMs context: {$canonicalBase}/llms.txt";
        echo implode("\n", $lines);
        exit;
    }

    // 2. Dynamic /llms.txt
    if ($route === 'llms') {
        header('Content-Type: text/plain; charset=UTF-8');
        $siteTitle = (string)($seo['ogSiteName'] ?? $companyName);
        $summary = (string)($seo['aiBrandSummary'] ?? ($seo['metaDescription'] ?? ''));
        $lines = [
            "# {$siteTitle}",
            '',
            "> {$summary}",
            '',
            '## Información General',
            "- Sitio Web: {$canonicalBase}",
            '- Especialidad: ' . (string)($seo['cuisineType'] ?? 'Pizzería Artesanal'),
            '- Rango de Precios: ' . (string)($seo['priceRange'] ?? 'S/ 15 - S/ 70'),
            '- Temas Clave: ' . (string)($seo['aiKeyTopics'] ?? ($seo['keywords'] ?? '')),
            '',
            '## Secciones Principales',
            "- [Tienda Online]({$canonicalBase}/): Catálogo de pizzas, promociones y pedidos en línea.",
            "- [Bolsa de Trabajo]({$canonicalBase}/trabaja): Vacantes disponibles y postulación directa.",
        ];
        $rawProducts = kvGet($pdo, 'kh_catalog_products');
        if ($rawProducts) {
            $products = json_decode($rawProducts, true);
            if (is_array($products)) {
                $lines[] = '';
                $lines[] = '## Productos Destacados';
                $count = 0;
                foreach ($products as $p) {
                    if (isset($p['isAvailable']) && !$p['isAvailable']) continue;
                    $pPrice = (float)($p['basePrice'] ?? 0);
                    if (!empty($p['hasSizes']) && !empty($p['sizes'][0]['price'])) {
                        $pPrice = (float)$p['sizes'][0]['price'];
                    }
                    $lines[] = '- **' . (string)($p['name'] ?? '') . '**: S/ ' . number_format($pPrice, 2);
                    if (++$count >= 12) break;
                }
            }
        }
        echo implode("\n", $lines);
        exit;
    }

    // 3. Jobs SPA (/trabaja and /trabaja/{slug})
    if ($route === 'jobs') {
        $rawHr = kvGet($pdo, 'khalessi_erp_hr_v1');
        $hrData = $rawHr ? json_decode($rawHr, true) : [];
        $postings = is_array($hrData['jobPostings'] ?? null) ? $hrData['jobPostings'] : [];
        $activePostings = array_values(array_filter($postings, fn($p) => !isset($p['isActive']) || (bool)$p['isActive']));

        if ($slug !== '') {
            $matchedJob = null;
            foreach ($activePostings as $job) {
                $jSlug = ogToSlug((string)($job['positionTitle'] ?? ''));
                $jId = (string)($job['id'] ?? '');
                if (
                    ($jSlug !== '' && strcasecmp($jSlug, $slug) === 0) ||
                    ($jId !== '' && strcasecmp($jId, $slug) === 0)
                ) {
                    $matchedJob = $job;
                    break;
                }
            }

            if ($matchedJob) {
                $jobTitle = (string)($matchedJob['positionTitle'] ?? 'Vacante');
                $dept = (string)($matchedJob['department'] ?? 'Operaciones');
                $salary = !empty($matchedJob['salaryRange']) ? ' • ' . (string)$matchedJob['salaryRange'] : '';
                $title = "{$jobTitle} — {$dept} | {$companyName}";
                $desc = trim((string)($matchedJob['description'] ?? '')) . $salary;
                $url = "{$baseUrl}/trabaja/" . rawurlencode($slug);

                $html = ogInjectHead($html, [
                    'title' => $title,
                    'description' => $desc,
                    'canonical' => $url,
                    'ogTitle' => $title,
                    'ogDescription' => $desc,
                    'ogImage' => $ogImage,
                    'ogType' => 'website',
                    'ogUrl' => $url,
                    'ogSiteName' => (string)($seo['ogSiteName'] ?? $companyName),
                    'locale' => (string)($seo['locale'] ?? 'es_PE'),
                    'twitterCard' => $ogImage !== '' ? 'summary_large_image' : 'summary',
                ]);
            }
        } else {
            $count = count($activePostings);
            $title = "Trabaja con Nosotros — {$companyName}";
            $desc = $count > 0
                ? "Tenemos {$count} puestos disponibles en {$companyName}. Explora nuestras vacantes y postula en línea."
                : "Únete al equipo de {$companyName}. Conoce nuestras oportunidades laborales.";
            $url = "{$baseUrl}/trabaja";

            $html = ogInjectHead($html, [
                'title' => $title,
                'description' => $desc,
                'canonical' => $url,
                'ogTitle' => $title,
                'ogDescription' => $desc,
                'ogImage' => $ogImage,
                'ogType' => 'website',
                'ogUrl' => $url,
                'ogSiteName' => (string)($seo['ogSiteName'] ?? $companyName),
                'locale' => (string)($seo['locale'] ?? 'es_PE'),
                'twitterCard' => $ogImage !== '' ? 'summary_large_image' : 'summary',
            ]);
        }

        header('Content-Type: text/html; charset=UTF-8');
        echo $html;
        exit;
    }

    // 4. Storefront Home (/)
    $title = (string)($seo['metaTitle'] ?? "{$companyName} | Pizzas Artesanales & Delivery");
    $desc = (string)($seo['metaDescription'] ?? 'Pide en línea tus pizzas artesanales, combos y promociones.');
    $ogTitle = (string)(!empty($seo['ogTitle']) ? $seo['ogTitle'] : $title);
    $ogDesc = (string)(!empty($seo['ogDescription']) ? $seo['ogDescription'] : $desc);
    $robotsIndex = !isset($seo['robotsIndex']) || (bool)$seo['robotsIndex'];

    $jsonLd = null;
    if (!isset($seo['enableJsonLdSchema']) || (bool)$seo['enableJsonLdSchema']) {
        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => (string)($seo['businessTypeSchema'] ?? 'Restaurant'),
            'name' => (string)($seo['ogSiteName'] ?? $companyName),
            'description' => (string)(!empty($seo['aiBrandSummary']) ? $seo['aiBrandSummary'] : $desc),
            'url' => $canonicalBase,
        ];
        if ($ogImage !== '') $jsonLd['image'] = $ogImage;
        if (!empty($company['phone'])) $jsonLd['telephone'] = (string)$company['phone'];
        if (!empty($seo['cuisineType'])) $jsonLd['servesCuisine'] = (string)$seo['cuisineType'];
        if (!empty($seo['priceRange'])) $jsonLd['priceRange'] = (string)$seo['priceRange'];
        if (!empty($company['address'])) {
            $jsonLd['address'] = [
                '@type' => 'PostalAddress',
                'streetAddress' => (string)$company['address'],
                'addressCountry' => 'PE',
            ];
        }
    }

    $html = ogInjectHead($html, [
        'title' => $title,
        'description' => $desc,
        'keywords' => (string)($seo['keywords'] ?? ''),
        'robots' => $robotsIndex ? 'index, follow' : 'noindex, nofollow',
        'canonical' => $canonicalBase,
        'ogTitle' => $ogTitle,
        'ogDescription' => $ogDesc,
        'ogImage' => $ogImage,
        'ogType' => (string)($seo['ogType'] ?? 'website'),
        'ogUrl' => $canonicalBase,
        'ogSiteName' => (string)($seo['ogSiteName'] ?? $companyName),
        'locale' => (string)($seo['locale'] ?? 'es_PE'),
        'twitterCard' => (string)($seo['twitterCard'] ?? ($ogImage !== '' ? 'summary_large_image' : 'summary')),
        'twitterHandle' => (string)($seo['twitterHandle'] ?? ''),
        'googleSiteVerification' => (string)($seo['googleSiteVerification'] ?? ''),
        'bingSiteVerification' => (string)($seo['bingSiteVerification'] ?? ''),
        'jsonLd' => $jsonLd,
    ]);
} catch (Throwable $e) {
    // Fallback silencioso a index.html estándar
}

if ($serveImg) {
    http_response_code(404);
    exit;
}

header('Content-Type: text/html; charset=UTF-8');
echo $html;
