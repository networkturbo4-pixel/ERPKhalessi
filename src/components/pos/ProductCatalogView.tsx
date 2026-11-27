import React, { useState, useEffect } from 'react';
import {
  Product,
  ProductCategory,
  ProductCategoryItem,
  ProductSizeConfig,
  SubOptionGroup,
  SubOptionChoice,
  SubOptionNestedChoice,
  ExtraModifier,
  ProductType,
} from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import {
  Package,
  Pizza,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Sliders,
  Check,
  X,
  Search,
  FolderPlus,
  Upload,
  Clipboard,
  Image as ImageIcon,
  Layers,
  BookmarkPlus,
  Copy,
  GripVertical,
  Star,
  Gift,
  ListOrdered,
  LayoutGrid,
  SlidersHorizontal,
  FileImage,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Store,
  Shirt,
  UtensilsCrossed,
  List,
  Monitor,
} from 'lucide-react';
import { MediaGalleryModal } from '../media/MediaGalleryModal';
import { CategoryIconBadge, sanitizeCategorySvg } from '../common/CategoryIconBadge';
import { compressImageFile } from '../../utils/imageCompressor';
import { ApparelConfigEditor, DEFAULT_APPAREL_CONFIG } from './ApparelConfigEditor';
import { ProductTypePickerModal } from './ProductTypePickerModal';
import { BranchPricingDrawer } from './BranchPricingDrawer';
import { BranchPricingMatrixView } from './BranchPricingMatrixView';
import { ProductLivePreviewModal } from './ProductLivePreviewModal';
import {
  resolveProductBasePrice,
  resolveSizePrice,
  hasBranchPriceOverride,
} from '../../utils/productPricing';

export interface ProductOptionTemplate {
  id: string;
  name: string;
  description?: string;
  category?: ProductCategory | 'general';
  sizes: ProductSizeConfig[];
  subOptions: SubOptionGroup[];
  allowedExtras: ExtraModifier[];
}

const LEGACY_DEFAULT_TEMPLATE_IDS = new Set<string>([
  'tpl-opt-pizzas-clasicas',
  'tpl-opt-pizzas-gourmet',
  'tpl-opt-entradas',
  'tpl-opt-bebidas',
]);

const DEFAULT_OPTION_TEMPLATES: ProductOptionTemplate[] = [];

function stripLegacyOptionTemplates(list: ProductOptionTemplate[]): {
  cleaned: ProductOptionTemplate[];
  changed: boolean;
} {
  const cleaned = list.filter((t) => t && !LEGACY_DEFAULT_TEMPLATE_IDS.has(t.id));
  return { cleaned, changed: cleaned.length !== list.length };
}

