import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Order, PaymentMethod } from '../../types/catalog';
import { ActiveNavigationRoute, DriverAvailabilityStatus } from '../../types/delivery';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { InAppDriverMap, getOrderApproxCoords } from './InAppDriverMap';
import { ProofPhotoCaptureModal } from './ProofPhotoCaptureModal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { getMapboxSettings } from '../../utils/mapboxConfig';
import { soundSynth } from '../../utils/audio';
import {
  startNativeDriverLocation,
  stopNativeDriverLocation,
} from '../../utils/inboxNativeBridge';
import {
  DRIVER_FLEET_EVENT,
  fetchInAppRoute,
  formatDurationCompact,
  haversineDistanceMeters,
  loadDriverFleetSnapshot,
  pushDriverLocationToServer,
  recordDriverLocationPing,
  setDriverAvailabilityStatus,
} from '../../utils/driverTracking';
import {
  Bike,
  Coffee,
  Power,
  Navigation,
  Phone,
  MessageCircle,
  Camera,
  CheckCircle2,
  MapPin,
  Clock,
  AlertTriangle,
  PackageCheck,
  Banknote,
  Smartphone,
  CreditCard,
  CornerUpRight,
  ExternalLink,
  ChevronUp,
  Sun,
  Moon,
  BellRing,
  X,
} from 'lucide-react';

type SheetSnap = 'collapsed' | 'half' | 'expanded';
type DriverSheetTab = 'radar' | 'cocina' | 'entregados';

const STATUS_META: Record<
  DriverAvailabilityStatus,
  { label: string; dotClass: string; pillClass: string }
