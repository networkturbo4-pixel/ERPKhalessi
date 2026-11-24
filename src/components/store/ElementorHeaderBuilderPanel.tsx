import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Layers,
  MapPin,
  Megaphone,
  Menu,
  Minus,
  Monitor,
  Navigation,
  Palette,
  PanelTop,
  Phone,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useStoreBuilder } from '../../context/StoreBuilderContext';
import { useSettings } from '../../context/SettingsContext';
import {
  HeaderNavActionType,
  HeaderNavItem,
  HeaderRowId,
  HeaderWidget,
  HeaderWidgetType,
  HeaderZoneId,
} from '../../types/storeBuilder';

const HEADER_WIDGET_CATALOG: Array<{
  type: HeaderWidgetType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  { type: 'header_logo', label: 'Logo / Marca', desc: 'Logo, nombre y badge', icon: <ImageIcon className="w-4 h-4 text-amber-400" /> },
  { type: 'header_nav_menu', label: 'Menú Navegación', desc: 'Carta, promos, páginas', icon: <Navigation className="w-4 h-4 text-sky-400" /> },
  { type: 'header_search', label: 'Buscador', desc: 'Barra o lupa rápida', icon: <Search className="w-4 h-4 text-purple-400" /> },
  { type: 'header_location', label: 'Ubicación / QR', desc: 'Sede, ETA o Mesa QR', icon: <MapPin className="w-4 h-4 text-emerald-400" /> },
  { type: 'header_cart', label: 'Botón Carrito', desc: 'Total y unidades', icon: <ShoppingBag className="w-4 h-4 text-rose-400" /> },
  { type: 'header_account', label: 'Cuenta Cliente', desc: 'Login y perfil', icon: <User className="w-4 h-4 text-indigo-400" /> },
  { type: 'header_announcement', label: 'Cinta Anuncios', desc: 'Mensajes rotativos', icon: <Megaphone className="w-4 h-4 text-orange-400" /> },
  { type: 'header_mobile_trigger', label: 'Menú Móvil', desc: 'Botón hamburguesa', icon: <Menu className="w-4 h-4 text-cyan-400" /> },
  { type: 'header_open_status', label: 'Horario Vivo', desc: 'Abierto / Cerrado', icon: <Clock className="w-4 h-4 text-lime-400" /> },
  { type: 'header_contact', label: 'Tel / WhatsApp', desc: 'Llamada o chat directo', icon: <Phone className="w-4 h-4 text-green-400" /> },
  { type: 'header_quick_actions', label: 'Accesos Rápidos', desc: 'Pedidos, Club, ERP', icon: <Sparkles className="w-4 h-4 text-fuchsia-400" /> },
  { type: 'header_divider', label: 'Divisor / Espacio', desc: 'Línea o separador flex', icon: <Minus className="w-4 h-4 text-zinc-400" /> },
];

const ROW_LABELS: Record<HeaderRowId, string> = {
  top: 'Top Bar',
  main: 'Principal',
  sub: 'Sub Barra',
};

const ZONE_LABELS: Record<HeaderZoneId, string> = {
  left: 'Izquierda',
  center: 'Centro',
  right: 'Derecha',
};

function getWidgetLabel(type: HeaderWidgetType): string {
  return HEADER_WIDGET_CATALOG.find(c => c.type === type)?.label || type;
}

