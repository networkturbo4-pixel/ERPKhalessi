import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  InventoryItem,
  StockLevel,
  StockMovement,
  InventoryLot,
  Recipe,
  Supplier,
  PurchaseOrder,
  StockTransfer,
  StockAudit,
  InventorySettings,
  MovementType,
  WasteReason,
} from '../types/inventory';
import { LabelConfig, DEFAULT_LABEL_CONFIG } from '../types/labels';
import { Order } from '../types/catalog';
import { useSettings } from './SettingsContext';
import { useRBAC } from './RBACContext';
import { registerOrderLifecycleListener } from './OrderCatalogContext';
import {
  explodeOrderItem,
  allocateFEFO,
  calculateWeightedAvgCost,
  categorizeExpiringLots,
  checkProductsStockAvailability,
} from '../utils/inventoryEngine';
import { generateSku, generateLotCode } from '../utils/barcode';

// Default seeded items for Italian Craft Pizzeria
const DEFAULT_ITEMS: InventoryItem[] = [
  {
    id: 'item-harina-00',
    sku: 'KH-HAR-001',
    barcode: '7751234500012',
    name: 'Harina de Trigo Tipo 00 Italiana (Caputo)',
    category: 'masas',
    unit: 'kg',
    costPerUnit: 6.80,
    minStock: 25,
    reorderPoint: 40,
    shelfLifeDays: 180,
    isPrepared: false,
    trackLots: true,
    supplierIds: ['sup-molino-italia'],
    enabled: true,
  },
  {
    id: 'item-fior-di-latte',
    sku: 'KH-QUE-001',
    barcode: '7751234500029',
    name: 'Queso Fior di Latte Artesanal',
    category: 'quesos',
    unit: 'kg',
    costPerUnit: 34.50,
    minStock: 10,
    reorderPoint: 20,
    shelfLifeDays: 12,
    isPrepared: false,
    trackLots: true,
    supplierIds: ['sup-lacteos-andinos'],
    enabled: true,
  },
  {
    id: 'item-salsa-san-marzano',
    sku: 'KH-SAL-001',
    barcode: '7751234500036',
    name: 'Salsa Tomate San Marzano D.O.P.',
    category: 'salsas',
    unit: 'kg',
    costPerUnit: 14.20,
    minStock: 15,
    reorderPoint: 30,
    shelfLifeDays: 30,
    isPrepared: false,
    trackLots: true,
    supplierIds: ['sup-molino-italia'],
    enabled: true,
  },
  {
    id: 'item-albahaca-fresca',
    sku: 'KH-TOP-001',
    barcode: '7751234500043',
    name: 'Albahaca Fresca Orgánica',
    category: 'toppings',
    unit: 'g',
    costPerUnit: 0.05,
    minStock: 300,
    reorderPoint: 600,
    shelfLifeDays: 5,
    isPrepared: false,
    trackLots: false,
    supplierIds: ['sup-organicos-valle'],
    enabled: true,
  },
  {
    id: 'item-pepperoni-artesanal',
    sku: 'KH-TOP-002',
    barcode: '7751234500050',
    name: 'Pepperoni Americano Ahumado',
    category: 'toppings',
    unit: 'kg',
    costPerUnit: 42.00,
    minStock: 8,
    reorderPoint: 15,
    shelfLifeDays: 45,
    isPrepared: false,
    trackLots: true,
    supplierIds: ['sup-embutidos-san-pedro'],
    enabled: true,
  },
  {
    id: 'item-masa-madre-preparada',
    sku: 'KH-PRE-001',
    barcode: '7751234500067',
    name: 'Bollos Masa Biga 48h (Preparado)',
    category: 'masas',
    unit: 'und',
    costPerUnit: 2.20,
    minStock: 30,
    reorderPoint: 60,
    shelfLifeDays: 3,
    isPrepared: true,
    trackLots: true,
    supplierIds: [],
    enabled: true,
  },
  {
    id: 'item-caja-pizza-familiar',
    sku: 'KH-EMP-001',
    barcode: '7751234500074',
    name: 'Cajas Kraft Pizza Familiar 35cm',
    category: 'empaques',
    unit: 'und',
    costPerUnit: 1.85,
    minStock: 50,
    reorderPoint: 100,
    shelfLifeDays: undefined,
    isPrepared: false,
    trackLots: false,
    supplierIds: ['sup-empaques-peru'],
    enabled: true,
  },
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-molino-italia',
    name: 'Importaciones Molino & Grani Italia S.A.C.',
    ruc: '20601984512',
    phone: '984-123-456',
    email: 'pedidos@molinoitalia.pe',
    contactPerson: 'Fabrizio Rossi',
    leadDays: 3,
    enabled: true,
  },
  {
    id: 'sup-lacteos-andinos',
    name: 'Lácteos Artesanales del Sur S.R.L.',
    ruc: '20554128963',
    phone: '951-789-321',
    email: 'ventas@lacteosandinos.pe',
    contactPerson: 'Renato Gómez',
    leadDays: 2,
    enabled: true,
  },
  {
    id: 'sup-embutidos-san-pedro',
    name: 'Frigoríficos & Embutidos San Pedro',
    ruc: '20448963251',
    phone: '976-554-123',
    email: 'contacto@sanpedrocharcuteria.pe',
    contactPerson: 'Carla Mendoza',
    leadDays: 2,
    enabled: true,
  },
  {
    id: 'sup-organicos-valle',
    name: 'Huertos & Aromáticas del Valle',
    ruc: '10458963214',
    phone: '992-334-118',
    email: 'huerto@valleorganico.pe',
    contactPerson: 'Pedro Quispe',
    leadDays: 1,
    enabled: true,
  },
  {
    id: 'sup-empaques-peru',
    name: 'Soluciones Gráficas y Empaques Perú',
    ruc: '20148965412',
    phone: '988-441-236',
    email: 'ventas@empaquesperu.com',
    leadDays: 4,
    enabled: true,
  },
];

