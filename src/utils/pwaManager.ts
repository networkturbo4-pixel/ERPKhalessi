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
  icon?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const tag = `khalessi-order-${params.orderNumber}`;
  const targetUrl = params.url || '/?view=orders';
  let storedFavicon = '';
  try {
    storedFavicon = localStorage.getItem('kh_brand_favicon_v1') || '';
  } catch {
    storedFavicon = '';
  }
  const resolvedIcon = params.icon || storedFavicon || '/api/favicon.php';

  if (swRegistration?.active) {
    swRegistration.active.postMessage({
      type: 'SHOW_LOCAL_NOTIFICATION',
      title: params.title,
      body: params.body,
      tag,
      url: targetUrl,
      icon: resolvedIcon,
    });
    return;
  }

  try {
    const reg = await navigator.serviceWorker?.getRegistration('/');
    if (reg) {
      await reg.showNotification(params.title, {
        body: params.body,
        icon: resolvedIcon,
        badge: resolvedIcon,
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
      icon: resolvedIcon,
      tag,
    });
  } catch {
    // Ignore in environments disallowing Notification constructor
  }
}

import { StoreSeoConfig } from '../types/settings';

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

function upsertLink(rel: string, href: string) {
  if (typeof document === 'undefined' || !href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
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

export function applyStoreSeoAndOpenGraph(params: {
  seo: StoreSeoConfig;
  companyName: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  topProducts?: Array<{ name: string; price: number; category?: string }>;
}) {
  if (typeof document === 'undefined') return;
  const { seo, companyName, phone, address, logoUrl, topProducts = [] } = params;

  const title = seo.metaTitle?.trim() || companyName;
  const description = seo.metaDescription?.trim() || seo.aiBrandSummary?.trim() || '';
  const ogTitle = seo.ogTitle?.trim() || title;
  const ogDesc = seo.ogDescription?.trim() || description;
  const ogImage = seo.ogImage?.trim() || logoUrl || '';
  const canonical =
    seo.canonicalUrl?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  document.title = title;
  if (description) upsertMeta('name', 'description', description);
  if (seo.keywords?.trim()) upsertMeta('name', 'keywords', seo.keywords.trim());
  upsertMeta('name', 'robots', seo.robotsIndex ? 'index, follow' : 'noindex, nofollow');

  if (canonical) {
    upsertLink('canonical', canonical);
    upsertMeta('property', 'og:url', canonical);
  }
  if (seo.googleSiteVerification?.trim()) {
    upsertMeta('name', 'google-site-verification', seo.googleSiteVerification.trim());
  }
  if (seo.bingSiteVerification?.trim()) {
    upsertMeta('name', 'msvalidate.01', seo.bingSiteVerification.trim());
  }

  // Open Graph & Social Sharing
  upsertMeta('property', 'og:title', ogTitle);
  if (ogDesc) upsertMeta('property', 'og:description', ogDesc);
  if (ogImage) upsertMeta('property', 'og:image', ogImage);
  upsertMeta('property', 'og:type', seo.ogType || 'website');
  upsertMeta('property', 'og:site_name', seo.ogSiteName?.trim() || companyName);
  upsertMeta('property', 'og:locale', seo.locale || 'es_PE');

  // Twitter / X Cards
  upsertMeta('name', 'twitter:card', seo.twitterCard || 'summary_large_image');
  upsertMeta('name', 'twitter:title', ogTitle);
  if (ogDesc) upsertMeta('name', 'twitter:description', ogDesc);
  if (ogImage) upsertMeta('name', 'twitter:image', ogImage);
  if (seo.twitterHandle?.trim()) {
    upsertMeta('name', 'twitter:site', seo.twitterHandle.trim());
  }

  // Schema.org JSON-LD for Google & AI Search Engines (ChatGPT, Perplexity, Google AI)
  const existingLd = document.getElementById('khalessi-seo-jsonld');
  if (!seo.enableJsonLdSchema) {
    if (existingLd) existingLd.remove();
    return;
  }

  const ldPayload: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': seo.businessTypeSchema || 'Restaurant',
    name: seo.ogSiteName?.trim() || companyName,
    description: seo.aiBrandSummary?.trim() || description,
    url: canonical || undefined,
    image: ogImage || undefined,
    telephone: phone || undefined,
    servesCuisine: seo.cuisineType?.trim() || undefined,
    priceRange: seo.priceRange?.trim() || undefined,
    knowsAbout: seo.aiKeyTopics
      ? seo.aiKeyTopics
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : undefined,
    address: address
      ? {
          '@type': 'PostalAddress',
          streetAddress: address,
          addressCountry: 'PE',
        }
      : undefined,
  };

  if (topProducts.length > 0) {
    ldPayload.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: `Carta de ${companyName}`,
      itemListElement: topProducts.slice(0, 12).map((p, idx) => ({
        '@type': 'Offer',
        position: idx + 1,
        priceCurrency: 'PEN',
        price: Number(p.price || 0).toFixed(2),
        itemOffered: {
          '@type': 'MenuItem',
          name: p.name,
        },
      })),
    };
  }

  const scriptEl =
    (existingLd as HTMLScriptElement | null) || document.createElement('script');
  scriptEl.id = 'khalessi-seo-jsonld';
  scriptEl.type = 'application/ld+json';
  scriptEl.textContent = JSON.stringify(ldPayload, null, 2);
  if (!existingLd) {
    document.head.appendChild(scriptEl);
  }
}

