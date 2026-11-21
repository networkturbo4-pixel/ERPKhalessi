<?php
/**
 * Utilidades compartidas para inyección SSR de metadatos SEO, Open Graph,
 * Twitter Cards y Schema.org JSON-LD en index.html para crawlers (WhatsApp, Facebook, Google, IAs).
 */

function ogBuildBaseUrl(): string {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'gastroerp.com';
    return "{$scheme}://{$host}";
}

function ogToSlug(string $name): string {
    $s = mb_strtolower(trim($name), 'UTF-8');
    $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim((string)$s, '-');
}

function ogServeDataUrlImage(string $dataUrl): void {
    if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s', $dataUrl, $m)) {
        $mime = $m[1];
        $binary = base64_decode($m[2], true);
        if ($binary !== false) {
            header("Content-Type: {$mime}");
            header('Cache-Control: public, max-age=86400');
            echo $binary;
            exit;
        }
    }
    http_response_code(404);
    exit;
}

function ogResolveImageUrl(string $rawUrl, string $dataProxyUrl): string {
    $trimmed = trim($rawUrl);
    if ($trimmed === '') return '';
    if (stripos($trimmed, 'data:image/') === 0) {
        return $dataProxyUrl;
    }
    if (preg_match('#^https?://#i', $trimmed)) {
        return $trimmed;
    }
    $base = ogBuildBaseUrl();
    if ($trimmed[0] === '/') {
        return $base . $trimmed;
    }
    return $base . '/' . $trimmed;
}

function ogStripStaticMeta(string $html): string {
    $patterns = [
        '/<meta\s+[^>]*property=["\']og:[^"\']+["\'][^>]*>\s*/i',
        '/<meta\s+[^>]*name=["\']twitter:[^"\']+["\'][^>]*>\s*/i',
        '/<meta\s+[^>]*name=["\']description["\'][^>]*>\s*/i',
        '/<meta\s+[^>]*name=["\']keywords["\'][^>]*>\s*/i',
        '/<meta\s+[^>]*name=["\']robots["\'][^>]*>\s*/i',
        '/<link\s+[^>]*rel=["\']canonical["\'][^>]*>\s*/i',
    ];
    foreach ($patterns as $pat) {
        $html = preg_replace($pat, '', $html) ?? $html;
    }
    return $html;
}

function ogInjectHead(string $html, array $meta): string {
    $html = ogStripStaticMeta($html);

    $title = htmlspecialchars((string)($meta['title'] ?? 'Gastro Restaurante'), ENT_QUOTES, 'UTF-8');
    $desc = htmlspecialchars((string)($meta['description'] ?? ''), ENT_QUOTES, 'UTF-8');
    $keywords = htmlspecialchars((string)($meta['keywords'] ?? ''), ENT_QUOTES, 'UTF-8');
    $robots = htmlspecialchars((string)($meta['robots'] ?? 'index, follow'), ENT_QUOTES, 'UTF-8');
    $canonical = htmlspecialchars((string)($meta['canonical'] ?? ''), ENT_QUOTES, 'UTF-8');
    $ogTitle = htmlspecialchars((string)($meta['ogTitle'] ?? $meta['title'] ?? 'Gastro Restaurante'), ENT_QUOTES, 'UTF-8');
    $ogDesc = htmlspecialchars((string)($meta['ogDescription'] ?? $meta['description'] ?? ''), ENT_QUOTES, 'UTF-8');
    $ogImage = htmlspecialchars((string)($meta['ogImage'] ?? ''), ENT_QUOTES, 'UTF-8');
    $ogType = htmlspecialchars((string)($meta['ogType'] ?? 'website'), ENT_QUOTES, 'UTF-8');
    $ogUrl = htmlspecialchars((string)($meta['ogUrl'] ?? $meta['canonical'] ?? ''), ENT_QUOTES, 'UTF-8');
    $ogSiteName = htmlspecialchars((string)($meta['ogSiteName'] ?? 'Gastro Restaurante'), ENT_QUOTES, 'UTF-8');
    $locale = htmlspecialchars((string)($meta['locale'] ?? 'es_PE'), ENT_QUOTES, 'UTF-8');
    $twitterCard = htmlspecialchars((string)($meta['twitterCard'] ?? ($ogImage !== '' ? 'summary_large_image' : 'summary')), ENT_QUOTES, 'UTF-8');
    $twitterHandle = htmlspecialchars((string)($meta['twitterHandle'] ?? ''), ENT_QUOTES, 'UTF-8');
    $googleVerify = htmlspecialchars((string)($meta['googleSiteVerification'] ?? ''), ENT_QUOTES, 'UTF-8');
    $bingVerify = htmlspecialchars((string)($meta['bingSiteVerification'] ?? ''), ENT_QUOTES, 'UTF-8');

    $tags = '';
    if ($desc !== '') $tags .= "\n    <meta name=\"description\" content=\"{$desc}\" />";
    if ($keywords !== '') $tags .= "\n    <meta name=\"keywords\" content=\"{$keywords}\" />";
    $tags .= "\n    <meta name=\"robots\" content=\"{$robots}\" />";
    if ($canonical !== '') $tags .= "\n    <link rel=\"canonical\" href=\"{$canonical}\" />";
    if ($googleVerify !== '') $tags .= "\n    <meta name=\"google-site-verification\" content=\"{$googleVerify}\" />";
    if ($bingVerify !== '') $tags .= "\n    <meta name=\"msvalidate.01\" content=\"{$bingVerify}\" />";

    $tags .= "\n    <meta property=\"og:site_name\" content=\"{$ogSiteName}\" />";
    $tags .= "\n    <meta property=\"og:locale\" content=\"{$locale}\" />";
    $tags .= "\n    <meta property=\"og:type\" content=\"{$ogType}\" />";
    $tags .= "\n    <meta property=\"og:title\" content=\"{$ogTitle}\" />";
    if ($ogDesc !== '') $tags .= "\n    <meta property=\"og:description\" content=\"{$ogDesc}\" />";
    if ($ogUrl !== '') $tags .= "\n    <meta property=\"og:url\" content=\"{$ogUrl}\" />";
    if ($ogImage !== '') {
        $tags .= "\n    <meta property=\"og:image\" content=\"{$ogImage}\" />";
        $tags .= "\n    <meta property=\"og:image:secure_url\" content=\"{$ogImage}\" />";
    }

    $tags .= "\n    <meta name=\"twitter:card\" content=\"{$twitterCard}\" />";
    $tags .= "\n    <meta name=\"twitter:title\" content=\"{$ogTitle}\" />";
    if ($ogDesc !== '') $tags .= "\n    <meta name=\"twitter:description\" content=\"{$ogDesc}\" />";
    if ($ogImage !== '') $tags .= "\n    <meta name=\"twitter:image\" content=\"{$ogImage}\" />";
    if ($twitterHandle !== '') $tags .= "\n    <meta name=\"twitter:site\" content=\"{$twitterHandle}\" />";

    if (!empty($meta['jsonLd']) && is_array($meta['jsonLd'])) {
        $json = json_encode($meta['jsonLd'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json !== false) {
            $tags .= "\n    <script id=\"gastro-seo-jsonld\" type=\"application/ld+json\">{$json}</script>";
        }
    }

    $tags .= "\n";

    $html = preg_replace('/<title>.*?<\/title>/is', "<title>{$title}</title>{$tags}", $html, 1) ?? $html;
    return $html;
}
