export type UnitOfMeasure = 'g' | 'kg' | 'ml' | 'l' | 'und';

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: 'masas' | 'quesos' | 'salsas' | 'toppings' | 'empaques' | 'bebidas' | 'insumos_generales' | string;
  unit: UnitOfMeasure;
  costPerUnit: number;
  minStock: number;
  reorderPoint: number;
  shelfLifeDays?: number;
  isPrepared?: boolean;
  trackLots: boolean;
  supplierIds: string[];
  enabled: boolean;
  description?: string;
}

export interface StockLevel {
  itemId: string;
  tenantId: string;
  quantity: number;
  avgCost: number;
  lastUpdated: string;
}

export interface InventoryLot {
  id: string;
  code: string;
  itemId: string;
  tenantId: string;
  quantity: number;
  initialQuantity: number;
  unitCost: number;
  producedAt: string;
  expiresAt?: string;
  source: 'compra' | 'produccion' | 'transferencia' | 'ajuste' | 'inicial';
  batchNotes?: string;
}

export type MovementType =
  | 'ingreso'
  | 'consumo'
  | 'merma'
  | 'ajuste'
  | 'conteo'
  | 'produccion_in'
  | 'produccion_out'
  | 'transfer_out'
  | 'transfer_in'
  | 'reposicion';

export type WasteReason = 'caducidad' | 'error_cocina' | 'devolucion' | 'rotura' | 'temperatura' | 'otro';

export interface StockMovement {
  id: string;
  itemId: string;
  tenantId: string;
  type: MovementType;
  quantity: number; // positive or negative
  unitCost: number;
  lotId?: string;
  orderId?: string;
  wasteReason?: WasteReason;
  refId?: string;
  note?: string;
  userName: string;
  createdAt: string;
}

export interface RecipeLine {
  itemId: string;
  quantity: number; // in item's unit of measure
  critical?: boolean;
}

export interface Recipe {
  id: string;
  productId: string;
  sizeId?: string;            // specific to pizza size (e.g. 'familiar', 'personal')
  inheritFromSizeId?: string; // inherits lines from base size and applies scaleFactor
  scaleFactor?: number;       // e.g. 0.60
  extraId?: string;           // recipe line for an extra modifier (e.g. 'extra-queso')
  optionChoiceId?: string;    // recipe line for a subOption choice
  lines: RecipeLine[];
  yieldNote?: string;
}

export interface Supplier {
  id: string;
  name: string;
  ruc: string;
  phone: string;
  email?: string;
  contactPerson?: string;
  address?: string;
  leadDays: number;
  enabled: boolean;
}

export type PurchaseStatus = 'borrador' | 'enviada' | 'parcial' | 'recibida' | 'cancelada';

export interface PurchaseOrderLine {
  itemId: string;
  qty: number;
  unitCost: number;
  receivedQty: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  tenantId: string;
  supplierId: string;
  status: PurchaseStatus;
  lines: PurchaseOrderLine[];
  notes?: string;
  createdAt: string;
  expectedAt?: string;
  receivedAt?: string;
  createdBy: string;
}

export type TransferStatus = 'solicitada' | 'en_transito' | 'recibida' | 'cancelada';

export interface StockTransferLine {
  itemId: string;
  qty: number;
  lotId?: string;
  receivedQty?: number;
}

export interface StockTransfer {
  id: string;
  number: string;
  fromTenantId: string;
  toTenantId: string;
  status: TransferStatus;
  lines: StockTransferLine[];
  notes?: string;
  createdAt: string;
  shippedAt?: string;
  receivedAt?: string;
  createdBy: string;
  receivedBy?: string;
}

export interface StockAuditLine {
  itemId: string;
  systemQty: number;
  countedQty: number;
  unitCost: number;
  difference: number;
  notes?: string;
}

export interface StockAudit {
  id: string;
  tenantId: string;
  period: string; // e.g. '2026-11'
  status: 'abierta' | 'cerrada';
  lines: StockAuditLine[];
  notes?: string;
  createdAt: string;
  closedBy?: string;
  closedAt?: string;
}

export interface InventorySettings {
  minMarginThreshold: number; // e.g. 60 (%)
  replenishmentWindowDays: 7 | 14 | 30;
  expiryWarningDays: number; // 3 days default
  autoMarkUnavailableOnStockout: boolean;
  defaultLabelPreset: '50x30' | '40x25' | '58x40' | 'custom';
}
