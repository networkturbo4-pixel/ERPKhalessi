import {
  ApparelConfig,
  ApparelVariantItem,
  ExtraModifier,
  Product,
  ProductSizeConfig,
  SubOptionChoice,
} from '../types/catalog';

/**
 * Determina si el producto está disponible en una sucursal específica.
 * Si la sucursal tiene un override de `isAvailable`, se respeta; de lo contrario usa `product.isAvailable`.
 */
export function resolveProductAvailability(product: Product, tenantId?: string): boolean {
  if (!product.isAvailable) return false;
  if (!tenantId) return product.isAvailable;
  const override = product.branchPrices?.[tenantId];
  if (override && typeof override.isAvailable === 'boolean') {
    return override.isAvailable;
  }
  return product.isAvailable;
}

/**
 * Indica si un producto tiene algún precio personalizado en la sucursal dada.
 */
export function hasBranchPriceOverride(product: Product, tenantId?: string): boolean {
  if (!tenantId) return false;
  const override = product.branchPrices?.[tenantId];
  if (!override) return false;
  return (
    typeof override.basePrice === 'number' ||
    typeof override.compareAtPrice === 'number' ||
    (override.sizePrices ? Object.keys(override.sizePrices).length > 0 : false)
  );
}

/**
 * Resuelve el precio base de un producto para una sucursal específica.
 */
export function resolveProductBasePrice(product: Product, tenantId?: string): number {
  if (tenantId) {
    const override = product.branchPrices?.[tenantId];
    if (override && typeof override.basePrice === 'number' && !Number.isNaN(override.basePrice)) {
      return override.basePrice;
    }
  }
  return product.basePrice;
}

/**
 * Resuelve el precio comparativo ("antes") de un producto para una sucursal específica.
 */
export function resolveProductCompareAtPrice(product: Product, tenantId?: string): number | undefined {
  if (tenantId) {
    const override = product.branchPrices?.[tenantId];
    if (override && typeof override.compareAtPrice === 'number' && !Number.isNaN(override.compareAtPrice)) {
      return override.compareAtPrice;
    }
  }
  return product.compareAtPrice;
}

/**
 * Resuelve el precio de un tamaño específico para una sucursal.
 */
export function resolveSizePrice(
  product: Product,
  size: Pick<ProductSizeConfig, 'id' | 'price'>,
  tenantId?: string
): number {
  if (tenantId) {
    const overridePrice = product.branchPrices?.[tenantId]?.sizePrices?.[size.id];
    if (typeof overridePrice === 'number' && !Number.isNaN(overridePrice)) {
      return overridePrice;
    }
  }
  return size.price;
}

/**
 * Resuelve el precio principal a mostrar en tarjetas de catálogo/POS/tienda para una sucursal.
 * Si el producto tiene tamaños (y no es tipo ropa), toma el precio del tamaño por defecto o el menor habilitado.
 */
export function resolveProductDisplayPrice(product: Product, tenantId?: string): number {
  if (product.productType !== 'apparel' && product.hasSizes && product.sizes && product.sizes.length > 0) {
    const enabledSizes = product.sizes.filter((s) => s.enabled);
    const list = enabledSizes.length > 0 ? enabledSizes : product.sizes;
    const defaultSize = list.find((s) => s.isDefault) || list[0];
    if (defaultSize) {
      return resolveSizePrice(product, defaultSize, tenantId);
    }
  }
  return resolveProductBasePrice(product, tenantId);
}

/**
 * Resuelve el incremento de precio (`priceDelta`) de una sub-opción para una sucursal.
 * Activa el flag `storePricesEnabled` cuando `branchPriceDeltas[tenantId]` está definido.
 */
export function resolveSubOptionPriceDelta(choice: SubOptionChoice, tenantId?: string): number {
  if (choice.storePricesEnabled && tenantId && choice.branchPriceDeltas) {
    const branchDelta = choice.branchPriceDeltas[tenantId];
    if (typeof branchDelta === 'number' && !Number.isNaN(branchDelta)) {
      return branchDelta;
    }
  }
  return choice.priceDelta || 0;
}

