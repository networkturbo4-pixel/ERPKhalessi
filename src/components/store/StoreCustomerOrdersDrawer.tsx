import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { Order, OrderStatus } from '../../types/catalog';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import {
  X,
  Receipt,
  Radio,
  Flame,
  ChefHat,
  PackageCheck,
  Bike,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  User,
  CreditCard,
  Smartphone,
  Banknote,
} from 'lucide-react';

interface StoreCustomerOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenCart: () => void;
  accentColor: string;
  autoButtonContrast: boolean;
  isLightTheme?: boolean;
  initialOrderId?: string | null;
}

type OrdersFilter = 'activos' | 'historial' | 'todos';

const DELIVERY_STEPS: { key: OrderStatus; label: string; short: string; Icon: React.ElementType }[] = [
  { key: 'recibido', label: 'Pedido Recibido', short: 'Recibido', Icon: Receipt },
  { key: 'en_cocina', label: 'Preparando Masa', short: 'Cocina', Icon: ChefHat },
  { key: 'en_horno', label: 'Horno a la Leña', short: 'Horno', Icon: Flame },
  { key: 'listo', label: 'Listo para Despacho', short: 'Listo', Icon: PackageCheck },
  { key: 'en_ruta', label: 'Motorizado en Ruta', short: 'En Ruta', Icon: Bike },
  { key: 'entregado', label: 'Pedido Entregado', short: 'Entregado', Icon: CheckCircle2 },
];

const PICKUP_STEPS: { key: OrderStatus; label: string; short: string; Icon: React.ElementType }[] = [
  { key: 'recibido', label: 'Pedido Recibido', short: 'Recibido', Icon: Receipt },
  { key: 'en_cocina', label: 'Preparando Masa', short: 'Cocina', Icon: ChefHat },
  { key: 'en_horno', label: 'Horno a la Leña', short: 'Horno', Icon: Flame },
  { key: 'listo', label: 'Listo para Recojo en Tienda', short: 'Listo', Icon: PackageCheck },
  { key: 'entregado', label: 'Entregado en Tienda', short: 'Entregado', Icon: CheckCircle2 },
];

function isPickupOrder(order: Order): boolean {
  const addr = (order.deliveryAddress || '').toLowerCase();
  return (
    order.channel === 'pos-takeaway' ||
    addr.includes('para llevar') ||
    addr.includes('recojo')
  );
}

function isActiveOrderStatus(status: OrderStatus): boolean {
  return (
    status === 'recibido' ||
    status === 'en_cocina' ||
    status === 'en_horno' ||
    status === 'listo' ||
    status === 'en_ruta'
  );
}

