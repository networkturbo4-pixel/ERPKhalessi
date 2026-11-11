import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { soundSynth } from '../../utils/audio';
import {
  Bell,
  Volume2,
  Sparkles,
  Check,
  Layers,
  Layout,
  ShieldCheck,
  Ban,
  Flame,
  Hand,
  MessageSquare,
} from 'lucide-react';
import { ToastPosition, ToastVariant, ToastAudioTheme, ModalStyle } from '../../types/settings';

export const DialogsTab: React.FC = () => {
  const {
    customization,
    updateCustomization,
    dispatchToast,
    clearAllToasts,
    openNoticeModal,
    saveAllSettings,
    isSaving,
    activeTenant,
  } = useSettings();

  const branchShort = activeTenant.name.replace('Khalessi Pizza - ', '');

  const handleTestIsland = () => {
    dispatchToast(
      `Probando ubicación en ${branchShort}`,
      'Isla dinámica con ecualizador acústico activo.',
      'success'
    );
  };

  const handleTestNormal = () => {
    dispatchToast(
      'Comanda #KP-419 confirmada',
      `Enviada a estación de horneado en ${branchShort}.`,
      'info'
    );
  };

  const handleTestSwipe = () => {
    dispatchToast(
      'Arrastra esta alerta hacia los lados',
      'Desliza horizontalmente (> 75px) para descartarla al instante.',
      'warning'
    );
  };

  const handleTestStack3D = () => {
    const items = [
      {
        title: `Horno #1 listo en ${branchShort}`,
        msg: '2× Familiar Pepperoni Hot Honey listas para corte.',
        type: 'success' as const,
      },
      {
        title: 'Motorizado asignado (#DEL-204)',
        msg: 'Tiempo estimado de entrega: 14 minutos.',
        type: 'info' as const,
      },
      {
        title: `Probando pila 3D en ${branchShort}`,
        msg: 'Haz clic en el contador +N para expandir o contraer.',
        type: 'success' as const,
      },
    ];
    items.forEach((it, idx) => {
      setTimeout(() => {
        dispatchToast(it.title, it.msg, it.type);
      }, idx * 140);
    });
  };

  const handleTestCriticalPinned = () => {
    dispatchToast(
      `Alerta Crítica de Stock — ${branchShort}`,
      'Quedan menos de 2 kg de Mozzarella Fior di Latte en cámara.',
      'critical',
      { pinned: true }
    );
  };

  const previewModalStyle = (style: ModalStyle) => {
    updateCustomization({ modalStyle: style });
    openNoticeModal({
      title: 'Confirmación Operativa del Sistema',
      message: `Estás previsualizando el diseño "${
        style === 'halo'
          ? 'Centrado con Halo'
          : style === 'frost'
          ? 'Cristal Esmerilado'
          : style === 'executive'
          ? 'Banner Ejecutivo'
          : 'Minimalista'
      }". Observa que todos los botones mantienen su texto en una sola línea sin partirse.`,
      tone: 'info',
      styleOverride: style,
      confirmLabel: 'Guardar y Continuar',
      cancelLabel: 'Seguir Editando',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Toasts 3D, Modales de Aviso y Feedback Sensorial
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Pila agrupada inteligente tipo Isla Dinámica, diseño de modales corporativos y síntesis de audio KDS.
          </p>
        </div>

        <PermissionGate permission="settings:manage" hideInsteadOfBanner>
          <button
            type="button"
            onClick={saveAllSettings}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <Check className="h-3.5 w-3.5" />
            {isSaving ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:manage">
        {/* 1. SMART 3D STACKING + LIVE TOAST SIMULATOR (Matches Image 1) */}
        <div className="space-y-4">
          {/* 3D Toast Stacking Toggle Card */}
          <div className="saas-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-zinc-100 dark:bg-[#22232a] border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5" style={{ color: customization.primaryColor }} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Pila Agrupada Inteligente 3D (Toast Stacking)
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                  Si ocurren varias alertas consecutivas, se apilan con profundidad visual y contador expandible (`+N`) para no saturar la pantalla con toda una fila de toasts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={customization.toastStacking !== false}
                onClick={() =>
                  updateCustomization({ toastStacking: !(customization.toastStacking !== false) })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  customization.toastStacking !== false
                    ? 'bg-emerald-500'
                    : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                    customization.toastStacking !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                {customization.toastStacking !== false ? 'Apilado 3D Activo' : 'Lista Simple'}
              </span>
            </div>
          </div>

          {/* Live Simulator Buttons Bar (Exact capabilities from Image 1) */}
          <div className="saas-card p-5 border-dashed space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: customization.primaryColor }} />
                Simulador y Pruebas en Vivo de Funciones Toast:
              </span>
              <button
                type="button"
                onClick={clearAllToasts}
                className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap"
              >
                Limpiar alertas activas
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleTestIsland}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <span>🏝️</span> Probar Isla Dinámica
              </button>

              <button
                type="button"
                onClick={handleTestNormal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold saas-btn-secondary whitespace-nowrap"
              >
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Alerta Normal
              </button>

              <button
                type="button"
                onClick={handleTestSwipe}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold saas-btn-secondary whitespace-nowrap"
              >
                <Hand className="h-3.5 w-3.5 text-amber-500" /> Probar Swipe
              </button>

              <button
                type="button"
                onClick={handleTestStack3D}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-violet-500/12 text-violet-700 dark:text-violet-300 border border-violet-500/30 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
              >
                <Layers className="h-3.5 w-3.5" /> Probar Pila 3D (x3)
              </button>

              <button
                type="button"
                onClick={handleTestCriticalPinned}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors whitespace-nowrap"
              >
                <Flame className="h-3.5 w-3.5" /> Probar Alerta Crítica (Fijada)
              </button>
            </div>
          </div>
        </div>

        {/* Variant + Position + Audio Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Toast Style & Screen Placement */}
          <div className="saas-card p-6 space-y-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: customization.primaryColor }} />
              1. Variante Visual y Posición de Cápsula
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'island', name: 'Isla Dinámica 3D (Recomendado)', desc: 'Cápsula oscura con halo luminoso y onda' },
                { id: 'card', name: 'Cristal Flotante (Card)', desc: 'Superficie elevada con desenfoque suave' },
                { id: 'bordered', name: 'Borde Acentuado', desc: 'Franja lateral indicadora de severidad' },
                { id: 'minimal', name: 'Minimalista Compacta', desc: 'Solo titular e icono de estado' },
              ].map(v => {
                const isSelected = customization.toastVariant === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => updateCustomization({ toastVariant: v.id as ToastVariant })}
                    className={`p-3.5 text-left rounded-xl text-xs ${
                      isSelected ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-white">{v.name}</span>
                      {isSelected && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: customization.primaryColor }}
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300/90 block mt-1">{v.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                  <Layout className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
                  Ubicación en Pantalla
                </label>
                <span className="text-[10px] text-zinc-500 font-medium hidden sm:inline">
                  En celular flota centrado sin tapar el navbar
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'top-center', label: 'Arriba Centro (Isla Dinámica)' },
                  { id: 'top-right', label: 'Arriba Derecha' },
                  { id: 'bottom-center', label: 'Abajo Centro (Sobre Navbar)' },
                  { id: 'bottom-right', label: 'Abajo Derecha (Sobre Navbar)' },
                ].map(pos => {
                  const isSelected = customization.toastPosition === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateCustomization({ toastPosition: pos.id as ToastPosition })}
                      className={`py-2.5 px-3 text-xs rounded-xl text-left font-medium flex items-center justify-between gap-2 ${
                        isSelected ? 'saas-option-active font-semibold' : 'saas-option'
                      }`}
                    >
                      <span className="truncate">{pos.label}</span>
                      {isSelected && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: customization.primaryColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Web Audio Synthesizer */}
          <div className="saas-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Volume2 className="h-4 w-4" style={{ color: customization.primaryColor }} />
                Tema Acústico de Alertas (Web Audio)
              </label>
              <button
                type="button"
                onClick={() => soundSynth.play(customization.toastAudioTheme)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-500/15 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/30 hover:bg-brand-500/25 transition-colors whitespace-nowrap"
              >
                <Volume2 className="h-3.5 w-3.5" /> Escuchar Tono
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'chime', name: 'Campanilla Suave (Chime)', desc: 'Acorde armónico ideal para cocina KDS' },
                { id: 'modern', name: 'Sintetizador Moderno', desc: 'Pulso limpio de alta claridad para caja' },
                { id: 'soft', name: 'Onda Cálida (Soft)', desc: 'Frecuencia sutil sin fatiga auditiva' },
                { id: 'silent', name: 'Modo Silencioso', desc: 'Desactiva audio y oculta ecualizador' },
              ].map(theme => {
                const isSelected = customization.toastAudioTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      updateCustomization({ toastAudioTheme: theme.id as ToastAudioTheme });
                      if (theme.id !== 'silent') {
                        soundSynth.play(theme.id as ToastAudioTheme);
                      }
                    }}
                    className={`flex flex-col justify-between p-3.5 rounded-xl text-left ${
                      isSelected ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white">{theme.name}</span>
                      {isSelected && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: customization.primaryColor }}
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300/90 mt-1 block">{theme.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Policy Card: Strict No Native Alerts */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-zinc-950 dark:text-white">
                    Regla Estricta: Cero Avisos Nativos o Genéricos
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <Ban className="h-2.5 w-2.5" /> alert() / confirm() bloqueados
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                  Todos los avisos del ERP usan obligatoriamente el motor `&lt;dialog&gt;` personalizado con botones en una sola línea (`whitespace-nowrap`) y nunca diálogos nativos del navegador.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. DISEÑO DE MODALES DE AVISO (Visual Cards like bottom of Image 1) */}
        <div className="saas-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" style={{ color: customization.primaryColor }} />
                2. Diseño de Modales de Aviso y Confirmación
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Selecciona la arquitectura visual para confirmaciones críticas, validaciones y avisos del sistema.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  openNoticeModal({
                    title: 'Validación de Seguridad POS',
                    message: 'El arqueo de caja de la Sede Miraflores cerró sin diferencias (S/ 5,680.00).',
                    tone: 'success',
                    confirmLabel: 'Descargar Comprobante',
                    cancelLabel: 'Cerrar Aviso',
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold saas-btn-secondary whitespace-nowrap"
              >
                Probar Aviso Éxito
              </button>
              <button
                type="button"
                onClick={() =>
                  openNoticeModal({
                    title: '¿Anular Comanda #MIR-809 en Horno?',
                    message: 'Esta pizza ya ingresó a cocción. Anularla registrará una merma operativa autorizada.',
                    tone: 'danger',
                    confirmLabel: 'Autorizar Anulación',
                    cancelLabel: 'Conservar Comanda',
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors whitespace-nowrap"
              >
                Probar Aviso Crítico
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                id: 'halo' as ModalStyle,
                title: 'Centrado con Halo',
                desc: 'Icono circular con halo y botones en una sola fila',
                preview: (
                  <div className="h-28 rounded-xl bg-zinc-100 dark:bg-[#121318] border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col items-center justify-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-brand-500/20 ring-4 ring-brand-500/10 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                    </div>
                    <div className="h-1.5 w-20 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <div className="flex gap-1.5 mt-1">
                      <span className="h-3.5 w-11 rounded bg-zinc-200 dark:bg-zinc-800" />
                      <span className="h-3.5 w-14 rounded" style={{ backgroundColor: customization.primaryColor }} />
                    </div>
                  </div>
                ),
              },
              {
                id: 'frost' as ModalStyle,
                title: 'Cristal Esmerilado',
                desc: 'Blur translúcido con franja superior sólida',
                preview: (
                  <div className="h-28 rounded-xl bg-zinc-900 dark:bg-[#0d0f17] border border-zinc-800 overflow-hidden flex flex-col justify-between">
                    <div className="h-1.5 w-full" style={{ backgroundColor: customization.primaryColor }} />
                    <div className="px-3 space-y-1.5">
                      <div className="h-2 w-24 rounded-full bg-zinc-500" />
                      <div className="h-1.5 w-16 rounded-full bg-zinc-700" />
                    </div>
                    <div className="px-3 pb-2.5 flex justify-end gap-1.5">
                      <span className="h-3.5 w-10 rounded bg-zinc-800" />
                      <span className="h-3.5 w-12 rounded" style={{ backgroundColor: customization.primaryColor }} />
                    </div>
                  </div>
                ),
              },
              {
                id: 'executive' as ModalStyle,
                title: 'Banner Ejecutivo',
                desc: 'Cabecera corporativa y pie de acción estructurado',
                preview: (
                  <div className="h-28 rounded-xl bg-white dark:bg-[#14151b] border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col justify-between">
                    <div className="h-5 bg-zinc-900 px-2.5 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                    </div>
                    <div className="px-3 space-y-1.5">
                      <div className="h-2 w-24 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    </div>
                    <div className="h-6 bg-zinc-100 dark:bg-[#0e0f13] px-2.5 flex items-center justify-end gap-1.5 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="h-3 w-12 rounded" style={{ backgroundColor: customization.primaryColor }} />
                    </div>
                  </div>
                ),
              },
              {
                id: 'minimalist' as ModalStyle,
                title: 'Minimalista Directo',
                desc: 'Geometría limpia tipo Linear sin ornamentos',
                preview: (
                  <div className="h-28 rounded-xl bg-zinc-50 dark:bg-[#121318] border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="h-2 w-20 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                      <div className="h-1.5 w-28 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <span className="h-3.5 w-10 rounded border border-zinc-300 dark:border-zinc-700" />
                      <span className="h-3.5 w-12 rounded" style={{ backgroundColor: customization.primaryColor }} />
                    </div>
                  </div>
                ),
              },
            ].map(card => {
              const isSelected = customization.modalStyle === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => previewModalStyle(card.id)}
                  className={`p-3.5 rounded-2xl text-left flex flex-col justify-between gap-3 ${
                    isSelected ? 'saas-option-active' : 'saas-option'
                  }`}
                >
                  {card.preview}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white">
                        {card.title}
                      </span>
                      {isSelected && (
                        <Check
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: customization.primaryColor }}
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block mt-0.5">
                      {card.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </PermissionGate>
    </div>
  );
};
