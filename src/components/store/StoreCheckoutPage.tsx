import React, { useState, useId } from 'react';
import { Tenant, CompanyInfo, TenantCustomization } from '../../types/settings';
import { OrderItem, PaymentMethod } from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { useBenefits } from '../../context/BenefitsContext';
import { useSettings } from '../../context/SettingsContext';
import { lookupPersonByDni } from '../../utils/dniLookup';
import { isRealCulqiPublicKey, openOfficialCulqiCheckout } from '../../utils/culqiCheckout';
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Bike,
  Store as StoreIcon,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  Sparkles,
  Tag,
  User,
  Phone,
  Mail,
  ChevronRight,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';

interface StoreCheckoutPageProps {
  onBackToStore: () => void;
  cartItems: OrderItem[];
  cartSubtotal: number;
  clearCart: () => void;
  activeTenant: Tenant;
  tenants: Tenant[];
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress: string;
  resolvedDeliveryFee: number;
  onOpenLocationModal: () => void;
  onOrderConfirmed: (orderData: {
    orderId: string;
    orderNumber: string;
    total: number;
    pointsEarned?: number;
    culqiReference?: string;
  }) => void;
  onOpenCulqiSandbox: (pendingData: any) => void;
  customization: TenantCustomization;
  companyInfo: CompanyInfo;
  isLightTheme?: boolean;
}

