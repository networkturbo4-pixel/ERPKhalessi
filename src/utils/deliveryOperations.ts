import { Order } from '../types/catalog';

export const DELIVERY_FUEL_STORAGE_KEY = 'gastro_delivery_fuel_v1';

export type FuelExpenseSource = 'caja_chica' | 'efectivo_ruta';

export interface DriverFuelExpense {
  id: string;
  driverId: string;
  driverName: string;
  tenantId: string;
  amount: number;
  source: FuelExpenseSource;
  note: string;
  createdAt: string;
  odometerKm?: number;
}

export interface DriverDailyMetrics {
  date: string;
  driverId: string | 'all';
  tenantId: string | 'consolidated';
  deliveredCount: number;
  totalOrderRevenue: number;
  totalDeliveryFees: number;
  cashCollected: number;
  digitalCollected: number;
  fuelSpentTotal: number;
  fuelFromRouteCash: number;
  fuelFromPettyCash: number;
  costPerDelivery: number;
  netDeliveryMargin: number;
  netCashToSettle: number;
  avgRouteMinutes: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const getLocalIsoDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const loadFuelExpenses = (): DriverFuelExpense[] => {
  try {
    const raw = localStorage.getItem(DELIVERY_FUEL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveFuelExpenses = (entries: DriverFuelExpense[]): void => {
  try {
    localStorage.setItem(DELIVERY_FUEL_STORAGE_KEY, JSON.stringify(entries.slice(0, 1000)));
  } catch {
    // Ignorar errores de cuota de almacenamiento local
  }
};

export const buildFuelExpenseEntry = (params: {
  driverId: string;
  driverName: string;
  tenantId: string;
  amount: number;
  source?: FuelExpenseSource;
  note?: string;
  odometerKm?: number;
}): DriverFuelExpense => ({
  id: `fuel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  driverId: params.driverId,
  driverName: params.driverName,
  tenantId: params.tenantId || 'tenant-1',
  amount: round2(Math.max(0, params.amount)),
  source: params.source ?? 'caja_chica',
  note: (params.note ?? 'Recarga de combustible').trim() || 'Recarga de combustible',
  createdAt: new Date().toISOString(),
  ...(typeof params.odometerKm === 'number' && params.odometerKm >= 0
    ? { odometerKm: params.odometerKm }
    : {}),
});

/**
 * Cruza los pedidos entregados del día con los gastos de combustible registrados
 * para calcular costo real por envío, margen de delivery y efectivo neto a rendir.
 */
export const calculateDriverDailyMetrics = (
  orders: Order[],
  expenses: DriverFuelExpense[],
  options?: {
    driverId?: string;
    tenantId?: string;
    date?: string;
  }
): DriverDailyMetrics => {
  const targetDate = options?.date || getLocalIsoDate();
  const targetDriverId = options?.driverId || 'all';
  const targetTenantId = options?.tenantId || 'consolidated';

  const matchingOrders = orders.filter((order) => {
    const isDelivery =
      (order.channel === 'online' && order.deliveryAddress !== 'Recojo en Sucursal') ||
      order.channel === 'pos-delivery';
    if (!isDelivery || order.status !== 'entregado') return false;
    if (targetTenantId !== 'consolidated' && order.tenantId !== targetTenantId) return false;
    if (targetDriverId !== 'all' && order.assignedDriverId !== targetDriverId) return false;

    const refIso = order.deliveredAt || order.updatedAt || order.createdAt;
    if (!refIso) return false;
    return refIso.slice(0, 10) === targetDate;
  });

  const matchingExpenses = expenses.filter((exp) => {
    if (targetTenantId !== 'consolidated' && exp.tenantId !== targetTenantId) return false;
    if (targetDriverId !== 'all' && exp.driverId !== targetDriverId) return false;
    return exp.createdAt.slice(0, 10) === targetDate;
  });

  let totalOrderRevenue = 0;
  let totalDeliveryFees = 0;
  let cashCollected = 0;
  let digitalCollected = 0;
  let routeMinutesSum = 0;
  let routeMinutesCount = 0;

  for (const order of matchingOrders) {
    const total = Number(order.total) || 0;
    const fee = Number(order.deliveryFee) || 0;
    totalOrderRevenue += total;
    totalDeliveryFees += fee;

    if (order.paymentMethod === 'efectivo') {
      cashCollected += total;
    } else {
      digitalCollected += total;
    }

    if (order.dispatchedAt && order.deliveredAt) {
      const diffMs = new Date(order.deliveredAt).getTime() - new Date(order.dispatchedAt).getTime();
      if (Number.isFinite(diffMs) && diffMs > 0) {
        routeMinutesSum += diffMs / 60000;
        routeMinutesCount += 1;
      }
    }
  }

  let fuelSpentTotal = 0;
  let fuelFromRouteCash = 0;
  let fuelFromPettyCash = 0;

  for (const exp of matchingExpenses) {
    const amt = Number(exp.amount) || 0;
    fuelSpentTotal += amt;
    if (exp.source === 'efectivo_ruta') {
      fuelFromRouteCash += amt;
    } else {
      fuelFromPettyCash += amt;
    }
  }

  const deliveredCount = matchingOrders.length;
  const costPerDelivery = deliveredCount > 0 ? fuelSpentTotal / deliveredCount : 0;
  const netDeliveryMargin = totalDeliveryFees - fuelSpentTotal;
  const netCashToSettle = cashCollected - fuelFromRouteCash;
  const avgRouteMinutes = routeMinutesCount > 0 ? routeMinutesSum / routeMinutesCount : 0;

  return {
    date: targetDate,
    driverId: targetDriverId,
    tenantId: targetTenantId,
    deliveredCount,
    totalOrderRevenue: round2(totalOrderRevenue),
    totalDeliveryFees: round2(totalDeliveryFees),
    cashCollected: round2(cashCollected),
    digitalCollected: round2(digitalCollected),
    fuelSpentTotal: round2(fuelSpentTotal),
    fuelFromRouteCash: round2(fuelFromRouteCash),
    fuelFromPettyCash: round2(fuelFromPettyCash),
    costPerDelivery: round2(costPerDelivery),
    netDeliveryMargin: round2(netDeliveryMargin),
    netCashToSettle: round2(netCashToSettle),
    avgRouteMinutes: round2(avgRouteMinutes),
  };
};
