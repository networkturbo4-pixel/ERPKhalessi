const INBOX_SERVER_URL_KEY = 'kh_inbox_server_url_v1';

let bridgeInstalled = false;

export function isInboxAppMode(): boolean {
  if (import.meta.env.VITE_APP_MODE === 'inbox') return true;
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '/';
  const hash = window.location.hash || '';
  return path.startsWith('/inbox-app') || hash.startsWith('#inbox-app');
}

export function isNativeCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  return window.location.protocol === 'capacitor:';
}

export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getConfiguredServerUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(INBOX_SERVER_URL_KEY);
      if (saved && saved.trim()) {
        return normalizeServerUrl(saved);
      }
    }
  } catch {
    // ignore storage access issues
  }
  const envUrl = (import.meta.env.VITE_SERVER_URL as string | undefined) || '';
  return envUrl ? normalizeServerUrl(envUrl) : '';
}

export function setConfiguredServerUrl(rawUrl: string): string {
  const normalized = normalizeServerUrl(rawUrl);
  try {
    if (typeof window !== 'undefined') {
      if (normalized) {
        window.localStorage.setItem(INBOX_SERVER_URL_KEY, normalized);
      } else {
        window.localStorage.removeItem(INBOX_SERVER_URL_KEY);
      }
    }
  } catch {
    // ignore storage access issues
  }
  return normalized;
}

export function resolveApiUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!pathOrUrl.startsWith('/api/') && !pathOrUrl.startsWith('/realtime/')) {
    return pathOrUrl;
  }
  const base = getConfiguredServerUrl();
  if (!base) return pathOrUrl;
  return `${base}${pathOrUrl}`;
}

/**
 * Redirige llamadas relativas `/api/...` y `/realtime/...` hacia el servidor remoto
 * cuando la app corre empaquetada (APK Capacitor) o con una URL de servidor configurada.
 */
export function installServerApiBridge(): void {
  if (bridgeInstalled || typeof window === 'undefined') return;
  bridgeInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === 'string') {
      return originalFetch(resolveApiUrl(input), init);
    }
    if (input instanceof URL) {
      const asStr = input.pathname + input.search;
      if (input.origin === window.location.origin && (asStr.startsWith('/api/') || asStr.startsWith('/realtime/'))) {
        return originalFetch(resolveApiUrl(asStr), init);
      }
      return originalFetch(input, init);
    }
    if (input instanceof Request) {
      try {
        const parsed = new URL(input.url);
        const pathWithQuery = parsed.pathname + parsed.search;
        if (
          parsed.origin === window.location.origin &&
          (pathWithQuery.startsWith('/api/') || pathWithQuery.startsWith('/realtime/'))
        ) {
          const target = resolveApiUrl(pathWithQuery);
          if (target !== pathWithQuery) {
            return originalFetch(new Request(target, input), init);
          }
        }
      } catch {
        // fallback to original
      }
    }
    return originalFetch(input, init);
  };

  if (typeof window.EventSource !== 'undefined') {
    const OriginalEventSource = window.EventSource;
    const PatchedEventSource = function (
      this: EventSource,
      url: string | URL,
      eventSourceInitDict?: EventSourceInit
    ) {
      const resolved = typeof url === 'string' ? resolveApiUrl(url) : url;
      return new OriginalEventSource(resolved, eventSourceInitDict);
    } as unknown as typeof EventSource;
    PatchedEventSource.prototype = OriginalEventSource.prototype;
    Object.defineProperty(PatchedEventSource, 'CONNECTING', { value: OriginalEventSource.CONNECTING });
    Object.defineProperty(PatchedEventSource, 'OPEN', { value: OriginalEventSource.OPEN });
    Object.defineProperty(PatchedEventSource, 'CLOSED', { value: OriginalEventSource.CLOSED });
    window.EventSource = PatchedEventSource;
  }
}
