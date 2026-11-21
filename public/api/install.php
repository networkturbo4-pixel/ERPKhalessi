<?php
/**
 * Asistente de Instalación Web (Setup Wizard API)
 * Khalessi Pizza / GastroERP
 */

@ini_set('display_errors', '0');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('INSTALL_LOCK_FILE', __DIR__ . '/install.lock');
define('CONFIG_LOCAL_FILE', __DIR__ . '/config.local.php');
define('DATABASE_SQL_FILE', dirname(__DIR__) . '/database.sql');
define('BRANDING_UPLOAD_DIR', dirname(__DIR__) . '/uploads/branding');
$_prodServerDir = dirname(__DIR__) . '/server';
$_devServerDir = dirname(__DIR__, 2) . '/server';
define('SERVER_DIR', file_exists($_prodServerDir . '/app.js') ? $_prodServerDir : $_devServerDir);
define('SERVER_CONFIG_FILE', SERVER_DIR . '/config.json');

function jsonOut(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function readJsonBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function isInstallerLocked(): bool {
    return file_exists(INSTALL_LOCK_FILE);
}

function requireUnlocked(): void {
    if (isInstallerLocked()) {
        jsonOut([
            'success' => false,
            'locked'  => true,
            'error'   => 'El instalador ya fue completado y bloqueado (api/install.lock).',
        ], 403);
    }
}

function isExecAvailable(): bool {
    if (!function_exists('exec')) {
        return false;
    }
    $disabled = strtolower((string)ini_get('disable_functions'));
    if ($disabled !== '') {
        $list = array_map('trim', explode(',', $disabled));
        if (in_array('exec', $list, true)) {
            return false;
        }
    }
    return true;
}

function findNodeBinary(): ?string {
    if (!isExecAvailable()) {
        return null;
    }
    $candidates = ['node', '/usr/local/bin/node', '/usr/bin/node'];
    if (stripos(PHP_OS, 'WIN') === 0) {
        $candidates = ['node', 'C:\\Program Files\\nodejs\\node.exe'];
    }
    foreach ($candidates as $bin) {
        $cmd = stripos(PHP_OS, 'WIN') === 0
            ? 'where ' . escapeshellarg($bin) . ' 2>NUL'
            : 'command -v ' . escapeshellarg($bin) . ' 2>/dev/null';
        $out = [];
        $code = 1;
        @exec($cmd, $out, $code);
        if ($code === 0 && !empty($out[0])) {
            return trim($out[0]);
        }
        if (file_exists($bin)) {
            return $bin;
        }
    }
    return null;
}

function probeNodeHealth(int $port = 3000): array {
    $urls = ["http://127.0.0.1:{$port}/health"];
    if (!empty($_SERVER['HTTP_HOST'])) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $urls[] = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/realtime/health';
    }

    foreach ($urls as $url) {
        $body = false;
        $httpCode = 0;

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER    => true,
                CURLOPT_CONNECTTIMEOUT_MS => 800,
                CURLOPT_TIMEOUT_MS        => 1200,
                CURLOPT_SSL_VERIFYPEER    => false,
                CURLOPT_SSL_VERIFYHOST    => 0,
            ]);
            $body = @curl_exec($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
        } else {
            $ctx = stream_context_create([
                'http' => [
                    'method'  => 'GET',
                    'timeout' => 1.0,
                ],
            ]);
            $body = @file_get_contents($url, false, $ctx);
            if ($body !== false) {
                $httpCode = 200;
            }
        }

        if ($body !== false && $httpCode >= 200 && $httpCode < 300) {
            $data = json_decode((string)$body, true);
            if (is_array($data) && ($data['status'] ?? '') === 'online') {
                return [
                    'online'           => true,
                    'endpoint'         => $url,
                    'service'          => $data['service'] ?? 'Node.js SSE',
                    'uptimeSeconds'    => $data['uptimeSeconds'] ?? 0,
                    'connectedClients' => $data['connectedClients'] ?? 0,
                ];
            }
        }
    }

    return [
        'online'   => false,
        'endpoint' => null,
    ];
}

function buildPdo(string $host, int $port, string $dbName, string $user, string $pass): PDO {
    $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
    return new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
}