// Seeded Recipes for catalog pizzas
const DEFAULT_RECIPES: Recipe[] = [
  // Pizza Margarita - Familiar
  {
    id: 'rec-margarita-familiar',
    productId: 'pizza-margherita',
    sizeId: 'familiar',
    lines: [
      { itemId: 'item-masa-madre-preparada', quantity: 1, critical: true },
      { itemId: 'item-salsa-san-marzano', quantity: 0.15, critical: true },
      { itemId: 'item-fior-di-latte', quantity: 0.22, critical: true },
      { itemId: 'item-albahaca-fresca', quantity: 10, critical: false },
      { itemId: 'item-caja-pizza-familiar', quantity: 1, critical: false },
    ],
    yieldNote: '1 Pizza Margarita 35cm',
  },
  // Pizza Margarita - Personal (Hereda de Familiar con escala 0.60)
  {
    id: 'rec-margarita-personal',
    productId: 'pizza-margherita',
    sizeId: 'personal',
    inheritFromSizeId: 'familiar',
    scaleFactor: 0.6,
    lines: [],
    yieldNote: 'Escala 60% sobre familiar',
  },
  // Pizza Pepperoni - Familiar
  {
    id: 'rec-pepperoni-familiar',
    productId: 'pizza-pepperoni',
    sizeId: 'familiar',
    lines: [
      { itemId: 'item-masa-madre-preparada', quantity: 1, critical: true },
      { itemId: 'item-salsa-san-marzano', quantity: 0.15, critical: true },
      { itemId: 'item-fior-di-latte', quantity: 0.20, critical: true },
      { itemId: 'item-pepperoni-artesanal', quantity: 0.12, critical: true },
      { itemId: 'item-caja-pizza-familiar', quantity: 1, critical: false },
    ],
    yieldNote: '1 Pizza Pepperoni 35cm',
  },
  // Extra: Queso Fior di Latte Extra
  {
    id: 'rec-extra-queso',
    productId: '',
    extraId: 'extra-queso',
    lines: [
      { itemId: 'item-fior-di-latte', quantity: 0.08, critical: true },
    ],
    yieldNote: 'Porción 80g queso fior di latte',
  },
];

const STORAGE_KEYS = {
  items: 'kh_inv_items_v1',
  stock: 'kh_inv_stock_v1',
  lots: 'kh_inv_lots_v1',
  movements: 'kh_inv_movements_v1',
  recipes: 'kh_inv_recipes_v1',
  suppliers: 'kh_inv_suppliers_v1',
  purchases: 'kh_inv_purchases_v1',
  transfers: 'kh_inv_transfers_v1',
  audits: 'kh_inv_audits_v1',
  settings: 'kh_inv_settings_v1',
  labels: 'kh_label_config_v1',
};

const DEFAULT_SETTINGS: InventorySettings = {
  minMarginThreshold: 60,
  replenishmentWindowDays: 14,
  expiryWarningDays: 3,
  autoMarkUnavailableOnStockout: true,
  defaultLabelPreset: '50x30',
};

