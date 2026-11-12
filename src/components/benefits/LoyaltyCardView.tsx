import React from 'react';
import { Crown, Flame, Award, Star, Sparkles, Pizza } from 'lucide-react';
import { LoyaltyCardStyle, LoyaltyStampStyle, PointsProgramConfig } from '../../types/benefits';

interface LoyaltyCardViewProps {
  config: PointsProgramConfig;
  points: number;
  rewardsCount?: number;
  isPreview?: boolean;
}

export const CARD_STYLE_PRESETS: Record<
  LoyaltyCardStyle,
  {
    label: string;
    bgColor: string;
    accentColor: string;
    textColor: string;
    overlayOpacity: number;
  }
> = {
  modern_dark: {
    label: 'Oscura Moderna',
    bgColor: '#18181b',
    accentColor: '#f59e0b',
    textColor: '#ffffff',
    overlayOpacity: 50,
  },
  glass_light: {
    label: 'Clara Minimalista',
    bgColor: '#ffffff',
    accentColor: '#ea580c',
    textColor: '#18181b',
    overlayOpacity: 70,
  },
  gold_vip: {
    label: 'Dorada VIP',
    bgColor: '#1c1917',
    accentColor: '#fbbf24',
    textColor: '#fef3c7',
    overlayOpacity: 45,
  },
  gradient_brand: {
    label: 'Degradado Vibrante',
    bgColor: '#7f1d1d',
    accentColor: '#f59e0b',
    textColor: '#ffffff',
    overlayOpacity: 35,
  },
  classic_paper: {
    label: 'Cartilla Artesanal',
    bgColor: '#fef7ed',
    accentColor: '#dc2626',
    textColor: '#292524',
    overlayOpacity: 75,
  },
};

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

function getContrastText(bgHex: string): string {
  return isLightHex(bgHex) ? '#18181b' : '#ffffff';
}

