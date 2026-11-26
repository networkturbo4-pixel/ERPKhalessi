import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Eye,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { OrderItem, Product } from '../../types/catalog';
import { getStoreCategories, ProgressiveStoreImage } from './StorefrontWidgets';

type CategorySortKey = 'featured' | 'price_asc' | 'price_desc';
type CategoryViewMode = 'grid' | 'list';

export interface StoreCategoryViewProps {
  activeCategory: string;
  products: Product[];
  cartItems: OrderItem[];
  isLightTheme: boolean;
  accentColor: string;
  autoButtonContrast: boolean;
  branchName?: string;
  deliveryEtaLabel?: string;
  onSelectCategory: (catId: string) => void;
  onSelectProduct: (product: Product, imgEl?: HTMLImageElement | null) => void;
  onQuickViewProduct: (product: Product) => void;
  onOpenLocationModal?: () => void;
}

const STAGGER_DELAYS_MS = [0, 35, 65, 90, 115, 135, 155, 175];

function getLowestProductPrice(product: Product): number {
  if (product.hasSizes && product.sizes.length > 0) {
    const enabled = product.sizes.filter(s => s.enabled);
    if (enabled.length > 0) {
      return Math.min(...enabled.map(s => s.price));
    }
  }
  return product.basePrice;
}

