<?php
/**
 * Khalessi Pizza ERP - Generador dinámico de imagen de sellos (PNG 1032x336) para Google Wallet Hero Image.
 * Uso: /api/google-wallet-stamps.php?points=5&goal=8&bg=18181b&accent=f59e0b
 */
declare(strict_types=1);

if (!function_exists('imagecreatetruecolor')) {
    http_response_code(501);
    exit;
}

$points = max(0, (int) ($_GET['points'] ?? 0));
$goal = max(1, min(16, (int) ($_GET['goal'] ?? 8)));
$active = min($goal, $points);

function gw_hex_to_rgb(string $hex, array $fallback): array
{
    $clean = ltrim(trim($hex), '#');
    if (!preg_match('/^[0-9A-Fa-f]{6}$/', $clean)) {
        return $fallback;
    }
    return [
        hexdec(substr($clean, 0, 2)),
        hexdec(substr($clean, 2, 2)),
        hexdec(substr($clean, 4, 2)),
    ];
}

$bgRgb = gw_hex_to_rgb((string) ($_GET['bg'] ?? '18181b'), [24, 24, 27]);
$accentRgb = gw_hex_to_rgb((string) ($_GET['accent'] ?? 'f59e0b'), [245, 158, 11]);

$width = 1032;
$height = 336;
$img = imagecreatetruecolor($width, $height);
imagealphablending($img, true);
imagesavealpha($img, true);

$bgColor = imagecolorallocate($img, $bgRgb[0], $bgRgb[1], $bgRgb[2]);
$whiteColor = imagecolorallocate($img, 255, 255, 255);
$luminance = (0.299 * $bgRgb[0] + 0.587 * $bgRgb[1] + 0.114 * $bgRgb[2]) / 255;
$isLight = $luminance > 0.62;

$textColor = $isLight
    ? imagecolorallocate($img, 24, 24, 27)
    : $whiteColor;
$mutedColor = $isLight
    ? imagecolorallocatealpha($img, 24, 24, 27, 72)
    : imagecolorallocatealpha($img, 255, 255, 255, 55);
$emptyFill = $isLight
    ? imagecolorallocatealpha($img, 24, 24, 27, 114)
    : imagecolorallocatealpha($img, 255, 255, 255, 112);
$stampedFill = $isLight
    ? imagecolorallocate($img, $accentRgb[0], $accentRgb[1], $accentRgb[2])
    : $whiteColor;
$checkColor = $isLight
    ? $whiteColor
    : $bgColor;

imagefilledrectangle($img, 0, 0, $width, $height, $bgColor);

// Calcular distribución de sellos (1 o 2 filas según meta)
$cols = $goal <= 6 ? $goal : (int) ceil($goal / 2);
$rows = $goal <= 6 ? 1 : 2;
$cellSize = $rows === 1 ? 110 : 88;
$gapX = 24;
$gapY = 22;

$gridWidth = $cols * $cellSize + ($cols - 1) * $gapX;
$gridHeight = $rows * $cellSize + ($rows - 1) * $gapY;
$startX = (int) round(($width - $gridWidth) / 2);
$startY = (int) round(($height - $gridHeight) / 2) + 14;

// Encabezado sutil centrado arriba
$headerText = "SELLOS MARCADOS: {$active} / {$goal}";
$font = 5;
$textWidth = imagefontwidth($font) * strlen($headerText);
imagestring($img, $font, (int) round(($width - $textWidth) / 2), max(18, $startY - 36), $headerText, $textColor);

for ($i = 0; $i < $goal; $i++) {
    $row = (int) floor($i / $cols);
    $col = $i % $cols;
    $cx = (int) round($startX + $col * ($cellSize + $gapX) + $cellSize / 2);
    $cy = (int) round($startY + $row * ($cellSize + $gapY) + $cellSize / 2);
    $isStamped = $i < $active;

    if ($isStamped) {
        imagefilledellipse($img, $cx, $cy, $cellSize, $cellSize, $stampedFill);
        // Checkmark grueso dentro del sello (estilo tarjeta limpia)
        imagesetthickness($img, 6);
        imageline($img, $cx - 16, $cy + 2, $cx - 4, $cy + 14, $checkColor);
        imageline($img, $cx - 4, $cy + 14, $cx + 18, $cy - 12, $checkColor);
        imagesetthickness($img, 1);
    } else {
        imagefilledellipse($img, $cx, $cy, $cellSize, $cellSize, $emptyFill);
        // Borde punteado alrededor del círculo vacío
        $radius = $cellSize / 2;
        for ($deg = 0; $deg < 360; $deg += 18) {
            $a1 = deg2rad($deg);
            $a2 = deg2rad($deg + 9);
            $x1 = (int) round($cx + $radius * cos($a1));
            $y1 = (int) round($cy + $radius * sin($a1));
            $x2 = (int) round($cx + $radius * cos($a2));
            $y2 = (int) round($cy + $radius * sin($a2));
            imagesetthickness($img, 2);
            imageline($img, $x1, $y1, $x2, $y2, $mutedColor);
        }
        imagesetthickness($img, 1);
        $numStr = (string) ($i + 1);
        $nw = imagefontwidth(5) * strlen($numStr);
        $nh = imagefontheight(5);
        imagestring($img, 5, (int) round($cx - $nw / 2), (int) round($cy - $nh / 2), $numStr, $textColor);
    }
}

header('Content-Type: image/png');
header('Cache-Control: public, max-age=60');
imagepng($img);
imagedestroy($img);
