import {
  deleteOfflineSnapshot,
  enqueueOfflineOperation,
  flushOfflineQueue,
  getAllOfflineSnapshots,
  initOfflineQueueListeners,
  saveOfflineSnapshot,
} from './offlineQueue';

const CLIENT_ID = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Keys that belong strictly to the current browser/device session and must never overwrite other devices
const DEVICE_LOCAL_KEYS = new Set<string>([
  'kh_store_cart',
  'kh_store_device_order_ids_v1',
  'kh_store_device_orders_v1',
  'kh_store_active_customer_id_v1',
  'kh_store_order_prefs_v1',
  'kh_active_main_module',
  'gastro_erp_auth_v1',
  'kh_game_spins_today',
  'gastro_erp_checkpoint_v3',
  'kh_brand_favicon_v1',
  'kh_brand_primary_v1',
  'kh_brand_theme_v1',
]);

// Claves que el servidor de producción (cPanel) sincroniza; el resto permanece en cada navegador
const SERVER_SYNC_KEYS = [
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
  'kh_reservation_settings_v1',
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

const SERVER_SYNC_SET = new Set<string>(SERVER_SYNC_KEYS);

// Claves operativas de escritura libre (pedidos, clientes CRM, cuentas de tienda, salón, reservas públicas, postulaciones y libro de reclamaciones)
const PUBLIC_WRITABLE_KEYS = new Set<string>([
  'kh_orders_list',
  'kh_customers_crm_v1',
  'kh_store_customer_accounts_v1',
  'kh_floor_tables_v1',
  'kh_public_reservations_v1',
  'gastro_erp_complaints_v1',
  'gastro_erp_hr_v1',
]);

// Claves legibles sin sesión ERP (espejo de KH_PUBLIC_READ_KEYS en storage-lib.php)
const PUBLIC_READ_KEYS = new Set<string>([
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
  'kh_public_reservations_v1',
  'kh_reservation_settings_v1',
  'gastro_erp_complaints_v1',
  'gastro_erp_hr_v1',
]);

const SETTINGS_KEY = 'gastro_erp_settings_v3';
const RBAC_KEY = 'gastro_erp_rbac_v3';
const TOKEN_KEY = 'erp_api_token';

const rejectedPins = new Set<string>();
let authInFlight: Promise<boolean> | null = null;
let authBackoffUntil = 0;

export function getServerToken(): string {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { token: string; expires: number };
    if (parsed.expires * 1000 < Date.now()) return '';
    return parsed.token;
  } catch {
    return '';
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getServerToken();
  return token ? { 'x-erp-token': token } : {};
}

export function clearServerToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

let onServerAuthenticated: (() => void) | null = null;

function isErpAdminSurface(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.startsWith('/admin')) return true;
  try {
    const mod = localStorage.getItem('kh_active_main_module');
    return Boolean(mod && mod !== 'storefront');
  } catch {
    return false;
  }
}

/** Se llama tras un inicio de sesión correcto para habilitar la escritura protegida en el servidor. */
export async function authenticateServer(pin: string, force = false): Promise<boolean> {
  const cleanPin = (pin || '').replace(/\D/g, '');
  if (![4, 6, 8].includes(cleanPin.length)) return false;
  if (Date.now() < authBackoffUntil) return false;
  if (!force && rejectedPins.has(cleanPin)) return false;
  if (!force && getServerToken()) return true;

  if (authInFlight) return authInFlight;

  authInFlight = (async () => {
    try {
      const res = await fetch('/api/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin }),
      });
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
        const waitSec = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
        authBackoffUntil = Date.now() + waitSec * 1000;
        return false;
      }
      if (!(res.headers.get('content-type') || '').includes('json')) {
        return false;
      }
      if (!res.ok) {
        if (res.status === 401) {
          rejectedPins.add(cleanPin);
        }
        return false;
      }
      const body = await res.json();
      if (!body.success || !body.token) {
        rejectedPins.add(cleanPin);
        return false;
      }
      authBackoffUntil = 0;
      rejectedPins.delete(cleanPin);
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: body.token, expires: body.expires }));
      onServerAuthenticated?.();
      return true;
    } catch {
      return false;
    } finally {
      authInFlight = null;
    }
  })();

  return authInFlight;
}

/**
 * Autentica contra /api/auth.php e hidrata sincrónicamente las claves protegidas del servidor
 * (incluyendo `users`, `rbac`, `hr`) para permitir login en cualquier dispositivo nuevo.
 */
