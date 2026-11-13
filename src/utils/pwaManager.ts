export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(available: boolean) => void>();
let swRegistration: ServiceWorkerRegistration | null = null;

function notifyInstallListeners() {
  const available = Boolean(deferredPrompt);
  installListeners.forEach(cb => cb(available));
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyInstallListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyInstallListeners();
  });

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch {
    return null;
  }
}

export function subscribePwaInstallAvailability(cb: (available: boolean) => void): () => void {
  installListeners.add(cb);
  cb(Boolean(deferredPrompt));
  return () => {
    installListeners.delete(cb);
  };
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const promptEvent = deferredPrompt;
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      deferredPrompt = null;
      notifyInstallListeners();
    }
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestOrderNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showOrderStatusNotification(params: {
  orderNumber: string;
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const tag = `khalessi-order-${params.orderNumber}`;
  const targetUrl = params.url || '/?view=orders';

  if (swRegistration?.active) {
    swRegistration.active.postMessage({
      type: 'SHOW_LOCAL_NOTIFICATION',
      title: params.title,
      body: params.body,
      tag,
      url: targetUrl,
    });
    return;
  }

  try {
    const reg = await navigator.serviceWorker?.getRegistration('/');
    if (reg) {
      await reg.showNotification(params.title, {
        body: params.body,
        icon: '/api/favicon.php',
        badge: '/favicon.svg',
        tag,
        data: { url: targetUrl },
      });
      return;
    }
  } catch {
    // Fallback to Notification constructor below
  }

  try {
    new Notification(params.title, {
      body: params.body,
      icon: '/api/favicon.php',
      tag,
    });
  } catch {
    // Ignore in environments disallowing Notification constructor
  }
}

function upsertMeta(attr: 'property' | 'name', key: string, content: string) {
  if (typeof document === 'undefined' || !content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function updateDocumentShareMeta(meta: {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}) {
  if (typeof document === 'undefined') return;
  document.title = meta.title;
  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('name', 'twitter:title', meta.title);
  if (meta.description) {
    upsertMeta('name', 'description', meta.description);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('name', 'twitter:description', meta.description);
  }
  if (meta.image) {
    upsertMeta('property', 'og:image', meta.image);
    upsertMeta('name', 'twitter:image', meta.image);
  }
  if (meta.url) {
    upsertMeta('property', 'og:url', meta.url);
  }
  upsertMeta('property', 'og:type', meta.type || 'website');
  upsertMeta('name', 'twitter:card', 'summary_large_image');
}

export async function shareStoreContent(params: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'copied' | 'whatsapp'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: params.title,
        text: params.text,
        url: params.url,
      });
      return 'shared';
    } catch {
      // User cancelled or Web Share failed -> fallback
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(`${params.title} — ${params.url}`);
      return 'copied';
    } catch {
      // Fallback to WhatsApp share URL
    }
  }

  if (typeof window !== 'undefined') {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${params.text} ${params.url}`)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  return 'whatsapp';
}
