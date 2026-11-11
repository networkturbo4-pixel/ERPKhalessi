import React, { useState, useEffect } from 'react';
import { Order } from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import {
  Flame,
  ChefHat,
  Globe2,
  Clock,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Bike,
  UtensilsCrossed,
  Radio,
  MapPin,
  Smartphone,
} from 'lucide-react';

type MobileKdsStage = 'recibido' | 'horno' | 'listo';

export const KitchenKDSView: React.FC = () => {
  const { orders, updateOrderStatus, lastRealtimeSyncAt } = useOrderCatalog();
  const { activeTenant, branchScope, setBranchScope, tenants } = useSettings();
  const [, setTick] = useState(0);
  const [mobileStage, setMobileStage] = useState<MobileKdsStage>('recibido');

  // Live timer tick every 10 seconds to update elapsed badges
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders for active branch if not consolidated
  const branchOrders = orders.filter((o) => {
    if (branchScope === 'consolidated') return true;
    return o.tenantId === activeTenant.id;
  });

  const otherBranchesActiveCount =
    branchScope === 'branch'
      ? orders.filter(
          (o) =>
            o.tenantId !== activeTenant.id &&
            (o.status === 'recibido' ||
              o.status === 'en_cocina' ||
              o.status === 'en_horno' ||
              o.status === 'listo')
        ).length
      : 0;

  // Active kitchen stages
  const receivedOrders = branchOrders.filter((o) => o.status === 'recibido');
  const cookingOrders = branchOrders.filter((o) => o.status === 'en_cocina' || o.status === 'en_horno');
  const readyOrders = branchOrders.filter((o) => o.status === 'listo');
  const inRouteCount = branchOrders.filter((o) => o.status === 'en_ruta').length;

  const getBranchShortName = (tenantId: string) => {
    const found = tenants.find((t) => t.id === tenantId);
    return found ? found.name.replace('Khalessi Pizza - ', '') : tenantId;
  };

  const getElapsedMinutes = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    return Math.max(1, Math.floor(elapsedMs / (1000 * 60)));
  };

  const isDeliveryChannel = (order: Order) =>
    order.channel === 'online' || order.channel === 'pos-delivery';

  const renderOrderCard = (order: Order) => {
    const elapsed = getElapsedMinutes(order.createdAt);
    const isLate = elapsed > 20;
    const isWarning = elapsed > 12;
    const isDelivery = isDeliveryChannel(order);

    return (
      <div
        key={order.id}
        className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 space-y-3 shadow-sm transition-all ${
          isLate
            ? 'border-red-500/80 bg-red-50/40 dark:bg-red-950/20 ring-1 ring-red-500/30'
            : isWarning
            ? 'border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/30'
            : 'border-zinc-200 dark:border-zinc-800'
        }`}
      >
        {/* Card Header: Order Number, Channel, Timer */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-sm sm:text-base text-zinc-950 dark:text-white tracking-wider">
              {order.orderNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shrink-0 ${
                order.channel === 'online'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30'
                  : order.channel === 'pos-delivery'
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30'
                  : order.channel === 'kiosco-salon' || order.channel === 'kiosco-takeaway'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                  : order.channel === 'pos-salon'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
              }`}
            >
              {order.channel === 'online' ? (
                <>
                  <Bike className="w-3 h-3" /> Web Delivery
                </>
              ) : order.channel === 'pos-delivery' ? (
                <>
                  <Bike className="w-3 h-3" /> POS Delivery
                </>
              ) : order.channel === 'kiosco-salon' ? (
                <>
                  <Smartphone className="w-3 h-3" /> Kiosco Salón
                </>
              ) : order.channel === 'kiosco-takeaway' ? (
                <>
                  <Smartphone className="w-3 h-3" /> Kiosco Llevar
                </>
              ) : order.channel === 'pos-salon' ? (
                <>
                  <UtensilsCrossed className="w-3 h-3" /> {order.tableNumber || 'Salón'}
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3 h-3" /> Para Llevar
                </>
              )}
            </span>

            {branchScope === 'consolidated' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {getBranchShortName(order.tenantId)}
              </span>
            )}
          </div>

          {/* Live Elapsed Badge */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm shrink-0 ${
              isLate
                ? 'bg-red-500 text-white animate-pulse'
                : isWarning
                ? 'bg-amber-500 text-zinc-950 font-black'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{elapsed}m</span>
          </div>
        </div>

        {/* Customer / Address preview */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center justify-between gap-2">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {order.customerName}
            </span>
            <span className="text-zinc-400 text-[11px] shrink-0">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {isDelivery && order.deliveryAddress && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Items List for Chefs & Horneros */}
        <div className="space-y-2 pt-0.5">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800/80 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">
                    {item.quantity}
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                    {item.productName}
                  </span>
                </div>

                {item.size && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
                    {item.size.name} ({item.size.slices}c)
                  </span>
                )}
              </div>

              {/* Half & Half Split Flavors */}
              {item.halfAndHalf && (
                <div className="pl-8 pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-zinc-950 text-amber-400 border border-amber-500/40">
                    🍕 1/2 {item.halfAndHalf.firstHalfName} + 1/2 {item.halfAndHalf.secondHalfName}
                  </span>
                </div>
              )}

              {/* Sub-options */}
              {item.subOptions.length > 0 && (
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-8">
                  {item.subOptions.map((s) => s.choiceName).join(' • ')}
                </div>
              )}

              {/* Extras Highlighted (Crucial for pizza prep!) */}
              {item.extras.length > 0 && (
                <div className="pl-8 pt-0.5 flex flex-wrap gap-1">
                  {item.extras.map((extra) => (
                    <span
                      key={extra.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {extra.name}
                    </span>
                  ))}
                </div>
              )}

              {item.notes && (
                <div className="pl-8 text-[11px] text-amber-700 dark:text-amber-400 font-semibold italic">
                  ⚠️ Nota: &quot;{item.notes}&quot;
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tactile Action Controls (min-h-[48px] for touch screens & single-line text) */}
        <div className="pt-2 flex items-center gap-2">
          {order.status === 'recibido' && (
            <>
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'en_cocina')}
                className="flex-1 min-h-[48px] whitespace-nowrap shrink-0 py-2.5 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              >
                <ChefHat className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Preparar Masa</span>
              </button>
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'en_horno')}
                className="flex-1 min-h-[48px] whitespace-nowrap shrink-0 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              >
                <Flame className="w-4 h-4 fill-zinc-950 shrink-0" />
                <span>Al Horno 🔥</span>
              </button>
            </>
          )}

          {order.status === 'en_cocina' && (
            <>
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'en_horno')}
                className="flex-1 min-h-[48px] whitespace-nowrap shrink-0 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              >
                <Flame className="w-4 h-4 fill-zinc-950 shrink-0" />
                <span>Meter al Horno 🔥</span>
              </button>
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'listo')}
                className="min-h-[48px] whitespace-nowrap shrink-0 py-2.5 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Lista ✅</span>
              </button>
            </>
          )}

          {order.status === 'en_horno' && (
            <button
              type="button"
              onClick={() => updateOrderStatus(order.id, 'listo')}
              className="w-full min-h-[48px] whitespace-nowrap shrink-0 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Pizza Lista! Avisar Despacho ✅</span>
            </button>
          )}

          {order.status === 'listo' &&
            (isDelivery ? (
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'en_ruta')}
                className="w-full min-h-[48px] whitespace-nowrap shrink-0 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <Bike className="w-4 h-4 shrink-0" />
                <span>Enviar a Motorizado / En Ruta 🛵</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'entregado')}
                className="w-full min-h-[48px] whitespace-nowrap shrink-0 py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-700 transition-all active:scale-[0.98]"
              >
                <span>Entregar en Salón / Mostrador 🎉</span>
              </button>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-4 touch-surface">
      {/* KDS Header with High Contrast & Real-Time Sync Telemetry */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
            <span>Cocina & Horno KDS</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Sincronización instantánea POS ↔ Cocina ↔ Delivery · Sede:{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {branchScope === 'consolidated' ? 'Consolidado Corporativo' : activeTenant.name}
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {otherBranchesActiveCount > 0 && (
            <button
              type="button"
              onClick={() => setBranchScope('consolidated')}
              className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black shadow-xs hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
            >
              <Globe2 className="w-3.5 h-3.5 shrink-0" />
              <span>+{otherBranchesActiveCount} en otras sedes · Ver todas</span>
            </button>
          )}

          {inRouteCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-bold whitespace-nowrap shrink-0">
              <Bike className="w-3.5 h-3.5" />
              <span>{inRouteCount} en ruta delivery</span>
            </div>
          )}

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 font-bold whitespace-nowrap shrink-0"
            title={`Último pulso: ${new Date(lastRealtimeSyncAt).toLocaleTimeString()}`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Tiempo Real Activo</span>
          </div>
        </div>
      </div>

      {/* Mobile Stage Tabs (Hidden on Desktop md+, tactile 48px height on mobile) */}
      <div className="grid grid-cols-3 gap-2 md:hidden p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileStage('recibido')}
          className={`min-h-[46px] px-2 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            mobileStage === 'recibido'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span>Cola</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px]">
            {receivedOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileStage('horno')}
          className={`min-h-[46px] px-2 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            mobileStage === 'horno'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span>Horno 🔥</span>
          <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px]">
            {cookingOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileStage('listo')}
          className={`min-h-[46px] px-2 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            mobileStage === 'listo'
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span>Listos ✅</span>
          <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px]">
            {readyOrders.length}
          </span>
        </button>
      </div>

      {/* Kanban 3 Columns on Desktop / Active Stage on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-start">
        {/* Column 1: Recibidos */}
        <div className={`space-y-3 ${mobileStage !== 'recibido' ? 'hidden md:block' : ''}`}>
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> 1. Por Preparar
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-black">
              {receivedOrders.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[260px] md:min-h-[420px]">
            {receivedOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-white/60 dark:bg-zinc-900/50">
                No hay comandas pendientes en cola
              </div>
            ) : (
              receivedOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* Column 2: En Horno / Preparación */}
        <div className={`space-y-3 ${mobileStage !== 'horno' ? 'hidden md:block' : ''}`}>
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30">
            <span className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500 animate-bounce" /> 2. En Horno a la Leña
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-xs font-black">
              {cookingOrders.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[260px] md:min-h-[420px]">
            {cookingOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-white/60 dark:bg-zinc-900/50">
                El horno está libre para nuevas pizzas
              </div>
            ) : (
              cookingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* Column 3: Listos para Despacho */}
        <div className={`space-y-3 ${mobileStage !== 'listo' ? 'hidden md:block' : ''}`}>
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/30">
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 3. Listos para Despacho
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-black">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[260px] md:min-h-[420px]">
            {readyOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-white/60 dark:bg-zinc-900/50">
                No hay pizzas esperando recojo o motorizado
              </div>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
