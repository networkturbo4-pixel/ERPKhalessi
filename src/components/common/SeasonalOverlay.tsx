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

  const styleMode = cfg.styleMode || 'doodle';
  const isDoodleHeader = styleMode === 'doodle' || styleMode === 'minimal';
  const showParticles = styleMode !== 'minimal';
  const bannerMessage = (cfg.bannerText || '').trim() || meta.defaultBannerText;

  const renderDoodleCornerSvg = (side: 'left' | 'right') => {
    const flip = side === 'right' ? 'scale(-1, 1)' : undefined;
    switch (cfg?.theme || 'christmas') {
      case 'christmas':
        return (
          <svg
            aria-hidden="true"
            viewBox="0 0 120 40"
            className="h-8 w-24 shrink-0 opacity-90 hidden sm:block"
            style={flip ? { transform: flip } : undefined}
          >
            {/* String lights curve */}
            <path d="M0 8 Q30 22 60 10 T120 12" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <circle cx="18" cy="14" r="3" fill="#fde047" />
            <circle cx="48" cy="14" r="3" fill="#34d399" />
            <circle cx="78" cy="11" r="3" fill="#fb7185" />
            <circle cx="105" cy="13" r="2.8" fill="#38bdf8" />
            {/* Minimalist pine tree */}
            <polygon points="18,36 26,20 34,36" fill="rgba(255,255,255,0.22)" />
            <polygon points="20,28 26,16 32,28" fill="rgba(255,255,255,0.35)" />
            {/* 4-point sparkle */}
            <path d="M90 22 L92 27 L97 29 L92 31 L90 36 L88 31 L83 29 L88 27 Z" fill="#fef08a" />
          </svg>
        );
      case 'valentine':
        return (
          <svg
            aria-hidden="true"
            viewBox="0 0 120 40"
            className="h-8 w-24 shrink-0 opacity-90 hidden sm:block"
            style={flip ? { transform: flip } : undefined}
          >
            <path d="M4 28 Q36 8 72 24 T116 14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M26 24 C26 20 20 18 18 22 C16 18 10 20 10 24 C10 29 18 34 18 34 C18 34 26 29 26 24 Z" fill="rgba(255,255,255,0.85)" />
            <path d="M62 15 C62 12.5 58 11 56.5 13.5 C55 11 51 12.5 51 15 C51 18.5 56.5 21.5 56.5 21.5 C56.5 21.5 62 18.5 62 15 Z" fill="#fecdd3" />
            <path d="M94 18 L95.5 22 L99.5 23.5 L95.5 25 L94 29 L92.5 25 L88.5 23.5 L92.5 22 Z" fill="#fff" />
          </svg>
        );
      case 'summer':
        return (
          <svg
            aria-hidden="true"
            viewBox="0 0 120 40"
            className="h-8 w-24 shrink-0 opacity-90 hidden sm:block"
            style={flip ? { transform: flip } : undefined}
          >
            <circle cx="24" cy="20" r="8" fill="#fef08a" />
            <circle cx="24" cy="20" r="12" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M46 28 Q58 20 70 28 T94 28 T118 28" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
            <path d="M88 10 L90 14 L94 16 L90 18 L88 22 L86 18 L82 16 L86 14 Z" fill="#ffffff" />
          </svg>
        );
      case 'halloween':
        return (
          <svg
            aria-hidden="true"
            viewBox="0 0 120 40"
            className="h-8 w-24 shrink-0 opacity-90 hidden sm:block"
            style={flip ? { transform: flip } : undefined}
          >
            <path d="M26 10 A10 10 0 1 0 34 26 A8 8 0 1 1 26 10 Z" fill="#fde68a" />
            <path d="M56 18 Q62 12 68 18 Q74 12 80 18 Q72 22 68 25 Q64 22 56 18 Z" fill="rgba(255,255,255,0.75)" />
            <path d="M98 11 L99.5 15 L103.5 16.5 L99.5 18 L98 22 L96.5 18 L92.5 16.5 L96.5 15 Z" fill="#fdba74" />
          </svg>
        );
      case 'patriotic':
      default:
        return (
          <svg
            aria-hidden="true"
            viewBox="0 0 120 40"
            className="h-8 w-24 shrink-0 opacity-90 hidden sm:block"
            style={flip ? { transform: flip } : undefined}
          >
            <path d="M0 8 Q30 18 60 8 T120 10" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <polygon points="14,12 24,12 19,24" fill="#ffffff" />
            <polygon points="36,14 46,14 41,26" fill="#fecaca" />
            <polygon points="58,10 68,10 63,22" fill="#ffffff" />
            <path d="M92 18 L94 23 L99 25 L94 27 L92 32 L90 27 L85 25 L90 23 Z" fill="#fef08a" />
          </svg>
        );
    }
  };

  const renderDoodleVectorParticle = (p: ParticleSpec) => {
    const size = Math.max(10, Math.round(p.sizePx * 0.85));
    switch (cfg?.theme || 'christmas') {
      case 'christmas':
        return p.symbolIdx % 2 === 0 ? (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
            <line x1="19.1" y1="4.9" x2="4.9" y2="19.1" />
          </svg>
        ) : (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="#fef08a">
            <path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" />
          </svg>
        );
      case 'valentine':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={p.symbolIdx % 2 === 0 ? '#fda4af' : '#fb7185'}>
            <path d="M12 21s-7-4.35-9.5-8.4C.6 9.4 2.4 5 6.4 5c2.2 0 4 1.2 5.6 3.1C13.6 6.2 15.4 5 17.6 5c4 0 5.8 4.4 3.9 7.6C19 16.65 12 21 12 21z" />
          </svg>
        );
      case 'summer':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="#fde047">
            <path d="M12 2 L14.4 9.6 L22 12 L14.4 14.4 L12 22 L9.6 14.4 L2 12 L9.6 9.6 Z" />
          </svg>
        );
      case 'halloween':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={p.symbolIdx % 2 === 0 ? '#fb923c' : '#fde68a'}>
            <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
          </svg>
        );
      case 'patriotic':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={p.symbolIdx % 2 === 0 ? '#ef4444' : '#ffffff'}>
            <rect x="7" y="7" width="10" height="10" rx="2" transform="rotate(45 12 12)" />
          </svg>
        );
    }
  };

  return (
    <>
      {cfg.showBanner && (surface === 'storefront' || contained) && (
        isDoodleHeader ? (
          <div
            className={`${
              contained ? 'relative' : 'relative z-40'
            } w-full bg-gradient-to-r ${meta.bannerBgClass} text-white px-3 sm:px-6 py-2 shadow-sm border-b border-white/15 overflow-hidden`}
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              {renderDoodleCornerSvg('left')}
              <div className="flex-1 flex items-center justify-center gap-2 text-center min-w-0">
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-xs border border-white/25 text-[10px] font-black uppercase tracking-wider shrink-0">
                  {meta.badge}
                </span>
                <span className="text-xs sm:text-[13px] font-bold tracking-tight truncate">
                  {bannerMessage}
                </span>
              </div>
              {renderDoodleCornerSvg('right')}
            </div>
          </div>
        ) : (
          <div
            className={`${
              contained ? 'relative' : 'relative z-40'
            } w-full bg-gradient-to-r ${meta.bannerBgClass} text-white text-center px-4 py-1.5 text-xs font-semibold tracking-wide shadow-sm`}
          >
            <span>{bannerMessage}</span>
          </div>
        )
      )}

      {showParticles && (
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
              '--kh-p-opacity': String(styleMode === 'doodle' ? Math.min(0.65, p.opacity) : p.opacity),
              textShadow: '0 2px 8px rgba(0,0,0,0.25)',
            } as React.CSSProperties;

            return (
              <span
                key={p.id}
                className={`absolute leading-none ${motionClass}`}
                style={styleVars}
              >
                {styleMode === 'doodle' ? renderDoodleVectorParticle(p) : symbol}
              </span>
            );
          })}
        </div>
      )}
    </>
  );
};
