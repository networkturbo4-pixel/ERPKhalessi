export interface OfflineQueueItem {
  id: string;
  type: 'storage_put' | 'order_create';
  key: string;
  payload: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
}

const DB_NAME = 'khalessi_offline_db_v1';
const DB_VERSION = 1;
const STORE_QUEUE = 'pending_sync_queue';
const STORE_SNAPSHOTS = 'kv_snapshots';

type StatusListener = (status: OfflineSyncStatus) => void;
const listeners = new Set<StatusListener>();

let currentStatus: OfflineSyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
};

let dbPromise: Promise<IDBDatabase> | null = null;
let initialized = false;
let flushInProgress = false;

function notifyListeners() {
  const snapshot = { ...currentStatus };
  listeners.forEach((cb) => cb(snapshot));
}

function openOfflineDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

async function refreshPendingCount(): Promise<number> {
  try {
    const db = await openOfflineDb();
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
    currentStatus.pendingCount = count;
    notifyListeners();
    return count;
  } catch {
    return currentStatus.pendingCount;
  }
}

export async function saveOfflineSnapshot(key: string, value: string): Promise<void> {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      tx.objectStore(STORE_SNAPSHOTS).put({
        key,
        value,
        updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Graceful no-op if IndexedDB unavailable
  }
}

export async function enqueueOfflineOperation(
  item: Omit<OfflineQueueItem, 'createdAt' | 'attempts'>
): Promise<void> {
  try {
    const db = await openOfflineDb();
    const record: OfflineQueueItem = {
      ...item,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      tx.objectStore(STORE_QUEUE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await refreshPendingCount();
  } catch {
    // Graceful no-op if IndexedDB unavailable
  }
}

export async function getPendingQueueItems(): Promise<OfflineQueueItem[]> {
  try {
    const db = await openOfflineDb();
    return await new Promise<OfflineQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const req = tx.objectStore(STORE_QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as OfflineQueueItem[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function removeQueueItem(id: string): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateQueueItemAttempt(item: OfflineQueueItem, errMsg: string): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).put({
      ...item,
      attempts: (item.attempts || 0) + 1,
      lastError: errMsg,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Flushes queued storage/order mutations from IndexedDB to /api/storage/{key}.
 * Returns the number of successfully synced items.
 */
export async function flushOfflineQueue(
  getAuthHeadersFn?: () => Record<string, string>,
  clientId?: string
): Promise<number> {
  if (flushInProgress) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    currentStatus.isOnline = false;
    notifyListeners();
    return 0;
  }

  flushInProgress = true;
  currentStatus.isSyncing = true;
  notifyListeners();

  let synced = 0;
  try {
    const items = await getPendingQueueItems();
    if (items.length === 0) {
      currentStatus.pendingCount = 0;
      return 0;
    }

    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const item of items) {
      if (item.type === 'order_create') {
        // Order create is backed by the kh_orders_list snapshot; remove audit entry once storage_put succeeds
        await removeQueueItem(item.id);
        synced++;
        continue;
      }

      try {
        const res = await fetch(`/api/storage/${encodeURIComponent(item.key)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(clientId ? { 'x-client-id': clientId } : {}),
            ...(getAuthHeadersFn ? getAuthHeadersFn() : {}),
          },
          body: JSON.stringify({ data: item.payload }),
        });

        if (!res.ok && res.status !== 401) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (res.status === 401) {
          // Retry once without auth header for public writable keys
          const retry = await fetch(`/api/storage/${encodeURIComponent(item.key)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(clientId ? { 'x-client-id': clientId } : {}),
            },
            body: JSON.stringify({ data: item.payload }),
          });
          if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
        }

        await removeQueueItem(item.id);
        synced++;
      } catch (err) {
        await updateQueueItemAttempt(
          item,
          err instanceof Error ? err.message : 'Network error'
        );
      }
    }

    if (synced > 0) {
      currentStatus.lastSyncedAt = new Date().toISOString();
    }
    await refreshPendingCount();
    return synced;
  } finally {
    flushInProgress = false;
    currentStatus.isSyncing = false;
    notifyListeners();
  }
}

export function initOfflineQueueListeners(
  getAuthHeadersFn?: () => Record<string, string>,
  clientId?: string
): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  currentStatus.isOnline = navigator.onLine;
  void refreshPendingCount().then((count) => {
    if (count > 0 && navigator.onLine) {
      void flushOfflineQueue(getAuthHeadersFn, clientId);
    }
  });

  window.addEventListener('online', () => {
    currentStatus.isOnline = true;
    notifyListeners();
    void flushOfflineQueue(getAuthHeadersFn, clientId);
  });

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false;
    notifyListeners();
  });
}

export function subscribeOfflineStatus(cb: StatusListener): () => void {
  listeners.add(cb);
  cb({ ...currentStatus });
  return () => {
    listeners.delete(cb);
  };
}

export function getOfflineStatusSnapshot(): OfflineSyncStatus {
  return { ...currentStatus };
}
