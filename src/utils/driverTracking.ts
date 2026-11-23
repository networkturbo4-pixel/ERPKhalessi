import {
  ActiveNavigationRoute,
  DriverAvailabilityStatus,
  DriverBreakSession,
  DriverFleetSnapshot,
  DriverLiveState,
  DriverLocationPing,
  DriverTrailPoint,
  RouteStep,
} from '../types/delivery';
import { getMapboxSettings, isMapboxTokenValid } from './mapboxConfig';
import { getConfiguredServerUrl } from './serverUrl';
import { getServerToken } from './diskPersistence';

export const DRIVER_FLEET_STORAGE_KEY = 'kh_driver_fleet_v1';
export const DRIVER_FLEET_EVENT = 'kh-driver-fleet-updated';

const EMPTY_SNAPSHOT: DriverFleetSnapshot = {
  drivers: {},
  breaks: [],
  trails: {},
};

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadDriverFleetSnapshot(): DriverFleetSnapshot {
  try {
    const raw = localStorage.getItem(DRIVER_FLEET_STORAGE_KEY);
    if (!raw) return EMPTY_SNAPSHOT;
    const parsed = JSON.parse(raw);
    return {
      drivers: parsed?.drivers && typeof parsed.drivers === 'object' ? parsed.drivers : {},
      breaks: Array.isArray(parsed?.breaks) ? parsed.breaks : [],
      trails: parsed?.trails && typeof parsed.trails === 'object' ? parsed.trails : {},
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export function saveDriverFleetSnapshot(snapshot: DriverFleetSnapshot): void {
  try {
    // Keep last 400 breaks and cap trails to 600 points per driver-day
    const trimmedTrails: Record<string, DriverTrailPoint[]> = {};
    for (const [k, pts] of Object.entries(snapshot.trails)) {
      trimmedTrails[k] = Array.isArray(pts) ? pts.slice(-600) : [];
    }
    const trimmed: DriverFleetSnapshot = {
      drivers: snapshot.drivers,
      breaks: snapshot.breaks.slice(-400),
      trails: trimmedTrails,
    };
    localStorage.setItem(DRIVER_FLEET_STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(DRIVER_FLEET_EVENT, { detail: trimmed }));
  } catch {
    // Ignore storage quota errors
  }
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDurationCompact(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  if (mins > 0) return `${mins}m ${String(secs).padStart(2, '0')}s`;
  return `${secs}s`;
}

export function setDriverAvailabilityStatus(params: {
  driverId: string;
  driverName: string;
  tenantId: string;
  avatarUrl?: string;
  phone?: string;
  status: DriverAvailabilityStatus;
  activeOrderId?: string;
  breakReason?: string;
}): DriverFleetSnapshot {
  const snap = loadDriverFleetSnapshot();
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const existing: DriverLiveState = snap.drivers[params.driverId] || {
    driverId: params.driverId,
    driverName: params.driverName,
    avatarUrl: params.avatarUrl,
    phone: params.phone,
    tenantId: params.tenantId,
    status: 'offline',
    totalBreakSecondsToday: 0,
    updatedAt: nowIso,
  };

  let totalBreakSecondsToday = existing.totalBreakSecondsToday || 0;
  let currentBreakStartedAt = existing.currentBreakStartedAt;
  const nextBreaks = [...snap.breaks];

  // Closing an open break if transitioning away from 'descanso'
  if (existing.status === 'descanso' && params.status !== 'descanso' && existing.currentBreakStartedAt) {
    const startMs = new Date(existing.currentBreakStartedAt).getTime();
    const durSec = Math.max(1, Math.round((nowMs - startMs) / 1000));
    totalBreakSecondsToday += durSec;
    currentBreakStartedAt = undefined;
    for (let i = nextBreaks.length - 1; i >= 0; i--) {
      if (nextBreaks[i].driverId === params.driverId && !nextBreaks[i].endedAt) {
        nextBreaks[i] = {
          ...nextBreaks[i],
          endedAt: nowIso,
          durationSeconds: durSec,
        };
        break;
      }
    }
  }

  // Opening a new break if entering 'descanso'
  if (params.status === 'descanso' && existing.status !== 'descanso') {
    currentBreakStartedAt = nowIso;
    const newBreak: DriverBreakSession = {
      id: `brk-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
      driverId: params.driverId,
      driverName: params.driverName,
      tenantId: params.tenantId,
      startedAt: nowIso,
      reason: params.breakReason || 'Descanso operativo',
    };
    nextBreaks.push(newBreak);
  }

  const nextDriver: DriverLiveState = {
    ...existing,
    driverName: params.driverName,
    avatarUrl: params.avatarUrl ?? existing.avatarUrl,
    phone: params.phone ?? existing.phone,
    tenantId: params.tenantId,
    status: params.status,
    activeOrderId:
      params.activeOrderId !== undefined
        ? params.activeOrderId
        : params.status === 'en_ruta'
        ? existing.activeOrderId
        : undefined,
    shiftStartedAt:
      existing.shiftStartedAt || (params.status !== 'offline' ? nowIso : undefined),
    currentBreakStartedAt,
    totalBreakSecondsToday,
    updatedAt: nowIso,
  };

  const nextSnap: DriverFleetSnapshot = {
    drivers: {
      ...snap.drivers,
      [params.driverId]: nextDriver,
    },
    breaks: nextBreaks,
    trails: snap.trails,
  };
  saveDriverFleetSnapshot(nextSnap);
  return nextSnap;
}

export function recordDriverLocationPing(ping: DriverLocationPing): DriverFleetSnapshot {
  const snap = loadDriverFleetSnapshot();
  const dateKey = getLocalDateKey(new Date(ping.timestamp));
  const trailKey = `${ping.driverId}::${dateKey}`;
  const prevTrail = snap.trails[trailKey] || [];
  const lastPt = prevTrail[prevTrail.length - 1];

  // Append point only if moved > 8m or >= 15s elapsed to keep trail clean
  let nextTrail = prevTrail;
  const distMoved = lastPt
    ? haversineDistanceMeters(lastPt.lat, lastPt.lng, ping.lat, ping.lng)
    : 999;
  const elapsedSec = lastPt
    ? (new Date(ping.timestamp).getTime() - new Date(lastPt.timestamp).getTime()) / 1000
    : 999;

  if (distMoved >= 8 || elapsedSec >= 15) {
    nextTrail = [
      ...prevTrail,
      {
        lat: ping.lat,
        lng: ping.lng,
        speedKmh: ping.speedKmh,
        heading: ping.heading,
        status: ping.status,
        orderId: ping.activeOrderId,
        timestamp: ping.timestamp,
      },
    ].slice(-600);
  }

  const prevDriver = snap.drivers[ping.driverId];
  const nextDriver: DriverLiveState = {
    driverId: ping.driverId,
    driverName: ping.driverName,
    avatarUrl: prevDriver?.avatarUrl,
    phone: prevDriver?.phone,
    tenantId: ping.tenantId,
    status: ping.status,
    activeOrderId: ping.activeOrderId ?? prevDriver?.activeOrderId,
    lastLocation: ping,
    shiftStartedAt: prevDriver?.shiftStartedAt || ping.timestamp,
    currentBreakStartedAt: prevDriver?.currentBreakStartedAt,
    totalBreakSecondsToday: prevDriver?.totalBreakSecondsToday || 0,
    updatedAt: ping.timestamp,
  };

  const nextSnap: DriverFleetSnapshot = {
    drivers: {
      ...snap.drivers,
      [ping.driverId]: nextDriver,
    },
    breaks: snap.breaks,
    trails: {
      ...snap.trails,
      [trailKey]: nextTrail,
    },
  };
  saveDriverFleetSnapshot(nextSnap);
  return nextSnap;
}

export async function pushDriverLocationToServer(ping: DriverLocationPing): Promise<void> {
  try {
    const base = getConfiguredServerUrl();
    if (!base && typeof window !== 'undefined' && window.location.port === '5173') {
      return;
    }
    const endpoint = base
      ? `${base.replace(/\/+$/, '')}/api/delivery/location`
      : '/api/delivery/location';
    const token = getServerToken();
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-erp-token': token, Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(ping),
    });
  } catch {
    // Silent fallback when offline or local dev without Node server
  }
}

export function getDriverTrailForDate(
  snapshot: DriverFleetSnapshot,
  driverId: string,
  dateKey: string = getLocalDateKey()
): DriverTrailPoint[] {
  return snapshot.trails[`${driverId}::${dateKey}`] || [];
}

function translateManeuver(type?: string, modifier?: string, street?: string): string {
  const road = street ? ` en ${street}` : '';
  if (type === 'arrive') return 'Llegaste al punto de entrega';
  if (type === 'depart') return `Inicia ruta${road}`;
  switch (modifier) {
    case 'left':
      return `Gira a la izquierda${road}`;
    case 'slight left':
      return `Mantente a la izquierda${road}`;
    case 'sharp left':
      return `Gira cerrado a la izquierda${road}`;
    case 'right':
      return `Gira a la derecha${road}`;
    case 'slight right':
      return `Mantente a la derecha${road}`;
    case 'sharp right':
      return `Gira cerrado a la derecha${road}`;
    case 'uturn':
      return `Haz un retorno en U${road}`;
    default:
      return `Continúa recto${road}`;
  }
}

/**
 * Calcula ruta punto a punto dentro de la propia app (Mapbox Directions si hay token válido,
 * OSRM público como motor gratuito por defecto, o línea directa si no hay conexión).
 */
export async function fetchInAppRoute(params: {
  orderId: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}): Promise<ActiveNavigationRoute> {
  const { orderId, originLat, originLng, destLat, destLng } = params;
  const mapbox = getMapboxSettings();

  // 1. Mapbox Directions if token configured
  if (mapbox.enabled && isMapboxTokenValid(mapbox.accessToken)) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&overview=full&steps=true&language=es&access_token=${encodeURIComponent(
        mapbox.accessToken
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const route = data?.routes?.[0];
        if (route?.geometry?.coordinates?.length) {
          const coords: [number, number][] = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          const steps: RouteStep[] = (route.legs?.[0]?.steps || []).map((st: any) => ({
            instruction:
              st.maneuver?.instruction ||
              translateManeuver(st.maneuver?.type, st.maneuver?.modifier, st.name),
            distanceMeters: Math.round(st.distance || 0),
            durationSeconds: Math.round(st.duration || 0),
            maneuverType: st.maneuver?.type,
            maneuverModifier: st.maneuver?.modifier,
          }));
          return {
            orderId,
            origin: [originLat, originLng],
            destination: [destLat, destLng],
            coordinates: coords,
            distanceMeters: Math.round(route.distance || 0),
            durationSeconds: Math.round(route.duration || 0),
            steps,
            provider: 'mapbox',
          };
        }
      }
    } catch {
      // Fall through to OSRM
    }
  }

  // 2. OSRM public routing (no API key required)
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route?.geometry?.coordinates?.length) {
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const steps: RouteStep[] = (route.legs?.[0]?.steps || []).map((st: any) => ({
          instruction: translateManeuver(st.maneuver?.type, st.maneuver?.modifier, st.name),
          distanceMeters: Math.round(st.distance || 0),
          durationSeconds: Math.round(st.duration || 0),
          maneuverType: st.maneuver?.type,
          maneuverModifier: st.maneuver?.modifier,
        }));
        return {
          orderId,
          origin: [originLat, originLng],
          destination: [destLat, destLng],
          coordinates: coords,
          distanceMeters: Math.round(route.distance || 0),
          durationSeconds: Math.round(route.duration || 0),
          steps,
          provider: 'osrm',
        };
      }
    }
  } catch {
    // Fall through to direct line
  }

  // 3. Offline / Direct fallback
  const dist = haversineDistanceMeters(originLat, originLng, destLat, destLng);
  return {
    orderId,
    origin: [originLat, originLng],
    destination: [destLat, destLng],
    coordinates: [
      [originLat, originLng],
      [destLat, destLng],
    ],
    distanceMeters: Math.round(dist),
    durationSeconds: Math.round((dist / 1000 / 22) * 3600),
    steps: [
      {
        instruction: 'Dirígete hacia el punto marcado en el mapa',
        distanceMeters: Math.round(dist),
        durationSeconds: Math.round((dist / 1000 / 22) * 3600),
        maneuverType: 'depart',
      },
    ],
    provider: 'direct',
  };
}
