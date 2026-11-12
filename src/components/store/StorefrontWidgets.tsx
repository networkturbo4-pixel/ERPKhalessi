import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, ProductCategoryItem } from '../../types/catalog';
import {
  SliderBlockConfig,
  CategoriesBlockConfig,
  ProductGridBlockConfig,
  SearchBarBlockConfig,
  PromoStripBlockConfig,
  BuilderViewport,
  StoreAnimationType,
} from '../../types/storeBuilder';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Eye,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export interface StoreCategoryDef {
  id: string;
  label: string;
  icon: string;
  bannerImg: string;
}

export const STORE_CATEGORIES: StoreCategoryDef[] = [
  {
    id: 'todos',
    label: 'Todos',
    icon: '✨',
    bannerImg: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'pizzas',
    label: 'Pizzas Artesanales',
    icon: '🍕',
    bannerImg: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'combos',
    label: 'Combos & Promos',
    icon: '🔥',
    bannerImg: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'entradas',
    label: 'Entradas & Alitas',
    icon: '🥖',
    bannerImg: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'bebidas',
    label: 'Bebidas Heladas',
    icon: '🥤',
    bannerImg: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'postres',
    label: 'Postres',
    icon: '🍰',
    bannerImg: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=400&q=80',
  },
];

export function getStoreCategories(): StoreCategoryDef[] {
  try {
    const raw = localStorage.getItem('kh_product_categories_v1');
    if (raw) {
      const parsed: ProductCategoryItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return [
          {
            id: 'todos',
            label: 'Todos',
            icon: '✨',
            bannerImg: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
          },
          ...parsed.map((c) => {
            const fallback = STORE_CATEGORIES.find((sc) => sc.id === c.id);
            return {
              id: c.id,
              label: c.name,
              icon: c.icon || fallback?.icon || '🏷️',
              bannerImg:
                c.imageUrl ||
                fallback?.bannerImg ||
                'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
            };
          }),
        ];
      }
    }
  } catch {
    // fallback
  }
  return STORE_CATEGORIES;
}

export function getAnimationClass(anim: StoreAnimationType): string {
  switch (anim) {
    case 'fade-in':
      return 'animate-in fade-in duration-500';
    case 'slide-up':
      return 'animate-in fade-in slide-in-from-bottom-3 duration-500';
    case 'zoom-in':
      return 'animate-in fade-in zoom-in-95 duration-500';
    default:
      return '';
  }
}

/* ============================================================================
   0. PROGRESSIVE STORE IMAGE (Zero abrupt pop-in + instant cache detection)
   ============================================================================ */
interface ProgressiveStoreImageProps {
  src: string;
  alt: string;
  className?: string;
  isLightTheme?: boolean;
  lazyLoad?: boolean;
  width?: number;
  height?: number;
}