function loadConfigLocalPdo(): ?PDO {
    if (!file_exists(CONFIG_LOCAL_FILE)) {
        return null;
    }
    require_once CONFIG_LOCAL_FILE;
    if (!defined('DB_HOST') || !defined('DB_USER') || !defined('DB_PASS') || !defined('DB_NAME')) {
        return null;
    }
    $port = defined('DB_PORT') ? (int)DB_PORT : 3306;
    return buildPdo((string)DB_HOST, $port, (string)DB_NAME, (string)DB_USER, (string)DB_PASS);
}

function splitSqlStatements(string $sql): array {
    $lines = preg_split("/\r\n|\n|\r/", $sql) ?: [];
    $clean = [];
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || strpos($trimmed, '--') === 0) {
            continue;
        }
        $clean[] = $line;
    }
    $joined = implode("\n", $clean);
    $parts = explode(";\n", $joined);
    $stmts = [];
    foreach ($parts as $part) {
        $stmt = trim($part, " \t\n\r;");
        if ($stmt !== '') {
            $stmts[] = $stmt;
        }
    }
    return $stmts;
}

function ensureKvTable(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS kv_storage (
        k VARCHAR(190) NOT NULL,
        v LONGTEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (k)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function upsertKv(PDO $pdo, string $key, string $value): void {
    $st = $pdo->prepare("INSERT INTO kv_storage (k, v) VALUES (:k, :v) ON DUPLICATE KEY UPDATE v = VALUES(v)");
    $st->execute([':k' => $key, ':v' => $value]);
}

function getKv(PDO $pdo, string $key): ?string {
    $st = $pdo->prepare("SELECT v FROM kv_storage WHERE k = :k LIMIT 1");
    $st->execute([':k' => $key]);
    $val = $st->fetchColumn();
    return $val === false ? null : (string)$val;
}

$action = trim((string)($_GET['action'] ?? 'status'));

// -----------------------------------------------------------------------------
// 1. STATUS (GET)
// -----------------------------------------------------------------------------
if ($action === 'status' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $locked = isInstallerLocked();
    $hasConfig = file_exists(CONFIG_LOCAL_FILE);
    $dbConnected = false;
    $tablesReady = false;

    if ($hasConfig) {
        try {
            $pdo = loadConfigLocalPdo();
            if ($pdo instanceof PDO) {
                $dbConnected = true;
                $check = $pdo->query("SHOW TABLES LIKE 'kv_storage'");
                $tablesReady = $check !== false && $check->fetchColumn() !== false;
            }
        } catch (Throwable $e) {
            $dbConnected = false;
        }
    }

    $nodePort = 3000;
    if (file_exists(SERVER_CONFIG_FILE)) {
        $sc = json_decode((string)file_get_contents(SERVER_CONFIG_FILE), true);
        if (is_array($sc) && !empty($sc['PORT'])) {
            $nodePort = (int)$sc['PORT'];
        }
    }

    $nodeStatus = probeNodeHealth($nodePort);

    if ($locked) {
        jsonOut([
            'success'     => true,
            'installed'   => true,
            'locked'      => true,
            'hasConfig'   => $hasConfig,
            'dbConnected' => $dbConnected,
            'tablesReady' => $tablesReady,
            'nodeStatus'  => $nodeStatus,
        ]);
    }

    $nodeBin = findNodeBinary();
    jsonOut([
        'success'     => true,
        'installed'   => $hasConfig && $dbConnected && $tablesReady,
        'locked'      => false,
        'hasConfig'   => $hasConfig,
        'dbConnected' => $dbConnected,
        'tablesReady' => $tablesReady,
        'nodeStatus'  => $nodeStatus,
        'environment' => [
            'phpVersion'        => PHP_VERSION,
            'pdoMysql'          => extension_loaded('pdo_mysql'),
            'curl'              => extension_loaded('curl'),
            'openssl'           => extension_loaded('openssl'),
            'apiWritable'       => is_writable(__DIR__),
            'uploadsWritable'   => is_dir(BRANDING_UPLOAD_DIR) ? is_writable(BRANDING_UPLOAD_DIR) : is_writable(dirname(__DIR__)),
            'serverWritable'    => is_dir(SERVER_DIR) ? is_writable(SERVER_DIR) : false,
            'execAvailable'     => isExecAvailable(),
            'nodeBinaryFound'   => $nodeBin !== null,
            'serverDirExists'   => is_dir(SERVER_DIR) && file_exists(SERVER_DIR . '/app.js'),
        ],
    ]);
}

// Todas las demás acciones requieren método POST y que el instalador no esté bloqueado
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonOut(['success' => false, 'error' => 'Método no permitido. Usa POST.'], 405);
}
requireUnlocked();

// -----------------------------------------------------------------------------
// 2. TEST DB CONNECTION
// -----------------------------------------------------------------------------
if ($action === 'test-db') {
    $body = readJsonBody();
    $host = trim((string)($body['host'] ?? 'localhost'));
    $port = max(1, min(65535, (int)($body['port'] ?? 3306)));
    $name = trim((string)($body['name'] ?? ''));
    $user = trim((string)($body['user'] ?? ''));
    $pass = (string)($body['pass'] ?? '');

    if ($host === '' || $name === '' || $user === '') {
        jsonOut(['success' => false, 'error' => 'Completa host, nombre de base de datos y usuario.'], 400);
    }

    try {
        $pdo = buildPdo($host, $port, $name, $user, $pass);
        $version = (string)$pdo->query('SELECT VERSION()')->fetchColumn();
        jsonOut([
            'success' => true,
            'message' => 'Conexión MySQL exitosa.',
            'version' => $version,
        ]);
    } catch (Throwable $e) {
        jsonOut([
            'success' => false,
            'error'   => 'No se pudo conectar a MySQL: ' . $e->getMessage(),
        ], 400);
    }
}

// -----------------------------------------------------------------------------
// 3. INSTALL DB + WRITE config.local.php + SUPERADMIN PIN
// -----------------------------------------------------------------------------
if ($action === 'install-db') {
    $body = readJsonBody();
    $host = trim((string)($body['host'] ?? 'localhost'));
    $port = max(1, min(65535, (int)($body['port'] ?? 3306)));
    $name = trim((string)($body['name'] ?? ''));
    $user = trim((string)($body['user'] ?? ''));
    $pass = (string)($body['pass'] ?? '');
    $adminName = trim((string)($body['adminName'] ?? 'Administrador General'));
    $adminPin = trim((string)($body['adminPin'] ?? ''));

    if ($host === '' || $name === '' || $user === '') {
        jsonOut(['success' => false, 'error' => 'Completa los datos de conexión MySQL.'], 400);
    }
    if (!preg_match('/^[0-9]{4,12}$/', $adminPin)) {
        jsonOut(['success' => false, 'error' => 'El PIN del SuperAdmin debe tener entre 4 y 12 dígitos numéricos.'], 400);
    }
    if (!is_writable(__DIR__)) {
        jsonOut(['success' => false, 'error' => 'La carpeta public/api/ no tiene permisos de escritura.'], 500);
    }

    try {
        $pdo = buildPdo($host, $port, $name, $user, $pass);

        if (file_exists(DATABASE_SQL_FILE)) {
            $sql = (string)file_get_contents(DATABASE_SQL_FILE);
            foreach (splitSqlStatements($sql) as $stmt) {
                $pdo->exec($stmt);
            }
        }
        ensureKvTable($pdo);

        // Actualizar SuperAdmin inicial en tabla users
        $safeAdminName = $adminName !== '' ? $adminName : 'Administrador General';
        $stUser = $pdo->prepare("UPDATE users SET name = :name, pin = :pin WHERE id = 'user-1'");
        $stUser->execute([':name' => $safeAdminName, ':pin' => $adminPin]);
        if ($stUser->rowCount() === 0) {
            $stIns = $pdo->prepare("INSERT INTO users (id, tenant_id, pin, name, role, role_name, email)
                VALUES ('user-1', 'tenant-1', :pin, :name, 'superadmin', 'Super Administrador', 'admin@gastroerp.com')
                ON DUPLICATE KEY UPDATE pin = VALUES(pin), name = VALUES(name)");
            $stIns->execute([':pin' => $adminPin, ':name' => $safeAdminName]);
        }

        // Generar secretos criptográficos
        $tokenSecret = bin2hex(random_bytes(32));
        $realtimeSecret = bin2hex(random_bytes(24));

        $cfgLines = [
            "<?php",
            "// Generado automáticamente por el Asistente de Instalación de Khalessi Pizza ERP",
            "define('DB_HOST', " . var_export($host, true) . ");",
            "define('DB_PORT', " . var_export($port, true) . ");",
            "define('DB_USER', " . var_export($user, true) . ");",
            "define('DB_PASS', " . var_export($pass, true) . ");",
            "define('DB_NAME', " . var_export($name, true) . ");",
            "define('DB_CHARSET', 'utf8mb4');",
            "define('ADMIN_BOOTSTRAP_PIN', " . var_export($adminPin, true) . ");",
            "define('TOKEN_SECRET', " . var_export($tokenSecret, true) . ");",
            "define('ERP_REALTIME_SECRET', " . var_export($realtimeSecret, true) . ");",
            "",
        ];
        if (file_put_contents(CONFIG_LOCAL_FILE, implode("\n", $cfgLines), LOCK_EX) === false) {
            jsonOut(['success' => false, 'error' => 'No se pudo escribir api/config.local.php.'], 500);
        }

        jsonOut([
            'success'        => true,
            'message'        => 'Base de datos inicializada y config.local.php guardado.',
            'realtimeSecret' => $realtimeSecret,
        ]);
    } catch (Throwable $e) {
        jsonOut([
            'success' => false,
            'error'   => 'Error instalando la base de datos: ' . $e->getMessage(),
        ], 500);
    }
}

// -----------------------------------------------------------------------------
// 4. UPLOAD BRANDING ASSET (physical file in public/uploads/branding/)
// -----------------------------------------------------------------------------
if ($action === 'upload-branding') {
    $slot = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($_POST['slot'] ?? 'asset'));
    if ($slot === '') {
        $slot = 'asset';
    }

    if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
        jsonOut(['success' => false, 'error' => 'No se recibió ningún archivo.'], 400);
    }
    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        jsonOut(['success' => false, 'error' => 'Error al subir el archivo (código ' . (int)$file['error'] . ').'], 400);
    }
    if ((int)$file['size'] > 2 * 1024 * 1024) {
        jsonOut(['success' => false, 'error' => 'El archivo supera el máximo permitido de 2 MB.'], 400);
    }

    $tmpPath = (string)$file['tmp_name'];
    $origName = (string)($file['name'] ?? 'image');
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

    $allowedMimes = [
        'image/png'                => 'png',
        'image/jpeg'               => 'jpg',
        'image/webp'               => 'webp',
        'image/svg+xml'            => 'svg',
        'image/x-icon'             => 'ico',
        'image/vnd.microsoft.icon' => 'ico',
    ];

    $detectedMime = '';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $detectedMime = (string)finfo_file($finfo, $tmpPath);
            finfo_close($finfo);
        }
    }
    if ($detectedMime === 'text/plain' && $ext === 'svg') {
        $head = (string)file_get_contents($tmpPath, false, null, 0, 512);
        if (stripos($head, '<svg') !== false) {
            $detectedMime = 'image/svg+xml';
        }
    }

    if (!isset($allowedMimes[$detectedMime])) {
        jsonOut([
            'success' => false,
            'error'   => 'Formato de imagen no soportado (' . ($detectedMime ?: 'desconocido') . '). Usa PNG, JPG, WEBP, SVG o ICO.',
        ], 400);
    }

    if (!is_dir(BRANDING_UPLOAD_DIR)) {
        if (!@mkdir(BRANDING_UPLOAD_DIR, 0755, true) && !is_dir(BRANDING_UPLOAD_DIR)) {
            jsonOut(['success' => false, 'error' => 'No se pudo crear la carpeta public/uploads/branding/.'], 500);
        }
    }
    if (!is_writable(BRANDING_UPLOAD_DIR)) {
        jsonOut(['success' => false, 'error' => 'La carpeta public/uploads/branding/ no tiene permisos de escritura.'], 500);
    }

    $finalExt = $allowedMimes[$detectedMime];
    $fileName = strtolower($slot) . '-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $finalExt;
    $destPath = BRANDING_UPLOAD_DIR . '/' . $fileName;

    if (!move_uploaded_file($tmpPath, $destPath)) {
        jsonOut(['success' => false, 'error' => 'No se pudo guardar el archivo en uploads/branding/.'], 500);
    }

    jsonOut([
        'success' => true,
        'url'     => '/uploads/branding/' . $fileName,
        'mime'    => $detectedMime,
    ]);
}