export async function authenticateAndHydrateServer(pin: string): Promise<{
  ok: boolean;
  user?: { id: string; name: string; roleId: string };
}> {
  const cleanPin = (pin || '').replace(/\D/g, '');
  if (![4, 6, 8].includes(cleanPin.length)) return { ok: false };
  if (Date.now() < authBackoffUntil) return { ok: false };

  try {
    const res = await fetch('/api/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: cleanPin }),
    });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
      const waitSec = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
      authBackoffUntil = Date.now() + waitSec * 1000;
      return { ok: false };
    }
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) {
      if (res.status === 401) rejectedPins.add(cleanPin);
      return { ok: false };
    }
    const body = await res.json();
    if (!body?.success || !body?.token) {
      rejectedPins.add(cleanPin);
      return { ok: false };
    }
    authBackoffUntil = 0;
    rejectedPins.delete(cleanPin);
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: body.token, expires: body.expires }));

    // Hidratar inmediatamente claves protegidas desde /api/storage con el nuevo token
    const storageRes = await fetch('/api/storage', {
      cache: 'no-store',
      headers: { 'x-erp-token': body.token },
    });
    if (storageRes.ok && (storageRes.headers.get('content-type') || '').includes('json')) {
      const records: Record<string, unknown> = await storageRes.json();
      recordServerRevs(records.__revs);
      settingsHasUnhydratedSensitiveFields = false;
      for (const [key, rawValue] of Object.entries(records)) {
        if (typeof rawValue === 'string' && isSharedKey(key)) {
          applyRemoteUpdate(key, rawValue, true);
        }
      }
      initialReconcileCompleted = true;
    }

    return { ok: true, user: body.user };
  } catch {
    return { ok: false };
  }
}

function isSharedKey(key: string): boolean {
  return SERVER_SYNC_SET.has(key) && !DEVICE_LOCAL_KEYS.has(key);
}

interface StorageSsePayload {
  action: 'set' | 'remove' | 'connected';
  key?: string;
  value?: string;
  large?: boolean;
  eventHint?: string;
  senderId?: string;
  ts?: number;
}

let interceptorInstalled = false;
let persistenceStarted = false;
let initialReconcileCompleted = false;
let settingsHasUnhydratedSensitiveFields = false;

let originalGetItemFn: ((key: string) => string | null) | null = null;
let originalSetItemFn: ((key: string, value: string) => void) | null = null;
let originalRemoveItemFn: ((key: string) => void) | null = null;

const memoryMirror = new Map<string, string>();
const serverRevisions = new Map<string, number>();
const inFlightWrites = new Map<string, number>();
const lastLocalWriteAt = new Map<string, number>();
const failedSyncValues = new Map<string, { action: 'set'; value: string } | { action: 'remove' }>();
const writeChains = new Map<string, Promise<void>>();

export function isInitialReconcileCompleted(): boolean {
  return initialReconcileCompleted;
}

function recordServerRevs(rawRevs: unknown): void {
  if (!rawRevs || typeof rawRevs !== 'object') return;
  for (const [k, v] of Object.entries(rawRevs as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      serverRevisions.set(k, v);
    }
  }
}

function mergePublicSettingsValue(remoteJson: string): string {
  try {
    const remote = JSON.parse(remoteJson);
    if (!remote || !remote.__public) {
      settingsHasUnhydratedSensitiveFields = false;
      return remoteJson;
    }
    delete remote.__public;
    const local = JSON.parse(memoryMirror.get(SETTINGS_KEY) ?? originalGetItemFn?.(SETTINGS_KEY) ?? '{}');
    const localHasUsers = Array.isArray(local?.users) && local.users.length > 0 && !settingsHasUnhydratedSensitiveFields;
    if (!localHasUsers) {
      settingsHasUnhydratedSensitiveFields = true;
    }
    const merged = { ...local, ...remote };
    for (const k of ['activeTenantId', 'branchScope', 'activeTab']) {
      if (local[k] !== undefined) merged[k] = local[k];
    }
    return JSON.stringify(merged);
  } catch {
    return remoteJson;
  }
}

const offlineFlushOptions = {
  getServerRev: (key: string) => serverRevisions.get(key),
  onSynced: (key: string, newRev?: number) => {
    if (typeof newRev === 'number' && Number.isFinite(newRev)) {
      serverRevisions.set(key, newRev);
    }
  },
  onConflict: (key: string, serverData: string, serverRev: number) => {
    if (Number.isFinite(serverRev) && serverRev > 0) {
      serverRevisions.set(key, serverRev);
    }
    failedSyncValues.delete(key);
    const nextVal = key === SETTINGS_KEY ? mergePublicSettingsValue(serverData) : serverData;
    applyRemoteUpdate(key, nextVal, true);
  },
};

