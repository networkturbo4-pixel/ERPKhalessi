import { CulqiGatewayConfig, DeliveryTariffConfig } from '../types/settings';

declare global {
  interface Window {
    Culqi?: {
      publicKey: string;
      settings: (cfg: {
        title: string;
        currency: 'PEN';
        amount: number;
        order?: string;
      }) => void;
      options: (opts: {
        lang?: 'auto' | 'es' | 'en';
        installments?: boolean;
        paymentMethods?: {
          tarjeta?: boolean;
          yape?: boolean;
          billetera?: boolean;
          bancaMovil?: boolean;
          agente?: boolean;
          cuotealo?: boolean;
        };
        style?: {
          logo?: string;
          bannerColor?: string;
          buttonBackground?: string;
          menuColor?: string;
          linksColor?: string;
          buttonText?: string;
          buttonTextColor?: string;
          priceColor?: string;
        };
      }) => void;
      open: () => void;
      close: () => void;
      token?: { id: string; email?: string };
      order?: { id: string; payment_code?: string };
      error?: { user_message?: string; merchant_message?: string };
    };
    culqi?: () => void;
  }
}

const CULQI_SCRIPT_SRC = 'https://checkout.culqi.com/js/v4';

export function ensureCulqiScriptLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Culqi) return Promise.resolve(true);

  return new Promise(resolve => {
    const existing = document.querySelector(`script[src="${CULQI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Culqi)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = CULQI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Culqi));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function resolveCulqiPublicKey(config?: CulqiGatewayConfig): string {
  if (!config) return '';
  if (config.environment === 'live') {
    return (config.livePublicKey || config.publicKey || '').trim();
  }
  return (config.testPublicKey || config.publicKey || '').trim();
}

export function isRealCulqiPublicKey(publicKey?: string): boolean {
  if (!publicKey) return false;
  const clean = publicKey.trim();
  return (
    /^pk_(test|live)_[A-Za-z0-9]{12,}$/.test(clean) &&
    !clean.includes('demo_khalessi')
  );
}

export interface CulqiCheckoutResult {
  ok: boolean;
  referenceId?: string;
  methodUsed?: 'tarjeta' | 'yape';
  errorMessage?: string;
}

export async function openOfficialCulqiCheckout(params: {
  config: CulqiGatewayConfig;
  storeTitle: string;
  amountSoles: number;
  accentColor: string;
  logoUrl?: string;
}): Promise<CulqiCheckoutResult> {
  const loaded = await ensureCulqiScriptLoaded();
  if (!loaded || !window.Culqi) {
    return {
      ok: false,
      errorMessage: 'No se pudo cargar el script oficial de Culqi Checkout v4. Verifica tu conexión.',
    };
  }

  const amountCents = Math.max(100, Math.round(params.amountSoles * 100));

  return new Promise(resolve => {
    window.culqi = async () => {
      const culqi = window.Culqi;
      if (!culqi) {
        resolve({ ok: false, errorMessage: 'Instancia de Culqi no disponible.' });
        return;
      }

      if (culqi.token) {
        const tokenId = culqi.token.id;
        culqi.close();

        // Optional backend charge endpoint if configured by merchant
        if (params.config.backendChargeEndpoint?.trim()) {
          try {
            const resp = await fetch(params.config.backendChargeEndpoint.trim(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: tokenId,
                amount: amountCents,
                currency_code: 'PEN',
                email: culqi.token.email,
              }),
            });
            if (!resp.ok) {
              resolve({
                ok: false,
                errorMessage: 'El servidor de cargos rechazó el pago en Culqi.',
              });
              return;
            }
          } catch {
            resolve({
              ok: false,
              errorMessage: 'Error de red al confirmar el cargo con el servidor.',
            });
            return;
          }
        }

        resolve({
          ok: true,
          referenceId: tokenId,
          methodUsed: 'tarjeta',
        });
        return;
      }

      if (culqi.order) {
        const orderId = culqi.order.id;
        culqi.close();
        resolve({
          ok: true,
          referenceId: orderId,
          methodUsed: 'yape',
        });
        return;
      }

      if (culqi.error) {
        resolve({
          ok: false,
          errorMessage:
            culqi.error.user_message ||
            culqi.error.merchant_message ||
            'La operación en Culqi no pudo completarse.',
        });
      }
    };

    const activePublicKey = resolveCulqiPublicKey(params.config);
    window.Culqi!.publicKey = activePublicKey;
    window.Culqi!.settings({
      title: params.storeTitle,
      currency: 'PEN',
      amount: amountCents,
    });
    window.Culqi!.options({
      lang: 'es',
      installments: false,
      paymentMethods: {
        tarjeta: true,
        yape: params.config.yapeEnabled,
        billetera: params.config.billeteraEnabled,
        bancaMovil: Boolean(params.config.multipayEnabled),
        agente: Boolean(params.config.multipayEnabled),
        cuotealo: Boolean(params.config.multipayEnabled),
      },
      style: {
        logo: params.logoUrl || undefined,
        bannerColor: params.accentColor,
        buttonBackground: params.accentColor,
        menuColor: params.accentColor,
        linksColor: params.accentColor,
        priceColor: params.accentColor,
      },
    });
    window.Culqi!.open();
  });
}

export interface DynamicDeliveryComputation {
  feeSoles: number;
  matchedBracketLabel: string;
  isFreeBySubtotal: boolean;
  isOutOfRange: boolean;
}

export function calculateDynamicDeliveryFee(params: {
  orderMode: 'delivery' | 'pickup';
  distanceKm: number | null;
  branchMaxRadiusKm: number;
  cartSubtotal: number;
  tariff?: DeliveryTariffConfig;
}): DynamicDeliveryComputation {
  if (params.orderMode === 'pickup') {
    return {
      feeSoles: 0,
      matchedBracketLabel: 'Recojo en tienda (Gratis)',
      isFreeBySubtotal: false,
      isOutOfRange: false,
    };
  }

  const tariff = params.tariff;
  const maxRadius = params.branchMaxRadiusKm > 0 ? params.branchMaxRadiusKm : 8;

  if (params.distanceKm !== null && params.distanceKm > maxRadius) {
    return {
      feeSoles: tariff?.baseFallbackFeeSoles ?? 5,
      matchedBracketLabel: `Fuera de cobertura (${params.distanceKm.toFixed(1)} km > ${maxRadius} km máx.)`,
      isFreeBySubtotal: false,
      isOutOfRange: true,
    };
  }

  if (
    tariff?.freeDeliveryMinSubtotal &&
    tariff.freeDeliveryMinSubtotal > 0 &&
    params.cartSubtotal >= tariff.freeDeliveryMinSubtotal
  ) {
    return {
      feeSoles: 0,
      matchedBracketLabel: `Envío Gratis por compra ≥ S/ ${tariff.freeDeliveryMinSubtotal.toFixed(0)}`,
      isFreeBySubtotal: true,
      isOutOfRange: false,
    };
  }

  if (!tariff || !tariff.enabled || params.distanceKm === null) {
    const fallback = tariff?.baseFallbackFeeSoles ?? 5.0;
    return {
      feeSoles: Number(fallback.toFixed(2)),
      matchedBracketLabel:
        params.distanceKm === null ? 'Tarifa base referencial (activa tu GPS)' : 'Tarifa plana de envío',
      isFreeBySubtotal: false,
      isOutOfRange: false,
    };
  }

  const dist = params.distanceKm;
  const sorted = [...tariff.brackets].sort((a, b) => a.minKm - b.minKm);
  const matched = sorted.find(b => dist >= b.minKm && dist <= b.maxKm);

  if (matched) {
    return {
      feeSoles: Number(matched.feeSoles.toFixed(2)),
      matchedBracketLabel: `Tramo ${matched.minKm}–${matched.maxKm} km (${dist.toFixed(1)} km)`,
      isFreeBySubtotal: false,
      isOutOfRange: false,
    };
  }

  const highest = sorted[sorted.length - 1];
  if (highest && dist > highest.maxKm) {
    const extraKm = Math.ceil(dist - highest.maxKm);
    const computed = highest.feeSoles + extraKm * (tariff.extraPerKmSoles || 1.5);
    return {
      feeSoles: Number(computed.toFixed(2)),
      matchedBracketLabel: `${dist.toFixed(1)} km (Base + ${extraKm} km extra)`,
      isFreeBySubtotal: false,
      isOutOfRange: false,
    };
  }

  return {
    feeSoles: Number((tariff.baseFallbackFeeSoles || 5).toFixed(2)),
    matchedBracketLabel: `${dist.toFixed(1)} km`,
    isFreeBySubtotal: false,
    isOutOfRange: false,
  };
}
