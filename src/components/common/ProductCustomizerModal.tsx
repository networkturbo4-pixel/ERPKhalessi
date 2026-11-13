import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import {
  Product,
  ProductSizeConfig,
  OrderItem,
  CartSubOptionSelection,
  CartExtra,
  SubOptionGroup,
  SubOptionChoice,
  SubOptionNestedChoice,
  ExtraModifier,
} from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { X, Plus, Minus, Check, Pizza, Sparkles, ChefHat, Layers, AlertCircle } from 'lucide-react';

interface ProductCustomizerModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: OrderItem) => void;
  mode?: 'storefront' | 'pos';
}

const getNestedKey = (choiceId: string, nestId: string) => `${choiceId}::${nestId}`;

const getEffectiveExtraUnitPrice = (extra: ExtraModifier, qty: number): number => {
  if (extra.isIncluded || qty <= 0) return 0;
  if (extra.conditionalRule && qty >= extra.conditionalRule.minQty) {
    return extra.conditionalRule.discountedPrice;
  }
  return extra.price;
};

export const ProductCustomizerModal: React.FC<ProductCustomizerModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  mode = 'storefront',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const notesId = useId();
  const { products: catalogProducts } = useOrderCatalog();

  const isHalfAndHalf = product?.productType === 'half_and_half';
  const availableFlavorPizzas = useMemo(
    () =>
      catalogProducts.filter(
        (p) => p.category === 'pizzas' && p.productType !== 'half_and_half' && p.isAvailable
      ),
    [catalogProducts]
  );

  const [firstHalfId, setFirstHalfId] = useState<string>('');
  const [secondHalfId, setSecondHalfId] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<ProductSizeConfig | null>(null);
  const [selectedSubOptions, setSelectedSubOptions] = useState<Record<string, string>>({});
  const [selectedSubOptionsMulti, setSelectedSubOptionsMulti] = useState<Record<string, string[]>>({});
  const [subOptionQuantities, setSubOptionQuantities] = useState<Record<string, number>>({});
  const [selectedNestedChoices, setSelectedNestedChoices] = useState<Record<string, string[]>>({});
  const [nestedChoiceQuantities, setNestedChoiceQuantities] = useState<Record<string, number>>({});
  const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && product) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (!product) return;

    setFirstHalfId(availableFlavorPizzas[0]?.id || '');
    setSecondHalfId(availableFlavorPizzas[1]?.id || availableFlavorPizzas[0]?.id || '');

    if (product.hasSizes && product.sizes.length > 0) {
      const defaultSize =
        product.sizes.find((s) => s.isDefault && s.enabled) ||
        product.sizes.find((s) => s.enabled) ||
        product.sizes[0];
      setSelectedSize(defaultSize);
    } else {
      setSelectedSize(null);
    }

    const initialSingle: Record<string, string> = {};
    const initialMulti: Record<string, string[]> = {};
    const initialQtys: Record<string, number> = {};

    (product.subOptions || []).forEach((group) => {
      if (group.enabled === false || !group.choices || group.choices.length === 0) return;

      const hasMultipleChoice = group.choices.some((c) => c.isMultiple);
      const isGroupMulti = Boolean(group.maxSelection && group.maxSelection > 1);

      group.choices.forEach((choice) => {
        if (choice.isMultiple) {
          initialQtys[choice.id] =
            choice.isIncluded || choice.isDefault ? Math.max(1, choice.freeQuantity || 1) : 0;
        }
      });

      if (isGroupMulti) {
        const defaults = group.choices
          .filter((c) => !c.isMultiple && (c.isDefault || c.isIncluded))
          .slice(0, group.maxSelection)
          .map((c) => c.id);
        if (defaults.length > 0) initialMulti[group.id] = defaults;
      } else if (!hasMultipleChoice) {
        const def = group.choices.find((c) => c.isDefault || c.isIncluded) || group.choices[0];
        if (def) initialSingle[group.id] = def.id;
      }
    });

    setSelectedSubOptions(initialSingle);
    setSelectedSubOptionsMulti(initialMulti);
    setSubOptionQuantities(initialQtys);
    setSelectedNestedChoices({});
    setNestedChoiceQuantities({});

    const initialExtras: Record<string, number> = {};
    (product.allowedExtras || []).forEach((ext) => {
      if (ext.enabled !== false && ext.isIncluded) {
        initialExtras[ext.id] = 1;
      }
    });
    setExtraQuantities(initialExtras);
    setNotes('');
    setQuantity(1);
  }, [product, isOpen, availableFlavorPizzas]);

  // Light dismiss fallback when clicking outside dialog card
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (isOutside && e.target === dialog) {
      onClose();
    }
  };

  const isSingleChoiceSelected = (group: SubOptionGroup, choiceId: string) => {
    if (group.maxSelection && group.maxSelection > 1) {
      return (selectedSubOptionsMulti[group.id] || []).includes(choiceId);
    }
    return selectedSubOptions[group.id] === choiceId;
  };

  const isChoiceActive = (group: SubOptionGroup, choice: SubOptionChoice): boolean => {
    if (choice.isMultiple) return (subOptionQuantities[choice.id] || 0) > 0;
    return isSingleChoiceSelected(group, choice.id);
  };

  const getGroupTotalSelected = (group: SubOptionGroup) =>
    (group.choices || []).reduce((sum, c) => {
      if (c.isMultiple) return sum + (subOptionQuantities[c.id] || 0);
      return sum + (isSingleChoiceSelected(group, c.id) ? 1 : 0);
    }, 0);

  // Collect all active option IDs and names for conditional group visibility (conditionOptionId)
  const activeConditionTokens = useMemo(() => {
    const tokens = new Set<string>();
    if (!product) return tokens;

    if (selectedSize) {
      tokens.add(selectedSize.id);
      tokens.add(selectedSize.name.toLowerCase());
    }

    (product.subOptions || []).forEach((group) => {
      if (group.enabled === false) return;
      (group.choices || []).forEach((choice) => {
        const active = choice.isMultiple
          ? (subOptionQuantities[choice.id] || 0) > 0
          : group.maxSelection && group.maxSelection > 1
          ? (selectedSubOptionsMulti[group.id] || []).includes(choice.id)
          : selectedSubOptions[group.id] === choice.id;

        if (active) {
          tokens.add(choice.id);
          tokens.add(choice.name.toLowerCase());

          const curNested = selectedNestedChoices[choice.id] || [];
          (choice.nestedChoices || []).forEach((nest) => {
            const nestActive = nest.isMultiple
              ? (nestedChoiceQuantities[getNestedKey(choice.id, nest.id)] || 0) > 0
              : curNested.includes(nest.id);
            if (nestActive) {
              tokens.add(nest.id);
              tokens.add(nest.name.toLowerCase());
            }
          });
        }
      });
    });

    (product.allowedExtras || []).forEach((ext) => {
      if (ext.enabled !== false && (extraQuantities[ext.id] || 0) > 0) {
        tokens.add(ext.id);
        tokens.add(ext.name.toLowerCase());
      }
    });

    return tokens;
  }, [
    product,
    selectedSize,
    selectedSubOptions,
    selectedSubOptionsMulti,
    subOptionQuantities,
    selectedNestedChoices,
    nestedChoiceQuantities,
    extraQuantities,
  ]);

  const isGroupVisible = (group: SubOptionGroup): boolean => {
    if (group.enabled === false) return false;
    const cond = group.conditionOptionId?.trim();
    if (!cond) return true;
    return activeConditionTokens.has(cond) || activeConditionTokens.has(cond.toLowerCase());
  };

  const visibleSubOptionGroups = useMemo(
    () => (product?.subOptions || []).filter(isGroupVisible),
    [product, activeConditionTokens]
  );

  const resolveFlavorSizePrice = (flavor: Product | undefined, size: ProductSizeConfig | null): number => {
    if (!flavor) return size ? size.price : product?.basePrice || 0;
    if (!size) return flavor.basePrice;
    const matched =
      flavor.sizes.find((s) => s.id === size.id) ||
      flavor.sizes.find((s) => s.name.toLowerCase() === size.name.toLowerCase());
    return matched ? matched.price : size.price;
  };

  const firstHalfPizza = availableFlavorPizzas.find((p) => p.id === firstHalfId) || availableFlavorPizzas[0];
  const secondHalfPizza =
    availableFlavorPizzas.find((p) => p.id === secondHalfId) ||
    availableFlavorPizzas[1] ||
    availableFlavorPizzas[0];

  const basePrice = !product
    ? 0
    : isHalfAndHalf && firstHalfPizza && secondHalfPizza
    ? Math.max(
        resolveFlavorSizePrice(firstHalfPizza, selectedSize),
        resolveFlavorSizePrice(secondHalfPizza, selectedSize)
      )
    : selectedSize
    ? selectedSize.price
    : product.basePrice;

  let subOptionsDelta = 0;
  visibleSubOptionGroups.forEach((group) => {
    (group.choices || []).forEach((choice) => {
      if (!isChoiceActive(group, choice)) return;

      if (choice.isMultiple) {
        const qty = subOptionQuantities[choice.id] || 0;
        if (!choice.hidePrice) {
          const billableQty = Math.max(0, qty - (choice.freeQuantity || 0));
          subOptionsDelta += billableQty * (choice.priceDelta || 0);
        }
      } else if (!choice.hidePrice) {
        subOptionsDelta += choice.priceDelta || 0;
      }

      const nestedSelected = selectedNestedChoices[choice.id] || [];
      (choice.nestedChoices || []).forEach((nest) => {
        if (nest.isMultiple) {
          const nestQty = nestedChoiceQuantities[getNestedKey(choice.id, nest.id)] || 0;
          if (nestQty > 0 && !nest.hidePrice) {
            subOptionsDelta += nestQty * (nest.priceDelta || 0);
          }
        } else if (nestedSelected.includes(nest.id) && !nest.hidePrice) {
          subOptionsDelta += nest.priceDelta || 0;
        }
      });
    });
  });

  let extrasTotal = 0;
  if (product) {
    (product.allowedExtras || []).forEach((extra) => {
      if (extra.enabled === false) return;
      const qty = extraQuantities[extra.id] || 0;
      if (qty > 0) {
        extrasTotal += getEffectiveExtraUnitPrice(extra, qty) * qty;
      }
    });
  }

  const unitPrice = basePrice + subOptionsDelta + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const selectionValidation = useMemo(() => {
    if (!product) return { valid: false, reason: '' };
    if (isHalfAndHalf && (!firstHalfPizza || !secondHalfPizza)) {
      return { valid: false, reason: 'Elige las 2 mitades de la pizza' };
    }

    for (const group of visibleSubOptionGroups) {
      if (!group.choices || group.choices.length === 0) continue;

      const groupTotal = getGroupTotalSelected(group);
      if (group.required && groupTotal === 0) {
        return { valid: false, reason: `Elige una opción en "${group.name}"` };
      }
      if (group.maxSelection && group.maxSelection > 0 && groupTotal > group.maxSelection) {
        return { valid: false, reason: `Máximo ${group.maxSelection} opciones en "${group.name}"` };
      }

      for (const choice of group.choices) {
        if (!isChoiceActive(group, choice) || !choice.nestedChoices || choice.nestedChoices.length === 0) {
          continue;
        }
        const subLimit = choice.subExtrasLimit && choice.subExtrasLimit > 0 ? choice.subExtrasLimit : 0;
        if (subLimit > 0) {
          const hasMultiNested = choice.nestedChoices.some((n) => n.isMultiple);
          const requiredCount = hasMultiNested
            ? subLimit
            : Math.min(subLimit, choice.nestedChoices.length);
          const curNestedIds = selectedNestedChoices[choice.id] || [];
          const nestedCount = choice.nestedChoices.reduce((sum, n) => {
            if (n.isMultiple) return sum + (nestedChoiceQuantities[getNestedKey(choice.id, n.id)] || 0);
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
    product,
    isHalfAndHalf,
    firstHalfPizza,
    secondHalfPizza,
    visibleSubOptionGroups,
    selectedSubOptions,
    selectedSubOptionsMulti,
    subOptionQuantities,
    selectedNestedChoices,
    nestedChoiceQuantities,
  ]);

  const handleSelectSingleChoice = (group: SubOptionGroup, choiceId: string) => {
    if (group.maxSelection && group.maxSelection > 1) {
      const curList = selectedSubOptionsMulti[group.id] || [];
      if (curList.includes(choiceId)) {
        setSelectedSubOptionsMulti((prev) => ({
          ...prev,
          [group.id]: curList.filter((id) => id !== choiceId),
        }));
        return;
      }
      if (getGroupTotalSelected(group) >= group.maxSelection) return;
      setSelectedSubOptionsMulti((prev) => ({
        ...prev,
        [group.id]: [...curList, choiceId],
      }));
      return;
    }

    setSelectedSubOptions((prev) => ({
      ...prev,
      [group.id]: choiceId,
    }));
  };

  const handleUpdateChoiceQty = (group: SubOptionGroup, choice: SubOptionChoice, delta: number) => {
    const curQty = subOptionQuantities[choice.id] || 0;
    const nextQty = Math.max(0, curQty + delta);

    if (delta > 0) {
      const maxPerChoice = choice.maxQuantity && choice.maxQuantity > 0 ? choice.maxQuantity : 99;
      if (nextQty > maxPerChoice) return;
      if (group.maxSelection && group.maxSelection > 0 && getGroupTotalSelected(group) >= group.maxSelection) {
        return;
      }
    }

    setSubOptionQuantities((prev) => ({
      ...prev,
      [choice.id]: nextQty,
    }));
  };

  const handleUpdateNestedQty = (
    choice: SubOptionChoice,
    nest: SubOptionNestedChoice,
    delta: number
  ) => {
    const key = getNestedKey(choice.id, nest.id);
    const curQty = nestedChoiceQuantities[key] || 0;
    const nextQty = Math.max(0, curQty + delta);

    if (delta > 0) {
      const maxPerNest = nest.maxQty && nest.maxQty > 0 ? nest.maxQty : 99;
      if (nextQty > maxPerNest) return;

      if (choice.subExtrasLimit && choice.subExtrasLimit > 0) {
        const curNestedIds = selectedNestedChoices[choice.id] || [];
        const totalNested = (choice.nestedChoices || []).reduce((sum, n) => {
          if (n.isMultiple) return sum + (nestedChoiceQuantities[getNestedKey(choice.id, n.id)] || 0);
          return sum + (curNestedIds.includes(n.id) ? 1 : 0);
        }, 0);
        if (totalNested >= choice.subExtrasLimit) return;
      }
    }

    setNestedChoiceQuantities((prev) => ({
      ...prev,
      [key]: nextQty,
    }));
  };

  const handleToggleNestedChoice = (
    choice: SubOptionChoice,
    nestId: string,
    maxSubLimit: number | null,
    totalNestedSelected: number
  ) => {
    setSelectedNestedChoices((prev) => {
      const cur = prev[choice.id] || [];
      if (cur.includes(nestId)) {
        return { ...prev, [choice.id]: cur.filter((id) => id !== nestId) };
      }
      if (maxSubLimit !== null && totalNestedSelected >= maxSubLimit) {
        return prev;
      }
      if (maxSubLimit === 1) {
        return { ...prev, [choice.id]: [nestId] };
      }
      return { ...prev, [choice.id]: [...cur, nestId] };
    });
  };

  const handleToggleExtra = (extraId: string) => {
    setExtraQuantities((prev) => {
      const cur = prev[extraId] || 0;
      return { ...prev, [extraId]: cur > 0 ? 0 : 1 };
    });
  };

  const handleUpdateExtraQty = (extraId: string, delta: number) => {
    setExtraQuantities((prev) => {
      const cur = prev[extraId] || 0;
      return { ...prev, [extraId]: Math.max(0, cur + delta) };
    });
  };

  const handleAdd = () => {
    if (!product || !selectionValidation.valid) return;

    const subOptionsList: CartSubOptionSelection[] = [];
    visibleSubOptionGroups.forEach((group) => {
      (group.choices || []).forEach((choice) => {
        if (!isChoiceActive(group, choice)) return;

        const nestedSelected = selectedNestedChoices[choice.id] || [];
        let nestedPriceDelta = 0;
        const nestedNames: string[] = [];

        (choice.nestedChoices || []).forEach((nest) => {
          if (nest.isMultiple) {
            const nq = nestedChoiceQuantities[getNestedKey(choice.id, nest.id)] || 0;
            if (nq > 0) {
              nestedNames.push(nq > 1 ? `${nest.name} x${nq}` : nest.name);
              if (!nest.hidePrice) nestedPriceDelta += nq * (nest.priceDelta || 0);
            }
          } else if (nestedSelected.includes(nest.id)) {
            nestedNames.push(nest.name);
            if (!nest.hidePrice) nestedPriceDelta += nest.priceDelta || 0;
          }
        });

        if (choice.isMultiple) {
          const qty = subOptionQuantities[choice.id] || 0;
          const billableQty = Math.max(0, qty - (choice.freeQuantity || 0));
          const baseDelta = choice.hidePrice ? 0 : billableQty * (choice.priceDelta || 0);
          let choiceName = choice.name;
          if (qty > 1) choiceName += ` (x${qty})`;
          if (nestedNames.length > 0) choiceName += ` (${nestedNames.join(', ')})`;

          subOptionsList.push({
            groupId: group.id,
            groupName: group.name,
            choiceId: choice.id,
            choiceName,
            priceDelta: baseDelta + nestedPriceDelta,
            quantity: qty,
          });
        } else {
          const baseDelta = choice.hidePrice ? 0 : choice.priceDelta || 0;
          const choiceName =
            nestedNames.length > 0 ? `${choice.name} (${nestedNames.join(', ')})` : choice.name;

          subOptionsList.push({
            groupId: group.id,
            groupName: group.name,
            choiceId: choice.id,
            choiceName,
            priceDelta: baseDelta + nestedPriceDelta,
          });
        }
      });
    });

    const extrasList: CartExtra[] = [];
    (product.allowedExtras || []).forEach((extra) => {
      if (extra.enabled === false) return;
      const qty = extraQuantities[extra.id] || 0;
      if (qty > 0) {
        extrasList.push({
          id: extra.id,
          name: extra.name,
          price: getEffectiveExtraUnitPrice(extra, qty),
          quantity: qty,
        });
      }
    });

    const item: OrderItem = {
      itemId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      productName:
        isHalfAndHalf && firstHalfPizza && secondHalfPizza
          ? `${product.name} (${firstHalfPizza.name} / ${secondHalfPizza.name})`
          : product.name,
      productImage: isHalfAndHalf && firstHalfPizza ? firstHalfPizza.imageUrl : product.imageUrl,
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
    onClose();
  };

  const enabledExtras = (product?.allowedExtras || []).filter((e) => e.enabled !== false);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="max-w-xl w-full p-0 bg-transparent border-0"
    >
      {isOpen && product && (
        <div className="touch-surface w-full max-h-[90dvh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
          {/* Header with image */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-zinc-950 shrink-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar personalizador de producto"
              className="absolute top-3 right-3 h-11 w-11 rounded-full bg-black/65 text-white hover:bg-black/85 flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            {product.badge && (
              <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-zinc-950 shadow-md">
                {product.badge}
              </span>
            )}

            <div className="absolute bottom-3 left-4 right-4">
              <h2 id={titleId} className="text-lg sm:text-2xl font-black text-white drop-shadow-md leading-tight">
                {product.name}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-200 line-clamp-2 mt-1 drop-shadow">
                {product.description}
              </p>
            </div>
          </div>

          {/* Scrollable Configuration Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 saas-scroll bg-white dark:bg-zinc-900">
            {/* 0. Half & Half Flavor Selector */}
            {isHalfAndHalf && availableFlavorPizzas.length > 0 && (
              <div className="space-y-3 p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Pizza className="w-4 h-4" aria-hidden="true" /> Combina tus 2 Mitades
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      1ra Mitad
                    </label>
                    <select
                      value={firstHalfId}
                      onChange={(e) => setFirstHalfId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white"
                    >
                      {availableFlavorPizzas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (S/ {resolveFlavorSizePrice(p, selectedSize).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      2da Mitad
                    </label>
                    <select
                      value={secondHalfId}
                      onChange={(e) => setSecondHalfId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white"
                    >
                      {availableFlavorPizzas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (S/ {resolveFlavorSizePrice(p, selectedSize).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Size Selection */}
            {product.hasSizes && product.sizes.filter((s) => s.enabled).length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Pizza className="w-4 h-4" aria-hidden="true" /> 1. Selecciona el Tamaño
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Táctil</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {product.sizes
                    .filter((s) => s.enabled)
                    .map((size) => {
                      const isSelected = selectedSize?.id === size.id;
                      return (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`min-h-[68px] flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all active:scale-[0.98] ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/15 text-zinc-950 dark:text-white ring-2 ring-amber-500/40 font-bold shadow-sm'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <span className="font-bold text-sm">{size.name}</span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{size.slices} Cortes</span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-1">
                            S/ {size.price.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. Sub-options (with conditional visibility, multi-select, quantities & nested sub-extras) */}
            {visibleSubOptionGroups.map((group) => {
              const isGroupMulti = Boolean(group.maxSelection && group.maxSelection > 1);
              const groupTotalSelected = getGroupTotalSelected(group);
              const isGroupAtMax = Boolean(
                group.maxSelection && group.maxSelection > 0 && groupTotalSelected >= group.maxSelection
              );

              return (
                <div key={group.id} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <ChefHat className="w-4 h-4 text-amber-500" aria-hidden="true" /> {group.name}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                      {isGroupMulti
                        ? `${group.required ? 'Obligatorio · ' : ''}Máx ${group.maxSelection} (${groupTotalSelected}/${group.maxSelection})`
                        : group.required
                        ? 'Obligatorio'
                        : 'Opcional'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(group.choices || []).map((choice) => {
                      const isMultiple = !!choice.isMultiple;
                      const qty = isMultiple ? subOptionQuantities[choice.id] || 0 : 0;
                      const isSelected = isMultiple ? qty > 0 : isSingleChoiceSelected(group, choice.id);
                      const maxPerChoice =
                        choice.maxQuantity && choice.maxQuantity > 0 ? choice.maxQuantity : 99;
                      const isChoiceAtMax = isMultiple ? qty >= maxPerChoice || isGroupAtMax : isGroupAtMax;
                      const freeQty = choice.freeQuantity || 0;

                      const hasNested = Boolean(choice.nestedChoices && choice.nestedChoices.length > 0);
                      const curNestedIds = selectedNestedChoices[choice.id] || [];
                      const maxSubLimit =
                        choice.subExtrasLimit && choice.subExtrasLimit > 0 ? choice.subExtrasLimit : null;
                      const hasMultiNested = (choice.nestedChoices || []).some((n) => n.isMultiple);
                      const requiredSubCount =
                        maxSubLimit !== null && hasNested
                          ? hasMultiNested
                            ? maxSubLimit
                            : Math.min(maxSubLimit, choice.nestedChoices!.length)
                          : null;
                      const totalNestedSelected = (choice.nestedChoices || []).reduce((sum, n) => {
                        if (n.isMultiple) return sum + (nestedChoiceQuantities[getNestedKey(choice.id, n.id)] || 0);
                        return sum + (curNestedIds.includes(n.id) ? 1 : 0);
                      }, 0);
                      const isSubLimitReached = maxSubLimit !== null && totalNestedSelected >= maxSubLimit;

                      return (
                        <div key={choice.id} className="space-y-2">
                          <div
                            onClick={() => {
                              if (isMultiple) {
                                if (qty === 0 && !isChoiceAtMax) {
                                  handleUpdateChoiceQty(group, choice, 1);
                                }
                              } else {
                                if (!isSelected && isGroupMulti && isGroupAtMax) return;
                                handleSelectSingleChoice(group, choice.id);
                              }
                            }}
                            className={`min-h-[48px] w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500/10 text-zinc-950 dark:text-white font-semibold ring-1 ring-amber-500/40'
                                : !isSelected && isGroupMulti && isGroupAtMax
                                ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-400 opacity-50 cursor-not-allowed'
                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {!isMultiple && (
                                <div
                                  className={`w-5 h-5 ${
                                    isGroupMulti ? 'rounded-md' : 'rounded-full'
                                  } border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'border-amber-500 bg-amber-500 text-zinc-950'
                                      : 'border-zinc-400 dark:border-zinc-600'
                                  }`}
                                >
                                  {isSelected &&
                                    (isGroupMulti ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                                    ) : (
                                      <div className="w-2 h-2 rounded-full bg-white dark:bg-zinc-950" />
                                    ))}
                                </div>
                              )}

                              {choice.imageUrl && (
                                <img
                                  src={choice.imageUrl}
                                  alt={choice.name}
                                  className="w-9 h-9 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                />
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate font-semibold">{choice.name}</span>
                                  {choice.isRecommended && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase">
                                      Recomendado
                                    </span>
                                  )}
                                  {freeQty > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black">
                                      {freeQty} Gratis
                                    </span>
                                  )}
                                  {hasNested && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] font-black inline-flex items-center gap-0.5">
                                      <Layers className="w-2.5 h-2.5" aria-hidden="true" />
                                      {choice.nestedChoices!.length} sub-opc.
                                    </span>
                                  )}
                                </div>
                                {choice.description && (
                                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                    {choice.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {!choice.hidePrice && (
                                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                  {choice.priceDelta > 0 ? `+S/ ${choice.priceDelta.toFixed(2)}` : 'Incluido'}
                                </span>
                              )}

                              {isMultiple && (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    disabled={qty <= 0}
                                    onClick={() => handleUpdateChoiceQty(group, choice, -1)}
                                    aria-label={`Disminuir ${choice.name}`}
                                    className="w-7 h-7 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center disabled:opacity-30"
                                  >
                                    <Minus className="w-3 h-3" aria-hidden="true" />
                                  </button>
                                  <span className="w-5 text-center font-black text-xs">{qty}</span>
                                  <button
                                    type="button"
                                    disabled={isChoiceAtMax}
                                    onClick={() => handleUpdateChoiceQty(group, choice, 1)}
                                    aria-label={`Aumentar ${choice.name}`}
                                    className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-black disabled:opacity-30"
                                  >
                                    <Plus className="w-3 h-3" aria-hidden="true" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Nested Sub-extras Drawer */}
                          {isSelected && hasNested && (
                            <div className="ml-4 sm:ml-6 p-3 rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                  Sub-opciones de {choice.name}
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
                                {choice.nestedChoices!.map((nest) => {
                                  const isNestMultiple = !!nest.isMultiple;
                                  const nestQty = isNestMultiple
                                    ? nestedChoiceQuantities[getNestedKey(choice.id, nest.id)] || 0
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
                                            ? 'border-rose-500 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                                            : isNestDisabled
                                            ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-zinc-400 opacity-45 cursor-not-allowed'
                                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          {nest.imageUrl && (
                                            <img
                                              src={nest.imageUrl}
                                              alt={nest.name}
                                              className="w-7 h-7 rounded-lg object-cover shrink-0"
                                            />
                                          )}
                                          <div className="min-w-0">
                                            <span className="block truncate">{nest.name}</span>
                                            {nest.priceDelta > 0 && !nest.hidePrice && (
                                              <span className="font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                                                +S/ {nest.priceDelta.toFixed(2)} c/u
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div
                                          className="flex items-center gap-1 shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            disabled={nestQty <= 0}
                                            onClick={() => handleUpdateNestedQty(choice, nest, -1)}
                                            aria-label={`Disminuir ${nest.name}`}
                                            className="w-6 h-6 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center font-black disabled:opacity-25"
                                          >
                                            <Minus className="w-3 h-3" aria-hidden="true" />
                                          </button>
                                          <span className="w-5 text-center font-black text-xs">{nestQty}</span>
                                          <button
                                            type="button"
                                            disabled={isNestAtMax}
                                            onClick={() => handleUpdateNestedQty(choice, nest, 1)}
                                            aria-label={`Aumentar ${nest.name}`}
                                            className="w-6 h-6 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center font-black disabled:opacity-25"
                                          >
                                            <Plus className="w-3 h-3" aria-hidden="true" />
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
                                      onClick={() =>
                                        handleToggleNestedChoice(
                                          choice,
                                          nest.id,
                                          maxSubLimit,
                                          totalNestedSelected
                                        )
                                      }
                                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                                        isNestSelected
                                          ? 'border-rose-500 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                                          : isNestDisabled
                                          ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 text-zinc-400 opacity-45 cursor-not-allowed'
                                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {nest.imageUrl && (
                                          <img
                                            src={nest.imageUrl}
                                            alt={nest.name}
                                            className="w-6 h-6 rounded-md object-cover shrink-0"
                                          />
                                        )}
                                        <span className="truncate">{nest.name}</span>
                                      </div>
                                      {nest.priceDelta > 0 && !nest.hidePrice && (
                                        <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                          +S/ {nest.priceDelta.toFixed(2)}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* 3. Extras & Modifiers (with quantity & conditionalRule pricing) */}
            {enabledExtras.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" /> Extras & Adicionales
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Suma al total</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {enabledExtras.map((extra) => {
                    const qty = extraQuantities[extra.id] || 0;
                    const isChecked = qty > 0;
                    const effectivePrice = getEffectiveExtraUnitPrice(extra, Math.max(1, qty));
                    const isDiscountActive = Boolean(
                      extra.conditionalRule && qty >= extra.conditionalRule.minQty
                    );

                    return (
                      <div
                        key={extra.id}
                        onClick={() => {
                          if (!extra.conditionalRule || qty === 0) {
                            handleToggleExtra(extra.id);
                          }
                        }}
                        className={`min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition-all text-left cursor-pointer ${
                          isChecked
                            ? 'border-amber-500 bg-amber-500/15 text-zinc-950 dark:text-white ring-1 ring-amber-500/30 font-semibold'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 mr-2">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'border-amber-500 bg-amber-500 text-zinc-950'
                                : 'border-zinc-400 dark:border-zinc-600'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
                          </div>

                          {extra.imageUrl && (
                            <img
                              src={extra.imageUrl}
                              alt={extra.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                            />
                          )}

                          <div className="min-w-0">
                            <span className="truncate block font-bold">{extra.name}</span>
                            {extra.isIncluded && (
                              <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                                ✓ Incluido por defecto
                              </span>
                            )}
                            {extra.conditionalRule && !extra.isIncluded && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                                Desde {extra.conditionalRule.minQty}u: S/{' '}
                                {extra.conditionalRule.discountedPrice.toFixed(2)} c/u
                              </span>
                            )}
                          </div>
                        </div>

                        {extra.conditionalRule && isChecked ? (
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateExtraQty(extra.id, -1)}
                              aria-label={`Disminuir ${extra.name}`}
                              className="w-6 h-6 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <span className="w-5 text-center font-black text-xs">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateExtraQty(extra.id, 1)}
                              aria-label={`Aumentar ${extra.name}`}
                              className="w-6 h-6 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-black"
                            >
                              <Plus className="w-3 h-3" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-xs font-bold shrink-0 ${
                              extra.isIncluded
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full'
                                : isDiscountActive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {extra.isIncluded ? 'Incluido' : `+S/ ${effectivePrice.toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor={notesId} className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                Instrucciones Especiales para Cocina / Horno
              </label>
              <textarea
                id={notesId}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Sin orégano, bien crocante, cortar en porciones pequeñas..."
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Validation hint if incomplete */}
          {!selectionValidation.valid && selectionValidation.reason && (
            <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{selectionValidation.reason}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-3">
            <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-1 shrink-0">
              <button
                type="button"
                aria-label="Disminuir cantidad"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="h-10 w-10 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="w-9 text-center font-bold text-sm text-zinc-900 dark:text-white">{quantity}</span>
              <button
                type="button"
                aria-label="Aumentar cantidad"
                onClick={() => setQuantity((q) => q + 1)}
                className="h-10 w-10 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectionValidation.valid}
              className="flex-1 min-h-[48px] whitespace-nowrap shrink-0 px-5 py-3 rounded-xl font-bold text-sm sm:text-base bg-amber-500 hover:bg-amber-400 disabled:opacity-45 disabled:cursor-not-allowed text-zinc-950 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-between gap-3"
            >
              <span>{mode === 'pos' ? 'Agregar a Comanda' : 'Agregar a la Orden'}</span>
              <span className="text-zinc-950 font-black tracking-tight">
                S/ {totalPrice.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
};
