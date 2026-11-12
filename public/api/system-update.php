<?php
/**
 * Motor de Actualización en Caliente y Auto-Migración de Base de Datos
 * /api/system-update.php
 *
 * - Sincroniza directamente desde GitHub usando `release/manifest.json` (comparación diferencial SHA-256)
 *   sin depender de `ZipArchive`, sin escribir en `/tmp` (evita bloqueos `open_basedir` en cPanel)
 *   y sin necesidad de subir archivos ZIP manualmente.
 * - Ejecuta auto-migración no destructiva de MySQL (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN`
 *   para tablas o columnas nuevas, conservando el 100% de los datos existentes).
 */

@ini_set('display_errors', '0');
@set_time_limit(180);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

$action = isset($_GET['action']) ? trim((string)$_GET['action']) : 'check';
$repo = 'networkturbo4-pixel/ERPKhalessi';
$branch = 'main';
$rootTarget = realpath(__DIR__ . '/..') ?: dirname(__DIR__);

/**
 * Descarga contenido remoto desde GitHub con soporte de reintento TLS para servidores cPanel
 * cuyos bundles de CA locales estén desactualizados.
 */
function fetchRemoteData(string $url, int $timeout = 60): ?string {
    $cacheBustUrl = $url . (strpos($url, '?') === false ? '?' : '&') . '_cb=' . time() . mt_rand(100, 999);

    if (function_exists('curl_init')) {
        foreach ([true, false] as $verifySsl) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $cacheBustUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Khalessi-ERP-Updater/2.0');
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $verifySsl);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, $verifySsl ? 2 : 0);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Cache-Control: no-cache, no-store',
                'Pragma: no-cache',
                'Accept: application/vnd.github.v3+json, application/json, */*'
            ]);
            $result = curl_exec($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $errno = curl_errno($ch);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300 && is_string($result) && strlen($result) > 0) {
                return $result;
            }
            // Si falló por certificado SSL local en cPanel, reintentar en el segundo pase; si fue 404, salir
            if ($httpCode === 404) {
                return null;
            }
            if ($verifySsl && $errno === 0 && $httpCode >= 400) {
                break;
            }
        }
    }

    foreach ([true, false] as $verifySsl) {
        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: Khalessi-ERP-Updater/2.0\r\nCache-Control: no-cache\r\nAccept: */*\r\n",
                'follow_location' => 1,
                'max_redirects' => 5,
                'timeout' => $timeout,
            ],
            'ssl' => [
                'verify_peer' => $verifySsl,
                'verify_peer_name' => $verifySsl,
            ],
        ];
        $context = stream_context_create($opts);
        $data = @file_get_contents($cacheBustUrl, false, $context);
        if (is_string($data) && strlen($data) > 0) {
            return $data;
        }
    }

    return null;
}

/**
 * Comprueba de forma infalible si un directorio tiene permisos de escritura en Windows y Linux.
 */
function checkDirectoryWritable(string $dir): bool {
    if (!is_dir($dir)) return false;
    $testFile = rtrim($dir, '/\\') . '/.write_test_' . uniqid() . '_' . mt_rand(100, 999);
    $written = @file_put_contents($testFile, '1');
    if ($written !== false) {
        @unlink($testFile);
        return true;
    }
    return is_writable($dir);
}

/**
 * Obtiene conexión PDO sin llamar a exit() en caso de fallo, permitiendo continuar
 * con la sincronización de archivos si la base de datos no está disponible.
 */
function getSafeDbConnection(): ?PDO {
    if (!defined('DB_HOST') || !defined('DB_NAME') || !defined('DB_USER')) {
        return null;
    }
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . (defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4');
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    try {
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * Verifica si la petición proviene de un administrador autorizado (por Token ERP o por PIN de administrador).
 */
function isAuthorizedForDeploy(): bool {
    $token = requestToken();
    $claims = verifyToken($token);
    if (is_array($claims)) {
        $roleId = (string)($claims['roleId'] ?? '');
        if ($roleId === 'role-admin' || $roleId === 'role-manager' || $roleId === '') {
            return true;
        }
    }

    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput ?: '{}', true);
    $pin = is_array($input) && isset($input['pin']) ? preg_replace('/\D/', '', (string)$input['pin']) : '';
    if ($pin === '' && isset($_SERVER['HTTP_X_MASTER_PIN'])) {
        $pin = preg_replace('/\D/', '', (string)$_SERVER['HTTP_X_MASTER_PIN']);
    }
    if ($pin === '') {
        return false;
    }

    if (defined('ADMIN_BOOTSTRAP_PIN') && ADMIN_BOOTSTRAP_PIN !== '' && hash_equals((string)ADMIN_BOOTSTRAP_PIN, $pin)) {
        return true;
    }

    try {
        $pdo = getSafeDbConnection();
        if (!$pdo) {
            return false;
        }
        kvInit($pdo);

        foreach ([KH_SETTINGS_KEY, KH_RBAC_KEY] as $storageKey) {
            $raw = kvGet($pdo, $storageKey);
            if ($raw === null) continue;
            $decoded = json_decode($raw, true);
            $users = is_array($decoded) && isset($decoded['users']) && is_array($decoded['users']) ? $decoded['users'] : [];
            foreach ($users as $u) {
                $uPin = isset($u['pin']) ? preg_replace('/\D/', '', (string)$u['pin']) : '';
                $uStatus = (string)($u['status'] ?? 'active');
                $uRole = (string)($u['roleId'] ?? 'role-admin');
                if ($uPin !== '' && $uStatus !== 'suspended' && hash_equals($uPin, $pin)) {
                    if (in_array($uRole, ['role-admin', 'role-manager'], true)) {
                        return true;
                    }
                }
            }
        }

        $st = $pdo->prepare("SELECT role, is_active FROM users WHERE pin = :pin LIMIT 1");
        $st->execute([':pin' => $pin]);
        $dbUser = $st->fetch();
        if ($dbUser && (!isset($dbUser['is_active']) || (int)$dbUser['is_active'] === 1)) {
            $role = strtolower((string)($dbUser['role'] ?? 'admin'));
            if (in_array($role, ['superadmin', 'admin', 'gerente'], true)) {
                return true;
            }
        }
    } catch (Throwable $e) {
        // Si la BD aún no responde pero el PIN coincide con bootstrap, ya fue validado arriba
    }

    return false;
}

/**
 * Ejecuta migraciones automáticas y no destructivas en MySQL:
 * 1. Crea tablas nuevas (`CREATE TABLE IF NOT EXISTS`) definidas en `database.sql` y `kv_storage`.
 * 2. Detecta columnas nuevas en las definiciones de tablas y ejecuta `ALTER TABLE ... ADD COLUMN`
 *    automáticamente sin borrar ni modificar ningún registro existente.
 */
function ensureDatabaseSchema(string $rootTarget): array {
    $stats = [
        'connected' => false,
        'tables_verified' => 0,
        'columns_added' => 0,
        'details' => [],
    ];

    try {
        $pdo = getSafeDbConnection();
        if (!$pdo) {
            $stats['details'][] = 'Aviso BD: Conexión MySQL no disponible en este momento. Archivos sincronizados con éxito.';
            return $stats;
        }
        $stats['connected'] = true;
        kvInit($pdo);
        $stats['tables_verified']++;

        $sqlFile = $rootTarget . '/database.sql';
        if (!file_exists($sqlFile)) {
            return $stats;
        }

        $sqlContent = (string)file_get_contents($sqlFile);
        if ($sqlContent === '') {
            return $stats;
        }

        // Extraer todos los bloques CREATE TABLE IF NOT EXISTS `tabla` ( ... ) ENGINE=...;
        $pattern = '/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?([a-zA-Z0-9_]+)`?\s*\((.*?)\)\s*ENGINE=[^;]+;/is';
        if (preg_match_all($pattern, $sqlContent, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $fullCreateSql = $m[0];
                $tableName = $m[1];
                $bodyLinesRaw = $m[2];

                // 1. Asegurar que la tabla exista (no toca datos si ya existe)
                $pdo->exec($fullCreateSql);
                $stats['tables_verified']++;

                // 2. Consultar columnas actuales de la tabla en MySQL
                $colStmt = $pdo->prepare("
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tname
                ");
                $colStmt->execute([':tname' => $tableName]);
                $existingCols = array_map('strtolower', $colStmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
                $existingSet = array_flip($existingCols);

                // 3. Revisar cada línea de columna del CREATE TABLE para detectar columnas nuevas
                $lines = preg_split('/\r\n|\r|\n/', $bodyLinesRaw) ?: [];
                foreach ($lines as $line) {
                    $trimmed = trim($line);
                    $trimmed = rtrim($trimmed, ',');
                    if ($trimmed === '') continue;

                    // Ignorar PRIMARY KEY, UNIQUE KEY, KEY, CONSTRAINT, INDEX
                    if (preg_match('/^(PRIMARY\s+KEY|UNIQUE\s+KEY|KEY|INDEX|CONSTRAINT|FOREIGN\s+KEY)\b/i', $trimmed)) {
                        continue;
                    }

                    if (preg_match('/^`([a-zA-Z0-9_]+)`\s+(.+)$/i', $trimmed, $colMatch)) {
                        $colName = $colMatch[1];
                        $colDef = $colMatch[2];
                        if (!isset($existingSet[strtolower($colName)])) {
                            try {
                                $pdo->exec("ALTER TABLE `{$tableName}` ADD COLUMN `{$colName}` {$colDef}");
                                $stats['columns_added']++;
                                $stats['details'][] = "Columna nueva creada: {$tableName}.{$colName}";
                            } catch (Throwable $colErr) {
                                // Ignorar si ya existe o restricción específica
                            }
                        }
                    }
                }
            }
        }
    } catch (Throwable $e) {
        $stats['details'][] = 'Aviso BD: ' . $e->getMessage();
    }

    return $stats;
}

function recursiveDeleteDir(string $dir): void {
    if (!file_exists($dir)) return;
    $items = @scandir($dir);
    if (!is_array($items)) return;
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $full = $dir . '/' . $item;
        if (is_dir($full)) {
            recursiveDeleteDir($full);
        } else {
            @unlink($full);
        }
    }
    @rmdir($dir);
}

function readLocalVersion(string $rootTarget): ?array {
    $vFile = $rootTarget . '/version.json';
    if (!file_exists($vFile)) return null;
    $raw = @file_get_contents($vFile);
    if (!is_string($raw) || $raw === '') return null;
    $parsed = json_decode($raw, true);
    return is_array($parsed) ? $parsed : null;
}

switch ($action) {
    case 'check':
        $installed = readLocalVersion($rootTarget);
        $rawVersionUrl = "https://raw.githubusercontent.com/$repo/$branch/release/version.json";
        $remoteVersionRaw = fetchRemoteData($rawVersionUrl, 15);
        $remoteVersion = $remoteVersionRaw ? json_decode($remoteVersionRaw, true) : null;

        // También consultar último commit de GitHub como respaldo informativo
        $commitUrl = "https://api.github.com/repos/$repo/commits/$branch";
        $commitRaw = fetchRemoteData($commitUrl, 15);
        $commitData = $commitRaw ? json_decode($commitRaw, true) : null;

        if (!is_array($remoteVersion) && (!is_array($commitData) || !isset($commitData['sha']))) {
            sendResponse([
                'success' => false,
                'error' => 'No se pudo consultar GitHub desde el servidor.'
            ], 502);
        }

        $latestBuildId = is_array($remoteVersion) && isset($remoteVersion['buildId'])
            ? (string)$remoteVersion['buildId']
            : substr((string)($commitData['sha'] ?? ''), 0, 7);

        $latestMessage = is_array($remoteVersion) && !empty($remoteVersion['message'])
            ? (string)$remoteVersion['message']
            : explode("\n", (string)($commitData['commit']['message'] ?? 'Actualización disponible'))[0];

        $latestDate = is_array($remoteVersion) && !empty($remoteVersion['builtAt'])
            ? (string)$remoteVersion['builtAt']
            : (string)($commitData['commit']['author']['date'] ?? date('c'));

        $installedBuildId = is_array($installed) && isset($installed['buildId']) ? (string)$installed['buildId'] : null;
        $updateAvailable = $installedBuildId !== null ? ($installedBuildId !== $latestBuildId) : true;

        sendResponse([
            'success' => true,
            'installed_build' => $installedBuildId,
            'installed' => $installed,
            'remote' => $remoteVersion,
            'latest_commit' => $latestBuildId,
            'full_sha' => (string)($commitData['sha'] ?? $latestBuildId),
            'message' => $latestMessage,
            'date' => $latestDate,
            'update_available' => $updateAvailable,
            'capabilities' => [
                'curl' => function_exists('curl_init'),
                'writable' => is_writable($rootTarget),
                'mode' => 'manifest-sha256-direct',
            ],
        ]);
        break;

    case 'deploy':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendResponse(['success' => false, 'error' => 'Método POST requerido'], 405);
        }

        if (!isAuthorizedForDeploy()) {
            sendResponse([
                'success' => false,
                'error' => 'Autorización denegada: inicia sesión como Administrador o verifica tu PIN maestro.'
            ], 403);
        }

        if (!checkDirectoryWritable($rootTarget)) {
            sendResponse([
                'success' => false,
                'error' => 'El directorio raíz del ERP (' . $rootTarget . ') no tiene permisos de escritura.'
            ], 500);
        }

        $steps = [];
        $stageDir = null;

        try {
            // Intentar descargar release/manifest.json desde raw.githubusercontent.com con cache-buster;
            // si GitHub aún no lo propaga por CDN, respaldar vía GitHub REST API contents.
            $manifestUrl = "https://raw.githubusercontent.com/$repo/$branch/release/manifest.json";
            $manifestRaw = fetchRemoteData($manifestUrl, 30);
            $manifest = $manifestRaw ? json_decode($manifestRaw, true) : null;

            if (!is_array($manifest) || !isset($manifest['files']) || !is_array($manifest['files'])) {
                $apiManifestUrl = "https://api.github.com/repos/$repo/contents/release/manifest.json?ref=$branch";
                $apiRaw = fetchRemoteData($apiManifestUrl, 30);
                if ($apiRaw) {
                    $apiJson = json_decode($apiRaw, true);
                    if (is_array($apiJson) && isset($apiJson['content']) && is_string($apiJson['content'])) {
                        $decodedContent = base64_decode(str_replace(["\r", "\n", ' '], '', $apiJson['content']));
                        $manifest = $decodedContent ? json_decode($decodedContent, true) : null;
                    }
                }
            }

            if (!is_array($manifest) || !isset($manifest['files']) || !is_array($manifest['files'])) {
                sendResponse([
                    'success' => false,
                    'error' => 'No se encontró release/manifest.json en GitHub. Ejecuta "npm run release" y sube los cambios a main.'
                ], 500);
            }

            $targetBuildId = (string)($manifest['buildId'] ?? 'latest');
            $manifestFiles = $manifest['files'];
            $steps[] = "Manifiesto remoto verificado: build {$targetBuildId} (" . count($manifestFiles) . " archivos indexados).";

            // 1. Determinar qué archivos cambiaron comparando SHA-256 local vs remoto
            $toDownload = [];
            $unchangedCount = 0;
            $validAssetNames = [];

            foreach ($manifestFiles as $entry) {
                if (!is_array($entry) || empty($entry['path']) || empty($entry['sha256'])) continue;
                $relPath = ltrim(str_replace('\\', '/', (string)$entry['path']), '/');

                // Seguridad: impedir path traversal y proteger config.local.php y uploads/
                if (
                    strpos($relPath, '..') !== false ||
                    $relPath === 'api/config.local.php' ||
                    strpos($relPath, 'uploads/') === 0
                ) {
                    continue;
                }

                if (strpos($relPath, 'assets/') === 0) {
                    $validAssetNames[basename($relPath)] = true;
                }

                $localFile = $rootTarget . '/' . $relPath;
                if (file_exists($localFile) && is_file($localFile)) {
                    $localHash = @hash_file('sha256', $localFile);
                    if ($localHash !== false && hash_equals(strtolower((string)$entry['sha256']), strtolower($localHash))) {
                        $unchangedCount++;
                        continue;
                    }
                }

                $toDownload[] = [
                    'path' => $relPath,
                    'sha256' => strtolower((string)$entry['sha256']),
                    'size' => (int)($entry['size'] ?? 0),
                ];
            }

            $steps[] = "Comparación SHA-256 completada: " . count($toDownload) . " archivos por actualizar, {$unchangedCount} idénticos omitidos.";

            // 2. Directorio de staging DENTRO del proyecto (evita bloqueos de open_basedir en /tmp)
            $stageDir = $rootTarget . '/.kh_update_stage_' . time() . '_' . mt_rand(100, 999);
            if (!is_dir($stageDir) && !@mkdir($stageDir, 0755, true)) {
                sendResponse([
                    'success' => false,
                    'error' => 'No se pudo crear el directorio temporal de staging en ' . $stageDir
                ], 500);
            }

            // 3. Descargar archivos nuevos/modificados y verificar integridad SHA-256
            $rawBase = "https://raw.githubusercontent.com/$repo/$branch/release/";
            $deferredEntries = []; // index.html se aplica al final para transición atómica
            $updatedCount = 0;

            foreach ($toDownload as $item) {
                $relPath = $item['path'];
                // Codificar cada segmento de la ruta para URL
                $encodedPath = implode('/', array_map('rawurlencode', explode('/', $relPath)));
                $fileUrl = $rawBase . $encodedPath;

                $data = fetchRemoteData($fileUrl, 45);
                if ($data === null) {
                    if ($stageDir) recursiveDeleteDir($stageDir);
                    sendResponse([
                        'success' => false,
                        'error' => "Error al descargar el archivo '{$relPath}' desde GitHub.",
                        'steps' => $steps,
                    ], 502);
                }

                $downloadedHash = strtolower(hash('sha256', $data));
                if (!hash_equals($item['sha256'], $downloadedHash)) {
                    if ($stageDir) recursiveDeleteDir($stageDir);
                    sendResponse([
                        'success' => false,
                        'error' => "Fallo de verificación SHA-256 en '{$relPath}' (descarga corrupta o caché intermedia).",
                        'steps' => $steps,
                    ], 502);
                }

                $stageFile = $stageDir . '/' . $relPath;
                $stageParent = dirname($stageFile);
                if (!is_dir($stageParent)) {
                    @mkdir($stageParent, 0755, true);
                }
                if (@file_put_contents($stageFile, $data) === false) {
                    if ($stageDir) recursiveDeleteDir($stageDir);
                    sendResponse([
                        'success' => false,
                        'error' => "No se pudo escribir en staging: {$relPath}",
                        'steps' => $steps,
                    ], 500);
                }
            }

            // 4. Promover archivos desde staging al directorio raíz (assets y API primero, index.html al final)
            foreach ($toDownload as $item) {
                $relPath = $item['path'];
                if ($relPath === 'index.html') {
                    $deferredEntries[] = $relPath;
                    continue;
                }
                $srcFile = $stageDir . '/' . $relPath;
                $dstFile = $rootTarget . '/' . $relPath;
                $dstParent = dirname($dstFile);
                if (!is_dir($dstParent)) {
                    @mkdir($dstParent, 0755, true);
                }
                if (@copy($srcFile, $dstFile)) {
                    $updatedCount++;
                }
            }

            foreach ($deferredEntries as $relPath) {
                $srcFile = $stageDir . '/' . $relPath;
                $dstFile = $rootTarget . '/' . $relPath;
                if (@copy($srcFile, $dstFile)) {
                    $updatedCount++;
                }
            }

            // Actualizar manifest.json y version.json locales al final
            if (!empty($manifestRaw)) {
                @file_put_contents($rootTarget . '/manifest.json', $manifestRaw);
            }
            $versionUrl = "https://raw.githubusercontent.com/$repo/$branch/release/version.json";
            $remoteVersionRaw = fetchRemoteData($versionUrl, 15);
            if ($remoteVersionRaw) {
                @file_put_contents($rootTarget . '/version.json', $remoteVersionRaw);
                $updatedCount++;
            }

            if ($stageDir) {
                recursiveDeleteDir($stageDir);
            }

            // 5. Limpiar chunks antiguos de /assets que ya no forman parte del build actual
            $cleanedAssets = 0;
            $assetsDir = $rootTarget . '/assets';
            if (is_dir($assetsDir) && !empty($validAssetNames)) {
                $existingAssets = @scandir($assetsDir);
                if (is_array($existingAssets)) {
                    foreach ($existingAssets as $assetFile) {
                        if ($assetFile === '.' || $assetFile === '..') continue;
                        if (!isset($validAssetNames[$assetFile])) {
                            $fullAssetPath = $assetsDir . '/' . $assetFile;
                            if (is_file($fullAssetPath) && @unlink($fullAssetPath)) {
                                $cleanedAssets++;
                            }
                        }
                    }
                }
            }
            if ($cleanedAssets > 0) {
                $steps[] = "Limpieza de caché: {$cleanedAssets} chunks antiguos eliminados de /assets.";
            }

            // 6. Ejecutar auto-migración no destructiva de Base de Datos MySQL
            $dbStats = ensureDatabaseSchema($rootTarget);
            if ($dbStats['connected']) {
                $steps[] = "Base de datos verificada: {$dbStats['tables_verified']} tablas comprobadas, {$dbStats['columns_added']} columnas nuevas creadas (datos 100% intactos).";
                foreach ($dbStats['details'] as $detail) {
                    $steps[] = "  ↳ {$detail}";
                }
            }

            sendResponse([
                'success' => true,
                'message' => '¡Actualización en caliente aplicada directamente desde GitHub!',
                'build_id' => $targetBuildId,
                'files_updated' => $updatedCount,
                'files_unchanged' => $unchangedCount,
                'files_cleaned' => $cleanedAssets,
                'db_migration' => $dbStats,
                'steps' => $steps,
            ]);
        } catch (Throwable $e) {
            if ($stageDir) {
                recursiveDeleteDir($stageDir);
            }
            sendResponse([
                'success' => false,
                'error' => 'Error durante la actualización: ' . $e->getMessage(),
                'steps' => $steps,
            ], 500);
        }
        break;

    default:
        sendResponse(['success' => false, 'error' => 'Acción no válida'], 400);
        break;
}
