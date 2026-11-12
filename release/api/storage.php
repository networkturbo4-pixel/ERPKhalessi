<?php
/**
 *Almacenamiento compartido en tiempo real para producción (cPanel PHP + MySQL + Node SSE).
 *   GET    /api/storage            -> registro clave/valor completo
 *   GET    /api/storage/{key}      -> {data: "..."}
 *   POST   /api/storage/{key}      -> guarda y fusiona inteligentemente pedidos/CRM + difunde por SSE
 *   DELETE /api/storage/{key}      -> elimina (requiere token válido)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage-lib.php';

$pdo = getDbConnection();
kvInit($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$key = isset($_GET['key']) ? urldecode((string)$_GET['key']) : null;

$token = requestToken();
$admin = $token !== '' ? verifyToken($token) : null;

header('Cache-Control: no-store, no-cache, must-revalidate');

function readableFor(string $k, bool $isAuth): bool {
    if (!in_array($k, KH_SYNC_KEYS, true)) return false;
    return $isAuth || in_array($k, KH_PUBLIC_READ_KEYS, true);
}

function valueFor(string $k, string $v, bool $isAuth): string {
    if (!$isAuth && $k === KH_SETTINGS_KEY) return sanitizeSettingsForPublic($v);
    return $v;
}

/**
 * Si `kh_orders_list` aún no existe en `kv_storage`, hidrata automáticamente los pedidos
 * existentes desde las tablas relacionales `orders` + `order_items` para no perder ningún pedido previo.
 */
