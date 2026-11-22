export type ProductCategory = 'pizzas' | 'combos' | 'entradas' | 'bebidas' | 'postres' | (string & {});

export interface ProductCategoryItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  enabled?: boolean;
}

export type ProductType = 'standard' | 'half_and_half' | 'apparel';

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
  branchPriceDeltas?: Record<string, number>;
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

export interface BranchPriceOverride {
  basePrice?: number;
  compareAtPrice?: number;
  isAvailable?: boolean;
  sizePrices?: Record<string, number>;
  extraPrices?: Record<string, number>;
}

export interface ApparelColorOption {
  id: string;
  name: string;
  hex: string;
  imageUrl?: string;
  priceDelta?: number;
  enabled: boolean;
}

export interface ApparelModelOption {
  id: string;
  name: string;
  description?: string;
  priceDelta?: number;
  enabled: boolean;
}

export interface ApparelSizeOption {
  id: string;
  name: string;
  priceDelta?: number;
  enabled: boolean;
}

export interface ApparelVariantItem {
  id: string;
  sizeId?: string;
  colorId?: string;
  modelId?: string;
  sku?: string;
  barcode?: string;
  priceOverride?: number;
  stockByBranch?: Record<string, number>;
  enabled: boolean;
}

export interface ApparelConfig {
  sizes: ApparelSizeOption[];
  colors: ApparelColorOption[];
  models: ApparelModelOption[];
  variants: ApparelVariantItem[];
  material?: string;
  brand?: string;
  collection?: string;
  gender?: 'unisex' | 'hombre' | 'mujer' | 'kids';
  sizeGuideText?: string;
  sizeGuideImageUrl?: string;
  allowGiftWrap?: boolean;
  giftWrapPrice?: number;
  allowCustomPrint?: boolean;
  customPrintLabel?: string;
  customPrintPrice?: number;
}

export interface ApparelOrderSelection {
  sizeId?: string;
  sizeName?: string;
  colorId?: string;
  colorName?: string;
  colorHex?: string;
  modelId?: string;
  modelName?: string;
  variantId?: string;
  variantSku?: string;
  giftWrap?: boolean;
  customPrintText?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  productType?: ProductType;
  imageUrl: string;
  badge?: string;
  compareAtPrice?: number;
  dineInOnly?: boolean;
  isAvailable: boolean;
  hasSizes: boolean;
  basePrice: number; // Used if hasSizes is false
  sizes: ProductSizeConfig[];
  subOptions: SubOptionGroup[];
  allowedExtras: ExtraModifier[];
  branchPrices?: Record<string, BranchPriceOverride>;
  apparelConfig?: ApparelConfig;
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
  apparelSelection?: ApparelOrderSelection;
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
  roundNumber?: number;
  addedAt?: string;
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
export type PaymentMethod = 'culqi' | 'yape_plin' | 'transferencia' | 'efectivo' | 'tarjeta';
export type InvoiceDocumentType = 'boleta_simple' | 'boleta_dni' | 'factura_ruc';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface HeldOrder {
  id: string;
  tenantId: string;
  label: string;
  channel: OrderChannel;
  items: OrderItem[];
  customerId?: string;
  customerDni?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  deliveryReference?: string;
  createdAt: string;
  createdBy?: string;
}

export interface PublicReservation {
  id: string;
  code: string;
  tenantId: string;
  type: 'mesa' | 'pedido';
  date: string;
  time: string;
  guests?: number;
  zone?: string;
  tableId?: string;
  customerName: string;
  customerPhone: string;
  customerDni?: string;
  notes?: string;
  preOrderItems?: OrderItem[];
  deliveryMode?: 'takeaway' | 'delivery';
  deliveryAddress?: string;
  status: 'pendiente' | 'confirmada' | 'sentada' | 'cancelada' | 'no_show';
  createdAt: string;
}

export interface SunatInvoiceRecord {
  id: string;
  orderId?: string;
  orderNumber?: string;
  tenantId: string;
  documentType: '01' | '03' | '07'; // 01 Factura, 03 Boleta, 07 Nota de Credito
  serieNumero: string;
  customerDocument: string;
  customerName: string;
  customerAddress?: string;
  subtotal: number;
  igv: number;
  total: number;
  status: 'aceptado' | 'pendiente' | 'observado' | 'anulado';
  pdfUrl?: string;
  xmlUrl?: string;
  cdrUrl?: string;
  qrCode?: string;
  sunatResponse?: string;
  relatedSerieNumero?: string;
  voidReason?: string;
  createdAt: string;
}

export type TableShape = 'square' | 'round' | 'rect';

export interface TableReservation {
  customerName: string;
  time: string;
  guests: number;
  notes?: string;
}

export interface RestaurantTable {
  id: string;
  tenantId: string;
  zone: string;
  name: string;
  capacity: number;
  shape: TableShape;
  orderIndex: number;
  billRequested?: boolean;
  reservation?: TableReservation | null;
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
  deliveryLat?: number;
  deliveryLng?: number;
  tableId?: string;
  tableNumber?: string;
  paymentMethod: PaymentMethod;
  paymentSplits?: PaymentSplit[];
  cashReceived?: number;
  changeAmount?: number;
  paymentStatus: 'pendiente' | 'pagado';
  culqiReference?: string;
  invoiceType?: InvoiceDocumentType;
  invoiceDocument?: string;
  invoiceBusinessName?: string;
  invoiceFiscalAddress?: string;
  sunatStatus?: 'no_emitido' | 'aceptado' | 'pendiente' | 'observado' | 'anulado';
  sunatSerieNumero?: string;
  sunatPdfUrl?: string;
  sunatXmlUrl?: string;
  sunatCdrUrl?: string;
  sunatQrCode?: string;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
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
