import React, { useEffect, useState } from 'react';
import {
  Award,
  CalendarClock,
  ChevronDown,
  Flame,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Truck,
  User,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  BuilderViewport,
  CustomPage,
  HeaderNavItem,
  HeaderWidget,
  isBlockVisibleOnViewport,
} from '../../types/storeBuilder';
import { SeasonalLogoBadge } from '../common/SeasonalOverlay';

export interface HeaderRuntimeContext {
  viewport: BuilderViewport;
  accentColor: string;
  logoUrl?: string;
  collapsedLogo?: string;
  brandName: string;
  phone?: string;
  whatsapp?: string;
  branchName: string;
  deliveryAddress?: string;
  etaLabel?: string;
  scheduleLabel?: string;
  isStoreOpen?: boolean;
  qrTableName?: string;
  cartTotal: number;
  cartUnits: number;
  customerName?: string;
  showCartButton?: boolean;
  publishedNavPages: CustomPage[];
  canEditBuilder?: boolean;
  isBuilderEditing?: boolean;
  selectedWidgetId?: string | null;
  onSelectWidget?: (widgetId: string) => void;
  onGoHome: () => void;
  onSelectCategory?: (cat: string) => void;
  onOpenSearch?: () => void;
  onOpenLocation?: () => void;
  onOpenAccount?: () => void;
  onOpenCart?: () => void;
  onOpenOrders?: () => void;
  onOpenBenefits?: () => void;
  onOpenReservations?: () => void;
  onOpenMobileDrawer: () => void;
  onToggleBuilder?: () => void;
}

