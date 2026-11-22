import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order } from '../../types/catalog';
import { ActiveNavigationRoute, DriverLiveState, DriverTrailPoint } from '../../types/delivery';
import { Crosshair } from 'lucide-react';

interface InAppDriverMapProps {
  center: [number, number];
  driverLocation?: [number, number] | null;
  driverHeading?: number;
  storeLocation?: [number, number] | null;
  storeLabel?: string;
  activeOrder?: Order | null;
  availableOrders?: Order[];
  route?: ActiveNavigationRoute | null;
  fleetDrivers?: DriverLiveState[];
  trailPoints?: DriverTrailPoint[];
  onSelectOrder?: (order: Order) => void;
  onSelectDriver?: (driver: DriverLiveState) => void;
  className?: string;
  bottomOffsetPx?: number;
  mapTheme?: 'day' | 'night';
}

const STATUS_COLOR: Record<string, string> = {
  disponible: '#10b981',
  en_ruta: '#3b82f6',
  descanso: '#f59e0b',
  offline: '#71717a',
};

export function getOrderApproxCoords(
  order: Order,
  fallbackCenter: [number, number]
): [number, number] {
  if (typeof order.deliveryLat === 'number' && typeof order.deliveryLng === 'number') {
    return [order.deliveryLat, order.deliveryLng];
  }
  // Deterministic offset around branch center when order lacks exact geocoded coords
  let hash = 0;
  const seed = order.id || order.orderNumber || 'order';
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const latOff = ((hash % 180) - 90) * 0.00018;
  const lngOff = (((hash >> 8) % 180) - 90) * 0.00018;
  return [fallbackCenter[0] + latOff, fallbackCenter[1] + lngOff];
}

