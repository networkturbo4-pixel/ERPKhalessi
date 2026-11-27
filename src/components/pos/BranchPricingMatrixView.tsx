import React, { useState } from 'react';
import {
  Store,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  Ban,
  Package,
} from 'lucide-react';
import { BranchPriceOverride, Product, ProductCategoryItem } from '../../types/catalog';
import { Tenant } from '../../types/settings';
import { hasBranchPriceOverride } from '../../utils/productPricing';

interface BranchPricingMatrixViewProps {
  products: Product[];
  categories: ProductCategoryItem[];
  tenants: Tenant[];
  primaryColor: string;
  onUpdateProduct: (product: Product) => void;
  onOpenBranchDrawer: (product: Product) => void;
}

export const BranchPricingMatrixView: React.FC<BranchPricingMatrixViewProps> = ({
  products,
  categories,
  tenants,
  primaryColor,
  onUpdateProduct,
  onOpenBranchDrawer,
}) => {
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const visibleTenants =
    selectedTenantFilter === 'all'
      ? tenants
      : tenants.filter((t) => t.id === selectedTenantFilter);

  const getCategoryName = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    return found ? found.name : catId;
  };

  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const commitBranchPatch = (
    product: Product,
    tenantId: string,
    updater: (current: BranchPriceOverride) => BranchPriceOverride | null
  ) => {
    const nextBranchPrices: Record<string, BranchPriceOverride> = {
      ...(product.branchPrices || {}),
    };
    const updated = updater(nextBranchPrices[tenantId] || {});
    if (!updated) {
      delete nextBranchPrices[tenantId];
    } else {
      nextBranchPrices[tenantId] = updated;
    }
    onUpdateProduct({
      ...product,
      branchPrices: nextBranchPrices,
    });
  };

  const handleToggleBranchAvailability = (product: Product, tenantId: string) => {
    commitBranchPatch(product, tenantId, (current) => ({
      ...current,
      isAvailable: current.isAvailable === false ? true : false,
    }));
  };

  const handleBranchBasePriceChange = (product: Product, tenantId: string, raw: string) => {
    commitBranchPatch(product, tenantId, (current) => {
      const next = { ...current };
      if (raw === '') {
        delete next.basePrice;
      } else {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          next.basePrice = parsed;
        }
      }
      return next;
    });
  };

  const handleBranchSizePriceChange = (
    product: Product,
    tenantId: string,
    sizeId: string,
    raw: string
  ) => {
    commitBranchPatch(product, tenantId, (current) => {
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
        ...current,
        sizePrices: Object.keys(nextSizes).length > 0 ? nextSizes : undefined,
      };
    });
  };

  const handleResetProductBranches = (product: Product) => {
    onUpdateProduct({
      ...product,
      branchPrices: {},
    });
  };

  const customizedProductsCount = products.filter((p) =>
    tenants.some((t) => hasBranchPriceOverride(p, t.id) || p.branchPrices?.[t.id]?.isAvailable === false)
  ).length;

  if (tenants.length === 0) {
    return (
      <div className="p-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center space-y-2">
        <Store className="w-8 h-8 text-zinc-400 mx-auto" />
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          No hay sucursales registradas
        </p>
        <p className="text-xs text-zinc-500">
          Agrega sucursales en Configuración para gestionar precios y disponibilidad por sede.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter & Summary Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTenantFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors active:scale-[0.97] ${
              selectedTenantFilter === 'all'
                ? 'text-white font-semibold shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
            style={selectedTenantFilter === 'all' ? { backgroundColor: primaryColor } : undefined}
          >
            Todas las sedes ({tenants.length})
          </button>
          {tenants.map((t) => {
            const active = selectedTenantFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTenantFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors active:scale-[0.97] ${
                  active
                    ? 'text-white font-semibold shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
                style={active ? { backgroundColor: primaryColor } : undefined}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          {products.length} productos · {customizedProductsCount} con ajustes por sede
        </div>
      </div>

      {/* Desktop Matrix Table */}
      <div className="hidden md:block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/70 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <th className="py-3 px-4 min-w-[240px]">Producto</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Maestro</th>
                {visibleTenants.map((tenant) => (
                  <th key={tenant.id} className="py-3 px-4 min-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{tenant.name}</span>
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={visibleTenants.length + 3} className="py-12 text-center text-zinc-500">
                    <Package className="w-7 h-7 text-zinc-400 mx-auto mb-2" />
                    No hay productos que coincidan con el filtro actual.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const enabledSizes =
                    prod.productType !== 'apparel' && prod.hasSizes
                      ? (prod.sizes || []).filter((s) => s.enabled)
                      : [];
                  const isExpanded = !!expandedProductIds[prod.id];
                  const hasAnyOverride = tenants.some(
                    (t) =>
                      hasBranchPriceOverride(prod, t.id) ||
                      prod.branchPrices?.[t.id]?.isAvailable === false
                  );

                  return (
                    <React.Fragment key={prod.id}>
                      <tr className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                        {/* Product info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shrink-0">
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-900 dark:text-white truncate max-w-[200px]">
                                {prod.name}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-zinc-500">
                                  {getCategoryName(prod.category)}
                                </span>
                                {enabledSizes.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(prod.id)}
                                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                    <span>{enabledSizes.length} tamaños</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Master Price */}
                        <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                          S/ {(prod.basePrice || 0).toFixed(2)}
                        </td>

                        {/* Branch Columns */}
                        {visibleTenants.map((tenant) => {
                          const ov = prod.branchPrices?.[tenant.id] || {};
                          const isBranchAvailable = ov.isAvailable !== false;
                          const hasPriceCustom =
                            typeof ov.basePrice === 'number' ||
                            (ov.sizePrices && Object.keys(ov.sizePrices).length > 0);

                          return (
                            <td key={tenant.id} className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleBranchAvailability(prod, tenant.id)}
                                  title={
                                    isBranchAvailable
                                      ? `Pausar en ${tenant.name}`
                                      : `Activar en ${tenant.name}`
                                  }
                                  className={`p-1.5 rounded-lg border transition-colors active:scale-[0.95] shrink-0 ${
                                    isBranchAvailable
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                                  }`}
                                >
                                  {isBranchAvailable ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <Ban className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <div className="relative flex-1 min-w-[100px]">
                                  <input
                                    type="number"
                                    step="0.10"
                                    min={0}
                                    disabled={!isBranchAvailable}
                                    value={typeof ov.basePrice === 'number' ? ov.basePrice : ''}
                                    placeholder={(prod.basePrice || 0).toFixed(2)}
                                    onChange={(e) =>
                                      handleBranchBasePriceChange(prod, tenant.id, e.target.value)
                                    }
                                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs tabular-nums transition-colors focus:outline-none focus:border-zinc-400 disabled:opacity-45 ${
                                      hasPriceCustom
                                        ? 'bg-white dark:bg-zinc-950 border-zinc-400 dark:border-zinc-600 font-semibold text-zinc-950 dark:text-white'
                                        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                                    }`}
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}

                        {/* Row Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenBranchDrawer(prod)}
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-[0.96]"
                              title="Detalle de precios por sucursal"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {hasAnyOverride && (
                              <button
                                type="button"
                                onClick={() => handleResetProductBranches(prod)}
                                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors active:scale-[0.96]"
                                title="Restablecer todas las sedes al maestro"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Sizes Sub-rows */}
                      {isExpanded &&
                        enabledSizes.map((sz) => (
                          <tr
                            key={`${prod.id}-${sz.id}`}
                            className="bg-zinc-50/70 dark:bg-zinc-950/50"
                          >
                            <td className="py-2 pl-16 pr-4 text-zinc-600 dark:text-zinc-400 font-medium">
                              ↳ {sz.name}
                            </td>
                            <td className="py-2 px-4 text-right tabular-nums text-zinc-500">
                              S/ {sz.price.toFixed(2)}
                            </td>
                            {visibleTenants.map((tenant) => {
                              const ov = prod.branchPrices?.[tenant.id] || {};
                              const isBranchAvailable = ov.isAvailable !== false;
                              const val = ov.sizePrices?.[sz.id];
                              return (
                                <td key={tenant.id} className="py-2 px-4">
                                  <input
                                    type="number"
                                    step="0.10"
                                    min={0}
                                    disabled={!isBranchAvailable}
                                    value={typeof val === 'number' ? val : ''}
                                    placeholder={sz.price.toFixed(2)}
                                    onChange={(e) =>
                                      handleBranchSizePriceChange(
                                        prod,
                                        tenant.id,
                                        sz.id,
                                        e.target.value
                                      )
                                    }
                                    className={`w-full px-2.5 py-1 rounded-lg border text-xs tabular-nums focus:outline-none focus:border-zinc-400 disabled:opacity-45 ${
                                      typeof val === 'number'
                                        ? 'bg-white dark:bg-zinc-900 border-zinc-400 dark:border-zinc-600 font-semibold text-zinc-950 dark:text-white'
                                        : 'bg-white/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                  />
                                </td>
                              );
                            })}
                            <td className="py-2 px-4" />
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="block md:hidden space-y-3">
        {products.map((prod) => (
          <div
            key={`mob-matrix-${prod.id}`}
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={prod.imageUrl}
                  alt={prod.name}
                  className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {prod.name}
                  </div>
                  <div className="text-xs text-zinc-500 tabular-nums">
                    Maestro: S/ {(prod.basePrice || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenBranchDrawer(prod)}
                className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 active:scale-[0.97]"
              >
                Detalle
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {visibleTenants.map((tenant) => {
                const ov = prod.branchPrices?.[tenant.id] || {};
                const isBranchAvailable = ov.isAvailable !== false;
                return (
                  <div key={tenant.id} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleBranchAvailability(prod, tenant.id)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium truncate ${
                        isBranchAvailable
                          ? 'text-zinc-800 dark:text-zinc-200'
                          : 'text-zinc-400 line-through'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isBranchAvailable ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="truncate">{tenant.name}</span>
                    </button>
                    <input
                      type="number"
                      step="0.10"
                      min={0}
                      disabled={!isBranchAvailable}
                      value={typeof ov.basePrice === 'number' ? ov.basePrice : ''}
                      placeholder={`S/ ${(prod.basePrice || 0).toFixed(2)}`}
                      onChange={(e) =>
                        handleBranchBasePriceChange(prod, tenant.id, e.target.value)
                      }
                      className="w-28 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs tabular-nums text-right text-zinc-900 dark:text-white disabled:opacity-45"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