const AnnouncementWidgetView: React.FC<{
  widget: Extract<HeaderWidget, { type: 'header_announcement' }>;
  accentColor: string;
  isBuilderEditing?: boolean;
}> = ({ widget, accentColor, isBuilderEditing }) => {
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const messages = widget.messages.filter(m => m.trim().length > 0);
  const safeMessages = messages.length > 0 ? messages : ['Bienvenido a nuestra tienda oficial'];

  useEffect(() => {
    if (safeMessages.length <= 1) return;
    const ms = Math.max(2, widget.rotateSeconds || 5) * 1000;
    const timer = window.setInterval(() => {
      setIdx(prev => (prev + 1) % safeMessages.length);
    }, ms);
    return () => window.clearInterval(timer);
  }, [safeMessages.length, widget.rotateSeconds]);

  if (dismissed && !isBuilderEditing) return null;

  const currentText = safeMessages[idx % safeMessages.length];
  const IconEl =
    widget.icon === 'flame'
      ? Flame
      : widget.icon === 'truck'
      ? Truck
      : widget.icon === 'tag'
      ? Tag
      : widget.icon === 'sparkles'
      ? Sparkles
      : null;

  return (
    <div
      style={{
        backgroundColor: widget.bgColor || undefined,
        borderColor: widget.borderColor || undefined,
        color: widget.textColor || undefined,
      }}
      className={`flex items-center gap-2 text-[11px] sm:text-xs font-semibold min-w-0 ${
        widget.bgColor || widget.borderColor ? 'px-2.5 py-1 rounded-full border' : ''
      }`}
    >
      {IconEl && (
        <IconEl
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: widget.accentColor || accentColor }}
        />
      )}
      <span className="truncate">{currentText}</span>
      {widget.ctaLabel?.trim() && widget.ctaUrl?.trim() && (
        <a
          href={widget.ctaUrl}
          onClick={e => {
            if (isBuilderEditing) e.preventDefault();
          }}
          style={{
            backgroundColor: widget.ctaBgColor || undefined,
            color: widget.ctaTextColor || widget.accentColor || accentColor,
          }}
          className={
            widget.ctaBgColor
              ? 'px-2 py-0.5 rounded-full font-black whitespace-nowrap shrink-0 hover:opacity-90'
              : 'underline underline-offset-2 font-black whitespace-nowrap shrink-0 hover:opacity-80'
          }
        >
          {widget.ctaLabel}
        </a>
      )}
      {widget.dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar anuncio"
          className="p-0.5 rounded hover:bg-white/10 shrink-0 opacity-75 hover:opacity-100"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export const HeaderWidgetRenderer: React.FC<{
  widget: HeaderWidget;
  ctx: HeaderRuntimeContext;
}> = ({ widget, ctx }) => {
  if (widget.isHidden && !ctx.isBuilderEditing) return null;
  if (!isBlockVisibleOnViewport(widget, ctx.viewport)) {
    return null;
  }

  const isSelected = Boolean(ctx.isBuilderEditing && ctx.selectedWidgetId === widget.id);

  const handleBuilderClick = (e: React.MouseEvent) => {
    if (!ctx.isBuilderEditing || !ctx.onSelectWidget) return;
    e.preventDefault();
    e.stopPropagation();
    ctx.onSelectWidget(widget.id);
  };

  const wrap = (content: React.ReactNode, extraClass = '') => {
    if (!ctx.isBuilderEditing) {
      return <div className={`shrink-0 ${extraClass}`}>{content}</div>;
    }
    return (
      <div
        onClick={handleBuilderClick}
        title="Clic para editar este widget de cabecera"
        className={`relative shrink-0 cursor-pointer rounded-lg transition-all ${extraClass} ${
          widget.isHidden ? 'opacity-40' : ''
        } ${
          isSelected
            ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-zinc-950'
            : 'hover:ring-1 hover:ring-amber-400/60'
        }`}
      >
        {content}
      </div>
    );
  };

  const handleNavAction = (item: HeaderNavItem) => {
    if (ctx.isBuilderEditing) return;
    switch (item.actionType) {
      case 'home':
        ctx.onGoHome();
        break;
      case 'category':
        if (ctx.onSelectCategory) ctx.onSelectCategory(item.targetValue || 'todos');
        else ctx.onGoHome();
        break;
      case 'promos':
        if (ctx.onSelectCategory) ctx.onSelectCategory('combos');
        else ctx.onGoHome();
        break;
      case 'reservations':
        if (ctx.onOpenReservations) ctx.onOpenReservations();
        else window.location.assign('/reservas');
        break;
      case 'orders':
        ctx.onOpenOrders?.();
        break;
      case 'benefits':
        ctx.onOpenBenefits?.();
        break;
      case 'custom_page':
        if (item.targetValue) {
          window.location.assign(`/p/${item.targetValue.replace(/^\/p\//, '')}`);
        }
        break;
      case 'url':
        if (item.targetValue) {
          if (item.openInNewTab) {
            window.open(item.targetValue, '_blank', 'noopener,noreferrer');
          } else {
            window.location.assign(item.targetValue);
          }
        }
        break;
    }
  };

  switch (widget.type) {
    case 'header_logo': {
      const logoSrc = widget.customLogoUrl?.trim() || ctx.logoUrl;
      const heightPx =
        ctx.viewport === 'mobile'
          ? widget.heightMobile
          : ctx.viewport === 'tablet'
          ? widget.heightTablet
          : widget.heightDesktop;
      const label = widget.customBrandText?.trim() || ctx.brandName;

      return wrap(
        <button
          type="button"
          onClick={() => !ctx.isBuilderEditing && ctx.onGoHome()}
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`flex items-center gap-2 text-left focus:outline-none active:scale-95 transition-transform ${
            widget.bgColor || widget.borderColor ? 'px-2.5 py-1 rounded-xl border' : ''
          }`}
        >
          {logoSrc ? (
            <div className="relative inline-flex items-center">
              <img
                src={logoSrc}
                alt={label}
                style={{ height: `${heightPx}px` }}
                className="w-auto max-w-[180px] object-contain"
              />
              {widget.showSeasonalBadge && <SeasonalLogoBadge />}
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              <span
                style={{ backgroundColor: widget.badgeBgColor || ctx.accentColor }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-base shadow-xs"
              >
                {ctx.collapsedLogo || '🍕'}
              </span>
              {widget.showBrandText && (
                <span className="font-black text-sm sm:text-base tracking-tight whitespace-nowrap">
                  {label}
                </span>
              )}
              {widget.showSeasonalBadge && <SeasonalLogoBadge />}
            </div>
          )}
          {logoSrc && widget.showBrandText && widget.customBrandText?.trim() && (
            <span className="font-black text-sm tracking-tight whitespace-nowrap">{label}</span>
          )}
        </button>
      );
    }

    case 'header_nav_menu': {
      const autoPages: HeaderNavItem[] = widget.includePublishedPages
        ? ctx.publishedNavPages
            .filter(p => p.status === 'published' && p.showInStoreNav)
            .map(p => ({
              id: `auto-page-${p.id}`,
              label: p.navLabel?.trim() || p.title,
              actionType: 'custom_page' as const,
              targetValue: p.slug,
            }))
        : [];
      const allItems = [...widget.items, ...autoPages];

      return wrap(
        <nav
          aria-label="Navegación principal"
          style={{ gap: `${widget.gapPx || 16}px` }}
          className="flex items-center flex-nowrap overflow-x-auto no-scrollbar"
        >
          {allItems.map(item => {
            const pillClass =
              widget.style === 'pills'
                ? item.highlight
                  ? 'px-3 py-1.5 rounded-full font-extrabold'
                  : 'px-3 py-1.5 rounded-full hover:bg-current/10 font-bold'
                : widget.style === 'underline'
                ? 'py-1 border-b-2 border-transparent hover:border-current font-bold'
                : 'font-bold hover:opacity-80';

            const bgForItem =
              widget.style === 'pills'
                ? item.highlight
                  ? widget.activeBgColor || 'rgba(245, 158, 11, 0.2)'
                  : widget.pillBgColor || undefined
                : item.highlight && widget.activeBgColor
                ? widget.activeBgColor
                : undefined;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavAction(item)}
                style={{
                  fontSize: `${widget.fontSizePx || 13}px`,
                  backgroundColor: bgForItem,
                  borderColor: widget.borderColor || undefined,
                  color: item.highlight
                    ? widget.activeColor || ctx.accentColor
                    : widget.textColor || undefined,
                }}
                className={`whitespace-nowrap shrink-0 transition-all ${pillClass} ${
                  widget.borderColor && widget.style === 'pills' ? 'border' : ''
                } ${item.highlight && widget.activeBgColor && widget.style !== 'pills' ? 'px-2.5 py-1 rounded-full' : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      );
    }

    case 'header_search': {
      if (widget.style === 'icon_only') {
        return wrap(
          <button
            type="button"
            onClick={() => !ctx.isBuilderEditing && ctx.onOpenSearch?.()}
            aria-label="Buscar productos"
            style={{
              backgroundColor: widget.bgColor || undefined,
              borderColor: widget.borderColor || undefined,
              color: widget.textColor || undefined,
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors ${
              widget.borderColor ? 'border' : ''
            }`}
          >
            <Search className="w-4 h-4" style={{ color: widget.iconColor || undefined }} />
          </button>
        );
      }

      const styleClasses =
        widget.style === 'pill_white'
          ? 'bg-white text-zinc-600 shadow-xs hover:text-zinc-900'
          : widget.style === 'glass'
          ? 'bg-white/15 backdrop-blur-md border border-white/20 text-current hover:bg-white/20'
          : 'bg-transparent border border-current/25 text-current hover:border-current/45';

      return wrap(
        <button
          type="button"
          onClick={() => !ctx.isBuilderEditing && ctx.onOpenSearch?.()}
          style={{
            maxWidth: `${widget.maxWidthPx || 420}px`,
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`w-full min-w-[150px] sm:min-w-[220px] h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-medium transition-colors ${styleClasses} ${
            widget.borderColor ? 'border' : ''
          }`}
        >
          <Search
            className="w-3.5 h-3.5 shrink-0 opacity-80"
            style={{ color: widget.iconColor || undefined }}
          />
          <span className="truncate">{widget.placeholder || 'Buscar...'}</span>
        </button>,
        'flex-1 max-w-md'
      );
    }

    case 'header_location': {
      const displayLocation =
        widget.labelOverride?.trim() ||
        ctx.deliveryAddress?.trim() ||
        ctx.branchName ||
        'Elegir ubicación';

      if (ctx.qrTableName) {
        return wrap(
          <div
            style={{
              backgroundColor: widget.badgeBgColor || undefined,
              borderColor: widget.borderColor || undefined,
              color: widget.badgeTextColor || widget.textColor || undefined,
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              !widget.badgeBgColor ? 'bg-amber-500/15 border-amber-500/40' : ''
            }`}
          >
            <UtensilsCrossed
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: widget.iconColor || '#f59e0b' }}
            />
            <span className="whitespace-nowrap">Mesa {ctx.qrTableName}</span>
          </div>
        );
      }

      if (widget.style === 'minimal_icon') {
        return wrap(
          <button
            type="button"
            onClick={() => !ctx.isBuilderEditing && ctx.onOpenLocation?.()}
            aria-label="Cambiar ubicación"
            style={{
              backgroundColor: widget.bgColor || undefined,
              borderColor: widget.borderColor || undefined,
              color: widget.textColor || undefined,
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors ${
              widget.borderColor ? 'border' : ''
            }`}
            title={displayLocation}
          >
            <MapPin className="w-4 h-4" style={{ color: widget.iconColor || undefined }} />
          </button>
        );
      }

      if (widget.style === 'card_eta') {
        return wrap(
          <button
            type="button"
            onClick={() => !ctx.isBuilderEditing && ctx.onOpenLocation?.()}
            style={{
              backgroundColor: widget.bgColor || undefined,
              borderColor: widget.borderColor || undefined,
              color: widget.textColor || undefined,
            }}
            className="flex flex-col justify-center text-left px-3 py-1 rounded-xl border border-current/15 bg-current/[0.04] hover:bg-current/[0.08] transition-colors max-w-[240px]"
          >
            <span className="text-[10px] font-bold opacity-80 flex items-center gap-1 whitespace-nowrap">
              <span>Entrega en</span>
              {widget.showEta && ctx.etaLabel && (
                <span
                  style={{
                    backgroundColor: widget.badgeBgColor || undefined,
                    color: widget.badgeTextColor || '#10b981',
                  }}
                  className={`font-black ${widget.badgeBgColor ? 'px-1.5 py-0.5 rounded-full' : ''}`}
                >
                  · {ctx.etaLabel}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 text-xs font-extrabold min-w-0">
              <MapPin
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: widget.iconColor || ctx.accentColor }}
              />
              <span className="truncate">{displayLocation}</span>
              <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
            </span>
          </button>
        );
      }

      return wrap(
        <button
          type="button"
          onClick={() => !ctx.isBuilderEditing && ctx.onOpenLocation?.()}
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/10 hover:bg-black/15 text-xs font-bold transition-colors max-w-[210px] ${
            widget.borderColor ? 'border' : ''
          }`}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: widget.iconColor || undefined }} />
          <span className="truncate">{displayLocation}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-75" />
        </button>
      );
    }

    case 'header_cart': {
      if (ctx.showCartButton === false && !ctx.isBuilderEditing) return null;

      const bg = widget.bgColor || ctx.accentColor;
      const fg = widget.textColor || '#ffffff';

      if (widget.style === 'icon_badge') {
        return wrap(
          <button
            type="button"
            onClick={() => !ctx.isBuilderEditing && ctx.onOpenCart?.()}
            aria-label="Abrir carrito"
            style={{
              backgroundColor: bg,
              color: fg,
              borderColor: widget.borderColor || undefined,
            }}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-xs hover:opacity-90 transition-opacity ${
              widget.borderColor ? 'border' : ''
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            {widget.showItemCount && ctx.cartUnits > 0 && (
              <span
                style={{
                  backgroundColor: widget.badgeBgColor || '#ffffff',
                  color: widget.badgeTextColor || '#09090b',
                }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow"
              >
                {ctx.cartUnits}
              </span>
            )}
          </button>
        );
      }

      return wrap(
        <button
          type="button"
          onClick={() => !ctx.isBuilderEditing && ctx.onOpenCart?.()}
          style={{
            backgroundColor: bg,
            color: fg,
            borderColor: widget.borderColor || undefined,
          }}
          className={`flex items-center gap-2 rounded-full font-black transition-opacity hover:opacity-90 whitespace-nowrap ${
            widget.borderColor ? 'border' : ''
          } ${
            widget.style === 'compact' ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs shadow-xs'
          }`}
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          {widget.showTotalAmount && <span>S/ {ctx.cartTotal.toFixed(2)}</span>}
          {widget.showItemCount && (
            <span
              style={{
                backgroundColor: widget.badgeBgColor || '#ffffff',
                color: widget.badgeTextColor || '#09090b',
              }}
              className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
            >
              {ctx.cartUnits}
            </span>
          )}
        </button>
      );
    }

    case 'header_account': {
      const label =
        widget.showCustomerName && ctx.customerName ? ctx.customerName : widget.loginLabel || 'Ingresar';

      if (widget.style === 'icon_only') {
        return wrap(
          <button
            type="button"
            onClick={() => !ctx.isBuilderEditing && ctx.onOpenAccount?.()}
            aria-label={label}
            style={{
              backgroundColor: widget.bgColor || undefined,
              borderColor: widget.borderColor || undefined,
              color: widget.textColor || undefined,
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors ${
              widget.borderColor ? 'border' : ''
            }`}
            title={label}
          >
            <User className="w-4 h-4" style={{ color: widget.iconColor || undefined }} />
          </button>
        );
      }

      return wrap(
        <button
          type="button"
          onClick={() => !ctx.isBuilderEditing && ctx.onOpenAccount?.()}
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
            widget.borderColor ? 'border' : ''
          } ${
            widget.style === 'pill'
              ? 'px-3 py-1.5 rounded-full bg-current/10 hover:bg-current/15'
              : 'px-2 py-1.5 rounded-lg hover:bg-current/10'
          }`}
        >
          <User className="w-4 h-4 shrink-0" style={{ color: widget.iconColor || undefined }} />
          <span className="max-w-[110px] truncate">{label}</span>
        </button>
      );
    }

    case 'header_announcement':
      return wrap(
        <AnnouncementWidgetView
          widget={widget}
          accentColor={ctx.accentColor}
          isBuilderEditing={ctx.isBuilderEditing}
        />,
        'min-w-0'
      );

    case 'header_mobile_trigger':
      return wrap(
        <button
          type="button"
          onClick={() => !ctx.isBuilderEditing && ctx.onOpenMobileDrawer()}
          aria-label="Abrir menú móvil"
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`${widget.borderColor ? 'border ' : ''}${
            widget.style === 'pill'
              ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-current/10 hover:bg-current/15 text-xs font-bold'
              : 'w-9 h-9 rounded-xl flex items-center justify-center hover:bg-current/10 transition-colors'
          }`}
        >
          <Menu className="w-5 h-5" />
          {widget.style === 'pill' && <span>{widget.label || 'Menú'}</span>}
        </button>
      );

    case 'header_open_status': {
      const open = ctx.isStoreOpen !== false;
      const hoursText =
        widget.showHours && ctx.scheduleLabel?.trim()
          ? `· ${ctx.scheduleLabel.trim()}`
          : '';
      const customBg = open ? widget.openBgColor : widget.closedBgColor;
      const customText = open ? widget.openTextColor : widget.closedTextColor;
      const dotColor = customText || (open ? '#10b981' : '#f43f5e');
      return wrap(
        <div
          style={{
            backgroundColor: customBg || undefined,
            color: customText || undefined,
            borderColor: widget.borderColor || undefined,
          }}
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap ${
            widget.style === 'pill'
              ? customBg || customText
                ? 'px-2.5 py-1 rounded-full border'
                : open
                ? 'px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                : 'px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30'
              : ''
          }`}
        >
          <span
            style={{ backgroundColor: dotColor }}
            className={`w-2 h-2 rounded-full shrink-0 ${open ? 'animate-pulse' : ''}`}
          />
          <span>{open ? widget.openLabel || 'Abierto' : widget.closedLabel || 'Cerrado'}</span>
          {hoursText && <span className="opacity-75 font-medium">{hoursText}</span>}
        </div>
      );
    }

    case 'header_contact': {
      const rawNumber =
        widget.customNumber?.trim() ||
        (widget.mode === 'whatsapp' ? ctx.whatsapp || ctx.phone : ctx.phone) ||
        '';
      if (!rawNumber && !ctx.isBuilderEditing) return null;
      const cleanDigits = rawNumber.replace(/[^\d+]/g, '');
      const href =
        widget.mode === 'whatsapp'
          ? `https://wa.me/${cleanDigits.replace(/^\+/, '')}${
              widget.whatsappMessage
                ? `?text=${encodeURIComponent(widget.whatsappMessage)}`
                : ''
            }`
          : `tel:${cleanDigits}`;

      return wrap(
        <a
          href={href}
          target={widget.mode === 'whatsapp' ? '_blank' : undefined}
          rel={widget.mode === 'whatsapp' ? 'noopener noreferrer' : undefined}
          onClick={e => {
            if (ctx.isBuilderEditing) e.preventDefault();
          }}
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`flex items-center gap-1.5 text-xs font-bold whitespace-nowrap transition-opacity hover:opacity-85 ${
            widget.borderColor ? 'border ' : ''
          }${
            widget.style === 'pill'
              ? 'px-3 py-1.5 rounded-full bg-current/10'
              : ''
          }`}
        >
          {widget.mode === 'whatsapp' ? (
            <MessageCircle
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: widget.iconColor || '#10b981' }}
            />
          ) : (
            <Phone
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: widget.iconColor || undefined }}
            />
          )}
          <span className="leading-tight">
            {widget.topLabel?.trim() && (
              <span className="block text-[9px] font-medium opacity-75">{widget.topLabel}</span>
            )}
            <span>{rawNumber || 'Configurar número'}</span>
          </span>
        </a>
      );
    }

    case 'header_quick_actions': {
      const btnStyle: React.CSSProperties = {
        backgroundColor: widget.bgColor || undefined,
        borderColor: widget.borderColor || undefined,
        color: widget.textColor || undefined,
      };
      const iconStyle: React.CSSProperties = {
        color: widget.iconColor || undefined,
      };
      const btnCls =
        widget.style === 'pills'
          ? `px-2.5 py-1.5 rounded-full bg-current/10 hover:bg-current/15 text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap ${
              widget.borderColor ? 'border' : ''
            }`
          : `w-9 h-9 rounded-full hover:bg-current/10 flex items-center justify-center transition-colors ${
              widget.borderColor ? 'border' : ''
            }`;

      return wrap(
        <div
          style={{ color: widget.textColor || undefined }}
          className="flex items-center gap-1"
        >
          {widget.showOrders && ctx.onOpenOrders && (
            <button
              type="button"
              onClick={() => !ctx.isBuilderEditing && ctx.onOpenOrders?.()}
              style={btnStyle}
              className={btnCls}
              title="Mis Pedidos"
            >
              <Package className="w-4 h-4" style={iconStyle} />
              {widget.style === 'pills' && <span>Pedidos</span>}
            </button>
          )}
          {widget.showBenefits && ctx.onOpenBenefits && (
            <button
              type="button"
              onClick={() => !ctx.isBuilderEditing && ctx.onOpenBenefits?.()}
              style={btnStyle}
              className={btnCls}
              title="Beneficios y Puntos"
            >
              <Award className="w-4 h-4" style={iconStyle} />
              {widget.style === 'pills' && <span>Club</span>}
            </button>
          )}
          {widget.showReservations && (
            <button
              type="button"
              onClick={() => {
                if (ctx.isBuilderEditing) return;
                if (ctx.onOpenReservations) ctx.onOpenReservations();
                else window.location.assign('/reservas');
              }}
              style={btnStyle}
              className={btnCls}
              title="Reservas"
            >
              <CalendarClock className="w-4 h-4" style={iconStyle} />
              {widget.style === 'pills' && <span>Reservas</span>}
            </button>
          )}
          {widget.showBuilderShortcut && ctx.canEditBuilder && ctx.onToggleBuilder && (
            <button
              type="button"
              onClick={() => ctx.onToggleBuilder?.()}
              style={btnStyle}
              className={btnCls}
              title="Abrir Constructor Visual"
            >
              <SlidersHorizontal className="w-4 h-4" style={iconStyle} />
              {widget.style === 'pills' && <span>Editar</span>}
            </button>
          )}
        </div>
      );
    }

    case 'header_divider': {
      if (widget.mode === 'flex_spacer') {
        return wrap(
          <div className={ctx.isBuilderEditing ? 'min-w-[28px] h-5 border border-dashed border-amber-400/50 rounded' : ''} />,
          'flex-1'
        );
      }
      return wrap(
        <span
          aria-hidden="true"
          style={{
            height: `${widget.heightPx || 22}px`,
            width: `${widget.widthPx || 1}px`,
            backgroundColor: widget.color || 'currentColor',
            opacity: widget.color ? 1 : 0.2,
          }}
          className="block rounded-full"
        />
      );
    }
  }
};