export const InAppDriverMap: React.FC<InAppDriverMapProps> = ({
  center,
  driverLocation,
  driverHeading = 0,
  storeLocation,
  storeLabel = 'Local',
  activeOrder,
  availableOrders = [],
  route,
  fleetDrivers = [],
  trailPoints = [],
  onSelectOrder,
  onSelectDriver,
  className = 'w-full h-full',
  bottomOffsetPx = 0,
  mapTheme = 'day',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const hasCenteredOnceRef = useRef(false);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Apply Day (high-contrast) or Night (anti-glare dark) filter to tile pane
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tilePane = map.getPane('tilePane');
    if (!tilePane) return;
    if (mapTheme === 'night') {
      tilePane.style.filter = 'invert(100%) hue-rotate(180deg) brightness(92%) contrast(94%)';
    } else {
      tilePane.style.filter = 'contrast(106%) saturate(108%)';
    }
  }, [mapTheme]);

  // Re-render markers, polylines, and geofence rings
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Store origin marker
    if (storeLocation) {
      const storeIcon = L.divIcon({
        className: 'kh-map-store-pin',
        html: `<div style="width:32px;height:32px;border-radius:12px;background:#18181b;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.28);">🍕</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker(storeLocation, { icon: storeIcon })
        .bindTooltip(storeLabel, { direction: 'top', offset: [0, -14] })
        .addTo(group);
    }

    // 2. Historical breadcrumb trail (for Control Tower playback)
    if (trailPoints.length > 1) {
      const latlngs = trailPoints.map((pt) => [pt.lat, pt.lng] as [number, number]);
      L.polyline(latlngs, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.75,
        dashArray: '6 6',
      }).addTo(group);

      const startPt = latlngs[0];
      const endPt = latlngs[latlngs.length - 1];
      L.circleMarker(startPt, {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: '#10b981',
        fillOpacity: 1,
      })
        .bindTooltip('Inicio de recorrido')
        .addTo(group);
      L.circleMarker(endPt, {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: '#6366f1',
        fillOpacity: 1,
      })
        .bindTooltip('Último punto')
        .addTo(group);
    }

    // 3. Active route polyline
    if (route && route.coordinates.length > 1) {
      // Soft outer casing
      L.polyline(route.coordinates, {
        color: '#1d4ed8',
        weight: 8,
        opacity: 0.25,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(group);

      // Inner crisp route line
      L.polyline(route.coordinates, {
        color: '#2563eb',
        weight: 4.5,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(group);
    }

    // 4. Available ready orders (InDriver radar pins)
    availableOrders.forEach((order) => {
      if (activeOrder && order.id === activeOrder.id) return;
      const coords = getOrderApproxCoords(order, center);
      const ordCode = order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`;
      const pinIcon = L.divIcon({
        className: 'kh-map-order-pin',
        html: `<div style="padding:4px 8px;border-radius:9999px;background:#10b981;color:#fff;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 4px 12px rgba(16,185,129,0.38);white-space:nowrap;">${ordCode}</div>`,
        iconSize: [56, 26],
        iconAnchor: [28, 13],
      });
      const marker = L.marker(coords, { icon: pinIcon }).addTo(group);
      if (onSelectOrder) {
        marker.on('click', () => onSelectOrder(order));
      }
    });

    // 5. Active order destination + 70m arrival geofence
    if (activeOrder) {
      const destCoords = getOrderApproxCoords(activeOrder, center);
      L.circle(destCoords, {
        radius: 70,
        color: '#ef4444',
        weight: 1.5,
        fillColor: '#ef4444',
        fillOpacity: 0.1,
        dashArray: '4 4',
      }).addTo(group);

      const activeCode = activeOrder.orderNumber.startsWith('#')
        ? activeOrder.orderNumber
        : `#${activeOrder.orderNumber}`;
      const destIcon = L.divIcon({
        className: 'kh-map-dest-pin',
        html: `<div style="display:flex;flex-direction:column;align-items:center;">
          <div style="padding:4px 9px;border-radius:9999px;background:#ef4444;color:#fff;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 6px 16px rgba(239,68,68,0.4);white-space:nowrap;">${activeOrder.customerName.split(' ')[0]} · ${activeCode}</div>
          <div style="width:10px;height:10px;border-radius:9999px;background:#ef4444;border:2px solid #fff;margin-top:2px;"></div>
        </div>`,
        iconSize: [120, 42],
        iconAnchor: [60, 38],
      });
      L.marker(destCoords, { icon: destIcon }).addTo(group);
    }

    // 6. Fleet drivers (for Control Tower)
    fleetDrivers.forEach((drv) => {
      if (!drv.lastLocation) return;
      const color = STATUS_COLOR[drv.status] || '#71717a';
      const initials = drv.driverName
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
      const drvIcon = L.divIcon({
        className: 'kh-map-fleet-driver',
        html: `<div style="display:flex;align-items:center;gap:4px;padding:3px 8px 3px 4px;border-radius:9999px;background:#18181b;color:#fff;border:2px solid ${color};box-shadow:0 4px 12px rgba(0,0,0,0.3);white-space:nowrap;">
          <span style="width:20px;height:20px;border-radius:9999px;background:${color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">${initials}</span>
          <span style="font-size:11px;font-weight:700;">${drv.driverName.split(' ')[0]}</span>
        </div>`,
        iconSize: [96, 28],
        iconAnchor: [48, 14],
      });
      const marker = L.marker([drv.lastLocation.lat, drv.lastLocation.lng], {
        icon: drvIcon,
      }).addTo(group);
      if (onSelectDriver) {
        marker.on('click', () => onSelectDriver(drv));
      }
    });

    // 7. Current driver live marker with heading arrow
    if (driverLocation) {
      const driverIcon = L.divIcon({
        className: 'kh-map-self-driver',
        html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,0.22);"></div>
          <div style="width:22px;height:22px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 3px 10px rgba(37,99,235,0.55);display:flex;align-items:center;justify-content:center;transform:rotate(${Math.round(
            driverHeading
          )}deg);">
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid #fff;margin-top:-2px;"></div>
          </div>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker(driverLocation, { icon: driverIcon, zIndexOffset: 1000 }).addTo(group);
    }

    // Auto-fit once on initial load or when active route changes
    if (!hasCenteredOnceRef.current) {
      hasCenteredOnceRef.current = true;
      if (route && route.coordinates.length > 1) {
        map.fitBounds(L.latLngBounds(route.coordinates), {
          paddingTopLeft: [36, 80],
          paddingBottomRight: [36, Math.max(80, bottomOffsetPx + 32)],
        });
      } else if (driverLocation) {
        map.setView(driverLocation, 15.5, { animate: false });
      }
    }
  }, [
    center,
    driverLocation,
    driverHeading,
    storeLocation,
    storeLabel,
    activeOrder,
    availableOrders,
    route,
    fleetDrivers,
    trailPoints,
    bottomOffsetPx,
    onSelectOrder,
    onSelectDriver,
  ]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (route && route.coordinates.length > 1) {
      map.fitBounds(L.latLngBounds(route.coordinates), {
        paddingTopLeft: [36, 80],
        paddingBottomRight: [36, Math.max(80, bottomOffsetPx + 32)],
      });
    } else if (driverLocation) {
      map.flyTo(driverLocation, 16, { duration: 0.45 });
    } else {
      map.flyTo(center, 15, { duration: 0.45 });
    }
  };

  return (
    <div
      className={`relative overflow-hidden overscroll-none touch-none ${
        mapTheme === 'night' ? 'bg-zinc-950' : 'bg-zinc-200'
      } ${className}`}
    >
      <div ref={containerRef} className="w-full h-full z-0" />
      <button
        type="button"
        onClick={handleRecenter}
        title="Centrar mapa"
        style={{ bottom: `${Math.max(16, bottomOffsetPx + 16)}px` }}
        className={`absolute right-4 z-[450] lg:!bottom-4 h-11 w-11 rounded-2xl backdrop-blur-md border shadow-lg flex items-center justify-center transition-transform duration-150 ease-out active:scale-[0.95] cursor-pointer ${
          mapTheme === 'night'
            ? 'bg-zinc-900/95 border-zinc-700 text-white'
            : 'bg-white/95 border-zinc-300 text-zinc-950'
        }`}
      >
        <Crosshair className="w-5 h-5" />
      </button>
    </div>
  );
};
