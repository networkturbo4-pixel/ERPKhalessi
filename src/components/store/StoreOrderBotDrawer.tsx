import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Plus,
  SlidersHorizontal,
  ShoppingBag,
  Bot,
  CheckCircle2,
  MapPin,
  Store,
  Bike,
  UtensilsCrossed,
  UserCheck,
  CreditCard,
  Smartphone,
  Banknote,
  RotateCcw,
  Mic,
  MicOff,
  LocateFixed,
  Loader2,
  Eye,
} from 'lucide-react';
import {
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  ProductCategoryItem,
} from '../../types/catalog';
import {
  askOrderBotSmart,
  BotSuggestion,
  buildWelcomeResponse,
  getUpsellSuggestions,
  learnTastesFromItems,
  learnTastesFromText,
  loadBotPreferences,
  saveBotPreferences,
} from '../../utils/orderBotEngine';

export interface BotCheckoutSubmission {
  orderMode: 'delivery' | 'pickup' | 'salon' | 'takeaway';
  customerName: string;
  customerPhone: string;
  customerDni?: string;
  deliveryAddress?: string;
  deliveryReference?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  suggestions?: BotSuggestion[];
  quickReplies?: string[];
  orderCards?: Order[];
  showAuthButton?: boolean;
}

type CheckoutStep = 'idle' | 'upsell' | 'type' | 'address' | 'customer' | 'payment' | 'confirm';

interface StoreOrderBotDrawerProps {
  products: Product[];
  categories: ProductCategoryItem[];
  storeName: string;
  branchName?: string;
  branchAddress?: string;
  accentColor: string;
  isLightTheme: boolean;
  cartItems: OrderItem[];
  cartSubtotal: number;
  deliveryFee?: number;
  bottomOffsetClass?: string;
  mode?: 'store' | 'kiosk';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideFloatingOnMobile?: boolean;
  isRegistered?: boolean;
  requireRegistration?: boolean;
  userKey?: string;
  defaultCustomerName?: string;
  defaultCustomerPhone?: string;
  defaultCustomerDni?: string;
  defaultAddress?: string;
  defaultReference?: string;
  activeOrder?: Order | null;
  activeOrders?: Order[];
  lastOrder?: Order | null;
  onOpenAuth?: () => void;
  onAddToCart: (item: OrderItem, origin?: { x: number; y: number }) => void;
  onCustomizeProduct: (product: Product) => void;
  onOpenCart: () => void;
  onInspectOrder?: (orderId: string) => void;
  onValidateCoupon?: (
    code: string,
    subtotal: number
  ) => { valid: boolean; discountSoles?: number; error?: string };
  onSubmitOrder?: (payload: BotCheckoutSubmission) => Promise<Order | null> | Order | null;
}

