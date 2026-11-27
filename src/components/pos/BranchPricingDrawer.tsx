import React, { useEffect, useState } from 'react';
import { X, Store, RotateCcw, Check, Ban, CheckCircle2 } from 'lucide-react';
import { BranchPriceOverride, Product } from '../../types/catalog';
import { Tenant } from '../../types/settings';

interface BranchPricingDrawerProps {
  product: Product | null;
  tenants: Tenant[];
  primaryColor: string;
  onClose: () => void;
  onSave: (productId: string, nextBranchPrices: Record<string, BranchPriceOverride>) => void;
}

export const BranchPricingDrawer: React.FC<BranchPricingDrawerProps> = ({
  product,
  tenants,
  primaryColor,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<Record<string, BranchPriceOverride>>(() =>
    product ? JSON.parse(JSON.stringify(product.branchPrices || {})) : {}
  );

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const enabledSizes =
    product.productType !== 'apparel' && product.hasSizes
      ? (product.sizes || []).filter((s) => s.enabled)
      : [];

  const updateBranch = (tenantId: string, patch: Partial<BranchPriceOverride>) => {
    setDraft((prev) => ({
      ...prev,
      [tenantId]: {
        ...(prev[tenantId] || {}),
        ...patch,
      },
    }));
  };

  const clearField = (tenantId: string, field: 'basePrice' | 'compareAtPrice') => {
    setDraft((prev) => {
      const current = { ...(prev[tenantId] || {}) };
      delete current[field];
      return { ...prev, [tenantId]: current };
    });
  };

  const updateBranchSizePrice = (tenantId: string, sizeId: string, raw: string) => {
    setDraft((prev) => {
      const current = prev[tenantId] || {};
      const nextSizes = { ...(current.sizePrices || {}) };
      if (raw === '') {
        delete nextSizes[sizeId];
      } else {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          nextSizes[sizeId] = parsed;
        }
      }
      return {
        ...prev,
        [tenantId]: {
          ...current,
          sizePrices: nextSizes,
        },
      };
    });
  };

  const clearBranchOverride = (tenantId: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[tenantId];
      return next;
    });
  };

  const handleEnableAll = () => {
    setDraft((prev) => {
      const next = { ...prev };
      tenants.forEach((t) => {
        if (next[t.id]) {
          next[t.id] = { ...next[t.id], isAvailable: true };
        }
      });
      return next;
    });
  };

  const handleResetAll = () => {
    setDraft({});
  };

  const hasBranchCustom = (tenantId: string) => {
    const ov = draft[tenantId];
    if (!ov) return false;
    return (
      typeof ov.basePrice === 'number' ||
      typeof ov.compareAtPrice === 'number' ||
      ov.isAvailable === false ||
      (ov.sizePrices ? Object.keys(ov.sizePrices).length > 0 : false)
    );
  };

  const availableCount = tenants.filter((t) => draft[t.id]?.isAvailable !== false).length;
  const customizedCount = tenants.filter((t) => hasBranchCustom(t.id)).length;

  const handleCommit = () => {
    // Prune empty override objects
    const cleaned: Record<string, BranchPriceOverride> = {};
    Object.entries(draft).forEach(([tid, ov]) => {
      const cleanSizes = ov.sizePrices && Object.keys(ov.sizePrices).length > 0 ? ov.sizePrices : undefined;
      const hasAny =
        typeof ov.basePrice === 'number' ||
        typeof ov.compareAtPrice === 'number' ||
        ov.isAvailable === false ||
        !!cleanSizes ||
        (ov.extraPrices && Object.keys(ov.extraPrices).length > 0);
      if (hasAny) {
        cleaned[tid] = {
          ...ov,
          ...(cleanSizes ? { sizePrices: cleanSizes } : { sizePrices: undefined }),
        };
      }
    });
    onSave(product.id, cleaned);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-pricing-drawer-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shrink-0">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <Store className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3
                id="branch-pricing-drawer-title"
                className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white truncate"
              >
                {product.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                Precio maestro: S/ {(product.basePrice || 0).toFixed(2)} · {availableCount}/{tenants.length} sedes activas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de sucursales"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-5 py-3 bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Las sedes sin cambios heredan el precio maestro automáticamente.
          </span>
          <div className="flex items-center gap-2">
            {availableCount < tenants.length && (
              <button
                type="button"
                onClick={handleEnableAll}
                className="whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
              >
                Activar todas
              </button>
            )}
            {customizedCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800 transition-colors active:scale-[0.97]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Heredar en todas</span>
              </button>
            )}
          </div>
        </div>

        {/* Branches List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tenants.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              No hay sucursales configuradas en el sistema.
            </div>
          ) : (
            tenants.map((tenant) => {
              const ov = draft[tenant.id] || {};
              const isBranchAvailable = ov.isAvailable !== false;
              const isCustom = hasBranchCustom(tenant.id);

              return (
                <div
                  key={tenant.id}
                  className={`p-4 rounded-2xl border transition-colors space-y-3 ${
                    !isBranchAvailable
                      ? 'bg-zinc-50/70 dark:bg-zinc-950/40 border-zinc-200/80 dark:border-zinc-800/80 opacity-80'
                      : isCustom
                        ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-xs'
                        : 'bg-zinc-50/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isBranchAvailable ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {tenant.name}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 truncate">
                        {tenant.slug}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => clearBranchOverride(tenant.id)}
                          className="whitespace-nowrap shrink-0 px-2 py-1 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 transition-colors"
                          title="Restablecer al precio maestro"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Heredar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateBranch(tenant.id, { isAvailable: !isBranchAvailable })}
                        className={`whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors active:scale-[0.97] ${
                          isBranchAvailable
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                        }`}
                      >
                        {isBranchAvailable ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Disponible</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            <span>Pausado</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Base & CompareAt Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                        Precio base (S/)
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        min={0}
                        value={typeof ov.basePrice === 'number' ? ov.basePrice : ''}
                        placeholder={`Maestro: ${(product.basePrice || 0).toFixed(2)}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            clearField(tenant.id, 'basePrice');
                          } else {
                            const parsed = parseFloat(val);
                            if (!Number.isNaN(parsed) && parsed >= 0) {
                              updateBranch(tenant.id, { basePrice: parsed });
                            }
                          }
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs font-medium tabular-nums text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                        Precio antes (S/)
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        min={0}
                        value={typeof ov.compareAtPrice === 'number' ? ov.compareAtPrice : ''}
                        placeholder={
                          product.compareAtPrice
                            ? `Maestro: ${product.compareAtPrice.toFixed(2)}`
                            : 'Opcional'
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            clearField(tenant.id, 'compareAtPrice');
                          } else {
                            const parsed = parseFloat(val);
                            if (!Number.isNaN(parsed) && parsed >= 0) {
                              updateBranch(tenant.id, { compareAtPrice: parsed });
                            }
                          }
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs font-medium tabular-nums text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>

                  {/* Per-Size Pricing Overrides */}
                  {enabledSizes.length > 0 && (
                    <div className="pt-2.5 border-t border-zinc-200/70 dark:border-zinc-800 space-y-2">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                        Precios por tamaño en {tenant.name}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {enabledSizes.map((sz) => (
                          <div key={sz.id}>
                            <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">
                              {sz.name}
                            </label>
                            <input
                              type="number"
                              step="0.10"
                              min={0}
                              value={
                                typeof ov.sizePrices?.[sz.id] === 'number'
                                  ? ov.sizePrices[sz.id]
                                  : ''
                              }
                              placeholder={`S/ ${sz.price.toFixed(2)}`}
                              onChange={(e) =>
                                updateBranchSizePrice(tenant.id, sz.id, e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs font-medium tabular-nums text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {customizedCount === 0
              ? 'Todas las sedes usan el precio maestro'
              : `${customizedCount} ${customizedCount === 1 ? 'sede con ajustes' : 'sedes con ajustes'}`}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors active:scale-[0.97]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCommit}
              className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-opacity hover:opacity-95 active:scale-[0.97]"
              style={{ backgroundColor: primaryColor }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar precios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