export function buildRobotsTxtContent(seo: StoreSeoConfig): string {
  const baseUrl = (seo.canonicalUrl || 'https://pizzakhalessi.com').replace(/\/+$/, '');
  const lines = [
    '# Robots.txt generado por Khalessi Pizza ERP',
    'User-agent: *',
    seo.robotsIndex ? 'Allow: /' : 'Disallow: /',
    'Disallow: /admin',
    '',
    '# Buscadores de IA (ChatGPT, Perplexity, Claude, Google AI)',
    ...(seo.allowAiCrawlers
      ? [
          'User-agent: GPTBot',
          'Allow: /',
          'User-agent: OAI-SearchBot',
          'Allow: /',
          'User-agent: PerplexityBot',
          'Allow: /',
          'User-agent: ClaudeBot',
          'Allow: /',
          'User-agent: Google-Extended',
          'Allow: /',
        ]
      : [
          'User-agent: GPTBot',
          'Disallow: /',
          'User-agent: OAI-SearchBot',
          'Disallow: /',
          'User-agent: PerplexityBot',
          'Disallow: /',
          'User-agent: ClaudeBot',
          'Disallow: /',
          'User-agent: Google-Extended',
          'Disallow: /',
        ]),
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    `# LLMs context: ${baseUrl}/llms.txt`,
  ];
  return lines.join('\n');
}

export function buildLlmsTxtContent(
  seo: StoreSeoConfig,
  companyName: string,
  topProducts: Array<{ name: string; price: number; category?: string }> = []
): string {
  const baseUrl = (seo.canonicalUrl || 'https://pizzakhalessi.com').replace(/\/+$/, '');
  const lines = [
    `# ${seo.ogSiteName || companyName}`,
    '',
    `> ${seo.aiBrandSummary || seo.metaDescription}`,
    '',
    '## Información General',
    `- Sitio Web: ${baseUrl}`,
    `- Especialidad: ${seo.cuisineType || 'Pizzería Artesanal'}`,
    `- Rango de Precios: ${seo.priceRange || 'S/ 15 - S/ 70'}`,
    `- Temas Clave: ${seo.aiKeyTopics || seo.keywords}`,
    '',
    '## Secciones Principales',
    `- [Tienda Online](${baseUrl}/): Catálogo de pizzas, promociones y pedidos en línea.`,
    `- [Bolsa de Trabajo](${baseUrl}/trabaja): Vacantes disponibles y postulación directa.`,
  ];
  if (topProducts.length > 0) {
    lines.push('', '## Productos Destacados');
    topProducts.slice(0, 12).forEach(p => {
      lines.push(`- **${p.name}**: S/ ${Number(p.price || 0).toFixed(2)}`);
    });
  }
  return lines.join('\n');
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