const DEFAULT_CATEGORIES: ProductCategoryItem[] = [
  { id: 'pizzas', name: 'Pizzas', icon: '🍕', imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80' },
  { id: 'combos', name: 'Combos', icon: '🔥', imageUrl: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=400&q=80' },
  { id: 'entradas', name: 'Entradas', icon: '🥖', imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=400&q=80' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80' },
  { id: 'postres', name: 'Postres', icon: '🍰', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=400&q=80' },
];

const CATEGORY_ICON_COLOR_PRESETS = ['#ffffff', '#09090b', '#dc2626', '#f97316', '#f59e0b', '#10b981', '#0ea5e9', '#1d4ed8'];
const CATEGORY_BG_COLOR_PRESETS = ['transparent', '#dc2626', '#f97316', '#f59e0b', '#10b981', '#0ea5e9', '#18181b', '#f4f4f5'];

export const ProductCatalogView: React.FC = () => {
  const { products, createProduct, updateProduct, deleteProduct, toggleProductAvailability } =
    useOrderCatalog();
  const { customization, dispatchToast, openNoticeModal, tenants, activeTenant } = useSettings();

  // Dynamic Categories state
  const loadStoredCategories = (): ProductCategoryItem[] => {
    try {
      const stored = localStorage.getItem('kh_product_categories_v1');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((item: ProductCategoryItem) => {
            const def = DEFAULT_CATEGORIES.find((d) => d.id === item.id);
            return {
              ...item,
              icon: item.icon || def?.icon || '🏷️',
              imageUrl: item.imageUrl || def?.imageUrl,
            };
          });
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_CATEGORIES;
  };

  const [categories, setCategories] = useState<ProductCategoryItem[]>(loadStoredCategories);

  useEffect(() => {
    const syncCategories = (e?: Event) => {
      if (e && 'key' in e && (e as StorageEvent).key && (e as StorageEvent).key !== 'kh_product_categories_v1') {
        return;
      }
      setCategories(loadStoredCategories());
    };
    window.addEventListener('storage', syncCategories);
    window.addEventListener('kh:categories-updated', syncCategories);
    return () => {
      window.removeEventListener('storage', syncCategories);
      window.removeEventListener('kh:categories-updated', syncCategories);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | ProductType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'paused'>('all');
  const [catalogLayout, setCatalogLayout] = useState<'table' | 'grid'>('table');
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Category management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormIcon, setCatFormIcon] = useState('');
  const [catFormIconType, setCatFormIconType] = useState<'svg' | 'image'>('svg');
  const [catFormIconSvg, setCatFormIconSvg] = useState('');
  const [catFormIconImageUrl, setCatFormIconImageUrl] = useState('');
  const [catFormIconColor, setCatFormIconColor] = useState('#ffffff');
  const [catFormIconBgColor, setCatFormIconBgColor] = useState('#f97316');
  const [catFormImageUrl, setCatFormImageUrl] = useState('');

  // Filter products by tab, type, status and search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeTab === 'todos' || p.category === activeTab;
    const resolvedType: ProductType = p.productType || 'standard';
    const matchesType = typeFilter === 'all' || resolvedType === typeFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'available' ? p.isAvailable : !p.isAvailable);
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.badge && p.badge.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesType && matchesStatus && matchesSearch;
  });

  const catalogMetrics = {
    total: products.length,
    available: products.filter((p) => p.isAvailable).length,
    paused: products.filter((p) => !p.isAvailable).length,
    branchCustomized: products.filter((p) =>
      tenants.some(
        (t) =>
          hasBranchPriceOverride(p, t.id) || p.branchPrices?.[t.id]?.isAvailable === false
      )
    ).length,
  };

  const formatProductPriceSummary = (prod: Product) => {
    if (prod.productType !== 'apparel' && prod.hasSizes && prod.sizes.length > 0) {
      const enabled = prod.sizes.filter((s) => s.enabled);
      const list = enabled.length > 0 ? enabled : prod.sizes;
      const prices = list.map((s) => resolveSizePrice(prod, s, activeTenant?.id));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return {
        primary: min === max ? `S/ ${min.toFixed(2)}` : `S/ ${min.toFixed(2)} – S/ ${max.toFixed(2)}`,
        detail: `${list.length} ${list.length === 1 ? 'tamaño' : 'tamaños'}`,
      };
    }
    const base = resolveProductBasePrice(prod, activeTenant?.id);
    if (prod.productType === 'apparel') {
      const colorsCount = prod.apparelConfig?.colors.filter((c) => c.enabled).length || 0;
      const sizesCount = prod.apparelConfig?.sizes.filter((s) => s.enabled).length || 0;
      return {
        primary: `S/ ${base.toFixed(2)}`,
        detail: `${sizesCount} tallas · ${colorsCount} colores`,
      };
    }
    return {
      primary: `S/ ${base.toFixed(2)}`,
      detail: 'Precio único',
    };
  };

  const getCategoryName = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    if (found) return found.name;
    return catId ? catId.charAt(0).toUpperCase() + catId.slice(1) : 'General';
  };

  // Edit / Create product modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);
  const [initialProductSnapshot, setInitialProductSnapshot] = useState<string>('');
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [catalogViewMode, setCatalogViewMode] = useState<'catalog' | 'branch_pricing'>('catalog');
  const [branchDrawerProductId, setBranchDrawerProductId] = useState<string | null>(null);
  const [editorRightTab, setEditorRightTab] = useState<'sizes' | 'suboptions' | 'extras'>('suboptions');
  const [isTemplatesPanelOpen, setIsTemplatesPanelOpen] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  // New size temporary state for adding size
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeSlices, setNewSizeSlices] = useState(6);
  const [newSizePrice, setNewSizePrice] = useState(35.0);
  const [newSizeImage, setNewSizeImage] = useState('');
  const [isAddingSize, setIsAddingSize] = useState(false);

  // Edit size state
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [editSizeName, setEditSizeName] = useState('');
  const [editSizeSlices, setEditSizeSlices] = useState(8);
  const [editSizePrice, setEditSizePrice] = useState(0);
  const [editSizeImage, setEditSizeImage] = useState('');

  // New extra temporary state
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState(5.0);
  const [newExtraCategory, setNewExtraCategory] = useState<'borde' | 'toppings' | 'quesos' | 'salsas'>('toppings');
  const [newExtraImage, setNewExtraImage] = useState('');
  const [newExtraIsIncluded, setNewExtraIsIncluded] = useState(false);
  const [newExtraHasCond, setNewExtraHasCond] = useState(false);
  const [newExtraMinQty, setNewExtraMinQty] = useState(2);
  const [newExtraCondPrice, setNewExtraCondPrice] = useState(3.5);
  const [isAddingExtra, setIsAddingExtra] = useState(false);

  // Edit extra state
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [editExtraName, setEditExtraName] = useState('');
  const [editExtraPrice, setEditExtraPrice] = useState(0);
  const [editExtraCategory, setEditExtraCategory] = useState<'borde' | 'toppings' | 'quesos' | 'salsas'>('toppings');
  const [editExtraImage, setEditExtraImage] = useState('');
  const [editExtraIncluded, setEditExtraIncluded] = useState(false);
  const [editExtraHasCond, setEditExtraHasCond] = useState(false);
  const [editExtraMinQty, setEditExtraMinQty] = useState(2);
  const [editExtraCondPrice, setEditExtraCondPrice] = useState(3.5);

  // Sub-options group & choices state (Image 2 Full Architecture)
  const [expandedChoiceSubOptions, setExpandedChoiceSubOptions] = useState<Record<string, boolean>>({});
  const [draggedGroupIdx, setDraggedGroupIdx] = useState<number | null>(null);
  const [dragOverGroupIdx, setDragOverGroupIdx] = useState<number | null>(null);
  const [draggedChoice, setDraggedChoice] = useState<{ groupId: string; index: number } | null>(null);
  const [dragOverChoice, setDragOverChoice] = useState<{ groupId: string; index: number } | null>(null);

  // Media Gallery Picker modal state
  const [mediaPickerConfig, setMediaPickerConfig] = useState<{
    isOpen: boolean;
    title: string;
    onSelect: (url: string) => void;
  }>({
    isOpen: false,
    title: 'Galería de Medios',
    onSelect: () => {},
  });

  // Option Templates state
  const [optionTemplates, setOptionTemplates] = useState<ProductOptionTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('kh_product_option_templates_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return stripLegacyOptionTemplates(parsed).cleaned;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_OPTION_TEMPLATES;
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kh_product_option_templates_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const { cleaned, changed } = stripLegacyOptionTemplates(parsed);
          if (changed) {
            setOptionTemplates(cleaned);
            localStorage.setItem('kh_product_option_templates_v1', JSON.stringify(cleaned));
          }
        }
      }
    } catch {
      // ignore
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'kh_product_option_templates_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const { cleaned, changed } = stripLegacyOptionTemplates(parsed);
            setOptionTemplates(cleaned);
            if (changed) {
              localStorage.setItem('kh_product_option_templates_v1', JSON.stringify(cleaned));
            }
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSavingTemplateName, setIsSavingTemplateName] = useState(false);
  const [templateCustomName, setTemplateCustomName] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editTemplateName, setEditTemplateName] = useState('');

  const handleApplyTemplate = (templateId: string) => {
    const tpl = optionTemplates.find((t) => t.id === templateId);
    if (!tpl || !tempProduct) {
      dispatchToast('Selecciona una plantilla', 'Elige una plantilla del menú desplegable.', 'warning');
      return;
    }
    setTempProduct({
      ...tempProduct,
      hasSizes: tpl.sizes.length > 0,
      sizes: JSON.parse(JSON.stringify(tpl.sizes)),
      subOptions: JSON.parse(JSON.stringify(tpl.subOptions)),
      allowedExtras: JSON.parse(JSON.stringify(tpl.allowedExtras)),
    });
    dispatchToast(
      'Plantilla Aplicada',
      `Se cargaron ${tpl.sizes.length} tamaño(s), ${tpl.subOptions.length} grupo(s) de subopciones y ${tpl.allowedExtras.length} adicional(es). Puedes editarlos libremente.`,
      'success'
    );
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!tempProduct) return;
    if (!templateCustomName.trim()) {
      dispatchToast('Nombre Requerido', 'Ingresa un nombre para tu nueva plantilla de opciones.', 'warning');
      return;
    }
    const newTpl: ProductOptionTemplate = {
      id: `tpl-opt-${Date.now()}`,
      name: templateCustomName.trim(),
      description: `Creada a partir de "${tempProduct.name || 'Producto'}" con ${tempProduct.sizes.length} tamaños, ${tempProduct.subOptions.length} subopciones y ${tempProduct.allowedExtras.length} extras.`,
      category: tempProduct.category,
      sizes: JSON.parse(JSON.stringify(tempProduct.sizes)),
      subOptions: JSON.parse(JSON.stringify(tempProduct.subOptions)),
      allowedExtras: JSON.parse(JSON.stringify(tempProduct.allowedExtras)),
    };
    const updated = [...optionTemplates, newTpl];
    setOptionTemplates(updated);
    try {
      localStorage.setItem('kh_product_option_templates_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setSelectedTemplateId(newTpl.id);
    setIsSavingTemplateName(false);
    setTemplateCustomName('');
    dispatchToast(
      'Plantilla Guardada',
      `La plantilla "${newTpl.name}" está guardada y lista para reusarse en cualquier producto.`,
      'success'
    );
  };

  const handleStartEditTemplate = (templateId?: string) => {
    const id = templateId || selectedTemplateId;
    const tpl = optionTemplates.find((t) => t.id === id);
    if (!tpl) return;
    if (templateId) setSelectedTemplateId(templateId);
    setEditTemplateName(tpl.name);
    setIsEditingTemplate(true);
  };

  const handleSaveEditTemplate = () => {
    if (!editTemplateName.trim() || !selectedTemplateId) {
      dispatchToast('Nombre Requerido', 'Ingresa un nombre válido para la plantilla.', 'warning');
      return;
    }
    const updated = optionTemplates.map((t) => {
      if (t.id === selectedTemplateId) {
        return {
          ...t,
          name: editTemplateName.trim(),
          ...(tempProduct
            ? {
                sizes: JSON.parse(JSON.stringify(tempProduct.sizes)),
                subOptions: JSON.parse(JSON.stringify(tempProduct.subOptions)),
                allowedExtras: JSON.parse(JSON.stringify(tempProduct.allowedExtras)),
              }
            : {}),
        };
      }
      return t;
    });
    setOptionTemplates(updated);
    try {
      localStorage.setItem('kh_product_option_templates_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setIsEditingTemplate(false);
    dispatchToast('Plantilla Actualizada', `Plantilla "${editTemplateName.trim()}" actualizada con éxito.`, 'success');
  };

  const handleDeleteTemplate = (templateId: string) => {
    const tpl = optionTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    openNoticeModal({
      title: '¿Eliminar plantilla?',
      message: `Se eliminará la plantilla "${tpl.name}". Los productos que ya la usaron no se verán afectados.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Plantilla',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        const filtered = optionTemplates.filter((t) => t.id !== templateId);
        setOptionTemplates(filtered);
        try {
          localStorage.setItem('kh_product_option_templates_v1', JSON.stringify(filtered));
        } catch {
          // ignore
        }
        if (selectedTemplateId === templateId) setSelectedTemplateId('');
        setIsEditingTemplate(false);
        dispatchToast('Plantilla Eliminada', `Se eliminó "${tpl.name}".`, 'info');
      },
    });
  };

  // SIZE EDIT HANDLERS
  const handleStartEditSize = (sz: ProductSizeConfig) => {
    setEditingSizeId(sz.id);
    setEditSizeName(sz.name);
    setEditSizeSlices(sz.slices);
    setEditSizePrice(sz.price);
    setEditSizeImage(sz.imageUrl || '');
  };

  const handleSaveEditSize = () => {
    if (!tempProduct || !editingSizeId) return;
    if (!editSizeName.trim()) {
      dispatchToast('Nombre Requerido', 'Ingresa un nombre para el tamaño.', 'warning');
      return;
    }
    const updatedSizes = tempProduct.sizes.map((s) => {
      if (s.id === editingSizeId) {
        return {
          ...s,
          name: editSizeName.trim(),
          slices: editSizeSlices,
          price: editSizePrice,
          imageUrl: editSizeImage.trim() || undefined,
        };
      }
      return s;
    });
    setTempProduct({ ...tempProduct, sizes: updatedSizes });
    setEditingSizeId(null);
    dispatchToast('Tamaño Actualizado', `Tamaño "${editSizeName}" actualizado con éxito.`, 'success');
  };

  // EXTRAS EDIT HANDLERS
  const handleStartEditExtra = (ext: ExtraModifier) => {
    setEditingExtraId(ext.id);
    setEditExtraName(ext.name);
    setEditExtraPrice(ext.price);
    setEditExtraCategory(ext.category as any);
    setEditExtraImage(ext.imageUrl || '');
    setEditExtraIncluded(!!ext.isIncluded);
    setEditExtraHasCond(!!ext.conditionalRule);
    setEditExtraMinQty(ext.conditionalRule?.minQty || 2);
    setEditExtraCondPrice(ext.conditionalRule?.discountedPrice || ext.price);
  };

  const handleSaveEditExtra = () => {
    if (!tempProduct || !editingExtraId) return;
    if (!editExtraName.trim()) {
      dispatchToast('Nombre Requerido', 'Ingresa un nombre para el adicional.', 'warning');
      return;
    }
    const updatedExtras = tempProduct.allowedExtras.map((e) => {
      if (e.id === editingExtraId) {
        return {
          ...e,
          name: editExtraName.trim(),
          price: editExtraPrice,
          category: editExtraCategory,
          imageUrl: editExtraImage.trim() || undefined,
          isIncluded: editExtraIncluded,
          conditionalRule: editExtraHasCond
            ? { minQty: editExtraMinQty, discountedPrice: editExtraCondPrice }
            : undefined,
        };
      }
      return e;
    });
    setTempProduct({ ...tempProduct, allowedExtras: updatedExtras });
    setEditingExtraId(null);
    dispatchToast('Adicional Actualizado', `Adicional "${editExtraName}" actualizado.`, 'success');
  };

  // SUB-OPTIONS GROUP & CHOICES HANDLERS (IMAGE 2)
  const handleAddNewGroup = () => {
    if (!tempProduct) return;
    const newGroup: SubOptionGroup = {
      id: `grp-${Date.now()}`,
      name: 'Nuevo Grupo de Opciones',
      enabled: true,
      required: false,
      maxSelection: 0,
      openByDefault: true,
      layoutVisual: 'list',
      accordionStyle: 'standard',
      conditionOptionId: '',
      choices: [],
    };
    setTempProduct({
      ...tempProduct,
      subOptions: [...tempProduct.subOptions, newGroup],
    });
    dispatchToast('Grupo Creado', 'Se agregó un nuevo grupo de modificadores.', 'success');
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (!tempProduct) return;
    openNoticeModal({
      title: '¿Eliminar grupo de opciones?',
      message: `Se eliminará el grupo "${groupName}" y todas sus opciones configuradas.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Grupo',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        setTempProduct({
          ...tempProduct,
          subOptions: tempProduct.subOptions.filter((g) => g.id !== groupId),
        });
        dispatchToast('Grupo Eliminado', `Grupo "${groupName}" eliminado.`, 'info');
      },
    });
  };

  const handleUpdateGroup = (groupId: string, updates: Partial<SubOptionGroup>) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
    });
  };

  const handleMoveGroup = (fromIdx: number, toIdx: number) => {
    if (!tempProduct) return;
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= tempProduct.subOptions.length) return;
    const next = [...tempProduct.subOptions];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setTempProduct({ ...tempProduct, subOptions: next });
  };

  const handleDuplicateGroup = (groupId: string) => {
    if (!tempProduct) return;
    const idx = tempProduct.subOptions.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    const src = tempProduct.subOptions[idx];
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const cloned: SubOptionGroup = {
      ...JSON.parse(JSON.stringify(src)),
      id: `grp-${stamp}`,
      name: src.name ? `${src.name} (Copia)` : 'Grupo (Copia)',
      choices: (src.choices || []).map((c, cIdx) => ({
        ...JSON.parse(JSON.stringify(c)),
        id: `ch-${stamp}-${cIdx}`,
        nestedChoices: (c.nestedChoices || []).map((n, nIdx) => ({
          ...JSON.parse(JSON.stringify(n)),
          id: `nest-${stamp}-${cIdx}-${nIdx}`,
        })),
      })),
    };
    const next = [...tempProduct.subOptions];
    next.splice(idx + 1, 0, cloned);
    setTempProduct({ ...tempProduct, subOptions: next });
    dispatchToast('Grupo Duplicado', `Se duplicó "${src.name || 'Grupo'}".`, 'success');
  };

  const handleAddNewChoiceToGroup = (groupId: string) => {
    if (!tempProduct) return;
    const newChoice: SubOptionChoice = {
      id: `ch-${Date.now()}`,
      name: '',
      description: '',
      priceDelta: 0,
      imageUrl: '',
      isDefault: false,
      isRecommended: false,
      isMultiple: false,
      hidePrice: false,
      storePricesEnabled: false,
      freeQuantity: 0,
      maxQuantity: 0,
      subExtrasLimit: 0,
      isIncluded: false,
      nestedChoices: [],
    };
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) =>
        g.id === groupId ? { ...g, choices: [...g.choices, newChoice] } : g
      ),
    });
  };

  const handleDeleteChoice = (groupId: string, choiceId: string) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) =>
        g.id === groupId ? { ...g, choices: g.choices.filter((c) => c.id !== choiceId) } : g
      ),
    });
  };

  const handleMoveChoice = (groupId: string, fromIdx: number, toIdx: number) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) => {
        if (g.id !== groupId) return g;
        if (fromIdx === toIdx || toIdx < 0 || toIdx >= g.choices.length) return g;
        const next = [...g.choices];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return { ...g, choices: next };
      }),
    });
  };

  const handleDuplicateChoice = (groupId: string, choiceId: string) => {
    if (!tempProduct) return;
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) => {
        if (g.id !== groupId) return g;
        const idx = g.choices.findIndex((c) => c.id === choiceId);
        if (idx === -1) return g;
        const src = g.choices[idx];
        const cloned: SubOptionChoice = {
          ...JSON.parse(JSON.stringify(src)),
          id: `ch-${stamp}`,
          name: src.name ? `${src.name} (Copia)` : '',
          nestedChoices: (src.nestedChoices || []).map((n, nIdx) => ({
            ...JSON.parse(JSON.stringify(n)),
            id: `nest-${stamp}-${nIdx}`,
          })),
        };
        const next = [...g.choices];
        next.splice(idx + 1, 0, cloned);
        return { ...g, choices: next };
      }),
    });
    dispatchToast('Opción Duplicada', 'Se creó una copia de la opción.', 'success');
  };

  const handleUpdateChoice = (groupId: string, choiceId: string, updates: Partial<SubOptionChoice>) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) =>
        g.id === groupId
          ? {
              ...g,
              choices: g.choices.map((c) => (c.id === choiceId ? { ...c, ...updates } : c)),
            }
          : g
      ),
    });
  };

  const handleAddNestedChoice = (groupId: string, choiceId: string) => {
    if (!tempProduct) return;
    const newNested: SubOptionNestedChoice = {
      id: `nest-${Date.now()}`,
      name: '',
      priceDelta: 0,
      isMultiple: false,
      maxQty: 0,
      hidePrice: false,
    };
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) =>
        g.id === groupId
          ? {
              ...g,
              choices: g.choices.map((c) =>
                c.id === choiceId
                  ? { ...c, nestedChoices: [...(c.nestedChoices || []), newNested] }
                  : c
              ),
            }
          : g
      ),
    });
  };

  const handleDeleteNestedChoice = (groupId: string, choiceId: string, nestedId: string) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) =>
        g.id === groupId
          ? {
              ...g,
              choices: g.choices.map((c) =>
                c.id === choiceId
                  ? {
                      ...c,
                      nestedChoices: (c.nestedChoices || []).filter((n) => n.id !== nestedId),
                    }
                  : c
              ),
            }
          : g
      ),
    });
  };

  const handleUpdateNestedChoice = (
    groupId: string,
    choiceId: string,
    nestedId: string,
    updates: Partial<SubOptionNestedChoice>
  ) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      subOptions: tempProduct.subOptions.map((g) =>
        g.id === groupId
          ? {
              ...g,
              choices: g.choices.map((c) =>
                c.id === choiceId
                  ? {
                      ...c,
                      nestedChoices: (c.nestedChoices || []).map((n) =>
                        n.id === nestedId ? { ...n, ...updates } : n
                      ),
                    }
                  : c
              ),
            }
          : g
      ),
    });
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catFormName.trim();
    if (!cleanName) {
      dispatchToast('Nombre Requerido', 'Ingresa el nombre de la categoría.', 'warning');
      return;
    }

    const cleanedSvg = catFormIconType === 'svg' ? sanitizeCategorySvg(catFormIconSvg, true) : null;
    const cleanedIconImg = catFormIconType === 'image' ? catFormIconImageUrl.trim() : '';
    const resolvedIconType: ProductCategoryItem['iconType'] = cleanedSvg
      ? 'svg'
      : cleanedIconImg
      ? 'image'
      : undefined;

    if (editingCategoryId) {
      const updated = categories.map((c) => {
        if (c.id === editingCategoryId) {
          return {
            ...c,
            name: cleanName,
            icon: resolvedIconType ? '' : catFormIcon.trim() || undefined,
            iconType: resolvedIconType,
            iconSvg: cleanedSvg || undefined,
            iconImageUrl: cleanedIconImg || undefined,
            iconColor: resolvedIconType === 'svg' ? catFormIconColor : undefined,
            iconBgColor: resolvedIconType ? catFormIconBgColor : undefined,
            imageUrl: catFormImageUrl.trim() || undefined,
          };
        }
        return c;
      });
      setCategories(updated);
      try {
        localStorage.setItem('kh_product_categories_v1', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('kh:categories-updated'));
      } catch {
        // ignore
      }
      handleCancelEditCategory();
      dispatchToast('Categoría Actualizada', `Categoría "${cleanName}" modificada con éxito.`, 'success');
    } else {
      const cleanId = cleanName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const finalId = cleanId || `cat-${Date.now()}`;
      if (categories.some((c) => c.id === finalId)) {
        dispatchToast('Categoría Existente', `Ya existe una categoría con identificador "${finalId}".`, 'warning');
        return;
      }

      const newCat: ProductCategoryItem = {
        id: finalId,
        name: cleanName,
        icon: resolvedIconType ? '' : undefined,
        iconType: resolvedIconType,
        iconSvg: cleanedSvg || undefined,
        iconImageUrl: cleanedIconImg || undefined,
        iconColor: resolvedIconType === 'svg' ? catFormIconColor : undefined,
        iconBgColor: resolvedIconType ? catFormIconBgColor : undefined,
        imageUrl: catFormImageUrl.trim() || undefined,
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      try {
        localStorage.setItem('kh_product_categories_v1', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('kh:categories-updated'));
      } catch {
        // ignore
      }
      handleCancelEditCategory();
      setActiveTab(finalId);
      dispatchToast('Categoría Creada', `Categoría "${cleanName}" guardada exitosamente.`, 'success');
    }
  };

  const handleCategorySvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      dispatchToast('Formato Inválido', 'Selecciona un archivo .svg válido.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      const clean = sanitizeCategorySvg(raw, true);
      if (!clean) {
        dispatchToast('SVG Inválido', 'No se pudo leer el código <svg> del archivo.', 'error');
        return;
      }
      setCatFormIconType('svg');
      setCatFormIconSvg(clean);
      dispatchToast('SVG Cargado', 'Icono SVG listo. Personaliza su color y fondo.', 'success');
    };
    reader.readAsText(file);
  };

  const handleCategoryPngIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      dispatchToast('Archivo muy grande', 'El icono PNG/imagen debe pesar menos de 2 MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCatFormIconType('image');
        setCatFormIconImageUrl(reader.result);
        dispatchToast('Icono Cargado', 'Icono PNG/imagen adjuntado conservando transparencia.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditCategory = (cat: ProductCategoryItem) => {
    setEditingCategoryId(cat.id);
    setCatFormName(cat.name);
    setCatFormIcon(cat.icon || '');
    setCatFormIconType(cat.iconType === 'image' ? 'image' : 'svg');
    setCatFormIconSvg(cat.iconSvg || '');
    setCatFormIconImageUrl(cat.iconImageUrl || '');
    setCatFormIconColor(cat.iconColor || '#ffffff');
    setCatFormIconBgColor(cat.iconBgColor || (cat.iconType === 'image' ? 'transparent' : '#f97316'));
    setCatFormImageUrl(cat.imageUrl || '');
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setCatFormName('');
    setCatFormIcon('');
    setCatFormIconType('svg');
    setCatFormIconSvg('');
    setCatFormIconImageUrl('');
    setCatFormIconColor('#ffffff');
    setCatFormIconBgColor('#f97316');
    setCatFormImageUrl('');
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    openNoticeModal({
      title: '¿Eliminar categoría?',
      message: `Se eliminará la categoría "${catName}". Los productos asociados mantendrán sus datos.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Categoría',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        const updated = categories.filter((c) => c.id !== catId);
        setCategories(updated);
        try {
          localStorage.setItem('kh_product_categories_v1', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('kh:categories-updated'));
        } catch {
          // ignore
        }
        if (activeTab === catId) {
          setActiveTab('todos');
        }
        if (editingCategoryId === catId) {
          handleCancelEditCategory();
        }
        dispatchToast('Categoría Eliminada', `Categoría "${catName}" eliminada correctamente.`, 'info');
      },
    });
  };

  const DEFAULT_PIZZA_SIZES: ProductSizeConfig[] = [
    { id: 'sz-p-4', name: '04 Tajadas de Pizza', label: '4 Cortes • Personal', slices: 4, price: 19.9, enabled: true },
    { id: 'sz-p-6', name: '06 Tajadas de Pizza', label: '6 Cortes • Mediana', slices: 6, price: 34.9, enabled: true },
    { id: 'sz-p-8', name: '08 Tajadas de Pizza', label: '8 Cortes • Familiar', slices: 8, price: 49.9, enabled: true, isDefault: true },
    { id: 'sz-p-12', name: '12 Tajadas de Pizza', label: '12 Cortes • Gigante', slices: 12, price: 62.9, enabled: true },
  ];

  const handleOpenCreate = () => {
    setIsTypePickerOpen(true);
  };

  const handleCreateWithType = (productType: ProductType, templateId?: string) => {
    const initialCategory = activeTab !== 'todos' ? activeTab : categories[0]?.id || 'pizzas';
    const isPizzaCategory = initialCategory === 'pizzas';
    const shouldStartWithSizes =
      productType === 'half_and_half' || (productType === 'standard' && isPizzaCategory);

    const tpl = templateId ? optionTemplates.find((t) => t.id === templateId) : undefined;

    const blank: Product = {
      id: `prod-${Date.now()}`,
      name: '',
      description: '',
      category: initialCategory,
      productType,
      imageUrl: '',
      badge: '',
      isAvailable: true,
      dineInOnly: false,
      hasSizes:
        productType === 'apparel'
          ? false
          : tpl
            ? tpl.sizes.length > 0 || productType === 'half_and_half'
            : shouldStartWithSizes,
      basePrice: 0,
      sizes:
        productType === 'apparel'
          ? []
          : tpl && tpl.sizes.length > 0
            ? JSON.parse(JSON.stringify(tpl.sizes))
            : shouldStartWithSizes
              ? JSON.parse(JSON.stringify(DEFAULT_PIZZA_SIZES))
              : [],
      subOptions:
        productType === 'apparel'
          ? []
          : tpl
            ? JSON.parse(JSON.stringify(tpl.subOptions))
            : [],
      allowedExtras:
        productType === 'apparel'
          ? []
          : tpl
            ? JSON.parse(JSON.stringify(tpl.allowedExtras))
            : [],
      apparelConfig:
        productType === 'apparel'
          ? JSON.parse(JSON.stringify(DEFAULT_APPAREL_CONFIG))
          : undefined,
    };

    setIsTypePickerOpen(false);
    setTempProduct(blank);
    setInitialProductSnapshot(JSON.stringify(blank));
    setIsCreatingProduct(true);
    setIsAddingSize(false);
    setIsAddingExtra(false);
    setEditingSizeId(null);
    setEditingExtraId(null);
    setExpandedChoiceSubOptions({});
    setIsEditingTemplate(false);
    setIsSavingTemplateName(false);
    setIsTemplatesPanelOpen(false);
    setEditorRightTab(blank.hasSizes ? 'sizes' : 'suboptions');
    setIsEditModalOpen(true);

    if (tpl) {
      dispatchToast('Plantilla cargada', `Se aplicó "${tpl.name}" al nuevo producto.`, 'info');
    }
  };

  const handleDuplicateProduct = (prod: Product) => {
    const cloned: Product = JSON.parse(JSON.stringify(prod));
    cloned.id = `prod-${Date.now()}`;
    cloned.name = `${prod.name} (Copia)`;
    setTempProduct(cloned);
    setInitialProductSnapshot(JSON.stringify(cloned));
    setIsCreatingProduct(true);
    setIsAddingSize(false);
    setIsAddingExtra(false);
    setEditingSizeId(null);
    setEditingExtraId(null);
    setExpandedChoiceSubOptions({});
    setIsEditingTemplate(false);
    setIsSavingTemplateName(false);
    setIsTemplatesPanelOpen(false);
    setEditorRightTab(cloned.hasSizes && cloned.productType !== 'apparel' ? 'sizes' : 'suboptions');
    setIsEditModalOpen(true);
    dispatchToast('Producto duplicado', `Ajusta los datos de "${cloned.name}" y guarda para crearlo.`, 'info');
  };

  const handleOpenEdit = (prod: Product) => {
    const cloned: Product = JSON.parse(JSON.stringify(prod));
    cloned.subOptions = (cloned.subOptions || []).map((g: SubOptionGroup) => ({
      ...g,
      enabled: g.enabled !== false,
      openByDefault: g.openByDefault ?? true,
      choices: (g.choices || []).map((c: SubOptionChoice) => ({
        ...c,
        nestedChoices: c.nestedChoices || [],
      })),
    }));
    cloned.sizes = cloned.sizes || [];
    cloned.allowedExtras = (cloned.allowedExtras || []).map((e: ExtraModifier) => ({
      ...e,
      enabled: e.enabled !== false,
    }));

    setTempProduct(cloned);
    setInitialProductSnapshot(JSON.stringify(cloned));
    setIsCreatingProduct(false);
    setIsAddingSize(false);
    setIsAddingExtra(false);
    setEditingSizeId(null);
    setEditingExtraId(null);
    setExpandedChoiceSubOptions({});
    setIsEditingTemplate(false);
    setIsSavingTemplateName(false);
    setIsTemplatesPanelOpen(false);
    setEditorRightTab(cloned.hasSizes && cloned.productType !== 'apparel' ? 'sizes' : 'suboptions');
    setIsEditModalOpen(true);
  };

  const handleRequestCloseEditor = () => {
    if (tempProduct && JSON.stringify(tempProduct) !== initialProductSnapshot) {
      openNoticeModal({
        title: '¿Descartar cambios sin guardar?',
        message: 'Tienes modificaciones pendientes en este producto. Si sales ahora se perderán.',
        tone: 'warning',
        confirmLabel: 'Descartar',
        cancelLabel: 'Seguir editando',
        onConfirm: () => {
          setIsEditModalOpen(false);
        },
      });
      return;
    }
    setIsEditModalOpen(false);
  };

  const handleSaveBranchPricesFromDrawer = (
    productId: string,
    nextBranchPrices: Record<string, import('../../types/catalog').BranchPriceOverride>
  ) => {
    const target = products.find((p) => p.id === productId);
    if (target) {
      updateProduct({
        ...target,
        branchPrices: nextBranchPrices,
      });
    }
    if (tempProduct && tempProduct.id === productId) {
      const updatedTemp = { ...tempProduct, branchPrices: nextBranchPrices };
      setTempProduct(updatedTemp);
      setInitialProductSnapshot(JSON.stringify(updatedTemp));
    }
    dispatchToast('Precios actualizados', 'Se guardaron los precios y disponibilidad por sucursal.', 'success');
  };

  // Allow Ctrl+V image paste anywhere inside the product editor
  useEffect(() => {
    if (!isEditModalOpen || !tempProduct) return;
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          try {
            const compressed = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.75 });
            setTempProduct((prev) => (prev ? { ...prev, imageUrl: compressed.dataUrl } : prev));
            dispatchToast('Imagen pegada', 'Se actualizó la foto del producto desde el portapapeles.', 'success');
          } catch {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (typeof ev.target?.result === 'string') {
                setTempProduct((prev) => (prev ? { ...prev, imageUrl: ev.target!.result as string } : prev));
                dispatchToast('Imagen pegada', 'Se actualizó la foto del producto.', 'success');
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isEditModalOpen, tempProduct, dispatchToast]);

  const handleDeleteProduct = (productId: string, productName: string) => {
    openNoticeModal({
      title: '¿Eliminar producto?',
      message: `Se eliminará "${productName}" definitivamente del catálogo de ventas y de la tienda virtual.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Producto',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        deleteProduct(productId);
        if (isEditModalOpen && tempProduct?.id === productId) {
          setIsEditModalOpen(false);
        }
      },
    });
  };

  const commitSaveProduct = (createAnother = false) => {
    if (!tempProduct || !tempProduct.name.trim()) {
      dispatchToast('Nombre requerido', 'Ingresa un nombre válido para el producto.', 'warning');
      return;
    }

    // Explicitly normalize and safeguard subOptions and choices
    const normalizedSubOptions: SubOptionGroup[] = (tempProduct.subOptions || []).map((g, gIdx) => ({
      ...g,
      name: g.name.trim() || `Grupo ${gIdx + 1}`,
      enabled: g.enabled !== false,
      required: !!g.required,
      openByDefault: g.openByDefault ?? true,
      maxSelection: g.maxSelection ?? 0,
      layoutVisual: g.layoutVisual || 'list',
      accordionStyle: g.accordionStyle || 'standard',
      conditionOptionId: g.conditionOptionId || '',
      choices: (g.choices || []).map((c, cIdx) => ({
        ...c,
        name: c.name.trim() || `Opción ${cIdx + 1}`,
        priceDelta: typeof c.priceDelta === 'number' ? c.priceDelta : parseFloat(String(c.priceDelta)) || 0,
        nestedChoices: (c.nestedChoices || []).map((n, nIdx) => ({
          ...n,
          name: n.name.trim() || `Sub-opción ${nIdx + 1}`,
          priceDelta: typeof n.priceDelta === 'number' ? n.priceDelta : parseFloat(String(n.priceDelta)) || 0,
        })),
      })),
    }));

    // Auto-commit any active size being edited
    let currentSizes = [...(tempProduct.sizes || [])];
    if (editingSizeId && editSizeName.trim()) {
      currentSizes = currentSizes.map((s) =>
        s.id === editingSizeId
          ? {
              ...s,
              name: editSizeName.trim(),
              slices: editSizeSlices,
              price: editSizePrice,
              imageUrl: editSizeImage.trim() || undefined,
            }
          : s
      );
    }

    // Auto-commit any active extra being edited
    let currentExtras = [...(tempProduct.allowedExtras || [])];
    if (editingExtraId && editExtraName.trim()) {
      currentExtras = currentExtras.map((ext) =>
        ext.id === editingExtraId
          ? {
              ...ext,
              name: editExtraName.trim(),
              price: editExtraPrice,
              category: editExtraCategory,
              imageUrl: editExtraImage.trim() || undefined,
              isIncluded: editExtraIncluded,
              conditionalRule: editExtraHasCond
                ? { minQty: editExtraMinQty, discountedPrice: editExtraCondPrice }
                : undefined,
            }
          : ext
      );
    }

    // Auto-commit new extra if user filled out the form and hit save product
    if (isAddingExtra && newExtraName.trim()) {
      currentExtras.push({
        id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: newExtraName.trim(),
        price: newExtraPrice,
        category: newExtraCategory,
        imageUrl: newExtraImage.trim() || undefined,
        isIncluded: newExtraIsIncluded,
        enabled: true,
        conditionalRule: newExtraHasCond
          ? { minQty: newExtraMinQty, discountedPrice: newExtraCondPrice }
          : undefined,
      });
    }

    const normalizedExtras: ExtraModifier[] = currentExtras.map((ext) => ({
      ...ext,
      name: ext.name.trim(),
      price: typeof ext.price === 'number' ? ext.price : parseFloat(String(ext.price)) || 0,
      enabled: ext.enabled !== false,
      isIncluded: !!ext.isIncluded,
      imageUrl: ext.imageUrl?.trim() || undefined,
    }));

    const productToSave: Product = {
      ...tempProduct,
      name: tempProduct.name.trim(),
      basePrice: typeof tempProduct.basePrice === 'number' ? tempProduct.basePrice : parseFloat(String(tempProduct.basePrice)) || 0,
      hasSizes: !!tempProduct.hasSizes,
      subOptions: normalizedSubOptions,
      sizes: currentSizes,
      allowedExtras: normalizedExtras,
    };

    if (isCreatingProduct) {
      createProduct(productToSave);
    } else {
      updateProduct(productToSave);
    }
    setEditingSizeId(null);
    setEditingExtraId(null);
    setIsAddingExtra(false);
    setIsAddingSize(false);

    if (createAnother) {
      setIsEditModalOpen(false);
      setIsTypePickerOpen(true);
    } else {
      setIsEditModalOpen(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    commitSaveProduct(false);
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      dispatchToast('Comprimiendo', 'Optimizando foto...', 'info');
      const compressed = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.75 });
      setTempProduct((prev) => (prev ? { ...prev, imageUrl: compressed.dataUrl } : prev));
      dispatchToast('Imagen cargada', 'Foto adjuntada correctamente.', 'success');
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setTempProduct((prev) => (prev ? { ...prev, imageUrl: ev.target!.result as string } : prev));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper for reading uploaded file with automatic client compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, onResult: (b64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      dispatchToast('Comprimiendo', 'Optimizando foto...', 'info');
      const compressed = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.75 });
      onResult(compressed.dataUrl);
      dispatchToast('Imagen Cargada', 'Se adjuntó la foto optimizada con éxito.', 'success');
    } catch {
      const reader = new FileReader();
      reader.onload = (loadEv) => {
        if (typeof loadEv.target?.result === 'string') {
          onResult(loadEv.target.result);
          dispatchToast('Imagen Cargada', 'Se adjuntó la foto exitosamente.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteClipboardImage = async (onResult: (b64: string) => void) => {
    try {
      if (!navigator.clipboard?.read) {
        dispatchToast('Portapapeles', 'Copia una imagen y presiona Ctrl+V en el campo o usa el botón subir.', 'info');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `paste-${Date.now()}.png`, { type: imageType });
          dispatchToast('Comprimiendo', 'Optimizando foto pegada...', 'info');
          const compressed = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.75 });
          onResult(compressed.dataUrl);
          dispatchToast('Imagen Pegada', 'Foto pegada y comprimida con éxito.', 'success');
          return;
        }
      }
      dispatchToast('Sin imagen', 'No se encontró ninguna imagen en el portapapeles.', 'warning');
    } catch {
      dispatchToast('Permiso de Portapapeles', 'Permite el acceso al portapapeles o usa el botón Subir.', 'warning');
    }
  };

  // SIZES CRUD
  const handleAddNewSize = () => {
    if (!tempProduct || !newSizeName.trim()) {
      dispatchToast('Nombre de Tamaño Requerido', 'Ingresa el nombre del tamaño.', 'warning');
      return;
    }
    const newId = `size-${Date.now()}`;
    const newSize: ProductSizeConfig = {
      id: newId,
      name: newSizeName.trim(),
      label: `${newSizeSlices} cortes`,
      slices: newSizeSlices,
      price: newSizePrice,
      imageUrl: newSizeImage || undefined,
      enabled: true,
    };
    setTempProduct({
      ...tempProduct,
      sizes: [...tempProduct.sizes, newSize],
    });
    setNewSizeName('');
    setNewSizePrice(35.0);
    setNewSizeImage('');
    setIsAddingSize(false);
    dispatchToast('Tamaño Agregado', `Tamaño ${newSize.name} sumado a la lista.`, 'success');
  };

  const handleDeleteSize = (sizeId: string) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      sizes: tempProduct.sizes.filter((s) => s.id !== sizeId),
    });
  };

  const handleToggleSize = (sizeId: string) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      sizes: tempProduct.sizes.map((s) => (s.id === sizeId ? { ...s, enabled: !s.enabled } : s)),
    });
  };

  // EXTRAS CRUD & CONDITIONAL PRICING
  const handleAddExtraModifier = () => {
    if (!tempProduct || !newExtraName.trim()) {
      dispatchToast('Nombre de Adicional Requerido', 'Ingresa el nombre del extra.', 'warning');
      return;
    }
    const newExtra: ExtraModifier = {
      id: `ext-${Date.now()}`,
      name: newExtraName.trim(),
      price: newExtraPrice,
      category: newExtraCategory,
      imageUrl: newExtraImage || undefined,
      isIncluded: newExtraIsIncluded,
      enabled: true,
      conditionalRule: newExtraHasCond
        ? {
            minQty: newExtraMinQty,
            discountedPrice: newExtraCondPrice,
          }
        : undefined,
    };
    setTempProduct({
      ...tempProduct,
      allowedExtras: [...tempProduct.allowedExtras, newExtra],
    });
    setNewExtraName('');
    setNewExtraPrice(5.0);
    setNewExtraImage('');
    setNewExtraIsIncluded(false);
    setNewExtraHasCond(false);
    setIsAddingExtra(false);
    dispatchToast('Adicional Creado', `Extra ${newExtra.name} configurado.`, 'success');
  };

  const handleDeleteExtra = (extraId: string) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      allowedExtras: tempProduct.allowedExtras.filter((e) => e.id !== extraId),
    });
  };

  const handleToggleExtra = (extraId: string) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      allowedExtras: tempProduct.allowedExtras.map((e) =>
        e.id === extraId ? { ...e, enabled: !e.enabled } : e
      ),
    });
  };

  const handleToggleExtraIncluded = (extraId: string) => {
    if (!tempProduct) return;
    setTempProduct({
      ...tempProduct,
      allowedExtras: tempProduct.allowedExtras.map((e) =>
        e.id === extraId ? { ...e, isIncluded: !e.isIncluded } : e
      ),
    });
  };

  return (
    <div className="w-full space-y-4 text-zinc-900 dark:text-zinc-100">
      {!(isEditModalOpen && tempProduct) ? (
        <>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 min-w-0">
            <Package className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span className="truncate">Productos</span>
          </h2>

          {tenants.length > 0 && (
            <div className="inline-flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setCatalogViewMode('catalog')}
                className={`whitespace-nowrap shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  catalogViewMode === 'catalog'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Catálogo
              </button>
              <button
                type="button"
                onClick={() => setCatalogViewMode('branch_pricing')}
                className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  catalogViewMode === 'branch_pricing'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Precios por sucursal</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Search Box (Desktop inline) */}
          <div className="relative hidden md:block w-52">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Manage / Create Category Button */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium shadow-xs transition-colors active:scale-[0.97] whitespace-nowrap shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">+ Categoría</span>
            <span className="sm:hidden">Categoría</span>
          </button>

          {/* New Product Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-opacity hover:opacity-95 active:scale-[0.97] whitespace-nowrap shrink-0"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo producto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Box */}
      <div className="relative md:hidden">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full min-h-[40px] pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
        />
      </div>

      {/* Quiet Operational Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Total productos</span>
          <span className="text-xl font-semibold tabular-nums text-zinc-950 dark:text-white mt-0.5 block">
            {catalogMetrics.total}
          </span>
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block">En venta</span>
          <span className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {catalogMetrics.available}
          </span>
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Pausados</span>
          <span className="text-xl font-semibold tabular-nums text-zinc-700 dark:text-zinc-300 mt-0.5 block">
            {catalogMetrics.paused}
          </span>
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Ajustes por sede</span>
          <span className="text-xl font-semibold tabular-nums text-zinc-950 dark:text-white mt-0.5 block">
            {catalogMetrics.branchCustomized}
          </span>
        </div>
      </div>

      {/* Category Filter Tabs + Type/Status Filters + Table/Grid Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('todos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 active:scale-[0.97] ${
              activeTab === 'todos'
                ? 'text-white shadow-xs font-semibold'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            style={activeTab === 'todos' ? { backgroundColor: customization.primaryColor } : undefined}
          >
            <span>Todos</span>
            <span className="text-[11px] font-mono opacity-80">{products.length}</span>
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat.id).length;
            const isSelected = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors whitespace-nowrap flex items-center gap-1.5 active:scale-[0.97] ${
                  isSelected
                    ? 'text-white shadow-xs font-semibold'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                style={isSelected ? { backgroundColor: customization.primaryColor } : undefined}
              >
                <CategoryIconBadge category={cat} alt={cat.name} size="xs" />
                <span>{cat.name}</span>
                <span className="text-[11px] font-mono opacity-75">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Right Filter Controls */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | ProductType)}
            aria-label="Filtrar por tipo de producto"
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-zinc-400"
          >
            <option value="all">Todos los tipos</option>
            <option value="standard">Producto Extra</option>
            <option value="apparel">Producto Ropa</option>
            <option value="half_and_half">Pizza Mitad y Mitad</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'paused')}
            aria-label="Filtrar por estado"
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-zinc-400"
          >
            <option value="all">Todos los estados</option>
            <option value="available">En venta</option>
            <option value="paused">Pausados</option>
          </select>

          {catalogViewMode === 'catalog' && (
            <div className="hidden md:inline-flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setCatalogLayout('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  catalogLayout === 'table'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title="Vista tabla"
                aria-label="Vista tabla"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCatalogLayout('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  catalogLayout === 'grid'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title="Vista cuadrícula"
                aria-label="Vista cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {catalogViewMode === 'branch_pricing' ? (
        <BranchPricingMatrixView
          products={filteredProducts}
          categories={categories}
          tenants={tenants}
          primaryColor={customization.primaryColor}
          onUpdateProduct={updateProduct}
          onOpenBranchDrawer={(prod) => setBranchDrawerProductId(prod.id)}
        />
      ) : (
        <>
      {/* Product List Table or Visual Grid (Desktop & Tablet >= md) */}
      {catalogLayout === 'grid' ? (
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <Package className="w-7 h-7 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No se encontraron productos
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-semibold text-xs shadow-xs active:scale-[0.97]"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear producto</span>
              </button>
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const priceInfo = formatProductPriceSummary(prod);
              return (
                <div
                  key={`grid-${prod.id}`}
                  className={`group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-[border-color,box-shadow] flex flex-col ${
                    !prod.isAvailable ? 'opacity-65' : ''
                  }`}
                >
                  {/* Visual Photo Header */}
                  <div className="relative h-40 bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      {prod.badge && (
                        <span
                          className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white shadow-xs"
                          style={{ backgroundColor: customization.primaryColor }}
                        >
                          {prod.badge}
                        </span>
                      )}
                      {prod.productType === 'apparel' && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-950/75 text-white backdrop-blur-xs">
                          Ropa
                        </span>
                      )}
                      {prod.productType === 'half_and_half' && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-950/75 text-white backdrop-blur-xs">
                          Mitad y Mitad
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewProduct(prod)}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs border border-zinc-200/80 dark:border-zinc-700 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 inline-flex items-center gap-1 shadow-xs transition-colors active:scale-[0.96]"
                      title="Vista previa 100% real"
                    >
                      <Monitor className="w-3 h-3" />
                      <span>Probar</span>
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                          {getCategoryName(prod.category)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleProductAvailability(prod.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prod.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{prod.isAvailable ? 'En venta' : 'Pausado'}</span>
                        </button>
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                        {prod.name}
                      </h4>
                      {prod.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                          {priceInfo.primary}
                        </span>
                        <span className="text-[11px] text-zinc-500">{priceInfo.detail}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="flex-1 py-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        {tenants.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setBranchDrawerProductId(prod.id)}
                            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors active:scale-[0.96]"
                            title="Precios por sucursal"
                          >
                            <Store className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDuplicateProduct(prod)}
                          className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors active:scale-[0.96]"
                          title="Duplicar producto"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-500 hover:text-rose-600 transition-colors active:scale-[0.96]"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
      <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/70 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Precio</th>
                <th className="py-3 px-4">Configuración</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Package className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                        No se encontraron productos
                      </p>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        {searchQuery
                          ? `No hay coincidencias para la búsqueda "${searchQuery}".`
                          : 'No hay productos registrados con el filtro seleccionado.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-semibold text-xs shadow-xs active:scale-[0.97]"
                        style={{ backgroundColor: customization.primaryColor }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear producto</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const priceInfo = formatProductPriceSummary(prod);
                  return (
                  <tr
                    key={prod.id}
                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                      !prod.isAvailable ? 'opacity-65' : ''
                    }`}
                  >
                    {/* 1. Producto */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                              {prod.name}
                            </span>
                            {prod.productType === 'half_and_half' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950">
                                Mitad y Mitad
                              </span>
                            )}
                            {prod.productType === 'apparel' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                Ropa
                              </span>
                            )}
                            {hasBranchPriceOverride(prod, activeTenant?.id) && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                Precio sede
                              </span>
                            )}
                            {prod.badge && (
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white"
                                style={{ backgroundColor: customization.primaryColor }}
                              >
                                {prod.badge}
                              </span>
                            )}
                          </div>
                          {prod.description && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-sm mt-0.5">
                              {prod.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Categoría */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {getCategoryName(prod.category)}
                      </span>
                    </td>

                    {/* 3. Precio */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-sm tabular-nums text-zinc-950 dark:text-white">
                        {priceInfo.primary}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {priceInfo.detail}
                      </div>
                    </td>

                    {/* 4. Configuración */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {prod.productType === 'apparel' ? (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {prod.apparelConfig?.variants.length || 0} variantes SKU
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {(prod.subOptions || []).filter((o) => o.enabled !== false).length} grupos ·{' '}
                          {(prod.allowedExtras || []).filter((e) => e.enabled !== false).length} extras
                        </div>
                      )}
                    </td>

                    {/* 5. Estado */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleProductAvailability(prod.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors active:scale-[0.97] ${
                          prod.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.isAvailable ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`}
                        />
                        <span>{prod.isAvailable ? 'En venta' : 'Pausado'}</span>
                      </button>
                    </td>

                    {/* 6. Acciones */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewProduct(prod)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-[0.96]"
                          title="Vista previa 100% real"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        {tenants.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setBranchDrawerProductId(prod.id)}
                            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors active:scale-[0.96] ${
                              tenants.some(
                                (t) =>
                                  hasBranchPriceOverride(prod, t.id) ||
                                  prod.branchPrices?.[t.id]?.isAvailable === false
                              )
                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}
                            title="Precios y disponibilidad por sucursal"
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>Sedes</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-[0.96]"
                          title="Editar producto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateProduct(prod)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-[0.96]"
                          title="Duplicar producto"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-700 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 transition-colors active:scale-[0.96]"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Mobile Responsive Product Cards (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <Package className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
              No se encontraron productos
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {searchQuery ? `Sin coincidencias para "${searchQuery}".` : 'No hay productos registrados en esta categoría.'}
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Primer Producto</span>
            </button>
          </div>
        ) : (
          filteredProducts.map((prod) => (
            <div
              key={`mob-${prod.id}`}
              className={`p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3 transition-colors ${
                !prod.isAvailable ? 'opacity-65' : ''
              }`}
            >
              {/* Header: Photo + Info + Status */}
              <div className="flex items-start gap-3">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-xs">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {getCategoryName(prod.category)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleProductAvailability(prod.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
                        prod.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${prod.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span>{prod.isAvailable ? 'En Venta' : 'Pausado'}</span>
                    </button>
                  </div>
                  <h4 className="font-black text-sm text-zinc-900 dark:text-white leading-tight">
                    {prod.name}
                  </h4>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {prod.productType === 'half_and_half' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-zinc-950 text-amber-400 border border-amber-400/50">
                        Mitad y Mitad
                      </span>
                    )}
                    {prod.productType === 'apparel' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/40">
                        Ropa / Variantes
                      </span>
                    )}
                    {hasBranchPriceOverride(prod, activeTenant?.id) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                        Precio Sede
                      </span>
                    )}
                    {prod.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-zinc-950">
                        {prod.badge}
                      </span>
                    )}
                  </div>
                  {prod.description && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-1">
                      {prod.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Sizes & Prices Chips */}
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Tamaños & Precios
                </span>
                {prod.hasSizes && prod.sizes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {prod.sizes.map((s) => (
                      <span
                        key={s.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border font-medium ${
                          s.enabled
                            ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-xs'
                            : 'border-zinc-200/50 dark:border-zinc-800 text-zinc-400 line-through'
                        }`}
                      >
                        {s.imageUrl && (
                          <img
                            src={s.imageUrl}
                            alt={s.name}
                            className="w-3.5 h-3.5 rounded object-cover"
                          />
                        )}
                        <span>{s.name}:</span>
                        <strong className="text-amber-600 dark:text-amber-400 font-bold">
                          S/ {resolveSizePrice(prod, s, activeTenant?.id).toFixed(2)}
                        </strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Precio base: S/ {resolveProductBasePrice(prod, activeTenant?.id).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Modifiers & Quick Actions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>
                      {(prod.subOptions || []).filter((o) => o.enabled !== false).length} grupos ({
                        (prod.subOptions || []).reduce((acc, g) => acc + (g.choices?.length || 0), 0)
                      } opc.)
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{(prod.allowedExtras || []).filter((e) => e.enabled !== false).length} extras</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewProduct(prod)}
                    className="whitespace-nowrap shrink-0 p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-[0.97]"
                    title="Vista previa 100% real"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  {tenants.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBranchDrawerProductId(prod.id)}
                      className="whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-xs flex items-center gap-1 transition-colors active:scale-[0.97]"
                    >
                      <Store className="w-3 h-3" />
                      <span>Sedes</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prod)}
                    className="whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-xl text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-opacity hover:opacity-95 active:scale-[0.97]"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateProduct(prod)}
                    className="whitespace-nowrap shrink-0 p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-[0.97]"
                    title="Duplicar producto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleProductAvailability(prod.id)}
                    className="whitespace-nowrap shrink-0 p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-[0.97]"
                    title={prod.isAvailable ? 'Pausar producto' : 'Activar producto'}
                  >
                    {prod.isAvailable ? (
                      <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                    className="whitespace-nowrap shrink-0 p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-700 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 transition-colors active:scale-[0.97]"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}
        </>
      ) : (
        /* Redesigned 2-Column Contextual Product Editor */
        <form onSubmit={handleSaveProduct} className="space-y-5">
          {/* Translucent Sticky Top Header Bar */}
          <div className="sticky top-2 z-20 px-4 py-3 sm:px-5 sm:py-3.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleRequestCloseEditor}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors active:scale-[0.97] whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm sm:text-base tracking-tight text-zinc-950 dark:text-white truncate">
                    {isCreatingProduct ? 'Nuevo producto' : tempProduct.name || 'Editar producto'}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 whitespace-nowrap shrink-0">
                    {tempProduct.productType === 'apparel' ? (
                      <>
                        <Shirt className="w-3 h-3" />
                        <span>Producto Ropa</span>
                      </>
                    ) : tempProduct.productType === 'half_and_half' ? (
                      <>
                        <Pizza className="w-3 h-3" />
                        <span>Pizza Mitad y Mitad</span>
                      </>
                    ) : (
                      <>
                        <UtensilsCrossed className="w-3 h-3" />
                        <span>Producto Extra</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">
                  {tempProduct.productType === 'apparel'
                    ? 'Configura identidad, tallas, colores y variantes de inventario.'
                    : tempProduct.productType === 'half_and_half'
                      ? 'Define tamaños por cortes, masas, bordes y adicionales compatibles.'
                      : 'Completa los datos esenciales a la izquierda y personaliza opciones a la derecha.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Availability Quick Toggle */}
              <button
                type="button"
                onClick={() =>
                  setTempProduct({ ...tempProduct, isAvailable: !tempProduct.isAvailable })
                }
                className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors active:scale-[0.97] ${
                  tempProduct.isAvailable
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    tempProduct.isAvailable ? 'bg-emerald-500' : 'bg-zinc-400'
                  }`}
                />
                <span>{tempProduct.isAvailable ? 'En venta' : 'Pausado'}</span>
              </button>

              {/* Live 100% Real Preview Button */}
              <button
                type="button"
                onClick={() => setPreviewProduct(tempProduct)}
                className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors active:scale-[0.97]"
                title="Probar el producto 100% real antes de guardar"
              >
                <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                <span>Vista previa</span>
              </button>

              {!isCreatingProduct && tenants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBranchDrawerProductId(tempProduct.id)}
                  className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors active:scale-[0.97]"
                >
                  <Store className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Precios por sede</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRequestCloseEditor}
                className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors active:scale-[0.97]"
              >
                Cancelar
              </button>

              {isCreatingProduct && (
                <button
                  type="button"
                  onClick={() => commitSaveProduct(true)}
                  className="whitespace-nowrap shrink-0 hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 text-xs font-medium transition-colors active:scale-[0.97]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Guardar y crear otro</span>
                </button>
              )}

              <button
                type="submit"
                className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-opacity hover:opacity-95 active:scale-[0.97]"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isCreatingProduct ? 'Crear producto' : 'Guardar cambios'}</span>
              </button>
            </div>
          </div>

          {/* 2-Column Clean Workspace */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: Compact Media + Identity + Pricing (Sticky while scrolling right options) */}
            <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:pr-1">
              {/* Media Dropzone Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Fotografía del producto
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Arrastra una imagen o pulsa Ctrl+V
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isDraggingImage) setIsDraggingImage(true);
                  }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={handleImageDrop}
                  className={`relative h-48 rounded-xl overflow-hidden border transition-colors flex items-center justify-center ${
                    isDraggingImage
                      ? 'border-dashed border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-950'
                  }`}
                >
                  {tempProduct.imageUrl ? (
                    <>
                      <img
                        src={tempProduct.imageUrl}
                        alt={tempProduct.name || 'Vista previa'}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setTempProduct({ ...tempProduct, imageUrl: '' })}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-zinc-950/75 hover:bg-rose-600 text-white transition-colors active:scale-[0.95]"
                        title="Quitar foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center px-4 space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Suelta una imagen aquí o elige desde tu galería
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        JPG, PNG o WebP optimizado automáticamente
                      </p>
                    </div>
                  )}
                  {tempProduct.badge && (
                    <span
                      className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg text-white text-[11px] font-semibold shadow-xs"
                      style={{ backgroundColor: customization.primaryColor }}
                    >
                      {tempProduct.badge}
                    </span>
                  )}
                </div>

                {/* Compact Media Toolbar */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMediaPickerConfig({
                        isOpen: true,
                        title: 'Seleccionar foto del producto',
                        onSelect: (url) => setTempProduct({ ...tempProduct, imageUrl: url }),
                      })
                    }
                    className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] whitespace-nowrap"
                  >
                    <FileImage className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Galería</span>
                  </button>

                  <label className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-[0.97] whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(e, (b64) => setTempProduct({ ...tempProduct, imageUrl: b64 }))
                      }
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      handlePasteClipboardImage((b64) => setTempProduct({ ...tempProduct, imageUrl: b64 }))
                    }
                    className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] whitespace-nowrap"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Pegar</span>
                  </button>
                </div>
              </div>

              {/* Essential Details & Pricing Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Nombre del producto *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus={isCreatingProduct}
                      value={tempProduct.name}
                      onChange={(e) => setTempProduct({ ...tempProduct, name: e.target.value })}
                      placeholder={
                        tempProduct.productType === 'apparel'
                          ? 'Ej: Polo Oversize Khalessi Negro'
                          : tempProduct.productType === 'half_and_half'
                            ? 'Ej: Pizza Mitad y Mitad Especial'
                            : 'Ej: Pizza Pepperoni Artesanal'
                      }
                      className="w-full px-3.5 py-2.5 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Categoría *
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                          + Nueva
                        </button>
                      </div>
                      <select
                        value={tempProduct.category}
                        onChange={(e) => setTempProduct({ ...tempProduct, category: e.target.value })}
                        className="w-full px-3 py-2.5 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-white capitalize focus:outline-none focus:border-zinc-400"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        Tipo de producto
                      </label>
                      <select
                        value={tempProduct.productType || 'standard'}
                        onChange={(e) => {
                          const nextType = e.target.value as ProductType;
                          const nextHasSizes =
                            nextType === 'half_and_half'
                              ? true
                              : nextType === 'apparel'
                                ? false
                                : tempProduct.hasSizes;
                          setTempProduct({
                            ...tempProduct,
                            productType: nextType,
                            hasSizes: nextHasSizes,
                            sizes:
                              nextType === 'half_and_half' && tempProduct.sizes.length === 0
                                ? JSON.parse(JSON.stringify(DEFAULT_PIZZA_SIZES))
                                : tempProduct.sizes,
                            apparelConfig:
                              nextType === 'apparel'
                                ? tempProduct.apparelConfig || JSON.parse(JSON.stringify(DEFAULT_APPAREL_CONFIG))
                                : tempProduct.apparelConfig,
                          });
                          if (nextHasSizes) {
                            setEditorRightTab('sizes');
                          } else if (editorRightTab === 'sizes') {
                            setEditorRightTab('suboptions');
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                      >
                        <option value="standard">Producto Extra</option>
                        <option value="apparel">Producto Ropa</option>
                        <option value="half_and_half">Pizza Mitad y Mitad</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Descripción
                    </label>
                    <textarea
                      rows={2}
                      value={tempProduct.description}
                      onChange={(e) => setTempProduct({ ...tempProduct, description: e.target.value })}
                      placeholder="Ingredientes principales, presentación o detalles relevantes..."
                      className="w-full px-3.5 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="pt-3.5 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  {tempProduct.productType === 'standard' && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Esquema de precios
                      </span>
                      <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => {
                            setTempProduct({ ...tempProduct, hasSizes: false });
                            if (editorRightTab === 'sizes') setEditorRightTab('suboptions');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                            !tempProduct.hasSizes
                              ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          Precio único
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTempProduct({
                              ...tempProduct,
                              hasSizes: true,
                              sizes:
                                tempProduct.sizes.length > 0
                                  ? tempProduct.sizes
                                  : JSON.parse(JSON.stringify(DEFAULT_PIZZA_SIZES)),
                            });
                            setEditorRightTab('sizes');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                            tempProduct.hasSizes
                              ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          Múltiples tamaños
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        {tempProduct.hasSizes && tempProduct.productType !== 'apparel'
                          ? 'Precio base ref. (S/)'
                          : 'Precio maestro (S/) *'}
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={tempProduct.basePrice ?? 0}
                        onChange={(e) =>
                          setTempProduct({ ...tempProduct, basePrice: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3.5 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold tabular-nums text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-400"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Precio antes (S/)
                        </label>
                        {typeof tempProduct.compareAtPrice === 'number' &&
                          tempProduct.compareAtPrice > (tempProduct.basePrice || 0) &&
                          (tempProduct.basePrice || 0) > 0 && (
                            <span className="text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                              -
                              {Math.round(
                                ((tempProduct.compareAtPrice - tempProduct.basePrice) /
                                  tempProduct.compareAtPrice) *
                                  100
                              )}
                              %
                            </span>
                          )}
                      </div>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={typeof tempProduct.compareAtPrice === 'number' ? tempProduct.compareAtPrice : ''}
                        placeholder="Opcional"
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setTempProduct({ ...tempProduct, compareAtPrice: undefined });
                          } else {
                            const parsed = parseFloat(raw);
                            if (!Number.isNaN(parsed) && parsed >= 0) {
                              setTempProduct({ ...tempProduct, compareAtPrice: parsed });
                            }
                          }
                        }}
                        className="w-full px-3.5 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Badge & Visibility Flags */}
                <div className="pt-3.5 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Etiqueta visual (opcional)
                    </label>
                    <input
                      type="text"
                      value={tempProduct.badge || ''}
                      placeholder="Ej: Más pedida, Nuevo, Promo"
                      onChange={(e) => setTempProduct({ ...tempProduct, badge: e.target.value })}
                      className="w-full px-3.5 py-2 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Nuevo', 'Más pedido', 'Recomendado', 'Promo'].map((chip) => {
                        const active = tempProduct.badge === chip;
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() =>
                              setTempProduct({ ...tempProduct, badge: active ? '' : chip })
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors active:scale-[0.97] ${
                              active
                                ? 'text-white border-transparent'
                                : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                            style={active ? { backgroundColor: customization.primaryColor } : undefined}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
                    <div>
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
                        Solo consumo en salón
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Oculta este producto en pedidos de delivery y recojo web.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!tempProduct.dineInOnly}
                      onChange={(e) =>
                        setTempProduct({ ...tempProduct, dineInOnly: e.target.checked })
                      }
                      className="w-4 h-4 rounded accent-zinc-900 dark:accent-white shrink-0"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Contextual Configuration Workspace */}
            <div className="xl:col-span-7 space-y-4">
              {tempProduct.productType === 'apparel' ? (
                <ApparelConfigEditor
                  config={tempProduct.apparelConfig || DEFAULT_APPAREL_CONFIG}
                  basePrice={tempProduct.basePrice || 0}
                  productName={tempProduct.name}
                  tenants={tenants}
                  primaryColor={customization.primaryColor}
                  onChange={(nextApparel) =>
                    setTempProduct({ ...tempProduct, apparelConfig: nextApparel })
                  }
                  onOpenMediaPicker={(title, onSelect) =>
                    setMediaPickerConfig({ isOpen: true, title, onSelect })
                  }
                />
              ) : (
                <>
                  {/* Right Column Segmented Tabs + Compact Templates Popover */}
                  <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 overflow-x-auto no-scrollbar">
                        {tempProduct.hasSizes && (
                          <button
                            type="button"
                            onClick={() => setEditorRightTab('sizes')}
                            className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              editorRightTab === 'sizes'
                                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <Pizza className="w-3.5 h-3.5" />
                            <span>Tamaños</span>
                            <span className="text-[11px] font-mono text-zinc-400">
                              {tempProduct.sizes.length}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditorRightTab('suboptions')}
                          className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            editorRightTab === 'suboptions'
                              ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Sub-opciones</span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {tempProduct.subOptions.length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorRightTab('extras')}
                          className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            editorRightTab === 'extras'
                              ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Adicionales</span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {tempProduct.allowedExtras.length}
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsTemplatesPanelOpen((v) => !v)}
                        className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors active:scale-[0.97] ${
                          isTemplatesPanelOpen
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-transparent'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Plantillas ({optionTemplates.length})</span>
                      </button>
                    </div>

                    {/* Collapsible Compact Templates Manager */}
                    {isTemplatesPanelOpen && (
                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex-1 min-w-[200px]">
                            <select
                              value={selectedTemplateId}
                              onChange={(e) => {
                                setSelectedTemplateId(e.target.value);
                                setIsEditingTemplate(false);
                              }}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white"
                            >
                              <option value="">Seleccionar plantilla guardada ({optionTemplates.length})</option>
                              {optionTemplates.map((tpl) => (
                                <option key={tpl.id} value={tpl.id}>
                                  {tpl.name} ({tpl.sizes.length} tam., {tpl.subOptions.length} grp., {tpl.allowedExtras.length} ext.)
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            disabled={!selectedTemplateId}
                            onClick={() => handleApplyTemplate(selectedTemplateId)}
                            className="whitespace-nowrap shrink-0 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Cargar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsSavingTemplateName((v) => !v)}
                            className="whitespace-nowrap shrink-0 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors active:scale-[0.97]"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>Guardar actual</span>
                          </button>

                          {selectedTemplateId && (
                            <button
                              type="button"
                              onClick={() => handleStartEditTemplate(selectedTemplateId)}
                              className="whitespace-nowrap shrink-0 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Editar plantilla"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {selectedTemplateId &&
                            !DEFAULT_OPTION_TEMPLATES.some((d) => d.id === selectedTemplateId) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(selectedTemplateId)}
                                className="whitespace-nowrap shrink-0 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="Eliminar plantilla"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>

                        {isSavingTemplateName && (
                          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              placeholder="Nombre de la nueva plantilla (ej: Pizzas Clásicas)"
                              value={templateCustomName}
                              onChange={(e) => setTemplateCustomName(e.target.value)}
                              className="flex-1 min-w-[200px] px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                            />
                            <button
                              type="button"
                              onClick={handleSaveCurrentAsTemplate}
                              className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                              style={{ backgroundColor: customization.primaryColor }}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsSavingTemplateName(false);
                                setTemplateCustomName('');
                              }}
                              className="whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}

                        {isEditingTemplate && selectedTemplateId && (
                          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={editTemplateName}
                              onChange={(e) => setEditTemplateName(e.target.value)}
                              placeholder="Nombre de la plantilla"
                              className="flex-1 min-w-[180px] px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditTemplate}
                              className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                              style={{ backgroundColor: customization.primaryColor }}
                            >
                              Actualizar
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingTemplate(false)}
                              className="whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

              {/* TAMAÑOS CON FOTO Y CRUD */}
              {tempProduct.hasSizes && editorRightTab === 'sizes' && (
                <div className="space-y-3 p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pizza className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        Tamaños y precios
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingSize(!isAddingSize)}
                      className="px-3 py-1.5 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-95 active:scale-[0.97] flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      style={{ backgroundColor: customization.primaryColor }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingSize ? 'Cerrar' : 'Agregar tamaño'}</span>
                    </button>
                  </div>

                  {/* Add Size Form */}
                  {isAddingSize && (
                    <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-amber-500/40 space-y-3 shadow-md">
                      <h4 className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-amber-500" /> Nuevo Tamaño
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 block mb-0.5">
                            Nombre del Tamaño
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Familiar 40cm"
                            value={newSizeName}
                            onChange={(e) => setNewSizeName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 block mb-0.5">
                            Cortes
                          </label>
                          <input
                            type="number"
                            value={newSizeSlices}
                            onChange={(e) => setNewSizeSlices(parseInt(e.target.value) || 4)}
                            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 block mb-0.5">
                            Precio (S/)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={newSizePrice}
                            onChange={(e) => setNewSizePrice(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white font-black text-amber-600"
                          />
                        </div>
                      </div>

                      {/* Photo for size */}
                      <div className="flex items-center gap-3 pt-1">
                        {newSizeImage ? (
                          <div className="relative">
                            <img src={newSizeImage} alt="Size preview" className="w-10 h-10 rounded-xl object-cover border" />
                            <button
                              type="button"
                              onClick={() => setNewSizeImage('')}
                              className="absolute -top-1 -right-1 p-0.5 bg-rose-500 text-white rounded-full"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setMediaPickerConfig({
                              isOpen: true,
                              title: 'Foto del Tamaño',
                              onSelect: (url) => setNewSizeImage(url),
                            })
                          }
                          className="py-1.5 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-zinc-950 text-xs font-black flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                        >
                          <FileImage className="w-3.5 h-3.5" />
                          <span>Galería</span>
                        </button>
                        <label className="py-1.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold cursor-pointer">
                          <span>Subir Foto de Tamaño</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, (b64) => setNewSizeImage(b64))}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handlePasteClipboardImage((b64) => setNewSizeImage(b64))}
                          className="py-1.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
                        >
                          Pegar Foto
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddNewSize}
                        className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-xs"
                      >
                        Confirmar Tamaño
                      </button>
                    </div>
                  )}

                  {/* List of existing sizes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {tempProduct.sizes.map((sz) => {
                      const isEditingThisSize = editingSizeId === sz.id;
                      return (
                        <div
                          key={sz.id}
                          className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-xs"
                        >
                          {isEditingThisSize ? (
                            /* Inline Edit Form */
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-3">
                                  <label className="text-[10px] font-bold block mb-0.5">Nombre</label>
                                  <input
                                    type="text"
                                    value={editSizeName}
                                    onChange={e => setEditSizeName(e.target.value)}
                                    className="w-full px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold block mb-0.5">Cortes</label>
                                  <input
                                    type="number"
                                    value={editSizeSlices}
                                    onChange={e => setEditSizeSlices(parseInt(e.target.value) || 4)}
                                    className="w-full px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] font-bold block mb-0.5">Precio (S/)</label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={editSizePrice}
                                    onChange={e => setEditSizePrice(parseFloat(e.target.value) || 0)}
                                    className="w-full px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-amber-500"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {editSizeImage ? (
                                  <img src={editSizeImage} alt="Size preview" className="w-8 h-8 rounded-lg object-cover border" />
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMediaPickerConfig({
                                      isOpen: true,
                                      title: 'Cambiar Foto del Tamaño',
                                      onSelect: (url) => setEditSizeImage(url),
                                    })
                                  }
                                  className="text-[11px] font-bold px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-zinc-950 flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                                >
                                  <FileImage className="w-3 h-3" />
                                  <span>Galería</span>
                                </button>
                                <label className="text-[11px] font-bold px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer">
                                  <span>Subir Foto</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e, (b64) => setEditSizeImage(b64))}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handlePasteClipboardImage((b64) => setEditSizeImage(b64))}
                                  className="text-[11px] font-bold px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700"
                                >
                                  Pegar Foto
                                </button>
                                {editSizeImage && (
                                  <button
                                    type="button"
                                    onClick={() => setEditSizeImage('')}
                                    className="text-[11px] font-bold px-2 py-1 rounded-lg text-rose-500"
                                  >
                                    Quitar Foto
                                  </button>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleSaveEditSize}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSizeId(null)}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Normal Size View */
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {sz.imageUrl ? (
                                  <img src={sz.imageUrl} alt={sz.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                    <Pizza className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white block truncate">
                                    {sz.name}
                                  </span>
                                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                                    {sz.slices} cortes • <strong className="text-amber-500">S/ {sz.price.toFixed(2)}</strong>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSize(sz.id)}
                                  className={`p-1.5 rounded-xl border transition-colors ${
                                    sz.enabled
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400'
                                  }`}
                                  title={sz.enabled ? 'Tamaño disponible' : 'Tamaño pausado'}
                                >
                                  {sz.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSize(sz)}
                                  className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                                  title="Editar tamaño"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSize(sz.id)}
                                  className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                  title="Eliminar tamaño"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUBOPCIONES */}
              {editorRightTab === 'suboptions' && (
              <div className="space-y-4 p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
                    <span>Sub-opciones (masas, salsas, toppings)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddNewGroup}
                    className="px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-95 active:scale-[0.97] whitespace-nowrap shrink-0 shadow-xs"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar grupo</span>
                  </button>
                </div>

                {tempProduct.subOptions.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40">
                    <Sliders className="w-7 h-7 text-zinc-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Sin grupos de opciones todavía
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Crea un grupo para ofrecer elección de masa, salsas, sabores o acompañamientos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {tempProduct.subOptions.map((group, groupIdx) => {
                      const isGroupDropTarget = dragOverGroupIdx === groupIdx && draggedGroupIdx !== groupIdx;
                      return (
                      <div
                        key={group.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedGroupIdx(groupIdx);
                        }}
                        onDragOver={(e) => {
                          if (draggedGroupIdx === null || draggedChoice !== null) return;
                          e.preventDefault();
                          if (dragOverGroupIdx !== groupIdx) setDragOverGroupIdx(groupIdx);
                        }}
                        onDrop={(e) => {
                          if (draggedGroupIdx === null || draggedChoice !== null) return;
                          e.preventDefault();
                          handleMoveGroup(draggedGroupIdx, groupIdx);
                          setDraggedGroupIdx(null);
                          setDragOverGroupIdx(null);
                        }}
                        onDragEnd={() => {
                          setDraggedGroupIdx(null);
                          setDragOverGroupIdx(null);
                        }}
                        className={`rounded-2xl border-2 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4 shadow-sm transition-all ${
                          isGroupDropTarget
                            ? 'border-amber-500 ring-2 ring-amber-400/30'
                            : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        {/* Group Header: Drag + Move + Red Icon + Group Name Input + Duplicate + Delete Group */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-0.5 shrink-0">
                            <GripVertical
                              className="w-4 h-4 text-zinc-400 cursor-grab active:cursor-grabbing"
                              aria-label="Arrastrar grupo"
                            />
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={groupIdx === 0}
                                onClick={() => handleMoveGroup(groupIdx, groupIdx - 1)}
                                className="p-0.5 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                                title="Mover grupo arriba"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={groupIdx === tempProduct.subOptions.length - 1}
                                onClick={() => handleMoveGroup(groupIdx, groupIdx + 1)}
                                className="p-0.5 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                                title="Mover grupo abajo"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                            <LayoutGrid className="w-5 h-5" />
                          </div>
                          <input
                            type="text"
                            placeholder="Nombre del Grupo (ej. Elige tus Toppings)"
                            value={group.name}
                            onChange={(e) => handleUpdateGroup(group.id, { name: e.target.value })}
                            className="flex-1 min-w-0 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-black text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleDuplicateGroup(group.id)}
                            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors shrink-0"
                            title="Duplicar grupo"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                            title="Eliminar grupo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Group Settings Bar (matching Image 2) */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
                          {/* Max Selection */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-600 dark:text-zinc-400"># Máx. selección</span>
                            <input
                              type="number"
                              min={0}
                              value={group.maxSelection ?? 0}
                              onChange={(e) => handleUpdateGroup(group.id, { maxSelection: parseInt(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-center font-bold text-zinc-900 dark:text-white"
                            />
                          </div>

                          {/* Required */}
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                            <input
                              type="checkbox"
                              checked={group.required ?? false}
                              onChange={(e) => handleUpdateGroup(group.id, { required: e.target.checked })}
                              className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                            />
                            <span>Requerido</span>
                          </label>

                          {/* Open by Default */}
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                            <input
                              type="checkbox"
                              checked={group.openByDefault ?? true}
                              onChange={(e) => handleUpdateGroup(group.id, { openByDefault: e.target.checked })}
                              className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                            />
                            <span>Abierto por defecto</span>
                          </label>

                          {/* Layout Visual */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-600 dark:text-zinc-400">Layout Visual:</span>
                            <select
                              value={group.layoutVisual || 'list'}
                              onChange={(e) => handleUpdateGroup(group.id, { layoutVisual: e.target.value as any })}
                              className="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold text-zinc-900 dark:text-white"
                            >
                              <option value="list">Lista (Normal)</option>
                              <option value="grid">Grid</option>
                              <option value="pills">Pills</option>
                            </select>
                          </div>

                          {/* Accordion Style */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-600 dark:text-zinc-400">Estilo Acordeón:</span>
                            <select
                              value={group.accordionStyle || 'standard'}
                              onChange={(e) => handleUpdateGroup(group.id, { accordionStyle: e.target.value as any })}
                              className="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold text-zinc-900 dark:text-white"
                            >
                              <option value="standard">Estándar</option>
                              <option value="collapsible">Colapsable</option>
                            </select>
                          </div>

                          {/* Condition Option ID */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-600 dark:text-zinc-400">Condición (ID Opc.):</span>
                            <input
                              type="text"
                              placeholder="Dejar vacío"
                              value={group.conditionOptionId ?? ''}
                              onChange={(e) => handleUpdateGroup(group.id, { conditionOptionId: e.target.value })}
                              className="w-24 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Section Label: OPCIONES */}
                        <div className="text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pt-1">
                          <ListOrdered className="w-3.5 h-3.5" />
                          <span>OPCIONES ({group.choices.length})</span>
                        </div>

                        {/* List of Choices in Group */}
                        <div className="space-y-3">
                          {group.choices.map((choice, choiceIdx) => {
                            const isSubOptionsOpen = !!expandedChoiceSubOptions[choice.id];
                            const isChoiceDropTarget =
                              dragOverChoice?.groupId === group.id &&
                              dragOverChoice?.index === choiceIdx &&
                              !(draggedChoice?.groupId === group.id && draggedChoice?.index === choiceIdx);
                            return (
                              <div
                                key={choice.id}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggedChoice({ groupId: group.id, index: choiceIdx });
                                }}
                                onDragOver={(e) => {
                                  if (!draggedChoice || draggedChoice.groupId !== group.id) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (
                                    dragOverChoice?.groupId !== group.id ||
                                    dragOverChoice?.index !== choiceIdx
                                  ) {
                                    setDragOverChoice({ groupId: group.id, index: choiceIdx });
                                  }
                                }}
                                onDrop={(e) => {
                                  if (!draggedChoice || draggedChoice.groupId !== group.id) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMoveChoice(group.id, draggedChoice.index, choiceIdx);
                                  setDraggedChoice(null);
                                  setDragOverChoice(null);
                                }}
                                onDragEnd={(e) => {
                                  e.stopPropagation();
                                  setDraggedChoice(null);
                                  setDragOverChoice(null);
                                }}
                                className={`rounded-2xl border bg-zinc-50/60 dark:bg-zinc-950/40 p-3.5 space-y-3 transition-all ${
                                  isChoiceDropTarget
                                    ? 'border-amber-500 ring-2 ring-amber-400/30'
                                    : 'border-zinc-200 dark:border-zinc-800'
                                }`}
                              >
                                {/* Row 1: Drag handle + Move + Photo Box + Option Name + Price Delta + Duplicate + Delete */}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <GripVertical className="w-4 h-4 text-zinc-400 cursor-grab active:cursor-grabbing" />
                                    <div className="flex flex-col">
                                      <button
                                        type="button"
                                        disabled={choiceIdx === 0}
                                        onClick={() => handleMoveChoice(group.id, choiceIdx, choiceIdx - 1)}
                                        className="p-0.5 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                                        title="Mover opción arriba"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={choiceIdx === group.choices.length - 1}
                                        onClick={() => handleMoveChoice(group.id, choiceIdx, choiceIdx + 1)}
                                        className="p-0.5 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                                        title="Mover opción abajo"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Photo Box with Media Gallery (primary), upload & remove */}
                                  <div className="relative w-12 h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0 group">
                                    {choice.imageUrl ? (
                                      <>
                                        <img src={choice.imageUrl} alt={choice.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/65 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setMediaPickerConfig({
                                                isOpen: true,
                                                title: `Imagen para "${choice.name || 'Opción'}"`,
                                                onSelect: (url) => handleUpdateChoice(group.id, choice.id, { imageUrl: url }),
                                              })
                                            }
                                            className="p-1 rounded-md bg-amber-500 text-zinc-950 hover:bg-amber-400"
                                            title="Cambiar desde Galería"
                                          >
                                            <FileImage className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateChoice(group.id, choice.id, { imageUrl: '' })}
                                            className="p-1 rounded-md bg-rose-600 text-white hover:bg-rose-500"
                                            title="Quitar foto"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setMediaPickerConfig({
                                              isOpen: true,
                                              title: `Seleccionar Imagen (${choice.name || 'Opción'})`,
                                              onSelect: (url) => handleUpdateChoice(group.id, choice.id, { imageUrl: url }),
                                            })
                                          }
                                          className="w-full h-full flex flex-col items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                          title="Elegir desde Galería de Medios"
                                        >
                                          <ImageIcon className="w-4 h-4" />
                                        </button>
                                        <label
                                          className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer opacity-80 hover:opacity-100"
                                          title="Subir archivo desde dispositivo"
                                        >
                                          <Upload className="w-2.5 h-2.5" />
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, (b64) => handleUpdateChoice(group.id, choice.id, { imageUrl: b64 }))}
                                          />
                                        </label>
                                      </>
                                    )}
                                  </div>

                                  {/* Option Name Input */}
                                  <input
                                    type="text"
                                    placeholder="Nombre de la opción (ej. Queso Extra)"
                                    value={choice.name}
                                    onChange={(e) => handleUpdateChoice(group.id, choice.id, { name: e.target.value })}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-zinc-900 dark:text-white"
                                  />

                                  {/* Price Input with S/ */}
                                  <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shrink-0">
                                    <span className="text-xs font-black text-zinc-500">S/</span>
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={choice.priceDelta}
                                      onChange={(e) => handleUpdateChoice(group.id, choice.id, { priceDelta: parseFloat(e.target.value) || 0 })}
                                      className="w-16 bg-transparent text-xs font-black text-amber-500 focus:outline-none"
                                    />
                                  </div>

                                  {/* Duplicate Choice Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateChoice(group.id, choice.id)}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors shrink-0"
                                    title="Duplicar opción"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>

                                  {/* Delete Choice Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChoice(group.id, choice.id)}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                                    title="Eliminar opción"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Row 2: Description + Sub-opciones toggle button */}
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="text"
                                    placeholder="Descripción breve (opcional, ej. Horneado con leña)"
                                    value={choice.description || ''}
                                    onChange={(e) => handleUpdateChoice(group.id, choice.id, { description: e.target.value })}
                                    className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-700 dark:text-zinc-300"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedChoiceSubOptions((prev) => ({
                                        ...prev,
                                        [choice.id]: !prev[choice.id],
                                      }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs ${
                                      isSubOptionsOpen
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                                    }`}
                                  >
                                    <Layers className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Sub-opciones</span>
                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                                      {(choice.nestedChoices || []).length}
                                    </span>
                                  </button>
                                </div>

                                {/* Nested Sub-options Drawer (when expanded) */}
                                {isSubOptionsOpen && (
                                  <div className="p-3.5 rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/15 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                                        Sub-opciones Avanzadas
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAddNestedChoice(group.id, choice.id)}
                                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black flex items-center gap-1 whitespace-nowrap shrink-0"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>+ Añadir</span>
                                      </button>
                                    </div>

                                    {(choice.nestedChoices || []).length === 0 ? (
                                      <p className="text-[11px] text-zinc-500 italic">
                                        Sin sub-opciones anidadas. Haz clic en "+ Añadir" para crear modificadores dentro de esta opción.
                                      </p>
                                    ) : (
                                      <div className="space-y-2">
                                        {(choice.nestedChoices || []).map((nested) => (
                                          <div
                                            key={nested.id}
                                            className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2.5 text-xs"
                                          >
                                            <div className="relative w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-400 shrink-0 group">
                                              {nested.imageUrl ? (
                                                <>
                                                  <img src={nested.imageUrl} alt={nested.name} className="w-full h-full object-cover" />
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleUpdateNestedChoice(group.id, choice.id, nested.id, { imageUrl: '' })
                                                    }
                                                    className="absolute inset-0 bg-black/65 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Quitar imagen"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setMediaPickerConfig({
                                                      isOpen: true,
                                                      title: `Imagen para "${nested.name || 'Sub-opción'}"`,
                                                      onSelect: (url) =>
                                                        handleUpdateNestedChoice(group.id, choice.id, nested.id, { imageUrl: url }),
                                                    })
                                                  }
                                                  className="w-full h-full flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                                  title="Elegir desde Galería"
                                                >
                                                  <ImageIcon className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </div>

                                            <input
                                              type="text"
                                              placeholder="Nombre"
                                              value={nested.name}
                                              onChange={(e) =>
                                                handleUpdateNestedChoice(group.id, choice.id, nested.id, {
                                                  name: e.target.value,
                                                })
                                              }
                                              className="flex-1 min-w-[120px] px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold"
                                            />

                                            <label className="flex items-center gap-1 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                                              <input
                                                type="checkbox"
                                                checked={nested.isMultiple ?? false}
                                                onChange={(e) =>
                                                  handleUpdateNestedChoice(group.id, choice.id, nested.id, {
                                                    isMultiple: e.target.checked,
                                                  })
                                                }
                                                className="w-3.5 h-3.5 rounded text-rose-600"
                                              />
                                              <span>Múltiple</span>
                                            </label>

                                            <div className="flex items-center gap-1">
                                              <span className="text-[11px] text-zinc-500">Máx Q</span>
                                              <input
                                                type="number"
                                                min={0}
                                                value={nested.maxQty ?? 1}
                                                onChange={(e) =>
                                                  handleUpdateNestedChoice(group.id, choice.id, nested.id, {
                                                    maxQty: parseInt(e.target.value) || 1,
                                                  })
                                                }
                                                className="w-12 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-center text-xs font-bold"
                                              />
                                            </div>

                                            <label className="flex items-center gap-1 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                                              <input
                                                type="checkbox"
                                                checked={nested.hidePrice ?? false}
                                                onChange={(e) =>
                                                  handleUpdateNestedChoice(group.id, choice.id, nested.id, {
                                                    hidePrice: e.target.checked,
                                                  })
                                                }
                                                className="w-3.5 h-3.5 rounded text-rose-600"
                                              />
                                              <span>Ocultar $</span>
                                            </label>

                                            <div className="flex items-center gap-1">
                                              <span className="text-[11px] font-bold text-zinc-500">S/</span>
                                              <input
                                                type="number"
                                                step="0.5"
                                                value={nested.priceDelta}
                                                onChange={(e) =>
                                                  handleUpdateNestedChoice(group.id, choice.id, nested.id, {
                                                    priceDelta: parseFloat(e.target.value) || 0,
                                                  })
                                                }
                                                className="w-14 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold text-amber-500"
                                              />
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => handleDeleteNestedChoice(group.id, choice.id, nested.id)}
                                              className="p-1 text-zinc-400 hover:text-rose-500 shrink-0"
                                              title="Eliminar sub-opción"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Row 3: Feature Chips (matching Image 2) */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  {/* Incluido */}
                                  <label
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                      choice.isIncluded || choice.isDefault
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={choice.isIncluded || choice.isDefault || false}
                                      onChange={(e) =>
                                        handleUpdateChoice(group.id, choice.id, {
                                          isIncluded: e.target.checked,
                                          isDefault: e.target.checked,
                                        })
                                      }
                                      className="hidden"
                                    />
                                    <span>Incluido</span>
                                  </label>

                                  {/* Recomendado */}
                                  <label
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                      choice.isRecommended
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={choice.isRecommended ?? false}
                                      onChange={(e) =>
                                        handleUpdateChoice(group.id, choice.id, {
                                          isRecommended: e.target.checked,
                                        })
                                      }
                                      className="hidden"
                                    />
                                    <Star className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Recomendado</span>
                                  </label>

                                  {/* Múltiple */}
                                  <label
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                      choice.isMultiple
                                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={choice.isMultiple ?? false}
                                      onChange={(e) =>
                                        handleUpdateChoice(group.id, choice.id, {
                                          isMultiple: e.target.checked,
                                        })
                                      }
                                      className="hidden"
                                    />
                                    <span>Múltiple</span>
                                  </label>

                                  {/* Ocultar $ */}
                                  <label
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                      choice.hidePrice
                                        ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-400 text-zinc-900 dark:text-white'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={choice.hidePrice ?? false}
                                      onChange={(e) =>
                                        handleUpdateChoice(group.id, choice.id, {
                                          hidePrice: e.target.checked,
                                        })
                                      }
                                      className="hidden"
                                    />
                                    <span>Ocultar $</span>
                                  </label>

                                  {/* Precios por Tienda */}
                                  <label
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                      choice.storePricesEnabled
                                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={choice.storePricesEnabled ?? false}
                                      onChange={(e) =>
                                        handleUpdateChoice(group.id, choice.id, {
                                          storePricesEnabled: e.target.checked,
                                        })
                                      }
                                      className="hidden"
                                    />
                                    <span>Precios por Tienda</span>
                                  </label>
                                </div>

                                {choice.storePricesEnabled && tenants.length > 0 && (
                                  <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/30 space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                                      Precios por Sucursal (+S/)
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {tenants.map((t) => (
                                        <div key={t.id}>
                                          <label className="text-[10px] font-bold text-zinc-500 block truncate mb-0.5">
                                            {t.name.replace('Gastro - ', '')}
                                          </label>
                                          <input
                                            type="number"
                                            step="0.5"
                                            value={
                                              typeof choice.branchPriceDeltas?.[t.id] === 'number'
                                                ? choice.branchPriceDeltas[t.id]
                                                : ''
                                            }
                                            placeholder={`Base: ${choice.priceDelta.toFixed(2)}`}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const nextDeltas = { ...(choice.branchPriceDeltas || {}) };
                                              if (val === '') {
                                                delete nextDeltas[t.id];
                                              } else {
                                                const parsed = parseFloat(val);
                                                if (!Number.isNaN(parsed)) nextDeltas[t.id] = parsed;
                                              }
                                              handleUpdateChoice(group.id, choice.id, {
                                                branchPriceDeltas: nextDeltas,
                                              });
                                            }}
                                            className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Row 4: Limits / Counters (matching Image 2) */}
                                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                                  {/* Cant. Gratis */}
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl">
                                    <Gift className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="font-bold text-zinc-600 dark:text-zinc-400">Cant. Gratis:</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={choice.freeQuantity ?? 0}
                                      onChange={(e) =>
                                        handleUpdateChoice(group.id, choice.id, {
                                          freeQuantity: parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="w-12 bg-transparent text-center font-black text-zinc-900 dark:text-white focus:outline-none"
                                    />
                                  </div>

                                  {/* Máx. Qty */}
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl">
                                    <span className="font-bold text-zinc-600 dark:text-zinc-400">⇅ Máx. Qty:</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={choice.maxQuantity ?? 0}
                                      onChange={(e) =>
                                        handleUpdateChoice(group.id, choice.id, {
                                          maxQuantity: parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="w-12 bg-transparent text-center font-black text-zinc-900 dark:text-white focus:outline-none"
                                    />
                                  </div>

                                  {/* Lím. Sub-Extras */}
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl">
                                    <span className="font-bold text-zinc-600 dark:text-zinc-400">📋 Lím. Sub-Extras:</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={choice.subExtrasLimit ?? 0}
                                      onChange={(e) =>
                                        handleUpdateChoice(group.id, choice.id, {
                                          subExtrasLimit: parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="w-12 bg-transparent text-center font-black text-zinc-900 dark:text-white focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Dashed button at bottom of group: + Añadir Opción */}
                        <button
                          type="button"
                          onClick={() => handleAddNewChoiceToGroup(group.id)}
                          className="w-full py-2.5 rounded-2xl border-2 border-dashed border-rose-500/60 hover:border-rose-600 text-rose-600 dark:text-rose-400 hover:bg-rose-500/5 text-xs font-black flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Añadir Opción</span>
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
              )}

              {/* ADICIONALES & EXTRAS CON FOTO, EDICIÓN, PRECIO CONDICIONAL E INCLUSIÓN */}
              {editorRightTab === 'extras' && (
              <div className="space-y-3 p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-zinc-500" />
                    <span>Adicionales y extras</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingExtra(!isAddingExtra)}
                    className="px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-95 active:scale-[0.97] flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingExtra ? 'Cerrar' : 'Agregar adicional'}</span>
                  </button>
                </div>

                {/* Add Extra Form */}
                {isAddingExtra && (
                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-amber-500/40 space-y-3 shadow-md">
                    <h4 className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-amber-500" /> Nuevo Adicional / Extra
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold block mb-0.5">Nombre del Extra</label>
                        <input
                          type="text"
                          placeholder="Ej: Extra Queso Fior di Latte"
                          value={newExtraName}
                          onChange={(e) => setNewExtraName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold block mb-0.5">Categoría</label>
                        <select
                          value={newExtraCategory}
                          onChange={(e) => setNewExtraCategory(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                        >
                          <option value="toppings">Toppings</option>
                          <option value="quesos">Quesos</option>
                          <option value="borde">Bordes</option>
                          <option value="salsas">Salsas</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold block mb-0.5">Precio Base (S/)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newExtraPrice}
                          onChange={(e) => setNewExtraPrice(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold text-amber-500"
                        />
                      </div>
                    </div>

                    {/* Photo for Extra */}
                    <div className="flex items-center gap-3 pt-1">
                      {newExtraImage ? (
                        <div className="relative">
                          <img src={newExtraImage} alt="Extra preview" className="w-10 h-10 rounded-xl object-cover border" />
                          <button
                            type="button"
                            onClick={() => setNewExtraImage('')}
                            className="absolute -top-1 -right-1 p-0.5 bg-rose-500 text-white rounded-full"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setMediaPickerConfig({
                            isOpen: true,
                            title: 'Foto del Nuevo Adicional',
                            onSelect: (url) => setNewExtraImage(url),
                          })
                        }
                        className="py-1.5 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-zinc-950 text-xs font-black flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                      >
                        <FileImage className="w-3.5 h-3.5" />
                        <span>Galería</span>
                      </button>

                      <label className="py-1.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold cursor-pointer">
                        <span>Subir Foto del Extra</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (b64) => setNewExtraImage(b64))}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteClipboardImage((b64) => setNewExtraImage(b64))}
                        className="py-1.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
                      >
                        Pegar Foto
                      </button>
                    </div>

                    {/* Inclusion & Conditional Price Rule */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newExtraIsIncluded}
                          onChange={(e) => setNewExtraIsIncluded(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <span>Está Incluido en el Producto (Gratis por defecto)</span>
                      </label>

                      <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newExtraHasCond}
                          onChange={(e) => setNewExtraHasCond(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <span>Activar Regla Condicional de Precio por Cantidad</span>
                      </label>
                    </div>

                    {newExtraHasCond && (
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold block mb-0.5">Desde qué cantidad:</label>
                          <input
                            type="number"
                            value={newExtraMinQty}
                            onChange={(e) => setNewExtraMinQty(parseInt(e.target.value) || 2)}
                            className="w-full px-2 py-1 rounded-lg border text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold block mb-0.5">Precio reducido por unidad (S/):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newExtraCondPrice}
                            onChange={(e) => setNewExtraCondPrice(parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded-lg border text-xs font-bold text-emerald-500"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddExtraModifier}
                      className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black shadow-xs"
                    >
                      Confirmar y Guardar Adicional
                    </button>
                  </div>
                )}

                {/* List of Extras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {tempProduct.allowedExtras.map((extra) => {
                    const isEditingThisExtra = editingExtraId === extra.id;
                    return (
                      <div
                        key={extra.id}
                        className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-xs"
                      >
                        {isEditingThisExtra ? (
                          /* Inline Edit Extra */
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="text-[10px] font-bold block mb-0.5">Nombre</label>
                                <input
                                  type="text"
                                  value={editExtraName}
                                  onChange={e => setEditExtraName(e.target.value)}
                                  className="w-full px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold block mb-0.5">Precio (S/)</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={editExtraPrice}
                                  onChange={e => setEditExtraPrice(parseFloat(e.target.value) || 0)}
                                  className="w-full px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-amber-500"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {editExtraImage ? (
                                <img src={editExtraImage} alt="Extra preview" className="w-8 h-8 rounded-lg object-cover border" />
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  setMediaPickerConfig({
                                    isOpen: true,
                                    title: 'Cambiar Foto del Adicional',
                                    onSelect: (url) => setEditExtraImage(url),
                                  })
                                }
                                className="text-[11px] font-bold px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-zinc-950 flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                              >
                                <FileImage className="w-3 h-3" />
                                <span>Galería</span>
                              </button>
                              <label className="text-[11px] font-bold px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer">
                                <span>Subir Foto</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, (b64) => setEditExtraImage(b64))}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handlePasteClipboardImage((b64) => setEditExtraImage(b64))}
                                className="text-[11px] font-bold px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700"
                              >
                                Pegar Foto
                              </button>
                              {editExtraImage && (
                                <button
                                  type="button"
                                  onClick={() => setEditExtraImage('')}
                                  className="text-[11px] font-bold px-2 py-1 rounded-lg text-rose-500"
                                >
                                  Quitar Foto
                                </button>
                              )}
                            </div>

                            <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editExtraIncluded}
                                onChange={e => setEditExtraIncluded(e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-amber-500"
                              />
                              <span>Incluido por defecto</span>
                            </label>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleSaveEditExtra}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingExtraId(null)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal Extra View */
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {extra.imageUrl ? (
                                <img src={extra.imageUrl} alt={extra.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                                    {extra.name}
                                  </span>
                                  {extra.isIncluded && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase">
                                      Incluido
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-amber-500 font-bold block">
                                  +S/ {extra.price.toFixed(2)}
                                  {extra.conditionalRule && (
                                    <span className="text-zinc-400 text-[10px] ml-1">
                                      (Desde {extra.conditionalRule.minQty}u: S/ {extra.conditionalRule.discountedPrice.toFixed(2)})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleExtraIncluded(extra.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-colors ${
                                  extra.isIncluded
                                    ? 'bg-emerald-500 text-white border-emerald-600'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                {extra.isIncluded ? '✓ Incluido' : 'Incluir'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleExtra(extra.id)}
                                className={`p-1.5 rounded-xl border ${
                                  extra.enabled
                                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                {extra.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditExtra(extra)}
                                className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                title="Editar adicional"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExtra(extra.id)}
                                className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="Eliminar adicional"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
                </>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {!isCreatingProduct && (
              <button
                type="button"
                onClick={() => handleDeleteProduct(tempProduct.id, tempProduct.name)}
                className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium flex items-center gap-1.5 transition-colors active:scale-[0.97]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar producto</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <button
                type="button"
                onClick={handleRequestCloseEditor}
                className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors active:scale-[0.97]"
              >
                Cancelar
              </button>
              {isCreatingProduct && (
                <button
                  type="button"
                  onClick={() => commitSaveProduct(true)}
                  className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 text-xs font-medium transition-colors active:scale-[0.97]"
                >
                  Guardar y crear otro
                </button>
              )}
              <button
                type="submit"
                className="whitespace-nowrap shrink-0 px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-opacity hover:opacity-95 active:scale-[0.97]"
                style={{ backgroundColor: customization.primaryColor }}
              >
                {isCreatingProduct ? 'Crear producto' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Category Creation & Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-zinc-900 dark:text-zinc-100">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-zinc-950 dark:text-white">
                    {editingCategoryId ? 'Editar Categoría' : 'Gestionar Categorías'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {editingCategoryId
                      ? 'Actualiza el nombre, icono e imagen de la categoría.'
                      : 'Crea, edita o elimina categorías. Asigna icono y foto para la tienda.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  handleCancelEditCategory();
                }}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Form */}
              <form onSubmit={handleSaveCategory} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {editingCategoryId ? '✏️ Modificar Categoría' : '✨ Nueva Categoría'}
                  </span>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={handleCancelEditCategory}
                      className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                {/* 1. Nombre */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    value={catFormName}
                    onChange={(e) => setCatFormName(e.target.value)}
                    placeholder="Ej: Pastas, Calzones, Postres, etc."
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 2. Icono de la Categoría (SVG con color/fondo o PNG/Imagen) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Icono de la Categoría (SVG o PNG / Imagen)
                    </label>
                    {(catFormIconSvg || catFormIconImageUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCatFormIconSvg('');
                          setCatFormIconImageUrl('');
                        }}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-600 whitespace-nowrap"
                      >
                        Quitar icono
                      </button>
                    )}
                  </div>

                  {/* Mode Switcher: SVG vs PNG/Imagen */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setCatFormIconType('svg')}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        catFormIconType === 'svg'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      Icono SVG + Colores
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatFormIconType('image')}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        catFormIconType === 'image'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      Icono PNG / Imagen
                    </button>
                  </div>

                  {/* Live Preview + Upload Controls */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <CategoryIconBadge
                      category={{
                        iconType:
                          catFormIconType === 'svg' && catFormIconSvg
                            ? 'svg'
                            : catFormIconType === 'image' && catFormIconImageUrl
                            ? 'image'
                            : undefined,
                        iconSvg: catFormIconSvg,
                        iconImageUrl: catFormIconImageUrl,
                        iconColor: catFormIconColor,
                        iconBgColor: catFormIconBgColor,
                        icon: catFormIcon,
                      }}
                      alt={catFormName || 'Vista previa'}
                      size="lg"
                      className="border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs"
                    />

                    <div className="flex-1 min-w-0 space-y-2">
                      {catFormIconType === 'svg' ? (
                        <>
                          <label className="w-full py-2 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{catFormIconSvg ? 'Cambiar archivo .SVG' : 'Subir icono .SVG'}</span>
                            <input
                              type="file"
                              accept=".svg,image/svg+xml"
                              className="hidden"
                              onChange={handleCategorySvgUpload}
                            />
                          </label>
                          <input
                            type="text"
                            value={catFormIconSvg}
                            onChange={(e) => setCatFormIconSvg(e.target.value)}
                            placeholder="O pega código <svg>...</svg> aquí"
                            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-amber-500"
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <label className="flex-1 py-2 px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Subir PNG / Img</span>
                              <input
                                type="file"
                                accept="image/png,image/webp,image/jpeg,image/svg+xml"
                                className="hidden"
                                onChange={handleCategoryPngIconUpload}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                handlePasteClipboardImage((b64) => {
                                  setCatFormIconType('image');
                                  setCatFormIconImageUrl(b64);
                                })
                              }
                              className="py-2 px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Clipboard className="w-3.5 h-3.5" />
                              <span>Pegar</span>
                            </button>
                          </div>
                          <input
                            type="url"
                            value={catFormIconImageUrl}
                            onChange={(e) => setCatFormIconImageUrl(e.target.value)}
                            placeholder="https://... (URL de icono PNG o imagen)"
                            className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-amber-500"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Color Pickers: Icon Color (for SVG) + Background Color (for SVG & PNG) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {catFormIconType === 'svg' && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                            Color del icono
                          </span>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="color"
                              value={catFormIconColor}
                              onChange={(e) => setCatFormIconColor(e.target.value)}
                              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              {catFormIconColor}
                            </span>
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {CATEGORY_ICON_COLOR_PRESETS.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setCatFormIconColor(hex)}
                              style={{ backgroundColor: hex }}
                              title={hex}
                              className={`w-5 h-5 rounded-full border transition-transform ${
                                catFormIconColor.toLowerCase() === hex.toLowerCase()
                                  ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-zinc-900 scale-110'
                                  : 'border-zinc-300 dark:border-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 ${
                        catFormIconType === 'image' ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                          Color de fondo
                        </span>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="color"
                            value={catFormIconBgColor === 'transparent' ? '#f97316' : catFormIconBgColor}
                            onChange={(e) => setCatFormIconBgColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                          />
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">
                            {catFormIconBgColor === 'transparent' ? 'Sin fondo' : catFormIconBgColor}
                          </span>
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_BG_COLOR_PRESETS.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setCatFormIconBgColor(hex)}
                            style={
                              hex === 'transparent'
                                ? {
                                    backgroundImage:
                                      'linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)',
                                    backgroundSize: '8px 8px',
                                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
                                  }
                                : { backgroundColor: hex }
                            }
                            title={hex === 'transparent' ? 'Sin fondo (transparente)' : hex}
                            className={`w-5 h-5 rounded-full border transition-transform ${
                              catFormIconBgColor.toLowerCase() === hex.toLowerCase()
                                ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-zinc-900 scale-110'
                                : 'border-zinc-300 dark:border-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Imagen de la Categoría (para estilo banners/imágenes en tienda) */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Imagen de la Categoría (para vista con fotos / banners en tienda)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={catFormImageUrl}
                      onChange={(e) => setCatFormImageUrl(e.target.value)}
                      placeholder="https://... (URL de la imagen)"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex-1 py-1.5 px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (b64) => setCatFormImageUrl(b64))}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteClipboardImage((b64) => setCatFormImageUrl(b64))}
                        className="flex-1 py-1.5 px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Pegar Foto</span>
                      </button>
                    </div>

                    {/* Image Preview */}
                    {catFormImageUrl && (
                      <div className="relative mt-2 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950">
                        <img
                          src={catFormImageUrl}
                          alt="Vista previa categoría"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setCatFormImageUrl('')}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 hover:bg-black text-white text-xs transition-colors"
                          title="Quitar foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={handleCancelEditCategory}
                      className="whitespace-nowrap shrink-0 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-xs transition-colors"
                  >
                    {editingCategoryId ? 'Guardar Cambios' : 'Crear Categoría'}
                  </button>
                </div>
              </form>

              {/* Existing Categories List */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2.5">
                  Categorías Registradas ({categories.length})
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {categories.map((c) => {
                    const prodCount = products.filter((p) => p.category === c.id).length;
                    const isBeingEdited = editingCategoryId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                          isBeingEdited
                            ? 'bg-amber-500/10 border-amber-500/50'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {c.iconType === 'svg' || c.iconType === 'image' ? (
                            <CategoryIconBadge
                              category={c}
                              alt={c.name}
                              size="md"
                              className="border border-zinc-200 dark:border-zinc-800"
                            />
                          ) : c.imageUrl ? (
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900">
                              <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <CategoryIconBadge
                              category={c}
                              alt={c.name}
                              size="md"
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                            />
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-zinc-900 dark:text-white capitalize truncate">
                                {c.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono block">
                              {prodCount} {prodCount === 1 ? 'producto' : 'productos'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(c)}
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-amber-100 dark:bg-zinc-800 dark:hover:bg-amber-950/40 text-zinc-600 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                            title="Editar categoría"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id, c.name)}
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-100 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Eliminar categoría"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  handleCancelEditCategory();
                }}
                className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REUSABLE MEDIA GALLERY PICKER MODAL */}
      <MediaGalleryModal
        isOpen={mediaPickerConfig.isOpen}
        title={mediaPickerConfig.title}
        onClose={() => setMediaPickerConfig((prev) => ({ ...prev, isOpen: false }))}
        onSelect={(selectedUrl) => {
          mediaPickerConfig.onSelect(selectedUrl);
          setMediaPickerConfig((prev) => ({ ...prev, isOpen: false }));
        }}
      />

      {/* PRE-CREATION PRODUCT TYPE PICKER MODAL */}
      {isTypePickerOpen && (
        <ProductTypePickerModal
          isOpen={isTypePickerOpen}
          onClose={() => setIsTypePickerOpen(false)}
          onSelectType={handleCreateWithType}
          templates={optionTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            sizesCount: t.sizes.length,
            subOptionsCount: t.subOptions.length,
            extrasCount: t.allowedExtras.length,
          }))}
          primaryColor={customization.primaryColor}
        />
      )}

      {/* PER-PRODUCT BRANCH PRICING & AVAILABILITY DRAWER */}
      {branchDrawerProductId && (
        <BranchPricingDrawer
          key={branchDrawerProductId}
          product={
            products.find((p) => p.id === branchDrawerProductId) ||
            (tempProduct && tempProduct.id === branchDrawerProductId ? tempProduct : null)
          }
          tenants={tenants}
          primaryColor={customization.primaryColor}
          onClose={() => setBranchDrawerProductId(null)}
          onSave={handleSaveBranchPricesFromDrawer}
        />
      )}

      {/* 100% REAL INTERACTIVE PRODUCT LIVE PREVIEW MODAL */}
      {previewProduct && (
        <ProductLivePreviewModal
          product={previewProduct}
          tenants={tenants}
          defaultTenantId={activeTenant?.id}
          primaryColor={customization.primaryColor}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  );
};
