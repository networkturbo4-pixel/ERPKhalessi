import React from 'react';
import {
  Search,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  UtensilsCrossed,
  Tag,
  CalendarClock,
  Store,
  Award,
  Heart,
  Package,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { StoreHeaderConfig, StoreHeaderVariant } from '../../types/storeBuilder';

export interface StorefrontThemeHeaderProps {
  variant: Exclude<StoreHeaderVariant, 'default'>;
  config?: StoreHeaderConfig;
  logoUrl?: string;
  brandName: string;
  phone?: string;
  branchName: string;
  deliveryAddress?: string;
  cartTotal: number;
  cartUnits: number;
  customerName?: string;
  showCartButton?: boolean;
  onGoHome: () => void;
  onSelectCategory: (cat: string) => void;
  onOpenSearch: () => void;
  onOpenLocation: () => void;
  onOpenAccount: () => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenBenefits: () => void;
  onToggleBuilder?: () => void;
  canEditBuilder?: boolean;
}

export const StorefrontThemeHeader: React.FC<StorefrontThemeHeaderProps> = ({
  variant,
  config,
  logoUrl,
  brandName,
  phone,
  branchName,
  deliveryAddress,
  cartTotal,
  cartUnits,
  customerName,
  showCartButton = true,
  onGoHome,
  onSelectCategory,
  onOpenSearch,
  onOpenLocation,
  onOpenAccount,
  onOpenCart,
  onOpenOrders,
  onOpenBenefits,
  onToggleBuilder,
  canEditBuilder,
}) => {
  const shortLocation = deliveryAddress?.trim() || branchName || 'Ingresa tu ubicación';
  const showSearch = config?.showSearch !== false;
  const showLocation = config?.showLocation !== false;
  const showPhone = config?.showPhone !== false;
  const showAccount = config?.showAccount !== false;
  const showSubBar = config?.showSubBar !== false;
  const showPromosLink = config?.showPromosLink !== false;
  const showReservationsLink = config?.showReservationsLink !== false;
  const showOrdersLink = config?.showOrdersLink !== false;
  const showBenefitsLink = config?.showBenefitsLink !== false;
  const searchPlaceholder = config?.searchPlaceholder?.trim() || 'Buscar pizzas, combos, entradas...';

  // =========================================================================
  // 1. HUT CRIMSON & FLAME GRILL: Buscador central blanco + barra superior sólida
  // =========================================================================
  if (variant === 'hut_crimson' || variant === 'flame_grill') {
    const isCrimson = variant === 'hut_crimson';
    const topBg = config?.bgColor || (isCrimson ? '#C8102E' : '#D62300');
    const topText = config?.textColor || '#ffffff';
    const subBg = config?.subBarBgColor || (isCrimson ? '#ffffff' : '#F5EBDC');
    const subText = config?.subBarTextColor || (isCrimson ? '#27272a' : '#502314');
    const subBorder = isCrimson ? '#e4e4e7' : '#e6d7c3';
    const menuLabel = config?.menuLabel?.trim() || 'Carta';
    const promosLabel = config?.promosLabel?.trim() || 'Promociones';
    const ordersLabel = config?.ordersLabel?.trim() || 'Mis Pedidos';
    const reservationsLabel = config?.reservationsLabel?.trim() || 'Reservas y Ventas Corporativas';
    const loginLabel = config?.loginLabel?.trim() || 'Identifícate';

    return (
      <header className="sticky top-0 z-30 shadow-sm w-full max-w-full overflow-x-clip">
        {/* Main Brand Bar */}
        <div style={{ backgroundColor: topBg, color: topText }} className="px-3 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-2 sm:gap-3">
            {/* Logo */}
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-2 shrink-0 focus:outline-none"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="h-7 sm:h-9 w-auto max-w-[92px] sm:max-w-[140px] object-contain"
                />
              ) : (
                <span className="font-black text-sm sm:text-lg tracking-tight uppercase truncate max-w-[110px] sm:max-w-none">
                  {brandName}
                </span>
              )}
            </button>

            {/* Wide White Pill Search Bar */}
            {showSearch ? (
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex-1 min-w-0 max-w-xl h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-white text-zinc-500 hover:text-zinc-800 flex items-center gap-2 text-xs sm:text-sm font-medium shadow-xs transition-colors"
              >
                <Search className="w-4 h-4 shrink-0 text-zinc-400" />
                <span className="truncate">{searchPlaceholder}</span>
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {/* Right Utility Controls */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {showLocation && (
                <button
                  type="button"
                  onClick={onOpenLocation}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/15 hover:bg-black/25 text-xs font-bold transition-colors max-w-[200px]"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{shortLocation}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
                </button>
              )}

              {showPhone && phone && (
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="hidden xl:flex items-center gap-1.5 text-xs font-bold hover:opacity-90"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="leading-tight">
                    <span className="block text-[10px] font-normal opacity-80">Llámanos</span>
                    {phone}
                  </span>
                </a>
              )}

              {showAccount && (
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-black/15 text-xs font-bold transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-[100px] truncate">{customerName || loginLabel}</span>
                </button>
              )}

              {canEditBuilder && onToggleBuilder && (
                <button
                  type="button"
                  onClick={onToggleBuilder}
                  className="p-2 rounded-full bg-black/15 hover:bg-black/25 transition-colors"
                  title="Abrir Constructor Visual"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}

              {showCartButton && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/20 hover:bg-black/30 text-xs font-black transition-colors whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>S/ {cartTotal.toFixed(2)}</span>
                  {cartUnits > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white text-zinc-950 text-[10px] font-black">
                      {cartUnits}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Navigation Strip */}
        {showSubBar && (
          <div
            style={{ backgroundColor: subBg, color: subText, borderColor: subBorder }}
            className="border-b px-3.5 sm:px-6 lg:px-8 py-2 text-xs font-bold"
          >
            <div className="max-w-[1600px] mx-auto w-full min-w-0 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
              <nav className="flex items-center gap-5 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onSelectCategory('todos')}
                  className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>{menuLabel}</span>
                </button>
                {showPromosLink && (
                  <button
                    type="button"
                    onClick={() => onSelectCategory('combos')}
                    className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{promosLabel}</span>
                  </button>
                )}
                {showOrdersLink && (
                  <button
                    type="button"
                    onClick={onOpenOrders}
                    className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{ordersLabel}</span>
                  </button>
                )}
              </nav>

              {showReservationsLink && (
                <a
                  href="/reservas"
                  className="flex items-center gap-1.5 whitespace-nowrap hover:underline"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>{reservationsLabel}</span>
                </a>
              )}
            </div>
          </div>
        )}
      </header>
    );
  }

  // =========================================================================
  // 2. PAPA FRESH: Cabecera blanca con menú centrado + carrito lima + barra dual
  // =========================================================================
  if (variant === 'papa_fresh') {
    const freshPrimary = config?.accentColor || '#00643C';
    const freshTopBg = config?.bgColor || '#ffffff';
    const freshTopText = config?.textColor || '#18181b';
    const freshSubBg = config?.subBarBgColor || '#fafafa';
    const freshSubText = config?.subBarTextColor || '#3f3f46';
    const menuLabel = config?.menuLabel?.trim() || 'Menú';
    const promosLabel = config?.promosLabel?.trim() || 'Promos Exclusivas';
    const reservationsLabel = config?.reservationsLabel?.trim() || 'Reservas';
    const ordersLabel = config?.ordersLabel?.trim() || 'Sigue tu pedido';
    const benefitsLabel = config?.benefitsLabel?.trim() || 'Beneficios';
    const loginLabel = config?.loginLabel?.trim() || 'Iniciar sesión';

    return (
      <header className="sticky top-0 z-30 shadow-xs w-full max-w-full overflow-x-clip" style={{ backgroundColor: freshTopBg, color: freshTopText }}>
        {/* Top White Nav */}
        <div className="border-b border-zinc-200 px-3 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-2 shrink-0 focus:outline-none"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-7 sm:h-9 w-auto max-w-[115px] sm:max-w-[150px] object-contain" />
              ) : (
                <span style={{ color: freshPrimary }} className="font-black text-sm sm:text-lg tracking-tight uppercase truncate max-w-[140px] sm:max-w-none">
                  {brandName}
                </span>
              )}
            </button>

            <nav className="hidden lg:flex items-center gap-6 text-xs font-extrabold uppercase tracking-wide">
              <button
                type="button"
                onClick={() => onSelectCategory('todos')}
                className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" style={{ color: freshPrimary }} />
                <span>{menuLabel}</span>
              </button>
              {showPromosLink && (
                <button
                  type="button"
                  onClick={() => onSelectCategory('combos')}
                  className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                >
                  <Tag className="w-3.5 h-3.5" style={{ color: freshPrimary }} />
                  <span>{promosLabel}</span>
                </button>
              )}
              {showLocation && (
                <button
                  type="button"
                  onClick={onOpenLocation}
                  className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                >
                  <Store className="w-3.5 h-3.5" style={{ color: freshPrimary }} />
                  <span>Locales</span>
                </button>
              )}
              {showReservationsLink && (
                <a
                  href="/reservas"
                  className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                >
                  <CalendarClock className="w-3.5 h-3.5" style={{ color: freshPrimary }} />
                  <span>{reservationsLabel}</span>
                </a>
              )}
              {showSearch && (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="p-1.5 rounded-full hover:bg-black/5"
                  aria-label="Buscar"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {showSearch && (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="lg:hidden p-2 rounded-full bg-zinc-100 text-zinc-700"
                  aria-label="Buscar"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}

              {showPhone && phone && (
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="hidden xl:flex items-center gap-1.5 text-xs font-bold"
                >
                  <span style={{ backgroundColor: `${freshPrimary}1a`, color: freshPrimary }} className="w-7 h-7 rounded-full flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[10px] opacity-60">Llámanos</span>
                    {phone}
                  </span>
                </a>
              )}

              {showAccount && (
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-black/5 text-xs font-bold"
                >
                  <User className="w-4 h-4" style={{ color: freshPrimary }} />
                  <span className="max-w-[90px] truncate">{customerName || loginLabel}</span>
                </button>
              )}

              {canEditBuilder && onToggleBuilder && (
                <button
                  type="button"
                  onClick={onToggleBuilder}
                  className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  title="Abrir Constructor Visual"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}

              {showCartButton && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#B7E300] hover:bg-[#a6cf00] text-zinc-950 text-xs font-black shadow-xs transition-colors whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>S/ {cartTotal.toFixed(2)}</span>
                  {cartUnits > 0 && (
                    <span style={{ backgroundColor: freshPrimary }} className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-black">
                      {cartUnits}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Utility Location & Store Bar */}
        {showSubBar && (
          <div style={{ backgroundColor: freshSubBg, color: freshSubText }} className="border-b border-zinc-200 px-3.5 sm:px-6 lg:px-8 py-1.5 text-[11px] font-bold">
            <div className="max-w-[1600px] mx-auto w-full min-w-0 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
              {showLocation ? (
                <button
                  type="button"
                  onClick={onOpenLocation}
                  className="flex items-center gap-1.5 whitespace-nowrap hover:opacity-80"
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: freshPrimary }} />
                  <span>¿Dónde estás?</span>
                  <span className="underline">{shortLocation}</span>
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-4 whitespace-nowrap">
                {showBenefitsLink && (
                  <button
                    type="button"
                    onClick={onOpenBenefits}
                    className="hidden sm:flex items-center gap-1 hover:opacity-80"
                  >
                    <Heart className="w-3.5 h-3.5 opacity-60" />
                    <span>{benefitsLabel}</span>
                  </button>
                )}
                {showOrdersLink && (
                  <button
                    type="button"
                    onClick={onOpenOrders}
                    className="flex items-center gap-1 hover:opacity-80"
                  >
                    <Package className="w-3.5 h-3.5 opacity-60" />
                    <span>{ordersLabel}</span>
                  </button>
                )}
                {showLocation && (
                  <button
                    type="button"
                    onClick={onOpenLocation}
                    style={{ backgroundColor: freshPrimary }}
                    className="px-2.5 py-1 rounded-full text-white text-[10px] font-extrabold flex items-center gap-1"
                  >
                    <Store className="w-3 h-3" />
                    <span>Elige tu local</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }

  // =========================================================================
  // 3. ELECTRIC BLUE: Navbar azul profundo + carrito amarillo + píldora amarilla de dirección
  // =========================================================================
  const electricBg = config?.bgColor || '#1C1B9E';
  const electricText = config?.textColor || '#ffffff';
  const electricAccent = config?.accentColor || '#FFC700';
  const electricSubBg = config?.subBarBgColor || '#ffffff';
  const electricSubText = config?.subBarTextColor || '#3f3f46';
  const menuLabel = config?.menuLabel?.trim() || 'Menú';
  const promosLabel = config?.promosLabel?.trim() || 'Promos Exclusivas';
  const benefitsLabel = config?.benefitsLabel?.trim() || 'Programa Lealtad';
  const reservationsLabel = config?.reservationsLabel?.trim() || 'Reservas';
  const ordersLabel = config?.ordersLabel?.trim() || 'Sigue tu pedido';
  const loginLabel = config?.loginLabel?.trim() || 'Iniciar sesión';

  return (
    <header className="sticky top-0 z-30 shadow-sm w-full max-w-full overflow-x-clip">
      <div style={{ backgroundColor: electricBg, color: electricText }} className="px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2 shrink-0 focus:outline-none"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-7 sm:h-9 w-auto max-w-[110px] sm:max-w-[140px] object-contain"
              />
            ) : (
              <span style={{ color: electricAccent }} className="font-black text-sm sm:text-lg tracking-tight uppercase truncate max-w-[140px] sm:max-w-none">
                {brandName}
              </span>
            )}
          </button>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-black uppercase tracking-wide">
            <button
              type="button"
              onClick={() => onSelectCategory('todos')}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" style={{ color: electricAccent }} />
              <span>{menuLabel}</span>
            </button>
            {showPromosLink && (
              <button
                type="button"
                onClick={() => onSelectCategory('combos')}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <Tag className="w-3.5 h-3.5" style={{ color: electricAccent }} />
                <span>{promosLabel}</span>
              </button>
            )}
            {showBenefitsLink && (
              <button
                type="button"
                onClick={onOpenBenefits}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <Award className="w-3.5 h-3.5" style={{ color: electricAccent }} />
                <span>{benefitsLabel}</span>
              </button>
            )}
            {showReservationsLink && (
              <a
                href="/reservas"
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <CalendarClock className="w-3.5 h-3.5" style={{ color: electricAccent }} />
                <span>{reservationsLabel}</span>
              </a>
            )}
            {showSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="p-1.5 rounded-full hover:bg-white/10"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {showSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="lg:hidden p-2 rounded-full bg-white/10 text-white"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {showAccount && (
              <button
                type="button"
                onClick={onOpenAccount}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-white/10 text-xs font-bold"
              >
                <User className="w-4 h-4" style={{ color: electricAccent }} />
                <span className="max-w-[90px] truncate">{customerName || loginLabel}</span>
              </button>
            )}

            {canEditBuilder && onToggleBuilder && (
              <button
                type="button"
                onClick={onToggleBuilder}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                title="Abrir Constructor Visual"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            )}

            {showCartButton && (
              <button
                type="button"
                onClick={onOpenCart}
                style={{ backgroundColor: electricAccent, color: electricBg }}
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:opacity-90 text-xs font-black shadow-xs transition-opacity whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>S/ {cartTotal.toFixed(2)}</span>
                {cartUnits > 0 && (
                  <span style={{ backgroundColor: electricBg, color: '#ffffff' }} className="px-1.5 py-0.5 rounded-full text-[10px] font-black">
                    {cartUnits}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* White Utility Bar with Yellow Location Pill */}
      {showSubBar && (
        <div style={{ backgroundColor: electricSubBg, color: electricSubText }} className="border-b border-zinc-200 px-3.5 sm:px-6 lg:px-8 py-1.5 text-[11px] font-bold">
          <div className="max-w-[1600px] mx-auto w-full min-w-0 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
            {showLocation ? (
              <button
                type="button"
                onClick={onOpenLocation}
                style={{ backgroundColor: electricAccent, color: electricBg }}
                className="px-3 py-1 rounded-full font-black flex items-center gap-1.5 whitespace-nowrap"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>¿Dónde estás? {shortLocation}</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-4 whitespace-nowrap">
              {showOrdersLink && (
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="flex items-center gap-1 hover:opacity-80"
                >
                  <Package className="w-3.5 h-3.5" style={{ color: electricBg }} />
                  <span>{ordersLabel}</span>
                </button>
              )}
              {showLocation && (
                <button
                  type="button"
                  onClick={onOpenLocation}
                  style={{ borderColor: electricBg, color: electricBg }}
                  className="px-3 py-1 rounded-full border hover:opacity-80 transition-opacity flex items-center gap-1 text-[10px] font-black"
                >
                  <Store className="w-3 h-3" />
                  <span>Elige tu local</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
