import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Gift, Receipt, User, ChevronRight } from 'lucide-react';

interface StoreAccountMenuProps {
  isLightTheme: boolean;
  accentColor: string;
  autoButtonContrast: boolean;
  customerFirstName: string | null;
  customerFullName: string | null;
  activeOrdersCount: number;
  onOpenProfile: () => void;
  onOpenOrders: () => void;
  onOpenBenefits: () => void;
}

/**
 * Desktop account dropdown: groups Perfil + Pedidos + Premios behind one clean header button
 * so the top bar never feels crowded. Closes on outside click, Escape, or after choosing an item.
 */
export const StoreAccountMenu: React.FC<StoreAccountMenuProps> = ({
  isLightTheme,
  accentColor,
  autoButtonContrast,
  customerFirstName,
  customerFullName,
  activeOrdersCount,
  onOpenProfile,
  onOpenOrders,
  onOpenBenefits,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  const initials = (customerFullName || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const items: {
    key: string;
    label: string;
    hint: string;
    Icon: React.ElementType;
    iconStyle?: React.CSSProperties;
    iconClass?: string;
    badge?: number;
    action: () => void;
  }[] = [
    {
      key: 'profile',
      label: customerFullName ? 'Mi perfil y datos' : 'Iniciar sesión / Crear cuenta',
      hint: customerFullName ? 'Direcciones, pagos y puntos' : 'Guarda tus direcciones y gana puntos',
      Icon: User,
      iconStyle: { color: accentColor },
      action: onOpenProfile,
    },
    {
      key: 'orders',
      label: 'Mis pedidos',
      hint: activeOrdersCount > 0 ? 'Sigue tu pedido en vivo' : 'Historial y seguimiento',
      Icon: Receipt,
      iconStyle: { color: accentColor },
      badge: activeOrdersCount,
      action: onOpenOrders,
    },
    {
      key: 'benefits',
      label: 'Premios y beneficios',
      hint: 'Puntos, ruleta y cupones',
      Icon: Gift,
      iconClass: 'text-amber-500',
      action: onOpenBenefits,
    },
  ];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(v => !v)}
        className={`relative h-10 pl-1.5 pr-3 rounded-full border text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
          isLightTheme
            ? 'border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
            : 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
        } ${open ? (isLightTheme ? 'bg-zinc-200' : 'bg-neutral-800') : ''}`}
      >
        <span
          data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
          className="store-btn-solid w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
        >
          {initials || <User aria-hidden="true" className="w-3.5 h-3.5" />}
        </span>
        <span className="max-w-[96px] truncate">{customerFirstName || 'Mi cuenta'}</span>
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
        />
        {activeOrdersCount > 0 && (
          <span
            aria-label={`${activeOrdersCount} pedido(s) activo(s)`}
            data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
            className={`store-btn-solid absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ring-2 ${
              isLightTheme ? 'ring-white' : 'ring-neutral-950'
            }`}
          >
            {activeOrdersCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border p-1.5 shadow-2xl z-40 ${
            isLightTheme
              ? 'bg-white border-zinc-200 text-zinc-900'
              : 'bg-neutral-900 border-neutral-700 text-neutral-100'
          }`}
        >
          <div
            className={`px-3 pt-2 pb-2.5 mb-1 border-b ${
              isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
            }`}
          >
            <span
              className={`block text-[10px] font-bold uppercase tracking-wider ${
                isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
              }`}
            >
              {customerFullName ? 'Hola de nuevo' : 'Bienvenido'}
            </span>
            <span className="block text-sm font-black truncate">
              {customerFullName || 'Invitado'}
            </span>
          </div>

          {items.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => choose(item.action)}
              className={`w-full min-h-[52px] px-3 py-2 rounded-xl flex items-center gap-3 text-left transition-colors ${
                isLightTheme ? 'hover:bg-zinc-100' : 'hover:bg-neutral-800'
              }`}
            >
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isLightTheme ? 'bg-zinc-100' : 'bg-neutral-800'
                }`}
              >
                <item.Icon
                  aria-hidden="true"
                  className={`w-4 h-4 ${item.iconClass || ''}`}
                  style={item.iconStyle}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-black truncate">{item.label}</span>
                <span
                  className={`block text-[11px] truncate ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  {item.hint}
                </span>
              </span>
              {item.badge && item.badge > 0 ? (
                <span
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0"
                >
                  {item.badge}
                </span>
              ) : (
                <ChevronRight aria-hidden="true" className="w-4 h-4 opacity-40 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
