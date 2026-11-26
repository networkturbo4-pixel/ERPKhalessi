import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import {
  SeasonalIntensity,
  SeasonalScope,
  SeasonalStyleMode,
  SeasonalThemeConfig,
  SeasonalThemeId,
} from '../../types/settings';
import {
  SEASONAL_THEMES_META,
  SeasonalOverlay,
  getSeasonalCampaignStatus,
} from '../common/SeasonalOverlay';
import {
  Sparkles,
  Save,
  Check,
  Store,
  Monitor,
  Layers,
  Gauge,
  MessageSquareText,
  Eye,
  CalendarClock,
  Palette,
  Timer,
  RotateCcw,
} from 'lucide-react';

const INTENSITY_OPTIONS: Array<{
  id: SeasonalIntensity;
  label: string;
  desc: string;
}> = [
  { id: 'subtle', label: 'Sutil', desc: 'Ligero, ideal para celulares' },
  { id: 'medium', label: 'Equilibrado', desc: 'Balance visual fluido' },
  { id: 'festive', label: 'Festivo', desc: 'Máxima presencia visual' },
];

const SCOPE_OPTIONS: Array<{
  id: SeasonalScope;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'storefront',
    label: 'Solo Tienda Virtual',
    desc: 'Los efectos se ven únicamente en la tienda online del cliente',
    icon: Store,
  },
  {
    id: 'storefront_kiosk',
    label: 'Tienda Virtual + Kiosko',
    desc: 'Incluye pantallas de autoservicio en salón',
    icon: Monitor,
  },
  {
    id: 'all',
    label: 'Todo el Sistema (ERP + Tienda)',
    desc: 'Aplica también dentro del panel administrativo',
    icon: Layers,
  },
];

const STYLE_MODE_OPTIONS: Array<{ id: SeasonalStyleMode; label: string; desc: string }> = [
  { id: 'doodle', label: 'Doodle Editorial (Google)', desc: 'Cabecera ilustrada con vectores + partículas limpias' },
  { id: 'minimal', label: 'Minimalista', desc: 'Solo cabecera ilustrada y detalles en botones' },
  { id: 'classic', label: 'Clásico', desc: 'Cintillo simple y emojis animados' },
];

