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
  ChefHat,
  Search,
  FolderPlus,
  Tag,
  DollarSign,
  AlertCircle,
  Upload,
  Clipboard,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  BookmarkPlus,
  Copy,
  RotateCcw,
  GripVertical,
  Star,
  Gift,
  ListOrdered,
  LayoutGrid,
  SlidersHorizontal,
  FileImage,
} from 'lucide-react';
import { MediaGalleryModal } from '../media/MediaGalleryModal';
import { compressImageFile } from '../../utils/imageCompressor';

export interface ProductOptionTemplate {
  id: string;
  name: string;
  description?: string;
  category?: ProductCategory | 'general';
  sizes: ProductSizeConfig[];
  subOptions: SubOptionGroup[];
  allowedExtras: ExtraModifier[];
}

const DEFAULT_OPTION_TEMPLATES: ProductOptionTemplate[] = [
  {
    id: 'tpl-opt-pizzas-clasicas',
    name: 'Pizzas Artesanales Clásicas',
    description: '4 tamaños estándar con tajadas, masa fina/gruesa, salsas y adicionales clásicos.',
    category: 'pizzas',
    sizes: [
      { id: 'sz-personal', name: '04 Tajadas de Pizza', label: '4 Cortes • Personal', slices: 4, price: 19.9, enabled: true },
      { id: 'sz-mediana', name: '06 Tajadas de Pizza', label: '6 Cortes • Mediana', slices: 6, price: 32.9, enabled: true },
      { id: 'sz-familiar', name: '08 Tajadas de Pizza', label: '8 Cortes • Familiar', slices: 8, price: 46.9, enabled: true, isDefault: true },
      { id: 'sz-extra', name: '12 Tajadas de Pizza', label: '12 Cortes • Extra Familiar', slices: 12, price: 59.9, enabled: true },
    ],
    subOptions: [
      {
        id: 'sub-masa',
        name: 'Tipo de Masa',
        required: true,
        enabled: true,
        choices: [
          { id: 'm-fina', name: 'Masa Fina Artesanal', priceDelta: 0, isDefault: true, isIncluded: true },
          { id: 'm-tradicional', name: 'Masa Gruesa Tradicional', priceDelta: 0, isIncluded: true },
          { id: 'm-queso', name: 'Borde Relleno de Mozzarella', priceDelta: 8.0 },
        ],
      },
      {
        id: 'sub-salsa',
        name: 'Salsa Base',
        required: true,
        enabled: true,
        choices: [
          { id: 's-tomate', name: 'Salsa de Tomate Italiana', priceDelta: 0, isDefault: true, isIncluded: true },
          { id: 's-bbq', name: 'Salsa BBQ Dulce', priceDelta: 0, isIncluded: true },
          { id: 's-blanca', name: 'Salsa Blanca Alfredo', priceDelta: 2.0 },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-queso', name: 'Extra Queso Mozzarella', price: 5.0, category: 'quesos', enabled: true },
      { id: 'ext-pepp', name: 'Pepperoni Americano Extra', price: 5.5, category: 'toppings', enabled: true },
      { id: 'ext-jamon', name: 'Jamón Inglés Extra', price: 4.5, category: 'toppings', enabled: true },
      { id: 'ext-champ', name: 'Champiñones Frescos', price: 4.0, category: 'toppings', enabled: true },
      { id: 'ext-tocino', name: 'Tocino Ahumado Crispy', price: 5.0, category: 'toppings', enabled: true },
      { id: 'ext-aceit', name: 'Aceitunas Negras', price: 3.5, category: 'toppings', enabled: true },
    ],
  },
  {
    id: 'tpl-opt-pizzas-gourmet',
    name: 'Pizzas Especiales / Gourmet',
    description: '4 tamaños gourmet con tajadas, quesos madurados y toppings premium.',
    category: 'pizzas',
    sizes: [
      { id: 'sz-g-pers', name: '04 Tajadas de Pizza', label: '4 Cortes • Personal Gourmet', slices: 4, price: 24.9, enabled: true },
      { id: 'sz-g-med', name: '06 Tajadas de Pizza', label: '6 Cortes • Mediana Gourmet', slices: 6, price: 39.9, enabled: true },
      { id: 'sz-g-fam', name: '08 Tajadas de Pizza', label: '8 Cortes • Familiar Gourmet', slices: 8, price: 54.9, enabled: true, isDefault: true },
      { id: 'sz-g-ext', name: '12 Tajadas de Pizza', label: '12 Cortes • Gigante Gourmet', slices: 12, price: 69.9, enabled: true },
    ],
    subOptions: [
      {
        id: 'sub-masa-g',
        name: 'Tipo de Masa',
        required: true,
        enabled: true,
        choices: [
          { id: 'mg-fina', name: 'Masa Madre 48h', priceDelta: 0, isDefault: true, isIncluded: true },
          { id: 'mg-borde', name: 'Borde Parmesano & Orégano', priceDelta: 6.0 },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-parm', name: 'Parmesano Reggiano', price: 6.0, category: 'quesos', enabled: true },
      { id: 'ext-prosc', name: 'Prosciutto Di Parma', price: 8.0, category: 'toppings', enabled: true },
      { id: 'ext-honey', name: 'Hot Honey Picante', price: 4.5, category: 'salsas', enabled: true },
    ],
  },
  {
    id: 'tpl-opt-entradas',
    name: 'Entradas & Alitas',
    description: 'Porciones de 6 y 12 piezas con selección de salsas y complementos.',
    category: 'entradas',
    sizes: [
      { id: 'sz-ent-6', name: 'Porción 6 Piezas', label: '6 Piezas', slices: 6, price: 18.9, enabled: true, isDefault: true },
      { id: 'sz-ent-12', name: 'Porción 12 Piezas', label: '12 Piezas', slices: 12, price: 32.9, enabled: true },
    ],
    subOptions: [
      {
        id: 'sub-salsas-alitas',
        name: 'Salsa para Bañar / Acompañar',
        required: true,
        enabled: true,
        choices: [
          { id: 'sa-bbq', name: 'BBQ Ahumada', priceDelta: 0, isDefault: true, isIncluded: true },
          { id: 'sa-bufalo', name: 'Búfalo Picante', priceDelta: 0, isIncluded: true },
          { id: 'sa-honey', name: 'Miel Mostaza', priceDelta: 0, isIncluded: true },
          { id: 'sa-tartara', name: 'Tártara de la Casa', priceDelta: 0, isIncluded: true },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-papas', name: 'Porción de Papas Fritas', price: 8.0, category: 'toppings', enabled: true },
      { id: 'ext-apio', name: 'Bastones de Apio & Zanahoria', price: 3.5, category: 'toppings', enabled: true },
    ],
  },
  {
    id: 'tpl-opt-bebidas',
    name: 'Bebidas & Refrescos',
    description: 'Formatos personal y familiar con opciones de temperatura y hielo.',
    category: 'bebidas',
    sizes: [
      { id: 'sz-beb-500', name: 'Personal 500ml', label: '500 ml', slices: 1, price: 5.5, enabled: true, isDefault: true },
      { id: 'sz-beb-15', name: 'Familiar 1.5L', label: '1.5 Litros', slices: 1, price: 10.5, enabled: true },
      { id: 'sz-beb-3', name: 'Familiar 3L', label: '3 Litros', slices: 1, price: 15.0, enabled: true },
    ],
    subOptions: [
      {
        id: 'sub-temp',
        name: 'Temperatura',
        required: true,
        enabled: true,
        choices: [
          { id: 't-helada', name: 'Helada', priceDelta: 0, isDefault: true, isIncluded: true },
          { id: 't-tiempo', name: 'Al Tiempo', priceDelta: 0, isIncluded: true },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-hielo', name: 'Vaso con Hielo Extra', price: 1.0, category: 'toppings', enabled: true },
    ],
  },
];

const DEFAULT_CATEGORIES: ProductCategoryItem[] = [
  { id: 'pizzas', name: 'Pizzas', icon: '🍕', imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80' },
  { id: 'combos', name: 'Combos', icon: '🔥', imageUrl: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=400&q=80' },
  { id: 'entradas', name: 'Entradas', icon: '🥖', imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=400&q=80' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80' },
  { id: 'postres', name: 'Postres', icon: '🍰', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=400&q=80' },
];

const QUICK_CATEGORY_ICONS = ['🍕', '🔥', '🥖', '🥤', '🍰', '🍝', '🥗', '🥩', '🍷', '🍔', '🍟', '☕', '✨', '🏷️'];

export const ProductCatalogView: React.FC = () => {
  const { products, createProduct, updateProduct, deleteProduct, toggleProductAvailability } =
    useOrderCatalog();
  const { dispatchToast, openNoticeModal } = useSettings();

  // Dynamic Categories state
  const [categories, setCategories] = useState<ProductCategoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('kh_product_categories_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
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
  });

  const [activeTab, setActiveTab] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Category management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormIcon, setCatFormIcon] = useState('🍕');
  const [catFormImageUrl, setCatFormImageUrl] = useState('');

  // Filter products by tab and search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeTab === 'todos' || p.category === activeTab;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.badge && p.badge.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryName = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    if (found) return found.name;
    return catId ? catId.charAt(0).toUpperCase() + catId.slice(1) : 'General';
  };

  // Edit / Create product modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);

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
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return DEFAULT_OPTION_TEMPLATES;
  });
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

    if (editingCategoryId) {
      const updated = categories.map((c) => {
        if (c.id === editingCategoryId) {
          return {
            ...c,
            name: cleanName,
            icon: catFormIcon.trim() || '🏷️',
            imageUrl: catFormImageUrl.trim() || undefined,
          };
        }
        return c;
      });
      setCategories(updated);
      try {
        localStorage.setItem('kh_product_categories_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setEditingCategoryId(null);
      setCatFormName('');
      setCatFormIcon('🍕');
      setCatFormImageUrl('');
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
        icon: catFormIcon.trim() || '🏷️',
        imageUrl: catFormImageUrl.trim() || undefined,
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      try {
        localStorage.setItem('kh_product_categories_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setCatFormName('');
      setCatFormIcon('🍕');
      setCatFormImageUrl('');
      setActiveTab(finalId);
      dispatchToast('Categoría Creada', `Categoría "${cleanName}" guardada exitosamente.`, 'success');
    }
  };

  const handleStartEditCategory = (cat: ProductCategoryItem) => {
    setEditingCategoryId(cat.id);
    setCatFormName(cat.name);
    setCatFormIcon(cat.icon || '🏷️');
    setCatFormImageUrl(cat.imageUrl || '');
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setCatFormName('');
    setCatFormIcon('🍕');
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

  const handleOpenCreate = () => {
    const templatePizza = products.find((p) => p.category === 'pizzas');
    const initialCategory = activeTab !== 'todos' ? activeTab : categories[0]?.id || 'pizzas';
    const isPizzaType = initialCategory === 'pizzas';

    const blank: Product = {
      id: `prod-${Date.now()}`,
      name: '',
      description: '',
      category: initialCategory,
      productType: 'standard',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=80',
      badge: 'Nuevo',
      isAvailable: true,
      hasSizes: isPizzaType,
      basePrice: 24.9,
      sizes: isPizzaType
        ? [
            { id: 'sz-p-4', name: '04 Tajadas de Pizza', label: '4 Cortes • Personal', slices: 4, price: 19.9, enabled: true },
            { id: 'sz-p-6', name: '06 Tajadas de Pizza', label: '6 Cortes • Mediana', slices: 6, price: 34.9, enabled: true },
            { id: 'sz-p-8', name: '08 Tajadas de Pizza', label: '8 Cortes • Familiar', slices: 8, price: 49.9, enabled: true, isDefault: true },
            { id: 'sz-p-12', name: '12 Tajadas de Pizza', label: '12 Cortes • Gigante', slices: 12, price: 62.9, enabled: true },
          ]
        : [],
      subOptions: templatePizza ? JSON.parse(JSON.stringify(templatePizza.subOptions)) : [],
      allowedExtras: templatePizza ? JSON.parse(JSON.stringify(templatePizza.allowedExtras)) : [],
    };
    setTempProduct(blank);
    setIsCreatingProduct(true);
    setIsAddingSize(false);
    setIsAddingExtra(false);
    setEditingSizeId(null);
    setEditingExtraId(null);
    setExpandedChoiceSubOptions({});
    setIsEditingTemplate(false);
    setIsSavingTemplateName(false);
    setIsEditModalOpen(true);
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
    setIsCreatingProduct(false);
    setIsAddingSize(false);
    setIsAddingExtra(false);
    setEditingSizeId(null);
    setEditingExtraId(null);
    setExpandedChoiceSubOptions({});
    setIsEditingTemplate(false);
    setIsSavingTemplateName(false);
    setIsEditModalOpen(true);
  };

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

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProduct || !tempProduct.name.trim()) {
      dispatchToast('Nombre Requerido', 'Ingresa un nombre válido para el producto.', 'warning');
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
    setIsEditModalOpen(false);
  };

  // Helper for reading uploaded file with automatic client compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, onResult: (b64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      dispatchToast('Comprimiendo', 'Optimizando foto...', 'info');
      const compressed = await compressImageFile(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.82 });
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
          const compressed = await compressImageFile(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.82 });
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
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 text-zinc-900 dark:text-zinc-100">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-amber-500" />
            <span>Productos</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Administra tu catálogo oficial de productos, categorías, recetas, tamaños, precios y modificadores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Manage / Create Category Button */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>+ Categoría</span>
          </button>

          {/* New Product Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('todos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'todos'
              ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <span>Todos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
            {products.length}
          </span>
        </button>

        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat.id).length;
          const isSelected = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>{cat.icon || '🏷️'}</span>
              <span>{cat.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Product List Table (Desktop & Tablet >= md) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-3.5 px-4">Producto</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Tamaños & Precios</th>
                <th className="py-3.5 px-4">Modificadores</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
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
                      <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                        No se encontraron productos
                      </p>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        {searchQuery
                          ? `No hay coincidencias para la búsqueda "${searchQuery}".`
                          : 'No hay productos registrados en esta categoría.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear Primer Producto</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr
                    key={prod.id}
                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                      !prod.isAvailable ? 'opacity-65' : ''
                    }`}
                  >
                    {/* 1. Producto */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-xs">
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-zinc-900 dark:text-white truncate">
                              {prod.name}
                            </span>
                            {prod.productType === 'half_and_half' && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-zinc-950 text-amber-400 border border-amber-400/50 shadow-xs">
                                Mitad y Mitad
                              </span>
                            )}
                            {prod.badge && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-zinc-950 shadow-xs">
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
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {getCategoryName(prod.category)}
                      </span>
                    </td>

                    {/* 3. Tamaños & Precios */}
                    <td className="py-3.5 px-4">
                      {prod.hasSizes && prod.sizes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {prod.sizes.map((s) => (
                            <span
                              key={s.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border font-medium ${
                                s.enabled
                                  ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
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
                                S/ {s.price.toFixed(2)}
                              </strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          S/ {(prod.basePrice || 0).toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* 4. Modificadores */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Sliders className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>
                            {(prod.subOptions || []).filter((o) => o.enabled !== false).length} grupos ({
                              (prod.subOptions || []).reduce((acc, g) => acc + (g.choices?.length || 0), 0)
                            } opc.)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{(prod.allowedExtras || []).filter((e) => e.enabled !== false).length} extras</span>
                        </div>
                      </div>
                    </td>

                    {/* 5. Estado */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleProductAvailability(prod.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
                          prod.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span>{prod.isAvailable ? 'En Venta' : 'Pausado'}</span>
                      </button>
                    </td>

                    {/* 6. Acciones */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                          title="Editar producto, tamaños y modificadores"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProductAvailability(prod.id)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
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
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-700 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                          S/ {s.price.toFixed(2)}
                        </strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Precio base: S/ {(prod.basePrice || 0).toFixed(2)}
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
                    onClick={() => handleOpenEdit(prod)}
                    className="whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleProductAvailability(prod.id)}
                    className="whitespace-nowrap shrink-0 p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
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
                    className="whitespace-nowrap shrink-0 p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-700 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 transition-colors"
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

      {/* Expanded Modal (90-95vh) for Full Configuration */}
      {isEditModalOpen && tempProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-6xl w-[96vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 h-[92vh] max-h-[95vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-zinc-950 dark:text-white">
                    {isCreatingProduct ? 'Crear Nuevo Producto' : `Configurar: ${tempProduct.name}`}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sube fotos, pega imágenes desde el portapapeles y define opciones condicionales.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Fixed Bottom Footer */}
            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Product Basic Info + Live Image Preview + Upload & Paste */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                {/* Live Preview Box */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block">
                    Previsualización en Vivo
                  </span>
                  <div className="relative h-44 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    {tempProduct.imageUrl ? (
                      <>
                        <img
                          src={tempProduct.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setTempProduct({ ...tempProduct, imageUrl: '' })}
                          className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 hover:bg-rose-600 text-white transition-colors"
                          title="Quitar foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-600" />
                    )}
                    {tempProduct.badge && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-black uppercase">
                        {tempProduct.badge}
                      </span>
                    )}
                  </div>
                  {/* Upload & Paste & Gallery Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setMediaPickerConfig({
                          isOpen: true,
                          title: 'Seleccionar Foto del Producto',
                          onSelect: (url) => setTempProduct({ ...tempProduct, imageUrl: url }),
                        })
                      }
                      className="py-1.5 px-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-zinc-950 text-[11px] font-black flex items-center justify-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      <span>Galería</span>
                    </button>

                    <label className="py-1.5 px-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, (b64) => setTempProduct({ ...tempProduct, imageUrl: b64 }))}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handlePasteClipboardImage((b64) => setTempProduct({ ...tempProduct, imageUrl: b64 }))}
                      className="py-1.5 px-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center gap-1 transition-colors shadow-xs"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Pegar</span>
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      required
                      value={tempProduct.name}
                      onChange={(e) => setTempProduct({ ...tempProduct, name: e.target.value })}
                      placeholder="Ej: Carnívora Khalessi Supreme"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Precio Base / Venta (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={tempProduct.basePrice ?? 0}
                      onChange={(e) =>
                        setTempProduct({ ...tempProduct, basePrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-amber-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center pt-2 sm:pt-6">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={tempProduct.hasSizes}
                        onChange={(e) =>
                          setTempProduct({ ...tempProduct, hasSizes: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span>Manejar múltiples tamaños (4, 6, 8, 12 cortes)</span>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Categoría del Producto *
                    </label>
                    <select
                      value={tempProduct.category}
                      onChange={(e) => setTempProduct({ ...tempProduct, category: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-zinc-900 dark:text-white capitalize"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Tipo de Producto
                    </label>
                    <select
                      value={tempProduct.productType || 'standard'}
                      onChange={(e) =>
                        setTempProduct({
                          ...tempProduct,
                          productType: e.target.value as ProductType,
                          hasSizes: e.target.value === 'half_and_half' ? true : tempProduct.hasSizes,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-zinc-900 dark:text-white"
                    >
                      <option value="standard">Producto Estándar</option>
                      <option value="half_and_half">Pizza Mitad y Mitad (2 Sabores)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Badge / Etiqueta Visual (Opcional)
                    </label>
                    <input
                      type="text"
                      value={tempProduct.badge || ''}
                      placeholder="Ej: Más Pedida, Nuevo, Favorita"
                      onChange={(e) => setTempProduct({ ...tempProduct, badge: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Descripción del Producto
                    </label>
                    <textarea
                      rows={2}
                      value={tempProduct.description}
                      onChange={(e) => setTempProduct({ ...tempProduct, description: e.target.value })}
                      placeholder="Ingredientes, horneado y características artesanales..."
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* PLANTILLAS DE OPCIONES (TAMAÑOS, SUB-OPCIONES Y ADICIONALES) */}
              <div className="p-4 bg-amber-500/10 dark:bg-amber-500/5 rounded-2xl border-2 border-amber-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
                        Plantilla de Opciones (Tamaños, Sub-Opciones y Adicionales)
                      </h4>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Carga una plantilla prediseñada para configurar tu producto en un clic o guarda tus cambios como nueva plantilla reutilizable.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSavingTemplateName(v => !v)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Guardar como Plantilla</span>
                  </button>
                </div>

                {/* Save Current as New Template Input Dialog */}
                {isSavingTemplateName && (
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-amber-500/40 flex flex-wrap items-center gap-2 shadow-sm">
                    <input
                      type="text"
                      placeholder="Nombre de la nueva plantilla (ej: Pizzas Gourmet 2026)"
                      value={templateCustomName}
                      onChange={e => setTemplateCustomName(e.target.value)}
                      className="flex-1 min-w-[220px] px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsTemplate}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar Guardado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSavingTemplateName(false);
                        setTemplateCustomName('');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Template Selector & Quick Load / Edit / Delete */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <select
                      value={selectedTemplateId}
                      onChange={e => {
                        setSelectedTemplateId(e.target.value);
                        setIsEditingTemplate(false);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
                    >
                      <option value="">-- Seleccionar Plantilla Guardada ({optionTemplates.length}) --</option>
                      {optionTemplates.map(tpl => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.sizes.length} tamaños, {tpl.subOptions.length} grupos, {tpl.allowedExtras.length} extras)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={!selectedTemplateId}
                    onClick={() => handleApplyTemplate(selectedTemplateId)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Cargar Plantilla</span>
                  </button>

                  {selectedTemplateId && (
                    <button
                      type="button"
                      onClick={() => handleStartEditTemplate(selectedTemplateId)}
                      className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-bold transition-colors shrink-0"
                      title="Editar nombre o contenido de esta plantilla"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {selectedTemplateId && !DEFAULT_OPTION_TEMPLATES.some(d => d.id === selectedTemplateId) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(selectedTemplateId)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors shrink-0"
                      title="Eliminar esta plantilla personalizada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Edit Template Inline Dialog */}
                {isEditingTemplate && selectedTemplateId && (
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-amber-500/40 flex flex-wrap items-center gap-2 shadow-sm">
                    <span className="text-xs font-bold text-zinc-500">Renombrar Plantilla:</span>
                    <input
                      type="text"
                      value={editTemplateName}
                      onChange={e => setEditTemplateName(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSaveEditTemplate}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0 shadow-xs"
                    >
                      Guardar Nombre
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingTemplate(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* TAMAÑOS CON FOTO Y CRUD */}
              {tempProduct.hasSizes && (
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Pizza className="w-4 h-4" /> Tamaños con Foto & Precios
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingSize(!isAddingSize)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-zinc-950 text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingSize ? 'Cerrar' : '+ Agregar Tamaño con Foto'}</span>
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

              {/* SUBOPCIONES (DISEÑO IDÉNTICO A LA IMAGEN 2) */}
              <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                    <span>Sub-Opciones de Configuración (Masa, Salsas, Toppings)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddNewGroup}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Nuevo Grupo de Opciones</span>
                  </button>
                </div>

                {tempProduct.subOptions.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <Sliders className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      No hay grupos de opciones todavía.
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Haz clic en "+ Agregar Nuevo Grupo de Opciones" para configurar masa, salsa, toppings o extras anidados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {tempProduct.subOptions.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4 shadow-sm"
                      >
                        {/* Group Header: Red Icon + Group Name Input + Delete Group */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                            <LayoutGrid className="w-5 h-5" />
                          </div>
                          <input
                            type="text"
                            placeholder="Nombre del Grupo (ej. Elige tus Toppings)"
                            value={group.name}
                            onChange={(e) => handleUpdateGroup(group.id, { name: e.target.value })}
                            className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-black text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
                          />
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
                          {group.choices.map((choice) => {
                            const isSubOptionsOpen = !!expandedChoiceSubOptions[choice.id];
                            return (
                              <div
                                key={choice.id}
                                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-3.5 space-y-3"
                              >
                                {/* Row 1: Drag handle + Photo Box + Option Name + Price Delta + Delete */}
                                <div className="flex items-center gap-2.5">
                                  <GripVertical className="w-4 h-4 text-zinc-400 shrink-0 cursor-grab" />

                                  {/* Photo Box with thumbnail, upload, paste & remove */}
                                  <div className="relative w-12 h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0">
                                    {choice.imageUrl ? (
                                      <>
                                        <img src={choice.imageUrl} alt={choice.name} className="w-full h-full object-cover" />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateChoice(group.id, choice.id, { imageUrl: '' })}
                                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                          title="Quitar foto"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <label className="w-full h-full flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
                                        <ImageIcon className="w-4 h-4" />
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => handleFileUpload(e, (b64) => handleUpdateChoice(group.id, choice.id, { imageUrl: b64 }))}
                                        />
                                      </label>
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
                                            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                              <ImageIcon className="w-3.5 h-3.5" />
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
                                  {/* Preseleccionado */}
                                  <label
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                      choice.isIncluded || choice.isDefault
                                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
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
                                    <span>Preseleccionado</span>
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
                    ))}
                  </div>
                )}
              </div>

              {/* ADICIONALES & EXTRAS CON FOTO, EDICIÓN, PRECIO CONDICIONAL E INCLUSIÓN */}
              <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Adicionales & Extras con Foto, Inclusión y Regla Condicional
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingExtra(!isAddingExtra)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-zinc-950 text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingExtra ? 'Cerrar' : '+ Agregar Adicional con Foto'}</span>
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

              </div>

              {/* Fixed Bottom Action Bar */}
              <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-3 shrink-0 shadow-lg z-20">
                {!isCreatingProduct && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(tempProduct.id, tempProduct.name)}
                    className="whitespace-nowrap shrink-0 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Producto</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="whitespace-nowrap shrink-0 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-xs font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="whitespace-nowrap shrink-0 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
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

                {/* 2. Icono (con presets rápidos) */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Icono de la Categoría (para estilo iconos/pastillas)
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xl shrink-0 shadow-xs">
                      {catFormIcon || '🏷️'}
                    </div>
                    <input
                      type="text"
                      value={catFormIcon}
                      onChange={(e) => setCatFormIcon(e.target.value)}
                      placeholder="Icono o emoji"
                      className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1">
                    {QUICK_CATEGORY_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatFormIcon(emoji)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                          catFormIcon === emoji
                            ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-400 scale-110 shadow-xs'
                            : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        title={`Elegir ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
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
                          {c.imageUrl ? (
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900">
                              <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                              {c.icon || '🏷️'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-zinc-900 dark:text-white capitalize truncate">
                                {c.name}
                              </span>
                              <span className="text-xs shrink-0">{c.icon || '🏷️'}</span>
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
    </div>
  );
};
