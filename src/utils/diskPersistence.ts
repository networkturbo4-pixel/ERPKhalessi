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
]);

function isSharedKey(key: string): boolean {
  return (key.startsWith('kh') || key.startsWith('khalessi')) && !DEVICE_LOCAL_KEYS.has(key);
}

interface StorageSsePayload {
  action: 'set' | 'remove';
  key: string;
  value?: string;
  large?: boolean;
  senderId?: string;
  ts?: number;
}

export async function initDiskPersistence(): Promise<void> {
  if (typeof window === 'undefined') return;

  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  // In-memory mirror so large payloads (e.g. logos) never fail even if browser 5MB quota is reached,
  // and identical writes do not trigger redundant network POSTs or infinite echo loops.
  const memoryMirror = new Map<string, string>();
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k) {
        const v = originalGetItem(k);
        if (v !== null) memoryMirror.set(k, v);
      }
    }
  } catch {
    // Ignore restricted storage iteration
  }

  const applyRemoteUpdate = (key: string, nextValue: string | null, emitEvent: boolean) => {
    if (!isSharedKey(key)) return;

    if (nextValue === null) {
      if (!memoryMirror.has(key) && originalGetItem(key) === null) return;
      memoryMirror.delete(key);
      try {
        originalRemoveItem(key);
      } catch {
        // ignore
      }
      if (emitEvent) {
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: null }));
      }
      return;
    }

    const prevValue = memoryMirror.get(key) ?? originalGetItem(key);
    if (prevValue === nextValue) return;

    memoryMirror.set(key, nextValue);
    try {
      originalSetItem(key, nextValue);
    } catch {
      // Memory mirror still holds the full value for getItem()
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
  };

  // Track active and recent local writes per key so a concurrent GET /api/storage
  // (e.g. triggered by window 'focus' right when closing the OS file picker dialog)
  // never overwrites a freshly uploaded logo or product image with stale server data.
  const inFlightWrites = new Map<string, number>();
  const lastLocalWriteAt = new Map<string, number>();
  const failedSyncValues = new Map<string, { action: 'set'; value: string } | { action: 'remove' }>();
  const writeChains = new Map<string, Promise<void>>();

  const enqueueServerSync = (
    key: string,
    op: { action: 'set'; value: string } | { action: 'remove' }
  ) => {
    lastLocalWriteAt.set(key, Date.now());
    inFlightWrites.set(key, (inFlightWrites.get(key) || 0) + 1);

    const prevChain = writeChains.get(key) || Promise.resolve();
    const nextChain = prevChain
      .catch(() => {})
      .then(async () => {
        try {
          if (op.action === 'set') {
            const payloadBody = JSON.stringify({ data: op.value });
            // Per WHATWG Fetch spec, keepalive: true rejects any body > 64 KiB (e.g. base64 logos/images).
            // Only enable keepalive on small payloads (< 48 KB) so large images always persist to disk.
            const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-client-id': CLIENT_ID,
              },
              body: payloadBody,
              ...(payloadBody.length < 48_000 ? { keepalive: true } : {}),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (memoryMirror.get(key) === op.value) {
              failedSyncValues.delete(key);
            }
          } else {
            const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
              method: 'DELETE',
              headers: {
                'x-client-id': CLIENT_ID,
              },
              keepalive: true,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (!memoryMirror.has(key)) {
              failedSyncValues.delete(key);
            }
          }
        } catch {
          // Record unsynced state so reconcileFromServer pushes local state up instead of rolling it back
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
  };

  localStorage.getItem = (key: string): string | null => {
    if (memoryMirror.has(key)) {
      return memoryMirror.get(key) ?? null;
    }
    return originalGetItem(key);
  };

  // Intercept setItem to persist shared keys to disk & broadcast to all connected devices in real time
  localStorage.setItem = (key: string, value: string) => {
    const prev = memoryMirror.get(key);
    if (prev === value) return;

    memoryMirror.set(key, value);
    try {
      originalSetItem(key, value);
    } catch (err) {
      console.warn(
        `[Storage] localStorage quota exceeded for key "${key}". Persisting via memory mirror & disk storage...`,
        err
      );
    }

    if (isSharedKey(key)) {
      enqueueServerSync(key, { action: 'set', value });
    }
  };

  // Intercept removeItem to sync deletion across disk & devices
  localStorage.removeItem = (key: string) => {
    memoryMirror.delete(key);
    try {
      originalRemoveItem(key);
    } catch {
      // ignore
    }

    if (isSharedKey(key)) {
      enqueueServerSync(key, { action: 'remove' });
    }
  };

  const reconcileFromServer = async (emitEvents: boolean) => {
    // Flush any previously failed local writes before reading from server
    if (failedSyncValues.size > 0) {
      for (const [key, pendingOp] of Array.from(failedSyncValues.entries())) {
        if ((inFlightWrites.get(key) || 0) === 0) {
          enqueueServerSync(key, pendingOp);
        }
      }
    }

    const fetchStartedAt = Date.now();
    try {
      const res = await fetch('/api/storage', { cache: 'no-store' });
      if (!res.ok) return;
      const records: Record<string, string> = await res.json();
      for (const [key, value] of Object.entries(records)) {
        if (typeof value !== 'string' || !isSharedKey(key)) continue;

        // Never overwrite a key that has an active write, a queued retry, or was just modified locally
        if ((inFlightWrites.get(key) || 0) > 0) continue;
        if (failedSyncValues.has(key)) continue;
        if ((lastLocalWriteAt.get(key) || 0) >= fetchStartedAt - 2500) continue;

        applyRemoteUpdate(key, value, emitEvents);
      }
    } catch {
      // Fallback smoothly to standard browser localStorage
    }
  };

  // 1. Pre-load persisted data from disk before React mounts
  await reconcileFromServer(false);

  // 2. Real-time Server-Sent Events (SSE) subscription across PC, Tablet, Kitchen KDS, Delivery & Customer Phones
  let eventSource: EventSource | null = null;
  let hasOpenedOnce = false;

  const connectRealtimeStream = () => {
    if (typeof EventSource === 'undefined') return;
    try {
      const es = new EventSource(`/api/storage/stream?clientId=${encodeURIComponent(CLIENT_ID)}`);
      eventSource = es;

      es.onerror = () => {
        // En cPanel/Apache estándar donde no hay daemon Node.js para SSE (/api/storage/stream),
        // cerrar limpiamente el socket para evitar que el navegador reintente en bucle con error 404
        if (es.readyState === EventSource.CLOSED || !hasOpenedOnce) {
          es.close();
          eventSource = null;
        }
      };

      es.onopen = () => {
        if (hasOpenedOnce) {
          // Catch up any missed updates after brief mobile sleep or Wi-Fi handoff
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
            applyRemoteUpdate(msg.key, null, true);
            return;
          }

          if (msg.action === 'set') {
            if (msg.large) {
              void fetch(`/api/storage/${encodeURIComponent(msg.key)}`, { cache: 'no-store' })
                .then(r => (r.ok ? r.json() : null))
                .then(body => {
                  if (body && typeof body.data === 'string') {
                    applyRemoteUpdate(msg.key, body.data, true);
                  }
                })
                .catch(() => {});
            } else if (typeof msg.value === 'string') {
              applyRemoteUpdate(msg.key, msg.value, true);
            }
          }
        } catch {
          // Ignore malformed SSE frames
        }
      };
    } catch {
      // Fallback interval handles environments without EventSource
    }
  };

  connectRealtimeStream();

  // 3. Reconcile immediately when mobile screen wakes up or tab regains focus,
  // plus lightweight fallback poll only if SSE stream is temporarily disconnected
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void reconcileFromServer(true);
    }
  });

  window.addEventListener('focus', () => {
    void reconcileFromServer(true);
  });

  window.setInterval(() => {
    if (!eventSource || eventSource.readyState !== EventSource.OPEN) {
      void reconcileFromServer(true);
    }
  }, 3500);
}