function ensureOrdersHydrated(PDO $pdo): ?string {
    $existing = kvGet($pdo, 'kh_orders_list');
    if ($existing !== null) {
        return $existing;
    }

    try {
        $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 150");
        $rows = $stmt ? $stmt->fetchAll() : [];
        if (empty($rows)) {
            return null;
        }

        $orderIds = array_column($rows, 'id');
        $itemsByOrder = [];
        if (!empty($orderIds)) {
            $inClause = implode(',', array_fill(0, count($orderIds), '?'));
            $itStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($inClause)");
            $itStmt->execute($orderIds);
            foreach ($itStmt->fetchAll() as $it) {
                $oid = (string)$it['order_id'];
                $qty = max(1, (int)($it['quantity'] ?? 1));
                $unit = (float)($it['unit_price'] ?? 0);
                $tot = isset($it['total_price']) ? (float)$it['total_price'] : ($unit * $qty);
                $itemsByOrder[$oid][] = [
                    'itemId'       => 'item-' . ($it['id'] ?? uniqid()),
                    'productId'    => (string)($it['product_id'] ?? 'prod-0'),
                    'productName'  => (string)($it['product_name'] ?? 'Producto'),
                    'productImage' => '',
                    'quantity'     => $qty,
                    'unitPrice'    => $unit,
                    'totalPrice'   => $tot,
                ];
            }
        }

        $hydrated = [];
        foreach ($rows as $r) {
            $oid = (string)$r['id'];
            $items = $itemsByOrder[$oid] ?? [];
            $total = (float)($r['total'] ?? 0);
            $itemsSum = 0.0;
            foreach ($items as $it) {
                $itemsSum += (float)$it['totalPrice'];
            }
            $createdIso = !empty($r['created_at']) ? gmdate('c', strtotime((string)$r['created_at'])) : gmdate('c');
            $updatedIso = !empty($r['updated_at']) ? gmdate('c', strtotime((string)$r['updated_at'])) : $createdIso;
            $channel = (string)($r['channel'] ?? 'online');
            $validChannels = ['online', 'pos-salon', 'pos-mostrador', 'pos-delivery'];
            if (!in_array($channel, $validChannels, true)) {
                $channel = 'online';
            }

            $hydrated[] = [
                'id'              => $oid,
                'orderNumber'     => (string)($r['order_number'] ?? '#KH-1001'),
                'tenantId'        => (string)($r['tenant_id'] ?? 'tenant-1'),
                'channel'         => $channel,
                'status'          => (string)($r['status'] ?? 'recibido'),
                'customerName'    => (string)($r['customer_name'] ?? 'Cliente'),
                'customerPhone'   => (string)($r['customer_phone'] ?? ''),
                'deliveryAddress' => (string)($r['delivery_address'] ?? ''),
                'paymentMethod'   => (string)($r['payment_method'] ?? 'efectivo'),
                'paymentStatus'   => (string)($r['payment_status'] ?? 'pendiente'),
                'items'           => $items,
                'subtotal'        => $itemsSum > 0 ? $itemsSum : $total,
                'deliveryFee'     => $itemsSum > 0 && $total > $itemsSum ? round($total - $itemsSum, 2) : 0,
                'discount'        => 0,
                'total'           => $total,
                'createdAt'       => $createdIso,
                'updatedAt'       => $updatedIso,
            ];
        }

        $json = json_encode($hydrated, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        kvSet($pdo, 'kh_orders_list', $json);
        return $json;
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * Notifica al motor Node.js SSE (Passenger `/realtime/broadcast` o puerto local 3000)
 * para actualización instantánea en Cocina KDS, POS, Delivery y Central de Pedidos.
 */
function broadcastRealtimeEvent(string $key, string $eventHint = 'generic'): void {
    $payload = json_encode([
        'action'    => 'set',
        'key'       => $key,
        'large'     => true,
        'eventHint' => $eventHint,
        'ts'        => round(microtime(true) * 1000),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $urls = [];
    if (!empty($_SERVER['HTTP_HOST'])) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $urls[] = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/realtime/broadcast';
    }
    $urls[] = 'http://127.0.0.1:3000/broadcast';

    foreach ($urls as $url) {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT_MS => 600,
                CURLOPT_TIMEOUT_MS        => 900,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
            ]);
            $resp = @curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($resp !== false && $code >= 200 && $code < 300) {
                break;
            }
        } else {
            $ctx = stream_context_create([
                'http' => [
                    'method'  => 'POST',
                    'header'  => "Content-Type: application/json\r\n",
                    'content' => $payload,
                    'timeout' => 0.7,
                ],
                'ssl' => [
                    'verify_peer'      => false,
                    'verify_peer_name' => false,
                ],
            ]);
            if (@file_get_contents($url, false, $ctx) !== false) {
                break;
            }
        }
    }
}

if ($method === 'GET') {
    ensureOrdersHydrated($pdo);

    if ($key === null) {
        $out = [];
        foreach (KH_SYNC_KEYS as $k) {
            if (!readableFor($k, $admin !== null)) continue;
            $v = kvGet($pdo, $k);
            if ($v !== null) $out[$k] = valueFor($k, $v, $admin !== null);
        }
        $body = json_encode($out === [] ? new stdClass() : $out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $hash = md5(($admin ? 'a' : 'p') . $body);
        header('X-Content-Hash: ' . $hash);
        if (isset($_GET['h']) && hash_equals($hash, (string)$_GET['h'])) {
            echo json_encode(['unchanged' => true]);
            exit();
        }
        echo $body;
        exit();
    }

    if (!validKey($key) || !readableFor($key, $admin !== null)) {
        sendResponse(['error' => 'Not found'], 404);
    }
    $v = kvGet($pdo, $key);
    if ($v === null) sendResponse(['error' => 'Not found'], 404);
    sendResponse(['data' => valueFor($key, $v, $admin !== null)]);
}

if ($method === 'POST' || $method === 'DELETE') {
    if (!validKey($key) || !in_array($key, KH_SYNC_KEYS, true)) {
        sendResponse(['success' => true, 'ignored' => true]);
    }

    // IMPORTANTE: Evaluar $isPublicWritable ANTES de rechazar tokens vencidos con 401.
    // Así un pedido de Tienda Virtual o actualización operativa JAMÁS falla con HTTP 401
    // aunque el navegador tenga un token antiguo en caché.
    $isPublicWritable = in_array($key, KH_PUBLIC_WRITE_KEYS, true);

    if (!$isPublicWritable && $token !== '' && $admin === null) {
        sendResponse(['error' => 'Token inválido o vencido'], 401);
    }

    if ($admin === null && !$isPublicWritable) {
        sendResponse(['success' => true, 'ignored' => true]);
    }

    if ($method === 'DELETE') {
        if ($admin === null) sendResponse(['error' => 'No autorizado'], 403);
        kvDelete($pdo, $key);
        broadcastRealtimeEvent($key, 'remove');
        sendResponse(['success' => true]);
    }

    $raw = file_get_contents('php://input');
    if (strlen($raw) > 16 * 1024 * 1024) {
        sendResponse(['error' => 'Payload demasiado grande'], 413);
    }
    $input = json_decode($raw, true);
    if (!is_array($input) || !isset($input['data'])) {
        sendResponse(['error' => 'Cuerpo JSON inválido'], 400);
    }
    $data = is_string($input['data']) ? $input['data'] : json_encode($input['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // Fusión inteligente por ID y marca de tiempo (`updatedAt`) para `kh_orders_list`
    if ($key === 'kh_orders_list') {
        $existingRaw = ensureOrdersHydrated($pdo);
        $existing = $existingRaw ? json_decode($existingRaw, true) : [];
        if (!is_array($existing)) $existing = [];

        $incoming = is_array($input['data']) ? $input['data'] : json_decode($data, true);
        if (is_array($incoming)) {
            $orderMap = [];
            foreach ($existing as $ord) {
                if (is_array($ord) && isset($ord['id'])) {
                    $orderMap[(string)$ord['id']] = $ord;
                }
            }

            $statusRank = [
                'recibido'  => 1,
                'en_cocina' => 2,
                'en_horno'  => 3,
                'listo'     => 4,
                'en_ruta'   => 5,
                'entregado' => 6,
                'cancelado' => 7,
            ];

            foreach ($incoming as $ord) {
                if (!is_array($ord) || !isset($ord['id'])) continue;
                $id = (string)$ord['id'];

                if (!isset($orderMap[$id])) {
                    $orderMap[$id] = $ord;
                    continue;
                }

                $prev = $orderMap[$id];
                $prevTs = strtotime((string)($prev['updatedAt'] ?? $prev['createdAt'] ?? '')) ?: 0;
                $nextTs = strtotime((string)($ord['updatedAt'] ?? $ord['createdAt'] ?? '')) ?: 0;

                if ($nextTs > $prevTs) {
                    $orderMap[$id] = $ord;
                } elseif ($nextTs === $prevTs) {
                    $prevRank = $statusRank[$prev['status'] ?? 'recibido'] ?? 1;
                    $nextRank = $statusRank[$ord['status'] ?? 'recibido'] ?? 1;
                    if ($nextRank >= $prevRank) {
                        $orderMap[$id] = $ord;
                    }
                }
            }

            $mergedOrders = array_values($orderMap);
            usort($mergedOrders, function ($a, $b) {
                return strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? ''));
            });
            // Conservar hasta 300 pedidos recientes en el bus vivo
            if (count($mergedOrders) > 300) {
                $mergedOrders = array_slice($mergedOrders, 0, 300);
            }
            $data = json_encode($mergedOrders, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    // Fusión inteligente por ID para cartera de clientes CRM (`kh_customers_crm_v1`) cuando entra desde Tienda
    if ($key === 'kh_customers_crm_v1' && $admin === null) {
        $existingRaw = kvGet($pdo, 'kh_customers_crm_v1');
        $existing = $existingRaw ? json_decode($existingRaw, true) : [];
        $incoming = is_array($input['data']) ? $input['data'] : json_decode($data, true);
        if (is_array($existing) && is_array($incoming)) {
            $custMap = [];
            foreach ($existing as $c) {
                if (is_array($c) && isset($c['id'])) $custMap[(string)$c['id']] = $c;
            }
            foreach ($incoming as $c) {
                if (!is_array($c) || !isset($c['id'])) continue;
                $cid = (string)$c['id'];
                if (!isset($custMap[$cid])) {
                    $custMap[$cid] = $c;
                } else {
                    $prevTs = strtotime((string)($custMap[$cid]['updatedAt'] ?? '')) ?: 0;
                    $nextTs = strtotime((string)($c['updatedAt'] ?? '')) ?: 0;
                    if ($nextTs >= $prevTs) {
                        $custMap[$cid] = $c;
                    }
                }
            }
            $data = json_encode(array_values($custMap), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    kvSet($pdo, $key, $data);

    broadcastRealtimeEvent($key, $key === 'kh_orders_list' ? 'new_order' : 'generic');

    if ($key === 'kh_orders_list') {
        sendResponse(['success' => true, 'data' => $data]);
    }
    sendResponse(['success' => true]);
}

sendResponse(['error' => 'Método no permitido'], 405);