interface InventoryContextType {
  items: InventoryItem[];
  stockLevels: StockLevel[];
  lots: InventoryLot[];
  movements: StockMovement[];
  recipes: Recipe[];
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  transfers: StockTransfer[];
  audits: StockAudit[];
  settings: InventorySettings;
  labelConfig: LabelConfig;

  // Stock queries
  getItemStock: (itemId: string, targetTenantId?: string) => number;
  getItemAvgCost: (itemId: string, targetTenantId?: string) => number;
  getExpiringLotsSummary: () => ReturnType<typeof categorizeExpiringLots>;

  // Insumos CRUD
  saveItem: (item: InventoryItem) => void;
  deleteItem: (itemId: string) => void;

  // Movimientos
  registerMovement: (params: {
    itemId: string;
    type: MovementType;
    quantity: number;
    unitCost?: number;
    lotId?: string;
    wasteReason?: WasteReason;
    note?: string;
    tenantId?: string;
  }) => void;

  // Lotes & Producción
  registerProductionBatch: (params: {
    preparedItemId: string;
    producedQty: number;
    shelfLifeDays?: number;
    ingredientLines: { itemId: string; qty: number }[];
    notes?: string;
  }) => InventoryLot;

  // Recetas
  saveRecipe: (recipe: Recipe) => void;
  deleteRecipe: (recipeId: string) => void;