function cacheBrandSplashAssets(settingsJson: string): void {
  if (!originalSetItemFn) return;
  try {
    const parsed = JSON.parse(settingsJson);
    const cust = parsed?.customization;
    if (!cust || typeof cust !== 'object') return;
    const icon =
      cust.favicon?.trim() ||
      cust.storeHeaderLogo?.trim() ||
      cust.logoDark?.trim() ||
      cust.logoLight?.trim() ||
      '';
    if (icon) {
      try {
        originalSetItemFn('kh_brand_favicon_v1', icon);
      } catch {
        // ignore quota
      }
    }
    if (typeof cust.primaryColor === 'string' && cust.primaryColor.trim()) {
      try {
        originalSetItemFn('kh_brand_primary_v1', cust.primaryColor.trim());
      } catch {
        // ignore
      }
    }
    if (typeof cust.themePreference === 'string' && cust.themePreference.trim()) {
      try {
        originalSetItemFn('kh_brand_theme_v1', cust.themePreference.trim());
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore malformed json
  }
}

const ORDERS_KEY = 'kh_orders_list';
const IDB_PREFERRED_KEYS = new Set<string>([
  'kh_media_gallery_v1',
  'gastro_erp_checkpoint_v3',
]);

function writeLocalWithQuotaFallback(key: string, value: string, warnOnFallback: boolean): void {
  if (IDB_PREFERRED_KEYS.has(key)) {
    void saveOfflineSnapshot(key, value);
    try {
      originalRemoveItemFn?.(key);
    } catch {
      // ignore
    }
    return;
  }

  try {
    originalSetItemFn?.(key, value);
    void deleteOfflineSnapshot(key);
  } catch (err) {
    // Free up localStorage space from heavy/redundant keys (migrating them to IndexedDB first) and retry once
    let freed = false;
    for (const heavyKey of IDB_PREFERRED_KEYS) {
      const existing = memoryMirror.get(heavyKey) ?? originalGetItemFn?.(heavyKey);
      if (existing !== null && existing !== undefined) {
        void saveOfflineSnapshot(heavyKey, existing);
      }
      try {
        if (originalGetItemFn?.(heavyKey) !== null) {
          originalRemoveItemFn?.(heavyKey);
          freed = true;
        }
      } catch {
        // ignore
      }
    }

    if (freed) {
      try {
        originalSetItemFn?.(key, value);
        void deleteOfflineSnapshot(key);
        return;
      } catch {
        // Still over quota; fall through to IndexedDB + pruned fallback
      }
    }

    void saveOfflineSnapshot(key, value);

    if (key === ORDERS_KEY) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const pruned = parsed.slice(0, 100).map((o: any) => ({
            ...o,
            items: Array.isArray(o.items)
              ? o.items.map((i: any) => ({
                  ...i,
                  productImage:
                    typeof i?.productImage === 'string' && i.productImage.startsWith('data:')
                      ? ''
                      : i.productImage,
                }))
              : o.items,
          }));
          originalSetItemFn?.(key, JSON.stringify(pruned));
        }
      } catch {
        // memoryMirror, IndexedDB y MySQL conservan todos los pedidos
      }
    } else if (warnOnFallback) {
      console.info(
        `[Storage] localStorage quota reached for "${key}". Persisted via memory mirror & IndexedDB.`,
        err
      );
    }
  }
}

/**
 * Elimina imágenes base64 pesadas (data:...) de cualquier campo del JSON de pedidos
 * (productImage, halfAndHalf.firstHalfImage/secondHalfImage, etc.) para que el bus compartido sea liviano.
 */
function stripHeavyDataUris(json: string): string {
  if (!json.includes('data:')) return json;
  try {
    const walk = (v: unknown): unknown => {
      if (typeof v === 'string') return v.startsWith('data:') && v.length > 300 ? '' : v;
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = walk(val);
        return out;
      }
      return v;
    };
    return JSON.stringify(walk(JSON.parse(json)));
  } catch {
    return json;
  }
}

function applyRemoteUpdate(key: string, nextValue: string | null, emitEvent: boolean): void {
  if (!isSharedKey(key) || !originalGetItemFn || !originalSetItemFn || !originalRemoveItemFn) return;
  if (key === ORDERS_KEY && nextValue !== null) nextValue = stripHeavyDataUris(nextValue);

  if (nextValue === null) {
    if (!memoryMirror.has(key) && originalGetItemFn(key) === null) return;
    memoryMirror.delete(key);
    try {
      originalRemoveItemFn(key);
    } catch {
      // ignore
    }
    if (emitEvent) {
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: null }));
    }
    return;
  }

  const prevValue = memoryMirror.get(key) ?? originalGetItemFn(key);
  if (prevValue === nextValue) return;

  memoryMirror.set(key, nextValue);
  if (key === SETTINGS_KEY) {
    cacheBrandSplashAssets(nextValue);
  }

  writeLocalWithQuotaFallback(key, nextValue, false);

  if (emitEvent) {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        oldValue: prevValue,
        newValue: nextValue,
      })
    );
  }
}