export const LoyaltyCardView: React.FC<LoyaltyCardViewProps> = ({
  config,
  points,
  rewardsCount = 0,
  isPreview = false,
}) => {
  const cardStyle: LoyaltyCardStyle = config.cardStyle || 'modern_dark';
  const stampStyle: LoyaltyStampStyle = config.stampStyle || 'pills';
  const preset = CARD_STYLE_PRESETS[cardStyle] || CARD_STYLE_PRESETS.modern_dark;

  const bgColor = config.cardBgColor || preset.bgColor;
  const accentColor = config.cardAccentColor || preset.accentColor;
  const textColor = config.cardTextColor || preset.textColor;
  const overlayOpacity =
    typeof config.cardBgOverlayOpacity === 'number' ? config.cardBgOverlayOpacity : preset.overlayOpacity;

  const iconPx = Math.min(40, Math.max(14, config.iconSize || 20));
  const badgeIconPx = Math.max(13, Math.round(iconPx * 0.7));

  const goal = Math.max(1, config.stampsPerCardGoal || 8);
  const displayPoints = Math.max(0, points || 0);
  const filledStamps = displayPoints > 0 ? displayPoints % goal || goal : 0;
  const activeCount = Math.min(displayPoints, filledStamps);

  const isLightCard = isLightHex(bgColor);
  const secondaryTextColor = isLightCard ? 'rgba(24, 24, 27, 0.72)' : 'rgba(255, 255, 255, 0.76)';
  const emptyStampBg = isLightCard ? 'rgba(24, 24, 27, 0.06)' : 'rgba(255, 255, 255, 0.08)';
  const emptyStampBorder = isLightCard ? 'rgba(24, 24, 27, 0.14)' : 'rgba(255, 255, 255, 0.16)';
  const dividerColor = isLightCard ? 'rgba(24, 24, 27, 0.12)' : 'rgba(255, 255, 255, 0.14)';
  const accentTextColor = getContrastText(accentColor);

  const renderCardIcon = (sizePx: number, color?: string) => {
    if (config.customIconUrl) {
      return (
        <img
          src={config.customIconUrl}
          alt="Ícono"
          style={{ width: sizePx, height: sizePx }}
          className="object-contain shrink-0 pointer-events-none select-none"
        />
      );
    }

    const iconStyle = { width: sizePx, height: sizePx, color };
    switch (config.cardIcon) {
      case 'pizza':
        return <Pizza style={iconStyle} className="shrink-0" />;
      case 'flame':
        return <Flame style={iconStyle} className="shrink-0 fill-current" />;
      case 'award':
        return <Award style={iconStyle} className="shrink-0" />;
      case 'star':
        return <Star style={iconStyle} className="shrink-0 fill-current" />;
      case 'sparkles':
        return <Sparkles style={iconStyle} className="shrink-0" />;
      case 'crown':
      default:
        return <Crown style={iconStyle} className="shrink-0 fill-current" />;
    }
  };

  let containerBackground = bgColor;
  if (cardStyle === 'gradient_brand') {
    containerBackground = `linear-gradient(135deg, ${bgColor} 0%, ${accentColor} 140%)`;
  } else if (cardStyle === 'gold_vip') {
    containerBackground = `linear-gradient(135deg, ${bgColor} 0%, #451a03 65%, #78350f 100%)`;
  }

  const cardBorderStyle =
    cardStyle === 'classic_paper'
      ? `2px dashed ${accentColor}55`
      : isLightCard
      ? '1px solid rgba(24, 24, 27, 0.12)'
      : '1px solid rgba(255, 255, 255, 0.12)';

  const isActive = config.enabled && config.status !== 'paused';

  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-xl p-5 sm:p-6 flex flex-col justify-between gap-4 select-none"
      style={{
        background: containerBackground,
        color: textColor,
        border: cardBorderStyle,
      }}
    >
      {/* Imagen de fondo personalizada con velo controlado para mantener legibilidad */}
      {config.cardBgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${config.cardBgImage})` }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: containerBackground,
              opacity: Math.min(0.92, Math.max(0, overlayOpacity / 100)),
            }}
          />
        </>
      )}

      {/* Borde interior sutil para cartilla artesanal */}
      {cardStyle === 'classic_paper' && (
        <div
          className="absolute inset-2 rounded-2xl pointer-events-none"
          style={{ border: `1px dashed ${accentColor}35` }}
        />
      )}

      {/* Cabecera de la tarjeta */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs"
              style={{
                backgroundColor: accentColor,
                color: accentTextColor,
              }}
            >
              {renderCardIcon(badgeIconPx, accentTextColor)}
              <span>Tarjeta Digital</span>
            </span>

            {isPreview && (
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                }`}
              >
                {isActive ? 'Activa' : 'Pausada'}
              </span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-black tracking-tight pt-1 leading-tight" style={{ color: textColor }}>
            {config.cardTitle || 'Tarjeta de Puntos'}
          </h3>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: secondaryTextColor }}>
            {config.cardSubtitle}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-black leading-none tabular-nums" style={{ color: accentColor }}>
            {displayPoints} / {goal}
          </div>
          <div
            className="text-[10px] uppercase font-bold tracking-wider mt-1"
            style={{ color: secondaryTextColor }}
          >
            Puntos Sellados
          </div>
        </div>
      </div>

      {/* Sellos / Puntos según estilo elegido */}
      {stampStyle === 'minimal_dots' ? (
        <div className="relative z-10 space-y-2.5 py-1">
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: emptyStampBg }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((activeCount / goal) * 100))}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            {Array.from({ length: goal }).map((_, idx) => {
              const stamped = idx < activeCount;
              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[28px] h-9 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={{
                    backgroundColor: stamped ? accentColor : emptyStampBg,
                    color: stamped ? accentTextColor : secondaryTextColor,
                    border: `1px solid ${stamped ? accentColor : emptyStampBorder}`,
                  }}
                >
                  {stamped ? renderCardIcon(Math.min(22, iconPx), accentTextColor) : <span>{idx + 1}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-4 gap-2 py-1">
          {Array.from({ length: goal }).map((_, idx) => {
            const stamped = idx < activeCount;

            const shapeClasses =
              stampStyle === 'circles'
                ? 'w-12 h-12 sm:w-13 sm:h-13 rounded-full mx-auto'
                : stampStyle === 'squares'
                ? 'w-12 h-12 sm:w-13 sm:h-13 rounded-2xl mx-auto'
                : stampStyle === 'tickets'
                ? 'h-12 rounded-lg border-dashed'
                : 'h-11 rounded-xl';

            return (
              <div
                key={idx}
                className={`${shapeClasses} flex items-center justify-center text-xs font-black`}
                style={{
                  backgroundColor: stamped ? accentColor : emptyStampBg,
                  color: stamped ? accentTextColor : secondaryTextColor,
                  border:
                    stampStyle === 'tickets'
                      ? `1.5px dashed ${stamped ? accentTextColor : emptyStampBorder}`
                      : `1px solid ${stamped ? accentColor : emptyStampBorder}`,
                }}
              >
                {stamped ? renderCardIcon(iconPx, accentTextColor) : <span>#{idx + 1}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Pie de tarjeta */}
      <div
        className="relative z-10 text-[11px] flex items-center justify-between gap-2 pt-3 flex-wrap"
        style={{
          color: secondaryTextColor,
          borderTop: `1px solid ${dividerColor}`,
        }}
      >
        <span>
          {config.awardPointPerOrder !== false
            ? `✓ +${config.pointsPerPurchase || 1} pto por pedido`
            : 'Bonificación manual'}
          {config.awardPointOnRegister ? ' · +1 bienvenida' : ''}
        </span>
        <span className="font-black" style={{ color: accentColor }}>
          {rewardsCount > 0 ? `${rewardsCount} premios disponibles` : 'Canjéalos en el checkout'}
        </span>
      </div>
    </div>
  );
};
