import type {
  InventoryItem,
  Recipe,
  RecipeLine,
  InventoryLot,
  UnitOfMeasure,
  StockLevel,
  StockMovement,
} from '../types/inventory';
import type { OrderItem, Product } from '../types/catalog';

/**
 * Standardize units if needed (e.g. g <-> kg, ml <-> l)
 */
export function convertUnit(quantity: number, from: UnitOfMeasure, to: UnitOfMeasure): number {
  if (from === to) return quantity;
  if (from === 'g' && to === 'kg') return quantity / 1000;
  if (from === 'kg' && to === 'g') return quantity * 1000;
  if (from === 'ml' && to === 'l') return quantity / 1000;
  if (from === 'l' && to === 'ml') return quantity * 1000;
  return quantity;
}

/**
 * Resolves the effective recipe lines for a product & size,
 * handling "inheritFromSizeId" + "scaleFactor".
 */
export function resolveRecipeLines(
  recipes: Recipe[],
  productId: string,
  sizeId?: string
): RecipeLine[] {
  // 1. Direct match for product + sizeId
  const direct = recipes.find(r => r.productId === productId && (r.sizeId || '') === (sizeId || ''));
  if (direct) {
    if (direct.inheritFromSizeId && direct.scaleFactor && direct.inheritFromSizeId !== direct.sizeId) {
      // Find base recipe
      const base = recipes.find(r => r.productId === productId && r.sizeId === direct.inheritFromSizeId);
      if (base) {
        // Multiply base lines by scale factor, merging with any overrides
        const scaledBase: RecipeLine[] = base.lines.map(line => ({
          itemId: line.itemId,
          quantity: Math.round(line.quantity * (direct.scaleFactor || 1) * 100) / 100,
          critical: line.critical ?? true,
        }));

        // Merge any direct lines as overrides/additions
        const mergedMap = new Map<string, RecipeLine>();
        scaledBase.forEach(l => mergedMap.set(l.itemId, { ...l }));
        direct.lines.forEach(l => mergedMap.set(l.itemId, { ...l }));
        return Array.from(mergedMap.values());
      }
    }
    return direct.lines;
  }

  // 2. Fallback: match product with no size specified
  const generic = recipes.find(r => r.productId === productId && !r.sizeId && !r.extraId && !r.optionChoiceId);
  return generic ? generic.lines : [];
}

/**
 * Explodes an OrderItem into all required inventory consumptions,
 * considering pizza sizes, half and half, sub-options and extras.
 */
export function explodeOrderItem(
  orderItem: OrderItem,
  recipes: Recipe[]
): { itemId: string; quantity: number }[] {
  const result: { itemId: string; quantity: number }[] = [];
  const qty = orderItem.quantity || 1;

  const accumulate = (itemId: string, amount: number) => {
    const existing = result.find(r => r.itemId === itemId);
    if (existing) {
      existing.quantity += amount;
    } else {
      result.push({ itemId, quantity: amount });
    }
  };

  // 1. Base Product or Half & Half
  if (orderItem.halfAndHalf) {
    // 50% first half + 50% second half
    const half1Lines = resolveRecipeLines(recipes, orderItem.halfAndHalf.firstHalfId, orderItem.size?.id);
    const half2Lines = resolveRecipeLines(recipes, orderItem.halfAndHalf.secondHalfId, orderItem.size?.id);

    half1Lines.forEach(l => accumulate(l.itemId, l.quantity * 0.5 * qty));
    half2Lines.forEach(l => accumulate(l.itemId, l.quantity * 0.5 * qty));
  } else {
    const baseLines = resolveRecipeLines(recipes, orderItem.productId, orderItem.size?.id);
    baseLines.forEach(l => accumulate(l.itemId, l.quantity * qty));
  }

  // 2. Sub-options choices (e.g. tipo de masa, salsa especial)
  if (orderItem.subOptions && orderItem.subOptions.length > 0) {
    orderItem.subOptions.forEach(opt => {
      const optRecipe = recipes.find(r => r.optionChoiceId === opt.choiceId);
      if (optRecipe) {
        const factor = (opt.quantity || 1) * qty;
        optRecipe.lines.forEach(l => accumulate(l.itemId, l.quantity * factor));
      }
    });
  }

  // 3. Extras / Modifiers (e.g. Queso Extra, Borde de Queso)
  if (orderItem.extras && orderItem.extras.length > 0) {
    orderItem.extras.forEach(extra => {
      const extraRecipe = recipes.find(r => r.extraId === extra.id);
      if (extraRecipe) {
        const factor = (extra.quantity || 1) * qty;
        extraRecipe.lines.forEach(l => accumulate(l.itemId, l.quantity * factor));
      }
    });
  }

  return result;
}

/**
 * FEFO Lot Allocation:
 * Allocates requested quantity across active lots sorted by earliest expiry date.
 * If total lot quantity is insufficient, remainder is reported.
 */
export function allocateFEFO(
  lots: InventoryLot[],
  requiredQty: number
): {
  allocations: { lot: InventoryLot; consumed: number }[];
  unallocatedQty: number;
} {
  // Sort lots by expiration date ascending (null/no-expiry goes last)
  const sorted = [...lots].sort((a, b) => {
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
  });

  const allocations: { lot: InventoryLot; consumed: number }[] = [];
  let remaining = requiredQty;

  for (const lot of sorted) {
    if (remaining <= 0) break;
    if (lot.quantity <= 0) continue;

    const take = Math.min(lot.quantity, remaining);
    allocations.push({ lot, consumed: take });
    remaining -= take;
  }

  return {
    allocations,
    unallocatedQty: Math.max(0, remaining),
  };
}