function resolveAuthenticatedUserPin(): string {
  if (!originalGetItemFn) return '';
  try {
    let activeUserId = '';
    let candidatePin = '';
    const rbacRaw = memoryMirror.get(RBAC_KEY) ?? originalGetItemFn(RBAC_KEY);
    if (rbacRaw) {
      const rbac = JSON.parse(rbacRaw);
      if (rbac?.currentUser?.id) activeUserId = String(rbac.currentUser.id);
      if (rbac?.currentUser?.pin) candidatePin = String(rbac.currentUser.pin);
    }

    const settingsRaw = memoryMirror.get(SETTINGS_KEY) ?? originalGetItemFn(SETTINGS_KEY);
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      const users = Array.isArray(settings?.users) ? settings.users : [];
      if (activeUserId) {
        const exactUser = users.find((u: any) => u?.id === activeUserId && u?.pin);
        if (exactUser?.pin) return String(exactUser.pin);
      }
      if (candidatePin && users.some((u: any) => u?.pin === candidatePin)) {
        return candidatePin;
      }
      const adminUser = users.find(
        (u: any) => (u?.roleId === 'role-admin' || u?.roleName?.toLowerCase()?.includes('admin')) && u?.pin
      );
      if (adminUser?.pin) return String(adminUser.pin);
    }
    return candidatePin;
  } catch {
    return '';
  }
}

