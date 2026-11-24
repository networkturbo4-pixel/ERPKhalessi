import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  CalendarClock,
  Check,
  ChevronLeft,
  Copy,
  Copyright,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Layers,
  Link2,
  Mail,
  Monitor,
  Palette,
  PanelBottom,
  Phone,
  Plus,
  Save,
  Share2,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useStoreBuilder } from '../../context/StoreBuilderContext';
import { useSettings } from '../../context/SettingsContext';
import {
  FooterBandId,
  FooterColumnId,
  FooterLinkItem,
  FooterSocialItem,
  FooterWidget,
  FooterWidgetType,
  HeaderNavActionType,
  TextAlignOption,
} from '../../types/storeBuilder';

const FOOTER_WIDGET_CATALOG: Array<{
  type: FooterWidgetType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  { type: 'footer_brand', label: 'Marca / Logo', desc: 'Logo, resumen y RUC', icon: <ImageIcon className="w-4 h-4 text-amber-400" /> },
  { type: 'footer_link_list', label: 'Lista de Enlaces', desc: 'Menú y páginas /p/...', icon: <Link2 className="w-4 h-4 text-sky-400" /> },
  { type: 'footer_contact', label: 'Contacto y Sede', desc: 'Dirección, tel y horario', icon: <Phone className="w-4 h-4 text-emerald-400" /> },
  { type: 'footer_newsletter', label: 'Newsletter', desc: 'Captación de cupones', icon: <Mail className="w-4 h-4 text-purple-400" /> },
  { type: 'footer_complaints_book', label: 'Reclamaciones', desc: 'Libro oficial INDECOPI', icon: <BookOpenCheck className="w-4 h-4 text-rose-400" /> },
  { type: 'footer_payment_badges', label: 'Medios de Pago', desc: 'Visa, Yape, Plin, Culqi', icon: <CreditCard className="w-4 h-4 text-indigo-400" /> },
  { type: 'footer_reservations_cta', label: 'CTA Reservas', desc: 'Reservar y compartir', icon: <CalendarClock className="w-4 h-4 text-orange-400" /> },
  { type: 'footer_social_links', label: 'Redes Sociales', desc: 'IG, FB, TikTok, WA', icon: <Share2 className="w-4 h-4 text-cyan-400" /> },
  { type: 'footer_copyright', label: 'Copyright', desc: 'Texto legal con {year}', icon: <Copyright className="w-4 h-4 text-zinc-400" /> },
  { type: 'footer_custom_text', label: 'Texto Libre', desc: 'Aviso o promo con CTA', icon: <Type className="w-4 h-4 text-lime-400" /> },
];

const BAND_LABELS: Record<FooterBandId, string> = {
  ribbon: 'Cinta',
  main: 'Principal',
  bottom: 'Legal',
};

const COL_LABELS: Record<FooterColumnId, string> = {
  col1: 'Col 1',
  col2: 'Col 2',
  col3: 'Col 3',
  col4: 'Col 4',
};

const ALL_PAYMENT_METHODS: Array<'visa' | 'mastercard' | 'yape' | 'plin' | 'efectivo' | 'culqi'> = [
  'visa',
  'mastercard',
  'yape',
  'plin',
  'efectivo',
  'culqi',
];

function getWidgetLabel(type: FooterWidgetType): string {
  return FOOTER_WIDGET_CATALOG.find(c => c.type === type)?.label || type;
}

