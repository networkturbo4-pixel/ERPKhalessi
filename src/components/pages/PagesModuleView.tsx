import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { useStoreBuilder } from '../../context/StoreBuilderContext';
import { useSettings } from '../../context/SettingsContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import QRCode from 'qrcode';
import {
  CustomPage,
  StoreBlock,
  isBlockVisibleOnViewport,
  toProductSlug,
} from '../../types/storeBuilder';
import { StoreBlockRenderer } from '../store/StorefrontWidgets';
import { MediaGalleryModal } from '../media/MediaGalleryModal';
import {
  Plus,
  Search,
  Globe,
  Copy,
  ExternalLink,
  Paintbrush,
  Share2,
  Trash2,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  ArrowUp,
  ArrowDown,
  Edit3,
  Eye,
  EyeOff,
  Check,
  Image as ImageIcon,
  Layers,
  X,
  Undo2,
  Redo2,
  QrCode,
  BarChart3,
  MousePointerClick,
  Download,
} from 'lucide-react';

const ElementorBuilderSidebar = lazy(() =>
  import('../store/ElementorBuilderSidebar').then(m => ({
    default: m.ElementorBuilderSidebar,
  }))
);

const StorefrontFooter = lazy(() =>
  import('../store/StorefrontFooter').then(m => ({
    default: m.StorefrontFooter,
  }))
);

const BLOCK_LABELS: Record<StoreBlock['type'], string> = {
  slider: 'Slider',
  categories: 'Categorías',
  product_grid: 'Parrilla de Productos',
  search_bar: 'Buscador',
  promo_strip: 'Cinta Promo',
  text: 'Texto / Título',
  paragraph: 'Párrafo',
  video: 'Video',
  image: 'Imagen',
  button: 'Botón',
  columns: 'Columnas',
  spacer: 'Espaciador',
  faq: 'Preguntas (FAQ)',
  countdown: 'Contador',
  lead_form: 'Formulario',
};

const QUICK_INSERT_OPTIONS: { type: StoreBlock['type']; label: string }[] = [
  { type: 'text', label: 'Título' },
  { type: 'paragraph', label: 'Párrafo' },
  { type: 'image', label: 'Imagen' },
  { type: 'button', label: 'Botón' },
  { type: 'columns', label: 'Columnas' },
  { type: 'spacer', label: 'Espaciador' },
  { type: 'faq', label: 'FAQ' },
  { type: 'countdown', label: 'Contador' },
  { type: 'lead_form', label: 'Formulario' },
  { type: 'video', label: 'Video' },
];

