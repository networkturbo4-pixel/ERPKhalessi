import {
  resolveRecipeLines,
  explodeOrderItem,
  allocateFEFO,
  calculateWeightedAvgCost,
  calculateRecipeCostAndMargin,
  calculateReplenishmentSuggestion,
  categorizeExpiringLots,
} from '../src/utils/inventoryEngine.ts';

console.log('🧪 Iniciando verificación del motor de Inventario y Recetas...');

// Test 1: Recipe inheritance & scaling
const mockRecipes = [
  {
    id: 'rec-fam',
    productId: 'pizza-margherita',
    sizeId: 'familiar',
    lines: [
      { itemId: 'harina', quantity: 400, critical: true },
      { itemId: 'queso', quantity: 200, critical: true },
    ],
  },
  {
    id: 'rec-pers',
    productId: 'pizza-margherita',
    sizeId: 'personal',
    inheritFromSizeId: 'familiar',
    scaleFactor: 0.5,
    lines: [],
  },
];

const resolved = resolveRecipeLines(mockRecipes, 'pizza-margherita', 'personal');
if (resolved.length !== 2 || resolved[0].quantity !== 200 || resolved[1].quantity !== 100) {
  throw new Error(`Test 1 falló: ${JSON.stringify(resolved)}`);
}
console.log('✅ Test 1 Superado: Heredar y Escalar calcula factores exactos.');

// Test 2: FEFO lot allocation
const mockLots = [
  { id: 'l1', itemId: 'queso', tenantId: 't1', quantity: 5, unitCost: 10, producedAt: '2026-11-01', expiresAt: '2026-11-20', source: 'compra' },
  { id: 'l2', itemId: 'queso', tenantId: 't1', quantity: 10, unitCost: 12, producedAt: '2026-11-05', expiresAt: '2026-11-15', source: 'compra' },
];

const allocation = allocateFEFO(mockLots, 8);
// l2 expires on Nov 15 (earlier), so all 8 should come from l2
if (allocation.allocations.length !== 1 || allocation.allocations[0].lot.id !== 'l2' || allocation.allocations[0].consumed !== 8) {
  throw new Error(`Test 2 falló: ${JSON.stringify(allocation)}`);
}
console.log('✅ Test 2 Superado: Asignación FEFO prioriza lote que vence primero.');

// Test 3: Weighted average cost
const newAvgCost = calculateWeightedAvgCost(10, 20, 10, 30);
if (newAvgCost !== 25) {
  throw new Error(`Test 3 falló: Esperado 25, recibido ${newAvgCost}`);
}
console.log('✅ Test 3 Superado: Costo promedio ponderado matemático correcto.');

console.log('🎉 Todos los tests del motor pasaron exitosamente.');
