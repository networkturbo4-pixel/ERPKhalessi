import React from 'react';
import { Wifi, ShieldCheck } from 'lucide-react';
import type { CardBrand } from '../../types/storeCustomer';

interface InteractiveCreditCardProps {
  cardNumber: string;
  cardHolder: string;
  cardExpiry: string;
  cardCvv: string;
  brand: CardBrand;
  isFlipped?: boolean;
  accentColor?: string;
}

const BRAND_THEME: Record<CardBrand, { gradient: string; badge: string }> = {
  Visa: {
    gradient: 'from-slate-900 via-blue-950 to-indigo-900',
    badge: 'VISA',
  },
  Mastercard: {
    gradient: 'from-zinc-900 via-neutral-900 to-rose-950',
    badge: 'MASTERCARD',
  },
  Amex: {
    gradient: 'from-emerald-950 via-teal-900 to-slate-900',
    badge: 'AMEX',
  },
  Diners: {
    gradient: 'from-slate-900 via-zinc-800 to-slate-950',
    badge: 'DINERS',
  },
  Tarjeta: {
    gradient: 'from-neutral-900 via-zinc-900 to-neutral-950',
    badge: 'TARJETA',
  },
};

export const InteractiveCreditCard: React.FC<InteractiveCreditCardProps> = ({
  cardNumber,
  cardHolder,
  cardExpiry,
  cardCvv,
  brand,
  isFlipped = false,
  accentColor = '#e11d48',
}) => {
  const theme = BRAND_THEME[brand] || BRAND_THEME.Tarjeta;
  const digits = cardNumber.replace(/\D/g, '');
  const padded = (digits + '••••••••••••••••').slice(0, 16);
  const formattedGroups = `${padded.slice(0, 4)}  ${padded.slice(4, 8)}  ${padded.slice(8, 12)}  ${padded.slice(12, 16)}`;

  const displayHolder = cardHolder.trim() ? cardHolder.trim().toUpperCase() : 'NOMBRE DEL TITULAR';
  const displayExpiry = cardExpiry.trim() || 'MM/AA';
  const displayCvv = cardCvv.trim() ? cardCvv.replace(/./g, '•') : '•••';

  return (
    <div className="w-full" style={{ perspective: '1000px' }}>
      <div
        className="relative w-full h-44 sm:h-48 transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div
          className={`absolute inset-0 rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-white/15 bg-gradient-to-br ${theme.gradient} flex flex-col justify-between overflow-hidden`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Decorative glow */}
          <div
            className="absolute -right-10 -top-10 w-36 h-36 rounded-full blur-2xl opacity-30 pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              {/* EMV Chip */}
              <div className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-500 border border-amber-100/50 shadow-inner flex items-center justify-center">
                <div className="w-5 h-4 border border-amber-900/30 rounded-[3px]" />
              </div>
              <Wifi className="w-4 h-4 text-white/70 rotate-90" />
            </div>

            <div className="flex items-center gap-1.5">
              {brand === 'Mastercard' ? (
                <div className="flex items-center -space-x-2">
                  <span className="w-5 h-5 rounded-full bg-rose-500/90 inline-block" />
                  <span className="w-5 h-5 rounded-full bg-amber-400/90 inline-block" />
                </div>
              ) : (
                <span className="text-xs sm:text-sm font-black tracking-widest italic text-white/95">
                  {theme.badge}
                </span>
              )}
            </div>
          </div>

          <div className="relative z-10 my-auto pt-2">
            <p className="font-mono text-base sm:text-lg font-bold tracking-wider text-white drop-shadow-xs">
              {formattedGroups}
            </p>
          </div>

          <div className="flex items-end justify-between gap-3 relative z-10">
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] uppercase tracking-widest text-white/60 font-bold">
                Titular
              </span>
              <span className="block text-xs sm:text-sm font-black tracking-wide truncate">
                {displayHolder}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="block text-[9px] uppercase tracking-widest text-white/60 font-bold">
                Vence
              </span>
              <span className="block font-mono text-xs sm:text-sm font-black">
                {displayExpiry}
              </span>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className={`absolute inset-0 rounded-2xl text-white shadow-xl border border-white/15 bg-gradient-to-br ${theme.gradient} flex flex-col justify-between overflow-hidden py-4`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="w-full h-9 bg-black/80 mt-1" />

          <div className="px-5 flex items-center gap-3">
            <div className="flex-1 h-8 rounded bg-white/90 flex items-center px-3">
              <span className="text-[10px] font-mono text-zinc-400 italic truncate">
                {displayHolder}
              </span>
            </div>
            <div className="w-16 h-8 rounded bg-white text-zinc-900 flex items-center justify-center font-mono text-sm font-black tracking-widest shadow-inner">
              {displayCvv}
            </div>
          </div>

          <div className="px-5 flex items-center justify-between text-[10px] text-white/70">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Tokenización segura Culqi PCI-DSS
            </span>
            <span className="font-black italic">{theme.badge}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
