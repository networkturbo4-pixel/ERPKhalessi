import React, { useMemo, useState } from 'react';
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
  Check,
  Wand2,
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
  primaryColor?: string;
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
  'Talla Única': ['Única'],
};

const QUICK_COLOR_SWATCHES: Array<{ name: string; hex: string }> = [
  { name: 'Negro', hex: '#18181b' },
  { name: 'Blanco', hex: '#f8fafc' },
  { name: 'Gris Melange', hex: '#9ca3af' },
  { name: 'Azul Marino', hex: '#1e3a5f' },
  { name: 'Beige', hex: '#d6c7b2' },
  { name: 'Rojo', hex: '#dc2626' },
  { name: 'Verde Olivo', hex: '#4d5d42' },
  { name: 'Terracota', hex: '#c2593f' },
  { name: 'Celeste', hex: '#60a5fa' },
  { name: 'Rosado', hex: '#f472b6' },
  { name: 'Café', hex: '#5c4033' },
  { name: 'Mostaza', hex: '#ca8a04' },
];

const QUICK_MODEL_PRESETS: Array<{ name: string; description: string }> = [
  { name: 'Regular Fit', description: 'Corte clásico cómodo' },
  { name: 'Oversize', description: 'Caída holgada urbana' },
  { name: 'Slim Fit', description: 'Ajuste entallado' },
  { name: 'Boxy Fit', description: 'Hombro caído y largo medio' },
  { name: 'Manga Larga', description: 'Puño acanalado' },
];

interface GarmentPreset {
  id: string;
  label: string;
  sizes: string[];
  models: Array<{ name: string; description?: string }>;
  material: string;
  gender: ApparelConfig['gender'];
  sizeGuideText: string;
}

const GARMENT_PRESETS: GarmentPreset[] = [
  {
    id: 'polo',
    label: 'Polo / Camiseta',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    models: [
      { name: 'Regular Fit', description: 'Corte clásico' },
      { name: 'Oversize', description: 'Corte amplio' },
    ],
    material: '100% Algodón Pima 20/1',
    gender: 'unisex',
    sizeGuideText: 'XS (Pecho 90cm, Largo 66cm) · S (Pecho 96cm, Largo 69cm) · M (Pecho 102cm, Largo 72cm) · L (Pecho 108cm, Largo 75cm) · XL (Pecho 114cm, Largo 78cm)',
  },
  {
    id: 'hoodie',
    label: 'Polera / Hoodie',
    sizes: ['S', 'M', 'L', 'XL'],
    models: [{ name: 'Oversize', description: 'Con capucha y bolsillo canguro' }],
    material: 'Franela reactiva 360g',
    gender: 'unisex',
    sizeGuideText: 'S (Pecho 108cm, Largo 68cm) · M (Pecho 114cm, Largo 71cm) · L (Pecho 120cm, Largo 74cm) · XL (Pecho 126cm, Largo 77cm)',
  },
  {
    id: 'pants',
    label: 'Pantalón / Jean',
    sizes: ['28', '30', '32', '34', '36'],
    models: [
      { name: 'Regular Fit', description: 'Pierna recta' },
      { name: 'Slim Fit', description: 'Ajuste entallado' },
    ],
    material: 'Denim 12oz algodón elastano',
    gender: 'unisex',
    sizeGuideText: '28 (Cintura 74cm) · 30 (Cintura 79cm) · 32 (Cintura 84cm) · 34 (Cintura 89cm) · 36 (Cintura 94cm)',
  },
  {
    id: 'shoes',
    label: 'Calzado',
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44'],
    models: [],
    material: 'Cuero sintético + suela EVA',
    gender: 'unisex',
    sizeGuideText: '36 (23cm) · 38 (24.5cm) · 40 (26cm) · 42 (27.5cm) · 44 (29cm)',
  },
  {
    id: 'cap',
    label: 'Gorra / Accesorio',
    sizes: ['Única'],
    models: [{ name: 'Estándar', description: 'Ajustable con broche trasero' }],
    material: 'Drill 100% algodón',
    gender: 'unisex',
    sizeGuideText: 'Talla única ajustable (55cm – 61cm de circunferencia)',
  },
];

type ApparelTab = 'sizes_colors' | 'models_specs' | 'variants' | 'extras';

