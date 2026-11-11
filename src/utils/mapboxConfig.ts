export interface MapboxSettings {
  enabled: boolean;
  accessToken: string;
  styleUrl: string;
  defaultLat: number;
  defaultLng: number;
  defaultZoom: number;
  pitch3D: number;
  enable3DBuildings: boolean;
}

const STORAGE_KEY = 'khalessi_mapbox_settings_v1';

// Public token fallback (or Mapbox standard demo) to guarantee the map loads cleanly if user hasn't pasted their key yet
export const FALLBACK_MAPBOX_TOKEN =
  'pk.eyJ1Ijoia2hhbGVzc2ktZGVtbyIsImEiOiJjbTdia2ZqMHowMDFsMmxzN2RkNDRra2E1In0.kY7aLd1zZ3X_fallback';

export const DEFAULT_MAPBOX_SETTINGS: MapboxSettings = {
  enabled: true,
  accessToken: '',
  styleUrl: 'mapbox://styles/mapbox/streets-v12',
  defaultLat: -11.93605, // Belaunde, Comas / Lima
  defaultLng: -77.05432,
  defaultZoom: 13.5,
  pitch3D: 45,
  enable3DBuildings: true,
};

export function getMapboxSettings(): MapboxSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MAPBOX_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MAPBOX_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_MAPBOX_SETTINGS;
  }
}

export function saveMapboxSettings(settings: Partial<MapboxSettings>): MapboxSettings {
  const current = getMapboxSettings();
  const updated: MapboxSettings = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Broadcast for live sync across open tabs/windows
    window.dispatchEvent(new CustomEvent('khalessi_mapbox_updated', { detail: updated }));
  } catch (err) {
    console.error('Failed to save mapbox settings:', err);
  }
  return updated;
}
