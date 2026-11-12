const CLIENT_ID = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Keys that belong strictly to the current browser/device session and must never overwrite other devices
const DEVICE_LOCAL_KEYS = new Set<string>([
  'kh_store_cart',
  'kh_store_device_order_ids_v1',
  'kh_store_active_customer_id_v1',
  'kh_store_order_prefs_v1',
  'kh_active_main_module',
  'khalessi_erp_auth_v1',
  'kh_game_spins_today',
  'khalessi_erp_checkpoint_v3',
  'kh_brand_favicon_v1',
  'kh_brand_primary_v1',
  'kh_brand_theme_v1',
]);

// Claves que el servidor de producción (cPanel) sincroniza; el resto permanece en cada navegador
const SERVER_SYNC_KEYS = [
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

// Claves operativas de escritura libre (pedidos, clientes CRM, salón y libro de reclamaciones)
const PUBLIC_WRITABLE_KEYS = new Set<string>([
  'kh_orders_list',
  'kh_customers_crm_v1',
  'kh_floor_tables_v1',
  'khalessi_erp_complaints_v1',
]);

const SETTINGS_KEY = 'khalessi_erp_settings_v3';
const RBAC_KEY = 'khalessi_erp_rbac_v3';
const TOKEN_KEY = 'erp_api_token';

const rejectedPins = new Set<string>();
let authInFlight: Promise<boolean> | null = null;

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
      if (!(res.headers.get('content-type') || '').includes('json')) {
        // En desarrollo local sin PHP
        localStorage.setItem(
          TOKEN_KEY,
          JSON.stringify({ token: 'dev-token', expires: Math.floor(Date.now() / 1000) + 86400 * 7 })
        );
        onServerAuthenticated?.();
        return true;
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

function isSharedKey(key: string): boolean {
  return (key.startsWith('kh') || key.startsWith('khalessi')) && !DEVICE_LOCAL_KEYS.has(key);
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

let originalGetItemFn: ((key: string) => string | null) | null = null;
let originalSetItemFn: ((key: string, value: string) => void) | null = null;
let originalRemoveItemFn: ((key: string) => void) | null = null;

const memoryMirror = new Map<string, string>();
const inFlightWrites = new Map<string, number>();
const lastLocalWriteAt = new Map<string, number>();
const failedSyncValues = new Map<string, { action: 'set'; value: string } | { action: 'remove' }>();
const writeChains = new Map<string, Promise<void>>();

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

function applyRemoteUpdate(key: string, nextValue: string | null, emitEvent: boolean): void {
  if (!isSharedKey(key) || !originalGetItemFn || !originalSetItemFn || !originalRemoveItemFn) return;

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

  try {
    originalSetItemFn(key, nextValue);
  } catch {
    if (key === 'kh_orders_list') {
      try {
        const parsed = JSON.parse(nextValue);
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
          originalSetItemFn(key, JSON.stringify(pruned));
        }
      } catch {
        // memoryMirror mantiene todos los pedidos en RAM
      }
    }
  }

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
          originalGetItemFn?.('khalessi_erp_auth_v1') === 'authenticated' &&
          isErpAdminSurface()
        ) {
          const activePin = resolveAuthenticatedUserPin();
          if (activePin) {
            await authenticateServer(activePin);
          }
        }

        if (op.action === 'set') {
          const payloadBody = JSON.stringify({ data: op.value });
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
            } else {
              return;
            }
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const resJson = await res.json().catch(() => null);
          if (memoryMirror.get(key) === op.value) {
            failedSyncValues.delete(key);
          }

          // Si el servidor fusionó pedidos concurrentes, actualizar espejo local al instante
          if (key === 'kh_orders_list' && resJson && typeof resJson.data === 'string') {
            applyRemoteUpdate('kh_orders_list', resJson.data, true);
          }

          // Difundir por Node.js SSE DESPUÉS de haber confirmado escritura en MySQL
          void fetch('/realtime/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'set',
              key,
              large: true,
              eventHint: key === 'kh_orders_list' ? 'new_order' : 'generic',
              senderId: CLIENT_ID,
              ts: Date.now(),
            }),
            keepalive: true,
          }).catch(() => {});
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
          if (!memoryMirror.has(key)) {
            failedSyncValues.delete(key);
          }
          void fetch('/realtime/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'remove',
              key,
              senderId: CLIENT_ID,
              ts: Date.now(),
            }),
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        failedSyncValues.set(key, op);
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
    const prev = memoryMirror.get(key);
    if (prev === value) return;

    memoryMirror.set(key, value);
    if (key === SETTINGS_KEY) {
      cacheBrandSplashAssets(value);
    }

    try {
      originalSetItemFn?.(key, value);
    } catch (err) {
      if (key === 'kh_orders_list') {
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
          // memoryMirror y MySQL conservan todos los pedidos
        }
      } else {
        console.warn(
          `[Storage] localStorage quota exceeded for key "${key}". Persisting via memory mirror & disk storage...`,
          err
        );
      }
    }

    if (isSharedKey(key)) {
      enqueueServerSync(key, { action: 'set', value });
    }
  };

  localStorage.removeItem = (key: string) => {
    memoryMirror.delete(key);
    try {
      originalRemoveItemFn?.(key);
    } catch {
      // ignore
    }

    if (isSharedKey(key)) {
      enqueueServerSync(key, { action: 'remove' });
    }
  };
}

