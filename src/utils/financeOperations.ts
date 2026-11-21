import { Order } from '../types/catalog';
import { DriverFuelExpense, getLocalIsoDate } from './deliveryOperations';

export const FINANCE_EXPENSES_STORAGE_KEY = 'gastro_erp_finance_expenses_v1';
export const FINANCE_CLOSINGS_STORAGE_KEY = 'gastro_erp_cash_closings_v1';

export type ExpenseCategory =
  | 'insumos'
  | 'servicios'
  | 'mantenimiento'
  | 'planilla'
  | 'marketing'
  | 'otros';

export type ExpensePaymentSource = 'caja_chica' | 'transferencia' | 'tarjeta_empresa';

export interface FinanceExpense {
  id: string;
  tenantId: string;
  category: ExpenseCategory;
  amount: number;
  source: ExpensePaymentSource;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface DailyCashClosing {
  id: string;
  date: string;
  tenantId: string;
  tenantName: string;
  totalRevenue: number;
  cashRevenue: number;
  digitalRevenue: number;
  fuelExpensesTotal: number;
  fuelFromRouteCash: number;
  fuelFromPettyCash: number;
  otherExpensesTotal: number;
  otherExpensesFromCash: number;
  expectedCashInDrawer: number;
  netBalance: number;
  deliveredOrdersCount: number;
  costPerDelivery: number;
  closedBy: string;
  closedAt: string;
}

export interface DriverSettlementRow {
  driverId: string;
  driverName: string;
  deliveredCount: number;
  cashCollected: number;
  digitalCollected: number;
  fuelFromPettyCash: number;
  fuelFromRouteCash: number;
  fuelTotal: number;
  netCashToSettle: number;
  costPerDelivery: number;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  insumos: 'Insumos y Emergencias',
  servicios: 'Servicios (Luz, Agua, Gas, Internet)',
  mantenimiento: 'Mantenimiento y Equipos',
  planilla: 'Adelantos / Planilla',
  marketing: 'Marketing y Promociones',
  otros: 'Otros Egresos',
};

export const EXPENSE_SOURCE_LABELS: Record<ExpensePaymentSource, string> = {
  caja_chica: 'Caja Chica (Efectivo)',
  transferencia: 'Transferencia / Yape / Plin',
  tarjeta_empresa: 'Tarjeta Empresa',
};

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const toLocalIsoDate = (isoOrDate?: string): string => {
  if (!isoOrDate) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return isoOrDate.slice(0, 10);
  return getLocalIsoDate(parsed);
};

export const loadFinanceExpenses = (): FinanceExpense[] => {
  try {
    const raw = localStorage.getItem(FINANCE_EXPENSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveFinanceExpenses = (items: FinanceExpense[]): void => {
  try {
    localStorage.setItem(FINANCE_EXPENSES_STORAGE_KEY, JSON.stringify(items.slice(0, 1500)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kh:finance-expenses-changed'));
    }
  } catch {
    // Ignorar errores de almacenamiento
  }
};

export const loadCashClosings = (): DailyCashClosing[] => {
  try {
    const raw = localStorage.getItem(FINANCE_CLOSINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCashClosings = (items: DailyCashClosing[]): void => {
  try {
    localStorage.setItem(FINANCE_CLOSINGS_STORAGE_KEY, JSON.stringify(items.slice(0, 500)));
  } catch {
    // Ignorar errores de almacenamiento
  }
};

export interface FinanceDaySummary {
  date: string;
  totalRevenue: number;
  cashRevenue: number;
  digitalRevenue: number;
  yapePlinRevenue: number;
  cardRevenue: number;
  posRevenue: number;
  posOrdersCount: number;
  storeRevenue: number;
  storeOrdersCount: number;
  kioskRevenue: number;
  kioskOrdersCount: number;
  ordersCount: number;
  deliveredOrdersCount: number;
  deliveryFeesTotal: number;
  fuelExpensesTotal: number;
  fuelFromPettyCash: number;
  fuelFromRouteCash: number;
  otherExpensesTotal: number;
  otherExpensesFromCash: number;
  totalOutflows: number;
  expectedCashInDrawer: number;
  netBalance: number;
  costPerDelivery: number;
  netDeliveryMargin: number;
  driverRows: DriverSettlementRow[];
}

export const computeFinanceDaySummary = (
  orders: Order[],
  fuelExpenses: DriverFuelExpense[],
  financeExpenses: FinanceExpense[],
  options: { tenantId: string | 'consolidated'; date?: string }
): FinanceDaySummary => {
  const targetDate = options.date || getLocalIsoDate();
  const isConsolidated = options.tenantId === 'consolidated';

  const dayOrders = orders.filter((o) => {
    if (o.status === 'cancelado') return false;
    if (!isConsolidated && o.tenantId !== options.tenantId) return false;
    const refIso = o.deliveredAt || o.createdAt;
    return toLocalIsoDate(refIso) === targetDate;
  });

  const dayFuel = fuelExpenses.filter((f) => {
    if (!isConsolidated && f.tenantId !== options.tenantId) return false;
    return toLocalIsoDate(f.createdAt) === targetDate;
  });

  const dayOther = financeExpenses.filter((e) => {
    if (!isConsolidated && e.tenantId !== options.tenantId) return false;
    return toLocalIsoDate(e.createdAt) === targetDate;
  });

  let totalRevenue = 0;
  let cashRevenue = 0;
  let yapePlinRevenue = 0;
  let cardRevenue = 0;
  let posRevenue = 0;
  let posOrdersCount = 0;
  let storeRevenue = 0;
  let storeOrdersCount = 0;
  let kioskRevenue = 0;
  let kioskOrdersCount = 0;
  let deliveredOrdersCount = 0;
  let deliveryFeesTotal = 0;

  const driverMap = new Map<string, DriverSettlementRow>();

  const ensureDriverRow = (driverId: string, driverName: string): DriverSettlementRow => {
    const existing = driverMap.get(driverId);
    if (existing) return existing;
    const row: DriverSettlementRow = {
      driverId,
      driverName: driverName || 'Motorizado',
      deliveredCount: 0,
      cashCollected: 0,
      digitalCollected: 0,
      fuelFromPettyCash: 0,
      fuelFromRouteCash: 0,
      fuelTotal: 0,
      netCashToSettle: 0,
      costPerDelivery: 0,
    };
    driverMap.set(driverId, row);
    return row;
  };

  for (const order of dayOrders) {
    const isPaidOrDelivered = order.paymentStatus === 'pagado' || order.status === 'entregado';
    if (!isPaidOrDelivered) continue;

    const amt = Number(order.total) || 0;
    totalRevenue += amt;

    if (order.channel === 'online') {
      storeRevenue += amt;
      storeOrdersCount += 1;
    } else if (order.channel === 'kiosco-salon' || order.channel === 'kiosco-takeaway') {
      kioskRevenue += amt;
      kioskOrdersCount += 1;
    } else {
      posRevenue += amt;
      posOrdersCount += 1;
    }

    if (order.paymentMethod === 'efectivo') {
      cashRevenue += amt;
    } else if (order.paymentMethod === 'tarjeta') {
      cardRevenue += amt;
    } else {
      yapePlinRevenue += amt;
    }

    const isDelivery =
      (order.channel === 'online' && order.deliveryAddress !== 'Recojo en Sucursal') ||
      order.channel === 'pos-delivery';

    if (isDelivery && order.status === 'entregado') {
      deliveredOrdersCount += 1;
      deliveryFeesTotal += Number(order.deliveryFee) || 0;

      const dId = order.assignedDriverId || 'sin-asignar';
      const dName = order.assignedDriverName || 'Sin asignar';
      const row = ensureDriverRow(dId, dName);
      row.deliveredCount += 1;
      if (order.paymentMethod === 'efectivo') {
        row.cashCollected += amt;
      } else {
        row.digitalCollected += amt;
      }
    }
  }

  let fuelExpensesTotal = 0;
  let fuelFromPettyCash = 0;
  let fuelFromRouteCash = 0;

  for (const f of dayFuel) {
    const amt = Number(f.amount) || 0;
    fuelExpensesTotal += amt;
    if (f.source === 'efectivo_ruta') {
      fuelFromRouteCash += amt;
    } else {
      fuelFromPettyCash += amt;
    }
    const row = ensureDriverRow(f.driverId || 'sin-asignar', f.driverName || 'Motorizado');
    row.fuelTotal += amt;
    if (f.source === 'efectivo_ruta') {
      row.fuelFromRouteCash += amt;
    } else {
      row.fuelFromPettyCash += amt;
    }
  }

  let otherExpensesTotal = 0;
  let otherExpensesFromCash = 0;

  for (const e of dayOther) {
    const amt = Number(e.amount) || 0;
    otherExpensesTotal += amt;
    if (e.source === 'caja_chica') {
      otherExpensesFromCash += amt;
    }
  }

  const driverRows = Array.from(driverMap.values()).map((row) => ({
    ...row,
    cashCollected: round2(row.cashCollected),
    digitalCollected: round2(row.digitalCollected),
    fuelFromPettyCash: round2(row.fuelFromPettyCash),
    fuelFromRouteCash: round2(row.fuelFromRouteCash),
    fuelTotal: round2(row.fuelTotal),
    netCashToSettle: round2(row.cashCollected - row.fuelFromRouteCash),
    costPerDelivery: row.deliveredCount > 0 ? round2(row.fuelTotal / row.deliveredCount) : 0,
  }));

  const digitalRevenue = yapePlinRevenue + cardRevenue;
  const totalOutflows = fuelExpensesTotal + otherExpensesTotal;
  const expectedCashInDrawer = cashRevenue - fuelFromPettyCash - fuelFromRouteCash - otherExpensesFromCash;
  const netBalance = totalRevenue - totalOutflows;
  const costPerDelivery = deliveredOrdersCount > 0 ? fuelExpensesTotal / deliveredOrdersCount : 0;
  const netDeliveryMargin = deliveryFeesTotal - fuelExpensesTotal;

  return {
    date: targetDate,
    totalRevenue: round2(totalRevenue),
    cashRevenue: round2(cashRevenue),
    digitalRevenue: round2(digitalRevenue),
    yapePlinRevenue: round2(yapePlinRevenue),
    cardRevenue: round2(cardRevenue),
    posRevenue: round2(posRevenue),
    posOrdersCount,
    storeRevenue: round2(storeRevenue),
    storeOrdersCount,
    kioskRevenue: round2(kioskRevenue),
    kioskOrdersCount,
    ordersCount: dayOrders.length,
    deliveredOrdersCount,
    deliveryFeesTotal: round2(deliveryFeesTotal),
    fuelExpensesTotal: round2(fuelExpensesTotal),
    fuelFromPettyCash: round2(fuelFromPettyCash),
    fuelFromRouteCash: round2(fuelFromRouteCash),
    otherExpensesTotal: round2(otherExpensesTotal),
    otherExpensesFromCash: round2(otherExpensesFromCash),
    totalOutflows: round2(totalOutflows),
    expectedCashInDrawer: round2(expectedCashInDrawer),
    netBalance: round2(netBalance),
    costPerDelivery: round2(costPerDelivery),
    netDeliveryMargin: round2(netDeliveryMargin),
    driverRows,
  };
};
