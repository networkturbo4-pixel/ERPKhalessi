import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Product,
  Order,
  OrderItem,
  OrderStatus,
  Customer,
  RestaurantTable,
  TableShape,
} from '../types/catalog';
import { useSettings } from './SettingsContext';
import { soundSynth } from '../utils/audio';
import { getAuthHeaders } from '../utils/diskPersistence';

interface OrderStatusPatch {
  assignedDriverId?: string;
  assignedDriverName?: string;
  paymentStatus?: 'pendiente' | 'pagado';
  dispatchedAt?: string;
  deliveredAt?: string;
  pickupProofPhoto?: string;
  pickupProofAt?: string;
  pickupProofDriverName?: string;
  deliveryProofPhoto?: string;
  deliveryProofAt?: string;
  deliveryProofDriverName?: string;
  deliveryAuthorizedBy?: string;
}

interface OrderCatalogContextType {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  tables: RestaurantTable[];
  lastRealtimeSyncAt: string;
  createProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  toggleProductAvailability: (productId: string) => void;
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, patch?: OrderStatusPatch) => void;
  appendItemsToOrder: (orderId: string, newItems: OrderItem[], additionalSubtotal: number, additionalTotal: number) => void;
  markOrderPaid: (orderId: string) => void;
  deleteOrder: (orderId: string) => void;
  // Customers CRM
  upsertCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }, silent?: boolean) => Customer;
  adjustCustomerPoints: (customerId: string, delta: number) => void;
  deleteCustomer: (customerId: string) => void;
  // Floor Tables Builder
  getTablesForTenant: (tenantId: string) => RestaurantTable[];
  addTable: (data: { tenantId: string; zone: string; name: string; capacity: number; shape: TableShape }) => RestaurantTable;
  updateTable: (table: RestaurantTable) => void;
  deleteTable: (tableId: string) => void;
  moveTableOrder: (tableId: string, direction: 'prev' | 'next') => void;
  // Online Store Cart
  cartItems: OrderItem[];
  addToCart: (item: OrderItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQty: (itemId: string, delta: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotal: number;
  deliveryFee: number;
}

const SEEDED_HALF_AND_HALF_PRODUCT: Product = {
  id: 'prod-pizza-mitad-mitad',
  name: 'Pizza Mitad y Mitad (2 Sabores) 🍕',
  description:
    'Combina dos de nuestras pizzas artesanales favoritas en una sola pizza horneada a la piedra. El precio base toma el sabor de mayor valor del tamaño elegido.',
  category: 'pizzas',
  productType: 'half_and_half',
  imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=80',
  badge: '2 Sabores 🍕',
  isAvailable: true,
  hasSizes: true,
  basePrice: 36.9,
  sizes: [
    { id: 'mediana', name: 'Mediana', label: '30 cm • 6 Cortes', slices: 6, price: 36.9, enabled: true, isDefault: true },
    { id: 'familiar', name: 'Familiar', label: '40 cm • 8 Cortes', slices: 8, price: 49.9, enabled: true },
  ],
  subOptions: [
    {
      id: 'opt-masa',
      name: 'Tipo de Masa',
      enabled: true,
      required: true,
      choices: [
        { id: 'masa-madre', name: 'Masa Madre Tradicional', priceDelta: 0, isDefault: true },
        { id: 'masa-fina', name: 'Masa Fina Crujiente', priceDelta: 0 },
        { id: 'masa-artesanal', name: 'Masa Pan Gruesa', priceDelta: 2.0 },
      ],
    },
  ],
  allowedExtras: [
    { id: 'ext-borde-queso', name: 'Borde Relleno de Mozzarella', price: 7.0, category: 'borde', enabled: true },
    { id: 'ext-queso-extra', name: 'Extra Queso Mozzarella', price: 4.0, category: 'quesos', enabled: true },
    { id: 'ext-hot-honey-dip', name: 'Dip Adicional Hot Honey', price: 3.0, category: 'salsas', enabled: true },
  ],
};

const DEFAULT_PRODUCTS: Product[] = [
  SEEDED_HALF_AND_HALF_PRODUCT,
  {
    id: 'prod-pepperoni-honey',
    name: 'Pepperoni Hot Honey 🌶️🍯',
    description: 'Pepperoni americano crocante, queso mozzarella de autor, orégano y un toque irresistible de Hot Honey artesanal.',
    category: 'pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=80',
    badge: 'Más Pedida 🔥',
    isAvailable: true,
    hasSizes: true,
    basePrice: 24.90,
    sizes: [
      { id: 'personal', name: 'Personal', label: '20 cm • 4 Cortes', slices: 4, price: 24.90, enabled: true },
      { id: 'mediana', name: 'Mediana', label: '30 cm • 6 Cortes', slices: 6, price: 36.90, enabled: true, isDefault: true },
      { id: 'familiar', name: 'Familiar', label: '40 cm • 8 Cortes', slices: 8, price: 49.90, enabled: true },
    ],
    subOptions: [
      {
        id: 'opt-masa',
        name: 'Tipo de Masa',
        enabled: true,
        required: true,
        choices: [
          { id: 'masa-madre', name: 'Masa Madre Tradicional', priceDelta: 0, isDefault: true },
          { id: 'masa-fina', name: 'Masa Fina Crujiente', priceDelta: 0 },
          { id: 'masa-artesanal', name: 'Masa Pan Gruesa', priceDelta: 2.0 },
        ],
      },
      {
        id: 'opt-salsa',
        name: 'Salsa Base',
        enabled: true,
        required: true,
        choices: [
          { id: 'salsa-pomodoro', name: 'Pomodoro San Marzano', priceDelta: 0, isDefault: true },
          { id: 'salsa-bbq', name: 'Salsa BBQ Ahumada', priceDelta: 1.5 },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-borde-queso', name: 'Borde Relleno de Mozzarella', price: 7.00, category: 'borde', enabled: true },
      { id: 'ext-pepperoni', name: 'Extra Pepperoni Americano', price: 4.50, category: 'toppings', enabled: true },
      { id: 'ext-queso-extra', name: 'Extra Queso Mozzarella', price: 4.00, category: 'quesos', enabled: true },
      { id: 'ext-champinones', name: 'Champiñones Frescos', price: 3.50, category: 'toppings', enabled: true },
      { id: 'ext-hot-honey-dip', name: 'Dip Adicional Hot Honey', price: 3.00, category: 'salsas', enabled: true },
    ],
  },
  {
    id: 'prod-carnivora-khalessi',
    name: 'Carnívora Khalessi Supreme 🥩',
    description: 'Para los verdaderos amantes de la carne: Jamón selecto, pepperoni crocante, carne sazonada, tocino ahumado y doble mozzarella.',
    category: 'pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80',
    badge: 'Favorita',
    isAvailable: true,
    hasSizes: true,
    basePrice: 27.90,
    sizes: [
      { id: 'personal', name: 'Personal', label: '20 cm • 4 Cortes', slices: 4, price: 27.90, enabled: true },
      { id: 'mediana', name: 'Mediana', label: '30 cm • 6 Cortes', slices: 6, price: 40.90, enabled: true, isDefault: true },
      { id: 'familiar', name: 'Familiar', label: '40 cm • 8 Cortes', slices: 8, price: 54.90, enabled: true },
    ],
    subOptions: [
      {
        id: 'opt-masa',
        name: 'Tipo de Masa',
        enabled: true,
        required: true,
        choices: [
          { id: 'masa-madre', name: 'Masa Madre Tradicional', priceDelta: 0, isDefault: true },
          { id: 'masa-fina', name: 'Masa Fina Crujiente', priceDelta: 0 },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-borde-queso', name: 'Borde Relleno de Mozzarella', price: 7.00, category: 'borde', enabled: true },
      { id: 'ext-tocino', name: 'Extra Tocino Ahumado', price: 4.50, category: 'toppings', enabled: true },
      { id: 'ext-queso-extra', name: 'Extra Queso Mozzarella', price: 4.00, category: 'quesos', enabled: true },
    ],
  },
  {
    id: 'prod-cuatro-quesos',
    name: 'Cuatro Quesos Fior di Latte 🧀',
    description: 'Mozzarella de búfala, provolone fundido, queso azul selecto y lluvia de parmesano gratinado.',
    category: 'pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=700&q=80',
    badge: 'Gourmet',
    isAvailable: true,
    hasSizes: true,
    basePrice: 26.90,
    sizes: [
      { id: 'personal', name: 'Personal', label: '20 cm • 4 Cortes', slices: 4, price: 26.90, enabled: true },
      { id: 'mediana', name: 'Mediana', label: '30 cm • 6 Cortes', slices: 6, price: 38.90, enabled: true, isDefault: true },
      { id: 'familiar', name: 'Familiar', label: '40 cm • 8 Cortes', slices: 8, price: 51.90, enabled: true },
    ],
    subOptions: [
      {
        id: 'opt-masa',
        name: 'Tipo de Masa',
        enabled: true,
        required: true,
        choices: [
          { id: 'masa-madre', name: 'Masa Madre Tradicional', priceDelta: 0, isDefault: true },
          { id: 'masa-fina', name: 'Masa Fina Crujiente', priceDelta: 0 },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-borde-queso', name: 'Borde Relleno de Mozzarella', price: 7.00, category: 'borde', enabled: true },
      { id: 'ext-queso-azul', name: 'Porción Extra Queso Azul', price: 5.00, category: 'quesos', enabled: true },
    ],
  },
  {
    id: 'prod-americana',
    name: 'Americana Tradicional 🍕',
    description: 'Salsa pomodoro tradicional, generosa capa de jamón inglés artesanal y mozzarella cremosa derretida.',
    category: 'pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=700&q=80',
    isAvailable: true,
    hasSizes: true,
    basePrice: 21.90,
    sizes: [
      { id: 'personal', name: 'Personal', label: '20 cm • 4 Cortes', slices: 4, price: 21.90, enabled: true },
      { id: 'mediana', name: 'Mediana', label: '30 cm • 6 Cortes', slices: 6, price: 32.90, enabled: true, isDefault: true },
      { id: 'familiar', name: 'Familiar', label: '40 cm • 8 Cortes', slices: 8, price: 44.90, enabled: true },
    ],
    subOptions: [
      {
        id: 'opt-masa',
        name: 'Tipo de Masa',
        enabled: true,
        required: true,
        choices: [
          { id: 'masa-madre', name: 'Masa Madre Tradicional', priceDelta: 0, isDefault: true },
          { id: 'masa-fina', name: 'Masa Fina Crujiente', priceDelta: 0 },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-borde-queso', name: 'Borde Relleno de Mozzarella', price: 7.00, category: 'borde', enabled: true },
      { id: 'ext-champinones', name: 'Champiñones Frescos', price: 3.50, category: 'toppings', enabled: true },
    ],
  },
  {
    id: 'prod-combo-khalessi',
    name: 'Combo Pareja Khalessi 🍕🥖🥤',
    description: '1 Pizza Familiar a elección + 1 Porción de Pan al Ajo con Queso + 1 Gaseosa 1.5L.',
    category: 'combos',
    imageUrl: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=700&q=80',
    badge: 'Super Ahorro 💰',
    isAvailable: true,
    hasSizes: false,
    basePrice: 59.90,
    sizes: [],
    subOptions: [
      {
        id: 'opt-pizza-sabor',
        name: 'Sabor de Pizza Familiar',
        enabled: true,
        required: true,
        choices: [
          { id: 'sab-pepperoni', name: 'Pepperoni Hot Honey', priceDelta: 0, isDefault: true },
          { id: 'sab-carnivora', name: 'Carnívora Khalessi', priceDelta: 4.0 },
          { id: 'sab-americana', name: 'Americana Clásica', priceDelta: 0 },
        ],
      },
      {
        id: 'opt-bebida',
        name: 'Bebida 1.5L',
        enabled: true,
        required: true,
        choices: [
          { id: 'beb-inca', name: 'Inca Kola 1.5L', priceDelta: 0, isDefault: true },
          { id: 'beb-coca', name: 'Coca Cola 1.5L', priceDelta: 0 },
          { id: 'beb-chicha', name: 'Chicha Morada Casera 1L', priceDelta: 2.0 },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-borde-queso', name: 'Borde Relleno en la Pizza', price: 7.00, category: 'borde', enabled: true },
      { id: 'ext-alitas', name: 'Agregar 4 Alitas BBQ', price: 10.00, category: 'toppings', enabled: true },
    ],
  },
  {
    id: 'prod-pan-ajo',
    name: 'Pan al Ajo Supremo con Mozzarella 🥖🧀',
    description: 'Baguette horneada a la leña, mantequilla de ajo y hierbas aromáticas cubierta con abundante mozzarella derretida.',
    category: 'entradas',
    imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=700&q=80',
    isAvailable: true,
    hasSizes: false,
    basePrice: 15.90,
    sizes: [],
    subOptions: [],
    allowedExtras: [
      { id: 'ext-queso-extra', name: 'Doble Queso Mozzarella', price: 3.50, category: 'quesos', enabled: true },
      { id: 'ext-salsa-pomodoro', name: 'Salsa Pomodoro Dip', price: 2.50, category: 'salsas', enabled: true },
    ],
  },
  {
    id: 'prod-alitas-bbq',
    name: 'Alitas Glaseadas BBQ x6 🍗',
    description: 'Alitas crocantes bañadas en nuestra salsa BBQ ahumada con miel y ajonjolí tostado.',
    category: 'entradas',
    imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=700&q=80',
    badge: 'Crocantes',
    isAvailable: true,
    hasSizes: false,
    basePrice: 21.90,
    sizes: [],
    subOptions: [
      {
        id: 'opt-alitas-salsa',
        name: 'Salsa de Cobertura',
        enabled: true,
        required: true,
        choices: [
          { id: 'bbq-sweet', name: 'BBQ Melosa Dulce', priceDelta: 0, isDefault: true },
          { id: 'bbq-spicy', name: 'BBQ Picante Spicy', priceDelta: 0 },
          { id: 'alitas-buffalo', name: 'Buffalo Clásica Picante', priceDelta: 1.0 },
        ],
      },
    ],
    allowedExtras: [
      { id: 'ext-papas', name: 'Porción de Papas Nativas', price: 6.00, category: 'toppings', enabled: true },
    ],
  },
  {
    id: 'prod-bebida-inca',
    name: 'Inca Kola 1.5L Helada 🥤',
    description: 'La bebida de sabor nacional en presentación familiar para compartir.',
    category: 'bebidas',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=700&q=80',
    isAvailable: true,
    hasSizes: false,
    basePrice: 9.50,
    sizes: [],
    subOptions: [],
    allowedExtras: [],
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1021',
    orderNumber: '#KH-1021',
    channel: 'online',
    tenantId: 'tenant-1',
    customerDni: '45891234',
    customerName: 'Rodrigo Alejandro Mendoza Salazar',
    customerPhone: '+51 984 123 456',
    customerEmail: 'rodrigo.mendoza@gmail.com',
    deliveryAddress: 'Av. Larco 452, Dpto 402 - Miraflores',
    deliveryReference: 'Frente al parque Kennedy, portón negro',
    paymentMethod: 'yape_plin',
    paymentStatus: 'pagado',
    items: [
      {
        itemId: 'item-1',
        productId: 'prod-pepperoni-honey',
        productName: 'Pepperoni Hot Honey 🌶️🍯',
        productImage: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=80',
        size: { id: 'familiar', name: 'Familiar', slices: 8, price: 49.90 },
        subOptions: [
          { groupId: 'opt-masa', groupName: 'Tipo de Masa', choiceId: 'masa-madre', choiceName: 'Masa Madre Tradicional', priceDelta: 0 },
        ],
        extras: [
          { id: 'ext-borde-queso', name: 'Borde Relleno de Mozzarella', price: 7.00, quantity: 1 },
          { id: 'ext-pepperoni', name: 'Extra Pepperoni Americano', price: 4.50, quantity: 1 },
        ],
        notes: 'Bien doradita y cortar en 8 porciones iguales por favor',
        unitPrice: 61.40,
        quantity: 1,
        totalPrice: 61.40,
      },
    ],
    subtotal: 61.40,
    deliveryFee: 5.00,
    discount: 0,
    total: 66.40,
    status: 'listo',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    estimatedMinutes: 25,
  },
  {
    id: 'ord-1022',
    orderNumber: '#KH-1022',
    channel: 'pos-salon',
    tenantId: 'tenant-1',
    customerDni: '71234567',
    customerName: 'Camila Fernanda Paredes Torres',
    customerPhone: '+51 991 204 510',
    tableNumber: 'Mesa 4',
    paymentMethod: 'tarjeta',
    paymentStatus: 'pagado',
    items: [
      {
        itemId: 'item-2',
        productId: 'prod-carnivora-khalessi',
        productName: 'Carnívora Khalessi Supreme 🥩',
        productImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80',
        size: { id: 'mediana', name: 'Mediana', slices: 6, price: 40.90 },
        subOptions: [
          { groupId: 'opt-masa', groupName: 'Tipo de Masa', choiceId: 'masa-fina', choiceName: 'Masa Fina Crujiente', priceDelta: 0 },
        ],
        extras: [],
        unitPrice: 40.90,
        quantity: 1,
        totalPrice: 40.90,
      },
      {
        itemId: 'item-3',
        productId: 'prod-pan-ajo',
        productName: 'Pan al Ajo Supremo con Mozzarella 🥖🧀',
        productImage: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=700&q=80',
        subOptions: [],
        extras: [],
        unitPrice: 15.90,
        quantity: 1,
        totalPrice: 15.90,
      },
    ],
    subtotal: 56.80,
    deliveryFee: 0,
    discount: 0,
    total: 56.80,
    status: 'en_horno',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    estimatedMinutes: 18,
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    dni: '45891234',
    fullName: 'Rodrigo Alejandro Mendoza Salazar',
    email: 'rodrigo.mendoza@gmail.com',
    whatsapp: '+51 984 123 456',
    address: 'Av. Larco 452, Dpto 402 - Miraflores',
    reference: 'Frente al parque Kennedy, portón negro',
    tenantId: 'tenant-1',
    createdAt: '2026-10-12T18:30:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    dni: '71234567',
    fullName: 'Camila Fernanda Paredes Torres',
    email: 'camila.paredes@outlook.com',
    whatsapp: '+51 991 204 510',
    address: 'Jr. Monterrey 310, Chacarilla - Surco',
    reference: 'Edificio empresarial torre B, recepción',
    tenantId: 'tenant-1',
    createdAt: '2026-10-25T20:15:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

function buildDefaultTablesForTenant(tenantId: string): RestaurantTable[] {
  const templates: Array<{ zone: string; name: string; capacity: number; shape: TableShape }> = [
    { zone: 'Salón Principal', name: 'Mesa 1', capacity: 4, shape: 'square' },
    { zone: 'Salón Principal', name: 'Mesa 2', capacity: 4, shape: 'square' },
    { zone: 'Salón Principal', name: 'Mesa 3', capacity: 2, shape: 'round' },
    { zone: 'Salón Principal', name: 'Mesa 4', capacity: 6, shape: 'rect' },
    { zone: 'Salón Principal', name: 'Mesa 5', capacity: 4, shape: 'square' },
    { zone: 'Salón Principal', name: 'Mesa 6', capacity: 8, shape: 'rect' },
    { zone: 'Terraza', name: 'Terraza 1', capacity: 4, shape: 'round' },
    { zone: 'Terraza', name: 'Terraza 2', capacity: 6, shape: 'rect' },
    { zone: 'Barra', name: 'Barra 1', capacity: 2, shape: 'round' },
    { zone: 'Barra', name: 'Barra 2', capacity: 2, shape: 'round' },
  ];
  return templates.map((tpl, idx) => ({
    id: `tbl-${tenantId}-${idx + 1}`,
    tenantId,
    zone: tpl.zone,
    name: tpl.name,
    capacity: tpl.capacity,
    shape: tpl.shape,
    orderIndex: idx,
  }));
}

const STORAGE_KEYS = {
  products: 'kh_catalog_products',
  orders: 'kh_orders_list',
  customers: 'kh_customers_crm_v1',
  tables: 'kh_floor_tables_v1',
  cart: 'kh_store_cart',
} as const;

const REALTIME_CHANNEL_NAME = 'khalessi_erp_realtime_v1';

interface RealtimeMessage {
  senderId: string;
  entity: 'products' | 'orders' | 'customers' | 'tables';
  eventHint?: 'new_order' | 'order_status' | 'generic';
  orderNumber?: string;
  orderStatus?: OrderStatus;
  timestamp: string;
}

// External order event callbacks (e.g. for automatic inventory deduction and restocking)
type OrderLifecycleCallback = (order: Order, prevStatus?: OrderStatus, newStatus?: OrderStatus) => void;
const orderLifecycleListeners = new Set<OrderLifecycleCallback>();

export const registerOrderLifecycleListener = (cb: OrderLifecycleCallback): (() => void) => {
  orderLifecycleListeners.add(cb);
  return () => {
    orderLifecycleListeners.delete(cb);
  };
};

const OrderCatalogContext = createContext<OrderCatalogContextType | undefined>(undefined);

export const OrderCatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dispatchToast, activeTenant, tenants, customization } = useSettings();
  const tabInstanceIdRef = useRef(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const [lastRealtimeSyncAt, setLastRealtimeSyncAt] = useState<string>(() => new Date().toISOString());

  // Products state (persisted from storage; respects deletions including pizza mitad y mitad)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.products);
      if (saved !== null) {
        const parsed: Product[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    // Seed default catalog only on first-ever run (nothing stored anywhere yet)
    try {
      if (localStorage.getItem(STORAGE_KEYS.products) === null) {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(DEFAULT_PRODUCTS));
      }
    } catch {
      // ignore
    }
    return DEFAULT_PRODUCTS;
  });

  // Orders state (persisted, migrating legacy sucursal-centro -> tenant-1)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.orders);
      if (saved) {
        const parsed: Order[] = JSON.parse(saved);
        return parsed.map((o) =>
          o.tenantId === 'sucursal-centro' ? { ...o, tenantId: activeTenant?.id || 'tenant-1' } : o
        );
      }
    } catch {
      // fallback
    }
    return INITIAL_ORDERS.map((o) => ({ ...o, tenantId: activeTenant?.id || 'tenant-1' }));
  });

  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const dispatchToastRef = useRef(dispatchToast);
  const audioThemeRef = useRef(customization.toastAudioTheme);
  useEffect(() => {
    dispatchToastRef.current = dispatchToast;
    audioThemeRef.current = customization.toastAudioTheme;
  }, [dispatchToast, customization.toastAudioTheme]);

  // Customers CRM state (persisted)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.customers);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_CUSTOMERS;
  });

  // Restaurant Floor Tables state (persisted per branch)
  const [tables, setTables] = useState<RestaurantTable[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.tables);
      if (saved) {
        const parsed: RestaurantTable[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return buildDefaultTablesForTenant(activeTenant?.id || 'tenant-1');
  });

  // Online Store Cart state
  const [cartItems, setCartItems] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.cart);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const deliveryFee = 5.0;

  // Ensure every configured sucursal (including newly created locales like Local Merino) has floor tables
  useEffect(() => {
    const allTenantIds = Array.from(new Set([activeTenant.id, ...tenants.map((t) => t.id)]));
    setTables((prev) => {
      let changed = false;
      let next = [...prev];
      for (const tid of allTenantIds) {
        if (tid && !next.some((tb) => tb.tenantId === tid)) {
          next = [...next, ...buildDefaultTablesForTenant(tid)];
          changed = true;
        }
      }
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.tables, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      }
      return prev;
    });
  }, [activeTenant.id, tenants]);

  const emitRealtimeSync = useCallback(
    (
      entity: RealtimeMessage['entity'],
      extra?: Pick<RealtimeMessage, 'eventHint' | 'orderNumber' | 'orderStatus'>
    ) => {
      const nowIso = new Date().toISOString();
      setLastRealtimeSyncAt(nowIso);
      if (broadcastRef.current) {
        try {
          const msg: RealtimeMessage = {
            senderId: tabInstanceIdRef.current,
            entity,
            timestamp: nowIso,
            ...extra,
          };
          broadcastRef.current.postMessage(msg);
        } catch {
          // ignore closed channel
        }
      }
    },
    []
  );

  // Setup BroadcastChannel + window storage event listener for real-time Store <-> POS <-> KDS <-> Delivery sync across tabs & devices
  useEffect(() => {
    const reloadEntityFromStorage = (entity: RealtimeMessage['entity'], fromBroadcast = false) => {
      try {
        if (entity === 'orders') {
          const raw = localStorage.getItem(STORAGE_KEYS.orders);
          if (raw) {
            const parsed: Order[] = JSON.parse(raw);
            const prevOrders = ordersRef.current;
            const prevIds = new Set(prevOrders.map((o) => o.id));
            const newlyArrived = parsed.filter((o) => !prevIds.has(o.id));

            setOrders(parsed);

            // When an order arrives or changes status from another device via SSE
            if (!fromBroadcast) {
              if (newlyArrived.length > 0) {
                soundSynth.play(audioThemeRef.current || 'chime');
                const isErpSurface =
                  typeof window !== 'undefined' &&
                  (window.location.pathname.startsWith('/admin') ||
                    (localStorage.getItem('kh_active_main_module') || 'storefront') !== 'storefront');
                if (isErpSurface) {
                  const latest = newlyArrived[0];
                  dispatchToastRef.current(
                    `¡Nuevo Pedido en Vivo! ${latest.orderNumber}`,
                    `${latest.customerName} · S/ ${latest.total.toFixed(2)} (${
                      latest.channel === 'online' ? 'Tienda Virtual' : latest.channel
                    })`,
                    'success'
                  );
                }
              } else {
                const prevStatusById = new Map(prevOrders.map((o) => [o.id, o.status]));
                const statusAdvanced = parsed.some((o) => {
                  const oldSt = prevStatusById.get(o.id);
                  return oldSt && oldSt !== o.status && (o.status === 'listo' || o.status === 'en_ruta');
                });
                if (statusAdvanced) {
                  soundSynth.play(audioThemeRef.current || 'modern');
                }
              }
            }
          }
        } else if (entity === 'tables') {
          const raw = localStorage.getItem(STORAGE_KEYS.tables);
          if (raw) setTables(JSON.parse(raw));
        } else if (entity === 'customers') {
          const raw = localStorage.getItem(STORAGE_KEYS.customers);
          if (raw) {
            const parsed: Customer[] = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setCustomers((prev) => {
                const byId = new Map<string, Customer>(prev.map((c) => [c.id, c]));
                for (const incoming of parsed) {
                  if (!incoming?.id) continue;
                  const existing = byId.get(incoming.id);
                  if (!existing) {
                    byId.set(incoming.id, incoming);
                  } else {
                    const prevTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                    const nextTs = new Date(incoming.updatedAt || incoming.createdAt || 0).getTime();
                    if (nextTs >= prevTs) {
                      byId.set(incoming.id, incoming);
                    }
                  }
                }
                return Array.from(byId.values());
              });
            }
          }
        } else if (entity === 'products') {
          const raw = localStorage.getItem(STORAGE_KEYS.products);
          if (raw !== null) setProducts(JSON.parse(raw));
        }
        setLastRealtimeSyncAt(new Date().toISOString());
      } catch {
        // ignore parse errors
      }
    };

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
      broadcastRef.current = channel;
      channel.onmessage = (ev: MessageEvent<RealtimeMessage>) => {
        const msg = ev.data;
        if (!msg || msg.senderId === tabInstanceIdRef.current) return;
        reloadEntityFromStorage(msg.entity, true);

        if (msg.eventHint === 'new_order') {
          soundSynth.play(audioThemeRef.current || 'chime');
          if (window.location.pathname.startsWith('/admin') && msg.orderNumber) {
            dispatchToastRef.current(
              `¡Nuevo Pedido en Vivo! ${msg.orderNumber}`,
              'Comanda recibida automáticamente en Cocina KDS y Pedidos.',
              'success'
            );
          }
        } else if (msg.eventHint === 'order_status' && (msg.orderStatus === 'listo' || msg.orderStatus === 'en_ruta')) {
          soundSynth.play(audioThemeRef.current || 'modern');
        }
      };
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.orders) reloadEntityFromStorage('orders', false);
      else if (e.key === STORAGE_KEYS.tables) reloadEntityFromStorage('tables', false);
      else if (e.key === STORAGE_KEYS.customers) reloadEntityFromStorage('customers', false);
      else if (e.key === STORAGE_KEYS.products) reloadEntityFromStorage('products', false);
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (broadcastRef.current) {
        broadcastRef.current.close();
        broadcastRef.current = null;
      }
    };
  }, []);

  // Persist cart locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  const persistAndSyncProducts = (updater: (prev: Product[]) => Product[]) => {
    setProducts((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(next));
      } catch {
        // ignore
      }
      emitRealtimeSync('products');
      return next;
    });
  };

  const persistAndSyncOrders = (
    updater: (prev: Order[]) => Order[],
    hint?: Pick<RealtimeMessage, 'eventHint' | 'orderNumber' | 'orderStatus'>
  ) => {
    setOrders((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(next));
      } catch {
        // ignore
      }
      emitRealtimeSync('orders', hint);
      return next;
    });
  };

  const persistAndSyncCustomers = (updater: (prev: Customer[]) => Customer[]) => {
    setCustomers((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(next));
      } catch {
        // ignore
      }
      emitRealtimeSync('customers');
      return next;
    });
  };

  const persistAndSyncTables = (updater: (prev: RestaurantTable[]) => RestaurantTable[]) => {
    setTables((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEYS.tables, JSON.stringify(next));
      } catch {
        // ignore
      }
      emitRealtimeSync('tables');
      return next;
    });
  };

  const createProduct = (newProd: Product) => {
    persistAndSyncProducts((prev) => [newProd, ...prev]);
    dispatchToast('Producto Creado', `${newProd.name} se agregó al catálogo oficial.`, 'success');
  };

  const updateProduct = (updated: Product) => {
    persistAndSyncProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    dispatchToast('Producto Actualizado', `Los cambios en ${updated.name} se guardaron correctamente.`, 'success');
  };

  const deleteProduct = (productId: string) => {
    const target = products.find((p) => p.id === productId);
    persistAndSyncProducts((prev) => prev.filter((p) => p.id !== productId));
    dispatchToast(
      'Producto Eliminado',
      `Se quitó ${target?.name || 'el producto'} definitivamente del catálogo.`,
      'info'
    );
  };

  const toggleProductAvailability = (productId: string) => {
    persistAndSyncProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const next = !p.isAvailable;
          dispatchToast(
            next ? 'Producto Disponible' : 'Producto Pausado',
            `${p.name} ahora está ${next ? 'disponible para pedidos' : 'oculto de la venta'}.`,
            'info'
          );
          return { ...p, isAvailable: next };
        }
        return p;
      })
    );
  };

  // Customers CRM operations
  const upsertCustomer = (
    customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    silent = false
  ): Customer => {
    const cleanDni = (customerData.dni || '').replace(/\D/g, '');
    const cleanPhone = (customerData.whatsapp || '').trim();
    const now = new Date().toISOString();

    const existing = customers.find(
      (c) =>
        (customerData.id && c.id === customerData.id) ||
        (cleanDni.length >= 8 && c.dni === cleanDni) ||
        (!cleanDni && cleanPhone.length >= 7 && c.whatsapp === cleanPhone)
    );

    const record: Customer = existing
      ? {
          ...existing,
          dni: cleanDni || existing.dni,
          fullName: customerData.fullName.trim() || existing.fullName,
          email: customerData.email.trim() || existing.email,
          whatsapp: cleanPhone || existing.whatsapp,
          address: customerData.address.trim() || existing.address,
          reference: customerData.reference.trim() || existing.reference,
          loyaltyPoints:
            typeof customerData.loyaltyPoints === 'number'
              ? customerData.loyaltyPoints
              : existing.loyaltyPoints || 0,
          tenantId: customerData.tenantId || existing.tenantId,
          updatedAt: now,
        }
      : {
          id: customerData.id || `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dni: cleanDni,
          fullName: customerData.fullName.trim(),
          email: customerData.email.trim(),
          whatsapp: cleanPhone,
          address: customerData.address.trim(),
          reference: customerData.reference.trim(),
          loyaltyPoints: customerData.loyaltyPoints || 0,
          tenantId: customerData.tenantId || activeTenant.id,
          createdAt: now,
          updatedAt: now,
        };

    persistAndSyncCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === record.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });

    if (!silent) {
      dispatchToast(
        existing ? 'Cliente Actualizado' : 'Cliente Registrado en CRM',
        `${record.fullName} sincronizado en el módulo Clientes.`,
        'success'
      );
    }

    return record;
  };

  const deleteCustomer = (customerId: string) => {
    const target = customers.find((c) => c.id === customerId);
    persistAndSyncCustomers((prev) => prev.filter((c) => c.id !== customerId));

    // También eliminar la cuenta vinculada en Tienda Virtual para permitir re-registro y cerrar sesiones activas
    try {
      const STORE_ACCOUNTS_KEY = 'kh_store_customer_accounts_v1';
      const rawAccounts = localStorage.getItem(STORE_ACCOUNTS_KEY);
      if (rawAccounts) {
        const parsed = JSON.parse(rawAccounts);
        if (Array.isArray(parsed)) {
          const targetEmail = (target?.email || '').trim().toLowerCase();
          const targetPhone = (target?.whatsapp || '').replace(/\D/g, '').slice(-9);
          const targetDni = (target?.dni || '').replace(/\D/g, '');
          const filtered = parsed.filter((acc: any) => {
            if (!acc || typeof acc !== 'object') return false;
            if (acc.crmCustomerId && acc.crmCustomerId === customerId) return false;
            const accEmail = String(acc.email || '').trim().toLowerCase();
            const accPhone = String(acc.phone || '').replace(/\D/g, '').slice(-9);
            const accDni = String(acc.dni || '').replace(/\D/g, '');
            if (targetEmail && accEmail === targetEmail) return false;
            if (targetPhone.length >= 7 && accPhone === targetPhone) return false;
            if (targetDni.length >= 8 && accDni === targetDni) return false;
            return true;
          });
          if (filtered.length !== parsed.length) {
            const nextStr = JSON.stringify(filtered);
            localStorage.setItem(STORE_ACCOUNTS_KEY, nextStr);
            window.dispatchEvent(
              new StorageEvent('storage', { key: STORE_ACCOUNTS_KEY, newValue: nextStr })
            );
          }
        }
      }
    } catch {
      // ignore
    }

    dispatchToast('Cliente Eliminado', 'El registro fue retirado de la cartera CRM.', 'info');
  };

  const adjustCustomerPoints = (customerId: string, delta: number) => {
    const now = new Date().toISOString();
    persistAndSyncCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              loyaltyPoints: Math.max(0, (c.loyaltyPoints || 0) + delta),
              updatedAt: now,
            }
          : c
      )
    );
  };

  // Floor Tables operations
  const getTablesForTenant = useCallback(
    (tenantId: string): RestaurantTable[] => {
      return tables
        .filter((t) => t.tenantId === tenantId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    },
    [tables]
  );

  const addTable = (data: {
    tenantId: string;
    zone: string;
    name: string;
    capacity: number;
    shape: TableShape;
  }): RestaurantTable => {
    const branchTables = tables.filter((t) => t.tenantId === data.tenantId);
    const nextOrder = branchTables.length > 0 ? Math.max(...branchTables.map((t) => t.orderIndex)) + 1 : 0;
    const newTable: RestaurantTable = {
      id: `tbl-${data.tenantId}-${Date.now()}`,
      tenantId: data.tenantId,
      zone: data.zone.trim() || 'Salón Principal',
      name: data.name.trim(),
      capacity: Math.max(1, data.capacity),
      shape: data.shape,
      orderIndex: nextOrder,
    };
    persistAndSyncTables((prev) => [...prev, newTable]);
    dispatchToast('Mesa Añadida', `${newTable.name} creada en ${newTable.zone}.`, 'success');
    return newTable;
  };

  const updateTable = (updated: RestaurantTable) => {
    persistAndSyncTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    dispatchToast('Mesa Actualizada', `Configuración de ${updated.name} guardada.`, 'success');
  };

  const deleteTable = (tableId: string) => {
    persistAndSyncTables((prev) => prev.filter((t) => t.id !== tableId));
    dispatchToast('Mesa Eliminada', 'La mesa fue retirada del plano de salón.', 'info');
  };

  const moveTableOrder = (tableId: string, direction: 'prev' | 'next') => {
    persistAndSyncTables((prev) => {
      const target = prev.find((t) => t.id === tableId);
      if (!target) return prev;
      const sameZone = prev
        .filter((t) => t.tenantId === target.tenantId && t.zone === target.zone)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = sameZone.findIndex((t) => t.id === tableId);
      const swapIdx = direction === 'prev' ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= sameZone.length) return prev;

      const neighbor = sameZone[swapIdx];
      return prev.map((t) => {
        if (t.id === target.id) return { ...t, orderIndex: neighbor.orderIndex };
        if (t.id === neighbor.id) return { ...t, orderIndex: target.orderIndex };
        return t;
      });
    });
  };

  const createOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>): Order => {
    const maxNum = ordersRef.current.reduce((max, o) => {
      const num = parseInt(o.orderNumber.replace(/\D/g, ''), 10);
      return Number.isFinite(num) && num > max ? num : max;
    }, 1020);
    const nextNumber = maxNum + 1;
    const nowIso = new Date().toISOString();

    // Auto-register or update customer in CRM if real customer details are provided
    let linkedCustomerId = orderData.customerId;
    const rawName = (orderData.customerName || '').trim();
    const isGenericCustomer =
      !rawName ||
      rawName.toLowerCase() === 'cliente mostrador' ||
      rawName.toLowerCase().startsWith('mesa ');

    if (!isGenericCustomer || (orderData.customerDni && orderData.customerDni.length >= 8)) {
      const savedCustomer = upsertCustomer(
        {
          id: orderData.customerId,
          dni: orderData.customerDni || '',
          fullName: isGenericCustomer ? `Cliente DNI ${orderData.customerDni}` : rawName,
          email: orderData.customerEmail || '',
          whatsapp:
            orderData.customerPhone && orderData.customerPhone !== 'POS Mostrador' && orderData.customerPhone !== 'Salón'
              ? orderData.customerPhone
              : '',
          address:
            orderData.deliveryAddress && orderData.deliveryAddress !== 'Recojo en Sucursal'
              ? orderData.deliveryAddress
              : '',
          reference: orderData.deliveryReference || '',
          tenantId: orderData.tenantId,
        },
        true
      );
      linkedCustomerId = savedCustomer.id;
    }

    // Sanitizar ítems para evitar que imágenes pesadas en Base64 se dupliquen por cada pedido y llenen los 5MB de localStorage
    const sanitizedItems = (orderData.items || []).map(item => ({
      ...item,
      productImage:
        item.productImage && item.productImage.startsWith('data:') && item.productImage.length > 300
          ? ''
          : item.productImage,
      halfAndHalf: item.halfAndHalf
        ? {
            ...item.halfAndHalf,
            firstHalfImage:
              item.halfAndHalf.firstHalfImage &&
              item.halfAndHalf.firstHalfImage.startsWith('data:') &&
              item.halfAndHalf.firstHalfImage.length > 300
                ? ''
                : item.halfAndHalf.firstHalfImage,
            secondHalfImage:
              item.halfAndHalf.secondHalfImage &&
              item.halfAndHalf.secondHalfImage.startsWith('data:') &&
              item.halfAndHalf.secondHalfImage.length > 300
                ? ''
                : item.halfAndHalf.secondHalfImage,
          }
        : undefined,
    }));

    const newOrder: Order = {
      ...orderData,
      items: sanitizedItems,
      customerId: linkedCustomerId,
      id: `ord-${Date.now()}`,
      orderNumber: `#KH-${nextNumber}`,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: 'recibido',
    };

    persistAndSyncOrders((prev) => [newOrder, ...prev], {
      eventHint: 'new_order',
      orderNumber: newOrder.orderNumber,
      orderStatus: 'recibido',
    });

    // Respaldo directo en tabla relacional MySQL (orders / order_items)
    // La difusión SSE ocurre automáticamente en diskPersistence al confirmar guardado en kv_storage
    void (async () => {
      try {
        await fetch('/api/orders.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            id: newOrder.id,
            tenant_id: newOrder.tenantId,
            order_number: newOrder.orderNumber,
            channel: newOrder.channel,
            status: newOrder.status,
            customer_name: newOrder.customerName,
            customer_phone: newOrder.customerPhone,
            delivery_address: newOrder.deliveryAddress,
            payment_method: newOrder.paymentMethod,
            payment_status: newOrder.paymentStatus,
            total: newOrder.total,
            items: (newOrder.items || []).map((it) => ({
              id: it.productId,
              name: it.productName,
              quantity: it.quantity,
              price: it.unitPrice,
              totalPrice: it.totalPrice,
            })),
          }),
        });
      } catch {
        // ignore
      }
    })();

    dispatchToast(
      '¡Nuevo Pedido Sincronizado!',
      `Orden ${newOrder.orderNumber} enviada en tiempo real a Cocina KDS${
        newOrder.channel === 'online' || newOrder.channel === 'pos-delivery' ? ' y Delivery' : ''
      }.`,
      'success'
    );

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, patch?: OrderStatusPatch) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const nowIso = new Date().toISOString();

    persistAndSyncOrders(
      (prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            status,
            updatedAt: nowIso,
            ...(patch?.assignedDriverId ? { assignedDriverId: patch.assignedDriverId } : {}),
            ...(patch?.assignedDriverName ? { assignedDriverName: patch.assignedDriverName } : {}),
            ...(patch?.paymentStatus ? { paymentStatus: patch.paymentStatus } : {}),
            ...(patch?.pickupProofPhoto ? { pickupProofPhoto: patch.pickupProofPhoto } : {}),
            ...(patch?.pickupProofAt ? { pickupProofAt: patch.pickupProofAt } : {}),
            ...(patch?.pickupProofDriverName ? { pickupProofDriverName: patch.pickupProofDriverName } : {}),
            ...(patch?.deliveryProofPhoto ? { deliveryProofPhoto: patch.deliveryProofPhoto } : {}),
            ...(patch?.deliveryProofAt ? { deliveryProofAt: patch.deliveryProofAt } : {}),
            ...(patch?.deliveryProofDriverName ? { deliveryProofDriverName: patch.deliveryProofDriverName } : {}),
            ...(patch?.deliveryAuthorizedBy ? { deliveryAuthorizedBy: patch.deliveryAuthorizedBy } : {}),
            ...(status === 'en_ruta' ? { dispatchedAt: nowIso } : {}),
            ...(status === 'entregado' ? { deliveredAt: nowIso, paymentStatus: 'pagado' } : {}),
          };
        }),
      {
        eventHint: 'order_status',
        orderNumber: targetOrder?.orderNumber,
        orderStatus: status,
      }
    );

    void fetch(`/api/orders.php?id=${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status }),
    }).catch(() => {});

    if (targetOrder) {
      const prevStatus = targetOrder.status;
      const statusLabels: Record<OrderStatus, string> = {
        recibido: 'En Espera',
        en_cocina: 'En Preparación',
        en_horno: 'En Horno a la Leña 🔥',
        listo: 'Listo para Despacho / Recojo ✅',
        en_ruta: 'En Ruta de Delivery 🛵',
        entregado: 'Entregado / Completado 🎉',
        cancelado: 'Cancelado ❌',
      };
      dispatchToast(`Pedido ${targetOrder.orderNumber}`, `Estado en tiempo real: ${statusLabels[status]}`, 'info');

      // Notify external lifecycle listeners
      orderLifecycleListeners.forEach((listener) => {
        try {
          listener({ ...targetOrder, status }, prevStatus, status);
        } catch (err) {
          console.error('[OrderCatalog] Error en listener de ciclo de vida:', err);
        }
      });
    }
  };

  const appendItemsToOrder = (
    orderId: string,
    newItems: OrderItem[],
    additionalSubtotal: number,
    additionalTotal: number
  ) => {
    const nowIso = new Date().toISOString();
    persistAndSyncOrders(
      (prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            items: [...o.items, ...newItems],
            subtotal: o.subtotal + additionalSubtotal,
            total: o.total + additionalTotal,
            updatedAt: nowIso,
            status: 'en_cocina',
          };
        }),
      {
        eventHint: 'order_status',
        orderStatus: 'en_cocina',
      }
    );
    dispatchToast(
      'Comanda Adicional Enviada',
      'Los productos fueron agregados a la mesa y despachados a Cocina KDS.',
      'success'
    );
  };

  const markOrderPaid = (orderId: string) => {
    persistAndSyncOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'pagado', updatedAt: new Date().toISOString() } : o))
    );
    dispatchToast('Pago Confirmado', 'El pedido figura como pagado en todas las terminales.', 'success');
  };

  const deleteOrder = (orderId: string) => {
    void fetch(`/api/orders.php?id=${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    }).catch(() => {});
    persistAndSyncOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  // Cart operations
  const addToCart = (item: OrderItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size?.id === item.size?.id &&
          JSON.stringify(i.subOptions) === JSON.stringify(item.subOptions) &&
          JSON.stringify(i.extras) === JSON.stringify(item.extras)
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        const existing = copy[existingIdx];
        const newQty = existing.quantity + item.quantity;
        copy[existingIdx] = {
          ...existing,
          quantity: newQty,
          totalPrice: existing.unitPrice * newQty,
        };
        return copy;
      }
      return [...prev, item];
    });

    dispatchToast(
      'Agregado a la Bolsa',
      `${item.quantity}x ${item.productName} ${item.size ? `(${item.size.name})` : ''} añadido.`,
      'success'
    );
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const updateCartItemQty = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.itemId === itemId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              totalPrice: item.unitPrice * nextQty,
            };
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const cartTotal = cartSubtotal > 0 ? cartSubtotal + deliveryFee : 0;

  return (
    <OrderCatalogContext.Provider
      value={{
        products,
        orders,
        customers,
        tables,
        lastRealtimeSyncAt,
        createProduct,
        updateProduct,
        deleteProduct,
        toggleProductAvailability,
        createOrder,
        updateOrderStatus,
        appendItemsToOrder,
        markOrderPaid,
        deleteOrder,
        upsertCustomer,
        adjustCustomerPoints,
        deleteCustomer,
        getTablesForTenant,
        addTable,
        updateTable,
        deleteTable,
        moveTableOrder,
        cartItems,
        addToCart,
        removeFromCart,
        updateCartItemQty,
        clearCart,
        cartSubtotal,
        cartTotal,
        deliveryFee,
      }}
    >
      {children}
    </OrderCatalogContext.Provider>
  );
};

export const useOrderCatalog = () => {
  const context = useContext(OrderCatalogContext);
  if (!context) {
    throw new Error('useOrderCatalog must be used within an OrderCatalogProvider');
  }
  return context;
};
