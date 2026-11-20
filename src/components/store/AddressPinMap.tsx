import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AddressPinMapProps {
  lat: number;
  lng: number;
  accentColor?: string;
  onPinChange: (lat: number, lng: number) => void;
}

export const AddressPinMap: React.FC<AddressPinMapProps> = ({
  lat,
  lng,
  accentColor = '#e11d48',
  onPinChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPinChangeRef = useRef(onPinChange);
  onPinChangeRef.current = onPinChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;border-radius:9999px;background:${accentColor};border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:9999px;background:#fff"></div></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([lat, lng], {
      icon: pinIcon,
      draggable: true,
      title: 'Arrastra el pin para ajustar tu ubicación exacta',
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onPinChangeRef.current(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onPinChangeRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [accentColor]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.panTo([lat, lng], { animate: true });
  }, [lat, lng]);

  return (
    <div className="relative w-full h-36 sm:h-40 rounded-2xl overflow-hidden border border-zinc-200 dark:border-neutral-800 shadow-inner">
      <div ref={containerRef} className="w-full h-full z-0" />
      <div className="pointer-events-none absolute top-2 left-2 z-[400] px-2.5 py-1 rounded-full bg-black/75 text-white text-[10px] font-bold backdrop-blur-xs">
        Toca o arrastra el pin para mayor precisión
      </div>
    </div>
  );
};
