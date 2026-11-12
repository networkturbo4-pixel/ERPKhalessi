import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { Recipe, RecipeLine } from '../../types/inventory';
import { resolveRecipeLines, calculateRecipeCostAndMargin } from '../../utils/inventoryEngine';
import { ChefHat, Plus, Trash2, Scale, Percent, AlertTriangle, Sparkles, Check, ArrowRight } from 'lucide-react';

export const RecipeEditor: React.FC = () => {
  const { recipes, saveRecipe, deleteRecipe, items, stockLevels } = useInventory();
  const { products } = useOrderCatalog();
  const { activeTenant, openNoticeModal, dispatchToast } = useSettings();

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedSizeId, setSelectedSizeId] = useState<string>('familiar');

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const availableSizes = selectedProduct?.sizes || [];

  // Active recipe for current product and size
  const activeRecipe = recipes.find(
    r => r.productId === selectedProductId && (r.sizeId || '') === (selectedSizeId || '')
  );

  // Is inherit mode?
  const [isInheritMode, setIsInheritMode] = useState<boolean>(Boolean(activeRecipe?.inheritFromSizeId));
  const [inheritFromSize, setInheritFromSize] = useState<string>(activeRecipe?.inheritFromSizeId || 'familiar');
  const [scaleFactor, setScaleFactor] = useState<number>(activeRecipe?.scaleFactor || 0.6);

  // Form lines
  const [lines, setLines] = useState<RecipeLine[]>(() => {
    return activeRecipe ? [...activeRecipe.lines] : [];
  });
  const [yieldNote, setYieldNote] = useState<string>(activeRecipe?.yieldNote || '');

  // Selling price
  const sellingPrice = selectedProduct?.hasSizes
    ? (selectedProduct.sizes.find(s => s.id === selectedSizeId)?.price || selectedProduct.basePrice)
    : selectedProduct?.basePrice || 0;

  // Resolved lines if inheriting
  const effectiveLines = isInheritMode
    ? resolveRecipeLines(recipes, selectedProductId, selectedSizeId)
    : lines;

  const { totalCost, marginPct, isUnderThreshold } = calculateRecipeCostAndMargin(
    effectiveLines,
    items,
    stockLevels,
    activeTenant?.id || 'tenant-1',
    sellingPrice
  );

  // Switch product or size
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    const firstSize = prod?.sizes[0]?.id || 'familiar';
    setSelectedSizeId(firstSize);

    const rec = recipes.find(r => r.productId === prodId && (r.sizeId || '') === firstSize);
    if (rec) {
      setLines([...rec.lines]);
      setIsInheritMode(Boolean(rec.inheritFromSizeId));
      setInheritFromSize(rec.inheritFromSizeId || 'familiar');
      setScaleFactor(rec.scaleFactor || 0.6);
      setYieldNote(rec.yieldNote || '');
    } else {
      setLines([]);
      setIsInheritMode(false);
      setYieldNote('');
    }
  };

  const handleSelectSize = (szId: string) => {
    setSelectedSizeId(szId);
    const rec = recipes.find(r => r.productId === selectedProductId && (r.sizeId || '') === szId);
    if (rec) {
      setLines([...rec.lines]);
      setIsInheritMode(Boolean(rec.inheritFromSizeId));
      setInheritFromSize(rec.inheritFromSizeId || 'familiar');
      setScaleFactor(rec.scaleFactor || 0.6);
      setYieldNote(rec.yieldNote || '');
    } else {
      setLines([]);
      setIsInheritMode(false);
      setYieldNote('');
    }
  };

  const handleAddLine = () => {
    const firstAvailable = items[0]?.id || '';
    setLines(prev => [...prev, { itemId: firstAvailable, quantity: 0.1, critical: true }]);
  };

  const handleUpdateLine = (index: number, patch: Partial<RecipeLine>) => {
    setLines(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleRemoveLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const recipeToSave: Recipe = {
      id: activeRecipe?.id || `rec-${selectedProductId}-${selectedSizeId || 'std'}-${Date.now()}`,
      productId: selectedProductId,
      sizeId: selectedSizeId,
      inheritFromSizeId: isInheritMode ? inheritFromSize : undefined,
      scaleFactor: isInheritMode ? scaleFactor : undefined,
      lines: isInheritMode ? [] : lines,
      yieldNote: yieldNote.trim() || undefined,
    };

    saveRecipe(recipeToSave);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Product & Size selector */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                Escandallos y Recetas (BOM)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Formula las cantidades exactas por tamaño o hereda escalando factores porcentuales.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Product Selector */}
            <select
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Size Selector */}
            {availableSizes.length > 0 && (
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                {availableSizes.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSize(s.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      selectedSizeId === s.id
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Recipe Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lines and Configuration (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Modo de Formulación
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInheritMode(false)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      !isInheritMode
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    Receta Propia
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInheritMode(true)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all ${
                      isInheritMode
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    Heredar y Escalar
                  </button>
                </div>
              </div>

              {!isInheritMode && (
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Insumo
                </button>
              )}
            </div>

            {/* Inherit & Scale Configuration */}
            {isInheritMode ? (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-4 mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Scale className="w-4 h-4" />
                  Heredando automáticamente los insumos de otro tamaño:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Tamaño Base de Referencia</label>
                    <select
                      value={inheritFromSize}
                      onChange={(e) => setInheritFromSize(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold"
                    >
                      {availableSizes.filter(s => s.id !== selectedSizeId).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Factor de Escala (% Multiplicador)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="3.0"
                        value={scaleFactor}
                        onChange={(e) => setScaleFactor(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold font-mono"
                      />
                      <span className="text-xs font-bold text-zinc-400 whitespace-nowrap">
                        = {(scaleFactor * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Si cambias la receta base en el futuro, las cantidades de este tamaño se recalcularán automáticamente en tiempo real.
                </p>
              </div>
            ) : null}

            {/* Insumos Lines Table */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3.5">Insumo</th>
                    <th className="p-3.5 w-32">Cantidad</th>
                    <th className="p-3.5 w-24">Unidad</th>
                    <th className="p-3.5 w-28 text-right">Costo Sub.</th>
                    <th className="p-3.5 w-24 text-center">Crítico</th>
                    {!isInheritMode && <th className="p-3.5 w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {effectiveLines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-zinc-400">
                        {isInheritMode
                          ? 'No hay insumos definidos en el tamaño base.'
                          : 'Aún no has agregado insumos a esta receta. Haz clic en "Añadir Insumo".'}
                      </td>
                    </tr>
                  ) : (
                    effectiveLines.map((line, idx) => {
                      const item = items.find(i => i.id === line.itemId);
                      const unitCost = item?.costPerUnit || 0;
                      const subtotal = line.quantity * unitCost;

                      return (
                        <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3.5">
                            {isInheritMode ? (
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {item?.name || 'Insumo no encontrado'}
                              </div>
                            ) : (
                              <select
                                value={line.itemId}
                                onChange={(e) => handleUpdateLine(idx, { itemId: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium"
                              >
                                {items.map(i => (
                                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="p-3.5">
                            {isInheritMode ? (
                              <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                {line.quantity}
                              </span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                min="0.001"
                                value={line.quantity}
                                onChange={(e) => handleUpdateLine(idx, { quantity: Number(e.target.value) })}
                                className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
                              />
                            )}
                          </td>
                          <td className="p-3.5 text-xs text-zinc-500 font-mono">
                            {item?.unit || 'und'}
                          </td>
                          <td className="p-3.5 text-right font-mono font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                            S/ {subtotal.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              disabled={isInheritMode}
                              checked={line.critical ?? true}
                              onChange={(e) => handleUpdateLine(idx, { critical: e.target.checked })}
                              title="Si es crítico y no hay stock, el producto se marca como agotado"
                              className="rounded text-amber-600 focus:ring-amber-500/20"
                            />
                          </td>
                          {!isInheritMode && (
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Yield Note & Save */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <input
                type="text"
                placeholder="Notas de rendimiento (ej. Rinde 1 pizza 8 porciones)..."
                value={yieldNote}
                onChange={(e) => setYieldNote(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
              />

              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-600/20 flex items-center gap-2 whitespace-nowrap shrink-0 transition-all"
              >
                <Check className="w-4 h-4" />
                Guardar Receta
              </button>
            </div>
          </div>
        </div>

        {/* Costing & Profit Margin Card (1 col) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-500" />
              Análisis de Costeo y Margen
            </h4>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 block mb-1">Precio de Venta Carta</span>
                <span className="text-2xl font-black font-mono text-zinc-900 dark:text-white">
                  S/ {sellingPrice.toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 block mb-1">Costo de Insumos (BOM)</span>
                <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                  S/ {totalCost.toFixed(2)}
                </span>
              </div>

              <div className={`p-4 rounded-2xl border ${
                isUnderThreshold
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Margen Bruto</span>
                  {isUnderThreshold && <AlertTriangle className="w-4 h-4" />}
                </div>
                <div className="text-3xl font-black font-mono">
                  {marginPct}%
                </div>
                <span className="text-[11px] block mt-1">
                  {isUnderThreshold
                    ? '¡Alerta! Margen por debajo del umbral mínimo recomendado (60%).'
                    : 'Excelente rentabilidad operativa sobre costo de materia prima.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
