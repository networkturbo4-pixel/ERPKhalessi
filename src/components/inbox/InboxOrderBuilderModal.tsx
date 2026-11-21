import React, { useState, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Tag,
  MapPin,
  Link2,
  CheckCircle2,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Order, OrderItem, PaymentMethod, Product } from '../../types/catalog';
import { useBenefits } from '../../context/BenefitsContext';
import { ProductCustomizerModal } from '../common/ProductCustomizerModal';
import {
  resolveProductAvailability,
  resolveProductDisplayPrice,
} from '../../utils/productPricing';

interface InboxOrderBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  initialAddress?: string;
  savedAddresses?: Array<{ label: string; address: string; reference?: string }>;
  preselectedItems?: Array<{ product: Product; quantity: number; unitPrice: number }>;
  products: Product[];
  tenantId: string;
  storefrontUrl: string;
  primaryColor: string;
  onCreateOrder: (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>
  ) => Order;
  onOrderCreatedInChat: (order: Order, sendPaymentLink: boolean) => void;
}

function productNeedsCustomizer(p: Product): boolean {
  return Boolean(
    (p.hasSizes && p.sizes && p.sizes.length > 0) ||
      (p.subOptions && p.subOptions.length > 0) ||
      (p.allowedExtras && p.allowedExtras.length > 0) ||
      p.productType === 'half_and_half' ||
      p.productType === 'apparel'
  );
}