function enqueueServerSync(
  key: string,
  op: { action: 'set'; value: string } | { action: 'remove' }
): void {
  if (!originalGetItemFn) return;
  lastLocalWriteAt.set(key, Date.now());
  inFlightWrites.set(key, (inFlightWrites.get(key) || 0) + 1);

  const prevChain = writeChains.get(key) || Promise.resolve();
  const nextChain = prevChain
    .catch(() => {})
    .then(async () => {
      try {
        const isPublicWritable = PUBLIC_WRITABLE_KEYS.has(key);

        // Solo intentar autenticación automática para claves administrativas cuando el operador está dentro del ERP
        if (
          !isPublicWritable &&
          !getServerToken() &&
          originalGetItemFn?.('gastro_erp_auth_v1') === 'authenticated' &&
          isErpAdminSurface()
        ) {
          const activePin = resolveAuthenticatedUserPin();
          if (activePin) {
            await authenticateServer(activePin);
          }
        }

        if (op.action === 'set') {
          const baseRev = serverRevisions.get(key);
          const payloadObj: Record<string, unknown> = { data: op.value };
          if (typeof baseRev === 'number') {
            payloadObj.baseRev = baseRev;
          }
          const payloadBody = JSON.stringify(payloadObj);
          const doPost = (includeAuth: boolean) =>
            fetch(`/api/storage/${encodeURIComponent(key)}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-client-id': CLIENT_ID,
                ...(includeAuth ? getAuthHeaders() : {}),
              },
              body: payloadBody,
              ...(payloadBody.length < 48_000 ? { keepalive: true } : {}),
            });

          let res = await doPost(true);

          if (res.status === 401) {
            originalRemoveItemFn?.(TOKEN_KEY);
            memoryMirror.delete(TOKEN_KEY);
            if (isPublicWritable) {
              // Reintentar inmediatamente sin token vencido para que el pedido jamás se pierda
              res = await doPost(false);
            } else if (
              originalGetItemFn?.('gastro_erp_auth_v1') === 'authenticated' &&
              isErpAdminSurface()
            ) {
              const activePin = resolveAuthenticatedUserPin();
              if (activePin && (await authenticateServer(activePin, true))) {
                res = await doPost(true);
              } else {
                return;
              }
            } else {
              return;
            }
          }

          if (res.status === 409) {
            // El servidor tiene una revisión más nueva: conservar servidor y actualizar vista local
            const conflictJson = await res.json().catch(() => null);
            failedSyncValues.delete(key);
            if (conflictJson && typeof conflictJson.rev === 'number') {
              serverRevisions.set(key, conflictJson.rev);
            }
            if (conflictJson && typeof conflictJson.data === 'string') {
              const nextVal = key === SETTINGS_KEY ? mergePublicSettingsValue(conflictJson.data) : conflictJson.data;
              applyRemoteUpdate(key, nextVal, true);
            }
            console.warn(`[Storage] Conflict (409) on "${key}": preserved newer server data.`);
            return;
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const resJson = await res.json().catch(() => null);
          if (typeof resJson?.rev === 'number' && Number.isFinite(resJson.rev)) {
            serverRevisions.set(key, resJson.rev);
          }
          if (memoryMirror.get(key) === op.value) {
            failedSyncValues.delete(key);
          }
          if (resJson?.ignored) {
            // El servidor descartó la escritura (sin token válido). Reautenticar y reintentar una vez;
            // si sigue sin aceptarla, conservarla como pendiente para que se reenvíe después.
            const onAdminSurface =
              originalGetItemFn?.('gastro_erp_auth_v1') === 'authenticated' && isErpAdminSurface();
            if (!isPublicWritable && onAdminSurface) {
              const activePin = resolveAuthenticatedUserPin();
              if (activePin && (await authenticateServer(activePin, true))) {
                const retry = await doPost(true);
                const retryJson = retry.ok ? await retry.json().catch(() => null) : null;
                if (retry.ok && !retryJson?.ignored) {
                  if (typeof retryJson?.rev === 'number' && Number.isFinite(retryJson.rev)) {
                    serverRevisions.set(key, retryJson.rev);
                  }
                  if (memoryMirror.get(key) === op.value) failedSyncValues.delete(key);
                  return;
                }
              }
              failedSyncValues.set(key, op);
              void saveOfflineSnapshot(key, op.value);
            }
            console.warn(`[Storage] Server ignored write for key "${key}" (check auth or server allowlist). Motivo: ${resJson?.reason || 'desconocido'}`);
            return;
          }

          // Si el servidor fusionó pedidos concurrentes, actualizar espejo local al instante
          if (key === 'kh_orders_list' && resJson && typeof resJson.data === 'string') {
            applyRemoteUpdate('kh_orders_list', resJson.data, true);
          }
          // La difusión SSE ocurre desde storage.php tras confirmar escritura en MySQL
        } else {
          const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
            method: 'DELETE',
            headers: {
              'x-client-id': CLIENT_ID,
              ...getAuthHeaders(),
            },
            keepalive: true,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          serverRevisions.delete(key);
          if (!memoryMirror.has(key)) {
            failedSyncValues.delete(key);
          }
        }
      } catch {
        failedSyncValues.set(key, op);
        if (op.action === 'set') {
          void saveOfflineSnapshot(key, op.value);
          void enqueueOfflineOperation({
            id: `kv:${key}`,
            type: 'storage_put',
            key,
            payload: op.value,
            baseRev: serverRevisions.get(key),
          });
        }
      } finally {
        const remaining = (inFlightWrites.get(key) || 1) - 1;
        if (remaining <= 0) {
          inFlightWrites.delete(key);
        } else {
          inFlightWrites.set(key, remaining);
        }
      }
    });

  writeChains.set(key, nextChain);
}

/**
 * Instala sincrónicamente el espejo en memoria e interceptor de `localStorage`
 * ANTES de montar React para que todas las lecturas/escrituras estén conectadas desde 0ms.
 */
export function installStorageInterceptor(): void {
  if (typeof window === 'undefined' || interceptorInstalled) return;
  interceptorInstalled = true;

  originalGetItemFn = localStorage.getItem.bind(localStorage);
  originalSetItemFn = localStorage.setItem.bind(localStorage);
  originalRemoveItemFn = localStorage.removeItem.bind(localStorage);

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k) {
        const v = originalGetItemFn(k);
        if (v !== null) memoryMirror.set(k, v);
      }
    }
    const existingSettings = memoryMirror.get(SETTINGS_KEY);
    if (existingSettings) {
      cacheBrandSplashAssets(existingSettings);
    }
  } catch {
    // Ignore restricted storage iteration
  }

  localStorage.getItem = (key: string): string | null => {
    if (memoryMirror.has(key)) {
      return memoryMirror.get(key) ?? null;
    }
    return originalGetItemFn ? originalGetItemFn(key) : null;
  };

  localStorage.setItem = (key: string, value: string) => {
    if (key === ORDERS_KEY) value = stripHeavyDataUris(value);
    const prev = memoryMirror.get(key);
    if (prev === value) return;

    memoryMirror.set(key, value);
    if (key === SETTINGS_KEY) {
      cacheBrandSplashAssets(value);
    }

    writeLocalWithQuotaFallback(key, value, true);

    if (isSharedKey(key)) {
      // NUNCA sobreescribir el servidor antes de completar la hidratación inicial desde MySQL,
      // incluso si el navegador ya tenía datos viejos en localStorage (evita pérdida de datos al actualizar).
      if (!initialReconcileCompleted) {
        return;
      }
      const isAuthenticatedAdmin =
        originalGetItemFn?.('gastro_erp_auth_v1') === 'authenticated' && isErpAdminSurface();
      if (key === SETTINGS_KEY && settingsHasUnhydratedSensitiveFields && !isAuthenticatedAdmin) {
        return;
      }
      enqueueServerSync(key, { action: 'set', value });
    }
  };

  localStorage.removeItem = (key: string) => {
    memoryMirror.delete(key);
    void deleteOfflineSnapshot(key);
    try {
      originalRemoveItemFn?.(key);
    } catch {
      // ignore
    }

    if (isSharedKey(key)) {
      if (!initialReconcileCompleted) {
        return;
      }
      enqueueServerSync(key, { action: 'remove' });
    }
  };
}

export function syncPendingOfflineQueue(): Promise<number> {
  return flushOfflineQueue(getAuthHeaders, CLIENT_ID, offlineFlushOptions);
}

/** Limpia únicamente la caché local del navegador sin enviar DELETE al servidor. */
export function clearLocalCacheKey(key: string): void {
  memoryMirror.delete(key);
  void deleteOfflineSnapshot(key);
  try {
    if (originalRemoveItemFn) {
      originalRemoveItemFn(key);
    } else if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

/**
 * Fuerza y espera la persistencia real de una clave compartida hacia el servidor MySQL.
 * Útil para botones explícitos "Guardar Cambios" (evita que F5 aborte el guardado o vuelva a datos de prueba).
 */
export async function forcePersistKeyToServer(
  key: string,
  value: string,
  pin?: string
): Promise<{ ok: boolean; syncedToServer: boolean; reason?: string }> {
  if (typeof window === 'undefined') {
    return { ok: false, syncedToServer: false, reason: 'no_window' };
  }

  installStorageInterceptor();

  if (key === ORDERS_KEY) value = stripHeavyDataUris(value);
  memoryMirror.set(key, value);
  if (key === SETTINGS_KEY) {
    settingsHasUnhydratedSensitiveFields = false;
    cacheBrandSplashAssets(value);
  }
  writeLocalWithQuotaFallback(key, value, true);

  if (!isSharedKey(key)) {
    return { ok: true, syncedToServer: true };
  }

  const isPublicWritable = PUBLIC_WRITABLE_KEYS.has(key);
  lastLocalWriteAt.set(key, Date.now());
  inFlightWrites.set(key, (inFlightWrites.get(key) || 0) + 1);

  let result: { ok: boolean; syncedToServer: boolean; reason?: string } = {
    ok: true,
    syncedToServer: false,
    reason: 'network_error',
  };

  const prevChain = writeChains.get(key) || Promise.resolve();
  const nextChain = prevChain
    .catch(() => {})
    .then(async () => {
      try {
        const cleanPin = (pin || resolveAuthenticatedUserPin() || '').trim();
        if (!isPublicWritable && !getServerToken() && cleanPin) {
          await authenticateServer(cleanPin);
        }

        const baseRev = serverRevisions.get(key);
        const payloadObj: Record<string, unknown> = { data: value, force: true };
        if (typeof baseRev === 'number') {
          payloadObj.baseRev = baseRev;
        }
        const payloadBody = JSON.stringify(payloadObj);
        const doPost = (includeAuth: boolean) =>
          fetch(`/api/storage/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-client-id': CLIENT_ID,
              ...(includeAuth ? getAuthHeaders() : {}),
            },
            body: payloadBody,
            ...(payloadBody.length < 48_000 ? { keepalive: true } : {}),
          });

        let res = await doPost(true);

        if (res.status === 401) {
          originalRemoveItemFn?.(TOKEN_KEY);
          memoryMirror.delete(TOKEN_KEY);
          if (isPublicWritable) {
            res = await doPost(false);
          } else if (cleanPin && (await authenticateServer(cleanPin, true))) {
            res = await doPost(true);
          } else {
            failedSyncValues.set(key, { action: 'set', value });
            void saveOfflineSnapshot(key, value);
            result = { ok: true, syncedToServer: false, reason: 'unauthorized' };
            return;
          }
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        let resJson = await res.json().catch(() => null);
        if (resJson?.ignored && !isPublicWritable && cleanPin) {
          if (await authenticateServer(cleanPin, true)) {
            const retry = await doPost(true);
            const retryJson = retry.ok ? await retry.json().catch(() => null) : null;
            if (retry.ok && !retryJson?.ignored) {
              resJson = retryJson;
            }
          }
        }

        if (resJson?.ignored) {
          failedSyncValues.set(key, { action: 'set', value });
          void saveOfflineSnapshot(key, value);
          result = {
            ok: true,
            syncedToServer: false,
            reason: String(resJson?.reason || 'server_ignored'),
          };
          return;
        }

        if (typeof resJson?.rev === 'number' && Number.isFinite(resJson.rev)) {
          serverRevisions.set(key, resJson.rev);
        }
        if (memoryMirror.get(key) === value) {
          failedSyncValues.delete(key);
        }
        lastLocalWriteAt.set(key, Date.now());
        result = { ok: true, syncedToServer: true };
      } catch (err) {
        failedSyncValues.set(key, { action: 'set', value });
        void saveOfflineSnapshot(key, value);
        void enqueueOfflineOperation({
          id: `kv:${key}`,
          type: 'storage_put',
          key,
          payload: value,
          baseRev: serverRevisions.get(key),
        });
        result = {
          ok: true,
          syncedToServer: false,
          reason: err instanceof Error ? err.message : 'network_error',
        };
      } finally {
        const remaining = (inFlightWrites.get(key) || 1) - 1;
        if (remaining <= 0) {
          inFlightWrites.delete(key);
        } else {
          inFlightWrites.set(key, remaining);
        }
      }
    });

  writeChains.set(key, nextChain);
  await nextChain;
  return result;
}