export const ElementorHeaderBuilderPanel: React.FC = () => {
  const {
    activeTemplate,
    headerTemplates,
    globalHeaderId,
    setGlobalHeaderId,
    activeEditingHeader,
    setActiveEditingHeaderId,
    selectedHeaderWidgetId,
    setSelectedHeaderWidgetId,
    selectedHeaderRow,
    setSelectedHeaderRow,
    selectedHeaderZone,
    setSelectedHeaderZone,
    createHeaderTemplate,
    duplicateHeaderTemplate,
    deleteHeaderTemplate,
    updateHeaderTemplateMeta,
    updateHeaderRow,
    updateHeaderMobileDrawer,
    addHeaderWidget,
    updateHeaderWidget,
    moveHeaderWidget,
    moveHeaderWidgetToZone,
    duplicateHeaderWidget,
    removeHeaderWidget,
    toggleHeaderWidgetVisibility,
    applyHeaderToActiveTemplate,
    saveBuilderNow,
    customPages,
  } = useStoreBuilder();

  const { openNoticeModal, dispatchToast } = useSettings();
  const [subTab, setSubTab] = useState<'widgets' | 'rows' | 'library'>('widgets');
  const [isSaving, setIsSaving] = useState(false);

  const selectedWidgetEntry = useMemo(() => {
    if (!activeEditingHeader || !selectedHeaderWidgetId) return null;
    for (const rId of ['top', 'main', 'sub'] as HeaderRowId[]) {
      for (const zId of ['left', 'center', 'right'] as HeaderZoneId[]) {
        const found = activeEditingHeader.rows[rId].zones[zId].find(
          w => w.id === selectedHeaderWidgetId
        );
        if (found) return { widget: found, rowId: rId, zoneId: zId };
      }
    }
    return null;
  }, [activeEditingHeader, selectedHeaderWidgetId]);

  if (!activeEditingHeader) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-zinc-400">Selecciona o crea una cabecera para editarla:</p>
        <div className="space-y-2">
          {headerTemplates.map(h => (
            <button
              key={h.id}
              type="button"
              onClick={() => setActiveEditingHeaderId(h.id)}
              className="w-full p-3 rounded-xl bg-[#151823] border border-[#262a3b] hover:border-amber-500/60 text-left flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">{h.name}</span>
                {h.id === globalHeaderId && (
                  <span className="text-[10px] font-black text-emerald-400">Cabecera Global</span>
                )}
              </div>
              <PanelTop className="w-4 h-4 text-amber-400 shrink-0" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const created = createHeaderTemplate({ name: `Cabecera ${headerTemplates.length + 1}` });
            setActiveEditingHeaderId(created.id);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cabecera</span>
        </button>
      </div>
    );
  }

  const inputCls =
    'w-full px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white focus:outline-none focus:border-amber-500';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1';

  const isHeaderActiveOnStore =
    (activeTemplate.headerSource === 'custom' && activeTemplate.customHeaderId === activeEditingHeader.id) ||
    (activeTemplate.headerSource === 'global' && globalHeaderId === activeEditingHeader.id);

  const handleSaveAndApplyHeader = async () => {
    setIsSaving(true);
    try {
      applyHeaderToActiveTemplate(activeEditingHeader.id);
      await new Promise(resolve => setTimeout(resolve, 60));
      const res = await saveBuilderNow();
      if (!res.syncedToServer) {
        dispatchToast(
          'Cabecera Guardada Localmente',
          'Los cambios se aplicaron en tu navegador y se sincronizarán al conectar con el servidor.',
          'info'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderColorField = (
    label: string,
    value: string | undefined,
    fallback: string,
    onChange: (next: string | undefined) => void
  ) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback}
          onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-[#282c3a] bg-transparent cursor-pointer shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          placeholder={fallback}
          onChange={e => onChange(e.target.value.trim() || undefined)}
          className={`${inputCls} font-mono text-[11px]`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title="Restablecer color"
            className="p-1.5 rounded-lg bg-[#181b26] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );

  const confirmDeleteHeader = (id: string, name: string) => {
    openNoticeModal({
      title: '¿Eliminar esta cabecera?',
      message: `La cabecera "${name}" se eliminará de la biblioteca. Los themes que la usaban volverán al diseño estándar.`,
      tone: 'danger',
      confirmLabel: 'Sí, Eliminar',
      cancelLabel: 'Cancelar',
      onConfirm: () => deleteHeaderTemplate(id),
    });
  };

  const confirmDeleteWidget = (widget: HeaderWidget) => {
    openNoticeModal({
      title: '¿Quitar widget de la cabecera?',
      message: `Se retirará "${getWidgetLabel(widget.type)}" de la barra actual.`,
      tone: 'danger',
      confirmLabel: 'Quitar Widget',
      cancelLabel: 'Cancelar',
      onConfirm: () => removeHeaderWidget(widget.id),
    });
  };

  // =========================================================================
  // SELECTED WIDGET INSPECTOR
  // =========================================================================
  if (selectedWidgetEntry) {
    const { widget, rowId, zoneId } = selectedWidgetEntry;
    const patch = (partial: Partial<HeaderWidget>) =>
      updateHeaderWidget(widget.id, prev => ({ ...prev, ...partial } as HeaderWidget));

    return (
      <div className="p-3.5 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#242838]">
          <button
            type="button"
            onClick={() => setSelectedHeaderWidgetId(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <span className="text-xs font-black text-amber-400 truncate">
            {getWidgetLabel(widget.type)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => duplicateHeaderWidget(widget.id)}
              title="Duplicar widget"
              className="p-1.5 rounded-lg bg-[#171a26] hover:bg-[#232738] text-zinc-300"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => confirmDeleteWidget(widget)}
              title="Eliminar widget"
              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Position: Row & Zone */}
        <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2.5">
          <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
            Ubicación en Cabecera
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Fila</label>
              <select
                value={rowId}
                onChange={e => moveHeaderWidgetToZone(widget.id, e.target.value as HeaderRowId, zoneId)}
                className={inputCls}
              >
                <option value="top">Top Bar</option>
                <option value="main">Barra Principal</option>
                <option value="sub">Sub Barra</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Zona</label>
              <select
                value={zoneId}
                onChange={e => moveHeaderWidgetToZone(widget.id, rowId, e.target.value as HeaderZoneId)}
                className={inputCls}
              >
                <option value="left">Izquierda</option>
                <option value="center">Centro</option>
                <option value="right">Derecha</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => moveHeaderWidget(widget.id, -1)}
              className="flex-1 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Mover Izq.
            </button>
            <button
              type="button"
              onClick={() => moveHeaderWidget(widget.id, 1)}
              className="flex-1 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1"
            >
              Mover Der. <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Widget-specific fields */}
        <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-3">
          {widget.type === 'header_logo' && (
            <>
              <div>
                <label className={labelCls}>URL Logo Personalizado (opcional)</label>
                <input
                  type="text"
                  value={widget.customLogoUrl || ''}
                  placeholder="Usa el logo global de Identidad"
                  onChange={e => patch({ customLogoUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Texto de Marca (opcional)</label>
                <input
                  type="text"
                  value={widget.customBrandText || ''}
                  placeholder="Nombre comercial por defecto"
                  onChange={e => patch({ customBrandText: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Alto Móvil</label>
                  <input
                    type="number"
                    min={18}
                    max={72}
                    value={widget.heightMobile}
                    onChange={e => patch({ heightMobile: Number(e.target.value) || 28 })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Alto Tablet</label>
                  <input
                    type="number"
                    min={18}
                    max={80}
                    value={widget.heightTablet}
                    onChange={e => patch({ heightTablet: Number(e.target.value) || 34 })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Alto Desktop</label>
                  <input
                    type="number"
                    min={18}
                    max={96}
                    value={widget.heightDesktop}
                    onChange={e => patch({ heightDesktop: Number(e.target.value) || 38 })}
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mostrar texto de marca</span>
                <input
                  type="checkbox"
                  checked={widget.showBrandText}
                  onChange={e => patch({ showBrandText: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Badge de temporada</span>
                <input
                  type="checkbox"
                  checked={widget.showSeasonalBadge}
                  onChange={e => patch({ showSeasonalBadge: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            </>
          )}

          {widget.type === 'header_nav_menu' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Estilo</label>
                  <select
                    value={widget.style}
                    onChange={e => patch({ style: e.target.value as 'inline' | 'pills' | 'underline' })}
                    className={inputCls}
                  >
                    <option value="inline">Inline Limpio</option>
                    <option value="pills">Pills</option>
                    <option value="underline">Subrayado</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tamaño (px)</label>
                  <input
                    type="number"
                    min={11}
                    max={18}
                    value={widget.fontSizePx}
                    onChange={e => patch({ fontSizePx: Number(e.target.value) || 13 })}
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Incluir Páginas (/p/...) automáticamente</span>
                <input
                  type="checkbox"
                  checked={widget.includePublishedPages}
                  onChange={e => patch({ includePublishedPages: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Enlaces ({widget.items.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextItem: HeaderNavItem = {
                        id: `nav-${Date.now().toString(36)}`,
                        label: 'Nuevo Enlace',
                        actionType: 'url',
                        targetValue: '#',
                      };
                      patch({ items: [...widget.items, nextItem] });
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                {widget.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-[#0d0f15] border border-[#242838] space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.label}
                        onChange={e => {
                          const copy = [...widget.items];
                          copy[idx] = { ...item, label: e.target.value };
                          patch({ items: copy });
                        }}
                        className={inputCls}
                        placeholder="Etiqueta"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patch({ items: widget.items.filter(x => x.id !== item.id) })
                        }
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={item.actionType}
                        onChange={e => {
                          const copy = [...widget.items];
                          copy[idx] = {
                            ...item,
                            actionType: e.target.value as HeaderNavActionType,
                          };
                          patch({ items: copy });
                        }}
                        className={inputCls}
                      >
                        <option value="home">Carta / Inicio</option>
                        <option value="promos">Promociones</option>
                        <option value="reservations">Reservas</option>
                        <option value="orders">Mis Pedidos</option>
                        <option value="benefits">Beneficios</option>
                        <option value="category">Categoría</option>
                        <option value="custom_page">Página (/p/...)</option>
                        <option value="url">URL Externa</option>
                      </select>
                      {(item.actionType === 'url' ||
                        item.actionType === 'category' ||
                        item.actionType === 'custom_page') && (
                        item.actionType === 'custom_page' && customPages.length > 0 ? (
                          <select
                            value={item.targetValue || ''}
                            onChange={e => {
                              const copy = [...widget.items];
                              copy[idx] = { ...item, targetValue: e.target.value };
                              patch({ items: copy });
                            }}
                            className={inputCls}
                          >
                            <option value="">Elegir página...</option>
                            {customPages.map(p => (
                              <option key={p.id} value={p.slug}>
                                {p.title}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.targetValue || ''}
                            placeholder={item.actionType === 'category' ? 'pizzas' : 'https://...'}
                            onChange={e => {
                              const copy = [...widget.items];
                              copy[idx] = { ...item, targetValue: e.target.value };
                              patch({ items: copy });
                            }}
                            className={inputCls}
                          />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {widget.type === 'header_search' && (
            <>
              <div>
                <label className={labelCls}>Estilo Visual</label>
                <select
                  value={widget.style}
                  onChange={e =>
                    patch({
                      style: e.target.value as 'pill_white' | 'glass' | 'outline' | 'icon_only',
                    })
                  }
                  className={inputCls}
                >
                  <option value="pill_white">Pill Blanco (Estilo Cadena)</option>
                  <option value="glass">Glass Translúcido</option>
                  <option value="outline">Borde Minimal</option>
                  <option value="icon_only">Solo Ícono Lupa</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Placeholder</label>
                <input
                  type="text"
                  value={widget.placeholder}
                  onChange={e => patch({ placeholder: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Ancho Máximo (px)</label>
                <input
                  type="number"
                  min={140}
                  max={700}
                  value={widget.maxWidthPx}
                  onChange={e => patch({ maxWidthPx: Number(e.target.value) || 420 })}
                  className={inputCls}
                />
              </div>
            </>
          )}

          {widget.type === 'header_location' && (
            <>
              <div>
                <label className={labelCls}>Estilo</label>
                <select
                  value={widget.style}
                  onChange={e =>
                    patch({
                      style: e.target.value as 'pill_compact' | 'card_eta' | 'minimal_icon',
                    })
                  }
                  className={inputCls}
                >
                  <option value="pill_compact">Pill Compacto</option>
                  <option value="card_eta">Tarjeta con ETA</option>
                  <option value="minimal_icon">Solo Ícono</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Texto Alternativo (opcional)</label>
                <input
                  type="text"
                  value={widget.labelOverride || ''}
                  placeholder="Automático (dirección o sede)"
                  onChange={e => patch({ labelOverride: e.target.value })}
                  className={inputCls}
                />
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mostrar tiempo estimado (ETA)</span>
                <input
                  type="checkbox"
                  checked={widget.showEta}
                  onChange={e => patch({ showEta: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            </>
          )}

          {widget.type === 'header_cart' && (
            <>
              <div>
                <label className={labelCls}>Estilo</label>
                <select
                  value={widget.style}
                  onChange={e =>
                    patch({ style: e.target.value as 'pill_full' | 'icon_badge' | 'compact' })
                  }
                  className={inputCls}
                >
                  <option value="pill_full">Botón Pill Completo</option>
                  <option value="compact">Compacto</option>
                  <option value="icon_badge">Solo Ícono + Contador</option>
                </select>
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mostrar monto total (S/)</span>
                <input
                  type="checkbox"
                  checked={widget.showTotalAmount}
                  onChange={e => patch({ showTotalAmount: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mostrar contador de unidades</span>
                <input
                  type="checkbox"
                  checked={widget.showItemCount}
                  onChange={e => patch({ showItemCount: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Fondo Botón</label>
                  <input
                    type="color"
                    value={widget.bgColor && /^#[0-9a-fA-F]{6}$/.test(widget.bgColor) ? widget.bgColor : '#e11d48'}
                    onChange={e => patch({ bgColor: e.target.value })}
                    className="w-full h-8 rounded cursor-pointer bg-transparent"
                  />
                </div>
                <div>
                  <label className={labelCls}>Color Texto</label>
                  <input
                    type="color"
                    value={widget.textColor && /^#[0-9a-fA-F]{6}$/.test(widget.textColor) ? widget.textColor : '#ffffff'}
                    onChange={e => patch({ textColor: e.target.value })}
                    className="w-full h-8 rounded cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {widget.type === 'header_account' && (
            <>
              <div>
                <label className={labelCls}>Estilo</label>
                <select
                  value={widget.style}
                  onChange={e =>
                    patch({ style: e.target.value as 'pill' | 'minimal' | 'icon_only' })
                  }
                  className={inputCls}
                >
                  <option value="pill">Pill</option>
                  <option value="minimal">Minimal</option>
                  <option value="icon_only">Solo Ícono</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Texto sin sesión</label>
                <input
                  type="text"
                  value={widget.loginLabel}
                  onChange={e => patch({ loginLabel: e.target.value })}
                  className={inputCls}
                />
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mostrar nombre del cliente</span>
                <input
                  type="checkbox"
                  checked={widget.showCustomerName}
                  onChange={e => patch({ showCustomerName: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            </>
          )}

          {widget.type === 'header_announcement' && (
            <>
              <div>
                <label className={labelCls}>Mensajes (uno por línea)</label>
                <textarea
                  rows={3}
                  value={widget.messages.join('\n')}
                  onChange={e => patch({ messages: e.target.value.split('\n') })}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Ícono</label>
                  <select
                    value={widget.icon}
                    onChange={e =>
                      patch({
                        icon: e.target.value as 'sparkles' | 'flame' | 'truck' | 'tag' | 'none',
                      })
                    }
                    className={inputCls}
                  >
                    <option value="flame">Fuego</option>
                    <option value="truck">Delivery</option>
                    <option value="tag">Etiqueta</option>
                    <option value="sparkles">Brillo</option>
                    <option value="none">Ninguno</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Rotar (seg)</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={widget.rotateSeconds}
                    onChange={e => patch({ rotateSeconds: Number(e.target.value) || 5 })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Texto CTA</label>
                  <input
                    type="text"
                    value={widget.ctaLabel || ''}
                    onChange={e => patch({ ctaLabel: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>URL CTA</label>
                  <input
                    type="text"
                    value={widget.ctaUrl || ''}
                    onChange={e => patch({ ctaUrl: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Permitir cerrar (X)</span>
                <input
                  type="checkbox"
                  checked={widget.dismissible}
                  onChange={e => patch({ dismissible: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            </>
          )}

          {widget.type === 'header_mobile_trigger' && (
            <>
              <div>
                <label className={labelCls}>Estilo</label>
                <select
                  value={widget.style}
                  onChange={e => patch({ style: e.target.value as 'icon' | 'pill' })}
                  className={inputCls}
                >
                  <option value="icon">Solo Ícono Hamburguesa</option>
                  <option value="pill">Botón Pill con Texto</option>
                </select>
              </div>
              {widget.style === 'pill' && (
                <div>
                  <label className={labelCls}>Etiqueta</label>
                  <input
                    type="text"
                    value={widget.label || ''}
                    onChange={e => patch({ label: e.target.value })}
                    className={inputCls}
                  />
                </div>
              )}
            </>
          )}

          {widget.type === 'header_open_status' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Texto Abierto</label>
                  <input
                    type="text"
                    value={widget.openLabel}
                    onChange={e => patch({ openLabel: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Texto Cerrado</label>
                  <input
                    type="text"
                    value={widget.closedLabel}
                    onChange={e => patch({ closedLabel: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mostrar rango de horario</span>
                <input
                  type="checkbox"
                  checked={widget.showHours}
                  onChange={e => patch({ showHours: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            </>
          )}

          {widget.type === 'header_contact' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Canal</label>
                  <select
                    value={widget.mode}
                    onChange={e => patch({ mode: e.target.value as 'phone' | 'whatsapp' })}
                    className={inputCls}
                  >
                    <option value="phone">Teléfono</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Estilo</label>
                  <select
                    value={widget.style}
                    onChange={e => patch({ style: e.target.value as 'inline' | 'pill' })}
                    className={inputCls}
                  >
                    <option value="inline">Inline</option>
                    <option value="pill">Pill</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Etiqueta Superior</label>
                <input
                  type="text"
                  value={widget.topLabel || ''}
                  placeholder="Ej. Llámanos"
                  onChange={e => patch({ topLabel: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Número (vacío = sede activa)</label>
                <input
                  type="text"
                  value={widget.customNumber || ''}
                  placeholder="Automático desde sucursal"
                  onChange={e => patch({ customNumber: e.target.value })}
                  className={inputCls}
                />
              </div>
            </>
          )}

          {widget.type === 'header_quick_actions' && (
            <>
              <div>
                <label className={labelCls}>Estilo</label>
                <select
                  value={widget.style}
                  onChange={e => patch({ style: e.target.value as 'icons' | 'pills' })}
                  className={inputCls}
                >
                  <option value="icons">Solo Íconos</option>
                  <option value="pills">Pills con Etiqueta</option>
                </select>
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mis Pedidos</span>
                <input
                  type="checkbox"
                  checked={widget.showOrders}
                  onChange={e => patch({ showOrders: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Beneficios / Club</span>
                <input
                  type="checkbox"
                  checked={widget.showBenefits}
                  onChange={e => patch({ showBenefits: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Reservas</span>
                <input
                  type="checkbox"
                  checked={widget.showReservations}
                  onChange={e => patch({ showReservations: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Botón Constructor (solo Admin)</span>
                <input
                  type="checkbox"
                  checked={widget.showBuilderShortcut}
                  onChange={e => patch({ showBuilderShortcut: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            </>
          )}

          {widget.type === 'header_divider' && (
            <>
              <div>
                <label className={labelCls}>Tipo</label>
                <select
                  value={widget.mode}
                  onChange={e => patch({ mode: e.target.value as 'line' | 'flex_spacer' })}
                  className={inputCls}
                >
                  <option value="line">Línea Vertical</option>
                  <option value="flex_spacer">Espaciador Flexible</option>
                </select>
              </div>
              {widget.mode === 'line' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Alto (px)</label>
                    <input
                      type="number"
                      min={10}
                      max={48}
                      value={widget.heightPx}
                      onChange={e => patch({ heightPx: Number(e.target.value) || 22 })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Grosor (px)</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={widget.widthPx}
                      onChange={e => patch({ widthPx: Number(e.target.value) || 1 })}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Full Color & Appearance Customization */}
        <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            <span>Colores y Apariencia</span>
          </span>

          {widget.type === 'header_logo' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Borde', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
              {renderColorField('Texto', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Fondo Ícono', widget.badgeBgColor, '#e11d48', v => patch({ badgeBgColor: v }))}
            </div>
          )}

          {widget.type === 'header_nav_menu' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Texto Enlaces', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Texto Destacado', widget.activeColor, '#f59e0b', v => patch({ activeColor: v }))}
              {renderColorField('Fondo Pill', widget.pillBgColor, '#27272a', v => patch({ pillBgColor: v }))}
              {renderColorField('Fondo Destacado', widget.activeBgColor, '#f59e0b', v => patch({ activeBgColor: v }))}
              {renderColorField('Borde Pill', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
            </div>
          )}

          {widget.type === 'header_search' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Buscador', widget.bgColor, '#ffffff', v => patch({ bgColor: v }))}
              {renderColorField('Color Letra', widget.textColor, '#3f3f46', v => patch({ textColor: v }))}
              {renderColorField('Color Borde', widget.borderColor, '#d4d4d8', v => patch({ borderColor: v }))}
              {renderColorField('Color Lupa', widget.iconColor, '#71717a', v => patch({ iconColor: v }))}
            </div>
          )}

          {widget.type === 'header_location' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Color Letra', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Color Borde', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
              {renderColorField('Color Pin/Ícono', widget.iconColor, '#f59e0b', v => patch({ iconColor: v }))}
              {renderColorField('Fondo Badge ETA', widget.badgeBgColor, '#10b981', v => patch({ badgeBgColor: v }))}
              {renderColorField('Texto Badge ETA', widget.badgeTextColor, '#ffffff', v => patch({ badgeTextColor: v }))}
            </div>
          )}

          {widget.type === 'header_cart' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Botón', widget.bgColor, '#e11d48', v => patch({ bgColor: v }))}
              {renderColorField('Texto Botón', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Borde Botón', widget.borderColor, '#ffffff', v => patch({ borderColor: v }))}
              {renderColorField('Fondo Badge', widget.badgeBgColor, '#ffffff', v => patch({ badgeBgColor: v }))}
              {renderColorField('Texto Badge', widget.badgeTextColor, '#09090b', v => patch({ badgeTextColor: v }))}
            </div>
          )}

          {widget.type === 'header_account' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo', widget.bgColor, '#27272a', v => patch({ bgColor: v }))}
              {renderColorField('Color Letra', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Color Borde', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
              {renderColorField('Color Ícono', widget.iconColor, '#f59e0b', v => patch({ iconColor: v }))}
            </div>
          )}

          {widget.type === 'header_announcement' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Cinta', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Borde Cinta', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
              {renderColorField('Color Letra', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Color Ícono', widget.accentColor, '#f59e0b', v => patch({ accentColor: v }))}
              {renderColorField('Fondo CTA', widget.ctaBgColor, '#f59e0b', v => patch({ ctaBgColor: v }))}
              {renderColorField('Texto CTA', widget.ctaTextColor, '#09090b', v => patch({ ctaTextColor: v }))}
            </div>
          )}

          {widget.type === 'header_mobile_trigger' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo', widget.bgColor, '#27272a', v => patch({ bgColor: v }))}
              {renderColorField('Color Letra/Ícono', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Borde', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
            </div>
          )}

          {widget.type === 'header_open_status' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Abierto', widget.openBgColor, '#064e3b', v => patch({ openBgColor: v }))}
              {renderColorField('Texto Abierto', widget.openTextColor, '#34d399', v => patch({ openTextColor: v }))}
              {renderColorField('Fondo Cerrado', widget.closedBgColor, '#4c0519', v => patch({ closedBgColor: v }))}
              {renderColorField('Texto Cerrado', widget.closedTextColor, '#fb7185', v => patch({ closedTextColor: v }))}
              {renderColorField('Borde Badge', widget.borderColor, '#10b981', v => patch({ borderColor: v }))}
            </div>
          )}

          {widget.type === 'header_contact' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Color Letra', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Borde', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
              {renderColorField('Color Ícono', widget.iconColor, '#10b981', v => patch({ iconColor: v }))}
            </div>
          )}

          {widget.type === 'header_quick_actions' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Botones', widget.bgColor, '#27272a', v => patch({ bgColor: v }))}
              {renderColorField('Color Letra', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Borde Botones', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
              {renderColorField('Color Íconos', widget.iconColor, '#f59e0b', v => patch({ iconColor: v }))}
            </div>
          )}

          {widget.type === 'header_divider' && (
            <div>
              {renderColorField('Color Línea', widget.color, '#71717a', v => patch({ color: v }))}
            </div>
          )}
        </div>

        {/* Device Visibility */}
        <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2">
          <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
            Visibilidad por Dispositivo (sin selección = todos)
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { key: 'onlyMobile', label: 'Móvil', Icon: Smartphone },
                { key: 'onlyTablet', label: 'Tablet', Icon: Tablet },
                { key: 'onlyDesktop', label: 'PC', Icon: Monitor },
              ] as const
            ).map(({ key, label, Icon }) => {
              const active = Boolean(widget[key]);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => patch({ [key]: !active })}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                    active
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-[#0d0f15] border-[#282c3a] text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN HEADER BUILDER PANEL (WIDGETS | ROWS | LIBRARY)
  // =========================================================================
  const activeRowCfg = activeEditingHeader.rows[selectedHeaderRow];
  const zoneWidgets = activeRowCfg.zones[selectedHeaderZone];

  return (
    <div className="p-3.5 space-y-3.5">
      {/* Header Name & Global Badge */}
      <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <PanelTop className="w-3.5 h-3.5" /> Editando Cabecera
          </span>
          {activeEditingHeader.id === globalHeaderId ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black flex items-center gap-1">
              <Globe className="w-3 h-3" /> Global
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setGlobalHeaderId(activeEditingHeader.id)}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-300 text-[10px] font-bold transition-colors"
            >
              Usar como Global
            </button>
          )}
        </div>
        <input
          type="text"
          value={activeEditingHeader.name}
          onChange={e => updateHeaderTemplateMeta(activeEditingHeader.id, { name: e.target.value })}
          className={inputCls}
          placeholder="Nombre de la cabecera"
        />
        <div className="flex items-center justify-between gap-2 pt-1">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
              isHeaderActiveOnStore ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            <Check className="w-3 h-3 shrink-0" />
            <span>
              {isHeaderActiveOnStore ? 'Visible en la tienda' : 'Aún no aplicada al front-end'}
            </span>
          </span>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAndApplyHeader}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-[11px] font-black inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
          >
            <Save className="w-3 h-3" />
            <span>{isSaving ? 'Guardando...' : 'Guardar y Aplicar'}</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="grid grid-cols-3 p-1 rounded-xl bg-[#0d0f15] border border-[#242838] gap-1">
        {(
          [
            { id: 'widgets', label: 'Widgets' },
            { id: 'rows', label: 'Filas & Estilo' },
            { id: 'library', label: `Biblioteca (${headerTemplates.length})` },
          ] as const
        ).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
              subTab === t.id
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: WIDGETS + ZONE LAYERS */}
      {subTab === 'widgets' && (
        <div className="space-y-3.5">
          {/* Target Row & Zone selector */}
          <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2.5">
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Zona de Destino Activa
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(['top', 'main', 'sub'] as HeaderRowId[]).map(rId => {
                const enabled = activeEditingHeader.rows[rId].enabled;
                return (
                  <button
                    key={rId}
                    type="button"
                    onClick={() => setSelectedHeaderRow(rId)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                      selectedHeaderRow === rId
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#0d0f15] border-[#262a3b] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        enabled ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`}
                    />
                    <span>{ROW_LABELS[rId]}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['left', 'center', 'right'] as HeaderZoneId[]).map(zId => (
                <button
                  key={zId}
                  type="button"
                  onClick={() => setSelectedHeaderZone(zId)}
                  className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                    selectedHeaderZone === zId
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                      : 'bg-[#0d0f15] border-[#262a3b] text-zinc-400 hover:text-white'
                  }`}
                >
                  {ZONE_LABELS[zId]} ({activeRowCfg.zones[zId].length})
                </button>
              ))}
            </div>
          </div>

          {/* Current Widgets in active zone */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Widgets en {ROW_LABELS[selectedHeaderRow]} ·{' '}
                {ZONE_LABELS[selectedHeaderZone]}
              </span>
            </div>
            {zoneWidgets.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-[#2b3044] text-center text-[11px] text-zinc-500">
                Zona vacía. Haz clic en cualquier widget de abajo para añadirlo aquí.
              </div>
            ) : (
              <div className="space-y-1.5">
                {zoneWidgets.map(w => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedHeaderWidgetId(w.id)}
                    className="px-2.5 py-2 rounded-xl bg-[#151823] border border-[#262a3b] hover:border-amber-500/50 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-zinc-200 truncate">
                      {getWidgetLabel(w.type)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleHeaderWidgetVisibility(w.id)}
                        className="p-1 rounded text-zinc-400 hover:text-white"
                        title="Ocultar / Mostrar"
                      >
                        {w.isHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteWidget(w)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 12 Header Widgets Palette */}
          <div className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400">
              Agregar Widget a {ROW_LABELS[selectedHeaderRow]} ({ZONE_LABELS[selectedHeaderZone]})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {HEADER_WIDGET_CATALOG.map(item => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addHeaderWidget(item.type, selectedHeaderRow, selectedHeaderZone)}
                  className="p-2.5 rounded-xl bg-[#151823] border border-[#262a3b] hover:border-amber-500/60 hover:bg-[#1a1e2d] text-left transition-all flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1.5">
                    {item.icon}
                    <span className="text-[11px] font-bold text-white truncate">{item.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-tight">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROWS & MOBILE DRAWER STYLING */}
      {subTab === 'rows' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-3 gap-1">
            {(['top', 'main', 'sub'] as HeaderRowId[]).map(rId => (
              <button
                key={rId}
                type="button"
                onClick={() => setSelectedHeaderRow(rId)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border ${
                  selectedHeaderRow === rId
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#0d0f15] border-[#262a3b] text-zinc-400'
                }`}
              >
                {ROW_LABELS[rId]}
              </button>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-3">
            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer">
              <span>Activar fila {ROW_LABELS[selectedHeaderRow]}</span>
              <input
                type="checkbox"
                checked={activeRowCfg.enabled}
                onChange={e => updateHeaderRow(selectedHeaderRow, { enabled: e.target.checked })}
                className="accent-amber-500"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Fondo</label>
                <input
                  type="color"
                  value={activeRowCfg.bgColor || '#111318'}
                  onChange={e => updateHeaderRow(selectedHeaderRow, { bgColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer bg-transparent"
                />
              </div>
              <div>
                <label className={labelCls}>Texto / Íconos</label>
                <input
                  type="color"
                  value={activeRowCfg.textColor || '#ffffff'}
                  onChange={e => updateHeaderRow(selectedHeaderRow, { textColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Altura (px)</label>
                <input
                  type="number"
                  min={28}
                  max={120}
                  value={activeRowCfg.heightPx}
                  onChange={e =>
                    updateHeaderRow(selectedHeaderRow, { heightPx: Number(e.target.value) || 56 })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Ancho Máx.</label>
                <select
                  value={activeRowCfg.maxWidth}
                  onChange={e =>
                    updateHeaderRow(selectedHeaderRow, {
                      maxWidth: e.target.value as '1280px' | '1440px' | '1600px' | '100%',
                    })
                  }
                  className={inputCls}
                >
                  <option value="1280px">1280px</option>
                  <option value="1440px">1440px</option>
                  <option value="1600px">1600px</option>
                  <option value="100%">Ancho Total (100%)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
              <span>Fija al hacer scroll (Sticky)</span>
              <input
                type="checkbox"
                checked={Boolean(activeRowCfg.sticky)}
                onChange={e => updateHeaderRow(selectedHeaderRow, { sticky: e.target.checked })}
                className="accent-amber-500"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
              <span>Efecto Glassmorphism (Blur)</span>
              <input
                type="checkbox"
                checked={Boolean(activeRowCfg.blurGlass)}
                onChange={e => updateHeaderRow(selectedHeaderRow, { blurGlass: e.target.checked })}
                className="accent-amber-500"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
              <span>Borde inferior sutil</span>
              <input
                type="checkbox"
                checked={activeRowCfg.showBorderBottom}
                onChange={e =>
                  updateHeaderRow(selectedHeaderRow, { showBorderBottom: e.target.checked })
                }
                className="accent-amber-500"
              />
            </label>
          </div>

          {/* Mobile Drawer Options */}
          <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2.5">
            <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400">
              Menú Móvil (Drawer)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Fondo Drawer</label>
                <input
                  type="color"
                  value={activeEditingHeader.mobileDrawer.bgColor || '#ffffff'}
                  onChange={e => updateHeaderMobileDrawer({ bgColor: e.target.value })}
                  className="w-full h-7 rounded cursor-pointer bg-transparent"
                />
              </div>
              <div>
                <label className={labelCls}>Texto Drawer</label>
                <input
                  type="color"
                  value={activeEditingHeader.mobileDrawer.textColor || '#18181b'}
                  onChange={e => updateHeaderMobileDrawer({ textColor: e.target.value })}
                  className="w-full h-7 rounded cursor-pointer bg-transparent"
                />
              </div>
            </div>
            {(
              [
                { key: 'showSearch', label: 'Mostrar Buscador' },
                { key: 'showLocation', label: 'Mostrar Ubicación' },
                { key: 'showAccount', label: 'Mostrar Cuenta' },
                { key: 'showContact', label: 'Mostrar Teléfono' },
                { key: 'showPublishedPages', label: 'Incluir Páginas (/p/...)' },
              ] as const
            ).map(opt => (
              <label
                key={opt.key}
                className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer"
              >
                <span>{opt.label}</span>
                <input
                  type="checkbox"
                  checked={activeEditingHeader.mobileDrawer[opt.key]}
                  onChange={e => updateHeaderMobileDrawer({ [opt.key]: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HEADER LIBRARY */}
      {subTab === 'library' && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              const created = createHeaderTemplate({
                name: `Cabecera ${headerTemplates.length + 1}`,
              });
              setActiveEditingHeaderId(created.id);
              setSubTab('widgets');
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Cabecera</span>
          </button>

          <div className="space-y-2">
            {headerTemplates.map(h => {
              const isEditing = h.id === activeEditingHeader.id;
              const isGlobal = h.id === globalHeaderId;
              return (
                <div
                  key={h.id}
                  className={`p-3 rounded-xl border transition-all space-y-2 ${
                    isEditing
                      ? 'bg-amber-500/10 border-amber-500'
                      : 'bg-[#151823] border-[#262a3b]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-white truncate">{h.name}</span>
                      {h.description && (
                        <span className="block text-[10px] text-zinc-400 line-clamp-2">
                          {h.description}
                        </span>
                      )}
                    </div>
                    {isGlobal && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black shrink-0">
                        GLOBAL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEditingHeaderId(h.id);
                        setSubTab('widgets');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold"
                    >
                      {isEditing ? 'Editando' : 'Editar'}
                    </button>
                    {!isGlobal && (
                      <button
                        type="button"
                        onClick={() => setGlobalHeaderId(h.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold"
                      >
                        Fijar Global
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => duplicateHeaderTemplate(h.id)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                      title="Duplicar"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {headerTemplates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => confirmDeleteHeader(h.id, h.name)}
                        className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
