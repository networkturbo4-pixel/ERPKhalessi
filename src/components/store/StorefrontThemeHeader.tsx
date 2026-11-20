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
import { StoreHeaderVariant } from '../../types/storeBuilder';

export interface StorefrontThemeHeaderProps {
  variant: Exclude<StoreHeaderVariant, 'default'>;
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

  // =========================================================================
  // 1. HUT CRIMSON & FLAME GRILL: Buscador central blanco + barra superior sólida
  // =========================================================================
  if (variant === 'hut_crimson' || variant === 'flame_grill') {
    const isCrimson = variant === 'hut_crimson';
    const topBg = isCrimson ? '#C8102E' : '#D62300';
    const subBg = isCrimson ? '#ffffff' : '#F5EBDC';
    const subText = isCrimson ? '#27272a' : '#502314';
    const subBorder = isCrimson ? '#e4e4e7' : '#e6d7c3';

    return (
      <header className="sticky top-0 z-30 shadow-sm w-full max-w-full overflow-x-clip">
        {/* Main Brand Bar */}
        <div style={{ backgroundColor: topBg }} className="text-white px-3 sm:px-6 lg:px-8 py-2.5">
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
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex-1 min-w-0 max-w-xl h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-white text-zinc-500 hover:text-zinc-800 flex items-center gap-2 text-xs sm:text-sm font-medium shadow-xs transition-colors"
            >
              <Search className="w-4 h-4 shrink-0 text-zinc-400" />
              <span className="truncate">Buscar pizzas, combos, entradas...</span>
            </button>

            {/* Right Utility Controls */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenLocation}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/15 hover:bg-black/25 text-xs font-bold transition-colors max-w-[200px]"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{shortLocation}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
              </button>

              {phone && (
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

              <button
                type="button"
                onClick={onOpenAccount}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-black/15 text-xs font-bold transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="max-w-[100px] truncate">{customerName || 'Identifícate'}</span>
              </button>

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
                <span>Carta</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectCategory('combos')}
                className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Promociones</span>
              </button>
              <button
                type="button"
                onClick={onOpenOrders}
                className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Mis Pedidos</span>
              </button>
            </nav>

            <a
              href="/reservas"
              className="flex items-center gap-1.5 whitespace-nowrap hover:underline"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Reservas y Ventas Corporativas</span>
            </a>
          </div>
        </div>
      </header>
    );
  }

  // =========================================================================
  // 2. PAPA FRESH: Cabecera blanca con menú centrado + carrito lima + barra dual
  // =========================================================================
  if (variant === 'papa_fresh') {
    return (
      <header className="sticky top-0 z-30 bg-white text-zinc-900 shadow-xs w-full max-w-full overflow-x-clip">
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
                <span className="font-black text-sm sm:text-lg tracking-tight text-[#00643C] uppercase truncate max-w-[140px] sm:max-w-none">
                  {brandName}
                </span>
              )}
            </button>

            <nav className="hidden lg:flex items-center gap-6 text-xs font-extrabold uppercase tracking-wide text-zinc-700">
              <button
                type="button"
                onClick={() => onSelectCategory('todos')}
                className="flex items-center gap-1.5 hover:text-[#00643C] transition-colors"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#00643C]" />
                <span>Menú</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectCategory('combos')}
                className="flex items-center gap-1.5 hover:text-[#00643C] transition-colors"
              >
                <Tag className="w-3.5 h-3.5 text-[#00643C]" />
                <span>Promos Exclusivas</span>
              </button>
              <button
                type="button"
                onClick={onOpenLocation}
                className="flex items-center gap-1.5 hover:text-[#00643C] transition-colors"
              >
                <Store className="w-3.5 h-3.5 text-[#00643C]" />
                <span>Locales</span>
              </button>
              <a
                href="/reservas"
                className="flex items-center gap-1.5 hover:text-[#00643C] transition-colors"
              >
                <CalendarClock className="w-3.5 h-3.5 text-[#00643C]" />
                <span>Reservas</span>
              </a>
              <button
                type="button"
                onClick={onOpenSearch}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-600"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenSearch}
                className="lg:hidden p-2 rounded-full bg-zinc-100 text-zinc-700"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>

              {phone && (
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="hidden xl:flex items-center gap-1.5 text-xs font-bold text-zinc-700"
                >
                  <span className="w-7 h-7 rounded-full bg-[#00643C]/10 text-[#00643C] flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[10px] text-zinc-400">Llámanos</span>
                    {phone}
                  </span>
                </a>
              )}

