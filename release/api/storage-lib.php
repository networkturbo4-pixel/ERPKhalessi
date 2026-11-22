<?php
/**
 * Utilidades compartidas: almacenamiento clave/valor en MySQL + tokens de administrador.
 */

// Claves que se sincronizan con el servidor (el resto se queda solo en el navegador)
const KH_SYNC_KEYS = [
    'gastro_erp_settings_v3',
    'gastro_erp_rbac_v3',
    'gastro_erp_hr_v1',
    'gastro_erp_audit_v1',
    'gastro_erp_complaints_v1',
    'kh_store_builder_v2',
    'kh_catalog_products',
    'kh_product_categories_v1',
    'kh_product_option_templates_v1',
    'kh_erp_benefits_v1',
    'kh_floor_tables_v1',
    'kh_orders_list',
    'kh_pos_held_orders_v1',
    'kh_public_reservations_v1',
    'kh_sunat_invoices_v1',
    'kh_customers_crm_v1',
    'kh_store_customer_accounts_v1',
    'gastro_delivery_fuel_v1',
    'kh_driver_fleet_v1',
    'gastro_erp_finance_expenses_v1',
    'gastro_erp_cash_closings_v1',
    'kh_inv_audits_v1',
    'kh_inv_items_v1',
    'kh_inv_lots_v1',
    'kh_inv_movements_v1',
    'kh_inv_purchases_v1',
    'kh_inv_recipes_v1',
    'kh_inv_settings_v1',
    'kh_inv_stock_v1',
    'kh_inv_suppliers_v1',
    'kh_inv_transfers_v1',
    'kh_media_gallery_v1',
    'kh_label_config_v1',
    'kh_marketing_automations_v1',
    'kh_whatsapp_config_v1',
    'kh_whatsapp_conversations_v1',
    'kh_whatsapp_logs_v1',
    'kh_inbox_tags_v1',
    'kh_inbox_quick_replies_v1',
    'kh_inbox_notes_v1',
    'kh_inbox_ops_config_v1',
    'gastro_loyalty_v1',
    'kh_facturalo_api_config_v1',
    'kh_reniec_api_config',
    'gastro_mapbox_settings_v1',
];

// Claves que terminales operativas y tienda pueden LEER (ajustes siempre sanitizado sin claves ni PINs)
const KH_PUBLIC_READ_KEYS = [
    'gastro_erp_settings_v3',
    'kh_store_builder_v2',
    'kh_catalog_products',
    'kh_product_categories_v1',
    'kh_product_option_templates_v1',
    'kh_erp_benefits_v1',
    'kh_orders_list',
    'kh_customers_crm_v1',
    'kh_store_customer_accounts_v1',
    'kh_floor_tables_v1',
    'gastro_erp_complaints_v1',
    'gastro_erp_hr_v1',
];

// Claves operativas que tienda, KDS, Delivery y Libro de Reclamaciones pueden actualizar sin bloqueo 401
const KH_PUBLIC_WRITE_KEYS = [
    'kh_orders_list',
    'kh_customers_crm_v1',
    'kh_store_customer_accounts_v1',
    'kh_floor_tables_v1',
    'gastro_erp_complaints_v1',
    'gastro_erp_hr_v1',
];

const KH_SETTINGS_KEY = 'gastro_erp_settings_v3';
const KH_RBAC_KEY = 'gastro_erp_rbac_v3';
const KH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 días

function kvInit(PDO $pdo): void {
    static $initialized = false;
    if ($initialized) return;
    $initialized = true;

    $pdo->exec("CREATE TABLE IF NOT EXISTS kv_storage (
        k VARCHAR(190) NOT NULL,
        v LONGTEXT NOT NULL,
        rev BIGINT UNSIGNED NOT NULL DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (k)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Migración no destructiva: agregar columna rev si la tabla ya existía sin ella
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM kv_storage LIKE 'rev'");
        if (!$colCheck || $colCheck->fetch() === false) {
            $pdo->exec("ALTER TABLE kv_storage ADD COLUMN rev BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER v");
        }
    } catch (Throwable $e) {
        // Ignorar si ya existe o sin permisos de ALTER
    }
}

