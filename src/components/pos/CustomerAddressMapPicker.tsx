import React, { useEffect, useRef, useState, useId } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Crosshair,
  Search,
  Check,
  X,
  Bike,
  AlertTriangle,
  Loader2,
  Store,
} from 'lucide-react';
import { DeliveryTariffConfig } from '../../types/settings';
import { calculateDynamicDeliveryFee } from '../../utils/culqiCheckout';

interface CustomerAddressMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  branchCoords: [number, number]; // [lat, lng]
  branchName: string;
  branchRadiusKm: number;
  initialCoords?: [number, number] | null; // [lat, lng]
  initialAddress?: string;
  tariff?: DeliveryTariffConfig;
  onConfirm: (coords: [number, number], addressText: string, distanceKm: number) => void;
}

// Haversine formula for instant distance calculation in km
function computeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export const CustomerAddressMapPicker: React.FC<CustomerAddressMapPickerProps> = ({
  isOpen,
  onClose,
  branchCoords,
  branchName,
  branchRadiusKm,
  initialCoords,
  initialAddress = '',
  tariff,
  onConfirm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const titleId = useId();

  // Current selected location [lat, lng] - defaults to initialCoords or offset from branch
  const [selectedCoords, setSelectedCoords] = useState<[number, number]>(() => {
    if (initialCoords && initialCoords[0] && initialCoords[1]) return initialCoords;
    // Default ~800m offset from branch
    return [branchCoords[0] + 0.005, branchCoords[1] + 0.005];
  });

  const [addressInput, setAddressInput] = useState<string>(initialAddress);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');

  // Calculate live distance & delivery fee
  const distanceKm = computeHaversineKm(
    branchCoords[0],
    branchCoords[1],
    selectedCoords[0],
    selectedCoords[1]
  );

  const deliveryEval = calculateDynamicDeliveryFee({
    orderMode: 'delivery',
    distanceKm,
    branchMaxRadiusKm: branchRadiusKm || 8,
    cartSubtotal: 50,
    tariff,
  });

  // Reverse geocode when pin moves
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addr = data.address || {};
          const road = addr.road || addr.pedestrian || addr.suburb || '';
          const houseNumber = addr.house_number ? ` #${addr.house_number}` : '';
          const district = addr.city_district || addr.suburb || addr.town || addr.city || '';
          const cleanAddress = road ? `${road}${houseNumber}, ${district}`.trim() : data.display_name.split(',').slice(0, 3).join(',');
          setAddressInput(cleanAddress);
        }
      }
    } catch {
      // Keep manual or prior address
    } finally {
      setIsGeocoding(false);
    }
  };

  // Search address by text (Forward geocoding)
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    setIsGeocoding(true);
    setSearchError('');
    try {
      const q = encodeURIComponent(`${addressInput}, Lima, Peru`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=pe`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          const newCoords: [number, number] = [lat, lon];
          setSelectedCoords(newCoords);
          if (mapRef.current) {
            mapRef.current.setView(newCoords, 16);
            if (customerMarkerRef.current) {
              customerMarkerRef.current.setLatLng(newCoords);
            }
          }
        } else {
          setSearchError('No encontramos esa dirección en el mapa. Puedes arrastrar el pin manualmente.');
        }
      }
    } catch {
      setSearchError('Error de red al consultar el mapa.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // GPS Device location
  const handleGpsLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const newCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setSelectedCoords(newCoords);
        if (mapRef.current) {
          mapRef.current.setView(newCoords, 16);
          if (customerMarkerRef.current) {
            customerMarkerRef.current.setLatLng(newCoords);
          }
        }
        void fetchAddressFromCoords(newCoords[0], newCoords[1]);
      },
      () => {
        setIsLocatingGps(false);
        setSearchError('No se pudo acceder a tu ubicación GPS. Arrastra el pin en el mapa.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: selectedCoords,
        zoom: 15,
        zoomControl: false,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // 1. Branch Marker (Pizzeria)
      const branchIcon = L.divIcon({
        className: 'branch-marker-icon',
        html: `
          <div style="background-color: #09090b; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: 900; font-size: 11px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #f59e0b; white-space: nowrap;">
            <span>🍕</span>
            <span>${branchName.replace('Khalessi Pizza - ', '')}</span>
          </div>
        `,
        iconAnchor: [60, 20],
      });
      L.marker(branchCoords, { icon: branchIcon }).addTo(map);

      // Delivery coverage radius circle
      const radiusMeters = (branchRadiusKm || 8) * 1000;
      const circle = L.circle(branchCoords, {
        radius: radiusMeters,
        color: '#f59e0b',
        weight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.06,
        dashArray: '4, 6',
      }).addTo(map);
      radiusCircleRef.current = circle;

      // 2. Customer Draggable Delivery Pin
      const customerIcon = L.divIcon({
        className: 'customer-pin-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: #e11d48; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 6px 16px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
              <span style="transform: rotate(45deg); color: white; font-weight: 900; font-size: 16px;">📍</span>
            </div>
            <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1px); margin-top: 2px;"></div>
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
      });

      const marker = L.marker(selectedCoords, {
        draggable: true,
        icon: customerIcon,
      }).addTo(map);
      customerMarkerRef.current = marker;

      // Drag event
      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        const newCoords: [number, number] = [latLng.lat, latLng.lng];
        setSelectedCoords(newCoords);
        void fetchAddressFromCoords(latLng.lat, latLng.lng);
      });

      // Map click event
      map.on('click', (e) => {
        const newCoords: [number, number] = [e.latlng.lat, e.latlng.lng];
        setSelectedCoords(newCoords);
        marker.setLatLng(e.latlng);
        void fetchAddressFromCoords(e.latlng.lat, e.latlng.lng);
      });

      // Invalidate size once rendered
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }

    return () => {
      // Map cleanup
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 id={titleId} className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-2">
                <span>Marcar Ubicación Exacta con PIN</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                  GPS & Tarifario
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Arrastra el pin rojo o haz clic en el mapa para ubicar el domicilio del cliente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar + GPS button */}
        <form onSubmit={handleSearchAddress} className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Buscar calle, avenida, jirón o urbanización..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={isGeocoding}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold whitespace-nowrap shrink-0 hover:opacity-90 disabled:opacity-50"
          >
            {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </button>
          <button
            type="button"
            onClick={handleGpsLocation}
            disabled={isLocatingGps}
            title="Ubicar mi GPS actual"
            className="p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
          >
            {isLocatingGps ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <Crosshair className="w-4 h-4" />}
          </button>
        </form>

        {searchError && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-1.5 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Leaflet Map Canvas */}
        <div className="relative flex-1 w-full min-h-[320px] bg-zinc-100 dark:bg-zinc-950">
          <div ref={mapContainerRef} className="w-full h-full min-h-[320px]" />

          {/* Floating Live Distance & Coverage Pill */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto z-1000 p-2.5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md flex items-center gap-3 text-xs">
            <div className={`p-2 rounded-xl shrink-0 ${deliveryEval.isOutOfRange ? 'bg-rose-500/15 text-rose-600' : 'bg-emerald-500/15 text-emerald-600'}`}>
              <Bike className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-zinc-900 dark:text-white">Distancia: {distanceKm} km</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                  deliveryEval.isOutOfRange
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {deliveryEval.isOutOfRange ? 'Fuera de Cobertura' : 'En Cobertura'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
                {deliveryEval.isOutOfRange
                  ? `Excede el radio de ${branchRadiusKm} km de ${branchName}`
                  : `Costo estimado de envío: S/ ${deliveryEval.feeSoles.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Address Display & Confirmation Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400 block">
              Dirección Confirmada del Pin:
            </span>
            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
              {addressInput || `Coordenadas: ${selectedCoords[0].toFixed(5)}, ${selectedCoords[1].toFixed(5)}`}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(selectedCoords, addressInput, distanceKm);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Usar esta Ubicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