export async function initDiskPersistence(): Promise<void> {
  if (typeof window === 'undefined' || persistenceStarted) return;
  persistenceStarted = true;
  installStorageInterceptor();
  initOfflineQueueListeners(getAuthHeaders, CLIENT_ID, offlineFlushOptions);

  // Hydrate any overflow/IDB-preferred keys persisted in IndexedDB (solo lectura local, sin subir al servidor)
  try {
    const snapshots = await getAllOfflineSnapshots();
    for (const snap of snapshots) {
      if (!snap.key || typeof snap.value !== 'string') continue;
      if (!IDB_PREFERRED_KEYS.has(snap.key) && memoryMirror.has(snap.key)) continue;
      const prev = memoryMirror.get(snap.key) ?? null;
      if (prev !== snap.value) {
        memoryMirror.set(snap.key, snap.value);
        if (snap.key === SETTINGS_KEY) {
          cacheBrandSplashAssets(snap.value);
        }
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: snap.key,
            oldValue: prev,
            newValue: snap.value,
          })
        );
      }
    }
  } catch {
    // ignore IndexedDB hydration errors
  }

  let lastHash = '';

  const reconcileFromServer = async (emitEvents: boolean, forceKeys?: Set<string>) => {
    if (initialReconcileCompleted && failedSyncValues.size > 0) {
      for (const [key, pendingOp] of Array.from(failedSyncValues.entries())) {
        if (key === SETTINGS_KEY && settingsHasUnhydratedSensitiveFields) continue;
        if ((inFlightWrites.get(key) || 0) === 0) {
          enqueueServerSync(key, pendingOp);
        }
      }
    }

    const fetchStartedAt = Date.now();
    try {
      const url = lastHash ? `/api/storage?h=${encodeURIComponent(lastHash)}` : '/api/storage';
      const res = await fetch(url, { cache: 'no-store', headers: getAuthHeaders() });
      if (!res.ok) return;
      if (!(res.headers.get('content-type') || '').includes('json')) return;
      const records: Record<string, unknown> = await res.json();
      if (records.unchanged === true) return;
      lastHash = res.headers.get('x-content-hash') || '';
      recordServerRevs(records.__revs);

      for (const [key, rawValue] of Object.entries(records)) {
        if (typeof rawValue !== 'string' || !isSharedKey(key)) continue;
        const value = key === SETTINGS_KEY ? mergePublicSettingsValue(rawValue) : rawValue;

        if ((inFlightWrites.get(key) || 0) > 0) continue;
        if (failedSyncValues.has(key)) continue;
        const isForced = forceKeys?.has(key) ?? false;
        if (
          initialReconcileCompleted &&
          !isForced &&
          key !== 'kh_orders_list' &&
          (lastLocalWriteAt.get(key) || 0) >= fetchStartedAt - 2500
        ) {
          continue;
        }

        applyRemoteUpdate(key, value, emitEvents);
      }

      // Si ya había token al iniciar y una clave local aún no existe en el servidor, subirla automáticamente
      if (!initialReconcileCompleted && getServerToken() && isErpAdminSurface()) {
        for (const key of SERVER_SYNC_KEYS) {
          if (key === 'kh_orders_list') continue;
          if (key === SETTINGS_KEY && settingsHasUnhydratedSensitiveFields) continue;
          if (records[key] === undefined) {
            const local = memoryMirror.get(key) ?? originalGetItemFn?.(key);
            if (local !== null && local !== undefined) {
              enqueueServerSync(key, { action: 'set', value: local });
            }
          }
        }
      }
    } catch {
      // Fallback fluido a caché local
    } finally {
      initialReconcileCompleted = true;
    }
  };

  const fetchSingleKeyFromServer = async (key: string) => {
    if (!getServerToken() && !PUBLIC_READ_KEYS.has(key)) return;
    if ((inFlightWrites.get(key) || 0) > 0 || failedSyncValues.has(key)) return;
    if (key !== 'kh_orders_list' && (lastLocalWriteAt.get(key) || 0) >= Date.now() - 2500) return;
    lastHash = '';
    try {
      const res = await fetch(`/api/storage/${encodeURIComponent(key)}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        await reconcileFromServer(true);
        return;
      }
      const body = await res.json();
      if (typeof body?.rev === 'number' && Number.isFinite(body.rev)) {
        serverRevisions.set(key, body.rev);
      }
      if (body && typeof body.data === 'string') {
        const nextVal = key === SETTINGS_KEY ? mergePublicSettingsValue(body.data) : body.data;
        applyRemoteUpdate(key, nextVal, true);
      }
    } catch {
      await reconcileFromServer(true);
    }
  };

  onServerAuthenticated = () => {
    lastHash = '';
    const now = Date.now();
    const forceKeys = new Set<string>();
    for (const k of [SETTINGS_KEY, RBAC_KEY, 'gastro_erp_hr_v1', 'gastro_erp_audit_v1']) {
      // Jamás sobrescribir claves que tienen escrituras locales recientes o pendientes por sincronizar
      const hasPendingLocal =
        (inFlightWrites.get(k) || 0) > 0 ||
        failedSyncValues.has(k) ||
        now - (lastLocalWriteAt.get(k) || 0) < 10_000;
      if (!hasPendingLocal) {
        forceKeys.add(k);
      }
    }
    void (async () => {
      try {
        // Primero reintentar subir cualquier escritura local que falló por falta de token
        if (failedSyncValues.size > 0) {
          for (const [key, pendingOp] of Array.from(failedSyncValues.entries())) {
            if ((inFlightWrites.get(key) || 0) === 0) {
              enqueueServerSync(key, pendingOp);
            }
          }
        }
        const res = await fetch('/api/storage', { cache: 'no-store', headers: getAuthHeaders() });
        const onServer: Record<string, string> =
          res.ok && (res.headers.get('content-type') || '').includes('json') ? await res.json() : {};
        if (onServer[SETTINGS_KEY] === undefined) {
          settingsHasUnhydratedSensitiveFields = false;
        }
        if (forceKeys.size > 0) {
          await reconcileFromServer(true, forceKeys);
        }
        for (const key of SERVER_SYNC_KEYS) {
          // Nunca sobreescribir pedidos con una caché local vieja al autenticar: el servidor los fusiona
          if (key === 'kh_orders_list') continue;
          const local = memoryMirror.get(key) ?? originalGetItemFn?.(key);
          if (local !== null && local !== undefined && onServer[key] === undefined) {
            enqueueServerSync(key, { action: 'set', value: local });
          }
        }
      } catch {
        // modo local
      }
    })();
  };

  // 1. Reconciliar inmediatamente con emitEvents = true para hidratar todos los módulos montados
  await reconcileFromServer(true);

  // 1b. Vaciar cola offline solo DESPUÉS de tener las revisiones vigentes del servidor (descarta mutaciones obsoletas)
  if (typeof navigator === 'undefined' || navigator.onLine) {
    void flushOfflineQueue(getAuthHeaders, CLIENT_ID, offlineFlushOptions);
  }

  // 2. Autenticar silenciosamente SOLO si estamos dentro del panel ERP y aún no hay token
  if (
    originalGetItemFn?.('gastro_erp_auth_v1') === 'authenticated' &&
    !getServerToken() &&
    isErpAdminSurface()
  ) {
    const pin = resolveAuthenticatedUserPin();
    if (pin) {
      void authenticateServer(pin);
    }
  }

  // 3. Suscripción SSE en tiempo real (/realtime/stream) para PC, Tablet, Cocina KDS, Delivery y Celulares
  let eventSource: EventSource | null = null;
  let hasOpenedOnce = false;

  const connectRealtimeStream = () => {
    if (typeof EventSource === 'undefined') return;
    try {
      const streamUrl = `/realtime/stream?clientId=${encodeURIComponent(CLIENT_ID)}`;
      const es = new EventSource(streamUrl);
      eventSource = es;

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED || !hasOpenedOnce) {
          es.close();
          eventSource = null;
        }
      };

      es.onopen = () => {
        if (hasOpenedOnce) {
          lastHash = '';
          void reconcileFromServer(true);
        }
        hasOpenedOnce = true;
      };

      es.onmessage = ev => {
        if (!ev.data) return;
        try {
          const rawParsed = JSON.parse(ev.data);
          if (rawParsed?.type === 'driver_location_update' && rawParsed?.ping?.driverId) {
            window.dispatchEvent(
              new CustomEvent('kh-sse-driver-location', { detail: rawParsed.ping })
            );
            return;
          }
          const msg: StorageSsePayload = rawParsed;
          if (!msg.key || !isSharedKey(msg.key) || msg.senderId === CLIENT_ID) return;

          if (msg.action === 'remove') {
            lastHash = '';
            applyRemoteUpdate(msg.key, null, true);
            return;
          }

          if (msg.action === 'set') {
            if (typeof msg.value === 'string') {
              lastHash = '';
              applyRemoteUpdate(msg.key, msg.value, true);
            } else {
              // Tanto si `large: true` viene explícito como si solo se envió `{ action: 'set', key }`
              void fetchSingleKeyFromServer(msg.key);
            }
          }
        } catch {
          // Ignorar tramas no JSON
        }
      };
    } catch {
      // El latido ligero ETag cubre cualquier entorno sin EventSource
    }
  };

  connectRealtimeStream();

  // 4. Reconciliación inmediata al volver a la pestaña + latido ETag ligero (18 bytes cuando no hay cambios)
  // cada 4s incluso con SSE abierto, garantizando 0% pérdida de sincronización entre todos los apartados
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void reconcileFromServer(true);
      if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
        connectRealtimeStream();
      }
    }
  });

  window.addEventListener('focus', () => {
    void reconcileFromServer(true);
  });

  window.setInterval(() => {
    void reconcileFromServer(true);
  }, 4000);
}
