import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import {
  Product,
  OrderItem,
  CartExtra,
  CartSubOptionSelection,
  HalfAndHalfSelection,
  InvoiceDocumentType,
  Order,
} from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { isRealCulqiPublicKey, openOfficialCulqiCheckout } from '../../utils/culqiCheckout';
import { StoreCulqiSandboxDialog } from '../store/StoreCulqiSandboxDialog';
import { ToastContainer } from '../common/ToastContainer';
import { SystemNoticeModal } from '../common/SystemNoticeModal';
import {
  UtensilsCrossed,
  ShoppingBag,
  Sparkles,
  Flame,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Pizza,
  RotateCcw,
  Printer,
  Smartphone,
  Maximize2,
  Minimize2,
  Store,
  Clock,
  Lock,
  X,
  Receipt,
  ExternalLink,
} from 'lucide-react';

export interface KioskSelfServiceViewProps {
  /** True when rendered inside the Admin ERP simulator; false when opened at /kiosco */
  embeddedInAdmin?: boolean;
  onExitToAdmin?: () => void;
  onOpenStandaloneKiosk?: () => void;
}

type KioskStep = 'attract' | 'catalog' | 'checkout' | 'ticket';
type DiningMode = 'salon' | 'takeaway';

const KIOSK_CATEGORIES: { id: string; label: string; emoji: string; subtitle: string }[] = [
  { id: 'all', label: 'Todo el Menú', emoji: '✨', subtitle: 'Favoritos del día' },
  { id: 'pizzas', label: 'Pizzas Artesanales', emoji: '🍕', subtitle: 'Masa madre 48h' },
  { id: 'half_and_half', label: 'Mitad y Mitad', emoji: '🌓', subtitle: 'Combina 2 sabores' },
  { id: 'combos', label: 'Combos & Promos', emoji: '🔥', subtitle: 'Ahorro en grande' },
  { id: 'entradas', label: 'Complementos', emoji: '🧄', subtitle: 'Pan al ajo y alitas' },
  { id: 'bebidas', label: 'Bebidas Heladas', emoji: '🥤', subtitle: 'Gaseosas y chicha' },
  { id: 'postres', label: 'Postres', emoji: '🍫', subtitle: 'Dulce final' },
];

const INACTIVITY_LIMIT_SEC = 120;

