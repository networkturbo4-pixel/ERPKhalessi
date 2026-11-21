import React, { useState } from 'react';
import { Store, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, Ban } from 'lucide-react';
import { BranchPriceOverride, Product } from '../../types/catalog';
import { Tenant } from '../../types/settings';

interface BranchPricingEditorProps {
  product: Product;
  tenants: Tenant[];
  onChange: (nextBranchPrices: Record<string, BranchPriceOverride>) => void;
}

export const BranchPricingEditor: React.FC<BranchPricingEditorProps> = ({
  product,
  tenants,
  onChange,
}) => {
  const [expanded, setExpanded] = useState(true);
  const branchPrices = product.branchPrices || {};

  const configuredCount = tenants.filter((t) => {
    const ov = branchPrices[t.id];
    if (!ov) return false;
    return (
      typeof ov.basePrice === 'number' ||
      typeof ov.compareAtPrice === 'number' ||
      ov.isAvailable === false ||
      (ov.sizePrices && Object.keys(ov.sizePrices).length > 0)
    );
  }).length;

  const updateBranch = (tenantId: string, patch: Partial<BranchPriceOverride>) => {
    const current = branchPrices[tenantId] || {};
    const merged: BranchPriceOverride = { ...current, ...patch };
    onChange({
      ...branchPrices,
      [tenantId]: merged,
    });
  };

  const updateBranchSizePrice = (tenantId: string, sizeId: string, valueStr: string) => {
    const current = branchPrices[tenantId] || {};
    const nextSizes = { ...(current.sizePrices || {}) };
    if (valueStr === '') {
      delete nextSizes[sizeId];
    } else {
      const parsed = parseFloat(valueStr);
      if (!Number.isNaN(parsed)) {
        nextSizes[sizeId] = parsed;
      }
    }
    updateBranch(tenantId, { sizePrices: nextSizes });
  };

  const clearBranchOverride = (tenantId: string) => {
    const next = { ...branchPrices };
    delete next[tenantId];
    onChange(next);
  };

  if (tenants.length === 0) return null;

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Precios y Disponibilidad por Sucursal</span>
              {configuredCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                  {configuredCount} {configuredCount === 1 ? 'sede personalizada' : 'sedes personalizadas'}
                </span>
              )}
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Define precios diferentes o disponibilidad por sede. Las sedes sin cambios heredan el precio maestro.
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          {tenants.map((tenant) => {
            const ov = branchPrices[tenant.id] || {};
            const isBranchAvailable = ov.isAvailable !== false;
            const hasOverride =
              typeof ov.basePrice === 'number' ||
              typeof ov.compareAtPrice === 'number' ||
              ov.isAvailable === false ||
              (ov.sizePrices && Object.keys(ov.sizePrices).length > 0);

            return (
              <div
                key={tenant.id}
                className={`p-3 rounded-xl border transition-colors space-y-2.5 ${
                  hasOverride
                    ? 'bg-white dark:bg-zinc-900 border-indigo-500/40 shadow-xs'
                    : 'bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-900 dark:text-white">
                      {tenant.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">{tenant.slug}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateBranch(tenant.id, { isAvailable: !isBranchAvailable })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                        isBranchAvailable
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isBranchAvailable ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Disponible</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3 h-3" />
                          <span>No disponible</span>
                        </>
                      )}
                    </button>

                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => clearBranchOverride(tenant.id)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                        title="Restablecer al precio maestro"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Heredar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Base price & CompareAtPrice inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">
                      Precio Base (S/)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={typeof ov.basePrice === 'number' ? ov.basePrice : ''}
                      placeholder={`Maestro: ${(product.basePrice || 0).toFixed(2)}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          const next = { ...ov };
                          delete next.basePrice;
                          onChange({ ...branchPrices, [tenant.id]: next });
                        } else {
                          const parsed = parseFloat(val);
                          if (!Number.isNaN(parsed)) {
                            updateBranch(tenant.id, { basePrice: parsed });
                          }
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">
                      Precio Antes (S/)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={typeof ov.compareAtPrice === 'number' ? ov.compareAtPrice : ''}
                      placeholder={
                        product.compareAtPrice ? `Maestro: ${product.compareAtPrice.toFixed(2)}` : 'Opcional'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          const next = { ...ov };
                          delete next.compareAtPrice;
                          onChange({ ...branchPrices, [tenant.id]: next });
                        } else {
                          const parsed = parseFloat(val);
                          if (!Number.isNaN(parsed)) {
                            updateBranch(tenant.id, { compareAtPrice: parsed });
                          }
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white"
                    />
                  </div>

                  {/* Per-size overrides when product uses sizes (Extra / Half&Half) */}
                  {product.productType !== 'apparel' &&
                    product.hasSizes &&
                    product.sizes
                      .filter((s) => s.enabled)
                      .map((sz) => (
                        <div key={sz.id}>
                          <label className="text-[10px] font-bold text-zinc-500 block mb-0.5 truncate">
                            {sz.name} (S/)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            value={
                              typeof ov.sizePrices?.[sz.id] === 'number' ? ov.sizePrices[sz.id] : ''
                            }
                            placeholder={`S/ ${sz.price.toFixed(2)}`}
                            onChange={(e) => updateBranchSizePrice(tenant.id, sz.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400"
                          />
                        </div>
                      ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