function kvInitBackups(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS kv_storage_backups (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        label VARCHAR(120) NOT NULL,
        build_id VARCHAR(64) DEFAULT '',
        keys_count INT UNSIGNED NOT NULL DEFAULT 0,
        payload LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_kv_backups_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function kvGet(PDO $pdo, string $key): ?string {
    $st = $pdo->prepare("SELECT v FROM kv_storage WHERE k = :k");
    $st->execute([':k' => $key]);
    $v = $st->fetchColumn();
    return $v === false ? null : (string)$v;
}

function kvGetMeta(PDO $pdo, string $key): ?array {
    try {
        $st = $pdo->prepare("SELECT v, rev, updated_at FROM kv_storage WHERE k = :k");
        $st->execute([':k' => $key]);
        $row = $st->fetch();
        if (!$row) return null;
        return [
            'v'          => (string)$row['v'],
            'rev'        => (int)($row['rev'] ?? 1),
            'updated_at' => (string)($row['updated_at'] ?? ''),
        ];
    } catch (Throwable $e) {
        $v = kvGet($pdo, $key);
        return $v === null ? null : ['v' => $v, 'rev' => 1, 'updated_at' => ''];
    }
}

function kvSet(PDO $pdo, string $key, string $value): int {
    try {
        $st = $pdo->prepare("INSERT INTO kv_storage (k, v, rev) VALUES (:k, :v, 1) ON DUPLICATE KEY UPDATE v = VALUES(v), rev = rev + 1");
        $st->execute([':k' => $key, ':v' => $value]);
        $revSt = $pdo->prepare("SELECT rev FROM kv_storage WHERE k = :k");
        $revSt->execute([':k' => $key]);
        $rev = $revSt->fetchColumn();
        return $rev === false ? 1 : (int)$rev;
    } catch (Throwable $e) {
        $st = $pdo->prepare("INSERT INTO kv_storage (k, v) VALUES (:k, :v) ON DUPLICATE KEY UPDATE v = VALUES(v)");
        $st->execute([':k' => $key, ':v' => $value]);
        return 1;
    }
}

function kvCreateBackup(PDO $pdo, string $label, string $buildId = ''): array {
    kvInit($pdo);
    kvInitBackups($pdo);

    $rows = $pdo->query("SELECT k, v, rev, updated_at FROM kv_storage ORDER BY k")->fetchAll();
    $snapshot = [];
    foreach ($rows as $r) {
        $snapshot[(string)$r['k']] = [
            'v'          => (string)$r['v'],
            'rev'        => (int)($r['rev'] ?? 1),
            'updated_at' => (string)($r['updated_at'] ?? ''),
        ];
    }

    $payload = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
    $keysCount = count($snapshot);
    $st = $pdo->prepare("INSERT INTO kv_storage_backups (label, build_id, keys_count, payload) VALUES (:label, :build_id, :keys_count, :payload)");
    $st->execute([
        ':label'      => substr($label, 0, 120),
        ':build_id'   => substr($buildId, 0, 64),
        ':keys_count' => $keysCount,
        ':payload'    => $payload,
    ]);
    $backupId = (int)$pdo->lastInsertId();

    // Conservar los últimos 15 respaldos para no inflar la base de datos
    try {
        $pdo->exec("DELETE FROM kv_storage_backups WHERE id NOT IN (SELECT id FROM (SELECT id FROM kv_storage_backups ORDER BY id DESC LIMIT 15) t)");
    } catch (Throwable $e) {
        // Ignorar si la limpieza falla
    }

    return [
        'id'         => $backupId,
        'label'      => $label,
        'build_id'   => $buildId,
        'keys_count' => $keysCount,
        'created_at' => gmdate('c'),
    ];
}

function kvDelete(PDO $pdo, string $key): void {
    $st = $pdo->prepare("DELETE FROM kv_storage WHERE k = :k");
    $st->execute([':k' => $key]);
}

function validKey(?string $key): bool {
    return $key !== null && preg_match('/^[A-Za-z0-9_\-]{1,120}$/', $key) === 1;
}

/** Quita de los ajustes todo dato sensible antes de entregarlos a visitantes anónimos. */
function sanitizeSettingsForPublic(string $json): string {
    $data = json_decode($json, true);
    if (!is_array($data)) return $json;
    unset($data['users'], $data['driveConfig'], $data['geminiConfig']);
    $data['__public'] = true;
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function sanitizeHrForPublic(string $json): string {
    $data = json_decode($json, true);
    if (!is_array($data)) return $json;
    $publicPayload = [
        'jobPostings' => isset($data['jobPostings']) && is_array($data['jobPostings'])
            ? $data['jobPostings']
            : [],
        '__public' => true,
    ];
    return json_encode($publicPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
}

// ----------------------------- Tokens -----------------------------

function tokenSecret(): string {
    if (defined('TOKEN_SECRET') && TOKEN_SECRET !== '') {
        return (string)TOKEN_SECRET;
    }
    $envSecret = getenv('TOKEN_SECRET');
    if ($envSecret !== false && $envSecret !== '') {
        return $envSecret;
    }
    $secretFile = __DIR__ . '/.token_secret.php';
    if (is_file($secretFile)) {
        $loaded = @include $secretFile;
        if (is_string($loaded) && strlen($loaded) >= 32) {
            return $loaded;
        }
    }
    $generated = bin2hex(random_bytes(32));
    if (@file_put_contents($secretFile, "<?php\nreturn " . var_export($generated, true) . ";\n", LOCK_EX) === false) {
        // Sin permiso de escritura: secreto estable derivado de las credenciales de BD (evita tokens que nunca validan)
        $seed = (defined('DB_NAME') ? DB_NAME : '') . '|' . (defined('DB_USER') ? DB_USER : '') . '|' . (defined('DB_PASS') ? DB_PASS : '');
        if ($seed !== '||') return hash_hmac('sha256', 'gastro-token-v1', $seed);
    }
    return $generated;
}

function b64u(string $s): string {
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function b64uDecode(string $s): string {
    return (string)base64_decode(strtr($s, '-_', '+/'));
}

function createToken(string $userId, string $name, string $roleId = 'role-admin'): array {
    $exp = time() + KH_TOKEN_TTL;
    $payload = b64u(json_encode(['uid' => $userId, 'name' => $name, 'roleId' => $roleId, 'exp' => $exp]));
    $sig = b64u(hash_hmac('sha256', $payload, tokenSecret(), true));
    return ['token' => $payload . '.' . $sig, 'expires' => $exp];
}

function requestToken(): string {
    if (!empty($_SERVER['HTTP_X_ERP_TOKEN'])) {
        return trim((string)$_SERVER['HTTP_X_ERP_TOKEN']);
    }
    if (!empty($_SERVER['REDIRECT_HTTP_X_ERP_TOKEN'])) {
        return trim((string)$_SERVER['REDIRECT_HTTP_X_ERP_TOKEN']);
    }
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $hk => $hv) {
                if (strtolower((string)$hk) === 'x-erp-token' && trim((string)$hv) !== '') {
                    return trim((string)$hv);
                }
            }
        }
    }
    return '';
}

/** Devuelve el payload del token si es válido; null si no. */
function verifyToken(string $token): ?array {
    if ($token === '' || strpos($token, '.') === false) return null;
    [$payload, $sig] = explode('.', $token, 2);
    $expected = b64u(hash_hmac('sha256', $payload, tokenSecret(), true));
    if (!hash_equals($expected, $sig)) return null;
    $data = json_decode(b64uDecode($payload), true);
    if (!is_array($data) || !isset($data['exp']) || $data['exp'] < time()) return null;
    return $data;
}

// ----------------------------- Saneamiento de pedidos -----------------------------

/** Elimina recursivamente imagenes base64 pesadas (data:...) de un valor decodificado. */
function stripHeavyDataUris($value) {
    if (is_string($value)) {
        return (strncmp($value, 'data:', 5) === 0 && strlen($value) > 300) ? '' : $value;
    }
    if (is_array($value)) {
        foreach ($value as $k => $v) {
            $value[$k] = stripHeavyDataUris($v);
        }
    }
    return $value;
}

/** Devuelve el JSON de pedidos sin base64 pesado (o el original si ya esta limpio / no es JSON). */
function sanitizeOrdersJson(string $json): string {
    if (strpos($json, 'data:') === false) return $json;
    $arr = json_decode($json, true);
    if (!is_array($arr)) return $json;
    return json_encode(stripHeavyDataUris($arr), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/** Devuelve mapa [clave => rev] para control optimista de versiones en el cliente. */
function kvGetAllRevs(PDO $pdo, array $keys): array {
    if (!$keys) return [];
    $in = implode(',', array_fill(0, count($keys), '?'));
    try {
        $st = $pdo->prepare("SELECT k, rev FROM kv_storage WHERE k IN ($in)");
        $st->execute(array_values($keys));
        $revs = [];
        foreach ($st->fetchAll() as $r) {
            $revs[(string)$r['k']] = (int)($r['rev'] ?? 1);
        }
        return $revs;
    } catch (Throwable $e) {
        return [];
    }
}

/** Huella barata (sin leer los valores) de las claves compartidas, para el latido de sincronizacion. */
function kvFingerprint(PDO $pdo, array $keys, bool $isAuth): string {
    if (!$keys) return md5('empty');
    $in = implode(',', array_fill(0, count($keys), '?'));
    try {
        $st = $pdo->prepare("SELECT k, rev, updated_at, LENGTH(v) AS n FROM kv_storage WHERE k IN ($in) ORDER BY k");
        $st->execute(array_values($keys));
        $acc = $isAuth ? 'a' : 'p';
        foreach ($st->fetchAll() as $r) {
            $acc .= '|' . $r['k'] . ':' . ($r['rev'] ?? 1) . ':' . $r['updated_at'] . ':' . $r['n'];
        }
        return md5($acc);
    } catch (Throwable $e) {
        $st = $pdo->prepare("SELECT k, updated_at, LENGTH(v) AS n FROM kv_storage WHERE k IN ($in) ORDER BY k");
        $st->execute(array_values($keys));
        $acc = $isAuth ? 'a' : 'p';
        foreach ($st->fetchAll() as $r) {
            $acc .= '|' . $r['k'] . ':' . $r['updated_at'] . ':' . $r['n'];
        }
        return md5($acc);
    }
}

/** Lee pedidos; si el valor guardado aun trae base64 pesado lo limpia y lo persiste (autocuracion unica). */
function kvGetOrdersClean(PDO $pdo): ?string {
    $v = kvGet($pdo, 'kh_orders_list');
    if ($v === null) return null;
    $clean = sanitizeOrdersJson($v);
    if (strlen($clean) < strlen($v)) {
        kvSet($pdo, 'kh_orders_list', $clean);
    }
    return $clean;
}
// ----------------------------- Imagenes base64 -> archivos -----------------------------

/** Convierte una imagen data:image/...;base64 en archivo /uploads/ y devuelve su URL (o el original si falla). */
function externalizeDataUri(string $value): string {
    if (strlen($value) < 2000 || strncmp($value, 'data:image/', 11) !== 0) return $value;
    if (!preg_match('#^data:image/(png|jpe?g|webp|gif);base64,(.+)$#s', $value, $m)) return $value;
    $ext = $m[1] === 'jpeg' ? 'jpg' : $m[1];
    $bin = base64_decode($m[2], true);
    if ($bin === false || $bin === '') return $value;
    $dir = dirname(__DIR__) . '/uploads';
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) return $value;
    $name = 'kh-' . sha1($bin) . '.' . $ext;
    $path = $dir . '/' . $name;
    if (!file_exists($path) && @file_put_contents($path, $bin) === false) return $value;
    return '/uploads/' . $name;
}

function externalizeDataUris($value) {
    if (is_string($value)) return externalizeDataUri($value);
    if (is_array($value)) {
        foreach ($value as $k => $v) $value[$k] = externalizeDataUris($v);
    }
    return $value;
}

function externalizeJson(string $json): string {
    if (strpos($json, 'data:image/') === false) return $json;
    $arr = json_decode($json, true);
    if (!is_array($arr)) return $json;
    return json_encode(externalizeDataUris($arr), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/** Lee una clave compartida; si trae imagenes base64 las externaliza y persiste (autocuracion unica). */
function kvGetClean(PDO $pdo, string $key): ?string {
    if ($key === 'kh_orders_list') return kvGetOrdersClean($pdo);
    $v = kvGet($pdo, $key);
    if ($v === null) return null;
    $clean = externalizeJson($v);
    if (strlen($clean) < strlen($v)) {
        kvSet($pdo, $key, $clean);
    }
    return $clean;
}