import React, { useState, useEffect, useRef, useId, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Product, PaymentMethod, InvoiceDocumentType, OrderItem } from '../../types/catalog';
import {
  BuilderViewport,
  StoreBlock,
  isBlockVisibleOnViewport,
  getOptimalContrastHex,
  toProductSlug,
} from '../../types/storeBuilder';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { useStoreBuilder } from '../../context/StoreBuilderContext';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { useBenefits } from '../../context/BenefitsContext';
import {
  calculateDynamicDeliveryFee,
  isRealCulqiPublicKey,
  openOfficialCulqiCheckout,
} from '../../utils/culqiCheckout';
import { ToastContainer } from '../common/ToastContainer';
import { SystemNoticeModal } from '../common/SystemNoticeModal';
import {
  StoreSliderWidget,
  StoreCategoriesWidget,
  StoreProductGridWidget,
  StoreSearchBarWidget,
  StorePromoStripWidget,
} from './StorefrontWidgets';
import { StoreProductDetailPage } from './StoreProductDetailPage';
import { StoreCustomerProfileDrawer } from './StoreCustomerProfileDrawer';
import { StoreCustomerOrdersDrawer } from './StoreCustomerOrdersDrawer';
import { StoreSearchDrawer } from './StoreSearchDrawer';
import { StoreAccountMenu } from './StoreAccountMenu';
import { StoreBenefitsDrawer } from './StoreBenefitsDrawer';
import { StoreCulqiSandboxDialog } from './StoreCulqiSandboxDialog';
import { ElementorBuilderSidebar } from './ElementorBuilderSidebar';
import { StorefrontFooter } from './StorefrontFooter';
import {
  ShoppingBag,
  Search,
  MapPin,
  Sparkles,
  Flame,
  Trash2,
  Shield,
  ArrowRight,
  CheckCircle2,
  Phone,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Tablet,
  Monitor,
  X,
  Paintbrush,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Edit3,
  Store,
  ChevronDown,
  Bike,
  PackageCheck,
  LocateFixed,
  Receipt,
  Star,
  Ticket,
  Gift,
  Plus,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface StorefrontViewProps {
  onNavigateToAdmin: () => void;
}

interface PersistedOrderPrefs {
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress: string;
  lat?: number;
  lng?: number;
}

const ORDER_PREFS_KEY = 'kh_store_order_prefs_v1';

function loadOrderPrefs(): PersistedOrderPrefs {
  if (typeof window === 'undefined') {
    return { deliveryType: 'delivery', deliveryAddress: '' };
  }
  try {
    const raw = localStorage.getItem(ORDER_PREFS_KEY);
    if (!raw) return { deliveryType: 'delivery', deliveryAddress: '' };
    const parsed = JSON.parse(raw);
    return {
      deliveryType: parsed.deliveryType === 'pickup' ? 'pickup' : 'delivery',
      deliveryAddress: typeof parsed.deliveryAddress === 'string' ? parsed.deliveryAddress : '',
      lat: typeof parsed.lat === 'number' ? parsed.lat : undefined,
      lng: typeof parsed.lng === 'number' ? parsed.lng : undefined,
    };
  } catch {
    return { deliveryType: 'delivery', deliveryAddress: '' };
  }
}

function detectWindowViewport(): BuilderViewport {
  if (typeof window === 'undefined') return 'desktop';
  if (window.innerWidth < 640) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
}

function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/producto\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({ onNavigateToAdmin }) => {
  const {
    products,
    orders,
    cartItems,
    addToCart,
    removeFromCart,
    updateCartItemQty,
    clearCart,
    cartSubtotal,
    createOrder,
  } = useOrderCatalog();

  const {
    tenants,
    activeTenant,
    switchTenant,
    companyInfo,
    customization,
    isAuthenticated,
    dispatchToast,
    openNoticeModal,
  } = useSettings();

  const {
    templates,
    activeTemplate,
    selectTemplate,
    isBuilderOpen,
    setIsBuilderOpen,
    previewViewport,
    setPreviewViewport,
    selectedBlockId,
    setSelectedBlockId,
    moveBlock,
    duplicateBlock,
    removeBlock,
  } = useStoreBuilder();

  const {
    currentCustomer,
    customerOrders,
    activeCustomerOrdersCount,
    recordStoreOrder,
    awardCustomerPoints,
    redeemCustomerPoints,
  } = useStoreCustomer();

  const {
    pointsConfig,
    rewards,
    validateCoupon,
    registerCouponUsage,
    calculateRewardDiscount,
    registerRewardRedemption,
  } = useBenefits();

  const [windowViewport, setWindowViewport] = useState<BuilderViewport>(detectWindowViewport);

  useEffect(() => {
    const onResize = () => setWindowViewport(detectWindowViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const effectiveViewport: BuilderViewport = isBuilderOpen ? previewViewport : windowViewport;
  const isLightTheme = activeTemplate.themeMode === 'light';
  const accentColor = activeTemplate.accentColor || '#f59e0b';
  const buttonColor = activeTemplate.buttonColor || accentColor;
  const buttonTextColor =
    activeTemplate.buttonTextColor || getOptimalContrastHex(buttonColor);
  const autoButtonContrast = Boolean(activeTemplate.autoButtonContrast);

  // Synchronize documentElement 'dark' class with active storefront template theme
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    if (isLightTheme) {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    return () => {
      root.classList.toggle('dark', wasDark);
    };
  }, [isLightTheme]);

  const storeThemeVars = useMemo(
    () =>
      ({
        '--store-btn-bg': buttonColor,
        '--store-btn-fg': buttonTextColor,
      }) as React.CSSProperties,
    [buttonColor, buttonTextColor]
  );

  // Order Mode, Branch & Real-Time Geolocation State
  const initialPrefs = useMemo(() => loadOrderPrefs(), []);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(
    initialPrefs.deliveryType
  );
  const [deliveryAddress, setDeliveryAddress] = useState<string>(initialPrefs.deliveryAddress);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() =>
    initialPrefs.lat !== undefined && initialPrefs.lng !== undefined
      ? { lat: initialPrefs.lat, lng: initialPrefs.lng }
      : null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isBranchSheetOpen, setIsBranchSheetOpen] = useState(false);
  const geoWatchIdRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const toSave: PersistedOrderPrefs = {
        deliveryType,
        deliveryAddress,
        lat: userCoords?.lat,
        lng: userCoords?.lng,
      };
      localStorage.setItem(ORDER_PREFS_KEY, JSON.stringify(toSave));
    } catch {
      // Ignore storage quota errors
    }
  }, [deliveryType, deliveryAddress, userCoords]);

  useEffect(() => {
    return () => {
      if (geoWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, []);

  // Compute distances to all branches in Multisucursales
  const branchesWithDistance = useMemo(() => {
    const mapped = tenants.map(t => {
      const bLat = t.operations?.latitude;
      const bLng = t.operations?.longitude;
      const distanceKm =
        userCoords && typeof bLat === 'number' && typeof bLng === 'number'
          ? calculateHaversineKm(userCoords.lat, userCoords.lng, bLat, bLng)
          : null;
      return { tenant: t, distanceKm };
    });

    if (userCoords) {
      mapped.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }
    return mapped;
  }, [tenants, userCoords]);

  const nearestBranchId = useMemo(() => {
    if (!userCoords || branchesWithDistance.length === 0) return null;
    const openCandidate = branchesWithDistance.find(b => b.tenant.status !== 'closed');
    return (openCandidate || branchesWithDistance[0])?.tenant.id || null;
  }, [branchesWithDistance, userCoords]);

  const requestRealtimeLocation = useCallback(
    (autoSwitchNearest = true) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        dispatchToast(
          'Ubicación no disponible',
          'Tu navegador no permite geolocalización en este dispositivo.',
          'warning'
        );
        return;
      }

      setIsLocating(true);

      const handlePosition = async (pos: GeolocationPosition, isInitialFix: boolean) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });

        if (isInitialFix) {
          setIsLocating(false);

          // Find nearest branch from Multisucursales
          let bestTenant = activeTenant;
          let bestDist = Infinity;
          tenants.forEach(t => {
            if (t.status === 'closed') return;
            const bLat = t.operations?.latitude;
            const bLng = t.operations?.longitude;
            if (typeof bLat === 'number' && typeof bLng === 'number') {
              const dist = calculateHaversineKm(lat, lng, bLat, bLng);
              if (dist < bestDist) {
                bestDist = dist;
                bestTenant = t;
              }
            }
          });

          if (autoSwitchNearest && bestTenant.id !== activeTenant.id) {
            switchTenant(bestTenant.id);
          }

          // Reverse-geocode human-readable street address
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`
            );
            if (res.ok) {
              const data = await res.json();
              const road = data?.address?.road || data?.address?.pedestrian || '';
              const houseNumber = data?.address?.house_number || '';
              const suburb =
                data?.address?.suburb ||
                data?.address?.city_district ||
                data?.address?.city ||
                '';
              const formatted = [
                [road, houseNumber].filter(Boolean).join(' '),
                suburb,
              ]
                .filter(Boolean)
                .join(', ');
              setDeliveryAddress(
                formatted || data?.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              );
            } else {
              setDeliveryAddress(prev => prev || `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
          } catch {
            setDeliveryAddress(prev => prev || `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }

          dispatchToast(
            'Ubicación en Tiempo Real Activa',
            Number.isFinite(bestDist)
              ? `Sucursal más cercana asignada: ${bestTenant.name} (${bestDist.toFixed(1)} km).`
              : `Coordenadas sincronizadas correctamente.`,
            'success'
          );
        }
      };

      navigator.geolocation.getCurrentPosition(
        pos => {
          void handlePosition(pos, true);

          if (geoWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(geoWatchIdRef.current);
          }
          geoWatchIdRef.current = navigator.geolocation.watchPosition(
            livePos => {
              setUserCoords({
                lat: livePos.coords.latitude,
                lng: livePos.coords.longitude,
              });
            },
            () => {
              // Silent watch fallback
            },
            { enableHighAccuracy: true, maximumAge: 15000 }
          );
        },
        () => {
          setIsLocating(false);
          dispatchToast(
            'Permiso de Ubicación Requerido',
            'Activa el acceso al GPS en tu navegador para detectar tu dirección y la tienda más cercana.',
            'warning'
          );
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    },
    [activeTenant, dispatchToast, switchTenant, tenants]
  );

  // Slug Routing for Dedicated Product Detail Page (/producto/<slug>)
  const [activeProductSlug, setActiveProductSlug] = useState<string | null>(() =>
    typeof window !== 'undefined' ? parseSlugFromPath(window.location.pathname) : null
  );
  const catalogHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const onPopState = () => {
      setActiveProductSlug(parseSlugFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const activeSlugProduct = useMemo(() => {
    if (!activeProductSlug) return null;
    return (
      products.find(
        p => toProductSlug(p.name, p.id) === activeProductSlug || p.id === activeProductSlug
      ) || null
    );
  }, [activeProductSlug, products]);

  const navigateToProductSlug = useCallback(
    (product: Product, sourceImg?: HTMLImageElement | null) => {
      const slug = toProductSlug(product.name, product.id);
      const nextUrl = `/producto/${encodeURIComponent(slug)}`;

      if (sourceImg) {
        sourceImg.style.viewTransitionName = 'store-product-hero';
      }

      const applyRoute = () => {
        window.history.pushState({}, '', nextUrl);
        flushSync(() => {
          setActiveProductSlug(slug);
        });
      };

      const docWithVT = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };

      if (typeof docWithVT.startViewTransition === 'function') {
        const transition = docWithVT.startViewTransition(applyRoute);
        transition.finished.finally(() => {
          if (sourceImg) sourceImg.style.viewTransitionName = '';
        });
      } else {
        applyRoute();
        if (sourceImg) sourceImg.style.viewTransitionName = '';
      }
    },
    []
  );

  const navigateBackToCatalog = useCallback(() => {
    const applyBack = () => {
      window.history.pushState({}, '', '/');
      flushSync(() => {
        setActiveProductSlug(null);
      });
    };

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (typeof docWithVT.startViewTransition === 'function') {
      const transition = docWithVT.startViewTransition(applyBack);
      transition.finished.finally(() => {
        catalogHeadingRef.current?.focus({ preventScroll: true });
      });
    } else {
      applyBack();
      catalogHeadingRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // Catalog, Quick View, Off-Canvas / Bottom-Sheet Drawers State
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
    pointsEarned?: number;
    culqiReference?: string;
  } | null>(null);

  // Most recent active order for the customer on this device/account (live synced via SSE + BroadcastChannel)
  const latestActiveCustomerOrder = useMemo(
    () =>
      customerOrders.find(
        o =>
          o.status === 'recibido' ||
          o.status === 'en_cocina' ||
          o.status === 'en_horno' ||
          o.status === 'listo' ||
          o.status === 'en_ruta'
      ) || null,
    [customerOrders]
  );

  const liveConfirmedOrder = useMemo(
    () => (orderConfirmed ? orders.find(o => o.id === orderConfirmed.orderId) || null : null),
    [orderConfirmed, orders]
  );
  const [isCulqiSandboxOpen, setIsCulqiSandboxOpen] = useState(false);

  // Order-confirmed modal keyboard support: Enter → follow order live, Esc → keep shopping
  useEffect(() => {
    if (!orderConfirmed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.repeat) return;
      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        // Let a focused "Seguir Comprando" button act on its own native click
        if (active?.dataset.action === 'dismiss-confirmation') return;
        e.preventDefault();
        e.stopPropagation();
        const targetId = orderConfirmed.orderId;
        setOrderConfirmed(null);
        setFocusedOrderId(targetId);
        setIsOrdersOpen(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOrderConfirmed(null);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [orderConfirmed]);

  // Native <dialog> refs for QuickView, Responsive Cart, Branch/Location, and Checkout
  const quickViewDialogRef = useRef<HTMLDialogElement>(null);
  const cartDialogRef = useRef<HTMLDialogElement>(null);
  const branchDialogRef = useRef<HTMLDialogElement>(null);
  const checkoutDialogRef = useRef<HTMLDialogElement>(null);

  const quickViewTitleId = useId();
  const cartTitleId = useId();
  const branchTitleId = useId();
  const checkoutTitleId = useId();

  useEffect(() => {
    const dialog = quickViewDialogRef.current;
    if (!dialog) return;
    if (quickViewProduct) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [quickViewProduct]);

  useEffect(() => {
    const dialog = cartDialogRef.current;
    if (!dialog) return;
    if (isCartOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isCartOpen]);

  useEffect(() => {
    const dialog = branchDialogRef.current;
    if (!dialog) return;
    if (isBranchSheetOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isBranchSheetOpen]);

  useEffect(() => {
    const dialog = checkoutDialogRef.current;
    if (!dialog) return;
    if (isCheckoutModalOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isCheckoutModalOpen]);

  // Checkout customer, invoice, schedule, coupon, reward & Culqi fields
  const culqiEnabled = companyInfo.culqiConfig?.enabled ?? true;
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    culqiEnabled ? 'culqi' : 'efectivo'
  );
  const [selectedRecurringId, setSelectedRecurringId] = useState<string | null>(null);

  // SUNAT Invoice state
  const [invoiceType, setInvoiceType] = useState<InvoiceDocumentType>('boleta_simple');
  const [invoiceDocument, setInvoiceDocument] = useState('');
  const [invoiceBusinessName, setInvoiceBusinessName] = useState('');
  const [invoiceFiscalAddress, setInvoiceFiscalAddress] = useState('');

  // Scheduled delivery timing
  const [scheduleMode, setScheduleMode] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledTime, setScheduledTime] = useState('19:30');

  // Coupons & Points Reward Redemption state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentCustomer) {
      setSelectedRecurringId(null);
      setSelectedRewardId(null);
      return;
    }
    setCustomerName(currentCustomer.fullName);
    setCustomerPhone(currentCustomer.phone);
    if (currentCustomer.dni) {
      setInvoiceDocument(prev => prev || currentCustomer.dni);
    }

    const defAddr =
      currentCustomer.addresses.find(a => a.isDefault) || currentCustomer.addresses[0];
    if (defAddr) {
      setDeliveryAddress(prev => prev || defAddr.streetAddress);
      setDeliveryReference(prev => prev || defAddr.reference);
    }

    const defPay =
      currentCustomer.paymentMethods.find(p => p.isDefault) || currentCustomer.paymentMethods[0];
    if (defPay && !culqiEnabled) {
      setSelectedRecurringId(defPay.id);
      setPaymentMethod(defPay.type);
    }
  }, [culqiEnabled, currentCustomer]);

  const totalCartUnits = useMemo(
    () => cartItems.reduce((acc, i) => acc + i.quantity, 0),
    [cartItems]
  );

  // Active branch real-time distance & dynamic delivery fee by km bracket
  const activeBranchDistanceKm = useMemo(
    () => branchesWithDistance.find(b => b.tenant.id === activeTenant.id)?.distanceKm ?? null,
    [activeTenant.id, branchesWithDistance]
  );

  const dynamicDelivery = useMemo(
    () =>
      calculateDynamicDeliveryFee({
        orderMode: deliveryType,
        distanceKm: activeBranchDistanceKm,
        branchMaxRadiusKm: activeTenant.operations?.deliveryRadiusKm || 6,
        cartSubtotal,
        tariff: companyInfo.deliveryTariff,
      }),
    [
      activeBranchDistanceKm,
      activeTenant.operations?.deliveryRadiusKm,
      cartSubtotal,
      companyInfo.deliveryTariff,
      deliveryType,
    ]
  );

  // Validate applied coupon dynamically against current subtotal
  const activeCouponEval = useMemo(() => {
    if (!appliedCouponCode) return null;
    const res = validateCoupon(appliedCouponCode, cartSubtotal);
    return res.valid ? res : null;
  }, [appliedCouponCode, cartSubtotal, validateCoupon]);

  const selectedRewardObj = useMemo(() => {
    if (!selectedRewardId || !currentCustomer) return null;
    const found = rewards.find(r => r.id === selectedRewardId && r.isActive);
    if (!found || (currentCustomer.points || 0) < found.pointsCost) return null;
    return found;
  }, [currentCustomer, rewards, selectedRewardId]);

  const couponDiscountSoles = activeCouponEval ? activeCouponEval.discountAmount : 0;
  const rewardDiscountSoles = selectedRewardObj
    ? calculateRewardDiscount(selectedRewardObj, Math.max(0, cartSubtotal - couponDiscountSoles))
    : 0;
  const totalDiscountSoles = Number(
    Math.min(cartSubtotal, couponDiscountSoles + rewardDiscountSoles).toFixed(2)
  );

  const resolvedDeliveryFee = deliveryType === 'delivery' ? dynamicDelivery.feeSoles : 0;
  const resolvedPayableTotal = Math.max(
    0,
    Number((cartSubtotal - totalDiscountSoles + resolvedDeliveryFee).toFixed(2))
  );

  // 1-Tap Cart Upselling Suggestions (Complementary items not yet in cart)
  const upsellSuggestions = useMemo(() => {
    const inCartProductIds = new Set(cartItems.map(i => i.productId));
    return products
      .filter(
        p =>
          p.isAvailable &&
          !inCartProductIds.has(p.id) &&
          (p.category === 'bebidas' || p.category === 'entradas' || p.category === 'postres')
      )
      .slice(0, 4);
  }, [cartItems, products]);

  const handleQuickAddUpsell = (prod: Product) => {
    const defaultSize = prod.hasSizes
      ? prod.sizes.find(s => s.isDefault && s.enabled) || prod.sizes.find(s => s.enabled)
      : undefined;
    const unitPrice = defaultSize ? defaultSize.price : prod.basePrice;
    const quickItem: OrderItem = {
      itemId: `upsell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      productImage: prod.imageUrl,
      size: defaultSize
        ? {
            id: defaultSize.id,
            name: defaultSize.name,
            slices: defaultSize.slices,
            price: defaultSize.price,
          }
        : undefined,
      subOptions: [],
      extras: [],
      unitPrice,
      quantity: 1,
      totalPrice: unitPrice,
    };
    addToCart(quickItem);
    dispatchToast('¡Sumado al pedido!', `Se agregó ${prod.name} a tu bolsa.`, 'success');
  };

  const handleApplyCouponCode = () => {
    setCouponError(null);
    const res = validateCoupon(couponInput, cartSubtotal);
    if (!res.valid || !res.coupon) {
      setCouponError(res.error || 'Cupón no válido.');
      return;
    }
    setAppliedCouponCode(res.coupon.code);
    setCouponInput(res.coupon.code);
    dispatchToast(
      '¡Cupón Aplicado!',
      `Ahorras S/ ${res.discountAmount.toFixed(2)} con el código ${res.coupon.code}.`,
      'success'
    );
  };

  const finalizeOrderCreation = (opts?: { culqiReference?: string; forcePaid?: boolean }) => {
    const chosenRecurring = currentCustomer?.paymentMethods.find(
      pm => pm.id === selectedRecurringId
    );
    const isAutoPaid =
      Boolean(opts?.forcePaid) ||
      paymentMethod === 'culqi' ||
      paymentMethod === 'yape_plin' ||
      Boolean(chosenRecurring && chosenRecurring.type === 'tarjeta');

    const willEarnPoints =
      Boolean(currentCustomer) &&
      pointsConfig.enabled &&
      cartSubtotal >= pointsConfig.minPurchaseAmountForPoint
        ? pointsConfig.pointsPerPurchase
        : 0;

    const newOrder = createOrder({
      channel: 'online',
      tenantId: activeTenant.id,
      customerId: currentCustomer?.crmCustomerId,
      customerDni:
        invoiceType === 'boleta_dni' && invoiceDocument.trim()
          ? invoiceDocument.trim()
          : currentCustomer?.dni || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: currentCustomer?.email || undefined,
      deliveryAddress:
        deliveryType === 'delivery'
          ? deliveryAddress.trim()
          : `Para Llevar — Recojo en ${activeTenant.name}`,
      deliveryReference:
        deliveryType === 'delivery' && deliveryReference.trim()
          ? deliveryReference.trim()
          : undefined,
      deliveryDistanceKm:
        deliveryType === 'delivery' && activeBranchDistanceKm !== null
          ? Number(activeBranchDistanceKm.toFixed(2))
          : undefined,
      paymentMethod,
      paymentStatus: isAutoPaid ? 'pagado' : 'pendiente',
      culqiReference: opts?.culqiReference,
      invoiceType,
      invoiceDocument:
        invoiceType !== 'boleta_simple' && invoiceDocument.trim()
          ? invoiceDocument.trim()
          : undefined,
      invoiceBusinessName:
        invoiceType === 'factura_ruc' && invoiceBusinessName.trim()
          ? invoiceBusinessName.trim()
          : undefined,
      invoiceFiscalAddress:
        invoiceType === 'factura_ruc' && invoiceFiscalAddress.trim()
          ? invoiceFiscalAddress.trim()
          : undefined,
      couponCode: activeCouponEval?.coupon?.code,
      rewardRedeemedTitle: selectedRewardObj?.title,
      pointsEarned: willEarnPoints > 0 ? willEarnPoints : undefined,
      scheduledFor: scheduleMode === 'scheduled' ? scheduledTime : undefined,
      items: cartItems,
      subtotal: cartSubtotal,
      deliveryFee: resolvedDeliveryFee,
      discount: totalDiscountSoles,
      total: resolvedPayableTotal,
      estimatedMinutes: deliveryType === 'delivery' ? 35 : 20,
    });

    recordStoreOrder(newOrder.id);

    if (activeCouponEval?.coupon) {
      registerCouponUsage(activeCouponEval.coupon.code);
    }

    if (selectedRewardObj && currentCustomer) {
      const redeemedOk = redeemCustomerPoints(
        selectedRewardObj.pointsCost,
        selectedRewardObj.title,
        newOrder.orderNumber
      );
      if (redeemedOk) {
        registerRewardRedemption({
          customerName: currentCustomer.fullName,
          customerPhone: currentCustomer.phone,
          rewardId: selectedRewardObj.id,
          rewardTitle: selectedRewardObj.title,
          pointsSpent: selectedRewardObj.pointsCost,
          orderNumber: newOrder.orderNumber,
        });
      }
    }

    if (willEarnPoints > 0) {
      awardCustomerPoints(
        willEarnPoints,
        `Compra Web ${newOrder.orderNumber}`,
        newOrder.orderNumber
      );
    }

    setAppliedCouponCode(null);
    setCouponInput('');
    setSelectedRewardId(null);

    setOrderConfirmed({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      total: newOrder.total,
      pointsEarned: willEarnPoints > 0 ? willEarnPoints : undefined,
      culqiReference: opts?.culqiReference,
    });
    setIsCheckoutModalOpen(false);
    clearCart();
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      dispatchToast(
        'Datos Incompletos',
        'Por favor ingresa tu nombre y número de teléfono celular.',
        'warning'
      );
      return;
    }

    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      dispatchToast(
        'Dirección Requerida',
        'Indica tu dirección de entrega o usa el botón de geolocalización.',
        'warning'
      );
      return;
    }

    if (deliveryType === 'delivery' && dynamicDelivery.isOutOfRange) {
      openNoticeModal({
        title: 'Dirección fuera del radio de entrega',
        message: `Tu ubicación está a ${activeBranchDistanceKm?.toFixed(1)} km y el límite de ${activeTenant.name.replace('Khalessi Pizza - ', '')} es ${activeTenant.operations?.deliveryRadiusKm || 6} km. Cambia a la sede más cercana o elige Para Llevar.`,
        tone: 'warning',
        confirmLabel: 'Elegir Sede / Recojo',
        cancelLabel: 'Cerrar',
        onConfirm: () => {
          setIsCheckoutModalOpen(false);
          setIsBranchSheetOpen(true);
        },
      });
      return;
    }

    if (invoiceType === 'boleta_dni' && invoiceDocument.replace(/\D/g, '').length !== 8) {
      dispatchToast('DNI Inválido', 'Ingresa un número de DNI válido de 8 dígitos.', 'warning');
      return;
    }

    if (
      invoiceType === 'factura_ruc' &&
      (invoiceDocument.replace(/\D/g, '').length !== 11 || !invoiceBusinessName.trim())
    ) {
      dispatchToast(
        'Datos de Factura Requeridos',
        'Ingresa un RUC válido de 11 dígitos y la Razón Social.',
        'warning'
      );
      return;
    }

    // Culqi Checkout v4 Flow (Official SDK when real pk_ key, Sandbox Dialog when demo key)
    if (paymentMethod === 'culqi' && resolvedPayableTotal > 0) {
      const culqiCfg = companyInfo.culqiConfig;
      if (culqiCfg && isRealCulqiPublicKey(culqiCfg.publicKey)) {
        const res = await openOfficialCulqiCheckout({
          config: culqiCfg,
          storeTitle: companyInfo.commercialName || customization.appName,
          amountSoles: resolvedPayableTotal,
          accentColor: buttonColor,
          logoUrl: customization.storeHeaderLogo || customization.logoDark,
        });
        if (!res.ok) {
          dispatchToast(
            'Pago no completado',
            res.errorMessage || 'La operación en Culqi fue cancelada.',
            'warning'
          );
          return;
        }
        finalizeOrderCreation({ culqiReference: res.referenceId, forcePaid: true });
        return;
      }

      // Open solid-UI Culqi Sandbox Dialog
      setIsCulqiSandboxOpen(true);
      return;
    }

    finalizeOrderCreation();
  };

  const renderBlockContent = (block: StoreBlock) => {
    switch (block.type) {
      case 'slider':
        return (
          <StoreSliderWidget
            block={block}
            viewport={effectiveViewport}
            isLightTheme={isLightTheme}
            accentColor={accentColor}
            autoButtonContrast={autoButtonContrast}
            products={products}
            onSelectProduct={prod => navigateToProductSlug(prod)}
          />
        );
      case 'categories':
        return (
          <StoreCategoriesWidget
            block={block}
            viewport={effectiveViewport}
            isLightTheme={isLightTheme}
            accentColor={accentColor}
            autoButtonContrast={autoButtonContrast}
            products={products}
            activeCategory={activeCategory}
            onSelectCategory={catId => setActiveCategory(catId)}
          />
        );
      case 'product_grid':
        return (
          <StoreProductGridWidget
            block={block}
            viewport={effectiveViewport}
            isLightTheme={isLightTheme}
            accentColor={accentColor}
            autoButtonContrast={autoButtonContrast}
            products={products}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            onSelectProduct={(prod, imgEl) => navigateToProductSlug(prod, imgEl)}
            onQuickViewProduct={prod => setQuickViewProduct(prod)}
          />
        );
      case 'search_bar':
        return (
          <StoreSearchBarWidget
            block={block}
            isLightTheme={isLightTheme}
            searchQuery={searchQuery}
            onChangeSearch={q => setSearchQuery(q)}
          />
        );
      case 'promo_strip':
        return (
          <StorePromoStripWidget
            block={block}
            products={products}
            autoButtonContrast={autoButtonContrast}
            onSelectProduct={prod => navigateToProductSlug(prod)}
          />
        );
    }
  };

  const blockTypeLabel: Record<StoreBlock['type'], string> = {
    slider: 'Slider',
    categories: 'Categorías',
    product_grid: 'Parrilla de Productos',
    search_bar: 'Buscador',
    promo_strip: 'Cinta Promo',
  };

  const headerLogoUrl = customization.storeHeaderLogo?.trim() || '';

  const storeSurfaceContent =
    activeSlugProduct && !isBuilderOpen ? (
      <StoreProductDetailPage
        product={activeSlugProduct}
        isLightTheme={isLightTheme}
        accentColor={accentColor}
        buttonColor={buttonColor}
        buttonTextColor={buttonTextColor}
        autoButtonContrast={autoButtonContrast}
        branchName={activeTenant.name}
        orderMode={deliveryType}
        cartCount={totalCartUnits}
        onBackToCatalog={navigateBackToCatalog}
        onOpenCart={() => setIsCartOpen(true)}
        onAddToCart={item => {
          addToCart(item);
          dispatchToast(
            'Agregado a tu Pedido',
            `${item.quantity}× ${item.productName} listo en tu carrito.`,
            'success'
          );
        }}
      />
    ) : (
      <div
        style={storeThemeVars}
        className={`min-h-dvh flex flex-col font-sans transition-colors ${
          isLightTheme
            ? 'bg-zinc-50 text-zinc-900 selection:bg-amber-500 selection:text-white'
            : 'bg-neutral-950 text-neutral-100 selection:bg-amber-500 selection:text-neutral-950'
        } ${!isBuilderOpen ? 'pb-24 lg:pb-0' : ''}`}
      >
        {/* 1. Responsive 3-Tier App Header (Mobile / Tablet / Desktop PC) */}
        <header
          className={`sticky top-0 z-30 border-b px-3.5 sm:px-6 lg:px-8 py-2 sm:py-2.5 transition-colors ${
            isLightTheme
              ? 'bg-white border-zinc-200 text-zinc-900 shadow-[0_1px_10px_rgba(0,0,0,0.03)]'
              : 'bg-neutral-950 border-neutral-800 text-neutral-100'
          }`}
        >
          {/* Screen-reader & ViewTransition focus anchor (no visible title clutter) */}
          <h1 ref={catalogHeadingRef} tabIndex={-1} className="sr-only">
            {companyInfo.commercialName || 'Tienda Virtual'}
          </h1>

          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2.5 sm:gap-3.5 lg:gap-5">
            {/* ZONE A (Left): Brand Logo + Spacious Smart Location & ETA Pill */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 lg:flex-initial">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('todos');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Ir al inicio de la carta"
                style={{ touchAction: 'manipulation' }}
                className="flex items-center shrink-0 active:scale-95 transition-transform focus:outline-none"
              >
                {headerLogoUrl ? (
                  <img
                    src={headerLogoUrl}
                    alt={companyInfo.commercialName || 'Logo'}
                    decoding="async"
                    className="h-8 sm:h-9 lg:h-10 w-auto max-w-[102px] sm:max-w-[132px] lg:max-w-[156px] object-contain"
                  />
                ) : (
                  <span
                    data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                    className="store-btn-solid w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-sm"
                  >
                    <Flame aria-hidden="true" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                )}
              </button>

              <span
                aria-hidden="true"
                className={`hidden sm:block h-7 w-px shrink-0 ${
                  isLightTheme ? 'bg-zinc-200' : 'bg-neutral-800'
                }`}
              />

              {/* Spacious Interactive Location & ETA Pill (never wraps ETA onto 2 lines) */}
              <button
                type="button"
                onClick={() => setIsBranchSheetOpen(true)}
                style={{ touchAction: 'manipulation' }}
                className={`min-h-[44px] flex-1 sm:flex-initial min-w-0 sm:max-w-[270px] lg:max-w-[290px] xl:max-w-[340px] flex flex-col justify-center text-left px-3 py-1 rounded-2xl border transition-colors ${
                  isLightTheme
                    ? 'bg-zinc-100/90 hover:bg-zinc-200/70 border-zinc-200/80'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800'
                }`}
              >
                <span
                  className={`text-[10px] font-bold leading-none flex items-center gap-1.5 whitespace-nowrap ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  {/* On mobile, show active mode badge inline; on tablet/PC, mode switch is beside it */}
                  <span className="md:hidden inline-flex items-center gap-1 font-extrabold">
                    {deliveryType === 'delivery' ? (
                      <>
                        <Bike aria-hidden="true" className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                        <span>Delivery</span>
                      </>
                    ) : (
                      <>
                        <Store aria-hidden="true" className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                        <span>Retiro</span>
                      </>
                    )}
                  </span>
                  <span className="hidden md:inline">
                    {deliveryType === 'delivery' ? 'Enviar a' : 'Recoger en'}
                  </span>
                  <span aria-hidden="true" className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold whitespace-nowrap">
                    {deliveryType === 'delivery' ? '25-35 min' : '15-20 min'}
                  </span>
                </span>

                <span className="mt-1 flex items-center gap-1 min-w-0">
                  <MapPin
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span
                    className={`text-xs sm:text-[13px] font-black truncate flex-1 ${
                      isLightTheme ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    {deliveryType === 'delivery' && deliveryAddress.trim()
                      ? deliveryAddress
                      : activeTenant.name.replace('Khalessi Pizza - ', '')}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="w-3.5 h-3.5 opacity-60 shrink-0"
                  />
                </span>
              </button>
            </div>

            {/* ZONE B (Center — Tablet & Desktop PC): Live Search Trigger (mode switcher now lives in the cart) */}
            <div className="hidden md:flex items-center justify-center gap-2.5 lg:gap-3 lg:flex-1 lg:max-w-xl min-w-0">

              {/* Wide Desktop Integrated Search Trigger (xl >= 1280px) */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={`hidden xl:flex items-center gap-2.5 flex-1 min-w-[190px] max-w-[320px] h-10 px-3.5 rounded-full border text-xs transition-colors text-left ${
                  isLightTheme
                    ? 'bg-zinc-100 hover:bg-zinc-200/70 border-zinc-200 text-zinc-500'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
                }`}
              >
                <Search aria-hidden="true" className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                <span className="truncate font-semibold">
                  {searchQuery.trim() ? `Buscando: "${searchQuery}"` : 'Buscar pizzas, bebidas...'}
                </span>
              </button>
            </div>

            {/* ZONE C (Right): Adaptive Actions per Form Factor */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Mobile (< 768px): Single Clean Search Circle (zero crowding) */}
              <button
                type="button"
                aria-label="Buscar productos en la carta"
                onClick={() => setIsSearchOpen(true)}
                style={{ touchAction: 'manipulation' }}
                className={`md:hidden h-10 w-10 min-w-[40px] rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                  isLightTheme
                    ? 'bg-zinc-100 border-zinc-200 text-zinc-700 active:bg-zinc-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-200 active:bg-neutral-800'
                }`}
              >
                <Search aria-hidden="true" className="w-4 h-4" />
              </button>

              {/* Tablet (768px - 1023px): Spacious Search Pill (bottom capsule handles nav) */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                style={{ touchAction: 'manipulation' }}
                className={`hidden md:inline-flex lg:hidden h-10 px-3.5 rounded-full border text-xs font-bold items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isLightTheme
                    ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200'
                }`}
              >
                <Search aria-hidden="true" className="w-4 h-4" />
                <span>Buscar</span>
              </button>

              {/* Laptop & Desktop PC (>= 1024px): Full WebApp Action Bar */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="Buscar productos"
                  onClick={() => setIsSearchOpen(true)}
                  className={`xl:hidden h-10 w-10 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                    isLightTheme
                      ? 'border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      : 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                  }`}
                >
                  <Search aria-hidden="true" className="w-4 h-4" />
                </button>

                <StoreAccountMenu
                  isLightTheme={isLightTheme}
                  accentColor={accentColor}
                  autoButtonContrast={autoButtonContrast}
                  customerFirstName={currentCustomer ? currentCustomer.fullName.split(' ')[0] : null}
                  customerFullName={currentCustomer ? currentCustomer.fullName : null}
                  activeOrdersCount={activeCustomerOrdersCount}
                  onOpenProfile={() => setIsProfileOpen(true)}
                  onOpenOrders={() => {
                    setFocusedOrderId(null);
                    setIsOrdersOpen(true);
                  }}
                  onOpenBenefits={() => setIsBenefitsOpen(true)}
                />

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid relative h-10 flex items-center gap-2 px-4 rounded-full font-black text-xs sm:text-sm shadow-sm active:scale-95 transition-transform whitespace-nowrap shrink-0"
                >
                  <ShoppingBag aria-hidden="true" className="w-4 h-4" />
                  <span>
                    {totalCartUnits > 0 && cartSubtotal > 0
                      ? `S/ ${resolvedPayableTotal.toFixed(2)}`
                      : 'Carrito'}
                  </span>
                  {totalCartUnits > 0 && (
                    <span className="bg-black/20 px-1.5 py-0.5 rounded-full text-[11px] font-black min-w-5 text-center">
                      {totalCartUnits}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 2. Dynamic Elementor Block Canvas + Live Order Tracker */}
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 sm:pt-5 pb-28 lg:pb-14 w-full space-y-4 flex-1">
          {/* Live Rappi-Style Order Status Pill (updates automatically without F5 reload) */}
          {!isBuilderOpen && latestActiveCustomerOrder && (() => {
            const isPickup =
              latestActiveCustomerOrder.channel === 'pos-takeaway' ||
              (latestActiveCustomerOrder.deliveryAddress || '').toLowerCase().includes('llevar') ||
              (latestActiveCustomerOrder.deliveryAddress || '').toLowerCase().includes('recojo');

            const stageMap = {
              recibido: { step: 1, total: isPickup ? 4 : 5, label: 'Pedido recibido en cocina', badge: 'Recibido' },
              en_cocina: { step: 2, total: isPickup ? 4 : 5, label: 'Preparando masa artesanal 👨‍🍳', badge: 'En Cocina' },
              en_horno: { step: 3, total: isPickup ? 4 : 5, label: 'Horneándose a la leña (430 °C) 🔥', badge: 'En Horno 🔥' },
              listo: {
                step: 4,
                total: isPickup ? 4 : 5,
                label: isPickup ? '¡Listo para recoger en tienda! ✅' : 'Listo y empacando para despacho ✅',
                badge: 'Listo ✅',
              },
              en_ruta: {
                step: 5,
                total: 5,
                label: latestActiveCustomerOrder.assignedDriverName
                  ? `En camino con ${latestActiveCustomerOrder.assignedDriverName} 🛵`
                  : 'Motorizado en camino a tu ubicación 🛵',
                badge: 'En Ruta 🛵',
              },
              entregado: { step: 5, total: 5, label: 'Pedido entregado', badge: 'Entregado' },
              cancelado: { step: 0, total: 5, label: 'Pedido cancelado', badge: 'Cancelado' },
            }[latestActiveCustomerOrder.status];

            const pct = Math.min(100, Math.round((stageMap.step / stageMap.total) * 100));

            return (
              <button
                type="button"
                onClick={() => {
                  setFocusedOrderId(latestActiveCustomerOrder.id);
                  setIsOrdersOpen(true);
                }}
                style={{ touchAction: 'manipulation' }}
                className={`w-full text-left p-3.5 sm:px-5 rounded-2xl border transition-all flex flex-col gap-2.5 shadow-sm active:scale-[0.99] ${
                  isLightTheme
                    ? 'bg-white border-zinc-200/90 hover:border-zinc-300 text-zinc-900'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span
                        className="relative inline-flex rounded-full h-2.5 w-2.5"
                        style={{ backgroundColor: accentColor }}
                      />
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-black block truncate">
                        {stageMap.label}
                      </span>
                      <span
                        className={`text-[11px] block truncate ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        Orden {latestActiveCustomerOrder.orderNumber} · En vivo sin recargar
                      </span>
                    </div>
                  </div>

                  <span
                    data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                    className="store-btn-solid px-3 py-1.5 rounded-full text-[11px] font-black inline-flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <span>Ver en vivo</span>
                    <ArrowRight aria-hidden="true" className="w-3 h-3" />
                  </span>
                </div>

                {/* Segmented Live Progress Bar */}
                <div
                  className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isLightTheme ? 'bg-zinc-100' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: accentColor }}
                  />
                </div>
              </button>
            );
          })()}
          {activeTemplate.blocks.map((block, idx) => {
            const visibleOnCurrentDevice = isBlockVisibleOnViewport(block, effectiveViewport);

            if (!isBuilderOpen && !visibleOnCurrentDevice) {
              return null;
            }

            const isSelected = isBuilderOpen && selectedBlockId === block.id;

            if (!isBuilderOpen) {
              return <React.Fragment key={block.id}>{renderBlockContent(block)}</React.Fragment>;
            }

            return (
              <div
                key={block.id}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedBlockId(block.id);
                }}
                className={`group/blk relative rounded-2xl transition-all ${
                  isSelected
                    ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-transparent'
                    : 'hover:ring-2 hover:ring-amber-400/70'
                } ${!visibleOnCurrentDevice ? 'opacity-45 grayscale-[30%]' : ''}`}
              >
                <div
                  className={`absolute -top-3 right-3 z-30 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold shadow-lg border transition-opacity ${
                    isSelected
                      ? 'opacity-100 bg-rose-600 border-rose-400 text-white'
                      : 'opacity-0 group-hover/blk:opacity-100 bg-[#12141d] border-[#2c3146] text-zinc-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedBlockId(block.id);
                    }}
                    className="flex items-center gap-1 pr-1.5 border-r border-white/20"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{blockTypeLabel[block.type]}</span>
                  </button>

                  {!visibleOnCurrentDevice && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-amber-300">
                      <EyeOff className="w-3 h-3" /> Oculto en {effectiveViewport}
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={e => {
                      e.stopPropagation();
                      moveBlock(block.id, -1);
                    }}
                    title="Subir bloque"
                    className="p-0.5 hover:text-amber-300 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === activeTemplate.blocks.length - 1}
                    onClick={e => {
                      e.stopPropagation();
                      moveBlock(block.id, 1);
                    }}
                    title="Bajar bloque"
                    className="p-0.5 hover:text-amber-300 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      duplicateBlock(block.id);
                    }}
                    title="Duplicar widget"
                    className="p-0.5 hover:text-amber-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      openNoticeModal({
                        title: '¿Eliminar este bloque?',
                        message: `Se quitará "${blockTypeLabel[block.type]}" de la plantilla actual.`,
                        tone: 'danger',
                        confirmLabel: 'Eliminar',
                        cancelLabel: 'Cancelar',
                        onConfirm: () => removeBlock(block.id),
                      });
                    }}
                    title="Eliminar widget"
                    className="p-0.5 hover:text-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {renderBlockContent(block)}
              </div>
            );
          })}
        </main>

        {/* 3. Solid Corporate & Fiscal Footer */}
        <StorefrontFooter footerTheme={activeTemplate.footerTheme} />
      </div>
    );

  return (
    <div style={storeThemeVars} className="min-h-dvh flex flex-col bg-[#0b0c10]">
      <ToastContainer />
      <SystemNoticeModal />

      {/* =====================================================================
          COMPACT ADMIN TOP BAR (Visible ONLY when Admin is authenticated)
          ===================================================================== */}
      {isAuthenticated && (
        <div className="sticky top-0 z-50 bg-[#0d0f17] border-b border-amber-500/30 text-zinc-100 px-3 sm:px-5 py-2 shadow-xl">
          <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Modo Admin</span>
              </span>

              <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Plantilla:</span>
                <select
                  aria-label="Cambiar plantilla activa"
                  value={activeTemplate.id}
                  onChange={e => selectTemplate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#171a26] border border-[#2a2f45] text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isBuilderOpen && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#161925] border border-[#272c40]">
                {(
                  [
                    ['desktop', 'PC', Monitor],
                    ['tablet', 'Tablet', Tablet],
                    ['mobile', 'Celular', Smartphone],
                  ] as const
                ).map(([vp, label, Icon]) => {
                  const active = previewViewport === vp;
                  return (
                    <button
                      key={vp}
                      type="button"
                      onClick={() => setPreviewViewport(vp)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !isBuilderOpen;
                  setIsBuilderOpen(next);
                  if (!next) setSelectedBlockId(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow whitespace-nowrap shrink-0 ${
                  isBuilderOpen
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {isBuilderOpen ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar y Ver Tienda</span>
                  </>
                ) : (
                  <>
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>Constructor Tienda</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="px-3 py-1.5 rounded-xl border border-[#2b3044] bg-[#161925] hover:bg-[#1f2334] text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Panel ERP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          BUILDER SPLIT WORKSPACE OR FULL LIVE STOREFRONT
          ===================================================================== */}
      {isBuilderOpen ? (
        <div className="flex-1 flex flex-col lg:flex-row h-[calc(100dvh-49px)] overflow-hidden">
          <ElementorBuilderSidebar />

          <div
            onClick={() => setSelectedBlockId(null)}
            className="flex-1 overflow-y-auto bg-[#090a0f] p-3 sm:p-6 flex justify-center items-start custom-scrollbar"
          >
            <div
              className={`w-full transition-all duration-300 overflow-hidden shadow-2xl ${
                previewViewport === 'mobile'
                  ? 'max-w-[395px] rounded-[32px] border-[6px] border-[#25293a]'
                  : previewViewport === 'tablet'
                  ? 'max-w-[780px] rounded-[24px] border-[4px] border-[#25293a]'
                  : 'max-w-full rounded-xl border border-[#222534]'
              }`}
            >
              {storeSurfaceContent}
            </div>
          </div>
        </div>
      ) : (
        storeSurfaceContent
      )}

      {/* =====================================================================
          1. BOTTOM-SHEET DIALOG: SUCURSAL, TIPO DE PEDIDO Y GEOLOCALIZACIÓN
          ===================================================================== */}
      <dialog
        ref={branchDialogRef}
        aria-labelledby={branchTitleId}
        onClose={e => {
          e.currentTarget.returnValue = '';
          setIsBranchSheetOpen(false);
        }}
        onClick={e => {
          if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
        }}
        className="store-bottom-sheet backdrop:bg-black/60 backdrop:backdrop-blur-xs bg-transparent p-0 w-full max-w-xl"
      >
        {isBranchSheetOpen && (
          <div
            className={`rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-colors ${
              isLightTheme
                ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            {/* App Drag Pill Handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <div
                className={`w-11 h-1.5 rounded-full ${
                  isLightTheme ? 'bg-zinc-300' : 'bg-neutral-700'
                }`}
              />
            </div>

            <div
              className={`px-5 py-3 border-b flex items-center justify-between ${
                isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5" style={{ color: accentColor }} />
                <h3
                  id={branchTitleId}
                  className={`font-black text-base ${isLightTheme ? 'text-zinc-900' : 'text-white'}`}
                >
                  Sucursal y Tipo de Pedido
                </h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar selector de sucursal"
                onClick={() => setIsBranchSheetOpen(false)}
                className={`p-2 rounded-full transition-colors ${
                  isLightTheme
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
              {/* Order Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  data-auto-contrast={
                    deliveryType === 'delivery' && autoButtonContrast ? 'true' : 'false'
                  }
                  className={`p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 ${
                    deliveryType === 'delivery'
                      ? 'store-btn-solid border-transparent shadow-sm'
                      : isLightTheme
                      ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>Delivery a Domicilio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  data-auto-contrast={
                    deliveryType === 'pickup' && autoButtonContrast ? 'true' : 'false'
                  }
                  className={`p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 ${
                    deliveryType === 'pickup'
                      ? 'store-btn-solid border-transparent shadow-sm'
                      : isLightTheme
                      ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Para Llevar / Recojo</span>
                </button>
              </div>

              {/* Real-Time Geolocation Box */}
              <div
                className={`p-4 rounded-3xl border space-y-3 shadow-xs ${
                  isLightTheme
                    ? 'bg-white border-zinc-200/90 text-zinc-900'
                    : 'bg-neutral-950 border-neutral-800 text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span
                      className={`block text-xs font-black ${
                        isLightTheme ? 'text-zinc-900' : 'text-white'
                      }`}
                    >
                      Ubicación en Tiempo Real
                    </span>
                    <span
                      className={`block text-[11px] ${
                        isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                      }`}
                    >
                      Detecta tu dirección y selecciona automáticamente el local más cercano.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestRealtimeLocation(true)}
                    disabled={isLocating}
                    data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                    className="store-btn-solid px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Detectando...' : 'Usar mi GPS'}</span>
                  </button>
                </div>

                {deliveryType === 'delivery' && (
                  <div>
                    <label
                      htmlFor="sheet-delivery-addr"
                      className={`block text-[11px] font-bold uppercase mb-1 ${
                        isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                      }`}
                    >
                      Dirección de Entrega
                    </label>
                    <input
                      id="sheet-delivery-addr"
                      type="text"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      placeholder="Ej: Av. Primavera 1024, Dpto 302, Surco"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                        isLightTheme
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                          : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Multisucursal List Sorted by Real-Time Proximity */}
              <div className="space-y-2.5">
                <span
                  className={`block text-[11px] font-black uppercase tracking-wider ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  Elige tu Sucursal ({tenants.length} locales registrados)
                </span>

                <div className="space-y-2">
                  {branchesWithDistance.map(({ tenant, distanceKm }) => {
                    const isSelected = tenant.id === activeTenant.id;
                    const isNearest = nearestBranchId === tenant.id;
                    const isClosed = tenant.status === 'closed';

                    return (
                      <button
                        key={tenant.id}
                        type="button"
                        disabled={isClosed}
                        onClick={() => {
                          switchTenant(tenant.id);
                        }}
                        style={isSelected ? { borderColor: buttonColor } : undefined}
                        className={`w-full p-3.5 rounded-3xl border-2 text-left transition-all flex items-start justify-between gap-3 shadow-xs ${
                          isSelected
                            ? isLightTheme
                              ? 'bg-amber-500/10 text-zinc-950'
                              : 'bg-neutral-800/90 text-white'
                            : isLightTheme
                            ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                        } ${isClosed ? 'opacity-45 cursor-not-allowed' : ''}`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs sm:text-sm font-black ${
                                isLightTheme ? 'text-zinc-900' : 'text-white'
                              }`}
                            >
                              {tenant.name}
                            </span>
                            {isNearest && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-black uppercase">
                                Más cercana
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs truncate ${
                              isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                            }`}
                          >
                            {tenant.operations?.address || 'Lima, Perú'}
                          </p>
                          <p
                            className={`text-[11px] ${
                              isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                            }`}
                          >
                            Horario: {tenant.operations?.schedule || '12:00 PM – 11:30 PM'}
                          </p>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          {distanceKm !== null && (
                            <span className="block text-xs font-black text-emerald-500">
                              {distanceKm.toFixed(1)} km
                            </span>
                          )}
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isClosed
                                ? isLightTheme
                                  ? 'bg-zinc-200 text-zinc-600'
                                  : 'bg-zinc-800 text-zinc-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isClosed ? 'Cerrado' : 'Abierto'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className={`p-4 border-t safe-bottom-bar flex justify-end gap-2.5 ${
                isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-950 border-neutral-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsBranchSheetOpen(false)}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="store-btn-solid w-full py-3.5 px-5 rounded-2xl text-sm font-black shadow-md active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
              >
                Confirmar {deliveryType === 'delivery' ? 'Delivery' : 'Para Llevar'} en{' '}
                {activeTenant.name.replace('Khalessi Pizza - ', '')}
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* =====================================================================
          2. RESPONSIVE CART DRAWER (Off-Canvas on PC, Bottom-Sheet on Mobile)
          ===================================================================== */}
      <dialog
        ref={cartDialogRef}
        aria-labelledby={cartTitleId}
        onClose={e => {
          e.currentTarget.returnValue = '';
          setIsCartOpen(false);
        }}
        onClick={e => {
          if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
        }}
        className="store-responsive-drawer backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        {isCartOpen && (
          <div
            className={`rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l shadow-2xl flex flex-col max-h-[88svh] md:h-full md:max-h-none overflow-hidden transition-colors ${
              isLightTheme
                ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            {/* App Drag Handle (Mobile Only) */}
            <div className="pt-3 pb-1 flex justify-center md:hidden">
              <div
                className={`w-11 h-1.5 rounded-full ${
                  isLightTheme ? 'bg-zinc-300' : 'bg-neutral-700'
                }`}
              />
            </div>

            <div
              className={`px-5 py-3 border-b flex items-center justify-between ${
                isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5" style={{ color: accentColor }} />
                <div>
                  <h3
                    id={cartTitleId}
                    className={`font-black text-base leading-tight ${
                      isLightTheme ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    Tu Pedido ({totalCartUnits})
                  </h3>
                  <p
                    className={`text-[11px] ${
                      isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                    }`}
                  >
                    {deliveryType === 'delivery' ? '🛵 Delivery' : '🛍️ Para Llevar'} •{' '}
                    {activeTenant.name.replace('Khalessi Pizza - ', '')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar carrito"
                onClick={() => setIsCartOpen(false)}
                className={`p-2 rounded-full transition-colors ${
                  isLightTheme
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Delivery / Retiro switcher lives here (cart) — keeps the header clean */}
            <div
              role="group"
              aria-label="Modalidad de entrega"
              className={`px-4 sm:px-5 py-3 border-b shrink-0 ${
                isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <div
                className={`p-1 rounded-2xl border grid grid-cols-2 gap-1 ${
                  isLightTheme ? 'bg-zinc-100 border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                {(
                  [
                    { id: 'delivery', label: 'Delivery', sub: '25-35 min', Icon: Bike },
                    { id: 'pickup', label: 'Retiro en tienda', sub: '15-20 min', Icon: Store },
                  ] as const
                ).map(opt => {
                  const selected = deliveryType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDeliveryType(opt.id)}
                      data-auto-contrast={selected && autoButtonContrast ? 'true' : 'false'}
                      style={{ touchAction: 'manipulation' }}
                      className={`min-h-[48px] px-3 py-1.5 rounded-xl flex items-center justify-center gap-2 text-left transition-all whitespace-nowrap ${
                        selected
                          ? 'store-btn-solid shadow-sm'
                          : isLightTheme
                          ? 'text-zinc-600 hover:bg-white'
                          : 'text-neutral-400 hover:bg-neutral-900'
                      }`}
                    >
                      <opt.Icon aria-hidden="true" className="w-4 h-4 shrink-0" />
                      <span className="flex flex-col leading-tight">
                        <span className="text-xs font-black">{opt.label}</span>
                        <span className="text-[10px] font-semibold opacity-80">{opt.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {cartItems.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                      isLightTheme ? 'bg-zinc-200/70 text-zinc-500' : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <p
                    className={`font-bold text-base ${
                      isLightTheme ? 'text-zinc-800' : 'text-neutral-200'
                    }`}
                  >
                    Tu bolsa está vacía
                  </p>
                  <p
                    className={`text-xs mt-1 max-w-xs ${
                      isLightTheme ? 'text-zinc-500' : 'text-neutral-500'
                    }`}
                  >
                    Toca cualquier pizza o promoción para elegir sus ingredientes y tamaño.
                  </p>
                </div>
              ) : (
                cartItems.map(item => (
                  <div
                    key={item.itemId}
                    className={`p-3.5 rounded-3xl border space-y-2.5 shadow-xs ${
                      isLightTheme
                        ? 'bg-white border-zinc-200/90 text-zinc-900'
                        : 'bg-neutral-950 border-neutral-800 text-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-14 h-14 rounded-2xl object-cover shrink-0 bg-neutral-900"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`font-bold text-sm leading-snug ${
                                isLightTheme ? 'text-zinc-900' : 'text-white'
                              }`}
                            >
                              {item.productName}
                            </h4>
                            {item.size && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isLightTheme
                                    ? 'bg-zinc-100 text-zinc-700'
                                    : 'bg-neutral-800 text-neutral-200'
                                }`}
                              >
                                {item.size.name}
                              </span>
                            )}
                          </div>

                          {/* 🍕 Badge Half and Half Breakdown */}
                          {item.halfAndHalf && (
                            <div className="mt-1 text-[11px] font-bold text-amber-500 flex items-center gap-1.5 flex-wrap">
                              <span>
                                🍕 1/2 {item.halfAndHalf.firstHalfName} + 1/2{' '}
                                {item.halfAndHalf.secondHalfName}
                              </span>
                            </div>
                          )}

                          {/* Sub-opciones y personalizaciones completas */}
                          {item.subOptions && item.subOptions.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {item.subOptions.map((s, idx) => (
                                <div
                                  key={idx}
                                  className={`text-[11px] leading-tight flex items-start gap-1 flex-wrap ${
                                    isLightTheme ? 'text-zinc-600' : 'text-neutral-300'
                                  }`}
                                >
                                  <span className="font-semibold text-zinc-500 dark:text-neutral-400 shrink-0">
                                    • {s.groupName}:
                                  </span>
                                  <span className="font-medium text-zinc-900 dark:text-neutral-100 break-words">
                                    {s.choiceName}
                                  </span>
                                  {s.priceDelta > 0 && (
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                      (+S/ {s.priceDelta.toFixed(2)})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Extras y adicionales */}
                          {item.extras && item.extras.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.extras.map((e, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                    isLightTheme
                                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                                      : 'bg-amber-950/40 border-amber-800 text-amber-300'
                                  }`}
                                >
                                  <span>✨ {e.name}</span>
                                  {e.quantity > 1 && <span className="opacity-90">x{e.quantity}</span>}
                                  {e.price > 0 && (
                                    <span className="opacity-75">
                                      (+S/ {(e.price * e.quantity).toFixed(2)})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Notas o indicaciones especiales */}
                          {item.notes && (
                            <div
                              className={`mt-1.5 text-[11px] leading-snug flex items-start gap-1.5 p-2 rounded-xl border italic ${
                                isLightTheme
                                  ? 'bg-zinc-50 border-zinc-200 text-zinc-600'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                              }`}
                            >
                              <span className="not-italic shrink-0">📝</span>
                              <span className="break-words">{item.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label={`Eliminar ${item.productName} del carrito`}
                        onClick={() => removeFromCart(item.itemId)}
                        className={`p-1.5 rounded-xl transition-colors ${
                          isLightTheme
                            ? 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-neutral-500 hover:text-rose-400'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div
                      className={`flex items-center justify-between pt-2 border-t ${
                        isLightTheme ? 'border-zinc-100' : 'border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.itemId, -1)}
                          className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-black ${
                            isLightTheme
                              ? 'border-zinc-200 bg-zinc-100 text-zinc-700'
                              : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          -
                        </button>
                        <span
                          className={`text-xs font-black min-w-5 text-center ${
                            isLightTheme ? 'text-zinc-900' : 'text-white'
                          }`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.itemId, 1)}
                          className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-black ${
                            isLightTheme
                              ? 'border-zinc-200 bg-zinc-100 text-zinc-700'
                              : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        {item.quantity > 1 && (
                          <span className="text-[10px] font-semibold text-zinc-400 block -mb-0.5">
                            S/ {item.unitPrice.toFixed(2)} c/u
                          </span>
                        )}
                        <span className="font-black text-sm" style={{ color: accentColor }}>
                          S/ {item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* VENTA SUGERIDA (1-TAP UPSELLING COMPLEMENTOS) */}
              {cartItems.length > 0 && upsellSuggestions.length > 0 && (
                <div className="pt-2 space-y-2">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>Completa tu pedido en 1 toque</span>
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {upsellSuggestions.map(sug => {
                      const sugPrice = sug.hasSizes
                        ? (sug.sizes.find(s => s.isDefault && s.enabled) || sug.sizes[0])?.price ??
                          sug.basePrice
                        : sug.basePrice;
                      return (
                        <div
                          key={sug.id}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 shadow-xs ${
                            isLightTheme
                              ? 'bg-white border-zinc-200/90 text-zinc-900'
                              : 'bg-neutral-950 border-neutral-800 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={sug.imageUrl}
                              alt={sug.name}
                              className="w-10 h-10 rounded-xl object-cover shrink-0 bg-neutral-900"
                            />
                            <div className="min-w-0">
                              <span
                                className={`text-xs font-bold block truncate ${
                                  isLightTheme ? 'text-zinc-900' : 'text-white'
                                }`}
                              >
                                {sug.name}
                              </span>
                              <span
                                className="text-[11px] font-black block"
                                style={{ color: accentColor }}
                              >
                                + S/ {sugPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleQuickAddUpsell(sug)}
                            data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                            className="store-btn-solid px-3 py-1.5 rounded-xl text-[11px] font-black inline-flex items-center gap-1 active:scale-95 transition-transform whitespace-nowrap shrink-0 shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Sumar</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CUPÓN PROMOCIONAL & CANJE DE TARJETA DE PUNTOS */}
              {cartItems.length > 0 && (
                <div
                  className={`p-4 rounded-3xl border space-y-3 shadow-xs ${
                    isLightTheme
                      ? 'bg-white border-zinc-200/90 text-zinc-900'
                      : 'bg-neutral-950 border-neutral-800 text-white'
                  }`}
                >
                  <div>
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 mb-1.5 ${
                        isLightTheme ? 'text-zinc-600' : 'text-neutral-300'
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      <span>Cupón de Beneficio</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ej: KHALESSI15"
                        value={couponInput}
                        onChange={e => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none focus:border-amber-500 ${
                          isLightTheme
                            ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                            : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                        }`}
                      />
                      {appliedCouponCode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedCouponCode(null);
                            setCouponInput('');
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-black whitespace-nowrap shrink-0"
                        >
                          Quitar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleApplyCouponCode}
                          data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                          className="store-btn-solid px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 shadow-xs"
                        >
                          Aplicar
                        </button>
                      )}
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1">{couponError}</p>
                    )}
                    {activeCouponEval?.coupon && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        ✓ {activeCouponEval.coupon.code}: -S/{' '}
                        {activeCouponEval.discountAmount.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Canjear Premios de la Tarjeta de Puntos */}
                  {currentCustomer && pointsConfig.enabled && (
                    <div
                      className={`pt-2.5 border-t space-y-1.5 ${
                        isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`font-black flex items-center gap-1 ${
                            isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                          }`}
                        >
                          <Gift className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          <span>Tu Tarjeta: {currentCustomer.points || 0} pts</span>
                        </span>
                        <span
                          className={isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}
                        >
                          +{pointsConfig.pointsPerPurchase} pto con esta compra
                        </span>
                      </div>
                      {rewards.some(
                        r => r.isActive && (currentCustomer.points || 0) >= r.pointsCost
                      ) ? (
                        <select
                          aria-label="Canjear premio con puntos"
                          value={selectedRewardId || ''}
                          onChange={e => setSelectedRewardId(e.target.value || null)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                            isLightTheme
                              ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                              : 'bg-neutral-900 border-neutral-800 text-white'
                          }`}
                        >
                          <option value="">No canjear puntos en esta compra</option>
                          {rewards
                            .filter(
                              r => r.isActive && (currentCustomer.points || 0) >= r.pointsCost
                            )
                            .map(r => (
                              <option key={r.id} value={r.id}>
                                {r.badgeIcon} Canjear {r.title} ({r.pointsCost} pts)
                              </option>
                            ))}
                        </select>
                      ) : (
                        <p
                          className={`text-[11px] ${
                            isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                          }`}
                        >
                          Sigue sumando puntos para desbloquear tu próximo premio gratis.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div
                className={`p-4 sm:p-5 border-t safe-bottom-bar space-y-3 ${
                  isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                {deliveryType === 'delivery' && dynamicDelivery.isOutOfRange && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-200 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{dynamicDelivery.matchedBracketLabel}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsBranchSheetOpen(true);
                      }}
                      className="underline font-black text-amber-600 dark:text-amber-300 whitespace-nowrap shrink-0"
                    >
                      Cambiar sede
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 text-xs">
                  <div
                    className={`flex justify-between ${
                      isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                    }`}
                  >
                    <span>Subtotal</span>
                    <span>S/ {cartSubtotal.toFixed(2)}</span>
                  </div>
                  {totalDiscountSoles > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Beneficios / Descuento</span>
                      <span>- S/ {totalDiscountSoles.toFixed(2)}</span>
                    </div>
                  )}
                  {deliveryType === 'delivery' && (
                    <div
                      className={`flex justify-between ${
                        isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                      }`}
                    >
                      <span className="truncate pr-2">
                        Delivery ({dynamicDelivery.matchedBracketLabel})
                      </span>
                      <span className="whitespace-nowrap shrink-0">
                        {resolvedDeliveryFee === 0
                          ? 'GRATIS'
                          : `S/ ${resolvedDeliveryFee.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex justify-between text-base font-black pt-1.5 border-t ${
                      isLightTheme ? 'text-zinc-900 border-zinc-200' : 'text-white border-neutral-800'
                    }`}
                  >
                    <span>Total Estimado</span>
                    <span style={{ color: accentColor }}>
                      S/ {resolvedPayableTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutModalOpen(true);
                  }}
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid w-full whitespace-nowrap shrink-0 py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base shadow-md active:scale-[0.98] transition-transform flex items-center justify-between"
                >
                  <span>Ir a Finalizar Pedido</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span>S/ {resolvedPayableTotal.toFixed(2)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>

      {/* =====================================================================
          3. RESPONSIVE CHECKOUT DRAWER (Off-Canvas on PC, Bottom-Sheet on Mobile)
          ===================================================================== */}
      <dialog
        ref={checkoutDialogRef}
        aria-labelledby={checkoutTitleId}
        onClose={e => {
          e.currentTarget.returnValue = '';
          setIsCheckoutModalOpen(false);
        }}
        onClick={e => {
          if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
        }}
        className="store-responsive-drawer backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        {isCheckoutModalOpen && (
          <div
            className={`rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l shadow-2xl overflow-hidden flex flex-col max-h-[90svh] md:h-full md:max-h-none transition-colors ${
              isLightTheme
                ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            <div className="pt-3 pb-1 flex justify-center md:hidden">
              <div
                className={`w-11 h-1.5 rounded-full ${
                  isLightTheme ? 'bg-zinc-300' : 'bg-neutral-700'
                }`}
              />
            </div>

            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
                isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5" style={{ color: accentColor }} />
                <h3
                  id={checkoutTitleId}
                  className={`font-black text-base ${isLightTheme ? 'text-zinc-900' : 'text-white'}`}
                >
                  Confirmar Pedido
                </h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar checkout"
                onClick={() => setIsCheckoutModalOpen(false)}
                className={`p-2 rounded-full transition-colors ${
                  isLightTheme
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCheckoutSubmit}
              onKeyDown={e => {
                // Enter confirms the order from anywhere in the checkout (checkboxes, chips, empty areas),
                // except multi-line fields and buttons that handle Enter natively.
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                const t = e.target as HTMLElement;
                const tag = t.tagName;
                if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A' || tag === 'SELECT') return;
                if (tag === 'INPUT' && (t as HTMLInputElement).type !== 'checkbox' && (t as HTMLInputElement).type !== 'radio') {
                  return; // native implicit submission already handles text inputs
                }
                e.preventDefault();
                e.currentTarget.requestSubmit();
              }}
              className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar safe-bottom-bar"
            >
              {/* Preselected Branch & Order Type Summary Card */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isLightTheme
                    ? 'bg-zinc-100/90 border-zinc-200'
                    : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <span
                    className={`block text-[10px] font-black uppercase tracking-wider ${
                      isLightTheme ? 'text-emerald-600' : 'text-emerald-400'
                    }`}
                  >
                    Configuración Preseleccionada
                  </span>
                  <span
                    className={`block text-xs sm:text-sm font-black truncate ${
                      isLightTheme ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    {deliveryType === 'delivery'
                      ? '🛵 Delivery a Domicilio'
                      : '🛍️ Para Llevar (Recojo en Tienda)'}{' '}
                    — {activeTenant.name.replace('Khalessi Pizza - ', '')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutModalOpen(false);
                    setIsBranchSheetOpen(true);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition-colors ${
                    isLightTheme
                      ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  }`}
                >
                  Cambiar
                </button>
              </div>

              {/* Quick Switcher if user wants to adjust right here */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  data-auto-contrast={
                    deliveryType === 'delivery' && autoButtonContrast ? 'true' : 'false'
                  }
                  className={`p-3 rounded-2xl border text-center text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                    deliveryType === 'delivery'
                      ? 'store-btn-solid border-transparent'
                      : isLightTheme
                      ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                  }`}
                >
                  🛵 Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  data-auto-contrast={
                    deliveryType === 'pickup' && autoButtonContrast ? 'true' : 'false'
                  }
                  className={`p-3 rounded-2xl border text-center text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                    deliveryType === 'pickup'
                      ? 'store-btn-solid border-transparent'
                      : isLightTheme
                      ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                  }`}
                >
                  🛍️ Para Llevar
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="chk-branch-select"
                    className={`text-xs font-bold block mb-1 ${
                      isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                    }`}
                  >
                    Sucursal de Despacho
                  </label>
                  <select
                    id="chk-branch-select"
                    value={activeTenant.id}
                    onChange={e => switchTenant(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500 ${
                      isLightTheme
                        ? 'bg-white border-zinc-200 text-zinc-900'
                        : 'bg-neutral-950 border-neutral-800 text-white'
                    }`}
                  >
                    {branchesWithDistance.map(({ tenant, distanceKm }) => (
                      <option
                        key={tenant.id}
                        value={tenant.id}
                        disabled={tenant.status === 'closed'}
                      >
                        {tenant.name}
                        {distanceKm !== null ? ` (${distanceKm.toFixed(1)} km)` : ''}
                        {tenant.status === 'closed' ? ' - Cerrado' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="chk-name"
                    className={`text-xs font-bold block mb-1 ${
                      isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                    }`}
                  >
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                      }`}
                    />
                    <input
                      id="chk-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Ej: Daniel Ramos"
                      className={`w-full pl-10 pr-3.5 py-2.5 border rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                        isLightTheme
                          ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                          : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="chk-phone"
                    className={`text-xs font-bold block mb-1 ${
                      isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                    }`}
                  >
                    Teléfono / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                      }`}
                    />
                    <input
                      id="chk-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="+51 999 888 777"
                      className={`w-full pl-10 pr-3.5 py-2.5 border rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                        isLightTheme
                          ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                          : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                      }`}
                    />
                  </div>
                </div>

                {deliveryType === 'delivery' && (
                  <div className="space-y-2">
                    {/* Quick Saved Addresses if Customer is Logged In */}
                    {currentCustomer && currentCustomer.addresses.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {currentCustomer.addresses.map(addr => {
                          const isCurrentAddr = deliveryAddress === addr.streetAddress;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                setDeliveryAddress(addr.streetAddress);
                                setDeliveryReference(addr.reference || '');
                              }}
                              data-auto-contrast={
                                isCurrentAddr && autoButtonContrast ? 'true' : 'false'
                              }
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border whitespace-nowrap shrink-0 transition-colors ${
                                isCurrentAddr
                                  ? 'store-btn-solid border-transparent'
                                  : isLightTheme
                                  ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                  : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                              }`}
                            >
                              📍 {addr.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="chk-address"
                          className={`text-xs font-bold ${
                            isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                          }`}
                        >
                          Dirección de Entrega *
                        </label>
                        <button
                          type="button"
                          onClick={() => requestRealtimeLocation(true)}
                          className="text-[11px] font-bold flex items-center gap-1 hover:underline"
                          style={{ color: accentColor }}
                        >
                          <LocateFixed className="w-3 h-3" />
                          <span>Usar GPS actual</span>
                        </button>
                      </div>
                      <div className="relative">
                        <MapPin
                          className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                            isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                          }`}
                        />
                        <input
                          id="chk-address"
                          type="text"
                          autoComplete="street-address"
                          required
                          value={deliveryAddress}
                          onChange={e => setDeliveryAddress(e.target.value)}
                          placeholder="Calle, Número, Urbanización"
                          className={`w-full pl-10 pr-3.5 py-2.5 border rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                              : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="chk-ref"
                        className={`text-xs font-bold block mb-1 ${
                          isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                        }`}
                      >
                        Referencia (Opcional)
                      </label>
                      <input
                        id="chk-ref"
                        type="text"
                        value={deliveryReference}
                        onChange={e => setDeliveryReference(e.target.value)}
                        placeholder="Piso, puerta, edificio o referencia"
                        className={`w-full px-3.5 py-2 border rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                            : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Horario de Entrega: Inmediato vs Programado */}
                <div className="pt-1 space-y-2">
                  <span
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>Horario de Entrega</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleMode('asap')}
                      data-auto-contrast={
                        scheduleMode === 'asap' && autoButtonContrast ? 'true' : 'false'
                      }
                      className={`p-2.5 rounded-2xl border text-center text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                        scheduleMode === 'asap'
                          ? 'store-btn-solid border-transparent'
                          : isLightTheme
                          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      ⚡ Lo antes posible
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode('scheduled')}
                      data-auto-contrast={
                        scheduleMode === 'scheduled' && autoButtonContrast ? 'true' : 'false'
                      }
                      className={`p-2.5 rounded-2xl border text-center text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                        scheduleMode === 'scheduled'
                          ? 'store-btn-solid border-transparent'
                          : isLightTheme
                          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      🕒 Programar hora
                    </button>
                  </div>
                  {scheduleMode === 'scheduled' && (
                    <input
                      type="time"
                      aria-label="Hora programada de entrega"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className={`w-full px-3.5 py-2 border rounded-2xl text-xs sm:text-sm font-bold focus:outline-none focus:border-amber-500 ${
                        isLightTheme
                          ? 'bg-white border-zinc-200 text-zinc-900'
                          : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    />
                  )}
                </div>

                {/* Comprobante Electrónico SUNAT (Boleta Simple / DNI / Factura RUC) */}
                <div className="pt-1 space-y-2">
                  <span
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>Comprobante Electrónico</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'boleta_simple', label: 'Boleta Simple' },
                        { id: 'boleta_dni', label: 'Boleta DNI' },
                        { id: 'factura_ruc', label: 'Factura RUC' },
                      ] as const
                    ).map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setInvoiceType(opt.id)}
                        data-auto-contrast={
                          invoiceType === opt.id && autoButtonContrast ? 'true' : 'false'
                        }
                        className={`px-2 py-2 rounded-xl border text-[11px] font-black transition-all whitespace-nowrap shrink-0 ${
                          invoiceType === opt.id
                            ? 'store-btn-solid border-transparent'
                            : isLightTheme
                            ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {invoiceType === 'boleta_dni' && (
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={invoiceDocument}
                      onChange={e => setInvoiceDocument(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="Número de DNI (8 dígitos) *"
                      className={`w-full px-3.5 py-2 border rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                        isLightTheme
                          ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                          : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                      }`}
                    />
                  )}

                  {invoiceType === 'factura_ruc' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        value={invoiceDocument}
                        onChange={e =>
                          setInvoiceDocument(e.target.value.replace(/\D/g, '').slice(0, 11))
                        }
                        placeholder="Número de RUC (11 dígitos) *"
                        className={`w-full px-3.5 py-2 border rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                            : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                        }`}
                      />
                      <input
                        type="text"
                        value={invoiceBusinessName}
                        onChange={e => setInvoiceBusinessName(e.target.value)}
                        placeholder="Razón Social de la Empresa *"
                        className={`w-full px-3.5 py-2 border rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                            : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                        }`}
                      />
                      <input
                        type="text"
                        value={invoiceFiscalAddress}
                        onChange={e => setInvoiceFiscalAddress(e.target.value)}
                        placeholder="Dirección Fiscal (Opcional)"
                        className={`w-full px-3.5 py-2 border rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                            : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <span
                  className={`text-xs font-bold block ${
                    isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                  }`}
                >
                  Método de Pago
                </span>

                {/* Pasarela Oficial Culqi Checkout v4 (Tarjetas + Yape en línea) */}
                {culqiEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecurringId(null);
                      setPaymentMethod('culqi');
                    }}
                    style={
                      !selectedRecurringId && paymentMethod === 'culqi'
                        ? { borderColor: buttonColor }
                        : undefined
                    }
                    className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-center justify-between gap-3 transition-all ${
                      !selectedRecurringId && paymentMethod === 'culqi'
                        ? isLightTheme
                          ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                          : 'bg-neutral-800/90 text-white'
                        : isLightTheme
                        ? 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                        className="store-btn-solid w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs"
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`text-xs sm:text-sm font-black block truncate ${
                            isLightTheme ? 'text-zinc-900' : 'text-white'
                          }`}
                        >
                          Pasarela Culqi (Tarjeta o Yape)
                        </span>
                        <span
                          className={`text-[11px] block truncate ${
                            isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                          }`}
                        >
                          Pago seguro inmediato con Visa, Mastercard o Yape OTP
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap shrink-0 ${
                        isLightTheme
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      Online
                    </span>
                  </button>
                )}

                {/* Saved Recurring Payment Methods for Logged-in Customer */}
                {currentCustomer && currentCustomer.paymentMethods.length > 0 && (
                  <div className="space-y-1.5">
                    {currentCustomer.paymentMethods.map(pm => {
                      const active = selectedRecurringId === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setSelectedRecurringId(pm.id);
                            setPaymentMethod(pm.type);
                          }}
                          style={active ? { borderColor: buttonColor } : undefined}
                          className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition-all ${
                            active
                              ? isLightTheme
                                ? 'bg-zinc-100 text-zinc-950'
                                : 'bg-neutral-800/80 text-white'
                              : isLightTheme
                              ? 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                              : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Star
                              className="w-3.5 h-3.5 shrink-0 fill-current"
                              style={{ color: accentColor }}
                            />
                            <span className="text-xs font-black truncate">{pm.alias}</span>
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                              isLightTheme
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            Recurrente
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {(!culqiEnabled || (companyInfo.culqiConfig?.allowCashFallback ?? true)) && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecurringId(null);
                        setPaymentMethod('yape_plin');
                      }}
                      className={`p-2.5 rounded-2xl border text-center text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                        !selectedRecurringId && paymentMethod === 'yape_plin'
                          ? isLightTheme
                            ? 'border-purple-500 bg-purple-50 text-purple-800 ring-1 ring-purple-400/30'
                            : 'border-purple-500 bg-purple-500/15 text-purple-200'
                          : isLightTheme
                          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                      }`}
                    >
                      <Smartphone
                        className={`w-4 h-4 ${isLightTheme ? 'text-purple-600' : 'text-purple-400'}`}
                      />
                      <span>Yape Entrega</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecurringId(null);
                        setPaymentMethod('efectivo');
                      }}
                      className={`p-2.5 rounded-2xl border text-center text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                        !selectedRecurringId && paymentMethod === 'efectivo'
                          ? isLightTheme
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400/30'
                            : 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                          : isLightTheme
                          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                      }`}
                    >
                      <Banknote
                        className={`w-4 h-4 ${isLightTheme ? 'text-emerald-600' : 'text-emerald-400'}`}
                      />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecurringId(null);
                        setPaymentMethod('tarjeta');
                      }}
                      className={`p-2.5 rounded-2xl border text-center text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                        !selectedRecurringId && paymentMethod === 'tarjeta'
                          ? isLightTheme
                            ? 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-400/30'
                            : 'border-blue-500 bg-blue-500/15 text-blue-200'
                          : isLightTheme
                          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                      }`}
                    >
                      <CreditCard
                        className={`w-4 h-4 ${isLightTheme ? 'text-blue-600' : 'text-blue-400'}`}
                      />
                      <span>POS Entrega</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Resumen de Tarifas, Beneficios y Puntos en Checkout */}
              <div
                className={`p-3 rounded-2xl border space-y-1 text-xs ${
                  isLightTheme
                    ? 'bg-zinc-100/90 border-zinc-200 text-zinc-800'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                }`}
              >
                <div
                  className={`flex justify-between ${
                    isLightTheme ? 'text-zinc-600' : 'text-neutral-400'
                  }`}
                >
                  <span>Subtotal productos</span>
                  <span className="font-semibold">S/ {cartSubtotal.toFixed(2)}</span>
                </div>
                {totalDiscountSoles > 0 && (
                  <div
                    className={`flex justify-between font-bold ${
                      isLightTheme ? 'text-emerald-600' : 'text-emerald-400'
                    }`}
                  >
                    <span>Descuento aplicado</span>
                    <span>- S/ {totalDiscountSoles.toFixed(2)}</span>
                  </div>
                )}
                {deliveryType === 'delivery' && (
                  <div
                    className={`flex justify-between ${
                      isLightTheme ? 'text-zinc-600' : 'text-neutral-400'
                    }`}
                  >
                    <span className="truncate pr-2">
                      Delivery ({dynamicDelivery.matchedBracketLabel})
                    </span>
                    <span className="whitespace-nowrap shrink-0 font-semibold">
                      {resolvedDeliveryFee === 0
                        ? 'GRATIS'
                        : `S/ ${resolvedDeliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                )}
                {currentCustomer &&
                  pointsConfig.enabled &&
                  cartSubtotal >= pointsConfig.minPurchaseAmountForPoint && (
                    <div
                      className={`pt-1 text-[11px] font-bold flex items-center justify-between ${
                        isLightTheme ? 'text-amber-700' : 'text-amber-300'
                      }`}
                    >
                      <span>🎁 Beneficio Tarjeta de Puntos</span>
                      <span>+{pointsConfig.pointsPerPurchase} punto al confirmar</span>
                    </div>
                  )}
              </div>

              <div
                className={`pt-3 border-t flex items-center justify-between gap-3 ${
                  isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] uppercase font-bold block ${
                      isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                    }`}
                  >
                    Total a Pagar
                  </span>
                  <span className="text-lg font-black" style={{ color: accentColor }}>
                    S/ {resolvedPayableTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid whitespace-nowrap shrink-0 px-6 py-3.5 rounded-2xl font-black text-sm shadow-md active:scale-[0.98] transition-transform"
                >
                  {paymentMethod === 'culqi' && resolvedPayableTotal > 0
                    ? `Pagar con Culqi S/ ${resolvedPayableTotal.toFixed(2)}`
                    : 'Confirmar Pedido Ahora'}
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>

      {/* =====================================================================
          4. QUICK VIEW MODAL ("Vista Rápida" Ojo — Solid Colors)
          ===================================================================== */}
      <dialog
        ref={quickViewDialogRef}
        aria-labelledby={quickViewTitleId}
        onClose={e => {
          e.currentTarget.returnValue = '';
          setQuickViewProduct(null);
        }}
        onClick={e => {
          if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
        }}
        className="store-bottom-sheet backdrop:bg-black/75 backdrop:backdrop-blur-xs bg-transparent p-0 sm:p-4 w-full max-w-lg"
      >
        {quickViewProduct && (
          <div
            className={`rounded-t-3xl sm:rounded-3xl border overflow-hidden shadow-2xl ${
              isLightTheme
                ? 'bg-white border-zinc-200 text-zinc-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            <div className={`relative h-56 w-full ${isLightTheme ? 'bg-zinc-100' : 'bg-neutral-950'}`}>
              <img
                src={quickViewProduct.imageUrl}
                alt={quickViewProduct.name}
                className="w-full h-full object-cover"
              />
              {quickViewProduct.badge && (
                <span
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-black uppercase shadow"
                >
                  {quickViewProduct.badge}
                </span>
              )}
              <button
                type="button"
                aria-label="Cerrar vista rápida"
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <h3
                  id={quickViewTitleId}
                  className={`text-xl font-black ${isLightTheme ? 'text-zinc-900' : 'text-white'}`}
                >
                  {quickViewProduct.name}
                </h3>
                <p
                  className={`text-sm mt-1.5 leading-relaxed ${
                    isLightTheme ? 'text-zinc-600' : 'text-neutral-300'
                  }`}
                >
                  {quickViewProduct.description}
                </p>
              </div>

              <div
                className={`pt-3 border-t flex items-center justify-end gap-3 ${
                  isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setQuickViewProduct(null)}
                  className={`px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                    isLightTheme
                      ? 'border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = quickViewProduct;
                    setQuickViewProduct(null);
                    navigateToProductSlug(target);
                  }}
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black shadow-md active:scale-95 transition-transform whitespace-nowrap shrink-0"
                >
                  Ver Página del Producto
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* =====================================================================
          5. CUSTOMER PROFILE, REALTIME ORDERS & LIVE SEARCH DRAWERS
          ===================================================================== */}
      <StoreCustomerProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        accentColor={accentColor}
        autoButtonContrast={autoButtonContrast}
        currentDeliveryAddress={deliveryAddress}
        onApplyAddressToOrder={(street, ref) => {
          setDeliveryType('delivery');
          setDeliveryAddress(street);
          if (ref !== undefined) setDeliveryReference(ref);
        }}
        onRequestGpsAddress={() => requestRealtimeLocation(true)}
        isLocatingGps={isLocating}
        isLightTheme={isLightTheme}
      />

      <StoreCustomerOrdersDrawer
        isOpen={isOrdersOpen}
        onClose={() => {
          setIsOrdersOpen(false);
          setFocusedOrderId(null);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        accentColor={accentColor}
        autoButtonContrast={autoButtonContrast}
        isLightTheme={isLightTheme}
        initialOrderId={focusedOrderId}
      />

      <StoreBenefitsDrawer
        isOpen={isBenefitsOpen}
        onClose={() => setIsBenefitsOpen(false)}
        accentColor={accentColor}
        autoButtonContrast={autoButtonContrast}
        isLightTheme={isLightTheme}
        onOpenProfile={() => setIsProfileOpen(true)}
        onApplyCouponToCart={code => {
          setCouponInput(code);
          setIsCartOpen(true);
        }}
      />

      <StoreSearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={products}
        searchQuery={searchQuery}
        onChangeSearch={q => setSearchQuery(q)}
        onSelectProduct={prod => navigateToProductSlug(prod)}
        accentColor={accentColor}
        autoButtonContrast={autoButtonContrast}
        isLightTheme={isLightTheme}
      />

      <StoreCulqiSandboxDialog
        isOpen={isCulqiSandboxOpen}
        storeTitle={companyInfo.commercialName || customization.appName}
        amountSoles={resolvedPayableTotal}
        customerEmail={currentCustomer?.email || ''}
        yapeEnabled={companyInfo.culqiConfig?.yapeEnabled ?? true}
        accentColor={buttonColor}
        autoButtonContrast={autoButtonContrast}
        onCancel={() => setIsCulqiSandboxOpen(false)}
        onApproved={({ referenceId }) => {
          setIsCulqiSandboxOpen(false);
          finalizeOrderCreation({ culqiReference: referenceId, forcePaid: true });
        }}
      />

      {/* Order Confirmation Modal with Direct Real-Time Order Tracking CTA */}
      {orderConfirmed && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg border rounded-t-3xl sm:rounded-3xl p-6 text-center space-y-4 shadow-2xl safe-bottom-bar ${
              isLightTheme
                ? 'bg-white border-zinc-200 text-zinc-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/35 mx-auto flex items-center justify-center">
              <CheckCircle2 aria-hidden="true" className="w-8 h-8" />
            </div>

            <div>
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: accentColor }}
              >
                ¡Pedido Recibido en {activeTenant.name.replace('Khalessi Pizza - ', '')}!
              </span>
              <h3
                className={`text-2xl font-black mt-1 ${
                  isLightTheme ? 'text-zinc-900' : 'text-white'
                }`}
              >
                Orden {orderConfirmed.orderNumber}
              </h3>

              {/* Live Status Chip inside Confirmation Modal */}
              {liveConfirmedOrder && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Estado en vivo:{' '}
                    {liveConfirmedOrder.status === 'recibido'
                      ? 'En cola de cocina'
                      : liveConfirmedOrder.status === 'en_cocina'
                      ? 'Preparando masa 👨‍🍳'
                      : liveConfirmedOrder.status === 'en_horno'
                      ? 'En horno a la leña 🔥'
                      : liveConfirmedOrder.status === 'listo'
                      ? '¡Listo para despacho! ✅'
                      : liveConfirmedOrder.status === 'en_ruta'
                      ? 'Motorizado en ruta 🛵'
                      : liveConfirmedOrder.status === 'entregado'
                      ? 'Entregado 🎉'
                      : 'Cancelado'}
                  </span>
                </div>
              )}

              <p
                className={`text-xs mt-2 ${
                  isLightTheme ? 'text-zinc-600' : 'text-neutral-400'
                }`}
              >
                Modalidad:{' '}
                <strong className={isLightTheme ? 'text-zinc-900' : 'text-neutral-200'}>
                  {deliveryType === 'delivery' ? 'Delivery a Domicilio' : 'Retiro en Tienda'}
                </strong>
                . Sincronizado automáticamente con Cocina KDS y Delivery.
              </p>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                isLightTheme
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}>
                  Total Confirmado
                </span>
                <span
                  className={`font-black text-sm ${
                    isLightTheme ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  S/ {orderConfirmed.total.toFixed(2)}
                </span>
              </div>
              {orderConfirmed.culqiReference && (
                <div
                  className={`flex justify-between items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1 border-t ${
                    isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
                  }`}
                >
                  <span>Pago Culqi Aprobado</span>
                  <span className="font-mono">{orderConfirmed.culqiReference}</span>
                </div>
              )}
              {typeof orderConfirmed.pointsEarned === 'number' &&
                orderConfirmed.pointsEarned > 0 && (
                  <div
                    className={`flex justify-between items-center text-[11px] text-amber-600 dark:text-amber-300 font-bold pt-1 border-t ${
                      isLightTheme ? 'border-zinc-200' : 'border-neutral-800'
                    }`}
                  >
                    <span>🎁 Tarjeta de Puntos</span>
                    <span>
                      +{orderConfirmed.pointsEarned}{' '}
                      {orderConfirmed.pointsEarned === 1 ? 'punto sumado' : 'puntos sumados'}
                    </span>
                  </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                data-action="dismiss-confirmation"
                onClick={() => setOrderConfirmed(null)}
                className={`flex-1 whitespace-nowrap shrink-0 py-3.5 px-4 rounded-2xl border font-bold text-xs sm:text-sm transition-colors ${
                  isLightTheme
                    ? 'border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                    : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                Seguir Comprando
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = orderConfirmed.orderId;
                  setOrderConfirmed(null);
                  setFocusedOrderId(targetId);
                  setIsOrdersOpen(true);
                }}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="store-btn-solid flex-1 whitespace-nowrap shrink-0 py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm active:scale-[0.98] transition-transform"
              >
                <span>Seguir Pedido en Vivo</span>
                <kbd className="hidden md:inline-block ml-2 px-1.5 py-0.5 rounded-md bg-black/20 text-[10px] font-bold align-middle">
                  ↵ Enter
                </kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. MODERN FLOATING APP CAPSULE NAVBAR (Mobile & Touch Tablet < 1024px)
             Solid opaque pill with concentric Cart button & live status badges
          ===================================================================== */}
      {!isBuilderOpen && !activeSlugProduct && (
        <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-1 pointer-events-none flex justify-center">
          <nav
            aria-label="Navegación principal móvil y tablet"
            className={`pointer-events-auto w-full max-w-[400px] sm:max-w-[430px] rounded-full p-1.5 border grid grid-cols-5 items-center gap-0.5 transition-colors ${
              isLightTheme
                ? 'bg-white border-zinc-200 text-zinc-600 shadow-[0_12px_32px_rgba(24,24,27,0.14),0_2px_8px_rgba(24,24,27,0.06)]'
                : 'bg-neutral-900 border-neutral-700 text-neutral-300 shadow-[0_16px_38px_rgba(0,0,0,0.82)]'
            }`}
          >
            {/* Slot 1: Carta */}
            <button
              type="button"
              aria-current={
                !isOrdersOpen && !isProfileOpen && !isBenefitsOpen && !isCartOpen
                  ? 'page'
                  : undefined
              }
              onClick={() => {
                setActiveCategory('todos');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                color:
                  !isOrdersOpen && !isProfileOpen && !isBenefitsOpen && !isCartOpen
                    ? accentColor
                    : undefined,
                touchAction: 'manipulation',
              }}
              className={`min-h-[48px] rounded-full flex flex-col items-center justify-center gap-0.5 text-[10px] active:scale-95 transition-all ${
                !isOrdersOpen && !isProfileOpen && !isBenefitsOpen && !isCartOpen
                  ? isLightTheme
                    ? 'bg-zinc-100 font-black'
                    : 'bg-neutral-800 font-black'
                  : 'font-bold'
              }`}
            >
              <Flame aria-hidden="true" className="w-[19px] h-[19px]" />
              <span>Carta</span>
            </button>

            {/* Slot 2: Pedidos (Live Real-Time Count) */}
            <button
              type="button"
              aria-current={isOrdersOpen ? 'page' : undefined}
              onClick={() => {
                setFocusedOrderId(null);
                setIsOrdersOpen(true);
              }}
              style={{
                color: isOrdersOpen ? accentColor : undefined,
                touchAction: 'manipulation',
              }}
              className={`min-h-[48px] rounded-full relative flex flex-col items-center justify-center gap-0.5 text-[10px] active:scale-95 transition-all ${
                isOrdersOpen
                  ? isLightTheme
                    ? 'bg-zinc-100 font-black'
                    : 'bg-neutral-800 font-black'
                  : 'font-bold'
              }`}
            >
              <span className="relative">
                <Receipt aria-hidden="true" className="w-[19px] h-[19px]" />
                {activeCustomerOrdersCount > 0 && (
                  <span
                    data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                    className="store-btn-solid absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-sm"
                  >
                    {activeCustomerOrdersCount}
                  </span>
                )}
              </span>
              <span>Pedidos</span>
            </button>

            {/* Slot 3 (Center): Concentric Capsule Cart Pill */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                aria-label={`Abrir carrito (${totalCartUnits} productos)`}
                onClick={() => setIsCartOpen(true)}
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                style={{ touchAction: 'manipulation' }}
                className="store-btn-solid relative w-12 h-12 rounded-full shadow-md flex items-center justify-center active:scale-95 transition-transform"
              >
                <ShoppingBag aria-hidden="true" className="w-5 h-5" />
                {totalCartUnits > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-zinc-950 text-white ring-2 text-[9px] font-black flex items-center justify-center ${
                      isLightTheme ? 'ring-white' : 'ring-neutral-900'
                    }`}
                  >
                    {totalCartUnits}
                  </span>
                )}
              </button>
            </div>

            {/* Slot 4: Premios */}
            <button
              type="button"
              aria-current={isBenefitsOpen ? 'page' : undefined}
              onClick={() => setIsBenefitsOpen(true)}
              style={{
                color: isBenefitsOpen ? accentColor : undefined,
                touchAction: 'manipulation',
              }}
              className={`min-h-[48px] rounded-full flex flex-col items-center justify-center gap-0.5 text-[10px] active:scale-95 transition-all ${
                isBenefitsOpen
                  ? isLightTheme
                    ? 'bg-zinc-100 font-black'
                    : 'bg-neutral-800 font-black'
                  : 'font-bold'
              }`}
            >
              <Gift aria-hidden="true" className="w-[19px] h-[19px] text-amber-500" />
              <span>Premios</span>
            </button>

            {/* Slot 5: Perfil */}
            <button
              type="button"
              aria-current={isProfileOpen ? 'page' : undefined}
              onClick={() => setIsProfileOpen(true)}
              style={{
                color: isProfileOpen || currentCustomer ? accentColor : undefined,
                touchAction: 'manipulation',
              }}
              className={`min-h-[48px] rounded-full flex flex-col items-center justify-center gap-0.5 text-[10px] active:scale-95 transition-all ${
                isProfileOpen
                  ? isLightTheme
                    ? 'bg-zinc-100 font-black'
                    : 'bg-neutral-800 font-black'
                  : 'font-bold'
              }`}
            >
              {currentCustomer ? (
                <span
                  data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                  className="store-btn-solid w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center"
                >
                  {currentCustomer.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()}
                </span>
              ) : (
                <User aria-hidden="true" className="w-[19px] h-[19px]" />
              )}
              <span className="max-w-[54px] truncate">
                {currentCustomer ? currentCustomer.fullName.split(' ')[0] : 'Perfil'}
              </span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};
