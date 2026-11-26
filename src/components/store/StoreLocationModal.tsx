import React, { useState, useEffect, useMemo } from 'react';
import { Tenant, DeliveryTariffConfig } from '../../types/settings';
import { LeafletStoreMap } from './LeafletStoreMap';
import { calculateDynamicDeliveryFee } from '../../utils/culqiCheckout';
import { findBestBranchForPoint } from '../../utils/geofence';
import {
  X,
  Bike,
  Store,
  Search,
  Crosshair,
  Navigation,
  Clock,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Compass,
  AlertCircle,
  AlertTriangle,
  Crown,
  ArrowLeft
} from 'lucide-react';

interface StoreLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  activeTenantId: string;
  onSelectTenant: (
    tenantId: string,
    deliveryType: 'delivery' | 'pickup',
    address?: string,
    coords?: [number, number],
    distanceKm?: number
  ) => void;
  currentDeliveryType?: 'delivery' | 'pickup';
  accentColor?: string;
  isLightTheme?: boolean;
  storeFavicon?: string;
  cartSubtotal?: number;
  companyTariff?: DeliveryTariffConfig;
  initialCustomerCoords?: [number, number] | null;
}

// Default customer coordinates in Comas / Lima Norte (Belaunde area)
const DEFAULT_CUSTOMER_COORDS: [number, number] = [-77.0450, -11.9480];