export const StoreOrderBotDrawer: React.FC<StoreOrderBotDrawerProps> = ({
  products,
  categories,
  storeName,
  branchName,
  branchAddress,
  accentColor,
  isLightTheme,
  cartItems,
  cartSubtotal,
  deliveryFee = 0,
  bottomOffsetClass = 'bottom-5',
  mode = 'store',
  isOpen: controlledIsOpen,
  onOpenChange,
  hideFloatingOnMobile = false,
  isRegistered = true,
  requireRegistration = false,
  userKey = 'guest',
  defaultCustomerName = '',
  defaultCustomerPhone = '',
  defaultCustomerDni = '',
  defaultAddress = '',
  defaultReference = '',
  activeOrder = null,
  activeOrders = [],
  lastOrder = null,
  onOpenAuth,
  onAddToCart,
  onCustomizeProduct,
  onOpenCart,
  onInspectOrder,
  onValidateCoupon,
  onSubmitOrder,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = (next: boolean) => {
    setInternalIsOpen(next);
    onOpenChange?.(next);
  };

  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  const [input, setInput] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('idle');
  const [orderMode, setOrderMode] = useState<'delivery' | 'pickup' | 'salon' | 'takeaway'>(
    mode === 'kiosk' ? 'salon' : 'delivery'
  );
  const [addressDraft, setAddressDraft] = useState(defaultAddress);
  const [referenceDraft, setReferenceDraft] = useState(defaultReference);
  const [nameDraft, setNameDraft] = useState(defaultCustomerName);
  const [phoneDraft, setPhoneDraft] = useState(defaultCustomerPhone);
  const [dniDraft, setDniDraft] = useState(defaultCustomerDni);
  const [paymentDraft, setPaymentDraft] = useState<PaymentMethod>(
    mode === 'kiosk' ? 'culqi' : 'yape_plin'
  );
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Inline Conversational Product Flow state
  const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);
  const [configStep, setConfigStep] = useState<'size' | 'sub' | 'extras' | 'confirm' | null>(null);
  const [configSubIndex, setConfigSubIndex] = useState<number>(0);
  const [cfgSizeId, setCfgSizeId] = useState<string>('');
  const [cfgSubChoices, setCfgSubChoices] = useState<Record<string, string>>({});
  const [cfgExtraIds, setCfgExtraIds] = useState<Record<string, boolean>>({});
  const [cfgQty, setCfgQty] = useState<number>(1);
  const [cfgNotes, setCfgNotes] = useState<string>('');

  const supportsVoice =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .webkitSpeechRecognition
    );

  const upsellItems = getUpsellSuggestions(cartItems, products);

  const buildInitialMessages = (): ChatMessage[] => {
    const prefs = loadBotPreferences(userKey);
    const welcome = buildWelcomeResponse(products, {
      storeName,
      branchName,
      branchAddress,
      customerName: defaultCustomerName,
      isRegistered,
      requireRegistration,
      preferences: prefs,
      activeOrder,
      activeOrders,
      lastOrder,
    });
    return [
      {
        id: 'bot-welcome',
        sender: 'bot',
        text: welcome.reply,
        suggestions: welcome.suggestions,
        quickReplies: welcome.quickReplies,
        showAuthButton: welcome.action === 'open_auth',
      },
    ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(buildInitialMessages);

  // Sync defaults when customer logs in or changes
  useEffect(() => {
    if (defaultCustomerName && !nameDraft) setNameDraft(defaultCustomerName);
    if (defaultCustomerPhone && !phoneDraft) setPhoneDraft(defaultCustomerPhone);
    if (defaultCustomerDni && !dniDraft) setDniDraft(defaultCustomerDni);
    if (defaultAddress && !addressDraft) setAddressDraft(defaultAddress);
    if (defaultReference && !referenceDraft) setReferenceDraft(defaultReference);
  }, [defaultCustomerName, defaultCustomerPhone, defaultCustomerDni, defaultAddress, defaultReference]);

  // Refresh welcome message when registration status changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'bot-welcome') {
        return buildInitialMessages();
      }
      return prev;
    });
  }, [isRegistered, userKey]);

  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, checkoutStep, isOpen]);

  const pushBotMessage = (text: string, extra?: Partial<ChatMessage>) => {
    setMessages(prev => [
      ...prev,
      {
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        sender: 'bot',
        text,
        ...extra,
      },
    ]);
  };

  const startConversationalCheckout = () => {
    if (requireRegistration && !isRegistered) {
      pushBotMessage(
        'Para completar tu compra y guardar tus puntos, primero regístrate o inicia sesión.',
        { showAuthButton: true }
      );
      return;
    }
    if (cartItems.length === 0) {
      pushBotMessage(
        'Tu carrito está vacío. Elige primero una pizza o promo para continuar:',
        { quickReplies: ['Ver promociones', 'Para 4 personas', 'Presupuesto S/ 35'] }
      );
      return;
    }
    if (upsellItems.length > 0) {
      setCheckoutStep('upsell');
      pushBotMessage('Antes de cerrar, ¿agregamos una bebida o acompañamiento?');
      return;
    }
    setCheckoutStep('type');
    pushBotMessage(
      mode === 'kiosk'
        ? '¡Genial! ¿Tu pedido es para comer en Salón o Para Llevar?'
        : '¡Perfecto! Vamos a cerrar tu compra. ¿Será Delivery o Recojo en local?'
    );
  };

  const handleToggleVoice = () => {
    if (!supportsVoice || isListening) return;
    type SpeechCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const win = window as unknown as {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Recognition) return;

    try {
      const recognition = new Recognition();
      recognition.lang = 'es-PE';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsListening(true);

      recognition.onresult = event => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          handleSend(transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleDetectLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocationError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`
          );
          if (resp.ok) {
            const data = (await resp.json()) as {
              display_name?: string;
              address?: {
                road?: string;
                house_number?: string;
                suburb?: string;
                neighbourhood?: string;
                city?: string;
                town?: string;
                district?: string;
              };
            };
            const a = data.address;
            const street = [a?.road, a?.house_number].filter(Boolean).join(' ');
            const area = a?.neighbourhood || a?.suburb || a?.district || a?.city || a?.town;
            const formatted = [street, area].filter(Boolean).join(', ') || data.display_name;
            setAddressDraft(formatted || `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          } else {
            setAddressDraft(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch {
          setAddressDraft(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsLocating(false);
        }
      },
      err => {
        setIsLocating(false);
        setLocationError(
          err.code === 1
            ? 'Permiso de ubicación denegado. Escríbela manualmente.'
            : 'No pudimos obtener tu ubicación. Intenta escribirla.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleRepeatLastOrder = () => {
    if (!lastOrder || lastOrder.items.length === 0) return;
    lastOrder.items.forEach(item => {
      onAddToCart({
        ...item,
        itemId: `repeat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      });
    });
  };

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text) return;

    setMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'user', text },
    ]);
    if (!rawText) setInput('');

    if (checkoutStep !== 'idle') {
      setCheckoutStep('idle');
    }

    const prefs = loadBotPreferences(userKey);
    setIsThinking(true);
    try {
      const res = await askOrderBotSmart(text, products, categories, {
        storeName,
        branchName,
        branchAddress,
        customerName: defaultCustomerName,
        isRegistered,
        requireRegistration,
        preferences: prefs,
        activeOrder,
        activeOrders,
        lastOrder,
      });

      learnTastesFromText(
        userKey,
        text,
        res.suggestions.map(s => s.product)
      );

      if (res.action === 'repeat_last_order') {
        handleRepeatLastOrder();
      }

      if (res.action === 'start_checkout') {
        startConversationalCheckout();
        return;
      }

      pushBotMessage(res.reply, {
        suggestions: res.suggestions,
        quickReplies: res.quickReplies,
        orderCards: res.orderCards,
        showAuthButton: res.action === 'open_auth',
      });
    } finally {
      setIsThinking(false);
    }
  };

  const advanceFromSubStep = (product: Product, nextSubIdx: number) => {
    const enabledSubs = product.subOptions.filter(g => g.enabled);
    if (nextSubIdx < enabledSubs.length) {
      setConfigSubIndex(nextSubIdx);
      setConfigStep('sub');
      pushBotMessage(`Elige ${enabledSubs[nextSubIdx].name}:`);
      return;
    }
    const enabledExtras = (product.allowedExtras || []).filter(ex => ex.enabled);
    if (enabledExtras.length > 0) {
      setConfigStep('extras');
      pushBotMessage(`¿Deseas agregar algún extra a tu ${product.name}?`);
      return;
    }
    setConfigStep('confirm');
  };

  const openInlineConfigurator = (product: Product, preferredSizeId?: string) => {
    if (product.productType === 'half_and_half') {
      setIsOpen(false);
      onCustomizeProduct(product);
      return;
    }
    const enabledSizes = product.sizes.filter(s => s.enabled);
    const defaultSize =
      enabledSizes.find(s => s.id === preferredSizeId) ||
      enabledSizes.find(s => s.isDefault) ||
      enabledSizes[0];

    const initialSubs: Record<string, string> = {};
    const enabledSubs = product.subOptions.filter(g => g.enabled);
    enabledSubs.forEach(g => {
      const def = g.choices.find(c => c.isDefault) || g.choices[0];
      if (def) initialSubs[g.id] = def.id;
    });

    setCfgSizeId(defaultSize ? defaultSize.id : '');
    setCfgSubChoices(initialSubs);
    setCfgExtraIds({});
    setCfgQty(1);
    setCfgNotes('');
    setConfigSubIndex(0);
    setConfiguringProduct(product);

    if (product.hasSizes && enabledSizes.length > 0) {
      setConfigStep('size');
      pushBotMessage(`¿Qué tamaño prefieres para tu ${product.name}?`);
    } else if (enabledSubs.length > 0) {
      setConfigStep('sub');
      pushBotMessage(`Elige ${enabledSubs[0].name}:`);
    } else if ((product.allowedExtras || []).some(ex => ex.enabled)) {
      setConfigStep('extras');
      pushBotMessage(`¿Deseas agregar algún extra a tu ${product.name}?`);
    } else {
      setConfigStep('confirm');
    }
  };

  const handleConfirmInlineConfig = (ev: React.MouseEvent<HTMLButtonElement>) => {
    if (!configuringProduct) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    const sizeObj = configuringProduct.hasSizes
      ? configuringProduct.sizes.find(s => s.id === cfgSizeId)
      : undefined;
    const base = sizeObj ? sizeObj.price : configuringProduct.basePrice;

    const chosenSubs = configuringProduct.subOptions
      .filter(g => g.enabled)
      .flatMap(g => {
        const cid = cfgSubChoices[g.id];
        const ch = g.choices.find(c => c.id === cid);
        if (!ch) return [];
        return [
          {
            groupId: g.id,
            groupName: g.name,
            choiceId: ch.id,
            choiceName: ch.name,
            priceDelta: ch.priceDelta,
          },
        ];
      });

    const chosenExtras = (configuringProduct.allowedExtras || [])
      .filter(ex => ex.enabled && cfgExtraIds[ex.id])
      .map(ex => ({
        id: ex.id,
        name: ex.name,
        price: ex.price,
        quantity: 1,
      }));

    const subDelta = chosenSubs.reduce((s, c) => s + c.priceDelta, 0);
    const extrasDelta = chosenExtras.reduce((s, e) => s + e.price * e.quantity, 0);
    const unitPrice = base + subDelta + extrasDelta;

    const item: OrderItem = {
      itemId: `bot-cfg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: configuringProduct.id,
      productName: configuringProduct.name,
      productImage: configuringProduct.imageUrl,
      size: sizeObj
        ? {
            id: sizeObj.id,
            name: sizeObj.name,
            slices: sizeObj.slices,
            price: sizeObj.price,
          }
        : undefined,
      subOptions: chosenSubs,
      extras: chosenExtras,
      notes: cfgNotes.trim() || undefined,
      unitPrice,
      quantity: cfgQty,
      totalPrice: unitPrice * cfgQty,
    };

    onAddToCart(item, origin);
    learnTastesFromItems(userKey, [item]);
    setConfiguringProduct(null);
    setConfigStep(null);
    pushBotMessage(
      `Listo, agregué ${cfgQty}× ${configuringProduct.name}${sizeObj ? ` (${sizeObj.name})` : ''} a tu pedido.`,
      { quickReplies: ['Finalizar compra', 'Ver promociones', 'Bebidas y extras'] }
    );
  };

  const handleQuickAdd = (
    suggestion: BotSuggestion,
    ev?: React.MouseEvent<HTMLButtonElement>
  ) => {
    const rect = ev?.currentTarget?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : undefined;
    const { product, suggestedSize, unitPrice } = suggestion;

    const hasChoices =
      product.productType === 'half_and_half' ||
      (product.hasSizes && product.sizes.some(s => s.enabled)) ||
      product.subOptions.some(g => g.enabled) ||
      (product.allowedExtras || []).some(ex => ex.enabled);

    if (hasChoices) {
      openInlineConfigurator(product, suggestedSize?.id);
      return;
    }

    const defaultSubOptions = product.subOptions
      .filter(g => g.enabled)
      .flatMap(g => {
        const def = g.choices.find(c => c.isDefault);
        if (!def) return [];
        return [
          {
            groupId: g.id,
            groupName: g.name,
            choiceId: def.id,
            choiceName: def.name,
            priceDelta: def.priceDelta,
          },
        ];
      });

    const subDelta = defaultSubOptions.reduce((sum, s) => sum + s.priceDelta, 0);
    const finalUnit = unitPrice + subDelta;

    const item: OrderItem = {
      itemId: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      size: suggestedSize
        ? {
            id: suggestedSize.id,
            name: suggestedSize.name,
            slices: suggestedSize.slices,
            price: suggestedSize.price,
          }
        : undefined,
      subOptions: defaultSubOptions,
      extras: [],
      unitPrice: finalUnit,
      quantity: 1,
      totalPrice: finalUnit,
    };

    onAddToCart(item, origin);
    learnTastesFromItems(userKey, [item]);
  };

  const handleSelectOrderMode = (chosen: 'delivery' | 'pickup' | 'salon' | 'takeaway') => {
    setOrderMode(chosen);
    saveBotPreferences(userKey, {
      preferredMode: chosen === 'takeaway' ? 'pickup' : chosen,
    });
    setMessages(prev => [
      ...prev,
      {
        id: `user-mode-${Date.now()}`,
        sender: 'user',
        text:
          chosen === 'delivery'
            ? 'Delivery a domicilio'
            : chosen === 'pickup'
            ? 'Recojo en local'
            : chosen === 'salon'
            ? 'Comer en Salón'
            : 'Para Llevar',
      },
    ]);

    if (chosen === 'delivery') {
      setCheckoutStep('address');
      pushBotMessage('Indícanos tu dirección exacta y una referencia para el motorizado:');
    } else {
      setCheckoutStep('customer');
      pushBotMessage('Confirma tus datos para el pedido:');
    }
  };

  const handleApplyCoupon = () => {
    if (!onValidateCoupon || !couponInput.trim()) return;
    const res = onValidateCoupon(couponInput.trim(), cartSubtotal);
    if (!res.valid) {
      setCouponError(res.error || 'Cupón no válido');
      setAppliedCoupon(null);
      return;
    }
    setCouponError(null);
    setAppliedCoupon({
      code: couponInput.trim().toUpperCase(),
      discount: res.discountSoles || 0,
    });
  };

  const effectiveDeliveryFee =
    mode === 'store' && orderMode === 'delivery' ? deliveryFee : 0;
  const effectiveDiscount = appliedCoupon?.discount || 0;
  const finalTotal = Math.max(0, cartSubtotal + effectiveDeliveryFee - effectiveDiscount);

  const handleConfirmPurchase = async () => {
    if (!onSubmitOrder || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await onSubmitOrder({
        orderMode,
        customerName: nameDraft.trim() || 'Cliente',
        customerPhone: phoneDraft.trim() || 'Sin teléfono',
        customerDni: dniDraft.trim() || undefined,
        deliveryAddress: orderMode === 'delivery' ? addressDraft.trim() : undefined,
        deliveryReference: orderMode === 'delivery' ? referenceDraft.trim() : undefined,
        paymentMethod: paymentDraft,
        couponCode: appliedCoupon?.code,
      });

      learnTastesFromItems(userKey, cartItems);
      saveBotPreferences(userKey, {
        preferredMode: orderMode === 'takeaway' ? 'pickup' : orderMode,
        preferredPayment: paymentDraft,
      });

      setCheckoutStep('idle');
      setAppliedCoupon(null);
      setCouponInput('');

      if (created) {
        pushBotMessage(
          `¡Pedido #${created.orderNumber.replace(/^#/, '')} confirmado! Lo enviamos directo a cocina. Total: S/ ${created.total.toFixed(2)}.`,
          { quickReplies: ['¿Cómo va mi pedido?', 'Ver promociones'] }
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const surfaceBg = isLightTheme
    ? 'bg-white text-zinc-900 border-zinc-200'
    : 'bg-zinc-900 text-zinc-100 border-zinc-800';
  const subSurfaceBg = isLightTheme
    ? 'bg-zinc-50 border-zinc-200'
    : 'bg-zinc-950 border-zinc-800';
  const mutedText = isLightTheme ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir asistente de pedidos"
          className={`${hideFloatingOnMobile ? 'hidden lg:inline-flex' : 'inline-flex'} fixed right-4 ${bottomOffsetClass} z-40 items-center gap-2 px-3.5 py-2.5 rounded-full text-white text-xs font-semibold shadow-lg hover:opacity-95 transition-opacity whitespace-nowrap`}
          style={{ backgroundColor: accentColor }}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="sm:hidden">Asistente</span>
          <span className="hidden sm:inline">
            {mode === 'kiosk' ? '¿Ayuda para pedir?' : '¿Te ayudo a pedir?'}
          </span>
        </button>
      )}

      {/* Chat Drawer / Bottom Sheet */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-end sm:justify-end p-0 sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full sm:max-w-md h-[86dvh] sm:h-[620px] rounded-t-3xl sm:rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${surfaceBg}`}
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${subSurfaceBg}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">Asistente de Pedidos</h3>
                  <p className={`text-[11px] truncate ${mutedText}`}>
                    {defaultCustomerName
                      ? `Hola, ${defaultCustomerName.split(' ')[0]}`
                      : 'Te ayudo a elegir y comprar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {cartCount > 0 && checkoutStep === 'idle' && onSubmitOrder && (
                  <button
                    type="button"
                    onClick={startConversationalCheckout}
                    className="px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span className="tabular-nums">Comprar ({cartCount})</span>
                  </button>
                )}
                {cartCount > 0 && !onSubmitOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCart();
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span className="tabular-nums">Pedido ({cartCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Cerrar asistente"
                  onClick={() => setIsOpen(false)}
                  className={`p-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 ${mutedText}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3.5"
              style={{ overscrollBehavior: 'contain' }}
            >
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'text-white rounded-br-sm'
                        : `${subSurfaceBg} border rounded-bl-sm`
                    }`}
                    style={msg.sender === 'user' ? { backgroundColor: accentColor } : undefined}
                  >
                    {msg.text}
                  </div>

                  {/* Registration CTA if guest */}
                  {msg.sender === 'bot' && msg.showAuthButton && onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAuth();
                      }}
                      className="px-3.5 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity"
                      style={{ backgroundColor: accentColor }}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Registrarme / Iniciar sesión</span>
                    </button>
                  )}

                  {/* Active Order Cards */}
                  {msg.sender === 'bot' && msg.orderCards && msg.orderCards.length > 0 && (
                    <div className="w-full space-y-2">
                      {msg.orderCards.map(ord => {
                        const statusText =
                          ord.status === 'recibido'
                            ? 'Recibido en cocina'
                            : ord.status === 'en_cocina'
                            ? 'Preparando masa'
                            : ord.status === 'en_horno'
                            ? 'En horno de piedra'
                            : ord.status === 'listo'
                            ? 'Listo p/ despacho'
                            : ord.status === 'en_ruta'
                            ? 'En ruta'
                            : 'En proceso';
                        const itemsSummary = (ord.items || [])
                          .map(i => `${i.quantity}× ${i.productName}`)
                          .join(', ');

                        return (
                          <div
                            key={`${msg.id}-${ord.id}`}
                            className={`p-3 rounded-xl border space-y-2 ${subSurfaceBg}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-xs font-semibold font-mono">
                                  #{ord.orderNumber.replace(/^#/, '')}
                                </span>
                                <span className={`text-[11px] truncate ${mutedText}`}>
                                  · {statusText}
                                </span>
                              </div>
                              <span className="text-xs font-semibold tabular-nums shrink-0">
                                S/ {ord.total.toFixed(2)}
                              </span>
                            </div>

                            {itemsSummary && (
                              <p className={`text-[11px] truncate ${mutedText}`}>
                                {itemsSummary}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <span className={`text-[11px] font-mono ${mutedText}`}>
                                ~{ord.estimatedMinutes || 25} min
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    ord.items.forEach(item =>
                                      onAddToCart({
                                        ...item,
                                        itemId: `bot-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                      })
                                    );
                                  }}
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 whitespace-nowrap ${
                                    isLightTheme
                                      ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                                      : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                                  }`}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Repetir</span>
                                </button>
                                {onInspectOrder && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsOpen(false);
                                      onInspectOrder(ord.id);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                                    style={{ backgroundColor: accentColor }}
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Ver en vivo</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Product Suggestions */}
                  {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="w-full space-y-2">
                      {msg.suggestions.map(sugg => (
                        <div
                          key={`${msg.id}-${sugg.product.id}`}
                          className={`p-2.5 rounded-xl border flex items-center gap-3 ${subSurfaceBg}`}
                        >
                          {sugg.product.imageUrl && (
                            <img
                              src={sugg.product.imageUrl}
                              alt={sugg.product.name}
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{sugg.product.name}</p>
                            <p className={`text-[11px] truncate ${mutedText}`}>{sugg.reason}</p>
                            <p className="text-xs font-semibold tabular-nums mt-0.5">
                              S/ {sugg.unitPrice.toFixed(2)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={e => handleQuickAdd(sugg, e)}
                            className="px-3 py-2 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 hover:opacity-95 transition-opacity"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {(sugg.product.hasSizes && sugg.product.sizes.some(s => s.enabled)) ||
                              sugg.product.subOptions.some(g => g.enabled) ||
                              (sugg.product.allowedExtras || []).some(ex => ex.enabled)
                                ? 'Elegir'
                                : 'Agregar'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Replies */}
                  {msg.sender === 'bot' && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.quickReplies.map(qr => (
                        <button
                          key={`${msg.id}-${qr}`}
                          type="button"
                          onClick={() => handleSend(qr)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                          }`}
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="flex items-start">
                  <div className={`px-3.5 py-2 rounded-2xl border text-xs ${subSurfaceBg} ${mutedText}`}>
                    Pensando...
                  </div>
                </div>
              )}

              {/* STEP-BY-STEP CONVERSATIONAL CARDS FOR PRODUCT DETAILS */}
              {configuringProduct && configStep && (() => {
                const enabledSizes = configuringProduct.sizes.filter(s => s.enabled);
                const enabledSubs = configuringProduct.subOptions.filter(g => g.enabled);
                const enabledExtras = (configuringProduct.allowedExtras || []).filter(ex => ex.enabled);
                const activeSize = configuringProduct.hasSizes
                  ? enabledSizes.find(s => s.id === cfgSizeId)
                  : undefined;
                const basePrice = activeSize ? activeSize.price : configuringProduct.basePrice;
                const subDelta = enabledSubs.reduce((sum, g) => {
                  const ch = g.choices.find(c => c.id === cfgSubChoices[g.id]);
                  return sum + (ch?.priceDelta || 0);
                }, 0);
                const extrasDelta = enabledExtras.reduce(
                  (sum, ex) => sum + (cfgExtraIds[ex.id] ? ex.price : 0),
                  0
                );
                const liveTotal = (basePrice + subDelta + extrasDelta) * cfgQty;

                return (
                  <div className="space-y-2.5">
                    {configStep === 'size' && (
                      <div className="grid grid-cols-2 gap-2">
                        {enabledSizes.map(sz => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => {
                              setCfgSizeId(sz.id);
                              setMessages(prev => [
                                ...prev,
                                {
                                  id: `user-sz-${Date.now()}`,
                                  sender: 'user',
                                  text: `${sz.name} · S/ ${sz.price.toFixed(2)}`,
                                },
                              ]);
                              advanceFromSubStep(configuringProduct, 0);
                            }}
                            className={`p-3 rounded-2xl border text-left transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 ${subSurfaceBg}`}
                          >
                            <span className="text-xs font-semibold block truncate">{sz.name}</span>
                            <span className={`text-[11px] block ${mutedText}`}>
                              {sz.slices} tajadas
                            </span>
                            <span className="text-sm font-semibold tabular-nums block mt-1.5" style={{ color: accentColor }}>
                              S/ {sz.price.toFixed(2)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {configStep === 'sub' && enabledSubs[configSubIndex] && (
                      <div className="grid grid-cols-2 gap-2">
                        {enabledSubs[configSubIndex].choices.map(ch => {
                          const group = enabledSubs[configSubIndex];
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => {
                                setCfgSubChoices(prev => ({ ...prev, [group.id]: ch.id }));
                                setMessages(prev => [
                                  ...prev,
                                  {
                                    id: `user-sub-${Date.now()}`,
                                    sender: 'user',
                                    text: ch.name,
                                  },
                                ]);
                                advanceFromSubStep(configuringProduct, configSubIndex + 1);
                              }}
                              className={`p-3 rounded-2xl border text-left transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 ${subSurfaceBg}`}
                            >
                              <span className="text-xs font-semibold block truncate">{ch.name}</span>
                              {ch.description && (
                                <span className={`text-[11px] line-clamp-1 ${mutedText}`}>
                                  {ch.description}
                                </span>
                              )}
                              <span className={`text-[11px] font-medium tabular-nums block mt-1 ${mutedText}`}>
                                {ch.priceDelta > 0 ? `+ S/ ${ch.priceDelta.toFixed(2)}` : 'Incluido'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {configStep === 'extras' && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          {enabledExtras.map(ex => {
                            const active = Boolean(cfgExtraIds[ex.id]);
                            return (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() =>
                                  setCfgExtraIds(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))
                                }
                                className={`p-3 rounded-2xl border text-left transition-colors ${
                                  active
                                    ? 'border-transparent text-white'
                                    : `${subSurfaceBg} hover:border-zinc-400 dark:hover:border-zinc-500`
                                }`}
                                style={active ? { backgroundColor: accentColor } : undefined}
                              >
                                <span className="text-xs font-semibold block truncate">{ex.name}</span>
                                <span
                                  className={`text-[11px] font-medium tabular-nums block mt-1 ${
                                    active ? 'text-white/90' : mutedText
                                  }`}
                                >
                                  + S/ {ex.price.toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfigStep('confirm')}
                          className="w-full py-2.5 rounded-xl text-white text-xs font-semibold tabular-nums"
                          style={{ backgroundColor: accentColor }}
                        >
                          {Object.values(cfgExtraIds).some(Boolean)
                            ? `Continuar con extras · S/ ${liveTotal.toFixed(2)}`
                            : 'Sin extras, continuar'}
                        </button>
                      </div>
                    )}

                    {configStep === 'confirm' && (
                      <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${subSurfaceBg}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {configuringProduct.imageUrl && (
                              <img
                                src={configuringProduct.imageUrl}
                                alt={configuringProduct.name}
                                className="w-11 h-11 rounded-xl object-cover shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{configuringProduct.name}</p>
                              {activeSize && (
                                <p className={`text-[11px] ${mutedText}`}>
                                  {activeSize.name} ({activeSize.slices} tajadas)
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label="Cancelar selección"
                            onClick={() => {
                              setConfiguringProduct(null);
                              setConfigStep(null);
                            }}
                            className={`p-1 rounded-lg ${mutedText}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={cfgNotes}
                          onChange={e => setCfgNotes(e.target.value)}
                          placeholder="Nota para cocina (ej. sin cebolla, bien dorada)"
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900'
                              : 'bg-zinc-900 border-zinc-700 text-white'
                          }`}
                        />

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="inline-flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1">
                            <button
                              type="button"
                              onClick={() => setCfgQty(q => Math.max(1, q - 1))}
                              className="px-1 font-semibold"
                            >
                              -
                            </button>
                            <span className="tabular-nums font-semibold">{cfgQty}</span>
                            <button
                              type="button"
                              onClick={() => setCfgQty(q => q + 1)}
                              className="px-1 font-semibold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleConfirmInlineConfig}
                            className="px-4 py-2 rounded-xl text-white text-xs font-semibold tabular-nums whitespace-nowrap shrink-0"
                            style={{ backgroundColor: accentColor }}
                          >
                            Agregar · S/ {liveTotal.toFixed(2)}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* INTERACTIVE CONVERSATIONAL CHECKOUT CARDS */}
              {checkoutStep === 'upsell' && (
                <div className={`p-3 rounded-2xl border space-y-2.5 ${subSurfaceBg}`}>
                  <p className="text-xs font-semibold">¿Acompañamos tu pedido?</p>
                  <div className="space-y-2">
                    {upsellItems.map(sugg => (
                      <div
                        key={`upsell-${sugg.product.id}`}
                        className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-2.5"
                      >
                        {sugg.product.imageUrl && (
                          <img
                            src={sugg.product.imageUrl}
                            alt={sugg.product.name}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{sugg.product.name}</p>
                          <p className="text-xs font-semibold tabular-nums">
                            S/ {sugg.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={e => {
                            handleQuickAdd(sugg, e);
                            setCheckoutStep('type');
                            pushBotMessage(
                              mode === 'kiosk'
                                ? '¡Sumado! ¿Tu pedido es para Salón o Para Llevar?'
                                : '¡Sumado! ¿Será Delivery o Recojo en local?'
                            );
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                          style={{ backgroundColor: accentColor }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutStep('type');
                      pushBotMessage(
                        mode === 'kiosk'
                          ? '¿Tu pedido es para comer en Salón o Para Llevar?'
                          : '¿Será Delivery o Recojo en local?'
                      );
                    }}
                    className="w-full py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-medium"
                  >
                    No gracias, continuar al pago
                  </button>
                </div>
              )}

              {checkoutStep === 'type' && (
                <div className={`p-3 rounded-2xl border space-y-2 ${subSurfaceBg}`}>
                  <p className="text-xs font-semibold">1. Elige el tipo de compra</p>
                  {mode === 'store' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectOrderMode('delivery')}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Bike className="w-4 h-4" style={{ color: accentColor }} />
                        <span>Delivery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectOrderMode('pickup')}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Store className="w-4 h-4" style={{ color: accentColor }} />
                        <span>Recojo en local</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectOrderMode('salon')}
                        className="p-2.5 rounded-xl border border-zinc-700 hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <UtensilsCrossed className="w-4 h-4" style={{ color: accentColor }} />
                        <span>Comer en Salón</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectOrderMode('takeaway')}
                        className="p-2.5 rounded-xl border border-zinc-700 hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-4 h-4" style={{ color: accentColor }} />
                        <span>Para Llevar</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {checkoutStep === 'address' && (
                <div className={`p-3 rounded-2xl border space-y-2.5 ${subSurfaceBg}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      <span>2. Dirección de entrega</span>
                    </p>
                    <button
                      type="button"
                      disabled={isLocating}
                      onClick={handleDetectLocation}
                      className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      {isLocating ? (
                        <Loader2 className="w-3 h-3 animate-spin" style={{ color: accentColor }} />
                      ) : (
                        <LocateFixed className="w-3 h-3" style={{ color: accentColor }} />
                      )}
                      <span>{isLocating ? 'Ubicando...' : 'Usar mi ubicación'}</span>
                    </button>
                  </div>
                  {locationError && (
                    <p className="text-[11px] text-rose-500">{locationError}</p>
                  )}
                  <input
                    type="text"
                    value={addressDraft}
                    onChange={e => setAddressDraft(e.target.value)}
                    placeholder="Av. / Jr. / Calle y número *"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isLightTheme
                        ? 'bg-white border-zinc-200 text-zinc-900'
                        : 'bg-zinc-900 border-zinc-700 text-white'
                    }`}
                  />
                  <input
                    type="text"
                    value={referenceDraft}
                    onChange={e => setReferenceDraft(e.target.value)}
                    placeholder="Referencia (ej. portón negro, piso 2)"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isLightTheme
                        ? 'bg-white border-zinc-200 text-zinc-900'
                        : 'bg-zinc-900 border-zinc-700 text-white'
                    }`}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('type')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      disabled={!addressDraft.trim()}
                      onClick={() => {
                        setCheckoutStep('customer');
                        pushBotMessage('Anotado. Ahora confirma tus datos:');
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-40"
                      style={{ backgroundColor: accentColor }}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'customer' && (
                <div className={`p-3 rounded-2xl border space-y-2.5 ${subSurfaceBg}`}>
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>Tus datos</span>
                  </p>
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    placeholder="Nombre completo *"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isLightTheme
                        ? 'bg-white border-zinc-200 text-zinc-900'
                        : 'bg-zinc-900 border-zinc-700 text-white'
                    }`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={phoneDraft}
                      onChange={e => setPhoneDraft(e.target.value)}
                      placeholder={mode === 'kiosk' ? 'Celular (opcional)' : 'WhatsApp *'}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isLightTheme
                          ? 'bg-white border-zinc-200 text-zinc-900'
                          : 'bg-zinc-900 border-zinc-700 text-white'
                      }`}
                    />
                    <input
                      type="text"
                      value={dniDraft}
                      onChange={e => setDniDraft(e.target.value)}
                      placeholder="DNI (opcional)"
                      maxLength={8}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isLightTheme
                          ? 'bg-white border-zinc-200 text-zinc-900'
                          : 'bg-zinc-900 border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep(orderMode === 'delivery' ? 'address' : 'type')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      disabled={!nameDraft.trim() || (mode === 'store' && !phoneDraft.trim())}
                      onClick={() => {
                        setCheckoutStep('payment');
                        pushBotMessage('¿Con qué método deseas pagar?');
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-40"
                      style={{ backgroundColor: accentColor }}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'payment' && (
                <div className={`p-3 rounded-2xl border space-y-2.5 ${subSurfaceBg}`}>
                  <p className="text-xs font-semibold">Método de pago</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {mode === 'store' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPaymentDraft('yape_plin')}
                          className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                            paymentDraft === 'yape_plin'
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-500" />
                            Yape / Plin
                          </span>
                          {paymentDraft === 'yape_plin' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentDraft('culqi')}
                          className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                            paymentDraft === 'culqi'
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-sky-500" />
                            Tarjeta / Culqi Online
                          </span>
                          {paymentDraft === 'culqi' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentDraft('efectivo')}
                          className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                            paymentDraft === 'efectivo'
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-amber-500" />
                            Efectivo contraentrega
                          </span>
                          {paymentDraft === 'efectivo' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPaymentDraft('culqi')}
                        className="p-2.5 rounded-xl border border-emerald-500 bg-emerald-500/10 text-xs font-medium flex items-center justify-between"
                      >
                        <span className="inline-flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-500" />
                          Tarjeta o Yape QR (Culqi)
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </button>
                    )}
                  </div>

                  {onValidateCoupon && (
                    <div className="pt-1 space-y-1">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={e => setCouponInput(e.target.value)}
                          placeholder="Cupón de descuento (opcional)"
                          className={`flex-1 px-3 py-1.5 rounded-xl border text-xs uppercase ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900'
                              : 'bg-zinc-900 border-zinc-700 text-white'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-medium"
                        >
                          Aplicar
                        </button>
                      </div>
                      {couponError && <p className="text-[11px] text-rose-500">{couponError}</p>}
                      {appliedCoupon && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          Cupón {appliedCoupon.code}: -S/ {appliedCoupon.discount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('customer')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('confirm')}
                      className="px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold"
                      style={{ backgroundColor: accentColor }}
                    >
                      Ver resumen
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'confirm' && (
                <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${subSurfaceBg}`}>
                  <p className="font-semibold text-sm">Resumen de tu pedido</p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {cartItems.map(item => (
                      <div key={item.itemId} className="flex justify-between gap-2">
                        <span className="truncate">
                          {item.quantity}× {item.productName}
                          {item.size ? ` (${item.size.name})` : ''}
                        </span>
                        <span className="font-medium tabular-nums shrink-0">
                          S/ {item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className={mutedText}>Modalidad</span>
                      <span className="font-medium capitalize">{orderMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={mutedText}>Pago</span>
                      <span className="font-medium">{paymentDraft.replace('_', ' / ')}</span>
                    </div>
                    {effectiveDeliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className={mutedText}>Delivery</span>
                        <span className="tabular-nums">S/ {effectiveDeliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    {effectiveDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Descuento</span>
                        <span className="tabular-nums">- S/ {effectiveDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold pt-1">
                      <span>Total a pagar</span>
                      <span className="tabular-nums">S/ {finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('payment')}
                      className="px-3 py-2 rounded-xl text-xs font-medium border border-zinc-300 dark:border-zinc-700 whitespace-nowrap shrink-0"
                    >
                      Cambiar pago
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmPurchase}
                      className="px-4 py-2 rounded-xl text-white text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
                      style={{ backgroundColor: accentColor }}
                    >
                      {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
                    </button>
                  </div>
                </div>
              )}

              <div ref={listEndRef} />
            </div>

            {/* Input Bar */}
            <div className={`p-3 border-t space-y-2 ${subSurfaceBg}`}>
              {checkoutStep !== 'idle' && (
                <button
                  type="button"
                  onClick={() => setCheckoutStep('idle')}
                  className={`text-[11px] inline-flex items-center gap-1 ${mutedText} hover:underline`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Volver al chat de productos</span>
                </button>
              )}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={isListening ? 'Escuchando tu pedido...' : 'Ej: Pizza para 4 personas, promos, S/ 35...'}
                  className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                    isLightTheme
                      ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                      : 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
                  }`}
                />
                {supportsVoice && (
                  <button
                    type="button"
                    aria-label="Dictar pedido por voz"
                    onClick={handleToggleVoice}
                    className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                      isListening
                        ? 'text-white border-transparent'
                        : isLightTheme
                        ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                    }`}
                    style={isListening ? { backgroundColor: accentColor } : undefined}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Enviar mensaje"
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl text-white disabled:opacity-40 transition-opacity shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
