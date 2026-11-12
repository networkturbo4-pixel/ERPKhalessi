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

// Claves que cualquier visitante de la tienda puede LEER (la de ajustes se entrega sin datos sensibles)
const KH_PUBLIC_READ_KEYS = [
    'khalessi_erp_settings_v3',
    'kh_store_builder_v2',
    'kh_catalog_products',
    'kh_product_categories_v1',
    'kh_erp_benefits_v1',
];

// Claves que clientes anónimos de la tienda pueden enviar/crear (ej: pedidos y registro CRM)
const KH_PUBLIC_WRITE_KEYS = [
    'kh_orders_list',
    'kh_customers_crm_v1',
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

function createToken(string $userId, string $name): array {
    $exp = time() + KH_TOKEN_TTL;
    $payload = b64u(json_encode(['uid' => $userId, 'name' => $name, 'exp' => $exp]));
    $sig = b64u(hash_hmac('sha256', $payload, tokenSecret(), true));
    return ['token' => $payload . '.' . $sig, 'expires' => $exp];
}

function requestToken(): string {
    return isset($_SERVER['HTTP_X_ERP_TOKEN']) ? trim((string)$_SERVER['HTTP_X_ERP_TOKEN']) : '';
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