export async function initDiskPersistence(): Promise<void> {
  if (typeof window === 'undefined' || persistenceStarted) return;
  persistenceStarted = true;
  installStorageInterceptor();

  let lastHash = '';

  const mergePublicSettings = (remoteJson: string): string => {
    try {
      const remote = JSON.parse(remoteJson);
      if (!remote || !remote.__public) return remoteJson;
      delete remote.__public;
      const local = JSON.parse(memoryMirror.get(SETTINGS_KEY) ?? originalGetItemFn?.(SETTINGS_KEY) ?? '{}');
      const merged = { ...local, ...remote };
      for (const k of ['activeTenantId', 'branchScope', 'activeTab']) {
        if (local[k] !== undefined) merged[k] = local[k];
      }
      return JSON.stringify(merged);
    } catch {
      return remoteJson;
    }
  };

  const reconcileFromServer = async (emitEvents: boolean) => {
    if (failedSyncValues.size > 0) {
      for (const [key, pendingOp] of Array.from(failedSyncValues.entries())) {
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
      const records: Record<string, string | boolean> = await res.json();
      if (records.unchanged === true) return;
      lastHash = res.headers.get('x-content-hash') || '';

      for (const [key, rawValue] of Object.entries(records)) {
        if (typeof rawValue !== 'string' || !isSharedKey(key)) continue;
        const value = key === SETTINGS_KEY ? mergePublicSettings(rawValue) : rawValue;

        if ((inFlightWrites.get(key) || 0) > 0) continue;
        if (failedSyncValues.has(key)) continue;
        if (key !== 'kh_orders_list' && (lastLocalWriteAt.get(key) || 0) >= fetchStartedAt - 2500) continue;

        applyRemoteUpdate(key, value, emitEvents);
      }
    } catch {
      // Fallback fluido a caché local
    }
  };

  const fetchSingleKeyFromServer = async (key: string) => {
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
      if (body && typeof body.data === 'string') {
        const nextVal = key === SETTINGS_KEY ? mergePublicSettings(body.data) : body.data;
        applyRemoteUpdate(key, nextVal, true);
      }
    } catch {
      await reconcileFromServer(true);
    }
  };

  onServerAuthenticated = () => {
    lastHash = '';
    void (async () => {
      try {
        const res = await fetch('/api/storage', { cache: 'no-store', headers: getAuthHeaders() });
        const onServer: Record<string, string> =
          res.ok && (res.headers.get('content-type') || '').includes('json') ? await res.json() : {};
        for (const key of SERVER_SYNC_KEYS) {
          // Nunca sobreescribir pedidos con una caché local vieja al autenticar: el servidor los fusiona
          if (key === 'kh_orders_list') continue;
          const local = memoryMirror.get(key) ?? originalGetItemFn?.(key);
          if (local !== null && local !== undefined && onServer[key] === undefined) {
            enqueueServerSync(key, { action: 'set', value: local });
          }
        }
        await reconcileFromServer(true);
      } catch {
        // modo local
      }
    })();
  };

  // 1. Reconciliar inmediatamente con emitEvents = true para hidratar todos los módulos montados
  await reconcileFromServer(true);

  // 2. Autenticar silenciosamente SOLO si estamos dentro del panel ERP y aún no hay token
  if (
    originalGetItemFn?.('khalessi_erp_auth_v1') === 'authenticated' &&
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
          const msg: StorageSsePayload = JSON.parse(ev.data);
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
