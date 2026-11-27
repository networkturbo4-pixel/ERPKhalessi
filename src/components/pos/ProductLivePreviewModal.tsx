import React, { useEffect, useState } from 'react';
import {
  X,
  Monitor,
  Smartphone,
  LayoutPanelTop,
  Sun,
  Moon,
  Store,
  CheckCircle2,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { OrderItem, Product } from '../../types/catalog';
import { Tenant } from '../../types/settings';
import { StoreProductDetailPage } from '../store/StoreProductDetailPage';
import { ProductCustomizerModal } from '../common/ProductCustomizerModal';

interface ProductLivePreviewModalProps {
  product: Product;
  tenants: Tenant[];
  defaultTenantId?: string;
  primaryColor: string;
  onClose: () => void;
}

type PreviewViewport = 'desktop' | 'mobile' | 'pos_modal';

export const ProductLivePreviewModal: React.FC<ProductLivePreviewModalProps> = ({
  product,
  tenants,
  defaultTenantId,
  primaryColor,
  onClose,
}) => {
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [isLightTheme, setIsLightTheme] = useState<boolean>(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    defaultTenantId || tenants[0]?.id || ''
  );
  const [simulatedItems, setSimulatedItems] = useState<OrderItem[]>([]);
  const [isPosModalOpen, setIsPosModalOpen] = useState<boolean>(false);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const branchName = selectedTenant?.name || 'Sucursal Principal';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPosModalOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, isPosModalOpen]);

  const handleSimulatedAddToCart = (item: OrderItem) => {
    setSimulatedItems((prev) => [item, ...prev]);
    setIsPosModalOpen(false);
  };

  const latestItem = simulatedItems[0] || null;
  const totalSimulatedCount = simulatedItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-live-preview-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[92vh] rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Interactive Preview Toolbar */}
        <div className="px-4 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <h3
                id="product-live-preview-title"
                className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white truncate"
              >
                Vista previa real · {product.name || 'Producto sin nombre'}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Interactúa con tallas, colores, fotos, stock y precios exactamente como verá el cliente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Viewport Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setViewport('desktop');
                  setIsPosModalOpen(false);
                }}
                className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewport === 'desktop'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tienda Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewport('mobile');
                  setIsPosModalOpen(false);
                }}
                className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewport === 'mobile'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Móvil 390px</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewport('pos_modal');
                  setIsPosModalOpen(true);
                }}
                className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewport === 'pos_modal'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <LayoutPanelTop className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Modal POS</span>
              </button>
            </div>

            {/* Branch Simulator */}
            {tenants.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="bg-transparent text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none max-w-[140px]"
                  aria-label="Sucursal de prueba"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="bg-white dark:bg-zinc-900">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Theme Toggle (Storefront views) */}
            {viewport !== 'pos_modal' && (
              <button
                type="button"
                onClick={() => setIsLightTheme((v) => !v)}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                title={isLightTheme ? 'Probar en tema oscuro' : 'Probar en tema claro'}
              >
                {isLightTheme ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors active:scale-[0.97]"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

        {/* Live Canvas */}
        <div className="flex-1 overflow-y-auto flex justify-center p-0 sm:p-4">
          {viewport === 'pos_modal' ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 shadow-xs">
                <LayoutPanelTop className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Simulador de Modal POS / Kiosco
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Abre el selector nativo que usan tus cajeros en POS y tus clientes en Kiosco con los datos actuales de este producto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPosModalOpen(true)}
                className="whitespace-nowrap shrink-0 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-opacity hover:opacity-95 active:scale-[0.97]"
                style={{ backgroundColor: primaryColor }}
              >
                Abrir modal POS ahora
              </button>

              <ProductCustomizerModal
                product={product}
                isOpen={isPosModalOpen}
                onClose={() => setIsPosModalOpen(false)}
                onAddToCart={handleSimulatedAddToCart}
                mode="pos"
                previewTenantId={selectedTenantId || undefined}
              />
            </div>
          ) : (
            <div
              className={`w-full overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg transition-[max-width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                viewport === 'mobile' ? 'max-w-[390px] my-auto max-h-full' : 'max-w-full'
              } ${isLightTheme ? 'bg-white' : 'bg-zinc-950'}`}
            >
              <StoreProductDetailPage
                key={`${product.id}-${selectedTenantId}-${viewport}`}
                product={product}
                isLightTheme={isLightTheme}
                accentColor={primaryColor}
                buttonColor={primaryColor}
                buttonTextColor="#ffffff"
                autoButtonContrast={true}
                branchName={branchName}
                orderMode="delivery"
                cartCount={totalSimulatedCount}
                onBackToCatalog={onClose}
                onOpenCart={() => {}}
                onAddToCart={handleSimulatedAddToCart}
                isPreview={true}
                previewTenantId={selectedTenantId || undefined}
              />
            </div>
          )}
        </div>

        {/* Bottom Simulated OrderItem Inspector */}
        {latestItem && (
          <div className="px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                    Prueba capturada: {latestItem.quantity}× {latestItem.productName}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    Total S/ {latestItem.totalPrice.toFixed(2)} (Unit. S/ {latestItem.unitPrice.toFixed(2)})
                  </span>
                  {latestItem.apparelSelection?.variantSku && (
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
                      SKU: {latestItem.apparelSelection.variantSku}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-2 gap-y-0.5">
                  {latestItem.apparelSelection && (
                    <span>
                      {[
                        latestItem.apparelSelection.modelName,
                        latestItem.apparelSelection.colorName,
                        latestItem.apparelSelection.sizeName && `Talla ${latestItem.apparelSelection.sizeName}`,
                        latestItem.apparelSelection.giftWrap && 'Empaque regalo',
                        latestItem.apparelSelection.customPrintText &&
                          `Personalizado: "${latestItem.apparelSelection.customPrintText}"`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                  {latestItem.size && <span>Tamaño: {latestItem.size.name}</span>}
                  {latestItem.halfAndHalf && (
                    <span>
                      Mitades: {latestItem.halfAndHalf.firstHalfName} / {latestItem.halfAndHalf.secondHalfName}
                    </span>
                  )}
                  {latestItem.subOptions.length > 0 && (
                    <span>
                      Opciones: {latestItem.subOptions.map((o) => o.choiceName).join(', ')}
                    </span>
                  )}
                  {latestItem.extras.length > 0 && (
                    <span>
                      Extras: {latestItem.extras.map((e) => `${e.quantity}× ${e.name}`).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 tabular-nums">
                <ShoppingBag className="w-3 h-3" />
                <span>{totalSimulatedCount} en prueba</span>
              </span>
              <button
                type="button"
                onClick={() => setSimulatedItems([])}
                className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
