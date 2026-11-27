import React, { useMemo, useState } from 'react';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  QrCode,
  UtensilsCrossed,
  Clock,
  ArrowRight,
  X,
  LogOut,
  CheckCircle2,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import { Order, OrderItem, Product } from '../../types/catalog';
import { CompanyInfo, Tenant, TenantCustomization } from '../../types/settings';
import {
  resolveProductAvailability,
  resolveProductBasePrice,
  resolveSizePrice,
} from '../../utils/productPricing';
import { getStoreCategories } from './StorefrontWidgets';
import { CategoryIconBadge } from '../common/CategoryIconBadge';
import { ProductCustomizerModal } from '../common/ProductCustomizerModal';

export interface QRTableContextInfo {
  tenantId: string;
  tableId: string;
  tableName: string;
  zone?: string;
}

interface QRTableOrderingViewProps {
  qrTableContext: QRTableContextInfo;
  activeTenant: Tenant;
  products: Product[];
  cartItems: OrderItem[];
  cartSubtotal: number;
  totalCartUnits: number;
  activeTableOrder: Order | null;
  companyInfo: CompanyInfo;
  customization: TenantCustomization;
  isLightTheme: boolean;
  accentColor: string;
  onAddQuickItem: (item: OrderItem) => void;
  onUpdateCartQty: (itemId: string, delta: number) => void;
  onRemoveCartItem: (itemId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onOpenOrderTracker: (orderId?: string) => void;
  onExitQrTableMode: () => void;
}

export const QRTableOrderingView: React.FC<QRTableOrderingViewProps> = ({
  qrTableContext,
  activeTenant,
  products,
  cartItems,
  cartSubtotal,
  totalCartUnits,
  activeTableOrder,
  companyInfo,
  customization,
  isLightTheme,
  accentColor,
  onAddQuickItem,
  onUpdateCartQty,
  onRemoveCartItem,
  onClearCart,
  onProceedToCheckout,
  onOpenOrderTracker,
  onExitQrTableMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  const branchDisplayName = activeTenant.name.replace(/^Gastro\s*-\s*/i, '');
  const brandName = companyInfo.commercialName || customization.appName || 'Gastro Restaurante';
  const headerLogoUrl =
    customization.storeHeaderLogo?.trim() ||
    (isLightTheme ? customization.logoLight : customization.logoDark)?.trim() ||
    customization.logoLight?.trim() ||
    customization.logoDark?.trim() ||
    '';

  // Strictly only products available in this exact branch
  const branchProducts = useMemo(
    () => products.filter((p) => resolveProductAvailability(p, activeTenant.id)),
    [products, activeTenant.id]
  );

  // Only categories that have products in this branch
  const availableCategories = useMemo(() => {
    const allCats = getStoreCategories();
    const presentIds = new Set(branchProducts.map((p) => p.category));
    const ordered = allCats.filter((c) => presentIds.has(c.id));
    // Include any custom category IDs not in getStoreCategories
    branchProducts.forEach((p) => {
      if (p.category && !ordered.some((c) => c.id === p.category)) {
        const lower = p.category.toLowerCase();
        const fallbackEmoji = lower.includes('pizza')
          ? '🍕'
          : lower.includes('bebida')
          ? '🥤'
          : lower.includes('postre')
          ? '🍰'
          : lower.includes('combo')
          ? '🎁'
          : '🍽️';
        ordered.push({
          id: p.category,
          label: p.category.charAt(0).toUpperCase() + p.category.slice(1),
          icon: fallbackEmoji,
          iconType: 'emoji',
        } as any);
      }
    });
    return ordered;
  }, [branchProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return branchProducts.filter((p) => {
      if (selectedCategory !== 'todos' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    });
  }, [branchProducts, selectedCategory, searchQuery]);

  // Quick quantity lookup by productId (for simple items already in cart)
  const cartQtyByProductId = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((item) => {
      map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
    });
    return map;
  }, [cartItems]);

  const getProductDisplayPrice = (p: Product): number => {
    if (p.productType !== 'apparel' && p.hasSizes && p.sizes.some((s) => s.enabled)) {
      const enabledSizes = p.sizes.filter((s) => s.enabled);
      const prices = enabledSizes.map((s) => resolveSizePrice(p, s, activeTenant.id));
      return Math.min(...prices);
    }
    return resolveProductBasePrice(p, activeTenant.id);
  };

  const requiresCustomization = (p: Product): boolean => {
    const hasEnabledSizes = p.hasSizes && p.sizes.filter((s) => s.enabled).length > 1;
    const hasSubOpts = (p.subOptions || []).length > 0;
    const hasExtras = (p.allowedExtras || []).length > 0;
    const isApparel = p.productType === 'apparel';
    return hasEnabledSizes || hasSubOpts || hasExtras || isApparel;
  };

  const handleProductTap = (p: Product) => {
    if (requiresCustomization(p)) {
      setCustomizingProduct(p);
      return;
    }
    const defaultSize =
      p.hasSizes && p.sizes.length > 0
        ? p.sizes.find((s) => s.isDefault && s.enabled) || p.sizes.find((s) => s.enabled)
        : undefined;
    const unitPrice = defaultSize
      ? resolveSizePrice(p, defaultSize, activeTenant.id)
      : resolveProductBasePrice(p, activeTenant.id);

    onAddQuickItem({
      itemId: `qr-${p.id}-${defaultSize?.id || 'base'}`,
      productId: p.id,
      productName: p.name,
      productImage: p.imageUrl,
      size: defaultSize
        ? {
            id: defaultSize.id,
            name: defaultSize.name,
            slices: defaultSize.slices,
            price: unitPrice,
          }
        : undefined,
      subOptions: [],
      extras: [],
      unitPrice,
      quantity: 1,
      totalPrice: unitPrice,
    });
  };

  const orderStatusLabel = (order: Order): string => {
    if (order.paymentStatus === 'pendiente') return 'Esperando confirmación de pago';
    switch (order.status) {
      case 'recibido':
        return 'Recibido en cocina';
      case 'en_cocina':
      case 'en_horno':
        return 'Preparando en cocina';
      case 'listo':
        return '¡Listo! En camino a tu mesa';
      default:
        return 'En atención';
    }
  };

  const renderCartContent = (isDrawer: boolean) => (
    <div className="flex flex-col h-full">
      {/* Cart Header */}
      <div
        className={`flex items-center justify-between gap-2 pb-3.5 border-b ${
          isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: accentColor }}
          >
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black truncate">Tu Pedido · {qrTableContext.tableName}</h2>
            <p className={`text-[11px] truncate ${isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}`}>
              {branchDisplayName} · {qrTableContext.zone || 'Salón'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              title="Vaciar pedido"
              className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                isLightTheme
                  ? 'text-zinc-500 hover:bg-red-50 hover:text-red-600'
                  : 'text-neutral-400 hover:bg-red-500/15 hover:text-red-400'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              aria-label="Cerrar pedido"
              className={`p-2 rounded-xl ${
                isLightTheme
                  ? 'text-zinc-500 hover:bg-zinc-100'
                  : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className={`flex-1 overflow-y-auto py-3.5 space-y-2.5 ${isDrawer ? 'max-h-[52vh]' : 'max-h-[calc(100dvh-340px)]'}`}>
        {cartItems.length === 0 ? (
          <div
            className={`py-10 px-4 text-center rounded-2xl border border-dashed ${
              isLightTheme
                ? 'border-zinc-200 bg-zinc-50/70 text-zinc-500'
                : 'border-neutral-800 bg-neutral-950/50 text-neutral-400'
            }`}
          >
            <UtensilsCrossed className="w-7 h-7 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold">Tu comanda está vacía</p>
            <p className="text-[11px] mt-1 opacity-80">
              Agrega productos de la carta de {branchDisplayName} para pedir directo a tu mesa.
            </p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.itemId}
              className={`p-3 rounded-2xl border flex items-start gap-3 ${
                isLightTheme
                  ? 'bg-zinc-50/80 border-zinc-200/80'
                  : 'bg-neutral-950/70 border-neutral-800'
              }`}
            >
              {item.productImage ? (
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-black/5"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold leading-snug line-clamp-2">{item.productName}</p>
                  <button
                    type="button"
                    onClick={() => onRemoveCartItem(item.itemId)}
                    aria-label={`Quitar ${item.productName}`}
                    className="p-1 rounded-lg text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Detailed Breakdown: Size, Half&Half, Apparel, Sub-options, Extras, Notes */}
                <div className="mt-1 space-y-1">
                  {item.size?.name && (
                    <p
                      className={`text-[11px] font-semibold ${
                        isLightTheme ? 'text-zinc-600' : 'text-neutral-300'
                      }`}
                    >
                      Tamaño: {item.size.name}
                      {item.size.slices > 0 ? ` (${item.size.slices} tajadas)` : ''}
                    </p>
                  )}

                  {item.halfAndHalf && (
                    <p
                      className={`text-[11px] ${
                        isLightTheme ? 'text-zinc-600' : 'text-neutral-300'
                      }`}
                    >
                      <span className="font-bold">Mitad y Mitad:</span> {item.halfAndHalf.firstHalfName} /{' '}
                      {item.halfAndHalf.secondHalfName}
                    </p>
                  )}

                  {item.apparelSelection && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {item.apparelSelection.sizeName && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-700'
                              : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                          }`}
                        >
                          Talla: {item.apparelSelection.sizeName}
                        </span>
                      )}
                      {item.apparelSelection.colorName && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-700'
                              : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                          }`}
                        >
                          {item.apparelSelection.colorHex && (
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: item.apparelSelection.colorHex }}
                            />
                          )}
                          <span>{item.apparelSelection.colorName}</span>
                        </span>
                      )}
                      {item.apparelSelection.modelName && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-700'
                              : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                          }`}
                        >
                          {item.apparelSelection.modelName}
                        </span>
                      )}
                      {item.apparelSelection.giftWrap && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          🎁 Envoltura regalo
                        </span>
                      )}
                      {item.apparelSelection.customPrintText && (
                        <span
                          className={`text-[10px] ${
                            isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                          }`}
                        >
                          Estampado: "{item.apparelSelection.customPrintText}"
                        </span>
                      )}
                    </div>
                  )}

                  {item.subOptions && item.subOptions.length > 0 && (
                    <ul
                      className={`space-y-0.5 text-[11px] ${
                        isLightTheme ? 'text-zinc-600' : 'text-neutral-400'
                      }`}
                    >
                      {item.subOptions.map((sub, idx) => (
                        <li key={`${sub.groupId}-${sub.choiceId}-${idx}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            <span className="font-semibold">{sub.groupName}:</span>{' '}
                            {sub.quantity && sub.quantity > 1 ? `${sub.quantity}× ` : ''}
                            {sub.choiceName}
                          </span>
                          {sub.priceDelta > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
                              +S/ {(sub.priceDelta * (sub.quantity || 1)).toFixed(2)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.extras && item.extras.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.extras.map((ext) => (
                        <span
                          key={ext.id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isLightTheme
                              ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          <span>+ {ext.name}</span>
                          {ext.price > 0 && <span>(S/ {ext.price.toFixed(2)})</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && item.notes.trim() && (
                    <p
                      className={`text-[10px] italic px-2 py-1 rounded-lg border ${
                        isLightTheme
                          ? 'bg-amber-50/60 border-amber-200/70 text-amber-900'
                          : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                      }`}
                    >
                      Nota: {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-2.5">
                  <div
                    className={`inline-flex items-center rounded-xl border ${
                      isLightTheme
                        ? 'bg-white border-zinc-200'
                        : 'bg-neutral-900 border-neutral-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty(item.itemId, -1)}
                      aria-label="Restar unidad"
                      className="w-7 h-7 flex items-center justify-center hover:text-amber-600 active:scale-90 transition-transform"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-black tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty(item.itemId, 1)}
                      aria-label="Sumar unidad"
                      className="w-7 h-7 flex items-center justify-center hover:text-amber-600 active:scale-90 transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    {item.quantity > 1 && (
                      <span
                        className={`block text-[10px] tabular-nums ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        {item.quantity} × S/ {item.unitPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs font-black tabular-nums">
                      S/ {item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totals & Checkout CTA */}
      <div
        className={`pt-3.5 border-t space-y-3 ${
          isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
        }`}
      >
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className={isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}>
              Servicio en {qrTableContext.tableName}
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Gratis</span>
          </div>
          <div className="flex items-center justify-between text-base font-black pt-1">
            <span>Total</span>
            <span className="tabular-nums">S/ {cartSubtotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={cartItems.length === 0}
          onClick={() => {
            setIsMobileCartOpen(false);
            onProceedToCheckout();
          }}
          style={{ backgroundColor: cartItems.length > 0 ? accentColor : undefined }}
          className={`w-full min-h-[48px] px-4 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            cartItems.length > 0
              ? 'text-white shadow-lg hover:brightness-110'
              : isLightTheme
              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}
        >
          <span>Elegir Método de Pago</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p
          className={`text-[10px] text-center leading-relaxed ${
            isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
          }`}
        >
          Al confirmar tu pago, el pedido ingresa directo a Cocina y tu mesa queda activa en salón.
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-dvh w-full max-w-full overflow-x-clip flex flex-col font-sans ${
        isLightTheme ? 'bg-zinc-50 text-zinc-900' : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* Dedicated Clean Table QR Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          isLightTheme
            ? 'bg-white/95 border-zinc-200/90'
            : 'bg-neutral-900/95 border-neutral-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand + Branch + Table Pill */}
          <div className="flex items-center gap-3 min-w-0">
            {headerLogoUrl ? (
              <img
                src={headerLogoUrl}
                alt={brandName}
                className="h-8 sm:h-9 w-auto max-w-[110px] object-contain shrink-0"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                {brandName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                  <QrCode className="w-3.5 h-3.5 shrink-0" />
                  <span>{qrTableContext.tableName}</span>
                </span>
                <span
                  className={`text-xs font-bold truncate hidden sm:inline ${
                    isLightTheme ? 'text-zinc-600' : 'text-neutral-300'
                  }`}
                >
                  {branchDisplayName}
                  {qrTableContext.zone ? ` · ${qrTableContext.zone}` : ''}
                </span>
              </div>
              <p
                className={`text-[11px] truncate sm:hidden mt-0.5 ${
                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                }`}
              >
                {branchDisplayName} · {qrTableContext.zone || 'Salón'}
              </p>
            </div>
          </div>

          {/* Right: Live Order Pill + Cart + Exit */}
          <div className="flex items-center gap-2 shrink-0">
            {activeTableOrder && (
              <button
                type="button"
                onClick={() => onOpenOrderTracker(activeTableOrder.id)}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeTableOrder.orderNumber}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              style={{ backgroundColor: totalCartUnits > 0 ? accentColor : undefined }}
              className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                totalCartUnits > 0
                  ? 'text-white shadow-sm'
                  : isLightTheme
                  ? 'bg-zinc-100 text-zinc-700'
                  : 'bg-neutral-800 text-neutral-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">S/ {cartSubtotal.toFixed(2)}</span>
              {totalCartUnits > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] leading-none">
                  {totalCartUnits}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onExitQrTableMode}
              title="Salir de modo mesa"
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap ${
                isLightTheme
                  ? 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  : 'border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Active Order Live Banner (when table already has an order in progress) */}
      {activeTableOrder && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <button
            type="button"
            onClick={() => onOpenOrderTracker(activeTableOrder.id)}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all hover:shadow-sm ${
              activeTableOrder.paymentStatus === 'pagado'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTableOrder.paymentStatus === 'pagado'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}
              >
                {activeTableOrder.paymentStatus === 'pagado' ? (
                  <ChefHat className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-black truncate">
                  {orderStatusLabel(activeTableOrder)} · {activeTableOrder.orderNumber}
                </p>
                <p className="text-[11px] opacity-80 truncate">
                  {activeTableOrder.paymentStatus === 'pagado'
                    ? 'Sincronizado con Cocina KDS y registrado en tu mesa.'
                    : 'Una vez confirmado tu pago, pasará directo a Cocina KDS.'}
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 text-xs font-black whitespace-nowrap shrink-0">
              Ver en vivo →
            </span>
          </button>
        </div>
      )}

      {/* Main Content: Branch Products + Sticky Desktop Cart */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 pb-28 lg:pb-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_370px] xl:grid-cols-[1fr_400px] gap-6 items-start">
          {/* LEFT: Branch Catalog */}
          <section className="min-w-0 space-y-4">
            {/* Compact Title + Search + Category Filter */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${
                isLightTheme
                  ? 'bg-white border-zinc-200/90 shadow-2xs'
                  : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight">
                    Carta de {branchDisplayName}
                  </h1>
                  <p className={`text-xs ${isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}`}>
                    {branchProducts.length} productos disponibles hoy para {qrTableContext.tableName}
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar pizza, bebida, combo..."
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                      isLightTheme
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                        : 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-500'
                    }`}
                  />
                </div>
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('todos')}
                  style={
                    selectedCategory === 'todos'
                      ? { backgroundColor: accentColor, borderColor: accentColor }
                      : undefined
                  }
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                    selectedCategory === 'todos'
                      ? 'text-white shadow-xs'
                      : isLightTheme
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  Todos ({branchProducts.length})
                </button>
                {availableCategories.map((cat) => {
                  const count = branchProducts.filter((p) => p.category === cat.id).length;
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={
                        active
                          ? { backgroundColor: accentColor, borderColor: accentColor }
                          : undefined
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                        active
                          ? 'text-white shadow-xs'
                          : isLightTheme
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <CategoryIconBadge category={cat} size="sm" />
                      <span>{cat.label}</span>
                      <span className="opacity-70 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div
                className={`py-14 px-6 rounded-3xl border border-dashed text-center ${
                  isLightTheme
                    ? 'bg-white border-zinc-200 text-zinc-500'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">No se encontraron productos disponibles</p>
                <p className="text-xs mt-1">
                  Prueba con otra categoría o limpia el filtro de búsqueda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const displayPrice = getProductDisplayPrice(product);
                  const inCartQty = cartQtyByProductId.get(product.id) || 0;
                  const isCustom = requiresCustomization(product);

                  return (
                    <article
                      key={product.id}
                      className={`group rounded-2xl border overflow-hidden flex flex-col transition-all ${
                        isLightTheme
                          ? 'bg-white border-zinc-200/90 hover:border-zinc-300 hover:shadow-md'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {/* Image */}
                      <button
                        type="button"
                        onClick={() => handleProductTap(product)}
                        className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-neutral-800 text-left"
                      >
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400">
                            <UtensilsCrossed className="w-8 h-8 opacity-40" />
                          </div>
                        )}

                        {product.badge && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider">
                            {product.badge}
                          </span>
                        )}

                        {inCartQty > 0 && (
                          <span
                            style={{ backgroundColor: accentColor }}
                            className="absolute top-2 right-2 min-w-[24px] h-6 px-1.5 rounded-full text-white text-[11px] font-black flex items-center justify-center shadow-md"
                          >
                            {inCartQty}
                          </span>
                        )}
                      </button>

                      {/* Info & CTA */}
                      <div className="p-3 flex flex-col flex-1 justify-between gap-2.5">
                        <div>
                          <h3 className="text-xs sm:text-sm font-black leading-snug line-clamp-2">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p
                              className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${
                                isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                              }`}
                            >
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div>
                            {isCustom && (
                              <span
                                className={`block text-[9px] font-bold uppercase tracking-wider ${
                                  isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                                }`}
                              >
                                Desde
                              </span>
                            )}
                            <span className="text-sm font-black tabular-nums">
                              S/ {displayPrice.toFixed(2)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleProductTap(product)}
                            style={{ backgroundColor: accentColor }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-black shadow-xs hover:brightness-110 active:scale-95 transition-all whitespace-nowrap shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isCustom ? 'Elegir' : 'Agregar'}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* RIGHT: Sticky Desktop Cart */}
          <aside
            className={`hidden lg:block sticky top-20 rounded-3xl border p-4 shadow-sm ${
              isLightTheme
                ? 'bg-white border-zinc-200/90'
                : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            {renderCartContent(false)}
          </aside>
        </div>
      </main>

      {/* Mobile Floating Bottom Cart Bar */}
      {totalCartUnits > 0 && !isMobileCartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              style={{ backgroundColor: accentColor }}
              className="w-full min-h-[54px] px-4 py-3 rounded-2xl text-white shadow-xl flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-black/20 flex items-center justify-center text-xs font-black tabular-nums">
                  {totalCartUnits}
                </span>
                <span className="text-sm font-black">Ver pedido · {qrTableContext.tableName}</span>
              </div>
              <span className="text-sm font-black tabular-nums">
                S/ {cartSubtotal.toFixed(2)} →
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Sheet Modal */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex items-end bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full rounded-t-3xl border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-2xl ${
              isLightTheme
                ? 'bg-white border-zinc-200 text-zinc-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            {renderCartContent(true)}
          </div>
        </div>
      )}

      {/* Inline Product Customizer Modal for sizes/options/extras */}
      <ProductCustomizerModal
        product={customizingProduct}
        isOpen={Boolean(customizingProduct)}
        onClose={() => setCustomizingProduct(null)}
        onAddToCart={(item) => {
          onAddQuickItem(item);
          setCustomizingProduct(null);
        }}
        mode="storefront"
      />
    </div>
  );
};
