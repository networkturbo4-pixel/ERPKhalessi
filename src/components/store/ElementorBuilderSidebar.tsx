import React, { useState } from 'react';
import { useStoreBuilder } from '../../context/StoreBuilderContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { STORE_CATEGORIES, getStoreCategories } from './StorefrontWidgets';
import {
  StoreBlock,
  StoreBlockType,
  SliderBlockConfig,
  SliderSlideItem,
  CategoriesBlockConfig,
  CategoryWidgetStyle,
  ProductGridBlockConfig,
  ProductCardStyle,
  SearchBarBlockConfig,
  PromoStripBlockConfig,
  BlockAdvancedOptions,
  StoreAnimationType,
  getOptimalContrastHex,
} from '../../types/storeBuilder';
import {
  Bell,
  ChevronLeft,
  X,
  LayoutGrid,
  Package,
  Images,
  Search,
  Megaphone,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Hash,
  MoveHorizontal,
  Columns3,
  Smartphone,
  Tablet,
  Monitor,
  Filter,
  Paintbrush,
  Sparkles,
  RotateCcw,
  Upload,
  Layers,
  Palette,
  ChevronDown,
  ChevronRight,
  Check,
  ExternalLink,
} from 'lucide-react';

const AdvancedOptionsAccordion: React.FC<{
  value: BlockAdvancedOptions;
  onChange: (next: BlockAdvancedOptions) => void;
  extraContent?: React.ReactNode;
}> = ({ value, onChange, extraContent }) => {
  return (
    <details className="group rounded-xl border border-[#262936] bg-[#161821] text-zinc-200 overflow-hidden">
      <summary className="list-none cursor-pointer px-3.5 py-3 text-xs font-bold text-zinc-100 flex items-center gap-2 select-none hover:bg-[#1c1f2b] transition-colors">
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 transition-transform group-open:rotate-90 shrink-0" />
        <span>Opciones Avanzadas (Espaciado y Animación)</span>
      </summary>
      <div className="p-3.5 pt-2 border-t border-[#262936] space-y-3 bg-[#12141c]">
        {extraContent}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Pad. Sup (px)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={value.paddingTop}
              onChange={e =>
                onChange({ ...value, paddingTop: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Pad. Inf (px)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={value.paddingBottom}
              onChange={e =>
                onChange({ ...value, paddingBottom: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Margen Inf
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={value.marginBottom}
              onChange={e =>
                onChange({ ...value, marginBottom: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
            Animación de Entrada
          </label>
          <select
            value={value.animation}
            onChange={e =>
              onChange({ ...value, animation: e.target.value as StoreAnimationType })
            }
            className="w-full px-3 py-2 rounded-lg bg-[#0d0f15] border border-[#282c3a] text-xs text-white focus:outline-none focus:border-rose-500"
          >
            <option value="none">Sin Animación</option>
            <option value="fade-in">Suave (Fade In)</option>
            <option value="slide-up">Deslizar hacia arriba (Slide Up)</option>
            <option value="zoom-in">Escala Sutil (Zoom In)</option>
          </select>
        </div>
      </div>
    </details>
  );
};

const DeviceVisibilityChecks: React.FC<{
  onlyMobile: boolean;
  onlyTablet: boolean;
  onlyDesktop: boolean;
  onChange: (partial: {
    onlyMobile?: boolean;
    onlyTablet?: boolean;
    onlyDesktop?: boolean;
  }) => void;
}> = ({ onlyMobile, onlyTablet, onlyDesktop, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#252836] bg-[#161821] hover:border-[#34384b] cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={onlyMobile}
          onChange={e => onChange({ onlyMobile: e.target.checked })}
          className="w-4 h-4 rounded accent-rose-500 cursor-pointer shrink-0"
        />
        <span className="text-xs font-semibold text-zinc-100">Mostrar solo en celulares</span>
      </label>

      <label className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#252836] bg-[#161821] hover:border-[#34384b] cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={onlyTablet}
          onChange={e => onChange({ onlyTablet: e.target.checked })}
          className="w-4 h-4 rounded accent-rose-500 cursor-pointer shrink-0"
        />
        <span className="text-xs font-semibold text-zinc-100">Mostrar solo en tablets</span>
      </label>

      <label className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#252836] bg-[#161821] hover:border-[#34384b] cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={onlyDesktop}
          onChange={e => onChange({ onlyDesktop: e.target.checked })}
          className="w-4 h-4 rounded accent-rose-500 cursor-pointer shrink-0"
        />
        <span className="text-xs font-semibold text-zinc-100">Mostrar solo en computadoras</span>
      </label>
    </div>
  );
};

export const ElementorBuilderSidebar: React.FC = () => {
  const {
    templates,
    activeTemplate,
    selectTemplate,
    updateActiveTemplateMeta,
    resetActiveTemplateToFactory,
    selectedBlockId,
    setSelectedBlockId,
    setIsBuilderOpen,
    addBlock,
    updateBlock,
    moveBlock,
    duplicateBlock,
    removeBlock,
  } = useStoreBuilder();

  const { products } = useOrderCatalog();
  const { openNoticeModal, dispatchToast, customization, updateCustomization } = useSettings();

  const [rootTab, setRootTab] = useState<'widgets' | 'templates'>('widgets');
  const [expandedSlideId, setExpandedSlideId] = useState<string | null>(null);
  const [showProductIdsHelper, setShowProductIdsHelper] = useState(false);

  const selectedBlock = activeTemplate.blocks.find(b => b.id === selectedBlockId) || null;

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      dispatchToast(
        'Imagen muy pesada',
        'Elige una imagen menor a 2.5 MB o pega una URL optimizada.',
        'warning'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoaded(reader.result);
        dispatchToast('Imagen Cargada', 'La imagen se actualizó en la vista seleccionada.', 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const confirmDeleteBlock = (block: StoreBlock) => {
    openNoticeModal({
      title: '¿Eliminar este bloque de la plantilla?',
      message:
        'Esta sección desaparecerá de la tienda virtual actual. Puedes volver a agregar widgets cuando quieras.',
      tone: 'danger',
      confirmLabel: 'Sí, Eliminar Bloque',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        removeBlock(block.id);
        dispatchToast('Bloque Eliminado', 'El widget fue retirado del lienzo.', 'info');
      },
    });
  };

  const confirmResetTemplate = () => {
    openNoticeModal({
      title: '¿Restaurar plantilla de fábrica?',
      message: `Todos los bloques y estilos de "${activeTemplate.name}" volverán a su configuración predeterminada.`,
      tone: 'warning',
      confirmLabel: 'Restaurar Diseño',
      cancelLabel: 'Cancelar',
      onConfirm: () => resetActiveTemplateToFactory(),
    });
  };

  const getBlockMeta = (type: StoreBlockType) => {
    switch (type) {
      case 'slider':
        return {
          label: 'Slider Principal',
          icon: <Images className="w-4 h-4 text-amber-400" />,
        };
      case 'categories':
        return {
          label: 'Categorías',
          icon: <LayoutGrid className="w-4 h-4 text-emerald-400" />,
        };
      case 'product_grid':
        return {
          label: 'Parrilla de Productos',
          icon: <Package className="w-4 h-4 text-blue-400" />,
        };
      case 'search_bar':
        return {
          label: 'Barra de Búsqueda',
          icon: <Search className="w-4 h-4 text-purple-400" />,
        };
      case 'promo_strip':
        return {
          label: 'Cinta Promocional',
          icon: <Megaphone className="w-4 h-4 text-rose-400" />,
        };
    }
  };

  /* ==========================================================================
     INSPECTOR DE BLOQUE SELECCIONADO (Estilo exacto Imágenes 2 y 3)
     ========================================================================== */
  if (selectedBlock) {
    const meta = getBlockMeta(selectedBlock.type);

    return (
      <aside className="w-full lg:w-[360px] xl:w-[380px] shrink-0 bg-[#101117] border-r border-[#242735] text-zinc-100 flex flex-col h-full select-none">
        {/* Top Inspector Header */}
        <div className="px-4 py-3.5 border-b border-[#232634] flex items-center justify-between gap-2 bg-[#12141c]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedBlockId(null)}
              title="Volver a Capas y Widgets"
              className="w-8 h-8 rounded-lg bg-[#1b1e2b] hover:bg-[#25293a] border border-[#2c3042] flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wider text-rose-500 leading-none mb-1">
                CONFIGURACIÓN
              </span>
              <div className="flex items-center gap-1.5">
                {meta.icon}
                <h3 className="text-sm font-black text-white truncate">{meta.label}</h3>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBlockId(null)}
            title="Cerrar configuración de bloque"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1e2130] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {/* ==================== 1. INSPECTOR: CATEGORÍAS (Imagen 2) ==================== */}
          {selectedBlock.type === 'categories' && (() => {
            const blk = selectedBlock as CategoriesBlockConfig;
            const patch = (partial: Partial<CategoriesBlockConfig>) =>
              updateBlock(blk.id, prev => ({ ...(prev as CategoriesBlockConfig), ...partial }));

            const toggleHiddenCategory = (catId: string, multiKey: boolean) => {
              const current = blk.hiddenCategories || [];
              if (multiKey) {
                const exists = current.includes(catId);
                patch({
                  hiddenCategories: exists
                    ? current.filter(id => id !== catId)
                    : [...current, catId],
                });
              } else {
                const exists = current.includes(catId);
                patch({
                  hiddenCategories: exists
                    ? current.filter(id => id !== catId)
                    : [...current, catId],
                });
              }
            };

            return (
              <>
                {/* TÍTULO DEL BLOQUE */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    TÍTULO DEL BLOQUE (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    value={blk.title || ''}
                    onChange={e => patch({ title: e.target.value })}
                    placeholder="Ej: Especiales de la Semana"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* VISIBILIDAD POR DISPOSITIVO */}
                <DeviceVisibilityChecks
                  onlyMobile={blk.onlyMobile}
                  onlyTablet={blk.onlyTablet}
                  onlyDesktop={blk.onlyDesktop}
                  onChange={patch}
                />

                <hr className="border-[#232634]" />

                {/* ESTILO */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    ESTILO
                  </label>
                  <select
                    value={blk.style}
                    onChange={e => patch({ style: e.target.value as CategoryWidgetStyle })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pills">Pastillas (Pills)</option>
                    <option value="cards">Tarjetas con Icono (Cards)</option>
                    <option value="circles">Círculos / Historias</option>
                    <option value="tabs">Pestañas Minimalistas (Tabs)</option>
                    <option value="banners">Banners Fotográficos</option>
                    <option value="glass">Cristal Esmerilado (Glass)</option>
                    <option value="mosaic">Mosaico Visual</option>
                    <option value="minimal_chip">Chip Minimalista</option>
                    <option value="split_badge">Insignia Dividida (Split Badge)</option>
                  </select>
                </div>

                <hr className="border-[#232634]" />

                {/* OCULTAR CATEGORÍAS */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                      <span>OCULTAR CATEGORÍAS</span>
                    </label>
                    {blk.hiddenCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => patch({ hiddenCategories: [] })}
                        className="text-[10px] font-bold text-emerald-400 hover:underline"
                      >
                        Mostrar todas ({blk.hiddenCategories.length} ocultas)
                      </button>
                    )}
                  </div>

                  <div
                    role="listbox"
                    aria-label="Ocultar categorías"
                    aria-multiselectable="true"
                    className="rounded-xl bg-[#161821] border border-[#2c3144] max-h-36 overflow-y-auto divide-y divide-[#202330]"
                  >
                    {getStoreCategories().map(cat => {
                      const isHidden = blk.hiddenCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          role="option"
                          aria-selected={isHidden}
                          onClick={e => toggleHiddenCategory(cat.id, e.ctrlKey || e.metaKey)}
                          className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors ${
                            isHidden
                              ? 'bg-rose-500/20 text-rose-200 font-bold'
                              : 'text-zinc-200 hover:bg-[#1e2230]'
                          }`}
                        >
                          <span>{cat.label}</span>
                          {isHidden && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200">
                              Oculta
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Ctrl+Click o clic directo para seleccionar varias
                  </p>
                </div>

                <hr className="border-[#232634]" />

                {/* MOSTRAR CONTADOR */}
                <label className="flex items-center justify-between cursor-pointer py-0.5">
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    <Hash className="w-3.5 h-3.5 text-zinc-400" />
                    <span>MOSTRAR CONTADOR</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={blk.showCount}
                    onChange={e => patch({ showCount: e.target.checked })}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </label>

                <hr className="border-[#232634]" />

                {/* ESPACIADO */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    <MoveHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                    <span>ESPACIADO ({blk.gapPx}PX)</span>
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={36}
                    step={2}
                    value={blk.gapPx}
                    onChange={e => patch({ gapPx: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <hr className="border-[#232634]" />

                {/* COLUMNAS POR DISPOSITIVO */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <Columns3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>COLUMNAS POR DISPOSITIVO</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Smartphone className="w-3 h-3" /> MÓVIL
                      </span>
                      <select
                        value={String(blk.columnsMobile)}
                        onChange={e =>
                          patch({
                            columnsMobile:
                              e.target.value === 'auto'
                                ? 'auto'
                                : (Number(e.target.value) as 1 | 2 | 3 | 4),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </div>

                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Tablet className="w-3 h-3" /> TABLET
                      </span>
                      <select
                        value={String(blk.columnsTablet)}
                        onChange={e =>
                          patch({
                            columnsTablet:
                              e.target.value === 'auto'
                                ? 'auto'
                                : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                      </select>
                    </div>

                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Monitor className="w-3 h-3" /> PC
                      </span>
                      <select
                        value={String(blk.columnsDesktop)}
                        onChange={e =>
                          patch({
                            columnsDesktop:
                              e.target.value === 'auto'
                                ? 'auto'
                                : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* OPCIONES AVANZADAS */}
                <AdvancedOptionsAccordion
                  value={blk.advanced}
                  onChange={advanced => patch({ advanced })}
                />
              </>
            );
          })()}

          {/* ==================== 2. INSPECTOR: PARRILLA DE PRODUCTOS (Imagen 3) ==================== */}
          {selectedBlock.type === 'product_grid' && (() => {
            const blk = selectedBlock as ProductGridBlockConfig;
            const patch = (partial: Partial<ProductGridBlockConfig>) =>
              updateBlock(blk.id, prev => ({ ...(prev as ProductGridBlockConfig), ...partial }));

            const toggleManualNumber = (numBased1: number) => {
              const tokens = blk.manualIds
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
              const str = String(numBased1);
              const next = tokens.includes(str)
                ? tokens.filter(t => t !== str)
                : [...tokens, str];
              patch({ manualIds: next.join(', ') });
            };

            return (
              <>
                {/* TÍTULO DEL BLOQUE */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    TÍTULO DEL BLOQUE (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    value={blk.title || ''}
                    onChange={e => patch({ title: e.target.value })}
                    placeholder="Ej: Nuestras Promociones"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* VISIBILIDAD POR DISPOSITIVO */}
                <DeviceVisibilityChecks
                  onlyMobile={blk.onlyMobile}
                  onlyTablet={blk.onlyTablet}
                  onlyDesktop={blk.onlyDesktop}
                  onChange={patch}
                />

                <hr className="border-[#232634]" />

                {/* ESTILO DE TARJETA */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    ESTILO DE TARJETA
                  </label>
                  <select
                    value={blk.cardStyle}
                    onChange={e => patch({ cardStyle: e.target.value as ProductCardStyle })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="elegante">Elegante</option>
                    <option value="clasica">Clásica Delivery</option>
                    <option value="compacta">Compacta Horizontal</option>
                    <option value="minimalista">Minimalista</option>
                    <option value="inmersiva">Póster Inmersivo</option>
                    <option value="vitrina">Vitrina Flotante</option>
                    <option value="bento">Bento Grid Moderno</option>
                    <option value="galeria">Galería Editorial Centrada</option>
                    <option value="lista_menu">Carta Trattoria (Menú Pizzería)</option>
                    <option value="neon_promo">Neón Promo Destacado</option>
                  </select>
                </div>

                <hr className="border-[#232634]" />

                {/* COLUMNAS POR DISPOSITIVO */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <Columns3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>COLUMNAS POR DISPOSITIVO</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Smartphone className="w-3 h-3" /> MÓVIL
                      </span>
                      <select
                        value={blk.columnsMobile}
                        onChange={e =>
                          patch({ columnsMobile: Number(e.target.value) as 1 | 2 | 3 | 4 })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                    </div>

                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Tablet className="w-3 h-3" /> TABLET
                      </span>
                      <select
                        value={blk.columnsTablet}
                        onChange={e =>
                          patch({
                            columnsTablet: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                      </select>
                    </div>

                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Monitor className="w-3 h-3" /> PC
                      </span>
                      <select
                        value={blk.columnsDesktop}
                        onChange={e =>
                          patch({
                            columnsDesktop: Number(e.target.value) as
                              | 1
                              | 2
                              | 3
                              | 4
                              | 5
                              | 6
                              | 7
                              | 8,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                        <option value={7}>7</option>
                        <option value={8}>8</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="border-[#232634]" />

                {/* FILTROS Y PAGINACIÓN */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <Filter className="w-3.5 h-3.5" />
                    <span>FILTROS Y PAGINACIÓN</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      CATEGORÍA ESPECÍFICA
                    </label>
                    <select
                      value={blk.categoryFilter}
                      onChange={e =>
                        patch({
                          categoryFilter: e.target.value as ProductGridBlockConfig['categoryFilter'],
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="active_sync">
                        Sincronizada con Categoría Elegida
                      </option>
                      <option value="all">Todas las Categorías</option>
                      <option value="pizzas">Pizzas Artesanales</option>
                      <option value="combos">Promociones / Combos</option>
                      <option value="entradas">Entradas & Alitas</option>
                      <option value="bebidas">Bebidas Heladas</option>
                      <option value="postres">Postres</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        IDS MANUALES (SEPARADOS POR COMA)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowProductIdsHelper(v => !v)}
                        className="text-[10px] font-bold text-amber-400 hover:underline"
                      >
                        {showProductIdsHelper ? 'Ocultar lista' : 'Elegir IDs'}
                      </button>
                    </div>
                    <input
                      type="text"
                      autoCorrect="off"
                      value={blk.manualIds}
                      onChange={e => patch({ manualIds: e.target.value })}
                      placeholder="Ej: 1, 4, 12"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                    {showProductIdsHelper && (
                      <div className="p-2.5 rounded-xl bg-[#141620] border border-[#282c3e] max-h-36 overflow-y-auto space-y-1">
                        {products.map((p, i) => {
                          const num = i + 1;
                          const selected = blk.manualIds
                            .split(',')
                            .map(s => s.trim())
                            .includes(String(num));
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleManualNumber(num)}
                              className={`w-full px-2 py-1 rounded-lg text-left text-[11px] flex items-center justify-between ${
                                selected
                                  ? 'bg-rose-500/20 text-rose-200 font-bold'
                                  : 'text-zinc-300 hover:bg-[#1e2230]'
                              }`}
                            >
                              <span className="truncate">
                                #{num} — {p.name}
                              </span>
                              {selected && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      MÁXIMO DE PRODUCTOS INICIALES
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={blk.maxInitialProducts}
                      onChange={e =>
                        patch({ maxInitialProducts: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <label className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#252836] bg-[#161821] hover:border-[#34384b] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={blk.enableLoadMore}
                      onChange={e => patch({ enableLoadMore: e.target.checked })}
                      className="w-4 h-4 rounded accent-rose-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-semibold text-zinc-100">
                      Habilitar botón &quot;Cargar Más&quot;
                    </span>
                  </label>
                </div>

                <hr className="border-[#232634]" />

                {/* OPCIONES DE DISEÑO */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>OPCIONES DE DISEÑO</span>
                  </div>

                  {(
                    [
                      ['horizontalCarousel', 'Modo Carrusel Horizontal'],
                      ['squareImage', 'Imagen cuadrado completo (1:1)'],
                      ['bleedImages', 'Imágenes "Bleed" (Sin bordes internos)'],
                      ['quickViewButton', 'Botón "Vista Rápida" (Ojo)'],
                      ['showPrice', 'Mostrar precio'],
                      ['showStock', 'Mostrar stock'],
                      ['showDescription', 'Mostrar descripción'],
                      ['showVariants', 'Mostrar características (Variantes)'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#252836] bg-[#161821] hover:border-[#34384b] cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(blk[key])}
                        onChange={e => patch({ [key]: e.target.checked })}
                        className="w-4 h-4 rounded accent-rose-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-semibold text-zinc-100">{label}</span>
                    </label>
                  ))}

                  {blk.squareImage && (
                    <div className="p-3 rounded-xl border border-[#252836] bg-[#14161f] space-y-2 mt-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Ajuste de Imagen Cuadrada
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => patch({ imageFit: 'cover' })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
                            (blk.imageFit || 'cover') === 'cover'
                              ? 'bg-rose-500/20 border-rose-500 text-white font-bold shadow-xs'
                              : 'bg-[#0e1017] border-[#252836] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Cubrir (Cover)
                        </button>
                        <button
                          type="button"
                          onClick={() => patch({ imageFit: 'contain' })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
                            blk.imageFit === 'contain'
                              ? 'bg-rose-500/20 border-rose-500 text-white font-bold shadow-xs'
                              : 'bg-[#0e1017] border-[#252836] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Contener (Contain)
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-tight">
                        {blk.imageFit === 'contain'
                          ? 'Muestra la imagen 100% entera sin ningún recorte.'
                          : 'Llena uniformemente todo el marco cuadrado 1:1.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* OPCIONES AVANZADAS */}
                <AdvancedOptionsAccordion
                  value={blk.advanced}
                  onChange={advanced => patch({ advanced })}
                  extraContent={
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        Espaciado entre Tarjetas ({blk.gapPx}px)
                      </label>
                      <input
                        type="range"
                        min={8}
                        max={36}
                        step={2}
                        value={blk.gapPx}
                        onChange={e => patch({ gapPx: Number(e.target.value) })}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                  }
                />
              </>
            );
          })()}

          {/* ==================== 3. INSPECTOR: SLIDER PRINCIPAL ==================== */}
          {selectedBlock.type === 'slider' && (() => {
            const blk = selectedBlock as SliderBlockConfig;
            const patch = (partial: Partial<SliderBlockConfig>) =>
              updateBlock(blk.id, prev => ({ ...(prev as SliderBlockConfig), ...partial }));

            const updateSlide = (slideId: string, partial: Partial<SliderSlideItem>) => {
              patch({
                slides: blk.slides.map(s => (s.id === slideId ? { ...s, ...partial } : s)),
              });
            };

            const addNewSlide = () => {
              const newSlide: SliderSlideItem = {
                id: `sld-${Date.now()}`,
                badge: '🍕 Nueva Promoción',
                headline: 'Título de la Diapositiva',
                subheadline: 'Describe tu promoción o especialidad al horno de leña.',
                ctaLabel: 'Pedir Ahora',
                overlayOpacity: 58,
                imageDesktop:
                  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=80',
                imageTablet:
                  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
                imageMobile:
                  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80',
                actionType: 'product',
                productId: products[0]?.id || '',
              };
              patch({ slides: [...blk.slides, newSlide] });
              setExpandedSlideId(newSlide.id);
            };

            const removeSlide = (slideId: string) => {
              if (blk.slides.length <= 1) {
                dispatchToast(
                  'Mínimo 1 Slide',
                  'El slider requiere al menos una diapositiva activa.',
                  'warning'
                );
                return;
              }
              patch({ slides: blk.slides.filter(s => s.id !== slideId) });
            };

            const moveSlide = (idx: number, dir: -1 | 1) => {
              const target = idx + dir;
              if (target < 0 || target >= blk.slides.length) return;
              const copy = [...blk.slides];
              const [moved] = copy.splice(idx, 1);
              copy.splice(target, 0, moved);
              patch({ slides: copy });
            };

            return (
              <>
                {/* TÍTULO DEL BLOQUE */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    TÍTULO DEL BLOQUE (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    value={blk.title || ''}
                    onChange={e => patch({ title: e.target.value })}
                    placeholder="Ej: Destacados del Horno"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* VISIBILIDAD POR DISPOSITIVO (Celular / Tablet / PC) */}
                <DeviceVisibilityChecks
                  onlyMobile={blk.onlyMobile}
                  onlyTablet={blk.onlyTablet}
                  onlyDesktop={blk.onlyDesktop}
                  onChange={patch}
                />

                <hr className="border-[#232634]" />

                {/* ESTILO VISUAL Y COLUMNAS DEL SLIDER */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      ESTILO VISUAL DEL SLIDER
                    </label>
                    <select
                      value={blk.visualStyle || 'classic'}
                      onChange={e =>
                        patch({ visualStyle: e.target.value as SliderBlockConfig['visualStyle'] })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="classic">Clásico Degradado Lateral</option>
                      <option value="cinema">Cinema Panorámico Centrado</option>
                      <option value="floating_glass">Cristal Flotante (Floating Glass)</option>
                      <option value="split_card">Tarjeta Dividida (Texto + Foto)</option>
                      <option value="magazine">Editorial / Revista</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      <Columns3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>SLIDES VISIBLES POR DISPOSITIVO</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                          <Smartphone className="w-3 h-3" /> MÓVIL
                        </span>
                        <select
                          value={blk.columnsMobile ?? 1}
                          onChange={e =>
                            patch({ columnsMobile: Number(e.target.value) as 1 | 2 })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>
                      <div>
                        <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                          <Tablet className="w-3 h-3" /> TABLET
                        </span>
                        <select
                          value={blk.columnsTablet ?? 1}
                          onChange={e =>
                            patch({ columnsTablet: Number(e.target.value) as 1 | 2 | 3 })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </div>
                      <div>
                        <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                          <Monitor className="w-3 h-3" /> PC
                        </span>
                        <select
                          value={blk.columnsDesktop ?? 1}
                          onChange={e =>
                            patch({ columnsDesktop: Number(e.target.value) as 1 | 2 | 3 | 4 })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-[#232634]" />

                {/* ALTURA Y ANCHO EN LAS 3 VISTAS */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <Columns3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>ALTURA Y ANCHO POR VISTA</span>
                  </label>

                  {/* ALTURA (PX) */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">
                      ALTURA DEL SLIDER (PX)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-zinc-400 mb-1">
                          <Smartphone className="w-3 h-3" /> Móvil
                        </span>
                        <input
                          type="number"
                          min={160}
                          max={700}
                          step={10}
                          value={blk.heightMobile}
                          onChange={e =>
                            patch({ heightMobile: Math.max(140, Number(e.target.value) || 240) })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white text-center focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-zinc-400 mb-1">
                          <Tablet className="w-3 h-3" /> Tablet
                        </span>
                        <input
                          type="number"
                          min={180}
                          max={800}
                          step={10}
                          value={blk.heightTablet}
                          onChange={e =>
                            patch({ heightTablet: Math.max(160, Number(e.target.value) || 320) })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white text-center focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-zinc-400 mb-1">
                          <Monitor className="w-3 h-3" /> PC
                        </span>
                        <input
                          type="number"
                          min={200}
                          max={900}
                          step={10}
                          value={blk.heightDesktop}
                          onChange={e =>
                            patch({ heightDesktop: Math.max(180, Number(e.target.value) || 400) })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white text-center focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ANCHO (%) */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">
                      ANCHO DEL SLIDER EN CADA VISTA
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['widthMobile', 'Móvil'],
                          ['widthTablet', 'Tablet'],
                          ['widthDesktop', 'PC'],
                        ] as const
                      ).map(([field, label]) => (
                        <div key={field}>
                          <span className="block text-center text-[10px] font-bold text-zinc-400 mb-1">
                            {label}
                          </span>
                          <select
                            value={blk[field]}
                            onChange={e => patch({ [field]: e.target.value })}
                            className="w-full px-2 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="100%">100%</option>
                            <option value="96%">96%</option>
                            <option value="92%">92%</option>
                            <option value="85%">85%</option>
                            <option value="75%">75%</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <hr className="border-[#232634]" />

                {/* CONTROLES DE NAVEGACIÓN Y AUTOPLAY */}
                <div className="space-y-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    REPRODUCCIÓN Y NAVEGACIÓN
                  </span>

                  <label className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[#252836] bg-[#161821] hover:border-[#34384b] cursor-pointer">
                    <span className="text-xs font-semibold text-zinc-100">Activar Autoplay</span>
                    <input
                      type="checkbox"
                      checked={blk.autoplay}
                      onChange={e => patch({ autoplay: e.target.checked })}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                  </label>

                  {blk.autoplay && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#141620] border border-[#242838]">
                      <span className="text-[11px] text-zinc-400 font-semibold">
                        Intervalo Autoplay (segundos)
                      </span>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={blk.autoplaySpeedSec}
                        onChange={e =>
                          patch({ autoplaySpeedSec: Math.max(2, Number(e.target.value) || 5) })
                        }
                        className="w-16 px-2 py-1 rounded-lg bg-[#0d0f15] border border-[#2c3144] text-xs font-bold text-center text-white"
                      />
                    </div>
                  )}

                  <label className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[#252836] bg-[#161821] hover:border-[#34384b] cursor-pointer">
                    <span className="text-xs font-semibold text-zinc-100">
                      Mostrar flechas laterales
                    </span>
                    <input
                      type="checkbox"
                      checked={blk.showArrows}
                      onChange={e => patch({ showArrows: e.target.checked })}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[#252836] bg-[#161821] hover:border-[#34384b] cursor-pointer">
                    <span className="text-xs font-semibold text-zinc-100">
                      Mostrar puntos (paginación)
                    </span>
                    <input
                      type="checkbox"
                      checked={blk.showDots}
                      onChange={e => patch({ showDots: e.target.checked })}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                  </label>
                </div>

                <hr className="border-[#232634]" />

                {/* GESTOR DE SLIDES */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      DIAPOSITIVAS ({blk.slides.length})
                    </span>
                    <button
                      type="button"
                      onClick={addNewSlide}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[11px] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Slide
                    </button>
                  </div>

                  <div className="space-y-2">
                    {blk.slides.map((slide, sIdx) => {
                      const isOpen =
                        expandedSlideId === slide.id ||
                        (expandedSlideId === null && sIdx === 0);

                      return (
                        <div
                          key={slide.id}
                          className="rounded-xl border border-[#272b3a] bg-[#151822] overflow-hidden"
                        >
                          <div className="px-3 py-2.5 flex items-center justify-between gap-2 bg-[#181c28]">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSlideId(isOpen ? '__closed__' : slide.id)
                              }
                              className="flex items-center gap-2 text-left min-w-0 flex-1"
                            >
                              <img
                                src={slide.imageDesktop}
                                alt=""
                                className="w-8 h-8 rounded-md object-cover border border-white/10 shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="block text-[10px] font-bold text-amber-400 uppercase">
                                  Slide #{sIdx + 1}
                                </span>
                                <span className="block text-xs font-bold text-white truncate">
                                  {slide.headline || 'Sin título'}
                                </span>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveSlide(sIdx, -1)}
                                disabled={sIdx === 0}
                                title="Subir slide"
                                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSlide(sIdx, 1)}
                                disabled={sIdx === blk.slides.length - 1}
                                title="Bajar slide"
                                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSlide(slide.id)}
                                title="Eliminar slide"
                                className="p-1 rounded text-zinc-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronDown
                                className={`w-4 h-4 text-zinc-400 transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </div>

                          {isOpen && (
                            <div className="p-3 space-y-3 border-t border-[#252938] bg-[#11131b]">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                                  Etiqueta / Badge Superior
                                </label>
                                <input
                                  type="text"
                                  value={slide.badge || ''}
                                  onChange={e =>
                                    updateSlide(slide.id, { badge: e.target.value })
                                  }
                                  placeholder="Ej: ✨ Promo Artesanal"
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#181b26] border border-[#2a2e3f] text-xs text-white"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                                  Título Principal
                                </label>
                                <input
                                  type="text"
                                  value={slide.headline}
                                  onChange={e =>
                                    updateSlide(slide.id, { headline: e.target.value })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#181b26] border border-[#2a2e3f] text-xs text-white"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                                  Subtítulo
                                </label>
                                <textarea
                                  rows={2}
                                  value={slide.subheadline || ''}
                                  onChange={e =>
                                    updateSlide(slide.id, { subheadline: e.target.value })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#181b26] border border-[#2a2e3f] text-xs text-white resize-none"
                                />
                              </div>

                              {/* IMÁGENES INDEPENDIENTES EN LAS 3 VISTAS */}
                              <div className="space-y-2 pt-1 border-t border-[#222636]">
                                <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400">
                                  Imágenes por Dispositivo (3 Vistas)
                                </span>

                                {(
                                  [
                                    ['imageDesktop', '🖥️ Imagen PC (Desktop)'],
                                    ['imageTablet', '📟 Imagen Tablet'],
                                    ['imageMobile', '📱 Imagen Celular (Móvil)'],
                                  ] as const
                                ).map(([imgField, imgLabel]) => (
                                  <div key={imgField} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold text-zinc-300">
                                        {imgLabel}
                                      </label>
                                      <label className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer">
                                        <Upload className="w-3 h-3" />
                                        <span>Subir archivo</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={e =>
                                            handleImageFileUpload(e, dataUrl =>
                                              updateSlide(slide.id, { [imgField]: dataUrl })
                                            )
                                          }
                                        />
                                      </label>
                                    </div>
                                    <input
                                      type="url"
                                      autoCorrect="off"
                                      value={slide[imgField]}
                                      onChange={e =>
                                        updateSlide(slide.id, { [imgField]: e.target.value })
                                      }
                                      placeholder="https://..."
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#181b26] border border-[#2a2e3f] text-[11px] text-zinc-200"
                                    />
                                  </div>
                                ))}
                              </div>

                              {/* ACCIÓN: ENLACE O ELEGIR PRODUCTO DEL SISTEMA */}
                              <div className="space-y-2 pt-2 border-t border-[#222636]">
                                <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                  Destino / Acción del Slide
                                </span>

                                <select
                                  value={slide.actionType}
                                  onChange={e =>
                                    updateSlide(slide.id, {
                                      actionType: e.target.value as SliderSlideItem['actionType'],
                                    })
                                  }
                                  className="w-full px-2.5 py-2 rounded-lg bg-[#181b26] border border-[#2a2e3f] text-xs font-semibold text-white"
                                >
                                  <option value="none">Solo Informativo (Sin enlace)</option>
                                  <option value="product">
                                    🍕 Elegir Producto del Sistema (Abre Personalizador)
                                  </option>
                                  <option value="url">🔗 Enlace URL Externo o Interno</option>
                                </select>

                                {slide.actionType === 'product' && (
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                                      Producto del Catálogo
                                    </label>
                                    <select
                                      value={slide.productId || ''}
                                      onChange={e =>
                                        updateSlide(slide.id, { productId: e.target.value })
                                      }
                                      className="w-full px-2.5 py-2 rounded-lg bg-[#181b26] border border-emerald-500/40 text-xs font-semibold text-white"
                                    >
                                      <option value="">-- Seleccionar producto --</option>
                                      {products.map(prod => (
                                        <option key={prod.id} value={prod.id}>
                                          {prod.name} (S/ {prod.basePrice.toFixed(2)})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {slide.actionType === 'url' && (
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                                      Enlace URL
                                    </label>
                                    <div className="relative">
                                      <ExternalLink className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                      <input
                                        type="url"
                                        autoCorrect="off"
                                        value={slide.linkUrl || ''}
                                        onChange={e =>
                                          updateSlide(slide.id, { linkUrl: e.target.value })
                                        }
                                        placeholder="https://wa.me/51999888777 o #carta"
                                        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#181b26] border border-[#2a2e3f] text-xs text-white"
                                      />
                                    </div>
                                  </div>
                                )}

                                {slide.actionType !== 'none' && (
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                                      Texto del Botón CTA
                                    </label>
                                    <input
                                      type="text"
                                      value={slide.ctaLabel || ''}
                                      onChange={e =>
                                        updateSlide(slide.id, { ctaLabel: e.target.value })
                                      }
                                      placeholder="Ej: Ordenar Ahora"
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#181b26] border border-[#2a2e3f] text-xs text-white"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* OPCIONES AVANZADAS */}
                <AdvancedOptionsAccordion
                  value={blk.advanced}
                  onChange={advanced => patch({ advanced })}
                  extraContent={
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        Redondeo de Bordes ({blk.borderRadiusPx}px)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={36}
                        step={2}
                        value={blk.borderRadiusPx}
                        onChange={e => patch({ borderRadiusPx: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  }
                />
              </>
            );
          })()}

          {/* ==================== 4. INSPECTOR: BARRA DE BÚSQUEDA ==================== */}
          {selectedBlock.type === 'search_bar' && (() => {
            const blk = selectedBlock as SearchBarBlockConfig;
            const patch = (partial: Partial<SearchBarBlockConfig>) =>
              updateBlock(blk.id, prev => ({ ...(prev as SearchBarBlockConfig), ...partial }));

            return (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    TÍTULO DEL BLOQUE (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    value={blk.title || ''}
                    onChange={e => patch({ title: e.target.value })}
                    placeholder="Ej: ¿Qué deseas ordenar hoy?"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm text-white"
                  />
                </div>

                <DeviceVisibilityChecks
                  onlyMobile={blk.onlyMobile}
                  onlyTablet={blk.onlyTablet}
                  onlyDesktop={blk.onlyDesktop}
                  onChange={patch}
                />

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    TEXTO PLACEHOLDER
                  </label>
                  <input
                    type="text"
                    value={blk.placeholder}
                    onChange={e => patch({ placeholder: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    ESTILO VISUAL
                  </label>
                  <select
                    value={blk.visualStyle}
                    onChange={e =>
                      patch({ visualStyle: e.target.value as SearchBarBlockConfig['visualStyle'] })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs sm:text-sm font-semibold text-white"
                  >
                    <option value="modern">Caja Moderna (Redondeada)</option>
                    <option value="pill">Cápsula Completa (Pill)</option>
                    <option value="minimal">Línea Inferior Minimalista</option>
                    <option value="glass">Cristal Esmerilado (Glass)</option>
                    <option value="hero_banner">Banner Buscador Destacado</option>
                    <option value="elevated_card">Tarjeta Flotante Elevada</option>
                    <option value="neon_outline">Borde Luminoso (Neón)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <Columns3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>COLUMNAS POR DISPOSITIVO</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Smartphone className="w-3 h-3" /> MÓVIL
                      </span>
                      <select
                        value={blk.columnsMobile ?? 1}
                        onChange={e => patch({ columnsMobile: Number(e.target.value) as 1 | 2 })}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Tablet className="w-3 h-3" /> TABLET
                      </span>
                      <select
                        value={blk.columnsTablet ?? 1}
                        onChange={e => patch({ columnsTablet: Number(e.target.value) as 1 | 2 })}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Monitor className="w-3 h-3" /> PC
                      </span>
                      <select
                        value={blk.columnsDesktop ?? 1}
                        onChange={e =>
                          patch({ columnsDesktop: Number(e.target.value) as 1 | 2 | 3 })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                  </div>
                </div>

                <AdvancedOptionsAccordion
                  value={blk.advanced}
                  onChange={advanced => patch({ advanced })}
                />
              </>
            );
          })()}

          {/* ==================== 5. INSPECTOR: CINTA PROMOCIONAL ==================== */}
          {selectedBlock.type === 'promo_strip' && (() => {
            const blk = selectedBlock as PromoStripBlockConfig;
            const patch = (partial: Partial<PromoStripBlockConfig>) =>
              updateBlock(blk.id, prev => ({ ...(prev as PromoStripBlockConfig), ...partial }));

            return (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    ETIQUETA CORTA (BADGE)
                  </label>
                  <input
                    type="text"
                    value={blk.badgeText || ''}
                    onChange={e => patch({ badgeText: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    TÍTULO PRINCIPAL
                  </label>
                  <input
                    type="text"
                    value={blk.title}
                    onChange={e => patch({ title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    SUBTÍTULO
                  </label>
                  <input
                    type="text"
                    value={blk.subtitle}
                    onChange={e => patch({ subtitle: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                  />
                </div>

                <DeviceVisibilityChecks
                  onlyMobile={blk.onlyMobile}
                  onlyTablet={blk.onlyTablet}
                  onlyDesktop={blk.onlyDesktop}
                  onChange={patch}
                />

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    ESTILO VISUAL
                  </label>
                  <select
                    value={blk.visualStyle || 'banner'}
                    onChange={e =>
                      patch({ visualStyle: e.target.value as PromoStripBlockConfig['visualStyle'] })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                  >
                    <option value="banner">Banner Clásico</option>
                    <option value="ticket_coupon">Cupón Recortable (Ticket)</option>
                    <option value="glass_glow">Resplandor Luminoso (Glow)</option>
                    <option value="split_hero">Franja Destacada Amplia</option>
                    <option value="compact_bar">Barra Compacta</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    TONO DE COLOR
                  </label>
                  <select
                    value={blk.bgTone}
                    onChange={e =>
                      patch({ bgTone: e.target.value as PromoStripBlockConfig['bgTone'] })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                  >
                    <option value="amber">Ámbar Fuego</option>
                    <option value="crimson">Rojo Napolitano</option>
                    <option value="emerald">Esmeralda Fresco</option>
                    <option value="dark">Carbón Dorado</option>
                    <option value="royal">Azul Real Intenso</option>
                    <option value="sunset">Degradado Sunset</option>
                    <option value="gold">Oro Premium</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <Columns3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>COLUMNAS POR DISPOSITIVO</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Smartphone className="w-3 h-3" /> MÓVIL
                      </span>
                      <select
                        value={blk.columnsMobile ?? 1}
                        onChange={e => patch({ columnsMobile: Number(e.target.value) as 1 | 2 })}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Tablet className="w-3 h-3" /> TABLET
                      </span>
                      <select
                        value={blk.columnsTablet ?? 1}
                        onChange={e =>
                          patch({ columnsTablet: Number(e.target.value) as 1 | 2 | 3 })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        <Monitor className="w-3 h-3" /> PC
                      </span>
                      <select
                        value={blk.columnsDesktop ?? 1}
                        onChange={e =>
                          patch({ columnsDesktop: Number(e.target.value) as 1 | 2 | 3 | 4 })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    ACCIÓN DEL BOTÓN
                  </label>
                  <select
                    value={blk.actionType}
                    onChange={e =>
                      patch({
                        actionType: e.target.value as PromoStripBlockConfig['actionType'],
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                  >
                    <option value="none">Sin botón</option>
                    <option value="product">Elegir Producto del Sistema</option>
                    <option value="url">Enlace URL</option>
                  </select>

                  {blk.actionType === 'product' && (
                    <select
                      value={blk.productId || ''}
                      onChange={e => patch({ productId: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {blk.actionType === 'url' && (
                    <input
                      type="url"
                      autoCorrect="off"
                      value={blk.linkUrl || ''}
                      onChange={e => patch({ linkUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                    />
                  )}

                  {blk.actionType !== 'none' && (
                    <input
                      type="text"
                      value={blk.ctaLabel || ''}
                      onChange={e => patch({ ctaLabel: e.target.value })}
                      placeholder="Texto del botón (Ej: Ver Promo)"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs text-white"
                    />
                  )}
                </div>

                <AdvancedOptionsAccordion
                  value={blk.advanced}
                  onChange={advanced => patch({ advanced })}
                />
              </>
            );
          })()}

          {/* Bottom Delete Action */}
          <div className="pt-3 border-t border-[#232634]">
            <button
              type="button"
              onClick={() => confirmDeleteBlock(selectedBlock)}
              className="w-full py-2.5 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar este Widget</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  /* ==========================================================================
     PANEL RAÍZ DEL CONSTRUCTOR (CAPAS / WIDGETS Y PLANTILLAS)
     ========================================================================== */
  return (
    <aside className="w-full lg:w-[360px] xl:w-[380px] shrink-0 bg-[#101117] border-r border-[#242735] text-zinc-100 flex flex-col h-full select-none">
      {/* Builder Brand Header */}
      <div className="px-4 py-3.5 border-b border-[#232634] flex items-center justify-between bg-[#12141c]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Constructor Tienda
            </h2>
            <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">
              {activeTemplate.name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsBuilderOpen(false)}
          title="Salir del Constructor"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1d2030] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-2 gap-1.5 bg-[#0d0e14] border-b border-[#232634]">
        <button
          type="button"
          onClick={() => setRootTab('widgets')}
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            rootTab === 'widgets'
              ? 'bg-[#1d2130] text-white shadow border border-[#2f354d]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Widgets ({activeTemplate.blocks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setRootTab('templates')}
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            rootTab === 'templates'
              ? 'bg-[#1d2130] text-white shadow border border-[#2f354d]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-rose-400" />
          <span>Plantillas ({templates.length})</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {rootTab === 'widgets' ? (
          <>
            {/* Active Blocks Stack */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  ESTRUCTURA DE LA PÁGINA
                </span>
                <span className="text-[10px] text-zinc-500">Clic para editar</span>
              </div>

              {activeTemplate.blocks.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-[#2b2f42] text-center text-xs text-zinc-500">
                  Esta plantilla aún no tiene bloques. Agrega un widget abajo para empezar.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTemplate.blocks.map((blk, idx) => {
                    const meta = getBlockMeta(blk.type);
                    const subInfo =
                      blk.type === 'slider'
                        ? `${blk.slides.length} slides • ${blk.heightDesktop}px`
                        : blk.type === 'categories'
                        ? `Estilo: ${blk.style}`
                        : blk.type === 'product_grid'
                        ? `${blk.cardStyle} • ${blk.columnsDesktop} cols PC`
                        : blk.title || 'Activo';

                    return (
                      <div
                        key={blk.id}
                        className="group rounded-xl border border-[#252938] bg-[#161822] hover:border-amber-500/50 p-3 flex items-center justify-between gap-2 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedBlockId(blk.id)}
                          className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#1f2333] border border-[#2d3246] flex items-center justify-center shrink-0">
                            {meta.icon}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-white truncate">
                              {'title' in blk && blk.title ? blk.title : meta.label}
                            </span>
                            <span className="block text-[10px] text-zinc-400 truncate">
                              {subInfo}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveBlock(blk.id, -1)}
                            title="Subir bloque"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#232738] disabled:opacity-25"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeTemplate.blocks.length - 1}
                            onClick={() => moveBlock(blk.id, 1)}
                            title="Bajar bloque"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#232738] disabled:opacity-25"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateBlock(blk.id)}
                            title="Duplicar bloque"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-[#232738]"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDeleteBlock(blk)}
                            title="Eliminar bloque"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-[#232738]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <hr className="border-[#232634]" />

            {/* Add New Widget Palette */}
            <div className="space-y-2.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                + AGREGAR WIDGET AL LIENZO
              </span>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['slider', 'Slider Hero', '3 vistas + Enlace/Prod.', 'border-amber-500/30'],
                    ['categories', 'Categorías', 'Pills, Cards, Círculos', 'border-emerald-500/30'],
                    ['product_grid', 'Productos', 'Parrilla o Carrusel', 'border-blue-500/30'],
                    ['search_bar', 'Buscador', 'Filtro instantáneo', 'border-purple-500/30'],
                    ['promo_strip', 'Cinta Promo', 'Banner CTA directo', 'border-rose-500/30'],
                  ] as const
                ).map(([type, title, desc, accentBorder]) => {
                  const meta = getBlockMeta(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        addBlock(type);
                        dispatchToast(
                          'Widget Agregado',
                          `Se añadió "${title}" a la plantilla activa.`,
                          'success'
                        );
                      }}
                      className={`p-3 rounded-xl bg-[#161822] hover:bg-[#1d2030] border ${accentBorder} text-left transition-all flex flex-col gap-1.5 group`}
                    >
                      <div className="flex items-center justify-between">
                        {meta.icon}
                        <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-white">{title}</span>
                        <span className="block text-[10px] text-zinc-400 leading-tight">
                          {desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* ==================== PESTAÑA DE PLANTILLAS Y ESTILO GLOBAL ==================== */
          <div className="space-y-5">
            <div className="space-y-2.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                ELIGE UNA PLANTILLA EDITABLE
              </span>

              {templates.map(tpl => {
                const isCurrent = tpl.id === activeTemplate.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => selectTemplate(tpl.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                      isCurrent
                        ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                        : 'border-[#262938] bg-[#161822] hover:border-[#373c52]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tpl.accentColor }}
                        />
                        {tpl.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCurrent
                            ? 'bg-amber-500 text-neutral-950'
                            : 'bg-[#222636] text-zinc-300'
                        }`}
                      >
                        {isCurrent ? 'Activa ✓' : tpl.previewBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{tpl.tagline}</p>
                    <div className="text-[10px] text-zinc-500 font-medium">
                      {tpl.blocks.length} bloques configurados • Tema{' '}
                      {tpl.themeMode === 'light' ? 'Claro' : 'Oscuro'}
                    </div>
                  </button>
                );
              })}
            </div>

            <hr className="border-[#232634]" />

            {/* Global Colors & Theme of Active Template */}
            <div className="space-y-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                APARIENCIA DE LA PLANTILLA ACTIVA
              </span>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Modo de Fondo de Tienda
                </label>
                <select
                  value={activeTemplate.themeMode}
                  onChange={e =>
                    updateActiveTemplateMeta({
                      themeMode: e.target.value as 'dark' | 'light',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                >
                  <option value="dark">Oscuro Gourmet (Dark)</option>
                  <option value="light">Claro Editorial (Light)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Estilo del Footer Fiscal
                </label>
                <select
                  value={activeTemplate.footerTheme}
                  onChange={e =>
                    updateActiveTemplateMeta({
                      footerTheme: e.target.value as 'light' | 'dark',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#161821] border border-[#262938] text-xs font-semibold text-white"
                >
                  <option value="light">Blanco Corporativo (Imagen 4)</option>
                  <option value="dark">Oscuro Nocturno</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                  Color Sólido de Acento / Destacados
                </label>
                <div className="flex items-center gap-2">
                  {['#f59e0b', '#e11d48', '#ea580c', '#10b981', '#eab308', '#2563eb'].map(hex => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => updateActiveTemplateMeta({ accentColor: hex })}
                      style={{ backgroundColor: hex }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        activeTemplate.accentColor === hex
                          ? 'border-white scale-110'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={activeTemplate.accentColor}
                    onChange={e => updateActiveTemplateMeta({ accentColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              {/* SOLID BUTTON COLOR & CONTRAST TEXT COLOR */}
              <div className="p-3.5 rounded-2xl border border-[#262a3b] bg-[#151823] space-y-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Botones Sólidos & Contraste (Sin Degradados)
                </span>

                {/* 1. Button Solid Background */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                    Color de Fondo de Botones
                  </label>
                  <div className="flex items-center gap-2">
                    {['#f59e0b', '#e11d48', '#ea580c', '#16a34a', '#18181b', '#ffffff'].map(hex => {
                      const currentBtn = activeTemplate.buttonColor || activeTemplate.accentColor;
                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => {
                            const nextPatch: Parameters<typeof updateActiveTemplateMeta>[0] = {
                              buttonColor: hex,
                            };
                            if (activeTemplate.autoButtonContrast) {
                              nextPatch.buttonTextColor = getOptimalContrastHex(hex);
                            }
                            updateActiveTemplateMeta(nextPatch);
                          }}
                          style={{ backgroundColor: hex }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            currentBtn === hex
                              ? 'border-amber-400 scale-110'
                              : 'border-zinc-700 opacity-85 hover:opacity-100'
                          }`}
                        />
                      );
                    })}
                    <input
                      type="color"
                      value={activeTemplate.buttonColor || activeTemplate.accentColor}
                      onChange={e => {
                        const hex = e.target.value;
                        const nextPatch: Parameters<typeof updateActiveTemplateMeta>[0] = {
                          buttonColor: hex,
                        };
                        if (activeTemplate.autoButtonContrast) {
                          nextPatch.buttonTextColor = getOptimalContrastHex(hex);
                        }
                        updateActiveTemplateMeta(nextPatch);
                      }}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* 2. Button Contrast Foreground Color */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold uppercase text-zinc-400">
                      Color de Contraste (Texto / Íconos)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const bg = activeTemplate.buttonColor || activeTemplate.accentColor;
                        const autoHex = getOptimalContrastHex(bg);
                        updateActiveTemplateMeta({
                          buttonTextColor: autoHex,
                          autoButtonContrast: !activeTemplate.autoButtonContrast,
                        });
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                        activeTemplate.autoButtonContrast
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#1e2231] border-[#2e344b] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {activeTemplate.autoButtonContrast ? 'Auto WCAG ✓' : 'Calcular Auto'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {['#09090b', '#ffffff', '#fef3c7', '#fee2e2', '#dcfce7'].map(fg => {
                      const currentFg = activeTemplate.buttonTextColor || '#09090b';
                      return (
                        <button
                          key={fg}
                          type="button"
                          onClick={() =>
                            updateActiveTemplateMeta({
                              buttonTextColor: fg,
                              autoButtonContrast: false,
                            })
                          }
                          style={{ backgroundColor: fg }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            currentFg === fg && !activeTemplate.autoButtonContrast
                              ? 'border-rose-500 scale-110'
                              : 'border-zinc-600 opacity-85 hover:opacity-100'
                          }`}
                        />
                      );
                    })}
                    <input
                      type="color"
                      value={activeTemplate.buttonTextColor || '#09090b'}
                      onChange={e =>
                        updateActiveTemplateMeta({
                          buttonTextColor: e.target.value,
                          autoButtonContrast: false,
                        })
                      }
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Live Solid Button Contrast Preview */}
                <div
                  style={
                    {
                      '--store-btn-bg': activeTemplate.buttonColor || activeTemplate.accentColor,
                      '--store-btn-fg':
                        activeTemplate.buttonTextColor ||
                        getOptimalContrastHex(
                          activeTemplate.buttonColor || activeTemplate.accentColor
                        ),
                    } as React.CSSProperties
                  }
                  className="pt-1"
                >
                  <div
                    data-auto-contrast={activeTemplate.autoButtonContrast ? 'true' : 'false'}
                    className="store-btn-solid w-full py-2.5 px-4 rounded-xl text-xs font-black text-center shadow-sm"
                  >
                    Vista Previa del Botón • S/ 29.90
                  </div>
                </div>
              </div>

              {/* Toast Position Selector (Live Config for Alerts / Notifications) */}
              <div className="p-3.5 rounded-2xl border border-[#262a3b] bg-[#151823] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" /> Posición de Alertas
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium">No tapa el navbar</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'top-center', label: 'Arriba Centro' },
                    { id: 'top-right', label: 'Arriba Derecha' },
                    { id: 'bottom-center', label: 'Abajo Centro' },
                    { id: 'bottom-right', label: 'Abajo Derecha' },
                  ].map(pos => {
                    const isSelected = customization.toastPosition === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => {
                          updateCustomization({ toastPosition: pos.id as any });
                          dispatchToast(
                            'Ubicación ajustada',
                            `Notificaciones ahora en ${pos.label.toLowerCase()}.`,
                            'info'
                          );
                        }}
                        className={`py-2 px-2.5 rounded-xl text-left text-[11px] font-semibold border transition-all ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-500 text-white'
                            : 'bg-[#181b26] border-[#292d3f] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={confirmResetTemplate}
                className="w-full py-2.5 px-3 rounded-xl border border-[#2c3144] bg-[#161822] hover:bg-[#1e2230] text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restaurar Plantilla Original</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