/**
 * Resuelve el precio unitario efectivo de un adicional (`ExtraModifier`) considerando
 * inclusión, regla condicional por cantidad y posible override por sucursal.
 */
export function resolveExtraPrice(
  product: Product,
  extra: ExtraModifier,
  qty: number,
  tenantId?: string
): number {
  if (extra.isIncluded || qty <= 0) return 0;
  if (extra.conditionalRule && qty >= extra.conditionalRule.minQty) {
    return extra.conditionalRule.discountedPrice;
  }
  if (tenantId) {
    const branchExtraPrice = product.branchPrices?.[tenantId]?.extraPrices?.[extra.id];
    if (typeof branchExtraPrice === 'number' && !Number.isNaN(branchExtraPrice)) {
      return branchExtraPrice;
    }
  }
  return extra.price;
}

/**
 * Busca la variante exacta en la matriz de ropa según talla, color y modelo seleccionados.
 */
export function findMatchingApparelVariant(
  apparelConfig: ApparelConfig | undefined,
  sizeId?: string,
  colorId?: string,
  modelId?: string
): ApparelVariantItem | undefined {
  if (!apparelConfig || !apparelConfig.variants || apparelConfig.variants.length === 0) {
    return undefined;
  }
  return apparelConfig.variants.find((v) => {
    const matchSize = !sizeId || !v.sizeId || v.sizeId === sizeId;
    const matchColor = !colorId || !v.colorId || v.colorId === colorId;
    const matchModel = !modelId || !v.modelId || v.modelId === modelId;
    return matchSize && matchColor && matchModel;
  });
}

/**
 * Obtiene el stock disponible de una variante de ropa para una sucursal.
 * Si no hay stock por sucursal definido, devuelve `undefined` (stock ilimitado / no restringido).
 */
export function resolveApparelVariantStock(
  variant: ApparelVariantItem | undefined,
  tenantId?: string
): number | undefined {
  if (!variant || !variant.stockByBranch) return undefined;
  if (tenantId && typeof variant.stockByBranch[tenantId] === 'number') {
    return variant.stockByBranch[tenantId];
  }
  const values = Object.values(variant.stockByBranch);
  if (values.length === 0) return undefined;
  return values.reduce((sum, n) => sum + (Number(n) || 0), 0);
}

/**
 * Calcula el precio unitario final de un producto tipo Ropa (`apparel`) en una sucursal,
 * combinando precio de variante (o base de sucursal), deltas de talla/color/modelo y extras textiles.
 */
export function resolveApparelUnitPrice(
  product: Product,
  tenantId: string | undefined,
  selection: {
    sizeId?: string;
    colorId?: string;
    modelId?: string;
    giftWrap?: boolean;
    customPrint?: boolean;
  }
): number {
  const cfg = product.apparelConfig;
  const variant = findMatchingApparelVariant(cfg, selection.sizeId, selection.colorId, selection.modelId);

  let base = resolveProductBasePrice(product, tenantId);
  if (variant && typeof variant.priceOverride === 'number' && !Number.isNaN(variant.priceOverride) && variant.priceOverride > 0) {
    base = variant.priceOverride;
  } else if (cfg) {
    const sizeDelta = cfg.sizes.find((s) => s.id === selection.sizeId)?.priceDelta || 0;
    const colorDelta = cfg.colors.find((c) => c.id === selection.colorId)?.priceDelta || 0;
    const modelDelta = cfg.models.find((m) => m.id === selection.modelId)?.priceDelta || 0;
    base += sizeDelta + colorDelta + modelDelta;
  }

  if (cfg) {
    if (selection.giftWrap && cfg.giftWrapPrice) base += cfg.giftWrapPrice;
    if (selection.customPrint && cfg.customPrintPrice) base += cfg.customPrintPrice;
  }

  return Math.max(0, Number(base.toFixed(2)));
}
