import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutTemplate,
  CheckCircle2,
  Paintbrush,
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Layers,
  Sun,
  Moon,
  Contrast,
  ShieldCheck,
} from 'lucide-react';
import { useStoreBuilder } from '../../context/StoreBuilderContext';
import { useSettings } from '../../context/SettingsContext';
import { StoreTemplate, getOptimalContrastHex } from '../../types/storeBuilder';
import { getContrastRatio, getWcagBadge } from '../../utils/themeTokens';
import { HeaderFooterCustomizerPanel } from '../store/HeaderFooterCustomizerPanel';

const TemplateWireframePreview: React.FC<{ tpl: StoreTemplate }> = ({ tpl }) => {
  const isDark = tpl.themeMode === 'dark';
  const isFooterDark = tpl.footerTheme === 'dark';
  const accent = tpl.accentColor || '#f59e0b';
  const btn = tpl.buttonColor || accent;
  const isWarmBg = tpl.id === 'tpl-flame-cream';
  const customPageBg = tpl.pageBgColor?.trim();
  const customFooterBg = tpl.footerConfig?.bgColor?.trim();

  return (
    <div
      style={customPageBg ? { backgroundColor: customPageBg } : undefined}
      className={`w-full h-40 rounded-xl border overflow-hidden flex flex-col justify-between select-none ${
        customPageBg
          ? isDark
            ? 'border-zinc-800'
            : 'border-zinc-200'
          : isDark
          ? 'bg-zinc-950 border-zinc-800'
          : isWarmBg
          ? 'bg-[#F5EBDC] border-amber-200/80'
          : 'bg-white border-zinc-200'
      }`}
    >
      {/* Mini Header */}
      <div
        className="h-6 px-2.5 flex items-center justify-between gap-2 shrink-0"
        style={{
          backgroundColor:
            tpl.id === 'tpl-hut-express' ||
            tpl.id === 'tpl-flame-cream' ||
            tpl.id === 'tpl-bembos-electric'
              ? accent
              : isDark
              ? '#111114'
              : '#ffffff',
          borderBottom: isDark ? '1px solid #27272a' : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor:
                tpl.id === 'tpl-hut-express' ||
                tpl.id === 'tpl-flame-cream' ||
                tpl.id === 'tpl-bembos-electric'
                  ? '#ffffff'
                  : accent,
            }}
          />
          <span
            className="h-1.5 w-10 rounded-full opacity-80"
            style={{
              backgroundColor:
                tpl.id === 'tpl-hut-express' ||
                tpl.id === 'tpl-flame-cream' ||
                tpl.id === 'tpl-bembos-electric'
                  ? '#ffffff'
                  : isDark
                  ? '#e4e4e7'
                  : '#27272a',
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-12 rounded-full bg-white/85 border border-black/10" />
          <span className="h-3 w-5 rounded-full" style={{ backgroundColor: btn }} />
        </div>
      </div>

      {/* Mini Body */}
      <div className="p-2 space-y-1.5 flex-1 overflow-hidden">
        {/* Hero Banner */}
        <div
          className="h-12 rounded-lg p-2 flex flex-col justify-end relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, #18181b 100%)`,
          }}
        >
          <div className="w-16 h-1.5 rounded-full bg-white/90 mb-1" />
          <div className="w-10 h-2.5 rounded-md" style={{ backgroundColor: btn }} />
        </div>

        {/* Mini Categories */}
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-2.5 flex-1 rounded-full ${
                isDark ? 'bg-zinc-800' : 'bg-zinc-200/80'
              }`}
              style={idx === 0 ? { backgroundColor: accent, opacity: 0.85 } : undefined}
            />
          ))}
        </div>

        {/* Mini Product Cards */}
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-10 rounded-md p-1 flex flex-col justify-between border ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200/80'
              }`}
            >
              <div
                className={`h-4 rounded-sm ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
              />
              <div className="flex items-center justify-between">
                <span className={`h-1 w-4 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: btn }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini Footer */}
      <div
        style={customFooterBg ? { backgroundColor: customFooterBg } : undefined}
        className={`h-3.5 px-2 flex items-center justify-between shrink-0 ${
          customFooterBg
            ? 'border-t border-black/10 dark:border-white/10'
            : isFooterDark
            ? 'bg-zinc-900'
            : 'bg-zinc-100 border-t border-zinc-200'
        }`}
      >
        <span className="h-1 w-8 rounded-full bg-zinc-500/50" />
        <span className="h-1 w-6 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
};

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onCommit: (hex: string) => void;
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({ label, value, onCommit }) => {
  const [localColor, setLocalColor] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalColor(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const scheduleCommit = (next: string) => {
    setLocalColor(next);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      onCommit(next);
      timerRef.current = null;
    }, 90);
  };

  const flushCommit = (next: string) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(next)) {
      onCommit(next);
    }
  };

  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(localColor) ? localColor : '#f59e0b'}
          onChange={e => scheduleCommit(e.target.value)}
          onBlur={e => flushCommit(e.target.value)}
          className="w-9 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer bg-transparent shrink-0"
        />
        <input
          type="text"
          value={localColor}
          maxLength={7}
          onChange={e => {
            const v = e.target.value;
            setLocalColor(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              onCommit(v);
            }
          }}
          onBlur={() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(localColor)) {
              setLocalColor(value);
            }
          }}
          className="w-20 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 uppercase focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  );
};