export const ApparelConfigEditor: React.FC<ApparelConfigEditorProps> = ({
  config,
  basePrice,
  productName,
  tenants,
  primaryColor = '#18181b',
  onChange,
  onOpenMediaPicker,
}) => {
  const [activeTab, setActiveTab] = useState<ApparelTab>('sizes_colors');
  const [newSizeName, setNewSizeName] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#2563eb');
  const [newModelName, setNewModelName] = useState('');
  const [newModelDesc, setNewModelDesc] = useState('');
  const [bulkStockValue, setBulkStockValue] = useState<string>('10');
  const [variantColorFilter, setVariantColorFilter] = useState<string>('all');

  const update = (patch: Partial<ApparelConfig>) => {
    onChange({ ...config, ...patch });
  };

  // --- Garment Quick Preset ---
  const applyGarmentPreset = (preset: GarmentPreset) => {
    const stamp = Date.now();
    const nextSizes: ApparelSizeOption[] = preset.sizes.map((name, idx) => ({
      id: `sz-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${stamp + idx}`,
      name,
      priceDelta: 0,
      enabled: true,
    }));
    const nextModels: ApparelModelOption[] = preset.models.map((m, idx) => ({
      id: `mod-${stamp + idx}`,
      name: m.name,
      description: m.description,
      priceDelta: 0,
      enabled: true,
    }));
    update({
      sizes: nextSizes,
      models: nextModels,
      material: preset.material,
      gender: preset.gender,
      sizeGuideText: preset.sizeGuideText,
    });
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
  const toggleQuickColor = (swatch: { name: string; hex: string }) => {
    const exists = config.colors.find((c) => c.name.toLowerCase() === swatch.name.toLowerCase());
    if (exists) {
      update({ colors: config.colors.filter((c) => c.id !== exists.id) });
    } else {
      const item: ApparelColorOption = {
        id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: swatch.name,
        hex: swatch.hex,
        priceDelta: 0,
        enabled: true,
      };
      update({ colors: [...config.colors, item] });
    }
  };

  const addColor = () => {
    const trimmed = newColorName.trim();
    if (!trimmed) return;
    if (config.colors.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
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
  const toggleQuickModel = (preset: { name: string; description: string }) => {
    const exists = config.models.find((m) => m.name.toLowerCase() === preset.name.toLowerCase());
    if (exists) {
      update({ models: config.models.filter((m) => m.id !== exists.id) });
    } else {
      update({
        models: [
          ...config.models,
          {
            id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: preset.name,
            description: preset.description,
            priceDelta: 0,
            enabled: true,
          },
        ],
      });
    }
  };

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
  const expectedVariantsCount = useMemo(() => {
    const s = Math.max(1, config.sizes.filter((x) => x.enabled).length);
    const c = Math.max(1, config.colors.filter((x) => x.enabled).length);
    const m = Math.max(1, config.models.filter((x) => x.enabled).length);
    return s * c * m;
  }, [config.sizes, config.colors, config.models]);

  const generateVariantsMatrix = () => {
    const activeSizes = config.sizes.filter((s) => s.enabled);
    const activeColors = config.colors.filter((c) => c.enabled);
    const activeModels = config.models.filter((m) => m.enabled);

    const sizeList: (ApparelSizeOption | undefined)[] = activeSizes.length > 0 ? activeSizes : [undefined];
    const colorList: (ApparelColorOption | undefined)[] = activeColors.length > 0 ? activeColors : [undefined];
    const modelList: (ApparelModelOption | undefined)[] = activeModels.length > 0 ? activeModels : [undefined];

    const prefix =
      (productName || 'PRD')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4) || 'PRD';

    const existingMap = new Map(config.variants.map((v) => [v.id, v]));
    const nextVariants: ApparelVariantItem[] = [];
    const defaultQty = Math.max(0, parseInt(bulkStockValue, 10) || 10);

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
              defaultStock[t.id] = defaultQty;
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

  const applyBulkStockToAll = () => {
    const qty = Math.max(0, parseInt(bulkStockValue, 10) || 0);
    update({
      variants: config.variants.map((v) => {
        if (variantColorFilter !== 'all' && v.colorId !== variantColorFilter) return v;
        const nextStock: Record<string, number> = { ...(v.stockByBranch || {}) };
        tenants.forEach((t) => {
          nextStock[t.id] = qty;
        });
        return { ...v, stockByBranch: nextStock };
      }),
    });
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

  const filteredVariants = useMemo(
    () =>
      variantColorFilter === 'all'
        ? config.variants
        : config.variants.filter((v) => v.colorId === variantColorFilter),
    [config.variants, variantColorFilter]
  );

  const isVariantsOutOfSync = config.variants.length !== expectedVariantsCount;

  return (
    <div className="space-y-4">
      {/* 0. Quick Garment Presets Bar + Segmented Tabs */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Wand2 className="w-3.5 h-3.5" />
            <span>Plantilla rápida de prenda:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GARMENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyGarmentPreset(preset)}
                className="whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 transition-colors active:scale-[0.97]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Segmented Tabs */}
        <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('sizes_colors')}
              className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'sizes_colors'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Tallas y colores</span>
              <span className="text-[11px] font-mono text-zinc-400">
                {config.sizes.filter((s) => s.enabled).length}/{config.colors.filter((c) => c.enabled).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('models_specs')}
              className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'models_specs'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Modelos y ficha</span>
              <span className="text-[11px] font-mono text-zinc-400">
                {config.models.filter((m) => m.enabled).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('variants')}
              className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'variants'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Inventario y SKUs</span>
              <span className="text-[11px] font-mono text-zinc-400">
                {config.variants.length}
              </span>
              {isVariantsOutOfSync && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Pendiente sincronizar variantes" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('extras')}
              className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'extras'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Extras textiles</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: TALLAS Y COLORES */}
      {activeTab === 'sizes_colors' && (
        <div className="space-y-4">
          {/* Tallas */}
          <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-zinc-500" />
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Tallas disponibles ({config.sizes.filter((s) => s.enabled).length})
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(SIZE_PRESETS).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applySizePreset(preset)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap transition-colors active:scale-[0.97]"
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
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-colors ${
                    sz.enabled
                      ? 'bg-zinc-50/70 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700'
                      : 'bg-zinc-100/60 dark:bg-zinc-900/40 border-zinc-200/70 dark:border-zinc-800 opacity-50'
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
                    className="accent-zinc-900 dark:accent-white"
                  />
                  <span className="font-semibold text-zinc-900 dark:text-white min-w-[20px]">
                    {sz.name}
                  </span>
                  <span className="text-[10px] text-zinc-400">+S/</span>
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
                    className="w-12 px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-[11px] text-center font-medium tabular-nums text-zinc-800 dark:text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => update({ sizes: config.sizes.filter((s) => s.id !== sz.id) })}
                    className="text-zinc-400 hover:text-rose-500 transition-colors"
                    title="Quitar talla"
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
                placeholder="Agregar talla personalizada (Ej: 3XL, 45, Única)..."
                className="flex-1 px-3 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
              />
              <button
                type="button"
                onClick={addSize}
                className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-95 active:scale-[0.97]"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar talla</span>
              </button>
            </div>
          </div>

          {/* Colores con paleta rápida en 1 clic */}
          <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-zinc-500" />
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Colores y foto por color ({config.colors.length})
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400">
                Haz clic en un color rápido para agregar o quitar
              </span>
            </div>

            {/* 1-Click Quick Palette */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COLOR_SWATCHES.map((sw) => {
                const selected = config.colors.some(
                  (c) => c.name.toLowerCase() === sw.name.toLowerCase()
                );
                return (
                  <button
                    key={sw.name}
                    type="button"
                    onClick={() => toggleQuickColor(sw)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors active:scale-[0.97] ${
                      selected
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-transparent'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: sw.hex }}
                    />
                    <span>{sw.name}</span>
                    {selected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            {/* Active Colors Grid */}
            {config.colors.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {config.colors.map((col) => (
                  <div
                    key={col.id}
                    className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5"
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
                      className="w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer shrink-0 p-0.5 bg-white dark:bg-zinc-900"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
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
                        className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-900 dark:text-white"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-zinc-400">+S/</span>
                        <input
                          type="number"
                          step="0.5"
                          value={col.priceDelta || 0}
                          onChange={(e) =>
                            update({
                              colors: config.colors.map((c) =>
                                c.id === col.id
                                  ? { ...c, priceDelta: parseFloat(e.target.value) || 0 }
                                  : c
                              ),
                            })
                          }
                          className="w-14 px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-[11px] font-medium tabular-nums text-zinc-800 dark:text-zinc-200"
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
                            className="px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors"
                          >
                            <FileImage className="w-3 h-3 text-zinc-500" />
                            <span>{col.imageUrl ? 'Cambiar foto' : 'Asignar foto'}</span>
                          </button>
                        )}
                        {col.imageUrl && (
                          <img
                            src={col.imageUrl}
                            alt={col.name}
                            className="w-6 h-6 rounded-md object-cover border border-zinc-200 dark:border-zinc-700"
                          />
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        update({ colors: config.colors.filter((c) => c.id !== col.id) })
                      }
                      className="p-1.5 text-zinc-400 hover:text-rose-500 shrink-0 transition-colors"
                      title="Quitar color"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Color Input */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="color"
                value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                className="w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer p-0.5 bg-white dark:bg-zinc-900"
              />
              <input
                type="text"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                placeholder="Otro color personalizado (Ej: Azul Acero)..."
                className="flex-1 min-w-[160px] px-3 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
              />
              <button
                type="button"
                onClick={addColor}
                className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1 transition-colors active:scale-[0.97]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar color</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODELOS Y FICHA TÉCNICA */}
      {activeTab === 'models_specs' && (
        <div className="space-y-4">
          {/* Ficha Técnica */}
          <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-zinc-500" />
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Ficha técnica de ropa
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  value={config.brand || ''}
                  onChange={(e) => update({ brand: e.target.value })}
                  placeholder="Ej: Khalessi Wear"
                  className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Material / tela
                </label>
                <input
                  type="text"
                  value={config.material || ''}
                  onChange={(e) => update({ material: e.target.value })}
                  placeholder="Ej: 100% Algodón Pima"
                  className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Colección / temporada
                </label>
                <input
                  type="text"
                  value={config.collection || ''}
                  onChange={(e) => update({ collection: e.target.value })}
                  placeholder="Ej: Urbano 2026"
                  className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Género / línea
                </label>
                <select
                  value={config.gender || 'unisex'}
                  onChange={(e) =>
                    update({ gender: e.target.value as ApparelConfig['gender'] })
                  }
                  className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                >
                  <option value="unisex">Unisex</option>
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                  <option value="kids">Niños / Kids</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modelos / Cortes */}
          <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-500" />
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Modelos o cortes ({config.models.length})
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400">Opcional</span>
            </div>

            {/* Quick Cut Chips */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MODEL_PRESETS.map((preset) => {
                const selected = config.models.some(
                  (m) => m.name.toLowerCase() === preset.name.toLowerCase()
                );
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => toggleQuickModel(preset)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors active:scale-[0.97] ${
                      selected
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-transparent'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                    }`}
                  >
                    <span>{preset.name}</span>
                    {selected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            {config.models.length > 0 && (
              <div className="space-y-2">
                {config.models.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2"
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
                      className="accent-zinc-900 dark:accent-white"
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
                      placeholder="Nombre del corte"
                      className="flex-1 min-w-[130px] px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-900 dark:text-white"
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
                      placeholder="Detalle (opcional)"
                      className="flex-1 min-w-[130px] px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300"
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
                              m.id === mod.id
                                ? { ...m, priceDelta: parseFloat(e.target.value) || 0 }
                                : m
                            ),
                          })
                        }
                        className="w-16 px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium tabular-nums text-zinc-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        update({ models: config.models.filter((m) => m.id !== mod.id) })
                      }
                      className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addModel())}
                placeholder="Otro modelo (Ej: Cuello V)..."
                className="flex-1 min-w-[150px] px-3 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
              <input
                type="text"
                value={newModelDesc}
                onChange={(e) => setNewModelDesc(e.target.value)}
                placeholder="Descripción corta"
                className="flex-1 min-w-[130px] px-3 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
              <button
                type="button"
                onClick={addModel}
                className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1 transition-colors active:scale-[0.97]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar modelo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTARIO Y SKUs */}
      {activeTab === 'variants' && (
        <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Barcode className="w-4 h-4 text-zinc-500" />
                <span>Matriz de variantes ({config.variants.length})</span>
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isVariantsOutOfSync
                  ? `Detectamos ${expectedVariantsCount} combinaciones activas según tus tallas, colores y modelos.`
                  : 'SKU, código de barras, precio opcional y stock por sucursal sincronizados.'}
              </p>
            </div>

            <button
              type="button"
              onClick={generateVariantsMatrix}
              className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-95 active:scale-[0.97]"
              style={{ backgroundColor: primaryColor }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                {config.variants.length === 0 ? 'Generar variantes' : 'Sincronizar variantes'}
              </span>
            </button>
          </div>

          {/* Bulk Stock & Filter Bar */}
          {config.variants.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Stock masivo:
                </span>
                <input
                  type="number"
                  min={0}
                  value={bulkStockValue}
                  onChange={(e) => setBulkStockValue(e.target.value)}
                  className="w-16 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-medium tabular-nums text-center text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={applyBulkStockToAll}
                  className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-medium transition-opacity hover:opacity-90 active:scale-[0.97]"
                >
                  Aplicar a {variantColorFilter === 'all' ? 'todas' : 'filtradas'}
                </button>
              </div>

              {config.colors.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-zinc-500">Color:</span>
                  <select
                    value={variantColorFilter}
                    onChange={(e) => setVariantColorFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="all">Todos ({config.variants.length})</option>
                    {config.colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {config.variants.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2">
              <Barcode className="w-7 h-7 text-zinc-400 mx-auto" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Aún no has generado la matriz de inventario
              </p>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                Pulsa &quot;Generar variantes&quot; para crear automáticamente los SKUs y controlar el stock por sucursal de las {expectedVariantsCount} combinaciones activas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Variante</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Cód. barras</th>
                    <th className="py-2.5 px-3">Precio (opc.)</th>
                    {tenants.map((t) => (
                      <th key={t.id} className="py-2.5 px-3 whitespace-nowrap">
                        Stock {t.name.replace('Gastro - ', '')}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center">Activa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredVariants.map((v) => {
                    const { sz, col, mod } = getLabel(v);
                    return (
                      <tr key={v.id} className={!v.enabled ? 'opacity-50' : ''}>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-white">
                            {col && (
                              <span
                                className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                                style={{ backgroundColor: col.hex }}
                              />
                            )}
                            <span>
                              {[mod, col?.name, sz].filter(Boolean).join(' · ') || 'Única'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={v.sku || ''}
                            onChange={(e) => updateVariant(v.id, { sku: e.target.value })}
                            className="w-28 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-mono text-zinc-800 dark:text-zinc-200"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={v.barcode || ''}
                            onChange={(e) => updateVariant(v.id, { barcode: e.target.value })}
                            placeholder="EAN/UPC"
                            className="w-24 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-mono text-zinc-800 dark:text-zinc-200"
                          />
                        </td>
                        <td className="py-2.5 px-3">
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
                            className="w-20 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-medium tabular-nums text-zinc-900 dark:text-white"
                          />
                        </td>
                        {tenants.map((t) => (
                          <td key={t.id} className="py-2.5 px-3">
                            <input
                              type="number"
                              min={0}
                              value={v.stockByBranch?.[t.id] ?? 0}
                              onChange={(e) =>
                                updateVariantStock(v.id, t.id, parseInt(e.target.value, 10) || 0)
                              }
                              className="w-16 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] text-center font-medium tabular-nums text-zinc-900 dark:text-white"
                            />
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={v.enabled}
                            onChange={(e) => updateVariant(v.id, { enabled: e.target.checked })}
                            className="accent-zinc-900 dark:accent-white"
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
      )}

      {/* TAB 4: EXTRAS TEXTILES */}
      {activeTab === 'extras' && (
        <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-500" />
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Guía de tallas y servicios adicionales
              </h4>
            </div>
            <button
              type="button"
              onClick={() =>
                update({
                  sizeGuideText:
                    'S (Pecho 96cm, Largo 69cm) · M (Pecho 102cm, Largo 72cm) · L (Pecho 108cm, Largo 75cm) · XL (Pecho 114cm, Largo 78cm)',
                })
              }
              className="whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Insertar plantilla de medidas
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
              Guía de tallas / medidas (visible para el cliente en Tienda y POS)
            </label>
            <textarea
              rows={2}
              value={config.sizeGuideText || ''}
              onChange={(e) => update({ sizeGuideText: e.target.value })}
              placeholder="Ej: S (Pecho 94cm, Largo 68cm) · M (Pecho 100cm, Largo 71cm) · L (Pecho 106cm, Largo 74cm)"
              className="w-full px-3.5 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Gift className="w-4 h-4 text-zinc-500" />
                  <span>Empaque de regalo</span>
                </span>
                <input
                  type="checkbox"
                  checked={config.allowGiftWrap ?? false}
                  onChange={(e) => update({ allowGiftWrap: e.target.checked })}
                  className="accent-zinc-900 dark:accent-white"
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
                    className="w-20 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium tabular-nums"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Sparkles className="w-4 h-4 text-zinc-500" />
                  <span>Bordado / estampado</span>
                </span>
                <input
                  type="checkbox"
                  checked={config.allowCustomPrint ?? false}
                  onChange={(e) => update({ allowCustomPrint: e.target.checked })}
                  className="accent-zinc-900 dark:accent-white"
                />
              </label>
              {config.allowCustomPrint && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.customPrintLabel || ''}
                    onChange={(e) => update({ customPrintLabel: e.target.value })}
                    placeholder="Etiqueta (Ej: Iniciales bordadas)"
                    className="flex-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={config.customPrintPrice ?? 0}
                    onChange={(e) =>
                      update({ customPrintPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-16 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium tabular-nums"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
