<?php
/**
 * Auto-Updater Backend para cPanel
 * /api/system-update.php
 *
 * Permite descargar y extraer en caliente la última versión directamente desde GitHub
 * sin necesidad de entrar a cPanel o subir archivos ZIP manualmente.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

header("Content-Type: application/json; charset=UTF-8");

$action = isset($_GET['action']) ? $_GET['action'] : 'check';
$repo = 'networkturbo4-pixel/ERPKhalessi';

switch ($action) {
    case 'check':
        // Consultar el commit más reciente de GitHub
        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => [
                    "User-Agent: PHP-cPanel-AutoUpdater",
                    "Accept: application/vnd.github.v3+json"
                ],
                'timeout' => 10
            ]
        ];
        $context = stream_context_create($opts);
        $url = "https://api.github.com/repos/$repo/commits/main";
        $json = @file_get_contents($url, false, $context);

        if ($json === false) {
            sendResponse([
                'success' => false,
                'error' => 'No se pudo conectar con GitHub API desde el servidor'
            ], 500);
        }

        $data = json_decode($json, true);
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
        // Descargar el tarball o zipball del repositorio y actualizar archivos
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendResponse(['success' => false, 'error' => 'Método POST requerido'], 405);
        }

        $zipUrl = "https://github.com/$repo/archive/refs/heads/main.zip";
        $tmpZip = sys_get_temp_dir() . '/khalessi_update_' . time() . '.zip';

        // 1. Descargar ZIP de GitHub
        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => ["User-Agent: PHP-cPanel-AutoUpdater"],
                'timeout' => 60
            ]
        ];
        $context = stream_context_create($opts);
        $content = @file_get_contents($zipUrl, false, $context);

        if (!$content) {
            sendResponse(['success' => false, 'error' => 'No se pudo descargar el archivo zip de GitHub'], 500);
        }

        file_put_contents($tmpZip, $content);

        // 2. Extraer archivos en un directorio temporal
        $zip = new ZipArchive();
        if ($zip->open($tmpZip) !== true) {
            @unlink($tmpZip);
            sendResponse(['success' => false, 'error' => 'No se pudo abrir el archivo zip descargado'], 500);
        }

        $extractPath = sys_get_temp_dir() . '/khalessi_extracted_' . time();
        $zip->extractTo($extractPath);
        $zip->close();
        @unlink($tmpZip);

        // 3. Ubicar la carpeta extraída (ej: ERPKhalessi-main)
        $extractedDirs = glob($extractPath . '/*');
        if (empty($extractedDirs)) {
            sendResponse(['success' => false, 'error' => 'Estructura zip vacía'], 500);
        }
        $sourceDir = $extractedDirs[0];

        // Copiar los archivos de public/ y dist/ hacia la raíz de public_html
        $rootTarget = realpath(__DIR__ . '/..'); // Directorio public_html

        // El build compilado versionado vive en /release (dist está en .gitignore)
        $releaseFolder = $sourceDir . '/release';
        if (!is_dir($releaseFolder)) {
            sendResponse(['success' => false, 'error' => 'El repositorio no contiene la carpeta release/. Ejecuta "npm run release" en local y haz git push.'], 500);
        }

        $copiedCount = 0;

        // Copiar archivos generados si existen en dist o public
        function recursiveCopy($src, $dst, &$count) {
            $dir = opendir($src);
            @mkdir($dst);
            while (false !== ($file = readdir($dir))) {
                if (($file != '.') && ($file != '..')) {
                    if (is_dir($src . '/' . $file)) {
                        recursiveCopy($src . '/' . $file, $dst . '/' . $file, $count);
                    } else {
                        // Preservar config.local.php para no pisar credenciales de la base de datos
                        if (basename($file) === 'config.local.php' && file_exists($dst . '/' . $file)) {
                            continue;
                        }
                        if (copy($src . '/' . $file, $dst . '/' . $file)) {
                            $count++;
                        }
                    }
                }
            }
            closedir($dir);
        }

        recursiveCopy($releaseFolder, $rootTarget, $copiedCount);

        // Limpiar temporales
        function recursiveDelete($dir) {
            if (!file_exists($dir)) return;
            $files = array_diff(scandir($dir), ['.', '..']);
            foreach ($files as $file) {
                (is_dir("$dir/$file")) ? recursiveDelete("$dir/$file") : @unlink("$dir/$file");
            }
            @rmdir($dir);
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
