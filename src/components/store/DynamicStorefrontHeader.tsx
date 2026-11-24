import React, { useMemo, useState } from 'react';
import { MapPin, Phone, Search, User, X } from 'lucide-react';
import {
  BuilderViewport,
  CustomPage,
  HeaderNavItem,
  HeaderRowId,
  HeaderZoneId,
  StoreHeaderTemplate,
} from '../../types/storeBuilder';
import { HeaderRuntimeContext, HeaderWidgetRenderer } from './StorefrontHeaderWidgets';

export interface DynamicStorefrontHeaderProps {
  header: StoreHeaderTemplate;
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
  selectedRow?: HeaderRowId;
  selectedZone?: HeaderZoneId;
  onSelectWidget?: (widgetId: string) => void;
  onSelectZone?: (row: HeaderRowId, zone: HeaderZoneId) => void;
  onGoHome: () => void;
  onSelectCategory?: (cat: string) => void;
  onOpenSearch?: () => void;
  onOpenLocation?: () => void;
  onOpenAccount?: () => void;
  onOpenCart?: () => void;
  onOpenOrders?: () => void;
  onOpenBenefits?: () => void;
  onOpenReservations?: () => void;
  onToggleBuilder?: () => void;
}

const ROW_LABELS: Record<HeaderRowId, string> = {
  top: 'Top Bar',
  main: 'Barra Principal',
  sub: 'Sub Barra',
};

const ZONE_LABELS: Record<HeaderZoneId, string> = {
  left: 'Izq',
  center: 'Centro',
  right: 'Der',
};