export const StoreCategoryView: React.FC<StoreCategoryViewProps> = ({
  activeCategory,
  products,
  cartItems,
  isLightTheme,
  accentColor,
  autoButtonContrast,
  branchName,
  deliveryEtaLabel,
  onSelectCategory,
  onSelectProduct,
  onQuickViewProduct,
  onOpenLocationModal,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState<CategorySortKey>('featured');
  const [viewMode, setViewMode] = useState<CategoryViewMode>('grid');

  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSwitcherRef = useRef<HTMLDivElement>(null);
  const [pillRect, setPillRect] = useState<{ left: number; width: number } | null>(null);

  // Reset local search when changing category so users always see the full new category
  useEffect(() => {
    setLocalSearch('');
    setMobileSearchOpen(false);
  }, [activeCategory]);

  // Focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  const allCategories = useMemo(() => getStoreCategories(), []);

  // Precompute available product counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalAvailable = 0;
    for (const p of products) {
      if (!p.isAvailable) continue;
      totalAvailable += 1;
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    counts['todos'] = totalAvailable;
    return counts;
  }, [products]);

  // Map productId -> total units currently in cart
  const cartQtyByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      const pid = item.productId;
      if (pid) {
        map[pid] = (map[pid] || 0) + item.quantity;
      }
    }
    return map;
  }, [cartItems]);

  const activeCatMeta = useMemo(
    () => allCategories.find(c => c.id === activeCategory),
    [allCategories, activeCategory]
  );

  // Measure active pill in horizontal mobile switcher using GPU translate3d
  useEffect(() => {
    const container = mobileSwitcherRef.current;
    if (!container) return;

    const measure = () => {
      const activeBtn = container.querySelector<HTMLButtonElement>('[data-cat-active="true"]');
      if (activeBtn) {
        setPillRect({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
        });
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        setPillRect(null);
      }
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(container);
    return () => ro?.disconnect();
  }, [activeCategory, allCategories.length]);

  // Filtered and sorted products for the active category
  const categoryProducts = useMemo(() => {
    let list = products.filter(p => p.category === activeCategory);

    const q = localSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.badge || '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list].sort((a, b) => {
      // Available items always come before sold-out items
      const availDiff = Number(b.isAvailable) - Number(a.isAvailable);
      if (availDiff !== 0) return availDiff;

      if (sortBy === 'price_asc') {
        return getLowestProductPrice(a) - getLowestProductPrice(b);
      }
      if (sortBy === 'price_desc') {
        return getLowestProductPrice(b) - getLowestProductPrice(a);
      }
      return 0;
    });

    return sorted;
  }, [products, activeCategory, localSearch, sortBy]);

  // Other categories for the bottom "Explora más categorías" discovery shelf
  const otherCategories = useMemo(
    () =>
      allCategories.filter(
        c => c.id !== 'todos' && c.id !== activeCategory && (categoryCounts[c.id] || 0) > 0
      ),
    [allCategories, activeCategory, categoryCounts]
  );

  const availableCount = categoryProducts.filter(p => p.isAvailable).length;
  const displayCount = localSearch.trim() ? categoryProducts.length : availableCount;

  const sortOptions: { id: CategorySortKey; label: string }[] = [
    { id: 'featured', label: 'Destacados' },
    { id: 'price_asc', label: 'Menor precio' },
    { id: 'price_desc', label: 'Mayor precio' },
  ];

  const handleCardSelect = (
    product: Product,
    e: React.MouseEvent<HTMLElement>
  ) => {
    if (!product.isAvailable) return;
    const cardEl = e.currentTarget.closest('[data-cat-card="true"]');
    const img = cardEl?.querySelector('img') as HTMLImageElement | null;
    onSelectProduct(product, img);
  };

  return (
    <section
      aria-label={activeCatMeta?.label || 'Categoría'}
      className="touch-surface w-full"
    >
      {/* ====================================================================
          MOBILE & TABLET NATIVE APP BAR (< lg)
          Translucent frosted glass + swipeable sliding-pill category strip
         ==================================================================== */}
      <div
        className={`lg:hidden sticky top-[56px] sm:top-[64px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2.5 pb-2.5 border-b transition-colors ${
          isLightTheme
            ? 'kh-app-glass-light border-zinc-200/70 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.08)]'
            : 'kh-app-glass-dark border-white/10 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]'
        }`}
      >
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onSelectCategory('todos')}
              aria-label="Volver a toda la carta"
              className={`kh-tactile h-10 w-10 rounded-full flex items-center justify-center border shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isLightTheme
                  ? 'bg-white/90 border-zinc-200/90 text-zinc-900 shadow-xs'
                  : 'bg-white/10 border-white/15 text-white'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1
                  className={`text-[17px] sm:text-xl font-black tracking-[-0.02em] leading-tight truncate ${
                    isLightTheme ? 'text-zinc-950' : 'text-white'
                  }`}
                >
                  {activeCatMeta?.label || 'Categoría'}
                </h1>
              </div>
              <p
                className={`text-[11px] font-medium tabular-nums truncate ${
                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                }`}
              >
                {displayCount} {displayCount === 1 ? 'producto' : 'productos'}
                {branchName ? ` · ${branchName}` : ''}
              </p>
            </div>
          </div>

          {/* Right App Actions: Search Toggle + Grid/List Switch */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(prev => !prev)}
              aria-label={mobileSearchOpen ? 'Cerrar buscador de categoría' : 'Buscar en esta categoría'}
              aria-pressed={mobileSearchOpen}
              className={`kh-tactile h-10 w-10 rounded-full flex items-center justify-center border focus-visible:outline-2 focus-visible:outline-offset-2 ${
                mobileSearchOpen || localSearch
                  ? isLightTheme
                    ? 'bg-zinc-900 border-zinc-900 text-white'
                    : 'bg-white border-white text-zinc-950'
                  : isLightTheme
                  ? 'bg-white/90 border-zinc-200/90 text-zinc-700'
                  : 'bg-white/10 border-white/15 text-zinc-200'
              }`}
            >
              {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setViewMode(prev => (prev === 'grid' ? 'list' : 'grid'))}
              aria-label={viewMode === 'grid' ? 'Cambiar a vista de lista' : 'Cambiar a vista de cuadrícula'}
              className={`kh-tactile h-10 w-10 rounded-full flex items-center justify-center border focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isLightTheme
                  ? 'bg-white/90 border-zinc-200/90 text-zinc-700'
                  : 'bg-white/10 border-white/15 text-zinc-200'
              }`}
            >
              {viewMode === 'grid' ? (
                <List className="w-4 h-4" />
              ) : (
                <LayoutGrid className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Inline Search */}
        {mobileSearchOpen && (
          <div className="mt-2.5 relative">
            <Search
              aria-hidden="true"
              className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
              }`}
            />
            <input
              ref={mobileSearchInputRef}
              type="search"
              enterKeyHint="search"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder={`Buscar en ${activeCatMeta?.label || 'esta categoría'}...`}
              className={`w-full h-11 pl-10 pr-9 rounded-2xl text-base sm:text-sm font-medium border focus:outline-none focus:ring-2 transition-colors ${
                isLightTheme
                  ? 'bg-zinc-100/90 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-400 focus:ring-zinc-900/10'
                  : 'bg-white/10 border-white/15 text-white placeholder:text-neutral-400 focus:bg-white/15 focus:border-white/30 focus:ring-white/10'
              }`}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                aria-label="Limpiar búsqueda"
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center ${
                  isLightTheme ? 'text-zinc-500 hover:bg-zinc-200' : 'text-neutral-300 hover:bg-white/15'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Swipeable Category Switcher with GPU-composited sliding pill */}
        <div
          ref={mobileSwitcherRef}
          role="tablist"
          aria-label="Cambiar de categoría"
          className="kh-snap-strip relative mt-2.5 items-center gap-1.5 pb-0.5"
        >
          {pillRect && (
            <span
              aria-hidden="true"
              style={{
                width: `${pillRect.width}px`,
                transform: `translate3d(${pillRect.left}px, 0, 0)`,
                backgroundColor: accentColor,
                transition:
                  'transform 260ms var(--kh-ease-out), width 260ms var(--kh-ease-out)',
              }}
              className="absolute top-0 bottom-0.5 left-0 rounded-full shadow-xs pointer-events-none"
            />
          )}
          {allCategories.map(cat => {
            const isCurrent = cat.id === activeCategory;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                data-cat-active={isCurrent ? 'true' : undefined}
                onClick={() => onSelectCategory(cat.id)}
                className={`kh-tactile relative z-10 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  isCurrent
                    ? 'text-white border-transparent'
                    : isLightTheme
                    ? 'bg-white/85 border-zinc-200/80 text-zinc-700'
                    : 'bg-white/5 border-white/10 text-zinc-300'
                }`}
              >
                <span aria-hidden="true" className="text-[13px] leading-none">
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
                {cat.id !== 'todos' && count > 0 && (
                  <span
                    className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full leading-none ${
                      isCurrent
                        ? 'bg-black/20 text-white'
                        : isLightTheme
                        ? 'bg-zinc-100 text-zinc-500'
                        : 'bg-white/10 text-neutral-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          DESKTOP 2-PANE APP SHELL (lg+) + UNIFIED MAIN CANVAS
         ==================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-7 pt-3.5 lg:pt-2">
        {/* DESKTOP LEFT STICKY CATEGORY RAIL */}
        <aside
          aria-label="Navegación de categorías"
          className="hidden lg:flex flex-col w-[248px] xl:w-[264px] shrink-0 sticky top-[88px] self-start gap-3"
        >
          <div
            className={`rounded-3xl border p-3 ${
              isLightTheme
                ? 'bg-white border-zinc-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]'
                : 'bg-neutral-900/85 border-white/10'
            }`}
          >
            {/* Back to Full Menu */}
            <button
              type="button"
              onClick={() => onSelectCategory('todos')}
              className={`kh-tactile w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold mb-2 border focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isLightTheme
                  ? 'bg-zinc-50 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100'
                  : 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Toda la carta</span>
            </button>

            <div
              className={`px-3 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${
                isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
              }`}
            >
              Categorías
            </div>

            <nav className="space-y-0.5 max-h-[calc(100dvh-290px)] overflow-y-auto pr-0.5">
              {allCategories
                .filter(c => c.id !== 'todos')
                .map(cat => {
                  const isCurrent = cat.id === activeCategory;
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={() => onSelectCategory(cat.id)}
                      className={`kh-tactile group relative w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        isCurrent
                          ? isLightTheme
                            ? 'bg-zinc-950 text-white font-bold shadow-xs'
                            : 'bg-white text-zinc-950 font-bold shadow-xs'
                          : isLightTheme
                          ? 'text-zinc-700 hover:bg-zinc-100/80 font-semibold'
                          : 'text-zinc-300 hover:bg-white/8 font-semibold'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        {isCurrent && (
                          <span
                            aria-hidden="true"
                            style={{ backgroundColor: accentColor }}
                            className="w-1.5 h-4 rounded-full shrink-0"
                          />
                        )}
                        <span aria-hidden="true" className="text-[15px] leading-none shrink-0">
                          {cat.icon}
                        </span>
                        <span className="truncate">{cat.label}</span>
                      </span>
                      <span
                        className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full shrink-0 ${
                          isCurrent
                            ? isLightTheme
                              ? 'bg-white/15 text-white'
                              : 'bg-black/10 text-zinc-900'
                            : isLightTheme
                            ? 'bg-zinc-100 text-zinc-500'
                            : 'bg-white/8 text-neutral-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
            </nav>
          </div>

          {/* Branch & Delivery Context Pill */}
          {branchName && (
            <button
              type="button"
              onClick={onOpenLocationModal}
              className={`kh-tactile w-full text-left rounded-2xl border px-3.5 py-3 flex items-center justify-between gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isLightTheme
                  ? 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-800'
                  : 'bg-neutral-900/75 border-white/10 hover:border-white/20 text-zinc-200'
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span className="truncate">{branchName}</span>
                </div>
                {deliveryEtaLabel && (
                  <div
                    className={`flex items-center gap-1.5 text-[11px] font-medium ${
                      isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                    }`}
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{deliveryEtaLabel}</span>
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 opacity-45 shrink-0" />
            </button>
          )}
        </aside>

        {/* MAIN CONTENT PANE (PC + Mobile) */}
        <div className="flex-1 min-w-0 space-y-4 lg:space-y-5">
          {/* DESKTOP CATEGORY APP TOOLBAR (lg+) */}
          <div
            className={`hidden lg:flex items-center justify-between gap-4 rounded-3xl border px-5 py-4 ${
              isLightTheme
                ? 'bg-white border-zinc-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]'
                : 'bg-neutral-900/80 border-white/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {activeCatMeta?.icon && (
                <div
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${
                    isLightTheme
                      ? 'bg-zinc-50 border-zinc-200/80'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span aria-hidden="true">{activeCatMeta.icon}</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1
                    className={`text-2xl xl:text-[26px] font-black tracking-[-0.025em] leading-[1.1] truncate ${
                      isLightTheme ? 'text-zinc-950' : 'text-white'
                    }`}
                  >
                    {activeCatMeta?.label || 'Categoría'}
                  </h1>
                  <span
                    className={`text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full shrink-0 ${
                      isLightTheme
                        ? 'bg-zinc-100 text-zinc-600'
                        : 'bg-white/10 text-zinc-300'
                    }`}
                  >
                    {displayCount} {displayCount === 1 ? 'producto' : 'productos'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Controls: Search + Sort Segmented Control + View Toggle */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative w-52 xl:w-64">
                <Search
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                  }`}
                />
                <input
                  type="search"
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder={`Filtrar en ${activeCatMeta?.label || 'categoría'}...`}
                  className={`w-full h-9 pl-8.5 pr-7 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 transition-colors ${
                    isLightTheme
                      ? 'bg-zinc-50 border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-400 focus:ring-zinc-900/10'
                      : 'bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:bg-white/10 focus:border-white/25 focus:ring-white/10'
                  }`}
                />
                {localSearch && (
                  <button
                    type="button"
                    onClick={() => setLocalSearch('')}
                    aria-label="Limpiar filtro"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center ${
                      isLightTheme ? 'text-zinc-500 hover:bg-zinc-200' : 'text-neutral-400 hover:bg-white/15'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Segmented Sort Control */}
              <div
                role="group"
                aria-label="Ordenar productos"
                className={`inline-flex items-center p-1 rounded-xl border ${
                  isLightTheme
                    ? 'bg-zinc-100/90 border-zinc-200/70'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {sortOptions.map(opt => {
                  const active = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSortBy(opt.id)}
                      className={`kh-tactile px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap ${
                        active
                          ? isLightTheme
                            ? 'bg-white text-zinc-950 shadow-xs'
                            : 'bg-white text-zinc-950 shadow-xs'
                          : isLightTheme
                          ? 'text-zinc-600 hover:text-zinc-900'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Grid / List View Switcher */}
              <div
                role="group"
                aria-label="Vista de productos"
                className={`inline-flex items-center p-1 rounded-xl border ${
                  isLightTheme
                    ? 'bg-zinc-100/90 border-zinc-200/70'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <button
                  type="button"
                  aria-label="Vista en cuadrícula"
                  aria-pressed={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                  className={`kh-tactile h-7 w-7 rounded-lg flex items-center justify-center ${
                    viewMode === 'grid'
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : isLightTheme
                      ? 'text-zinc-500 hover:text-zinc-900'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Vista en lista"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                  className={`kh-tactile h-7 w-7 rounded-lg flex items-center justify-center ${
                    viewMode === 'list'
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : isLightTheme
                      ? 'text-zinc-500 hover:text-zinc-900'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* MOBILE COMPACT SORT STRIP (< lg) */}
          <div className="lg:hidden flex items-center justify-between gap-2">
            <div className="kh-snap-strip items-center gap-1.5 flex-1">
              <span
                aria-hidden="true"
                className={`inline-flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${
                  isLightTheme ? 'bg-zinc-100 text-zinc-500' : 'bg-white/8 text-neutral-400'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </span>
              {sortOptions.map(opt => {
                const active = sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSortBy(opt.id)}
                    className={`kh-tactile px-3 h-8 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                      active
                        ? isLightTheme
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-white border-white text-zinc-950'
                        : isLightTheme
                        ? 'bg-white border-zinc-200/90 text-zinc-600'
                        : 'bg-white/5 border-white/10 text-neutral-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================================================================
              PRODUCTS GRID OR LIST
             ================================================================ */}
          {categoryProducts.length === 0 ? (
            <div
              className={`rounded-3xl border p-8 sm:p-10 text-center space-y-3 ${
                isLightTheme
                  ? 'bg-white border-zinc-200/80 text-zinc-800'
                  : 'bg-neutral-900/70 border-white/10 text-zinc-200'
              }`}
            >
              <p className="text-base font-black tracking-tight">
                {localSearch.trim()
                  ? `Sin resultados para "${localSearch.trim()}"`
                  : 'No hay productos disponibles en esta categoría'}
              </p>
              <p
                className={`text-xs max-w-sm mx-auto ${
                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                }`}
              >
                {localSearch.trim()
                  ? 'Prueba con otro término o revisa todos los platos de esta sección.'
                  : 'Puedes explorar otras categorías o cambiar de sucursal.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {localSearch.trim() ? (
                  <button
                    type="button"
                    onClick={() => setLocalSearch('')}
                    data-no-doodle="true"
                    data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                    className="store-btn-solid kh-tactile px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap"
                  >
                    Limpiar búsqueda
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectCategory('todos')}
                      data-no-doodle="true"
                      data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                      className="store-btn-solid kh-tactile px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap"
                    >
                      Ver toda la carta
                    </button>
                    {onOpenLocationModal && (
                      <button
                        type="button"
                        onClick={onOpenLocationModal}
                        className={`kh-tactile px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap ${
                          isLightTheme
                            ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                            : 'bg-white/5 border-white/15 text-zinc-200 hover:bg-white/10'
                        }`}
                      >
                        Cambiar sucursal
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : viewMode === 'list' ? (
            /* NATIVE APP HORIZONTAL SPLIT LIST (Rappi / Apple Store style) */
            <div
              key={`${activeCategory}-list`}
              className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-3.5"
            >
              {categoryProducts.map((product, idx) => {
                const lowestPrice = getLowestProductPrice(product);
                const enabledSizes = product.hasSizes
                  ? product.sizes.filter(s => s.enabled).map(s => s.name)
                  : [];
                const inCartQty = cartQtyByProduct[product.id] || 0;
                const isUnavailable = !product.isAvailable;
                const delay = STAGGER_DELAYS_MS[Math.min(idx, STAGGER_DELAYS_MS.length - 1)];

                return (
                  <article
                    key={product.id}
                    data-cat-card="true"
                    style={{ animationDelay: `${delay}ms` }}
                    onClick={e => handleCardSelect(product, e)}
                    className={`kh-cat-card kh-cat-enter group relative rounded-2xl sm:rounded-3xl border p-3 sm:p-3.5 flex items-center gap-3.5 ${
                      isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isLightTheme
                        ? 'bg-white border-zinc-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.12)] hover:border-zinc-300/90 text-zinc-950'
                        : 'bg-neutral-900/90 border-white/10 hover:border-white/20 text-white'
                    }`}
                  >
                    {/* Left Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-2">
                      <div className="space-y-1">
                        {(product.badge || inCartQty > 0 || isUnavailable) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {product.badge && !isUnavailable && (
                              <span
                                style={{ backgroundColor: accentColor }}
                                className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide text-white"
                              >
                                {product.badge}
                              </span>
                            )}
                            {inCartQty > 0 && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                                  isLightTheme
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                <ShoppingBag className="w-2.5 h-2.5" />
                                {inCartQty} en carrito
                              </span>
                            )}
                            {isUnavailable && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-600 dark:bg-neutral-800 dark:text-neutral-400">
                                Agotado
                              </span>
                            )}
                          </div>
                        )}

                        <h2 className="text-sm sm:text-[15px] font-extrabold tracking-[-0.015em] leading-snug line-clamp-2">
                          {product.name}
                        </h2>

                        {product.description && (
                          <p
                            className={`text-xs leading-relaxed line-clamp-2 ${
                              isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                            }`}
                          >
                            {product.description}
                          </p>
                        )}

                        {enabledSizes.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {enabledSizes.slice(0, 3).map(sz => (
                              <span
                                key={sz}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                  isLightTheme
                                    ? 'bg-zinc-100 text-zinc-600'
                                    : 'bg-white/8 text-neutral-300'
                                }`}
                              >
                                {sz}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-baseline gap-1.5">
                          {product.hasSizes && (
                            <span
                              className={`text-[10px] font-semibold ${
                                isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                              }`}
                            >
                              Desde
                            </span>
                          )}
                          <span
                            className="text-[15px] sm:text-base font-black tabular-nums tracking-tight"
                            style={{ color: accentColor }}
                          >
                            S/ {lowestPrice.toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isUnavailable}
                          onClick={e => {
                            e.stopPropagation();
                            handleCardSelect(product, e);
                          }}
                          data-no-doodle="true"
                          data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                          className={`kh-tactile inline-flex items-center gap-1 px-3.5 h-9 rounded-full text-xs font-black whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            isUnavailable
                              ? isLightTheme
                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                              : 'store-btn-solid shadow-xs'
                          }`}
                        >
                          {isUnavailable ? (
                            <span>Agotado</span>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Elegir</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Right Photography */}
                    <div
                      className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 ${
                        isLightTheme ? 'bg-zinc-100' : 'bg-neutral-800'
                      }`}
                    >
                      <ProgressiveStoreImage
                        src={product.imageUrl}
                        alt={product.name}
                        width={224}
                        height={224}
                        isLightTheme={isLightTheme}
                        lazyLoad={idx >= 6}
                        fetchPriority={idx < 4 ? 'high' : undefined}
                        className="kh-cat-card-img w-full h-full object-cover"
                      />
                      {!isUnavailable && (
                        <button
                          type="button"
                          aria-label={`Vista rápida de ${product.name}`}
                          onClick={e => {
                            e.stopPropagation();
                            onQuickViewProduct(product);
                          }}
                          className="kh-cat-card-quick kh-tactile absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/65 backdrop-blur-md text-white flex items-center justify-center border border-white/15 focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* APP-GRADE RESPONSIVE PRODUCT GRID (2 cols mobile, 3-4 cols PC) */
            <div
              key={`${activeCategory}-grid`}
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
            >
              {categoryProducts.map((product, idx) => {
                const lowestPrice = getLowestProductPrice(product);
                const enabledSizes = product.hasSizes
                  ? product.sizes.filter(s => s.enabled).map(s => s.name)
                  : [];
                const inCartQty = cartQtyByProduct[product.id] || 0;
                const isUnavailable = !product.isAvailable;
                const delay = STAGGER_DELAYS_MS[Math.min(idx, STAGGER_DELAYS_MS.length - 1)];

                return (
                  <article
                    key={product.id}
                    data-cat-card="true"
                    style={{ animationDelay: `${delay}ms` }}
                    onClick={e => handleCardSelect(product, e)}
                    className={`kh-cat-card kh-cat-enter group relative rounded-2xl sm:rounded-3xl border overflow-hidden flex flex-col justify-between ${
                      isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isLightTheme
                        ? 'bg-white border-zinc-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_14px_32px_-12px_rgba(0,0,0,0.14)] hover:border-zinc-300/90 text-zinc-950'
                        : 'bg-neutral-900/90 border-white/10 hover:border-white/20 text-white'
                    }`}
                  >
                    {/* Top Photography Frame */}
                    <div>
                      <div
                        className={`relative aspect-[4/3] w-full overflow-hidden ${
                          isLightTheme ? 'bg-zinc-100' : 'bg-neutral-800'
                        }`}
                      >
                        <ProgressiveStoreImage
                          src={product.imageUrl}
                          alt={product.name}
                          width={480}
                          height={360}
                          isLightTheme={isLightTheme}
                          lazyLoad={idx >= 8}
                          fetchPriority={idx < 4 ? 'high' : undefined}
                          className="kh-cat-card-img w-full h-full object-cover"
                        />

                        {/* Top-left Status / Badge */}
                        <div className="absolute top-2 left-2 right-10 flex items-center gap-1.5 flex-wrap pointer-events-none">
                          {product.badge && !isUnavailable && (
                            <span
                              style={{ backgroundColor: accentColor }}
                              className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide text-white shadow-xs"
                            >
                              {product.badge}
                            </span>
                          )}
                          {isUnavailable && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-black/75 backdrop-blur-md text-white">
                              Agotado
                            </span>
                          )}
                        </div>

                        {/* Top-right Quick View Button (revealed on hover/focus on PC, always visible on touch) */}
                        {!isUnavailable && (
                          <button
                            type="button"
                            aria-label={`Vista rápida de ${product.name}`}
                            onClick={e => {
                              e.stopPropagation();
                              onQuickViewProduct(product);
                            }}
                            className="kh-cat-card-quick kh-tactile absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/15 focus-visible:outline-2 focus-visible:outline-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Live In-Cart Pill on image bottom-left */}
                        {inCartQty > 0 && (
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tabular-nums shadow-sm">
                            <ShoppingBag className="w-2.5 h-2.5" />
                            <span>{inCartQty}</span>
                          </span>
                        )}

                        {/* Mobile Floating Quick-Add Circle Button */}
                        {!isUnavailable && (
                          <button
                            type="button"
                            aria-label={`Agregar ${product.name}`}
                            onClick={e => {
                              e.stopPropagation();
                              handleCardSelect(product, e);
                            }}
                            data-no-doodle="true"
                            data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                            className="sm:hidden store-btn-solid kh-tactile absolute bottom-2 right-2 h-9 w-9 rounded-full flex items-center justify-center shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-3 sm:p-4 pb-2 sm:pb-2.5 space-y-1.5">
                        <h2 className="text-[13px] sm:text-[15px] font-extrabold tracking-[-0.015em] leading-snug line-clamp-2">
                          {product.name}
                        </h2>

                        {product.description && (
                          <p
                            className={`hidden sm:line-clamp-2 text-xs leading-relaxed ${
                              isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                            }`}
                          >
                            {product.description}
                          </p>
                        )}

                        {enabledSizes.length > 0 && (
                          <div className="hidden sm:flex flex-wrap gap-1 pt-0.5">
                            {enabledSizes.slice(0, 3).map(sz => (
                              <span
                                key={sz}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                  isLightTheme
                                    ? 'bg-zinc-100 text-zinc-600'
                                    : 'bg-white/8 text-neutral-300'
                                }`}
                              >
                                {sz}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Price + Desktop CTA */}
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        {product.hasSizes && (
                          <span
                            className={`block text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5 ${
                              isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                            }`}
                          >
                            Desde
                          </span>
                        )}
                        <span
                          className="text-sm sm:text-[17px] font-black tabular-nums tracking-tight whitespace-nowrap"
                          style={{ color: accentColor }}
                        >
                          S/ {lowestPrice.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isUnavailable}
                        onClick={e => {
                          e.stopPropagation();
                          handleCardSelect(product, e);
                        }}
                        data-no-doodle="true"
                        data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                        className={`hidden sm:inline-flex kh-tactile items-center gap-1 px-3.5 h-9 rounded-full text-xs font-black whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          isUnavailable
                            ? isLightTheme
                              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            : 'store-btn-solid shadow-xs'
                        }`}
                      >
                        {isUnavailable ? (
                          <span>Agotado</span>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Elegir</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ================================================================
              EXPLORE OTHER CATEGORIES SHELF (Eliminates dead-end whitespace)
             ================================================================ */}
          {otherCategories.length > 0 && (
            <div className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2
                  className={`text-sm sm:text-base font-black tracking-[-0.015em] ${
                    isLightTheme ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  Explora más categorías
                </h2>
                <button
                  type="button"
                  onClick={() => onSelectCategory('todos')}
                  className={`kh-tactile text-xs font-bold inline-flex items-center gap-0.5 ${
                    isLightTheme ? 'text-zinc-500 hover:text-zinc-900' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>Ver carta completa</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="kh-snap-strip gap-3 pb-1">
                {otherCategories.map(cat => {
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSelectCategory(cat.id)}
                      className={`kh-cat-card kh-tactile group flex items-center gap-3 p-2 pr-4 rounded-2xl border shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        isLightTheme
                          ? 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-900 shadow-xs'
                          : 'bg-neutral-900/85 border-white/10 hover:border-white/20 text-white'
                      }`}
                    >
                      <div
                        className={`relative h-12 w-12 rounded-xl overflow-hidden shrink-0 ${
                          isLightTheme ? 'bg-zinc-100' : 'bg-neutral-800'
                        }`}
                      >
                        <ProgressiveStoreImage
                          src={cat.bannerImg}
                          alt={cat.label}
                          width={96}
                          height={96}
                          isLightTheme={isLightTheme}
                          lazyLoad
                          className="kh-cat-card-img w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-[13px] font-extrabold leading-tight truncate max-w-[140px]">
                          {cat.label}
                        </div>
                        <div
                          className={`text-[11px] font-medium tabular-nums mt-0.5 ${
                            isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                          }`}
                        >
                          {count} {count === 1 ? 'producto' : 'productos'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