export const SeasonalThemesTab: React.FC = () => {
  const { customization, updateCustomization, saveAllSettings, dispatchToast } = useSettings();

  const seasonal: SeasonalThemeConfig = customization.seasonalTheme || {
    enabled: false,
    theme: 'christmas',
    intensity: 'medium',
    scope: 'storefront',
    showBanner: true,
    bannerText: '',
    styleMode: 'doodle',
    buttonAccent: true,
  };

  const updateSeasonal = (partial: Partial<SeasonalThemeConfig>) => {
    updateCustomization({
      seasonalTheme: {
        ...seasonal,
        ...partial,
      },
    });
  };

  const handleToggleEnabled = () => {
    const nextEnabled = !seasonal.enabled;
    updateSeasonal({ enabled: nextEnabled });
    const meta = SEASONAL_THEMES_META[seasonal.theme];
    dispatchToast(
      nextEnabled ? `Temática ${meta.name} activada` : 'Temática de temporada desactivada',
      nextEnabled
        ? 'Las partículas y ambientación ya están listas según el alcance seleccionado.'
        : 'La tienda volvió a su aspecto estándar.',
      nextEnabled ? 'success' : 'info'
    );
  };

  const activeMeta = SEASONAL_THEMES_META[seasonal.theme];
  const scheduleInfo = getSeasonalCampaignStatus(seasonal);
  const statusPill = !seasonal.enabled
    ? {
        label: 'DESACTIVADO',
        cls: 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300/60 dark:border-zinc-700',
      }
    : scheduleInfo.status === 'scheduled'
    ? {
        label: `PROGRAMADA · ${activeMeta.badge}`,
        cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      }
    : scheduleInfo.status === 'ended'
    ? {
        label: `FINALIZADA · ${activeMeta.badge}`,
        cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      }
    : {
        label: `ACTIVO · ${activeMeta.badge}`,
        cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };

  return (
    <PermissionGate permission="settings:manage">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2.5">
              <Sparkles className="h-5 w-5" style={{ color: customization.primaryColor }} />
              <span>Temáticas &amp; Campañas de Temporada</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Activa efectos estacionales (nieve, corazones, brillitos) con un switch para tu tienda virtual y kioskos.
            </p>
          </div>

          <button
            type="button"
            onClick={saveAllSettings}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-sm hover:opacity-90 active:scale-[0.98] whitespace-nowrap shrink-0"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <Save className="h-4 w-4" />
            <span>Guardar Temática</span>
          </button>
        </div>

        {/* Master Switch Card */}
        <div className="saas-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-zinc-950 dark:text-white">
                Activar Ambientación de Temporada
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusPill.cls}`}>
                {statusPill.label}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Enciende o apaga al instante los efectos visuales de campaña sin modificar productos ni precios.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={seasonal.enabled}
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 ${
              seasonal.enabled ? '' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
            style={seasonal.enabled ? { backgroundColor: customization.primaryColor } : undefined}
          >
            <span className="sr-only">Activar temática de temporada</span>
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                seasonal.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Theme Selector Grid */}
        <div className="saas-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
              1. Elige la Temática Festiva
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Cada campaña ajusta el tipo de partículas animadas y la cinta superior promocional.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(SEASONAL_THEMES_META) as SeasonalThemeId[]).map(themeId => {
              const meta = SEASONAL_THEMES_META[themeId];
              const isSelected = seasonal.theme === themeId;

              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => updateSeasonal({ theme: themeId })}
                  className={`relative p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900/90 shadow-sm ring-1 ring-zinc-900/10 dark:ring-white/15'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {meta.badge}
                    </span>
                    {isSelected && (
                      <span
                        className="h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: customization.primaryColor }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-950 dark:text-white">{meta.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      {meta.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope + Intensity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Scope */}
          <div className="saas-card p-5 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                2. ¿Dónde se mostrará la temática?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Por defecto se limita a la Tienda Virtual para no distraer en POS o Cocina.
              </p>
            </div>

            <div className="space-y-2">
              {SCOPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = seasonal.scope === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSeasonal({ scope: opt.id })}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900/90'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-950 dark:text-white">{opt.label}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {opt.desc}
                        </p>
                      </div>
                    </div>
                    {active && (
                      <Check
                        className="h-4 w-4 shrink-0"
                        style={{ color: customization.primaryColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity + Banner */}
          <div className="saas-card p-5 space-y-5">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: customization.primaryColor }} />
                <span>3. Estilo Visual (Google Doodle / Minimalista)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {STYLE_MODE_OPTIONS.map(opt => {
                  const active = (seasonal.styleMode || 'doodle') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSeasonal({ styleMode: opt.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900/90'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                      }`}
                    >
                      <p className="text-xs font-bold text-zinc-950 dark:text-white">{opt.label}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white flex items-center gap-2">
                <Gauge className="h-4 w-4" style={{ color: customization.primaryColor }} />
                <span>4. Intensidad de Partículas</span>
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {INTENSITY_OPTIONS.map(opt => {
                  const active = seasonal.intensity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSeasonal({ intensity: opt.id })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        active
                          ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900/90'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                      }`}
                    >
                      <p className="text-xs font-bold text-zinc-950 dark:text-white">{opt.label}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="seasonal-button-accent-toggle"
                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Detalles Doodle en botones principales de la Tienda</span>
                </label>
                <input
                  id="seasonal-button-accent-toggle"
                  type="checkbox"
                  checked={seasonal.buttonAccent ?? true}
                  onChange={e => updateSeasonal({ buttonAccent: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="seasonal-banner-toggle"
                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquareText className="h-4 w-4 text-zinc-500" />
                  <span>Mostrar cintillo superior en la Tienda Virtual</span>
                </label>
                <input
                  id="seasonal-banner-toggle"
                  type="checkbox"
                  checked={seasonal.showBanner}
                  onChange={e => updateSeasonal({ showBanner: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
                />
              </div>

              {seasonal.showBanner && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Texto del cintillo (opcional, si queda vacío usa el mensaje predeterminado)
                    </label>
                    <input
                      type="text"
                      value={seasonal.bannerText || ''}
                      onChange={e => updateSeasonal({ bannerText: e.target.value })}
                      placeholder={activeMeta.defaultBannerText}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Programación por Fechas + 6. Colores, Badge y Cronómetro */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Programación por Fechas */}
          <div className="saas-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  <span>5. Programación por Fechas</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Activa y desactiva la campaña automáticamente en el rango de fechas que elijas.
                </p>
              </div>
              <input
                id="seasonal-schedule-toggle"
                type="checkbox"
                checked={Boolean(seasonal.scheduleEnabled)}
                onChange={e => updateSeasonal({ scheduleEnabled: e.target.checked })}
                className="h-4 w-4 mt-0.5 rounded border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer shrink-0"
              />
            </div>

            {seasonal.scheduleEnabled ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Fecha y hora de inicio
                  </label>
                  <input
                    type="datetime-local"
                    value={seasonal.startDate || ''}
                    onChange={e => updateSeasonal({ startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Fecha y hora de fin
                  </label>
                  <input
                    type="datetime-local"
                    value={seasonal.endDate || ''}
                    onChange={e => updateSeasonal({ endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-3 py-2.5">
                Sin programación: la campaña se muestra mientras el switch principal esté encendido.
              </p>
            )}

            {/* Cronómetro / Cuenta Regresiva */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="seasonal-countdown-toggle"
                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 cursor-pointer"
                >
                  <Timer className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  <span>Mostrar cronómetro / cuenta regresiva en el cintillo</span>
                </label>
                <input
                  id="seasonal-countdown-toggle"
                  type="checkbox"
                  checked={Boolean(seasonal.showCountdown)}
                  onChange={e => updateSeasonal({ showCountdown: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
                />
              </div>

              {seasonal.showCountdown && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Etiqueta del cronómetro
                    </label>
                    <input
                      type="text"
                      value={seasonal.countdownLabel ?? 'Termina en'}
                      onChange={e => updateSeasonal({ countdownLabel: e.target.value })}
                      placeholder="Ej: Termina en"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Fecha límite (si vacío usa fecha de fin)
                    </label>
                    <input
                      type="datetime-local"
                      value={seasonal.countdownEndAt || ''}
                      onChange={e => updateSeasonal({ countdownEndAt: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Colores del Cintillo y Badge */}
          <div className="saas-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white flex items-center gap-2">
                  <Palette className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  <span>6. Colores del Cintillo y Badge</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Personaliza el color de fondo, texto y etiqueta (badge) promocional.
                </p>
              </div>
              {(seasonal.bannerBgColor ||
                seasonal.bannerTextColor ||
                seasonal.badgeBgColor ||
                seasonal.badgeTextColor ||
                seasonal.badgeText) && (
                <button
                  type="button"
                  onClick={() =>
                    updateSeasonal({
                      bannerBgColor: '',
                      bannerTextColor: '',
                      badgeBgColor: '',
                      badgeTextColor: '',
                      badgeText: '',
                    })
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white whitespace-nowrap"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Usar del tema</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Fondo cintillo
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="color"
                    value={seasonal.bannerBgColor || '#b91c1c'}
                    onChange={e => updateSeasonal({ bannerBgColor: e.target.value })}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
                  />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    {seasonal.bannerBgColor || 'Tema'}
                  </span>
                </label>
              </div>
              <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Texto cintillo
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="color"
                    value={seasonal.bannerTextColor || '#ffffff'}
                    onChange={e => updateSeasonal({ bannerTextColor: e.target.value })}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
                  />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    {seasonal.bannerTextColor || '#FFFFFF'}
                  </span>
                </label>
              </div>
            </div>

            {/* Badge Controls */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="seasonal-badge-toggle"
                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  Mostrar Badge / Etiqueta en el cintillo
                </label>
                <input
                  id="seasonal-badge-toggle"
                  type="checkbox"
                  checked={seasonal.showBadge ?? true}
                  onChange={e => updateSeasonal({ showBadge: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
                />
              </div>

              {(seasonal.showBadge ?? true) && (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={seasonal.badgeText || ''}
                    onChange={e => updateSeasonal({ badgeText: e.target.value })}
                    placeholder={`Texto del badge (por defecto: ${activeMeta.badge})`}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        Fondo badge
                      </span>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="color"
                          value={seasonal.badgeBgColor || '#ffffff'}
                          onChange={e => updateSeasonal({ badgeBgColor: e.target.value })}
                          className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
                        />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          {seasonal.badgeBgColor || 'Auto'}
                        </span>
                      </label>
                    </div>
                    <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        Texto badge
                      </span>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="color"
                          value={seasonal.badgeTextColor || '#09090b'}
                          onChange={e => updateSeasonal({ badgeTextColor: e.target.value })}
                          className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
                        />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          {seasonal.badgeTextColor || 'Auto'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="saas-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white flex items-center gap-2">
              <Eye className="h-4 w-4" style={{ color: customization.primaryColor }} />
              <span>Vista Previa en Vivo ({activeMeta.name})</span>
            </h3>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {seasonal.enabled
                ? 'Efecto activo en tiempo real'
                : 'Previsualización (enciende el switch superior para publicar)'}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 min-h-[190px] flex flex-col justify-between">
            <SeasonalOverlay
              surface="storefront"
              contained
              previewConfig={{ ...seasonal, enabled: true }}
            />
            <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center my-auto gap-1.5">
              <span className="text-xs uppercase tracking-widest font-bold text-zinc-400">
                {customization.appName} · Tienda Virtual
              </span>
              <p className="text-lg font-extrabold text-white">
                Pizzas Artesanales al Horno de Piedra
              </p>
              <p className="text-xs text-zinc-300 max-w-md">
                Así lucirán las partículas de <strong className="text-white">{activeMeta.name}</strong> sobre tu catálogo sin bloquear clics ni scroll.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
};