/**
 * Weighted Average Cost (Costo Promedio Ponderado)
 */
export function calculateWeightedAvgCost(
  currentStock: number,
  currentAvgCost: number,
  addedQty: number,
  addedUnitCost: number
): number {
  if (currentStock + addedQty <= 0) return addedUnitCost > 0 ? addedUnitCost : currentAvgCost;
  const totalValue = (Math.max(0, currentStock) * currentAvgCost) + (addedQty * addedUnitCost);
  const totalQty = Math.max(0, currentStock) + addedQty;
  return Math.round((totalValue / totalQty) * 1000) / 1000;
}

/**
 * Calculates Recipe Cost and Gross Margin %
 */
export function calculateRecipeCostAndMargin(
  lines: RecipeLine[],
  items: InventoryItem[],
  stockLevels: StockLevel[],
  tenantId: string,
  sellingPrice: number
): { totalCost: number; marginPct: number; isUnderThreshold: boolean } {
  let totalCost = 0;

  for (const line of lines) {
    const item = items.find(i => i.id === line.itemId);
    if (!item) continue;
    const stock = stockLevels.find(s => s.itemId === line.itemId && s.tenantId === tenantId);
    const unitCost = stock?.avgCost || item.costPerUnit || 0;
    totalCost += line.quantity * unitCost;
  }

  totalCost = Math.round(totalCost * 100) / 100;
  const marginPct = sellingPrice > 0 ? Math.round(((sellingPrice - totalCost) / sellingPrice) * 100) : 0;

  return {
    totalCost,
    marginPct,
    isUnderThreshold: marginPct < 60,
  };
}

/**
 * Suggests Replenishment Quantity based on historical consumption
 */
export function calculateReplenishmentSuggestion(
  movements: StockMovement[],
  currentStock: number,
  minStock: number,
  leadDays: number,
  windowDays: 7 | 14 | 30 = 14
): { dailyConsumption: number; suggestedQty: number } {
  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const relevantMovements = movements.filter(m => {
    const time = new Date(m.createdAt).getTime();
    return (now - time) <= windowMs && (m.type === 'consumo' || m.type === 'produccion_out' || m.type === 'merma');
  });

  const totalConsumed = relevantMovements.reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  const dailyConsumption = Math.round((totalConsumed / windowDays) * 100) / 100;

  // Buffer target = (daily consumption * (leadDays + 3 days coverage buffer)) + minStock
  const targetStock = (dailyConsumption * (leadDays + 3)) + minStock;
  const deficit = targetStock - currentStock;
  const suggestedQty = deficit > 0 ? Math.ceil(deficit) : 0;

  return {
    dailyConsumption,
    suggestedQty,
  };
}

/**
 * Filter lots near expiration (FEFO alerts for 3, 2, 1 days or expired)
 */
export function categorizeExpiringLots(
  lots: InventoryLot[]
): {
  expired: InventoryLot[];
  today: InventoryLot[];
  in1Day: InventoryLot[];
  in2Days: InventoryLot[];
  in3Days: InventoryLot[];
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const oneDayMs = 24 * 60 * 60 * 1000;

  const result = {
    expired: [] as InventoryLot[],
    today: [] as InventoryLot[],
    in1Day: [] as InventoryLot[],
    in2Days: [] as InventoryLot[],
    in3Days: [] as InventoryLot[],
  };

  lots.forEach(lot => {
    if (!lot.expiresAt || lot.quantity <= 0) return;
    const expDate = new Date(lot.expiresAt);
    expDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((expDate.getTime() - now.getTime()) / oneDayMs);

    if (diffDays < 0) result.expired.push(lot);
    else if (diffDays === 0) result.today.push(lot);
    else if (diffDays === 1) result.in1Day.push(lot);
    else if (diffDays === 2) result.in2Days.push(lot);
    else if (diffDays === 3) result.in3Days.push(lot);
  });

  return result;
}

/**
 * Computes availability of products based on critical ingredient stock levels
 */
export function checkProductsStockAvailability(
  products: Product[],
  recipes: Recipe[],
  stockLevels: StockLevel[],
  tenantId: string
): { unavailableProductIds: string[]; missingIngredientsByProduct: Record<string, string[]> } {
  const unavailableProductIds: string[] = [];
  const missingIngredientsByProduct: Record<string, string[]> = {};

  for (const product of products) {
    // Check base recipe (or any size direct lines)
    const productRecipes = recipes.filter(r => r.productId === product.id);
    if (productRecipes.length === 0) continue; // No recipe defined, assume available

    const missingNames: string[] = [];

    for (const r of productRecipes) {
      for (const line of r.lines) {
        if (line.critical === false) continue; // Non-critical doesn't block product

        const stock = stockLevels.find(s => s.itemId === line.itemId && s.tenantId === tenantId);
        const availableQty = stock ? stock.quantity : 0;

        if (availableQty < line.quantity) {
          missingNames.push(line.itemId);
        }
      }
    }

    if (missingNames.length > 0) {
      unavailableProductIds.push(product.id);
      missingIngredientsByProduct[product.id] = Array.from(new Set(missingNames));
    }
  }

  return { unavailableProductIds, missingIngredientsByProduct };
}
