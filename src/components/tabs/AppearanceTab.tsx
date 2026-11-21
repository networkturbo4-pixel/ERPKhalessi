import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  Type,
  Square,
  Save,
  Check,
  Maximize2,
  Contrast,
  PaintBucket,
  RotateCcw,
  Sparkles,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { BorderRadiusSize, ContrastLevel, SystemScaleSize } from '../../types/settings';
import {
  MASTER_THEME_PRESETS,
  getContrastRatio,
  getWcagBadge,
  getAccessibleForeground,
} from '../../utils/themeTokens';

const LIGHT_CONTRAST_PRESETS = [
  { name: 'Terracota Intenso', hex: '#ea580c' },
  { name: 'Rojo Pomodoro', hex: '#dc2626' },
  { name: 'Esmeralda Oscuro', hex: '#059669' },
  { name: 'Azul Cobalto', hex: '#2563eb' },
  { name: 'Violeta Imperial', hex: '#7c3aed' },
  { name: 'Carbón Ejecutivo', hex: '#18181b' },
];

const DARK_CONTRAST_PRESETS = [
  { name: 'Naranja Brasa', hex: '#f97316' },
  { name: 'Ámbar Luminoso', hex: '#f59e0b' },
  { name: 'Verde Albahaca Neon', hex: '#10b981' },
  { name: 'Cian Eléctrico', hex: '#06b6d4' },
  { name: 'Índigo Brillante', hex: '#818cf8' },
  { name: 'Coral Vivo', hex: '#fb7185' },
];

const LIGHT_BG_PRESETS = [
  { name: 'Gris Perla SaaS', shell: '#f4f4f5', surface: '#ffffff', desc: 'Contraste limpio estilo Linear' },
  { name: 'Blanco Puro', shell: '#ffffff', surface: '#fafafa', desc: 'Máxima luminosidad minimalista' },
  { name: 'Crema Masa Madre', shell: '#f5f0e8', surface: '#fffdf9', desc: 'Tono cálido gastronómico' },
  { name: 'Pizarra Fría', shell: '#e2e8f0', surface: '#f8fafc', desc: 'Separación alta para cajas POS' },
];

const DARK_BG_PRESETS = [
  { name: 'Carbón Linear', shell: '#09090b', surface: '#111114', desc: 'Equilibrio neutro profesional' },
  { name: 'Negro OLED Puro', shell: '#030305', surface: '#0b0b0f', desc: 'Contraste profundo para monitores KDS' },
  { name: 'Grafito Suave', shell: '#131419', surface: '#1b1d24', desc: 'Menor fatiga en turnos nocturnos' },
  { name: 'Azul Medianoche', shell: '#080e1a', surface: '#0f172a', desc: 'Estética tecnológica nocturna' },
  { name: 'Espresso Leña', shell: '#120e0c', surface: '#1b1512', desc: 'Oscuro cálido artesanal' },
];

const FONTS = [
  {
    id: 'Space Grotesk',
    name: 'Space Grotesk (Destacada)',
    desc: 'Geométrica moderna con personalidad técnica ideal para números y KPIs',
    badge: 'Nueva',
  },
  {
    id: 'Inter',
    name: 'Inter UI',
    desc: 'Alta legibilidad para tablas densas y terminales POS',
  },
  {
    id: 'Plus Jakarta Sans',
    name: 'Plus Jakarta Sans',
    desc: 'Elegante, contemporánea y equilibrada para SaaS',
  },
  {
    id: 'Geist',
    name: 'Geist Sans',
    desc: 'Minimalismo de ingeniería de precisión',
  },
  {
    id: 'DM Sans',
    name: 'DM Sans',
    desc: 'Limpia y amigable para pantallas táctiles de mostrador',
  },
  {
    id: 'Outfit',
    name: 'Outfit',
    desc: 'Redondeada moderna para marcas gastronómicas',
  },
];

const SYSTEM_SCALES: Array<{ id: SystemScaleSize; label: string; pct: string; desc: string }> = [
  { id: 'xs', label: 'Compacto', pct: '85%', desc: 'Máxima densidad de datos' },
  { id: 'sm', label: 'Ágil SaaS', pct: '92%', desc: 'Ideal laptops 13"-14"' },
  { id: 'md', label: 'Estándar', pct: '100%', desc: 'Proporción nativa base' },
  { id: 'lg', label: 'Cómodo', pct: '108%', desc: 'Lectura descansada' },
  { id: 'xl', label: 'Táctil POS', pct: '115%', desc: 'Pantallas táctiles y KDS' },
];