const ProgressiveStoreImage: React.FC<ProgressiveStoreImageProps> = ({
  src,
  alt,
  className = '',
  isLightTheme = false,
  lazyLoad = true,
  width,
  height,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  return (
    <>
      {!loaded && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 animate-pulse pointer-events-none ${
            isLightTheme ? 'bg-zinc-200/80' : 'bg-neutral-800/80'
          }`}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={lazyLoad ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`${className} transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
};

/* ============================================================================
   1. SLIDER WIDGET (Native Scroll-Snap + Accessible Controls + 3-View Images)
   ============================================================================ */
interface StoreSliderWidgetProps {
  block: SliderBlockConfig;
  viewport: BuilderViewport;
  isLightTheme: boolean;
  accentColor: string;
  autoButtonContrast?: boolean;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  isHero?: boolean;
}

export const StoreSliderWidget: React.FC<StoreSliderWidgetProps> = ({
  block,
  viewport,
  isLightTheme,
  accentColor,
  autoButtonContrast = false,
  products,
  onSelectProduct,
  isHero = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const pendingTargetRef = useRef<number | null>(null);
  const settledIdxRef = useRef<number>(0);

  const [activeIdx, setActiveIdx] = useState(0);
  const [settledAnnouncement, setSettledAnnouncement] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const slides = block.slides;

  const resolvedHeight =
    viewport === 'mobile'
      ? block.heightMobile
      : viewport === 'tablet'
      ? block.heightTablet
      : block.heightDesktop;

  const resolvedWidth =
    viewport === 'mobile'
      ? block.widthMobile
      : viewport === 'tablet'
      ? block.widthTablet
      : block.widthDesktop;

  const resolvedSliderCols = Math.max(
    1,
    viewport === 'mobile'
      ? block.columnsMobile || 1
      : viewport === 'tablet'
      ? block.columnsTablet || 1
      : block.columnsDesktop || 1
  );

  const sliderStyle = block.visualStyle || 'classic';

  const scrollToSlide = (targetIndex: number) => {
    const track = trackRef.current;
    if (!track || slides.length === 0) return;
    const bounded = ((targetIndex % slides.length) + slides.length) % slides.length;
    const slideEl = track.children[bounded] as HTMLElement | undefined;
    if (!slideEl) return;

    pendingTargetRef.current = bounded;
    setActiveIdx(bounded);

    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    const slideCenter = slideEl.offsetLeft + slideEl.offsetWidth / 2;
    const delta = slideCenter - trackCenter;
    track.scrollBy({ left: delta });
  };

  // Wire scroll (rAF-throttled live marker) + scrollend / debounced scroll settle
  useEffect(() => {
    const track = trackRef.current;
    if (!track || slides.length <= 1) return;

    let rafId = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const supportsScrollEnd = 'onscrollend' in window;

    const findNearestIndex = () => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < track.children.length; i += 1) {
        const el = track.children[i] as HTMLElement;
        const elCenter = el.offsetLeft + el.offsetWidth / 2;
        const dist = Math.abs(elCenter - center);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const handleSettle = () => {
      pendingTargetRef.current = null;
      const nearest = findNearestIndex();
      setActiveIdx(nearest);
      if (nearest !== settledIdxRef.current) {
        settledIdxRef.current = nearest;
        setSettledAnnouncement(`Diapositiva ${nearest + 1} de ${slides.length}`);
      }
    };

    const handleScroll = () => {
      if (pendingTargetRef.current === null && !rafId) {
        rafId = window.requestAnimationFrame(() => {
          rafId = 0;
          const nearest = findNearestIndex();
          setActiveIdx(prev => (prev === nearest ? prev : nearest));
        });
      }
      if (!supportsScrollEnd) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleSettle, 140);
      }
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    if (supportsScrollEnd) {
      track.addEventListener('scrollend', handleSettle);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (debounceTimer) clearTimeout(debounceTimer);
      track.removeEventListener('scroll', handleScroll);
      if (supportsScrollEnd) {
        track.removeEventListener('scrollend', handleSettle);
      }
    };
  }, [slides.length]);

  // Autoplay loop
  useEffect(() => {
    if (!block.autoplay || isPaused || slides.length <= 1) return;
    const ms = Math.max(2, block.autoplaySpeedSec || 5) * 1000;
    const id = setInterval(() => {
      const base = pendingTargetRef.current ?? activeIdx;
      scrollToSlide((base + 1) % slides.length);
    }, ms);
    return () => clearInterval(id);
  }, [block.autoplay, block.autoplaySpeedSec, isPaused, slides.length, activeIdx]);

  if (slides.length === 0) return null;

  const handleSlideTrigger = (slide: SliderBlockConfig['slides'][number]) => {
    if (slide.actionType === 'product' && slide.productId) {
      const targetProd = products.find(p => p.id === slide.productId);
      if (targetProd) {
        onSelectProduct(targetProd);
      }
    } else if (slide.actionType === 'url' && slide.linkUrl) {
      window.open(slide.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={block.title || 'Destacados promocionales'}
      style={{
        paddingTop: `${block.advanced.paddingTop}px`,
        paddingBottom: `${block.advanced.paddingBottom}px`,
        marginBottom: `${block.advanced.marginBottom}px`,
      }}
      className={getAnimationClass(block.advanced.animation)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {block.title && (
        <h3
          className={`text-lg sm:text-xl font-black mb-3 tracking-tight ${
            isLightTheme ? 'text-zinc-900' : 'text-white'
          }`}
        >
          {block.title}
        </h3>
      )}

      <div
        className="relative mx-auto overflow-hidden shadow-xl"
        style={{
          width: resolvedWidth || '100%',
          maxWidth: '100%',
          borderRadius: `${block.borderRadiusPx ?? 20}px`,
        }}
      >
        {/* Previous / Next Controls placed BEFORE track in DOM order */}
        {block.showArrows && slides.length > 1 && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between px-3 sm:px-4">
            <button
              type="button"
              aria-label="Diapositiva anterior"
              onClick={() => {
                const base = pendingTargetRef.current ?? activeIdx;
                scrollToSlide(base - 1);
              }}
              className="pointer-events-auto h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/85 text-zinc-900 border border-zinc-200/80 shadow-md flex items-center justify-center transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              style={{ touchAction: 'manipulation' }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Diapositiva siguiente"
              onClick={() => {
                const base = pendingTargetRef.current ?? activeIdx;
                scrollToSlide(base + 1);
              }}
              className="pointer-events-auto h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/85 text-zinc-900 border border-zinc-200/80 shadow-md flex items-center justify-center transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              style={{ touchAction: 'manipulation' }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scroll-Snap Track */}
        <div
          ref={trackRef}
          tabIndex={0}
          role="group"
          aria-label="Diapositivas"
          style={{ gap: resolvedSliderCols > 1 ? '14px' : '0px' }}
          className="store-carousel-track w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          {slides.map((slide, idx) => {
            const imgSrc =
              viewport === 'mobile'
                ? slide.imageMobile || slide.imageTablet || slide.imageDesktop
                : viewport === 'tablet'
                ? slide.imageTablet || slide.imageDesktop
                : slide.imageDesktop || slide.imageTablet || slide.imageMobile;

            const isClickable =
              (slide.actionType === 'product' && Boolean(slide.productId)) ||
              (slide.actionType === 'url' && Boolean(slide.linkUrl));

            const linkedProduct =
              slide.actionType === 'product' && slide.productId
                ? products.find(p => p.id === slide.productId)
                : undefined;

            const slideBasis =
              resolvedSliderCols > 1
                ? `calc((100% - ${(resolvedSliderCols - 1) * 14}px) / ${resolvedSliderCols})`
                : '100%';

            return (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} de ${slides.length}`}
                onClick={() => {
                  if (isClickable && !slide.ctaLabel) {
                    handleSlideTrigger(slide);
                  }
                }}
                style={{
                  height: `${resolvedHeight}px`,
                  flex: `0 0 ${slideBasis}`,
                  borderRadius: resolvedSliderCols > 1 ? `${Math.max(12, (block.borderRadiusPx ?? 20) - 4)}px` : undefined,
                }}
                className={`kh-cq-card relative snap-center overflow-hidden select-none ${
                  isClickable && !slide.ctaLabel ? 'cursor-pointer' : ''
                } ${
                  sliderStyle === 'magazine'
                    ? 'ring-2 ring-inset ring-white/25'
                    : ''
                }`}
              >
                {sliderStyle === 'split_card' ? (
                  <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 bg-neutral-950">
                    <div className="p-5 sm:p-8 flex flex-col justify-center items-start space-y-2.5 text-white order-2 sm:order-1">
                      {slide.badge && (
                        <span
                          style={{ backgroundColor: accentColor }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-neutral-950"
                        >
                          {slide.badge}
                        </span>
                      )}
                      {slide.headline && (
                        <h2 className="kh-cq-title text-lg sm:text-2xl font-black tracking-tight leading-tight">
                          {slide.headline}
                        </h2>
                      )}
                      {slide.subheadline && (
                        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                          {slide.subheadline}
                        </p>
                      )}
                      {(slide.ctaLabel || linkedProduct) && isClickable && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleSlideTrigger(slide);
                          }}
                          data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                          className="store-btn-solid inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-md whitespace-nowrap shrink-0"
                        >
                          <span>
                            {slide.ctaLabel || (linkedProduct ? `Pedir ${linkedProduct.name}` : 'Ver Más')}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="relative h-full w-full min-h-[120px] order-1 sm:order-2 overflow-hidden">
                      <img
                        src={imgSrc}
                        alt={slide.headline || `Slide ${idx + 1}`}
                        width={800}
                        height={resolvedHeight}
                        loading={idx === 0 && isHero ? 'eager' : 'lazy'}
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {idx === 0 && isHero ? (
                      <img
                        src={imgSrc}
                        alt={slide.headline || `Slide ${idx + 1}`}
                        width={1200}
                        height={resolvedHeight}
                        fetchPriority="high"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={imgSrc}
                        alt={slide.headline || `Slide ${idx + 1}`}
                        width={1200}
                        height={resolvedHeight}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    {sliderStyle === 'cinema' && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                    )}

                    {(slide.badge || slide.headline || slide.subheadline || ((slide.ctaLabel || linkedProduct) && isClickable)) && (
                      <div
                        className={`relative z-10 h-full px-5 sm:px-10 py-5 flex flex-col text-white ${
                          sliderStyle === 'cinema'
                            ? 'justify-end items-center text-center mx-auto max-w-2xl pb-8'
                            : sliderStyle === 'magazine'
                            ? 'justify-between items-start'
                            : 'justify-center items-start max-w-2xl'
                        }`}
                      >
                        <div
                          className={
                            sliderStyle === 'floating_glass'
                              ? 'p-4 sm:p-6 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 space-y-2 max-w-lg shadow-xl'
                              : 'space-y-2'
                          }
                        >
                          {slide.badge && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border border-white/30 bg-zinc-900/75 text-white shadow-sm">
                              {slide.badge}
                            </span>
                          )}

                          {slide.headline && (
                            <h2 className="text-lg sm:text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
                              {slide.headline}
                            </h2>
                          )}

                          {slide.subheadline && (
                            <p className="text-xs sm:text-sm text-white max-w-lg line-clamp-2 leading-relaxed font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)]">
                              {slide.subheadline}
                            </p>
                          )}

                          {(slide.ctaLabel || linkedProduct) && isClickable && (
                            <div className="pt-1.5">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSlideTrigger(slide);
                                }}
                                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                                className="store-btn-solid inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black shadow-md active:scale-[0.97] transition-transform whitespace-nowrap shrink-0"
                              >
                                <span>
                                  {slide.ctaLabel ||
                                    (linkedProduct ? `Pedir ${linkedProduct.name}` : 'Ver Más')}
                                </span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Visually Hidden Polite Live Region */}
        <p className="sr-only" role="status" aria-live="polite">
          {settledAnnouncement}
        </p>

        {/* Pagination Dots */}
        {block.showDots && slides.length > 1 && (
          <nav
            aria-label="Elegir diapositiva"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10"
          >
            {slides.map((s, idx) => {
              const isCurrent = activeIdx === idx;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Ir a diapositiva ${idx + 1}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => scrollToSlide(idx)}
                  style={{
                    touchAction: 'manipulation',
                    backgroundColor: isCurrent ? accentColor : 'rgba(255,255,255,0.45)',
                  }}
                  className={`h-2.5 rounded-full transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                    isCurrent ? 'w-6' : 'w-2.5 hover:bg-white/75'
                  }`}
                />
              );
            })}
          </nav>
        )}
      </div>
    </section>
  );
};

/* ============================================================================
   2. CATEGORIES WIDGET (9 Visual Styles + Counter + Gap + Columns per Device)
   ============================================================================ */
interface StoreCategoriesWidgetProps {
  block: CategoriesBlockConfig;
  viewport: BuilderViewport;
  isLightTheme: boolean;
  accentColor: string;
  autoButtonContrast?: boolean;
  products: Product[];
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
}

export const StoreCategoriesWidget: React.FC<StoreCategoriesWidgetProps> = ({
  block,
  viewport,
  isLightTheme,
  accentColor,
  autoButtonContrast = false,
  products,
  activeCategory,
  onSelectCategory,
}) => {
  const allCategories = useMemo(() => getStoreCategories(), []);

  const visibleCategories = useMemo(() => {
    const hiddenSet = new Set(block.hiddenCategories || []);
    return allCategories.filter(cat => {
      if (hiddenSet.has(cat.id)) return false;
      return true;
    });
  }, [block.hiddenCategories, allCategories]);

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {
      todos: products.filter(p => p.isAvailable).length,
    };
    allCategories.forEach(c => {
      if (c.id !== 'todos') {
        map[c.id] = products.filter(p => p.isAvailable && p.category === c.id).length;
      }
    });
    return map;
  }, [products, allCategories]);

  const resolvedCols =
    viewport === 'mobile'
      ? block.columnsMobile
      : viewport === 'tablet'
      ? block.columnsTablet
      : block.columnsDesktop;

  const isAutoCols = resolvedCols === 'auto';
  const numericCols = isAutoCols ? 0 : Math.max(1, Number(resolvedCols) || 1);
  const isDenseGrid = !isAutoCols && numericCols >= 3;

  const containerStyle: React.CSSProperties = isAutoCols
    ? { display: 'flex', gap: `${block.gapPx}px` }
    : {
        display: 'grid',
        gridTemplateColumns: `repeat(${numericCols}, minmax(0, 1fr))`,
        gap: `${block.gapPx}px`,
      };

  return (
    <div
      style={{
        paddingTop: `${block.advanced.paddingTop}px`,
        paddingBottom: `${block.advanced.paddingBottom}px`,
        marginBottom: `${block.advanced.marginBottom}px`,
      }}
      className={getAnimationClass(block.advanced.animation)}
    >
      {block.title && (
        <h3
          className={`text-base sm:text-lg font-black mb-3 tracking-tight ${
            isLightTheme ? 'text-zinc-900' : 'text-white'
          }`}
        >
          {block.title}
        </h3>
      )}

      <div
        style={containerStyle}
        className={isAutoCols ? 'overflow-x-auto pb-1 items-center' : 'w-full'}
      >
        {visibleCategories.map(cat => {
          const isActive = activeCategory === cat.id;
          const count = countByCategory[cat.id] ?? 0;

          if (block.style === 'cards') {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                style={
                  isActive
                    ? { borderColor: accentColor, backgroundColor: `${accentColor}18` }
                    : undefined
                }
                className={`kh-cq-card ${
                  isDenseGrid ? 'p-2.5' : 'p-3.5'
                } rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                  isAutoCols ? 'shrink-0' : 'w-full min-w-0'
                } ${
                  isActive
                    ? isLightTheme
                      ? 'text-zinc-950 shadow-sm'
                      : 'text-white shadow-md'
                    : isLightTheme
                    ? 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                    : 'bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {cat.bannerImg ? (
                    <div className={`${isDenseGrid ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl overflow-hidden shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs`}>
                      <img src={cat.bannerImg} alt={cat.label} width={32} height={32} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <span className={`${isDenseGrid ? 'text-base' : 'text-xl'} shrink-0`}>{cat.icon}</span>
                  )}
                  <span className="text-xs sm:text-sm font-bold truncate">{cat.label}</span>
                </div>
                {block.showCount && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-black/15 dark:bg-white/15'
                        : isLightTheme
                        ? 'bg-zinc-100 text-zinc-600'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          }

          if (block.style === 'circles') {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`kh-cq-card flex flex-col items-center gap-1.5 group ${
                  isAutoCols ? 'shrink-0 min-w-[76px]' : 'w-full min-w-0'
                }`}
              >
                <div
                  data-auto-contrast={isActive && autoButtonContrast ? 'true' : 'false'}
                  className={`${
                    isDenseGrid ? 'h-12 w-12 text-xl' : 'h-14 w-14 text-2xl'
                  } rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden ${
                    isActive
                      ? 'store-btn-solid border-transparent shadow-md'
                      : isLightTheme
                      ? 'bg-white border-zinc-200'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  {cat.bannerImg ? (
                    <img src={cat.bannerImg} alt={cat.label} width={56} height={56} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    cat.icon
                  )}
                </div>
                <span
                  className={`text-[11px] font-bold text-center truncate max-w-full ${
                    isActive
                      ? isLightTheme
                        ? 'text-zinc-950'
                        : 'text-white'
                      : isLightTheme
                      ? 'text-zinc-600'
                      : 'text-neutral-400'
                  }`}
                >
                  {cat.label} {block.showCount ? `(${count})` : ''}
                </span>
              </button>
            );
          }

          if (block.style === 'tabs') {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                style={isActive ? { borderBottomColor: accentColor, color: accentColor } : undefined}
                className={`kh-cq-card pb-2.5 px-2 border-b-2 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  isAutoCols ? 'shrink-0 whitespace-nowrap' : 'w-full min-w-0'
                } ${
                  isActive
                    ? ''
                    : isLightTheme
                    ? 'border-transparent text-zinc-500 hover:text-zinc-900'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                {cat.bannerImg ? (
                  <img src={cat.bannerImg} alt={cat.label} width={16} height={16} loading="lazy" decoding="async" className="w-4 h-4 rounded-md object-cover shrink-0" />
                ) : (
                  <span className="shrink-0">{cat.icon}</span>
                )}
                <span className="truncate">{cat.label}</span>
                {block.showCount && (
                  <span className="text-[11px] opacity-75 font-mono shrink-0">({count})</span>
                )}
              </button>
            );
          }

          if (block.style === 'banners') {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                style={isActive ? { outline: `2px solid ${accentColor}`, outlineOffset: '2px' } : undefined}
                className={`kh-cq-card relative h-20 rounded-2xl overflow-hidden group text-left ${
                  isAutoCols ? 'min-w-[150px] shrink-0' : 'w-full min-w-0'
                }`}
              >
                <img
                  src={cat.bannerImg}
                  alt={cat.label}
                  width={180}
                  height={80}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative z-10 h-full p-2.5 flex flex-col justify-end text-white">
                  <span className="text-xs font-black leading-tight flex items-center gap-1 min-w-0">
                    <span className="shrink-0">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </span>
                  {block.showCount && (
                    <span className="text-[10px] text-zinc-300 font-medium truncate">{count} opciones</span>
                  )}
                </div>
              </button>
            );
          }

          if (block.style === 'glass') {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                style={
                  isActive
                    ? {
                        borderColor: accentColor,
                        boxShadow: `0 6px 20px -6px ${accentColor}66`,
                      }
                    : undefined
                }
                className={`kh-cq-card px-3.5 py-2.5 rounded-2xl backdrop-blur-md border transition-all flex items-center justify-between gap-2 ${
                  isAutoCols ? 'shrink-0 whitespace-nowrap' : 'w-full min-w-0'
                } ${
                  isActive
                    ? isLightTheme
                      ? 'bg-white/95 text-zinc-950 font-black'
                      : 'bg-white/15 text-white font-black'
                    : isLightTheme
                    ? 'bg-white/60 border-zinc-200/80 text-zinc-700 hover:bg-white'
                    : 'bg-neutral-900/55 border-white/10 text-neutral-300 hover:bg-neutral-900/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <span className="text-xs font-bold truncate">{cat.label}</span>
                </div>
                {block.showCount && (
                  <span
                    style={isActive ? { backgroundColor: accentColor, color: '#09090b' } : undefined}
                    className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-lg shrink-0 ${
                      isActive
                        ? ''
                        : isLightTheme
                        ? 'bg-zinc-200/70 text-zinc-700'
                        : 'bg-white/10 text-neutral-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          }

          if (block.style === 'mosaic') {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                style={isActive ? { borderColor: accentColor } : undefined}
                className={`kh-cq-card group relative rounded-2xl border-2 overflow-hidden p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                  isAutoCols ? 'min-w-[110px] shrink-0' : 'w-full min-w-0'
                } ${
                  isActive
                    ? isLightTheme
                      ? 'bg-amber-50/70 text-zinc-950 shadow-md'
                      : 'bg-neutral-900 text-white shadow-md'
                    : isLightTheme
                    ? 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                {cat.bannerImg ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                    <img
                      src={cat.bannerImg}
                      alt={cat.label}
                      width={40}
                      height={40}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                ) : (
                  <span className="text-2xl">{cat.icon}</span>
                )}
                <span className="text-xs font-black truncate max-w-full">{cat.label}</span>
                {block.showCount && (
                  <span className="text-[10px] opacity-65 font-mono">{count} items</span>
                )}
              </button>
            );
          }

          if (block.style === 'minimal_chip') {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`kh-cq-card px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isAutoCols ? 'shrink-0 whitespace-nowrap' : 'w-full min-w-0'
                } ${
                  isActive
                    ? isLightTheme
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-white text-zinc-950 border-white shadow-xs'
                    : isLightTheme
                    ? 'bg-transparent border-zinc-200 text-zinc-600 hover:border-zinc-400'
                    : 'bg-transparent border-neutral-800 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: isActive ? accentColor : isLightTheme ? '#d4d4d8' : '#52525b',
                  }}
                />
                <span className="truncate">{cat.label}</span>
                {block.showCount && (
                  <span className="text-[10px] opacity-70 font-mono shrink-0">{count}</span>
                )}
              </button>
            );
          }

          if (block.style === 'split_badge') {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                style={isActive ? { borderColor: accentColor } : undefined}
                className={`kh-cq-card rounded-2xl border overflow-hidden flex items-stretch transition-all ${
                  isAutoCols ? 'shrink-0 min-w-[140px]' : 'w-full min-w-0'
                } ${
                  isActive
                    ? isLightTheme
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'bg-neutral-900 text-white shadow-md'
                    : isLightTheme
                    ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    : 'bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <div
                  style={isActive ? { backgroundColor: accentColor, color: '#09090b' } : undefined}
                  className={`px-2.5 py-2 flex items-center justify-center text-base shrink-0 ${
                    isActive
                      ? ''
                      : isLightTheme
                      ? 'bg-zinc-100 text-zinc-700'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {cat.icon}
                </div>
                <div className="px-2.5 py-2 flex items-center justify-between gap-1.5 flex-1 min-w-0">
                  <span className="text-xs font-bold truncate">{cat.label}</span>
                  {block.showCount && (
                    <span className="text-[10px] font-mono opacity-65 shrink-0">({count})</span>
                  )}
                </div>
              </button>
            );
          }

          // Default: 'pills' (Pastillas)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              data-auto-contrast={isActive && autoButtonContrast ? 'true' : 'false'}
              style={{ touchAction: 'manipulation' }}
              className={`kh-cq-card flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold active:scale-[0.97] transition-all ${
                isAutoCols ? 'shrink-0 whitespace-nowrap' : 'w-full min-w-0'
              } ${
                isActive
                  ? 'store-btn-solid shadow-sm'
                  : isLightTheme
                  ? 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {cat.bannerImg ? (
                <img src={cat.bannerImg} alt={cat.label} width={16} height={16} loading="lazy" decoding="async" className="w-4 h-4 rounded-full object-cover shrink-0" />
              ) : (
                <span className="shrink-0">{cat.icon}</span>
              )}
              <span className="truncate">{cat.label}</span>
              {block.showCount && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                    isActive
                      ? 'bg-black/15'
                      : isLightTheme
                      ? 'bg-zinc-100 text-zinc-500'
                      : 'bg-neutral-800 text-neutral-400'
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
  );
};

/* ============================================================================
   3. PRODUCT GRID WIDGET (10 Card Styles + Container Queries + Exact Columns)
   ============================================================================ */
interface StoreProductGridWidgetProps {
  block: ProductGridBlockConfig;
  viewport: BuilderViewport;
  isLightTheme: boolean;
  accentColor: string;
  autoButtonContrast?: boolean;
  products: Product[];
  activeCategory: string;
  searchQuery: string;
  onSelectProduct: (product: Product, imgEl?: HTMLImageElement | null) => void;
  onQuickViewProduct: (product: Product) => void;
  isAboveFold?: boolean;
}

export const StoreProductGridWidget: React.FC<StoreProductGridWidgetProps> = ({
  block,
  viewport,
  isLightTheme,
  accentColor,
  autoButtonContrast = false,
  products,
  activeCategory,
  searchQuery,
  onSelectProduct,
  onQuickViewProduct,
  isAboveFold = false,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [visibleLimit, setVisibleLimit] = useState<number>(block.maxInitialProducts || 10);

  useEffect(() => {
    setVisibleLimit(block.maxInitialProducts || 10);
  }, [block.maxInitialProducts, activeCategory, block.categoryFilter]);

  const matchingProducts = useMemo(() => {
    const available = products.filter(p => p.isAvailable);

    // 1. Check Manual IDs filter if specified (supports 1-based index like "1, 4, 7" OR product IDs)
    const rawManual = (block.manualIds || '').trim();
    let pool = available;
    if (rawManual) {
      const tokens = rawManual
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (tokens.length > 0) {
        pool = available.filter((p, idx) => {
          const oneBased = String(idx + 1);
          return tokens.includes(oneBased) || tokens.includes(p.id);
        });
      }
    } else {
      // 2. Category filter
      if (block.categoryFilter === 'active_sync') {
        if (activeCategory !== 'todos') {
          pool = pool.filter(p => p.category === activeCategory);
        }
      } else if (block.categoryFilter !== 'all') {
        pool = pool.filter(p => p.category === block.categoryFilter);
      }
    }

    // 3. Search query filter (when synced or global search active)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      pool = pool.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return pool;
  }, [products, block.manualIds, block.categoryFilter, activeCategory, searchQuery]);

  const displayedProducts = useMemo(
    () => matchingProducts.slice(0, Math.max(1, visibleLimit)),
    [matchingProducts, visibleLimit]
  );

  const resolvedCols = Math.max(
    1,
    Number(
      viewport === 'mobile'
        ? block.columnsMobile
        : viewport === 'tablet'
        ? block.columnsTablet
        : block.columnsDesktop
    ) || 1
  );

  const isDense =
    (viewport === 'mobile' && resolvedCols >= 2) ||
    (viewport === 'tablet' && resolvedCols >= 3) ||
    (viewport === 'desktop' && resolvedCols >= 5);

  const headingLabel =
    block.title && block.title.trim()
      ? block.title
      : block.categoryFilter === 'active_sync'
      ? getStoreCategories().find(c => c.id === activeCategory)?.label || 'Catálogo'
      : '';

  const renderCard = (product: Product, cardIdx = 0) => {
    const shouldLazyLoadImg = !isAboveFold || cardIdx >= 4;
    const lowestPrice =
      product.hasSizes && product.sizes.length > 0
        ? Math.min(...product.sizes.filter(s => s.enabled).map(s => s.price))
        : product.basePrice;

    const enabledSizes = product.hasSizes
      ? product.sizes.filter(s => s.enabled).map(s => s.name)
      : [];

    // CARD STYLE 3: COMPACTA HORIZONTAL (Rappi / UberEats adaptable con @container)
    if (block.cardStyle === 'compacta') {
      return (
        <div
          key={product.id}
          onClick={() => onSelectProduct(product)}
          className={`kh-cq-card group rounded-2xl border ${
            isDense ? 'p-2.5' : 'p-3.5'
          } cursor-pointer transition-all hover:shadow-lg ${
            isLightTheme
              ? 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900'
              : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 text-white'
          }`}
        >
          <div className="kh-cq-horizontal">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {product.badge && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-neutral-950 truncate max-w-full"
                    style={{ backgroundColor: accentColor }}
                  >
                    {product.badge}
                  </span>
                )}
                {block.showStock && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                    <CheckCircle2 className="h-3 w-3 shrink-0" /> En stock
                  </span>
                )}
              </div>

              <h4 className="kh-cq-title font-bold line-clamp-2">{product.name}</h4>

              {block.showDescription && (
                <p
                  className={`text-xs line-clamp-2 ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  {product.description}
                </p>
              )}

              {block.showVariants && enabledSizes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {enabledSizes.map(sz => (
                    <span
                      key={sz}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        isLightTheme
                          ? 'bg-zinc-100 text-zinc-600'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              )}

              {block.showPrice && (
                <div className="pt-1 flex items-baseline gap-1.5 flex-wrap">
                  <span className="kh-cq-price font-black" style={{ color: accentColor }}>
                    S/ {lowestPrice.toFixed(2)}
                  </span>
                  {product.hasSizes && (
                    <span className="text-[9px] uppercase font-bold opacity-60">Desde</span>
                  )}
                </div>
              )}
            </div>

            <div className="kh-cq-thumb relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-xl overflow-hidden bg-neutral-950">
              <ProgressiveStoreImage
                src={product.imageUrl}
                alt={product.name}
                width={128}
                height={128}
                isLightTheme={isLightTheme}
                lazyLoad={shouldLazyLoadImg}
                className={`w-full h-full ${
                  block.imageFit === 'contain' ? 'object-contain' : 'object-cover'
                } group-hover:scale-105 transition-transform duration-300`}
              />
              {block.quickViewButton && (
                <button
                  type="button"
                  aria-label={`Vista rápida de ${product.name}`}
                  onClick={e => {
                    e.stopPropagation();
                    onQuickViewProduct(product);
                  }}
                  className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                aria-label={`Agregar ${product.name}`}
                onClick={e => {
                  e.stopPropagation();
                  onSelectProduct(product);
                }}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="store-btn-solid absolute bottom-1.5 right-1.5 h-8 w-8 rounded-xl font-black shadow-md flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // CARD STYLE 5: INMERSIVA PÓSTER
    if (block.cardStyle === 'inmersiva') {
      return (
        <div
          key={product.id}
          onClick={() => onSelectProduct(product)}
          className={`kh-cq-card group relative ${
            block.squareImage ? 'aspect-square' : isDense ? 'h-64' : 'h-80'
          } rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:-translate-y-1 transition-all`}
        >
          <ProgressiveStoreImage
            src={product.imageUrl}
            alt={product.name}
            width={400}
            height={block.squareImage ? 400 : 320}
            isLightTheme={false}
            lazyLoad={shouldLazyLoadImg}
            className={`absolute inset-0 w-full h-full ${
              block.imageFit === 'contain' ? 'object-contain' : 'object-cover'
            } group-hover:scale-105 transition-transform duration-500`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />

          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
            {product.badge ? (
              <span
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="store-btn-solid px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow truncate max-w-[75%]"
              >
                {product.badge}
              </span>
            ) : (
              <span />
            )}

            {block.quickViewButton && (
              <button
                type="button"
                aria-label={`Vista rápida de ${product.name}`}
                onClick={e => {
                  e.stopPropagation();
                  onQuickViewProduct(product);
                }}
                className="h-7 w-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/15 shrink-0"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className={`absolute inset-x-0 bottom-0 ${isDense ? 'p-3' : 'p-4'} text-white space-y-1.5`}>
            {block.showVariants && enabledSizes.length > 0 && (
              <div className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider truncate">
                {enabledSizes.join(' • ')}
              </div>
            )}

            <h4 className="kh-cq-title font-black line-clamp-2">{product.name}</h4>

            {block.showDescription && (
              <p className="text-[11px] text-zinc-300 line-clamp-2">{product.description}</p>
            )}

            <div className="kh-cq-actions pt-1.5">
              {block.showPrice ? (
                <div className="min-w-0">
                  <span className="text-[9px] uppercase text-zinc-400 block font-bold leading-none">
                    {product.hasSizes ? 'Desde' : 'Precio'}
                  </span>
                  <span className="kh-cq-price font-black" style={{ color: accentColor }}>
                    S/ {lowestPrice.toFixed(2)}
                  </span>
                </div>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onSelectProduct(product);
                }}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="kh-cq-cta store-btn-solid inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black shadow-md active:scale-95 transition-transform whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Elegir</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // CARD STYLE 6: VITRINA FLOTANTE (Floating Price Pill + Glass Footer)
    if (block.cardStyle === 'vitrina') {
      return (
        <div
          key={product.id}
          onClick={e => {
            const img = e.currentTarget.querySelector('img');
            onSelectProduct(product, img);
          }}
          className={`kh-cq-card group rounded-3xl overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 border ${
            isLightTheme
              ? 'bg-gradient-to-b from-white to-zinc-50/90 border-zinc-200/90 shadow-sm hover:shadow-xl text-zinc-900'
              : 'bg-gradient-to-b from-neutral-900 to-neutral-950 border-neutral-800 hover:border-neutral-700 text-white'
          }`}
        >
          <div className="relative p-2.5 pb-0">
            <div
              className={`relative ${
                block.squareImage ? 'aspect-square' : isDense ? 'h-36' : 'h-44'
              } w-full rounded-2xl overflow-hidden ${
                isLightTheme ? 'bg-zinc-100' : 'bg-neutral-950'
              }`}
            >
              <ProgressiveStoreImage
                src={product.imageUrl}
                alt={product.name}
                width={400}
                height={block.squareImage ? 400 : 220}
                isLightTheme={isLightTheme}
                lazyLoad={shouldLazyLoadImg}
                className={`w-full h-full ${
                  block.imageFit === 'contain' ? 'object-contain' : 'object-cover'
                } group-hover:scale-105 transition-transform duration-500`}
              />
              {block.showPrice && (
                <div
                  style={{ backgroundColor: accentColor }}
                  className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl text-neutral-950 font-black text-xs shadow-lg whitespace-nowrap"
                >
                  S/ {lowestPrice.toFixed(2)}
                </div>
              )}
              {product.badge && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider truncate max-w-[75%]">
                  {product.badge}
                </span>
              )}
            </div>
          </div>

          <div className={`${isDense ? 'p-3' : 'p-4'} flex-1 flex flex-col justify-between gap-2.5`}>
            <div>
              <h4 className="kh-cq-title font-black line-clamp-2">{product.name}</h4>
              {block.showDescription && (
                <p
                  className={`text-xs line-clamp-2 mt-1 ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  {product.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                const cardEl = e.currentTarget.closest('.group');
                const img = cardEl?.querySelector('img') as HTMLImageElement | null;
                onSelectProduct(product, img);
              }}
              data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
              className="store-btn-solid w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Personalizar / Pedir</span>
            </button>
          </div>
        </div>
      );
    }

    // CARD STYLE 7: BENTO GRID MODERNO
    if (block.cardStyle === 'bento') {
      return (
        <div
          key={product.id}
          onClick={e => {
            const img = e.currentTarget.querySelector('img');
            onSelectProduct(product, img);
          }}
          className={`kh-cq-card group rounded-3xl p-2.5 flex flex-col justify-between gap-2 cursor-pointer transition-all border ${
            isLightTheme
              ? 'bg-zinc-100/80 border-zinc-200/80 hover:bg-white hover:shadow-md text-zinc-900'
              : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-900 text-white'
          }`}
        >
          <div
            className={`relative ${
              block.squareImage ? 'aspect-square' : isDense ? 'h-36' : 'h-44'
            } w-full rounded-2xl overflow-hidden bg-neutral-950`}
          >
            <ProgressiveStoreImage
              src={product.imageUrl}
              alt={product.name}
              width={400}
              height={block.squareImage ? 400 : 220}
              isLightTheme={isLightTheme}
              lazyLoad={shouldLazyLoadImg}
              className={`w-full h-full ${
                block.imageFit === 'contain' ? 'object-contain' : 'object-cover'
              } group-hover:scale-105 transition-transform duration-500`}
            />
            {product.badge && (
              <span
                style={{ backgroundColor: accentColor }}
                className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-neutral-950 shadow-xs truncate max-w-[80%]"
              >
                {product.badge}
              </span>
            )}
          </div>

          <div
            className={`rounded-2xl p-3 flex-1 flex flex-col justify-between gap-2 ${
              isLightTheme ? 'bg-white shadow-2xs' : 'bg-neutral-950/90 border border-neutral-800/80'
            }`}
          >
            <div>
              <h4 className="kh-cq-title font-bold line-clamp-2">{product.name}</h4>
              {block.showDescription && (
                <p className="text-[11px] opacity-65 line-clamp-2 mt-1">{product.description}</p>
              )}
            </div>

            <div className="kh-cq-actions pt-1">
              {block.showPrice ? (
                <span className="kh-cq-price font-black" style={{ color: accentColor }}>
                  S/ {lowestPrice.toFixed(2)}
                </span>
              ) : (
                <span className="text-[10px] opacity-60">Ver opciones</span>
              )}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  const cardEl = e.currentTarget.closest('.group');
                  const img = cardEl?.querySelector('img') as HTMLImageElement | null;
                  onSelectProduct(product, img);
                }}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="kh-cq-cta store-btn-solid px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Elegir</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // CARD STYLE 8: GALERÍA EDITORIAL CENTRADA
    if (block.cardStyle === 'galeria') {
      return (
        <div
          key={product.id}
          onClick={e => {
            const img = e.currentTarget.querySelector('img');
            onSelectProduct(product, img);
          }}
          className={`kh-cq-card group rounded-3xl overflow-hidden flex flex-col items-center text-center justify-between cursor-pointer transition-all border ${
            isDense ? 'p-3' : 'p-4'
          } ${
            isLightTheme
              ? 'bg-white border-zinc-200 hover:shadow-lg text-zinc-900'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-white'
          }`}
        >
          <div className="w-full">
            <div
              className={`relative ${
                block.squareImage ? 'aspect-square' : isDense ? 'h-36' : 'h-44'
              } w-full rounded-2xl overflow-hidden mb-3 ${
                isLightTheme ? 'bg-zinc-100' : 'bg-neutral-950'
              }`}
            >
              <ProgressiveStoreImage
                src={product.imageUrl}
                alt={product.name}
                width={400}
                height={block.squareImage ? 400 : 220}
                isLightTheme={isLightTheme}
                lazyLoad={shouldLazyLoadImg}
                className={`w-full h-full ${
                  block.imageFit === 'contain' ? 'object-contain' : 'object-cover'
                } group-hover:scale-105 transition-transform duration-500`}
              />
              {product.badge && (
                <span
                  style={{ backgroundColor: accentColor }}
                  className="absolute top-2 inset-x-4 mx-auto w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-neutral-950 shadow truncate max-w-[85%]"
                >
                  {product.badge}
                </span>
              )}
            </div>

            <h4 className="kh-cq-title font-black line-clamp-2">{product.name}</h4>
            {block.showDescription && (
              <p className="text-xs opacity-65 line-clamp-2 mt-1">{product.description}</p>
            )}
          </div>

          <div className="w-full pt-3 mt-2 border-t border-zinc-200/60 dark:border-neutral-800 flex flex-col items-center gap-2">
            {block.showPrice && (
              <div className="flex items-baseline gap-1">
                {product.hasSizes && (
                  <span className="text-[9px] uppercase font-bold opacity-55">Desde</span>
                )}
                <span className="kh-cq-price font-black" style={{ color: accentColor }}>
                  S/ {lowestPrice.toFixed(2)}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                const cardEl = e.currentTarget.closest('.group');
                const img = cardEl?.querySelector('img') as HTMLImageElement | null;
                onSelectProduct(product, img);
              }}
              data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
              className="store-btn-solid w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Elegir</span>
            </button>
          </div>
        </div>
      );
    }

    // CARD STYLE 9: LISTA MENÚ TRATTORIA (Carta de Pizzería Tradicional)
    if (block.cardStyle === 'lista_menu') {
      return (
        <div
          key={product.id}
          onClick={() => onSelectProduct(product)}
          className={`kh-cq-card group rounded-2xl border p-3.5 cursor-pointer transition-all ${
            isLightTheme
              ? 'bg-amber-50/40 border-amber-200/80 hover:bg-white hover:shadow-md text-zinc-900'
              : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-500/40 text-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-black/10 bg-neutral-950">
              <ProgressiveStoreImage
                src={product.imageUrl}
                alt={product.name}
                width={64}
                height={64}
                isLightTheme={isLightTheme}
                lazyLoad={shouldLazyLoadImg}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-zinc-300 dark:border-neutral-700 pb-1">
                <h4 className="kh-cq-title font-black truncate">{product.name}</h4>
                {block.showPrice && (
                  <span className="kh-cq-price font-black shrink-0" style={{ color: accentColor }}>
                    S/ {lowestPrice.toFixed(2)}
                  </span>
                )}
              </div>
              {block.showDescription && (
                <p className="text-xs opacity-70 line-clamp-2 mt-1">{product.description}</p>
              )}
              <div className="flex items-center justify-between gap-2 mt-2">
                {product.badge ? (
                  <span
                    style={{ color: accentColor }}
                    className="text-[10px] font-black uppercase tracking-wider truncate"
                  >
                    ★ {product.badge}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onSelectProduct(product);
                  }}
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid px-2.5 py-1 rounded-lg font-black text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3 h-3 shrink-0" />
                  <span>Pedir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // CARD STYLE 10: NEÓN PROMO (Borde Luminoso + Alto Impacto)
    if (block.cardStyle === 'neon_promo') {
      return (
        <div
          key={product.id}
          onClick={e => {
            const img = e.currentTarget.querySelector('img');
            onSelectProduct(product, img);
          }}
          style={{
            borderColor: `${accentColor}66`,
            boxShadow: `0 10px 30px -12px ${accentColor}40`,
          }}
          className={`kh-cq-card group rounded-3xl overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 border-2 ${
            isLightTheme ? 'bg-white text-zinc-900' : 'bg-neutral-950 text-white'
          }`}
        >
          <div
            className={`relative ${
              block.squareImage ? 'aspect-square' : isDense ? 'h-36' : 'h-44'
            } w-full overflow-hidden bg-neutral-900`}
          >
            <ProgressiveStoreImage
              src={product.imageUrl}
              alt={product.name}
              width={400}
              height={block.squareImage ? 400 : 220}
              isLightTheme={isLightTheme}
              lazyLoad={shouldLazyLoadImg}
              className={`w-full h-full ${
                block.imageFit === 'contain' ? 'object-contain' : 'object-cover'
              } group-hover:scale-105 transition-transform duration-500`}
            />
            {product.badge && (
              <span
                style={{ backgroundColor: accentColor }}
                className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-neutral-950 shadow-md truncate max-w-[80%]"
              >
                {product.badge}
              </span>
            )}
          </div>

          <div className={`${isDense ? 'p-3' : 'p-4'} flex-1 flex flex-col justify-between gap-2.5`}>
            <div>
              <h4 className="kh-cq-title font-black line-clamp-2">{product.name}</h4>
              {block.showDescription && (
                <p className="text-xs opacity-70 line-clamp-2 mt-1">{product.description}</p>
              )}
            </div>

            <div className="kh-cq-actions pt-2 border-t border-zinc-200/60 dark:border-neutral-800">
              {block.showPrice ? (
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold opacity-60 block leading-none">
                    {product.hasSizes ? 'Promo Desde' : 'Promo'}
                  </span>
                  <span className="kh-cq-price font-black" style={{ color: accentColor }}>
                    S/ {lowestPrice.toFixed(2)}
                  </span>
                </div>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  const cardEl = e.currentTarget.closest('.group');
                  const img = cardEl?.querySelector('img') as HTMLImageElement | null;
                  onSelectProduct(product, img);
                }}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="kh-cq-cta store-btn-solid px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1 shadow-md whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Elegir</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // CARD STYLES: 'elegante' | 'clasica' | 'minimalista'
    const isMinimal = block.cardStyle === 'minimalista';
    const isClassic = block.cardStyle === 'clasica';

    return (
      <div
        key={product.id}
        onClick={e => {
          const img = e.currentTarget.querySelector('img');
          onSelectProduct(product, img);
        }}
        style={isClassic ? { borderTopWidth: '4px', borderTopColor: accentColor } : undefined}
        className={`kh-cq-card group rounded-3xl overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${
          isMinimal
            ? isLightTheme
              ? 'bg-transparent border border-zinc-200 hover:bg-white hover:shadow-md text-zinc-900'
              : 'bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-white'
            : isLightTheme
            ? 'bg-white border border-zinc-200 shadow-sm hover:shadow-lg text-zinc-900'
            : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white'
        }`}
      >
        <div className={block.bleedImages ? '' : isDense ? 'p-2 pb-0' : 'p-3 pb-0'}>
          <div
            className={`relative ${
              block.squareImage ? 'aspect-square' : isDense ? 'h-36 sm:h-40' : 'h-44 sm:h-48'
            } w-full overflow-hidden ${
              isLightTheme ? 'bg-zinc-100' : 'bg-neutral-950'
            } ${block.bleedImages ? '' : 'rounded-2xl'}`}
          >
            <ProgressiveStoreImage
              src={product.imageUrl}
              alt={product.name}
              width={400}
              height={block.squareImage ? 400 : 220}
              isLightTheme={isLightTheme}
              lazyLoad={shouldLazyLoadImg}
              className={`w-full h-full ${
                block.imageFit === 'contain' ? 'object-contain' : 'object-cover'
              } group-hover:scale-105 transition-transform duration-500`}
            />

            {product.badge && (
              <span
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="store-btn-solid absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm truncate max-w-[80%]"
              >
                {product.badge}
              </span>
            )}

            {block.quickViewButton && (
              <button
                type="button"
                aria-label={`Vista rápida de ${product.name}`}
                onClick={e => {
                  e.stopPropagation();
                  onQuickViewProduct(product);
                }}
                className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/15 transition-transform hover:scale-105"
                title="Vista Rápida"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
              {block.showVariants && enabledSizes.length > 0 ? (
                <div className="flex items-center gap-1 bg-black/75 px-2 py-0.5 rounded-lg text-[9px] text-neutral-100 font-semibold border border-white/10 truncate">
                  {enabledSizes.join(' • ')}
                </div>
              ) : (
                <span />
              )}

              {block.showStock && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-neutral-950 text-[9px] font-black shrink-0">
                  En Stock
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={`${isDense ? 'p-3' : 'p-4'} flex-1 flex flex-col justify-between space-y-2.5`}>
          <div>
            <h4
              className={`kh-cq-title font-bold line-clamp-2 transition-colors ${
                isLightTheme ? 'text-zinc-900' : 'text-white'
              }`}
            >
              {product.name}
            </h4>

            {block.showDescription && (
              <p
                className={`text-xs line-clamp-2 mt-1 leading-relaxed ${
                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                }`}
              >
                {product.description}
              </p>
            )}
          </div>

          <div
            className={`kh-cq-actions pt-2.5 border-t ${
              isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
            }`}
          >
            {block.showPrice ? (
              <div className="min-w-0">
                <span
                  className={`text-[9px] uppercase font-bold block leading-none mb-0.5 ${
                    isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                  }`}
                >
                  {product.hasSizes ? 'Desde' : 'Precio'}
                </span>
                <span className="kh-cq-price font-black" style={{ color: accentColor }}>
                  S/ {lowestPrice.toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="text-xs font-semibold opacity-70">Personalizable</span>
            )}

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                const cardEl = e.currentTarget.closest('.group');
                const img = cardEl?.querySelector('img') as HTMLImageElement | null;
                onSelectProduct(product, img);
              }}
              data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
              className="kh-cq-cta store-btn-solid flex items-center gap-1 px-3.5 py-2 rounded-2xl font-black text-xs active:scale-95 transition-transform shadow-sm whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Elegir</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const gapValue = block.gapPx ?? 18;

  return (
    <div
      style={{
        paddingTop: `${block.advanced.paddingTop}px`,
        paddingBottom: `${block.advanced.paddingBottom}px`,
        marginBottom: `${block.advanced.marginBottom}px`,
      }}
      className={getAnimationClass(block.advanced.animation)}
    >
      {(headingLabel || block.horizontalCarousel) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {headingLabel ? (
            <h3
              className={`text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap ${
                isLightTheme ? 'text-zinc-900' : 'text-white'
              }`}
            >
              <span>{headingLabel}</span>
              <span
                className={`text-xs font-normal ${
                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                }`}
              >
                ({matchingProducts.length} productos)
              </span>
            </h3>
          ) : (
            <span />
          )}

          {block.horizontalCarousel && displayedProducts.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Desplazar productos a la izquierda"
                onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className={`h-8 w-8 rounded-full border flex items-center justify-center ${
                  isLightTheme
                    ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Desplazar productos a la derecha"
                onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className={`h-8 w-8 rounded-full border flex items-center justify-center ${
                  isLightTheme
                    ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {displayedProducts.length === 0 ? (
        <div
          className={`p-8 rounded-2xl border text-center text-sm ${
            isLightTheme
              ? 'bg-white border-zinc-200 text-zinc-500'
              : 'bg-neutral-900/50 border-neutral-800 text-neutral-400'
          }`}
        >
          No se encontraron productos para este bloque con los filtros actuales.
        </div>
      ) : block.horizontalCarousel ? (
        <div
          ref={carouselRef}
          style={{ gap: `${gapValue}px` }}
          className="store-carousel-track pb-2"
        >
          {displayedProducts.map((product, cardIdx) => (
            <div
              key={product.id}
              style={{
                flex: `0 0 calc((100% - ${(resolvedCols - 1) * gapValue}px) / ${resolvedCols})`,
                minWidth: 0,
              }}
              className="snap-start"
            >
              {renderCard(product, cardIdx)}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${resolvedCols}, minmax(0, 1fr))`,
            gap: `${block.gapPx ?? 20}px`,
          }}
        >
          {displayedProducts.map((product, cardIdx) => renderCard(product, cardIdx))}
        </div>
      )}

      {/* Load More Pagination Button */}
      {block.enableLoadMore && matchingProducts.length > displayedProducts.length && (
        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={() =>
              setVisibleLimit(prev => prev + Math.max(4, block.maxInitialProducts || 6))
            }
            style={{ borderColor: `${accentColor}66` }}
            className={`px-6 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
              isLightTheme
                ? 'bg-white text-zinc-900 hover:bg-zinc-50 shadow-sm'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            Cargar Más Productos ({matchingProducts.length - displayedProducts.length} restantes)
          </button>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   4. SEARCH BAR WIDGET (7 Visual Styles + Device Columns)
   ============================================================================ */
export const StoreSearchBarWidget: React.FC<{
  block: SearchBarBlockConfig;
  viewport?: BuilderViewport;
  accentColor?: string;
  isLightTheme: boolean;
  searchQuery: string;
  onChangeSearch: (q: string) => void;
}> = ({
  block,
  viewport = 'desktop',
  accentColor = '#f59e0b',
  isLightTheme,
  searchQuery,
  onChangeSearch,
}) => {
  const resolvedCols = Math.max(
    1,
    Number(
      viewport === 'mobile'
        ? block.columnsMobile ?? 1
        : viewport === 'tablet'
        ? block.columnsTablet ?? 1
        : block.columnsDesktop ?? 1
    ) || 1
  );

  const quickTags = ['Pizza Familiar', '2 Sabores', 'Promociones', 'Bebidas'];
  const styleMode = block.visualStyle || 'modern';

  return (
    <search
      style={{
        paddingTop: `${block.advanced.paddingTop}px`,
        paddingBottom: `${block.advanced.paddingBottom}px`,
        marginBottom: `${block.advanced.marginBottom}px`,
      }}
      className={getAnimationClass(block.advanced.animation)}
    >
      <div
        style={
          resolvedCols > 1
            ? {
                display: 'grid',
                gridTemplateColumns: `repeat(${resolvedCols}, minmax(0, 1fr))`,
                gap: '12px',
                alignItems: 'center',
              }
            : undefined
        }
        className={
          styleMode === 'hero_banner'
            ? `p-4 sm:p-5 rounded-3xl border ${
                isLightTheme
                  ? 'bg-gradient-to-r from-amber-50 via-white to-orange-50 border-amber-200/80 shadow-sm'
                  : 'bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border-neutral-800 shadow-lg'
              }`
            : styleMode === 'elevated_card'
            ? `p-3.5 rounded-2xl border shadow-md ${
                isLightTheme
                  ? 'bg-white border-zinc-200/90'
                  : 'bg-neutral-900 border-neutral-800'
              }`
            : ''
        }
      >
        {block.title && (
          <label
            htmlFor={`search-${block.id}`}
            className={`block text-sm font-black ${resolvedCols > 1 ? 'mb-0' : 'mb-2'} ${
              isLightTheme ? 'text-zinc-800' : 'text-neutral-200'
            }`}
          >
            {block.title}
          </label>
        )}

        <div className="relative w-full min-w-0">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: styleMode === 'neon_outline' ? accentColor : '#a1a1aa' }}
          />
          <input
            id={`search-${block.id}`}
            name="storeSearch"
            type="search"
            autoCorrect="off"
            value={searchQuery}
            onChange={e => onChangeSearch(e.target.value)}
            placeholder={block.placeholder || 'Buscar pizza, bebida o ingrediente...'}
            style={
              styleMode === 'neon_outline'
                ? {
                    borderColor: accentColor,
                    boxShadow: `0 0 18px -4px ${accentColor}55`,
                  }
                : undefined
            }
            className={`w-full pl-10 pr-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
              styleMode === 'pill'
                ? 'rounded-full'
                : styleMode === 'minimal'
                ? 'rounded-none border-x-0 border-t-0 border-b-2 bg-transparent'
                : styleMode === 'glass'
                ? 'rounded-2xl backdrop-blur-md bg-white/70 dark:bg-neutral-900/60'
                : styleMode === 'neon_outline'
                ? 'rounded-2xl border-2'
                : 'rounded-xl'
            } ${
              isLightTheme
                ? 'bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 shadow-xs'
                : 'bg-neutral-900/90 border border-neutral-800 text-white placeholder-neutral-500 shadow-inner'
            }`}
          />
        </div>

        {resolvedCols > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {quickTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => onChangeSearch(searchQuery === tag ? '' : tag)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                  searchQuery === tag
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
                    : isLightTheme
                    ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </search>
  );
};

/* ============================================================================
   5. PROMO STRIP WIDGET (5 Visual Styles + 7 Tones + Device Columns)
   ============================================================================ */
export const StorePromoStripWidget: React.FC<{
  block: PromoStripBlockConfig;
  viewport?: BuilderViewport;
  accentColor?: string;
  products: Product[];
  autoButtonContrast?: boolean;
  onSelectProduct: (p: Product) => void;
}> = ({
  block,
  viewport = 'desktop',
  accentColor = '#f59e0b',
  products,
  autoButtonContrast = false,
  onSelectProduct,
}) => {
  const toneClasses: Record<PromoStripBlockConfig['bgTone'], string> = {
    amber: 'bg-amber-600 text-white',
    crimson: 'bg-rose-600 text-white',
    emerald: 'bg-emerald-700 text-white',
    dark: 'bg-zinc-900 text-white border border-amber-500/30',
    royal: 'bg-indigo-700 text-white',
    sunset: 'bg-gradient-to-r from-orange-600 via-rose-600 to-pink-600 text-white',
    gold: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-neutral-950',
  };

  const resolvedCols = Math.max(
    1,
    Number(
      viewport === 'mobile'
        ? block.columnsMobile ?? 1
        : viewport === 'tablet'
        ? block.columnsTablet ?? 1
        : block.columnsDesktop ?? 1
    ) || 1
  );

  const visualStyle = block.visualStyle || 'banner';

  const handleTrigger = () => {
    if (block.actionType === 'product' && block.productId) {
      const prod = products.find(p => p.id === block.productId);
      if (prod) onSelectProduct(prod);
    } else if (block.actionType === 'url' && block.linkUrl) {
      window.open(block.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={{
        paddingTop: `${block.advanced.paddingTop}px`,
        paddingBottom: `${block.advanced.paddingBottom}px`,
        marginBottom: `${block.advanced.marginBottom}px`,
      }}
      className={getAnimationClass(block.advanced.animation)}
    >
      <div
        style={
          visualStyle === 'glass_glow'
            ? { boxShadow: `0 12px 32px -10px ${accentColor}66` }
            : undefined
        }
        className={`kh-cq-card relative overflow-hidden ${
          visualStyle === 'ticket_coupon'
            ? 'rounded-2xl border-2 border-dashed border-white/45 p-4 sm:px-6'
            : visualStyle === 'compact_bar'
            ? 'rounded-xl px-4 py-2.5'
            : visualStyle === 'split_hero'
            ? 'rounded-3xl p-5 sm:p-6'
            : 'rounded-2xl p-4 sm:px-6 sm:py-4'
        } ${toneClasses[block.bgTone] || toneClasses.amber} shadow-lg`}
      >
        <div
          style={
            resolvedCols > 1
              ? {
                  display: 'grid',
                  gridTemplateColumns: `repeat(${resolvedCols}, minmax(0, 1fr))`,
                  gap: '12px',
                  alignItems: 'center',
                }
              : undefined
          }
          className={resolvedCols === 1 ? 'kh-cq-actions' : ''}
        >
          <div className="space-y-0.5 min-w-0">
            {block.badgeText && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/25 text-white">
                <Sparkles className="h-3 w-3 shrink-0" /> {block.badgeText}
              </span>
            )}
            <h4 className="kh-cq-title font-black">{block.title}</h4>
            {block.subtitle && resolvedCols === 1 && (
              <p className="text-xs opacity-90">{block.subtitle}</p>
            )}
          </div>

          {resolvedCols > 1 && block.subtitle && (
            <p className="text-xs opacity-95 font-medium">{block.subtitle}</p>
          )}

          {block.ctaLabel && block.actionType !== 'none' && (
            <div className={resolvedCols > 1 ? 'flex justify-end' : ''}>
              <button
                type="button"
                onClick={handleTrigger}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="kh-cq-cta store-btn-solid px-4 py-2 rounded-2xl font-black text-xs shadow active:scale-95 transition-transform whitespace-nowrap shrink-0"
              >
                {block.ctaLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
