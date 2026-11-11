import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Product } from '../../types/catalog';
import { Search, X, ArrowRight, Clock, TrendingUp, CornerDownLeft, SearchX } from 'lucide-react';

interface StoreSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  searchQuery: string;
  onChangeSearch: (q: string) => void;
  onSelectProduct: (product: Product) => void;
  accentColor: string;
  autoButtonContrast: boolean;
  isLightTheme?: boolean;
}

const RECENT_KEY = 'store_recent_searches_v1'; // device-local (no "kh" prefix → never synced across devices)
const DEBOUNCE_MS = 160;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string): string[] {
  const clean = term.trim();
  if (clean.length < 2) return loadRecent();
  const next = [clean, ...loadRecent().filter(t => normalize(t) !== normalize(clean))].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
  return next;
}

function minPrice(prod: Product): number {
  if (!prod.hasSizes) return prod.basePrice;
  const prices = prod.sizes.filter(s => s.enabled).map(s => s.price);
  return prices.length ? Math.min(...prices) : prod.basePrice;
}

/** Wraps matched fragments of `text` in <mark> (accent-insensitive, no HTML injection) */
function Highlight({ text, query, markClass }: { text: string; query: string; markClass: string }) {
  const q = normalize(query.trim());
  if (!q) return <>{text}</>;
  const normText = normalize(text);
  // normalize() may change length for rare glyphs; fall back to plain text if lengths diverge
  if (normText.length !== text.length) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let idx = normText.indexOf(q, cursor);
  let key = 0;
  while (idx !== -1) {
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <mark key={key++} className={markClass}>
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    cursor = idx + q.length;
    idx = normText.indexOf(q, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export const StoreSearchDrawer: React.FC<StoreSearchDrawerProps> = ({
  isOpen,
  onClose,
  products,
  searchQuery,
  onChangeSearch,
  onSelectProduct,
  accentColor,
  autoButtonContrast,
  isLightTheme = false,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const listboxId = useId();

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());

  // AJAX-style debounce: results refresh ~160ms after the user stops typing, with a visible "searching" state
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(searchQuery), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const isSearching = searchQuery.trim() !== debouncedQuery.trim();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      setRecent(loadRecent());
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const available = useMemo(() => products.filter(p => p.isAvailable), [products]);

  const results = useMemo(() => {
    const q = normalize(debouncedQuery.trim());
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return available
      .map(p => {
        const name = normalize(p.name);
        const cat = normalize(p.category || '');
        const desc = normalize(p.description || '');
        const hay = `${name} ${cat} ${desc}`;
        if (!tokens.every(t => hay.includes(t))) return null;
        let score = 0;
        if (name.startsWith(q)) score += 100;
        else if (name.includes(q)) score += 60;
        if (cat.includes(q)) score += 25;
        tokens.forEach(t => {
          if (name.includes(t)) score += 10;
          if (desc.includes(t)) score += 2;
        });
        return { product: p, score };
      })
      .filter((x): x is { product: Product; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .map(x => x.product);
  }, [available, debouncedQuery]);

  const popular = useMemo(() => available.slice(0, 5), [available]);
  const hasQuery = searchQuery.trim().length > 0;
  const visibleList = hasQuery ? results : popular;

  // Keep keyboard cursor valid whenever the visible list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, isOpen]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const choose = useCallback(
    (prod: Product) => {
      if (hasQuery) setRecent(pushRecent(searchQuery));
      onClose();
      onSelectProduct(prod);
    },
    [hasQuery, onClose, onSelectProduct, searchQuery]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleList.length) setActiveIndex(i => (i + 1) % visibleList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleList.length) setActiveIndex(i => (i - 1 + visibleList.length) % visibleList.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = visibleList[activeIndex];
      if (target) {
        choose(target);
      } else if (hasQuery) {
        setRecent(pushRecent(searchQuery));
        onClose();
      }
    }
  };

  const surface = isLightTheme
    ? {
        panel: 'bg-white text-zinc-900 border-zinc-200',
        divider: 'border-zinc-200',
        input: 'bg-zinc-100 border-zinc-200 text-zinc-900 placeholder-zinc-500 focus:border-zinc-400 focus:bg-white',
        muted: 'text-zinc-500',
        row: 'hover:bg-zinc-100',
        rowActive: 'bg-zinc-100',
        chip: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200',
        iconBtn: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600',
        kbd: 'bg-zinc-100 border-zinc-200 text-zinc-600',
        thumb: 'bg-zinc-200',
        skeleton: 'bg-zinc-200',
        mark: 'bg-amber-200 text-zinc-950 rounded px-0.5',
      }
    : {
        panel: 'bg-neutral-900 text-neutral-100 border-neutral-800',
        divider: 'border-neutral-800',
        input: 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-neutral-600',
        muted: 'text-neutral-400',
        row: 'hover:bg-neutral-800',
        rowActive: 'bg-neutral-800',
        chip: 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700',
        iconBtn: 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300',
        kbd: 'bg-neutral-800 border-neutral-700 text-neutral-300',
        thumb: 'bg-neutral-800',
        skeleton: 'bg-neutral-800',
        mark: 'bg-amber-400/30 text-amber-100 rounded px-0.5',
      };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={e => {
        e.currentTarget.returnValue = '';
        onClose();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
      }}
      className="store-search-palette backdrop:bg-black/60 backdrop:backdrop-blur-xs"
    >
      {isOpen && (
        <div
          className={`flex flex-col h-full md:h-auto md:max-h-[80dvh] md:rounded-3xl border-b md:border shadow-2xl overflow-hidden ${surface.panel}`}
        >
          <h2 id={titleId} className="sr-only">
            Buscar en la carta
          </h2>

          {/* Search field */}
          <div className={`px-4 sm:px-5 pt-[max(0.9rem,env(safe-area-inset-top))] pb-3.5 border-b shrink-0 ${surface.divider}`}>
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${surface.muted}`}
                />
                <input
                  ref={inputRef}
                  type="search"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    visibleList[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined
                  }
                  enterKeyHint="go"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={searchQuery}
                  onChange={e => onChangeSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Busca pizzas, combos, bebidas…"
                  className={`w-full h-12 pl-10 pr-10 rounded-2xl border text-[15px] font-semibold focus:outline-none transition-colors [&::-webkit-search-cancel-button]:hidden ${surface.input}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => {
                      onChangeSearch('');
                      inputRef.current?.focus();
                    }}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center ${surface.iconBtn}`}
                  >
                    <X aria-hidden="true" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`h-12 px-4 rounded-2xl text-xs font-black whitespace-nowrap shrink-0 ${surface.iconBtn}`}
              >
                Cerrar
              </button>
            </div>

            {/* Live status line (announced to screen readers) */}
            <div
              role="status"
              aria-live="polite"
              className={`mt-2.5 h-4 flex items-center gap-2 text-[11px] font-semibold ${surface.muted}`}
            >
              {isSearching ? (
                <>
                  <span
                    aria-hidden="true"
                    className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
                  />
                  <span>Buscando…</span>
                </>
              ) : hasQuery ? (
                <span>
                  {results.length === 0
                    ? 'Sin resultados'
                    : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`}
                </span>
              ) : (
                <span>Escribe para buscar al instante</span>
              )}
            </div>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3 custom-scrollbar safe-bottom-bar"
          >
            {!hasQuery && recent.length > 0 && (
              <div className="px-1.5 pb-3">
                <span
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider mb-2 ${surface.muted}`}
                >
                  <Clock aria-hidden="true" className="w-3 h-3" />
                  Búsquedas recientes
                </span>
                <div className="flex flex-wrap gap-2">
                  {recent.map(term => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        onChangeSearch(term);
                        inputRef.current?.focus();
                      }}
                      className={`min-h-[36px] px-3.5 rounded-full border text-xs font-bold whitespace-nowrap ${surface.chip}`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!hasQuery && (
              <span
                className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-1.5 mb-1.5 ${surface.muted}`}
              >
                <TrendingUp aria-hidden="true" className="w-3 h-3" />
                Los más pedidos
              </span>
            )}

            {hasQuery && !isSearching && results.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <SearchX aria-hidden="true" className={`w-10 h-10 mx-auto mb-3 ${surface.muted}`} />
                <p className="text-sm font-black">No encontramos “{searchQuery.trim()}”</p>
                <p className={`text-xs mt-1 ${surface.muted}`}>
                  Prueba con otra palabra, por ejemplo “pepperoni”, “combo” o “bebida”.
                </p>
              </div>
            ) : hasQuery && isSearching && results.length === 0 ? (
              <div aria-hidden="true" className="space-y-2 px-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                    <div className={`w-14 h-14 rounded-xl ${surface.skeleton}`} />
                    <div className="flex-1 space-y-2">
                      <div className={`h-3 w-2/3 rounded ${surface.skeleton}`} />
                      <div className={`h-3 w-1/3 rounded ${surface.skeleton}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                id={listboxId}
                role="listbox"
                aria-label="Resultados de búsqueda"
                className={`space-y-1 transition-opacity ${isSearching ? 'opacity-60' : 'opacity-100'}`}
              >
                {visibleList.map((prod, idx) => {
                  const price = minPrice(prod);
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={prod.id}
                      id={`${listboxId}-opt-${idx}`}
                      data-option-index={idx}
                      role="option"
                      aria-selected={isActive}
                      type="button"
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => choose(prod)}
                      className={`w-full p-2.5 rounded-2xl text-left flex items-center gap-3 transition-colors ${
                        isActive ? surface.rowActive : surface.row
                      }`}
                    >
                      <img
                        src={prod.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className={`w-14 h-14 rounded-xl object-cover shrink-0 ${surface.thumb}`}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] sm:text-sm font-black block truncate">
                          <Highlight text={prod.name} query={hasQuery ? debouncedQuery : ''} markClass={surface.mark} />
                        </span>
                        <span className={`text-[11px] line-clamp-1 ${surface.muted}`}>
                          {prod.description}
                        </span>
                        <span className="text-xs font-black mt-0.5 block" style={{ color: accentColor }}>
                          {prod.hasSizes ? 'Desde ' : ''}S/ {price.toFixed(2)}
                        </span>
                      </div>
                      <span
                        data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                        className="store-btn-solid w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      >
                        <ArrowRight aria-hidden="true" className="w-4 h-4" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Keyboard hints (desktop) */}
          <div
            className={`hidden md:flex items-center justify-between px-5 py-2.5 border-t text-[11px] font-semibold shrink-0 ${surface.divider} ${surface.muted}`}
          >
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <kbd className={`px-1.5 py-0.5 rounded border font-bold ${surface.kbd}`}>↑</kbd>
                <kbd className={`px-1.5 py-0.5 rounded border font-bold ${surface.kbd}`}>↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className={`px-1.5 py-0.5 rounded border font-bold inline-flex items-center ${surface.kbd}`}>
                  <CornerDownLeft aria-hidden="true" className="w-3 h-3" />
                </kbd>
                abrir
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className={`px-1.5 py-0.5 rounded border font-bold ${surface.kbd}`}>Esc</kbd>
              cerrar
            </span>
          </div>
        </div>
      )}
    </dialog>
  );
};
