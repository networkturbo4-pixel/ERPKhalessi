import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import {
  Gift,
  Trophy,
  Sparkles,
  Ticket,
  X,
  Star,
  Copy,
} from 'lucide-react';
import { useBenefits } from '../../context/BenefitsContext';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { useSettings } from '../../context/SettingsContext';
import { StoreInteractiveGames } from './StoreInteractiveGames';
import { LoyaltyCardView } from '../benefits/LoyaltyCardView';

interface StoreBenefitsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  autoButtonContrast: boolean;
  isLightTheme: boolean;
  onOpenProfile?: () => void;
  onApplyCouponToCart?: (couponCode: string) => void;
}

type BenefitsTab = 'premios' | 'juegos' | 'cupones';

export const StoreBenefitsDrawer: React.FC<StoreBenefitsDrawerProps> = ({
  isOpen,
  onClose,
  accentColor,
  autoButtonContrast,
  isLightTheme,
  onOpenProfile,
  onApplyCouponToCart,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const { pointsConfig, rewards, coupons, gameSettings } = useBenefits();
  const { currentCustomer } = useStoreCustomer();
  const { dispatchToast } = useSettings();

  const isCardActive = pointsConfig.enabled && pointsConfig.status !== 'paused';
  const isGamesActive = gameSettings.enabled;

  const availableTabs = useMemo<Array<[BenefitsTab, string, React.ComponentType<{ className?: string }>]>>(() => {
    const list: Array<[BenefitsTab, string, React.ComponentType<{ className?: string }>]> = [];
    if (isCardActive || rewards.some(r => r.isActive)) {
      list.push(['premios', isCardActive ? 'Premios & Tarjeta' : 'Premios Canjeables', Trophy]);
    }
    if (isGamesActive) {
      list.push(['juegos', 'Juegos Interactivos', Sparkles]);
    }
    list.push(['cupones', 'Cupones de Descuento', Ticket]);
    return list;
  }, [isCardActive, isGamesActive, rewards]);

  const [activeTab, setActiveTab] = useState<BenefitsTab>('premios');

  useEffect(() => {
    if (!availableTabs.some(([k]: [BenefitsTab, string, unknown]) => k === activeTab)) {
      setActiveTab(availableTabs[0]?.[0] || 'cupones');
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const activeCoupons = coupons.filter(c => c.isActive);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={e => {
        e.currentTarget.returnValue = '';
        onClose();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
      }}
      className="store-responsive-drawer backdrop:bg-black/60 backdrop:backdrop-blur-xs"
    >
      {isOpen && (
        <div
          className={`rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l shadow-2xl flex flex-col max-h-[92svh] md:h-full md:max-h-none overflow-hidden transition-colors ${
            isLightTheme
              ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
              : 'bg-neutral-900 border-neutral-800 text-neutral-100'
          }`}
        >
          {/* Mobile Drag Handle */}
          <div className="pt-3 pb-1 flex justify-center md:hidden">
            <div
              className={`w-11 h-1.5 rounded-full ${
                isLightTheme ? 'bg-zinc-300' : 'bg-neutral-700'
              }`}
            />
          </div>

          {/* Sticky Drawer Header */}
          <div
            className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
              isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="store-btn-solid w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm"
              >
                <Gift className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="font-black text-base truncate">
                  Beneficios & Premios
                </h2>
                <p
                  className={`text-[11px] truncate ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  Puntos, ruleta interactiva y cupones exclusivos
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar panel de beneficios"
              onClick={onClose}
              className={`p-2 rounded-full transition-colors shrink-0 ${
                isLightTheme
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Sub-Tabs (Scrollable horizontally on mobile/touch) */}
          <div
            className={`px-3 sm:px-4 pt-3 pb-2.5 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x flex-nowrap ${
              isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            {availableTabs.map(([tabKey, label, Icon]: [BenefitsTab, string, React.ComponentType<{ className?: string }>]) => {
              const active = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  data-auto-contrast={active && autoButtonContrast ? 'true' : 'false'}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'store-btn-solid shadow-xs'
                      : isLightTheme
                      ? 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* BODY SCROLL CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar safe-bottom-bar">
            {/* TAB 1: PREMIOS & TARJETA DE PUNTOS */}
            {activeTab === 'premios' && (
              <div className="space-y-4">
                {/* Visual Loyalty Card (Only if active and not paused) */}
                {isCardActive && (
                  <div className="space-y-3">
                    <LoyaltyCardView
                      config={pointsConfig}
                      points={currentCustomer?.points || 0}
                      rewardsCount={rewards.filter(r => r.isActive).length}
                    />

                    {!currentCustomer && (
                      <div
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                          isLightTheme
                            ? 'bg-zinc-50 border-zinc-200'
                            : 'bg-neutral-900/80 border-neutral-800'
                        }`}
                      >
                        <span className={isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}>
                          Inicia sesión para acumular tus puntos en cada pedido.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            if (onOpenProfile) onOpenProfile();
                          }}
                          data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                          className="store-btn-solid px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 shadow-xs"
                        >
                          Ingresar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Redeemable Rewards Cards */}
                <div className="space-y-2.5">
                  <span
                    className={`block text-xs font-black uppercase tracking-wider ${
                      isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                    }`}
                  >
                    Catálogo de Premios Disponibles ({rewards.length})
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {rewards.map(reward => {
                      const canRedeem = (currentCustomer?.points || 0) >= reward.pointsCost;
                      return (
                        <div
                          key={reward.id}
                          className={`p-4 rounded-3xl border flex items-center justify-between gap-3.5 transition-all shadow-xs ${
                            isLightTheme
                              ? 'bg-white border-zinc-200/90 text-zinc-900'
                              : 'bg-neutral-950 border-neutral-800 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl p-2 rounded-2xl bg-amber-500/10 shrink-0">
                              {reward.badgeIcon}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm truncate">
                                {reward.title}
                              </h4>
                              <p
                                className={`text-[11px] line-clamp-1 ${
                                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                                }`}
                              >
                                {reward.description}
                              </p>
                              <span className="inline-block text-[11px] font-black text-amber-500 mt-0.5">
                                Costo: {reward.pointsCost} puntos
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap ${
                              canRedeem
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black'
                                : isLightTheme
                                ? 'bg-zinc-100 text-zinc-500'
                                : 'bg-neutral-900 text-neutral-500'
                            }`}
                          >
                            {canRedeem ? '✓ Canjeable' : 'Faltan puntos'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: JUEGOS INTERACTIVOS (RULETA & PUZZLE) */}
            {isGamesActive && activeTab === 'juegos' && (
              <StoreInteractiveGames
                isLightTheme={isLightTheme}
                accentColor={accentColor}
                autoButtonContrast={autoButtonContrast}
              />
            )}

            {/* TAB 3: CUPONES DE DESCUENTO */}
            {activeTab === 'cupones' && (
              <div className="space-y-3">
                <span
                  className={`block text-xs font-black uppercase tracking-wider ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  Cupones Vigentes ({activeCoupons.length})
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {activeCoupons.map(coupon => (
                    <div
                      key={coupon.id}
                      className={`p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-xs ${
                        isLightTheme
                          ? 'bg-white border-zinc-200/90 text-zinc-900'
                          : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {coupon.code}
                          </span>
                          <span className="text-xs font-bold truncate">{coupon.title}</span>
                        </div>
                        <p
                          className={`text-[11px] ${
                            isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                          }`}
                        >
                          {coupon.description}
                        </p>
                        <span
                          className={`block text-[10px] ${
                            isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                          }`}
                        >
                          Mínimo: S/ {coupon.minOrderAmount.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(coupon.code);
                          dispatchToast('Cupón Copiado', `Código ${coupon.code} copiado al portapapeles.`, 'success');
                          if (onApplyCouponToCart) {
                            onApplyCouponToCart(coupon.code);
                          }
                        }}
                        data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                        className="store-btn-solid px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
};