export const InboxOrderBuilderModal: React.FC<InboxOrderBuilderModalProps> = ({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  initialAddress = '',
  savedAddresses = [],
  preselectedItems = [],
  products,
  tenantId,
  storefrontUrl,
  primaryColor,
  onCreateOrder,
  onOrderCreatedInChat,
}) => {
  const { validateCoupon, registerCouponUsage } = useBenefits();

  const [cart, setCart] = useState<OrderItem[]>(() =>
    preselectedItems.map((it, idx) => ({
      itemId: `chat_pre_${Date.now()}_${idx}`,
      productId: it.product.id,
      productName: it.product.name,
      productImage: it.product.imageUrl || '',
      subOptions: [],
      extras: [],
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      totalPrice: it.unitPrice * it.quantity,
    }))
  );
  const [productSearch, setProductSearch] = useState('');
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  const [address, setAddress] = useState(
    initialAddress || savedAddresses[0]?.address || 'Recojo en Tienda'
  );
  const [deliveryZoneFee, setDeliveryZoneFee] = useState<number>(
    initialAddress && !initialAddress.toLowerCase().includes('recojo') ? 6 : 0
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yape_plin');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [sendStorePayLink, setSendStorePayLink] = useState(false);

  const availableProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (!resolveProductAvailability(p, tenantId)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [products, tenantId, productSearch]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const total = Math.max(0, subtotal + deliveryZoneFee - appliedDiscount);

  const mergeOrderItemIntoCart = (item: OrderItem) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size?.id === item.size?.id &&
          (i.notes || '') === (item.notes || '') &&
          JSON.stringify(i.subOptions || []) === JSON.stringify(item.subOptions || []) &&
          JSON.stringify(i.extras || []) === JSON.stringify(item.extras || []) &&
          JSON.stringify(i.halfAndHalf || null) === JSON.stringify(item.halfAndHalf || null) &&
          JSON.stringify(i.apparelSelection || null) === JSON.stringify(item.apparelSelection || null)
      );
      if (idx >= 0) {
        return prev.map((existing, k) => {
          if (k !== idx) return existing;
          const nextQty = existing.quantity + item.quantity;
          return {
            ...existing,
            quantity: nextQty,
            totalPrice: existing.unitPrice * nextQty,
          };
        });
      }
      return [...prev, item];
    });
  };

  const handleSelectProduct = (prod: Product) => {
    if (productNeedsCustomizer(prod)) {
      setCustomizingProduct(prod);
      return;
    }
    const unitPrice = resolveProductDisplayPrice(prod, tenantId);
    mergeOrderItemIntoCart({
      itemId: `chat_pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      productImage: prod.imageUrl || '',
      subOptions: [],
      extras: [],
      unitPrice,
      quantity: 1,
      totalPrice: unitPrice,
    });
  };

  const handleQtyDelta = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.itemId !== itemId) return i;
          const nextQty = i.quantity + delta;
          return { ...i, quantity: nextQty, totalPrice: i.unitPrice * nextQty };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const res = validateCoupon(couponCode.trim(), subtotal);
    if (res.valid) {
      setAppliedDiscount(res.discountAmount);
      setCouponFeedback(`Cupón aplicado: -S/ ${res.discountAmount.toFixed(2)}`);
    } else {
      setAppliedDiscount(0);
      setCouponFeedback(res.error || 'Cupón no válido');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const isPickup = address.toLowerCase().includes('recojo') || deliveryZoneFee === 0;

    const created = onCreateOrder({
      tenantId,
      channel: isPickup ? 'pos-takeaway' : 'pos-delivery',
      customerName: customerName || 'Cliente Chat',
      customerPhone,
      deliveryAddress: address.trim() || 'Recojo en Tienda',
      deliveryReference: `Generado desde Bandeja Omnicanal (${storefrontUrl})`,
      paymentMethod,
      paymentStatus: 'pendiente',
      subtotal,
      deliveryFee: deliveryZoneFee,
      discount: appliedDiscount,
      couponCode: appliedDiscount > 0 ? couponCode.trim().toUpperCase() : undefined,
      total,
      estimatedMinutes: 30,
      items: cart,
    });

    if (appliedDiscount > 0 && couponCode.trim()) {
      registerCouponUsage(couponCode.trim());
    }

    onOrderCreatedInChat(created, sendStorePayLink);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Crear Pedido POS para {customerName}
                </h2>
                <p className="text-[11px] text-zinc-500 font-mono">{customerPhone}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Selector de productos con buscador y soporte completo de opciones/subgrupos */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Agregar productos del catálogo
                </label>
                <div className="relative sm:w-56">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto o promo..."
                    className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {availableProducts.map((p) => {
                  const price = resolveProductDisplayPrice(p, tenantId);
                  const hasOptions = productNeedsCustomizer(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-emerald-500/10 hover:border-emerald-500/50 text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
                    >
                      <span>+ {p.name}</span>
                      <span className="font-mono text-emerald-600">S/ {price.toFixed(2)}</span>
                      {hasOptions && (
                        <SlidersHorizontal
                          className="w-3 h-3 text-zinc-400"
                          aria-label="Con opciones y subgrupos"
                        />
                      )}
                    </button>
                  );
                })}
                {availableProducts.length === 0 && (
                  <p className="text-xs text-zinc-400 py-2">
                    No se encontraron productos disponibles con ese criterio.
                  </p>
                )}
              </div>
            </div>

            {/* Carrito con detalle completo de tamaño, subgrupos, subopciones, extras y notas */}
            {cart.length > 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                {cart.map((item) => (
                  <div
                    key={item.itemId}
                    className="px-3 py-2.5 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-semibold text-zinc-900 dark:text-white">
                        {item.productName}
                        {item.size?.name ? (
                          <span className="ml-1.5 text-[11px] font-normal text-zinc-500">
                            ({item.size.name})
                          </span>
                        ) : null}
                      </div>
                      {item.subOptions && item.subOptions.length > 0 && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {item.subOptions
                            .map(
                              (s) =>
                                `${s.groupName}: ${s.choiceName}${
                                  s.quantity && s.quantity > 1 ? ` x${s.quantity}` : ''
                                }`
                            )
                            .join(' · ')}
                        </div>
                      )}
                      {item.extras && item.extras.length > 0 && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          + {item.extras.map((ex) => `${ex.quantity}x ${ex.name}`).join(', ')}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[11px] italic text-amber-600 dark:text-amber-400">
                          Nota: {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleQtyDelta(item.itemId, -1)}
                        className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold w-5 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyDelta(item.itemId, 1)}
                        className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold w-16 text-right">
                        S/ {(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dirección y Calculadora rápida de Delivery */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Dirección de entrega
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                />
                {savedAddresses.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {savedAddresses.map((sa, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAddress(sa.address)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-500/15"
                      >
                        {sa.label}: {sa.address}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Zona Delivery (S/)
                </label>
                <select
                  value={deliveryZoneFee}
                  onChange={(e) => setDeliveryZoneFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                >
                  <option value={0}>Recojo en Tienda (S/ 0.00)</option>
                  <option value={5}>Zona Cercana (S/ 5.00)</option>
                  <option value={6}>Zona Estándar (S/ 6.00)</option>
                  <option value={8}>Zona Media (S/ 8.00)</option>
                  <option value={12}>Zona Extendida (S/ 12.00)</option>
                </select>
              </div>
            </div>

            {/* Cupón y Medio de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mb-1">
                  <Tag className="w-3.5 h-3.5" />
                  Cupón promocional
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Ej. KHALESSI10"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
                {couponFeedback && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    {couponFeedback}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Método de pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const next = e.target.value as PaymentMethod;
                    setPaymentMethod(next);
                    if (next === 'culqi') {
                      setSendStorePayLink(true);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                >
                  <option value="yape_plin">Yape / Plin</option>
                  <option value="culqi">Tarjeta Online (Culqi)</option>
                  <option value="efectivo">Efectivo contra entrega</option>
                  <option value="transferencia">Transferencia bancaria</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={sendStorePayLink}
                onChange={(e) => setSendStorePayLink(e.target.checked)}
                className="accent-emerald-600"
              />
              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
              Incluir enlace directo de pago online en el mensaje de confirmación
            </label>

            {/* Totales y Botones en una sola línea */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs space-y-0.5">
                <div className="text-zinc-500">
                  Subtotal: S/ {subtotal.toFixed(2)} · Delivery: S/ {deliveryZoneFee.toFixed(2)}
                  {appliedDiscount > 0 ? ` · Desc: -S/ ${appliedDiscount.toFixed(2)}` : ''}
                </div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">
                  Total a Cobrar: S/ {total.toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Crear Pedido y Enviar al Chat
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ProductCustomizerModal
        product={customizingProduct}
        isOpen={Boolean(customizingProduct)}
        onClose={() => setCustomizingProduct(null)}
        onAddToCart={(configuredItem) => {
          mergeOrderItemIntoCart(configuredItem);
          setCustomizingProduct(null);
        }}
        mode="pos"
      />
    </>
  );
};
