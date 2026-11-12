import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import {
  Product,
  OrderItem,
  Order,
  OrderChannel,
  PaymentMethod,
  RestaurantTable,
  TableShape,
  Customer,
} from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { lookupPersonByDni } from '../../utils/dniLookup';
import { ProductCustomizerModal } from '../common/ProductCustomizerModal';
import { ThermalTicketBuilderModal } from './ThermalTicketBuilderModal';
import { CustomerAddressMapPicker } from './CustomerAddressMapPicker';
import { calculateDynamicDeliveryFee } from '../../utils/culqiCheckout';
import { printThermalTicket } from '../../utils/thermalPrinter';
import {
  Receipt,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  User as UserIcon,
  CreditCard,
  Banknote,
  Smartphone,
  Flame,
  Search,
  Lock,
  Unlock,
  Coins,
  X,
  LayoutGrid,
  Users,
  Wrench,
  Edit2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Fingerprint,
  Loader2,
  MapPin,
  Mail,
  Phone,
  Radio,
  ChevronDown,
  ChevronUp,
  Printer,
  Sun,
  Moon,
  Sparkles,
  Gift,
  Tag,
} from 'lucide-react';
import { useBenefits } from '../../context/BenefitsContext';
import { PointReward } from '../../types/benefits';

interface CashRegisterSession {
  isOpen: boolean;
  openedAt?: string;
  initialFloat: number;
  cashierName: string;
}

export interface POSViewProps {
  activeTab?: 'carta' | 'mesas';
  onTabChange?: (tab: 'carta' | 'mesas') => void;
  hideHeader?: boolean;
}

