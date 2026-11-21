import React, { useState } from 'react';
import {
  Shirt,
  Palette,
  Ruler,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Gift,
  Sparkles,
  FileImage,
  Barcode,
} from 'lucide-react';
import {
  ApparelColorOption,
  ApparelConfig,
  ApparelModelOption,
  ApparelSizeOption,
  ApparelVariantItem,
} from '../../types/catalog';
import { Tenant } from '../../types/settings';

interface ApparelConfigEditorProps {
  config: ApparelConfig;
  basePrice: number;
  productName: string;
  tenants: Tenant[];
  onChange: (next: ApparelConfig) => void;
  onOpenMediaPicker?: (title: string, onSelect: (url: string) => void) => void;
}

export const DEFAULT_APPAREL_CONFIG: ApparelConfig = {
  sizes: [
    { id: 'sz-s', name: 'S', priceDelta: 0, enabled: true },
    { id: 'sz-m', name: 'M', priceDelta: 0, enabled: true },
    { id: 'sz-l', name: 'L', priceDelta: 0, enabled: true },
    { id: 'sz-xl', name: 'XL', priceDelta: 0, enabled: true },
  ],
  colors: [
    { id: 'col-negro', name: 'Negro', hex: '#18181b', priceDelta: 0, enabled: true },
    { id: 'col-blanco', name: 'Blanco', hex: '#f4f4f5', priceDelta: 0, enabled: true },
  ],
  models: [
    { id: 'mod-regular', name: 'Regular Fit', description: 'Corte clásico', priceDelta: 0, enabled: true },
  ],
  variants: [],
  gender: 'unisex',
  material: '',
  brand: '',
  collection: '',
  sizeGuideText: '',
  allowGiftWrap: false,
  giftWrapPrice: 5,
  allowCustomPrint: false,
  customPrintLabel: 'Bordado / Estampado personalizado',
  customPrintPrice: 10,
};

const SIZE_PRESETS: Record<string, string[]> = {
  'Letras (XS-XXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Pantalón (28-36)': ['28', '30', '32', '34', '36'],
  'Calzado (36-44)': ['36', '37', '38', '39', '40', '41', '42', '43', '44'],
  'Niños (2-12)': ['2', '4', '6', '8', '10', '12'],
};