export const StoreLocationModal: React.FC<StoreLocationModalProps> = ({
  isOpen,
  onClose,
  tenants,
  activeTenantId,
  onSelectTenant,
  currentDeliveryType = 'delivery',
  accentColor = '#e11d48',
  isLightTheme = true,
  storeFavicon,
  cartSubtotal = 0,
  companyTariff,
  initialCustomerCoords = null,
}) => {
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(currentDeliveryType);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(activeTenantId);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState<'mode' | 'map' | 'list'>('mode');
  const [customerCoords, setCustomerCoords] = useState<[number, number]>(
    initialCustomerCoords || DEFAULT_CUSTOMER_COORDS
  );
  const [customerAddress, setCustomerAddress] = useState<string>('Av. Universitaria con Belaunde, Comas');
  const [isLocating, setIsLocating] = useState(false);
  const [autoAssignedBranch, setAutoAssignedBranch] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ durationMin: number; distanceKm: number }>({
    durationMin: 11,
    distanceKm: 3.8,
  });

  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);

  // Sync initial tenant, coords & mobile step when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveMobileTab('mode');
      if (initialCustomerCoords) {
        setCustomerCoords(initialCustomerCoords);
      }
    }
  }, [isOpen, initialCustomerCoords]);

  // Sync initial tenant
  useEffect(() => {
    if (activeTenantId) {
      setSelectedTenantId(activeTenantId);
    }
  }, [activeTenantId]);

  useEffect(() => {
    setDeliveryType(currentDeliveryType);
  }, [currentDeliveryType]);

  // Branches eligible for the active mode:
  // When in "Retiro en Local" (pickup), hide branches configured exclusively for Envío Nacional.
  const modeEligibleTenants = useMemo(() => {
    if (deliveryType === 'pickup') {
      return tenants.filter(t => t.operations?.shippingScope !== 'national');
    }
    return tenants;
  }, [tenants, deliveryType]);

  // If user switches to Retiro en Local and the selected branch is national-only, switch to first local branch
  useEffect(() => {
    if (deliveryType !== 'pickup') return;
    if (modeEligibleTenants.length === 0) return;
    if (!modeEligibleTenants.some(t => t.id === selectedTenantId)) {
      setSelectedTenantId(modeEligibleTenants[0].id);
    }
  }, [deliveryType, modeEligibleTenants, selectedTenantId]);

  const activeTenant = useMemo(() => {
    return (
      modeEligibleTenants.find(t => t.id === selectedTenantId) ||
      modeEligibleTenants[0] ||
      tenants[0]
    );
  }, [modeEligibleTenants, tenants, selectedTenantId]);

  // Filtered tenants by search query within mode-eligible branches
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return modeEligibleTenants;
    const q = searchQuery.toLowerCase();
    return modeEligibleTenants.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        (t.operations?.address && t.operations.address.toLowerCase().includes(q))
    );
  }, [modeEligibleTenants, searchQuery]);


  // Distancia y tiempo reales por calles (OSRM público) con respaldo Haversine
  const calculateRoute = async (
    storeLng: number,
    storeLat: number,
    userLng: number,
    userLat: number,
    isCancelled: () => boolean = () => false
  ) => {
    const R = 6371; // km
    const dLat = ((userLat - storeLat) * Math.PI) / 180;
    const dLon = ((userLng - storeLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((storeLat * Math.PI) / 180) *
        Math.cos((userLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;
    const drivingKm = Math.max(1.2, parseFloat((straightKm * 1.35).toFixed(1)));
    const drivingMin = Math.round(drivingKm * 2.8 + 3);

    setRouteInfo({ durationMin: drivingMin, distanceKm: drivingKm });
    setRouteGeometry(null);

    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${storeLng},${storeLat};${userLng},${userLat}?overview=full&geometries=geojson`,
        { signal: ctrl.signal }
      );
      window.clearTimeout(timer);
      if (!res.ok || isCancelled()) return;
      const data = await res.json();
      const r = data?.routes?.[0];
      if (r && !isCancelled()) {
        setRouteInfo({
          durationMin: Math.max(5, Math.round(r.duration / 60)),
          distanceKm: parseFloat((r.distance / 1000).toFixed(1)),
        });
        setRouteGeometry(r.geometry?.coordinates || null);
      }
    } catch {
      // se mantiene la estimación Haversine
    }
  };

  // Recalcular ruta (OSRM real con respaldo Haversine) al cambiar tienda o ubicación del cliente
  useEffect(() => {
    if (!isOpen || !activeTenant) return;
    const storeLat = activeTenant.operations?.latitude || -11.93605;
    const storeLng = activeTenant.operations?.longitude || -77.05432;
    let cancelled = false;
    void calculateRoute(storeLng, storeLat, customerCoords[0], customerCoords[1], () => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedTenantId, customerCoords]);

  const coverageMatch = useMemo(
    () => findBestBranchForPoint(customerCoords, tenants),
    [customerCoords, tenants]
  );

  const selectedCoverage = coverageMatch.evaluations.get(selectedTenantId);
  const isPickupUnavailable = deliveryType === 'pickup' && modeEligibleTenants.length === 0;
  const isDeliveryBlocked =
    isPickupUnavailable || (deliveryType === 'delivery' && !(selectedCoverage?.covered ?? false));

  const selectedDeliveryCalc = useMemo(
    () =>
      calculateDynamicDeliveryFee({
        orderMode: deliveryType,
        distanceKm: routeInfo.distanceKm || selectedCoverage?.distanceKm || null,
        branchMaxRadiusKm: activeTenant.operations?.deliveryRadiusKm || 6,
        cartSubtotal,
        tariff: activeTenant.operations?.deliveryTariff || companyTariff,
        hasDelivery: activeTenant.operations?.hasDelivery,
        shippingScope: activeTenant.operations?.shippingScope,
      }),
    [
      activeTenant.operations?.deliveryRadiusKm,
      activeTenant.operations?.deliveryTariff,
      activeTenant.operations?.hasDelivery,
      activeTenant.operations?.shippingScope,
      cartSubtotal,
      companyTariff,
      deliveryType,
      routeInfo.distanceKm,
      selectedCoverage?.distanceKm,
    ]
  );

  const applyCustomerCoords = (coords: [number, number], addressLabel: string) => {
    setCustomerCoords(coords);
    setCustomerAddress(addressLabel);
    const match = findBestBranchForPoint(coords, tenants);
    if (match.matchedTenant) {
      setSelectedTenantId(match.matchedTenant.id);
      setAutoAssignedBranch(match.matchedTenant.name.replace('Gastro - ', ''));
    } else {
      setAutoAssignedBranch(null);
    }
  };

  const handleCustomerMove = (coords: [number, number]) => {
    applyCustomerCoords(coords, 'Ubicación marcada en el mapa');
  };


  // Handle Geolocation Button ("Mi ubicación")
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      setCustomerAddress('Comas, Lima');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const newCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        applyCustomerCoords(newCoords, 'Tu ubicación actual');
      },
      () => {
        setIsLocating(false);
        setCustomerAddress('Comas, Lima');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectMobileMode = (mode: 'delivery' | 'pickup') => {
    setDeliveryType(mode);
    setActiveMobileTab('map');
    handleGetMyLocation();
  };

  // Confirm selection
  const handleConfirmStore = () => {
    if (isDeliveryBlocked) return;
    onSelectTenant(
      selectedTenantId,
      deliveryType,
      customerAddress,
      customerCoords,
      routeInfo.distanceKm
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-5xl rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[92vh] border-t sm:border animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-300 ${
          isLightTheme ? 'bg-white text-zinc-900 border-zinc-200' : 'bg-neutral-900 text-white border-neutral-800'
        }`}
      >
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-4 ${isLightTheme ? 'bg-zinc-50 border-zinc-200' : 'bg-neutral-950/50 border-neutral-800'}`}>
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border mb-1 ${
              isLightTheme ? 'text-rose-700 bg-rose-50 border-rose-200' : 'bg-rose-950/50 text-rose-300 border-rose-900/50'
            }`}>
              <Store className={`w-3 h-3 ${isLightTheme ? 'text-rose-600' : 'text-rose-400'}`} />
              <span>Tiendas & Cobertura</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Elige tu tienda</h2>
            <p className={`text-xs ${isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}`}>
              Selecciona el local más cercano para calcular el envío y ver el catálogo disponible
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal de tiendas"
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isLightTheme ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Step 1 (< lg): Ask Delivery vs Pickup before opening Map + Geolocation */}
        {activeMobileTab === 'mode' && (
          <div className="lg:hidden flex-1 flex flex-col justify-center p-5 sm:p-6 gap-4 overflow-y-auto">
            <div className="text-center space-y-1.5 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                isLightTheme ? 'text-rose-700 bg-rose-50 border-rose-200' : 'bg-rose-950/50 text-rose-300 border-rose-900/50'
              }`}>
                <MapPin className="w-3.5 h-3.5" />
                <span>Paso 1 de 2</span>
              </span>
              <h3 className="text-xl font-black tracking-tight">¿Cómo quieres tu pedido?</h3>
              <p className={`text-xs max-w-xs mx-auto ${isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}`}>
                Elige una modalidad para ubicarte en el mapa y asignarte la sede más cercana
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 max-w-md w-full mx-auto">
              <button
                type="button"
                onClick={() => handleSelectMobileMode('delivery')}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center gap-4 ${
                  deliveryType === 'delivery'
                    ? (isLightTheme ? 'border-rose-500 bg-rose-50/70 shadow-md' : 'border-rose-500 bg-rose-950/30 shadow-md')
                    : (isLightTheme ? 'border-zinc-200 bg-white hover:border-zinc-300' : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700')
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  isLightTheme ? 'bg-rose-100 text-rose-600' : 'bg-rose-950 text-rose-400'
                }`}>
                  <Bike className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black">Envío a Domicilio</div>
                  <p className={`text-xs mt-0.5 ${isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}`}>
                    Te ubicamos en el mapa y te lo llevamos directo a tu dirección
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 shrink-0 ${isLightTheme ? 'text-zinc-400' : 'text-neutral-500'}`} />
              </button>

              <button
                type="button"
                onClick={() => handleSelectMobileMode('pickup')}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center gap-4 ${
                  deliveryType === 'pickup'
                    ? (isLightTheme ? 'border-rose-500 bg-rose-50/70 shadow-md' : 'border-rose-500 bg-rose-950/30 shadow-md')
                    : (isLightTheme ? 'border-zinc-200 bg-white hover:border-zinc-300' : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700')
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  isLightTheme ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-950 text-emerald-400'
                }`}>
                  <Store className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black">Retiro en Local</div>
                  <p className={`text-xs mt-0.5 ${isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}`}>
                    Pide ahora y recoge gratis en la tienda más cercana a ti
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 shrink-0 ${isLightTheme ? 'text-zinc-400' : 'text-neutral-500'}`} />
              </button>
            </div>
          </div>
        )}

        {/* Content Body: Responsive Navigation Bar on Mobile (< lg) when in map/list */}
        {activeMobileTab !== 'mode' && (
          <div className={`lg:hidden flex items-center justify-between gap-2 border-b p-2 px-3 ${isLightTheme ? 'border-zinc-200 bg-zinc-50' : 'border-neutral-800 bg-neutral-900/60'}`}>
            <button
              type="button"
              onClick={() => setActiveMobileTab('mode')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                isLightTheme ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100' : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{deliveryType === 'delivery' ? 'Delivery' : 'Retiro'}</span>
            </button>

            <div className={`grid grid-cols-2 gap-1 flex-1 max-w-[230px] p-0.5 rounded-xl border ${isLightTheme ? 'bg-zinc-200/70 border-zinc-200' : 'bg-neutral-950 border-neutral-800'}`}>
              <button
                type="button"
                onClick={() => setActiveMobileTab('map')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeMobileTab === 'map'
                    ? (isLightTheme ? 'bg-white text-rose-600 shadow-sm' : 'bg-neutral-800 text-rose-400 shadow-sm')
                    : (isLightTheme ? 'text-zinc-600' : 'text-neutral-400')
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('list')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeMobileTab === 'list'
                    ? (isLightTheme ? 'bg-white text-rose-600 shadow-sm' : 'bg-neutral-800 text-rose-400 shadow-sm')
                    : (isLightTheme ? 'text-zinc-600' : 'text-neutral-400')
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Locales ({tenants.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body: Left List + Right Map */}
        <div className={`flex-1 flex flex-col lg:flex-row overflow-hidden relative ${activeMobileTab === 'mode' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Left Column: Switcher + Search + Store Cards List */}
          <div
            className={`w-full lg:w-[44%] p-3 sm:p-5 flex flex-col gap-3 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r ${
              isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
            } ${
              activeMobileTab !== 'list' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Delivery vs Pickup Switcher */}
            <div className={`p-1 rounded-2xl border grid grid-cols-2 gap-1.5 ${isLightTheme ? 'bg-zinc-100 border-zinc-200' : 'bg-neutral-950 border-neutral-800'}`}>
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  deliveryType === 'delivery'
                    ? (isLightTheme ? 'bg-white text-rose-600 shadow-sm border border-zinc-200' : 'bg-neutral-800 text-rose-400 shadow-sm border border-neutral-700')
                    : (isLightTheme ? 'text-zinc-600 hover:text-zinc-900' : 'text-neutral-400 hover:text-white')
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>Envío a Domicilio</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  deliveryType === 'pickup'
                    ? (isLightTheme ? 'bg-white text-rose-600 shadow-sm border border-zinc-200' : 'bg-neutral-800 text-rose-400 shadow-sm border border-neutral-700')
                    : (isLightTheme ? 'text-zinc-600 hover:text-zinc-900' : 'text-neutral-400 hover:text-white')
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Retiro en Local</span>
              </button>
            </div>

            {/* Search Input + Geolocation Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, distrito o dirección..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all ${
                    isLightTheme ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-neutral-950 border-neutral-800 text-white'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleGetMyLocation}
                disabled={isLocating}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                  isLightTheme
                    ? 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                }`}
              >
                <Crosshair className={`w-3.5 h-3.5 text-rose-500 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Ubicando...' : 'Mi ubicación'}</span>
              </button>
            </div>

            {/* Active Store & Geofence Status Indicator */}
            {isDeliveryBlocked ? (
              <div className={`p-3 rounded-xl border text-xs space-y-2 ${isLightTheme ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-rose-800 bg-rose-950/40 text-rose-200'}`}>
                <div className="flex items-start gap-2 font-bold">
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isLightTheme ? 'text-rose-600' : 'text-rose-400'}`} />
                  <span>
                    {coverageMatch.anyCovered
                      ? 'Esta sede no cubre el punto marcado en el mapa.'
                      : 'Tu ubicación está fuera de nuestra zona de reparto para Delivery.'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {coverageMatch.anyCovered && coverageMatch.matchedTenant && (
                    <button
                      type="button"
                      onClick={() => setSelectedTenantId(coverageMatch.matchedTenant!.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0"
                    >
                      Usar sede con cobertura ({coverageMatch.matchedTenant.name.replace('Gastro - ', '')})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                      isLightTheme ? 'border-rose-300 bg-white text-rose-700 hover:bg-rose-100' : 'border-rose-700 bg-neutral-900 text-rose-300 hover:bg-rose-950'
                    }`}
                  >
                    Cambiar a Retiro en Local
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${isLightTheme ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-900 text-emerald-300'}`}>
                <div className="flex items-center gap-1.5 font-bold truncate">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    {autoAssignedBranch && deliveryType === 'delivery'
                      ? `Asignada por cobertura: ${activeTenant.name.replace('Gastro - ', '')}`
                      : `Tienda activa: ${activeTenant.name.replace('Gastro - ', '')}`}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shrink-0">
                  {deliveryType === 'pickup'
                    ? 'Retiro'
                    : selectedCoverage?.matchType === 'national'
                    ? 'Nacional'
                    : selectedCoverage?.matchType === 'polygon'
                    ? 'En Polígono'
                    : 'En Radio'}
                </span>
              </div>
            )}

            {/* Store Cards List */}
            <div className="space-y-2.5 flex-1">
              {filteredTenants.length === 0 ? (
                <div
                  className={`p-5 rounded-2xl border text-center space-y-1.5 ${
                    isLightTheme
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-700'
                      : 'bg-neutral-900/70 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <p className="text-xs font-black">
                    {deliveryType === 'pickup' && modeEligibleTenants.length === 0
                      ? 'No hay locales habilitados para Retiro en Local'
                      : 'No encontramos tiendas con esa búsqueda'}
                  </p>
                  <p className="text-[11px] opacity-70">
                    {deliveryType === 'pickup' && modeEligibleTenants.length === 0
                      ? 'Nuestras sedes actuales atienden exclusivamente con Envío Nacional.'
                      : 'Prueba con otro nombre o dirección.'}
                  </p>
                </div>
              ) : filteredTenants.map(tenant => {
                const isSelected = tenant.id === selectedTenantId;
                const isCurrentActive = tenant.id === activeTenantId;
                const name = tenant.name.replace('Gastro - ', '');
                const address = tenant.operations?.address || 'Lima, Perú';
                const isMain = tenant.id === 'tenant-belaunde' || tenant.id === 'tenant-1';
                const cov = coverageMatch.evaluations.get(tenant.id);
                const cardFee = calculateDynamicDeliveryFee({
                  orderMode: deliveryType,
                  distanceKm: cov?.distanceKm ?? null,
                  branchMaxRadiusKm: tenant.operations?.deliveryRadiusKm || 6,
                  cartSubtotal,
                  tariff: tenant.operations?.deliveryTariff || companyTariff,
                  hasDelivery: tenant.operations?.hasDelivery,
                  shippingScope: tenant.operations?.shippingScope,
                });

                return (
                  <div
                    key={tenant.id}
                    onClick={() => setSelectedTenantId(tenant.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? (isLightTheme ? 'border-rose-500 bg-rose-50/60 shadow-md ring-1 ring-rose-500/20' : 'border-rose-500 bg-rose-950/25 shadow-md ring-1 ring-rose-500/20')
                        : isLightTheme
                        ? 'border-zinc-200 hover:border-zinc-300 bg-white'
                        : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Store Logo Thumbnail */}
                      <div className={`w-11 h-11 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 shadow-sm ${isLightTheme ? 'border-zinc-200 bg-zinc-100' : 'border-zinc-700 bg-zinc-800'}`}>
                        {tenant.operations?.imageUrl ? (
                          <img
                            src={tenant.operations.imageUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : storeFavicon ? (
                          <img
                            src={storeFavicon}
                            alt={name}
                            className="w-full h-full object-cover p-1"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-600 to-rose-700 flex flex-col items-center justify-center text-white">
                            <span className="text-[9px] font-black leading-tight">PIZZA</span>
                            <span className="text-[7px] font-bold tracking-tighter opacity-90">GASTRO</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black truncate">{name}</h4>
                          {isMain && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${isLightTheme ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-950 text-blue-300 border-blue-800'}`}>
                              <Crown className="w-2.5 h-2.5" />
                              <span>Principal</span>
                            </span>
                          )}
                          {isCurrentActive && !isMain && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${isLightTheme ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950 text-emerald-300'}`}>
                              Activa
                            </span>
                          )}
                        </div>

                        <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}`}>
                          <MapPin className="w-3 h-3 shrink-0 opacity-75" />
                          <span className="truncate">{address}</span>
                        </p>

                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${isLightTheme ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/50 text-amber-300 border-amber-900/50'}`}>
                            <Clock className="w-3 h-3" />
                            <span>25 - 40 min</span>
                          </span>
                          {deliveryType === 'pickup' ? (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${isLightTheme ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/50 text-emerald-300 border-emerald-900/50'}`}>
                              <Store className="w-3 h-3" />
                              <span>Retiro Gratis</span>
                            </span>
                          ) : tenant.operations?.hasDelivery === false ? (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${isLightTheme ? 'bg-zinc-100 text-zinc-700 border-zinc-300' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                              <Store className="w-3 h-3" />
                              <span>Solo Retiro (Sin Delivery)</span>
                            </span>
                          ) : cov?.covered ? (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              cov.matchType === 'national'
                                ? (isLightTheme ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-indigo-950/50 text-indigo-300 border-indigo-900/50')
                                : (isLightTheme ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/50 text-emerald-300 border-emerald-900/50')
                            }`}>
                              <Bike className="w-3 h-3" />
                              <span>
                                {cov.matchType === 'national'
                                  ? `Envío Nacional · ${cardFee.feeSoles === 0 ? 'Gratis' : `S/ ${cardFee.feeSoles.toFixed(2)}`}`
                                  : cardFee.feeSoles === 0
                                  ? 'Envío Gratis'
                                  : `Envío S/ ${cardFee.feeSoles.toFixed(2)}`}
                              </span>
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${isLightTheme ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-rose-950/50 text-rose-300 border-rose-900/50'}`}>
                              <AlertCircle className="w-3 h-3" />
                              <span>Fuera de cobertura</span>
                            </span>
                          )}
                          {cov && (
                            <span className={`px-2 py-0.5 rounded-md ${isLightTheme ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' : 'bg-neutral-800 text-neutral-300'}`}>
                              {cov.distanceKm} km
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Radio / Selection Indicator */}
                      <div className="shrink-0 pt-1">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isLightTheme ? 'border-zinc-300 text-zinc-400' : 'border-neutral-700 text-neutral-500'}`}>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Sticky Confirm Bar on List View */}
            <div className={`lg:hidden pt-2 border-t flex items-center gap-2 ${isLightTheme ? 'border-zinc-200' : 'border-neutral-800'}`}>
              <button
                type="button"
                onClick={() => setActiveMobileTab('map')}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isLightTheme ? 'border-zinc-200 text-zinc-700 bg-zinc-50 hover:bg-zinc-100' : 'border-neutral-700 text-neutral-300 bg-neutral-900 hover:bg-neutral-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Ver mapa</span>
              </button>
              <button
                type="button"
                disabled={isDeliveryBlocked}
                onClick={handleConfirmStore}
                className={`flex-1 justify-center px-4 py-2.5 rounded-xl text-white font-black text-xs shadow-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isDeliveryBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95 active:scale-[0.98]'
                }`}
                style={{ backgroundColor: isDeliveryBlocked ? '#64748b' : accentColor }}
              >
                <span>{isDeliveryBlocked ? 'Fuera de cobertura' : `Pedir en ${activeTenant.name.replace('Gastro - ', '')}`}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Map (Desktop always visible, Mobile in "map" tab) */}
          <div
            className={`flex-1 relative flex flex-col h-full min-h-[420px] sm:min-h-[480px] overflow-hidden ${
              isLightTheme ? 'bg-zinc-100' : 'bg-neutral-950'
            } ${
              activeMobileTab !== 'map' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <LeafletStoreMap
              tenants={modeEligibleTenants}
              selectedTenantId={selectedTenantId}
              onSelectTenant={setSelectedTenantId}
              customerCoords={customerCoords}
              onCustomerMove={handleCustomerMove}
              routeGeometry={routeGeometry}
              accentColor={accentColor}
              activeMobileTab={activeMobileTab === 'map' ? 'map' : 'list'}
            />

            {/* Floating Top Route Info Pill + Mobile Geolocate Trigger */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-wrap items-center gap-2 pr-14">
              <div className="bg-neutral-900/90 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-xl backdrop-blur-md border border-neutral-700/60 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <Clock className="w-3.5 h-3.5 text-neutral-300" />
                <span>{routeInfo.durationMin} min</span>
                <span className="text-neutral-400">·</span>
                <span>{routeInfo.distanceKm} km</span>
              </div>

              <button
                type="button"
                onClick={handleGetMyLocation}
                disabled={isLocating}
                className={`lg:hidden px-3 py-1.5 rounded-full text-xs font-bold shadow-xl backdrop-blur-md border flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                  isLightTheme
                    ? 'bg-white/95 border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                    : 'bg-neutral-900/90 border-neutral-700 text-white hover:bg-neutral-800'
                }`}
              >
                <Crosshair className={`w-3.5 h-3.5 text-rose-500 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Ubicando...' : 'Mi ubicación'}</span>
              </button>
            </div>

            {/* Bottom Floating Stack: Mobile Coverage Alert (if blocked) + Selected Store Card */}
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 flex flex-col gap-2">
              {isDeliveryBlocked && (
                <div className={`lg:hidden p-2.5 rounded-xl border text-xs backdrop-blur-md shadow-lg flex flex-col gap-2 ${
                  isLightTheme ? 'border-rose-300 bg-rose-50/95 text-rose-800' : 'border-rose-800 bg-rose-950/95 text-rose-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>
                      {coverageMatch.anyCovered
                        ? 'Esta sede no cubre el punto marcado en el mapa.'
                        : 'Tu ubicación está fuera de la zona de reparto.'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {coverageMatch.anyCovered && coverageMatch.matchedTenant && (
                      <button
                        type="button"
                        onClick={() => setSelectedTenantId(coverageMatch.matchedTenant!.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] whitespace-nowrap shrink-0"
                      >
                        Usar {coverageMatch.matchedTenant.name.replace('Gastro - ', '')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] whitespace-nowrap shrink-0 ${
                        isLightTheme ? 'border-rose-300 bg-white text-rose-700' : 'border-rose-700 bg-neutral-900 text-rose-300'
                      }`}
                    >
                      Cambiar a Retiro en Local
                    </button>
                  </div>
                </div>
              )}

              <div className={`p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isLightTheme ? 'bg-white/95 border-zinc-200/80' : 'bg-neutral-900/95 border-neutral-800'
              }`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 shadow-sm ${isLightTheme ? 'border-zinc-200 bg-zinc-100' : 'border-zinc-700 bg-zinc-800'}`}>
                    {activeTenant.operations?.imageUrl ? (
                      <img
                        src={activeTenant.operations.imageUrl}
                        alt={activeTenant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : storeFavicon ? (
                      <img
                        src={storeFavicon}
                        alt={activeTenant.name}
                        className="w-full h-full object-cover p-1"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-600 to-rose-700 flex flex-col items-center justify-center text-white">
                        <span className="text-[9px] font-black leading-tight">PIZZA</span>
                        <span className="text-[7px] font-bold tracking-tighter opacity-90">GASTRO</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-black text-sm truncate ${isLightTheme ? 'text-zinc-950' : 'text-white'}`}>
                      {activeTenant.name.replace('Gastro - ', '')}
                    </h4>
                    <p className={`text-xs truncate ${isLightTheme ? 'text-zinc-600' : 'text-neutral-400'}`}>
                      {activeTenant.operations?.address || 'Lima, Perú'}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1 text-[11px] font-bold flex-wrap">
                      <span className={`flex items-center gap-1 shrink-0 ${isLightTheme ? 'text-blue-700' : 'text-blue-400'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{routeInfo.durationMin} min ({routeInfo.distanceKm} km)</span>
                      </span>
                      {deliveryType === 'pickup' ? (
                        <span className={`flex items-center gap-1 shrink-0 ${isLightTheme ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          <Store className="w-3.5 h-3.5" />
                          <span>Retiro Gratis</span>
                        </span>
                      ) : isDeliveryBlocked ? (
                        <span className={`flex items-center gap-1 shrink-0 ${isLightTheme ? 'text-rose-700' : 'text-rose-400'}`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Fuera de cobertura</span>
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 shrink-0 ${isLightTheme ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          <Bike className="w-3.5 h-3.5" />
                          <span>{selectedDeliveryCalc.feeSoles === 0 ? 'Envío Gratis' : `Envío S/ ${selectedDeliveryCalc.feeSoles.toFixed(2)}`}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 ${isLightTheme ? 'border-zinc-100' : 'border-neutral-800/80'}`}>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeTenant.operations?.latitude || -11.93605},${activeTenant.operations?.longitude || -77.05432}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex-1 md:flex-initial justify-center px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      isLightTheme ? 'border-zinc-200 text-zinc-700 hover:bg-zinc-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Cómo llegar</span>
                  </a>
                  <button
                    type="button"
                    disabled={isDeliveryBlocked}
                    onClick={handleConfirmStore}
                    className={`flex-1 md:flex-initial justify-center px-5 py-2.5 rounded-xl text-white font-black text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                      isDeliveryBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95 active:scale-[0.98]'
                    }`}
                    style={{ backgroundColor: isDeliveryBlocked ? '#64748b' : accentColor }}
                  >
                    <span>{isDeliveryBlocked ? 'Fuera de cobertura' : 'Pedir en esta tienda'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
