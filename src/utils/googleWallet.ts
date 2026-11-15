import { PointsProgramConfig } from '../types/benefits';

export interface GoogleWalletServerStatus {
  success: boolean;
  configured: boolean;
  serviceAccountEmail?: string | null;
  mode?: 'production' | 'unconfigured';
}

export interface CreateGoogleWalletLinkParams {
  config: PointsProgramConfig;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  points: number;
}

export interface CreateGoogleWalletLinkResult {
  success: boolean;
  saveUrl?: string;
  classId?: string;
  objectId?: string;
  code?: string;
  error?: string;
}

export async function fetchGoogleWalletStatus(): Promise<GoogleWalletServerStatus> {
  try {
    const res = await fetch('/api/google-wallet.php?action=status', { cache: 'no-store' });
    if (!res.ok) {
      return { success: false, configured: false, mode: 'unconfigured' };
    }
    return (await res.json()) as GoogleWalletServerStatus;
  } catch {
    return { success: false, configured: false, mode: 'unconfigured' };
  }
}

export interface GoogleWalletLocation {
  latitude: number;
  longitude: number;
}

export function getBranchLocationsFromStorage(): GoogleWalletLocation[] {
  try {
    const raw = localStorage.getItem('khalessi_erp_settings_v3');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      tenants?: Array<{ operations?: { latitude?: number; longitude?: number } }>;
    };
    const tenants = Array.isArray(parsed?.tenants) ? parsed.tenants : [];
    const coords: GoogleWalletLocation[] = [];
    for (const t of tenants) {
      const lat = Number(t?.operations?.latitude);
      const lng = Number(t?.operations?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        coords.push({ latitude: lat, longitude: lng });
      }
      if (coords.length >= 10) break;
    }
    return coords;
  } catch {
    return [];
  }
}

export async function createGoogleWalletSaveLink(
  params: CreateGoogleWalletLinkParams
): Promise<CreateGoogleWalletLinkResult> {
  const gw = params.config.googleWallet;
  if (!gw?.enabled || !gw.issuerId?.trim()) {
    return {
      success: false,
      error: 'Google Wallet no está habilitado o falta el Issuer ID en Configuración de Beneficios.',
    };
  }

  const locations = gw.enableLocationAlerts !== false ? getBranchLocationsFromStorage() : [];
  const normalizePublicHttpsUrl = (raw?: string): string => {
    const val = (raw || '').trim();
    if (!val) return '';
    if (/^https:\/\/.+/i.test(val)) return val;
    if (val.startsWith('/') && typeof window !== 'undefined' && /^https:\/\/.+/i.test(window.location.origin)) {
      return `${window.location.origin}${val}`;
    }
    return '';
  };

  try {
    const res = await fetch('/api/google-wallet.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-save-link',
        issuerId: gw.issuerId.trim(),
        classSuffix: gw.classSuffix?.trim() || 'khalessi_loyalty_v1',
        issuerName: gw.issuerName?.trim() || 'Khalessi Pizza',
        programName: params.config.cardTitle || 'Tarjeta de Puntos Khalessi',
        subtitle: params.config.cardSubtitle || '',
        logoUrl: normalizePublicHttpsUrl(gw.logoUrl),
        heroImageUrl: normalizePublicHttpsUrl(gw.heroImageUrl),
        hexBackgroundColor: gw.hexBackgroundColor || params.config.cardBgColor || '#18181b',
        barcodeType: gw.barcodeType || 'QR_CODE',
        locations,
        customerId: params.customerId,
        customerName: params.customerName,
        customerPhone: params.customerPhone || '',
        points: params.points,
        goal: params.config.stampsPerCardGoal || 8,
      }),
    });

    const data = (await res.json()) as CreateGoogleWalletLinkResult;
    return data;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'No se pudo conectar con el servidor de Google Wallet.',
    };
  }
}

export interface SendGoogleWalletPromoParams {
  issuerId: string;
  classSuffix: string;
  header: string;
  body: string;
  promoUrl?: string;
  messageType?: 'TEXT_AND_NOTIFY' | 'TEXT';
  targetCustomerId?: string;
}

export interface SendGoogleWalletPromoResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendGoogleWalletPromo(
  params: SendGoogleWalletPromoParams
): Promise<SendGoogleWalletPromoResult> {
  try {
    const res = await fetch('/api/google-wallet.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-promo',
        issuerId: params.issuerId.trim(),
        classSuffix: params.classSuffix.trim() || 'khalessi_loyalty_v1',
        header: params.header.trim(),
        body: params.body.trim(),
        promoUrl: params.promoUrl?.trim() || '',
        messageType: params.messageType || 'TEXT_AND_NOTIFY',
        targetCustomerId: params.targetCustomerId?.trim() || '',
      }),
    });
    return (await res.json()) as SendGoogleWalletPromoResult;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'No se pudo enviar la notificación a Google Wallet.',
    };
  }
}

export function syncGoogleWalletPointsInBackground(params: {
  customerId: string;
  points: number;
}): void {
  try {
    const rawBenefits = localStorage.getItem('kh_erp_benefits_v1');
    if (!rawBenefits) return;
    const parsed = JSON.parse(rawBenefits) as { pointsConfig?: PointsProgramConfig };
    const cfg = parsed?.pointsConfig;
    const gw = cfg?.googleWallet;
    if (!cfg?.enabled || cfg?.status === 'paused' || !gw?.enabled || !gw?.issuerId?.trim()) {
      return;
    }

    void fetch('/api/google-wallet.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync-points',
        issuerId: gw.issuerId.trim(),
        classSuffix: gw.classSuffix?.trim() || 'khalessi_loyalty_v1',
        customerId: params.customerId,
        points: params.points,
        goal: cfg.stampsPerCardGoal || 8,
      }),
    }).catch(() => {
      // Silencioso en segundo plano para no interrumpir la experiencia de compra
    });
  } catch {
    // ignore storage parse errors
  }
}
