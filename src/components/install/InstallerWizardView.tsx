import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Palette,
  Store,
  Server,
  ShieldCheck,
  Upload,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Copy,
  Check,
  Lock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { FACTORY_TEMPLATES } from '../../context/StoreBuilderContext';

interface InstallerWizardViewProps {
  onNavigateToStore: () => void;
  onNavigateToAdmin: () => void;
}

interface EnvStatus {
  phpVersion: string;
  pdoMysql: boolean;
  curl: boolean;
  openssl: boolean;
  apiWritable: boolean;
  uploadsWritable: boolean;
  serverWritable: boolean;
  execAvailable: boolean;
  nodeBinaryFound: boolean;
  serverDirExists: boolean;
}

interface NodeStatus {
  online: boolean;
  endpoint?: string | null;
  service?: string;
  uptimeSeconds?: number;
  connectedClients?: number;
}

interface StatusResponse {
  success: boolean;
  installed: boolean;
  locked: boolean;
  hasConfig: boolean;
  dbConnected: boolean;
  tablesReady: boolean;
  nodeStatus?: NodeStatus;
  environment?: EnvStatus;
}

const COLOR_PRESETS = [
  { name: 'Fuego Naranja', hex: '#f97316' },
  { name: 'Rojo Pizza', hex: '#e11d48' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Azul Eléctrico', hex: '#2563eb' },
  { name: 'Ámbar Dorado', hex: '#d97706' },
  { name: 'Violeta', hex: '#7c3aed' },
];

const TEMPLATE_VISUALS: Record<string, { badge: string; accent: string; bg: string; text: string }> = {
  'tpl-artesanal-dark': { badge: 'Dark', accent: '#f97316', bg: '#09090b', text: '#f4f4f5' },
  'tpl-napolitana-light': { badge: 'Light', accent: '#dc2626', bg: '#fafaf9', text: '#1c1917' },
  'tpl-express-promos': { badge: 'Dark', accent: '#eab308', bg: '#111827', text: '#f9fafb' },
  'tpl-gourmet-editorial': { badge: 'Dark', accent: '#f59e0b', bg: '#18181b', text: '#fafaf9' },
  'tpl-hut-express': { badge: 'Light', accent: '#dc2626', bg: '#ffffff', text: '#18181b' },
  'tpl-papa-fresh': { badge: 'Light', accent: '#16a34a', bg: '#f7fee7', text: '#14532d' },
  'tpl-flame-cream': { badge: 'Light', accent: '#ea580c', bg: '#fffbeb', text: '#431407' },
  'tpl-bembos-electric': { badge: 'Light', accent: '#1d4ed8', bg: '#eff6ff', text: '#1e3a8a' },
};

export const InstallerWizardView: React.FC<InstallerWizardViewProps> = ({
  onNavigateToStore,
  onNavigateToAdmin,
}) => {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [locked, setLocked] = useState(false);
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>({ online: false });
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Paso 1: Base de datos & SuperAdmin
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('3306');
  const [dbName, setDbName] = useState('');
  const [dbUser, setDbUser] = useState('');
  const [dbPass, setDbPass] = useState('');
  const [adminName, setAdminName] = useState('Administrador General');
  const [adminPin, setAdminPin] = useState('230895');
  const [dbInstalled, setDbInstalled] = useState(false);

  // Paso 2: Identidad y Logos
  const [appName, setAppName] = useState('Khalessi Pizza');
  const [slogan, setSlogan] = useState('El sabor artesanal respaldado por tecnología ágil');
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'system'>('dark');
  const [logoLight, setLogoLight] = useState('');
  const [logoDark, setLogoDark] = useState('');
  const [storeHeaderLogo, setStoreHeaderLogo] = useState('');
  const [favicon, setFavicon] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  // Paso 3: Theme de la Tienda
  const [storeTemplateId, setStoreTemplateId] = useState(FACTORY_TEMPLATES[0]?.id || 'tpl-artesanal-dark');

  // Paso 4: Node.js Realtime
  const [nodePort, setNodePort] = useState('3000');
  const [corsOrigin, setCorsOrigin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  const [realtimeSecret, setRealtimeSecret] = useState('');
  const [serverRoot, setServerRoot] = useState('');
  const [manualNodeRequired, setManualNodeRequired] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/install.php?action=status', { cache: 'no-store' });
      const data = (await res.json()) as StatusResponse;
      if (data.locked) {
        setLocked(true);
      }
      if (data.environment) {
        setEnv(data.environment);
      }
      if (data.nodeStatus) {
        setNodeStatus(data.nodeStatus);
      }
      if (data.dbConnected && data.tablesReady) {
        setDbInstalled(true);
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'No se pudo consultar /api/install.php. Verifica que PHP esté activo en este servidor.',
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Silencioso si el navegador restringe clipboard
    }
  };

  const handleTestDb = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/install.php?action=test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: dbHost.trim(),
          port: Number(dbPort) || 3306,
          name: dbName.trim(),
          user: dbUser.trim(),
          pass: dbPass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', message: data.error || 'Error probando la conexión MySQL.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: `Conexión exitosa a MySQL ${data.version || ''}. Ya puedes instalar las tablas.`,
      });
    } catch {
      setFeedback({ type: 'error', message: 'Error de red al probar conexión MySQL.' });
    } finally {
      setBusy(false);
    }
  };

  const handleInstallDb = async () => {
    if (!/^[0-9]{4,12}$/.test(adminPin.trim())) {
      setFeedback({ type: 'error', message: 'El PIN del SuperAdmin debe tener entre 4 y 12 dígitos numéricos.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/install.php?action=install-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: dbHost.trim(),
          port: Number(dbPort) || 3306,
          name: dbName.trim(),
          user: dbUser.trim(),
          pass: dbPass,
          adminName: adminName.trim(),
          adminPin: adminPin.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo inicializar la base de datos.' });
        return;
      }
      setDbInstalled(true);
      if (data.realtimeSecret) {
        setRealtimeSecret(data.realtimeSecret);
      }
      setFeedback({
        type: 'success',
        message: 'Base de datos instalada, PIN de SuperAdmin configurado y api/config.local.php guardado.',
      });
      setStep(2);
    } catch {
      setFeedback({ type: 'error', message: 'Error de red al instalar la base de datos.' });
    } finally {
      setBusy(false);
    }
  };

  const handleUploadAsset = async (
    slot: 'logoLight' | 'logoDark' | 'storeHeaderLogo' | 'favicon',
    file: File | null
  ) => {
    if (!file) return;
    setUploadingSlot(slot);
    setFeedback(null);
    try {
      const form = new FormData();
      form.append('slot', slot);
      form.append('file', file);
      const res = await fetch('/api/install.php?action=upload-branding', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo subir la imagen.' });
        return;
      }
      if (slot === 'logoLight') setLogoLight(data.url);
      if (slot === 'logoDark') setLogoDark(data.url);
      if (slot === 'storeHeaderLogo') setStoreHeaderLogo(data.url);
      if (slot === 'favicon') setFavicon(data.url);
      setFeedback({ type: 'success', message: `Archivo guardado en ${data.url}` });
    } catch {
      setFeedback({ type: 'error', message: 'Error subiendo imagen al servidor.' });
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSaveBrandingAndTheme = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/install.php?action=save-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: appName.trim() || 'Khalessi Pizza',
          slogan: slogan.trim(),
          logoLight: logoLight.trim(),
          logoDark: logoDark.trim(),
          storeHeaderLogo: storeHeaderLogo.trim(),
          favicon: favicon.trim(),
          primaryColor,
          themePreference,
          storeTemplateId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', message: data.error || 'Error guardando identidad y theme.' });
        return;
      }

      // Sincronizar también pistas visuales locales en este navegador
      try {
        localStorage.setItem('kh_brand_primary_v1', primaryColor);
        localStorage.setItem('kh_brand_theme_v1', themePreference);
        if (favicon.trim()) {
          localStorage.setItem('kh_brand_favicon_v1', favicon.trim());
        }
      } catch {
        // Ignorar si storage local está restringido
      }

      setFeedback({ type: 'success', message: 'Marca, logos, color y theme de tienda guardados en MySQL.' });
      setStep(4);
    } catch {
      setFeedback({ type: 'error', message: 'Error de red guardando identidad visual.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSetupNode = async (autoStart: boolean) => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/install.php?action=setup-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: Number(nodePort) || 3000,
          corsOrigin: corsOrigin.trim(),
          autoStart,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', message: data.error || 'Error configurando Node.js.' });
        return;
      }
      if (data.realtimeSecret) setRealtimeSecret(data.realtimeSecret);
      if (data.serverRoot) setServerRoot(data.serverRoot);
      if (data.nodeStatus) setNodeStatus(data.nodeStatus);
      setManualNodeRequired(Boolean(data.manualRequired));
      setFeedback({
        type: data.online ? 'success' : 'info',
        message: data.message || 'Configuración de Node.js actualizada.',
      });
    } catch {
      setFeedback({ type: 'error', message: 'Error de red configurando el servidor Node.js.' });
    } finally {
      setBusy(false);
    }
  };

  const handleFinishInstallation = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/install.php?action=finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo finalizar el instalador.' });
        return;
      }
      setLocked(true);
      setStep(5);
      setFeedback({ type: 'success', message: 'Instalación completada y protegida con api/install.lock.' });
    } catch {
      setFeedback({ type: 'error', message: 'Error de red al finalizar instalación.' });
    } finally {
      setBusy(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          Verificando entorno del servidor...
        </div>
      </div>
    );
  }

  if (locked && step !== 5) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white">Instalador Protegido</h1>
          <p className="mt-2 text-sm text-zinc-400">
            El sistema ya se encuentra instalado y bloqueado mediante <code className="text-zinc-200">api/install.lock</code>.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateToStore}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 transition whitespace-nowrap shrink-0"
            >
              <Store className="w-4 h-4" />
              Ir a la Tienda
            </button>
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 transition whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              Ir al Panel Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepsMeta = [
    { id: 1 as const, label: 'Base de Datos', icon: Database },
    { id: 2 as const, label: 'Marca & Logos', icon: Palette },
    { id: 3 as const, label: 'Theme Tienda', icon: Store },
    { id: 4 as const, label: 'Servidor Node.js', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
              <Sparkles className="w-3.5 h-3.5" />
              Asistente de Instalación Web
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Configuración Inicial del Sistema
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Conecta MySQL, personaliza la identidad de tu marca, elige el theme de la tienda y prepara el motor Node.js.
            </p>
          </div>
          {env && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300">
                PHP {env.phpVersion}
              </span>
              <span
                className={`rounded-lg border px-2.5 py-1 ${
                  env.pdoMysql
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/30 bg-red-500/10 text-red-400'
                }`}
              >
                PDO MySQL {env.pdoMysql ? 'OK' : 'Falta'}
              </span>
            </div>
          )}
        </div>

        {/* Stepper */}
        {step <= 4 && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stepsMeta.map((s) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id === 1 || dbInstalled) setStep(s.id);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition ${
                    active
                      ? 'border-orange-500 bg-orange-500/10 text-white'
                      : done
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-400'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? 'bg-orange-500 text-white'
                        : done
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider opacity-70">Paso {s.id}</div>
                    <div className="truncate text-xs font-semibold">{s.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback banner */}
        {feedback && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              feedback.type === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : feedback.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-sky-500/40 bg-sky-500/10 text-sky-200'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Card Principal */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 shadow-2xl">
          {/* PASO 1: BASE DE DATOS & SUPERADMIN */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">1. Conexión a MySQL / MariaDB y SuperAdmin</h2>
                <p className="text-sm text-zinc-400">
                  Se ejecutará <code className="text-zinc-200">database.sql</code>, se creará <code className="text-zinc-200">kv_storage</code> y se generará <code className="text-zinc-200">api/config.local.php</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Host MySQL</label>
                  <input
                    type="text"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    placeholder="localhost"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Puerto</label>
                  <input
                    type="number"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    placeholder="3306"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nombre de Base de Datos</label>
                  <input
                    type="text"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    placeholder="khalessi_erp"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Usuario MySQL</label>
                  <input
                    type="text"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    placeholder="root"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Contraseña MySQL</label>
                  <input
                    type="password"
                    value={dbPass}
                    onChange={(e) => setDbPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nombre del SuperAdmin Inicial</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Administrador General"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">PIN Personalizado SuperAdmin (4-12 dígitos)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="230895"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-mono tracking-widest text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleTestDb}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50 transition whitespace-nowrap shrink-0"
                >
                  <Database className="w-4 h-4" />
                  Probar Conexión
                </button>
                <div className="flex items-center gap-3">
                  {dbInstalled && (
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition whitespace-nowrap shrink-0"
                    >
                      Saltar al Paso 2
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleInstallDb}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50 transition whitespace-nowrap shrink-0"
                  >
                    {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Instalar Base de Datos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: MARCA, LOGOS, FAVICON Y COLOR */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">2. Identidad Visual, Logos, Favicon y Color</h2>
                <p className="text-sm text-zinc-400">
                  Las imágenes subidas se guardan físicamente en <code className="text-zinc-200">public/uploads/branding/</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nombre del Sistema / Negocio</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Slogan</label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Color del Sistema & Modo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2">Color Primario del Sistema</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.name}
                        onClick={() => setPrimaryColor(c.hex)}
                        className={`h-8 w-8 rounded-lg border-2 transition ${
                          primaryColor.toLowerCase() === c.hex.toLowerCase()
                            ? 'border-white scale-110'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
                    />
                    <span className="font-mono text-xs text-zinc-300">{primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2">Tema Base del Panel ERP</label>
                  <div className="flex gap-2">
                    {(['dark', 'light', 'system'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setThemePreference(mode)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition whitespace-nowrap shrink-0 ${
                          themePreference === mode
                            ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mode === 'dark' ? 'Oscuro' : mode === 'light' ? 'Claro' : 'Sistema'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Uploaders de Logos y Favicon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    { slot: 'logoLight', label: 'Logo del Sistema (Modo Claro)', value: logoLight, setter: setLogoLight },
                    { slot: 'logoDark', label: 'Logo del Sistema (Modo Oscuro)', value: logoDark, setter: setLogoDark },
                    { slot: 'storeHeaderLogo', label: 'Logo de la Tienda (Header)', value: storeHeaderLogo, setter: setStoreHeaderLogo },
                    { slot: 'favicon', label: 'Favicon (Icono del Navegador)', value: favicon, setter: setFavicon },
                  ] as const
                ).map((item) => (
                  <div key={item.slot} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-200">{item.label}</span>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 whitespace-nowrap shrink-0">
                        {uploadingSlot === item.slot ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        Subir
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
                          className="hidden"
                          onChange={(e) => void handleUploadAsset(item.slot, e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => item.setter(e.target.value)}
                      placeholder="/uploads/branding/... o https://..."
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none"
                    />
                    {item.value && (
                      <div className="flex items-center gap-3 pt-1">
                        <img
                          src={item.value}
                          alt={item.label}
                          className="h-10 w-10 rounded-lg border border-zinc-700 object-contain bg-zinc-900 p-1"
                        />
                        <span className="truncate text-[11px] text-zinc-400">{item.value}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 transition whitespace-nowrap shrink-0"
                >
                  Elegir Theme de Tienda
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: THEME DE LA TIENDA */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">3. Theme Inicial de la Tienda Online</h2>
                <p className="text-sm text-zinc-400">
                  Selecciona una de las 8 plantillas oficiales de StoreBuilder. Luego podrás personalizarla por bloques desde el Admin.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {FACTORY_TEMPLATES.map((tpl) => {
                  const selected = storeTemplateId === tpl.id;
                  const vis = TEMPLATE_VISUALS[tpl.id] || {
                    badge: tpl.themeMode === 'dark' ? 'Dark' : 'Light',
                    accent: primaryColor,
                    bg: tpl.themeMode === 'dark' ? '#18181b' : '#ffffff',
                    text: tpl.themeMode === 'dark' ? '#f4f4f5' : '#18181b',
                  };
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setStoreTemplateId(tpl.id)}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/40'
                          : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">{tpl.name}</span>
                          <span className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                            {vis.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {tpl.blocks.length} bloques configurados · Footer {tpl.footerTheme === 'dark' ? 'oscuro' : 'claro'}
                        </p>
                      </div>
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700"
                        style={{ backgroundColor: vis.bg }}
                      >
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: vis.accent }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSaveBrandingAndTheme}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50 transition whitespace-nowrap shrink-0"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Guardar Marca y Continuar
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: SERVIDOR NODE.JS */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">4. Motor Tiempo Real Node.js (SSE)</h2>
                  <p className="text-sm text-zinc-400">
                    Sincroniza instantáneamente Cocina KDS, POS y Delivery mediante <code className="text-zinc-200">server/app.js</code>.
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                    nodeStatus.online
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${nodeStatus.online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {nodeStatus.online ? 'Node.js En Línea' : 'Node.js Inactivo'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Puerto Node.js</label>
                  <input
                    type="number"
                    value={nodePort}
                    onChange={(e) => setNodePort(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">CORS Allowed Origin</label>
                  <input
                    type="text"
                    value={corsOrigin}
                    onChange={(e) => setCorsOrigin(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSetupNode(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-200 hover:bg-sky-500/25 disabled:opacity-50 transition whitespace-nowrap shrink-0"
                >
                  <Server className="w-4 h-4" />
                  Configurar e Intentar Activar Node.js
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void fetchStatus()}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                  Verificar Estado
                </button>
              </div>

              {manualNodeRequired && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 text-xs">
                  <div className="font-semibold text-amber-300">
                    Activación manual en cPanel (Setup Node.js App / Phusion Passenger)
                  </div>
                  <p className="text-zinc-300">
                    Ya generamos <code className="text-white">server/config.json</code> con el secreto sincronizado. Si tu hosting bloquea procesos en segundo plano desde PHP, registra la app en cPanel con estos datos:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                    {[
                      { k: 'root', label: 'Application root', val: serverRoot || 'server' },
                      { k: 'url', label: 'Application URL', val: 'realtime' },
                      { k: 'startup', label: 'Startup file', val: 'app.js' },
                      { k: 'secret', label: 'ERP_REALTIME_SECRET', val: realtimeSecret || '(en config.local.php)' },
                    ].map((row) => (
                      <div
                        key={row.k}
                        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-500">{row.label}</div>
                          <div className="truncate text-zinc-200">{row.val}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copyValue(row.k, row.val)}
                          className="shrink-0 text-zinc-400 hover:text-white"
                          title="Copiar"
                        >
                          {copiedField === row.k ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleFinishInstallation}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Finalizar y Bloquear Instalador
                </button>
              </div>
            </div>
          )}

          {/* PASO 5: COMPLETADO */}
          {step === 5 && (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">¡Sistema Instalado con Éxito!</h2>
              <p className="mx-auto max-w-md text-sm text-zinc-400">
                Tu base de datos MySQL, identidad visual, theme de tienda y configuración están listos. El instalador quedó bloqueado por seguridad.
              </p>
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onNavigateToStore}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition whitespace-nowrap shrink-0"
                >
                  <Store className="w-4 h-4" />
                  Abrir Tienda Online
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateToAdmin}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 transition whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Entrar al Panel ERP (/admin)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