// -----------------------------------------------------------------------------
// 5. SAVE BRANDING & STORE THEME (kv_storage)
// -----------------------------------------------------------------------------
if ($action === 'save-branding') {
    $body = readJsonBody();

    try {
        $pdo = loadConfigLocalPdo();
        if (!$pdo instanceof PDO) {
            jsonOut(['success' => false, 'error' => 'Primero debes conectar e instalar la base de datos (Paso 1).'], 400);
        }
        ensureKvTable($pdo);

        // 5a. Actualizar gastro_erp_settings_v3
        $rawSettings = getKv($pdo, 'gastro_erp_settings_v3');
        $settings = $rawSettings ? json_decode($rawSettings, true) : [];
        if (!is_array($settings)) {
            $settings = [];
        }
        $cust = isset($settings['customization']) && is_array($settings['customization'])
            ? $settings['customization']
            : [];

        $primaryColor = trim((string)($body['primaryColor'] ?? '#f97316'));
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $primaryColor)) {
            $primaryColor = '#f97316';
        }
        $themePreference = in_array(($body['themePreference'] ?? 'dark'), ['light', 'dark', 'system'], true)
            ? $body['themePreference']
            : 'dark';

        $cust['appName'] = trim((string)($body['appName'] ?? 'Khalessi Pizza')) ?: 'Khalessi Pizza';
        $cust['slogan'] = trim((string)($body['slogan'] ?? 'El sabor artesanal respaldado por tecnología ágil'));
        if (!empty($body['logoLight'])) {
            $cust['logoLight'] = trim((string)$body['logoLight']);
        }
        if (!empty($body['logoDark'])) {
            $cust['logoDark'] = trim((string)$body['logoDark']);
        }
        if (!empty($body['storeHeaderLogo'])) {
            $cust['storeHeaderLogo'] = trim((string)$body['storeHeaderLogo']);
        }
        if (!empty($body['favicon'])) {
            $cust['favicon'] = trim((string)$body['favicon']);
        }
        $cust['primaryColor'] = $primaryColor;
        $cust['accentColorLight'] = $primaryColor;
        $cust['accentColorDark'] = $primaryColor;
        $cust['themePreference'] = $themePreference;
        if (!isset($cust['loginConfig']) || !is_array($cust['loginConfig'])) {
            $cust['loginConfig'] = [];
        }
        $cust['loginConfig']['buttonColor'] = $primaryColor;

        $settings['customization'] = $cust;
        upsertKv($pdo, 'gastro_erp_settings_v3', json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        // 5b. Actualizar kh_store_builder_v2 con el theme de tienda seleccionado
        $activeTemplateId = trim((string)($body['storeTemplateId'] ?? ''));
        if ($activeTemplateId !== '') {
            $rawBuilder = getKv($pdo, 'kh_store_builder_v2');
            $builder = $rawBuilder ? json_decode($rawBuilder, true) : [];
            if (!is_array($builder)) {
                $builder = [];
            }
            $builder['activeTemplateId'] = $activeTemplateId;
            if (!isset($builder['templates']) || !is_array($builder['templates'])) {
                $builder['templates'] = [];
            }
            upsertKv($pdo, 'kh_store_builder_v2', json_encode($builder, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }

        jsonOut([
            'success' => true,
            'message' => 'Identidad visual y theme de la tienda guardados en MySQL.',
        ]);
    } catch (Throwable $e) {
        jsonOut(['success' => false, 'error' => 'Error guardando identidad: ' . $e->getMessage()], 500);
    }
}

// -----------------------------------------------------------------------------
// 6. SETUP & ACTIVATE NODE.JS SERVER
// -----------------------------------------------------------------------------
if ($action === 'setup-node') {
    $body = readJsonBody();
    $port = max(1024, min(65535, (int)($body['port'] ?? 3000)));
    $autoStart = !empty($body['autoStart']);
    $corsOrigin = trim((string)($body['corsOrigin'] ?? ''));

    if ($corsOrigin === '' && !empty($_SERVER['HTTP_HOST'])) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $corsOrigin = $scheme . '://' . $_SERVER['HTTP_HOST'];
    }

    if (file_exists(CONFIG_LOCAL_FILE)) {
        require_once CONFIG_LOCAL_FILE;
    }
    $realtimeSecret = defined('ERP_REALTIME_SECRET') ? (string)ERP_REALTIME_SECRET : bin2hex(random_bytes(24));

    if (!is_dir(SERVER_DIR) || !file_exists(SERVER_DIR . '/app.js')) {
        jsonOut(['success' => false, 'error' => 'No se encontró la carpeta server/app.js.'], 404);
    }
    if (!is_writable(SERVER_DIR)) {
        jsonOut(['success' => false, 'error' => 'La carpeta server/ no tiene permisos de escritura.'], 500);
    }

    $nodeConfig = [
        'PORT'                => $port,
        'ERP_REALTIME_SECRET' => $realtimeSecret,
        'CORS_ALLOWED_ORIGIN' => $corsOrigin,
    ];
    file_put_contents(
        SERVER_CONFIG_FILE,
        json_encode($nodeConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n",
        LOCK_EX
    );

    $alreadyOnline = probeNodeHealth($port);
    if ($alreadyOnline['online']) {
        jsonOut([
            'success'        => true,
            'online'         => true,
            'manualRequired' => false,
            'nodeStatus'     => $alreadyOnline,
            'realtimeSecret' => $realtimeSecret,
            'serverRoot'     => SERVER_DIR,
            'message'        => 'server/config.json actualizado y el servidor Node.js ya está en línea.',
        ]);
    }

    $started = false;
    $startMessage = 'Configuración guardada en server/config.json.';
    if ($autoStart) {
        $nodeBin = findNodeBinary();
        if ($nodeBin !== null) {
            $appJs = SERVER_DIR . DIRECTORY_SEPARATOR . 'app.js';
            if (stripos(PHP_OS, 'WIN') === 0) {
                $cmd = 'start "" /B ' . escapeshellarg($nodeBin) . ' ' . escapeshellarg($appJs) . ' > NUL 2>&1';
                @pclose(@popen($cmd, 'r'));
            } else {
                $logFile = SERVER_DIR . '/realtime.log';
                $cmd = 'nohup ' . escapeshellarg($nodeBin) . ' ' . escapeshellarg($appJs) . ' > ' . escapeshellarg($logFile) . ' 2>&1 &';
                @exec($cmd);
            }
            usleep(650000);
            $afterProbe = probeNodeHealth($port);
            if ($afterProbe['online']) {
                $started = true;
                $startMessage = 'Servidor Node.js iniciado automáticamente y respondiendo.';
                $alreadyOnline = $afterProbe;
            } else {
                $startMessage = 'Se intentó iniciar Node.js, pero el puerto aún no responde (en cPanel compartido debes activarlo en Setup Node.js App).';
            }
        } else {
            $startMessage = 'PHP no tiene acceso directo a exec/node en este hosting. Actívalo desde cPanel -> Setup Node.js App.';
        }
    }

    jsonOut([
        'success'        => true,
        'online'         => $started,
        'manualRequired' => !$started,
        'nodeStatus'     => $alreadyOnline,
        'realtimeSecret' => $realtimeSecret,
        'serverRoot'     => SERVER_DIR,
        'message'        => $startMessage,
    ]);
}

// -----------------------------------------------------------------------------
// 7. FINISH & LOCK INSTALLER
// -----------------------------------------------------------------------------
if ($action === 'finish') {
    $lockPayload = [
        'installedAt' => gmdate('c'),
        'host'        => $_SERVER['HTTP_HOST'] ?? 'cli',
    ];
    if (file_put_contents(INSTALL_LOCK_FILE, json_encode($lockPayload, JSON_PRETTY_PRINT) . "\n", LOCK_EX) === false) {
        jsonOut(['success' => false, 'error' => 'No se pudo crear api/install.lock.'], 500);
    }

    jsonOut([
        'success' => true,
        'locked'  => true,
        'message' => 'Instalación completada y bloqueada con éxito.',
    ]);
}

jsonOut(['success' => false, 'error' => 'Acción de instalación no reconocida.'], 400);
