<?php
/**
 * Endpoint de Pedidos y Comandas (Órdenes)
 * GET /api/orders.php             -> Lista pedidos activos (requiere token ERP)
 * POST /api/orders.php            -> Crea un nuevo pedido (público solo para canal 'online' nuevo; resto requiere token)
 * PUT /api/orders.php?id={id}     -> Actualiza el estado (requiere token ERP)
 * DELETE /api/orders.php?id={id}  -> Elimina un pedido (requiere token ERP)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

$pdo = getDbConnection();
kvInit($pdo);
$method = $_SERVER['REQUEST_METHOD'];

$token = requestToken();
$admin = $token !== '' ? verifyToken($token) : null;

const VALID_ORDER_STATUSES = ['recibido', 'en_cocina', 'en_horno', 'listo', 'en_ruta', 'entregado', 'cancelado'];
const VALID_ORDER_CHANNELS = ['online', 'pos-salon', 'pos-mostrador', 'pos-delivery'];
const VALID_ORDER_TRANSITIONS = [
    'recibido'  => ['en_cocina', 'en_horno', 'listo', 'cancelado'],
    'en_cocina' => ['en_horno', 'listo', 'cancelado'],
    'en_horno'  => ['listo', 'cancelado'],
    'listo'     => ['en_ruta', 'entregado', 'cancelado'],
    'en_ruta'   => ['entregado', 'cancelado'],
    'entregado' => [],
    'cancelado' => [],
];

/**
 * Asegura que la tabla orders cuente con las columnas de despacho y motorizado
 * sin requerir migración manual en instalaciones existentes.
 */
function ensureOrderDeliveryColumns(PDO $pdo): void {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM orders LIKE 'assigned_driver_id'");
        if ($colCheck && $colCheck->fetch() === false) {
            $pdo->exec("
                ALTER TABLE orders
                ADD COLUMN assigned_driver_id VARCHAR(64) NULL AFTER notes,
                ADD COLUMN assigned_driver_name VARCHAR(120) NULL AFTER assigned_driver_id,
                ADD COLUMN dispatched_at DATETIME NULL AFTER assigned_driver_name,
                ADD COLUMN delivered_at DATETIME NULL AFTER dispatched_at
            ");
        }
    } catch (Throwable $e) {
        error_log('[GastroERP orders.php] ensureOrderDeliveryColumns: ' . $e->getMessage());
    }
}

