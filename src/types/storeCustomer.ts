import { PaymentMethod } from './catalog';

export type AddressLabelType = 'Casa' | 'Trabajo' | 'Otro';

export interface SavedCustomerAddress {
  id: string;
  label: AddressLabelType;
  customLabel?: string;
  streetAddress: string;
  reference: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Diners' | 'Tarjeta';

export interface SavedRecurringPayment {
  id: string;
  type: PaymentMethod;
  alias: string;
  cardBrand?: CardBrand;
  cardLast4?: string;
  cardHolder?: string;
  cardExpiry?: string;
  walletPhone?: string;
  cashNote?: string;
  isDefault: boolean;
}

export interface CustomerPointMovement {
  id: string;
  date: string;
  delta: number;
  reason: string;
  orderNumber?: string;
}

export interface StoreCustomerAccount {
  id: string;
  crmCustomerId?: string;
  fullName: string;
  dni: string;
  phone: string;
  email: string;
  password: string;
  addresses: SavedCustomerAddress[];
  paymentMethods: SavedRecurringPayment[];
  orderIds: string[];
  points?: number;
  pointsHistory?: CustomerPointMovement[];
  createdAt: string;
  updatedAt: string;
}
