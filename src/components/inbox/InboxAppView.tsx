import React, { useState, useEffect, useRef, useId, lazy, Suspense } from 'react';
import {
  ArrowRight,
  Delete,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  LogOut,
  Moon,
  Server,
  ShieldAlert,
  Sun,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { useHR } from '../../context/HRContext';
import { User } from '../../types/settings';
import { soundSynth } from '../../utils/audio';
import { authenticateAndHydrateServer, authenticateServer, initDiskPersistence } from '../../utils/diskPersistence';
import {
  getConfiguredServerUrl,
  isNativeCapacitor,
  setConfiguredServerUrl,
} from '../../utils/serverUrl';
import {
  consumePendingNativeConversation,
  startNativeInboxRealtime,
  stopNativeInboxRealtime,
} from '../../utils/inboxNativeBridge';
import inboxAppIcon from '../../assets/inbox-app-icon.png';
import { ToastContainer } from '../common/ToastContainer';
import { SystemNoticeModal } from '../common/SystemNoticeModal';

const OmnichannelInboxView = lazy(() =>
  import('./OmnichannelInboxView').then((m) => ({ default: m.OmnichannelInboxView }))
);

const KEYPAD_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

type InboxLoginPanelMode = 'login' | 'totp_unlock';

export const InboxAppView: React.FC = () => {
  const {
    isAuthenticated,
    customization,
    updateCustomization,
    isDarkResolved,
    companyInfo,
    verifyLoginCredentials,
    completeAuthenticatedSession,
    logoutSession,
    logAuditEvent,
    dispatchToast,
    openNoticeModal,
  } = useSettings();

  const { currentUser, hasPermission } = useRBAC();
  const { shouldGateLoginByAttendance, hasActiveAttendanceToday, verifyGoogleAuthenticatorUnlock } =
    useHR();

  const [panelMode, setPanelMode] = useState<InboxLoginPanelMode>('login');
  const [code, setCode] = useState('');
  const [showDigits, setShowDigits] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');

  // Server URL config (for APK / Capacitor or custom remote server)
  const [serverUrl, setServerUrl] = useState<string>(() => getConfiguredServerUrl());
  const [serverDraft, setServerDraft] = useState<string>(() => getConfiguredServerUrl());
  const [showServerConfig, setShowServerConfig] = useState<boolean>(
    () => isNativeCapacitor() && !getConfiguredServerUrl()
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const totpInputRef = useRef<HTMLInputElement>(null);
  const codeInputId = useId();
  const totpInputId = useId();

  const activeLogo = isDarkResolved
    ? customization.logoDark || customization.logoLight
    : customization.logoLight || customization.logoDark;
  const actionColor = customization.loginConfig?.buttonColor || customization.primaryColor;

  useEffect(() => {
    if (isAuthenticated) return;
    if (panelMode === 'totp_unlock') {
      const id = window.setTimeout(() => totpInputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [isAuthenticated, panelMode]);

  const handleSaveServerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = setConfiguredServerUrl(serverDraft);
    setServerUrl(saved);
    setServerDraft(saved);
    setShowServerConfig(false);
    if (saved) {
      dispatchToast('Servidor configurado', `Conectado a ${saved}`, 'success');
      void initDiskPersistence();
    } else {
      dispatchToast('Servidor local', 'Usando el servidor del origen actual.', 'info');
    }
  };

  const attemptLogin = async (candidateCode: string) => {
    if (isSubmitting) return;

    if (isNativeCapacitor() && !getConfiguredServerUrl()) {
      setShowServerConfig(true);
      setErrorMsg('Configura la URL del servidor ERP antes de ingresar.');
      return;
    }

    const clean = candidateCode.replace(/\D/g, '');
    if (clean.length !== 4 && clean.length !== 6 && clean.length !== 8) {
      setErrorMsg('Ingresa tu PIN autorizado de 4, 6 u 8 dígitos.');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    let matchedUser: User | undefined;
    const credResult = verifyLoginCredentials(clean);

    if (credResult.ok && credResult.user) {
      matchedUser = credResult.user;
    } else {
      const serverAuth = await authenticateAndHydrateServer(clean);
      if (serverAuth.ok) {
        try {
          const raw = localStorage.getItem('gastro_erp_settings_v3');
          const parsed = raw ? JSON.parse(raw) : null;
          const hydratedUsers: User[] = Array.isArray(parsed?.users) ? parsed.users : [];
          matchedUser = hydratedUsers.find(
            (u) => String(u.pin || '').replace(/\D/g, '') === clean
          );
          if (!matchedUser && serverAuth.user) {
            matchedUser = {
              id: serverAuth.user.id || 'bootstrap',
              name: serverAuth.user.name || 'Super Administrador',
              email: 'admin@gastroerp.com',
              phone: '',
              avatarUrl: '',
              roleId: serverAuth.user.roleId || 'role-admin',
              roleName: 'Super Administrador',
              status: 'active',
              pin: clean,
              branchIds: ['all'],
              createdAt: new Date().toISOString().slice(0, 10),
              lastLogin: 'En línea ahora',
            };
          }
        } catch {
          // ignore parse error
        }
      }
    }

    if (!matchedUser) {
      setIsSubmitting(false);
      setErrorMsg(credResult.error || 'PIN inválido o sin conexión al servidor.');
      inputRef.current?.focus();
      return;
    }

    if (credResult.ok && credResult.user) {
      const serverOk = await authenticateServer(clean, true);
      if (!serverOk) {
        dispatchToast(
          'Sin sincronización con servidor',
          'Verifica la conexión o la URL del servidor si los mensajes no cargan.',
          'warning'
        );
      }
    }

    if (matchedUser.status === 'suspended') {
      setIsSubmitting(false);
      setErrorMsg(`La cuenta de ${matchedUser.name} se encuentra suspendida.`);
      inputRef.current?.focus();
      return;
    }

    const gateCheck = shouldGateLoginByAttendance(matchedUser);
    if (gateCheck.gated) {
      setIsSubmitting(false);
      setPendingUser(matchedUser);
      setTotpCode('');
      setTotpError('');
      setPanelMode('totp_unlock');
      logAuditEvent(
        'auth',
        'warning',
        'Acceso Retenido (Bandeja App)',
        `${matchedUser.name} intentó ingresar a Bandeja App sin marcación de asistencia. Se solicitó código Google Authenticator.`,
        { name: matchedUser.name, role: matchedUser.roleName }
      );
      return;
    }

    setIsSubmitting(false);
    setCode('');
    completeAuthenticatedSession(
      matchedUser,
      hasActiveAttendanceToday(matchedUser.id) ? 'Asistencia Diaria Verificada' : undefined
    );
  };

  const attemptTotpUnlock = async (candidateTotp: string) => {
    if (!pendingUser || isSubmitting) return;
    const clean = candidateTotp.replace(/\D/g, '');
    if (clean.length !== 6) {
      setTotpError('Ingresa el código vigente de 6 dígitos.');
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

    setCode('');
    setTotpCode('');
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
  };

  const handleDigitClick = (digit: string) => {
    soundSynth.playKeyTick(customization.toastAudioTheme);
    if (code.length < 8) {
      updateCodeValue(code + digit);
    }
  };

  const handleDelete = () => {
    soundSynth.playKeyTick(customization.toastAudioTheme, true);
    if (code.length > 0) {
      updateCodeValue(code.slice(0, -1));
    }
  };

  const handleLogoutConfirm = () => {
    openNoticeModal({
      tone: 'warning',
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar tu sesión en la Bandeja de Mensajes?',
      confirmLabel: 'Cerrar sesión',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        void stopNativeInboxRealtime();
        setCode('');
        setErrorMsg('');
        setPanelMode('login');
        setPendingUser(null);
        logoutSession();
      },
    });
  };

  const canAccessInbox = hasPermission('inbox:view');

  // Iniciar servicio nativo de notificaciones en tiempo real y en segundo plano al estar autenticado
  useEffect(() => {
    if (isAuthenticated && canAccessInbox) {
      void startNativeInboxRealtime();
      void consumePendingNativeConversation();
    }
  }, [isAuthenticated, canAccessInbox]);

  // 1. Autenticado y CON permiso a Bandeja -> Bandeja a pantalla completa sin cabecera del ERP
  if (isAuthenticated && canAccessInbox) {
    return (
      <>
        <div className="h-[100dvh] w-full overflow-hidden overscroll-none bg-white dark:bg-zinc-950 flex flex-col select-none">
          <Suspense
            fallback={
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400">
                <img src={inboxAppIcon} alt="Bandeja" className="w-12 h-12 rounded-2xl animate-pulse shadow-md" />
                <p className="text-xs font-medium">Cargando bandeja de mensajes...</p>
              </div>
            }
          >
            <OmnichannelInboxView onLogout={handleLogoutConfirm} />
          </Suspense>
        </div>
        <ToastContainer />
        <SystemNoticeModal />
      </>
    );
  }

  // 2. Autenticado pero SIN permiso `inbox:view` -> Bloqueo limpio
  if (isAuthenticated && !canAccessInbox) {
    return (
      <>
        <div className="min-h-[100dvh] w-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl p-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
                Sin permiso para Bandeja
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Hola <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentUser?.name}</span> ({currentUser?.roleName}). Tu rol no tiene habilitado el permiso{' '}
                <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono">
                  inbox:view
                </code>{' '}
                para acceder a la Bandeja Omnicanal.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCode('');
                setErrorMsg('');
                setPanelMode('login');
                setPendingUser(null);
                logoutSession();
              }}
              className="w-full h-11 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-[0.98] transition-transform shadow-sm"
              style={{ backgroundColor: actionColor }}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cambiar de usuario</span>
            </button>
          </div>
        </div>
        <ToastContainer />
        <SystemNoticeModal />
      </>
    );
  }

  // 3. No autenticado -> Login sencillo y moderno con PIN del ERP
  return (
    <>
      <div className="min-h-[100dvh] w-full bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between p-4 sm:p-6 select-none">
        {/* Barra superior mínima: marca + toggle tema + servidor */}
        <div className="w-full max-w-sm mx-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={inboxAppIcon}
              alt="Khalessi Bandeja"
              className="w-9 h-9 rounded-xl shadow-sm shrink-0 object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                {companyInfo?.commercialName || customization.appName || 'Bandeja'}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                Bandeja Omnicanal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowServerConfig((prev) => !prev)}
              className={`h-9 px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                serverUrl
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
              title="Configurar servidor ERP"
            >
              <Server className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Servidor</span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateCustomization({
                  themePreference: isDarkResolved ? 'light' : 'dark',
                })
              }
              className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Cambiar tema"
            >
              {isDarkResolved ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tarjeta central de Login */}
        <div className="w-full max-w-sm mx-auto my-auto py-4">
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl p-6 space-y-5">
            {showServerConfig && (
              <form
                onSubmit={handleSaveServerUrl}
                className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5" style={{ color: actionColor }} />
                    URL del Servidor ERP
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowServerConfig(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    aria-label="Cerrar configuración de servidor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="url"
                  value={serverDraft}
                  onChange={(e) => setServerDraft(e.target.value)}
                  placeholder="https://tudominio.com"
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    className="h-8 px-3 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0"
                    style={{ backgroundColor: actionColor }}
                  >
                    Guardar servidor
                  </button>
                </div>
              </form>
            )}

            {panelMode === 'totp_unlock' && pendingUser ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void attemptTotpUnlock(totpCode);
                }}
                className="space-y-4"
              >
                <div className="text-center space-y-1.5">
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: actionColor }}
                  >
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Verificación en 2 pasos
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Hola {pendingUser.name}. Ingresa tu código de 6 dígitos de Google Authenticator.
                  </p>
                </div>

                <div>
                  <label htmlFor={totpInputId} className="sr-only">
                    Código Google Authenticator
                  </label>
                  <input
                    id={totpInputId}
                    ref={totpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => {
                      setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (totpError) setTotpError('');
                    }}
                    placeholder="000000"
                    className="w-full h-12 text-center text-xl font-bold tracking-[0.4em] rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2"
                  />
                </div>

                {totpError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{totpError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPanelMode('login');
                      setPendingUser(null);
                      setTotpCode('');
                    }}
                    className="h-11 px-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 whitespace-nowrap shrink-0"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || totpCode.length !== 6}
                    className="flex-1 h-11 rounded-2xl text-xs font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: actionColor }}
                  >
                    <span>{isSubmitting ? 'Validando...' : 'Verificar'}</span>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="text-center space-y-2">
                  {activeLogo ? (
                    <img
                      src={activeLogo}
                      alt={companyInfo?.commercialName || 'Logo'}
                      className="h-10 mx-auto object-contain"
                    />
                  ) : null}
                  <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Iniciar sesión
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ingresa tu PIN del ERP para abrir la bandeja de mensajes
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void attemptLogin(code);
                  }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <label htmlFor={codeInputId} className="sr-only">
                      PIN de acceso
                    </label>
                    <input
                      id={codeInputId}
                      ref={inputRef}
                      type={showDigits ? 'text' : 'password'}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => updateCodeValue(e.target.value)}
                      placeholder="PIN (4, 6 u 8 dígitos)"
                      className="w-full h-12 pl-4 pr-11 text-center text-lg font-bold tracking-[0.28em] rounded-2xl bg-zinc-100/90 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-xs placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDigits((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                      aria-label={showDigits ? 'Ocultar PIN' : 'Mostrar PIN'}
                    >
                      {showDigits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Teclado numérico táctil moderno */}
                  <div className="grid grid-cols-3 gap-2">
                    {KEYPAD_NUMBERS.map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDigitClick(num)}
                        className="h-12 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/70 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-base font-semibold text-zinc-900 dark:text-white active:scale-[0.95] transition-transform"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="h-12 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/70 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 active:scale-[0.95] transition-transform"
                      aria-label="Borrar dígito"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitClick('0')}
                      className="h-12 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/70 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-base font-semibold text-zinc-900 dark:text-white active:scale-[0.95] transition-transform"
                    >
                      0
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || code.length < 4}
                      className="h-12 rounded-2xl text-white font-semibold flex items-center justify-center active:scale-[0.95] transition-transform disabled:opacity-40 shadow-sm"
                      style={{ backgroundColor: actionColor }}
                      aria-label="Ingresar"
                    >
                      {isSubmitting ? (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 pb-1">
          {serverUrl ? `Servidor: ${serverUrl}` : 'Modo conectado al servidor del ERP'}
        </p>
      </div>
      <ToastContainer />
      <SystemNoticeModal />
    </>
  );
};

export default InboxAppView;