export const StoreCustomerOrdersDrawer: React.FC<StoreCustomerOrdersDrawerProps> = ({
  isOpen,
  onClose,
  onOpenProfile,
  onOpenCart,
  accentColor,
  autoButtonContrast,
  isLightTheme = false,
  initialOrderId = null,
}) => {
  const { currentCustomer, customerOrders } = useStoreCustomer();
  const { addToCart, lastRealtimeSyncAt } = useOrderCatalog();
  const { tenants, dispatchToast } = useSettings();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [filter, setFilter] = useState<OrdersFilter>('activos');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId);
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => new Date().getTime());

  useEffect(() => {
    if (isOpen && initialOrderId) {
      setSelectedOrderId(initialOrderId);
    }
  }, [isOpen, initialOrderId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Live ticker every 15s for elapsed minutes calculation
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNowTimestamp(new Date().getTime());
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, lastRealtimeSyncAt]);

  const activeOrders = useMemo(
    () => customerOrders.filter(o => isActiveOrderStatus(o.status)),
    [customerOrders]
  );

  const historyOrders = useMemo(
    () => customerOrders.filter(o => !isActiveOrderStatus(o.status)),
    [customerOrders]
  );

  // Auto-switch to 'todos' if customer has past orders but 0 active right now
  const effectiveList = useMemo(() => {
    if (filter === 'activos') {
      return activeOrders.length > 0 ? activeOrders : customerOrders;
    }
    if (filter === 'historial') return historyOrders;
    return customerOrders;
  }, [activeOrders, customerOrders, filter, historyOrders]);

  // Always resolve selectedOrder live from customerOrders so status updates reflect in real time even inside details view!
  const selectedOrder = useMemo(
    () => customerOrders.find(o => o.id === selectedOrderId) || null,
    [customerOrders, selectedOrderId]
  );

  const getBranchName = (tenantId: string) => {
    const found = tenants.find(t => t.id === tenantId);
    return found ? found.name.replace('Khalessi Pizza - ', '') : 'Local Principal';
  };

  const getElapsedMinutes = (isoDate: string) => {
    const diff = nowTimestamp - new Date(isoDate).getTime();
    return Math.max(1, Math.floor(diff / 60000));
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((item, index) => {
      addToCart({
        ...item,
        itemId: `reorder-${order.id}-${index}-${nowTimestamp}`,
      });
    });
    dispatchToast(
      'Productos en tu Carrito',
      `Se cargaron ${order.items.length} ítem(s) de la orden ${order.orderNumber}.`,
      'success'
    );
    onClose();
    onOpenCart();
  };

  const renderStatusBadge = (order: Order) => {
    if (order.status === 'cancelado') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-black inline-flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancelado</span>
        </span>
      );
    }
    if (order.status === 'entregado') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-black inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Entregado</span>
        </span>
      );
    }

    const steps = isPickupOrder(order) ? PICKUP_STEPS : DELIVERY_STEPS;
    const currentStep = steps.find(s => s.key === order.status) || steps[0];

    return (
      <span
        data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
        className="store-btn-solid px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1.5"
      >
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
        <span>{currentStep.label}</span>
      </span>
    );
  };

  const renderRealtimeTracker = (order: Order) => {
    if (order.status === 'cancelado') {
      return (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 font-semibold">
          Este pedido fue anulado. Si tienes dudas comunícate con la sucursal{' '}
          {getBranchName(order.tenantId)}.
        </div>
      );
    }

    const steps = isPickupOrder(order) ? PICKUP_STEPS : DELIVERY_STEPS;
    const activeIndex = Math.max(
      0,
      steps.findIndex(s => s.key === order.status)
    );

    return (
      <div className="space-y-3 pt-1">
        {/* Stepper Icons Row */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step, idx) => {
            const reached = idx <= activeIndex;
            const isCurrent = idx === activeIndex && order.status !== 'entregado';
            const Icon = step.Icon;
            return (
              <div key={step.key} className="flex flex-col items-center text-center gap-1">
                <div
                  data-auto-contrast={reached && autoButtonContrast ? 'true' : 'false'}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    reached
                      ? 'store-btn-solid shadow-xs'
                      : isLightTheme
                      ? 'bg-zinc-100 border border-zinc-200 text-zinc-400'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                  } ${isCurrent ? 'ring-2 ring-amber-400/60 scale-105' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-bold leading-tight ${
                    reached
                      ? isLightTheme
                        ? 'text-zinc-900'
                        : 'text-white'
                      : isLightTheme
                      ? 'text-zinc-400'
                      : 'text-neutral-500'
                  }`}
                >
                  {step.short}
                </span>
              </div>
            );
          })}
        </div>

        {/* Driver (Motorizado) live handoff card — delivery orders only */}
        {!isPickupOrder(order) &&
          (order.status === 'listo' ||
            order.status === 'en_ruta' ||
            order.status === 'entregado') && (
            <div
              className={`p-3 rounded-2xl border flex items-center gap-3 text-xs ${
                order.status === 'en_ruta'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : isLightTheme
                  ? 'bg-zinc-50 border-zinc-200'
                  : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <span
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  order.status === 'listo' && !order.assignedDriverName
                    ? isLightTheme
                      ? 'bg-zinc-200 text-zinc-500'
                      : 'bg-neutral-800 text-neutral-400'
                    : 'store-btn-solid'
                }`}
              >
                <Bike className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={`block font-black text-sm truncate ${
                    isLightTheme ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  {order.status === 'entregado'
                    ? order.assignedDriverName
                      ? `Entregado por ${order.assignedDriverName}`
                      : 'Pedido entregado'
                    : order.status === 'en_ruta'
                    ? order.assignedDriverName
                      ? `${order.assignedDriverName} lleva tu pedido`
                      : 'Tu pedido está con el motorizado'
                    : order.assignedDriverName
                    ? `${order.assignedDriverName} recogerá tu pedido`
                    : 'Asignando motorizado…'}
                </span>
                <span
                  className={`block text-[11px] mt-0.5 ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  {order.status === 'entregado'
                    ? order.deliveredAt
                      ? `Entrega confirmada a las ${new Date(order.deliveredAt).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Entrega confirmada'
                    : order.status === 'en_ruta'
                    ? order.dispatchedAt
                      ? `Salió de ${getBranchName(order.tenantId)} a las ${new Date(order.dispatchedAt).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} · en camino a tu dirección`
                      : `Salió de ${getBranchName(order.tenantId)} · en camino a tu dirección`
                    : `Tu pedido está empacado y listo en ${getBranchName(order.tenantId)}`}
                </span>
              </div>
              {order.status === 'en_ruta' && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-black whitespace-nowrap shrink-0 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  En camino
                </span>
              )}
            </div>
          )}

        {order.status === 'listo' && isPickupOrder(order) && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            ¡Tu pedido ya está listo para recoger en {getBranchName(order.tenantId)}!
          </div>
        )}
      </div>
    );
  };

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
      className="store-responsive-drawer store-drawer-wide backdrop:bg-black/60 backdrop:backdrop-blur-xs"
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

          {/* Sticky Header */}
          <div
            className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
              isLightTheme
                ? 'bg-white border-zinc-200 text-zinc-900'
                : 'bg-neutral-900 border-neutral-800 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {selectedOrder ? (
                <button
                  type="button"
                  aria-label="Volver a lista de pedidos"
                  onClick={() => setSelectedOrderId(null)}
                  className={`p-2 rounded-xl shrink-0 transition-colors ${
                    isLightTheme
                      ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      : 'bg-neutral-800 text-neutral-200 hover:text-white'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                >
                  <Receipt className="w-4 h-4" />
                </div>
              )}

              <div className="min-w-0">
                <h2
                  id={titleId}
                  className={`font-black text-base truncate ${
                    isLightTheme ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  {selectedOrder ? `Detalle ${selectedOrder.orderNumber}` : 'Mis Pedidos'}
                </h2>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 truncate">
                  <Radio className="w-3 h-3 animate-pulse shrink-0" />
                  <span>Estado en tiempo real conectado a cocina</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar mis pedidos"
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

          {/* BODY: ORDER DETAILS DRILL-DOWN OR REALTIME LIST */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar safe-bottom-bar">
            {selectedOrder ? (
              /* ==============================================================
                 FULL ORDER DETAILS VIEW
                 ============================================================== */
              <div className="space-y-4">
                {/* Status + Live Stepper Card */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isLightTheme
                      ? 'bg-white border-zinc-200/90 text-zinc-900 shadow-xs'
                      : 'bg-neutral-950 border-neutral-800 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span
                        className={`text-[11px] font-bold block ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        {new Date(selectedOrder.createdAt).toLocaleString('es-PE', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      <span
                        className={`text-base font-black ${
                          isLightTheme ? 'text-zinc-900' : 'text-white'
                        }`}
                      >
                        Orden {selectedOrder.orderNumber}
                      </span>
                    </div>
                    {renderStatusBadge(selectedOrder)}
                  </div>

                  {renderRealtimeTracker(selectedOrder)}

                  {isActiveOrderStatus(selectedOrder.status) && (
                    <div
                      className={`pt-2 border-t flex items-center justify-between text-xs ${
                        isLightTheme
                          ? 'border-zinc-100 text-zinc-500'
                          : 'border-neutral-900 text-neutral-400'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        <span>Hace {getElapsedMinutes(selectedOrder.createdAt)} min</span>
                      </span>
                      <span>Tiempo estimado: ~{selectedOrder.estimatedMinutes} min</span>
                    </div>
                  )}
                </div>

                {/* Delivery / Branch & Payment Info */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
                    isLightTheme
                      ? 'bg-white border-zinc-200/90 text-zinc-900 shadow-xs'
                      : 'bg-neutral-950 border-neutral-800 text-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor }} />
                    <div className="min-w-0">
                      <span
                        className={`font-black block ${
                          isLightTheme ? 'text-zinc-900' : 'text-white'
                        }`}
                      >
                        {isPickupOrder(selectedOrder) ? 'Recojo en Sucursal' : 'Dirección de Entrega'}
                      </span>
                      <span
                        className={`block ${
                          isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                        }`}
                      >
                        {selectedOrder.deliveryAddress || getBranchName(selectedOrder.tenantId)}
                      </span>
                      {selectedOrder.deliveryReference && (
                        <span
                          className={`block ${
                            isLightTheme ? 'text-zinc-500' : 'text-neutral-500'
                          }`}
                        >
                          Ref: {selectedOrder.deliveryReference}
                        </span>
                      )}
                      <span
                        className={`text-[11px] block mt-0.5 ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        Sucursal: {getBranchName(selectedOrder.tenantId)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`pt-2.5 border-t flex items-center justify-between ${
                      isLightTheme ? 'border-zinc-100' : 'border-neutral-900'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        isLightTheme ? 'text-zinc-600' : 'text-neutral-400'
                      }`}
                    >
                      {selectedOrder.paymentMethod === 'tarjeta' ? (
                        <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                      ) : selectedOrder.paymentMethod === 'yape_plin' ? (
                        <Smartphone className="w-3.5 h-3.5 text-purple-500" />
                      ) : (
                        <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span>
                        Pago:{' '}
                        <strong className={isLightTheme ? 'text-zinc-900' : 'text-white'}>
                          {selectedOrder.paymentMethod === 'yape_plin'
                            ? 'Yape / Plin'
                            : selectedOrder.paymentMethod === 'tarjeta'
                            ? 'Tarjeta'
                            : 'Efectivo'}
                        </strong>
                      </span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedOrder.paymentStatus === 'pagado'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      {selectedOrder.paymentStatus === 'pagado' ? 'Pagado' : 'Contraentrega'}
                    </span>
                  </div>
                </div>

                {/* Itemized Products Breakdown */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isLightTheme
                      ? 'bg-white border-zinc-200/90 text-zinc-900 shadow-xs'
                      : 'bg-neutral-950 border-neutral-800 text-white'
                  }`}
                >
                  <span
                    className={`text-xs font-black uppercase tracking-wider block ${
                      isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                    }`}
                  >
                    Productos del Pedido ({selectedOrder.items.length})
                  </span>

                  <div className="space-y-3">
                    {selectedOrder.items.map(item => (
                      <div
                        key={item.itemId}
                        className={`flex items-start justify-between gap-3 pb-3 border-b last:border-b-0 last:pb-0 ${
                          isLightTheme ? 'border-zinc-100' : 'border-neutral-900'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className={`w-12 h-12 rounded-xl object-cover shrink-0 ${
                              isLightTheme ? 'bg-zinc-100 border border-zinc-200' : 'bg-neutral-900'
                            }`}
                          />
                          <div className="min-w-0">
                            <span
                              className={`text-xs sm:text-sm font-bold block ${
                                isLightTheme ? 'text-zinc-900' : 'text-white'
                              }`}
                            >
                              {item.quantity}× {item.productName}
                            </span>
                            {item.halfAndHalf && (
                              <span
                                className="text-[11px] font-bold block"
                                style={{ color: accentColor }}
                              >
                                1/2 {item.halfAndHalf.firstHalfName} + 1/2{' '}
                                {item.halfAndHalf.secondHalfName}
                              </span>
                            )}
                            {item.size && (
                              <span
                                className={`text-[11px] block ${
                                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                                }`}
                              >
                                Tamaño: {item.size.name}
                              </span>
                            )}
                            {item.subOptions.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.subOptions.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-[11px] block leading-tight ${
                                      isLightTheme ? 'text-zinc-600' : 'text-neutral-300'
                                    }`}
                                  >
                                    • <span className="opacity-75">{s.groupName}:</span> {s.choiceName}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.extras.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.extras.map((e, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                      isLightTheme
                                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                                        : 'bg-amber-950/40 border-amber-800 text-amber-300'
                                    }`}
                                  >
                                    ✨ {e.name} {e.quantity > 1 ? `x${e.quantity}` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.notes && (
                              <span
                                className={`text-[11px] italic block ${
                                  isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                                }`}
                              >
                                &quot;{item.notes}&quot;
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-xs font-black shrink-0 ${
                            isLightTheme ? 'text-zinc-900' : 'text-white'
                          }`}
                        >
                          S/ {item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Financial Totals */}
                  <div
                    className={`pt-3 border-t space-y-1.5 text-xs ${
                      isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
                    }`}
                  >
                    <div
                      className={`flex justify-between ${
                        isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                      }`}
                    >
                      <span>Subtotal</span>
                      <span className={isLightTheme ? 'text-zinc-800 font-bold' : 'text-neutral-200'}>
                        S/ {selectedOrder.subtotal.toFixed(2)}
                      </span>
                    </div>
                    {selectedOrder.deliveryFee > 0 && (
                      <div
                        className={`flex justify-between ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        <span>Costo de Envío</span>
                        <span className={isLightTheme ? 'text-zinc-800 font-bold' : 'text-neutral-200'}>
                          S/ {selectedOrder.deliveryFee.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>
                          Descuento
                          {selectedOrder.couponCode
                            ? ` (${selectedOrder.couponCode})`
                            : selectedOrder.rewardRedeemedTitle
                            ? ` (${selectedOrder.rewardRedeemedTitle})`
                            : ''}
                        </span>
                        <span>- S/ {selectedOrder.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.pointsEarned && selectedOrder.pointsEarned > 0 && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                        <span>Puntos Ganados en Tarjeta</span>
                        <span>+{selectedOrder.pointsEarned} pto(s)</span>
                      </div>
                    )}
                    <div
                      className={`flex justify-between text-sm font-black pt-1.5 border-t ${
                        isLightTheme
                          ? 'border-zinc-200 text-zinc-900'
                          : 'border-neutral-900 text-white'
                      }`}
                    >
                      <span>Total</span>
                      <span style={{ color: accentColor }}>
                        S/ {selectedOrder.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reorder Button */}
                <button
                  type="button"
                  onClick={() => handleReorder(selectedOrder)}
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Volver a Pedir esta Orden</span>
                </button>
              </div>
            ) : (
              /* ==============================================================
                 ORDERS LIST VIEW (ACTIVE REALTIME + HISTORY)
                 ============================================================== */
              <div className="space-y-4">
                {!currentCustomer && (
                  <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      isLightTheme
                        ? 'bg-white border-zinc-200/90 text-zinc-900 shadow-xs'
                        : 'bg-neutral-950 border-neutral-800 text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-black block ${
                          isLightTheme ? 'text-zinc-900' : 'text-white'
                        }`}
                      >
                        ¿Quieres conservar todo tu historial?
                      </span>
                      <span
                        className={`text-[11px] block ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        Inicia sesión en Perfil para sincronizar tus pedidos en cualquier equipo.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProfile();
                      }}
                      data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                      className="store-btn-solid px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Ingresar</span>
                    </button>
                  </div>
                )}

                {customerOrders.length > 0 && (
                  <div
                    className={`grid grid-cols-3 gap-1.5 p-1 rounded-2xl border ${
                      isLightTheme
                        ? 'bg-zinc-200/80 border-zinc-200'
                        : 'bg-neutral-950 border-neutral-800'
                    }`}
                  >
                    {(
                      [
                        ['activos', `En Curso (${activeOrders.length})`],
                        ['historial', `Historial (${historyOrders.length})`],
                        ['todos', `Todos (${customerOrders.length})`],
                      ] as const
                    ).map(([fId, fLabel]) => {
                      const active = filter === fId;
                      return (
                        <button
                          key={fId}
                          type="button"
                          onClick={() => setFilter(fId)}
                          data-auto-contrast={active && autoButtonContrast ? 'true' : 'false'}
                          className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all whitespace-nowrap shrink-0 ${
                            active
                              ? 'store-btn-solid shadow-xs'
                              : isLightTheme
                              ? 'text-zinc-600 hover:text-zinc-900'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {fLabel}
                        </button>
                      );
                    })}
                  </div>
                )}

                {effectiveList.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2">
                    <div
                      className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto ${
                        isLightTheme
                          ? 'bg-white border-zinc-200 text-zinc-400 shadow-xs'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                      }`}
                    >
                      <Receipt className="w-7 h-7" />
                    </div>
                    <p
                      className={`text-sm font-black ${
                        isLightTheme ? 'text-zinc-900' : 'text-white'
                      }`}
                    >
                      Aún no registras pedidos aquí
                    </p>
                    <p
                      className={`text-xs max-w-xs mx-auto ${
                        isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                      }`}
                    >
                      Cuando realices un pedido, verás aquí en vivo cómo avanza desde cocina y
                      horno hasta tu puerta.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {effectiveList.map(order => (
                      <div
                        key={order.id}
                        className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                          isLightTheme
                            ? 'bg-white border-zinc-200/90 text-zinc-900 shadow-xs hover:border-zinc-300'
                            : 'bg-neutral-950 border-neutral-800 text-white hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-sm font-black ${
                                  isLightTheme ? 'text-zinc-900' : 'text-white'
                                }`}
                              >
                                {order.orderNumber}
                              </span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                                  isLightTheme
                                    ? 'bg-zinc-100 text-zinc-700 border border-zinc-200/60'
                                    : 'bg-neutral-900 text-neutral-300'
                                }`}
                              >
                                {isPickupOrder(order) ? 'Para Llevar' : 'Delivery'}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] block mt-0.5 ${
                                isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                              }`}
                            >
                              {getBranchName(order.tenantId)} •{' '}
                              {isActiveOrderStatus(order.status)
                                ? `Hace ${getElapsedMinutes(order.createdAt)} min`
                                : new Date(order.createdAt).toLocaleDateString('es-PE')}
                            </span>
                          </div>

                          {renderStatusBadge(order)}
                        </div>

                        {isActiveOrderStatus(order.status) && renderRealtimeTracker(order)}

                        {/* Compact items preview */}
                        <p
                          className={`text-xs truncate ${
                            isLightTheme ? 'text-zinc-600' : 'text-neutral-300'
                          }`}
                        >
                          {order.items.map(i => `${i.quantity}× ${i.productName}`).join(', ')}
                        </p>

                        <div
                          className={`pt-2.5 border-t flex items-center justify-between gap-2 ${
                            isLightTheme ? 'border-zinc-100' : 'border-neutral-900'
                          }`}
                        >
                          <span className="text-sm font-black" style={{ color: accentColor }}>
                            S/ {order.total.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                              isLightTheme
                                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                            }`}
                          >
                            <span>Ver Detalles</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
};
