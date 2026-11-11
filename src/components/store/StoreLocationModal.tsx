import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tenant } from '../../types/settings';
import { getMapboxSettings, FALLBACK_MAPBOX_TOKEN } from '../../utils/mapboxConfig';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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
  ExternalLink,
  MapPin,
  Compass,
  AlertCircle
} from 'lucide-react';

interface StoreLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  activeTenantId: string;
  onSelectTenant: (tenantId: string, deliveryType: 'delivery' | 'pickup', address?: string) => void;
  currentDeliveryType?: 'delivery' | 'pickup';
  accentColor?: string;
  isLightTheme?: boolean;
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
}) => {
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(currentDeliveryType);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(activeTenantId);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerCoords, setCustomerCoords] = useState<[number, number]>(DEFAULT_CUSTOMER_COORDS);
  const [customerAddress, setCustomerAddress] = useState<string>('Av. Universitaria con Belaunde, Comas');
  const [isLocating, setIsLocating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ durationMin: number; distanceKm: number }>({
    durationMin: 11,
    distanceKm: 3.8,
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const storeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapboxError, setMapboxError] = useState<string | null>(null);

  // Sync initial tenant
  useEffect(() => {
    if (activeTenantId) {
      setSelectedTenantId(activeTenantId);
    }
  }, [activeTenantId]);

  useEffect(() => {
    setDeliveryType(currentDeliveryType);
  }, [currentDeliveryType]);

  const activeTenant = useMemo(() => {
    return tenants.find(t => t.id === selectedTenantId) || tenants[0];
  }, [tenants, selectedTenantId]);

  // Filtered tenants by search query
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;
    const q = searchQuery.toLowerCase();
    return tenants.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        (t.operations?.address && t.operations.address.toLowerCase().includes(q))
    );
  }, [tenants, searchQuery]);

  // Calculate driving distance & time (Haversine fallback + Mapbox Directions)
  const calculateRoute = async (storeLng: number, storeLat: number, userLng: number, userLat: number) => {
    // Haversine fallback approximation
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

    const mSettings = getMapboxSettings();
    const token = mSettings.accessToken.trim() || FALLBACK_MAPBOX_TOKEN;

    if (token) {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${storeLng},${storeLat};${userLng},${userLat}?geometries=geojson&access_token=${token}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const r = data.routes[0];
            const realKm = parseFloat((r.distance / 1000).toFixed(1));
            const realMin = Math.max(5, Math.round(r.duration / 60));
            setRouteInfo({ durationMin: realMin, distanceKm: realKm });

            // If map has route layer, update coordinates
            if (mapRef.current && mapRef.current.getSource('route-source')) {
              (mapRef.current.getSource('route-source') as mapboxgl.GeoJSONSource).setData({
                type: 'Feature',
                properties: {},
                geometry: r.geometry,
              });
            }
            return;
          }
        }
      } catch {
        // Fallback below
      }
    }

    setRouteInfo({ durationMin: drivingMin, distanceKm: drivingKm });

    // Update fallback route polyline on map
    if (mapRef.current && mapRef.current.getSource('route-source')) {
      const midLng = (storeLng + userLng) / 2 + 0.004;
      const midLat = (storeLat + userLat) / 2 - 0.002;
      (mapRef.current.getSource('route-source') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [storeLng, storeLat],
            [midLng, midLat],
            [userLng, userLat],
          ],
        },
      });
    }
  };

  // Initialize Mapbox map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const mSettings = getMapboxSettings();
    const token = mSettings.accessToken.trim() || FALLBACK_MAPBOX_TOKEN;

    const storeLat = activeTenant.operations?.latitude || mSettings.defaultLat;
    const storeLng = activeTenant.operations?.longitude || mSettings.defaultLng;

    try {
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mSettings.styleUrl || 'mapbox://styles/mapbox/streets-v12',
        center: [(storeLng + customerCoords[0]) / 2, (storeLat + customerCoords[1]) / 2],
        zoom: mSettings.defaultZoom || 13,
        pitch: mSettings.enable3DBuildings ? mSettings.pitch3D || 45 : 0,
        bearing: -10,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');

      map.on('load', () => {
        // 3D Buildings layer
        if (mSettings.enable3DBuildings) {
          const layers = map.getStyle().layers;
          const labelLayerId = layers?.find(layer => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;

          if (!map.getLayer('add-3d-buildings')) {
            map.addLayer(
              {
                id: 'add-3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 14,
                paint: {
                  'fill-extrusion-color': isLightTheme ? '#e2e8f0' : '#1e293b',
                  'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.05, ['get', 'height']],
                  'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.05, ['get', 'min_height']],
                  'fill-extrusion-opacity': 0.65,
                },
              },
              labelLayerId
            );
          }
        }

        // Route Source & Layer
        if (!map.getSource('route-source')) {
          map.addSource('route-source', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [storeLng, storeLat],
                  [(storeLng + customerCoords[0]) / 2 + 0.003, (storeLat + customerCoords[1]) / 2 - 0.002],
                  [customerCoords[0], customerCoords[1]],
                ],
              },
            },
          });

          map.addLayer({
            id: 'route-line-casing',
            type: 'line',
            source: 'route-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#ffffff',
              'line-width': 7,
              'line-opacity': 0.85,
            },
          });

          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#e11d48',
              'line-width': 4.5,
              'line-opacity': 0.95,
            },
          });
        }

        calculateRoute(storeLng, storeLat, customerCoords[0], customerCoords[1]);
      });

      // Custom Store Marker Element
      const storeEl = document.createElement('div');
      storeEl.className = 'group relative flex flex-col items-center cursor-pointer';
      storeEl.innerHTML = `
        <div style="background-color: #e11d48;" class="text-white font-black text-[11px] px-2.5 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1.5 whitespace-nowrap mb-1">
          <span>🍕</span>
          <span>${activeTenant.name.replace('Khalessi Pizza - ', '')}</span>
        </div>
        <div style="background-color: #e11d48;" class="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
          🏠
        </div>
        <div class="w-2 h-2 rotate-45 -mt-1 bg-white"></div>
      `;

      const storeMarker = new mapboxgl.Marker({ element: storeEl, anchor: 'bottom' })
        .setLngLat([storeLng, storeLat])
        .addTo(map);

      storeMarkerRef.current = storeMarker;

      // Custom User Marker Element
      const userEl = document.createElement('div');
      userEl.className = 'relative flex items-center justify-center';
      userEl.innerHTML = `
        <div class="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping"></div>
        <div class="relative w-7 h-7 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs">
          📍
        </div>
      `;

      const userMarker = new mapboxgl.Marker({ element: userEl, anchor: 'center' })
        .setLngLat([customerCoords[0], customerCoords[1]])
        .addTo(map);

      userMarkerRef.current = userMarker;

      mapRef.current = map;
      setMapboxError(null);

      // Handle map errors gracefully
      map.on('error', e => {
        if (e.error?.message?.includes('Forbidden') || e.error?.message?.includes('Unauthorized')) {
          setMapboxError('Clave de Mapbox en modo demostración. Configura tu token en Configuración > Conexiones.');
        }
      });
    } catch {
      setMapboxError('No se pudo inicializar Mapbox GL. Mostrando modo mapa interactivo.');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, activeTenantId]);

  // When selected tenant changes, animate map
  useEffect(() => {
    if (!mapRef.current || !activeTenant) return;

    const storeLat = activeTenant.operations?.latitude || -11.93605;
    const storeLng = activeTenant.operations?.longitude || -77.05432;

    if (storeMarkerRef.current) {
      storeMarkerRef.current.setLngLat([storeLng, storeLat]);
      const markerEl = storeMarkerRef.current.getElement();
      const badge = markerEl.querySelector('span:last-child');
      if (badge) {
        badge.textContent = activeTenant.name.replace('Khalessi Pizza - ', '');
      }
    }

    mapRef.current.flyTo({
      center: [(storeLng + customerCoords[0]) / 2, (storeLat + customerCoords[1]) / 2],
      zoom: 13.5,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });

    calculateRoute(storeLng, storeLat, customerCoords[0], customerCoords[1]);
  }, [selectedTenantId]);

  // Handle Geolocation Button ("Mi ubicación")
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no es soportada por tu navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const newCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCustomerCoords(newCoords);
        setCustomerAddress('Tu ubicación actual');

        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat(newCoords);
        }

        const storeLat = activeTenant.operations?.latitude || -11.93605;
        const storeLng = activeTenant.operations?.longitude || -77.05432;

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [(storeLng + newCoords[0]) / 2, (storeLat + newCoords[1]) / 2],
            zoom: 14,
            speed: 1.2,
          });
        }

        calculateRoute(storeLng, storeLat, newCoords[0], newCoords[1]);
      },
      () => {
        setIsLocating(false);
        // Fallback coordinates (close to Comas Belaunde)
        setCustomerAddress('Comas, Lima');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Confirm selection
  const handleConfirmStore = () => {
    onSelectTenant(selectedTenantId, deliveryType, customerAddress);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border ${
          isLightTheme ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-neutral-900 border-neutral-800 text-white'
        }`}
      >
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-4 ${isLightTheme ? 'bg-zinc-50' : 'bg-neutral-950/50'}`}>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 mb-1">
              <Store className="w-3 h-3 text-rose-500" />
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

        {/* Content Body: Left List + Right Map */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Column: Switcher + Search + Store Cards List */}
          <div className="w-full lg:w-[46%] p-4 sm:p-5 flex flex-col gap-3.5 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-neutral-800">
            {/* Delivery vs Pickup Switcher */}
            <div className={`p-1 rounded-2xl border grid grid-cols-2 gap-1.5 ${isLightTheme ? 'bg-zinc-100 border-zinc-200' : 'bg-neutral-950 border-neutral-800'}`}>
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  deliveryType === 'delivery'
                    ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-sm border border-zinc-200 dark:border-neutral-700'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-neutral-400'
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
                    ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-sm border border-zinc-200 dark:border-neutral-700'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-neutral-400'
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

            {/* Active Store Indicator */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${isLightTheme ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-900 text-emerald-300'}`}>
              <div className="flex items-center gap-1.5 font-bold truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Tienda activa: {activeTenant.name.replace('Khalessi Pizza - ', '')}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shrink-0">
                Seleccionada
              </span>
            </div>

            {/* Store Cards List */}
            <div className="space-y-2.5 flex-1">
              {filteredTenants.map(tenant => {
                const isSelected = tenant.id === selectedTenantId;
                const isCurrentActive = tenant.id === activeTenantId;
                const name = tenant.name.replace('Khalessi Pizza - ', '');
                const address = tenant.operations?.address || 'Lima, Perú';
                const isMain = tenant.id === 'tenant-belaunde' || tenant.id === 'tenant-1';

                return (
                  <div
                    key={tenant.id}
                    onClick={() => setSelectedTenantId(tenant.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-md ring-1 ring-rose-500/20'
                        : isLightTheme
                        ? 'border-zinc-200 hover:border-zinc-300 bg-white'
                        : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Store Logo Thumbnail */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex flex-col items-center justify-center text-white shrink-0 shadow-sm">
                        <span className="text-[9px] font-black leading-tight">PIZZA</span>
                        <span className="text-[7px] font-bold tracking-tighter opacity-90">KHALESSI</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black truncate">{name}</h4>
                          {isMain && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                              👑 Principal
                            </span>
                          )}
                          {isCurrentActive && !isMain && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                              Activa
                            </span>
                          )}
                        </div>

                        <p className={`text-[11px] truncate mt-0.5 ${isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}`}>
                          📍 {address}
                        </p>

                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            25 - 40 min
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1">
                            <Bike className="w-3 h-3" />
                            Envío Gratis
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-neutral-800 dark:text-neutral-300">
                            Lima
                          </span>
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
          </div>

          {/* Right Column: Ultra-Detail Mapbox Map & Bottom Store Action Card */}
          <div className="flex-1 relative flex flex-col min-h-[340px] lg:min-h-[460px] bg-zinc-100 dark:bg-neutral-950 overflow-hidden">
            {/* Map Canvas */}
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

            {/* Error or Demo Notification */}
            {mapboxError && (
              <div className="absolute top-3 left-3 right-16 z-10 p-2.5 rounded-xl bg-amber-500/90 text-white text-xs font-semibold shadow-lg backdrop-blur-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mapboxError}</span>
              </div>
            )}

            {/* Floating Top Route Info Pill */}
            <div className="absolute top-4 left-4 z-10 bg-neutral-900/90 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-xl backdrop-blur-md border border-neutral-700/60 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>🚗 {routeInfo.durationMin} min</span>
              <span className="text-neutral-400">·</span>
              <span>{routeInfo.distanceKm} km</span>
            </div>

            {/* Bottom Floating Card: Selected Store + Actions */}
            <div className="absolute bottom-4 left-4 right-4 z-10 p-4 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-2xl border border-zinc-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex flex-col items-center justify-center text-white shrink-0 shadow-sm">
                  <span className="text-[9px] font-black leading-tight">PIZZA</span>
                  <span className="text-[7px] font-bold tracking-tighter opacity-90">KHALESSI</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-sm text-zinc-950 dark:text-white truncate">
                    {activeTenant.name.replace('Khalessi Pizza - ', '')}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-neutral-400 truncate">
                    {activeTenant.operations?.address || 'Lima, Perú'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-bold">
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      🚗 {routeInfo.durationMin} min ({routeInfo.distanceKm} km)
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      🛵 Envío Gratis
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeTenant.operations?.latitude || -11.93605},${activeTenant.operations?.longitude || -77.05432}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-neutral-700 text-xs font-bold text-zinc-700 dark:text-neutral-300 hover:bg-zinc-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Cómo llegar</span>
                </a>
                <button
                  type="button"
                  onClick={handleConfirmStore}
                  className="px-5 py-2.5 rounded-xl text-white font-black text-xs sm:text-sm shadow-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <span>Seleccionar tienda</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