export const ApparelConfigEditor: React.FC<ApparelConfigEditorProps> = ({
  config,
  basePrice,
  productName,
  tenants,
  onChange,
  onOpenMediaPicker,
}) => {
  const [newSizeName, setNewSizeName] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#2563eb');
  const [newModelName, setNewModelName] = useState('');
  const [newModelDesc, setNewModelDesc] = useState('');

  const update = (patch: Partial<ApparelConfig>) => {
    onChange({ ...config, ...patch });
  };

  // --- Tallas ---
  const applySizePreset = (presetKey: string) => {
    const names = SIZE_PRESETS[presetKey] || [];
    const nextSizes: ApparelSizeOption[] = names.map((name, idx) => ({
      id: `sz-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now() + idx}`,
      name,
      priceDelta: 0,
      enabled: true,
    }));
    update({ sizes: nextSizes });
  };

  const addSize = () => {
    const trimmed = newSizeName.trim();
    if (!trimmed) return;
    if (config.sizes.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    const item: ApparelSizeOption = {
      id: `sz-${Date.now()}`,
      name: trimmed,
      priceDelta: 0,
      enabled: true,
    };
    update({ sizes: [...config.sizes, item] });
    setNewSizeName('');
  };

  // --- Colores ---
  const addColor = () => {
    const trimmed = newColorName.trim();
    if (!trimmed) return;
    const item: ApparelColorOption = {
      id: `col-${Date.now()}`,
      name: trimmed,
      hex: newColorHex,
      priceDelta: 0,
      enabled: true,
    };
    update({ colors: [...config.colors, item] });
    setNewColorName('');
  };

  // --- Modelos ---
  const addModel = () => {
    const trimmed = newModelName.trim();
    if (!trimmed) return;
    const item: ApparelModelOption = {
      id: `mod-${Date.now()}`,
      name: trimmed,
      description: newModelDesc.trim() || undefined,
      priceDelta: 0,
      enabled: true,
    };
    update({ models: [...config.models, item] });
    setNewModelName('');
    setNewModelDesc('');
  };

  // --- Matriz de Variantes ---
  const generateVariantsMatrix = () => {
    const activeSizes = config.sizes.filter((s) => s.enabled);
    const activeColors = config.colors.filter((c) => c.enabled);
    const activeModels = config.models.filter((m) => m.enabled);

    const sizeList: (ApparelSizeOption | undefined)[] = activeSizes.length > 0 ? activeSizes : [undefined];
    const colorList: (ApparelColorOption | undefined)[] = activeColors.length > 0 ? activeColors : [undefined];
    const modelList: (ApparelModelOption | undefined)[] = activeModels.length > 0 ? activeModels : [undefined];

    const prefix = (productName || 'PRD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 4) || 'PRD';

    const existingMap = new Map(config.variants.map((v) => [v.id, v]));
    const nextVariants: ApparelVariantItem[] = [];

    for (const sz of sizeList) {
      for (const col of colorList) {
        for (const mod of modelList) {
          const id = `${sz?.id || 'none'}::${col?.id || 'none'}::${mod?.id || 'none'}`;
          const existing = existingMap.get(id);
          if (existing) {
            nextVariants.push(existing);
          } else {
            const skuParts = [
              prefix,
              mod ? mod.name.slice(0, 3).toUpperCase() : '',
              col ? col.name.slice(0, 3).toUpperCase() : '',
              sz ? sz.name.toUpperCase() : '',
            ].filter(Boolean);
            const defaultStock: Record<string, number> = {};
            tenants.forEach((t) => {
              defaultStock[t.id] = 10;
            });
            nextVariants.push({
              id,
              sizeId: sz?.id,
              colorId: col?.id,
              modelId: mod?.id,
              sku: skuParts.join('-'),
              barcode: '',
              stockByBranch: defaultStock,
              enabled: true,
            });
          }
        }
      }
    }

    update({ variants: nextVariants });
  };

  const updateVariant = (variantId: string, patch: Partial<ApparelVariantItem>) => {
    update({
      variants: config.variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v)),
    });
  };

  const updateVariantStock = (variantId: string, tenantId: string, qty: number) => {
    update({
      variants: config.variants.map((v) =>
        v.id === variantId
          ? {
              ...v,
              stockByBranch: {
                ...(v.stockByBranch || {}),
                [tenantId]: Math.max(0, qty),
              },
            }
          : v
      ),
    });
  };

  const getLabel = (v: ApparelVariantItem) => {
    const sz = config.sizes.find((s) => s.id === v.sizeId)?.name;
    const col = config.colors.find((c) => c.id === v.colorId);
    const mod = config.models.find((m) => m.id === v.modelId)?.name;
    return { sz, col, mod };
  };

  return (
    <div className="space-y-4">
      {/* 1. Datos Textiles / Retail */}
      <div className="p-4 bg-sky-500/5 dark:bg-sky-500/10 rounded-2xl border border-sky-500/30 space-y-3">
        <div className="flex items-center gap-2">
          <Shirt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
            Ficha Técnica de Ropa / Retail
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
              Marca
            </label>
            <input
              type="text"
              value={config.brand || ''}
              onChange={(e) => update({ brand: e.target.value })}
              placeholder="Ej: Khalessi Wear"
              className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
              Material / Tela
            </label>
            <input
              type="text"
              value={config.material || ''}
              onChange={(e) => update({ material: e.target.value })}
              placeholder="Ej: 100% Algodón Pima"
              className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
              Colección / Temporada
            </label>
            <input
              type="text"
              value={config.collection || ''}
              onChange={(e) => update({ collection: e.target.value })}
              placeholder="Ej: Urbano 2026"
              className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
              Género / Línea
            </label>
            <select
              value={config.gender || 'unisex'}
              onChange={(e) =>
                update({ gender: e.target.value as ApparelConfig['gender'] })
              }
              className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
            >
              <option value="unisex">Unisex</option>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
              <option value="kids">Niños / Kids</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Selector de Tallas */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
              Tallas Disponibles ({config.sizes.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(SIZE_PRESETS).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applySizePreset(preset)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-amber-500 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.sizes.map((sz) => (
            <div
              key={sz.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs ${
                sz.enabled
                  ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                  : 'bg-zinc-100 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-50'
              }`}
            >
              <input
                type="checkbox"
                checked={sz.enabled}
                onChange={(e) =>
                  update({
                    sizes: config.sizes.map((s) =>
                      s.id === sz.id ? { ...s, enabled: e.target.checked } : s
                    ),
                  })
                }
                className="accent-amber-500"
              />
              <span className="font-black text-zinc-900 dark:text-white">{sz.name}</span>
              <input
                type="number"
                step="0.5"
                value={sz.priceDelta || 0}
                onChange={(e) =>
                  update({
                    sizes: config.sizes.map((s) =>
                      s.id === sz.id ? { ...s, priceDelta: parseFloat(e.target.value) || 0 } : s
                    ),
                  })
                }
                title="Incremento de precio (+S/)"
                className="w-14 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md text-[11px] text-center font-bold text-amber-600 dark:text-amber-400"
              />
              <button
                type="button"
                onClick={() =>
                  update({ sizes: config.sizes.filter((s) => s.id !== sz.id) })
                }
                className="text-zinc-400 hover:text-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSizeName}
            onChange={(e) => setNewSizeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
            placeholder="Nueva talla (Ej: 3XL, 45, Única)..."
            className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
          />
          <button
            type="button"
            onClick={addSize}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Talla</span>
          </button>
        </div>
      </div>

      {/* 3. Selector de Colores */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-500" />
          <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
            Colores y Fotos por Color ({config.colors.length})
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {config.colors.map((col) => (
            <div
              key={col.id}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5"
            >
              <input
                type="color"
                value={col.hex}
                onChange={(e) =>
                  update({
                    colors: config.colors.map((c) =>
                      c.id === col.id ? { ...c, hex: e.target.value } : c
                    ),
                  })
                }
                className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0 p-0.5 bg-transparent"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) =>
                    update({
                      colors: config.colors.map((c) =>
                        c.id === col.id ? { ...c, name: e.target.value } : c
                      ),
                    })
                  }
                  className="w-full px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400">+S/</span>
                  <input
                    type="number"
                    step="0.5"
                    value={col.priceDelta || 0}
                    onChange={(e) =>
                      update({
                        colors: config.colors.map((c) =>
                          c.id === col.id ? { ...c, priceDelta: parseFloat(e.target.value) || 0 } : c
                        ),
                      })
                    }
                    className="w-14 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded text-[11px] font-bold text-amber-600 dark:text-amber-400"
                  />
                  {onOpenMediaPicker && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenMediaPicker(`Foto para color ${col.name}`, (url) =>
                          update({
                            colors: config.colors.map((c) =>
                              c.id === col.id ? { ...c, imageUrl: url } : c
                            ),
                          })
                        )
                      }
                      className="px-2 py-0.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <FileImage className="w-3 h-3" />
                      <span>{col.imageUrl ? 'Cambiar Foto' : 'Foto Color'}</span>
                    </button>
                  )}
                  {col.imageUrl && (
                    <img
                      src={col.imageUrl}
                      alt={col.name}
                      className="w-5 h-5 rounded object-cover border border-zinc-300 dark:border-zinc-700"
                    />
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  update({ colors: config.colors.filter((c) => c.id !== col.id) })
                }
                className="p-1.5 text-zinc-400 hover:text-rose-500 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={newColorHex}
            onChange={(e) => setNewColorHex(e.target.value)}
            className="w-9 h-9 rounded-xl border border-zinc-300 dark:border-zinc-700 cursor-pointer p-0.5 bg-white dark:bg-zinc-900"
          />
          <input
            type="text"
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
            placeholder="Nombre del color (Ej: Azul Marino, Beige)..."
            className="flex-1 min-w-[160px] px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
          />
          <button
            type="button"
            onClick={addColor}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Color</span>
          </button>
        </div>
      </div>

      {/* 4. Selector de Modelos / Cortes */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-500" />
          <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
            Modelos / Cortes / Estilos ({config.models.length})
          </h4>
        </div>

        <div className="space-y-2">
          {config.models.map((mod) => (
            <div
              key={mod.id}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2"
            >
              <input
                type="checkbox"
                checked={mod.enabled}
                onChange={(e) =>
                  update({
                    models: config.models.map((m) =>
                      m.id === mod.id ? { ...m, enabled: e.target.checked } : m
                    ),
                  })
                }
                className="accent-emerald-500"
              />
              <input
                type="text"
                value={mod.name}
                onChange={(e) =>
                  update({
                    models: config.models.map((m) =>
                      m.id === mod.id ? { ...m, name: e.target.value } : m
                    ),
                  })
                }
                placeholder="Ej: Oversize, Slim Fit, Cuello V"
                className="flex-1 min-w-[140px] px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white"
              />
              <input
                type="text"
                value={mod.description || ''}
                onChange={(e) =>
                  update({
                    models: config.models.map((m) =>
                      m.id === mod.id ? { ...m, description: e.target.value } : m
                    ),
                  })
                }
                placeholder="Detalle del corte (opcional)"
                className="flex-1 min-w-[140px] px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300"
              />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-400">+S/</span>
                <input
                  type="number"
                  step="0.5"
                  value={mod.priceDelta || 0}
                  onChange={(e) =>
                    update({
                      models: config.models.map((m) =>
                        m.id === mod.id ? { ...m, priceDelta: parseFloat(e.target.value) || 0 } : m
                      ),
                    })
                  }
                  className="w-16 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  update({ models: config.models.filter((m) => m.id !== mod.id) })
                }
                className="p-1.5 text-zinc-400 hover:text-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="Nuevo modelo (Ej: Oversize, Manga Larga)..."
            className="flex-1 min-w-[160px] px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
          />
          <input
            type="text"
            value={newModelDesc}
            onChange={(e) => setNewModelDesc(e.target.value)}
            placeholder="Descripción corta (opcional)"
            className="flex-1 min-w-[140px] px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
          />
          <button
            type="button"
            onClick={addModel}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Modelo</span>
          </button>
        </div>
      </div>

      {/* 5. Opciones para Empresas de Ropa (Guía de tallas, Empaque, Personalización) */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
            Opciones Especiales para Empresas de Ropa
          </h4>
        </div>

        <div>
          <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
            Guía de Tallas / Medidas (Se muestra al cliente en Tienda y POS)
          </label>
          <textarea
            rows={2}
            value={config.sizeGuideText || ''}
            onChange={(e) => update({ sizeGuideText: e.target.value })}
            placeholder="Ej: S (Pecho 94cm, Largo 68cm) · M (Pecho 100cm, Largo 71cm) · L (Pecho 106cm, Largo 74cm)"
            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <Gift className="w-4 h-4 text-rose-500" />
                <span>Permitir Empaque de Regalo</span>
              </span>
              <input
                type="checkbox"
                checked={config.allowGiftWrap ?? false}
                onChange={(e) => update({ allowGiftWrap: e.target.checked })}
                className="accent-amber-500"
              />
            </label>
            {config.allowGiftWrap && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">Costo adicional (S/):</span>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={config.giftWrapPrice ?? 0}
                  onChange={(e) => update({ giftWrapPrice: parseFloat(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold"
                />
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Bordado / Estampado Personalizado</span>
              </span>
              <input
                type="checkbox"
                checked={config.allowCustomPrint ?? false}
                onChange={(e) => update({ allowCustomPrint: e.target.checked })}
                className="accent-amber-500"
              />
            </label>
            {config.allowCustomPrint && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={config.customPrintLabel || ''}
                  onChange={(e) => update({ customPrintLabel: e.target.value })}
                  placeholder="Etiqueta (Ej: Iniciales bordadas)"
                  className="flex-1 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                />
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={config.customPrintPrice ?? 0}
                  onChange={(e) => update({ customPrintPrice: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Matriz de Variantes (SKU, Código de Barras, Precio y Stock por Sucursal) */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-indigo-500" />
            <div>
              <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
                Matriz de Variantes ({config.variants.length} combinaciones)
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Genera SKU, código de barras, precio específico opcional y stock por sucursal para cada Talla × Color × Modelo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={generateVariantsMatrix}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generar / Sincronizar Variantes</span>
          </button>
        </div>

        {config.variants.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2 px-2.5">Variante</th>
                  <th className="py-2 px-2.5">SKU</th>
                  <th className="py-2 px-2.5">Cód. Barras</th>
                  <th className="py-2 px-2.5">Precio (Opcional)</th>
                  {tenants.map((t) => (
                    <th key={t.id} className="py-2 px-2.5 whitespace-nowrap">
                      Stock {t.name.replace('Gastro - ', '')}
                    </th>
                  ))}
                  <th className="py-2 px-2.5 text-center">Activa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {config.variants.map((v) => {
                  const { sz, col, mod } = getLabel(v);
                  return (
                    <tr key={v.id} className={!v.enabled ? 'opacity-50' : ''}>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                          {col && (
                            <span
                              className="w-3 h-3 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0"
                              style={{ backgroundColor: col.hex }}
                            />
                          )}
                          <span>
                            {[mod, col?.name, sz].filter(Boolean).join(' · ') || 'Única'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          value={v.sku || ''}
                          onChange={(e) => updateVariant(v.id, { sku: e.target.value })}
                          className="w-28 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded text-[11px] font-mono"
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          value={v.barcode || ''}
                          onChange={(e) => updateVariant(v.id, { barcode: e.target.value })}
                          placeholder="EAN/UPC"
                          className="w-24 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded text-[11px] font-mono"
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={typeof v.priceOverride === 'number' ? v.priceOverride : ''}
                          placeholder={`S/ ${basePrice.toFixed(2)}`}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateVariant(v.id, {
                              priceOverride: val === '' ? undefined : parseFloat(val) || 0,
                            });
                          }}
                          className="w-20 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded text-[11px] font-bold text-amber-600 dark:text-amber-400"
                        />
                      </td>
                      {tenants.map((t) => (
                        <td key={t.id} className="py-2 px-2.5">
                          <input
                            type="number"
                            min={0}
                            value={v.stockByBranch?.[t.id] ?? 0}
                            onChange={(e) =>
                              updateVariantStock(v.id, t.id, parseInt(e.target.value, 10) || 0)
                            }
                            className="w-16 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded text-[11px] text-center font-bold"
                          />
                        </td>
                      ))}
                      <td className="py-2 px-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={v.enabled}
                          onChange={(e) => updateVariant(v.id, { enabled: e.target.checked })}
                          className="accent-indigo-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
