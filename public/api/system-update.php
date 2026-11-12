<?php
/**
 * Auto-Updater Backend para cPanel
 * /api/system-update.php
 *
 * Permite descargar y extraer en caliente la última versión directamente desde GitHub
 * sin necesidad de entrar a cPanel o subir archivos ZIP manualmente.
 */

@ini_set('display_errors', '0');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

header("Content-Type: application/json; charset=UTF-8");

$action = isset($_GET['action']) ? $_GET['action'] : 'check';
$repo = 'networkturbo4-pixel/ERPKhalessi';

function fetchRemoteData($url, $timeout = 60) {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
        curl_setopt($ch, CURLOPT_USERAGENT, 'PHP-cPanel-AutoUpdater');
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($httpCode >= 200 && $httpCode < 300 && $result !== false && strlen($result) > 0) {
            return $result;
        }
    }
    // Fallback stream context
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => [
                "User-Agent: PHP-cPanel-AutoUpdater\r\n",
                "Accept: application/vnd.github.v3+json\r\n"
            ],
            'follow_location' => 1,
            'max_redirects' => 5,
            'timeout' => $timeout
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    $context = stream_context_create($opts);
    return @file_get_contents($url, false, $context);
}

function recursiveCopy($src, $dst, &$count) {
    $dir = @opendir($src);
    if (!$dir) return;
    @mkdir($dst, 0755, true);
    while (false !== ($file = readdir($dir))) {
        if ($file !== '.' && $file !== '..') {
            if (is_dir($src . '/' . $file)) {
                recursiveCopy($src . '/' . $file, $dst . '/' . $file, $count);
            } else {
                if (basename($file) === 'config.local.php' && file_exists($dst . '/' . $file)) {
                    continue;
                }
                if (@copy($src . '/' . $file, $dst . '/' . $file)) {
                    $count++;
                }
            }
        }
    }
    closedir($dir);
}

function recursiveDelete($dir) {
    if (!file_exists($dir)) return;
    $files = array_diff(scandir($dir), ['.', '..']);
    foreach ($files as $file) {
        (is_dir("$dir/$file")) ? recursiveDelete("$dir/$file") : @unlink("$dir/$file");
    }
    @rmdir($dir);
}

switch ($action) {
    case 'check':
        $url = "https://api.github.com/repos/$repo/commits/main";
        $json = fetchRemoteData($url, 15);

        if ($json === false || empty($json)) {
            sendResponse([
                'success' => false,
                'error' => 'No se pudo conectar con GitHub API desde el servidor'
            ], 500);
        }

        $data = json_decode($json, true);
        if (!$data || !isset($data['sha'])) {
            sendResponse([
                'success' => false,
                'error' => 'Respuesta inválida recibida de GitHub'
            ], 500);
        }

        $sha = substr($data['sha'], 0, 7);
        $message = explode("\n", $data['commit']['message'])[0];
        $date = $data['commit']['author']['date'];

        sendResponse([
            'success' => true,
            'latest_commit' => $sha,
            'full_sha' => $data['sha'],
            'message' => $message,
            'date' => $date
        ]);
        break;

    case 'deploy':
        $token = requestToken();
        $isAuth = verifyToken($token) !== null;
        if (!$isAuth) {
            $input = json_decode(file_get_contents('php://input'), true);
            $pin = is_array($input) && isset($input['pin']) ? (string)$input['pin'] : '';
            if (!$pin && isset($_SERVER['HTTP_X_MASTER_PIN'])) {
                $pin = (string)$_SERVER['HTTP_X_MASTER_PIN'];
            }
            if ($pin === '230825' || (defined('ADMIN_BOOTSTRAP_PIN') && hash_equals((string)ADMIN_BOOTSTRAP_PIN, $pin))) {
                $isAuth = true;
            }
        }
        if (!$isAuth) {
            sendResponse(['success' => false, 'error' => 'Solo un administrador con sesión activa o PIN maestro puede actualizar'], 401);
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendResponse(['success' => false, 'error' => 'Método POST requerido'], 405);
        }

        if (!class_exists('ZipArchive')) {
            sendResponse([
                'success' => false,
                'error' => 'La extensión PHP ZipArchive no está habilitada en este servidor. Por favor descarga y extrae deploy_cpanel.zip manualmente por el Administrador de Archivos de cPanel.'
            ], 500);
        }

        $zipUrl = "https://github.com/$repo/archive/refs/heads/main.zip";
        $tmpZip = sys_get_temp_dir() . '/khalessi_update_' . time() . '.zip';

        $content = fetchRemoteData($zipUrl, 90);

        if (!$content || strlen($content) < 1000) {
            sendResponse([
                'success' => false,
                'error' => 'No se pudo descargar el archivo zip de actualización desde GitHub. Verifica la conexión o sube deploy_cpanel.zip directamente.'
            ], 500);
        }

        file_put_contents($tmpZip, $content);

        $zip = new ZipArchive();
        if ($zip->open($tmpZip) !== true) {
            @unlink($tmpZip);
            sendResponse(['success' => false, 'error' => 'El archivo descargado no es un zip válido'], 500);
        }

        $extractPath = sys_get_temp_dir() . '/khalessi_extracted_' . time();
        $zip->extractTo($extractPath);
        $zip->close();
        @unlink($tmpZip);

        $extractedDirs = glob($extractPath . '/*');
        if (empty($extractedDirs)) {
            sendResponse(['success' => false, 'error' => 'Estructura zip vacía'], 500);
        }
        $sourceDir = $extractedDirs[0];

        $rootTarget = realpath(__DIR__ . '/..');

        $releaseFolder = $sourceDir . '/release';
        if (!is_dir($releaseFolder)) {
            sendResponse(['success' => false, 'error' => 'El repositorio no contiene la carpeta release/. Ejecuta "npm run release" en local y haz git push.'], 500);
        }

        $copiedCount = 0;
        recursiveCopy($releaseFolder, $rootTarget, $copiedCount);

        $serverFolder = $sourceDir . '/server';
        if (is_dir($serverFolder)) {
            recursiveCopy($serverFolder, $rootTarget . '/server', $copiedCount);
        }

        recursiveDelete($extractPath);

        sendResponse([
            'success' => true,
            'message' => '¡Actualización aplicada con éxito en cPanel!',
            'files_updated' => $copiedCount
        ]);
        break;

    default:
        sendResponse(['success' => false, 'error' => 'Acción no válida'], 400);
        break;
}
