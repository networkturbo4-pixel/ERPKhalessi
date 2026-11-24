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

function isAllowedSyncKey(string $k, bool $isAuth): bool {
    if (in_array($k, KH_SYNC_KEYS, true)) return true;
    return $isAuth && (strncmp($k, 'kh_', 3) === 0 || strncmp($k, 'gastro_', 7) === 0);
}

function readableFor(string $k, bool $isAuth): bool {
    if (!isAllowedSyncKey($k, $isAuth)) return false;
    return $isAuth || in_array($k, KH_PUBLIC_READ_KEYS, true);
}

function valueFor(string $k, string $v, bool $isAuth): string {
    if (!$isAuth && $k === KH_SETTINGS_KEY) return sanitizeSettingsForPublic($v);
    if (!$isAuth && $k === 'gastro_erp_hr_v1') return sanitizeHrForPublic($v);
    return $v;
}

/**
 * Si `kh_orders_list` aún no existe en `kv_storage`, hidrata automáticamente los pedidos
 * existentes desde las tablas relacionales `orders` + `order_items` para no perder ningún pedido previo.
 */
function ensureOrdersHydrated(PDO $pdo): ?string {
    $st = $pdo->prepare("SELECT 1 FROM kv_storage WHERE k = 'kh_orders_list'");
    $st->execute();
    if ($st->fetchColumn() !== false) {
        return '__exists__';
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

    $realtimeSecret = defined('ERP_REALTIME_SECRET') ? (string)ERP_REALTIME_SECRET : (string)(getenv('ERP_REALTIME_SECRET') ?: '');
    $curlHeaders = ['Content-Type: application/json'];
    $streamHeaders = "Content-Type: application/json\r\n";
    if ($realtimeSecret !== '') {
        $curlHeaders[] = 'X-ERP-Token: ' . $realtimeSecret;
        $streamHeaders .= "X-ERP-Token: " . $realtimeSecret . "\r\n";
    }

    foreach ($urls as $url) {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => $curlHeaders,
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
                    'header'  => $streamHeaders,
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
        $readable = [];
        foreach (KH_SYNC_KEYS as $k) {
            if (readableFor($k, $admin !== null)) $readable[] = $k;
        }

        // Huella barata (solo metadatos): el latido de 4s no lee ni transmite MB de datos si nada cambió
        $hash = kvFingerprint($pdo, $readable, $admin !== null);
        header('X-Content-Hash: ' . $hash);
        if (isset($_GET['h']) && hash_equals($hash, (string)$_GET['h'])) {
            echo json_encode(['unchanged' => true]);
            exit();
        }

        $out = [];
        foreach ($readable as $k) {
            $v = kvGetClean($pdo, $k);
            if ($v === null) continue;
            $out[$k] = valueFor($k, $v, $admin !== null);
        }
        $revs = kvGetAllRevs($pdo, array_keys($out));
        if (!empty($revs)) {
            $out['__revs'] = $revs;
        }
        $body = json_encode($out === [] ? new stdClass() : $out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
    $v = kvGetClean($pdo, $key);
    if ($v === null) sendResponse(['data' => null, 'rev' => 0]);
    $meta = kvGetMeta($pdo, $key);
    sendResponse(['data' => valueFor($key, $v, $admin !== null), 'rev' => (int)($meta['rev'] ?? 1)]);
}

if ($method === 'POST' || $method === 'DELETE') {
    if (!validKey($key) || !isAllowedSyncKey($key, $admin !== null)) {
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
        sendResponse(['success' => true, 'ignored' => true, 'reason' => $token === '' ? 'no-token' : 'invalid-token']);
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
    $hasBaseRev = isset($input['baseRev']) && is_numeric($input['baseRev']);
    $baseRev = $hasBaseRev ? (int)$input['baseRev'] : null;
    $forceWrite = !empty($input['force']);

    // Control de concurrencia optimista: impedir que una caché local vieja pise datos más nuevos del servidor
    $serverMergedKeys = ['kh_orders_list', 'kh_whatsapp_conversations_v1'];
    $publicMergedKeys = [
        'kh_customers_crm_v1',
        'kh_store_customer_accounts_v1',
        'kh_public_reservations_v1',
        'gastro_erp_hr_v1',
    ];
    $isServerMerged = in_array($key, $serverMergedKeys, true)
        || ($admin === null && in_array($key, $publicMergedKeys, true));
    if ($hasBaseRev && !$forceWrite && !$isServerMerged) {
        $currentMeta = kvGetMeta($pdo, $key);
        if ($currentMeta !== null && $currentMeta['rev'] > $baseRev) {
            $currentValue = $currentMeta['v'];
            if ($currentValue !== $data) {
                sendResponse([
                    'success'  => false,
                    'conflict' => true,
                    'rev'      => $currentMeta['rev'],
                    'data'     => valueFor($key, $currentValue, $admin !== null),
                    'error'    => 'Versión local desactualizada; se conservan los datos vigentes del servidor.',
                ], 409);
            }
            sendResponse(['success' => true, 'rev' => $currentMeta['rev'], 'unchanged' => true]);
        }
    }

    // Fusión inteligente por ID y marca de tiempo (`updatedAt`) para `kh_orders_list`
    if ($key === 'kh_orders_list') {
        $existingRaw = ensureOrdersHydrated($pdo);
        if ($existingRaw === '__exists__') $existingRaw = kvGet($pdo, 'kh_orders_list');
        $existing = $existingRaw ? json_decode($existingRaw, true) : [];
        if (!is_array($existing)) $existing = [];

        $incoming = is_array($input['data']) ? $input['data'] : json_decode($data, true);
        if (is_array($incoming)) {
            $orderMap = [];
            $usedOrderNumbers = [];
            $maxOrderNum = 1020;
            foreach ($existing as $ord) {
                if (is_array($ord) && isset($ord['id'])) {
                    $oid = (string)$ord['id'];
                    $orderMap[$oid] = $ord;
                    $numStr = (string)($ord['orderNumber'] ?? '');
                    if ($numStr !== '') {
                        $usedOrderNumbers[$numStr] = $oid;
                        $digits = (int)preg_replace('/\D+/', '', $numStr);
                        if ($digits > $maxOrderNum) $maxOrderNum = $digits;
                    }
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
                    $numStr = (string)($ord['orderNumber'] ?? '');
                    if ($numStr !== '' && isset($usedOrderNumbers[$numStr]) && $usedOrderNumbers[$numStr] !== $id) {
                        $maxOrderNum++;
                        $ord['orderNumber'] = '#KH-' . $maxOrderNum;
                    } else {
                        $digits = (int)preg_replace('/\D+/', '', $numStr);
                        if ($digits > $maxOrderNum) $maxOrderNum = $digits;
                    }
                    if (!empty($ord['orderNumber'])) {
                        $usedOrderNumbers[(string)$ord['orderNumber']] = $id;
                    }
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
            $data = json_encode(stripHeavyDataUris($mergedOrders), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    // Fusión inteligente por ID y mensajes para conversaciones omnicanal (`kh_whatsapp_conversations_v1`)
    if ($key === 'kh_whatsapp_conversations_v1') {
        $existingRaw = kvGet($pdo, 'kh_whatsapp_conversations_v1');
        $existing = $existingRaw ? json_decode($existingRaw, true) : [];
        $incoming = is_array($input['data']) ? $input['data'] : json_decode($data, true);
        if (is_array($existing) && is_array($incoming)) {
            $convMap = [];
            foreach ($existing as $conv) {
                if (!is_array($conv) || !isset($conv['id'])) continue;
                $convMap[(string)$conv['id']] = $conv;
            }
            foreach ($incoming as $conv) {
                if (!is_array($conv) || !isset($conv['id'])) continue;
                $cid = (string)$conv['id'];
                if (!isset($convMap[$cid])) {
                    $convMap[$cid] = $conv;
                    continue;
                }
                $prev = $convMap[$cid];
                $prevMsgs = isset($prev['messages']) && is_array($prev['messages']) ? $prev['messages'] : [];
                $nextMsgs = isset($conv['messages']) && is_array($conv['messages']) ? $conv['messages'] : [];

                $msgMap = [];
                foreach ($prevMsgs as $m) {
                    if (is_array($m) && isset($m['id'])) $msgMap[(string)$m['id']] = $m;
                }
                foreach ($nextMsgs as $m) {
                    if (!is_array($m) || !isset($m['id'])) continue;
                    $mid = (string)$m['id'];
                    if (!isset($msgMap[$mid])) {
                        $msgMap[$mid] = $m;
                    } else {
                        $oldM = $msgMap[$mid];
                        $preferNew = !empty($m['isDeleted']) && empty($oldM['isDeleted'])
                            || (!empty($m['editedAt']) && (string)($m['editedAt']) >= (string)($oldM['editedAt'] ?? ''))
                            || (!empty($m['reactions']) && count($m['reactions']) >= count($oldM['reactions'] ?? []));
                        if ($preferNew) {
                            $msgMap[$mid] = array_merge($oldM, $m);
                        }
                    }
                }
                $mergedMsgs = array_values($msgMap);
                usort($mergedMsgs, function ($a, $b) {
                    return strcmp((string)($a['timestamp'] ?? ''), (string)($b['timestamp'] ?? ''));
                });

                $prevLastTs = strtotime((string)($prev['lastMessageAt'] ?? '')) ?: 0;
                $nextLastTs = strtotime((string)($conv['lastMessageAt'] ?? '')) ?: 0;
                $baseConv = $nextLastTs >= $prevLastTs ? array_merge($prev, $conv) : array_merge($conv, $prev);
                $baseConv['messages'] = $mergedMsgs;
                if (!empty($mergedMsgs)) {
                    $lastMsg = end($mergedMsgs);
                    if (!empty($lastMsg['timestamp'])) {
                        $baseConv['lastMessageAt'] = $lastMsg['timestamp'];
                    }
                }
                $convMap[$cid] = $baseConv;
            }
            $mergedConvs = array_values($convMap);
            usort($mergedConvs, function ($a, $b) {
                return strcmp((string)($b['lastMessageAt'] ?? ''), (string)($a['lastMessageAt'] ?? ''));
            });
            if (count($mergedConvs) > 120) {
                $mergedConvs = array_slice($mergedConvs, 0, 120);
            }
            $data = json_encode($mergedConvs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    // Fusión inteligente por ID para cartera de clientes CRM (`kh_customers_crm_v1`) y cuentas de Tienda (`kh_store_customer_accounts_v1`) cuando entra desde Tienda
    if (($key === 'kh_customers_crm_v1' || $key === 'kh_store_customer_accounts_v1') && $admin === null) {
        $existingRaw = kvGet($pdo, $key);
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

    // Fusión segura para reservas públicas (`kh_public_reservations_v1`) cuando escribe un visitante anónimo:
    // Jamás permitir eliminar ni modificar reservas existentes de otros clientes; solo anexar nuevas por ID.
    if ($key === 'kh_public_reservations_v1' && $admin === null) {
        $existingResRaw = kvGet($pdo, 'kh_public_reservations_v1');
        $existingRes = $existingResRaw ? json_decode($existingResRaw, true) : [];
        if (!is_array($existingRes)) $existingRes = [];
        $incomingRes = is_array($input['data']) ? $input['data'] : json_decode($data, true);
        if (is_array($incomingRes)) {
            $resMap = [];
            foreach ($existingRes as $r) {
                if (is_array($r) && isset($r['id'])) $resMap[(string)$r['id']] = $r;
            }
            foreach ($incomingRes as $r) {
                if (is_array($r) && isset($r['id']) && !isset($resMap[(string)$r['id']])) {
                    $resMap[(string)$r['id']] = $r;
                }
            }
            $data = json_encode(array_values($resMap), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    // Protección de RRHH (`gastro_erp_hr_v1`) cuando escribe un visitante público (/trabaja):
    // Jamás permitir sobrescribir perfiles, asistencia, planilla, TOTP ni vacantes; solo anexar postulaciones nuevas.
    if ($key === 'gastro_erp_hr_v1' && $admin === null) {
        $existingHrRaw = kvGet($pdo, 'gastro_erp_hr_v1');
        $existingHr = $existingHrRaw ? json_decode($existingHrRaw, true) : [];
        if (!is_array($existingHr)) $existingHr = [];
        $incomingHr = is_array($input['data']) ? $input['data'] : json_decode($data, true);
        if (!is_array($incomingHr)) {
            sendResponse(['error' => 'Payload HR inválido'], 400);
        }
        $existingApps = isset($existingHr['jobApplications']) && is_array($existingHr['jobApplications'])
            ? $existingHr['jobApplications']
            : [];
        $incomingApps = isset($incomingHr['jobApplications']) && is_array($incomingHr['jobApplications'])
            ? $incomingHr['jobApplications']
            : [];
        $appMap = [];
        foreach ($existingApps as $app) {
            if (is_array($app) && isset($app['id'])) {
                $appMap[(string)$app['id']] = $app;
            }
        }
        foreach ($incomingApps as $app) {
            if (is_array($app) && isset($app['id']) && !isset($appMap[(string)$app['id']])) {
                $appMap[(string)$app['id']] = $app;
            }
        }
        $existingHr['jobApplications'] = array_values($appMap);
        unset($existingHr['__public']);
        $data = json_encode($existingHr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    // Protección de ajustes sensibles: jamás sobreescribir usuarios/credenciales existentes con un payload público o vacío
    if ($key === KH_SETTINGS_KEY) {
        $existingSettingsRaw = kvGet($pdo, KH_SETTINGS_KEY);
        $existingSettings = $existingSettingsRaw ? json_decode($existingSettingsRaw, true) : null;
        $incomingSettings = is_array($input['data']) ? $input['data'] : json_decode($data, true);
        if (is_array($existingSettings) && is_array($incomingSettings)) {
            $isPublicPayload = !empty($incomingSettings['__public']);
            unset($incomingSettings['__public']);
            $existingUsers = isset($existingSettings['users']) && is_array($existingSettings['users']) ? $existingSettings['users'] : [];
            $incomingUsers = isset($incomingSettings['users']) && is_array($incomingSettings['users']) ? $incomingSettings['users'] : [];
            if (count($existingUsers) > 0 && ($isPublicPayload || count($incomingUsers) === 0)) {
                $incomingSettings['users'] = $existingUsers;
            }
            if ($isPublicPayload || !isset($incomingSettings['driveConfig'])) {
                if (isset($existingSettings['driveConfig'])) {
                    $incomingSettings['driveConfig'] = $existingSettings['driveConfig'];
                }
            }
            if ($isPublicPayload || !isset($incomingSettings['geminiConfig'])) {
                if (isset($existingSettings['geminiConfig'])) {
                    $incomingSettings['geminiConfig'] = $existingSettings['geminiConfig'];
                }
            }
            // Preservar llaves secretas de Culqi y Factúralo si el payload es público o no las incluye
            if ($isPublicPayload && isset($existingSettings['companyInfo']) && is_array($existingSettings['companyInfo'])) {
                if (!isset($incomingSettings['companyInfo']) || !is_array($incomingSettings['companyInfo'])) {
                    $incomingSettings['companyInfo'] = $existingSettings['companyInfo'];
                } else {
                    foreach (['culqiConfig', 'facturaloConfig'] as $secCfg) {
                        if (isset($existingSettings['companyInfo'][$secCfg]) && is_array($existingSettings['companyInfo'][$secCfg])) {
                            $incomingSettings['companyInfo'][$secCfg] = array_merge(
                                $existingSettings['companyInfo'][$secCfg],
                                is_array($incomingSettings['companyInfo'][$secCfg] ?? null) ? $incomingSettings['companyInfo'][$secCfg] : []
                            );
                        }
                    }
                }
            }
            $data = json_encode($incomingSettings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    $data = ($key === 'kh_orders_list') ? sanitizeOrdersJson($data) : externalizeJson($data);
    $newRev = kvSet($pdo, $key, $data);

    broadcastRealtimeEvent($key, $key === 'kh_orders_list' ? 'new_order' : 'generic');

    if ($isServerMerged && readableFor($key, $admin !== null)) {
        sendResponse(['success' => true, 'data' => valueFor($key, $data, $admin !== null), 'rev' => $newRev]);
    }
    sendResponse(['success' => true, 'rev' => $newRev]);
}

sendResponse(['error' => 'Método no permitido'], 405);