export const KioskSelfServiceView: React.FC<KioskSelfServiceViewProps> = ({
  embeddedInAdmin = false,
  onExitToAdmin,
  onOpenStandaloneKiosk,
}) => {
  const { products, orders, createOrder } = useOrderCatalog();
  const {
    customization,
    companyInfo,
    activeTenant,
    tenants,
    switchTenant,
    dispatchToast,
    openNoticeModal,
  } = useSettings();

  // Simulator viewport mode when inside Admin ('totem-9-16' vs 'full-height')
  const [frameMode, setFrameMode] = useState<'totem' | 'expanded'>('totem');

  // Kiosk workflow state
  const [step, setStep] = useState<KioskStep>('attract');
  const [diningMode, setDiningMode] = useState<DiningMode>('salon');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [kioskCart, setKioskCart] = useState<OrderItem[]>([]);

  // Attract Loop carousel index
  const [attractSlideIdx, setAttractSlideIdx] = useState(0);

  // Inactivity countdown (in seconds) when user is in catalog or checkout
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(INACTIVITY_LIMIT_SEC);

  // Product Customization Modal state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [selectedSubChoices, setSelectedSubChoices] = useState<Record<string, string>>({});
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [firstHalfId, setFirstHalfId] = useState<string>('');
  const [secondHalfId, setSecondHalfId] = useState<string>('');
  const [customQty, setCustomQty] = useState<number>(1);
  const [customNotes, setCustomNotes] = useState<string>('');

  // Checkout & Culqi state
  const [customerAlias, setCustomerAlias] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<InvoiceDocumentType>('boleta_simple');
  const [invoiceDoc, setInvoiceDoc] = useState<string>('');
  const [invoiceBusinessName, setInvoiceBusinessName] = useState<string>('');
  const [isCulqiSandboxOpen, setIsCulqiSandboxOpen] = useState<boolean>(false);
  const [isProcessingCulqi, setIsProcessingCulqi] = useState<boolean>(false);

  // Confirmed Order Ticket state (only populated AFTER Culqi approves payment)
  const [confirmedOrder, setConfirmedOrder] = useState<{
    order: Order;
    turnCode: string;
    culqiReference: string;
    methodUsed: 'tarjeta' | 'yape';
  } | null>(null);
  const [ticketResetCountdown, setTicketResetCountdown] = useState<number>(20);

  // Dialog refs
  const customizerDialogRef = useRef<HTMLDialogElement>(null);
  const customizerTitleId = useId();

  // Available products
  const availableProducts = useMemo(
    () => products.filter((p) => p.isAvailable),
    [products]
  );

  // Standard pizzas for Half & Half selector
  const standardPizzas = useMemo(
    () =>
      availableProducts.filter(
        (p) => p.category === 'pizzas' && p.productType !== 'half_and_half'
      ),
    [availableProducts]
  );

  // Filtered products for catalog grid
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return availableProducts;
    if (selectedCategory === 'half_and_half') {
      return availableProducts.filter((p) => p.productType === 'half_and_half');
    }
    return availableProducts.filter((p) => p.category === selectedCategory);
  }, [availableProducts, selectedCategory]);

  // Attract Loop media background playlist (videos gastronómicos de pizza en horno de leña, masa y queso derretido en bucle silencioso)
  const attractVideos = useMemo(() => [
    'https://assets.mixkit.co/videos/preview/mixkit-chef-putting-pizza-in-the-oven-43250-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-putting-cheese-on-a-pizza-dough-43254-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-fresh-pizza-out-of-the-oven-43251-large.mp4',
  ], []);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Attract Loop slides
  const attractSlides = useMemo(() => {
    const featured = availableProducts.slice(0, 4);
    if (featured.length === 0) {
      return [
        {
          id: 'default-1',
          imageUrl:
            'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
          videoUrl: attractVideos[0],
        },
      ];
    }
    return featured.map((p, idx) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      videoUrl: attractVideos[idx % attractVideos.length],
    }));
  }, [availableProducts, attractVideos]);

  // Auto-advance Attract Loop
  useEffect(() => {
    if (step !== 'attract') return;
    const timer = window.setInterval(() => {
      setAttractSlideIdx((prev) => (prev + 1) % attractSlides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [step, attractSlides.length]);

  // Reset inactivity timer on interaction
  const touchActivity = () => {
    setIdleSecondsLeft(INACTIVITY_LIMIT_SEC);
  };

  useEffect(() => {
    if (step === 'attract' || step === 'ticket' || isCulqiSandboxOpen || isProcessingCulqi) return;
    const timer = window.setInterval(() => {
      setIdleSecondsLeft((prev) => {
        if (prev <= 1) {
          resetKioskSession();
          return INACTIVITY_LIMIT_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, isCulqiSandboxOpen, isProcessingCulqi]);

  // Ticket screen auto-reset countdown
  useEffect(() => {
    if (step !== 'ticket') return;
    setTicketResetCountdown(20);
    const timer = window.setInterval(() => {
      setTicketResetCountdown((prev) => {
        if (prev <= 1) {
          resetKioskSession();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  // Manage native <dialog> for product customization
  useEffect(() => {
    const dialog = customizerDialogRef.current;
    if (!dialog) return;
    if (customizingProduct) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [customizingProduct]);

  const resetKioskSession = () => {
    setCustomizingProduct(null);
    setIsCulqiSandboxOpen(false);
    setIsProcessingCulqi(false);
    setKioskCart([]);
    setSelectedCategory('all');
    setCustomerAlias('');
    setCustomerPhone('');
    setInvoiceType('boleta_simple');
    setInvoiceDoc('');
    setInvoiceBusinessName('');
    setConfirmedOrder(null);
    setStep('attract');
    setIdleSecondsLeft(INACTIVITY_LIMIT_SEC);
  };

  const handleStartOrder = (mode: DiningMode) => {
    setDiningMode(mode);
    setSelectedCategory('all');
    setStep('catalog');
    touchActivity();
  };

  const openProductCustomizer = (product: Product) => {
    touchActivity();
    const enabledSizes = product.sizes.filter((s) => s.enabled);
    const defaultSize =
      enabledSizes.find((s) => s.isDefault) || enabledSizes[0] || undefined;

    const initialChoices: Record<string, string> = {};
    product.subOptions
      .filter((g) => g.enabled)
      .forEach((group) => {
        const defChoice =
          group.choices.find((c) => c.isDefault) || group.choices[0];
        if (defChoice) initialChoices[group.id] = defChoice.id;
      });

    setSelectedSizeId(defaultSize ? defaultSize.id : '');
    setSelectedSubChoices(initialChoices);
    setSelectedExtras({});
    setFirstHalfId(standardPizzas[0]?.id || '');
    setSecondHalfId(standardPizzas[1]?.id || standardPizzas[0]?.id || '');
    setCustomQty(1);
    setCustomNotes('');
    setCustomizingProduct(product);
  };

  // Compute live price inside Product Customizer
  const customizerPricing = useMemo(() => {
    if (!customizingProduct) return { unitPrice: 0, totalPrice: 0 };

    const sizeObj = customizingProduct.hasSizes
      ? customizingProduct.sizes.find((s) => s.id === selectedSizeId)
      : undefined;

    let base = sizeObj ? sizeObj.price : customizingProduct.basePrice;

    // If Half & Half, take the higher price of the two chosen flavours for that size
    if (customizingProduct.productType === 'half_and_half' && firstHalfId && secondHalfId) {
      const p1 = standardPizzas.find((p) => p.id === firstHalfId);
      const p2 = standardPizzas.find((p) => p.id === secondHalfId);
      const p1Price = p1?.hasSizes
        ? p1.sizes.find((s) => s.id === selectedSizeId)?.price ?? p1.basePrice
        : p1?.basePrice ?? base;
      const p2Price = p2?.hasSizes
        ? p2.sizes.find((s) => s.id === selectedSizeId)?.price ?? p2.basePrice
        : p2?.basePrice ?? base;
      base = Math.max(base, p1Price, p2Price);
    }

    let subOptionsDelta = 0;
    customizingProduct.subOptions
      .filter((g) => g.enabled)
      .forEach((group) => {
        const chosenId = selectedSubChoices[group.id];
        const found = group.choices.find((c) => c.id === chosenId);
        if (found && !found.isIncluded) {
          subOptionsDelta += found.priceDelta;
        }
      });

    let extrasTotal = 0;
    customizingProduct.allowedExtras
      .filter((e) => e.enabled)
      .forEach((ext) => {
        const qty = selectedExtras[ext.id] || 0;
        if (qty > 0 && !ext.isIncluded) {
          extrasTotal += ext.price * qty;
        }
      });

    const unitPrice = Number((base + subOptionsDelta + extrasTotal).toFixed(2));
    const totalPrice = Number((unitPrice * customQty).toFixed(2));
    return { unitPrice, totalPrice };
  }, [
    customizingProduct,
    selectedSizeId,
    selectedSubChoices,
    selectedExtras,
    firstHalfId,
    secondHalfId,
    customQty,
    standardPizzas,
  ]);

  const handleConfirmAddProduct = () => {
    if (!customizingProduct) return;
    touchActivity();

    const sizeObj = customizingProduct.hasSizes
      ? customizingProduct.sizes.find((s) => s.id === selectedSizeId)
      : undefined;

    const subOptionSelections: CartSubOptionSelection[] = [];
    customizingProduct.subOptions
      .filter((g) => g.enabled)
      .forEach((group) => {
        const chosenId = selectedSubChoices[group.id];
        const found = group.choices.find((c) => c.id === chosenId);
        if (found) {
          subOptionSelections.push({
            groupId: group.id,
            groupName: group.name,
            choiceId: found.id,
            choiceName: found.name,
            priceDelta: found.isIncluded ? 0 : found.priceDelta,
          });
        }
      });

    const cartExtras: CartExtra[] = [];
    customizingProduct.allowedExtras
      .filter((e) => e.enabled)
      .forEach((ext) => {
        const qty = selectedExtras[ext.id] || 0;
        if (qty > 0) {
          cartExtras.push({
            id: ext.id,
            name: ext.name,
            price: ext.isIncluded ? 0 : ext.price,
            quantity: qty,
          });
        }
      });

    let halfAndHalf: HalfAndHalfSelection | undefined;
    if (customizingProduct.productType === 'half_and_half') {
      const p1 = standardPizzas.find((p) => p.id === firstHalfId);
      const p2 = standardPizzas.find((p) => p.id === secondHalfId);
      if (p1 && p2) {
        halfAndHalf = {
          firstHalfId: p1.id,
          firstHalfName: p1.name,
          firstHalfImage: p1.imageUrl,
          secondHalfId: p2.id,
          secondHalfName: p2.name,
          secondHalfImage: p2.imageUrl,
        };
      }
    }

    const newItem: OrderItem = {
      itemId: `kiosk-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: customizingProduct.id,
      productName: customizingProduct.name,
      productImage: customizingProduct.imageUrl,
      halfAndHalf,
      size: sizeObj
        ? {
            id: sizeObj.id,
            name: sizeObj.name,
            slices: sizeObj.slices,
            price: sizeObj.price,
          }
        : undefined,
      subOptions: subOptionSelections,
      extras: cartExtras,
      notes: customNotes.trim() || undefined,
      unitPrice: customizerPricing.unitPrice,
      quantity: customQty,
      totalPrice: customizerPricing.totalPrice,
    };

    setKioskCart((prev) => [...prev, newItem]);
    setCustomizingProduct(null);
    dispatchToast(
      '¡Agregado a tu bandeja!',
      `${customQty}x ${customizingProduct.name} listo en tu pedido.`,
      'success'
    );
  };

  const updateCartItemQuantity = (itemId: string, delta: number) => {
    touchActivity();
    setKioskCart((prev) =>
      prev
        .map((item) => {
          if (item.itemId !== itemId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            quantity: nextQty,
            totalPrice: Number((item.unitPrice * nextQty).toFixed(2)),
          };
        })
        .filter((i): i is OrderItem => i !== null)
    );
  };

  // Upselling suggestions (Drinks, Entradas, Postres not yet in kioskCart)
  const upsellItems = useMemo(() => {
    const inCartIds = new Set(kioskCart.map((i) => i.productId));
    return availableProducts
      .filter(
        (p) =>
          !inCartIds.has(p.id) &&
          (p.category === 'bebidas' || p.category === 'entradas' || p.category === 'postres')
      )
      .slice(0, 4);
  }, [availableProducts, kioskCart]);

  const handleQuickUpsellAdd = (product: Product) => {
    touchActivity();
    const defSize = product.hasSizes
      ? product.sizes.find((s) => s.isDefault && s.enabled) || product.sizes.find((s) => s.enabled)
      : undefined;
    const unitPrice = defSize ? defSize.price : product.basePrice;
    const quickItem: OrderItem = {
      itemId: `kiosk-upsell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      size: defSize
        ? {
            id: defSize.id,
            name: defSize.name,
            slices: defSize.slices,
            price: defSize.price,
          }
        : undefined,
      subOptions: [],
      extras: [],
      unitPrice,
      quantity: 1,
      totalPrice: unitPrice,
    };
    setKioskCart((prev) => [...prev, quickItem]);
    dispatchToast('¡Acompañamiento sumado!', `Se agregó ${product.name}.`, 'success');
  };

  const kioskTotalUnits = useMemo(
    () => kioskCart.reduce((acc, item) => acc + item.quantity, 0),
    [kioskCart]
  );

  const kioskSubtotal = useMemo(
    () => Number(kioskCart.reduce((acc, item) => acc + item.totalPrice, 0).toFixed(2)),
    [kioskCart]
  );

  // STRICT CULQI SYNCHRONIZATION:
  // Order is NEVER created or sent to Kitchen KDS until Culqi confirms payment!
  const finalizeKioskOrderAfterCulqi = (culqiResult: {
    referenceId: string;
    methodUsed: 'tarjeta' | 'yape';
  }) => {
    const cleanAlias = customerAlias.trim() || 'Cliente Kiosco';
    const turnNumber = `K-${String((orders.length % 900) + 101).padStart(3, '0')}`;

    const created = createOrder({
      channel: diningMode === 'salon' ? 'kiosco-salon' : 'kiosco-takeaway',
      tenantId: activeTenant.id,
      customerDni:
        invoiceType === 'boleta_dni' && invoiceDoc.trim() ? invoiceDoc.trim() : undefined,
      customerName: `${cleanAlias} (${turnNumber})`,
      customerPhone: customerPhone.trim() || 'Kiosco Autoservicio',
      tableNumber: diningMode === 'salon' ? `Turno ${turnNumber} (Salón)` : `Turno ${turnNumber} (Llevar)`,
      paymentMethod: 'culqi',
      paymentStatus: 'pagado',
      culqiReference: culqiResult.referenceId,
      invoiceType,
      invoiceDocument:
        invoiceType !== 'boleta_simple' && invoiceDoc.trim() ? invoiceDoc.trim() : undefined,
      invoiceBusinessName:
        invoiceType === 'factura_ruc' && invoiceBusinessName.trim()
          ? invoiceBusinessName.trim()
          : undefined,
      items: kioskCart,
      subtotal: kioskSubtotal,
      deliveryFee: 0,
      discount: 0,
      total: kioskSubtotal,
      estimatedMinutes: 15,
    });

    setConfirmedOrder({
      order: created,
      turnCode: turnNumber,
      culqiReference: culqiResult.referenceId,
      methodUsed: culqiResult.methodUsed,
    });
    setIsCulqiSandboxOpen(false);
    setIsProcessingCulqi(false);
    setKioskCart([]);
    setStep('ticket');

    dispatchToast(
      '¡Pago Culqi Aprobado y Enviado a Cocina!',
      `Orden ${created.orderNumber} (${turnNumber}) en preparación.`,
      'success'
    );
  };

  const handleInitiateCulqiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    touchActivity();

    if (kioskCart.length === 0) return;

    if (!customerAlias.trim()) {
      dispatchToast(
        'Ingresa tu nombre o alias',
        'Lo usaremos para llamarte por pantalla cuando tu pizza esté lista.',
        'warning'
      );
      return;
    }

    if (invoiceType === 'boleta_dni' && invoiceDoc.replace(/\D/g, '').length !== 8) {
      dispatchToast(
        'DNI Inválido',
        'Para Boleta con DNI ingresa los 8 dígitos válidos.',
        'warning'
      );
      return;
    }

    if (
      invoiceType === 'factura_ruc' &&
      (invoiceDoc.replace(/\D/g, '').length !== 11 || !invoiceBusinessName.trim())
    ) {
      dispatchToast(
        'Datos de Factura Incompletos',
        'Ingresa un RUC válido de 11 dígitos y la Razón Social.',
        'warning'
      );
      return;
    }

    const culqiCfg = companyInfo.culqiConfig;
    const hasRealKey = culqiCfg && isRealCulqiPublicKey(culqiCfg.publicKey);

    if (hasRealKey && culqiCfg) {
      setIsProcessingCulqi(true);
      const res = await openOfficialCulqiCheckout({
        config: culqiCfg,
        storeTitle: `${companyInfo.commercialName || customization.appName} — Kiosco`,
        amountSoles: kioskSubtotal,
        accentColor: customization.primaryColor || '#f97316',
        logoUrl: customization.storeHeaderLogo || customization.logoDark,
      });
      setIsProcessingCulqi(false);

      if (!res.ok || !res.referenceId) {
        openNoticeModal({
          title: 'Pago con Culqi no completado',
          message:
            res.errorMessage ||
            'El pedido NO ha sido enviado a cocina porque la transacción en Culqi fue cancelada o rechazada. Puedes intentar nuevamente.',
          tone: 'warning',
          confirmLabel: 'Reintentar Pago en Culqi',
          cancelLabel: 'Volver al Pedido',
          onConfirm: () => {
            // Let user retry immediately
          },
        });
        return;
      }

      finalizeKioskOrderAfterCulqi({
        referenceId: res.referenceId,
        methodUsed: res.methodUsed || 'tarjeta',
      });
      return;
    }

    // Open interactive Culqi Checkout v4 Terminal (Tarjeta / Yape QR)
    setIsCulqiSandboxOpen(true);
  };

  const handleAskCancelOrder = () => {
    touchActivity();
    if (kioskCart.length === 0) {
      resetKioskSession();
      return;
    }
    openNoticeModal({
      title: '¿Cancelar tu pedido actual?',
      message:
        'Se vaciará tu bandeja de productos y el tótem volverá a la pantalla de inicio.',
      tone: 'danger',
      confirmLabel: 'Sí, Cancelar Pedido',
      cancelLabel: 'Seguir Pidiendo',
      onConfirm: () => resetKioskSession(),
    });
  };

  const kioskOrdersTodayCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.channel === 'kiosco-salon' || o.channel === 'kiosco-takeaway') &&
          o.tenantId === activeTenant.id
      ).length,
    [orders, activeTenant.id]
  );

  const culqiCfg = companyInfo.culqiConfig;
  const isLiveKeyConfigured = Boolean(culqiCfg && isRealCulqiPublicKey(culqiCfg.publicKey));

  return (
    <div
      onClick={touchActivity}
      className={`w-full flex flex-col items-center justify-center select-none ${
        embeddedInAdmin
          ? 'min-h-[calc(100dvh-3.5rem)] py-2'
          : 'h-dvh bg-zinc-950 overflow-hidden'
      }`}
      style={{ fontFamily: customization.fontFamily }}
    >
      {!embeddedInAdmin && <ToastContainer />}
      {!embeddedInAdmin && <SystemNoticeModal />}

      {/* ADMIN SIMULATOR TOP BAR (Only visible when testing inside ERP MainLayout) */}
      {embeddedInAdmin && (
        <div className="w-full max-w-[1600px] mb-4 p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-zinc-950 dark:text-white truncate">
                  Tótem Vertical de Autoservicio (Formato 9:16)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Culqi Gate Activo ({isLiveKeyConfigured ? 'Llave Oficial PK' : 'Terminal v4 Activo'})
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Los pedidos se retienen y solo ingresan a Cocina (KDS) tras confirmación de pago exitoso en Culqi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Branch Selector for Kiosk */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold">
              <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <select
                aria-label="Sucursal del Kiosco"
                value={activeTenant.id}
                onChange={(e) => switchTenant(e.target.value)}
                className="bg-transparent text-zinc-900 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                {tenants.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                  >
                    {t.name.replace('Khalessi Pizza - ', '')}
                  </option>
                ))}
              </select>
            </div>

            <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-black text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0">
              Órdenes Kiosco Hoy: {kioskOrdersTodayCount}
            </span>

            {/* Frame toggle: 9:16 Portrait Totem vs Expanded */}
            <button
              type="button"
              onClick={() => setFrameMode((m) => (m === 'totem' ? 'expanded' : 'totem'))}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              {frameMode === 'totem' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Expandir Lienzo</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Marco Vertical 9:16</span>
                </>
              )}
            </button>

            {onOpenStandaloneKiosk && (
              <button
                type="button"
                onClick={onOpenStandaloneKiosk}
                style={{ backgroundColor: customization.primaryColor }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-sm hover:opacity-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Pantalla Dedicada (/kiosco)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VERTICAL 9:16 TOTEM OR FLUID LANDSCAPE HARDWARE FRAME */}
      <div
        className={`relative bg-zinc-950 text-white flex flex-col overflow-hidden transition-all duration-300 ${
          embeddedInAdmin
            ? frameMode === 'totem'
              ? 'w-full max-w-[500px] h-[min(860px,calc(100dvh-10.5rem))] min-h-[560px] rounded-[42px] border-[10px] border-zinc-800 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.75)] ring-1 ring-white/10'
              : 'w-full max-w-[1440px] h-[min(860px,calc(100dvh-10.5rem))] min-h-[560px] rounded-3xl border-4 border-zinc-800 shadow-2xl'
            : 'w-full h-dvh max-w-[1600px] mx-auto shadow-2xl'
        }`}
      >
        {/* =========================================================
            STEP 1: ATTRACT SCREEN (FULL-BLEED VERTICAL MALL TOTEM)
           ========================================================= */}
        {step === 'attract' && (
          <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-zinc-950">
            {/* Background Hero Video + Image Fallback with smooth overlay */}
            <div className="absolute inset-0 overflow-hidden">
              <video
                key={attractSlides[attractSlideIdx]?.videoUrl}
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                poster={attractSlides[attractSlideIdx]?.imageUrl}
                className="w-full h-full object-cover scale-105 transition-opacity duration-700 pointer-events-none"
              >
                {attractSlides[attractSlideIdx]?.videoUrl && (
                  <source
                    src={attractSlides[attractSlideIdx]?.videoUrl}
                    type="video/mp4"
                  />
                )}
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/30" />
            </div>

            {/* Top Brand Header + Branch Badge */}
            <header className="relative z-10 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                {customization.logoDark ? (
                  <img
                    src={customization.logoDark}
                    alt={customization.appName}
                    className="block w-12 h-12 rounded-2xl object-cover ring-2 ring-white/20 shadow-lg"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    🍕
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 block">
                    AUTOSERVICIO EXPRESS
                  </span>
                  <h1 className="text-lg font-black text-white tracking-tight leading-none mt-0.5">
                    {companyInfo.commercialName || customization.appName}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-xs font-bold text-zinc-200 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <Store className="w-3.5 h-3.5 text-amber-400" />
                  {activeTenant.name.replace('Khalessi Pizza - ', '')}
                </span>
                {!embeddedInAdmin && onExitToAdmin && (
                  <button
                    type="button"
                    onClick={onExitToAdmin}
                    title="Panel Admin"
                    className="px-2.5 py-1.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-[11px] font-bold text-zinc-300 whitespace-nowrap shrink-0"
                  >
                    ERP Admin
                  </button>
                )}
              </div>
            </header>

            {/* Center / Bottom Call-To-Action & Dining Mode Selection */}
            <div className="relative z-10 p-6 sm:p-8 space-y-6 mt-auto">
              {/* Giant Mall-Style Mode Selector Cards */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-center text-amber-300">
                  👇 TOCA LA PANTALLA PARA EMPEZAR TU PEDIDO 👇
                </p>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleStartOrder('salon')}
                    className="group relative overflow-hidden rounded-3xl p-5 bg-white text-zinc-950 hover:bg-amber-50 active:scale-[0.98] transition-all shadow-2xl flex flex-col items-center text-center gap-2.5 border-2 border-white"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                      style={{ backgroundColor: customization.primaryColor }}
                    >
                      <UtensilsCrossed className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-base sm:text-lg font-black block leading-tight">
                        COMER AQUÍ
                      </span>
                      <span className="text-[11px] font-bold text-zinc-500 block mt-0.5">
                        En bandeja para salón
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartOrder('takeaway')}
                    className="group relative overflow-hidden rounded-3xl p-5 bg-zinc-900/95 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-2xl flex flex-col items-center text-center gap-2.5 border-2 border-white/20"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-base sm:text-lg font-black block leading-tight">
                        PARA LLEVAR
                      </span>
                      <span className="text-[11px] font-bold text-zinc-400 block mt-0.5">
                        Empaque térmico sellado
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            STEP 2: VERTICAL TOUCH CATALOG (LEFT RAIL + PRODUCT GRID + BOTTOM BAR)
           ========================================================= */}
        {step === 'catalog' && (
          <div className="w-full h-full flex flex-col bg-zinc-950 overflow-hidden">
            {/* Top Kiosk Header */}
            <header className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={handleAskCancelOrder}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors shrink-0"
                  aria-label="Volver al inicio"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    {activeTenant.name.replace('Khalessi Pizza - ', '')}
                  </span>
                  <h2 className="text-xs min-[390px]:text-sm sm:text-base font-black text-white leading-tight line-clamp-2">
                    Arma tu Pedido a tu Gusto
                  </h2>
                </div>
              </div>

              {/* Dining Mode Quick Toggle + Idle Timer */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center p-0.5 rounded-xl bg-zinc-800 border border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setDiningMode('salon')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                      diningMode === 'salon'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <UtensilsCrossed className="w-3 h-3" />
                    <span>Aquí</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiningMode('takeaway')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                      diningMode === 'takeaway'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>Llevar</span>
                  </button>
                </div>

                <span
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/90 text-[10px] font-mono text-zinc-400"
                  title="Tiempo restante de sesión activa"
                >
                  <Clock className="w-3 h-3 text-amber-400" />
                  {idleSecondsLeft}s
                </span>
              </div>
            </header>

            {/* Body: Left Vertical Category Rail + Right Product Grid */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left Vertical Category Rail */}
              <nav
                aria-label="Categorías del menú"
                className="w-[88px] min-[400px]:w-[104px] sm:w-[124px] lg:w-[140px] bg-zinc-900/90 border-r border-zinc-800 p-2 flex flex-col gap-2 overflow-y-auto shrink-0"
                style={{ overscrollBehavior: 'contain' }}
              >
                {KIOSK_CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        touchActivity();
                        setSelectedCategory(cat.id);
                      }}
                      className={`w-full py-3 px-2 rounded-2xl flex flex-col items-center text-center gap-1 transition-all border ${
                        isActive
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg font-black scale-[1.02]'
                          : 'bg-zinc-950/70 text-zinc-300 border-zinc-800/90 hover:bg-zinc-800/70 font-bold'
                      }`}
                    >
                      <span className="text-2xl leading-none">{cat.emoji}</span>
                      <span className="text-[11px] leading-tight line-clamp-2">{cat.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Right Scrollable Product Cards */}
              <div
                className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3"
                style={{ overscrollBehavior: 'contain' }}
              >
                {/* Category Header Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                      SELECCIONA TUS FAVORITOS
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {KIOSK_CATEGORIES.find((c) => c.id === selectedCategory)?.label ||
                        'Menú Artesanal'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-black/40 text-xs font-black text-amber-300 whitespace-nowrap shrink-0">
                    {filteredProducts.length} opciones
                  </span>
                </div>

                {/* Product Cards Grid */}
                <div
                  className={`grid gap-3 pb-6 ${
                    embeddedInAdmin && frameMode === 'totem'
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  }`}
                >
                  {filteredProducts.map((product) => {
                    const minPrice = product.hasSizes
                      ? Math.min(...product.sizes.filter((s) => s.enabled).map((s) => s.price))
                      : product.basePrice;
                    const displayPrice = Number.isFinite(minPrice) ? minPrice : product.basePrice;

                    return (
                      <div
                        key={product.id}
                        onClick={() => openProductCustomizer(product)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openProductCustomizer(product);
                          }
                        }}
                        className="group rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 overflow-hidden flex flex-col justify-between transition-all active:scale-[0.99] cursor-pointer shadow-md"
                      >
                        <div>
                          <div
                            className="relative w-full bg-zinc-800 overflow-hidden"
                            style={{ aspectRatio: '16 / 10' }}
                          >
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              loading="lazy"
                              className="block w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {product.badge && (
                              <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-black text-amber-300 border border-amber-400/30">
                                {product.badge}
                              </span>
                            )}
                            {product.productType === 'half_and_half' && (
                              <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-black uppercase">
                                2 Sabores
                              </span>
                            )}
                          </div>

                          <div className="p-3 space-y-1">
                            <h4 className="text-sm font-black text-white leading-snug line-clamp-1">
                              {product.name}
                            </h4>
                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          </div>
                        </div>

                        <div className="px-3 pb-3 pt-1 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-zinc-400 font-bold block">
                              {product.hasSizes ? 'Desde' : 'Precio'}
                            </span>
                            <span className="text-base font-black text-amber-400">
                              S/ {displayPrice.toFixed(2)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openProductCustomizer(product);
                            }}
                            style={{ backgroundColor: customization.primaryColor }}
                            className="px-3.5 py-2 rounded-xl text-xs font-black text-white shadow-sm flex items-center gap-1 whitespace-nowrap shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Elegir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Tray & Checkout Trigger */}
            <footer className="bg-zinc-900 border-t border-zinc-800 p-3.5 space-y-3 shrink-0 shadow-[0_-12px_30px_rgba(0,0,0,0.5)]">
              {kioskCart.length > 0 ? (
                <>
                  {/* Horizontal mini-preview of items in tray */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {kioskCart.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 shrink-0"
                      >
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="block w-8 h-8 rounded-lg object-cover shrink-0"
                        />
                        <div className="text-left">
                          <span className="text-[11px] font-black text-white block max-w-[130px] truncate">
                            {item.quantity}x {item.productName}
                          </span>
                          <span className="text-[10px] font-bold text-amber-400 block">
                            S/ {item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 pl-1">
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.itemId, -1)}
                            aria-label="Disminuir cantidad"
                            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.itemId, 1)}
                            aria-label="Aumentar cantidad"
                            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-400 block">
                        Mi Bandeja ({kioskTotalUnits}{' '}
                        {kioskTotalUnits === 1 ? 'producto' : 'productos'})
                      </span>
                      <span className="text-2xl font-black text-white">
                        S/ {kioskSubtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAskCancelOrder}
                        className="px-3.5 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 whitespace-nowrap shrink-0"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          touchActivity();
                          setStep('checkout');
                        }}
                        style={{ backgroundColor: customization.primaryColor }}
                        className="px-5 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg flex items-center gap-2 whitespace-nowrap shrink-0 active:scale-95 transition-transform"
                      >
                        <span>Revisar y Pagar</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="flex items-center gap-2.5 text-zinc-400">
                    <Pizza className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold">
                      Tu bandeja está vacía. Toca cualquier producto para personalizarlo.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('attract')}
                    className="px-3 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 whitespace-nowrap shrink-0"
                  >
                    Inicio
                  </button>
                </div>
              )}
            </footer>
          </div>
        )}

        {/* =========================================================
            STEP 3: UPSELLING + CULQI SYNCHRONIZED CHECKOUT
           ========================================================= */}
        {step === 'checkout' && (
          <div className="w-full h-full flex flex-col bg-zinc-950 overflow-hidden">
            {/* Top Bar */}
            <header className="px-4 py-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStep('catalog')}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Seguir Agregando</span>
              </button>

              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  PASO FINAL • SINCRONIZADO CON CULQI
                </span>
                <h2 className="text-sm sm:text-base font-black text-white">
                  Confirma y Paga tu Pedido
                </h2>
              </div>
            </header>

            <form
              id="kiosk-culqi-checkout-form"
              onSubmit={handleInitiateCulqiPayment}
              className="flex-1 overflow-y-auto p-4 space-y-5"
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* 1. Order Items Summary */}
              <section className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>Resumen de tu Bandeja ({kioskTotalUnits})</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {diningMode === 'salon' ? '🍽️ Para Comer Aquí' : '🛍️ Para Llevar'}
                  </span>
                </div>

                <div className="divide-y divide-zinc-800/80">
                  {kioskCart.map((item) => (
                    <div key={item.itemId} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="block w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-white truncate">
                            {item.productName}
                          </h4>
                          {item.size && (
                            <span className="text-[11px] font-bold text-amber-400 block">
                              Tamaño: {item.size.name} ({item.size.slices} cortes)
                            </span>
                          )}
                          {item.halfAndHalf && (
                            <span className="text-[11px] text-zinc-300 block">
                              🌓 1/2 {item.halfAndHalf.firstHalfName} + 1/2{' '}
                              {item.halfAndHalf.secondHalfName}
                            </span>
                          )}
                          {item.subOptions.length > 0 && (
                            <span className="text-[11px] text-zinc-400 block">
                              {item.subOptions.map((s) => s.choiceName).join(' • ')}
                            </span>
                          )}
                          {item.extras.length > 0 && (
                            <span className="text-[11px] text-emerald-400 font-semibold block">
                              + {item.extras.map((e) => `${e.quantity}x ${e.name}`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-sm font-black text-white">
                          S/ {item.totalPrice.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.itemId, -1)}
                            aria-label="Restar unidad"
                            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="w-6 text-center text-xs font-black text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.itemId, 1)}
                            aria-label="Sumar unidad"
                            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2. Smart 1-Tap Upselling Carousel */}
              {upsellItems.length > 0 && (
                <section className="rounded-2xl bg-gradient-to-br from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>¿Acompañas tu pizza con algo más en 1 toque?</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {upsellItems.map((up) => {
                      const price = up.hasSizes
                        ? up.sizes.find((s) => s.enabled)?.price ?? up.basePrice
                        : up.basePrice;
                      return (
                        <button
                          key={up.id}
                          type="button"
                          onClick={() => handleQuickUpsellAdd(up)}
                          className="p-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 flex items-center gap-2.5 text-left transition-all active:scale-95"
                        >
                          <img
                            src={up.imageUrl}
                            alt={up.name}
                            className="block w-11 h-11 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-black text-white truncate block">
                              {up.name}
                            </span>
                            <span className="text-[11px] font-black text-amber-400 block">
                              + S/ {price.toFixed(2)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 3. Customer Name / Alias for Turn Call + Invoice Type */}
              <section className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3.5">
                <div>
                  <label
                    htmlFor="kiosk-customer-alias"
                    className="block text-xs font-black text-zinc-200 mb-1.5"
                  >
                    ¿Con qué nombre te llamamos en pantalla? *
                  </label>
                  <input
                    id="kiosk-customer-alias"
                    type="text"
                    required
                    placeholder="Ej. César, Familia Pérez..."
                    value={customerAlias}
                    onChange={(e) => setCustomerAlias(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-zinc-950 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="kiosk-customer-phone"
                    className="block text-xs font-bold text-zinc-400 mb-1"
                  >
                    WhatsApp / Celular (Opcional para comprobante digital)
                  </label>
                  <input
                    id="kiosk-customer-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="999 888 777"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Comprobante Selector */}
                <div className="space-y-2 pt-1">
                  <span className="block text-xs font-black text-zinc-300">
                    Tipo de Comprobante Electrónico
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'boleta_simple', label: 'Boleta Simple' },
                        { id: 'boleta_dni', label: 'Boleta DNI' },
                        { id: 'factura_ruc', label: 'Factura RUC' },
                      ] as { id: InvoiceDocumentType; label: string }[]
                    ).map((docOpt) => (
                      <button
                        key={docOpt.id}
                        type="button"
                        onClick={() => setInvoiceType(docOpt.id)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-colors whitespace-nowrap shrink-0 ${
                          invoiceType === docOpt.id
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {docOpt.label}
                      </button>
                    ))}
                  </div>

                  {invoiceType === 'boleta_dni' && (
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="Número de DNI (8 dígitos)"
                      value={invoiceDoc}
                      onChange={(e) => setInvoiceDoc(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  )}

                  {invoiceType === 'factura_ruc' && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="Número de RUC (11 dígitos)"
                        value={invoiceDoc}
                        onChange={(e) =>
                          setInvoiceDoc(e.target.value.replace(/\D/g, '').slice(0, 11))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="Razón Social de la Empresa"
                        value={invoiceBusinessName}
                        onChange={(e) => setInvoiceBusinessName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* 4. Strict Culqi Synchronization Notice Card */}
              <section className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-black text-emerald-300 block">
                    Sincronización Directa con Pasarela Culqi
                  </span>
                  <p className="text-zinc-300 leading-relaxed">
                    Acepta <strong>Tarjeta Crédito/Débito</strong> y <strong>Yape QR</strong>. Tu
                    orden se enviará a Cocina (KDS) y emitirá tu ticket de turno únicamente cuando
                    Culqi confirme el pago aprobado.
                  </p>
                </div>
              </section>
            </form>

            {/* Bottom Pay Action Bar */}
            <footer className="bg-zinc-900 border-t border-zinc-800 p-4 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Total a Pagar en Culqi</span>
                <span className="text-2xl font-black text-amber-400">
                  S/ {kioskSubtotal.toFixed(2)}
                </span>
              </div>

              <button
                type="submit"
                form="kiosk-culqi-checkout-form"
                disabled={isProcessingCulqi || kioskCart.length === 0}
                style={{ backgroundColor: customization.primaryColor }}
                className="w-full py-4 px-5 rounded-2xl text-base font-black text-white shadow-xl flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 active:scale-[0.99] disabled:opacity-50 transition-all"
              >
                <CreditCard className="w-5 h-5" />
                <span>
                  {isProcessingCulqi
                    ? 'Conectando con Culqi...'
                    : `Pagar S/ ${kioskSubtotal.toFixed(2)} con Culqi`}
                </span>
              </button>
            </footer>
          </div>
        )}

        {/* =========================================================
            STEP 4: GIANT TURN TICKET SCREEN (AFTER CULQI APPROVAL)
           ========================================================= */}
        {step === 'ticket' && confirmedOrder && (
          <div className="w-full h-full flex flex-col justify-between p-6 bg-zinc-950 text-center overflow-y-auto">
            <div className="my-auto space-y-5 max-w-md mx-auto w-full">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider">
                  ✓ Pago Culqi Aprobado • Enviado a Cocina
                </span>
                <h2 className="text-2xl font-black text-white pt-1">
                  ¡Gracias, {customerAlias || 'Cliente'}!
                </h2>
                <p className="text-xs text-zinc-400">
                  Tu pedido ya está en el horno de{' '}
                  {activeTenant.name.replace('Khalessi Pizza - ', '')}.
                </p>
              </div>

              {/* Giant Printable Turn Ticket Card */}
              <div className="rounded-3xl bg-white text-zinc-950 p-6 shadow-2xl space-y-4 border-4 border-amber-400">
                <div className="border-b border-dashed border-zinc-300 pb-3">
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500 block">
                    NÚMERO DE TURNO EN PANTALLA
                  </span>
                  <div className="text-5xl sm:text-6xl font-black tracking-tight text-zinc-950 mt-1">
                    {confirmedOrder.turnCode}
                  </div>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-zinc-100 text-xs font-bold text-zinc-700">
                    Orden ERP: {confirmedOrder.order.orderNumber} •{' '}
                    {diningMode === 'salon' ? 'Comer Aquí' : 'Para Llevar'}
                  </span>
                </div>

                <div className="text-left space-y-1.5 text-xs">
                  {confirmedOrder.order.items.map((it) => (
                    <div key={it.itemId} className="flex items-center justify-between font-bold">
                      <span className="truncate pr-2">
                        {it.quantity}x {it.productName}
                      </span>
                      <span className="shrink-0">S/ {it.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-zinc-300 pt-3 flex items-center justify-between text-sm font-black">
                  <span>TOTAL PAGADO (CULQI)</span>
                  <span className="text-lg text-emerald-700">
                    S/ {confirmedOrder.order.total.toFixed(2)}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-zinc-500 bg-zinc-100 rounded-xl p-2">
                  Ref. Culqi ({confirmedOrder.methodUsed.toUpperCase()}):{' '}
                  {confirmedOrder.culqiReference}
                </div>
              </div>

              {/* Actions: Print Ticket or Start New Order */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black text-white flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Imprimir Ticket Térmico</span>
                </button>

                <button
                  type="button"
                  onClick={resetKioskSession}
                  style={{ backgroundColor: customization.primaryColor }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-black text-white shadow-lg flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Nuevo Pedido ({ticketResetCountdown}s)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          NATIVE <dialog> FOR PRODUCT CUSTOMIZATION (SIZES, HALF & HALF, EXTRAS)
         ========================================================= */}
      <dialog
        ref={customizerDialogRef}
        aria-labelledby={customizerTitleId}
        onClose={(e) => {
          e.currentTarget.returnValue = '';
          setCustomizingProduct(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.close('backdrop');
          }
        }}
        className="backdrop:bg-black/80 backdrop:backdrop-blur-sm bg-transparent p-2 sm:p-4 w-full max-w-lg"
      >
        {customizingProduct && (
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 text-white overflow-hidden shadow-2xl flex flex-col max-h-[88dvh]">
            {/* Modal Header with Image */}
            <div className="relative h-44 bg-zinc-900 shrink-0">
              <img
                src={customizingProduct.imageUrl}
                alt={customizingProduct.name}
                className="block w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                aria-label="Cerrar personalizador"
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-4 right-4">
                {customizingProduct.badge && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black uppercase">
                    {customizingProduct.badge}
                  </span>
                )}
                <h3 id={customizerTitleId} className="text-lg font-black text-white mt-1">
                  {customizingProduct.name}
                </h3>
              </div>
            </div>

            {/* Scrollable Customizer Options */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* 1. Size Selection */}
              {customizingProduct.hasSizes && (
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    1. Elige el Tamaño
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {customizingProduct.sizes
                      .filter((s) => s.enabled)
                      .map((sz) => {
                        const active = selectedSizeId === sz.id;
                        return (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => setSelectedSizeId(sz.id)}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              active
                                ? 'bg-amber-500/15 border-amber-400 text-white ring-1 ring-amber-400'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80'
                            }`}
                          >
                            <span className="text-xs font-black block">{sz.name}</span>
                            <span className="text-[10px] text-zinc-400 block">{sz.label}</span>
                            <span className="text-sm font-black text-amber-400 block mt-1">
                              S/ {sz.price.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 2. Half & Half Flavour Selector */}
              {customizingProduct.productType === 'half_and_half' && standardPizzas.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    2. Combina tus 2 Mitades
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                      <label
                        htmlFor="kiosk-half-1"
                        className="text-[11px] font-black text-amber-300 block"
                      >
                        🍕 Primera Mitad (Izquierda)
                      </label>
                      <select
                        id="kiosk-half-1"
                        value={firstHalfId}
                        onChange={(e) => setFirstHalfId(e.target.value)}
                        className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-white"
                      >
                        {standardPizzas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                      <label
                        htmlFor="kiosk-half-2"
                        className="text-[11px] font-black text-amber-300 block"
                      >
                        🍕 Segunda Mitad (Derecha)
                      </label>
                      <select
                        id="kiosk-half-2"
                        value={secondHalfId}
                        onChange={(e) => setSecondHalfId(e.target.value)}
                        className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-white"
                      >
                        {standardPizzas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. SubOptions (Tipo de Masa, etc.) */}
              {customizingProduct.subOptions
                .filter((g) => g.enabled)
                .map((group) => (
                  <div key={group.id} className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                      {group.name} {group.required ? '*' : ''}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.choices.map((ch) => {
                        const isSelected = selectedSubChoices[group.id] === ch.id;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() =>
                              setSelectedSubChoices((prev) => ({ ...prev, [group.id]: ch.id }))
                            }
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-400 text-white'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                            }`}
                          >
                            <span className="text-xs font-bold">{ch.name}</span>
                            <span className="text-[11px] font-black text-amber-400 shrink-0">
                              {ch.priceDelta > 0 ? `+S/ ${ch.priceDelta.toFixed(2)}` : 'Incluido'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* 4. Allowed Extras (Bordes, Quesos, Dips) */}
              {customizingProduct.allowedExtras.filter((e) => e.enabled).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    Adicionales y Bordes Rellenos
                  </span>
                  <div className="space-y-2">
                    {customizingProduct.allowedExtras
                      .filter((e) => e.enabled)
                      .map((ext) => {
                        const qty = selectedExtras[ext.id] || 0;
                        return (
                          <div
                            key={ext.id}
                            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="text-xs font-bold text-white block">{ext.name}</span>
                              <span className="text-[11px] font-black text-amber-400">
                                + S/ {ext.price.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedExtras((prev) => ({
                                    ...prev,
                                    [ext.id]: Math.max(0, (prev[ext.id] || 0) - 1),
                                  }))
                                }
                                className="w-7 h-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-5 text-center text-xs font-black">{qty}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedExtras((prev) => ({
                                    ...prev,
                                    [ext.id]: (prev[ext.id] || 0) + 1,
                                  }))
                                }
                                className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-black"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Quantity + Single-Line Action Buttons */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCustomQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-7 text-center text-sm font-black text-white">{customQty}</span>
                <button
                  type="button"
                  onClick={() => setCustomQty((q) => q + 1)}
                  className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizingProduct(null)}
                  className="px-3.5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 whitespace-nowrap shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={handleConfirmAddProduct}
                  style={{ backgroundColor: customization.primaryColor }}
                  className="px-4 py-3 rounded-2xl text-xs sm:text-sm font-black text-white shadow-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span>Agregar • S/ {customizerPricing.totalPrice.toFixed(2)}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* =========================================================
          CULQI CHECKOUT V4 INTERACTIVE TERMINAL (TARJETA & YAPE QR)
         ========================================================= */}
      <StoreCulqiSandboxDialog
        isOpen={isCulqiSandboxOpen}
        storeTitle={`${companyInfo.commercialName || customization.appName} — Kiosco`}
        amountSoles={kioskSubtotal}
        customerEmail="kiosco@khalessipizza.com"
        yapeEnabled={culqiCfg?.yapeEnabled ?? true}
        accentColor={customization.primaryColor || '#f97316'}
        autoButtonContrast={true}
        onCancel={() => {
          setIsCulqiSandboxOpen(false);
          dispatchToast(
            'Pago en Culqi cancelado',
            'Tu pedido aún no se ha enviado a cocina. Completa el pago en Culqi para confirmar.',
            'warning'
          );
        }}
        onApproved={(result) => {
          finalizeKioskOrderAfterCulqi(result);
        }}
      />
    </div>
  );
};
