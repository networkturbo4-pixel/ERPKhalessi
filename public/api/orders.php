<?php
/**
 * Endpoint de Pedidos y Comandas (Órdenes)
 * GET /api/orders.php             -> Lista pedidos activos (para KDS y POS)
 * POST /api/orders.php            -> Crea un nuevo pedido desde POS, Kiosco o Tienda
 * PUT /api/orders.php?id={id}     -> Actualiza el estado (ej: a 'horno', 'listo', 'despachado')
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';
$pdo = getDbConnection();
kvInit($pdo);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $tenantId = isset($_GET['tenant_id']) ? trim($_GET['tenant_id']) : null;
        $status = isset($_GET['status']) ? trim($_GET['status']) : null;

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

        // Opcional: Adjuntar items de cada orden
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
                $ord['items'] = isset($itemsByOrder[$ord['id']]) ? $itemsByOrder[$ord['id']] : [];
            }
        }

        sendResponse(['success' => true, 'data' => $orders]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            sendResponse(['success' => false, 'error' => 'Cuerpo JSON inválido'], 400);
        }

        $orderId = isset($input['id']) && !empty($input['id']) ? $input['id'] : 'ord-' . uniqid();
        $tenantId = isset($input['tenant_id']) ? $input['tenant_id'] : 'tenant-1';
        $orderNumber = isset($input['order_number']) ? $input['order_number'] : '#' . rand(100, 999);
        $channel = isset($input['channel']) ? $input['channel'] : 'pos-salon';
        $customerName = isset($input['customer_name']) ? trim($input['customer_name']) : 'Cliente General';
        $total = isset($input['total']) ? floatval($input['total']) : 0.00;
        $status = isset($input['status']) ? $input['status'] : 'recibido';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO orders (id, tenant_id, order_number, channel, status, customer_name, total, created_at)
                VALUES (:id, :tenant_id, :order_number, :channel, :status, :customer_name, :total, NOW())
                ON DUPLICATE KEY UPDATE status = VALUES(status), total = VALUES(total), updated_at = NOW()
            ");
            $stmt->execute([
                ':id'            => $orderId,
                ':tenant_id'     => $tenantId,
                ':order_number'  => $orderNumber,
                ':channel'       => $channel,
                ':status'        => $status,
                ':customer_name' => $customerName,
                ':total'         => $total,
            ]);

            // Guardar items de la comanda
            if (isset($input['items']) && is_array($input['items'])) {
                $itemStmt = $pdo->prepare("
                    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
                    VALUES (:order_id, :product_id, :product_name, :quantity, :unit_price, :total_price)
                ");
                foreach ($input['items'] as $it) {
                    $itemStmt->execute([
                        ':order_id'     => $orderId,
                        ':product_id'   => isset($it['id']) ? $it['id'] : 'prod-0',
                        ':product_name' => isset($it['name']) ? $it['name'] : 'Producto',
                        ':quantity'     => isset($it['quantity']) ? intval($it['quantity']) : 1,
                        ':unit_price'   => isset($it['price']) ? floatval($it['price']) : 0.00,
                        ':total_price'  => isset($it['totalPrice']) ? floatval($it['totalPrice']) : (floatval($it['price'] ?? 0) * intval($it['quantity'] ?? 1)),
                    ]);
                }
            }

            $pdo->commit();
            sendResponse(['success' => true, 'order_id' => $orderId, 'message' => 'Orden registrada']);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'PUT':
        $id = isset($_GET['id']) ? trim($_GET['id']) : null;
        if (!$id) {
            sendResponse(['success' => false, 'error' => 'Falta el parámetro id'], 400);
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $newStatus = isset($input['status']) ? trim($input['status']) : null;

        if ($newStatus) {
            $stmt = $pdo->prepare("UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id");
            $stmt->execute([':status' => $newStatus, ':id' => $id]);
            sendResponse(['success' => true, 'message' => "Estado actualizado a $newStatus"]);
        } else {
            sendResponse(['success' => false, 'error' => 'No hay campos para actualizar'], 400);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? trim($_GET['id']) : null;
        if (!$id) {
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
