import React, { useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { SeasonalIntensity, SeasonalThemeConfig, SeasonalThemeId } from '../../types/settings';

export interface SeasonalThemeMeta {
  id: SeasonalThemeId;
  name: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  bannerBgClass: string;
  motion: 'fall' | 'float' | 'twinkle';
  symbols: string[];
  defaultBannerText: string;
}

export const SEASONAL_THEMES_META: Record<SeasonalThemeId, SeasonalThemeMeta> = {
  christmas: {
    id: 'christmas',
    name: 'Navidad & Año Nuevo',
    subtitle: 'Copos de nieve cayendo suavemente sobre la tienda',
    badge: '❄️ Nieve',
    accentColor: '#38bdf8',
    bannerBgClass: 'from-rose-700 via-red-700 to-emerald-800',
    motion: 'fall',
    symbols: ['❄️', '❅', '❆', '✦'],
    defaultBannerText: '🎄 ¡Felices Fiestas! Disfruta nuestras promociones navideñas al horno de piedra',
  },
  valentine: {
    id: 'valentine',
    name: 'San Valentín',
    subtitle: 'Corazoncitos flotantes en tonos cálidos y románticos',
    badge: '❤️ Corazones',
    accentColor: '#fb7185',
    bannerBgClass: 'from-rose-600 via-pink-600 to-red-600',
    motion: 'float',
    symbols: ['❤️', '💖', '💕', '💘'],
    defaultBannerText: '❤️ ¡Feliz San Valentín! Comparte una pizza artesanal con tu persona favorita',
  },
  summer: {
    id: 'summer',
    name: 'Campaña de Verano',
    subtitle: 'Brillitos dorados y destellos solares en pantalla',
    badge: '✨ Brillitos',
    accentColor: '#f59e0b',
    bannerBgClass: 'from-amber-500 via-orange-500 to-yellow-500',
    motion: 'twinkle',
    symbols: ['✨', '☀️', '🌟', '✧'],
    defaultBannerText: '☀️ ¡Modo Verano Activo! Combos frescos y bebidas heladas directo a tu puerta',
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    subtitle: 'Partículas festivas de otoño y noche de brujas',
    badge: '🎃 Noche',
    accentColor: '#f97316',
    bannerBgClass: 'from-zinc-900 via-orange-800 to-purple-900',
    motion: 'fall',
    symbols: ['🎃', '✨', '🦇', '🍂'],
    defaultBannerText: '🎃 ¡Especial de Halloween! Pide tu pizza favorita antes de medianoche',
  },
  patriotic: {
    id: 'patriotic',
    name: 'Fiestas Patrias',
    subtitle: 'Confeti y destellos festivos rojo y blanco',
    badge: '🎉 Fiesta',
    accentColor: '#ef4444',
    bannerBgClass: 'from-red-700 via-rose-600 to-red-800',
    motion: 'fall',
    symbols: ['🎊', '✨', '❤️', '🤍'],
    defaultBannerText: '🇵🇪 ¡Felices Fiestas Patrias! Celebra en familia con nuestro sabor artesanal',
  },
};

const INTENSITY_COUNTS: Record<SeasonalIntensity, number> = {
  subtle: 14,
  medium: 26,
  festive: 42,
};

interface ParticleSpec {
  id: number;
  leftPct: number;
  topPct: number;
  sizePx: number;
  durationSec: number;
  delaySec: number;
  swayPx: number;
  rotDeg: number;
  opacity: number;
  symbolIdx: number;
}

function buildParticles(count: number): ParticleSpec[] {
  const list: ParticleSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    // Deterministic pseudo-random distribution so particles stay stable across renders
    const seed1 = ((i * 37 + 13) % 97) / 97;
    const seed2 = ((i * 53 + 29) % 89) / 89;
    const seed3 = ((i * 71 + 7) % 83) / 83;
    list.push({
      id: i,
      leftPct: Math.round(seed1 * 96 + 2),
      topPct: Math.round(seed2 * 88 + 4),
      sizePx: Math.round(12 + seed3 * 12),
      durationSec: Number((7.5 + seed2 * 7.5).toFixed(2)),
      delaySec: Number((-(seed1 * 10)).toFixed(2)),
      swayPx: Math.round((seed3 - 0.5) * 60),
      rotDeg: Math.round((seed1 - 0.5) * 320),
      opacity: Number((0.45 + seed3 * 0.45).toFixed(2)),
      symbolIdx: i,
    });
  }
  return list;
}

interface SeasonalOverlayProps {
  surface: 'storefront' | 'kiosk' | 'erp';
  /** Optional override used in Settings live preview */
  previewConfig?: SeasonalThemeConfig;
  /** Render inside a relative container instead of fixed viewport */
  contained?: boolean;
}

export const SeasonalOverlay: React.FC<SeasonalOverlayProps> = ({
  surface,
  previewConfig,
  contained = false,
}) => {
  const { customization } = useSettings();
  const cfg = previewConfig ?? customization.seasonalTheme;

  const isVisibleOnSurface = useMemo(() => {
    if (!cfg?.enabled) return false;
    if (contained) return true;
    if (cfg.scope === 'all') return true;
    if (cfg.scope === 'storefront_kiosk') {
      return surface === 'storefront' || surface === 'kiosk';
    }
    return surface === 'storefront';
  }, [cfg, contained, surface]);

  const meta = SEASONAL_THEMES_META[cfg?.theme || 'christmas'] || SEASONAL_THEMES_META.christmas;

  const particles = useMemo(() => {
    const baseCount = INTENSITY_COUNTS[cfg?.intensity || 'medium'] ?? 26;
    const finalCount = contained ? Math.max(8, Math.round(baseCount * 0.5)) : baseCount;
    return buildParticles(finalCount);
  }, [cfg?.intensity, contained]);

  if (!isVisibleOnSurface) return null;

  const motionClass =
    meta.motion === 'float'
      ? 'kh-particle-float'
      : meta.motion === 'twinkle'
      ? 'kh-particle-twinkle'
      : 'kh-particle-fall';

  const bannerMessage = (cfg.bannerText || '').trim() || meta.defaultBannerText;

  return (
    <>
      {cfg.showBanner && (surface === 'storefront' || contained) && (
        <div
          className={`${
            contained ? 'relative' : 'relative z-40'
          } w-full bg-gradient-to-r ${meta.bannerBgClass} text-white text-center px-4 py-1.5 text-xs font-semibold tracking-wide shadow-sm`}
        >
          <span>{bannerMessage}</span>
        </div>
      )}

      <div
        aria-hidden="true"
        className={`${
          contained ? 'absolute inset-0' : 'fixed inset-0'
        } pointer-events-none overflow-hidden z-[45] select-none`}
      >
        {particles.map(p => {
          const symbol = meta.symbols[p.symbolIdx % meta.symbols.length];
          const styleVars = {
            left: `${p.leftPct}%`,
            top: meta.motion === 'twinkle' ? `${p.topPct}%` : '0%',
            fontSize: `${p.sizePx}px`,
            '--kh-p-dur': `${p.durationSec}s`,
            '--kh-p-delay': `${p.delaySec}s`,
            '--kh-p-sway': `${p.swayPx}px`,
            '--kh-p-rot': `${p.rotDeg}deg`,
            '--kh-p-opacity': String(p.opacity),
            textShadow: '0 2px 8px rgba(0,0,0,0.25)',
          } as React.CSSProperties;

          return (
            <span
              key={p.id}
              className={`absolute leading-none ${motionClass}`}
              style={styleVars}
            >
              {symbol}
            </span>
          );
        })}
      </div>
    </>
  );
};
