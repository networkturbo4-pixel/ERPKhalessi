import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Tenant } from '../../types/settings';

interface LeafletStoreMapProps {
  tenants: Tenant[];
  selectedTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  customerCoords: [number, number]; // [lng, lat]
  onCustomerMove: (coords: [number, number]) => void;
  routeGeometry: [number, number][] | null; // [lng, lat][]
  accentColor?: string;
  activeMobileTab?: 'list' | 'map';
}

const DEFAULT_LAT = -11.93605;
const DEFAULT_LNG = -77.05432;

const tenantLatLng = (t: Tenant): L.LatLngTuple => [
  t.operations?.latitude || DEFAULT_LAT,
  t.operations?.longitude || DEFAULT_LNG,
];

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);

/**
 * Mapa real (OpenStreetMap vía Leaflet): arrastrable, con zoom táctil / rueda y pinches de tiendas.
 * No requiere token, por lo que funciona para cualquier visitante de la tienda.
 */
export const LeafletStoreMap: React.FC<LeafletStoreMapProps> = ({
  tenants,
  selectedTenantId,
  onSelectTenant,
  customerCoords,
  onCustomerMove,
  routeGeometry,
  accentColor = '#e11d48',
  activeMobileTab,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const storeLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const onSelectRef = useRef(onSelectTenant);
  const onMoveRef = useRef(onCustomerMove);
  onSelectRef.current = onSelectTenant;
  onMoveRef.current = onCustomerMove;

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      tap: true,
    } as L.MapOptions);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    storeLayerRef.current = L.layerGroup().addTo(map);

    const userIcon = L.divIcon({
      className: '',
      html: '<div style="width:26px;height:26px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:9999px;background:#fff"></div></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    const userMarker = L.marker([customerCoords[1], customerCoords[0]], {
      icon: userIcon,
      draggable: true,
      title: 'Tu ubicación (arrástrame)',
      zIndexOffset: 1000,
    }).addTo(map);
    userMarker.on('dragend', () => {
      const ll = userMarker.getLatLng();
      onMoveRef.current([ll.lng, ll.lat]);
    });
    userMarkerRef.current = userMarker;

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMoveRef.current([e.latlng.lng, e.latlng.lat]);
    });

    mapRef.current = map;

    // El contenedor puede montarse dentro de un modal con animación: recalcular tamaño
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    const t1 = window.setTimeout(() => {
      map.invalidateSize();
      const tenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
      if (tenant) {
        map.fitBounds(L.latLngBounds([tenantLatLng(tenant), [customerCoords[1], customerCoords[0]]]).pad(0.35), { maxZoom: 15 });
      }
    }, 200);
    const t2 = window.setTimeout(() => {
      map.invalidateSize();
      const tenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
      if (tenant) {
        map.fitBounds(L.latLngBounds([tenantLatLng(tenant), [customerCoords[1], customerCoords[0]]]).pad(0.35), { maxZoom: 15 });
      }
    }, 600);

    return () => {
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      storeLayerRef.current = null;
      userMarkerRef.current = null;
      routeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pinches de tiendas
  useEffect(() => {
    const layer = storeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    tenants.forEach(t => {
      const selected = t.id === selectedTenantId;
      const short = escapeHtml(t.name.replace('Khalessi Pizza - ', ''));
      const bg = selected ? accentColor : '#334155';
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
          <div style="background:${bg};color:#fff;font:800 11px system-ui;padding:3px 9px;border-radius:9999px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);white-space:nowrap">🍕 ${short}</div>
          <div style="width:10px;height:10px;background:${bg};border:2px solid #fff;border-radius:9999px;margin-top:2px"></div>
        </div>`,
        iconSize: [0, 0],
      });
      L.marker(tenantLatLng(t), { icon, zIndexOffset: selected ? 900 : 0, title: short })
        .on('click', () => onSelectRef.current(t.id))
        .addTo(layer);
    });
  }, [tenants, selectedTenantId, accentColor]);

  // Marcador del cliente
  useEffect(() => {
    userMarkerRef.current?.setLatLng([customerCoords[1], customerCoords[0]]);
  }, [customerCoords]);

  // Ruta y encuadre
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
    if (!tenant) return;
    const store = tenantLatLng(tenant);
    const user: L.LatLngTuple = [customerCoords[1], customerCoords[0]];
    const pts: L.LatLngTuple[] =
      routeGeometry && routeGeometry.length > 1
        ? routeGeometry.map(([lng, lat]) => [lat, lng] as L.LatLngTuple)
        : [store, user];

    routeRef.current?.remove();
    routeRef.current = L.polyline(pts, {
      color: accentColor,
      weight: 5,
      opacity: 0.9,
      dashArray: routeGeometry && routeGeometry.length > 1 ? undefined : '8 8',
    }).addTo(map);

    // Ajustar vista inicial enfocada entre la tienda y el cliente con zoom de barrio (14-15)
    map.invalidateSize();
    map.fitBounds(L.latLngBounds([store, user]).pad(0.35), { animate: true, maxZoom: 15 });
  }, [tenants, selectedTenantId, customerCoords, routeGeometry, accentColor, activeMobileTab]);

  // Si cambia la pestaña móvil a 'map', invalidar tamaño inmediatamente y centrar
  useEffect(() => {
    if (activeMobileTab === 'map' && mapRef.current) {
      const map = mapRef.current;
      const tenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
      const timer = window.setTimeout(() => {
        map.invalidateSize();
        if (tenant) {
          const store = tenantLatLng(tenant);
          const user: L.LatLngTuple = [customerCoords[1], customerCoords[0]];
          map.fitBounds(L.latLngBounds([store, user]).pad(0.35), { animate: true, maxZoom: 15 });
        }
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [activeMobileTab, tenants, selectedTenantId, customerCoords]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" style={{ touchAction: 'none' }} />;
};

export default LeafletStoreMap;
