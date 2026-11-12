import React, { useState, useEffect, useRef, useId } from 'react';
import { Product, ProductSizeConfig, OrderItem, CartSubOptionSelection, CartExtra } from '../../types/catalog';
import { X, Plus, Minus, Check, Pizza, Sparkles, ChefHat } from 'lucide-react';

interface ProductCustomizerModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: OrderItem) => void;
  mode?: 'storefront' | 'pos';
}

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

  const [selectedSize, setSelectedSize] = useState<ProductSizeConfig | null>(null);
  const [selectedSubOptions, setSelectedSubOptions] = useState<Record<string, string>>({});
  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>({});
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

    if (product.hasSizes && product.sizes.length > 0) {
      const defaultSize =
        product.sizes.find((s) => s.isDefault && s.enabled) ||
        product.sizes.find((s) => s.enabled) ||
        product.sizes[0];
      setSelectedSize(defaultSize);
    } else {
      setSelectedSize(null);
    }

    const initialSubs: Record<string, string> = {};
    product.subOptions.forEach((group) => {
      if (group.enabled && group.choices.length > 0) {
        const def = group.choices.find((c) => c.isDefault) || group.choices[0];
        if (def) initialSubs[group.id] = def.id;
      }
    });
    setSelectedSubOptions(initialSubs);

    const initialExtras: Record<string, boolean> = {};
    (product.allowedExtras || []).forEach((ext) => {
      if (ext.enabled && ext.isIncluded) {
        initialExtras[ext.id] = true;
      }
    });
    setSelectedExtras(initialExtras);
    setNotes('');
    setQuantity(1);
  }, [product, isOpen]);

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

  const basePrice = product ? (selectedSize ? selectedSize.price : product.basePrice) : 0;

  let subOptionsDelta = 0;
  if (product) {
    product.subOptions.forEach((group) => {
      const choiceId = selectedSubOptions[group.id];
      if (choiceId) {
        const choice = group.choices.find((c) => c.id === choiceId);
        if (choice) subOptionsDelta += choice.priceDelta;
      }
    });
  }

  let extrasTotal = 0;
  if (product) {
    product.allowedExtras.forEach((extra) => {
      if (extra.enabled && selectedExtras[extra.id]) {
        extrasTotal += extra.isIncluded ? 0 : extra.price;
      }
    });
  }

  const unitPrice = basePrice + subOptionsDelta + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const handleToggleExtra = (extraId: string) => {
    setSelectedExtras((prev) => ({
      ...prev,
      [extraId]: !prev[extraId],
    }));
  };

  const handleSelectSubOption = (groupId: string, choiceId: string) => {
    setSelectedSubOptions((prev) => ({
      ...prev,
      [groupId]: choiceId,
    }));
  };

  const handleAdd = () => {
    if (!product) return;
    const subOptionsList: CartSubOptionSelection[] = [];
    product.subOptions.forEach((group) => {
      const choiceId = selectedSubOptions[group.id];
      const choice = group.choices.find((c) => c.id === choiceId);
      if (choice) {
        subOptionsList.push({
          groupId: group.id,
          groupName: group.name,
          choiceId: choice.id,
          choiceName: choice.name,
          priceDelta: choice.priceDelta,
        });
      }
    });

    const extrasList: CartExtra[] = [];
    product.allowedExtras.forEach((extra) => {
      if (extra.enabled && selectedExtras[extra.id]) {
        extrasList.push({
          id: extra.id,
          name: extra.name,
          price: extra.isIncluded ? 0 : extra.price,
          quantity: 1,
        });
      }
    });

    const item: OrderItem = {
      itemId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      size: selectedSize
        ? {
            id: selectedSize.id,
            name: selectedSize.name,
            slices: selectedSize.slices,
            price: selectedSize.price,
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

            {/* 2. Sub-options */}
            {product.subOptions
              .filter((group) => group.enabled)
              .map((group) => (
                <div key={group.id} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <ChefHat className="w-4 h-4 text-amber-500" aria-hidden="true" /> {group.name}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {group.required ? 'Elige 1' : 'Opcional'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.choices.map((choice) => {
                      const isSelected = selectedSubOptions[group.id] === choice.id;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handleSelectSubOption(group.id, choice.id)}
                          className={`min-h-[48px] w-full flex items-center justify-between px-3.5 py-3 rounded-xl border text-sm transition-all active:scale-[0.99] ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/10 text-zinc-950 dark:text-white font-semibold ring-1 ring-amber-500/40'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-amber-500 bg-amber-500' : 'border-zinc-400 dark:border-zinc-600'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white dark:bg-zinc-950" />}
                            </div>
                            <span className="truncate">{choice.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 ml-2">
                            {choice.priceDelta > 0 ? `+S/ ${choice.priceDelta.toFixed(2)}` : 'Incluido'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* 3. Extras & Modifiers */}
            {product.allowedExtras.filter((e) => e.enabled).length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" /> Extras & Adicionales
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Suma al total</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.allowedExtras
                    .filter((e) => e.enabled)
                    .map((extra) => {
                      const isChecked = !!selectedExtras[extra.id];
                      return (
                        <button
                          key={extra.id}
                          type="button"
                          onClick={() => handleToggleExtra(extra.id)}
                          className={`min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition-all text-left active:scale-[0.98] ${
                            isChecked
                              ? 'border-amber-500 bg-amber-500/15 text-zinc-950 dark:text-white ring-1 ring-amber-500/30 font-semibold'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 mr-2">
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                isChecked ? 'border-amber-500 bg-amber-500 text-zinc-950' : 'border-zinc-400 dark:border-zinc-600'
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
                            </div>
                          </div>

                          <span
                            className={`text-xs font-bold shrink-0 ${
                              extra.isIncluded
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {extra.isIncluded ? 'Incluido' : `+S/ ${extra.price.toFixed(2)}`}
                          </span>
                        </button>
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
              className="flex-1 min-h-[48px] whitespace-nowrap shrink-0 px-5 py-3 rounded-xl font-bold text-sm sm:text-base bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-between gap-3"
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