export const StoreDesignTab: React.FC = () => {
  const {
    templates,
    activeTemplate,
    selectTemplate,
    updateActiveTemplateMeta,
    resetActiveTemplateToFactory,
    setIsBuilderOpen,
    setActiveEditingPageId,
    setActiveEditingHeaderId,
    setActiveEditingFooterId,
  } = useStoreBuilder();
  const { dispatchToast, openNoticeModal } = useSettings();

  const handleOpenInBuilder = (tplId: string) => {
    selectTemplate(tplId);
    setActiveEditingPageId(null);
    setActiveEditingHeaderId(null);
    setActiveEditingFooterId(null);
    setIsBuilderOpen(true);
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleOpenHeaderInBuilder = (headerId: string) => {
    setActiveEditingPageId(null);
    setActiveEditingFooterId(null);
    setActiveEditingHeaderId(headerId);
    setIsBuilderOpen(true);
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleOpenFooterInBuilder = (footerId: string) => {
    setActiveEditingPageId(null);
    setActiveEditingHeaderId(null);
    setActiveEditingFooterId(footerId);
    setIsBuilderOpen(true);
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleResetActive = () => {
    openNoticeModal({
      title: '¿Restaurar plantilla original?',
      message: `Se restablecerán los bloques y colores de fábrica para "${activeTemplate.name}".`,
      tone: 'warning',
      confirmLabel: 'Restaurar',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        resetActiveTemplateToFactory();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-amber-500" />
            <span>Diseño de Tienda y Plantillas</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Elige una plantilla responsive para tu tienda online y personaliza cada bloque con el constructor visual.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenInBuilder(activeTemplate.id)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0 transition-colors"
          >
            <Paintbrush className="w-4 h-4" />
            <span>Editar Plantilla Activa en Constructor</span>
          </button>
        </div>
      </div>

      {/* Active Template Quick Appearance Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-offset-2 ring-amber-500/40 dark:ring-offset-zinc-900"
              style={{ backgroundColor: activeTemplate.accentColor }}
            />
            <div>
              <p className="text-xs font-black text-zinc-950 dark:text-white">
                Plantilla activa: {activeTemplate.name}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {activeTemplate.blocks.length} bloques editables · 100% responsive en Móvil, Tablet y PC
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetActive}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar de Fábrica</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Fondo de Tienda
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['light', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateActiveTemplateMeta({ themeMode: m })}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 ${
                    activeTemplate.themeMode === m
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  {m === 'light' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                  <span>{m === 'light' ? 'Claro' : 'Oscuro'}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Estilo del Footer
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['light', 'dark'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => updateActiveTemplateMeta({ footerTheme: f })}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold ${
                    activeTemplate.footerTheme === f
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  {f === 'light' ? 'Claro' : 'Oscuro'}
                </button>
              ))}
            </div>
          </div>

          <ColorPickerField
            label="Color de Acento"
            value={activeTemplate.accentColor}
            onCommit={(hex) => updateActiveTemplateMeta({ accentColor: hex })}
          />

          <ColorPickerField
            label="Color de Botones"
            value={activeTemplate.buttonColor || activeTemplate.accentColor}
            onCommit={(hex) => updateActiveTemplateMeta({ buttonColor: hex })}
          />
        </div>

        {/* Page Background, Footer Background & Contrast Controls */}
        {(() => {
          const resolvedPageBg =
            activeTemplate.pageBgColor?.trim() ||
            (activeTemplate.themeMode === 'light' ? '#fafafa' : '#0a0a0a');
          const resolvedFooterBg =
            activeTemplate.footerConfig?.bgColor?.trim() ||
            (activeTemplate.footerTheme === 'light' ? '#f4f5f7' : '#090a0f');
          const resolvedFooterText =
            activeTemplate.footerConfig?.textColor?.trim() ||
            (activeTemplate.footerTheme === 'light' ? '#52525b' : '#a1a1aa');
          const btnHex = activeTemplate.buttonColor || activeTemplate.accentColor || '#f59e0b';
          const btnTextHex =
            activeTemplate.buttonTextColor || getOptimalContrastHex(btnHex);
          const btnRatio = getContrastRatio(btnHex, btnTextHex);
          const btnWcag = getWcagBadge(btnRatio);
          const footerRatio = getContrastRatio(resolvedFooterBg, resolvedFooterText);
          const footerWcag = getWcagBadge(footerRatio);

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              {/* Fondo de Página */}
              <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Color Fondo de Página
                  </span>
                  {activeTemplate.pageBgColor && (
                    <button
                      type="button"
                      onClick={() => updateActiveTemplateMeta({ pageBgColor: undefined })}
                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Auto
                    </button>
                  )}
                </div>
                <ColorPickerField
                  label="Fondo del Lienzo"
                  value={resolvedPageBg}
                  onCommit={(hex) => updateActiveTemplateMeta({ pageBgColor: hex })}
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Blanco', hex: '#ffffff' },
                    { name: 'Crema', hex: '#f5ebdc' },
                    { name: 'Carbón', hex: '#09090b' },
                    { name: 'Medianoche', hex: '#080e1a' },
                    { name: 'Espresso', hex: '#140e0b' },
                  ].map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => updateActiveTemplateMeta({ pageBgColor: p.hex })}
                      title={p.name}
                      className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                        resolvedPageBg.toLowerCase() === p.hex
                          ? 'ring-2 ring-amber-500 border-white'
                          : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                      style={{ backgroundColor: p.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Color Fondo del Footer */}
              <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Color Fondo del Footer
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${footerWcag.toneClass}`}
                      title={`Contraste texto/fondo del footer: ${footerRatio.toFixed(2)}:1`}
                    >
                      {footerWcag.label} ({footerRatio.toFixed(1)}:1)
                    </span>
                    {(activeTemplate.footerConfig?.bgColor || activeTemplate.footerConfig?.textColor) && (
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveTemplateMeta({
                            footerConfig: {
                              ...(activeTemplate.footerConfig || {}),
                              bgColor: undefined,
                              textColor: undefined,
                            },
                          })
                        }
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ColorPickerField
                    label="Fondo Footer"
                    value={resolvedFooterBg}
                    onCommit={(hex) =>
                      updateActiveTemplateMeta({
                        footerConfig: {
                          ...(activeTemplate.footerConfig || {}),
                          bgColor: hex,
                          textColor:
                            activeTemplate.footerConfig?.textColor ||
                            getOptimalContrastHex(hex),
                        },
                      })
                    }
                  />
                  <ColorPickerField
                    label="Texto Footer"
                    value={resolvedFooterText}
                    onCommit={(hex) =>
                      updateActiveTemplateMeta({
                        footerConfig: {
                          ...(activeTemplate.footerConfig || {}),
                          textColor: hex,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* Contraste de Tienda y Botones */}
              <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-amber-500" />
                    Contraste &amp; Legibilidad
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${btnWcag.toneClass}`}
                    title={`Contraste botón: ${btnRatio.toFixed(2)}:1`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Botón {btnWcag.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'standard', label: 'Estándar' },
                      { id: 'high', label: 'Alto' },
                      { id: 'ultra', label: 'Ultra AAA' },
                    ] as const
                  ).map((lvl) => {
                    const active = (activeTemplate.contrastLevel || 'standard') === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => updateActiveTemplateMeta({ contrastLevel: lvl.id })}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold whitespace-nowrap ${
                          active
                            ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Contraste automático en botones
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(activeTemplate.autoButtonContrast ?? true)}
                    onChange={(e) =>
                      updateActiveTemplateMeta({
                        autoButtonContrast: e.target.checked,
                        buttonTextColor: e.target.checked
                          ? getOptimalContrastHex(btnHex)
                          : activeTemplate.buttonTextColor,
                      })
                    }
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                </label>
              </div>
            </div>
          );
        })()}

        {/* Full Header & Footer Customizer */}
        <HeaderFooterCustomizerPanel
          template={activeTemplate}
          surface="settings"
          onUpdateMeta={updateActiveTemplateMeta}
          onOpenHeaderBuilder={handleOpenHeaderInBuilder}
          onOpenFooterBuilder={handleOpenFooterInBuilder}
        />
      </div>

      {/* Templates Gallery Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Catálogo de Plantillas Editables ({templates.length})
          </h3>
          <span className="text-[11px] text-zinc-400 hidden sm:flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            <Tablet className="w-3.5 h-3.5" />
            <Monitor className="w-3.5 h-3.5" />
            <span>Diseño Responsive</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const isCurrent = tpl.id === activeTemplate.id;
            return (
              <div
                key={tpl.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3.5 transition-all bg-white dark:bg-zinc-900 ${
                  isCurrent
                    ? 'border-amber-500 ring-2 ring-amber-500/25 shadow-md'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="space-y-3">
                  <TemplateWireframePreview tpl={tpl} />

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tpl.accentColor }}
                        />
                        <span className="truncate">{tpl.name}</span>
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isCurrent
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {isCurrent ? 'Activa ✓' : tpl.previewBadge}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {tpl.tagline}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80">
                      <Layers className="w-3 h-3 text-amber-500" />
                      {tpl.blocks.length} bloques
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80">
                      {tpl.themeMode === 'light' ? 'Tema Claro' : 'Tema Oscuro'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80">
                      Responsive
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      selectTemplate(tpl.id);
                      dispatchToast(
                        'Plantilla Activada',
                        `Tu tienda ahora usa "${tpl.name}".`,
                        'success'
                      );
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isCurrent ? 'Activa' : 'Elegir'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenInBuilder(tpl.id)}
                    className="py-2 px-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-opacity"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
