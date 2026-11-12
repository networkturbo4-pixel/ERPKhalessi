<?php
/**
 * Utilidades compartidas: almacenamiento clave/valor en MySQL + tokens de administrador.
 */

// Claves que se sincronizan con el servidor (el resto se queda solo en el navegador)
const KH_SYNC_KEYS = [
    'khalessi_erp_settings_v3',
    'khalessi_erp_rbac_v3',
    'khalessi_erp_hr_v1',
    'khalessi_erp_audit_v1',
    'khalessi_erp_complaints_v1',
    'kh_store_builder_v2',
    'kh_catalog_products',
    'kh_product_categories_v1',
    'kh_erp_benefits_v1',
    'kh_floor_tables_v1',
    'kh_orders_list',
    'kh_customers_crm_v1',
];

// Claves que terminales operativas y tienda pueden LEER (ajustes siempre sanitizado sin claves ni PINs)
const KH_PUBLIC_READ_KEYS = [
    'khalessi_erp_settings_v3',
    'kh_store_builder_v2',
    'kh_catalog_products',
    'kh_product_categories_v1',
    'kh_erp_benefits_v1',
    'kh_orders_list',
    'kh_customers_crm_v1',
    'kh_floor_tables_v1',
    'khalessi_erp_complaints_v1',
];

// Claves operativas que tienda, KDS, Delivery y Libro de Reclamaciones pueden actualizar sin bloqueo 401
const KH_PUBLIC_WRITE_KEYS = [
    'kh_orders_list',
    'kh_customers_crm_v1',
    'kh_floor_tables_v1',
    'khalessi_erp_complaints_v1',
];

const KH_SETTINGS_KEY = 'khalessi_erp_settings_v3';
const KH_RBAC_KEY = 'khalessi_erp_rbac_v3';
const KH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 días

function kvInit(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS kv_storage (
        k VARCHAR(190) NOT NULL,
        v LONGTEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (k)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function kvGet(PDO $pdo, string $key): ?string {
    $st = $pdo->prepare("SELECT v FROM kv_storage WHERE k = :k");
    $st->execute([':k' => $key]);
    $v = $st->fetchColumn();
    return $v === false ? null : (string)$v;
}

function kvSet(PDO $pdo, string $key, string $value): void {
    $st = $pdo->prepare("INSERT INTO kv_storage (k, v) VALUES (:k, :v) ON DUPLICATE KEY UPDATE v = VALUES(v)");
    $st->execute([':k' => $key, ':v' => $value]);
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

// ----------------------------- Tokens -----------------------------

function tokenSecret(): string {
    return hash('sha256', DB_PASS . '|' . DB_NAME . '|khalessi-erp-token');
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
