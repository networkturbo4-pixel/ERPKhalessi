import { BorderRadiusSize, ContrastLevel, SystemScaleSize, ThemePreference } from '../types/settings';

export interface RgbTuple {
  r: number;
  g: number;
  b: number;
}

export interface MasterThemePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  themePreference: ThemePreference;
  accentColorLight: string;
  accentColorDark: string;
  lightBgColor: string;
  lightSurfaceColor: string;
  darkBgColor: string;
  darkSurfaceColor: string;
  contrastLevel: ContrastLevel;
  borderRadius: BorderRadiusSize;
  fontFamily: string;
  systemScale?: SystemScaleSize;
}

export const MASTER_THEME_PRESETS: MasterThemePreset[] = [
  {
    id: 'khalessi-brasa',
    name: 'Khalessi Brasa',
    badge: 'Firma',
    description: 'Identidad artesanal cálida con acento brasa y lienzo oscuro profundo.',
    themePreference: 'dark',
    accentColorLight: '#ea580c',
    accentColorDark: '#f97316',
    lightBgColor: '#f5f0e8',
    lightSurfaceColor: '#fffdf9',
    darkBgColor: '#120e0c',
    darkSurfaceColor: '#1b1512',
    contrastLevel: 'standard',
    borderRadius: 'lg',
    fontFamily: 'Space Grotesk',
  },
  {
    id: 'linear-carbon',
    name: 'Carbón Linear',
    badge: 'SaaS',
    description: 'Estética técnica neutra de alta precisión para administración y finanzas.',
    themePreference: 'dark',
    accentColorLight: '#2563eb',
    accentColorDark: '#818cf8',
    lightBgColor: '#f4f4f5',
    lightSurfaceColor: '#ffffff',
    darkBgColor: '#09090b',
    darkSurfaceColor: '#111114',
    contrastLevel: 'standard',
    borderRadius: 'md',
    fontFamily: 'Geist',
  },
  {
    id: 'masa-madre-light',
    name: 'Masa Madre Editorial',
    badge: 'Diurno',
    description: 'Modo claro cálido y luminoso pensado para locales con luz natural.',
    themePreference: 'light',
    accentColorLight: '#dc2626',
    accentColorDark: '#fb7185',
    lightBgColor: '#f5f0e8',
    lightSurfaceColor: '#fffdf9',
    darkBgColor: '#131419',
    darkSurfaceColor: '#1b1d24',
    contrastLevel: 'high',
    borderRadius: 'lg',
    fontFamily: 'Plus Jakarta Sans',
  },
  {
    id: 'kds-ultra-aaa',
    name: 'KDS Cocina Ultra AAA',
    badge: 'Operación',
    description: 'Negro OLED y bordes ultra nítidos para monitores de cocina y cajas POS.',
    themePreference: 'dark',
    accentColorLight: '#059669',
    accentColorDark: '#10b981',
    lightBgColor: '#e2e8f0',
    lightSurfaceColor: '#f8fafc',
    darkBgColor: '#030305',
    darkSurfaceColor: '#0b0b0f',
    contrastLevel: 'ultra',
    borderRadius: 'sm',
    fontFamily: 'Inter',
  },
  {
    id: 'midnight-exec',
    name: 'Medianoche Ejecutivo',
    badge: 'Nocturno',
    description: 'Azul medianoche con cian eléctrico de alto contraste para turnos largos.',
    themePreference: 'dark',
    accentColorLight: '#2563eb',
    accentColorDark: '#06b6d4',
    lightBgColor: '#e2e8f0',
    lightSurfaceColor: '#f8fafc',
    darkBgColor: '#080e1a',
    darkSurfaceColor: '#0f172a',
    contrastLevel: 'high',
    borderRadius: 'lg',
    fontFamily: 'DM Sans',
  },
];

export const RADIUS_SCALE_MAP: Record<
  BorderRadiusSize,
  { card: string; subcard: string; control: string; badge: string }
> = {
  sm: { card: '0.5rem', subcard: '0.375rem', control: '0.375rem', badge: '0.25rem' },
  md: { card: '0.75rem', subcard: '0.5rem', control: '0.5rem', badge: '0.375rem' },
  lg: { card: '1rem', subcard: '0.75rem', control: '0.75rem', badge: '9999px' },
  full: { card: '1.5rem', subcard: '1.125rem', control: '9999px', badge: '9999px' },
};

export function hexToRgb(hexColor: string): RgbTuple | null {
  const clean = (hexColor || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): RgbTuple {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  if (sn === 0) {
    const val = Math.round(ln * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

/**
 * Generates a vibrant 50..950 RGB palette from a hex color using HSL lightness
 * interpolation with subtle saturation preservation so warm/cyan hues stay crisp.
 */
export function buildBrandScale(hexColor: string): Record<string, string> | null {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return null;

  const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const shades: Array<[string, number, number]> = [
    ['50', Math.max(l, 96), Math.min(100, s * 0.92)],
    ['100', Math.max(l, 91), Math.min(100, s * 0.94)],
    ['200', Math.max(l, 82), Math.min(100, s * 0.96)],
    ['300', Math.max(l, 70), Math.min(100, s * 0.98)],
    ['400', Math.min(92, l + (100 - l) * 0.24), s],
    ['500', l, s],
    ['600', Math.max(8, l * 0.84), Math.min(100, s * 1.03)],
    ['700', Math.max(6, l * 0.68), Math.min(100, s * 1.04)],
    ['800', Math.max(5, l * 0.52), Math.min(100, s * 1.02)],
    ['900', Math.max(4, l * 0.38), s * 0.96],
    ['950', Math.max(3, l * 0.24), s * 0.9],
  ];

  const result: Record<string, string> = {};
  for (const [shade, targetL, targetS] of shades) {
    if (shade === '500') {
      result[shade] = `${rgb.r} ${rgb.g} ${rgb.b}`;
    } else {
      const c = hslToRgb(h, targetS, targetL);
      result[shade] = `${c.r} ${c.g} ${c.b}`;
    }
  }
  return result;
}

export function getRelativeLuminance(hexColor: string): number {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 0;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getAccessibleForeground(bgHex: string): '#ffffff' | '#09090b' {
  const whiteRatio = getContrastRatio(bgHex, '#ffffff');
  const darkRatio = getContrastRatio(bgHex, '#09090b');
  return whiteRatio >= darkRatio ? '#ffffff' : '#09090b';
}

export function getWcagBadge(ratio: number): {
  label: 'AAA' | 'AA' | 'Bajo';
  toneClass: string;
} {
  if (ratio >= 7) {
    return {
      label: 'AAA',
      toneClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    };
  }
  if (ratio >= 4.5) {
    return {
      label: 'AA',
      toneClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    };
  }
  return {
    label: 'Bajo',
    toneClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  };
}
