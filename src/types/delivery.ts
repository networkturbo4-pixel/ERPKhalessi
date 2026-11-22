export type DriverAvailabilityStatus = 'disponible' | 'en_ruta' | 'descanso' | 'offline';

export interface DriverLocationPing {
  driverId: string;
  driverName: string;
  tenantId: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
  accuracyM?: number;
  batteryPct?: number;
  status: DriverAvailabilityStatus;
  activeOrderId?: string;
  timestamp: string;
}

export interface DriverBreakSession {
  id: string;
  driverId: string;
  driverName: string;
  tenantId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  reason?: string;
}

export interface DriverTrailPoint {
  lat: number;
  lng: number;
  speedKmh?: number;
  heading?: number;
  status: DriverAvailabilityStatus;
  orderId?: string;
  timestamp: string;
}

export interface DriverLiveState {
  driverId: string;
  driverName: string;
  avatarUrl?: string;
  phone?: string;
  tenantId: string;
  status: DriverAvailabilityStatus;
  activeOrderId?: string;
  lastLocation?: DriverLocationPing;
  shiftStartedAt?: string;
  currentBreakStartedAt?: string;
  totalBreakSecondsToday: number;
  updatedAt: string;
}

export interface DriverFleetSnapshot {
  drivers: Record<string, DriverLiveState>;
  breaks: DriverBreakSession[];
  trails: Record<string, DriverTrailPoint[]>; // key: `${driverId}::YYYY-MM-DD`
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType?: string;
  maneuverModifier?: string;
}

export interface ActiveNavigationRoute {
  orderId: string;
  origin: [number, number]; // [lat, lng]
  destination: [number, number]; // [lat, lng]
  coordinates: [number, number][]; // [lat, lng][]
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  provider: 'mapbox' | 'osrm' | 'direct';
}
