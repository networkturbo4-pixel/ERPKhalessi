import React, { useState, useEffect, useRef, useId } from 'react';
import { PaymentMethod } from '../../types/catalog';
import { AddressLabelType } from '../../types/storeCustomer';
import { useStoreCustomer, detectCardBrand } from '../../context/StoreCustomerContext';
import { useSettings } from '../../context/SettingsContext';
import { useBenefits } from '../../context/BenefitsContext';
import {
  User,
  X,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  CreditCard,
  Smartphone,
  Banknote,
  Plus,
  Trash2,
  CheckCircle2,
  LogOut,
  Home,
  Briefcase,
  LocateFixed,
  IdCard,
  Star,
} from 'lucide-react';
import { LoyaltyCardView } from '../benefits/LoyaltyCardView';

interface StoreCustomerProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  autoButtonContrast: boolean;
  currentDeliveryAddress: string;
  onApplyAddressToOrder: (streetAddress: string, reference?: string) => void;
  onRequestGpsAddress: () => void;
  isLocatingGps: boolean;
  isLightTheme?: boolean;
}

type AuthTab = 'login' | 'signup';
type ProfileSection = 'puntos' | 'datos' | 'direcciones' | 'pagos';

export const StoreCustomerProfileDrawer: React.FC<StoreCustomerProfileDrawerProps> = ({
  isOpen,
  onClose,
  accentColor,
  autoButtonContrast,
  currentDeliveryAddress,
  onApplyAddressToOrder,
  onRequestGpsAddress,
  isLocatingGps,
  isLightTheme = false,
}) => {
  const {
    currentCustomer,
    registerCustomer,
    loginCustomer,
    logoutCustomer,
    updateCustomerProfile,
    addCustomerAddress,
    removeCustomerAddress,
    setDefaultCustomerAddress,
    addRecurringPayment,
    removeRecurringPayment,
    setDefaultRecurringPayment,
  } = useStoreCustomer();

  const { openNoticeModal, dispatchToast } = useSettings();
  const { pointsConfig, rewards } = useBenefits();
  const isCardActive = pointsConfig.enabled && pointsConfig.status !== 'paused';

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const expHintId = useId();

  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [profileSection, setProfileSection] = useState<ProfileSection>(() =>
    pointsConfig.enabled && pointsConfig.status !== 'paused' ? 'puntos' : 'datos'
  );

  useEffect(() => {
    if (!isCardActive && profileSection === 'puntos') {
      setProfileSection('datos');
    }
  }, [isCardActive, profileSection]);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sign-in form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Sign-up form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupDni, setSignupDni] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPwd, setShowSignupPwd] = useState(false);

  // Edit personal data form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDni, setEditDni] = useState('');

  // New Address form state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addrLabel, setAddrLabel] = useState<AddressLabelType>('Casa');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrReference, setAddrReference] = useState('');
  const [addrMakeDefault, setAddrMakeDefault] = useState(true);

  // New Recurring Payment form state
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [pmType, setPmType] = useState<PaymentMethod>('tarjeta');
  const [ccNumber, setCcNumber] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccExp, setCcExp] = useState('');
  const [ccCsc, setCcCsc] = useState('');
  const [walletAlias, setWalletAlias] = useState('Yape Principal');
  const [walletPhone, setWalletPhone] = useState('');
  const [cashNote, setCashNote] = useState('Pago exacto');
  const [pmMakeDefault, setPmMakeDefault] = useState(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentCustomer) {
      setEditName(currentCustomer.fullName);
      setEditEmail(currentCustomer.email);
      setEditPhone(currentCustomer.phone);
      setEditDni(currentCustomer.dni);
      setWalletPhone(prev => prev || currentCustomer.phone);
      setCcName(prev => prev || currentCustomer.fullName);
    }
  }, [currentCustomer]);

  // Sync GPS address into new address textarea if user clicked GPS while adding an address
  useEffect(() => {
    if (isAddingAddress && currentDeliveryAddress && !addrStreet) {
      setAddrStreet(currentDeliveryAddress);
    }
  }, [addrStreet, currentDeliveryAddress, isAddingAddress]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await loginCustomer(loginIdentifier, loginPassword);
    if (!res.ok) {
      setAuthError(res.error || 'No se pudo iniciar sesión.');
      return;
    }
    setLoginPassword('');
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await registerCustomer({
      fullName: signupName,
      email: signupEmail,
      phone: signupPhone,
      dni: signupDni,
      password: signupPassword,
    });
    if (!res.ok) {
      setAuthError(res.error || 'No se pudo registrar la cuenta.');
      return;
    }
    setSignupPassword('');
  };

  const handleSavePersonalData = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateCustomerProfile({
      fullName: editName,
      email: editEmail,
      phone: editPhone,
      dni: editDni,
    });
    if (!res.ok && res.error) {
      dispatchToast('Revisa tus datos', res.error, 'warning');
    }
  };

  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet.trim()) return;
    const saved = addCustomerAddress({
      label: addrLabel,
      streetAddress: addrStreet.trim(),
      reference: addrReference.trim(),
      isDefault: addrMakeDefault,
    });
    if (saved.isDefault) {
      onApplyAddressToOrder(saved.streetAddress, saved.reference);
    }
    setAddrStreet('');
    setAddrReference('');
    setIsAddingAddress(false);
  };

  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pmType === 'tarjeta') {
      const digits = ccNumber.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) {
        dispatchToast('Tarjeta Inválida', 'Ingresa un número de tarjeta válido (13 a 19 dígitos).', 'warning');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(ccExp.trim())) {
        dispatchToast('Vencimiento Inválido', 'Usa el formato MM/AA (ejemplo: 08/29).', 'warning');
        return;
      }
      const brand = detectCardBrand(digits);
      const last4 = digits.slice(-4);
      addRecurringPayment({
        type: 'tarjeta',
        alias: `${brand} •••• ${last4}`,
        cardBrand: brand,
        cardLast4: last4,
        cardHolder: ccName.trim() || currentCustomer?.fullName || 'Titular',
        cardExpiry: ccExp.trim(),
        isDefault: pmMakeDefault,
      });
      setCcNumber('');
      setCcExp('');
      setCcCsc('');
      setIsAddingPayment(false);
      return;
    }

    if (pmType === 'yape_plin') {
      if (!walletPhone.trim()) {
        dispatchToast('Celular Requerido', 'Ingresa el celular afiliado a Yape o Plin.', 'warning');
        return;
      }
      addRecurringPayment({
        type: 'yape_plin',
        alias: walletAlias.trim() || 'Yape / Plin',
        walletPhone: walletPhone.trim(),
        isDefault: pmMakeDefault,
      });
      setIsAddingPayment(false);
      return;
    }

    addRecurringPayment({
      type: 'efectivo',
      alias: `Efectivo (${cashNote})`,
      cashNote,
      isDefault: pmMakeDefault,
    });
    setIsAddingPayment(false);
  };

  const formatExpiryInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const formatCardNumberInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={e => {
        e.currentTarget.returnValue = '';
        onClose();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
      }}
      className="store-responsive-drawer backdrop:bg-black/60 backdrop:backdrop-blur-xs"
    >
      {isOpen && (
        <div
          className={`rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l shadow-2xl flex flex-col max-h-[92svh] md:h-full md:max-h-none overflow-hidden transition-colors ${
            isLightTheme
              ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
              : 'bg-neutral-900 border-neutral-800 text-neutral-100'
          }`}
        >
          {/* Mobile Drag Handle (hidden on PC Off-Canvas) */}
          <div className="pt-3 pb-1 flex justify-center md:hidden">
            <div
              className={`w-11 h-1.5 rounded-full ${
                isLightTheme ? 'bg-zinc-300' : 'bg-neutral-700'
              }`}
            />
          </div>

          {/* Sticky Drawer Header */}
          <div
            className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
              isLightTheme ? 'bg-white border-zinc-200' : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                className="store-btn-solid w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm"
              >
                {currentCustomer ? (
                  currentCustomer.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="font-black text-base truncate">
                  {currentCustomer ? 'Mi Perfil' : 'Cuenta de Cliente'}
                </h2>
                <p
                  className={`text-[11px] truncate ${
                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                  }`}
                >
                  {currentCustomer
                    ? currentCustomer.email
                    : 'Guarda tus direcciones, pagos y sigue tus pedidos'}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar panel de perfil"
              onClick={onClose}
              className={`p-2 rounded-full transition-colors shrink-0 ${
                isLightTheme
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* BODY: AUTHENTICATION OR CUSTOMER ACCOUNT */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar safe-bottom-bar">
            {!currentCustomer ? (
              <div className="space-y-5">
                {/* Segmented Switch: Iniciar Sesión | Crear Cuenta */}
                <div
                  className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl border ${
                    isLightTheme ? 'bg-zinc-200/80 border-zinc-200' : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login');
                      setAuthError(null);
                    }}
                    data-auto-contrast={authTab === 'login' && autoButtonContrast ? 'true' : 'false'}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                      authTab === 'login'
                        ? 'store-btn-solid shadow-xs'
                        : isLightTheme
                        ? 'text-zinc-600 hover:text-zinc-900'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('signup');
                      setAuthError(null);
                    }}
                    data-auto-contrast={authTab === 'signup' && autoButtonContrast ? 'true' : 'false'}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                      authTab === 'signup'
                        ? 'store-btn-solid shadow-xs'
                        : isLightTheme
                        ? 'text-zinc-600 hover:text-zinc-900'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Crear Cuenta
                  </button>
                </div>

                {authError && (
                  <div
                    className={`p-3 rounded-2xl border text-xs font-bold ${
                      isLightTheme
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-rose-500/15 border-rose-500/35 text-rose-200'
                    }`}
                  >
                    {authError}
                  </div>
                )}

                {authTab === 'login' ? (
                  /* SIGN-IN FORM (follows autofill-sign-in-form) */
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="store-signin-username"
                        className="block text-xs font-bold text-neutral-300 mb-1.5"
                      >
                        Correo Electrónico o Celular
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          id="store-signin-username"
                          name="username"
                          type="text"
                          autoComplete="username"
                          spellCheck={false}
                          autoCapitalize="none"
                          autoCorrect="off"
                          enterKeyHint="next"
                          required
                          value={loginIdentifier}
                          onChange={e => setLoginIdentifier(e.target.value)}
                          placeholder="tucorreo@ejemplo.com o 999888777"
                          className={`w-full pl-10 pr-3.5 py-3 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                              : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="store-signin-password"
                        className={`block text-xs font-bold mb-1.5 ${
                          isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                        }`}
                      >
                        Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          id="store-signin-password"
                          name="password"
                          type={showLoginPwd ? 'text' : 'password'}
                          autoComplete="current-password"
                          enterKeyHint="done"
                          required
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="Ingresa tu contraseña"
                          className={`w-full pl-10 pr-11 py-3 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                              : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                          }`}
                        />
                        <button
                          type="button"
                          aria-label={showLoginPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          onClick={() => setShowLoginPwd(v => !v)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
                            isLightTheme ? 'text-zinc-400 hover:text-zinc-700' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                      className="store-btn-solid w-full py-3.5 px-5 rounded-2xl text-sm font-black shadow-md active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
                    >
                      Iniciar Sesión
                    </button>
                  </form>
                ) : (
                  /* SIGN-UP FORM (follows autofill-sign-up-form) */
                  <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="store-signup-fullname"
                        className={`block text-xs font-bold mb-1 ${
                          isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                        }`}
                      >
                        Nombre Completo *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          id="store-signup-fullname"
                          name="fullname"
                          type="text"
                          autoComplete="name"
                          enterKeyHint="next"
                          required
                          value={signupName}
                          onChange={e => setSignupName(e.target.value)}
                          placeholder="Ej: Valeria Mendoza"
                          className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                              : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="store-signup-email"
                        className={`block text-xs font-bold mb-1 ${
                          isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                        }`}
                      >
                        Correo Electrónico *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          id="store-signup-email"
                          name="email"
                          type="email"
                          autoComplete="username"
                          spellCheck={false}
                          enterKeyHint="next"
                          required
                          value={signupEmail}
                          onChange={e => setSignupEmail(e.target.value)}
                          placeholder="valeria@correo.com"
                          className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                              : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="store-signup-phone"
                          className={`block text-xs font-bold mb-1 ${
                            isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                          }`}
                        >
                          Celular / WhatsApp *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input
                            id="store-signup-phone"
                            name="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            enterKeyHint="next"
                            required
                            value={signupPhone}
                            onChange={e => setSignupPhone(e.target.value)}
                            placeholder="999 888 777"
                            className={`w-full pl-10 pr-3 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                              isLightTheme
                                ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="store-signup-dni"
                          className={`block text-xs font-bold mb-1 ${
                            isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                          }`}
                        >
                          DNI / Documento
                        </label>
                        <div className="relative">
                          <IdCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input
                            id="store-signup-dni"
                            name="dni"
                            type="text"
                            inputMode="numeric"
                            maxLength={12}
                            enterKeyHint="next"
                            value={signupDni}
                            onChange={e => setSignupDni(e.target.value)}
                            placeholder="Opcional"
                            className={`w-full pl-10 pr-3 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                              isLightTheme
                                ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="store-signup-new-password"
                        className={`block text-xs font-bold mb-1 ${
                          isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                        }`}
                      >
                        Crear Contraseña *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          id="store-signup-new-password"
                          name="new-password"
                          type={showSignupPwd ? 'text' : 'password'}
                          autoComplete="new-password"
                          minLength={4}
                          enterKeyHint="done"
                          required
                          value={signupPassword}
                          onChange={e => setSignupPassword(e.target.value)}
                          placeholder="Mínimo 4 caracteres"
                          className={`w-full pl-10 pr-11 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                              : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                          }`}
                        />
                        <button
                          type="button"
                          aria-label={showSignupPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          onClick={() => setShowSignupPwd(v => !v)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
                            isLightTheme ? 'text-zinc-400 hover:text-zinc-700' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {showSignupPwd ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                      className="store-btn-solid w-full py-3.5 px-5 rounded-2xl text-sm font-black shadow-md active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
                    >
                      Crear Cuenta
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* ==============================================================
                 AUTHENTICATED CUSTOMER PROFILE: DATOS + DIRECCIONES + PAGOS
                 ============================================================== */
              <div className="space-y-4">
                {/* Summary Banner */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    isLightTheme
                      ? 'bg-white border-zinc-200/90 shadow-xs'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="min-w-0">
                    <span
                      className={`text-sm font-black block truncate ${
                        isLightTheme ? 'text-zinc-900' : 'text-white'
                      }`}
                    >
                      {currentCustomer.fullName}
                    </span>
                    <span
                      className={`text-xs block truncate ${
                        isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                      }`}
                    >
                      {currentCustomer.phone} • {currentCustomer.addresses.length} dir. •{' '}
                      {currentCustomer.paymentMethods.length} pagos
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      openNoticeModal({
                        title: '¿Cerrar sesión de cliente?',
                        message:
                          'Tus direcciones y métodos de pago recurrentes seguirán guardados para cuando vuelvas a ingresar.',
                        tone: 'warning',
                        confirmLabel: 'Cerrar Sesión',
                        cancelLabel: 'Cancelar',
                        onConfirm: () => logoutCustomer(),
                      });
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      isLightTheme
                        ? 'bg-zinc-100 hover:bg-rose-50 text-zinc-600 hover:text-rose-600 border border-zinc-200/60'
                        : 'bg-neutral-800 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salir</span>
                  </button>
                </div>

                {/* Profile Sub-Tabs */}
                <div
                  className={`grid ${isCardActive ? 'grid-cols-4' : 'grid-cols-3'} gap-1 p-1 rounded-2xl border ${
                    isLightTheme
                      ? 'bg-zinc-200/80 border-zinc-200'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  {(
                    [
                      ...(isCardActive ? [['puntos', `Puntos (${currentCustomer.points || 0})`]] : []),
                      ['datos', 'Datos'],
                      ['direcciones', `Direc. (${currentCustomer.addresses.length})`],
                      ['pagos', `Pagos (${currentCustomer.paymentMethods.length})`],
                    ] as const
                  ).map(([secId, label]) => {
                    const active = profileSection === secId;
                    return (
                      <button
                        key={secId}
                        type="button"
                        onClick={() => setProfileSection(secId as ProfileSection)}
                        data-auto-contrast={active && autoButtonContrast ? 'true' : 'false'}
                        className={`py-2 px-1.5 rounded-xl text-[11px] font-black transition-all whitespace-nowrap shrink-0 truncate ${
                          active
                            ? 'store-btn-solid shadow-xs'
                            : isLightTheme
                            ? 'text-zinc-600 hover:text-zinc-900'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* SECTION 0: TARJETA DE PUNTOS Y PREMIOS */}
                {isCardActive && profileSection === 'puntos' && (
                  <div className="space-y-4">
                    <LoyaltyCardView
                      config={pointsConfig}
                      points={currentCustomer.points || 0}
                      rewardsCount={rewards.filter(r => r.isActive).length}
                    />

                    {/* Premios Disponibles */}
                    <div className="space-y-2">
                      <span
                        className={`text-xs font-black uppercase tracking-wider block ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        Premios del Programa ({rewards.filter(r => r.isActive).length})
                      </span>
                      {rewards
                        .filter(r => r.isActive)
                        .map(rew => {
                          const unlocked = (currentCustomer.points || 0) >= rew.pointsCost;
                          return (
                            <div
                              key={rew.id}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                unlocked
                                  ? isLightTheme
                                    ? 'bg-emerald-50/70 border-emerald-300 text-zinc-900 shadow-xs'
                                    : 'bg-neutral-950 border-emerald-500/40'
                                  : isLightTheme
                                  ? 'bg-white border-zinc-200 text-zinc-800 opacity-90 shadow-xs'
                                  : 'bg-neutral-950/60 border-neutral-800 opacity-80'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg shrink-0 ${
                                    isLightTheme
                                      ? 'bg-zinc-100 border-zinc-200 text-zinc-800'
                                      : 'bg-neutral-900 border-neutral-800'
                                  }`}
                                >
                                  {rew.badgeIcon}
                                </span>
                                <div className="min-w-0">
                                  <span
                                    className={`text-xs font-black block truncate ${
                                      isLightTheme ? 'text-zinc-900' : 'text-white'
                                    }`}
                                  >
                                    {rew.title}
                                  </span>
                                  <span
                                    className={`text-[11px] block truncate ${
                                      isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                                    }`}
                                  >
                                    {rew.description}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap shrink-0 ${
                                  unlocked
                                    ? isLightTheme
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : isLightTheme
                                    ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                                }`}
                              >
                                {unlocked ? `¡Listo! (${rew.pointsCost} pts)` : `${rew.pointsCost} pts`}
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    {/* Historial Reciente de Puntos */}
                    {currentCustomer.pointsHistory && currentCustomer.pointsHistory.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span
                          className={`text-xs font-black uppercase tracking-wider block ${
                            isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                          }`}
                        >
                          Últimos Movimientos
                        </span>
                        {currentCustomer.pointsHistory.slice(0, 5).map(mov => (
                          <div
                            key={mov.id}
                            className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs ${
                              isLightTheme
                                ? 'bg-white border-zinc-200 text-zinc-800 shadow-xs'
                                : 'bg-neutral-950 border-neutral-800'
                            }`}
                          >
                            <span className={`truncate ${isLightTheme ? 'text-zinc-700' : 'text-neutral-300'}`}>
                              {mov.reason}
                            </span>
                            <span
                              className={`font-black whitespace-nowrap shrink-0 ml-2 ${
                                mov.delta > 0
                                  ? isLightTheme ? 'text-emerald-600' : 'text-emerald-400'
                                  : isLightTheme ? 'text-amber-600' : 'text-amber-400'
                              }`}
                            >
                              {mov.delta > 0 ? `+${mov.delta} pto` : `${mov.delta} pts`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 1: MIS DATOS */}
                {profileSection === 'datos' && (
                  <form onSubmit={handleSavePersonalData} className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="prof-fullname"
                        className={`block text-xs font-bold mb-1 ${
                          isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                        }`}
                      >
                        Nombre Completo
                      </label>
                      <input
                        id="prof-fullname"
                        type="text"
                        autoComplete="name"
                        required
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                            : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="prof-email"
                        className={`block text-xs font-bold mb-1 ${
                          isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                        }`}
                      >
                        Correo Electrónico
                      </label>
                      <input
                        id="prof-email"
                        type="email"
                        autoComplete="email"
                        spellCheck={false}
                        required
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                            : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="prof-phone"
                          className={`block text-xs font-bold mb-1 ${
                            isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                          }`}
                        >
                          Celular / WhatsApp
                        </label>
                        <input
                          id="prof-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          required
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                              : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                          }`}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="prof-dni"
                          className={`block text-xs font-bold mb-1 ${
                            isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                          }`}
                        >
                          DNI / RUC
                        </label>
                        <input
                          id="prof-dni"
                          type="text"
                          inputMode="numeric"
                          maxLength={12}
                          value={editDni}
                          onChange={e => setEditDni(e.target.value)}
                          placeholder="8 o 11 dígitos"
                          className={`w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-amber-500 ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                              : 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500'
                          }`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                      className="store-btn-solid w-full py-3 px-5 rounded-2xl text-xs sm:text-sm font-black shadow-md active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
                    >
                      Guardar Mis Datos
                    </button>
                  </form>
                )}

                {/* SECTION 2: MIS DIRECCIONES */}
                {profileSection === 'direcciones' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        Direcciones de Entrega
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(v => !v)}
                        data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                        className="store-btn-solid px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAddingAddress ? 'Cancelar' : 'Agregar Dirección'}</span>
                      </button>
                    </div>

                    {isAddingAddress && (
                      /* ADDRESS FORM (follows autofill-address-form with <textarea autocomplete="street-address">) */
                      <form
                        onSubmit={handleAddAddressSubmit}
                        className={`p-4 rounded-2xl border space-y-3 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200/90 shadow-xs'
                            : 'bg-neutral-950 border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {(['Casa', 'Trabajo', 'Otro'] as const).map(lbl => (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => setAddrLabel(lbl)}
                              data-auto-contrast={
                                addrLabel === lbl && autoButtonContrast ? 'true' : 'false'
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${
                                addrLabel === lbl
                                  ? 'store-btn-solid border-transparent'
                                  : isLightTheme
                                  ? 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                                  : 'border-neutral-800 bg-neutral-900 text-neutral-300'
                              }`}
                            >
                              {lbl === 'Casa' ? (
                                <Home className="w-3.5 h-3.5" />
                              ) : lbl === 'Trabajo' ? (
                                <Briefcase className="w-3.5 h-3.5" />
                              ) : (
                                <MapPin className="w-3.5 h-3.5" />
                              )}
                              <span>{lbl}</span>
                            </button>
                          ))}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label
                              htmlFor="cust-street-address"
                              className={`text-xs font-bold ${
                                isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                              }`}
                            >
                              Dirección Completa *
                            </label>
                            <button
                              type="button"
                              disabled={isLocatingGps}
                              onClick={() => {
                                onRequestGpsAddress();
                                if (currentDeliveryAddress) {
                                   setAddrStreet(currentDeliveryAddress);
                                }
                              }}
                              className="text-[11px] font-bold inline-flex items-center gap-1 hover:underline"
                              style={{ color: accentColor }}
                            >
                              <LocateFixed className="w-3 h-3" />
                              <span>{isLocatingGps ? 'Detectando...' : 'Usar GPS'}</span>
                            </button>
                          </div>
                          <textarea
                            id="cust-street-address"
                            name="street-address"
                            autoComplete="street-address"
                            rows={2}
                            required
                            value={addrStreet}
                            onChange={e => setAddrStreet(e.target.value)}
                            placeholder="Ej: Av. Benavides 2450, Dpto 502, Miraflores"
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-amber-500 resize-none ${
                              isLightTheme
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="cust-address-ref"
                            className={`block text-xs font-bold mb-1 ${
                              isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                            }`}
                          >
                            Referencia (Piso, timbre, fachada)
                          </label>
                          <input
                            id="cust-address-ref"
                            type="text"
                            value={addrReference}
                            onChange={e => setAddrReference(e.target.value)}
                            placeholder="Ej: Frente al parque, recepción portón negro"
                            className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-amber-500 ${
                              isLightTheme
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                            }`}
                          />
                        </div>

                        <label
                          className={`flex items-center gap-2 text-xs cursor-pointer ${
                            isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={addrMakeDefault}
                            onChange={e => setAddrMakeDefault(e.target.checked)}
                            className="rounded accent-amber-500"
                          />
                          <span>Usar como dirección predeterminada</span>
                        </label>

                        <button
                          type="submit"
                          data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                          className="store-btn-solid w-full py-2.5 px-4 rounded-xl text-xs font-black whitespace-nowrap shrink-0 shadow-xs"
                        >
                          Guardar Dirección
                        </button>
                      </form>
                    )}

                    {currentCustomer.addresses.length === 0 && !isAddingAddress ? (
                      <div
                        className={`p-6 rounded-2xl border text-center space-y-1.5 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200 shadow-xs'
                            : 'bg-neutral-950 border-neutral-800'
                        }`}
                      >
                        <MapPin className="w-7 h-7 mx-auto text-zinc-400" />
                        <p
                          className={`text-xs font-bold ${
                            isLightTheme ? 'text-zinc-800' : 'text-neutral-200'
                          }`}
                        >
                          Aún no tienes direcciones guardadas
                        </p>
                        <p
                          className={`text-[11px] ${
                            isLightTheme ? 'text-zinc-500' : 'text-neutral-500'
                          }`}
                        >
                          Agrega tu casa u oficina para pedir en un toque sin volver a escribirla.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {currentCustomer.addresses.map(addr => (
                          <div
                            key={addr.id}
                            className={`p-3.5 rounded-2xl border space-y-2.5 ${
                              isLightTheme
                                ? 'bg-white border-zinc-200/90 text-zinc-900 shadow-xs'
                                : 'bg-neutral-950 border-neutral-800 text-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs font-black ${
                                      isLightTheme ? 'text-zinc-900' : 'text-white'
                                    }`}
                                  >
                                    {addr.label}
                                  </span>
                                  {addr.isDefault && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                                      Predeterminada
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-xs leading-snug ${
                                    isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                                  }`}
                                >
                                  {addr.streetAddress}
                                </p>
                                {addr.reference && (
                                  <p
                                    className={`text-[11px] ${
                                      isLightTheme ? 'text-zinc-400' : 'text-neutral-500'
                                    }`}
                                  >
                                    Ref: {addr.reference}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                aria-label="Eliminar dirección"
                                onClick={() => removeCustomerAddress(addr.id)}
                                className={`p-1.5 transition-colors shrink-0 ${
                                  isLightTheme
                                    ? 'text-zinc-400 hover:text-rose-600'
                                    : 'text-neutral-500 hover:text-rose-400'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div
                              className={`flex items-center gap-2 pt-2 border-t ${
                                isLightTheme ? 'border-zinc-100' : 'border-neutral-900'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  onApplyAddressToOrder(addr.streetAddress, addr.reference);
                                  setDefaultCustomerAddress(addr.id);
                                  dispatchToast(
                                    'Dirección Seleccionada',
                                    `Entregaremos en: ${addr.streetAddress}`,
                                    'success'
                                  );
                                }}
                                data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                                className="store-btn-solid px-3 py-1.5 rounded-xl text-[11px] font-black inline-flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Entregar Aquí</span>
                              </button>

                              {!addr.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => setDefaultCustomerAddress(addr.id)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                                    isLightTheme
                                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                                  }`}
                                >
                                  Hacer Principal
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 3: MÉTODOS DE PAGO RECURRENTES */}
                {profileSection === 'pagos' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                        }`}
                      >
                        Métodos Recurrentes
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingPayment(v => !v)}
                        data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                        className="store-btn-solid px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAddingPayment ? 'Cancelar' : 'Agregar Método'}</span>
                      </button>
                    </div>

                    {isAddingPayment && (
                      /* PAYMENT FORM (follows autofill-payment-form) */
                      <form
                        onSubmit={handleAddPaymentSubmit}
                        className={`p-4 rounded-2xl border space-y-3.5 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200/90 shadow-xs'
                            : 'bg-neutral-950 border-neutral-800'
                        }`}
                      >
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              ['tarjeta', 'Tarjeta', CreditCard],
                              ['yape_plin', 'Yape / Plin', Smartphone],
                              ['efectivo', 'Efectivo', Banknote],
                            ] as const
                          ).map(([tKey, tLabel, Icon]) => (
                            <button
                              key={tKey}
                              type="button"
                              onClick={() => setPmType(tKey)}
                              data-auto-contrast={
                                pmType === tKey && autoButtonContrast ? 'true' : 'false'
                              }
                              className={`p-2.5 rounded-xl border text-[11px] font-black flex flex-col items-center gap-1 whitespace-nowrap shrink-0 ${
                                pmType === tKey
                                  ? 'store-btn-solid border-transparent'
                                  : isLightTheme
                                  ? 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                                  : 'border-neutral-800 bg-neutral-900 text-neutral-300'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{tLabel}</span>
                            </button>
                          ))}
                        </div>

                        {pmType === 'tarjeta' && (
                          <div className="space-y-3">
                            <div>
                              <label
                                htmlFor="cc-number"
                                className={`block text-xs font-bold mb-1 ${
                                  isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                                }`}
                              >
                                Número de Tarjeta *
                              </label>
                              <input
                                id="cc-number"
                                name="cc-number"
                                type="text"
                                autoComplete="cc-number"
                                inputMode="numeric"
                                maxLength={19}
                                pattern="[\d ]{13,19}"
                                required
                                value={ccNumber}
                                onChange={e => setCcNumber(formatCardNumberInput(e.target.value))}
                                placeholder="4557 8800 1234 5678"
                                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:border-amber-500 ${
                                  isLightTheme
                                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                    : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                                }`}
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="cc-name"
                                className={`block text-xs font-bold mb-1 ${
                                  isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                                }`}
                              >
                                Nombre en la Tarjeta *
                              </label>
                              <input
                                id="cc-name"
                                name="cc-name"
                                type="text"
                                autoComplete="cc-name"
                                maxLength={50}
                                required
                                value={ccName}
                                onChange={e => setCcName(e.target.value)}
                                placeholder="Como figura en tu tarjeta"
                                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-amber-500 ${
                                  isLightTheme
                                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                    : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                                }`}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label
                                  htmlFor="cc-exp"
                                  className={`block text-xs font-bold ${
                                    isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                                  }`}
                                >
                                  Vencimiento *
                                </label>
                                {/* Format hint ABOVE input per autofill-payment-form */}
                                <span
                                  id={expHintId}
                                  className={`block text-[10px] mb-1 ${
                                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                                  }`}
                                >
                                  Formato: MM/AA
                                </span>
                                <input
                                  id="cc-exp"
                                  name="cc-exp"
                                  type="text"
                                  autoComplete="cc-exp"
                                  aria-describedby={expHintId}
                                  inputMode="numeric"
                                  maxLength={5}
                                  required
                                  value={ccExp}
                                  onChange={e => setCcExp(formatExpiryInput(e.target.value))}
                                  placeholder="08/29"
                                  className={`w-full px-3.5 py-2 rounded-xl text-sm font-mono border focus:outline-none focus:border-amber-500 ${
                                    isLightTheme
                                      ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                      : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                                  }`}
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor="cc-csc"
                                  className={`block text-xs font-bold ${
                                    isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                                  }`}
                                >
                                  CVV *
                                </label>
                                <span
                                  className={`block text-[10px] mb-1 ${
                                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                                  }`}
                                >
                                  3 o 4 dígitos
                                </span>
                                <input
                                  id="cc-csc"
                                  name="cc-csc"
                                  type="text"
                                  autoComplete="cc-csc"
                                  inputMode="numeric"
                                  maxLength={4}
                                  pattern="[0-9]{3,4}"
                                  required
                                  value={ccCsc}
                                  onChange={e =>
                                    setCcCsc(e.target.value.replace(/\D/g, '').slice(0, 4))
                                  }
                                  placeholder="123"
                                  className={`w-full px-3.5 py-2 rounded-xl text-sm font-mono border focus:outline-none focus:border-amber-500 ${
                                    isLightTheme
                                      ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                      : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {pmType === 'yape_plin' && (
                          <div className="space-y-3">
                            <div>
                              <label
                                htmlFor="pm-wallet-alias"
                                className={`block text-xs font-bold mb-1 ${
                                  isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                                }`}
                              >
                                Etiqueta de Billetera
                              </label>
                              <input
                                id="pm-wallet-alias"
                                type="text"
                                value={walletAlias}
                                onChange={e => setWalletAlias(e.target.value)}
                                placeholder="Ej: Yape Personal / Plin BCP"
                                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-amber-500 ${
                                  isLightTheme
                                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                    : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                                }`}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="pm-wallet-phone"
                                className={`block text-xs font-bold mb-1 ${
                                  isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                                }`}
                              >
                                Celular Afiliado *
                              </label>
                              <input
                                id="pm-wallet-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                required
                                value={walletPhone}
                                onChange={e => setWalletPhone(e.target.value)}
                                placeholder="999 888 777"
                                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-amber-500 ${
                                  isLightTheme
                                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                    : 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                                }`}
                              />
                            </div>
                          </div>
                        )}

                        {pmType === 'efectivo' && (
                          <div>
                            <label
                              htmlFor="pm-cash-note"
                              className={`block text-xs font-bold mb-1 ${
                                isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                              }`}
                            >
                              Preferencia de Efectivo
                            </label>
                            <select
                              id="pm-cash-note"
                              value={cashNote}
                              onChange={e => setCashNote(e.target.value)}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-amber-500 ${
                                isLightTheme
                                  ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                                  : 'bg-neutral-900 border-neutral-800 text-white'
                              }`}
                            >
                              <option value="Pago exacto">Pago exacto</option>
                              <option value="Billete de S/ 50">Pagar con billete de S/ 50</option>
                              <option value="Billete de S/ 100">Pagar con billete de S/ 100</option>
                              <option value="Billete de S/ 200">Pagar con billete de S/ 200</option>
                            </select>
                          </div>
                        )}

                        <label
                          className={`flex items-center gap-2 text-xs cursor-pointer ${
                            isLightTheme ? 'text-zinc-700' : 'text-neutral-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={pmMakeDefault}
                            onChange={e => setPmMakeDefault(e.target.checked)}
                            className="rounded accent-amber-500"
                          />
                          <span>Preseleccionar automáticamente en mis pedidos</span>
                        </label>

                        <button
                          type="submit"
                          data-auto-contrast={autoButtonContrast ? 'true' : 'false'}
                          className="store-btn-solid w-full py-2.5 px-4 rounded-xl text-xs font-black whitespace-nowrap shrink-0 shadow-xs"
                        >
                          Guardar Método Recurrente
                        </button>
                      </form>
                    )}

                    {currentCustomer.paymentMethods.length === 0 && !isAddingPayment ? (
                      <div
                        className={`p-6 rounded-2xl border text-center space-y-1.5 ${
                          isLightTheme
                            ? 'bg-white border-zinc-200 shadow-xs'
                            : 'bg-neutral-950 border-neutral-800'
                        }`}
                      >
                        <CreditCard className="w-7 h-7 mx-auto text-zinc-400" />
                        <p
                          className={`text-xs font-bold ${
                            isLightTheme ? 'text-zinc-800' : 'text-neutral-200'
                          }`}
                        >
                          Sin métodos de pago recurrentes
                        </p>
                        <p
                          className={`text-[11px] ${
                            isLightTheme ? 'text-zinc-500' : 'text-neutral-500'
                          }`}
                        >
                          Vincula tu tarjeta habitual, Yape/Plin o preferencia de efectivo para un
                          checkout instantáneo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {currentCustomer.paymentMethods.map(pm => (
                          <div
                            key={pm.id}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                              isLightTheme
                                ? 'bg-white border-zinc-200/90 text-zinc-900 shadow-xs'
                                : 'bg-neutral-950 border-neutral-800 text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                                  isLightTheme
                                    ? 'bg-zinc-100 border-zinc-200'
                                    : 'bg-neutral-900 border-neutral-800'
                                }`}
                              >
                                {pm.type === 'tarjeta' ? (
                                  <CreditCard className="w-5 h-5 text-blue-500" />
                                ) : pm.type === 'yape_plin' ? (
                                  <Smartphone className="w-5 h-5 text-purple-500" />
                                ) : (
                                  <Banknote className="w-5 h-5 text-emerald-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs font-black truncate ${
                                      isLightTheme ? 'text-zinc-900' : 'text-white'
                                    }`}
                                  >
                                    {pm.alias}
                                  </span>
                                  {pm.isDefault && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black inline-flex items-center gap-1 border border-emerald-500/20">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      <span>Principal</span>
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-[11px] truncate ${
                                    isLightTheme ? 'text-zinc-500' : 'text-neutral-400'
                                  }`}
                                >
                                  {pm.type === 'tarjeta'
                                    ? `${pm.cardHolder || ''} • Vence ${pm.cardExpiry || ''}`
                                    : pm.type === 'yape_plin'
                                    ? `Afiliado: ${pm.walletPhone || ''}`
                                    : pm.cashNote || 'Efectivo contraentrega'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!pm.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => setDefaultRecurringPayment(pm.id)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                                    isLightTheme
                                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                                  }`}
                                >
                                  Predeterminar
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label="Eliminar método de pago"
                                onClick={() => removeRecurringPayment(pm.id)}
                                className={`p-1.5 transition-colors ${
                                  isLightTheme
                                    ? 'text-zinc-400 hover:text-rose-600'
                                    : 'text-neutral-500 hover:text-rose-400'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
};
