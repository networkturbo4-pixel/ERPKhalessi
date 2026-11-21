import React, { useState, useMemo } from 'react';
import { X, ShoppingBag, Plus, Minus, Tag, MapPin, Link2, CheckCircle2 } from 'lucide-react';
import { Order, OrderItem, PaymentMethod, Product } from '../../types/catalog';
import { useBenefits } from '../../context/BenefitsContext';

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

  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; unitPrice: number }>>(
    () => preselectedItems
  );
  const [address, setAddress] = useState(initialAddress || savedAddresses[0]?.address || 'Recojo en Tienda');
  const [deliveryZoneFee, setDeliveryZoneFee] = useState<number>(
    initialAddress && !initialAddress.toLowerCase().includes('recojo') ? 6 : 0
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yape_plin');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [sendStorePayLink, setSendStorePayLink] = useState(false);

  const availableProducts = useMemo(() => products.filter((p) => p.isAvailable), [products]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const total = Math.max(0, subtotal + deliveryZoneFee - appliedDiscount);

  const handleAddProduct = (prod: Product) => {
    const unitPrice = prod.hasSizes && prod.sizes.length > 0 ? prod.sizes[0].price : prod.basePrice;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product: prod, quantity: 1, unitPrice }];
    });
  };

  const handleQtyDelta = (prodId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === prodId ? { ...i, quantity: i.quantity + delta } : i))
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
    const items: OrderItem[] = cart.map((it, idx) => ({
      itemId: `chat_pos_${Date.now()}_${idx}`,
      productId: it.product.id,
      productName: it.product.name,
      productImage: it.product.imageUrl || '',
      subOptions: [],
      extras: [],
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      totalPrice: it.unitPrice * it.quantity,
    }));

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
      items,
    });

    if (appliedDiscount > 0 && couponCode.trim()) {
      registerCouponUsage(couponCode.trim());
    }

    onOrderCreatedInChat(created, sendStorePayLink);
    onClose();
  };

  return (
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
            className="p-1.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Selector rápido de productos */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Agregar productos del catálogo
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {availableProducts.slice(0, 16).map((p) => {
                const price = p.hasSizes && p.sizes.length > 0 ? p.sizes[0].price : p.basePrice;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddProduct(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-emerald-500/10 hover:border-emerald-500/50 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    + {p.name} <span className="font-mono text-emerald-600">S/ {price.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carrito */}
          {cart.length > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              {cart.map((item) => (
                <div key={item.product.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-white truncate">
                    {item.product.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQtyDelta(item.product.id, -1)}
                      className="p-1 rounded bg-zinc-100 dark:bg-zinc-800"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold w-5 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleQtyDelta(item.product.id, 1)}
                      className="p-1 rounded bg-zinc-100 dark:bg-zinc-800"
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
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold whitespace-nowrap shrink-0"
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
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
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
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cart.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 whitespace-nowrap shrink-0"
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
  );
};
