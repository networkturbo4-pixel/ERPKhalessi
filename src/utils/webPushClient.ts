import { MarketingCampaign, MarketingPlatform, WebPushStatsResponse } from '../types/marketing';
import { getAuthHeaders } from './diskPersistence';

export function detectClientPlatform(): MarketingPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  return 'other';
}

export function isIosSafariWithoutStandalone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent || '');
  if (!isIos) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
  return !isStandalone;
}

export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToWebPush(params?: {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  tenantId?: string;
}): Promise<{ success: boolean; error?: string; totalSubscribers?: number }> {
  if (!isWebPushSupported()) {
    return {
      success: false,
      error: isIosSafariWithoutStandalone()
        ? 'En iPhone/iPad primero toca Compartir → "Agregar a pantalla de inicio" y abre la app desde allí.'
        : 'Tu navegador no soporta notificaciones Web Push.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permiso de notificaciones denegado por el usuario.' };
    }

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const keyRes = await fetch('/api/marketing-push.php?action=vapid-public-key', { cache: 'no-store' });
    const keyJson = (await keyRes.json()) as { success?: boolean; publicKey?: string; error?: string };
    if (!keyRes.ok || !keyJson.publicKey) {
      return { success: false, error: keyJson.error || 'No se pudo obtener la llave VAPID del servidor.' };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
      });
    }

    const saveRes = await fetch('/api/marketing-push.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe',
        subscription: sub.toJSON(),
        customerId: params?.customerId || '',
        customerName: params?.customerName || '',
        customerPhone: params?.customerPhone || '',
        platform: detectClientPlatform(),
        tenantId: params?.tenantId || '',
      }),
    });
    const saveJson = (await saveRes.json()) as { success?: boolean; totalSubscribers?: number; error?: string };
    if (!saveRes.ok || !saveJson.success) {
      return { success: false, error: saveJson.error || 'No se pudo guardar la suscripción.' };
    }

    return { success: true, totalSubscribers: saveJson.totalSubscribers };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al activar notificaciones Web Push.',
    };
  }
}

export async function fetchMarketingPushStats(): Promise<WebPushStatsResponse> {
  try {
    const res = await fetch('/api/marketing-push.php?action=stats', {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      return {
        success: false,
        totalSubscribers: 0,
        byPlatform: { android: 0, ios: 0, windows: 0, macos: 0, other: 0 },
        subscribers: [],
      };
    }
    return (await res.json()) as WebPushStatsResponse;
  } catch {
    return {
      success: false,
      totalSubscribers: 0,
      byPlatform: { android: 0, ios: 0, windows: 0, macos: 0, other: 0 },
      subscribers: [],
    };
  }
}

export async function fetchMarketingCampaigns(): Promise<MarketingCampaign[]> {
  try {
    const res = await fetch('/api/marketing-push.php?action=campaigns', {
      cache: 'no-store',
      headers: { ...getAuthHeaders() },
    });
    const data = (await res.json()) as { success?: boolean; campaigns?: MarketingCampaign[] };
    return Array.isArray(data?.campaigns) ? data.campaigns : [];
  } catch {
    return [];
  }
}

export async function sendMarketingWebPush(payload: {
  id?: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetUrl?: string;
  targetCustomerId?: string;
  targetCustomerPhone?: string;
}): Promise<{ success: boolean; sent?: number; failed?: number; total?: number; error?: string }> {
  try {
    const res = await fetch('/api/marketing-push.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ action: 'send-push', ...payload }),
    });
    return (await res.json()) as { success: boolean; sent?: number; failed?: number; total?: number; error?: string };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error de red' };
  }
}

export async function scheduleMarketingCampaign(
  campaign: MarketingCampaign & { issuerId?: string; classSuffix?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/marketing-push.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ action: 'schedule', campaign }),
    });
    return (await res.json()) as { success: boolean; error?: string };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error de red' };
  }
}

export async function updateMarketingCampaignStatus(
  action: 'cancel' | 'delete',
  id: string
): Promise<MarketingCampaign[]> {
  try {
    const res = await fetch('/api/marketing-push.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ action, id }),
    });
    const data = (await res.json()) as { campaigns?: MarketingCampaign[] };
    return Array.isArray(data?.campaigns) ? data.campaigns : [];
  } catch {
    return [];
  }
}

export async function runScheduledMarketingCampaignsNow(): Promise<{
  success: boolean;
  processed?: number;
  sent?: number;
}> {
  try {
    const res = await fetch('/api/marketing-push.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ action: 'run-scheduled' }),
    });
    return (await res.json()) as { success: boolean; processed?: number; sent?: number };
  } catch {
    return { success: false };
  }
}
