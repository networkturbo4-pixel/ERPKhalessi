import React, { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle2,
  ChefHat,
  CreditCard,
  Flame,
  Loader2,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  AlertCircle,
  Bike,
} from 'lucide-react';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { Order } from '../../types/catalog';
import {
  isRealCulqiPublicKey,
  openOfficialCulqiCheckout,
  resolveCulqiPublicKey,
} from '../../utils/culqiCheckout';

interface OrderPaymentPageProps {
  orderId: string;
  onNavigateHome: () => void;
}

const STATUS_STEPS: Array<{ key: Order['status']; label: string }> = [
  { key: 'recibido', label: 'Recibido' },
  { key: 'en_cocina', label: 'En Cocina' },
  { key: 'en_horno', label: 'En Horno' },
  { key: 'listo', label: 'Listo' },
  { key: 'en_ruta', label: 'En Ruta' },
  { key: 'entregado', label: 'Entregado' },
];

export const OrderPaymentPage: React.FC<OrderPaymentPageProps> = ({
  orderId,
  onNavigateHome,
}) => {
  const { orders, markOrderPaid } = useOrderCatalog();
  const { customization, companyInfo } = useSettings();

  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');

  const liveOrder = useMemo(
    () => orders.find((o) => o.id === orderId || o.orderNumber === orderId) || fetchedOrder,
    [orders, orderId, fetchedOrder]
  );

  // Fallback fetch directo al servidor por si el contexto aún está hidratando
  useEffect(() => {
    let cancelled = false;
    setLoadingRemote(true);
    fetch(`/api/storage/kh_orders_list?t=${Date.now()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = await res.json();
        if (!json?.data) return null;
        const parsed = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;
        if (!Array.isArray(parsed)) return null;
        return (
          parsed.find((o: Order) => o.id === orderId || o.orderNumber === orderId) || null
        );
      })
      .then((found) => {
        if (!cancelled && found) setFetchedOrder(found);
      })
      .catch(() => {
        // entorno local sin PHP
      })
      .finally(() => {
        if (!cancelled) setLoadingRemote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const culqiConfig = companyInfo.culqiConfig;
  const activePublicKey = resolveCulqiPublicKey(culqiConfig);
  const hasRealCulqi = Boolean(culqiConfig?.enabled && isRealCulqiPublicKey(activePublicKey));

  const confirmPaymentWithServer = async (
    order: Order,
    tokenId: string,
    methodUsed: 'tarjeta' | 'yape',
    sandbox: boolean
  ) => {
    try {
      const res = await fetch('/api/culqi-pay.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          tokenId,
          email: customerEmail.trim() || 'cliente@pizzakhalessi.com',
          methodUsed,
          sandbox,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'No se pudo confirmar el pago en el servidor.');
        }
        if (data.order) {
          setFetchedOrder(data.order);
        }
        markOrderPaid(order.id);
        return;
      }
    } catch (err) {
      // Si estamos en entorno dev sin PHP, permitir fallback local en modo sandbox
      if (!sandbox) {
        throw err;
      }
    }
    markOrderPaid(order.id);
    setFetchedOrder({
      ...order,
      paymentStatus: 'pagado',
      paymentMethod: methodUsed === 'yape' ? 'yape_plin' : 'culqi',
      culqiReference: tokenId,
    });
  };

  const handlePayNow = async (sandboxMethod?: 'tarjeta' | 'yape') => {
    if (!liveOrder) return;
    setErrorMsg(null);
    setPaying(true);
    try {
      if (hasRealCulqi && culqiConfig && !sandboxMethod) {
        const res = await openOfficialCulqiCheckout({
          config: culqiConfig,
          storeTitle: `${customization.appName} · ${liveOrder.orderNumber}`,
          amountSoles: liveOrder.total,
          accentColor: customization.primaryColor,
          logoUrl: customization.logoLight || undefined,
          skipBackendCharge: true,
        });
        if (!res.ok || !res.referenceId) {
          setErrorMsg(res.errorMessage || 'El pago fue cancelado o rechazado.');
          setPaying(false);
          return;
        }
        await confirmPaymentWithServer(
          liveOrder,
          res.referenceId,
          res.methodUsed || 'tarjeta',
          false
        );
      } else {
        const ref = `SANDBOX-${(sandboxMethod || 'culqi').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        await confirmPaymentWithServer(liveOrder, ref, sandboxMethod || 'tarjeta', true);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Ocurrió un error al procesar el pago.');
    } finally {
      setPaying(false);
    }
  };

  const currentStepIdx = liveOrder
    ? STATUS_STEPS.findIndex((s) => s.key === liveOrder.status)
    : -1;

  return (
    <div
      className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6"
      style={{ fontFamily: customization.fontFamily }}
    >
      <div className="w-full max-w-lg space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {customization.favicon ? (
              <img
                src={customization.favicon}
                alt={customization.appName}
                className="h-9 w-9 rounded-xl object-contain bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <ShoppingBag className="h-4 w-4" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold leading-tight">{customization.appName}</h1>
              <p className="text-[11px] text-zinc-500">Pago seguro en línea · Culqi</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer"
          >
            <Store className="h-3.5 w-3.5" />
            Ver Carta
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
          {!liveOrder && loadingRemote ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: customization.primaryColor }} />
              <p className="text-xs font-medium">Cargando detalle de tu pedido...</p>
            </div>
          ) : !liveOrder ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
              <h2 className="text-base font-bold">Pedido no encontrado</h2>
              <p className="text-xs text-zinc-500">
                Verifica el enlace enviado por WhatsApp o solicita uno nuevo a nuestro equipo.
              </p>
              <button
                type="button"
                onClick={onNavigateHome}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Ir a la Tienda Virtual
              </button>
            </div>
          ) : (
            <>
              {/* Top Status Banner */}
              {liveOrder.paymentStatus === 'pagado' ? (
                <div className="p-5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      ¡Pago confirmado! Tu pedido ya pasó a cocina
                    </h2>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/90 mt-0.5">
                      Pedido <strong>{liveOrder.orderNumber}</strong>
                      {liveOrder.culqiReference ? ` · Ref: ${liveOrder.culqiReference}` : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Pedido {liveOrder.orderNumber}
                    </span>
                    <h2 className="text-lg font-extrabold mt-0.5">
                      Hola, {liveOrder.customerName}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-zinc-500 block">Total a pagar</span>
                    <span
                      className="text-xl font-black font-mono"
                      style={{ color: customization.primaryColor }}
                    >
                      S/ {liveOrder.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Kitchen Tracker when paid */}
              {liveOrder.paymentStatus === 'pagado' && (
                <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                      {liveOrder.status === 'en_ruta' ? (
                        <Bike className="h-3.5 w-3.5 text-orange-500" />
                      ) : liveOrder.status === 'en_horno' ? (
                        <Flame className="h-3.5 w-3.5 text-rose-500" />
                      ) : (
                        <ChefHat className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      Seguimiento en vivo
                    </span>
                    <span className="capitalize text-emerald-600 dark:text-emerald-400">
                      {STATUS_STEPS[Math.max(0, currentStepIdx)]?.label || liveOrder.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {STATUS_STEPS.map((st, idx) => (
                      <div key={st.key} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full transition-colors ${
                            idx <= currentStepIdx
                              ? 'bg-emerald-500'
                              : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        />
                        <span className="block text-[9px] text-center text-zinc-500 truncate">
                          {st.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-zinc-400" />
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                      Entrega: {liveOrder.deliveryAddress}
                    </span>
                    <span>Teléfono: {liveOrder.customerPhone}</span>
                  </div>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  {liveOrder.items.map((item) => (
                    <div key={item.itemId} className="px-3.5 py-2.5 flex justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-white">
                          {item.quantity}x {item.productName}
                          {item.size?.name ? ` (${item.size.name})` : ''}
                        </div>
                        {item.subOptions && item.subOptions.length > 0 && (
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {item.subOptions.map((s) => `${s.groupName}: ${s.choiceName}`).join(' · ')}
                          </p>
                        )}
                        {item.extras && item.extras.length > 0 && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            + {item.extras.map((ex) => `${ex.quantity}x ${ex.name}`).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold shrink-0">
                        S/ {item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal</span>
                    <span className="font-mono">S/ {liveOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {liveOrder.deliveryFee > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Delivery</span>
                      <span className="font-mono">S/ {liveOrder.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {liveOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Descuento</span>
                      <span className="font-mono">-S/ {liveOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span>Total</span>
                    <span className="font-mono">S/ {liveOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Actions */}
                {liveOrder.paymentStatus !== 'pagado' && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                        Correo para tu comprobante (opcional)
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="tu-correo@ejemplo.com"
                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-xs"
                      />
                    </div>

                    {errorMsg && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {hasRealCulqi ? (
                      <button
                        type="button"
                        disabled={paying}
                        onClick={() => handlePayNow()}
                        className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition-transform duration-150 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                        style={{ backgroundColor: customization.primaryColor }}
                      >
                        {paying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {paying
                          ? 'Confirmando pago...'
                          : `Pagar S/ ${liveOrder.total.toFixed(2)} con Tarjeta o Yape`}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Modo Prueba Culqi (configura tu Public/Secret Key en Configuración → Pagos para cobro real).
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={paying}
                            onClick={() => handlePayNow('tarjeta')}
                            className="py-2.5 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-[0.97] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                            style={{ backgroundColor: customization.primaryColor }}
                          >
                            {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                            Simular Tarjeta
                          </button>
                          <button
                            type="button"
                            disabled={paying}
                            onClick={() => handlePayNow('yape')}
                            className="py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-1.5 active:scale-[0.97] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                          >
                            {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Simular Yape
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-center text-zinc-500 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Al aprobarse el pago, tu pedido entra automáticamente a Cocina.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