switch ($method) {
    case 'GET':
        if ($admin === null) {
            sendResponse(['success' => false, 'error' => 'No autorizado'], 401);
        }

        $tenantId = isset($_GET['tenant_id']) ? trim((string)$_GET['tenant_id']) : null;
        $status = isset($_GET['status']) ? trim((string)$_GET['status']) : null;

        if ($status !== null && $status !== '' && !in_array($status, VALID_ORDER_STATUSES, true)) {
            sendResponse(['success' => false, 'error' => 'Estado inválido'], 400);
        }

        $sql = "SELECT * FROM orders WHERE 1=1";
        $params = [];

        if ($tenantId) {
            $sql .= " AND tenant_id = :tenant_id";
            $params[':tenant_id'] = $tenantId;
        }
        if ($status) {
            $sql .= " AND status = :status";
            $params[':status'] = $status;
        }

        $sql .= " ORDER BY created_at DESC LIMIT 100";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        if (!empty($orders)) {
            $orderIds = array_column($orders, 'id');
            $inClause = implode(',', array_fill(0, count($orderIds), '?'));
            $itemsStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($inClause)");
            $itemsStmt->execute($orderIds);
            $allItems = $itemsStmt->fetchAll();

            $itemsByOrder = [];
            foreach ($allItems as $item) {
                $itemsByOrder[$item['order_id']][] = $item;
            }

            foreach ($orders as &$ord) {
                $ord['items'] = $itemsByOrder[$ord['id']] ?? [];
            }
        }

        sendResponse(['success' => true, 'data' => $orders]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            sendResponse(['success' => false, 'error' => 'Cuerpo JSON inválido'], 400);
        }

        $rawId = isset($input['id']) && is_string($input['id']) ? preg_replace('/[^A-Za-z0-9_\-]/', '', $input['id']) : '';
        $orderId = $rawId !== '' ? substr($rawId, 0, 64) : ('ord-' . bin2hex(random_bytes(8)));
        $tenantId = isset($input['tenant_id']) && is_string($input['tenant_id']) ? substr(trim($input['tenant_id']), 0, 64) : 'tenant-1';
        $orderNumber = isset($input['order_number']) && is_string($input['order_number'])
            ? substr(trim($input['order_number']), 0, 32)
            : ('#' . random_int(1000, 9999));
        $channel = isset($input['channel']) && is_string($input['channel']) ? trim($input['channel']) : 'pos-salon';
        $customerName = isset($input['customer_name']) && is_string($input['customer_name']) ? substr(trim($input['customer_name']), 0, 120) : 'Cliente General';
        $total = isset($input['total']) ? max(0.0, floatval($input['total'])) : 0.00;
        $status = isset($input['status']) && is_string($input['status']) ? trim($input['status']) : 'recibido';

        if (!in_array($channel, VALID_ORDER_CHANNELS, true)) {
            sendResponse(['success' => false, 'error' => 'Canal de pedido inválido'], 400);
        }
        if (!in_array($status, VALID_ORDER_STATUSES, true)) {
            sendResponse(['success' => false, 'error' => 'Estado de pedido inválido'], 400);
        }

        // Sin token ERP solo se permite registrar pedidos nuevos del storefront público ('online' / 'recibido')
        if ($admin === null) {
            if ($channel !== 'online' || $status !== 'recibido') {
                sendResponse(['success' => false, 'error' => 'No autorizado'], 401);
            }
            $existsStmt = $pdo->prepare("SELECT 1 FROM orders WHERE id = :id LIMIT 1");
            $existsStmt->execute([':id' => $orderId]);
            if ($existsStmt->fetchColumn() !== false) {
                sendResponse(['success' => false, 'error' => 'No autorizado para modificar pedido existente'], 401);
            }
        }

        $pdo->beginTransaction();
        try {
            if ($admin !== null) {
                $stmt = $pdo->prepare("
                    INSERT INTO orders (id, tenant_id, order_number, channel, status, customer_name, total, created_at)
                    VALUES (:id, :tenant_id, :order_number, :channel, :status, :customer_name, :total, NOW())
                    ON DUPLICATE KEY UPDATE status = VALUES(status), total = VALUES(total), updated_at = NOW()
                ");
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO orders (id, tenant_id, order_number, channel, status, customer_name, total, created_at)
                    VALUES (:id, :tenant_id, :order_number, :channel, :status, :customer_name, :total, NOW())
                ");
            }
            $stmt->execute([
                ':id'            => $orderId,
                ':tenant_id'     => $tenantId,
                ':order_number'  => $orderNumber,
                ':channel'       => $channel,
                ':status'        => $status,
                ':customer_name' => $customerName,
                ':total'         => $total,
            ]);

            if (isset($input['items']) && is_array($input['items'])) {
                $itemStmt = $pdo->prepare("
                    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
                    VALUES (:order_id, :product_id, :product_name, :quantity, :unit_price, :total_price)
                ");
                foreach (array_slice($input['items'], 0, 200) as $it) {
                    if (!is_array($it)) continue;
                    $qty = max(1, intval($it['quantity'] ?? 1));
                    $unitPrice = max(0.0, floatval($it['price'] ?? 0));
                    $totalPrice = isset($it['totalPrice']) ? max(0.0, floatval($it['totalPrice'])) : ($unitPrice * $qty);
                    $itemStmt->execute([
                        ':order_id'     => $orderId,
                        ':product_id'   => substr((string)($it['id'] ?? 'prod-0'), 0, 64),
                        ':product_name' => substr((string)($it['name'] ?? 'Producto'), 0, 160),
                        ':quantity'     => $qty,
                        ':unit_price'   => $unitPrice,
                        ':total_price'  => $totalPrice,
                    ]);
                }
            }

            $pdo->commit();
            sendResponse(['success' => true, 'order_id' => $orderId, 'message' => 'Orden registrada']);
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log('[GastroERP orders.php] POST error: ' . $e->getMessage());
            sendResponse(['success' => false, 'error' => 'Error al registrar la orden'], 500);
        }
        break;

    case 'PUT':
        if ($admin === null) {
            sendResponse(['success' => false, 'error' => 'No autorizado'], 401);
        }

        $id = isset($_GET['id']) ? trim((string)$_GET['id']) : '';
        if ($id === '') {
            sendResponse(['success' => false, 'error' => 'Falta el parámetro id'], 400);
        }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            sendResponse(['success' => false, 'error' => 'Cuerpo JSON inválido'], 400);
        }
        $newStatus = isset($input['status']) ? trim((string)$input['status']) : '';

        if (!in_array($newStatus, VALID_ORDER_STATUSES, true)) {
            sendResponse(['success' => false, 'error' => 'Estado de pedido inválido o vacío'], 400);
        }

        ensureOrderDeliveryColumns($pdo);

        $driverId = '';
        if (isset($input['assignedDriverId']) && is_string($input['assignedDriverId'])) {
            $driverId = substr(trim($input['assignedDriverId']), 0, 64);
        } elseif (isset($admin['id']) || isset($admin['sub']) || isset($admin['username'])) {
            $driverId = substr(trim((string)($admin['id'] ?? $admin['sub'] ?? $admin['username'])), 0, 64);
        }

        $driverName = '';
        if (isset($input['assignedDriverName']) && is_string($input['assignedDriverName'])) {
            $driverName = substr(trim($input['assignedDriverName']), 0, 120);
        } elseif (isset($admin['name']) || isset($admin['username'])) {
            $driverName = substr(trim((string)($admin['name'] ?? $admin['username'])), 0, 120);
        }

        $pdo->beginTransaction();
        try {
            $lockStmt = $pdo->prepare("SELECT status, assigned_driver_id FROM orders WHERE id = :id FOR UPDATE");
            $lockStmt->execute([':id' => $id]);
            $currentRow = $lockStmt->fetch();

            if ($currentRow) {
                $currentStatus = (string)($currentRow['status'] ?? '');
                $currentDriver = trim((string)($currentRow['assigned_driver_id'] ?? ''));

                if ($currentStatus !== $newStatus) {
                    $allowedNext = VALID_ORDER_TRANSITIONS[$currentStatus] ?? [];
                    if (!in_array($newStatus, $allowedNext, true)) {
                        $pdo->rollBack();
                        sendResponse([
                            'success' => false,
                            'error'   => "Transición de estado inválida: '$currentStatus' → '$newStatus'",
                        ], 409);
                    }
                }

                if ($newStatus === 'en_ruta') {
                    if ($currentDriver !== '' && ($driverId === '' || $currentDriver !== $driverId)) {
                        $pdo->rollBack();
                        sendResponse([
                            'success'            => false,
                            'error'              => 'El pedido ya fue tomado por otro motorizado',
                            'assigned_driver_id' => $currentDriver,
                        ], 409);
                    }

                    $upd = $pdo->prepare("
                        UPDATE orders
                        SET status = :status,
                            assigned_driver_id = COALESCE(NULLIF(:driver_id, ''), assigned_driver_id),
                            assigned_driver_name = COALESCE(NULLIF(:driver_name, ''), assigned_driver_name),
                            dispatched_at = COALESCE(dispatched_at, NOW()),
                            updated_at = NOW()
                        WHERE id = :id
                          AND (assigned_driver_id IS NULL OR assigned_driver_id = '' OR assigned_driver_id = :driver_id_check)
                    ");
                    $upd->execute([
                        ':status'          => $newStatus,
                        ':driver_id'       => $driverId,
                        ':driver_name'     => $driverName,
                        ':id'              => $id,
                        ':driver_id_check' => $driverId,
                    ]);

                    if ($upd->rowCount() === 0) {
                        $pdo->rollBack();
                        sendResponse([
                            'success' => false,
                            'error'   => 'No se pudo asignar: el pedido ya fue tomado concurrentemente',
                        ], 409);
                    }
                } elseif ($newStatus === 'entregado') {
                    $upd = $pdo->prepare("
                        UPDATE orders
                        SET status = :status,
                            delivered_at = COALESCE(delivered_at, NOW()),
                            updated_at = NOW()
                        WHERE id = :id
                    ");
                    $upd->execute([':status' => $newStatus, ':id' => $id]);
                } else {
                    $upd = $pdo->prepare("UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id");
                    $upd->execute([':status' => $newStatus, ':id' => $id]);
                }
            }

            $pdo->commit();
            sendResponse([
                'success'  => true,
                'message'  => "Estado actualizado a $newStatus",
                'order_id' => $id,
                'status'   => $newStatus,
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('[GastroERP orders.php] PUT error: ' . $e->getMessage());
            sendResponse(['success' => false, 'error' => 'Error al actualizar el estado del pedido'], 500);
        }
        break;

    case 'DELETE':
        if ($admin === null) {
            sendResponse(['success' => false, 'error' => 'No autorizado'], 401);
        }

        $id = isset($_GET['id']) ? trim((string)$_GET['id']) : '';
        if ($id === '') {
            sendResponse(['success' => false, 'error' => 'Falta el parámetro id'], 400);
        }
        try {
            $pdo->prepare("DELETE FROM order_items WHERE order_id = :id")->execute([':id' => $id]);
            $pdo->prepare("DELETE FROM orders WHERE id = :id")->execute([':id' => $id]);
        } catch (Throwable $e) {
            // Ignorar si las tablas relacionales no contienen el registro
        }
        $existingRaw = kvGet($pdo, 'kh_orders_list');
        if ($existingRaw !== null) {
            $list = json_decode($existingRaw, true);
            if (is_array($list)) {
                $filtered = array_values(array_filter($list, function ($o) use ($id) {
                    return !is_array($o) || ($o['id'] ?? '') !== $id;
                }));
                kvSet($pdo, 'kh_orders_list', json_encode($filtered, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            }
        }
        sendResponse(['success' => true, 'deleted' => $id]);
        break;

    default:
        sendResponse(['success' => false, 'error' => 'Método no permitido'], 405);
        break;
}
