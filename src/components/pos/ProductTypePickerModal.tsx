import React, { useEffect, useState } from 'react';
import { UtensilsCrossed, Shirt, Pizza, X, Layers, ArrowRight, Check } from 'lucide-react';
import { ProductType } from '../../types/catalog';

export interface TemplateSummaryItem {
  id: string;
  name: string;
  sizesCount: number;
  subOptionsCount: number;
  extrasCount: number;
}

interface ProductTypePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: ProductType, templateId?: string) => void;
  templates: TemplateSummaryItem[];
  primaryColor: string;
}

const PRODUCT_TYPE_CARDS: Array<{
  type: ProductType;
  shortcut: string;
  title: string;
  subtitle: string;
  highlights: string[];
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'standard',
    shortcut: '1',
    title: 'Producto Extra',
    subtitle: 'Platos, bebidas, combos, entradas o pizzas tradicionales.',
    highlights: ['Precio único o múltiples tamaños', 'Sub-opciones (masas, salsas, toppings)', 'Adicionales con foto y reglas'],
    icon: UtensilsCrossed,
  },
  {
    type: 'apparel',
    shortcut: '2',
    title: 'Producto Ropa',
    subtitle: 'Prendas, merch y artículos retail con inventario por variante.',
    highlights: ['Tallas, colores con foto y modelos', 'Ficha técnica textil (marca, tela, línea)', 'Matriz de variantes SKU y stock por sede'],
    icon: Shirt,
  },
  {
    type: 'half_and_half',
    shortcut: '3',
    title: 'Pizza Mitad y Mitad',
    subtitle: 'Pizza combinable de 2 sabores con tamaños por cortes.',
    highlights: ['Tamaños listos (4, 6, 8 y 12 cortes)', 'Selección de 2 sabores en POS y tienda', 'Masas, bordes y adicionales compatibles'],
    icon: Pizza,
  },
];

export const ProductTypePickerModal: React.FC<ProductTypePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
  templates,
  primaryColor,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [hoveredType, setHoveredType] = useState<ProductType | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === '1') {
        e.preventDefault();
        onSelectType('standard', selectedTemplateId || undefined);
      } else if (e.key === '2') {
        e.preventDefault();
        onSelectType('apparel');
      } else if (e.key === '3') {
        e.preventDefault();
        onSelectType('half_and_half', selectedTemplateId || undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelectType, selectedTemplateId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/55 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-type-picker-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3
              id="product-type-picker-title"
              className="text-base sm:text-lg font-semibold tracking-tight text-zinc-950 dark:text-white"
            >
              Elige el tipo de producto
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Adaptaremos el formulario para que solo veas los campos necesarios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Type Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {PRODUCT_TYPE_CARDS.map((card) => {
            const Icon = card.icon;
            const isHovered = hoveredType === card.type;
            return (
              <button
                key={card.type}
                type="button"
                onMouseEnter={() => setHoveredType(card.type)}
                onMouseLeave={() => setHoveredType(null)}
                onClick={() =>
                  onSelectType(
                    card.type,
                    card.type === 'apparel' ? undefined : selectedTemplateId || undefined
                  )
                }
                className="group text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] flex flex-col justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                style={{
                  borderColor: isHovered ? primaryColor : undefined,
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 transition-colors"
                      style={
                        isHovered
                          ? { backgroundColor: primaryColor, color: '#ffffff', borderColor: primaryColor }
                          : undefined
                      }
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <kbd className="hidden sm:inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-mono font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400">
                      {card.shortcut}
                    </kbd>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-zinc-950 dark:text-white leading-snug">
                      {card.title}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {card.subtitle}
                    </p>
                  </div>

                  <ul className="space-y-1.5 pt-1">
                    {card.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug"
                      >
                        <Check className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  style={isHovered ? { color: primaryColor } : undefined}
                >
                  <span>Crear con este formato</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Optional Template Preload Bar + Footer */}
        <div className="px-6 py-4 bg-zinc-50/80 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          {templates.length > 0 ? (
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-zinc-400"
              >
                <option value="">Sin plantilla inicial (empezar limpio)</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    Plantilla: {tpl.name} ({tpl.sizesCount} tam., {tpl.subOptionsCount} grp., {tpl.extrasCount} ext.)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Atajo rápido: pulsa <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-[10px]">1</kbd>,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-[10px]">2</kbd> o{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-[10px]">3</kbd> en tu teclado.
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors active:scale-[0.97]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
