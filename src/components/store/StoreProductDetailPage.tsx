import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Product,
  ProductSizeConfig,
  OrderItem,
  CartSubOptionSelection,
  CartExtra,
  SubOptionChoice,
  SubOptionGroup,
} from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { toProductSlug } from '../../types/storeBuilder';
import { shareStoreContent, updateDocumentShareMeta } from '../../utils/pwaManager';
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Minus,
  Check,
  Pizza,
  ChefHat,
  Sparkles,
  FileText,
  ShoppingBag,
  MapPin,
  Share2,
} from 'lucide-react';

interface StoreProductDetailPageProps {
  product: Product;
  isLightTheme: boolean;
  accentColor: string;
  buttonColor: string;
  buttonTextColor: string;
  autoButtonContrast: boolean;
  branchName: string;
  orderMode: 'delivery' | 'pickup';
  cartCount: number;
  onBackToCatalog: () => void;
  onOpenCart: () => void;
  onAddToCart: (item: OrderItem) => void;
}

export const StoreProductDetailPage: React.FC<StoreProductDetailPageProps> = ({
  product,
  isLightTheme,
  accentColor,
  buttonColor,
  buttonTextColor,
  autoButtonContrast,
  branchName,
  orderMode,
  cartCount,
  onBackToCatalog,
  onOpenCart,
  onAddToCart,
}) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const accordionContainerRef = useRef<HTMLDivElement>(null);
  const { products: catalogProducts } = useOrderCatalog();

  const isHalfAndHalf = product.productType === 'half_and_half';
  const availableFlavorPizzas = useMemo(
    () =>
      catalogProducts.filter(
        p => p.category === 'pizzas' && p.productType !== 'half_and_half' && p.isAvailable
      ),
    [catalogProducts]
  );

  const [firstHalfId, setFirstHalfId] = useState<string>(() => availableFlavorPizzas[0]?.id || '');
  const [secondHalfId, setSecondHalfId] = useState<string>(
    () => availableFlavorPizzas[1]?.id || availableFlavorPizzas[0]?.id || ''
  );

  const [selectedSize, setSelectedSize] = useState<ProductSizeConfig | null>(() => {
    if (product.hasSizes && product.sizes.length > 0) {
      return (
        product.sizes.find(s => s.isDefault && s.enabled) ||
        product.sizes.find(s => s.enabled) ||
        product.sizes[0]
      );
    }
    return null;
  });

  const [selectedSubOptions, setSelectedSubOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    (product.subOptions || []).forEach(group => {
      if (group.enabled !== false && group.choices && group.choices.length > 0) {
        const hasMultiple = group.choices.some(c => c.isMultiple);
        const isGroupMulti = Boolean(group.maxSelection && group.maxSelection > 1);
        if (!hasMultiple && !isGroupMulti) {
          const def = group.choices.find(c => c.isDefault || c.isIncluded) || group.choices[0];
          if (def) initial[group.id] = def.id;
        }
      }
    });
    return initial;
  });

  const [selectedSubOptionsMulti, setSelectedSubOptionsMulti] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    (product.subOptions || []).forEach(group => {
      if (group.enabled !== false && group.choices && group.choices.length > 0 && group.maxSelection && group.maxSelection > 1) {
        const defaults = group.choices
          .filter(c => !c.isMultiple && (c.isDefault || c.isIncluded))
          .slice(0, group.maxSelection)
          .map(c => c.id);
        if (defaults.length > 0) {
          initial[group.id] = defaults;
        }
      }
    });
    return initial;
  });

  const [subOptionQuantities, setSubOptionQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    (product.subOptions || []).forEach(group => {
      if (group.enabled !== false && group.choices) {
        group.choices.forEach(choice => {
          if (choice.isMultiple) {
            initial[choice.id] = (choice.isIncluded || choice.isDefault)
              ? Math.max(1, choice.freeQuantity || 1)
              : 0;
          }
        });
      }
    });
    return initial;
  });

  const [selectedNestedChoices, setSelectedNestedChoices] = useState<Record<string, string[]>>({});
  const [nestedChoiceQuantities, setNestedChoiceQuantities] = useState<Record<string, number>>({});

  const isSingleChoiceSelected = (group: SubOptionGroup, choiceId: string) => {
    if (group.maxSelection && group.maxSelection > 1) {
      return (selectedSubOptionsMulti[group.id] || []).includes(choiceId);
    }
    return selectedSubOptions[group.id] === choiceId;
  };

  const getGroupTotalSelected = (group: SubOptionGroup) => {
    return (group.choices || []).reduce((sum, c) => {
      if (c.isMultiple) return sum + (subOptionQuantities[c.id] || 0);
      return sum + (isSingleChoiceSelected(group, c.id) ? 1 : 0);
    }, 0);
  };

  const handleSelectSingleChoice = (group: SubOptionGroup, choiceId: string) => {
    if (group.maxSelection && group.maxSelection > 1) {
      const curList = selectedSubOptionsMulti[group.id] || [];
      if (curList.includes(choiceId)) {
        setSelectedSubOptionsMulti(prev => ({
          ...prev,
          [group.id]: curList.filter(id => id !== choiceId),
        }));
        return;
      }
      const curTotal = getGroupTotalSelected(group);
      if (curTotal >= group.maxSelection) return;
      setSelectedSubOptionsMulti(prev => ({
        ...prev,
        [group.id]: [...curList, choiceId],
      }));
      return;
    }

    setSelectedSubOptions(prev => ({
      ...prev,
      [group.id]: choiceId,
    }));
  };

  const handleUpdateNestedQty = (
    choice: SubOptionChoice,
    nest: { id: string; maxQty?: number },
    delta: number
  ) => {
    const key = `${choice.id}::${nest.id}`;
    const curQty = nestedChoiceQuantities[key] || 0;
    const nextQty = Math.max(0, curQty + delta);

    if (delta > 0) {
      const maxPerNest = nest.maxQty && nest.maxQty > 0 ? nest.maxQty : 99;
      if (nextQty > maxPerNest) return;

      if (choice.subExtrasLimit && choice.subExtrasLimit > 0) {
        const curNestedIds = selectedNestedChoices[choice.id] || [];
        const totalNested = (choice.nestedChoices || []).reduce((sum, n) => {
          if (n.isMultiple) return sum + (nestedChoiceQuantities[`${choice.id}::${n.id}`] || 0);
          return sum + (curNestedIds.includes(n.id) ? 1 : 0);
        }, 0);
        if (totalNested >= choice.subExtrasLimit) return;
      }
    }

    setNestedChoiceQuantities(prev => ({
      ...prev,
      [key]: nextQty,
    }));
  };

  const handleUpdateChoiceQty = (
    groupId: string,
    choice: SubOptionChoice,
    delta: number
  ) => {
    const group = (product.subOptions || []).find(g => g.id === groupId);
    const curQty = subOptionQuantities[choice.id] || 0;
    const nextQty = Math.max(0, curQty + delta);

    if (delta > 0) {
      const maxPerChoice = choice.maxQuantity && choice.maxQuantity > 0 ? choice.maxQuantity : 99;
      if (nextQty > maxPerChoice) return;

      if (group && group.maxSelection && group.maxSelection > 0) {
        const curGroupTotal = getGroupTotalSelected(group);
        if (curGroupTotal >= group.maxSelection) return;
      }
    }

    setSubOptionQuantities(prev => ({
      ...prev,
      [choice.id]: nextQty,
    }));
  };

  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (product.allowedExtras || []).forEach(e => {
      if (e.enabled !== false && e.isIncluded) {
        initial[e.id] = true;
      }
    });
    return initial;
  });
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [allExpanded, setAllExpanded] = useState(true);

  // Route programmatic focus to heading on entry for accessibility after View Transition
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [product.id]);

  // Sync Expand/Collapse All button state when individual <details> toggle
  const syncExpandAllState = () => {
    const container = accordionContainerRef.current;
    if (!container) return;
    const detailsList = Array.from(container.querySelectorAll(':scope > details')) as HTMLDetailsElement[];
    if (detailsList.length === 0) return;
    setAllExpanded(detailsList.every(d => d.open));
  };

  const handleToggleAllAccordions = () => {
    const container = accordionContainerRef.current;
    if (!container) return;
    const nextOpen = !allExpanded;
    const detailsList = Array.from(container.querySelectorAll(':scope > details')) as HTMLDetailsElement[];
    detailsList.forEach(d => {
      d.open = nextOpen;
    });
    setAllExpanded(nextOpen);
  };

  const resolveFlavorSizePrice = (flavor: Product | undefined, size: ProductSizeConfig | null): number => {
    if (!flavor) return size ? size.price : product.basePrice;
    if (!size) return flavor.basePrice;
    const matched =
      flavor.sizes.find(s => s.id === size.id) ||
      flavor.sizes.find(s => s.name.toLowerCase() === size.name.toLowerCase());
    return matched ? matched.price : size.price;
  };

  const firstHalfPizza = availableFlavorPizzas.find(p => p.id === firstHalfId) || availableFlavorPizzas[0];
  const secondHalfPizza =
    availableFlavorPizzas.find(p => p.id === secondHalfId) ||
    availableFlavorPizzas[1] ||
    availableFlavorPizzas[0];

  // Price computation (Half & Half uses the highest flavor price for the chosen size)
  const basePrice =
    isHalfAndHalf && firstHalfPizza && secondHalfPizza
      ? Math.max(
          resolveFlavorSizePrice(firstHalfPizza, selectedSize),
          resolveFlavorSizePrice(secondHalfPizza, selectedSize)
        )
      : selectedSize
      ? selectedSize.price
      : product.basePrice;

  let subOptionsDelta = 0;
  (product.subOptions || []).forEach(group => {
    if (group.enabled === false) return;

    (group.choices || []).forEach(choice => {
      let isChoiceActive = false;

      if (choice.isMultiple) {
        const qty = subOptionQuantities[choice.id] || 0;
        if (qty > 0) {
          isChoiceActive = true;
          if (!choice.hidePrice) {
            const freeQty = choice.freeQuantity || 0;
            const billableQty = Math.max(0, qty - freeQty);
            subOptionsDelta += billableQty * (choice.priceDelta || 0);
          }
        }
      } else {
        if (isSingleChoiceSelected(group, choice.id)) {
          isChoiceActive = true;
          if (!choice.hidePrice) {
            subOptionsDelta += choice.priceDelta || 0;
          }
        }
      }

      if (isChoiceActive) {
        const nestedSelected = selectedNestedChoices[choice.id] || [];
        (choice.nestedChoices || []).forEach(nest => {
          if (nest.isMultiple) {
            const nestQty = nestedChoiceQuantities[`${choice.id}::${nest.id}`] || 0;
            if (nestQty > 0 && !nest.hidePrice) {
              subOptionsDelta += nestQty * (nest.priceDelta || 0);
            }
          } else if (nestedSelected.includes(nest.id) && !nest.hidePrice) {
            subOptionsDelta += nest.priceDelta || 0;
          }
        });
      }
    });
  });

  const enabledExtras = (product.allowedExtras || []).filter(e => e.enabled !== false);
  let extrasTotal = 0;
  let selectedExtrasCount = 0;
  enabledExtras.forEach(extra => {
    if (selectedExtras[extra.id]) {
      const cost = extra.isIncluded ? 0 : extra.price;
      extrasTotal += cost;
      selectedExtrasCount += 1;
    }
  });

  const unitPrice = basePrice + subOptionsDelta + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const selectionValidation = useMemo(() => {
    if (isHalfAndHalf && (!firstHalfPizza || !secondHalfPizza)) {
      return { valid: false, reason: 'Elige las 2 mitades de tu pizza' };
    }

    for (const group of product.subOptions || []) {
      if (group.enabled === false || !group.choices || group.choices.length === 0) continue;

      const groupTotal = getGroupTotalSelected(group);

      if (group.required && groupTotal === 0) {
        return { valid: false, reason: `Elige una opción en "${group.name}"` };
      }

      if (group.maxSelection && group.maxSelection > 0 && groupTotal > group.maxSelection) {
        return {
          valid: false,
          reason: `Máximo ${group.maxSelection} opciones en "${group.name}"`,
        };
      }

      for (const choice of group.choices) {
        const isChoiceActive = choice.isMultiple
          ? (subOptionQuantities[choice.id] || 0) > 0
          : isSingleChoiceSelected(group, choice.id);

        if (!isChoiceActive || !choice.nestedChoices || choice.nestedChoices.length === 0) {
          continue;
        }

        const subLimit = choice.subExtrasLimit && choice.subExtrasLimit > 0 ? choice.subExtrasLimit : 0;
        if (subLimit > 0) {
          const requiredCount = Math.min(subLimit, choice.nestedChoices.length);
          const curNestedIds = selectedNestedChoices[choice.id] || [];
          const nestedCount = choice.nestedChoices.reduce((sum, n) => {
            if (n.isMultiple) return sum + (nestedChoiceQuantities[`${choice.id}::${n.id}`] || 0);
            return sum + (curNestedIds.includes(n.id) ? 1 : 0);
          }, 0);
          if (nestedCount !== requiredCount) {
            return {
              valid: false,
              reason: `Elige ${requiredCount} sub-opciones en "${choice.name}" (${nestedCount}/${requiredCount})`,
            };
          }
        }
      }
    }

    return { valid: true, reason: '' };
  }, [
    firstHalfPizza,
    isHalfAndHalf,
    nestedChoiceQuantities,
    product.subOptions,
    secondHalfPizza,
    selectedNestedChoices,
    selectedSubOptions,
    selectedSubOptionsMulti,
    subOptionQuantities,
  ]);

  const handleAdd = () => {
    if (!selectionValidation.valid) return;
    const subOptionsList: CartSubOptionSelection[] = [];
    (product.subOptions || []).forEach(group => {
      if (group.enabled === false) return;

      (group.choices || []).forEach(choice => {
        const nestedSelected = selectedNestedChoices[choice.id] || [];
        let nestedPriceDelta = 0;
        const nestedNames: string[] = [];
        (choice.nestedChoices || []).forEach(n => {
          if (n.isMultiple) {
            const nq = nestedChoiceQuantities[`${choice.id}::${n.id}`] || 0;
            if (nq > 0) {
              nestedNames.push(nq > 1 ? `${n.name} x${nq}` : n.name);
              if (!n.hidePrice) nestedPriceDelta += nq * (n.priceDelta || 0);
            }
          } else if (nestedSelected.includes(n.id)) {
            nestedNames.push(n.name);
            if (!n.hidePrice) nestedPriceDelta += n.priceDelta || 0;
          }
        });

        if (choice.isMultiple) {
          const qty = subOptionQuantities[choice.id] || 0;
          if (qty > 0) {
            const freeQty = choice.freeQuantity || 0;
            const billableQty = Math.max(0, qty - freeQty);
            const totalChoicePrice = billableQty * (choice.priceDelta || 0) + nestedPriceDelta;

            let choiceName = choice.name;
            if (qty > 1) {
              choiceName += ` (x${qty})`;
            }
            if (nestedNames.length > 0) {
              choiceName += ` (${nestedNames.join(', ')})`;
            }

            subOptionsList.push({
              groupId: group.id,
              groupName: group.name,
              choiceId: choice.id,
              choiceName,
              priceDelta: totalChoicePrice,
              quantity: qty,
            });
          }
        } else {
          if (isSingleChoiceSelected(group, choice.id)) {
            let fullChoiceName = choice.name;
            if (nestedNames.length > 0) {
              fullChoiceName += ` (${nestedNames.join(', ')})`;
            }

            subOptionsList.push({
              groupId: group.id,
              groupName: group.name,
              choiceId: choice.id,
              choiceName: fullChoiceName,
              priceDelta: (choice.hidePrice ? 0 : (choice.priceDelta || 0)) + nestedPriceDelta,
              quantity: 1,
            });
          }
        }
      });
    });

    const extrasList: CartExtra[] = [];
    enabledExtras.forEach(extra => {
      if (selectedExtras[extra.id]) {
        extrasList.push({
          id: extra.id,
          name: extra.name,
          price: extra.isIncluded ? 0 : extra.price,
          quantity: 1,
        });
      }
    });

    const item: OrderItem = {
      itemId: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      productName: product.name,
      productImage:
        isHalfAndHalf && firstHalfPizza ? firstHalfPizza.imageUrl : product.imageUrl,
      halfAndHalf:
        isHalfAndHalf && firstHalfPizza && secondHalfPizza
          ? {
              firstHalfId: firstHalfPizza.id,
              firstHalfName: firstHalfPizza.name,
              firstHalfImage: firstHalfPizza.imageUrl,
              secondHalfId: secondHalfPizza.id,
              secondHalfName: secondHalfPizza.name,
              secondHalfImage: secondHalfPizza.imageUrl,
            }
          : undefined,
      size: selectedSize
        ? {
            id: selectedSize.id,
            name: selectedSize.name,
            slices: selectedSize.slices,
            price: basePrice,
          }
        : undefined,
      subOptions: subOptionsList,
      extras: extrasList,
      notes: notes.trim() || undefined,
      unitPrice,
      quantity,
      totalPrice,
    };

    onAddToCart(item);
    onBackToCatalog();
  };

  const shareDisplayPrice = useMemo(() => {
    if (product.hasSizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes[0].price;
    }
    return product.basePrice || 0;
  }, [product.hasSizes, product.sizes, product.basePrice]);

  useEffect(() => {
    const slug = toProductSlug(product.name);
    const shareUrl = `${window.location.origin}/producto/${slug}`;
    updateDocumentShareMeta({
      title: `${product.name} — S/ ${shareDisplayPrice.toFixed(2)} | ${branchName}`,
      description: product.description || `Pide ${product.name} en ${branchName}.`,
      image: product.imageUrl || undefined,
      url: shareUrl,
      type: 'product',
    });
  }, [product.id, product.name, shareDisplayPrice, product.description, product.imageUrl, branchName]);

  const handleShareProduct = async () => {
    const slug = toProductSlug(product.name);
    const shareUrl = `${window.location.origin}/producto/${slug}`;
    await shareStoreContent({
      title: `${product.name} — S/ ${shareDisplayPrice.toFixed(2)}`,
      text: `Pide ${product.name} (S/ ${shareDisplayPrice.toFixed(2)}) en ${branchName}`,
      url: shareUrl,
    });
  };

  const categoryLabel = useMemo(() => {
    if (product.category === 'pizzas') return 'PIZZAS CLÁSICAS';
    if (product.category === 'combos') return 'COMBOS & PROMOS';
    if (product.category === 'entradas') return 'ENTRADAS & ALITAS';
    if (product.category === 'bebidas') return 'BEBIDAS HELADAS';
    return (product.category || 'CARTA').toUpperCase();
  }, [product.category]);

  const buttonVars = {
    '--store-btn-bg': buttonColor,
    '--store-btn-fg': buttonTextColor,
  } as React.CSSProperties;

  return (
    <div
      style={buttonVars}
      className={`min-h-dvh flex flex-col pb-28 ${
        isLightTheme ? 'bg-zinc-50 text-zinc-900' : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* App-Style Top Navigation Bar */}
      <div
        className={`sticky top-0 z-30 border-b px-4 py-3 ${
          isLightTheme
            ? 'bg-white border-zinc-200 text-zinc-900 shadow-xs'
            : 'bg-neutral-950 border-neutral-800 text-neutral-100'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToCatalog}
            style={{ touchAction: 'manipulation' }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold border active:scale-[0.97] transition-transform whitespace-nowrap shrink-0 ${
              isLightTheme
                ? 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100 hover:bg-neutral-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Carta</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
                isLightTheme
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="truncate max-w-[160px]">{branchName}</span>
              <span>•</span>
              <span>{orderMode === 'delivery' ? 'Delivery' : 'Para Llevar'}</span>
            </span>

            <button
              type="button"
              onClick={onOpenCart}
              data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
              className="store-btn-solid relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-black active:scale-[0.97] transition-transform whitespace-nowrap shrink-0 shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Pedido</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-black/20">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Product Slug Page Main Content (Image 5 Modern 2-Column Layout) */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 pb-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Product Hero Image (Sticky, Category Tag + Share Button) */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <div
              className={`relative rounded-3xl overflow-hidden border aspect-square shadow-sm ${
                isLightTheme
                  ? 'bg-zinc-100 border-zinc-200/90'
                  : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              {isHalfAndHalf && firstHalfPizza && secondHalfPizza ? (
                <div className="w-full h-full grid grid-cols-2 relative" style={{ viewTransitionName: 'store-product-hero' }}>
                  <div className="relative h-full overflow-hidden border-r-2 border-white">
                    <img
                      src={firstHalfPizza.imageUrl}
                      alt={firstHalfPizza.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-3 left-3 right-2 px-2.5 py-1 rounded-xl bg-zinc-950/85 text-white text-[10px] font-black truncate">
                      1/2 {firstHalfPizza.name}
                    </span>
                  </div>
                  <div className="relative h-full overflow-hidden border-l-2 border-white">
                    <img
                      src={secondHalfPizza.imageUrl}
                      alt={secondHalfPizza.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-3 left-2 right-3 px-2.5 py-1 rounded-xl bg-zinc-950/85 text-white text-[10px] font-black truncate">
                      1/2 {secondHalfPizza.name}
                    </span>
                  </div>
                </div>
              ) : (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{ viewTransitionName: 'store-product-hero' }}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Floating Top-Left Category Tag */}
              <span
                className={`absolute top-3.5 left-3.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5 border ${
                  isLightTheme
                    ? 'bg-white/95 text-zinc-900 border-zinc-200/90'
                    : 'bg-neutral-900/95 text-white border-neutral-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                <span>{categoryLabel}</span>
              </span>

              {/* Floating Top-Right Share Button */}
              <button
                type="button"
                onClick={handleShareProduct}
                aria-label="Compartir enlace del producto"
                title="Compartir o copiar enlace"
                className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full backdrop-blur-md hover:text-red-600 shadow-md flex items-center justify-center transition-transform active:scale-90 border ${
                  isLightTheme
                    ? 'bg-white/95 text-zinc-700 hover:bg-zinc-100 border-zinc-200/90'
                    : 'bg-neutral-900/95 text-zinc-200 hover:bg-neutral-800 border-neutral-700'
                }`}
              >
                <Share2 className="w-4 h-4" />
              </button>

              {product.badge && (
                <span
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid absolute bottom-3.5 left-3.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg border border-white/20"
                >
                  {product.badge}
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Category Tag, Title, Price Box, Ingredients & Option Accordions */}
          <div className="lg:col-span-7 space-y-4">
            {/* Category Tag & SKU */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                  isLightTheme
                    ? 'bg-rose-50 text-rose-700 border-rose-200/90'
                    : 'bg-rose-950/40 text-rose-300 border-rose-900/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                <span>{categoryLabel}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider border shrink-0 ${
                  isLightTheme
                    ? 'bg-zinc-100/90 text-zinc-600 border-zinc-200/80'
                    : 'bg-neutral-800/80 text-zinc-300 border-neutral-700'
                }`}
              >
                <span className="text-zinc-400 font-sans font-medium text-[10px]">SKU:</span>
                <span>{product.id.slice(0, 8).toUpperCase()}</span>
              </span>
            </div>

            {/* Product Title */}
            <h1
              id="detail-heading"
              ref={headingRef}
              tabIndex={-1}
              className={`text-2xl sm:text-3xl font-black tracking-tight focus:outline-none ${
                isLightTheme ? 'text-zinc-950' : 'text-white'
              }`}
            >
              {product.name}
            </h1>

            {/* Base Price Card (Never wraps awkwardly on mobile) */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
                isLightTheme
                  ? 'bg-zinc-50/90 border-zinc-200/90'
                  : 'bg-neutral-900/90 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`text-2xl sm:text-3xl font-black tracking-tight whitespace-nowrap shrink-0 ${
                    isLightTheme ? 'text-zinc-950' : 'text-white'
                  }`}
                >
                  S/&nbsp;{basePrice.toFixed(2)}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                    isLightTheme
                      ? 'bg-zinc-200/80 border-zinc-300 text-zinc-600'
                      : 'bg-neutral-800 border-neutral-700 text-zinc-400'
                  }`}
                >
                  PRECIO BASE
                </span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border shrink-0 ${
                  isLightTheme
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                }`}
              >
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="whitespace-nowrap">
                  Disponible<span className="hidden sm:inline"> para pedido</span>
                </span>
              </div>
            </div>

            {/* Ingredients Description */}
            {product.description && (
              <p
                className={`text-xs sm:text-sm leading-relaxed ${
                  isLightTheme ? 'text-zinc-600' : 'text-neutral-400'
                }`}
              >
                <span className={`font-bold ${isLightTheme ? 'text-zinc-900' : 'text-zinc-200'}`}>Ingredientes: </span>
                {product.description}
              </p>
            )}

            {/* Accordion Expand / Collapse Controller */}
            <div className="flex items-center justify-between pt-2 px-1">
              <span
                className={`text-xs font-black uppercase tracking-wider ${
                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                }`}
              >
                Personaliza tu orden
              </span>

              <button
                type="button"
                aria-expanded={allExpanded}
                onClick={handleToggleAllAccordions}
                style={{ touchAction: 'manipulation', color: accentColor }}
                className="text-xs font-bold hover:underline active:scale-95 transition-transform"
              >
                {allExpanded ? 'Ocultar todas las opciones' : 'Desplegar todas las opciones'}
              </button>
            </div>

            {/* Customization Accordions (Styled Per Image 4) */}
            <div
              ref={accordionContainerRef}
              aria-label="Opciones de personalización del producto"
              className="store-option-accordion space-y-3"
            >
              {/* 1. Size Selection Accordion (Image 4 Design) */}
              {product.hasSizes && product.sizes.some(s => s.enabled) && (
                <details
                  open
                  onToggle={syncExpandAllState}
                  className={`group rounded-3xl border overflow-hidden transition-all shadow-xs ${
                    isLightTheme
                      ? 'bg-white border-zinc-200/90'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <summary
                    style={{ touchAction: 'manipulation' }}
                    className={`cursor-pointer px-4 sm:px-5 py-4 flex items-center justify-between gap-3 select-none transition-colors ${
                      isLightTheme ? 'hover:bg-zinc-50' : 'hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-white" />
                      </span>
                      <div className="min-w-0">
                        <h2
                          className={`font-black text-sm sm:text-base leading-tight truncate ${
                            isLightTheme ? 'text-zinc-900' : 'text-white'
                          }`}
                        >
                          Elige el tamaño de tu pizza
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[11px] font-semibold ${
                              isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                            }`}
                          >
                            Elige 1 opción
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isLightTheme
                                ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                                : 'bg-rose-950/40 text-rose-300 border-rose-900/40'
                            }`}
                          >
                            REQUERIDO
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full ${
                          isLightTheme
                            ? 'bg-zinc-100 text-zinc-700'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {selectedSize ? '1 / 1' : '0 / 1'}
                      </span>
                      <ChevronDown className="w-4 h-4 shrink-0 transition-transform -rotate-90 group-open:rotate-0 text-zinc-400" />
                    </div>
                  </summary>

                  <div
                    className={`px-4 sm:px-5 pb-5 pt-2 border-t space-y-2.5 ${
                      isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
                    }`}
                  >
                    {product.sizes
                      .filter(s => s.enabled)
                      .map(size => {
                        const isSelected = selectedSize?.id === size.id;
                        return (
                          <button
                            key={size.id}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            style={{ touchAction: 'manipulation' }}
                            className={`w-full p-3 sm:p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 text-left active:scale-[0.99] ${
                              isSelected
                                ? isLightTheme
                                  ? 'border-red-600 bg-rose-50/70 shadow-xs'
                                  : 'border-red-600 bg-rose-950/30 shadow-xs'
                                : isLightTheme
                                ? 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 text-zinc-900'
                                : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-white'
                            }`}
                          >
                            {/* Left: Slice Badge graphic (e.g. 04 Tajadas de Pizza) */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-12 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                                  isSelected
                                    ? isLightTheme
                                      ? 'bg-white border-red-200 text-red-600 shadow-xs'
                                      : 'bg-neutral-800 border-red-900/50 text-red-400 shadow-xs'
                                    : isLightTheme
                                    ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                                    : 'bg-neutral-800 border-neutral-700 text-zinc-300'
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center leading-none">
                                  <span className="text-sm font-black">
                                    {String(size.slices).padStart(2, '0')}
                                  </span>
                                  <span
                                    className={`text-[8px] font-extrabold uppercase tracking-tight ${
                                      isLightTheme ? 'text-zinc-500' : 'text-zinc-400'
                                    }`}
                                  >
                                    Tajadas
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <span
                                  className={`block font-bold text-sm leading-snug ${
                                    isSelected
                                      ? isLightTheme
                                        ? 'text-zinc-950'
                                        : 'text-white'
                                      : isLightTheme
                                      ? 'text-zinc-900'
                                      : 'text-zinc-200'
                                  }`}
                                >
                                  {size.name.toLowerCase().includes('tajada')
                                    ? size.name
                                    : `${String(size.slices).padStart(2, '0')} Tajadas de Pizza (${size.name})`}
                                </span>
                                <span
                                  className={`block text-xs font-black mt-0.5 ${
                                    isSelected
                                      ? isLightTheme
                                        ? 'text-red-600'
                                        : 'text-red-400'
                                      : isLightTheme
                                      ? 'text-zinc-600'
                                      : 'text-zinc-400'
                                  }`}
                                >
                                  S/ {size.price.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Right: Custom radio indicator matching Image 4 */}
                            <div className="shrink-0 pl-2">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? isLightTheme
                                      ? 'border-red-600 bg-white shadow-xs'
                                      : 'border-red-600 bg-neutral-900 shadow-xs'
                                    : isLightTheme
                                    ? 'border-zinc-300 bg-transparent'
                                    : 'border-neutral-600 bg-transparent'
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </details>
              )}

              {/* 1B. Half & Half Flavor Selectors (1ra Mitad + 2da Mitad) */}
              {isHalfAndHalf && availableFlavorPizzas.length > 0 && (
                <>
                  {(
                    [
                      {
                        key: 'first',
                        label: '1ra Mitad (Lado Izquierdo)',
                        selected: firstHalfPizza,
                        onSelect: setFirstHalfId,
                      },
                      {
                        key: 'second',
                        label: '2da Mitad (Lado Derecho)',
                        selected: secondHalfPizza,
                        onSelect: setSecondHalfId,
                      },
                    ] as const
                  ).map(side => (
                    <details
                      key={side.key}
                      open
                      onToggle={syncExpandAllState}
                      className={`group rounded-3xl border overflow-hidden transition-all shadow-xs ${
                        isLightTheme
                          ? 'bg-white border-zinc-200/90'
                          : 'bg-neutral-900 border-neutral-800'
                      }`}
                    >
                      <summary
                        style={{ touchAction: 'manipulation' }}
                        className={`cursor-pointer px-4 sm:px-5 py-4 flex items-center justify-between gap-3 select-none transition-colors ${
                          isLightTheme ? 'hover:bg-zinc-50' : 'hover:bg-neutral-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-white" />
                          </span>
                          <div className="min-w-0">
                            <h2
                              className={`font-black text-sm sm:text-base leading-tight truncate ${
                                isLightTheme ? 'text-zinc-900' : 'text-white'
                              }`}
                            >
                              {side.label}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[11px] font-semibold ${
                                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                                }`}
                              >
                                Elige 1 sabor
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  isLightTheme
                                    ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                                    : 'bg-rose-950/40 text-rose-300 border-rose-900/40'
                                }`}
                              >
                                REQUERIDO
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-full truncate max-w-[140px] ${
                              isLightTheme
                                ? 'bg-zinc-100 text-zinc-700'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {side.selected ? side.selected.name : 'Elegir sabor'}
                          </span>
                          <ChevronDown className="w-4 h-4 shrink-0 transition-transform -rotate-90 group-open:rotate-0 text-zinc-400" />
                        </div>
                      </summary>

                      <div
                        className={`px-4 sm:px-5 pb-5 pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${
                          isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
                        }`}
                      >
                        {availableFlavorPizzas.map(flav => {
                          const isChosen = side.selected?.id === flav.id;
                          const flavPrice = resolveFlavorSizePrice(flav, selectedSize);
                          return (
                            <button
                              key={flav.id}
                              type="button"
                              onClick={() => side.onSelect(flav.id)}
                              style={{ touchAction: 'manipulation' }}
                              className={`p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-3 active:scale-[0.98] transition-all ${
                                isChosen
                                  ? isLightTheme
                                    ? 'border-red-600 bg-rose-50/70 shadow-xs'
                                    : 'border-red-600 bg-rose-950/30 shadow-xs'
                                  : isLightTheme
                                  ? 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 text-zinc-800'
                                  : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <img
                                  src={flav.imageUrl}
                                  alt={flav.name}
                                  className="h-12 w-12 rounded-xl object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <span
                                    className={`block text-xs sm:text-sm font-bold truncate ${
                                      isChosen
                                        ? isLightTheme
                                          ? 'text-zinc-950'
                                          : 'text-white'
                                        : isLightTheme
                                        ? 'text-zinc-800'
                                        : 'text-zinc-200'
                                    }`}
                                  >
                                    {flav.name}
                                  </span>
                                  <span
                                    className={`block text-[11px] font-black mt-0.5 ${
                                      isLightTheme ? 'text-rose-600' : 'text-rose-400'
                                    }`}
                                  >
                                    Ref. S/ {flavPrice.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0 pl-1">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isChosen
                                      ? isLightTheme
                                        ? 'border-red-600 bg-white shadow-xs'
                                        : 'border-red-600 bg-neutral-900 shadow-xs'
                                      : isLightTheme
                                      ? 'border-zinc-300 bg-transparent'
                                      : 'border-neutral-600 bg-transparent'
                                  }`}
                                >
                                  {isChosen && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </>
              )}

              {/* 2. SubOptions Accordions (Masa, Salsa, Toppings, etc. con soporte de Grid, Pills, Fotos y Sub-opciones anidadas) */}
              {(product.subOptions || [])
                .filter(g => g.enabled !== false && g.choices && g.choices.length > 0)
                .map(group => {
                  const chosenId = selectedSubOptions[group.id];
                  const chosenObj = (group.choices || []).find(c => c.id === chosenId);
                  const isGrid = group.layoutVisual === 'grid';
                  const isPills = group.layoutVisual === 'pills';

                  return (
                    <details
                      key={group.id}
                      open={group.openByDefault !== false}
                      onToggle={syncExpandAllState}
                      className={`group rounded-3xl border overflow-hidden transition-all shadow-xs ${
                        isLightTheme
                          ? 'bg-white border-zinc-200/90'
                          : 'bg-neutral-900 border-neutral-800'
                      }`}
                    >
                      <summary
                        style={{ touchAction: 'manipulation' }}
                        className={`cursor-pointer px-4 sm:px-5 py-4 flex items-center justify-between gap-3 select-none transition-colors ${
                          isLightTheme ? 'hover:bg-zinc-50' : 'hover:bg-neutral-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-white" />
                          </span>
                          <div className="min-w-0">
                            <h2
                              className={`font-black text-sm sm:text-base leading-tight truncate ${
                                isLightTheme ? 'text-zinc-900' : 'text-white'
                              }`}
                            >
                              {group.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[11px] font-semibold ${
                                  isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                                }`}
                              >
                                {group.maxSelection && group.maxSelection > 1
                                  ? `Hasta ${group.maxSelection} opciones`
                                  : 'Elige 1 opción'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  group.required
                                    ? isLightTheme
                                      ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                                      : 'bg-rose-950/40 text-rose-300 border-rose-900/40'
                                    : isLightTheme
                                    ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                }`}
                              >
                                {group.required ? 'REQUERIDO' : 'OPCIONAL'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-full truncate max-w-[130px] ${
                              isLightTheme
                                ? 'bg-zinc-100 text-zinc-700'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {(() => {
                              const hasMultiple = (group.choices || []).some(c => c.isMultiple);
                              const groupTotal = getGroupTotalSelected(group);
                              if (group.maxSelection && group.maxSelection > 0) {
                                return `${groupTotal} / ${group.maxSelection}`;
                              }
                              if (hasMultiple) {
                                return `${groupTotal} selec.`;
                              }
                              return chosenObj ? chosenObj.name : 'Seleccionar';
                            })()}
                          </span>
                          <ChevronDown className="w-4 h-4 shrink-0 transition-transform -rotate-90 group-open:rotate-0 text-zinc-400" />
                        </div>
                      </summary>

                      <div
                        className={`px-4 sm:px-5 pb-5 pt-3 border-t ${
                          isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
                        } ${
                          isGrid
                            ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
                            : isPills
                            ? 'flex flex-wrap gap-2.5'
                            : 'space-y-3'
                        }`}
                      >
                        {group.choices.map(choice => {
                          const isMultiple = !!choice.isMultiple;
                          const qty = isMultiple ? (subOptionQuantities[choice.id] || 0) : 0;
                          const isSelected = isMultiple ? qty > 0 : isSingleChoiceSelected(group, choice.id);
                          const freeQty = choice.freeQuantity || 0;
                          const groupTotal = getGroupTotalSelected(group);
                          const isGroupMulti = Boolean(group.maxSelection && group.maxSelection > 1);
                          const isAtMax = Boolean(
                            (choice.maxQuantity && choice.maxQuantity > 0 && qty >= choice.maxQuantity) ||
                            (group.maxSelection && group.maxSelection > 0 && groupTotal >= group.maxSelection)
                          );

                          let priceSubtitle = '';
                          if (!choice.hidePrice) {
                            if (isMultiple) {
                              if (qty === 0) {
                                priceSubtitle = freeQty > 0
                                  ? `S/ ${choice.priceDelta.toFixed(2)} c/u (${freeQty} gratis)`
                                  : `+ S/ ${choice.priceDelta.toFixed(2)} c/u`;
                              } else {
                                const billable = Math.max(0, qty - freeQty);
                                priceSubtitle = billable === 0
                                  ? 'Gratis'
                                  : `+ S/ ${(billable * choice.priceDelta).toFixed(2)}`;
                              }
                            } else {
                              priceSubtitle = choice.priceDelta > 0
                                ? `+ S/ ${choice.priceDelta.toFixed(2)}`
                                : 'Incluido';
                            }
                          }

                          if (isPills) {
                            return (
                              <div
                                key={choice.id}
                                className={`px-3 py-2 rounded-2xl border-2 text-xs font-bold flex items-center gap-2 transition-all ${
                                  isSelected
                                    ? isLightTheme
                                      ? 'border-red-600 bg-rose-50/70 text-zinc-950 shadow-xs'
                                      : 'border-red-600 bg-rose-950/40 text-white shadow-xs'
                                    : isLightTheme
                                    ? 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                                    : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                                }`}
                              >
                                {choice.imageUrl && (
                                  <img src={choice.imageUrl} alt={choice.name} className="w-5 h-5 rounded-md object-cover" />
                                )}
                                <span>{choice.name}</span>
                                {priceSubtitle && (
                                  <span className={`font-black ${isLightTheme ? 'text-red-600' : 'text-rose-400'}`}>
                                    {priceSubtitle}
                                  </span>
                                )}

                                {isMultiple ? (
                                  <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      disabled={qty <= 0}
                                      onClick={() => handleUpdateChoiceQty(group.id, choice, -1)}
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold disabled:opacity-30 ${
                                        isLightTheme ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                                      }`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className={`w-4 text-center font-black ${isLightTheme ? 'text-zinc-950' : 'text-white'}`}>{qty}</span>
                                    <button
                                      type="button"
                                      disabled={isAtMax}
                                      onClick={() => handleUpdateChoiceQty(group.id, choice, 1)}
                                      className="w-6 h-6 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center font-bold disabled:opacity-30"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!isSelected && isGroupMulti && isAtMax}
                                    onClick={() => handleSelectSingleChoice(group, choice.id)}
                                    className="ml-1 text-[11px] font-bold text-red-600 disabled:opacity-35"
                                  >
                                    {isSelected ? '✓' : 'Elegir'}
                                  </button>
                                )}
                              </div>
                            );
                          }

                          if (isGrid) {
                            return (
                              <div
                                key={choice.id}
                                className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                                  isSelected
                                    ? isLightTheme
                                      ? 'border-red-600 bg-rose-50/70 shadow-xs'
                                      : 'border-red-600 bg-rose-950/30 shadow-xs'
                                    : isLightTheme
                                    ? 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 text-zinc-800'
                                    : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-neutral-300'
                                }`}
                              >
                                {choice.imageUrl ? (
                                  <div className={`w-full h-24 rounded-xl overflow-hidden mb-2.5 ${isLightTheme ? 'bg-zinc-100' : 'bg-neutral-800'}`}>
                                    <img src={choice.imageUrl} alt={choice.name} className="w-full h-full object-cover" />
                                  </div>
                                ) : null}

                                <div className="space-y-1 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    <span
                                      className={`font-bold text-xs sm:text-sm line-clamp-1 ${
                                        isSelected
                                          ? isLightTheme ? 'text-zinc-950' : 'text-white'
                                          : isLightTheme ? 'text-zinc-800' : 'text-zinc-200'
                                      }`}
                                    >
                                      {choice.name}
                                    </span>
                                    {choice.isRecommended && (
                                      <span className="text-[10px] text-amber-500 font-bold shrink-0">⭐</span>
                                    )}
                                  </div>

                                  {choice.description && (
                                    <p
                                      className={`text-[11px] line-clamp-2 leading-tight ${
                                        isLightTheme ? 'text-zinc-600' : 'text-neutral-400'
                                      }`}
                                    >
                                      {choice.description}
                                    </p>
                                  )}

                                  {priceSubtitle && (
                                    <span
                                      className={`block text-xs font-bold pt-1 ${
                                        isLightTheme ? 'text-red-600' : 'text-rose-400'
                                      }`}
                                    >
                                      {priceSubtitle}
                                    </span>
                                  )}
                                </div>

                                <div
                                  className={`mt-3 pt-2 border-t flex items-center justify-between gap-2 ${
                                    isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
                                  }`}
                                >
                                  {freeQty > 0 && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border ${
                                        isLightTheme
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                      }`}
                                    >
                                      🎁 {freeQty} Gratis
                                    </span>
                                  )}

                                  {isMultiple ? (
                                    <div className="flex items-center gap-1.5 ml-auto" onClick={e => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        disabled={qty <= 0}
                                        onClick={() => handleUpdateChoiceQty(group.id, choice, -1)}
                                        className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs disabled:opacity-30 transition-all active:scale-90 ${
                                          isLightTheme
                                            ? 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800'
                                            : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white'
                                        }`}
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span
                                        className={`w-5 text-center font-black text-xs ${
                                          isLightTheme ? 'text-zinc-950' : 'text-white'
                                        }`}
                                      >
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={isAtMax}
                                        onClick={() => handleUpdateChoiceQty(group.id, choice, 1)}
                                        className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-bold text-xs disabled:opacity-30 transition-all active:scale-90"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!isSelected && isGroupMulti && isAtMax}
                                      onClick={() => handleSelectSingleChoice(group, choice.id)}
                                      className="ml-auto disabled:opacity-35"
                                    >
                                      <div
                                        className={`w-4 h-4 ${isGroupMulti ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center ${
                                          isSelected ? 'border-red-600 bg-red-600' : 'border-zinc-300'
                                        }`}
                                      >
                                        {isSelected && (isGroupMulti ? <Check className="w-2.5 h-2.5 text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-white" />)}
                                      </div>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          // Default: List view (Image 4 and Image 2 Design)
                          return (
                            <div key={choice.id} className="space-y-2">
                              <div
                                onClick={() => {
                                  if (isMultiple) {
                                    if (qty === 0 && !isAtMax) {
                                      handleUpdateChoiceQty(group.id, choice, 1);
                                    }
                                  } else {
                                    handleSelectSingleChoice(group, choice.id);
                                  }
                                }}
                                style={{ touchAction: 'manipulation' }}
                                className={`w-full p-3 sm:p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] ${
                                  isSelected
                                    ? isLightTheme
                                      ? 'border-red-600 bg-rose-50/70 shadow-xs'
                                      : 'border-red-600 bg-rose-950/30 shadow-xs'
                                    : isLightTheme
                                    ? 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 text-zinc-900'
                                    : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-white'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {choice.imageUrl ? (
                                    <img
                                      src={choice.imageUrl}
                                      alt={choice.name}
                                      className={`w-12 h-12 rounded-xl object-cover shrink-0 border ${
                                        isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
                                      }`}
                                    />
                                  ) : null}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`font-bold text-sm leading-snug ${
                                          isSelected
                                            ? isLightTheme ? 'text-zinc-950' : 'text-white'
                                            : isLightTheme ? 'text-zinc-900' : 'text-zinc-200'
                                        }`}
                                      >
                                        {choice.name}
                                      </span>
                                      {choice.isRecommended && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-black border ${
                                            isLightTheme
                                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                          }`}
                                        >
                                          ⭐ Recomendado
                                        </span>
                                      )}
                                      {freeQty > 0 && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-black border ${
                                            isLightTheme
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                          }`}
                                        >
                                          🎁 {freeQty} Gratis
                                        </span>
                                      )}
                                      {choice.maxQuantity && choice.maxQuantity > 0 ? (
                                        <span
                                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                                            isLightTheme
                                              ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                          }`}
                                        >
                                          Máx. {choice.maxQuantity}
                                        </span>
                                      ) : null}
                                    </div>

                                    {choice.description && (
                                      <p
                                        className={`text-xs line-clamp-1 mt-0.5 ${
                                          isLightTheme ? 'text-zinc-600' : 'text-neutral-400'
                                        }`}
                                      >
                                        {choice.description}
                                      </p>
                                    )}

                                    {priceSubtitle && (
                                      <span
                                        className={`block text-xs font-semibold mt-0.5 ${
                                          priceSubtitle === 'Gratis'
                                            ? isLightTheme ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'
                                            : choice.priceDelta > 0
                                            ? isLightTheme ? 'text-red-600 font-bold' : 'text-rose-400 font-bold'
                                            : isLightTheme
                                            ? 'text-zinc-600'
                                            : 'text-neutral-400'
                                        }`}
                                      >
                                        {priceSubtitle}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Quantity Selector when isMultiple, else radio circle */}
                                {isMultiple ? (
                                  <div className="flex items-center gap-1.5 shrink-0 pl-2" onClick={e => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateChoiceQty(group.id, choice, -1)}
                                      disabled={qty <= 0}
                                      className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm font-black disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90 ${
                                        isLightTheme
                                          ? 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800'
                                          : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white'
                                      }`}
                                      title="Disminuir cantidad"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>

                                    <span
                                      className={`w-6 text-center font-black text-xs sm:text-sm ${
                                        isLightTheme ? 'text-zinc-950' : 'text-white'
                                      }`}
                                    >
                                      {qty}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdateChoiceQty(group.id, choice, 1)}
                                      disabled={isAtMax}
                                      className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-sm font-black disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-xs active:scale-90"
                                      title="Aumentar cantidad"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="shrink-0 pl-2">
                                    <div
                                      className={`w-5 h-5 ${isGroupMulti ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center transition-all ${
                                        isSelected
                                          ? isGroupMulti
                                            ? 'border-red-600 bg-red-600 shadow-xs'
                                            : isLightTheme
                                            ? 'border-red-600 bg-white shadow-xs'
                                            : 'border-red-600 bg-neutral-900 shadow-xs'
                                          : isLightTheme
                                          ? 'border-zinc-300 bg-transparent'
                                          : 'border-neutral-600 bg-transparent'
                                      }`}
                                    >
                                      {isSelected &&
                                        (isGroupMulti ? (
                                          <Check className="w-3 h-3 text-white" />
                                        ) : (
                                          <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Nested choices drawer if this choice is selected */}
                              {isSelected && choice.nestedChoices && choice.nestedChoices.length > 0 && (() => {
                                const curNestedIds = selectedNestedChoices[choice.id] || [];
                                const maxSubLimit =
                                  choice.subExtrasLimit && choice.subExtrasLimit > 0
                                    ? choice.subExtrasLimit
                                    : null;
                                const requiredSubCount =
                                  maxSubLimit !== null
                                    ? Math.min(maxSubLimit, choice.nestedChoices.length)
                                    : null;
                                const totalNestedSelected = choice.nestedChoices.reduce((sum, n) => {
                                  if (n.isMultiple) return sum + (nestedChoiceQuantities[`${choice.id}::${n.id}`] || 0);
                                  return sum + (curNestedIds.includes(n.id) ? 1 : 0);
                                }, 0);
                                const isSubLimitReached =
                                  maxSubLimit !== null && totalNestedSelected >= maxSubLimit;

                                return (
                                  <div
                                    className={`ml-4 sm:ml-8 p-3 rounded-2xl border-2 border-dashed space-y-2 ${
                                      isLightTheme
                                        ? 'border-rose-300 bg-rose-50/60'
                                        : 'border-rose-900/40 bg-rose-950/20'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span
                                        className={`text-[11px] font-black uppercase tracking-wider block ${
                                          isLightTheme ? 'text-rose-700' : 'text-rose-400'
                                        }`}
                                      >
                                        Sub-opciones Disponibles:
                                      </span>
                                      {requiredSubCount !== null && (
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            totalNestedSelected === requiredSubCount
                                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                          }`}
                                        >
                                          Elige {requiredSubCount} ({totalNestedSelected}/{requiredSubCount})
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {choice.nestedChoices.map(nest => {
                                        const isNestMultiple = !!nest.isMultiple;
                                        const nestQty = isNestMultiple
                                          ? (nestedChoiceQuantities[`${choice.id}::${nest.id}`] || 0)
                                          : 0;
                                        const isNestSelected = isNestMultiple
                                          ? nestQty > 0
                                          : curNestedIds.includes(nest.id);
                                        const isNestAtMax = Boolean(
                                          (nest.maxQty && nest.maxQty > 0 && nestQty >= nest.maxQty) ||
                                          isSubLimitReached
                                        );
                                        const isNestDisabled = isNestMultiple
                                          ? nestQty === 0 && isSubLimitReached
                                          : !isNestSelected && isSubLimitReached;

                                        if (isNestMultiple) {
                                          return (
                                            <div
                                              key={nest.id}
                                              onClick={() => {
                                                if (nestQty === 0 && !isNestAtMax) {
                                                  handleUpdateNestedQty(choice, nest, 1);
                                                }
                                              }}
                                              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                                                isNestSelected
                                                  ? isLightTheme
                                                    ? 'border-red-500 bg-white text-red-600 font-bold shadow-xs'
                                                    : 'border-red-500 bg-neutral-900 text-red-400 font-bold shadow-xs'
                                                  : isNestDisabled
                                                  ? isLightTheme
                                                    ? 'border-zinc-200 bg-zinc-100/70 text-zinc-400 opacity-45 cursor-not-allowed'
                                                    : 'border-neutral-800 bg-neutral-950 text-neutral-600 opacity-45 cursor-not-allowed'
                                                  : isLightTheme
                                                  ? 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                                                  : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                {nest.imageUrl && (
                                                  <img src={nest.imageUrl} alt={nest.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                  <span className="block truncate">{nest.name}</span>
                                                  {nest.priceDelta > 0 && !nest.hidePrice && (
                                                    <span className="font-bold text-red-600 text-[11px]">
                                                      +S/{nest.priceDelta.toFixed(2)} c/u
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                <button
                                                  type="button"
                                                  disabled={nestQty <= 0}
                                                  onClick={() => handleUpdateNestedQty(choice, nest, -1)}
                                                  className={`w-6 h-6 rounded-lg border flex items-center justify-center font-black disabled:opacity-25 ${
                                                    isLightTheme
                                                      ? 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800'
                                                      : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white'
                                                  }`}
                                                >
                                                  <Minus className="w-3 h-3" />
                                                </button>
                                                <span className={`w-5 text-center font-black text-xs ${isLightTheme ? 'text-zinc-950' : 'text-white'}`}>
                                                  {nestQty}
                                                </span>
                                                <button
                                                  type="button"
                                                  disabled={isNestAtMax}
                                                  onClick={() => handleUpdateNestedQty(choice, nest, 1)}
                                                  className="w-6 h-6 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-black disabled:opacity-25"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }

                                        return (
                                          <button
                                            key={nest.id}
                                            type="button"
                                            disabled={isNestDisabled}
                                            onClick={() => {
                                              setSelectedNestedChoices(prev => {
                                                const cur = prev[choice.id] || [];
                                                if (cur.includes(nest.id)) {
                                                  return {
                                                    ...prev,
                                                    [choice.id]: cur.filter(id => id !== nest.id),
                                                  };
                                                }
                                                if (maxSubLimit !== null && totalNestedSelected >= maxSubLimit) {
                                                  return prev;
                                                }
                                                if (maxSubLimit !== null && maxSubLimit > 1) {
                                                  return { ...prev, [choice.id]: [...cur, nest.id] };
                                                }
                                                return { ...prev, [choice.id]: [nest.id] };
                                              });
                                            }}
                                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                                              isNestSelected
                                                ? isLightTheme
                                                  ? 'border-red-500 bg-white text-red-600 font-bold shadow-xs'
                                                  : 'border-red-500 bg-neutral-900 text-red-400 font-bold shadow-xs'
                                                : isNestDisabled
                                                ? isLightTheme
                                                  ? 'border-zinc-200 bg-zinc-100/70 text-zinc-400 opacity-45 cursor-not-allowed'
                                                  : 'border-neutral-800 bg-neutral-950 text-neutral-600 opacity-45 cursor-not-allowed'
                                                : isLightTheme
                                                ? 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                                                : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              {nest.imageUrl && (
                                                <img src={nest.imageUrl} alt={nest.name} className="w-6 h-6 rounded-md object-cover shrink-0" />
                                              )}
                                              <span className="truncate">{nest.name}</span>
                                            </div>
                                            {nest.priceDelta > 0 && !nest.hidePrice && (
                                              <span className="font-bold text-red-600 shrink-0">+S/{nest.priceDelta.toFixed(2)}</span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}

              {/* 3. Extras & Bordes Accordion (Image 4 Format) */}
              {enabledExtras.length > 0 && (
                <details
                  onToggle={syncExpandAllState}
                  className={`group rounded-3xl border overflow-hidden transition-all shadow-xs ${
                    isLightTheme
                      ? 'bg-white border-zinc-200/90'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <summary
                    style={{ touchAction: 'manipulation' }}
                    className={`cursor-pointer px-4 sm:px-5 py-4 flex items-center justify-between gap-3 select-none transition-colors ${
                      isLightTheme ? 'hover:bg-zinc-50' : 'hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-3 h-3" />
                      </span>
                      <div className="min-w-0">
                        <h2
                          className={`font-black text-sm sm:text-base leading-tight truncate ${
                            isLightTheme ? 'text-zinc-900' : 'text-white'
                          }`}
                        >
                          Extras y Bordes Rellenos
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[11px] font-semibold ${
                              isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                            }`}
                          >
                            Elige varias opciones
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isLightTheme
                                ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            }`}
                          >
                            OPCIONAL
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full ${
                          selectedExtrasCount > 0
                            ? 'bg-amber-500 text-neutral-950 font-black'
                            : isLightTheme
                            ? 'bg-zinc-100 text-zinc-700'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {selectedExtrasCount} / {enabledExtras.length}
                      </span>
                      <ChevronDown className="w-4 h-4 shrink-0 transition-transform -rotate-90 group-open:rotate-0 text-zinc-400" />
                    </div>
                  </summary>

                  <div
                    className={`px-4 sm:px-5 pb-5 pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${
                      isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
                    }`}
                  >
                    {enabledExtras.map(extra => {
                      const isChecked = Boolean(selectedExtras[extra.id]);
                      return (
                        <button
                          key={extra.id}
                          type="button"
                          onClick={() =>
                            setSelectedExtras(prev => ({
                              ...prev,
                              [extra.id]: !prev[extra.id],
                            }))
                          }
                          style={{ touchAction: 'manipulation' }}
                          className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-2.5 text-left active:scale-[0.99] ${
                            isChecked
                              ? isLightTheme
                                ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                                : 'border-amber-500 bg-amber-950/30 shadow-xs'
                              : isLightTheme
                              ? 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 text-zinc-900'
                              : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                isChecked
                                  ? 'border-amber-500 bg-amber-500 text-neutral-950'
                                  : isLightTheme
                                  ? 'border-zinc-300 bg-transparent'
                                  : 'border-neutral-600 bg-transparent'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            {extra.imageUrl && (
                              <img
                                src={extra.imageUrl}
                                alt={extra.name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-neutral-700"
                              />
                            )}

                            <div className="min-w-0">
                              <span
                                className={`text-xs sm:text-sm font-bold truncate block ${
                                  isChecked
                                    ? isLightTheme
                                      ? 'text-zinc-950'
                                      : 'text-white'
                                    : isLightTheme
                                    ? 'text-zinc-800'
                                    : 'text-zinc-200'
                                }`}
                              >
                                {extra.name}
                              </span>
                              {extra.isIncluded && (
                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                  ✓ Incluido por defecto
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-xs font-black shrink-0 ${
                              extra.isIncluded
                                ? isLightTheme
                                  ? 'text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full'
                                  : 'text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full'
                                : isLightTheme
                                ? 'text-amber-700'
                                : 'text-amber-400'
                            }`}
                          >
                            {extra.isIncluded ? 'Incluido' : `+ S/ ${extra.price.toFixed(2)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}

              {/* 4. Kitchen Instructions Accordion */}
              <details
                onToggle={syncExpandAllState}
                className={`group rounded-3xl border overflow-hidden transition-all shadow-xs ${
                  isLightTheme
                    ? 'bg-white border-zinc-200/90'
                    : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                <summary
                  style={{ touchAction: 'manipulation' }}
                  className={`cursor-pointer px-4 sm:px-5 py-4 flex items-center justify-between gap-3 select-none transition-colors ${
                    isLightTheme ? 'hover:bg-zinc-50' : 'hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-zinc-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileText className="w-3 h-3" />
                    </span>
                    <div className="min-w-0">
                      <h2
                        className={`font-black text-sm sm:text-base leading-tight truncate ${
                          isLightTheme ? 'text-zinc-900' : 'text-white'
                        }`}
                      >
                        Instrucciones para Cocina / Horno
                      </h2>
                      <span
                        className={`block text-[11px] font-semibold mt-0.5 ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        Notas especiales para el horneado
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isLightTheme
                          ? 'bg-zinc-100 text-zinc-600'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {notes.trim() ? 'Con nota' : 'Opcional'}
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform -rotate-90 group-open:rotate-0 text-zinc-400" />
                  </div>
                </summary>

                <div
                  className={`px-4 sm:px-5 pb-5 pt-2 border-t ${
                    isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
                  }`}
                >
                  <label htmlFor="prod-kitchen-notes" className="sr-only">
                    Instrucciones especiales para cocina
                  </label>
                  <textarea
                    id="prod-kitchen-notes"
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej: Bien dorada, sin orégano, cortar en 8 porciones..."
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm focus:outline-none ${
                      isLightTheme
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                        : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                    }`}
                  />
                </div>
              </details>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Mobile-App Bottom Action Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 border-t safe-bottom-bar px-3 sm:px-6 py-2.5 sm:py-3 ${
          isLightTheme
            ? 'bg-white border-zinc-200 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]'
            : 'bg-neutral-950 border-neutral-800 shadow-[0_-8px_28px_rgba(0,0,0,0.6)]'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
          {/* App-Style Stepper */}
          <div
            className={`flex items-center rounded-2xl border p-0.5 sm:p-1 shrink-0 ${
              isLightTheme
                ? 'bg-zinc-100 border-zinc-200'
                : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            <button
              type="button"
              aria-label="Disminuir cantidad"
              disabled={quantity <= 1}
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              style={{ touchAction: 'manipulation' }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
            >
              <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span
              className={`w-6 sm:w-8 text-center font-black text-sm sm:text-base ${
                isLightTheme ? 'text-zinc-950' : 'text-white'
              }`}
            >
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Aumentar cantidad"
              onClick={() => setQuantity(q => q + 1)}
              style={{ touchAction: 'manipulation' }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Solid App Button with Configured Button & Contrast Colors */}
          <button
            type="button"
            disabled={!selectionValidation.valid}
            title={!selectionValidation.valid ? selectionValidation.reason : undefined}
            onClick={handleAdd}
            data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
            className="store-btn-solid flex-1 min-w-0 py-3 sm:py-3.5 px-3.5 sm:px-5 rounded-2xl font-black text-xs sm:text-base shadow-md active:scale-[0.98] transition-all flex items-center justify-between gap-2 whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <span className="truncate">
              {selectionValidation.valid ? 'Agregar al Pedido' : selectionValidation.reason}
            </span>
            <span className="shrink-0 px-2 sm:px-2.5 py-0.5 rounded-lg bg-black/15 font-black text-xs sm:text-sm">
              S/&nbsp;{totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