export const StoreCheckoutPage: React.FC<StoreCheckoutPageProps> = ({
  onBackToStore,
  cartItems,
  cartSubtotal,
  clearCart,
  activeTenant,
  tenants,
  deliveryType,
  deliveryAddress,
  resolvedDeliveryFee,
  onOpenLocationModal,
  onOrderConfirmed,
  onOpenCulqiSandbox,
  customization,
  companyInfo,
  isLightTheme = true,
}) => {
  const { createOrder } = useOrderCatalog();
  const { currentCustomer, awardCustomerPoints } = useStoreCustomer();
  const { coupons, pointsConfig, registerCouponUsage } = useBenefits();
  const { dispatchToast, openNoticeModal } = useSettings();

  const accentColor = customization.primaryColor || '#e11d48';

  // Customer Contact Fields
  const [customerName, setCustomerName] = useState(currentCustomer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(currentCustomer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(currentCustomer?.email || '');
  const [isLookingUpDni, setIsLookingUpDni] = useState(false);

  // Delivery Specifics
  const [deliveryReference, setDeliveryReference] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('culqi');
  const [cashBillAmount, setCashBillAmount] = useState<string>('exact'); // 'exact' | '50' | '100' | 'custom'
  const [cashCustomAmount, setCashCustomAmount] = useState<string>('');
  const [yapeOperationCode, setYapeOperationCode] = useState('');

  // Invoicing (Boleta / Factura)
  const [invoiceType, setInvoiceType] = useState<'boleta_simple' | 'boleta_dni' | 'factura_ruc'>('boleta_simple');
  const [invoiceDocument, setInvoiceDocument] = useState(currentCustomer?.dni || '');
  const [invoiceBusinessName, setInvoiceBusinessName] = useState('');
  const [invoiceFiscalAddress, setInvoiceFiscalAddress] = useState('');

  // Coupon Code
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountSoles: number } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate discounts
  const discountSoles = appliedCoupon ? appliedCoupon.discountSoles : 0;
  const payableTotal = Math.max(0, cartSubtotal + (deliveryType === 'delivery' ? resolvedDeliveryFee : 0) - discountSoles);

  // RENIEC / DNI Lookup helper
  const handleDniLookup = async () => {
    const clean = invoiceDocument.replace(/\D/g, '');
    if (clean.length !== 8) {
      dispatchToast('DNI Inválido', 'Ingresa 8 dígitos para consultar RENIEC.', 'warning');
      return;
    }
    setIsLookingUpDni(true);
    try {
      const res = await lookupPersonByDni(clean, []);
      if (res && res.fullName) {
        if (!customerName) setCustomerName(res.fullName);
        dispatchToast('DNI Verificado', `Titular: ${res.fullName}`, 'success');
      } else {
        dispatchToast('No Encontrado', 'No se obtuvo respuesta de RENIEC. Ingresa tu nombre manualmente.', 'info');
      }
    } catch {
      dispatchToast('Error de Conexión', 'No se pudo consultar RENIEC.', 'warning');
    } finally {
      setIsLookingUpDni(false);
    }
  };

  // Apply coupon
  const handleApplyCoupon = () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;
    const found = coupons.find(c => c.code.toUpperCase() === code && c.isActive);
    if (!found) {
      dispatchToast('Cupón no válido', 'El código ingresado no existe o expiró.', 'warning');
      return;
    }
    let disc = 0;
    if (found.discountType === 'percentage') {
      disc = (cartSubtotal * found.discountValue) / 100;
    } else {
      disc = found.discountValue;
    }
    disc = Math.min(disc, cartSubtotal);
    setAppliedCoupon({ code: found.code, discountSoles: disc });
    dispatchToast('¡Cupón Aplicado!', `Descuento de S/ ${disc.toFixed(2)} activado.`, 'success');
  };

  // Order submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      dispatchToast('Datos Requeridos', 'Ingresa tu nombre y celular para confirmar el pedido.', 'warning');
      return;
    }

    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      dispatchToast('Dirección Requerida', 'Selecciona tu dirección de entrega en el mapa.', 'warning');
      return;
    }

    if (invoiceType === 'boleta_dni' && invoiceDocument.replace(/\D/g, '').length !== 8) {
      dispatchToast('DNI Inválido', 'Ingresa un DNI válido de 8 dígitos.', 'warning');
      return;
    }

    if (invoiceType === 'factura_ruc' && (invoiceDocument.replace(/\D/g, '').length !== 11 || !invoiceBusinessName.trim())) {
      dispatchToast('Datos de Factura', 'Ingresa un RUC de 11 dígitos y la Razón Social.', 'warning');
      return;
    }

    setIsSubmitting(true);

    // Culqi Checkout Integration
    if (paymentMethod === 'culqi' && payableTotal > 0) {
      const culqiCfg = companyInfo.culqiConfig;
      if (culqiCfg && isRealCulqiPublicKey(culqiCfg.publicKey)) {
        const res = await openOfficialCulqiCheckout({
          config: culqiCfg,
          storeTitle: companyInfo.commercialName || customization.appName,
          amountSoles: payableTotal,
          accentColor,
          logoUrl: customization.storeHeaderLogo || customization.logoDark,
        });

        if (!res.ok) {
          setIsSubmitting(false);
          dispatchToast('Pago Cancelado', res.errorMessage || 'No se completó el pago en Culqi.', 'warning');
          return;
        }

        finalizeOrder({ culqiReference: res.referenceId, isPaid: true });
        return;
      }

      // If demo or sandbox key, open sandbox dialog
      setIsSubmitting(false);
      onOpenCulqiSandbox({
        amount: payableTotal,
        customerName,
        customerPhone,
        onSuccess: (refId: string) => finalizeOrder({ culqiReference: refId, isPaid: true }),
      });
      return;
    }

    finalizeOrder({ isPaid: paymentMethod === 'yape_plin' });
  };

  const finalizeOrder = (opts?: { culqiReference?: string; isPaid?: boolean }) => {
    const isAutoPaid = opts?.isPaid ?? false;

    let finalNotes = orderNotes.trim();
    if (paymentMethod === 'efectivo') {
      const cashText = cashBillAmount === 'exact' ? 'Monto exacto' : `Paga con S/ ${cashBillAmount === 'custom' ? cashCustomAmount : cashBillAmount}`;
      finalNotes = finalNotes ? `${finalNotes} | [Efectivo: ${cashText}]` : `[Efectivo: ${cashText}]`;
    } else if (paymentMethod === 'yape_plin' && yapeOperationCode.trim()) {
      finalNotes = finalNotes ? `${finalNotes} | [Op. Yape: ${yapeOperationCode.trim()}]` : `[Op. Yape: ${yapeOperationCode.trim()}]`;
    }

    const willEarnPoints =
      Boolean(currentCustomer) && pointsConfig.enabled && cartSubtotal >= pointsConfig.minPurchaseAmountForPoint
        ? pointsConfig.pointsPerPurchase
        : 0;

    const newOrder = createOrder({
      channel: 'online',
      tenantId: activeTenant.id,
      customerId: currentCustomer?.crmCustomerId,
      customerDni: invoiceType === 'boleta_dni' && invoiceDocument.trim() ? invoiceDocument.trim() : currentCustomer?.dni || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || currentCustomer?.email || undefined,
      deliveryAddress: deliveryType === 'delivery' ? deliveryAddress.trim() : `Para Llevar — Recojo en ${activeTenant.name}`,
      deliveryReference: deliveryReference.trim() || undefined,
      paymentMethod,
      paymentStatus: isAutoPaid ? 'pagado' : 'pendiente',
      culqiReference: opts?.culqiReference,
      invoiceType,
      invoiceDocument: invoiceType !== 'boleta_simple' && invoiceDocument.trim() ? invoiceDocument.trim() : undefined,
      invoiceBusinessName: invoiceType === 'factura_ruc' && invoiceBusinessName.trim() ? invoiceBusinessName.trim() : undefined,
      invoiceFiscalAddress: invoiceType === 'factura_ruc' && invoiceFiscalAddress.trim() ? invoiceFiscalAddress.trim() : undefined,
      couponCode: appliedCoupon?.code,
      pointsEarned: willEarnPoints > 0 ? willEarnPoints : undefined,
      items: cartItems,
      subtotal: cartSubtotal,
      deliveryFee: deliveryType === 'delivery' ? resolvedDeliveryFee : 0,
      discount: discountSoles,
      total: payableTotal,
      estimatedMinutes: deliveryType === 'delivery' ? 35 : 20,
    });

    if (appliedCoupon) {
      registerCouponUsage(appliedCoupon.code);
    }

    if (willEarnPoints > 0) {
      awardCustomerPoints(willEarnPoints, `Compra Web ${newOrder.orderNumber}`, newOrder.orderNumber);
    }

    clearCart();
    setIsSubmitting(false);

    onOrderConfirmed({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      total: newOrder.total,
      pointsEarned: willEarnPoints > 0 ? willEarnPoints : undefined,
      culqiReference: opts?.culqiReference,
    });
  };

  return (
    <div className={`min-h-screen ${isLightTheme ? 'bg-zinc-50 text-zinc-900' : 'bg-neutral-950 text-white'} pb-16`}>
      {/* Top Header Bar */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${isLightTheme ? 'bg-white/90 border-zinc-200' : 'bg-neutral-900/90 border-neutral-800'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToStore}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              isLightTheme ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </button>

          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex flex-col items-center justify-center text-white shrink-0 shadow-sm">
              <span className="text-[7px] font-black leading-tight">PIZZA</span>
              <span className="text-[5px] font-bold tracking-tighter opacity-90">KHALESSI</span>
            </div>
            <span className="font-black text-sm sm:text-base tracking-tight hidden sm:inline">
              Finalizar Pedido
            </span>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold whitespace-nowrap shrink-0">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden md:inline">Checkout Seguro</span>
          </div>
        </div>
      </header>

      {/* Main Content: 2-Column Responsive Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Step by step easy checkout */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Entrega o Recojo */}
            <div className={`p-5 rounded-3xl border shadow-sm ${isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'}`}>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-neutral-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <h3 className="font-black text-sm sm:text-base">Punto de Entrega</h3>
                </div>
                <button
                  type="button"
                  onClick={onOpenLocationModal}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Cambiar en el mapa</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${isLightTheme ? 'bg-zinc-50 border-zinc-200' : 'bg-neutral-950 border-neutral-800'}`}>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    {deliveryType === 'delivery' ? <Bike className="w-5 h-5" /> : <StoreIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
                      {deliveryType === 'delivery' ? 'Envío a Domicilio' : 'Retiro en Local'}
                    </span>
                    <h4 className="font-black text-xs sm:text-sm truncate">
                      {activeTenant.name.replace('Khalessi Pizza - ', '')}
                    </h4>
                    <p className={`text-xs truncate ${isLightTheme ? 'text-zinc-500' : 'text-neutral-400'}`}>
                      {deliveryType === 'delivery' ? deliveryAddress || 'Dirección seleccionada en mapa' : activeTenant.operations?.address}
                    </p>
                  </div>
                </div>

                {deliveryType === 'delivery' && (
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Referencia o N° de Dpto / Timbre (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Dpto 302, Timbre B, dejar en portería"
                      value={deliveryReference}
                      onChange={e => setDeliveryReference(e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all ${
                        isLightTheme ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Datos de Contacto */}
            <div className={`p-5 rounded-3xl border shadow-sm ${isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'}`}>
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-neutral-800 mb-4">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs">
                  2
                </div>
                <h3 className="font-black text-sm sm:text-base">Datos de Contacto</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Nombre y Apellidos *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre completo"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all ${
                        isLightTheme ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Teléfono Celular / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="tel"
                      required
                      placeholder="987 654 321"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all ${
                        isLightTheme ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Correo Electrónico (Opcional para recibo)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="tu-correo@ejemplo.com"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all ${
                        isLightTheme ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Método de Pago */}
            <div className={`p-5 rounded-3xl border shadow-sm ${isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'}`}>
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-neutral-800 mb-4">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs">
                  3
                </div>
                <h3 className="font-black text-sm sm:text-base">Método de Pago</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {/* Culqi Online Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('culqi')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    paymentMethod === 'culqi'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm'
                      : isLightTheme
                      ? 'border-zinc-200 hover:border-zinc-300 bg-white'
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <CreditCard className={`w-5 h-5 ${paymentMethod === 'culqi' ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`} />
                    {paymentMethod === 'culqi' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
                  </div>
                  <div>
                    <span className="block font-black text-xs sm:text-sm">Tarjeta Online</span>
                    <span className="text-[10px] text-zinc-500 dark:text-neutral-400">Crédito o Débito</span>
                  </div>
                </button>

                {/* Yape / Plin */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('yape_plin')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    paymentMethod === 'yape_plin'
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm'
                      : isLightTheme
                      ? 'border-zinc-200 hover:border-zinc-300 bg-white'
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <QrCode className={`w-5 h-5 ${paymentMethod === 'yape_plin' ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'}`} />
                    {paymentMethod === 'yape_plin' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div>
                    <span className="block font-black text-xs sm:text-sm">Yape / Plin</span>
                    <span className="text-[10px] text-zinc-500 dark:text-neutral-400">Transferencia rápida</span>
                  </div>
                </button>

                {/* Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    paymentMethod === 'efectivo'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                      : isLightTheme
                      ? 'border-zinc-200 hover:border-zinc-300 bg-white'
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <Banknote className={`w-5 h-5 ${paymentMethod === 'efectivo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`} />
                    {paymentMethod === 'efectivo' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div>
                    <span className="block font-black text-xs sm:text-sm">Efectivo</span>
                    <span className="text-[10px] text-zinc-500 dark:text-neutral-400">Contra entrega</span>
                  </div>
                </button>
              </div>

              {/* Payment Details Accordion */}
              {paymentMethod === 'yape_plin' && (
                <div className={`p-4 rounded-2xl border space-y-3 ${isLightTheme ? 'bg-purple-50/60 border-purple-200 text-purple-900' : 'bg-purple-950/30 border-purple-800 text-purple-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Número Yape de la Sede:</span>
                    <span className="font-black text-sm tracking-wider">{activeTenant.operations?.yapeNumber || '987 654 321'}</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">
                      Código de Operación o últimos 4 dígitos (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 849201"
                      value={yapeOperationCode}
                      onChange={e => setYapeOperationCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-purple-200 dark:border-purple-800"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'efectivo' && (
                <div className={`p-4 rounded-2xl border space-y-3 ${isLightTheme ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-emerald-950/30 border-emerald-800 text-emerald-200'}`}>
                  <span className="text-xs font-bold block">¿Con cuánto vas a pagar? (Para que el repartidor lleve tu vuelto):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'exact', label: 'Monto exacto' },
                      { id: '50', label: 'Con S/ 50' },
                      { id: '100', label: 'Con S/ 100' },
                      { id: 'custom', label: 'Otro billete' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCashBillAmount(opt.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${
                          cashBillAmount === opt.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-neutral-900 border-zinc-200 dark:border-neutral-700 text-zinc-700 dark:text-neutral-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {cashBillAmount === 'custom' && (
                    <input
                      type="number"
                      placeholder="Ingresa con cuánto pagarás (ej: 70)"
                      value={cashCustomAmount}
                      onChange={e => setCashCustomAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Comprobante y Notas */}
            <div className={`p-5 rounded-3xl border shadow-sm ${isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'}`}>
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-neutral-800 mb-4">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs">
                  4
                </div>
                <h3 className="font-black text-sm sm:text-base">Comprobante y Notas</h3>
              </div>

              {/* Comprobante Switcher */}
              <div className="space-y-3 mb-4">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Tipo de Comprobante</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'boleta_simple', label: 'Boleta Simple' },
                    { id: 'boleta_dni', label: 'Boleta con DNI' },
                    { id: 'factura_ruc', label: 'Factura con RUC' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setInvoiceType(opt.id as any)}
                      className={`py-2 px-2 text-center text-xs font-bold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                        invoiceType === opt.id
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : isLightTheme
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-600'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {invoiceType === 'boleta_dni' && (
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="DNI (8 dígitos)"
                      value={invoiceDocument}
                      onChange={e => setInvoiceDocument(e.target.value)}
                      className={`flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                        isLightTheme ? 'bg-zinc-50 border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleDniLookup}
                      disabled={isLookingUpDni}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 whitespace-nowrap shrink-0"
                    >
                      {isLookingUpDni ? 'Buscando...' : 'Consultar RENIEC'}
                    </button>
                  </div>
                )}

                {invoiceType === 'factura_ruc' && (
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="RUC (11 dígitos)"
                      value={invoiceDocument}
                      onChange={e => setInvoiceDocument(e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                        isLightTheme ? 'bg-zinc-50 border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Razón Social"
                      value={invoiceBusinessName}
                      onChange={e => setInvoiceBusinessName(e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                        isLightTheme ? 'bg-zinc-50 border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Dirección Fiscal"
                      value={invoiceFiscalAddress}
                      onChange={e => setInvoiceFiscalAddress(e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                        isLightTheme ? 'bg-zinc-50 border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Instrucciones Especiales para Cocina / Repartidor
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Poco orégano, salsa de ajo adicional, tocar timbre 2 veces..."
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                    isLightTheme ? 'bg-zinc-50 border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Sticky Order Summary & Big Action Button */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className={`p-6 rounded-3xl border shadow-lg ${isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'}`}>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-rose-500" />
                  <h3 className="font-black text-base">Resumen del Pedido</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-neutral-800 text-zinc-600 dark:text-neutral-400">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)} productos
                </span>
              </div>

              {/* Cart Items List */}
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1 mb-4">
                {cartItems.map(item => (
                  <div key={item.itemId} className="flex items-center gap-3 text-xs">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-neutral-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-neutral-800 flex items-center justify-center text-lg shrink-0">
                        🍕
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold truncate">{item.productName}</span>
                        <span className="font-black whitespace-nowrap shrink-0">
                          S/ {(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 dark:text-neutral-400 block">
                        Cant: {item.quantity} · {item.size?.name || 'Estándar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Input */}
              <div className="pb-4 border-b border-zinc-200 dark:border-neutral-800 mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Código de cupón o descuento"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value)}
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border uppercase tracking-wider font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      isLightTheme ? 'bg-zinc-50 border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 whitespace-nowrap shrink-0"
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs mb-5">
                <div className="flex justify-between text-zinc-500 dark:text-neutral-400">
                  <span>Subtotal</span>
                  <span>S/ {cartSubtotal.toFixed(2)}</span>
                </div>

                {discountSoles > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Descuento aplicado</span>
                    <span>- S/ {discountSoles.toFixed(2)}</span>
                  </div>
                )}

                {deliveryType === 'delivery' && (
                  <div className="flex justify-between text-zinc-500 dark:text-neutral-400">
                    <span>Costo de Envío</span>
                    <span className="font-bold">
                      {resolvedDeliveryFee === 0 ? 'GRATIS' : `S/ ${resolvedDeliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black pt-3 border-t border-zinc-200 dark:border-neutral-800 text-zinc-950 dark:text-white">
                  <span>Total a Pagar</span>
                  <span style={{ color: accentColor }}>
                    S/ {payableTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Estimated Delivery Time Guaranteed */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Tiempo estimado: {deliveryType === 'delivery' ? '25 - 40 min' : '15 - 20 min'} · Pizza recién horneada</span>
              </div>

              {/* Big CTA Button */}
              <button
                type="submit"
                disabled={isSubmitting || cartItems.length === 0}
                className="w-full py-4 px-6 rounded-2xl text-white font-black text-sm sm:text-base shadow-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-between whitespace-nowrap shrink-0 disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                <span>{isSubmitting ? 'Procesando Pedido...' : 'Confirmar y Pedir Ahora'}</span>
                <span className="font-black tracking-tight">S/ {payableTotal.toFixed(2)} →</span>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};