export const ElementorFooterBuilderPanel: React.FC = () => {
  const {
    activeTemplate,
    footerTemplates,
    globalFooterId,
    setGlobalFooterId,
    activeEditingFooter,
    setActiveEditingFooterId,
    selectedFooterWidgetId,
    setSelectedFooterWidgetId,
    selectedFooterBand,
    setSelectedFooterBand,
    selectedFooterColumn,
    setSelectedFooterColumn,
    createFooterTemplate,
    duplicateFooterTemplate,
    deleteFooterTemplate,
    updateFooterTemplateMeta,
    updateFooterBand,
    addFooterWidget,
    updateFooterWidget,
    moveFooterWidget,
    moveFooterWidgetToSlot,
    duplicateFooterWidget,
    removeFooterWidget,
    toggleFooterWidgetVisibility,
    applyFooterToActiveTemplate,
    saveBuilderNow,
    customPages,
  } = useStoreBuilder();

  const { openNoticeModal, dispatchToast } = useSettings();
  const [subTab, setSubTab] = useState<'widgets' | 'bands' | 'library'>('widgets');
  const [isSaving, setIsSaving] = useState(false);

  const selectedWidgetEntry = useMemo(() => {
    if (!activeEditingFooter || !selectedFooterWidgetId) return null;
    for (const bId of ['ribbon', 'main', 'bottom'] as FooterBandId[]) {
      for (const cId of ['col1', 'col2', 'col3', 'col4'] as FooterColumnId[]) {
        const found = activeEditingFooter.bands[bId].columns[cId].find(
          w => w.id === selectedFooterWidgetId
        );
        if (found) return { widget: found, bandId: bId, colId: cId };
      }
    }
    return null;
  }, [activeEditingFooter, selectedFooterWidgetId]);

  if (!activeEditingFooter) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-zinc-400">Selecciona o crea un footer para editarlo:</p>
        <div className="space-y-2">
          {footerTemplates.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveEditingFooterId(f.id)}
              className="w-full p-3 rounded-xl bg-[#151823] border border-[#262a3b] hover:border-amber-500/60 text-left flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">{f.name}</span>
                {f.id === globalFooterId && (
                  <span className="text-[10px] font-black text-emerald-400">Footer Global</span>
                )}
              </div>
              <PanelBottom className="w-4 h-4 text-amber-400 shrink-0" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const created = createFooterTemplate({ name: `Footer ${footerTemplates.length + 1}` });
            setActiveEditingFooterId(created.id);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Footer</span>
        </button>
      </div>
    );
  }

  const inputCls =
    'w-full px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white focus:outline-none focus:border-amber-500';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1';

  const isFooterActiveOnStore =
    (activeTemplate.footerSource === 'custom' && activeTemplate.customFooterId === activeEditingFooter.id) ||
    (activeTemplate.footerSource === 'global' && globalFooterId === activeEditingFooter.id);

  const handleSaveAndApplyFooter = async () => {
    setIsSaving(true);
    try {
      applyFooterToActiveTemplate(activeEditingFooter.id);
      await new Promise(resolve => setTimeout(resolve, 60));
      const res = await saveBuilderNow();
      if (!res.syncedToServer) {
        dispatchToast(
          'Footer Guardado Localmente',
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

  const confirmDeleteFooter = (id: string, name: string) => {
    openNoticeModal({
      title: '¿Eliminar este footer?',
      message: `El footer "${name}" se eliminará de la biblioteca. Los themes que lo usaban volverán al diseño estándar.`,
      tone: 'danger',
      confirmLabel: 'Sí, Eliminar',
      cancelLabel: 'Cancelar',
      onConfirm: () => deleteFooterTemplate(id),
    });
  };

  const confirmDeleteWidget = (widget: FooterWidget) => {
    openNoticeModal({
      title: '¿Quitar widget del footer?',
      message: `Se retirará "${getWidgetLabel(widget.type)}" de la columna actual.`,
      tone: 'danger',
      confirmLabel: 'Quitar Widget',
      cancelLabel: 'Cancelar',
      onConfirm: () => removeFooterWidget(widget.id),
    });
  };

  // =========================================================================
  // SELECTED WIDGET INSPECTOR
  // =========================================================================
  if (selectedWidgetEntry) {
    const { widget, bandId, colId } = selectedWidgetEntry;
    const patch = (partial: Partial<FooterWidget>) =>
      updateFooterWidget(widget.id, prev => ({ ...prev, ...partial } as FooterWidget));

    return (
      <div className="p-3.5 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#242838]">
          <button
            type="button"
            onClick={() => setSelectedFooterWidgetId(null)}
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
              onClick={() => duplicateFooterWidget(widget.id)}
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

        {/* Position: Band & Column */}
        <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2.5">
          <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
            Ubicación en Footer
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Banda</label>
              <select
                value={bandId}
                onChange={e => moveFooterWidgetToSlot(widget.id, e.target.value as FooterBandId, colId)}
                className={inputCls}
              >
                <option value="ribbon">Cinta Superior</option>
                <option value="main">Cuerpo Principal</option>
                <option value="bottom">Barra Legal</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Columna</label>
              <select
                value={colId}
                onChange={e => moveFooterWidgetToSlot(widget.id, bandId, e.target.value as FooterColumnId)}
                className={inputCls}
              >
                <option value="col1">Columna 1</option>
                <option value="col2">Columna 2</option>
                <option value="col3">Columna 3</option>
                <option value="col4">Columna 4</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => moveFooterWidget(widget.id, -1)}
              className="flex-1 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1"
            >
              <ArrowUp className="w-3 h-3" /> Subir
            </button>
            <button
              type="button"
              onClick={() => moveFooterWidget(widget.id, 1)}
              className="flex-1 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1"
            >
              <ArrowDown className="w-3 h-3" /> Bajar
            </button>
          </div>
        </div>

        {/* Widget-specific fields */}
        <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-3">
          {widget.type === 'footer_brand' && (
            <>
              <div>
                <label className={labelCls}>URL Logo Personalizado (opcional)</label>
                <input
                  type="text"
                  value={widget.customLogoUrl || ''}
                  placeholder="Usa logo global de Identidad"
                  onChange={e => patch({ customLogoUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Descripción de Marca</label>
                <textarea
                  rows={3}
                  value={widget.description}
                  onChange={e => patch({ description: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Altura Logo (px)</label>
                <input
                  type="number"
                  min={22}
                  max={80}
                  value={widget.logoHeightPx}
                  onChange={e => patch({ logoHeightPx: Number(e.target.value) || 38 })}
                  className={inputCls}
                />
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mostrar nombre comercial</span>
                <input
                  type="checkbox"
                  checked={widget.showBrandName}
                  onChange={e => patch({ showBrandName: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Mostrar Razón Social y RUC</span>
                <input
                  type="checkbox"
                  checked={widget.showRuc}
                  onChange={e => patch({ showRuc: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            </>
          )}

          {widget.type === 'footer_link_list' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Título Columna</label>
                  <input
                    type="text"
                    value={widget.title}
                    onChange={e => patch({ title: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Disposición</label>
                  <select
                    value={widget.layout}
                    onChange={e => patch({ layout: e.target.value as 'vertical' | 'inline' })}
                    className={inputCls}
                  >
                    <option value="vertical">Lista Vertical</option>
                    <option value="inline">Horizontal</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Incluir Páginas (/p/...) marcadas en Footer</span>
                <input
                  type="checkbox"
                  checked={widget.includePublishedFooterPages}
                  onChange={e => patch({ includePublishedFooterPages: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Enlaces ({widget.items.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next: FooterLinkItem = {
                        id: `fl-${Date.now().toString(36)}`,
                        label: 'Nuevo Enlace',
                        actionType: 'url',
                        targetValue: '#',
                      };
                      patch({ items: [...widget.items, next] });
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
                      />
                      <button
                        type="button"
                        onClick={() => patch({ items: widget.items.filter(x => x.id !== item.id) })}
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
                          copy[idx] = { ...item, actionType: e.target.value as HeaderNavActionType };
                          patch({ items: copy });
                        }}
                        className={inputCls}
                      >
                        <option value="home">Carta / Inicio</option>
                        <option value="promos">Promociones</option>
                        <option value="reservations">Reservas</option>
                        <option value="orders">Mis Pedidos</option>
                        <option value="benefits">Beneficios</option>
                        <option value="custom_page">Página (/p/...)</option>
                        <option value="url">URL Externa</option>
                      </select>
                      {(item.actionType === 'url' || item.actionType === 'custom_page') &&
                        (item.actionType === 'custom_page' && customPages.length > 0 ? (
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
                            placeholder="https://..."
                            onChange={e => {
                              const copy = [...widget.items];
                              copy[idx] = { ...item, targetValue: e.target.value };
                              patch({ items: copy });
                            }}
                            className={inputCls}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {widget.type === 'footer_contact' && (
            <>
              <div>
                <label className={labelCls}>Título</label>
                <input
                  type="text"
                  value={widget.title}
                  onChange={e => patch({ title: e.target.value })}
                  className={inputCls}
                />
              </div>
              {(
                [
                  { key: 'showAddress', label: 'Dirección de sede' },
                  { key: 'showSchedule', label: 'Horario operativo' },
                  { key: 'showPhone', label: 'Teléfono' },
                  { key: 'showWhatsapp', label: 'WhatsApp Directo' },
                  { key: 'showEmail', label: 'Correo electrónico' },
                ] as const
              ).map(opt => (
                <label
                  key={opt.key}
                  className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer"
                >
                  <span>{opt.label}</span>
                  <input
                    type="checkbox"
                    checked={widget[opt.key]}
                    onChange={e => patch({ [opt.key]: e.target.checked })}
                    className="accent-amber-500"
                  />
                </label>
              ))}
            </>
          )}

          {widget.type === 'footer_newsletter' && (
            <>
              <div>
                <label className={labelCls}>Título</label>
                <input
                  type="text"
                  value={widget.title}
                  onChange={e => patch({ title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea
                  rows={2}
                  value={widget.description}
                  onChange={e => patch({ description: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                  <label className={labelCls}>Botón</label>
                  <input
                    type="text"
                    value={widget.buttonLabel}
                    onChange={e => patch({ buttonLabel: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </>
          )}

          {widget.type === 'footer_complaints_book' && (
            <>
              <div>
                <label className={labelCls}>Estilo</label>
                <select
                  value={widget.style}
                  onChange={e => patch({ style: e.target.value as 'card' | 'pill' | 'minimal' })}
                  className={inputCls}
                >
                  <option value="card">Tarjeta Oficial</option>
                  <option value="pill">Botón Pill</option>
                  <option value="minimal">Enlace Minimal</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Título</label>
                <input
                  type="text"
                  value={widget.title}
                  onChange={e => patch({ title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Subtítulo</label>
                <input
                  type="text"
                  value={widget.subtitle}
                  onChange={e => patch({ subtitle: e.target.value })}
                  className={inputCls}
                />
              </div>
            </>
          )}

          {widget.type === 'footer_payment_badges' && (
            <>
              <div>
                <label className={labelCls}>Título (opcional)</label>
                <input
                  type="text"
                  value={widget.title || ''}
                  onChange={e => patch({ title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Estilo</label>
                <select
                  value={widget.style}
                  onChange={e => patch({ style: e.target.value as 'pills' | 'outline' })}
                  className={inputCls}
                >
                  <option value="pills">Pills Sólidos</option>
                  <option value="outline">Borde Outline</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <span className={labelCls}>Métodos Activos</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_PAYMENT_METHODS.map(m => {
                    const checked = widget.methods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          patch({
                            methods: checked
                              ? widget.methods.filter(x => x !== m)
                              : [...widget.methods, m],
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold uppercase ${
                          checked
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-[#0d0f15] border-[#282c3a] text-zinc-400'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {widget.type === 'footer_reservations_cta' && (
            <>
              <div>
                <label className={labelCls}>Título</label>
                <input
                  type="text"
                  value={widget.title}
                  onChange={e => patch({ title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Subtítulo</label>
                <input
                  type="text"
                  value={widget.subtitle}
                  onChange={e => patch({ subtitle: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Texto Botón</label>
                <input
                  type="text"
                  value={widget.buttonLabel}
                  onChange={e => patch({ buttonLabel: e.target.value })}
                  className={inputCls}
                />
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Botón copiar/compartir enlace</span>
                <input
                  type="checkbox"
                  checked={widget.showShareButton}
                  onChange={e => patch({ showShareButton: e.target.checked })}
                  className="accent-amber-500"
                />
              </label>
            </>
          )}

          {widget.type === 'footer_social_links' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Título (opcional)</label>
                  <input
                    type="text"
                    value={widget.title || ''}
                    onChange={e => patch({ title: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Estilo</label>
                  <select
                    value={widget.style}
                    onChange={e => patch({ style: e.target.value as 'circle' | 'pill' })}
                    className={inputCls}
                  >
                    <option value="circle">Círculos</option>
                    <option value="pill">Pills</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Redes ({widget.items.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next: FooterSocialItem = {
                        id: `soc-${Date.now().toString(36)}`,
                        network: 'instagram',
                        url: 'https://instagram.com',
                      };
                      patch({ items: [...widget.items, next] });
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                {widget.items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-1.5">
                    <select
                      value={item.network}
                      onChange={e => {
                        const copy = [...widget.items];
                        copy[idx] = {
                          ...item,
                          network: e.target.value as FooterSocialItem['network'],
                        };
                        patch({ items: copy });
                      }}
                      className="w-24 px-2 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="tiktok">TikTok</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="web">Web</option>
                    </select>
                    <input
                      type="text"
                      value={item.url}
                      onChange={e => {
                        const copy = [...widget.items];
                        copy[idx] = { ...item, url: e.target.value };
                        patch({ items: copy });
                      }}
                      className={inputCls}
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => patch({ items: widget.items.filter(x => x.id !== item.id) })}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {widget.type === 'footer_copyright' && (
            <>
              <div>
                <label className={labelCls}>Texto (usa {'{year}'} y {'{brand}'})</label>
                <input
                  type="text"
                  value={widget.text}
                  onChange={e => patch({ text: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Alineación</label>
                <select
                  value={widget.align}
                  onChange={e => patch({ align: e.target.value as TextAlignOption })}
                  className={inputCls}
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
            </>
          )}

          {widget.type === 'footer_custom_text' && (
            <>
              <div>
                <label className={labelCls}>Título (opcional)</label>
                <input
                  type="text"
                  value={widget.title || ''}
                  onChange={e => patch({ title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Contenido</label>
                <textarea
                  rows={3}
                  value={widget.body}
                  onChange={e => patch({ body: e.target.value })}
                  className={inputCls}
                />
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
              <div>
                <label className={labelCls}>Alineación</label>
                <select
                  value={widget.align}
                  onChange={e => patch({ align: e.target.value as TextAlignOption })}
                  className={inputCls}
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Full Color & Appearance Customization */}
        <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            <span>Colores y Apariencia</span>
          </span>

          {widget.type === 'footer_brand' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Bloque', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Borde Bloque', widget.borderColor, '#27272a', v => patch({ borderColor: v }))}
              {renderColorField('Color Título', widget.titleColor, '#ffffff', v => patch({ titleColor: v }))}
              {renderColorField('Color Texto', widget.textColor, '#d4d4d8', v => patch({ textColor: v }))}
              {renderColorField('Fondo Ícono', widget.accentColor, '#e11d48', v => patch({ accentColor: v }))}
            </div>
          )}

          {widget.type === 'footer_link_list' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Bloque', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Borde Bloque', widget.borderColor, '#27272a', v => patch({ borderColor: v }))}
              {renderColorField('Color Título', widget.titleColor, '#ffffff', v => patch({ titleColor: v }))}
              {renderColorField('Color Enlaces', widget.textColor, '#d4d4d8', v => patch({ textColor: v }))}
            </div>
          )}

          {widget.type === 'footer_contact' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Bloque', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Borde Bloque', widget.borderColor, '#27272a', v => patch({ borderColor: v }))}
              {renderColorField('Color Título', widget.titleColor, '#ffffff', v => patch({ titleColor: v }))}
              {renderColorField('Color Texto', widget.textColor, '#d4d4d8', v => patch({ textColor: v }))}
              {renderColorField('Color Íconos', widget.iconColor, '#f59e0b', v => patch({ iconColor: v }))}
            </div>
          )}

          {widget.type === 'footer_newsletter' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Bloque', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Borde Bloque', widget.borderColor, '#27272a', v => patch({ borderColor: v }))}
              {renderColorField('Color Título', widget.titleColor, '#ffffff', v => patch({ titleColor: v }))}
              {renderColorField('Color Texto', widget.textColor, '#d4d4d8', v => patch({ textColor: v }))}
              {renderColorField('Fondo Input', widget.inputBgColor, '#09090b', v => patch({ inputBgColor: v }))}
              {renderColorField('Texto Input', widget.inputTextColor, '#ffffff', v => patch({ inputTextColor: v }))}
              {renderColorField('Borde Input', widget.inputBorderColor, '#3f3f46', v => patch({ inputBorderColor: v }))}
              {renderColorField('Fondo Botón', widget.accentColor, '#e11d48', v => patch({ accentColor: v }))}
              {renderColorField('Texto Botón', widget.buttonTextColor, '#ffffff', v => patch({ buttonTextColor: v }))}
            </div>
          )}

          {widget.type === 'footer_complaints_book' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Tarjeta', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Color Texto', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Color Borde', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
              {renderColorField('Fondo Ícono', widget.iconBgColor, '#3f1d2b', v => patch({ iconBgColor: v }))}
              {renderColorField('Color Ícono', widget.iconColor, '#f43f5e', v => patch({ iconColor: v }))}
            </div>
          )}

          {widget.type === 'footer_payment_badges' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Contenedor', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Color Título', widget.titleColor, '#a1a1aa', v => patch({ titleColor: v }))}
              {renderColorField('Fondo Badges', widget.badgeBgColor, '#27272a', v => patch({ badgeBgColor: v }))}
              {renderColorField('Texto Badges', widget.badgeTextColor, '#ffffff', v => patch({ badgeTextColor: v }))}
              {renderColorField('Borde Badges', widget.badgeBorderColor, '#3f3f46', v => patch({ badgeBorderColor: v }))}
            </div>
          )}

          {widget.type === 'footer_reservations_cta' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Bloque', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Borde Bloque', widget.borderColor, '#3f3f46', v => patch({ borderColor: v }))}
              {renderColorField('Color Texto', widget.textColor, '#ffffff', v => patch({ textColor: v }))}
              {renderColorField('Fondo Botón', widget.accentColor, '#e11d48', v => patch({ accentColor: v }))}
              {renderColorField('Texto Botón', widget.buttonTextColor, '#ffffff', v => patch({ buttonTextColor: v }))}
              {renderColorField('Fondo Ícono', widget.iconBgColor, '#3f1d2b', v => patch({ iconBgColor: v }))}
              {renderColorField('Color Ícono', widget.iconColor, '#f59e0b', v => patch({ iconColor: v }))}
            </div>
          )}

          {widget.type === 'footer_social_links' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Color Título', widget.titleColor, '#ffffff', v => patch({ titleColor: v }))}
              {renderColorField('Fondo Badges', widget.badgeBgColor, '#27272a', v => patch({ badgeBgColor: v }))}
              {renderColorField('Texto Badges', widget.badgeTextColor, '#ffffff', v => patch({ badgeTextColor: v }))}
              {renderColorField('Borde Badges', widget.badgeBorderColor, '#3f3f46', v => patch({ badgeBorderColor: v }))}
            </div>
          )}

          {widget.type === 'footer_copyright' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Color Letra', widget.textColor, '#a1a1aa', v => patch({ textColor: v }))}
            </div>
          )}

          {widget.type === 'footer_custom_text' && (
            <div className="grid grid-cols-2 gap-2">
              {renderColorField('Fondo Bloque', widget.bgColor, '#18181b', v => patch({ bgColor: v }))}
              {renderColorField('Borde Bloque', widget.borderColor, '#27272a', v => patch({ borderColor: v }))}
              {renderColorField('Color Título', widget.titleColor, '#ffffff', v => patch({ titleColor: v }))}
              {renderColorField('Color Texto', widget.textColor, '#d4d4d8', v => patch({ textColor: v }))}
              {renderColorField('Fondo Botón CTA', widget.ctaBgColor, '#e11d48', v => patch({ ctaBgColor: v }))}
              {renderColorField('Texto Botón CTA', widget.ctaTextColor, '#ffffff', v => patch({ ctaTextColor: v }))}
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
  // MAIN FOOTER BUILDER PANEL (WIDGETS | BANDS | LIBRARY)
  // =========================================================================
  const activeBandCfg = activeEditingFooter.bands[selectedFooterBand];
  const visibleCols = (['col1', 'col2', 'col3', 'col4'] as FooterColumnId[]).slice(
    0,
    Math.min(4, Math.max(1, activeBandCfg.columnsDesktop || 1))
  );
  const safeSelectedCol = visibleCols.includes(selectedFooterColumn)
    ? selectedFooterColumn
    : visibleCols[0];
  const slotWidgets = activeBandCfg.columns[safeSelectedCol] || [];

  return (
    <div className="p-3.5 space-y-3.5">
      {/* Footer Name & Global Badge */}
      <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <PanelBottom className="w-3.5 h-3.5" /> Editando Footer
          </span>
          {activeEditingFooter.id === globalFooterId ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black flex items-center gap-1">
              <Globe className="w-3 h-3" /> Global
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setGlobalFooterId(activeEditingFooter.id)}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-300 text-[10px] font-bold transition-colors"
            >
              Usar como Global
            </button>
          )}
        </div>
        <input
          type="text"
          value={activeEditingFooter.name}
          onChange={e => updateFooterTemplateMeta(activeEditingFooter.id, { name: e.target.value })}
          className={inputCls}
          placeholder="Nombre del footer"
        />
        <div className="flex items-center justify-between gap-2 pt-1">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
              isFooterActiveOnStore ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            <Check className="w-3 h-3 shrink-0" />
            <span>
              {isFooterActiveOnStore ? 'Visible en la tienda' : 'Aún no aplicado al front-end'}
            </span>
          </span>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAndApplyFooter}
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
            { id: 'bands', label: 'Bandas & Estilo' },
            { id: 'library', label: `Biblioteca (${footerTemplates.length})` },
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

      {/* TAB 1: WIDGETS + COLUMN LAYERS */}
      {subTab === 'widgets' && (
        <div className="space-y-3.5">
          <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-2.5">
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Banda y Columna Activa
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(['ribbon', 'main', 'bottom'] as FooterBandId[]).map(bId => {
                const enabled = activeEditingFooter.bands[bId].enabled;
                return (
                  <button
                    key={bId}
                    type="button"
                    onClick={() => setSelectedFooterBand(bId)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                      selectedFooterBand === bId
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#0d0f15] border-[#262a3b] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        enabled ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`}
                    />
                    <span>{BAND_LABELS[bId]}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              {visibleCols.map(cId => (
                <button
                  key={cId}
                  type="button"
                  onClick={() => setSelectedFooterColumn(cId)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                    safeSelectedCol === cId
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                      : 'bg-[#0d0f15] border-[#262a3b] text-zinc-400 hover:text-white'
                  }`}
                >
                  {COL_LABELS[cId]} ({activeBandCfg.columns[cId].length})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Widgets en {BAND_LABELS[selectedFooterBand]} ·{' '}
              {COL_LABELS[safeSelectedCol]}
            </span>
            {slotWidgets.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-[#2b3044] text-center text-[11px] text-zinc-500">
                Columna vacía. Haz clic en un widget de abajo para añadirlo.
              </div>
            ) : (
              <div className="space-y-1.5">
                {slotWidgets.map(w => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedFooterWidgetId(w.id)}
                    className="px-2.5 py-2 rounded-xl bg-[#151823] border border-[#262a3b] hover:border-amber-500/50 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-zinc-200 truncate">
                      {getWidgetLabel(w.type)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleFooterWidgetVisibility(w.id)}
                        className="p-1 rounded text-zinc-400 hover:text-white"
                      >
                        {w.isHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteWidget(w)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400">
              Agregar Widget a {BAND_LABELS[selectedFooterBand]} ({COL_LABELS[safeSelectedCol]})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {FOOTER_WIDGET_CATALOG.map(item => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addFooterWidget(item.type, selectedFooterBand, safeSelectedCol)}
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

      {/* TAB 2: BANDS STYLING */}
      {subTab === 'bands' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-3 gap-1">
            {(['ribbon', 'main', 'bottom'] as FooterBandId[]).map(bId => (
              <button
                key={bId}
                type="button"
                onClick={() => setSelectedFooterBand(bId)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border ${
                  selectedFooterBand === bId
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#0d0f15] border-[#262a3b] text-zinc-400'
                }`}
              >
                {BAND_LABELS[bId]}
              </button>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-[#151823] border border-[#262a3b] space-y-3">
            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer">
              <span>Activar banda {BAND_LABELS[selectedFooterBand]}</span>
              <input
                type="checkbox"
                checked={activeBandCfg.enabled}
                onChange={e => updateFooterBand(selectedFooterBand, { enabled: e.target.checked })}
                className="accent-amber-500"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Fondo</label>
                <input
                  type="color"
                  value={activeBandCfg.bgColor || '#0b0c10'}
                  onChange={e => updateFooterBand(selectedFooterBand, { bgColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer bg-transparent"
                />
              </div>
              <div>
                <label className={labelCls}>Texto / Íconos</label>
                <input
                  type="color"
                  value={activeBandCfg.textColor || '#e4e4e7'}
                  onChange={e => updateFooterBand(selectedFooterBand, { textColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Columnas (PC)</label>
                <select
                  value={activeBandCfg.columnsDesktop}
                  onChange={e =>
                    updateFooterBand(selectedFooterBand, {
                      columnsDesktop: Number(e.target.value) as 1 | 2 | 3 | 4,
                    })
                  }
                  className={inputCls}
                >
                  <option value={1}>1 Columna</option>
                  <option value={2}>2 Columnas</option>
                  <option value={3}>3 Columnas</option>
                  <option value={4}>4 Columnas</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Padding Y (px)</label>
                <input
                  type="number"
                  min={8}
                  max={96}
                  value={activeBandCfg.paddingY}
                  onChange={e =>
                    updateFooterBand(selectedFooterBand, { paddingY: Number(e.target.value) || 28 })
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Ancho Máx.</label>
              <select
                value={activeBandCfg.maxWidth}
                onChange={e =>
                  updateFooterBand(selectedFooterBand, {
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

            <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
              <span>Borde superior sutil</span>
              <input
                type="checkbox"
                checked={activeBandCfg.showBorderTop}
                onChange={e =>
                  updateFooterBand(selectedFooterBand, { showBorderTop: e.target.checked })
                }
                className="accent-amber-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* TAB 3: FOOTER LIBRARY */}
      {subTab === 'library' && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              const created = createFooterTemplate({
                name: `Footer ${footerTemplates.length + 1}`,
              });
              setActiveEditingFooterId(created.id);
              setSubTab('widgets');
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Footer</span>
          </button>

          <div className="space-y-2">
            {footerTemplates.map(f => {
              const isEditing = f.id === activeEditingFooter.id;
              const isGlobal = f.id === globalFooterId;
              return (
                <div
                  key={f.id}
                  className={`p-3 rounded-xl border transition-all space-y-2 ${
                    isEditing
                      ? 'bg-amber-500/10 border-amber-500'
                      : 'bg-[#151823] border-[#262a3b]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-white truncate">{f.name}</span>
                      {f.description && (
                        <span className="block text-[10px] text-zinc-400 line-clamp-2">
                          {f.description}
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
                        setActiveEditingFooterId(f.id);
                        setSubTab('widgets');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold"
                    >
                      {isEditing ? 'Editando' : 'Editar'}
                    </button>
                    {!isGlobal && (
                      <button
                        type="button"
                        onClick={() => setGlobalFooterId(f.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold"
                      >
                        Fijar Global
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => duplicateFooterTemplate(f.id)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                      title="Duplicar"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {footerTemplates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => confirmDeleteFooter(f.id, f.name)}
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