export const AppearanceTab: React.FC = () => {
  const {
    customization,
    updateCustomization,
    resetCustomizationToDefaults,
    saveAllSettings,
    isSaving,
    isDarkResolved,
  } = useSettings();

  const lightRatio = getContrastRatio(
    customization.accentColorLight,
    customization.lightSurfaceColor || '#ffffff'
  );
  const lightWcag = getWcagBadge(lightRatio);

  const darkRatio = getContrastRatio(
    customization.accentColorDark,
    customization.darkSurfaceColor || '#111114'
  );
  const darkWcag = getWcagBadge(darkRatio);

  const activeFg = getAccessibleForeground(customization.primaryColor);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Palette className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Design System, Contraste Dual y Escala del Sistema
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Personaliza temas maestros, contraste independiente claro/oscuro, redondez, tipografías y escala global del ERP en vivo.
          </p>
        </div>

        <PermissionGate permission="settings:manage" hideInsteadOfBanner>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={resetCustomizationToDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </button>
            <button
              type="button"
              onClick={saveAllSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs saas-btn-primary shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Guardando...' : 'Guardar Estilos'}
            </button>
          </div>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:manage">
        {/* ROW 0: Master 1-Click Presets + Live Theme Preview */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 saas-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: customization.primaryColor }} />
                0. Temas Maestros (1-Click)
              </label>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Aplica paleta, fondos, fuente y contraste en armonía
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MASTER_THEME_PRESETS.map(preset => {
                const isSelected =
                  customization.themePreference === preset.themePreference &&
                  customization.accentColorLight.toLowerCase() === preset.accentColorLight.toLowerCase() &&
                  customization.accentColorDark.toLowerCase() === preset.accentColorDark.toLowerCase() &&
                  customization.darkBgColor.toLowerCase() === preset.darkBgColor.toLowerCase() &&
                  customization.lightBgColor.toLowerCase() === preset.lightBgColor.toLowerCase();

                const previewBg =
                  preset.themePreference === 'light' ? preset.lightBgColor : preset.darkBgColor;
                const previewSurface =
                  preset.themePreference === 'light'
                    ? preset.lightSurfaceColor
                    : preset.darkSurfaceColor;
                const previewAccent =
                  preset.themePreference === 'light'
                    ? preset.accentColorLight
                    : preset.accentColorDark;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      updateCustomization({
                        themePreference: preset.themePreference,
                        accentColorLight: preset.accentColorLight,
                        accentColorDark: preset.accentColorDark,
                        lightBgColor: preset.lightBgColor,
                        lightSurfaceColor: preset.lightSurfaceColor,
                        darkBgColor: preset.darkBgColor,
                        darkSurfaceColor: preset.darkSurfaceColor,
                        contrastLevel: preset.contrastLevel,
                        borderRadius: preset.borderRadius,
                        fontFamily: preset.fontFamily,
                      })
                    }
                    className={`p-3.5 text-left flex flex-col justify-between gap-2.5 ${
                      isSelected ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-5 w-5 rounded-md border border-black/15 dark:border-white/15 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: previewBg }}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: previewSurface }}
                          />
                        </span>
                        <span
                          className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15 dark:ring-white/20 shrink-0"
                          style={{ backgroundColor: previewAccent }}
                        />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {preset.badge}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white block truncate">
                        {preset.name}
                      </span>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-2 mt-0.5 block">
                        {preset.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Theme Preview */}
          <div className="xl:col-span-5 saas-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Eye className="h-4 w-4" style={{ color: customization.primaryColor }} />
                Vista Previa en Vivo
              </label>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                {customization.fontFamily} · {customization.borderRadius.toUpperCase()}
              </span>
            </div>

            <div className="saas-subcard p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-erp-muted block">
                    Ticket Promedio Hoy
                  </span>
                  <span className="text-xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
                    S/ 68.40
                  </span>
                </div>
                <span
                  className="text-[11px] font-bold px-2.5 py-1"
                  style={{
                    backgroundColor: customization.primaryColor,
                    color: activeFg,
                    borderRadius: 'var(--erp-radius-badge)',
                  }}
                >
                  +14.2% KDS
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="Comanda #KH-1042 · Masa Madre"
                  className="flex-1 px-3 py-1.5 text-xs saas-input"
                />
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs saas-btn-primary shrink-0"
                >
                  Despachar
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-semibold saas-btn-secondary shrink-0"
                >
                  Detalle
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* ROW 1: Theme Mode + Edge/Border Contrast Intensity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mode Selector */}
          <div className="lg:col-span-7 saas-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                1. Modo Visual de Pantalla
              </label>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Activo ahora: {isDarkResolved ? 'Oscuro' : 'Claro'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Modo Claro', icon: Sun, sub: 'Diurno luminoso' },
                { id: 'dark', label: 'Modo Oscuro', icon: Moon, sub: 'Nocturno / KDS' },
                { id: 'system', label: 'Automático (SO)', icon: Laptop, sub: 'Sincroniza con Windows' },
              ].map(item => {
                const Icon = item.icon;
                const active = customization.themePreference === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      updateCustomization({ themePreference: item.id as 'light' | 'dark' | 'system' })
                    }
                    className={`flex flex-col items-center text-center gap-1.5 p-4 rounded-xl text-xs font-semibold ${
                      active ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={active ? { color: customization.primaryColor } : undefined}
                    />
                    <span>{item.label}</span>
                    <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                      {item.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Border & Surface Contrast Intensity */}
          <div className="lg:col-span-5 saas-card p-6 space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
              <Contrast className="h-4 w-4" style={{ color: customization.primaryColor }} />
              2. Nivel de Nitidez y Contraste UI
            </label>

            <div className="space-y-2.5">
              {[
                { id: 'standard', name: 'Estándar SaaS', desc: 'Bordes sutiles y jerarquía equilibrada' },
                { id: 'high', name: 'Alto Contraste', desc: 'Bordes reforzados para ambientes iluminados' },
                { id: 'ultra', name: 'Ultra Nitidez (AAA)', desc: 'Delimitación máxima para monitores de cocina' },
              ].map(lvl => {
                const active = (customization.contrastLevel || 'standard') === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => updateCustomization({ contrastLevel: lvl.id as ContrastLevel })}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs ${
                      active ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-white block">{lvl.name}</span>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400">{lvl.desc}</span>
                    </div>
                    {active && (
                      <Check className="h-4 w-4 shrink-0" style={{ color: customization.primaryColor }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ROW 2: Independent Contrast / Accent Color for Light Mode & Dark Mode */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Light Mode Contrast Color */}
          <div className="saas-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                3A. Color de Contraste — Modo Claro
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${lightWcag.toneClass}`}
                  title={`Ratio WCAG sobre lienzo claro: ${lightRatio.toFixed(2)}:1`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {lightWcag.label} ({lightRatio.toFixed(1)}:1)
                </span>
                {!isDarkResolved && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    Aplicado ahora
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customization.accentColorLight}
                onChange={e => updateCustomization({ accentColorLight: e.target.value })}
                className="h-10 w-12 rounded-lg cursor-pointer saas-input p-1 shrink-0"
              />
              <input
                type="text"
                value={customization.accentColorLight}
                onChange={e => updateCustomization({ accentColorLight: e.target.value })}
                className="w-28 px-3 py-2 text-xs font-mono rounded-lg saas-input uppercase"
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Tonos intensos que garantizan legibilidad sobre fondos claros.
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {LIGHT_CONTRAST_PRESETS.map(p => {
                const active =
                  customization.accentColorLight.toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => updateCustomization({ accentColorLight: p.hex })}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      active ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full ring-1 ring-black/15"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark Mode Contrast Color */}
          <div className="saas-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                3B. Color de Contraste — Modo Oscuro
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${darkWcag.toneClass}`}
                  title={`Ratio WCAG sobre lienzo oscuro: ${darkRatio.toFixed(2)}:1`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {darkWcag.label} ({darkRatio.toFixed(1)}:1)
                </span>
                {isDarkResolved && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    Aplicado ahora
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customization.accentColorDark}
                onChange={e => updateCustomization({ accentColorDark: e.target.value })}
                className="h-10 w-12 rounded-lg cursor-pointer saas-input p-1 shrink-0"
              />
              <input
                type="text"
                value={customization.accentColorDark}
                onChange={e => updateCustomization({ accentColorDark: e.target.value })}
                className="w-28 px-3 py-2 text-xs font-mono rounded-lg saas-input uppercase"
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Tonos vibrantes que resaltan con nitidez sobre superficies oscuras.
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {DARK_CONTRAST_PRESETS.map(p => {
                const active =
                  customization.accentColorDark.toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => updateCustomization({ accentColorDark: p.hex })}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      active ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full ring-1 ring-white/25"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ROW 3: Background Selectors for Both Light Mode & Dark Mode */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Light Mode Background */}
          <div className="saas-card p-6 space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
              <PaintBucket className="h-4 w-4 text-amber-500" />
              4A. Fondo y Lienzo — Modo Claro
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LIGHT_BG_PRESETS.map(preset => {
                const active =
                  customization.lightBgColor.toLowerCase() === preset.shell.toLowerCase() &&
                  customization.lightSurfaceColor.toLowerCase() === preset.surface.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      updateCustomization({
                        lightBgColor: preset.shell,
                        lightSurfaceColor: preset.surface,
                      })
                    }
                    className={`p-3 rounded-xl text-left text-xs flex items-start gap-3 ${
                      active ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <span
                      className="h-7 w-7 rounded-lg border border-zinc-300 shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: preset.shell }}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded border border-zinc-200"
                        style={{ backgroundColor: preset.surface }}
                      />
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-zinc-900 dark:text-white block truncate">
                        {preset.name}
                      </span>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block">
                        {preset.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customization.lightBgColor}
                  onChange={e => updateCustomization({ lightBgColor: e.target.value })}
                  className="h-8 w-10 rounded cursor-pointer saas-input p-0.5"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-300">Marco Exterior</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customization.lightSurfaceColor}
                  onChange={e => updateCustomization({ lightSurfaceColor: e.target.value })}
                  className="h-8 w-10 rounded cursor-pointer saas-input p-0.5"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-300">Lienzo / Tarjetas</span>
              </div>
            </div>
          </div>

          {/* Dark Mode Background */}
          <div className="saas-card p-6 space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
              <PaintBucket className="h-4 w-4 text-indigo-400" />
              4B. Fondo y Lienzo — Modo Oscuro
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DARK_BG_PRESETS.map(preset => {
                const active =
                  customization.darkBgColor.toLowerCase() === preset.shell.toLowerCase() &&
                  customization.darkSurfaceColor.toLowerCase() === preset.surface.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      updateCustomization({
                        darkBgColor: preset.shell,
                        darkSurfaceColor: preset.surface,
                      })
                    }
                    className={`p-3 rounded-xl text-left text-xs flex items-start gap-3 ${
                      active ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <span
                      className="h-7 w-7 rounded-lg border border-zinc-700 shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: preset.shell }}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded border border-zinc-600"
                        style={{ backgroundColor: preset.surface }}
                      />
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-zinc-900 dark:text-white block truncate">
                        {preset.name}
                      </span>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block">
                        {preset.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customization.darkBgColor}
                  onChange={e => updateCustomization({ darkBgColor: e.target.value })}
                  className="h-8 w-10 rounded cursor-pointer saas-input p-0.5"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-300">Marco Exterior</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customization.darkSurfaceColor}
                  onChange={e => updateCustomization({ darkSurfaceColor: e.target.value })}
                  className="h-8 w-10 rounded cursor-pointer saas-input p-0.5"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-300">Lienzo Principal</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: Typography (with Space Grotesk) + Global System Size & Border Radius */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Typography Grid */}
          <div className="xl:col-span-7 saas-card p-6 space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
              <Type className="h-4 w-4" style={{ color: customization.primaryColor }} />
              5. Familia Tipográfica del Sistema
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FONTS.map(f => {
                const active = customization.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateCustomization({ fontFamily: f.id })}
                    style={{ fontFamily: f.id }}
                    className={`p-4 rounded-xl text-left flex flex-col justify-between gap-2 ${
                      active ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                        {f.name}
                      </span>
                      {f.badge && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                          style={{ backgroundColor: customization.primaryColor }}
                        >
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
                      {f.desc}
                    </p>
                    <div className="pt-1.5 border-t border-zinc-200/70 dark:border-zinc-700/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-300">
                      <span>S/ 14,820.00</span>
                      <span>Aa Bb Cc 123</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Global Scale + Border Radius */}
          <div className="xl:col-span-5 saas-card p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Maximize2 className="h-4 w-4" style={{ color: customization.primaryColor }} />
                6. Tamaño Global del Sistema (Zoom UI)
              </label>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Escala proporcionalmente textos, tablas, botones y barras laterales para adaptarse a laptops, monitores 4K o pantallas táctiles POS.
              </p>

              <div className="space-y-2">
                {SYSTEM_SCALES.map(sc => {
                  const active = (customization.systemScale || 'md') === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => updateCustomization({ systemScale: sc.id })}
                      className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs ${
                        active ? 'saas-option-active' : 'saas-option'
                      }`}
                    >
                      <div className="text-left">
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {sc.label}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400 ml-2 text-[11px]">
                          — {sc.desc}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shrink-0">
                        {sc.pct}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                <Square className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
                Redondez de Componentes
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['sm', 'md', 'lg', 'full'] as BorderRadiusSize[]).map(radius => {
                  const active = customization.borderRadius === radius;
                  return (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => updateCustomization({ borderRadius: radius })}
                      className={`py-2 text-xs font-semibold ${
                        radius === 'sm'
                          ? 'rounded-sm'
                          : radius === 'md'
                          ? 'rounded-md'
                          : radius === 'lg'
                          ? 'rounded-xl'
                          : 'rounded-full'
                      } ${active ? 'saas-option-active' : 'saas-option'}`}
                    >
                      {radius.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Asistente Bot de Pedidos (Tienda &amp; Kiosko)
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                  Muestra un asistente interactivo para recomendar pizzas, promos y agregar al carrito.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={customization.enableOrderBot ?? true}
                onClick={() =>
                  updateCustomization({ enableOrderBot: !(customization.enableOrderBot ?? true) })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  (customization.enableOrderBot ?? true) ? '' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                style={
                  (customization.enableOrderBot ?? true)
                    ? { backgroundColor: customization.primaryColor }
                    : undefined
                }
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    (customization.enableOrderBot ?? true) ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
};
