import {
  HeldOrder,
  Order,
  PublicReservation,
  SunatInvoiceRecord,
} from '../types/catalog';
import { FacturaloEmissionResult } from './facturaloApi';

export const HELD_ORDERS_KEY = 'kh_pos_held_orders_v1';
export const SUNAT_INVOICES_KEY = 'kh_sunat_invoices_v1';
export const PUBLIC_RESERVATIONS_KEY = 'kh_public_reservations_v1';
export const RESERVATION_SETTINGS_KEY = 'kh_reservation_settings_v1';

export interface TenantReservationConfig {
  enabled: boolean;
  allowTableReservation: boolean;
  allowScheduledOrder: boolean;
  openTime: string;
  closeTime: string;
  slotIntervalMinutes: number;
  defaultDurationMinutes: number;
  maxGuestsPerReservation: number;
  minAdvanceMinutes: number;
}

export const DEFAULT_TENANT_RESERVATION_CONFIG: TenantReservationConfig = {
  enabled: true,
  allowTableReservation: true,
  allowScheduledOrder: true,
  openTime: '12:00',
  closeTime: '23:00',
  slotIntervalMinutes: 30,
  defaultDurationMinutes: 90,
  maxGuestsPerReservation: 12,
  minAdvanceMinutes: 30,
};

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

export function loadHeldOrders(): HeldOrder[] {
  return safeReadJson<HeldOrder[]>(HELD_ORDERS_KEY, []);
}

export function saveHeldOrders(list: HeldOrder[]): void {
  safeWriteJson(HELD_ORDERS_KEY, list);
}

export function loadSunatInvoices(): SunatInvoiceRecord[] {
  return safeReadJson<SunatInvoiceRecord[]>(SUNAT_INVOICES_KEY, []);
}

export function saveSunatInvoices(list: SunatInvoiceRecord[]): void {
  safeWriteJson(SUNAT_INVOICES_KEY, list);
}

export function appendSunatInvoiceRecord(
  order: Order,
  docType: '01' | '03' | '07',
  emission: FacturaloEmissionResult,
  options?: { relatedSerieNumero?: string; voidReason?: string }
): SunatInvoiceRecord {
  const existing = loadSunatInvoices();
  const total = Number(order.total || 0);
  const subtotal = Number((total / 1.18).toFixed(2));
  const igv = Number((total - subtotal).toFixed(2));

  const record: SunatInvoiceRecord = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    tenantId: order.tenantId,
    documentType: docType,
    serieNumero:
      emission.serieNumero ||
      `${docType === '01' ? 'F001' : docType === '07' ? 'BC01' : 'B001'}-${String(
        existing.length + 1
      ).padStart(6, '0')}`,
    customerDocument:
      order.invoiceDocument || order.customerDni || (docType === '01' ? '20000000001' : '00000000'),
    customerName: order.invoiceBusinessName || order.customerName || 'CLIENTES VARIOS',
    customerAddress: order.invoiceFiscalAddress || order.deliveryAddress || '',
    subtotal,
    igv,
    total,
    status: emission.success ? 'aceptado' : 'pendiente',
    pdfUrl: emission.pdfUrl,
    xmlUrl: emission.xmlUrl,
    cdrUrl: emission.cdrUrl,
    qrCode: emission.qrCode,
    sunatResponse: emission.sunatResponse || emission.errorMessage,
    relatedSerieNumero: options?.relatedSerieNumero,
    voidReason: options?.voidReason,
    createdAt: new Date().toISOString(),
  };

  saveSunatInvoices([record, ...existing]);
  return record;
}

export function loadPublicReservations(): PublicReservation[] {
  return safeReadJson<PublicReservation[]>(PUBLIC_RESERVATIONS_KEY, []);
}

export function savePublicReservations(list: PublicReservation[]): void {
  safeWriteJson(PUBLIC_RESERVATIONS_KEY, list);
}

export function loadAllReservationSettings(): Record<string, TenantReservationConfig> {
  return safeReadJson<Record<string, TenantReservationConfig>>(RESERVATION_SETTINGS_KEY, {});
}

export function getReservationSettingsForTenant(tenantId: string): TenantReservationConfig {
  const all = loadAllReservationSettings();
  return {
    ...DEFAULT_TENANT_RESERVATION_CONFIG,
    ...(all[tenantId] || {}),
  };
}

export function saveReservationSettingsForTenant(
  tenantId: string,
  config: TenantReservationConfig
): void {
  const all = loadAllReservationSettings();
  safeWriteJson(RESERVATION_SETTINGS_KEY, {
    ...all,
    [tenantId]: config,
  });
}