> = {
  disponible: {
    label: 'Disponible',
    dotClass: 'bg-emerald-500',
    pillClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  en_ruta: {
    label: 'En Ruta',
    dotClass: 'bg-blue-500',
    pillClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  descanso: {
    label: 'En Descanso',
    dotClass: 'bg-amber-500',
    pillClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  offline: {
    label: 'Desconectado',
    dotClass: 'bg-zinc-400',
    pillClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30',
  },
};

function projectVelocity(velocityPxPerSec: number, decelerationRate = 0.996): number {
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

export const DriverModeView: React.FC = () => {
  const { orders, updateOrderStatus } = useOrderCatalog();
  const { activeTenant, branchScope, tenants, openNoticeModal, dispatchToast } = useSettings();
  const { currentUser } = useRBAC();

  const mapDefaults = useMemo(() => getMapboxSettings(), []);
  const defaultBranchCenter: [number, number] = useMemo(
    () => [mapDefaults.defaultLat, mapDefaults.defaultLng],
    [mapDefaults.defaultLat, mapDefaults.defaultLng]
  );

  // Driver live state synced from storage/events
  const [fleetSnapshot, setFleetSnapshot] = useState(() => loadDriverFleetSnapshot());
  const selfDriverState = fleetSnapshot.drivers[currentUser.id];
  const driverStatus: DriverAvailabilityStatus = selfDriverState?.status || 'disponible';

  // Live GPS coordinates
  const [driverPos, setDriverPos] = useState<[number, number] | null>(() =>
    selfDriverState?.lastLocation
      ? [selfDriverState.lastLocation.lat, selfDriverState.lastLocation.lng]
      : defaultBranchCenter
  );
  const [driverHeading, setDriverHeading] = useState<number>(
    selfDriverState?.lastLocation?.heading || 0
  );
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Live clock for timers (break timer & elapsed minutes)
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Listen to fleet updates
  useEffect(() => {
    const onFleet = () => setFleetSnapshot(loadDriverFleetSnapshot());
    window.addEventListener(DRIVER_FLEET_EVENT, onFleet);
    return () => window.removeEventListener(DRIVER_FLEET_EVENT, onFleet);
  }, []);

  // Delivery orders for branch scope
  const deliveryOrders = useMemo(
    () =>
      orders.filter((o) => {
        const isDelivery =
          (o.channel === 'online' && o.deliveryAddress !== 'Recojo en Sucursal') ||
          o.channel === 'pos-delivery';
        if (!isDelivery) return false;
        if (branchScope === 'consolidated') return true;
        return o.tenantId === activeTenant.id;
      }),
    [orders, branchScope, activeTenant.id]
  );

  // Active order assigned to this driver (or in route)
  const myActiveOrder = useMemo(
    () =>
      deliveryOrders.find(
        (o) =>
          o.status === 'en_ruta' &&
          (!o.assignedDriverId || o.assignedDriverId === currentUser.id)
      ) || null,
    [deliveryOrders, currentUser.id]
  );

  const readyOrders = useMemo(
    () => deliveryOrders.filter((o) => o.status === 'listo'),
    [deliveryOrders]
  );
  const kitchenOrders = useMemo(
    () =>
      deliveryOrders.filter(
        (o) => o.status === 'recibido' || o.status === 'en_cocina' || o.status === 'en_horno'
      ),
    [deliveryOrders]
  );
  const myDeliveredToday = useMemo(
    () =>
      deliveryOrders
        .filter(
          (o) =>
            o.status === 'entregado' &&
            (!o.assignedDriverId || o.assignedDriverId === currentUser.id)
        )
        .slice(0, 12),
    [deliveryOrders, currentUser.id]
  );

  const [sheetTab, setSheetTab] = useState<DriverSheetTab>('radar');
  const [activeRoute, setActiveRoute] = useState<ActiveNavigationRoute | null>(null);
  const [showEmergencyNav, setShowEmergencyNav] = useState(false);

  // Day (high-contrast under sun) vs Night (anti-glare) toggle
  const [driverTheme, setDriverTheme] = useState<'day' | 'night'>(() => {
    try {
      const saved = localStorage.getItem('kh_driver_theme_v1');
      if (saved === 'day' || saved === 'night') return saved;
    } catch {
      // ignore
    }
    const hour = new Date().getHours();
    return hour >= 19 || hour < 6 ? 'night' : 'day';
  });

  const toggleDriverTheme = () => {
    setDriverTheme((prev) => {
      const next = prev === 'day' ? 'night' : 'day';
      try {
        localStorage.setItem('kh_driver_theme_v1', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Uber-style incoming offer alert when a new order transitions to 'listo' while driver is Disponible
  const [incomingOfferOrder, setIncomingOfferOrder] = useState<Order | null>(null);
  const seenReadyIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentReadyIds = new Set(readyOrders.map((o) => o.id));
    if (seenReadyIdsRef.current === null) {
      seenReadyIdsRef.current = currentReadyIds;
      return;
    }
    const newlyReady = readyOrders.find((o) => !seenReadyIdsRef.current!.has(o.id));
    seenReadyIdsRef.current = currentReadyIds;

    if (newlyReady && driverStatus === 'disponible' && !myActiveOrder) {
      setIncomingOfferOrder(newlyReady);
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([140, 70, 140]);
        }
      } catch {
        // ignore vibrate unsupported
      }
      soundSynth.play('chime');
    }
  }, [readyOrders, driverStatus, myActiveOrder]);

  // Auto-dismiss incoming offer if order is no longer 'listo'
  useEffect(() => {
    if (incomingOfferOrder && !readyOrders.some((o) => o.id === incomingOfferOrder.id)) {
      setIncomingOfferOrder(null);
    }
  }, [incomingOfferOrder, readyOrders]);

  // Photo proof & Lightbox
  const [photoModalState, setPhotoModalState] = useState<{
    isOpen: boolean;
    order: Order | null;
    stage: 'pickup' | 'delivery';
    title: string;
  }>({ isOpen: false, order: null, stage: 'pickup', title: '' });

  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    title: string;
    subtitle?: string;
  }>({ isOpen: false, imageUrl: null, title: '' });

  // Sync driver status with active order automatically
  useEffect(() => {
    if (myActiveOrder && driverStatus !== 'en_ruta') {
      setDriverAvailabilityStatus({
        driverId: currentUser.id,
        driverName: currentUser.name,
        tenantId: activeTenant.id,
        avatarUrl: currentUser.avatarUrl,
        phone: currentUser.phone,
        status: 'en_ruta',
        activeOrderId: myActiveOrder.id,
      });
    } else if (!myActiveOrder && driverStatus === 'en_ruta') {
      setDriverAvailabilityStatus({
        driverId: currentUser.id,
        driverName: currentUser.name,
        tenantId: activeTenant.id,
        avatarUrl: currentUser.avatarUrl,
        phone: currentUser.phone,
        status: 'disponible',
      });
    }
  }, [
    myActiveOrder,
    driverStatus,
    currentUser.id,
    currentUser.name,
    currentUser.avatarUrl,
    currentUser.phone,
    activeTenant.id,
  ]);

  // Native Android background GPS Foreground Service sync
  useEffect(() => {
    if (driverStatus === 'offline') {
      void stopNativeDriverLocation();
      return;
    }
    void startNativeDriverLocation({
      driverId: currentUser.id,
      driverName: currentUser.name,
      tenantId: activeTenant.id,
      status: driverStatus,
      activeOrderId: myActiveOrder?.id,
    });
  }, [driverStatus, currentUser.id, currentUser.name, activeTenant.id, myActiveOrder?.id]);

  // Real-time GPS watchPosition when online
  useEffect(() => {
    if (driverStatus === 'offline' || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const handleCoords = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const heading = typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading)
        ? pos.coords.heading
        : driverHeading;
      const speedKmh =
        typeof pos.coords.speed === 'number' && !Number.isNaN(pos.coords.speed)
          ? Math.round(pos.coords.speed * 3.6)
          : undefined;

      setDriverPos([lat, lng]);
      setDriverHeading(heading);
      setGpsAccuracy(Math.round(pos.coords.accuracy || 0));

      const ping = {
        driverId: currentUser.id,
        driverName: currentUser.name,
        tenantId: activeTenant.id,
        lat,
        lng,
        heading,
        speedKmh,
        accuracyM: Math.round(pos.coords.accuracy || 0),
        status: driverStatus,
        activeOrderId: myActiveOrder?.id,
        timestamp: new Date().toISOString(),
      };
      recordDriverLocationPing(ping);
      void pushDriverLocationToServer(ping);
    };

    const watchId = navigator.geolocation.watchPosition(handleCoords, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverStatus, currentUser.id, currentUser.name, activeTenant.id, myActiveOrder?.id]);

  // Compute in-app route whenever active order or origin changes
  useEffect(() => {
    if (!myActiveOrder) {
      setActiveRoute(null);
      return;
    }
    const origin = driverPos || defaultBranchCenter;
    const dest = getOrderApproxCoords(myActiveOrder, defaultBranchCenter);
    let cancelled = false;
    fetchInAppRoute({
      orderId: myActiveOrder.id,
      originLat: origin[0],
      originLng: origin[1],
      destLat: dest[0],
      destLng: dest[1],
    }).then((route) => {
      if (!cancelled) setActiveRoute(route);
    });
    return () => {
      cancelled = true;
    };
  }, [myActiveOrder?.id, defaultBranchCenter]);

  // Distance to destination & arrival geofence (< 70m)
  const distanceToDestMeters = useMemo(() => {
    if (!myActiveOrder || !driverPos) return null;
    const dest = getOrderApproxCoords(myActiveOrder, defaultBranchCenter);
    return Math.round(haversineDistanceMeters(driverPos[0], driverPos[1], dest[0], dest[1]));
  }, [myActiveOrder, driverPos, defaultBranchCenter]);

  const isNearDestination = distanceToDestMeters !== null && distanceToDestMeters <= 70;

  // Physics-based Bottom Sheet (1:1 pointer tracking + momentum projection)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('half');
  const [dragTranslateY, setDragTranslateY] = useState<number | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startY: number;
    baseTranslateY: number;
    history: Array<{ y: number; t: number }>;
  }>({ active: false, startY: 0, baseTranslateY: 0, history: [] });

  const getSnapTranslateY = useCallback((targetSnap: SheetSnap): number => {
    const h = containerRef.current?.clientHeight || 720;
    if (targetSnap === 'expanded') return Math.round(h * 0.14);
    if (targetSnap === 'half') return Math.round(h * 0.52);
    return Math.round(h - 118); // collapsed peek
  }, []);

  const currentTranslateY = dragTranslateY !== null ? dragTranslateY : getSnapTranslateY(snap);

  const handleSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const base = getSnapTranslateY(snap);
    dragRef.current = {
      active: true,
      startY: e.clientY,
      baseTranslateY: base,
      history: [{ y: e.clientY, t: performance.now() }],
    };
    setDragTranslateY(base);
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const minTop = getSnapTranslateY('expanded');
    const maxTop = getSnapTranslateY('collapsed');
    const delta = e.clientY - dragRef.current.startY;
    const nextY = Math.max(minTop, Math.min(maxTop, dragRef.current.baseTranslateY + delta));
    dragRef.current.history.push({ y: e.clientY, t: performance.now() });
    if (dragRef.current.history.length > 6) dragRef.current.history.shift();
    setDragTranslateY(nextY);
  };

  const handleSheetPointerUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const hist = dragRef.current.history;
    let velocityY = 0;
    if (hist.length >= 2) {
      const first = hist[0];
      const last = hist[hist.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0.01) velocityY = (last.y - first.y) / dt;
    }
    const projectedY = (dragTranslateY ?? getSnapTranslateY(snap)) + projectVelocity(velocityY);
    const candidates: Array<{ key: SheetSnap; y: number }> = [
      { key: 'expanded', y: getSnapTranslateY('expanded') },
      { key: 'half', y: getSnapTranslateY('half') },
      { key: 'collapsed', y: getSnapTranslateY('collapsed') },
    ];
    candidates.sort((a, b) => Math.abs(a.y - projectedY) - Math.abs(b.y - projectedY));
    setSnap(candidates[0].key);
    setDragTranslateY(null);
  };

  const handleToggleStatus = (nextStatus: DriverAvailabilityStatus) => {
    if (myActiveOrder && nextStatus !== 'en_ruta') {
      openNoticeModal({
        title: 'Pedido en curso',
        message: `Tienes el pedido #${myActiveOrder.orderNumber} en ruta. Finaliza o entrega el pedido antes de cambiar tu estado.`,
        tone: 'warning',
        confirmLabel: 'Entendido',
        hideCancel: true,
      });
      return;
    }
    setDriverAvailabilityStatus({
      driverId: currentUser.id,
      driverName: currentUser.name,
      tenantId: activeTenant.id,
      avatarUrl: currentUser.avatarUrl,
      phone: currentUser.phone,
      status: nextStatus,
    });
    const labels: Record<DriverAvailabilityStatus, string> = {
      disponible: 'En línea y disponible para pedidos',
      descanso: 'Descanso iniciado · cronómetro activo',
      offline: 'Desconectado · GPS en segundo plano pausado',
      en_ruta: 'En ruta',
    };
    dispatchToast('Estado actualizado', labels[nextStatus], nextStatus === 'descanso' ? 'warning' : 'success');
  };

  const handleTakeOrder = (order: Order) => {
    if (driverStatus === 'descanso' || driverStatus === 'offline') {
      openNoticeModal({
        title: 'Activa tu disponibilidad',
        message: 'Estás en modo descanso o desconectado. ¿Deseas ponerte Disponible y tomar este pedido ahora?',
        tone: 'info',
        confirmLabel: 'Sí, Tomar Pedido',
        cancelLabel: 'Cancelar',
        onConfirm: () => {
          setDriverAvailabilityStatus({
            driverId: currentUser.id,
            driverName: currentUser.name,
            tenantId: activeTenant.id,
            status: 'en_ruta',
            activeOrderId: order.id,
          });
          setPhotoModalState({
            isOpen: true,
            order,
            stage: 'pickup',
            title: `Foto de Recojo · Pedido #${order.orderNumber}`,
          });
        },
      });
      return;
    }
    setPhotoModalState({
      isOpen: true,
      order,
      stage: 'pickup',
      title: `Foto de Recojo · Pedido #${order.orderNumber}`,
    });
  };

  const handleEmergencyExternalNav = (provider: 'waze' | 'google', order: Order) => {
    openNoticeModal({
      title: 'Navegación externa de emergencia',
      message: `La ruta principal está integrada en Khalessi. ¿Deseas abrir ${
        provider === 'waze' ? 'Waze' : 'Google Maps'
      } solo como respaldo de emergencia para #${order.orderNumber}?`,
      tone: 'warning',
      confirmLabel: 'Abrir Emergencia',
      cancelLabel: 'Seguir aquí',
      onConfirm: () => {
        const dest = getOrderApproxCoords(order, defaultBranchCenter);
        const url =
          provider === 'waze'
            ? `https://waze.com/ul?ll=${dest[0]},${dest[1]}&navigate=yes`
            : `https://www.google.com/maps/dir/?api=1&destination=${dest[0]},${dest[1]}`;
        window.open(url, '_blank');
      },
    });
  };

  const formatPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'efectivo':
        return { label: 'Efectivo', icon: Banknote, cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
      case 'yape_plin':
        return { label: 'Yape / Plin', icon: Smartphone, cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-300' };
      case 'transferencia':
        return { label: 'Transferencia', icon: CreditCard, cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' };
      default:
        return { label: 'Tarjeta / Web', icon: CreditCard, cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' };
    }
  };

  const currentBreakElapsedSec =
    driverStatus === 'descanso' && selfDriverState?.currentBreakStartedAt
      ? Math.max(0, Math.floor((nowMs - new Date(selfDriverState.currentBreakStartedAt).getTime()) / 1000))
      : 0;

  const currentStep = activeRoute?.steps?.[0];
  const etaMinutes = activeRoute ? Math.max(1, Math.round(activeRoute.durationSeconds / 60)) : null;

  const sheetVisibleHeight = Math.max(118, (containerRef.current?.clientHeight || 720) - currentTranslateY);

  const isNight = driverTheme === 'night';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden overscroll-none select-none [-webkit-tap-highlight-color:transparent] ${
        isNight ? 'bg-zinc-950' : 'bg-zinc-100'
      }`}
    >
      {/* Full-bleed In-App Map */}
      <InAppDriverMap
        center={driverPos || defaultBranchCenter}
        driverLocation={driverPos}
        driverHeading={driverHeading}
        storeLocation={defaultBranchCenter}
        storeLabel={activeTenant.name.replace('Gastro - ', '')}
        activeOrder={myActiveOrder}
        availableOrders={readyOrders}
        route={activeRoute}
        mapTheme={driverTheme}
        bottomOffsetPx={Math.min(sheetVisibleHeight, 360)}
        onSelectOrder={(ord) => {
          setSnap('half');
          const ordCode = ord.orderNumber.startsWith('#') ? ord.orderNumber : `#${ord.orderNumber}`;
          dispatchToast(`Pedido ${ordCode}`, `${ord.customerName} · S/ ${ord.total.toFixed(2)}`, 'info');
        }}
      />

      {/* Top Floating HUD: Status Toggle + Day/Night Switch + GPS Pill */}
      <div className="absolute top-3 inset-x-3 pt-[env(safe-area-inset-top,0px)] z-[500] flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          <div
            className={`inline-flex items-center gap-1 p-1 rounded-2xl backdrop-blur-xl border shadow-lg ${
              isNight
                ? 'bg-zinc-900/95 border-zinc-700/80 text-white'
                : 'bg-white/95 border-zinc-300 text-zinc-950'
            }`}
          >
            <button
              type="button"
              onClick={() => handleToggleStatus('disponible')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-transform duration-150 active:scale-[0.97] cursor-pointer ${
                driverStatus === 'disponible' || driverStatus === 'en_ruta'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isNight
                  ? 'text-zinc-300 hover:bg-zinc-800'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              {driverStatus === 'en_ruta' ? 'En Ruta' : 'Disponible'}
            </button>

            <button
              type="button"
              onClick={() => handleToggleStatus('descanso')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-transform duration-150 active:scale-[0.97] cursor-pointer ${
                driverStatus === 'descanso'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : isNight
                  ? 'text-zinc-300 hover:bg-zinc-800'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              Descanso
            </button>

            <button
              type="button"
              onClick={() => handleToggleStatus('offline')}
              className={`inline-flex items-center justify-center p-1.5 rounded-xl text-xs font-bold transition-transform duration-150 active:scale-[0.97] cursor-pointer ${
                driverStatus === 'offline'
                  ? 'bg-zinc-800 text-white'
                  : isNight
                  ? 'text-zinc-400 hover:bg-zinc-800'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
              title="Desconectar turno"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right HUD: Day/Night High-Contrast Toggle + Live GPS Pill */}
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleDriverTheme}
              title={isNight ? 'Cambiar a modo Día (Alto Contraste)' : 'Cambiar a modo Noche'}
              className={`h-9 w-9 rounded-2xl backdrop-blur-xl border shadow-lg flex items-center justify-center transition-transform duration-150 active:scale-[0.95] cursor-pointer ${
                isNight
                  ? 'bg-zinc-900/95 border-zinc-700/80 text-amber-400'
                  : 'bg-white/95 border-zinc-300 text-zinc-900'
              }`}
            >
              {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl backdrop-blur-xl border shadow-lg text-xs font-semibold ${
                isNight
                  ? 'bg-zinc-900/95 border-zinc-700/80 text-zinc-100'
                  : 'bg-white/95 border-zinc-300 text-zinc-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_META[driverStatus].dotClass}`} />
              <span className="tabular-nums">
                {gpsAccuracy !== null ? `GPS ±${gpsAccuracy}m` : 'GPS Activo'}
              </span>
            </div>
          </div>
        </div>

        {/* Uber-style Floating Offer Alert when a new order becomes 'listo' */}
        {incomingOfferOrder && !myActiveOrder && (
          <div className="pointer-events-auto lg:ml-[416px] xl:ml-[446px] lg:max-w-md rounded-3xl bg-zinc-950/95 text-white backdrop-blur-xl border border-emerald-500/50 shadow-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                    Nuevo pedido listo ·{' '}
                    {incomingOfferOrder.orderNumber.startsWith('#')
                      ? incomingOfferOrder.orderNumber
                      : `#${incomingOfferOrder.orderNumber}`}
                  </p>
                  <p className="text-sm font-black text-white truncate">
                    {incomingOfferOrder.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncomingOfferOrder(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
                title="Omitir"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs text-zinc-200 truncate flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">
                  {incomingOfferOrder.deliveryAddress || 'Dirección de entrega'}
                </span>
              </p>
              <span className="text-sm font-black text-emerald-400 tabular-nums shrink-0">
                S/ {incomingOfferOrder.total.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIncomingOfferOrder(null)}
                className="px-4 min-h-[46px] rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold whitespace-nowrap shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
              >
                Omitir
              </button>
              <button
                type="button"
                onClick={() => {
                  const ord = incomingOfferOrder;
                  setIncomingOfferOrder(null);
                  handleTakeOrder(ord);
                }}
                className="flex-1 min-h-[46px] px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-black whitespace-nowrap shrink-0 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.97] transition-transform cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" />
                Aceptar Pedido
              </button>
            </div>
          </div>
        )}

        {/* Break Live Banner */}
        {driverStatus === 'descanso' && (
          <div className="pointer-events-auto mx-auto inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500 text-white shadow-xl text-xs font-bold">
            <Coffee className="w-4 h-4" />
            <span>En descanso ·</span>
            <span className="font-mono tabular-nums text-sm">
              {formatDurationCompact(currentBreakElapsedSec)}
            </span>
            <button
              type="button"
              onClick={() => handleToggleStatus('disponible')}
              className="ml-1 px-2.5 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-extrabold active:scale-[0.97] cursor-pointer"
            >
              Reanudar
            </button>
          </div>
        )}

        {/* Turn-by-Turn In-App Navigation Banner (when in route) */}
        {myActiveOrder && activeRoute && (
          <div className="pointer-events-auto lg:ml-[416px] xl:ml-[446px] lg:max-w-xl rounded-2xl bg-zinc-950/95 text-white backdrop-blur-xl border border-white/15 shadow-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isNearDestination ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
              >
                <CornerUpRight className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {isNearDestination
                    ? '¡Llegaste al punto de entrega!'
                    : currentStep?.instruction || 'Sigue la ruta marcada en azul'}
                </p>
                <p className="text-[11px] text-zinc-300 tabular-nums mt-0.5">
                  {distanceToDestMeters !== null
                    ? distanceToDestMeters >= 1000
                      ? `${(distanceToDestMeters / 1000).toFixed(1)} km`
                      : `${distanceToDestMeters} m`
                    : `${(activeRoute.distanceMeters / 1000).toFixed(1)} km`}{' '}
                  · ETA {etaMinutes} min · Ruta interna ({activeRoute.provider.toUpperCase()})
                </p>
              </div>
            </div>
            {isNearDestination && (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold shrink-0">
                En zona
              </span>
            )}
          </div>
        )}
      </div>

      {/* Physics-based Draggable Bottom Sheet (Mobile) / Floating Left Panel (Desktop) */}
      <div
        style={{
          transform: `translate3d(0, ${currentTranslateY}px, 0)`,
          transition:
            dragTranslateY === null
              ? 'transform 340ms cubic-bezier(0.32, 0.72, 0, 1)'
              : 'none',
        }}
        className={`absolute inset-x-0 top-0 bottom-0 lg:inset-x-auto lg:left-4 lg:top-[4.25rem] lg:bottom-4 lg:w-[400px] xl:w-[430px] lg:!transform-none z-[550] flex flex-col rounded-t-3xl lg:rounded-3xl lg:backdrop-blur-xl border-t lg:border shadow-[0_-12px_40px_rgba(0,0,0,0.22)] lg:shadow-2xl overflow-hidden ${
          isNight
            ? 'bg-zinc-950/95 border-zinc-800 text-white'
            : 'bg-white/95 border-zinc-300 text-zinc-950'
        }`}
      >
        {/* Drag Handle (Mobile) / Panel Header (Desktop) */}
        <div
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={handleSheetPointerUp}
          onPointerCancel={handleSheetPointerUp}
          className={`pt-2.5 lg:pt-3.5 pb-2 px-4 flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing lg:cursor-default touch-none shrink-0 lg:border-b ${
            isNight ? 'lg:border-zinc-800/80' : 'lg:border-zinc-200'
          }`}
        >
          <div
            className={`w-10 h-1.5 rounded-full lg:hidden ${
              isNight ? 'bg-zinc-700' : 'bg-zinc-300'
            }`}
          />
          <div className="w-full flex items-center justify-between">
            <span
              className={`text-xs font-extrabold uppercase tracking-wide ${
                isNight ? 'text-white' : 'text-zinc-950'
              }`}
            >
              {myActiveOrder
                ? `Entrega Activa · ${myActiveOrder.orderNumber.startsWith('#') ? myActiveOrder.orderNumber : `#${myActiveOrder.orderNumber}`}`
                : `Radar de Pedidos (${readyOrders.length} listos)`}
            </span>
            <button
              type="button"
              onClick={() =>
                setSnap((prev) =>
                  prev === 'collapsed' ? 'half' : prev === 'half' ? 'expanded' : 'collapsed'
                )
              }
              className={`p-1 rounded-lg lg:hidden ${
                isNight ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <ChevronUp
                className={`w-4 h-4 transition-transform duration-200 ${
                  snap === 'expanded' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sheet Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] space-y-3">
          {myActiveOrder ? (
            /* ACTIVE ORDER IN ROUTE */
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-zinc-900 dark:text-white truncate">
                      {myActiveOrder.customerName}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{myActiveOrder.deliveryAddress || 'Dirección no especificada'}</span>
                    </p>
                    {myActiveOrder.deliveryReference && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 pl-5">
                        Ref: {myActiveOrder.deliveryReference}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-zinc-900 dark:text-white tabular-nums">
                      S/ {myActiveOrder.total.toFixed(2)}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        myActiveOrder.paymentStatus === 'pagado'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {myActiveOrder.paymentStatus === 'pagado' ? 'Pagado' : 'Cobrar al entregar'}
                    </span>
                  </div>
                </div>

                {/* Items summary */}
                <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800 space-y-1">
                  {myActiveOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="truncate">
                        <strong className="font-bold">{item.quantity}x</strong> {item.productName}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Contact & Proof Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a
                    href={`tel:${myActiveOrder.customerPhone}`}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-bold active:scale-[0.97] transition-transform"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Llamar
                  </a>
                  <a
                    href={`https://wa.me/${myActiveOrder.customerPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold active:scale-[0.97] transition-transform"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                </div>
              </div>

              {/* Primary Delivery Completion CTA */}
              <button
                type="button"
                onClick={() =>
                  setPhotoModalState({
                    isOpen: true,
                    order: myActiveOrder,
                    stage: 'delivery',
                    title: `Confirmar Entrega · #${myActiveOrder.orderNumber}`,
                  })
                }
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-transform duration-150 active:scale-[0.97] cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Capturar Evidencia y Entregar
              </button>

              {/* Emergency External Maps Fallback (strictly secondary) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowEmergencyNav((v) => !v)}
                  className="w-full py-2 text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3" />
                  ¿Problemas de red? Usar navegación externa de emergencia
                </button>
                {showEmergencyNav && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleEmergencyExternalNav('waze', myActiveOrder)}
                      className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Waze (Emergencia)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEmergencyExternalNav('google', myActiveOrder)}
                      className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Maps (Emergencia)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* RADAR DE PEDIDOS (InDriver style) */
            <>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900">
                {(
                  [
                    { id: 'radar', label: `Listos (${readyOrders.length})` },
                    { id: 'cocina', label: `En Horno (${kitchenOrders.length})` },
                    { id: 'entregados', label: `Hoy (${myDeliveredToday.length})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSheetTab(t.id)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      sheetTab === t.id
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {sheetTab === 'radar' && (
                <div className="space-y-2.5">
                  {readyOrders.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-500">
                      No hay pedidos listos para recojo en este momento.
                    </div>
                  ) : (
                    readyOrders.map((order) => {
                      const pay = formatPaymentBadge(order.paymentMethod);
                      const PayIcon = pay.icon;
                      const mins = Math.max(
                        1,
                        Math.floor((nowMs - new Date(order.createdAt).getTime()) / 60000)
                      );
                      const branchName =
                        tenants.find((t) => t.id === order.tenantId)?.name.replace('Gastro - ', '') ||
                        order.tenantId;
                      return (
                        <div
                          key={order.id}
                          className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  #{order.orderNumber}
                                </span>
                                <span className="text-[11px] font-semibold text-zinc-400">
                                  {branchName}
                                </span>
                                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums inline-flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> {mins}m
                                </span>
                              </div>
                              <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5 truncate">
                                {order.customerName}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {order.deliveryAddress}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-zinc-900 dark:text-white tabular-nums">
                                S/ {order.total.toFixed(2)}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pay.cls}`}
                              >
                                <PayIcon className="w-3 h-3" />
                                {pay.label}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTakeOrder(order)}
                            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-black flex items-center justify-center gap-2 transition-transform duration-150 active:scale-[0.97] cursor-pointer"
                          >
                            <PackageCheck className="w-4 h-4" />
                            Tomar Pedido e Iniciar Ruta
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {sheetTab === 'cocina' && (
                <div className="space-y-2">
                  {kitchenOrders.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-500">
                      Sin pedidos en preparación.
                    </div>
                  ) : (
                    kitchenOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                            #{order.orderNumber} · {order.status.replace('_', ' ')}
                          </span>
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {order.deliveryAddress}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-zinc-500 tabular-nums shrink-0">
                          S/ {order.total.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {sheetTab === 'entregados' && (
                <div className="space-y-2">
                  {myDeliveredToday.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-500">
                      Aún no tienes entregas registradas hoy.
                    </div>
                  ) : (
                    myDeliveredToday.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
                              #{order.orderNumber} · {order.customerName}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {order.deliveryAddress}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {order.deliveryProofPhoto && (
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxState({
                                  isOpen: true,
                                  imageUrl: order.deliveryProofPhoto!,
                                  title: `Entrega #${order.orderNumber}`,
                                  subtitle: order.customerName,
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold cursor-pointer"
                            >
                              Ver foto
                            </button>
                          )}
                          <span className="text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                            S/ {order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Proof Photo Capture Modal */}
      {photoModalState.order && (
        <ProofPhotoCaptureModal
          isOpen={photoModalState.isOpen}
          title={photoModalState.title}
          orderNumber={photoModalState.order.orderNumber}
          stage={photoModalState.stage}
          customerName={photoModalState.order.customerName}
          deliveryAddress={photoModalState.order.deliveryAddress}
          onClose={() => setPhotoModalState((s) => ({ ...s, isOpen: false }))}
          onConfirm={(photoDataUrl, authorizerOrDriver) => {
            const ord = photoModalState.order!;
            const driverDisplay = authorizerOrDriver || currentUser.name;
            if (photoModalState.stage === 'pickup') {
              updateOrderStatus(ord.id, 'en_ruta', {
                assignedDriverId: currentUser.id,
                assignedDriverName: currentUser.name,
                pickupProofPhoto: photoDataUrl,
                pickupProofDriverName: driverDisplay,
              });
              setDriverAvailabilityStatus({
                driverId: currentUser.id,
                driverName: currentUser.name,
                tenantId: activeTenant.id,
                status: 'en_ruta',
                activeOrderId: ord.id,
              });
              dispatchToast('Ruta iniciada', `Pedido #${ord.orderNumber} en camino`, 'success');
            } else {
              updateOrderStatus(ord.id, 'entregado', {
                deliveryProofPhoto: photoDataUrl,
                deliveryProofDriverName: driverDisplay,
              });
              setDriverAvailabilityStatus({
                driverId: currentUser.id,
                driverName: currentUser.name,
                tenantId: activeTenant.id,
                status: 'disponible',
              });
              dispatchToast('¡Pedido entregado!', `#${ord.orderNumber} completado`, 'success');
            }
            setPhotoModalState((s) => ({ ...s, isOpen: false, order: null }));
          }}
        />
      )}

      {/* Lightbox */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        imageUrl={lightboxState.imageUrl}
        title={lightboxState.title}
        subtitle={lightboxState.subtitle}
        onClose={() => setLightboxState((s) => ({ ...s, isOpen: false }))}
      />
    </div>
  );
};
