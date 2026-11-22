import { registerPlugin } from '@capacitor/core';
import { getConfiguredServerUrl, isNativeCapacitor } from './serverUrl';
import { getServerToken } from './diskPersistence';

interface InboxNativePluginInterface {
  startRealtimeService(options: {
    serverUrl: string;
    authToken: string;
    clientId: string;
  }): Promise<{ started: boolean }>;
  stopRealtimeService(): Promise<{ stopped: boolean }>;
  getPendingConversationId(): Promise<{ conversationId: string | null }>;
  startDriverLocationService(options: {
    serverUrl: string;
    authToken: string;
    driverId: string;
    driverName: string;
    tenantId: string;
    status: string;
    activeOrderId?: string;
  }): Promise<{ started: boolean }>;
  stopDriverLocationService(): Promise<{ stopped: boolean }>;
}

const InboxNative = registerPlugin<InboxNativePluginInterface>('InboxNative');

function getClientId(): string {
  try {
    const existing = window.localStorage.getItem('kh_realtime_client_id');
    if (existing) return existing;
    const generated = `android_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem('kh_realtime_client_id', generated);
    return generated;
  } catch {
    return 'android_inbox';
  }
}

export async function startNativeInboxRealtime(): Promise<void> {
  if (!isNativeCapacitor()) return;
  const serverUrl = getConfiguredServerUrl();
  const authToken = getServerToken();
  if (!serverUrl || !authToken) return;
  try {
    await InboxNative.startRealtimeService({
      serverUrl,
      authToken,
      clientId: getClientId(),
    });
  } catch {
    // ignore on web or unsupported environment
  }
}

export async function stopNativeInboxRealtime(): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    await InboxNative.stopRealtimeService();
  } catch {
    // ignore
  }
}

export async function consumePendingNativeConversation(): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    const res = await InboxNative.getPendingConversationId();
    if (res?.conversationId) {
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('kh-open-conversation', { detail: res.conversationId })
        );
      }, 250);
    }
  } catch {
    // ignore
  }
}

export async function startNativeDriverLocation(params: {
  driverId: string;
  driverName: string;
  tenantId: string;
  status: string;
  activeOrderId?: string;
}): Promise<void> {
  if (!isNativeCapacitor()) return;
  const serverUrl = getConfiguredServerUrl();
  const authToken = getServerToken() || '';
  try {
    await InboxNative.startDriverLocationService({
      serverUrl: serverUrl || '',
      authToken,
      driverId: params.driverId,
      driverName: params.driverName,
      tenantId: params.tenantId,
      status: params.status,
      activeOrderId: params.activeOrderId || '',
    });
  } catch {
    // ignore on web or unsupported environment
  }
}

export async function stopNativeDriverLocation(): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    await InboxNative.stopDriverLocationService();
  } catch {
    // ignore
  }
}