export const POSView: React.FC<POSViewProps> = ({
  activeTab: propActiveTab,
  onTabChange: propOnTabChange,
  hideHeader = false,
}) => {
  const {
    products,
    orders,
    customers,
    createOrder,
    updateOrderStatus,
    appendItemsToOrder,
    markOrderPaid,
    upsertCustomer,
    getTablesForTenant,
    addTable,
    updateTable,
    deleteTable,
    moveTableOrder,
  } = useOrderCatalog();
  const {
    activeTenant,
    companyInfo,
    dispatchToast,
    openNoticeModal,
    isDarkResolved,
    updateCustomization,
  } = useSettings();
  const { currentUser } = useRBAC();
  const { rewards, redeemReward, pointsConfig } = useBenefits();
  const { allCustomerAccounts, adjustAccountPointsById } = useStoreCustomer();
  const accounts = allCustomerAccounts;

  const [internalActiveTab, setInternalActiveTab] = useState<'carta' | 'mesas'>('carta');
  const activePosTab = propActiveTab ?? internalActiveTab;
  const setActivePosTab = propOnTabChange ?? setInternalActiveTab;

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);

  // Cash Register State (persisted per branch)
  const cashRegisterStorageKey = `kh_cash_register_${activeTenant.id}`;
  const [cashSession, setCashSession] = useState<CashRegisterSession>(() => {
    try {
      const saved = localStorage.getItem(cashRegisterStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      isOpen: false,
      initialFloat: 200.0,
      cashierName: currentUser.name,
    };
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(cashRegisterStorageKey);
      if (saved) {
        setCashSession(JSON.parse(saved));
      } else {
        setCashSession({ isOpen: false, initialFloat: 200.0, cashierName: currentUser.name });
      }
    } catch {
      // ignore
    }
  }, [cashRegisterStorageKey, currentUser.name]);

  useEffect(() => {
    try {
      localStorage.setItem(cashRegisterStorageKey, JSON.stringify(cashSession));
    } catch {
      // ignore
    }
  }, [cashSession, cashRegisterStorageKey]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === cashRegisterStorageKey && e.newValue) {
        try {
          setCashSession(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [cashRegisterStorageKey]);

  // Native <dialog> refs
  const aperturaDialogRef = useRef<HTMLDialogElement>(null);
  const customerDialogRef = useRef<HTMLDialogElement>(null);
  const tableEditorDialogRef = useRef<HTMLDialogElement>(null);
  const mobileCartDialogRef = useRef<HTMLDialogElement>(null);

  const aperturaTitleId = useId();
  const customerTitleId = useId();
  const tableEditorTitleId = useId();
  const mobileCartTitleId = useId();

  const [isAperturaModalOpen, setIsAperturaModalOpen] = useState(false);
  const [inputFloatAmount, setInputFloatAmount] = useState('200.00');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Ticket / Comanda State
  const [ticketItems, setTicketItems] = useState<OrderItem[]>([]);
  const [channel, setChannel] = useState<OrderChannel>('pos-salon');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');

  // Floor Tables & Builder State
  const branchTables = getTablesForTenant(activeTenant.id);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [showFloorMap, setShowFloorMap] = useState<boolean>(true);
  const [isTableBuilderMode, setIsTableBuilderMode] = useState<boolean>(false);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('todas');

  // Table Editor Modal State
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tblName, setTblName] = useState('');
  const [tblZone, setTblZone] = useState('Salón Principal');
  const [tblCapacity, setTblCapacity] = useState(4);
  const [tblShape, setTblShape] = useState<TableShape>('square');

  // Auto-select first table for current branch if none selected
  useEffect(() => {
    if (branchTables.length > 0 && (!selectedTableId || !branchTables.some((t) => t.id === selectedTableId))) {
      setSelectedTableId(branchTables[0].id);
    }
  }, [branchTables, selectedTableId]);

  const selectedTable = branchTables.find((t) => t.id === selectedTableId) || branchTables[0] || null;

  // Customer Identification & Registration State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [quickDniInput, setQuickDniInput] = useState('');
  const [isLookingUpDni, setIsLookingUpDni] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [appliedReward, setAppliedReward] = useState<PointReward | null>(null);
  const [customerSearchMatches, setCustomerSearchMatches] = useState<Customer[]>([]);
  const [showCustomerSearchDropdown, setShowCustomerSearchDropdown] = useState(false);

  // Matched Storefront Customer Account (Omnichannel Loyalty Sync)
  const matchedStoreAccount = useMemo(() => {
    if (!selectedCustomer) return null;
    const cleanDni = (selectedCustomer.dni || '').replace(/\D/g, '');
    const cleanPhone = (selectedCustomer.whatsapp || '').replace(/\D/g, '').slice(-9);
    return (
      accounts.find(
        (a) =>
          (cleanDni.length >= 8 && a.dni && a.dni.replace(/\D/g, '') === cleanDni) ||
          (cleanPhone.length >= 7 && a.phone && a.phone.replace(/\D/g, '').slice(-9) === cleanPhone) ||
          (a.fullName &&
            selectedCustomer.fullName &&
            a.fullName.toLowerCase().trim() === selectedCustomer.fullName.toLowerCase().trim())
      ) || null
    );
  }, [selectedCustomer, accounts]);

  const customerPoints = matchedStoreAccount
    ? (matchedStoreAccount.points || 0)
    : (selectedCustomer?.loyaltyPoints || 0);

  // Sync points to selectedCustomer in state if account has updated points
  useEffect(() => {
    if (selectedCustomer && matchedStoreAccount) {
      if ((selectedCustomer.loyaltyPoints ?? 0) !== (matchedStoreAccount.points ?? 0)) {
        setSelectedCustomer((prev) =>
          prev ? { ...prev, loyaltyPoints: matchedStoreAccount.points || 0 } : null
        );
      }
    }
  }, [selectedCustomer, matchedStoreAccount]);

  // Auto-apertura de caja si la caja está cerrada al ingresar al POS
  useEffect(() => {
    if (!cashSession.isOpen) {
      setIsAperturaModalOpen(true);
    }
  }, [cashSession.isOpen]);

  // Customer Form Fields (DNI API + Manual)
  const [custId, setCustId] = useState<string | undefined>(undefined);
  const [custDni, setCustDni] = useState('');
  const [custFullName, setCustFullName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custWhatsapp, setCustWhatsapp] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custReference, setCustReference] = useState('');
  const [custCoords, setCustCoords] = useState<[number, number] | null>(null);
  const [custDistanceKm, setCustDistanceKm] = useState<number | undefined>(undefined);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [dniFeedbackMsg, setDniFeedbackMsg] = useState('');

  // Sync native <dialog> visibility
  useEffect(() => {
    const dlg = aperturaDialogRef.current;
    if (!dlg) return;
    if (isAperturaModalOpen) {
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
    }
  }, [isAperturaModalOpen]);

  useEffect(() => {
    const dlg = customerDialogRef.current;
    if (!dlg) return;
    if (isCustomerModalOpen) {
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
    }
  }, [isCustomerModalOpen]);

  useEffect(() => {
    const dlg = tableEditorDialogRef.current;
    if (!dlg) return;
    if (isTableModalOpen) {
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
    }
  }, [isTableModalOpen]);

  useEffect(() => {
    const dlg = mobileCartDialogRef.current;
    if (!dlg) return;
    if (isMobileCartOpen) {
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
    }
  }, [isMobileCartOpen]);

  // Zones for active branch
  const availableZones = useMemo(() => {
    const set = new Set<string>(['Salón Principal', 'Terraza', 'Barra']);
    branchTables.forEach((t) => set.add(t.zone));
    return Array.from(set);
  }, [branchTables]);

  const visibleTables = useMemo(() => {
    if (activeZoneFilter === 'todas') return branchTables;
    return branchTables.filter((t) => t.zone === activeZoneFilter);
  }, [branchTables, activeZoneFilter]);

  // Active live salon orders mapped by tableId or tableNumber
  const activeSalonOrdersByTable = useMemo(() => {
    const map = new Map<string, typeof orders[number]>();
    orders
      .filter(
        (o) =>
          o.tenantId === activeTenant.id &&
          o.channel === 'pos-salon' &&
          o.status !== 'entregado' &&
          o.status !== 'cancelado'
      )
      .forEach((o) => {
        if (o.tableId && !map.has(o.tableId)) {
          map.set(o.tableId, o);
        } else if (o.tableNumber) {
          const matchTbl = branchTables.find((t) => t.name === o.tableNumber);
          if (matchTbl && !map.has(matchTbl.id)) {
            map.set(matchTbl.id, o);
          }
        }
      });
    return map;
  }, [orders, activeTenant.id, branchTables]);

  const occupiedTablesCount = useMemo(() => {
    return activeSalonOrdersByTable.size;
  }, [activeSalonOrdersByTable]);

  // Filter catalog products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isAvailable) return false;
      const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const subtotal = ticketItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const activeBranchTariff = activeTenant.operations?.deliveryTariff || companyInfo.deliveryTariff;
  const currentCustomerDistanceKm = selectedCustomer?.distanceKm ?? custDistanceKm ?? null;
  const dynamicDelivery = calculateDynamicDeliveryFee({
    orderMode: channel === 'pos-delivery' ? 'delivery' : 'pickup',
    distanceKm: currentCustomerDistanceKm,
    branchMaxRadiusKm: activeTenant.operations?.deliveryRadiusKm || 8,
    cartSubtotal: subtotal,
    tariff: activeBranchTariff,
  });
  const deliveryExtra = channel === 'pos-delivery' && ticketItems.length > 0 ? dynamicDelivery.feeSoles : 0;
  const rewardDiscount = appliedReward ? Math.min(subtotal, appliedReward.discountValue) : 0;
  const total = Math.max(0, subtotal + deliveryExtra - rewardDiscount);
  const totalUnits = ticketItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddItemToTicket = (item: OrderItem) => {
    setTicketItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size?.id === item.size?.id &&
          JSON.stringify(i.subOptions) === JSON.stringify(item.subOptions) &&
          JSON.stringify(i.extras) === JSON.stringify(item.extras) &&
          (i.notes || '') === (item.notes || '')
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        const existing = copy[existingIdx];
        const nextQty = existing.quantity + item.quantity;
        copy[existingIdx] = {
          ...existing,
          quantity: nextQty,
          totalPrice: existing.unitPrice * nextQty,
        };
        return copy;
      }
      return [...prev, item];
    });
  };

  const handleRemoveTicketItem = (itemId: string) => {
    setTicketItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleUpdateItemQty = (itemId: string, delta: number) => {
    setTicketItems((prev) =>
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

  // Cash Register handlers
  const handleOpenCashRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(inputFloatAmount) || 0;
    setCashSession({
      isOpen: true,
      openedAt: new Date().toISOString(),
      initialFloat: amount,
      cashierName: currentUser.name,
    });
    setIsAperturaModalOpen(false);
    dispatchToast('Caja Aperturada', `Turno iniciado con fondo de caja de S/ ${amount.toFixed(2)}.`, 'success');
  };

  const handleCloseCashRegister = () => {
    openNoticeModal({
      title: '¿Cerrar Caja del Turno Actual?',
      message: `Se registrará el cierre de caja de ${currentUser.name} en ${activeTenant.name}.`,
      tone: 'warning',
      confirmLabel: 'Confirmar Cierre',
      cancelLabel: 'Seguir Operando',
      onConfirm: () => {
        setCashSession({
          isOpen: false,
          initialFloat: 0,
          cashierName: currentUser.name,
        });
        dispatchToast('Caja Cerrada', 'Se ha cerrado el turno de caja correctamente.', 'info');
      },
    });
  };

  // DNI Lookup & Customer Modal handlers
  const openCustomerModal = (prefill?: Partial<Customer>, statusNote = '') => {
    setCustId(prefill?.id);
    setCustDni(prefill?.dni || quickDniInput.replace(/\D/g, '').slice(0, 8));
    setCustFullName(prefill?.fullName || '');
    setCustEmail(prefill?.email || '');
    setCustWhatsapp(prefill?.whatsapp || '');
    setCustAddress(prefill?.address || '');
    setCustReference(prefill?.reference || '');
    setCustCoords(prefill?.latitude && prefill?.longitude ? [prefill.latitude, prefill.longitude] : null);
    setCustDistanceKm(prefill?.distanceKm);
    setDniFeedbackMsg(statusNote);
    setIsCustomerModalOpen(true);
  };

  const handleConfirmMapLocation = (coords: [number, number], addressText: string, distance: number) => {
    setCustCoords(coords);
    if (addressText) {
      setCustAddress(addressText);
    }
    setCustDistanceKm(distance);
    dispatchToast('Ubicación Fijada', `Coordenadas guardadas a ${distance} km de la sede.`, 'success');
  };

  const handleQuickCustomerSearch = async (searchTerm?: string) => {
    const raw = (searchTerm ?? quickDniInput).trim();
    if (!raw) return;

    // Check if it's 8 digits (DNI lookup)
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length === 8 && raw.length === 8) {
      await handleQuickDniLookup(digitsOnly);
      return;
    }

    // Search by name, phone or DNI in CRM
    const q = raw.toLowerCase();
    const matches = customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.dni.includes(q) ||
        c.whatsapp.includes(q)
    );

    if (matches.length === 1) {
      setSelectedCustomer(matches[0]);
      setShowCustomerSearchDropdown(false);
      setQuickDniInput('');
      dispatchToast('Cliente Vinculado', `${matches[0].fullName} cargado (${matches[0].loyaltyPoints || 0} pts).`, 'success');
    } else if (matches.length > 1) {
      setCustomerSearchMatches(matches);
      setShowCustomerSearchDropdown(true);
    } else {
      if (digitsOnly.length === 8) {
        await handleQuickDniLookup(digitsOnly);
      } else {
        dispatchToast('No Encontrado', `No se encontró ningún cliente con "${raw}". Puedes crearlo con "+ Manual".`, 'info');
      }
    }
  };

  const handleQuickDniLookup = async (rawDniValue?: string) => {
    const clean = (rawDniValue ?? quickDniInput).replace(/\D/g, '').slice(0, 8);
    if (clean.length !== 8) {
      dispatchToast('DNI de 8 Dígitos', 'Ingresa 8 números de DNI para consultar o abre el registro manual.', 'warning');
      return;
    }

    setIsLookingUpDni(true);
    const result = await lookupPersonByDni(clean, customers);
    setIsLookingUpDni(false);

    if (result.source === 'crm' && result.existingCustomer) {
      setSelectedCustomer(result.existingCustomer);
      setQuickDniInput(clean);
      dispatchToast('Cliente Vinculado', `${result.existingCustomer.fullName} cargado desde Clientes CRM.`, 'success');
      return;
    }

    openCustomerModal(
      {
        dni: clean,
        fullName: result.fullName,
        email: result.email || '',
        whatsapp: result.whatsapp || '',
        address: result.address || '',
        reference: result.reference || '',
      },
      result.message
    );
  };

  const handleModalDniLookup = async () => {
    const clean = custDni.replace(/\D/g, '').slice(0, 8);
    if (clean.length !== 8) {
      setDniFeedbackMsg('Ingresa los 8 dígitos del DNI para consultar RENIEC.');
      return;
    }
    setIsLookingUpDni(true);
    const result = await lookupPersonByDni(clean, customers);
    setIsLookingUpDni(false);
    setDniFeedbackMsg(result.message);

    if (result.existingCustomer) {
      setCustId(result.existingCustomer.id);
      setCustFullName(result.existingCustomer.fullName);
      setCustEmail(result.existingCustomer.email);
      setCustWhatsapp(result.existingCustomer.whatsapp);
      setCustAddress(result.existingCustomer.address);
      setCustReference(result.existingCustomer.reference);
      setCustCoords(
        result.existingCustomer.latitude && result.existingCustomer.longitude
          ? [result.existingCustomer.latitude, result.existingCustomer.longitude]
          : null
      );
      setCustDistanceKm(result.existingCustomer.distanceKm);
    } else if (result.fullName) {
      setCustFullName(result.fullName);
    }
  };

  const handleSaveCustomerModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custFullName.trim()) {
      dispatchToast('Nombre Requerido', 'Ingresa los nombres y apellidos del cliente.', 'warning');
      return;
    }

    const saved = upsertCustomer({
      id: custId,
      dni: custDni.replace(/\D/g, '').slice(0, 8),
      fullName: custFullName.trim(),
      email: custEmail.trim(),
      whatsapp: custWhatsapp.trim(),
      address: custAddress.trim(),
      reference: custReference.trim(),
      latitude: custCoords ? custCoords[0] : undefined,
      longitude: custCoords ? custCoords[1] : undefined,
      distanceKm: custDistanceKm,
      tenantId: activeTenant.id,
    });

    setSelectedCustomer(saved);
    setQuickDniInput(saved.dni || '');
    setIsCustomerModalOpen(false);
  };

  // Floor Table Builder handlers
  const handleOpenCreateTable = () => {
    setEditingTable(null);
    setTblName(`Mesa ${branchTables.length + 1}`);
    setTblZone(activeZoneFilter === 'todas' ? 'Salón Principal' : activeZoneFilter);
    setTblCapacity(4);
    setTblShape('square');
    setIsTableModalOpen(true);
  };

  const handleOpenEditTable = (table: RestaurantTable) => {
    setEditingTable(table);
    setTblName(table.name);
    setTblZone(table.zone);
    setTblCapacity(table.capacity);
    setTblShape(table.shape);
    setIsTableModalOpen(true);
  };

  const handleSaveTableModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tblName.trim()) return;
    if (editingTable) {
      updateTable({
        ...editingTable,
        name: tblName.trim(),
        zone: tblZone.trim() || 'Salón Principal',
        capacity: tblCapacity,
        shape: tblShape,
      });
    } else {
      const created = addTable({
        tenantId: activeTenant.id,
        name: tblName.trim(),
        zone: tblZone.trim() || 'Salón Principal',
        capacity: tblCapacity,
        shape: tblShape,
      });
      setSelectedTableId(created.id);
    }
    setIsTableModalOpen(false);
  };

  const handleConfirmDeleteTable = (table: RestaurantTable) => {
    if (branchTables.length <= 1) {
      dispatchToast('Acción No Permitida', 'Debe existir al menos una mesa configurada en la sucursal.', 'warning');
      return;
    }
    openNoticeModal({
      title: `¿Eliminar ${table.name}?`,
      message: `Se retirará "${table.name}" (${table.zone}) del constructor de salón de ${activeTenant.name}.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Mesa',
      cancelLabel: 'Cancelar',
      onConfirm: () => deleteTable(table.id),
    });
  };

  const handleSendToKitchen = () => {
    if (!cashSession.isOpen) {
      setIsMobileCartOpen(false);
      setIsAperturaModalOpen(true);
      dispatchToast('Apertura Requerida', 'Debes aperturar la caja con el fondo inicial antes de emitir comandas.', 'warning');
      return;
    }

    if (ticketItems.length === 0) {
      dispatchToast('Comanda Vacía', 'Toca al menos un producto para agregarlo al pedido.', 'warning');
      return;
    }

    if (channel === 'pos-salon' && !selectedTable) {
      dispatchToast('Selecciona una Mesa', 'Elige una mesa en el constructor de salón antes de comandar.', 'warning');
      return;
    }

    if (channel === 'pos-delivery' && (!selectedCustomer || !selectedCustomer.address.trim())) {
      setIsMobileCartOpen(false);
      openCustomerModal(selectedCustomer || undefined, 'Para Delivery, registra o confirma dirección y referencia del cliente.');
      return;
    }

    const displayCustomerName = selectedCustomer
      ? selectedCustomer.fullName
      : channel === 'pos-salon' && selectedTable
      ? `${selectedTable.name} (Salón)`
      : 'Cliente Mostrador';

    const newOrder = createOrder({
      channel,
      tenantId: activeTenant.id,
      customerId: selectedCustomer?.id,
      customerDni: selectedCustomer?.dni || undefined,
      customerName: displayCustomerName,
      customerPhone: selectedCustomer?.whatsapp || (channel === 'pos-salon' ? 'Salón' : 'POS Mostrador'),
      customerEmail: selectedCustomer?.email || undefined,
      tableId: channel === 'pos-salon' ? selectedTable?.id : undefined,
      tableNumber: channel === 'pos-salon' ? selectedTable?.name : undefined,
      deliveryAddress: channel === 'pos-delivery' ? selectedCustomer?.address : undefined,
      deliveryReference: channel === 'pos-delivery' ? selectedCustomer?.reference : undefined,
      paymentMethod,
      paymentStatus: channel === 'pos-delivery' && paymentMethod !== 'yape_plin' ? 'pendiente' : 'pagado',
      items: ticketItems,
      subtotal,
      deliveryFee: deliveryExtra,
      discount: rewardDiscount,
      rewardRedeemedTitle: appliedReward ? appliedReward.title : undefined,
      total,
      estimatedMinutes: channel === 'pos-delivery' ? 30 : 18,
    });

    if (appliedReward && selectedCustomer) {
      if (matchedStoreAccount) {
        adjustAccountPointsById(
          matchedStoreAccount.id,
          -appliedReward.pointsCost,
          `Canje en POS (${appliedReward.title})`
        );
      }
      const remainingPts = Math.max(0, customerPoints - appliedReward.pointsCost);
      upsertCustomer(
        {
          ...selectedCustomer,
          loyaltyPoints: remainingPts,
        },
        true
      );
      setSelectedCustomer((prev) => (prev ? { ...prev, loyaltyPoints: remainingPts } : null));
      redeemReward(appliedReward.id, selectedCustomer.fullName, selectedCustomer.whatsapp, newOrder.orderNumber);
      dispatchToast(
        'Premio Canjeado',
        `Se canjeó "${appliedReward.title}" por ${appliedReward.pointsCost} puntos.`,
        'success'
      );
      setAppliedReward(null);
    }

    setTicketItems([]);
    setIsMobileCartOpen(false);
  };

  const handlePayTableOrder = (activeOrder: Order) => {
    markOrderPaid(activeOrder.id);
    updateOrderStatus(activeOrder.id, 'entregado', { paymentStatus: 'pagado' });
    printThermalTicket('receipt', activeOrder);
    dispatchToast(
      'Mesa Cobrada y Liberada',
      `La orden ${activeOrder.orderNumber} (${selectedTable?.name || 'Salón'}) fue cobrada y el recibo se envió a impresión.`,
      'success'
    );
    setIsMobileCartOpen(false);
  };

  const handleSendAdditionalToKitchen = (activeOrder: Order) => {
    if (ticketItems.length === 0) return;
    appendItemsToOrder(activeOrder.id, ticketItems, subtotal, total);
    printThermalTicket('comanda', {
      ...activeOrder,
      items: ticketItems,
      total,
    });
    setTicketItems([]);
    setIsMobileCartOpen(false);
  };

  const handlePrintTableBill = (activeOrder: Order) => {
    printThermalTicket('receipt', activeOrder);
    dispatchToast(
      'Pre-cuenta Impresa',
      `Se envió la pre-cuenta de ${selectedTable?.name || 'la mesa'} a la impresora térmica.`,
      'info'
    );
  };

  // Shared Comanda / Ticket Panel JSX (rendered in narrow desktop sidebar AND mobile bottom-sheet dialog)
  const renderComandaContent = () => {
    const currentTableActiveOrder =
      channel === 'pos-salon' && selectedTable
        ? activeSalonOrdersByTable.get(selectedTable.id)
        : null;

    return (
    <div className="flex flex-col h-full space-y-3">
      {/* Tactile Channel Switcher (Salón / Llevar / Delivery) */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 w-full shrink-0">
        {[
          { id: 'pos-salon' as const, label: 'Salón', icon: UtensilsCrossed },
          { id: 'pos-takeaway' as const, label: 'Llevar', icon: ShoppingBag },
          { id: 'pos-delivery' as const, label: 'Delivery', icon: Bike },
        ].map((ch) => {
          const Icon = ch.icon;
          const active = channel === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => {
                setChannel(ch.id);
                if (ch.id === 'pos-salon' && !selectedTableId && branchTables.length > 0) {
                  setSelectedTableId(branchTables[0].id);
                }
              }}
              className={`min-h-[40px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${
                active
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{ch.label}</span>
            </button>
          );
        })}
      </div>

      {/* Comanda Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <Receipt className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
          <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white truncate">
            {currentTableActiveOrder && ticketItems.length === 0 ? 'Mesa en Consumo' : 'Comanda Activa'}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase shrink-0">
          {channel === 'pos-salon' ? 'Salón' : channel === 'pos-takeaway' ? 'Para Llevar' : 'Delivery'}
        </span>
      </div>

      {/* Selected Table Indicator (Salón) */}
      {channel === 'pos-salon' && (
        <button
          type="button"
          onClick={() => {
            setIsMobileCartOpen(false);
            setActivePosTab('mesas');
          }}
          className="min-h-[44px] w-full px-3 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-between gap-2 text-left transition-colors"
        >
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              Mesa Asignada
            </span>
            <span className="text-xs font-black text-zinc-900 dark:text-white truncate block">
              {selectedTable ? `${selectedTable.name} · ${selectedTable.zone} (${selectedTable.capacity}p)` : 'Toca para elegir mesa'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0 bg-amber-500/20 px-2 py-1 rounded-xl">
            Ver Plano 🪑
          </span>
        </button>
      )}

      {/* Customer DNI Lookup & Manual CRM Selector (Only when opening a new ticket) */}
      {(!currentTableActiveOrder || ticketItems.length > 0) && (
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <UserIcon className="w-3 h-3 text-amber-500" aria-hidden="true" /> Cliente (API DNI / CRM)
            </span>
            <button
              type="button"
              onClick={() => openCustomerModal(selectedCustomer || undefined)}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              {selectedCustomer ? 'Editar Datos' : '+ Manual'}
            </button>
          </div>

          {selectedCustomer ? (
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-500/30 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 text-xs">
                  <p className="font-bold text-zinc-900 dark:text-white truncate">{selectedCustomer.fullName}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {selectedCustomer.dni ? `DNI ${selectedCustomer.dni}` : 'Sin DNI'}
                    {selectedCustomer.whatsapp ? ` · ${selectedCustomer.whatsapp}` : ''}
                  </p>
                  {selectedCustomer.address && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate mt-0.5">
                      📍 {selectedCustomer.address}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Desvincular cliente"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setAppliedReward(null);
                    setQuickDniInput('');
                  }}
                  className="p-1 rounded-md text-zinc-400 hover:text-rose-500 shrink-0"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Loyalty Points & Active Rewards */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Puntos Club: {customerPoints} pts
                  </span>
                  {appliedReward && (
                    <button
                      type="button"
                      onClick={() => setAppliedReward(null)}
                      className="text-[10px] font-bold text-rose-500 hover:underline"
                    >
                      Quitar canje
                    </button>
                  )}
                </div>

                {appliedReward ? (
                  <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-between">
                    <span className="truncate">🎁 {appliedReward.title}</span>
                    <span className="shrink-0 font-mono">-S/ {appliedReward.discountValue.toFixed(2)}</span>
                  </div>
                ) : (
                  (() => {
                    const claimable = rewards.filter(
                      (r) => r.isActive && r.pointsCost <= customerPoints
                    );
                    if (claimable.length === 0) {
                      return (
                        <p className="text-[10px] text-zinc-400 italic">
                          {customerPoints === 0
                            ? 'Sin puntos acumulados aún.'
                            : 'No alcanza para premios activos.'}
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-500 font-semibold">Premios canjeables:</p>
                        {claimable.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setAppliedReward(r);
                              dispatchToast('Premio Seleccionado', `Se aplicará "${r.title}" al ticket.`, 'info');
                            }}
                            className="w-full p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500 text-left text-xs flex items-center justify-between transition-all"
                          >
                            <span className="truncate text-zinc-900 dark:text-white font-medium">
                              {r.badgeIcon} {r.title} ({r.pointsCost} pts)
                            </span>
                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 shrink-0 ml-1">
                              Canjear
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={quickDniInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickDniInput(val);
                    const q = val.trim().toLowerCase();
                    if (q.length >= 2) {
                      const matches = customers
                        .filter(
                          (c) =>
                            c.fullName.toLowerCase().includes(q) ||
                            c.dni.includes(q) ||
                            c.whatsapp.includes(q)
                        )
                        .slice(0, 5);
                      setCustomerSearchMatches(matches);
                      setShowCustomerSearchDropdown(matches.length > 0);
                    } else {
                      setShowCustomerSearchDropdown(false);
                    }
                    const clean = val.replace(/\D/g, '').slice(0, 8);
                    if (clean.length === 8 && val.length === 8) {
                      void handleQuickDniLookup(clean);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleQuickCustomerSearch();
                    }
                  }}
                  placeholder="DNI (8 dígitos) o Nombre..."
                  aria-label="Buscar cliente por DNI o Nombre"
                  className="min-h-[40px] flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={isLookingUpDni}
                  onClick={() => void handleQuickCustomerSearch()}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                >
                  {isLookingUpDni ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>Buscar</span>
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showCustomerSearchDropdown && customerSearchMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto saas-scroll">
                  {customerSearchMatches.map((c) => {
                    const cleanDni = (c.dni || '').replace(/\D/g, '');
                    const cleanPhone = (c.whatsapp || '').replace(/\D/g, '').slice(-9);
                    const acc = accounts.find(
                      (a) =>
                        (cleanDni && a.dni && a.dni.replace(/\D/g, '') === cleanDni) ||
                        (cleanPhone && a.phone && a.phone.replace(/\D/g, '').slice(-9) === cleanPhone) ||
                        (a.fullName &&
                          c.fullName &&
                          a.fullName.toLowerCase().trim() === c.fullName.toLowerCase().trim())
                    );
                    const pts = acc ? acc.points || 0 : c.loyaltyPoints || 0;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer({ ...c, loyaltyPoints: pts });
                          setShowCustomerSearchDropdown(false);
                          setQuickDniInput('');
                          dispatchToast(
                            'Cliente Vinculado',
                            `${c.fullName} seleccionado (${pts} pts).`,
                            'success'
                          );
                        }}
                        className="w-full text-left p-2.5 hover:bg-amber-500/10 border-b border-zinc-100 dark:border-zinc-800 last:border-0 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{c.fullName}</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {c.dni ? `DNI ${c.dni}` : 'Sin DNI'} {c.whatsapp ? `· ${c.whatsapp}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md shrink-0">
                          ⭐ {pts} pts
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cart Items List OR Occupied Table Active Order */}
      {currentTableActiveOrder && ticketItems.length === 0 ? (
        // OCCUPIED TABLE: Shows the current active order waiting to be billed/paid
        <div className="flex-1 min-h-[170px] max-h-[320px] lg:max-h-[340px] overflow-y-auto saas-scroll space-y-2 pr-0.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Cuenta Activa {currentTableActiveOrder.orderNumber}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-zinc-950">
              {currentTableActiveOrder.status === 'en_horno'
                ? 'En Horno 🔥'
                : currentTableActiveOrder.status === 'listo'
                ? 'Listo p/ Despacho ✅'
                : 'En Cocina 👨‍🍳'}
            </span>
          </div>

          <div className="space-y-1.5">
            {currentTableActiveOrder.items.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-zinc-900 dark:text-white leading-tight">
                        {item.quantity}x {item.productName}
                      </span>
                      {item.size && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          {item.size.name}
                        </span>
                      )}
                    </div>
                    {item.subOptions && item.subOptions.length > 0 && (
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {item.subOptions.map((s) => s.choiceName).join(' · ')}
                      </div>
                    )}
                    {item.extras && item.extras.length > 0 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        + {item.extras.map((e) => e.name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[10px] text-zinc-500 italic">"{item.notes}"</div>
                    )}
                  </div>
                  <span className="font-black text-xs text-zinc-900 dark:text-white shrink-0">
                    S/ {item.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center bg-zinc-50/50 dark:bg-zinc-950/50">
            <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              ¿Desean pedir algo más a la mesa?
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
              Toca cualquier producto de la carta para agregar adicionales a la cuenta.
            </p>
          </div>
        </div>
      ) : (
        // TICKET ITEMS LIST
        <div className="flex-1 min-h-[170px] max-h-[320px] lg:max-h-[340px] overflow-y-auto saas-scroll space-y-2 pr-0.5">
          {currentTableActiveOrder && ticketItems.length > 0 && (
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-between text-xs">
              <span className="font-bold text-blue-700 dark:text-blue-300">
                + Adicionales p/ {selectedTable?.name} ({currentTableActiveOrder.orderNumber})
              </span>
              <button
                type="button"
                onClick={() => setTicketItems([])}
                className="text-[10px] text-rose-500 underline font-bold"
              >
                Descartar
              </button>
            </div>
          )}

          {ticketItems.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              <Receipt className="w-7 h-7 mb-1.5 opacity-40" aria-hidden="true" />
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Comanda vacía</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Toca cualquier producto para añadirlo.</p>
            </div>
          ) : (
            ticketItems.map((item) => (
              <div
                key={item.itemId}
                className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-zinc-900 dark:text-white leading-tight">
                        {item.productName}
                      </span>
                      {item.size && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          {item.size.name}
                        </span>
                      )}
                    </div>

                    {item.subOptions.length > 0 && (
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {item.subOptions.map((s) => s.choiceName).join(' · ')}
                      </div>
                    )}

                    {item.extras.length > 0 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        + {item.extras.map((e) => e.name).join(', ')}
                      </div>
                    )}

                    {item.notes && (
                      <div className="text-[10px] text-zinc-500 italic">"{item.notes}"</div>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label={`Quitar ${item.productName}`}
                    onClick={() => handleRemoveTicketItem(item.itemId)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-500/10 shrink-0 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5">
                    <button
                      type="button"
                      aria-label="Restar unidad"
                      onClick={() => handleUpdateItemQty(item.itemId, -1)}
                      className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-zinc-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Sumar unidad"
                      onClick={() => handleUpdateItemQty(item.itemId, 1)}
                      className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <span className="font-black text-xs text-amber-600 dark:text-amber-400">
                    S/ {item.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tactile Payment Method Selector */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
          Método de Pago
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'efectivo' as const, label: 'Efectivo', icon: Banknote },
            { id: 'yape_plin' as const, label: 'Yape/Plin', icon: Smartphone },
            { id: 'tarjeta' as const, label: 'Tarjeta', icon: CreditCard },
          ].map((pm) => {
            const Icon = pm.icon;
            const active = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id)}
                className={`min-h-[42px] px-2 py-1.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  active
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{pm.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Totals & Submit */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
        {currentTableActiveOrder && ticketItems.length === 0 ? (
          // OCCUPIED TABLE: Totals and "Cobrar Mesa" (NOT "Comandar a Cocina"!)
          <>
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Subtotal ({currentTableActiveOrder.items.reduce((s, i) => s + i.quantity, 0)} ítems)</span>
              <span>S/ {currentTableActiveOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-zinc-900 dark:text-white pt-1">
              <span>Total a Cobrar</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                S/ {currentTableActiveOrder.total.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePrintTableBill(currentTableActiveOrder)}
                className="min-h-[46px] whitespace-nowrap shrink-0 py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-amber-500" />
                <span>Pre-cuenta</span>
              </button>

              <button
                type="button"
                onClick={() => handlePayTableOrder(currentTableActiveOrder)}
                className="min-h-[46px] whitespace-nowrap shrink-0 py-2 px-3 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cobrar Mesa</span>
              </button>
            </div>
          </>
        ) : currentTableActiveOrder && ticketItems.length > 0 ? (
          // OCCUPIED TABLE + NEW ITEMS: "Comandar Adicional"
          <>
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Adicional ({totalUnits} ítems)</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-zinc-900 dark:text-white pt-1">
              <span>Total Adicional</span>
              <span className="text-amber-600 dark:text-amber-400">S/ {total.toFixed(2)}</span>
            </div>

            <button
              type="button"
              onClick={() => handleSendAdditionalToKitchen(currentTableActiveOrder)}
              className="w-full min-h-[48px] whitespace-nowrap shrink-0 py-3 px-4 rounded-xl font-black text-xs sm:text-sm bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4" aria-hidden="true" />
                <span>Comandar Adicional a Cocina</span>
              </span>
              <span>S/ {total.toFixed(2)}</span>
            </button>
          </>
        ) : (
          // STANDARD FREE TABLE / TAKEAWAY / DELIVERY: "Comandar a Cocina"
          <>
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Subtotal ({totalUnits} ítems)</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            {deliveryExtra > 0 && (
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Envío Delivery</span>
                <span>S/ {deliveryExtra.toFixed(2)}</span>
              </div>
            )}
            {rewardDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Premio Canjeado ({appliedReward?.title})</span>
                <span>-S/ {rewardDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-zinc-900 dark:text-white pt-1">
              <span>Total</span>
              <span className="text-amber-600 dark:text-amber-400">S/ {total.toFixed(2)}</span>
            </div>

            <button
              type="button"
              onClick={handleSendToKitchen}
              disabled={ticketItems.length === 0}
              className="w-full min-h-[48px] whitespace-nowrap shrink-0 py-3 px-4 rounded-xl font-black text-xs sm:text-sm bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4" aria-hidden="true" />
                <span>Comandar a Cocina</span>
              </span>
              <span>S/ {total.toFixed(2)}</span>
            </button>
          </>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="touch-surface w-full max-w-[1600px] mx-auto space-y-4 pb-24 lg:pb-4">
      {/* Clean Unified Top Header (Hidden in dedicated Cashier Station mode to avoid double headers) */}
      {!hideHeader && (
        <header className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Branding & Branch & Cash badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-black text-xl">
              🍕
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-white leading-tight">
                  Punto de Venta POS
                </h2>
                {cashSession.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Caja Abierta (S/ {cashSession.initialFloat.toFixed(2)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <Lock className="w-3 h-3" />
                    Caja Cerrada
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                Sucursal: <strong className="text-zinc-800 dark:text-zinc-200">{activeTenant.name}</strong>
              </p>
            </div>
          </div>

          {/* Right: User / Operator Popover Menu */}
          <div className="flex items-center gap-2 justify-end">
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className="min-h-[42px] px-3.5 py-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-amber-500/50 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-all shadow-xs"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-bold block leading-tight truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 block leading-tight truncate">
                    {currentUser.roleName}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-2 z-50 space-y-1">
                  {/* User Info Header */}
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 font-black text-sm flex items-center justify-center shrink-0">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-zinc-900 dark:text-white truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          {currentUser.roleName} · {activeTenant.name.replace('Khalessi Pizza - ', '')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vistas / Pestañas del POS en el Desplegable */}
                  <div className="pt-1 pb-1 border-y border-zinc-100 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2.5 block pt-0.5">
                      Pestañas del POS
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePosTab('carta');
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                        activePosTab === 'carta'
                          ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                        <span>Carta de Productos</span>
                      </span>
                      {activePosTab === 'carta' && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePosTab('mesas');
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                        activePosTab === 'mesas'
                          ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-amber-500" />
                        <span>Plano de Mesas</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {occupiedTablesCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-zinc-950">
                            {occupiedTablesCount} ocup.
                          </span>
                        )}
                        {activePosTab === 'mesas' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Cash Session Action */}
                  <div className="pt-0.5">
                    {cashSession.isOpen ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleCloseCashRegister();
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          <span>Cerrar Turno de Caja</span>
                        </span>
                        <span className="text-[10px] font-normal text-zinc-400">Fondo S/ {cashSession.initialFloat.toFixed(0)}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsAperturaModalOpen(true);
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Unlock className="w-4 h-4" />
                          <span>Aperturar Turno de Caja</span>
                        </span>
                        <span className="text-[10px] font-normal text-zinc-400">Iniciar</span>
                      </button>
                    )}
                  </div>

                  {/* Constructor de Recibos Térmicos */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsThermalModalOpen(true);
                    }}
                    className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-amber-500" />
                      <span>Formato de Recibos y Comandas</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">
                      80/58mm
                    </span>
                  </button>

                  {/* Dark / Light Mode Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      updateCustomization({ themePreference: isDarkResolved ? 'light' : 'dark' });
                    }}
                    className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {isDarkResolved ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-indigo-500" />
                      )}
                      <span>Modo {isDarkResolved ? 'Claro' : 'Oscuro'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {isDarkResolved ? 'Activar Día ☀️' : 'Activar Noche 🌙'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Two-Area Workspace: Wide Left Area + Sticky Right Cart Sidebar */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* LEFT AREA: Either Floor Table Map OR Product Catalog based on activePosTab */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          {activePosTab === 'mesas' ? (
            /* Dedicated Floor Map View */
            <section className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    <LayoutGrid className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                      <span>Plano & Constructor de Mesas</span>
                      {selectedTable && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-zinc-950">
                          Mesa Activa: {selectedTable.name}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Toca una mesa disponible para seleccionarla y abrir la carta, o toca una mesa ocupada para ver su cuenta.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTableBuilderMode((v) => !v)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap shrink-0 ${
                      isTableBuilderMode
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-amber-500/50'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{isTableBuilderMode ? 'Salir de Constructor' : 'Modo Constructor'}</span>
                  </button>

                  {isTableBuilderMode && (
                    <button
                      type="button"
                      onClick={handleOpenCreateTable}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Nueva Mesa</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Zone Tabs & Legend */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {['todas', ...availableZones].map((zone) => (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => setActiveZoneFilter(zone)}
                        className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          activeZoneFilter === zone
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        {zone === 'todas' ? `Todas (${branchTables.length})` : zone}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Disponible
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ocupada / Cocina
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Lista p/ Servir
                    </span>
                  </div>
                </div>

                {/* Interactive Floor Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-3">
                  {visibleTables.map((table) => {
                    const isSelected = selectedTable?.id === table.id;
                    const activeOrder = activeSalonOrdersByTable.get(table.id);
                    const isReady = activeOrder?.status === 'listo';
                    const isOccupied = !!activeOrder;

                    return (
                      <div
                        key={table.id}
                        onClick={() => {
                          setSelectedTableId(table.id);
                          if (!activeOrder && !isTableBuilderMode) {
                            setActivePosTab('carta');
                            dispatchToast('Mesa Seleccionada', `${table.name} seleccionada. Elige los productos en la carta.`, 'info');
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTableId(table.id);
                            if (!activeOrder && !isTableBuilderMode) {
                              setActivePosTab('carta');
                            }
                          }
                        }}
                        className={`relative p-3.5 border transition-all cursor-pointer select-none active:scale-[0.98] flex flex-col justify-between min-h-[105px] ${
                          table.shape === 'round'
                            ? 'rounded-3xl'
                            : table.shape === 'rect'
                            ? 'rounded-xl sm:col-span-1'
                            : 'rounded-2xl'
                        } ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/40 shadow-sm'
                            : isReady
                            ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-950/25 hover:border-blue-500'
                            : isOccupied
                            ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <span className="font-black text-xs sm:text-sm text-zinc-900 dark:text-white block truncate">
                              {table.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                              {table.zone}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700 shrink-0">
                            <Users className="w-2.5 h-2.5" aria-hidden="true" />
                            {table.capacity}
                          </span>
                        </div>

                        {/* Status or Builder Controls */}
                        {isTableBuilderMode ? (
                          <div
                            className="flex items-center justify-between gap-1 pt-2 mt-2 border-t border-zinc-200/80 dark:border-zinc-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                aria-label={`Mover ${table.name} antes`}
                                onClick={() => moveTableOrder(table.id, 'prev')}
                                className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-amber-500"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Mover ${table.name} después`}
                                onClick={() => moveTableOrder(table.id, 'next')}
                                className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-amber-500"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-label={`Editar ${table.name}`}
                                onClick={() => handleOpenEditTable(table)}
                                className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-amber-500"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Eliminar ${table.name}`}
                                onClick={() => handleConfirmDeleteTable(table)}
                                className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : activeOrder ? (
                          <div className="pt-2 mt-1.5 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-1">
                            <span
                              className={`text-[10px] font-extrabold truncate ${
                                isReady ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {activeOrder.orderNumber} · S/{activeOrder.total.toFixed(0)}
                            </span>
                            {isReady && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrderStatus(activeOrder.id, 'entregado');
                                }}
                                className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold shrink-0"
                                title="Marcar servida y liberar mesa"
                              >
                                Servir ✓
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2 mt-1.5 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Disponible
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            /* Dedicated Product Catalog View (Zero Clutter, Immediate Access) */
            <>
          {/* Tactile Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pizza artesanal, combo, entrada o bebida..."
                aria-label="Buscar productos en el catálogo POS"
                className="min-h-[44px] w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 shrink-0">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'pizzas', label: '🍕 Pizzas' },
                { id: 'combos', label: '🔥 Combos' },
                { id: 'entradas', label: '🥖 Entradas' },
                { id: 'bebidas', label: '🥤 Bebidas' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    activeCategory === cat.id
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wide Tactile Product Grid (Fluid container-aware auto-fill across mobile, square 4:3, tablet & widescreen) */}
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-3">
            {filteredProducts.map((p) => {
              const basePrice =
                p.hasSizes && p.sizes.filter((s) => s.enabled).length > 0
                  ? Math.min(...p.sizes.filter((s) => s.enabled).map((s) => s.price))
                  : p.basePrice;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProduct(p)}
                  className="p-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/60 rounded-2xl flex flex-col justify-between text-left transition-all group active:scale-[0.98] shadow-sm"
                >
                  <div className="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden mb-2.5 bg-zinc-100 dark:bg-zinc-950">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {p.badge && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-zinc-950 shadow-sm">
                        {p.badge}
                      </span>
                    )}
                    <span className="absolute bottom-2 right-2 h-8 w-8 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-md">
                      <Plus className="w-4 h-4 stroke-[2.75]" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="w-full min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {p.name}
                    </h4>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                        S/ {basePrice.toFixed(2)}
                      </span>
                      {p.hasSizes && (
                        <span className="text-[10px] font-semibold text-zinc-400">
                          {p.sizes.filter((s) => s.enabled).length} tam.
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
            </>
          )}
        </div>

        {/* NARROW RIGHT COMANDA SIDEBAR ON DESKTOP (320px on square/tablet-landscape, 365-385px on laptop/PC) */}
        <aside className="hidden lg:flex lg:w-[320px] xl:w-[365px] 2xl:w-[385px] shrink-0 sticky top-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 xl:p-4 shadow-sm flex-col">
          {renderComandaContent()}
        </aside>
      </div>

      {/* MOBILE STICKY BOTTOM COMANDA BAR (< lg) */}
      {(() => {
        const currentTableActiveOrder =
          channel === 'pos-salon' && selectedTable
            ? activeSalonOrdersByTable.get(selectedTable.id)
            : null;

        return (
          <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 pt-2.5 safe-bottom-bar shadow-2xl">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-2.5">
              {currentTableActiveOrder && ticketItems.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(true)}
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-between shadow-md active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Cobrar Mesa {selectedTable?.name}</span>
                  </span>
                  <span>S/ {currentTableActiveOrder.total.toFixed(2)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(true)}
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-between shadow-md active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" aria-hidden="true" />
                    <span>Ver Comanda ({totalUnits})</span>
                    {channel === 'pos-salon' && selectedTable && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-950/15 text-[10px] font-bold">
                        {selectedTable.name}
                      </span>
                    )}
                  </span>
                  <span>S/ {total.toFixed(2)}</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* MOBILE COMANDA DRAWER DIALOG */}
      <dialog
        ref={mobileCartDialogRef}
        aria-labelledby={mobileCartTitleId}
        onClose={() => setIsMobileCartOpen(false)}
        className="max-w-md w-full p-0 bg-transparent border-0"
      >
        {isMobileCartOpen && (
          <div className="touch-surface w-full max-h-[88dvh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h2 id={mobileCartTitleId} className="font-black text-sm text-zinc-900 dark:text-white">
                Comanda Móvil · {activeTenant.name}
              </h2>
              <button
                type="button"
                aria-label="Cerrar comanda móvil"
                onClick={() => setIsMobileCartOpen(false)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto saas-scroll">
              {renderComandaContent()}
            </div>
          </div>
        )}
      </dialog>

      {/* NATIVE <dialog>: APERTURA DE CAJA */}
      <dialog
        ref={aperturaDialogRef}
        aria-labelledby={aperturaTitleId}
        onClose={() => setIsAperturaModalOpen(false)}
        className="max-w-md w-full p-0 bg-transparent border-0"
      >
        {isAperturaModalOpen && (
          <div className="touch-surface w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-zinc-900 dark:text-zinc-100 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <h2 id={aperturaTitleId} className="font-bold text-base text-zinc-950 dark:text-white">
                  Apertura de Caja del Turno
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar apertura de caja"
                onClick={() => setIsAperturaModalOpen(false)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenCashRegister} className="space-y-4">
              <div>
                <label htmlFor="pos-float-amount" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Monto de Fondo Inicial (Soles) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-500 text-sm">S/</span>
                  <input
                    id="pos-float-amount"
                    type="number"
                    step="0.5"
                    required
                    value={inputFloatAmount}
                    onChange={(e) => setInputFloatAmount(e.target.value)}
                    className="min-h-[44px] w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Efectivo base para vuelto durante el turno en {activeTenant.name}.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAperturaModalOpen(false)}
                  className="whitespace-nowrap shrink-0 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="whitespace-nowrap shrink-0 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  Confirmar Apertura de Caja
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>

      {/* NATIVE <dialog>: BÚSQUEDA API DNI & REGISTRO MANUAL DE CLIENTE (CRM) */}
      <dialog
        ref={customerDialogRef}
        aria-labelledby={customerTitleId}
        onClose={() => setIsCustomerModalOpen(false)}
        className="max-w-lg w-full p-0 bg-transparent border-0"
      >
        {isCustomerModalOpen && (
          <div className="touch-surface w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <div>
                  <h2 id={customerTitleId} className="font-bold text-base text-zinc-950 dark:text-white">
                    Identificar o Registrar Cliente (CRM)
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Consulta por API DNI o registra manualmente en el módulo Clientes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar registro de cliente"
                onClick={() => setIsCustomerModalOpen(false)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerModal} className="p-5 space-y-3.5 max-h-[80dvh] overflow-y-auto saas-scroll">
              {/* DNI Search Row */}
              <div>
                <label htmlFor="pos-cust-dni" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Número de DNI (8 dígitos - Consulta Automática RENIEC)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="pos-cust-dni"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={custDni}
                    onChange={(e) => setCustDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Ej: 45891234"
                    className="min-h-[44px] flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={isLookingUpDni}
                    onClick={() => void handleModalDniLookup()}
                    className="min-h-[44px] whitespace-nowrap shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-sm"
                  >
                    {isLookingUpDni ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>Consultar DNI</span>
                  </button>
                </div>
                {dniFeedbackMsg && (
                  <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">
                    {dniFeedbackMsg}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="pos-cust-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nombres y Apellidos *
                </label>
                <input
                  id="pos-cust-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={custFullName}
                  onChange={(e) => setCustFullName(e.target.value)}
                  placeholder="Ej: Rodrigo Alejandro Mendoza Salazar"
                  className="min-h-[44px] w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* WhatsApp & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pos-cust-phone" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    WhatsApp / Celular
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                    <input
                      id="pos-cust-phone"
                      name="tel"
                      type="tel"
                      autoComplete="tel"
                      value={custWhatsapp}
                      onChange={(e) => setCustWhatsapp(e.target.value)}
                      placeholder="+51 999 888 777"
                      className="min-h-[44px] w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pos-cust-email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                    <input
                      id="pos-cust-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="cliente@correo.com"
                      className="min-h-[44px] w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address & Reference with GPS PIN Map Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="pos-cust-address" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Dirección Exacta {channel === 'pos-delivery' ? '*' : ''}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Marcar en Mapa con PIN</span>
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                  <input
                    id="pos-cust-address"
                    name="address-line1"
                    type="text"
                    autoComplete="address-line1"
                    required={channel === 'pos-delivery'}
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="Av. / Jr. / Calle, Número, Dpto, Distrito"
                    className="min-h-[44px] w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                {custDistanceKm !== undefined && (
                  <div className="mt-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      GPS fijado: a {custDistanceKm} km de {activeTenant.name.replace('Khalessi Pizza - ', '')}
                    </span>
                    <span className="text-[11px] font-bold">
                      {custDistanceKm <= (activeTenant.operations?.deliveryRadiusKm || 8) ? '✓ Dentro de cobertura' : '⚠️ Fuera de cobertura'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="pos-cust-ref" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Referencia de Ubicación
                </label>
                <input
                  id="pos-cust-ref"
                  name="address-line2"
                  type="text"
                  autoComplete="address-line2"
                  value={custReference}
                  onChange={(e) => setCustReference(e.target.value)}
                  placeholder="Ej: Frente al parque, casa reja blanca, timbre 2"
                  className="min-h-[44px] w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="whitespace-nowrap shrink-0 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="whitespace-nowrap shrink-0 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md shadow-amber-500/20"
                >
                  Guardar Cliente y Vincular
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>

      {/* MAPA PICKER CON PIN PARA FIJAR DIRECCIÓN Y COORDENADAS EXACTAS */}
      <CustomerAddressMapPicker
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        branchCoords={[
          activeTenant.operations?.latitude || -11.93605,
          activeTenant.operations?.longitude || -77.05432,
        ]}
        branchName={activeTenant.name}
        branchRadiusKm={activeTenant.operations?.deliveryRadiusKm || 8}
        initialCoords={custCoords}
        initialAddress={custAddress}
        tariff={activeTenant.operations?.deliveryTariff || companyInfo.deliveryTariff}
        onConfirm={handleConfirmMapLocation}
      />

      {/* NATIVE <dialog>: CONSTRUCTOR DE MESA (CREAR / EDITAR MESA) */}
      <dialog
        ref={tableEditorDialogRef}
        aria-labelledby={tableEditorTitleId}
        onClose={() => setIsTableModalOpen(false)}
        className="max-w-md w-full p-0 bg-transparent border-0"
      >
        {isTableModalOpen && (
          <div className="touch-surface w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-zinc-900 dark:text-zinc-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <h2 id={tableEditorTitleId} className="font-bold text-base text-zinc-950 dark:text-white">
                  {editingTable ? `Editar ${editingTable.name}` : 'Nueva Mesa en Salón'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar constructor de mesa"
                onClick={() => setIsTableModalOpen(false)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTableModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tbl-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Nombre / Código de Mesa *
                  </label>
                  <input
                    id="tbl-name"
                    type="text"
                    required
                    value={tblName}
                    onChange={(e) => setTblName(e.target.value)}
                    placeholder="Ej: Mesa 7, VIP 1"
                    className="min-h-[44px] w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="tbl-zone" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Zona / Ambiente *
                  </label>
                  <input
                    id="tbl-zone"
                    type="text"
                    list="pos-zones-list"
                    required
                    value={tblZone}
                    onChange={(e) => setTblZone(e.target.value)}
                    placeholder="Salón Principal, Terraza..."
                    className="min-h-[44px] w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="pos-zones-list">
                    {availableZones.map((z) => (
                      <option key={z} value={z} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tbl-cap" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Capacidad (Sillas)
                  </label>
                  <select
                    id="tbl-cap"
                    value={tblCapacity}
                    onChange={(e) => setTblCapacity(parseInt(e.target.value, 10) || 4)}
                    className="min-h-[44px] w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    {[2, 4, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} Personas
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tbl-shape" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Forma Visual
                  </label>
                  <select
                    id="tbl-shape"
                    value={tblShape}
                    onChange={(e) => setTblShape(e.target.value as TableShape)}
                    className="min-h-[44px] w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="square">Cuadrada</option>
                    <option value="round">Redonda</option>
                    <option value="rect">Familiar Larga</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="whitespace-nowrap shrink-0 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="whitespace-nowrap shrink-0 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md"
                >
                  {editingTable ? 'Guardar Mesa' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>

      {/* Product Customizer Modal */}
      <ProductCustomizerModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddItemToTicket}
        mode="pos"
      />

      {/* Thermal Receipt & Kitchen Comanda Builder Modal */}
      <ThermalTicketBuilderModal
        isOpen={isThermalModalOpen}
        onClose={() => setIsThermalModalOpen(false)}
      />
    </div>
  );
};