export const DynamicStorefrontHeader: React.FC<DynamicStorefrontHeaderProps> = ({
  header,
  viewport,
  accentColor,
  logoUrl,
  collapsedLogo,
  brandName,
  phone,
  whatsapp,
  branchName,
  deliveryAddress,
  etaLabel,
  scheduleLabel,
  isStoreOpen,
  qrTableName,
  cartTotal,
  cartUnits,
  customerName,
  showCartButton = true,
  publishedNavPages,
  canEditBuilder,
  isBuilderEditing,
  selectedWidgetId,
  selectedRow,
  selectedZone,
  onSelectWidget,
  onSelectZone,
  onGoHome,
  onSelectCategory,
  onOpenSearch,
  onOpenLocation,
  onOpenAccount,
  onOpenCart,
  onOpenOrders,
  onOpenBenefits,
  onOpenReservations,
  onToggleBuilder,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const runtimeCtx: HeaderRuntimeContext = useMemo(
    () => ({
      viewport,
      accentColor,
      logoUrl,
      collapsedLogo,
      brandName,
      phone,
      whatsapp,
      branchName,
      deliveryAddress,
      etaLabel,
      scheduleLabel,
      isStoreOpen,
      qrTableName,
      cartTotal,
      cartUnits,
      customerName,
      showCartButton,
      publishedNavPages,
      canEditBuilder,
      isBuilderEditing,
      selectedWidgetId,
      onSelectWidget,
      onGoHome,
      onSelectCategory,
      onOpenSearch,
      onOpenLocation,
      onOpenAccount,
      onOpenCart,
      onOpenOrders,
      onOpenBenefits,
      onOpenReservations,
      onOpenMobileDrawer: () => setDrawerOpen(true),
      onToggleBuilder,
    }),
    [
      viewport,
      accentColor,
      logoUrl,
      collapsedLogo,
      brandName,
      phone,
      whatsapp,
      branchName,
      deliveryAddress,
      etaLabel,
      scheduleLabel,
      isStoreOpen,
      qrTableName,
      cartTotal,
      cartUnits,
      customerName,
      showCartButton,
      publishedNavPages,
      canEditBuilder,
      isBuilderEditing,
      selectedWidgetId,
      onSelectWidget,
      onGoHome,
      onSelectCategory,
      onOpenSearch,
      onOpenLocation,
      onOpenAccount,
      onOpenCart,
      onOpenOrders,
      onOpenBenefits,
      onOpenReservations,
      onToggleBuilder,
    ]
  );

  // Collect all nav items from any header_nav_menu widget for the Mobile Drawer
  const drawerNavItems = useMemo(() => {
    const items: HeaderNavItem[] = [];
    (['top', 'main', 'sub'] as HeaderRowId[]).forEach(rId => {
      const row = header.rows[rId];
      if (!row.enabled) return;
      (['left', 'center', 'right'] as HeaderZoneId[]).forEach(zId => {
        row.zones[zId].forEach(w => {
          if (w.type === 'header_nav_menu' && !w.isHidden) {
            items.push(...w.items);
          }
        });
      });
    });
    if (items.length === 0) {
      items.push(
        { id: 'def-home', label: 'Carta', actionType: 'home' },
        { id: 'def-promos', label: 'Promociones', actionType: 'promos', highlight: true },
        { id: 'def-res', label: 'Reservas', actionType: 'reservations' }
      );
    }
    return items;
  }, [header]);

  const handleDrawerNav = (item: HeaderNavItem) => {
    setDrawerOpen(false);
    switch (item.actionType) {
      case 'home':
        onGoHome();
        break;
      case 'category':
        onSelectCategory ? onSelectCategory(item.targetValue || 'todos') : onGoHome();
        break;
      case 'promos':
        onSelectCategory ? onSelectCategory('combos') : onGoHome();
        break;
      case 'reservations':
        onOpenReservations ? onOpenReservations() : window.location.assign('/reservas');
        break;
      case 'orders':
        onOpenOrders?.();
        break;
      case 'benefits':
        onOpenBenefits?.();
        break;
      case 'custom_page':
        if (item.targetValue) window.location.assign(`/p/${item.targetValue.replace(/^\/p\//, '')}`);
        break;
      case 'url':
        if (item.targetValue) {
          item.openInNewTab
            ? window.open(item.targetValue, '_blank', 'noopener,noreferrer')
            : window.location.assign(item.targetValue);
        }
        break;
    }
  };

  const isAnySticky =
    header.rows.main.sticky !== false || header.rows.top.sticky || header.rows.sub.sticky;

  const renderRow = (rowId: HeaderRowId) => {
    const row = header.rows[rowId];
    if (!row.enabled) return null;

    const hasCenter = row.zones.center.length > 0 || isBuilderEditing;
    const hexToRgba = (hex: string, alpha: number) => {
      const clean = (hex || '#111318').replace('#', '').trim();
      if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return (
      <div
        key={rowId}
        style={{
          backgroundColor: row.blurGlass ? hexToRgba(row.bgColor, 0.82) : row.bgColor,
          color: row.textColor,
          borderBottomColor: row.showBorderBottom ? row.borderColor || 'rgba(128,128,128,0.2)' : 'transparent',
          minHeight: `${row.heightPx || 56}px`,
          paddingLeft: `${row.paddingX ?? 16}px`,
          paddingRight: `${row.paddingX ?? 16}px`,
        }}
        className={`w-full transition-colors ${row.showBorderBottom ? 'border-b' : ''} ${
          row.blurGlass ? 'backdrop-blur-md' : ''
        } ${isBuilderEditing ? 'relative group/row' : ''}`}
      >
        <div
          style={{
            maxWidth: row.maxWidth === '100%' ? '100%' : row.maxWidth || '1600px',
            minHeight: `${row.heightPx || 56}px`,
          }}
          className="mx-auto w-full flex items-center justify-between gap-2 sm:gap-3 py-1.5"
        >
          {(['left', 'center', 'right'] as HeaderZoneId[]).map(zoneId => {
            if (zoneId === 'center' && !hasCenter) return null;
            const widgets = row.zones[zoneId];
            const isZoneSelected =
              isBuilderEditing && selectedRow === rowId && selectedZone === zoneId;

            const alignClass =
              zoneId === 'left'
                ? 'justify-start'
                : zoneId === 'center'
                ? 'justify-center flex-1'
                : 'justify-end';

            return (
              <div
                key={zoneId}
                onClick={e => {
                  if (!isBuilderEditing || !onSelectZone) return;
                  e.stopPropagation();
                  onSelectZone(rowId, zoneId);
                }}
                className={`flex items-center gap-2 sm:gap-2.5 min-w-0 ${alignClass} ${
                  isBuilderEditing
                    ? `rounded-lg px-1.5 py-1 transition-all cursor-pointer ${
                        isZoneSelected
                          ? 'ring-1 ring-amber-400 bg-amber-400/10'
                          : 'hover:ring-1 hover:ring-white/25'
                      }`
                    : ''
                }`}
              >
                {widgets.map(w => (
                  <HeaderWidgetRenderer key={w.id} widget={w} ctx={runtimeCtx} />
                ))}
                {isBuilderEditing && widgets.length === 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-45 px-2 py-0.5 border border-dashed border-current/30 rounded whitespace-nowrap">
                    {ROW_LABELS[rowId]} · {ZONE_LABELS[zoneId]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <header
        className={`${isAnySticky ? 'sticky top-0 z-30' : 'relative z-30'} w-full max-w-full overflow-x-clip shadow-xs`}
      >
        {renderRow('top')}
        {renderRow('main')}
        {renderRow('sub')}
      </header>

      {/* Accessible Mobile Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            style={{
              backgroundColor: header.mobileDrawer.bgColor || '#ffffff',
              color: header.mobileDrawer.textColor || '#18181b',
            }}
            className="relative z-10 w-[84vw] max-w-[320px] h-full shadow-2xl flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-current/10">
              <span className="font-black text-sm tracking-tight truncate">{brandName}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-current/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1">
              {header.mobileDrawer.showSearch && onOpenSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenSearch();
                  }}
                  className="w-full h-10 px-3.5 rounded-xl border border-current/15 bg-current/[0.04] flex items-center gap-2 text-xs font-semibold opacity-80"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>Buscar productos...</span>
                </button>
              )}

              {header.mobileDrawer.showLocation && onOpenLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenLocation();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-current/15 bg-current/[0.04] flex items-center gap-2.5 text-left text-xs font-bold"
                >
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                  <span className="truncate">{deliveryAddress || branchName || 'Elegir ubicación'}</span>
                </button>
              )}

              <nav className="space-y-1">
                {drawerNavItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleDrawerNav(item)}
                    style={{ color: item.highlight ? accentColor : undefined }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-current/10 text-sm font-bold transition-colors"
                  >
                    {item.label}
                  </button>
                ))}

                {header.mobileDrawer.showPublishedPages &&
                  publishedNavPages
                    .filter(p => p.status === 'published' && p.showInStoreNav)
                    .map(p => (
                      <a
                        key={p.id}
                        href={`/p/${p.slug}`}
                        onClick={() => setDrawerOpen(false)}
                        className="block w-full text-left px-3 py-2.5 rounded-xl hover:bg-current/10 text-sm font-bold transition-colors"
                      >
                        {p.navLabel?.trim() || p.title}
                      </a>
                    ))}
              </nav>
            </div>

            <div className="p-4 border-t border-current/10 space-y-2">
              {header.mobileDrawer.showAccount && onOpenAccount && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenAccount();
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-current/10 hover:bg-current/15 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>{customerName || 'Mi Cuenta / Identifícate'}</span>
                </button>
              )}
              {header.mobileDrawer.showContact && phone && (
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="w-full py-2 px-3 rounded-xl border border-current/15 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{phone}</span>
                </a>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
