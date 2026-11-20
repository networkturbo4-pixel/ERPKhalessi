import React, { useState } from 'react';
import {
  PanelTop,
  PanelBottom,
  RotateCcw,
  Eye,
  EyeOff,
  Palette,
  Type,
} from 'lucide-react';
import {
  StoreFooterConfig,
  StoreFooterVariant,
  StoreHeaderConfig,
  StoreHeaderVariant,
  StoreTemplate,
} from '../../types/storeBuilder';

interface HeaderFooterCustomizerPanelProps {
  template: StoreTemplate;
  surface: 'builder' | 'settings';
  onUpdateMeta: (
    partial: Partial<
      Pick<
        StoreTemplate,
        | 'headerVariant'
        | 'footerVariant'
        | 'footerTheme'
        | 'headerConfig'
        | 'footerConfig'
        | 'showHeaderCartButton'
      >
    >
  ) => void;
}

const HEADER_VARIANT_OPTIONS: Array<{ value: StoreHeaderVariant; label: string }> = [
  { value: 'default', label: 'Estándar (Adaptable al Tema)' },
  { value: 'hut_crimson', label: 'Hut Carmesí (Rojo + Sub-barra Blanca)' },
  { value: 'papa_fresh', label: 'Papa Fresh (Blanca + Verde Bosque)' },
  { value: 'flame_grill', label: 'Flame Grill (Naranja Fuego + Crema)' },
  { value: 'electric_blue', label: 'Electric Blue (Azul Eléctrico + Amarillo)' },
];

const FOOTER_VARIANT_OPTIONS: Array<{ value: StoreFooterVariant; label: string }> = [
  { value: 'default', label: 'Estándar (Bento Corporativo)' },
  { value: 'hut_crimson', label: 'Hut Carmesí (Cinta Roja + Carbón Oscuro)' },
  { value: 'papa_fresh', label: 'Papa Fresh (Editorial Blanco + Verde)' },
  { value: 'flame_grill', label: 'Flame Grill (Cinta Naranja + Parrilla)' },
  { value: 'electric_blue', label: 'Electric Blue (Editorial Blanco + Azul)' },
];

