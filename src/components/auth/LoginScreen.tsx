import React, { useState, useEffect, useRef, useId } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useHR } from '../../context/HRContext';
import { User } from '../../types/settings';
import { AttendanceEventType } from '../../types/hr';
import { soundSynth } from '../../utils/audio';
import { ToastContainer } from '../common/ToastContainer';
import { SystemNoticeModal } from '../common/SystemNoticeModal';
import {
  Delete,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Store,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  KeyRound,
  Clock,
} from 'lucide-react';

const KEYPAD_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

type LoginPanelMode = 'login' | 'totp_unlock' | 'attendance_kiosk';

const EVENT_OPTIONS: Array<{ id: AttendanceEventType; label: string }> = [
  { id: 'check_in', label: 'Entrada' },
  { id: 'break_start', label: 'Refrigerio' },
  { id: 'break_end', label: 'Retorno' },
  { id: 'check_out', label: 'Salida' },
];

export const LoginScreen: React.FC<{ onNavigateToStore?: () => void }> = ({ onNavigateToStore }) => {
  const {
    customization,
    updateCustomization,
    isDarkResolved,
    companyInfo,
    tenants,
    activeTenant,
    users,
    verifyLoginCredentials,
    completeAuthenticatedSession,
    logAuditEvent,
  } = useSettings();

  const {
    shouldGateLoginByAttendance,
    hasActiveAttendanceToday,
    verifyGoogleAuthenticatorUnlock,
    clockAttendance,
    securityPolicy,
  } = useHR();

  const [panelMode, setPanelMode] = useState<LoginPanelMode>('login');
  const [code, setCode] = useState('');
  const [showDigits, setShowDigits] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attendance Gate & Google Authenticator Unlock State
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');

  // Store Biometric / Attendance Kiosk State
  const [kioskEvent, setKioskEvent] = useState<AttendanceEventType>('check_in');
  const [kioskBranchId, setKioskBranchId] = useState<string>(activeTenant.id);

  // Right Carousel State
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const totpInputRef = useRef<HTMLInputElement>(null);

  const codeInputId = useId();
  const helperTextId = useId();
  const errorTextId = useId();
  const totpInputId = useId();
  const totpHintId = useId();
  const totpErrorId = useId();

  const slides = customization.loginConfig.slides;
  const activeLogo = isDarkResolved
    ? customization.logoDark || customization.logoLight
    : customization.logoLight || customization.logoDark;
  const actionColor = customization.loginConfig.buttonColor || customization.primaryColor;

  // Keep active input focused on desktop mount / mode switch
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      if (panelMode === 'totp_unlock') {
        totpInputRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  }, [panelMode]);

  // Auto-advance full-width right carousel
  useEffect(() => {
    if (slides.length <= 1 || isCarouselPaused) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setActiveSlideIdx(prev => (prev + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length, isCarouselPaused]);

  const attemptLogin = (candidateCode: string) => {
    if (isSubmitting) return;
    const clean = candidateCode.replace(/\D/g, '');
    if (clean.length !== 4 && clean.length !== 6 && clean.length !== 8) {
      setErrorMsg('Ingresa 8 dígitos (DNI / C.E.), o un código autorizado de 6 o 4 dígitos.');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const credResult = verifyLoginCredentials(clean);
    if (!credResult.ok || !credResult.user) {
      setIsSubmitting(false);
      setErrorMsg(credResult.error || 'Credencial inválida.');
      inputRef.current?.focus();
      return;
    }

    const matchedUser = credResult.user;
    const gateCheck = shouldGateLoginByAttendance(matchedUser);

    if (gateCheck.gated) {
      setIsSubmitting(false);
      setPendingUser(matchedUser);
      setTotpCode('');
      setTotpError('');
      setPanelMode('totp_unlock');

      if (
        matchedUser.branchIds &&
        !matchedUser.branchIds.includes('all') &&
        matchedUser.branchIds[0]
      ) {
        setKioskBranchId(matchedUser.branchIds[0]);
      }

      logAuditEvent(
        'auth',
        'warning',
        'Acceso Retenido: Sin Asistencia Registrada',
        `${matchedUser.name} intentó iniciar sesión sin marcación biométrica ni de asistencia hoy. Se solicitó desbloqueo por Google Authenticator.`,
        { name: matchedUser.name, role: matchedUser.roleName }
      );
      return;
    }

    completeAuthenticatedSession(
      matchedUser,
      hasActiveAttendanceToday(matchedUser.id) ? 'Asistencia Diaria Verificada' : undefined
    );
  };

  const attemptKioskClock = (candidateCode: string, method: 'dni_pin' | 'biometric') => {
    const clean = candidateCode.replace(/\D/g, '');
    if (clean.length !== 4 && clean.length !== 6 && clean.length !== 8) {
      setErrorMsg('Ingresa tu DNI (8 dígitos) o código asignado (6 o 4 dígitos) para marcar.');
      inputRef.current?.focus();
      return;
    }

    const res = clockAttendance({
      codeOrUserId: clean,
      eventType: kioskEvent,
      method,
      branchId: kioskBranchId,
    });

    if (!res.ok) {
      setSuccessMsg('');
      setErrorMsg(res.message);
      return;
    }

    setErrorMsg('');
    setSuccessMsg(res.message);
    setCode('');

    // If user came from Attendance Gate and just clocked in, let them proceed right into Login
    if (pendingUser && pendingUser.pin === clean && kioskEvent === 'check_in') {
      completeAuthenticatedSession(
        pendingUser,
        method === 'biometric' ? 'Entrada Biométrica Registrada' : 'Entrada en Reloj Registrada'
      );
    }
  };

  const attemptTotpUnlock = async (candidateTotp: string) => {
    if (!pendingUser || isSubmitting) return;
    const clean = candidateTotp.replace(/\D/g, '');
    if (clean.length !== 6) {
      setTotpError('Ingresa el código vigente de 6 dígitos de Google Authenticator.');
      totpInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const verification = await verifyGoogleAuthenticatorUnlock(pendingUser, clean);
    setIsSubmitting(false);

    if (!verification.ok) {
      setTotpError(verification.error || 'Código de Google Authenticator inválido.');
      totpInputRef.current?.focus();
      return;
    }

    completeAuthenticatedSession(
      pendingUser,
      verification.matchedSource === 'master'
        ? 'Desbloqueado con Google Authenticator (Supervisión)'
        : 'Desbloqueado con Google Authenticator Personal'
    );
  };

  const updateCodeValue = (nextRaw: string) => {
    const clean = nextRaw.replace(/\D/g, '').slice(0, 8);
    setCode(clean);
    if (errorMsg) setErrorMsg('');
    if (successMsg) setSuccessMsg('');

    if (panelMode === 'login' && clean.length === 8) {
      const exactEightMatch = users.find(u => u.pin === clean && u.status === 'active');
      if (exactEightMatch) {
        attemptLogin(clean);
      }
    }
  };

  const updateTotpValue = (nextRaw: string) => {
    const clean = nextRaw.replace(/\D/g, '').slice(0, 6);
    setTotpCode(clean);
    if (totpError) setTotpError('');

    if (clean.length === 6) {
      void attemptTotpUnlock(clean);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (isSubmitting) return;
    if (panelMode === 'totp_unlock') {
      if (totpCode.length >= 6) return;
      soundSynth.playKeyTick(customization.toastAudioTheme, false);
      updateTotpValue(totpCode + digit);
      return;
    }

    if (code.length >= 8) return;
    soundSynth.playKeyTick(customization.toastAudioTheme, false);
    updateCodeValue(code + digit);
  };

  const handleBackspace = () => {
    if (isSubmitting) return;
    if (panelMode === 'totp_unlock') {
      if (!totpCode.length) return;
      soundSynth.playKeyTick(customization.toastAudioTheme, true);
      setTotpCode(prev => prev.slice(0, -1));
      if (totpError) setTotpError('');
      return;
    }

    if (!code.length) return;
    soundSynth.playKeyTick(customization.toastAudioTheme, true);
    setCode(prev => prev.slice(0, -1));
    if (errorMsg) setErrorMsg('');
  };

  const handleClear = () => {
    if (isSubmitting) return;
    if (panelMode === 'totp_unlock') {
      if (!totpCode.length) return;
      soundSynth.playKeyTick(customization.toastAudioTheme, true);
      setTotpCode('');
      if (totpError) setTotpError('');
      return;
    }

    if (!code.length) return;
    soundSynth.playKeyTick(customization.toastAudioTheme, true);
    setCode('');
    if (errorMsg) setErrorMsg('');
  };

  const handlePrimarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (panelMode === 'totp_unlock') {
      void attemptTotpUnlock(totpCode);
    } else if (panelMode === 'attendance_kiosk') {
      attemptKioskClock(code, 'dni_pin');
    } else {
      attemptLogin(code);
    }
  };

  const resetToStandardLogin = () => {
    setPanelMode('login');
    setPendingUser(null);
    setCode('');
    setTotpCode('');
    setErrorMsg('');
    setTotpError('');
    setSuccessMsg('');
  };

  const isCenteredMode = customization.loginConfig.layout === 'centered';

  return (
    <div
      className="min-h-dvh w-full flex flex-col lg:flex-row erp-shell-surface text-zinc-900 dark:text-zinc-100 antialiased selection:bg-brand-500 selection:text-white relative overflow-x-hidden"
      style={{ fontFamily: customization.fontFamily }}
    >
      {/* Optional Centered Mode Ambient Background (Desktop only) */}
      {isCenteredMode && slides[activeSlideIdx] && (
        <div className="hidden lg:block fixed inset-0 pointer-events-none overflow-hidden">
          <img
            src={slides[activeSlideIdx].imageUrl}
            alt=""
            fetchPriority="high"
            className="w-full h-full object-cover opacity-20 dark:opacity-25 blur-xl scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
        </div>
      )}

      {/* LEFT COLUMN (OR CENTERED PANEL): MODERN NUMERIC KEYPAD + ATTENDANCE / TOTP GATE */}
      <section
        aria-label="Acceso numérico y validación de asistencia"
        className={`relative z-10 flex flex-col justify-between w-full min-h-dvh px-4 py-5 sm:px-8 sm:py-7 ${
          isCenteredMode
            ? 'lg:min-h-0 lg:my-auto lg:mx-auto lg:max-w-[500px] lg:rounded-3xl lg:border lg:border-zinc-200/90 dark:lg:border-zinc-800 lg:shadow-2xl erp-canvas-surface'
            : 'lg:w-[490px] xl:w-[540px] 2xl:w-[565px] shrink-0 erp-canvas-surface lg:border-r lg:border-zinc-200/90 dark:lg:border-zinc-800/90'
        } ${
          customization.loginConfig.glassmorphism && isCenteredMode
            ? 'lg:backdrop-blur-2xl lg:bg-white/90 dark:lg:bg-[#111114]/90'
            : ''
        }`}
      >
        {/* Top Brand, Store Attendance Kiosk Toggle & Theme Bar */}
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {activeLogo ? (
              <img
                src={activeLogo}
                alt={customization.appName}
                className="h-10 w-10 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700 shadow-sm shrink-0"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                {customization.collapsedLogo || '🍕'}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-950 dark:text-white truncate block">
                {customization.appName}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5">
                <Store className="h-3 w-3 shrink-0" style={{ color: customization.primaryColor }} />
                {tenants.length} sucursales · RUC {companyInfo.taxId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (panelMode === 'attendance_kiosk') {
                  resetToStandardLogin();
                } else {
                  setPanelMode('attendance_kiosk');
                  setErrorMsg('');
                  setSuccessMsg('');
                }
              }}
              aria-pressed={panelMode === 'attendance_kiosk'}
              title="Abrir Reloj Biométrico / Marcador de Asistencia"
              className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                panelMode === 'attendance_kiosk'
                  ? 'saas-option-active'
                  : 'saas-subcard text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: customization.primaryColor }} />
              <span className="hidden sm:inline">
                {panelMode === 'attendance_kiosk' ? 'Volver a Login' : 'Reloj Asistencia'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateCustomization({ themePreference: isDarkResolved ? 'light' : 'dark' })
              }
              aria-label={isDarkResolved ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="h-10 w-10 rounded-xl saas-subcard flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 shrink-0"
            >
              {isDarkResolved ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {onNavigateToStore && (
              <button
                type="button"
                onClick={onNavigateToStore}
                title="Volver a la Tienda Virtual de Clientes"
                className="h-10 px-3 rounded-xl saas-subcard text-xs font-bold flex items-center gap-1.5 text-amber-500 hover:text-amber-400 transition-all whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tienda Virtual</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Keypad Container */}
        <div className="w-full max-w-md mx-auto my-auto py-3 sm:py-4 space-y-4">
          {panelMode === 'totp_unlock' && pendingUser ? (
            /* ============================================================
               MODE 2: ATTENDANCE GATE + GOOGLE AUTHENTICATOR UNLOCK
               ============================================================ */
            <>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    Asistencia Previa No Registrada
                  </span>

                  <button
                    type="button"
                    onClick={resetToStandardLogin}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Cambiar usuario
                  </button>
                </div>

                {/* Collaborator Identity Summary */}
                <div className="p-3 rounded-2xl saas-subcard flex items-center gap-3">
                  <img
                    src={pendingUser.avatarUrl}
                    alt={pendingUser.name}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-amber-500/40 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                      {pendingUser.name}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                      {pendingUser.roleName} · Sin marcación hoy en biométrico o reloj
                    </p>
                  </div>
                </div>
              </div>

              <form method="POST" onSubmit={handlePrimarySubmit} noValidate className="space-y-3.5">
                <div className="space-y-1.5">
                  <label
                    htmlFor={totpInputId}
                    className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
                  >
                    <KeyRound className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
                    Desbloqueo con Google Authenticator
                  </label>

                  {/* Hint placed ABOVE the input per modern-web-guidance sms-otp-form */}
                  <p id={totpHintId} className="text-xs text-zinc-600 dark:text-zinc-400">
                    Ingresa el código temporal de <strong>6 dígitos</strong> de Google Authenticator para autorizar el ingreso sin marcación previa.
                  </p>

                  {/* Single accessible <input type="text" inputmode="numeric" autocomplete="one-time-code"> */}
                  <input
                    ref={totpInputRef}
                    type="text"
                    id={totpInputId}
                    name="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    placeholder="000000"
                    value={totpCode}
                    aria-invalid={Boolean(totpError)}
                    aria-describedby={totpError ? `${totpHintId} ${totpErrorId}` : totpHintId}
                    onChange={e => updateTotpValue(e.target.value)}
                    className={`w-full min-h-[54px] px-4 py-2.5 rounded-2xl text-center font-mono text-2xl font-bold tracking-[0.38em] saas-input ${
                      totpError
                        ? 'border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20'
                        : ''
                    }`}
                  />

                  <div role="status" aria-live="polite" className="min-h-[18px]">
                    {totpError ? (
                      <p
                        id={totpErrorId}
                        className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{totpError}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Large Shared Tactile Numeric Keypad */}
                <div
                  role="group"
                  aria-label="Teclado numérico para Google Authenticator"
                  className="grid grid-cols-3 gap-2 sm:gap-2.5 select-none"
                >
                  {KEYPAD_NUMBERS.map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleDigitPress(num)}
                      className="min-h-[58px] sm:min-h-[64px] lg:min-h-[52px] rounded-2xl saas-card hover:bg-zinc-100/90 dark:hover:bg-zinc-800/90 active:scale-[0.97] transition-all flex items-center justify-center text-2xl font-bold font-mono text-zinc-950 dark:text-white shadow-sm"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="min-h-[58px] sm:min-h-[64px] lg:min-h-[52px] rounded-2xl saas-subcard hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 active:scale-[0.97] transition-all flex items-center justify-center text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDigitPress('0')}
                    className="min-h-[58px] sm:min-h-[64px] lg:min-h-[52px] rounded-2xl saas-card hover:bg-zinc-100/90 dark:hover:bg-zinc-800/90 active:scale-[0.97] transition-all flex items-center justify-center text-2xl font-bold font-mono text-zinc-950 dark:text-white shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    aria-label="Borrar último dígito"
                    className="min-h-[58px] sm:min-h-[64px] lg:min-h-[52px] rounded-2xl saas-subcard hover:bg-zinc-200/80 dark:hover:bg-zinc-800 active:scale-[0.97] transition-all flex items-center justify-center text-zinc-700 dark:text-zinc-200"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCode(pendingUser.pin);
                      setKioskEvent('check_in');
                      setPanelMode('attendance_kiosk');
                    }}
                    className="min-h-[48px] px-3.5 rounded-2xl text-xs font-bold saas-btn-secondary flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Fingerprint className="h-4 w-4 shrink-0" style={{ color: customization.primaryColor }} />
                    Marcar Asistencia Ahora
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[48px] px-4 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: actionColor }}
                  >
                    <KeyRound className="h-4 w-4 shrink-0" />
                    <span>{isSubmitting ? 'Validando...' : 'Desbloquear Acceso'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* ============================================================
               MODE 1 (STANDARD LOGIN) & MODE 3 (STORE ATTENDANCE KIOSK)
               ============================================================ */
            <>
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold saas-subcard text-zinc-700 dark:text-zinc-300 mb-1">
                  <Fingerprint className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
                  {panelMode === 'attendance_kiosk'
                    ? securityPolicy.biometricDeviceName
                    : 'Identificación Rápida Multisucursal'}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  {panelMode === 'attendance_kiosk'
                    ? 'Reloj Biométrico y Asistencia'
                    : 'Ingresa tu Documento o PIN'}
                </h1>
                <p id={helperTextId} className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  {panelMode === 'attendance_kiosk' ? (
                    <>
                      Registra tu marcación con <strong>DNI (8d)</strong> o huella biométrica antes de iniciar turno.
                    </>
                  ) : (
                    <>
                      DNI / C.E. de <strong>8 dígitos</strong> (estándar), o código de{' '}
                      <strong>6</strong> o <strong>4 dígitos</strong>.
                    </>
                  )}
                </p>
              </div>

              {panelMode === 'attendance_kiosk' && (
                <div className="p-2.5 rounded-2xl saas-subcard space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Sede de Marcación
                    </span>
                    <select
                      aria-label="Seleccionar sucursal de marcación"
                      value={kioskBranchId}
                      onChange={e => setKioskBranchId(e.target.value)}
                      className="text-xs font-semibold bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                    >
                      {tenants.map(t => (
                        <option
                          key={t.id}
                          value={t.id}
                          className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        >
                          {t.name.replace('Khalessi Pizza - ', '')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {EVENT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setKioskEvent(opt.id)}
                        className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                          kioskEvent === opt.id ? 'saas-option-active' : 'saas-option'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handlePrimarySubmit} noValidate className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={codeInputId}
                      className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
                    >
                      Credencial Numérica ({code.length}/8 dígitos)
                    </label>

                    <button
                      type="button"
                      aria-pressed={showDigits}
                      onClick={() => setShowDigits(prev => !prev)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {showDigits ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Ocultar
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Mostrar
                        </>
                      )}
                    </button>
                  </div>

                  {/* Interactive Slot Container bound to a single real <input> */}
                  <div
                    onClick={() => inputRef.current?.focus()}
                    className={`relative p-3 sm:p-3.5 rounded-2xl saas-subcard cursor-text transition-all ${
                      errorMsg
                        ? 'border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20'
                        : 'focus-within:border-brand-500 dark:focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/25'
                    }`}
                  >
                    <input
                      ref={inputRef}
                      id={codeInputId}
                      name="accessCode"
                      type={showDigits ? 'text' : 'password'}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="done"
                      maxLength={8}
                      required
                      value={code}
                      aria-invalid={Boolean(errorMsg)}
                      aria-describedby={errorMsg ? `${helperTextId} ${errorTextId}` : helperTextId}
                      onChange={e => updateCodeValue(e.target.value)}
                      className="sr-only"
                    />

                    {/* 8 Visual Digit Boxes */}
                    <div aria-hidden="true" className="grid grid-cols-8 gap-1.5 sm:gap-2">
                      {Array.from({ length: 8 }).map((_, idx) => {
                        const char = code[idx];
                        const isFilled = Boolean(char);
                        const isCurrentCursor = idx === code.length;
                        const milestoneLabel =
                          idx === 3 ? '4d' : idx === 5 ? '6d' : idx === 7 ? 'DNI' : null;

                        return (
                          <div key={idx} className="flex flex-col items-center gap-1">
                            <div
                              className={`w-full h-11 sm:h-12 rounded-xl flex items-center justify-center font-mono text-lg sm:text-xl font-bold border transition-all ${
                                isFilled
                                  ? 'bg-white dark:bg-zinc-900 border-zinc-400 dark:border-zinc-500 text-zinc-950 dark:text-white shadow-sm'
                                  : isCurrentCursor
                                  ? 'bg-white/70 dark:bg-zinc-900/70 border-brand-500 dark:border-brand-400 ring-2 ring-brand-500/20'
                                  : 'bg-zinc-100/80 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                              }`}
                              style={
                                isFilled
                                  ? { borderColor: customization.primaryColor }
                                  : undefined
                              }
                            >
                              {isFilled ? (showDigits ? char : '•') : ''}
                            </div>
                            <span
                              className={`text-[9px] font-mono font-semibold tracking-tight ${
                                (idx === 3 && code.length === 4) ||
                                (idx === 5 && code.length === 6) ||
                                (idx === 7 && code.length === 8)
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              }`}
                            >
                              {milestoneLabel || '\u00A0'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Accessible Status / Validation Message */}
                  <div role="status" aria-live="polite" className="min-h-[20px]">
                    {errorMsg ? (
                      <p
                        id={errorTextId}
                        className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </p>
                    ) : successMsg ? (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{successMsg}</span>
                      </p>
                    ) : code.length === 4 || code.length === 6 || code.length === 8 ? (
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Formato de {code.length} dígitos listo — presiona confirmar o continúa a 8 dígitos.
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* LARGE MODERN NUMERIC KEYPAD */}
                <div
                  role="group"
                  aria-label="Teclado numérico táctil"
                  className="grid grid-cols-3 gap-2 sm:gap-2.5 select-none"
                >
                  {KEYPAD_NUMBERS.map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleDigitPress(num)}
                      className="min-h-[54px] sm:min-h-[64px] lg:min-h-[52px] rounded-2xl saas-card hover:bg-zinc-100/90 dark:hover:bg-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-600 active:scale-[0.97] transition-all flex items-center justify-center text-xl sm:text-2xl font-bold font-mono text-zinc-950 dark:text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Borrar todos los dígitos"
                    className="min-h-[54px] sm:min-h-[64px] lg:min-h-[52px] rounded-2xl saas-subcard hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 active:scale-[0.97] transition-all flex flex-col items-center justify-center text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Limpiar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDigitPress('0')}
                    className="min-h-[54px] sm:min-h-[64px] lg:min-h-[52px] rounded-2xl saas-card hover:bg-zinc-100/90 dark:hover:bg-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-600 active:scale-[0.97] transition-all flex items-center justify-center text-xl sm:text-2xl font-bold font-mono text-zinc-950 dark:text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleBackspace}
                    aria-label="Borrar último dígito"
                    className="min-h-[54px] sm:min-h-[64px] lg:min-h-[52px] rounded-2xl saas-subcard hover:bg-zinc-200/80 dark:hover:bg-zinc-800 active:scale-[0.97] transition-all flex items-center justify-center text-zinc-700 dark:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <Delete className="h-5 w-5 sm:h-6 sm:w-6 lg:h-5 lg:w-5" />
                  </button>
                </div>

                {/* Primary Submit Action(s) */}
                {panelMode === 'attendance_kiosk' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => attemptKioskClock(code, 'biometric')}
                      className="min-h-[52px] px-4 rounded-2xl text-xs sm:text-sm font-bold saas-btn-secondary flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Fingerprint className="h-4 w-4 shrink-0" style={{ color: customization.primaryColor }} />
                      <span>Huella Biométrica</span>
                    </button>

                    <button
                      type="submit"
                      className="min-h-[52px] px-4 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all whitespace-nowrap shrink-0"
                      style={{ backgroundColor: actionColor }}
                    >
                      <span>Marcar con Código</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[54px] sm:min-h-[58px] lg:min-h-[52px] px-5 rounded-2xl text-sm sm:text-base font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ backgroundColor: actionColor }}
                  >
                    <span>{isSubmitting ? 'Verificando credencial...' : 'Iniciar Turno en ERP'}</span>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  </button>
                )}
              </form>
            </>
          )}
        </div>

        <div aria-hidden="true" className="h-2 shrink-0" />
      </section>

      {/* RIGHT COLUMN: FULL-BLEED SLIDER / CAROUSEL (Desktop lg+ Only; Hidden on Mobile so Keypad stays Large!) */}
      {!isCenteredMode && (
        <aside
          aria-label="Galería corporativa de sucursales y cocina"
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          onFocus={() => setIsCarouselPaused(true)}
          onBlur={() => setIsCarouselPaused(false)}
          className="hidden lg:flex flex-1 min-h-dvh relative overflow-hidden bg-zinc-950 select-none"
        >
          {slides.map((slide, idx) => {
            const isCurrent = idx === activeSlideIdx;
            return (
              <div
                key={slide.id}
                aria-hidden={!isCurrent}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  fetchPriority={idx === 0 ? 'high' : 'low'}
                  loading={idx === 0 ? undefined : 'lazy'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/25" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
              </div>
            );
          })}

          <div className="relative z-20 w-full flex flex-col justify-between p-10 xl:p-14 text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Red Multisucursal Unificada · {companyInfo.legalName}</span>
              </div>

              <div className="flex items-center gap-2">
                {tenants.slice(0, 3).map(t => (
                  <span
                    key={t.id}
                    className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-zinc-200"
                  >
                    {t.operations?.branchCode || 'SUC'} · {t.name.replace('Khalessi Pizza - ', '')}
                  </span>
                ))}
              </div>
            </div>

            {slides[activeSlideIdx] && (
              <div className="max-w-2xl space-y-6">
                <div
                  className={`space-y-3 ${
                    customization.loginConfig.glassmorphism
                      ? 'p-7 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-2xl'
                      : ''
                  }`}
                >
                  <span
                    className="inline-block px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest text-white"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    {customization.slogan || 'Operación Gastronómica en Tiempo Real'}
                  </span>
                  <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
                    {slides[activeSlideIdx].title}
                  </h2>
                  <p className="text-sm xl:text-base text-zinc-200/95 leading-relaxed">
                    {slides[activeSlideIdx].subtitle}
                  </p>
                </div>

                {slides.length > 1 && (
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      {slides.map((s, idx) => {
                        const active = idx === activeSlideIdx;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setActiveSlideIdx(idx)}
                            aria-label={`Ir a diapositiva ${idx + 1}: ${s.title}`}
                            aria-current={active ? 'true' : undefined}
                            className="group py-2 flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded"
                          >
                            <span
                              className={`block h-1.5 rounded-full transition-all ${
                                active ? 'w-full' : 'w-full bg-white/30 group-hover:bg-white/55'
                              }`}
                              style={active ? { backgroundColor: customization.primaryColor } : undefined}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlideIdx(prev => (prev - 1 + slides.length) % slides.length)
                        }
                        aria-label="Diapositiva anterior"
                        className="h-10 w-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSlideIdx(prev => (prev + 1) % slides.length)}
                        aria-label="Siguiente diapositiva"
                        className="h-10 w-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Global Overlays so Toasts and Custom Modals render on Login too */}
      <ToastContainer />
      <SystemNoticeModal />
    </div>
  );
};