              <button
                type="button"
                onClick={onOpenAccount}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-zinc-100 text-xs font-bold text-zinc-700"
              >
                <User className="w-4 h-4 text-[#00643C]" />
                <span className="max-w-[90px] truncate">{customerName || 'Iniciar sesión'}</span>
              </button>

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
                    <span className="px-1.5 py-0.5 rounded-full bg-[#00643C] text-white text-[10px] font-black">
                      {cartUnits}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Utility Location & Store Bar */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-3.5 sm:px-6 lg:px-8 py-1.5 text-[11px] font-bold text-zinc-700">
          <div className="max-w-[1600px] mx-auto w-full min-w-0 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={onOpenLocation}
              className="flex items-center gap-1.5 whitespace-nowrap hover:text-[#00643C]"
            >
              <MapPin className="w-3.5 h-3.5 text-[#00643C]" />
              <span>¿Dónde estás?</span>
              <span className="underline text-zinc-950">{shortLocation}</span>
            </button>

            <div className="flex items-center gap-4 whitespace-nowrap">
              <button
                type="button"
                onClick={onOpenBenefits}
                className="hidden sm:flex items-center gap-1 hover:text-[#00643C]"
              >
                <Heart className="w-3.5 h-3.5 text-zinc-400" />
                <span>Beneficios</span>
              </button>
              <button
                type="button"
                onClick={onOpenOrders}
                className="flex items-center gap-1 hover:text-[#00643C]"
              >
                <Package className="w-3.5 h-3.5 text-zinc-400" />
                <span>Sigue tu pedido</span>
              </button>
              <button
                type="button"
                onClick={onOpenLocation}
                className="px-2.5 py-1 rounded-full bg-[#00643C] text-white text-[10px] font-extrabold flex items-center gap-1"
              >
                <Store className="w-3 h-3" />
                <span>Elige tu local</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // =========================================================================
  // 3. ELECTRIC BLUE: Navbar azul profundo + carrito amarillo + píldora amarilla de dirección
  // =========================================================================
  return (
    <header className="sticky top-0 z-30 shadow-sm w-full max-w-full overflow-x-clip">
      <div className="bg-[#1C1B9E] text-white px-3 sm:px-6 lg:px-8 py-2.5">
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
              <span className="font-black text-sm sm:text-lg tracking-tight uppercase text-[#FFC700] truncate max-w-[140px] sm:max-w-none">
                {brandName}
              </span>
            )}
          </button>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-black uppercase tracking-wide">
            <button
              type="button"
              onClick={() => onSelectCategory('todos')}
              className="flex items-center gap-1.5 hover:text-[#FFC700] transition-colors"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Menú</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectCategory('combos')}
              className="flex items-center gap-1.5 hover:text-[#FFC700] transition-colors"
            >
              <Tag className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Promos Exclusivas</span>
            </button>
            <button
              type="button"
              onClick={onOpenBenefits}
              className="flex items-center gap-1.5 hover:text-[#FFC700] transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Programa Lealtad</span>
            </button>
            <a
              href="/reservas"
              className="flex items-center gap-1.5 hover:text-[#FFC700] transition-colors"
            >
              <CalendarClock className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Reservas</span>
            </a>
            <button
              type="button"
              onClick={onOpenSearch}
              className="p-1.5 rounded-full hover:bg-white/10"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              className="lg:hidden p-2 rounded-full bg-white/10 text-white"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenAccount}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-white/10 text-xs font-bold"
            >
              <User className="w-4 h-4 text-[#FFC700]" />
              <span className="max-w-[90px] truncate">{customerName || 'Iniciar sesión'}</span>
            </button>

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
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFC700] hover:bg-[#eab600] text-[#1C1B9E] text-xs font-black shadow-xs transition-colors whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>S/ {cartTotal.toFixed(2)}</span>
                {cartUnits > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#1C1B9E] text-white text-[10px] font-black">
                    {cartUnits}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* White Utility Bar with Yellow Location Pill */}
      <div className="bg-white border-b border-zinc-200 px-3.5 sm:px-6 lg:px-8 py-1.5 text-[11px] font-bold text-zinc-700">
        <div className="max-w-[1600px] mx-auto w-full min-w-0 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={onOpenLocation}
            className="px-3 py-1 rounded-full bg-[#FFC700] text-[#1C1B9E] font-black flex items-center gap-1.5 whitespace-nowrap"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>¿Dónde estás? {shortLocation}</span>
          </button>

          <div className="flex items-center gap-4 whitespace-nowrap">
            <button
              type="button"
              onClick={onOpenOrders}
              className="flex items-center gap-1 text-zinc-700 hover:text-[#1C1B9E]"
            >
              <Package className="w-3.5 h-3.5 text-[#1C1B9E]" />
              <span>Sigue tu pedido</span>
            </button>
            <button
              type="button"
              onClick={onOpenLocation}
              className="px-3 py-1 rounded-full border border-[#1C1B9E] text-[#1C1B9E] hover:bg-[#1C1B9E] hover:text-white transition-colors flex items-center gap-1 text-[10px] font-black"
            >
              <Store className="w-3 h-3" />
              <span>Elige tu local</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