export const HeaderFooterCustomizerPanel: React.FC<HeaderFooterCustomizerPanelProps> = ({
  template,
  surface,
  onUpdateMeta,
}) => {
  const [activeSection, setActiveSection] = useState<'header' | 'footer'>('header');
  const isBuilder = surface === 'builder';

  const headerCfg: StoreHeaderConfig = template.headerConfig || {};
  const footerCfg: StoreFooterConfig = template.footerConfig || {};

  const patchHeader = (patch: Partial<StoreHeaderConfig>) => {
    onUpdateMeta({
      headerConfig: {
        ...headerCfg,
        ...patch,
      },
    });
  };

  const patchFooter = (patch: Partial<StoreFooterConfig>) => {
    onUpdateMeta({
      footerConfig: {
        ...footerCfg,
        ...patch,
      },
    });
  };

  const cardClass = isBuilder
    ? 'p-3.5 rounded-2xl border border-[#262a3b] bg-[#151823] space-y-3.5'
    : 'p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 space-y-4';

  const inputClass = isBuilder
    ? 'w-full px-2.5 py-1.5 rounded-lg bg-[#0f111a] border border-[#262938] text-xs font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500'
    : 'w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500';

  const labelClass = isBuilder
    ? 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1'
    : 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1';

  const subHeadingClass = isBuilder
    ? 'text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5'
    : 'text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5';

  const toggleBtnClass = (enabled: boolean) =>
    `flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
      enabled
        ? isBuilder
          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
        : isBuilder
        ? 'bg-[#0f111a] border-[#262938] text-zinc-500'
        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'
    }`;

  const renderColorInput = (
    label: string,
    value: string | undefined,
    fallback: string,
    onChange: (hex: string) => void
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-7 rounded-md border border-zinc-300 dark:border-zinc-700 cursor-pointer bg-transparent shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          placeholder={fallback}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} font-mono text-[11px] uppercase`}
        />
      </div>
    </div>
  );

  return (
    <div className={cardClass}>
      {/* Section Switcher: Header vs Footer */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={subHeadingClass}>
          {activeSection === 'header' ? (
            <>
              <PanelTop className="w-3.5 h-3.5" />
              <span>Personalizar Cabecera del Theme</span>
            </>
          ) : (
            <>
              <PanelBottom className="w-3.5 h-3.5" />
              <span>Personalizar Footer del Theme</span>
            </>
          )}
        </span>

        <div className={`grid grid-cols-2 p-0.5 rounded-xl border ${isBuilder ? 'bg-[#0f111a] border-[#262938]' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}>
          <button
            type="button"
            onClick={() => setActiveSection('header')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition-colors ${
              activeSection === 'header'
                ? 'bg-amber-500 text-zinc-950'
                : isBuilder
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <PanelTop className="w-3 h-3" />
            <span>Cabecera</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('footer')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition-colors ${
              activeSection === 'footer'
                ? 'bg-amber-500 text-zinc-950'
                : isBuilder
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <PanelBottom className="w-3 h-3" />
            <span>Footer</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* HEADER CUSTOMIZER                                                     */}
      {/* ===================================================================== */}
      {activeSection === 'header' && (
        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>Diseño Base de Cabecera</label>
            <select
              value={template.headerVariant || 'default'}
              onChange={(e) =>
                onUpdateMeta({ headerVariant: e.target.value as StoreHeaderVariant })
              }
              className={inputClass}
            >
              {HEADER_VARIANT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Colors */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className={subHeadingClass}>
                <Palette className="w-3 h-3" />
                <span>Colores de Cabecera</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  patchHeader({
                    bgColor: undefined,
                    textColor: undefined,
                    subBarBgColor: undefined,
                    subBarTextColor: undefined,
                    accentColor: undefined,
                  })
                }
                className="text-[10px] font-bold text-zinc-400 hover:text-amber-500 flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Original</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {renderColorInput('Fondo Barra Principal', headerCfg.bgColor, '#C8102E', (v) =>
                patchHeader({ bgColor: v || undefined })
              )}
              {renderColorInput('Texto Barra Principal', headerCfg.textColor, '#ffffff', (v) =>
                patchHeader({ textColor: v || undefined })
              )}
              {renderColorInput('Fondo Sub-barra', headerCfg.subBarBgColor, '#ffffff', (v) =>
                patchHeader({ subBarBgColor: v || undefined })
              )}
              {renderColorInput('Texto Sub-barra', headerCfg.subBarTextColor, '#27272a', (v) =>
                patchHeader({ subBarTextColor: v || undefined })
              )}
              {renderColorInput('Acento / Íconos', headerCfg.accentColor, template.accentColor || '#f59e0b', (v) =>
                patchHeader({ accentColor: v || undefined })
              )}
            </div>
          </div>

          {/* Editable Labels */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <span className={subHeadingClass}>
              <Type className="w-3 h-3" />
              <span>Textos y Etiquetas</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Placeholder Buscador</label>
                <input
                  type="text"
                  value={headerCfg.searchPlaceholder || ''}
                  placeholder="Buscar pizzas, combos, entradas..."
                  onChange={(e) => patchHeader({ searchPlaceholder: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Etiqueta Menú / Carta</label>
                <input
                  type="text"
                  value={headerCfg.menuLabel || ''}
                  placeholder="Carta / Menú"
                  onChange={(e) => patchHeader({ menuLabel: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Etiqueta Promociones</label>
                <input
                  type="text"
                  value={headerCfg.promosLabel || ''}
                  placeholder="Promociones"
                  onChange={(e) => patchHeader({ promosLabel: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Etiqueta Reservas</label>
                <input
                  type="text"
                  value={headerCfg.reservationsLabel || ''}
                  placeholder="Reservas"
                  onChange={(e) => patchHeader({ reservationsLabel: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Etiqueta Mis Pedidos</label>
                <input
                  type="text"
                  value={headerCfg.ordersLabel || ''}
                  placeholder="Mis Pedidos"
                  onChange={(e) => patchHeader({ ordersLabel: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Etiqueta Cuenta</label>
                <input
                  type="text"
                  value={headerCfg.loginLabel || ''}
                  placeholder="Identifícate / Iniciar sesión"
                  onChange={(e) => patchHeader({ loginLabel: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Element Visibility Toggles */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <span className={subHeadingClass}>
              <Eye className="w-3 h-3" />
              <span>Elementos Visibles</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: 'showSearch', label: 'Buscador' },
                { key: 'showLocation', label: 'Ubicación / Local' },
                { key: 'showPhone', label: 'Teléfono' },
                { key: 'showAccount', label: 'Mi Cuenta' },
                { key: 'showSubBar', label: 'Sub-barra Nav' },
                { key: 'showPromosLink', label: 'Link Promos' },
                { key: 'showReservationsLink', label: 'Link Reservas' },
                { key: 'showOrdersLink', label: 'Link Pedidos' },
                { key: 'showBenefitsLink', label: 'Link Beneficios' },
              ].map((item) => {
                const enabled = headerCfg[item.key as keyof StoreHeaderConfig] !== false;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => patchHeader({ [item.key]: !enabled })}
                    className={toggleBtnClass(enabled)}
                  >
                    <span className="truncate">{item.label}</span>
                    {enabled ? (
                      <Eye className="w-3 h-3 shrink-0" />
                    ) : (
                      <EyeOff className="w-3 h-3 shrink-0" />
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  onUpdateMeta({
                    showHeaderCartButton: template.showHeaderCartButton === false,
                  })
                }
                className={toggleBtnClass(template.showHeaderCartButton !== false)}
              >
                <span className="truncate">Botón Carrito</span>
                {template.showHeaderCartButton !== false ? (
                  <Eye className="w-3 h-3 shrink-0" />
                ) : (
                  <EyeOff className="w-3 h-3 shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FOOTER CUSTOMIZER                                                     */}
      {/* ===================================================================== */}
      {activeSection === 'footer' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={labelClass}>Diseño Base de Footer</label>
              <select
                value={template.footerVariant || 'default'}
                onChange={(e) =>
                  onUpdateMeta({ footerVariant: e.target.value as StoreFooterVariant })
                }
                className={inputClass}
              >
                {FOOTER_VARIANT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Modo (Footer Estándar)</label>
              <select
                value={template.footerTheme}
                onChange={(e) =>
                  onUpdateMeta({ footerTheme: e.target.value as 'light' | 'dark' })
                }
                className={inputClass}
              >
                <option value="light">Claro Corporativo</option>
                <option value="dark">Oscuro Nocturno</option>
              </select>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className={subHeadingClass}>
                <Palette className="w-3 h-3" />
                <span>Colores del Footer</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  patchFooter({
                    ribbonBgColor: undefined,
                    ribbonTextColor: undefined,
                    bgColor: undefined,
                    textColor: undefined,
                    accentColor: undefined,
                  })
                }
                className="text-[10px] font-bold text-zinc-400 hover:text-amber-500 flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Original</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {renderColorInput('Fondo Cinta Social', footerCfg.ribbonBgColor, '#C8102E', (v) =>
                patchFooter({ ribbonBgColor: v || undefined })
              )}
              {renderColorInput('Texto Cinta Social', footerCfg.ribbonTextColor, '#ffffff', (v) =>
                patchFooter({ ribbonTextColor: v || undefined })
              )}
              {renderColorInput('Fondo Cuerpo Footer', footerCfg.bgColor, '#161618', (v) =>
                patchFooter({ bgColor: v || undefined })
              )}
              {renderColorInput('Texto Cuerpo Footer', footerCfg.textColor, '#e4e4e7', (v) =>
                patchFooter({ textColor: v || undefined })
              )}
              {renderColorInput('Color Acento Footer', footerCfg.accentColor, template.accentColor || '#f59e0b', (v) =>
                patchFooter({ accentColor: v || undefined })
              )}
            </div>
          </div>

          {/* Editable Texts */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <span className={subHeadingClass}>
              <Type className="w-3 h-3" />
              <span>Textos del Footer</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Texto Cinta Superior</label>
                <input
                  type="text"
                  value={footerCfg.ribbonText || ''}
                  placeholder="Síguenos en nuestras redes sociales"
                  onChange={(e) => patchFooter({ ribbonText: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Título Newsletter</label>
                <input
                  type="text"
                  value={footerCfg.newsletterTitle || ''}
                  placeholder="Recibe nuestras ofertas y novedades"
                  onChange={(e) => patchFooter({ newsletterTitle: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Descripción de Marca / Pie</label>
                <input
                  type="text"
                  value={footerCfg.brandDescription || ''}
                  placeholder="Calidad artesanal en cada pedido. Delivery rápido..."
                  onChange={(e) => patchFooter({ brandDescription: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Botón Newsletter</label>
                <input
                  type="text"
                  value={footerCfg.newsletterButtonLabel || ''}
                  placeholder="Suscribirme"
                  onChange={(e) => patchFooter({ newsletterButtonLabel: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Texto Copyright</label>
                <input
                  type="text"
                  value={footerCfg.copyrightText || ''}
                  placeholder={`© ${new Date().getFullYear()} Tu Marca`}
                  onChange={(e) => patchFooter({ copyrightText: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <span className={subHeadingClass}>
              <Eye className="w-3 h-3" />
              <span>Secciones Visibles</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: 'showRibbon', label: 'Cinta Superior' },
                { key: 'showReservationsCta', label: 'Botón Reservas' },
                { key: 'showNewsletter', label: 'Newsletter' },
                { key: 'showComplaintsBook', label: 'Libro Reclamaciones' },
                { key: 'showPaymentBadges', label: 'Métodos de Pago' },
                { key: 'showShareReservations', label: 'Compartir /reservas' },
              ].map((item) => {
                const enabled = footerCfg[item.key as keyof StoreFooterConfig] !== false;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => patchFooter({ [item.key]: !enabled })}
                    className={toggleBtnClass(enabled)}
                  >
                    <span className="truncate">{item.label}</span>
                    {enabled ? (
                      <Eye className="w-3 h-3 shrink-0" />
                    ) : (
                      <EyeOff className="w-3 h-3 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