export const PagesModuleView: React.FC = () => {
  const {
    customPages,
    activeEditingPageId,
    setActiveEditingPageId,
    activeEditingPage,
    createCustomPage,
    updateCustomPage,
    deleteCustomPage,
    duplicateCustomPage,
    generateUniqueSlug,
    previewViewport,
    setPreviewViewport,
    selectedBlockId,
    setSelectedBlockId,
    addBlock,
    moveBlock,
    duplicateBlock,
    removeBlock,
    toggleBlockVisibility,
    canUndo,
    canRedo,
    undo,
    redo,
    setIsBuilderOpen,
  } = useStoreBuilder();

  const { customization, companyInfo, openNoticeModal, dispatchToast, activeTenant } = useSettings();
  const { products, upsertCustomer } = useOrderCatalog();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [quickInsertAfterId, setQuickInsertAfterId] = useState<string | null>(null);

  // QR Code Modal
  const [qrModalPage, setQrModalPage] = useState<CustomPage | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const qrDialogRef = useRef<HTMLDialogElement>(null);

  // Create Page Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newTheme, setNewTheme] = useState<'light' | 'dark'>('light');
  const [newStarter, setNewStarter] = useState<'promo' | 'story' | 'blank'>('promo');
  const createDialogRef = useRef<HTMLDialogElement>(null);

  // Open Graph & Short URL Modal
  const [seoModalPageId, setSeoModalPageId] = useState<string | null>(null);
  const [seoForm, setSeoForm] = useState<{
    title: string;
    slug: string;
    status: 'published' | 'draft';
    showStoreHeader: boolean;
    showStoreFooter: boolean;
    showInStoreNav: boolean;
    showInStoreFooter: boolean;
    navLabel: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogType: 'website' | 'article';
  } | null>(null);
  const [isOgMediaOpen, setIsOgMediaOpen] = useState(false);
  const seoDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = createDialogRef.current;
    if (!dlg) return;
    if (isCreateOpen && !dlg.open) dlg.showModal();
    else if (!isCreateOpen && dlg.open) dlg.close();
  }, [isCreateOpen]);

  useEffect(() => {
    const dlg = seoDialogRef.current;
    if (!dlg) return;
    if (seoModalPageId && !dlg.open) dlg.showModal();
    else if (!seoModalPageId && dlg.open) dlg.close();
  }, [seoModalPageId]);

  useEffect(() => {
    const dlg = qrDialogRef.current;
    if (!dlg) return;
    if (qrModalPage && !dlg.open) dlg.showModal();
    else if (!qrModalPage && dlg.open) dlg.close();
  }, [qrModalPage]);

  // Clean up editing state on unmount
  useEffect(() => {
    return () => {
      setActiveEditingPageId(null);
      setIsBuilderOpen(false);
      setSelectedBlockId(null);
    };
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const buildShortUrl = (slug: string) => `${origin}/p/${slug}`;

  const copyShortUrl = async (slug: string) => {
    const url = buildShortUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      dispatchToast('URL Corta Copiada', url, 'success');
    } catch {
      dispatchToast('URL Lista', url, 'info');
    }
  };

  const openQrModal = async (page: CustomPage) => {
    setQrModalPage(page);
    try {
      const dataUrl = await QRCode.toDataURL(buildShortUrl(page.slug), {
        width: 512,
        margin: 2,
        color: { dark: '#111827', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      dispatchToast('Error al generar QR', 'No se pudo generar el código QR.', 'error');
    }
  };

  const openSeoModal = (page: CustomPage) => {
    setSeoModalPageId(page.id);
    setSeoForm({
      title: page.title,
      slug: page.slug,
      status: page.status,
      showStoreHeader: page.showStoreHeader,
      showStoreFooter: page.showStoreFooter,
      showInStoreNav: Boolean(page.showInStoreNav),
      showInStoreFooter: Boolean(page.showInStoreFooter),
      navLabel: page.navLabel || page.title,
      ogTitle: page.seo.ogTitle || page.title,
      ogDescription: page.seo.ogDescription || '',
      ogImage: page.seo.ogImage || '',
      ogType: page.seo.ogType || 'website',
    });
  };

  const handleSaveSeo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seoModalPageId || !seoForm) return;
    const cleanSlug = generateUniqueSlug(seoForm.slug || seoForm.title, seoModalPageId);
    updateCustomPage(seoModalPageId, {
      title: seoForm.title.trim() || 'Página sin título',
      slug: cleanSlug,
      status: seoForm.status,
      showStoreHeader: seoForm.showStoreHeader,
      showStoreFooter: seoForm.showStoreFooter,
      showInStoreNav: seoForm.showInStoreNav,
      showInStoreFooter: seoForm.showInStoreFooter,
      navLabel: seoForm.navLabel.trim() || seoForm.title.trim(),
      seo: {
        ogTitle: seoForm.ogTitle.trim() || seoForm.title.trim(),
        ogDescription: seoForm.ogDescription.trim(),
        ogImage: seoForm.ogImage.trim(),
        ogType: seoForm.ogType,
      },
    });
    dispatchToast('Open Graph Actualizado', `URL corta: /p/${cleanSlug}`, 'success');
    setSeoModalPageId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createCustomPage({
      title: newTitle || 'Nueva Página',
      slug: newSlug,
      themeMode: newTheme,
      starter: newStarter,
    });
    setIsCreateOpen(false);
    setNewTitle('');
    setNewSlug('');
    setActiveEditingPageId(created.id);
    setIsBuilderOpen(true);
    setSelectedBlockId(created.blocks[0]?.id || null);
  };

  const filteredPages = customPages.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.seo.ogTitle.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  // =========================================================================
  // 1. EMBEDDED PAGE BUILDER WORKSPACE
  // =========================================================================
  if (activeEditingPage) {
    const isLight = activeEditingPage.themeMode === 'light';
    const accent = activeEditingPage.accentColor || customization.primaryColor || '#e11d48';

    const renderPageBlock = (block: StoreBlock, idx: number) => (
      <StoreBlockRenderer
        block={block}
        index={idx}
        viewport={previewViewport}
        themeMode={activeEditingPage.themeMode}
        accentColor={accent}
        autoButtonContrast={Boolean(activeEditingPage.autoButtonContrast)}
        products={products}
        activeCategory="todos"
        searchQuery=""
        onSelectCategory={() => {}}
        onChangeSearch={() => {}}
        onSelectProduct={() => {}}
        onQuickViewProduct={() => {}}
        onSubmitLead={lead => {
          upsertCustomer(
            {
              dni: '',
              fullName: lead.fullName,
              email: lead.email || '',
              whatsapp: lead.phone,
              address: '',
              reference: lead.message
                ? `Lead prueba (/p/${activeEditingPage.slug}): ${lead.message}`
                : `Lead prueba (/p/${activeEditingPage.slug})`,
              tenantId: activeTenant.id,
            },
            true
          );
          dispatchToast('Lead de Prueba Guardado', lead.fullName, 'success');
        }}
      />
    );

    return (
      <div className="flex flex-col h-[calc(100dvh-68px)] bg-[#0b0c10] text-zinc-100 rounded-2xl overflow-hidden border border-zinc-800">
        {/* Top Page Builder Bar */}
        <div className="px-3 sm:px-4 py-2.5 bg-[#10121a] border-b border-[#242838] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                setActiveEditingPageId(null);
                setIsBuilderOpen(false);
                setSelectedBlockId(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#191c28] hover:bg-[#232738] border border-[#2d3247] text-xs font-bold flex items-center gap-1.5 text-zinc-200 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Páginas</span>
            </button>

            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white truncate max-w-[200px]">
                {activeEditingPage.title}
              </p>
              <button
                type="button"
                onClick={() => copyShortUrl(activeEditingPage.slug)}
                className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                title="Copiar URL corta"
              >
                <span>/p/{activeEditingPage.slug}</span>
                <Copy className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Viewport Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#161925] border border-[#272c40]">
            {(
              [
                ['desktop', 'PC', Monitor],
                ['tablet', 'Tablet', Tablet],
                ['mobile', 'Móvil', Smartphone],
              ] as const
            ).map(([vp, label, Icon]) => {
              const active = previewViewport === vp;
              return (
                <button
                  key={vp}
                  type="button"
                  onClick={() => setPreviewViewport(vp)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#161925] border border-[#272c40]">
              <button
                type="button"
                disabled={!canUndo}
                onClick={undo}
                title="Deshacer (Ctrl+Z)"
                className="p-1.5 rounded-lg text-zinc-300 hover:bg-[#232738] hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={redo}
                title="Rehacer (Ctrl+Y)"
                className="p-1.5 rounded-lg text-zinc-300 hover:bg-[#232738] hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => openSeoModal(activeEditingPage)}
              className="px-3 py-1.5 rounded-xl bg-[#191c28] hover:bg-[#232738] border border-[#2d3247] text-xs font-bold text-zinc-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Open Graph & URL</span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateCustomPage(activeEditingPage.id, {
                  status: activeEditingPage.status === 'published' ? 'draft' : 'published',
                })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition-colors ${
                activeEditingPage.status === 'published'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
              }`}
            >
              {activeEditingPage.status === 'published' ? 'Publicada ✓' : 'Borrador'}
            </button>

            <a
              href={`/p/${activeEditingPage.slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir URL</span>
            </a>
          </div>
        </div>

        {/* Split Editor */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <Suspense
            fallback={
              <div className="w-full lg:w-[370px] shrink-0 bg-[#11131c] border-r border-[#24283b] p-4 animate-pulse" />
            }
          >
            <ElementorBuilderSidebar />
          </Suspense>

          <div
            onClick={() => setSelectedBlockId(null)}
            className="flex-1 overflow-y-auto bg-[#08090d] p-3 sm:p-6 flex justify-center items-start"
          >
            <div
              className={`w-full transition-all duration-300 overflow-hidden shadow-2xl ${
                previewViewport === 'mobile'
                  ? 'max-w-[395px] rounded-[32px] border-[6px] border-[#25293a]'
                  : previewViewport === 'tablet'
                  ? 'max-w-[780px] rounded-[24px] border-[4px] border-[#25293a]'
                  : 'max-w-full rounded-xl border border-[#222534]'
              } ${isLight ? 'bg-white text-zinc-900' : 'bg-[#0b0c10] text-white'}`}
            >
              <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-h-[420px]">
                {activeEditingPage.blocks.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-2">
                    <Layers className="w-8 h-8 mx-auto text-zinc-400" />
                    <p className="text-sm font-bold">Tu página está vacía</p>
                    <p className="text-xs text-zinc-500">
                      Agrega widgets de Texto, Párrafo, Imagen, Video o Botón desde el panel izquierdo.
                    </p>
                  </div>
                ) : (
                  activeEditingPage.blocks.map((block, idx) => {
                    const isSelected = selectedBlockId === block.id;
                    const visible = isBlockVisibleOnViewport(block, previewViewport);
                    const isHidden = Boolean(block.advanced.isHidden);
                    const isQuickOpen = quickInsertAfterId === block.id;
                    return (
                      <React.Fragment key={block.id}>
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedBlockId(block.id);
                          }}
                          style={{
                            paddingTop: `${block.advanced.paddingTop}px`,
                            paddingBottom: `${block.advanced.paddingBottom}px`,
                            marginBottom: `${block.advanced.marginBottom}px`,
                          }}
                          className={`relative group/blk rounded-2xl transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-transparent'
                              : 'hover:ring-1 hover:ring-rose-500/50'
                          } ${!visible || isHidden ? 'opacity-40 grayscale' : ''}`}
                        >
                          {/* Floating Block Controls */}
                          <div
                            className={`absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] font-bold shadow-lg transition-opacity ${
                              isSelected
                                ? 'opacity-100 bg-rose-600 border-rose-400 text-white'
                                : 'opacity-0 group-hover/blk:opacity-100 bg-[#12141d] border-[#2c3146] text-zinc-100'
                            }`}
                          >
                            <span className="flex items-center gap-1 pr-1.5 border-r border-white/20">
                              <Edit3 className="w-3 h-3" />
                              <span>{BLOCK_LABELS[block.type]}</span>
                            </span>
                            {(!visible || isHidden) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-amber-300">
                                <EyeOff className="w-3 h-3" /> Oculto
                              </span>
                            )}
                            <button
                              type="button"
                              title={isHidden ? 'Mostrar bloque' : 'Ocultar bloque'}
                              onClick={e => {
                                e.stopPropagation();
                                toggleBlockVisibility(block.id);
                              }}
                              className="p-0.5 hover:text-amber-300"
                            >
                              {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={e => {
                                e.stopPropagation();
                                moveBlock(block.id, -1);
                              }}
                              className="p-0.5 hover:text-amber-300 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === activeEditingPage.blocks.length - 1}
                              onClick={e => {
                                e.stopPropagation();
                                moveBlock(block.id, 1);
                              }}
                              className="p-0.5 hover:text-amber-300 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                duplicateBlock(block.id);
                              }}
                              className="p-0.5 hover:text-amber-300"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                openNoticeModal({
                                  title: '¿Eliminar este bloque?',
                                  message: `Se quitará "${BLOCK_LABELS[block.type]}" de esta página.`,
                                  tone: 'danger',
                                  confirmLabel: 'Eliminar',
                                  cancelLabel: 'Cancelar',
                                  onConfirm: () => removeBlock(block.id),
                                });
                              }}
                              className="p-0.5 hover:text-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {renderPageBlock(block, idx)}
                        </div>

                        {/* Quick + Insert Bar between blocks */}
                        <div
                          onClick={e => e.stopPropagation()}
                          className="relative flex flex-col items-center py-0.5 group/ins"
                        >
                          <button
                            type="button"
                            onClick={() => setQuickInsertAfterId(isQuickOpen ? null : block.id)}
                            title="Insertar bloque aquí"
                            className={`h-6 px-2.5 rounded-full border text-[10px] font-bold flex items-center gap-1 transition-all ${
                              isQuickOpen
                                ? 'bg-rose-600 border-rose-500 text-white opacity-100'
                                : 'bg-[#161925] border-[#2c3146] text-zinc-400 hover:text-white hover:border-rose-500 opacity-35 group-hover/ins:opacity-100'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Insertar bloque</span>
                          </button>

                          {isQuickOpen && (
                            <div className="mt-2 p-2 rounded-2xl bg-[#151822] border border-[#2c3146] shadow-xl flex flex-wrap items-center justify-center gap-1.5 z-30">
                              {QUICK_INSERT_OPTIONS.map(opt => (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() => {
                                    addBlock(opt.type, block.id);
                                    setQuickInsertAfterId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-[#1e2230] hover:bg-rose-600 text-[11px] font-bold text-zinc-200 hover:text-white transition-colors"
                                >
                                  + {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </main>

              {activeEditingPage.showStoreFooter && (
                <Suspense fallback={null}>
                  <StorefrontFooter footerTheme={activeEditingPage.footerTheme} />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. PAGES DIRECTORY VIEW
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="saas-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              CMS & Landing Pages
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Páginas Personalizadas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Construye páginas con el editor visual, genera URLs cortas (<code className="font-mono">/p/...</code>) y personaliza Open Graph para redes sociales.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          style={{ backgroundColor: customization.primaryColor || '#e11d48' }}
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Página</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por título o URL corta..."
            className="saas-input w-full pl-10 pr-4 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {(
            [
              ['all', `Todas (${customPages.length})`],
              ['published', 'Publicadas'],
              ['draft', 'Borradores'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === key
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pages Grid */}
      {filteredPages.length === 0 ? (
        <div className="saas-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-500">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            {customPages.length === 0 ? 'Aún no tienes páginas creadas' : 'Sin resultados'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Crea tu primera landing page para promociones, eventos, carta especial o campañas de redes sociales con URL corta y Open Graph.
          </p>
          {customPages.length === 0 && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: customization.primaryColor || '#e11d48' }}
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera Página</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPages.map(page => (
            <div
              key={page.id}
              className="saas-card overflow-hidden flex flex-col justify-between transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              {/* OG Image Banner Preview */}
              <div className="h-36 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 relative overflow-hidden">
                {page.seo.ogImage ? (
                  <img
                    src={page.seo.ogImage}
                    alt={page.seo.ogTitle || page.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-zinc-400">
                    <ImageIcon className="w-6 h-6 opacity-50" />
                    <span className="text-[11px] font-medium">Sin imagen Open Graph</span>
                  </div>
                )}

                <span
                  className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    page.status === 'published'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-amber-500 text-zinc-950 border-amber-600'
                  }`}
                >
                  {page.status === 'published' ? 'Publicada' : 'Borrador'}
                </span>

                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/70 text-white">
                  {page.blocks.length} bloques
                </span>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3 flex-1">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white truncate">
                    {page.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                    {page.seo.ogDescription || 'Sin descripción Open Graph configurada.'}
                  </p>
                </div>

                {/* Short URL Pill */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                    /p/{page.slug}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyShortUrl(page.slug)}
                      title="Copiar URL corta"
                      className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={`/p/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir en nueva pestaña"
                      className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Basic Analytics */}
                <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5 text-sky-500" />
                    {page.analytics?.views || 0} visitas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-emerald-500" />
                    {page.analytics?.ctaClicks || 0} clics CTA
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 py-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-900/30">
                <button
                  type="button"
                  onClick={() => {
                    setActiveEditingPageId(page.id);
                    setIsBuilderOpen(true);
                    setSelectedBlockId(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Editar Diseño</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openQrModal(page)}
                    title="Descargar Código QR"
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openSeoModal(page)}
                    title="Configurar Open Graph y URL corta"
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateCustomPage(page.id)}
                    title="Duplicar página"
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openNoticeModal({
                        title: '¿Eliminar página?',
                        message: `Se eliminará "${page.title}" (/p/${page.slug}) de forma permanente.`,
                        tone: 'danger',
                        confirmLabel: 'Eliminar',
                        cancelLabel: 'Cancelar',
                        onConfirm: () => deleteCustomPage(page.id),
                      })
                    }
                    title="Eliminar página"
                    className="p-2 rounded-xl border border-rose-200 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* CREATE PAGE MODAL                                                   */}
      {/* =================================================================== */}
      <dialog
        ref={createDialogRef}
        onClose={() => setIsCreateOpen(false)}
        className="w-full max-w-lg bg-transparent p-2 sm:p-4 outline-none backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        {isCreateOpen && (
          <form
            onSubmit={handleCreateSubmit}
            className="saas-card w-full p-6 space-y-4 bg-white dark:bg-[#14151b] text-zinc-900 dark:text-zinc-100"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">Crear Nueva Página</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Título de la Página</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => {
                    setNewTitle(e.target.value);
                    if (!newSlug) {
                      // live preview only
                    }
                  }}
                  placeholder="Ej: Promo 2x1 Fin de Semana"
                  className="saas-input w-full px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  URL Corta (Slug)
                </label>
                <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
                  <span className="px-3 py-2 text-xs font-mono text-zinc-500 border-r border-zinc-200 dark:border-zinc-800">
                    /p/
                  </span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={e => setNewSlug(e.target.value)}
                    placeholder={toProductSlug(newTitle || 'mi-pagina')}
                    className="w-full px-3 py-2 bg-transparent text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Tema Visual</label>
                  <select
                    value={newTheme}
                    onChange={e => setNewTheme(e.target.value as 'light' | 'dark')}
                    className="saas-input w-full px-3 py-2 text-xs"
                  >
                    <option value="light">Claro (Editorial)</option>
                    <option value="dark">Oscuro (Nocturno)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Base Inicial</label>
                  <select
                    value={newStarter}
                    onChange={e =>
                      setNewStarter(e.target.value as 'promo' | 'story' | 'blank')
                    }
                    className="saas-input w-full px-3 py-2 text-xs"
                  >
                    <option value="promo">Landing Promocional</option>
                    <option value="story">Historia + Video</option>
                    <option value="blank">Lienzo en Blanco</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor || '#e11d48' }}
              >
                Crear y Abrir Editor
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* =================================================================== */}
      {/* OPEN GRAPH & SHORT URL MODAL                                        */}
      {/* =================================================================== */}
      <dialog
        ref={seoDialogRef}
        onClose={() => setSeoModalPageId(null)}
        className="w-full max-w-2xl bg-transparent p-2 sm:p-4 outline-none backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        {seoModalPageId && seoForm && (
          <form
            onSubmit={handleSaveSeo}
            className="saas-card w-full p-6 space-y-5 bg-white dark:bg-[#14151b] text-zinc-900 dark:text-zinc-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold">URL Corta y Open Graph</h2>
                <p className="text-xs text-zinc-500">
                  Configura cómo se verá esta página al compartirla por WhatsApp, Facebook, X o Instagram.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeoModalPageId(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Nombre Interno</label>
                <input
                  type="text"
                  required
                  value={seoForm.title}
                  onChange={e => setSeoForm({ ...seoForm, title: e.target.value })}
                  className="saas-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">URL Corta</label>
                <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
                  <span className="px-2.5 py-2 text-xs font-mono text-zinc-500 border-r border-zinc-200 dark:border-zinc-800">
                    /p/
                  </span>
                  <input
                    type="text"
                    required
                    value={seoForm.slug}
                    onChange={e => setSeoForm({ ...seoForm, slug: e.target.value })}
                    className="w-full px-2.5 py-2 bg-transparent text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Título Open Graph (og:title)</label>
                <input
                  type="text"
                  value={seoForm.ogTitle}
                  onChange={e => setSeoForm({ ...seoForm, ogTitle: e.target.value })}
                  placeholder="Título atractivo al compartir"
                  className="saas-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Descripción Open Graph (og:description)
                </label>
                <textarea
                  rows={2}
                  value={seoForm.ogDescription}
                  onChange={e => setSeoForm({ ...seoForm, ogDescription: e.target.value })}
                  placeholder="Resumen breve que aparece debajo del título en redes sociales"
                  className="saas-input w-full px-3 py-2 text-xs resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold">Imagen Open Graph (og:image)</label>
                  <button
                    type="button"
                    onClick={() => setIsOgMediaOpen(true)}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Elegir de Galería
                  </button>
                </div>
                <input
                  type="url"
                  value={seoForm.ogImage}
                  onChange={e => setSeoForm({ ...seoForm, ogImage: e.target.value })}
                  placeholder="https://... (recomendado 1200x630px)"
                  className="saas-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seoForm.showStoreHeader}
                    onChange={e => setSeoForm({ ...seoForm, showStoreHeader: e.target.checked })}
                    className="w-4 h-4 accent-rose-600"
                  />
                  <span>Mostrar barra superior en esta página</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seoForm.showStoreFooter}
                    onChange={e => setSeoForm({ ...seoForm, showStoreFooter: e.target.checked })}
                    className="w-4 h-4 accent-rose-600"
                  />
                  <span>Mostrar footer corporativo en esta página</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seoForm.showInStoreNav}
                    onChange={e => setSeoForm({ ...seoForm, showInStoreNav: e.target.checked })}
                    className="w-4 h-4 accent-rose-600"
                  />
                  <span>Enlazar en Header de Tienda</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seoForm.showInStoreFooter}
                    onChange={e => setSeoForm({ ...seoForm, showInStoreFooter: e.target.checked })}
                    className="w-4 h-4 accent-rose-600"
                  />
                  <span>Enlazar en Footer de Tienda</span>
                </label>
              </div>

              {(seoForm.showInStoreNav || seoForm.showInStoreFooter) && (
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Texto del enlace en Tienda (Nav / Footer)
                  </label>
                  <input
                    type="text"
                    value={seoForm.navLabel}
                    onChange={e => setSeoForm({ ...seoForm, navLabel: e.target.value })}
                    placeholder="Ej. Catering, Nosotros, Promos"
                    className="saas-input w-full px-3 py-2 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Live Social Share Preview */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Vista Previa al Compartir en Redes / WhatsApp
              </span>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900 max-w-md">
                {seoForm.ogImage && (
                  <img
                    src={seoForm.ogImage}
                    alt="OG Preview"
                    className="w-full h-40 object-cover border-b border-zinc-200 dark:border-zinc-800"
                  />
                )}
                <div className="p-3 space-y-0.5">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                    {typeof window !== 'undefined' ? window.location.host : 'tienda.com'}/p/
                    {toProductSlug(seoForm.slug || seoForm.title)}
                  </span>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">
                    {seoForm.ogTitle || seoForm.title || companyInfo.commercialName}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {seoForm.ogDescription || 'Sin descripción configurada.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSeoModalPageId(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor || '#e11d48' }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        )}
      </dialog>

      <MediaGalleryModal
        isOpen={isOgMediaOpen}
        onClose={() => setIsOgMediaOpen(false)}
        onSelect={url => {
          if (seoForm) setSeoForm({ ...seoForm, ogImage: url });
          setIsOgMediaOpen(false);
        }}
      />

      {/* =================================================================== */}
      {/* QR CODE MODAL                                                       */}
      {/* =================================================================== */}
      <dialog
        ref={qrDialogRef}
        onClose={() => setQrModalPage(null)}
        className="w-full max-w-sm bg-transparent p-2 sm:p-4 outline-none backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        {qrModalPage && (
          <div className="saas-card w-full p-6 space-y-4 bg-white dark:bg-[#14151b] text-zinc-900 dark:text-zinc-100 text-center">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold">Código QR</h2>
              <button
                type="button"
                onClick={() => setQrModalPage(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-zinc-200 inline-flex items-center justify-center mx-auto">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR ${qrModalPage.title}`} className="w-52 h-52" />
              ) : (
                <div className="w-52 h-52 animate-pulse bg-zinc-100 rounded-xl" />
              )}
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-extrabold">{qrModalPage.title}</p>
              <p className="text-[11px] font-mono text-zinc-500 break-all">
                {buildShortUrl(qrModalPage.slug)}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setQrModalPage(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Cerrar
              </button>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`qr-${qrModalPage.slug}.png`}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  style={{ backgroundColor: customization.primaryColor || '#e11d48' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PNG</span>
                </a>
              )}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
};
