export type ProductCategory = 'pizzas' | 'combos' | 'entradas' | 'bebidas' | 'postres' | (string & {});

export interface ProductCategoryItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  enabled?: boolean;
}

export type ProductType = 'standard' | 'half_and_half';

export type PizzaSizeId = string;

export interface ProductSizeConfig {
  id: PizzaSizeId;
  name: string;
  label: string;
  slices: number;
  price: number;
  imageUrl?: string;
  enabled: boolean;
  isDefault?: boolean;
}

export interface SubOptionNestedChoice {
  id: string;
  name: string;
  priceDelta: number;
  imageUrl?: string;
  isMultiple?: boolean;
  maxQty?: number;
  hidePrice?: boolean;
}

export interface SubOptionChoice {
  id: string;
  name: string;
  description?: string;
  priceDelta: number;
  imageUrl?: string;
  isDefault?: boolean;
  isRecommended?: boolean;
  isMultiple?: boolean;
  hidePrice?: boolean;
  storePricesEnabled?: boolean;
  freeQuantity?: number;
  maxQuantity?: number;
  subExtrasLimit?: number;
  isIncluded?: boolean;
  nestedChoices?: SubOptionNestedChoice[];
}

export interface SubOptionGroup {
  id: string;
  name: string;
  enabled: boolean;
  required: boolean;
  maxSelection?: number;
  openByDefault?: boolean;
  layoutVisual?: 'list' | 'grid' | 'pills';
  accordionStyle?: 'standard' | 'collapsible';
  conditionOptionId?: string;
  choices: SubOptionChoice[];
}

export interface ExtraModifier {
  id: string;
  name: string;
  price: number;
  category: 'borde' | 'toppings' | 'quesos' | 'salsas';
  imageUrl?: string;
  isIncluded?: boolean;
  enabled: boolean;
  // Dynamic conditional pricing rule (e.g. minQty threshold)
  conditionalRule?: {
    minQty: number;
    discountedPrice: number;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  productType?: ProductType;
  imageUrl: string;
  badge?: string;
  isAvailable: boolean;
  hasSizes: boolean;
  basePrice: number; // Used if hasSizes is false
  sizes: ProductSizeConfig[];
  subOptions: SubOptionGroup[];
  allowedExtras: ExtraModifier[];
}

export interface CartExtra {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartSubOptionSelection {
  groupId: string;
  groupName: string;
  choiceId: string;
  choiceName: string;
  priceDelta: number;
  quantity?: number;
}

export interface HalfAndHalfSelection {
  firstHalfId: string;
  firstHalfName: string;
  firstHalfImage?: string;
  secondHalfId: string;
  secondHalfName: string;
  secondHalfImage?: string;
}

export interface OrderItem {
  itemId: string;
  productId: string;
  productName: string;
  productImage: string;
  halfAndHalf?: HalfAndHalfSelection;
  size?: {
    id: PizzaSizeId;
    name: string;
    slices: number;
    price: number;
  };
  subOptions: CartSubOptionSelection[];
  extras: CartExtra[];
  notes?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export type OrderChannel =
  | 'online'
  | 'pos-salon'
  | 'pos-takeaway'
  | 'pos-delivery'
  | 'kiosco-salon'
  | 'kiosco-takeaway';
export type OrderStatus =
  | 'recibido'
  | 'en_cocina'
  | 'en_horno'
  | 'listo'
  | 'en_ruta'
  | 'entregado'
  | 'cancelado';
export type PaymentMethod = 'culqi' | 'yape_plin' | 'efectivo' | 'tarjeta';
export type InvoiceDocumentType = 'boleta_simple' | 'boleta_dni' | 'factura_ruc';

export type TableShape = 'square' | 'round' | 'rect';

export interface RestaurantTable {
  id: string;
  tenantId: string;
  zone: string;
  name: string;
  capacity: number;
  shape: TableShape;
  orderIndex: number;
}

export interface Customer {
  id: string;
  dni: string;
  fullName: string;
  email: string;
  whatsapp: string;
  address: string;
  reference: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  loyaltyPoints?: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  channel: OrderChannel;
  tenantId: string;
  customerId?: string;
  customerDni?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  deliveryReference?: string;
  deliveryDistanceKm?: number;
  tableId?: string;
  tableNumber?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pendiente' | 'pagado';
  culqiReference?: string;
  invoiceType?: InvoiceDocumentType;
  invoiceDocument?: string;
  invoiceBusinessName?: string;
  invoiceFiscalAddress?: string;
  couponCode?: string;
  rewardRedeemedTitle?: string;
  pointsEarned?: number;
  scheduledFor?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  pickupProofPhoto?: string;
  pickupProofAt?: string;
  pickupProofDriverName?: string;
  deliveryProofPhoto?: string;
  deliveryProofAt?: string;
  deliveryProofDriverName?: string;
  deliveryAuthorizedBy?: string;
  createdAt: string;
  updatedAt?: string;
  estimatedMinutes: number;
}
