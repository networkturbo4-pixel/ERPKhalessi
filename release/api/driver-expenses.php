<?php
/**
 * Endpoint de Gastos de Combustible y Operación de Motorizados
 * GET    /api/driver-expenses.php?tenant_id=...&driver_id=...&date=YYYY-MM-DD
 * POST   /api/driver-expenses.php  -> Registra un gasto (combustible/viatico)
 * DELETE /api/driver-expenses.php?id=...
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

const KH_FUEL_STORAGE_KEY = 'khalessi_delivery_fuel_v1';
const VALID_FUEL_SOURCES = ['caja_chica', 'efectivo_ruta'];

$pdo = getDbConnection();
kvInit($pdo);

$token = requestToken();
$admin = $token !== '' ? verifyToken($token) : null;
if ($admin === null) {
    sendResponse(['success' => false, 'error' => 'No autorizado'], 401);
}

/**
 * @return array<int, array<string, mixed>>
 */
function loadFuelEntries(PDO $pdo): array {
    $raw = kvGet($pdo, KH_FUEL_STORAGE_KEY);
    if ($raw === null || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * @param array<int, array<string, mixed>> $entries
 */
function saveFuelEntries(PDO $pdo, array $entries): void {
    kvSet($pdo, KH_FUEL_STORAGE_KEY, json_encode(array_values($entries), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $tenantId = isset($_GET['tenant_id']) ? trim((string)$_GET['tenant_id']) : '';
        $driverId = isset($_GET['driver_id']) ? trim((string)$_GET['driver_id']) : '';
        $date = isset($_GET['date']) ? trim((string)$_GET['date']) : '';

        $entries = loadFuelEntries($pdo);
        $filtered = array_values(array_filter($entries, function ($entry) use ($tenantId, $driverId, $date) {
            if (!is_array($entry)) return false;
            if ($tenantId !== '' && $tenantId !== 'consolidated' && ($entry['tenantId'] ?? '') !== $tenantId) {
                return false;
            }
            if ($driverId !== '' && ($entry['driverId'] ?? '') !== $driverId) {
                return false;
            }
            if ($date !== '') {
                $entryDate = substr((string)($entry['createdAt'] ?? ''), 0, 10);
                if ($entryDate !== $date) return false;
            }
            return true;
        }));

        $totalSpent = 0.0;
        $fromRouteCash = 0.0;
        $fromPettyCash = 0.0;
        foreach ($filtered as $item) {
            $amt = floatval($item['amount'] ?? 0);
            $totalSpent += $amt;
            if (($item['source'] ?? '') === 'efectivo_ruta') {
                $fromRouteCash += $amt;
            } else {
                $fromPettyCash += $amt;
            }
        }

        sendResponse([
            'success' => true,
            'data'    => $filtered,
            'summary' => [
                'count'          => count($filtered),
                'totalSpent'     => round($totalSpent, 2),
                'fromRouteCash'  => round($fromRouteCash, 2),
                'fromPettyCash'  => round($fromPettyCash, 2),
            ],
        ]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            sendResponse(['success' => false, 'error' => 'Cuerpo JSON inválido'], 400);
        }

        $amount = isset($input['amount']) ? round(floatval($input['amount']), 2) : 0.0;
        if ($amount <= 0) {
            sendResponse(['success' => false, 'error' => 'El monto de combustible debe ser mayor a 0'], 400);
        }

        $driverId = isset($input['driverId']) && is_string($input['driverId'])
            ? substr(trim($input['driverId']), 0, 64)
            : substr(trim((string)($admin['id'] ?? $admin['sub'] ?? $admin['username'] ?? '')), 0, 64);

        if ($driverId === '') {
            sendResponse(['success' => false, 'error' => 'Falta driverId del motorizado'], 400);
        }

        $driverName = isset($input['driverName']) && is_string($input['driverName'])
            ? substr(trim($input['driverName']), 0, 120)
            : substr(trim((string)($admin['name'] ?? $admin['username'] ?? 'Motorizado')), 0, 120);

        $tenantId = isset($input['tenantId']) && is_string($input['tenantId']) && trim($input['tenantId']) !== ''
            ? substr(trim($input['tenantId']), 0, 64)
            : 'tenant-1';

        $source = isset($input['source']) && is_string($input['source']) ? trim($input['source']) : 'caja_chica';
        if (!in_array($source, VALID_FUEL_SOURCES, true)) {
            $source = 'caja_chica';
        }

        $note = isset($input['note']) && is_string($input['note'])
            ? substr(trim($input['note']), 0, 240)
            : 'Recarga de combustible';

        $odometerKm = isset($input['odometerKm']) && is_numeric($input['odometerKm'])
            ? max(0, floatval($input['odometerKm']))
            : null;

        $entryId = isset($input['id']) && is_string($input['id']) && trim($input['id']) !== ''
            ? preg_replace('/[^A-Za-z0-9_\-]/', '', $input['id'])
            : ('fuel-' . bin2hex(random_bytes(6)));

        $createdAt = isset($input['createdAt']) && is_string($input['createdAt']) && trim($input['createdAt']) !== ''
            ? trim($input['createdAt'])
            : gmdate('c');

        $entry = [
            'id'         => substr($entryId, 0, 64),
            'driverId'   => $driverId,
            'driverName' => $driverName,
            'tenantId'   => $tenantId,
            'amount'     => $amount,
            'source'     => $source,
            'note'       => $note,
            'createdAt'  => $createdAt,
        ];
        if ($odometerKm !== null) {
            $entry['odometerKm'] = $odometerKm;
        }

        $entries = loadFuelEntries($pdo);
        array_unshift($entries, $entry);
        // Mantener historial acotado a los últimos 1000 registros
        if (count($entries) > 1000) {
            $entries = array_slice($entries, 0, 1000);
        }
        saveFuelEntries($pdo, $entries);

        sendResponse(['success' => true, 'data' => $entry]);
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? trim((string)$_GET['id']) : '';
        if ($id === '') {
            sendResponse(['success' => false, 'error' => 'Falta el parámetro id'], 400);
        }
        $entries = loadFuelEntries($pdo);
        $filtered = array_values(array_filter($entries, function ($e) use ($id) {
            return !is_array($e) || ($e['id'] ?? '') !== $id;
        }));
        saveFuelEntries($pdo, $filtered);
        sendResponse(['success' => true, 'deleted' => $id]);
        break;

    default:
        sendResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        break;
}