  // Compras & Proveedores
  saveSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'number' | 'createdAt'>) => PurchaseOrder;
  updatePurchaseOrderStatus: (poId: string, status: PurchaseOrder['status']) => void;
  receivePurchaseOrder: (poId: string, receivedLines: { itemId: string; receivedQty: number; unitCost: number; expiresAt?: string }[]) => void;

  // Transferencias
  createStockTransfer: (transfer: Omit<StockTransfer, 'id' | 'number' | 'createdAt' | 'status'>) => StockTransfer;
  shipTransfer: (transferId: string) => void;
  receiveTransfer: (transferId: string, linesReceived: { itemId: string; receivedQty: number }[]) => void;

  // Auditoría
  openStockAudit: (period: string, notes?: string) => StockAudit;
  recordAuditCount: (auditId: string, itemId: string, countedQty: number, notes?: string) => void;
  closeStockAudit: (auditId: string) => void;

  // Automations & Helpers
  consumeStockForOrder: (order: Order) => boolean;
  restockCancelledOrder: (order: Order) => boolean;
  updateSettings: (patch: Partial<InventorySettings>) => void;
  updateLabelConfig: (patch: Partial<LabelConfig>) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTenant, dispatchToast } = useSettings();
  const { currentUser } = useRBAC();

  const currentUserName = currentUser?.name || 'Sistema ERP';

  // State initialization with localStorage fallback
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.items);
    return raw ? JSON.parse(raw) : DEFAULT_ITEMS;
  });

  const [stockLevels, setStockLevels] = useState<StockLevel[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.stock);
    if (raw) return JSON.parse(raw);

    // Initial stock setup: give baseline stock to tenant-1
    return DEFAULT_ITEMS.map(i => ({
      itemId: i.id,
      tenantId: 'tenant-1',
      quantity: i.minStock * 2,
      avgCost: i.costPerUnit,
      lastUpdated: new Date().toISOString(),
    }));
  });

  const [lots, setLots] = useState<InventoryLot[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.lots);
    if (raw) return JSON.parse(raw);

    // Seeded initial lots
    const now = new Date();
    return [
      {
        id: 'lot-fior-01',
        code: generateLotCode('KH-QUE-001', now),
        itemId: 'item-fior-di-latte',
        tenantId: 'tenant-1',
        quantity: 20,
        initialQuantity: 20,
        unitCost: 34.50,
        producedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'inicial',
      },
      {
        id: 'lot-masa-01',
        code: generateLotCode('KH-PRE-001', now),
        itemId: 'item-masa-madre-preparada',
        tenantId: 'tenant-1',
        quantity: 50,
        initialQuantity: 50,
        unitCost: 2.20,
        producedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'produccion',
      },
    ];
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.movements);
    return raw ? JSON.parse(raw) : [];
  });

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.recipes);
    return raw ? JSON.parse(raw) : DEFAULT_RECIPES;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.suppliers);
    return raw ? JSON.parse(raw) : DEFAULT_SUPPLIERS;
  });

  const [purchases, setPurchases] = useState<PurchaseOrder[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.purchases);
    return raw ? JSON.parse(raw) : [];
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.transfers);
    return raw ? JSON.parse(raw) : [];
  });

  const [audits, setAudits] = useState<StockAudit[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.audits);
    return raw ? JSON.parse(raw) : [];
  });

  const [settings, setSettings] = useState<InventorySettings>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  });

  const [labelConfig, setLabelConfig] = useState<LabelConfig>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.labels);
    return raw ? JSON.parse(raw) : DEFAULT_LABEL_CONFIG;
  });

  // Sync state to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.stock, JSON.stringify(stockLevels)); }, [stockLevels]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.lots, JSON.stringify(lots)); }, [lots]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.movements, JSON.stringify(movements)); }, [movements]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.purchases, JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.transfers, JSON.stringify(transfers)); }, [transfers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.audits, JSON.stringify(audits)); }, [audits]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.labels, JSON.stringify(labelConfig)); }, [labelConfig]);

  // Broadcast sync & storage events across tabs
  useEffect(() => {
    const channel = new BroadcastChannel('kh_inventory_sync_channel');
    channel.onmessage = (e) => {
      if (e.data === 'sync_inventory') {
        const rawStock = localStorage.getItem(STORAGE_KEYS.stock);
        if (rawStock) setStockLevels(JSON.parse(rawStock));
        const rawLots = localStorage.getItem(STORAGE_KEYS.lots);
        if (rawLots) setLots(JSON.parse(rawLots));
        const rawMovements = localStorage.getItem(STORAGE_KEYS.movements);
        if (rawMovements) setMovements(JSON.parse(rawMovements));
      }
    };
    return () => channel.close();
  }, []);

  const notifySync = () => {
    try {
      const channel = new BroadcastChannel('kh_inventory_sync_channel');
      channel.postMessage('sync_inventory');
      channel.close();
    } catch {
      // Ignored in non-browser environments
    }
  };

  const activeTenantId = activeTenant?.id || 'tenant-1';

  // Stock queries
  const getItemStock = useCallback((itemId: string, targetTenantId?: string): number => {
    const tid = targetTenantId || activeTenantId;
    const found = stockLevels.find(s => s.itemId === itemId && s.tenantId === tid);
    return found ? found.quantity : 0;
  }, [stockLevels, activeTenantId]);

  const getItemAvgCost = useCallback((itemId: string, targetTenantId?: string): number => {
    const tid = targetTenantId || activeTenantId;
    const found = stockLevels.find(s => s.itemId === itemId && s.tenantId === tid);
    return found?.avgCost || items.find(i => i.id === itemId)?.costPerUnit || 0;
  }, [stockLevels, items, activeTenantId]);

  const getExpiringLotsSummary = useCallback(() => {
    const currentLots = lots.filter(l => l.tenantId === activeTenantId);
    return categorizeExpiringLots(currentLots);
  }, [lots, activeTenantId]);

  // Periodic FEFO notification
  useEffect(() => {
    const summary = getExpiringLotsSummary();
    const criticalCount = summary.expired.length + summary.today.length + summary.in1Day.length;
    if (criticalCount > 0) {
      dispatchToast(
        'Alerta FEFO: Insumos por Vencer',
        `Hay ${criticalCount} lote(s) que vencen en menos de 24h o ya vencieron. Revisa el módulo de inventario.`,
        'warning'
      );
    }
  }, [activeTenantId]); // Run when switching tenant

  // Insumos CRUD
  const saveItem = useCallback((itemData: InventoryItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === itemData.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = itemData;
        return copy;
      }
      return [...prev, itemData];
    });
    dispatchToast('Insumo Guardado', `El insumo "${itemData.name}" se actualizó correctamente.`, 'success');
  }, [dispatchToast]);

  const deleteItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    dispatchToast('Insumo Eliminado', 'El insumo fue retirado del catálogo de inventario.', 'info');
  }, [dispatchToast]);

  // General stock movement register
  const registerMovement = useCallback((params: {
    itemId: string;
    type: MovementType;
    quantity: number;
    unitCost?: number;
    lotId?: string;
    wasteReason?: WasteReason;
    note?: string;
    tenantId?: string;
  }) => {
    const tid = params.tenantId || activeTenantId;
    const cost = params.unitCost ?? getItemAvgCost(params.itemId, tid);

    // 1. Create movement record
    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: params.itemId,
      tenantId: tid,
      type: params.type,
      quantity: params.quantity,
      unitCost: cost,
      lotId: params.lotId,
      wasteReason: params.wasteReason,
      note: params.note,
      userName: currentUserName,
      createdAt: new Date().toISOString(),
    };

    setMovements(prev => [movement, ...prev]);

    // 2. Update stock level
    setStockLevels(prev => {
      const existing = prev.find(s => s.itemId === params.itemId && s.tenantId === tid);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + params.quantity);
        let newAvgCost = existing.avgCost;

        if (params.quantity > 0 && params.unitCost) {
          newAvgCost = calculateWeightedAvgCost(existing.quantity, existing.avgCost, params.quantity, params.unitCost);
        }

        return prev.map(s => (s.itemId === params.itemId && s.tenantId === tid)
          ? { ...s, quantity: newQty, avgCost: newAvgCost, lastUpdated: new Date().toISOString() }
          : s
        );
      } else {
        return [
          ...prev,
          {
            itemId: params.itemId,
            tenantId: tid,
            quantity: Math.max(0, params.quantity),
            avgCost: cost,
            lastUpdated: new Date().toISOString(),
          },
        ];
      }
    });

    // 3. Update lot if provided
    if (params.lotId) {
      setLots(prev => prev.map(l => {
        if (l.id === params.lotId) {
          return {
            ...l,
            quantity: Math.max(0, l.quantity + params.quantity),
          };
        }
        return l;
      }));
    }

    notifySync();
  }, [activeTenantId, getItemAvgCost, currentUserName]);

  // Production batch (Prepared item, e.g. masa biga / salsa especial)
  const registerProductionBatch = useCallback((params: {
    preparedItemId: string;
    producedQty: number;
    shelfLifeDays?: number;
    ingredientLines: { itemId: string; qty: number }[];
    notes?: string;
  }): InventoryLot => {
    const tid = activeTenantId;
    const preparedItem = items.find(i => i.id === params.preparedItemId);
    const shelfDays = params.shelfLifeDays || preparedItem?.shelfLifeDays || 3;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + shelfDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Consume raw ingredients (FEFO on ingredient lots)
    let totalBatchCost = 0;

    params.ingredientLines.forEach(line => {
      const ingredientLots = lots.filter(l => l.itemId === line.itemId && l.tenantId === tid && l.quantity > 0);
      const allocation = allocateFEFO(ingredientLots, line.qty);

      // Decrement allocated lots
      allocation.allocations.forEach(alloc => {
        registerMovement({
          itemId: line.itemId,
          type: 'produccion_out',
          quantity: -alloc.consumed,
          unitCost: alloc.lot.unitCost,
          lotId: alloc.lot.id,
          note: `Producción de lote ${preparedItem?.name || ''}`,
          tenantId: tid,
        });
        totalBatchCost += alloc.consumed * alloc.lot.unitCost;
      });

      if (allocation.unallocatedQty > 0) {
        const avgCost = getItemAvgCost(line.itemId, tid);
        registerMovement({
          itemId: line.itemId,
          type: 'produccion_out',
          quantity: -allocation.unallocatedQty,
          unitCost: avgCost,
          note: `Producción lote (stock general sin lote): ${preparedItem?.name || ''}`,
          tenantId: tid,
        });
        totalBatchCost += allocation.unallocatedQty * avgCost;
      }
    });

    const unitCost = params.producedQty > 0 ? Math.round((totalBatchCost / params.producedQty) * 100) / 100 : (preparedItem?.costPerUnit || 1);

    // 2. Create newly produced lot
    const newLot: InventoryLot = {
      id: `lot-prod-${Date.now()}`,
      code: generateLotCode(preparedItem?.sku || 'PREP', now),
      itemId: params.preparedItemId,
      tenantId: tid,
      quantity: params.producedQty,
      initialQuantity: params.producedQty,
      unitCost,
      producedAt: now.toISOString(),
      expiresAt,
      source: 'produccion',
      batchNotes: params.notes,
    };

    setLots(prev => [newLot, ...prev]);

    // 3. Register production_in movement
    registerMovement({
      itemId: params.preparedItemId,
      type: 'produccion_in',
      quantity: params.producedQty,
      unitCost,
      lotId: newLot.id,
      note: `Lote generado ${newLot.code}. ${params.notes || ''}`,
      tenantId: tid,
    });

    dispatchToast(
      'Lote de Producción Registrado',
      `Se crearon ${params.producedQty} ${preparedItem?.unit || 'und'} de ${preparedItem?.name} (Lote: ${newLot.code}).`,
      'success'
    );

    return newLot;
  }, [activeTenantId, items, lots, registerMovement, getItemAvgCost, dispatchToast]);

  // Recipes
  const saveRecipe = useCallback((recipe: Recipe) => {
    setRecipes(prev => {
      const idx = prev.findIndex(r => r.id === recipe.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = recipe;
        return copy;
      }
      return [...prev, recipe];
    });
    dispatchToast('Receta Guardada', 'Los escandallos BOM han sido actualizados.', 'success');
  }, [dispatchToast]);

  const deleteRecipe = useCallback((recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    dispatchToast('Receta Eliminada', 'Se retiró la receta seleccionada.', 'info');
  }, [dispatchToast]);

  // Suppliers & Purchases
  const saveSupplier = useCallback((supplier: Supplier) => {
    setSuppliers(prev => {
      const idx = prev.findIndex(s => s.id === supplier.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = supplier;
        return copy;
      }
      return [...prev, supplier];
    });
  }, []);

  const deleteSupplier = useCallback((supplierId: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
  }, []);

  const createPurchaseOrder = useCallback((poData: Omit<PurchaseOrder, 'id' | 'number' | 'createdAt'>): PurchaseOrder => {
    const poNumber = `OC-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(4, '0')}`;
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      number: poNumber,
      createdAt: new Date().toISOString(),
    };
    setPurchases(prev => [newPO, ...prev]);
    dispatchToast('Orden de Compra Generada', `Se emitió la orden ${poNumber} correctamente.`, 'success');
    return newPO;
  }, [purchases.length, dispatchToast]);

  const updatePurchaseOrderStatus = useCallback((poId: string, status: PurchaseOrder['status']) => {
    setPurchases(prev => prev.map(po => po.id === poId ? { ...po, status } : po));
  }, []);

  const receivePurchaseOrder = useCallback((
    poId: string,
    receivedLines: { itemId: string; receivedQty: number; unitCost: number; expiresAt?: string }[]
  ) => {
    const targetPO = purchases.find(p => p.id === poId);
    if (!targetPO) return;

    const tid = targetPO.tenantId;
    const now = new Date();

    receivedLines.forEach(line => {
      if (line.receivedQty <= 0) return;
      const item = items.find(i => i.id === line.itemId);

      let createdLotId: string | undefined;

      // If item tracks lots or has shelf life, create lot
      if (item?.trackLots || line.expiresAt) {
        const lot: InventoryLot = {
          id: `lot-compra-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          code: generateLotCode(item?.sku || 'LOT', now),
          itemId: line.itemId,
          tenantId: tid,
          quantity: line.receivedQty,
          initialQuantity: line.receivedQty,
          unitCost: line.unitCost,
          producedAt: now.toISOString(),
          expiresAt: line.expiresAt,
          source: 'compra',
          batchNotes: `Recepción ${targetPO.number}`,
        };
        setLots(prev => [lot, ...prev]);
        createdLotId = lot.id;
      }

      // Register ingreso movement
      registerMovement({
        itemId: line.itemId,
        type: 'ingreso',
        quantity: line.receivedQty,
        unitCost: line.unitCost,
        lotId: createdLotId,
        note: `Recepción de ${targetPO.number}`,
        tenantId: tid,
      });
    });

    // Update purchase order state
    setPurchases(prev => prev.map(po => {
      if (po.id !== poId) return po;
      const updatedLines = po.lines.map(pl => {
        const rx = receivedLines.find(r => r.itemId === pl.itemId);
        return rx ? { ...pl, receivedQty: pl.receivedQty + rx.receivedQty } : pl;
      });
      const allFulfilled = updatedLines.every(l => l.receivedQty >= l.qty);
      return {
        ...po,
        lines: updatedLines,
        status: allFulfilled ? 'recibida' : 'parcial',
        receivedAt: now.toISOString(),
      };
    }));

    dispatchToast(
      'Mercadería Recibida',
      `Se actualizaron las existencias y el costo promedio de la orden ${targetPO.number}.`,
      'success'
    );
  }, [purchases, items, registerMovement, dispatchToast]);

  // Inter-branch transfers
  const createStockTransfer = useCallback((transferData: Omit<StockTransfer, 'id' | 'number' | 'createdAt' | 'status'>): StockTransfer => {
    const num = `TR-${new Date().getFullYear()}-${String(transfers.length + 1).padStart(4, '0')}`;
    const newTransfer: StockTransfer = {
      ...transferData,
      id: `tr-${Date.now()}`,
      number: num,
      status: 'solicitada',
      createdAt: new Date().toISOString(),
    };
    setTransfers(prev => [newTransfer, ...prev]);
    return newTransfer;
  }, [transfers.length]);

  const shipTransfer = useCallback((transferId: string) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'solicitada') return;

    transfer.lines.forEach(l => {
      registerMovement({
        itemId: l.itemId,
        type: 'transfer_out',
        quantity: -l.qty,
        note: `Transferencia enviada a otra sede (${transfer.number})`,
        tenantId: transfer.fromTenantId,
      });
    });

    setTransfers(prev => prev.map(t => t.id === transferId ? {
      ...t,
      status: 'en_transito',
      shippedAt: new Date().toISOString(),
    } : t));

    dispatchToast('Transferencia Despachada', `Insumos en tránsito hacia la sede de destino (${transfer.number}).`, 'info');
  }, [transfers, registerMovement, dispatchToast]);

  const receiveTransfer = useCallback((transferId: string, linesReceived: { itemId: string; receivedQty: number }[]) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'en_transito') return;

    linesReceived.forEach(l => {
      const avgCost = getItemAvgCost(l.itemId, transfer.fromTenantId);
      registerMovement({
        itemId: l.itemId,
        type: 'transfer_in',
        quantity: l.receivedQty,
        unitCost: avgCost,
        note: `Transferencia recibida desde otra sede (${transfer.number})`,
        tenantId: transfer.toTenantId,
      });
    });

    setTransfers(prev => prev.map(t => t.id === transferId ? {
      ...t,
      status: 'recibida',
      receivedAt: new Date().toISOString(),
      receivedBy: currentUserName,
      lines: t.lines.map(line => {
        const found = linesReceived.find(lr => lr.itemId === line.itemId);
        return found ? { ...line, receivedQty: found.receivedQty } : line;
      }),
    } : t));

    dispatchToast('Transferencia Completada', `Insumos ingresados al almacén de la sede receptora (${transfer.number}).`, 'success');
  }, [transfers, getItemAvgCost, registerMovement, currentUserName, dispatchToast]);

  // Stock Audit
  const openStockAudit = useCallback((period: string, notes?: string): StockAudit => {
    const tid = activeTenantId;
    const auditLines = items.map(item => {
      const currentQty = getItemStock(item.id, tid);
      const avgCost = getItemAvgCost(item.id, tid);
      return {
        itemId: item.id,
        systemQty: currentQty,
        countedQty: currentQty, // Initialized matching system
        unitCost: avgCost,
        difference: 0,
      };
    });

    const newAudit: StockAudit = {
      id: `audit-${Date.now()}`,
      tenantId: tid,
      period,
      status: 'abierta',
      lines: auditLines,
      notes,
      createdAt: new Date().toISOString(),
    };

    setAudits(prev => [newAudit, ...prev]);
    return newAudit;
  }, [activeTenantId, items, getItemStock, getItemAvgCost]);

  const recordAuditCount = useCallback((auditId: string, itemId: string, countedQty: number, notes?: string) => {
    setAudits(prev => prev.map(a => {
      if (a.id !== auditId) return a;
      return {
        ...a,
        lines: a.lines.map(l => {
          if (l.itemId !== itemId) return l;
          const diff = countedQty - l.systemQty;
          return { ...l, countedQty, difference: diff, notes };
        }),
      };
    }));
  }, []);

  const closeStockAudit = useCallback((auditId: string) => {
    const audit = audits.find(a => a.id === auditId);
    if (!audit || audit.status !== 'abierta') return;

    // Apply adjustments to stock
    audit.lines.forEach(l => {
      if (l.difference !== 0) {
        registerMovement({
          itemId: l.itemId,
          type: 'conteo',
          quantity: l.difference,
          unitCost: l.unitCost,
          note: `Ajuste por Cierre Auditoría ${audit.period} (Dif: ${l.difference > 0 ? '+' : ''}${l.difference})`,
          tenantId: audit.tenantId,
        });
      }
    });

    setAudits(prev => prev.map(a => a.id === auditId ? {
      ...a,
      status: 'cerrada',
      closedBy: currentUserName,
      closedAt: new Date().toISOString(),
    } : a));

    dispatchToast('Auditoría de Stock Cerrada', `El inventario del período ${audit.period} fue valorizado y cerrado formalmente.`, 'success');
  }, [audits, registerMovement, currentUserName, dispatchToast]);

  // Order lifecycle automatic consumption & restocking
  const consumeStockForOrder = useCallback((order: Order): boolean => {
    const tid = order.tenantId || activeTenantId;

    // Explode all items in order
    const requiredItems: { itemId: string; quantity: number }[] = [];
    order.items.forEach(item => {
      const parts = explodeOrderItem(item, recipes);
      parts.forEach(p => {
        const found = requiredItems.find(r => r.itemId === p.itemId);
        if (found) found.quantity += p.quantity;
        else requiredItems.push({ itemId: p.itemId, quantity: p.quantity });
      });
    });

    // FEFO deduct
    requiredItems.forEach(req => {
      const itemLots = lots.filter(l => l.itemId === req.itemId && l.tenantId === tid && l.quantity > 0);
      const allocation = allocateFEFO(itemLots, req.quantity);

      allocation.allocations.forEach(alloc => {
        registerMovement({
          itemId: req.itemId,
          type: 'consumo',
          quantity: -alloc.consumed,
          unitCost: alloc.lot.unitCost,
          lotId: alloc.lot.id,
          note: `Comanda ${order.orderNumber} (Lote ${alloc.lot.code})`,
          tenantId: tid,
        });
      });

      if (allocation.unallocatedQty > 0) {
        registerMovement({
          itemId: req.itemId,
          type: 'consumo',
          quantity: -allocation.unallocatedQty,
          note: `Comanda ${order.orderNumber} (Stock general)`,
          tenantId: tid,
        });
      }
    });

    return true;
  }, [activeTenantId, recipes, lots, registerMovement]);

  const restockCancelledOrder = useCallback((order: Order): boolean => {
    const tid = order.tenantId || activeTenantId;

    const requiredItems: { itemId: string; quantity: number }[] = [];
    order.items.forEach(item => {
      const parts = explodeOrderItem(item, recipes);
      parts.forEach(p => {
        const found = requiredItems.find(r => r.itemId === p.itemId);
        if (found) found.quantity += p.quantity;
        else requiredItems.push({ itemId: p.itemId, quantity: p.quantity });
      });
    });

    requiredItems.forEach(req => {
      registerMovement({
        itemId: req.itemId,
        type: 'reposicion',
        quantity: req.quantity,
        note: `Cancelación previa a despacho: ${order.orderNumber}`,
        tenantId: tid,
      });
    });

    return true;
  }, [activeTenantId, recipes, registerMovement]);

  // Hook up OrderCatalog lifecycle listener for auto deduction & restocking
  useEffect(() => {
    const consumedOrders = new Set<string>();

    const unsubscribe = registerOrderLifecycleListener((order, prevStatus, newStatus) => {
      // 1. When advancing to en_cocina or beyond, deduct inventory if not deducted yet
      if ((newStatus === 'en_cocina' || newStatus === 'en_horno') && !consumedOrders.has(order.id)) {
        consumeStockForOrder(order);
        consumedOrders.add(order.id);
      }

      // 2. When cancelling an order that was already deducted in kitchen, restock it
      if (newStatus === 'cancelado' && consumedOrders.has(order.id)) {
        restockCancelledOrder(order);
        consumedOrders.delete(order.id);
      }
    });

    return () => unsubscribe();
  }, [consumeStockForOrder, restockCancelledOrder]);

  const updateSettings = useCallback((patch: Partial<InventorySettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const updateLabelConfig = useCallback((patch: Partial<LabelConfig>) => {
    setLabelConfig(prev => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(() => ({
    items,
    stockLevels,
    lots,
    movements,
    recipes,
    suppliers,
    purchases,
    transfers,
    audits,
    settings,
    labelConfig,
    getItemStock,
    getItemAvgCost,
    getExpiringLotsSummary,
    saveItem,
    deleteItem,
    registerMovement,
    registerProductionBatch,
    saveRecipe,
    deleteRecipe,
    saveSupplier,
    deleteSupplier,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    receivePurchaseOrder,
    createStockTransfer,
    shipTransfer,
    receiveTransfer,
    openStockAudit,
    recordAuditCount,
    closeStockAudit,
    consumeStockForOrder,
    restockCancelledOrder,
    updateSettings,
    updateLabelConfig,
  }), [
    items,
    stockLevels,
    lots,
    movements,
    recipes,
    suppliers,
    purchases,
    transfers,
    audits,
    settings,
    labelConfig,
    getItemStock,
    getItemAvgCost,
    getExpiringLotsSummary,
    saveItem,
    deleteItem,
    registerMovement,
    registerProductionBatch,
    saveRecipe,
    deleteRecipe,
    saveSupplier,
    deleteSupplier,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    receivePurchaseOrder,
    createStockTransfer,
    shipTransfer,
    receiveTransfer,
    openStockAudit,
    recordAuditCount,
    closeStockAudit,
    consumeStockForOrder,
    restockCancelledOrder,
    updateSettings,
    updateLabelConfig,
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory debe ser utilizado dentro de un InventoryProvider');
  }
  return context;
};
