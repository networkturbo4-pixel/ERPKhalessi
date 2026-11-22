import React, { useState, useEffect, useMemo } from 'react';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { DriverLiveState } from '../../types/delivery';
import { InAppDriverMap } from './InAppDriverMap';
import { getMapboxSettings } from '../../utils/mapboxConfig';
import {
  DRIVER_FLEET_EVENT,
  formatDurationCompact,
  getDriverTrailForDate,
  getLocalDateKey,
  loadDriverFleetSnapshot,
  recordDriverLocationPing,
} from '../../utils/driverTracking';
import { calculateDriverDailyMetrics, loadFuelExpenses } from '../../utils/deliveryOperations';
import { getConfiguredServerUrl } from '../../utils/serverUrl';
import {
  Bike,
  Clock,
  Coffee,
  MapPin,
  Route,
  Activity,
  CheckCircle2,
  Banknote,
  Fuel,
  Calendar,
  RefreshCw,
  Play,
  Pause,
  Send,
} from 'lucide-react';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  disponible: {
    label: 'Disponible',
    cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  en_ruta: {
    label: 'En Ruta',
    cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  descanso: {
    label: 'En Descanso',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  offline: {
    label: 'Desconectado',
    cls: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  },
};

export const DeliveryControlTowerView: React.FC = () => {
  const { orders, updateOrderStatus } = useOrderCatalog();
  const { activeTenant, branchScope, tenants, users, dispatchToast } = useSettings();
  const { roles } = useRBAC();

  const mapDefaults = useMemo(() => getMapboxSettings(), []);
  const defaultBranchCenter: [number, number] = useMemo(
    () => [mapDefaults.defaultLat, mapDefaults.defaultLng],
    [mapDefaults.defaultLat, mapDefaults.defaultLng]
  );

  const [fleetSnapshot, setFleetSnapshot] = useState(() => loadDriverFleetSnapshot());
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateKey());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPlayingTrail, setIsPlayingTrail] = useState(false);
  const [playbackIdx, setPlaybackIdx] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onFleet = () => setFleetSnapshot(loadDriverFleetSnapshot());
    window.addEventListener(DRIVER_FLEET_EVENT, onFleet);
    return () => window.removeEventListener(DRIVER_FLEET_EVENT, onFleet);
  }, []);

  // Poll /api/delivery/fleet periodically when server is reachable
  const syncFleetFromServer = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const base = getConfiguredServerUrl();
      if (!base && typeof window !== 'undefined' && window.location.port === '5173') {
        return;
      }
      const branchParam = branchScope === 'consolidated' ? 'all' : activeTenant.id;
      const endpoint = base
        ? `${base.replace(/\/+$/, '')}/api/delivery/fleet?branchId=${encodeURIComponent(branchParam)}`
        : `/api/delivery/fleet?branchId=${encodeURIComponent(branchParam)}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.drivers)) {
          data.drivers.forEach((ping: any) => {
            if (ping?.driverId && Number.isFinite(ping.lat) && Number.isFinite(ping.lng)) {
              recordDriverLocationPing(ping);
            }
          });
        }
        if (showToast) {
          dispatchToast('Flota sincronizada', 'Posiciones GPS actualizadas', 'success');
        }
      }
    } catch {
      // Offline / local fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void syncFleetFromServer(false);
    const id = window.setInterval(() => void syncFleetFromServer(false), 12000);
    return () => window.clearInterval(id);
  }, [activeTenant.id, branchScope]);

  // Real-time SSE subscription forwarded from diskPersistence (/realtime/stream)
  useEffect(() => {
    const onSsePing = (evt: Event) => {
      const ping = (evt as CustomEvent).detail;
      if (ping?.driverId) {
        recordDriverLocationPing(ping);
      }
    };
    window.addEventListener('kh-sse-driver-location', onSsePing);
    return () => {
      window.removeEventListener('kh-sse-driver-location', onSsePing);
    };
  }, []);

  // Build unified driver roster from RBAC users with delivery role + any active fleet entries
  const driverRoster: DriverLiveState[] = useMemo(() => {
    const deliveryRoleIds = new Set(
      roles
        .filter(
          (r) =>
            r.id === 'role-delivery' ||
            r.defaultModule === 'delivery' ||
            r.permissions.includes('delivery:view')
        )
        .map((r) => r.id)
    );

    const map = new Map<string, DriverLiveState>();

    users.forEach((u) => {
      const isDriver =
        deliveryRoleIds.has(u.roleId) ||
        u.roleName.toLowerCase().includes('motoriz') ||
        u.roleName.toLowerCase().includes('repart');
      if (!isDriver) return;
      if (
        branchScope !== 'consolidated' &&
        u.branchIds &&
        !u.branchIds.includes('all') &&
        !u.branchIds.includes(activeTenant.id)
      ) {
        return;
      }
      const live = fleetSnapshot.drivers[u.id];
      map.set(
        u.id,
        live || {
          driverId: u.id,
          driverName: u.name,
          avatarUrl: u.avatarUrl,
          phone: u.phone,
          tenantId: u.branchIds?.[0] || activeTenant.id,
          status: 'offline',
          totalBreakSecondsToday: 0,
          updatedAt: u.lastLogin || new Date().toISOString(),
        }
      );
    });

    Object.values(fleetSnapshot.drivers).forEach((drv) => {
      if (!map.has(drv.driverId)) {
        if (branchScope === 'consolidated' || drv.tenantId === activeTenant.id || drv.tenantId === 'all') {
          map.set(drv.driverId, drv);
        }
      }
    });

    return Array.from(map.values());
  }, [users, roles, fleetSnapshot.drivers, branchScope, activeTenant.id]);

  // Delivery orders in scope
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

  const activeOrdersOnMap = useMemo(
    () => deliveryOrders.filter((o) => o.status === 'listo' || o.status === 'en_ruta'),
    [deliveryOrders]
  );

  const deliveredOrdersForDate = useMemo(
    () =>
      deliveryOrders.filter((o) => {
        if (o.status !== 'entregado') return false;
        const ref = o.deliveredAt || o.updatedAt || o.createdAt;
        if (!ref || ref.slice(0, 10) !== selectedDate) return false;
        if (selectedDriverId !== 'all' && o.assignedDriverId !== selectedDriverId) return false;
        return true;
      }),
    [deliveryOrders, selectedDate, selectedDriverId]
  );

  const fuelExpenses = useMemo(() => loadFuelExpenses(), [fleetSnapshot]);
  const dailyMetrics = useMemo(
    () =>
      calculateDriverDailyMetrics(orders, fuelExpenses, {
        driverId: selectedDriverId,
        tenantId: branchScope === 'consolidated' ? 'consolidated' : activeTenant.id,
        date: selectedDate,
      }),
    [orders, fuelExpenses, selectedDriverId, branchScope, activeTenant.id, selectedDate]
  );

  const selectedDriver = driverRoster.find((d) => d.driverId === selectedDriverId) || null;
  const selectedTrail = useMemo(
    () =>
      selectedDriverId !== 'all'
        ? getDriverTrailForDate(fleetSnapshot, selectedDriverId, selectedDate)
        : [],
    [fleetSnapshot, selectedDriverId, selectedDate]
  );

  // Reset playback when switching driver or date
  useEffect(() => {
    setIsPlayingTrail(false);
    setPlaybackIdx(null);
  }, [selectedDriverId, selectedDate]);

  // Step through historical trail during playback
  useEffect(() => {
    if (!isPlayingTrail || selectedTrail.length < 2) return;
    const id = window.setInterval(() => {
      setPlaybackIdx((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next >= selectedTrail.length - 1) {
          setIsPlayingTrail(false);
          return selectedTrail.length - 1;
        }
        return next;
      });
    }, 350);
    return () => window.clearInterval(id);
  }, [isPlayingTrail, selectedTrail.length]);

  const displayedTrail = useMemo(() => {
    if (playbackIdx === null || selectedTrail.length === 0) return selectedTrail;
    return selectedTrail.slice(0, Math.min(selectedTrail.length, playbackIdx + 1));
  }, [selectedTrail, playbackIdx]);

  const currentPlaybackPoint =
    playbackIdx !== null && selectedTrail[playbackIdx] ? selectedTrail[playbackIdx] : null;

  const driverBreaksForDate = useMemo(
    () =>
      fleetSnapshot.breaks.filter((b) => {
        if (b.startedAt.slice(0, 10) !== selectedDate) return false;
        if (selectedDriverId !== 'all' && b.driverId !== selectedDriverId) return false;
        return true;
      }),
    [fleetSnapshot.breaks, selectedDate, selectedDriverId]
  );

  const onlineCount = driverRoster.filter((d) => d.status !== 'offline').length;
  const inRouteCount = driverRoster.filter((d) => d.status === 'en_ruta').length;
  const onBreakCount = driverRoster.filter((d) => d.status === 'descanso').length;

  const mapCenter: [number, number] = selectedDriver?.lastLocation
    ? [selectedDriver.lastLocation.lat, selectedDriver.lastLocation.lng]
    : defaultBranchCenter;

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto bg-erp-bg">
      {/* Top KPIs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-erp-text tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Torre de Control Delivery
          </h2>
          <p className="text-xs text-erp-muted">
            Flota en tiempo real, historial de movimientos, descansos y tiempos de entrega ·{' '}
            {branchScope === 'consolidated'
              ? `Consolidado (${tenants.length} sedes)`
              : activeTenant.name.replace('Gastro - ', '')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-erp-card border border-erp-border text-xs">
            <Calendar className="w-3.5 h-3.5 text-erp-muted" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-erp-text outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => void syncFleetFromServer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-erp-card border border-erp-border text-xs font-bold text-erp-text hover:bg-erp-hover active:scale-[0.97] transition-transform cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sincronizar GPS
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-2xl bg-erp-card border border-erp-border">
          <p className="text-[11px] font-semibold text-erp-muted uppercase">Flota Activa</p>
          <p className="text-xl font-black text-erp-text tabular-nums mt-0.5">
            {onlineCount}/{driverRoster.length}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {inRouteCount} en ruta · {onBreakCount} en descanso
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-erp-card border border-erp-border">
          <p className="text-[11px] font-semibold text-erp-muted uppercase">Entregas ({selectedDate})</p>
          <p className="text-xl font-black text-erp-text tabular-nums mt-0.5">
            {dailyMetrics.deliveredCount}
          </p>
          <p className="text-[11px] text-erp-muted tabular-nums">
            {activeOrdersOnMap.length} activos ahora
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-erp-card border border-erp-border">
          <p className="text-[11px] font-semibold text-erp-muted uppercase">Tiempo Prom. Ruta</p>
          <p className="text-xl font-black text-erp-text tabular-nums mt-0.5">
            {dailyMetrics.avgRouteMinutes} min
          </p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            Despacho → Entrega
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-erp-card border border-erp-border">
          <p className="text-[11px] font-semibold text-erp-muted uppercase">Efectivo a Rendir</p>
          <p className="text-xl font-black text-erp-text tabular-nums mt-0.5">
            S/ {dailyMetrics.netCashToSettle.toFixed(2)}
          </p>
          <p className="text-[11px] text-erp-muted tabular-nums">
            Cobrado: S/ {dailyMetrics.cashCollected.toFixed(2)}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-erp-card border border-erp-border col-span-2 lg:col-span-1">
          <p className="text-[11px] font-semibold text-erp-muted uppercase">Combustible Hoy</p>
          <p className="text-xl font-black text-erp-text tabular-nums mt-0.5">
            S/ {dailyMetrics.fuelSpentTotal.toFixed(2)}
          </p>
          <p className="text-[11px] text-erp-muted tabular-nums">
            S/ {dailyMetrics.costPerDelivery.toFixed(2)} por envío
          </p>
        </div>
      </div>

      {/* Main Split: Live Map + Driver Roster */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-[420px]">
        {/* Map & Trail Playback */}
        <div className="xl:col-span-7 rounded-2xl overflow-hidden border border-erp-border bg-erp-card flex flex-col min-h-[360px]">
          <div className="px-3.5 py-2.5 border-b border-erp-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xs font-bold text-erp-text truncate">
                {selectedDriver
                  ? `Seguimiento: ${selectedDriver.driverName} (${selectedTrail.length} puntos GPS)`
                  : `Mapa en vivo · ${onlineCount} motorizados en línea`}
              </span>
            </div>
            {selectedDriverId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedDriverId('all')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
              >
                Ver toda la flota
              </button>
            )}
          </div>
          <div className="flex-1 min-h-[320px]">
            <InAppDriverMap
              center={
                currentPlaybackPoint
                  ? [currentPlaybackPoint.lat, currentPlaybackPoint.lng]
                  : mapCenter
              }
              storeLocation={defaultBranchCenter}
              storeLabel={activeTenant.name.replace('Gastro - ', '')}
              availableOrders={activeOrdersOnMap}
              fleetDrivers={driverRoster}
              trailPoints={displayedTrail}
              onSelectDriver={(drv) => setSelectedDriverId(drv.driverId)}
            />
          </div>
          {selectedDriverId !== 'all' && selectedTrail.length > 1 && (
            <div className="px-3.5 py-2.5 border-t border-erp-border bg-erp-subcard flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (playbackIdx === null || playbackIdx >= selectedTrail.length - 1) {
                    setPlaybackIdx(0);
                  }
                  setIsPlayingTrail((p) => !p);
                }}
                className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 active:scale-[0.95] transition-transform cursor-pointer"
                title={isPlayingTrail ? 'Pausar recorrido' : 'Reproducir recorrido'}
              >
                {isPlayingTrail ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={selectedTrail.length - 1}
                value={playbackIdx ?? selectedTrail.length - 1}
                onChange={(e) => {
                  setIsPlayingTrail(false);
                  setPlaybackIdx(Number(e.target.value));
                }}
                className="flex-1 accent-blue-600 cursor-pointer"
              />
              <div className="text-[11px] font-mono tabular-nums text-erp-muted shrink-0">
                {currentPlaybackPoint
                  ? `${new Date(currentPlaybackPoint.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })} · ${currentPlaybackPoint.speedKmh ?? 0} km/h`
                  : `${selectedTrail.length} pts`}
              </div>
            </div>
          )}
        </div>

        {/* Driver Roster */}
        <div className="xl:col-span-5 rounded-2xl border border-erp-border bg-erp-card flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-erp-border flex items-center justify-between">
            <span className="text-xs font-bold text-erp-text flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-emerald-500" />
              Motorizados ({driverRoster.length})
            </span>
            <span className="text-[11px] text-erp-muted">Clic para ver historial</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-erp-border">
            {driverRoster.length === 0 ? (
              <div className="p-8 text-center text-xs text-erp-muted">
                No hay usuarios con rol Motorizado registrados en esta sede.
              </div>
            ) : (
              driverRoster.map((drv) => {
                const badge = STATUS_BADGE[drv.status] || STATUS_BADGE.offline;
                const isSelected = selectedDriverId === drv.driverId;
                const activeBreakSec =
                  drv.status === 'descanso' && drv.currentBreakStartedAt
                    ? Math.max(
                        0,
                        Math.floor((nowMs - new Date(drv.currentBreakStartedAt).getTime()) / 1000)
                      )
                    : 0;
                const totalBreakSec = (drv.totalBreakSecondsToday || 0) + activeBreakSec;
                const trailCount = getDriverTrailForDate(
                  fleetSnapshot,
                  drv.driverId,
                  selectedDate
                ).length;

                return (
                  <button
                    key={drv.driverId}
                    type="button"
                    onClick={() =>
                      setSelectedDriverId((prev) =>
                        prev === drv.driverId ? 'all' : drv.driverId
                      )
                    }
                    className={`w-full text-left p-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-500/10' : 'hover:bg-erp-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {drv.avatarUrl ? (
                          <img
                            src={drv.avatarUrl}
                            alt={drv.driverName}
                            className="w-9 h-9 rounded-full object-cover border border-erp-border shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {drv.driverName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-erp-text truncate">
                            {drv.driverName}
                          </p>
                          <p className="text-[11px] text-erp-muted truncate tabular-nums">
                            {drv.lastLocation
                              ? `${drv.lastLocation.speedKmh ?? 0} km/h · ${trailCount} pts`
                              : 'Sin señal GPS aún'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-erp-muted tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Coffee className="w-3 h-3 text-amber-500" />
                        Descanso: {formatDurationCompact(totalBreakSec)}
                      </span>
                      {drv.activeOrderId && (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                          <Route className="w-3 h-3" />
                          En entrega activa
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Active Orders Quick Dispatch / Reassign */}
      {activeOrdersOnMap.length > 0 && (
        <div className="rounded-2xl border border-erp-border bg-erp-card overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-erp-border flex items-center justify-between">
            <span className="text-xs font-bold text-erp-text flex items-center gap-1.5">
              <Send className="w-4 h-4 text-emerald-500" />
              Despacho y Reasignación Rápida ({activeOrdersOnMap.length} activos)
            </span>
          </div>
          <div className="divide-y divide-erp-border max-h-56 overflow-y-auto">
            {activeOrdersOnMap.map((ord) => {
              const ordCode = ord.orderNumber.startsWith('#')
                ? ord.orderNumber
                : `#${ord.orderNumber}`;
              return (
                <div
                  key={ord.id}
                  className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-erp-text">{ordCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'en_ruta'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {ord.status === 'en_ruta' ? 'En Ruta' : 'Listo'}
                      </span>
                      <span className="font-semibold text-erp-text truncate">
                        {ord.customerName}
                      </span>
                    </div>
                    <p className="text-[11px] text-erp-muted truncate mt-0.5">
                      {ord.deliveryAddress || 'Sin dirección'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={ord.assignedDriverId || ''}
                      onChange={(e) => {
                        const drv = driverRoster.find((d) => d.driverId === e.target.value);
                        if (!drv) return;
                        updateOrderStatus(ord.id, 'en_ruta', {
                          assignedDriverId: drv.driverId,
                          assignedDriverName: drv.driverName,
                        });
                        dispatchToast(
                          'Motorizado asignado',
                          `${ordCode} asignado a ${drv.driverName}`,
                          'success'
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-erp-subcard border border-erp-border text-xs font-semibold text-erp-text"
                    >
                      <option value="">Asignar motorizado...</option>
                      {driverRoster.map((drv) => (
                        <option key={drv.driverId} value={drv.driverId}>
                          {drv.driverName} ({STATUS_BADGE[drv.status]?.label || drv.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Split: Delivery Times & Break History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Per-Order Delivery Time Audit */}
        <div className="rounded-2xl border border-erp-border bg-erp-card overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-erp-border flex items-center justify-between">
            <span className="text-xs font-bold text-erp-text flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              Tiempos de Entrega ({deliveredOrdersForDate.length})
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-erp-border">
            {deliveredOrdersForDate.length === 0 ? (
              <div className="p-6 text-center text-xs text-erp-muted">
                Sin pedidos entregados para la fecha/filtro seleccionado.
              </div>
            ) : (
              deliveredOrdersForDate.map((ord) => {
                const createdMs = new Date(ord.createdAt).getTime();
                const dispMs = ord.dispatchedAt ? new Date(ord.dispatchedAt).getTime() : createdMs;
                const delivMs = new Date(ord.deliveredAt || ord.updatedAt || ord.createdAt).getTime();
                const prepMins = Math.max(0, Math.round((dispMs - createdMs) / 60000));
                const routeMins = Math.max(1, Math.round((delivMs - dispMs) / 60000));
                const totalMins = Math.max(1, Math.round((delivMs - createdMs) / 60000));
                return (
                  <div key={ord.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-bold text-erp-text">
                          #{ord.orderNumber} · {ord.customerName}
                        </span>
                      </div>
                      <p className="text-[11px] text-erp-muted truncate mt-0.5">
                        {ord.assignedDriverName || 'Sin asignar'} · {ord.deliveryAddress}
                      </p>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="font-black text-erp-text">{totalMins} min total</p>
                      <p className="text-[10px] text-erp-muted">
                        Cocina {prepMins}m · Ruta {routeMins}m
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Break & Movement Sessions */}
        <div className="rounded-2xl border border-erp-border bg-erp-card overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-erp-border flex items-center justify-between">
            <span className="text-xs font-bold text-erp-text flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-500" />
              Registro de Descansos ({driverBreaksForDate.length})
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-erp-border">
            {driverBreaksForDate.length === 0 ? (
              <div className="p-6 text-center text-xs text-erp-muted">
                No se registraron pausas o descansos en esta fecha.
              </div>
            ) : (
              driverBreaksForDate.map((brk) => {
                const start = new Date(brk.startedAt);
                const end = brk.endedAt ? new Date(brk.endedAt) : null;
                const dur =
                  brk.durationSeconds ??
                  Math.max(1, Math.floor((nowMs - start.getTime()) / 1000));
                return (
                  <div key={brk.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-erp-text truncate">{brk.driverName}</p>
                      <p className="text-[11px] text-erp-muted tabular-nums">
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {end
                          ? ` → ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : ' → En curso'}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums shrink-0 ${
                        end
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-erp-text'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {formatDurationCompact(dur)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
