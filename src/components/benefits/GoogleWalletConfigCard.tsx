import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  MapPin,
  Bell,
  Clock,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  GoogleWalletConfig,
  GoogleWalletScheduledPromo,
  PointsProgramConfig,
} from '../../types/benefits';
import {
  fetchGoogleWalletStatus,
  createGoogleWalletSaveLink,
  sendGoogleWalletPromo,
  GoogleWalletServerStatus,
} from '../../utils/googleWallet';
import { useSettings } from '../../context/SettingsContext';

interface GoogleWalletConfigCardProps {
  pointsConfig: PointsProgramConfig;
  previewPoints: number;
  onUpdateConfig: (patch: Partial<PointsProgramConfig>) => void;
}

const DEFAULT_GW: GoogleWalletConfig = {
  enabled: false,
  issuerId: '',
  classSuffix: 'khalessi_loyalty_v1',
  issuerName: 'Khalessi Pizza',
  logoUrl: '',
  heroImageUrl: '',
  hexBackgroundColor: '#18181b',
  barcodeType: 'QR_CODE',
  enableLocationAlerts: true,
  scheduledPromos: [],
};

export const GoogleWalletConfigCard: React.FC<GoogleWalletConfigCardProps> = ({
  pointsConfig,
  previewPoints,
  onUpdateConfig,
}) => {
  const { dispatchToast, openNoticeModal, tenants } = useSettings();
  const [serverStatus, setServerStatus] = useState<GoogleWalletServerStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [testingPass, setTestingPass] = useState(false);

  // Estado del compositor de notificaciones push / programadas
  const [promoHeader, setPromoHeader] = useState('');
  const [promoBody, setPromoBody] = useState('');
  const [promoUrl, setPromoUrl] = useState('');
  const [promoMessageType, setPromoMessageType] = useState<'TEXT_AND_NOTIFY' | 'TEXT'>('TEXT_AND_NOTIFY');
  const [promoTargetMode, setPromoTargetMode] = useState<'all_class' | 'test_preview'>('all_class');
  const [promoScheduleMode, setPromoScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [promoScheduledAt, setPromoScheduledAt] = useState('');
  const [sendingPromo, setSendingPromo] = useState(false);

  const gw: GoogleWalletConfig = {
    ...DEFAULT_GW,
    ...(pointsConfig.googleWallet || {}),
  };

  const branchesWithGpsCount = useMemo(
    () =>
      tenants.filter(
        t =>
          typeof t.operations?.latitude === 'number' &&
          typeof t.operations?.longitude === 'number' &&
          t.operations.latitude !== 0 &&
          t.operations.longitude !== 0
      ).length,
    [tenants]
  );

  const scheduledPromos = useMemo(
    () => (Array.isArray(gw.scheduledPromos) ? gw.scheduledPromos : []),
    [gw.scheduledPromos]
  );

  const updateGw = (patch: Partial<GoogleWalletConfig>) => {
    onUpdateConfig({
      googleWallet: {
        ...gw,
        ...patch,
      },
    });
  };

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const status = await fetchGoogleWalletStatus();
      setServerStatus(status);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    void checkStatus();
  }, []);

  const handleTestPass = async () => {
    if (testingPass) return;
    setTestingPass(true);
    try {
      const res = await createGoogleWalletSaveLink({
        config: pointsConfig,
        customerId: 'demo-preview-001',
        customerName: 'Cliente Prueba Khalessi',
        customerPhone: '999000111',
        points: previewPoints,
      });

      if (res.success && res.saveUrl) {
        window.open(res.saveUrl, '_blank', 'noopener,noreferrer');
        dispatchToast(
          'Pase de prueba generado',
          'Se abrió el enlace oficial de Google Wallet en una nueva pestaña.',
          'success'
        );
        return;
      }

      openNoticeModal({
        title: 'No se pudo generar el pase de prueba',
        message: res.error || 'Verifica que el Issuer ID y el archivo google-wallet-sa.json estén configurados.',
        tone: 'warning',
        confirmLabel: 'Entendido',
      });
    } finally {
      setTestingPass(false);
    }
  };

  const handleDispatchPromo = async () => {
    const header = promoHeader.trim();
    const body = promoBody.trim();
    if (!header || !body) {
      dispatchToast('Campos requeridos', 'Ingresa un título y un mensaje para la notificación.', 'warning');
      return;
    }
    if (!gw.enabled || !gw.issuerId.trim()) {
      dispatchToast('Google Wallet inactivo', 'Habilita Google Wallet e ingresa tu Issuer ID primero.', 'warning');
      return;
    }

    if (promoScheduleMode === 'scheduled') {
      if (!promoScheduledAt) {
        dispatchToast('Fecha requerida', 'Selecciona la fecha y hora exacta para programar el envío.', 'warning');
        return;
      }
      const targetMs = new Date(promoScheduledAt).getTime();
      if (!Number.isFinite(targetMs) || targetMs <= Date.now()) {
        dispatchToast('Fecha inválida', 'La fecha y hora programada debe ser futura.', 'warning');
        return;
      }

      const newPromo: GoogleWalletScheduledPromo = {
        id: `gw-promo-${Date.now()}`,
        header,
        body,
        promoUrl: promoUrl.trim() || undefined,
        messageType: promoMessageType,
        targetMode: promoTargetMode,
        scheduledAt: new Date(promoScheduledAt).toISOString(),
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };
      updateGw({ scheduledPromos: [newPromo, ...scheduledPromos] });
      setPromoHeader('');
      setPromoBody('');
      setPromoUrl('');
      setPromoScheduledAt('');
      dispatchToast(
        'Notificación programada',
        `Se enviará automáticamente el ${new Date(newPromo.scheduledAt).toLocaleString()}.`,
        'success'
      );
      return;
    }

    if (sendingPromo) return;
    setSendingPromo(true);
    try {
      const res = await sendGoogleWalletPromo({
        issuerId: gw.issuerId,
        classSuffix: gw.classSuffix || 'khalessi_loyalty_v1',
        header,
        body,
        promoUrl: promoUrl.trim() || undefined,
        messageType: promoMessageType,
        targetCustomerId: promoTargetMode === 'test_preview' ? 'demo-preview-001' : '',
      });

      const nowIso = new Date().toISOString();
      const record: GoogleWalletScheduledPromo = {
        id: `gw-promo-${Date.now()}`,
        header,
        body,
        promoUrl: promoUrl.trim() || undefined,
        messageType: promoMessageType,
        targetMode: promoTargetMode,
        scheduledAt: nowIso,
        status: res.success ? 'sent' : 'failed',
        createdAt: nowIso,
        sentAt: res.success ? nowIso : undefined,
        error: res.success ? undefined : res.error || 'Error al enviar',
      };
      updateGw({ scheduledPromos: [record, ...scheduledPromos].slice(0, 30) });

      if (res.success) {
        setPromoHeader('');
        setPromoBody('');
        setPromoUrl('');
        dispatchToast(
          'Notificación enviada',
          promoTargetMode === 'test_preview'
            ? 'Se envió la notificación a tu tarjeta de prueba.'
            : 'Se envió la promoción a las tarjetas de tus clientes en Google Wallet.',
          'success'
        );
      } else {
        openNoticeModal({
          title: 'No se pudo enviar la notificación',
          message: res.error || 'Verifica que el pase o clase ya exista en Google Wallet.',
          tone: 'warning',
          confirmLabel: 'Entendido',
        });
      }
    } finally {
      setSendingPromo(false);
    }
  };

  const handleCancelScheduled = (promoId: string) => {
    updateGw({
      scheduledPromos: scheduledPromos.map(p => (p.id === promoId ? { ...p, status: 'cancelled' } : p)),
    });
    dispatchToast('Envío cancelado', 'La notificación programada fue cancelada.', 'info');
  };

  const handleDeletePromoRecord = (promoId: string) => {
    updateGw({
      scheduledPromos: scheduledPromos.filter(p => p.id !== promoId),
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                Google Wallet (Tarjeta de Puntos en el Celular)
              </h3>
              {serverStatus?.configured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Credenciales listas</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Falta Service Account JSON</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Permite que tus clientes guarden su tarjeta de puntos Khalessi en Google Wallet y reciban actualizaciones automáticas de saldo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={checkStatus}
            disabled={checkingStatus}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
            <span>Verificar</span>
          </button>

          <button
            type="button"
            onClick={() => updateGw({ enabled: !gw.enabled })}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-colors whitespace-nowrap ${
              gw.enabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            {gw.enabled ? 'Activo en Tienda' : 'Habilitar'}
          </button>
        </div>
      </div>

      {!serverStatus?.configured && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold">Cómo activar la firma en el servidor:</p>
          <p className="leading-relaxed opacity-90">
            Descarga el archivo JSON de tu Service Account desde Google Cloud Console (con <strong>Google Wallet API</strong> habilitada) y guárdalo en{' '}
            <code className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 font-mono">data/google-wallet-sa.json</code> (local) o{' '}
            <code className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 font-mono">api/storage/google-wallet-sa.json</code> (cPanel).
          </p>
        </div>
      )}

      {serverStatus?.configured && serverStatus.serviceAccountEmail && (
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 flex-wrap">
          <span>
            Service Account activa: <code className="font-mono font-bold">{serverStatus.serviceAccountEmail}</code>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
            Google Wallet Issuer ID *
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Ej: 3388000000022123456"
            value={gw.issuerId}
            onChange={e => updateGw({ issuerId: e.target.value.replace(/[^0-9]/g, '') })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
            Class Suffix (ID de Plantilla)
          </label>
          <input
            type="text"
            placeholder="khalessi_loyalty_v1"
            value={gw.classSuffix}
            onChange={e => updateGw({ classSuffix: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
            Nombre del Emisor
          </label>
          <input
            type="text"
            placeholder="Khalessi Pizza"
            value={gw.issuerName}
            onChange={e => updateGw({ issuerName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
            URL Pública del Logo (HTTPS)
          </label>
          <input
            type="url"
            placeholder="https://tudominio.com/logo-wallet.png"
            value={gw.logoUrl || ''}
            onChange={e => updateGw({ logoUrl: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
            Color de Fondo en Wallet
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={gw.hexBackgroundColor || '#18181b'}
              onChange={e => updateGw({ hexBackgroundColor: e.target.value })}
              className="w-11 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={gw.hexBackgroundColor || '#18181b'}
              onChange={e => updateGw({ hexBackgroundColor: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {[
              { label: 'Oscura', hex: '#18181b' },
              { label: 'Roja', hex: '#db0021' },
              { label: 'Vino', hex: '#7f1d1d' },
              { label: 'Dorada', hex: '#292524' },
            ].map(preset => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => updateGw({ hexBackgroundColor: preset.hex })}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  (gw.hexBackgroundColor || '').toLowerCase() === preset.hex
                    ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
            {pointsConfig.cardBgColor && (
              <button
                type="button"
                onClick={() => updateGw({ hexBackgroundColor: pointsConfig.cardBgColor })}
                className="px-2 py-1 rounded-lg text-[10px] font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Igual a Tarjeta Web
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
            Código en la Tarjeta
          </label>
          <select
            value={gw.barcodeType || 'QR_CODE'}
            onChange={e => updateGw({ barcodeType: e.target.value as 'QR_CODE' | 'CODE_128' | 'NONE' })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
          >
            <option value="NONE">Sin código (Diseño limpio sin QR)</option>
            <option value="QR_CODE">Código QR (Escaneable en caja)</option>
            <option value="CODE_128">Código de Barras (Code 128)</option>
          </select>
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
            Imagen Banner Inferior / Hero (HTTPS opcional, 1032×336 px)
          </label>
          <input
            type="url"
            placeholder="https://tudominio.com/banner-wallet.png (en producción HTTPS se genera la cartilla de sellos automáticamente si lo dejas vacío)"
            value={gw.heroImageUrl || ''}
            onChange={e => updateGw({ heroImageUrl: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          El botón aparecerá automáticamente debajo de la tarjeta de puntos del cliente cuando esté habilitado y con Issuer ID.
        </span>
        <button
          type="button"
          onClick={handleTestPass}
          disabled={testingPass || !gw.enabled || !gw.issuerId.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-45 text-white text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          <span>{testingPass ? 'Generando...' : 'Probar Pase en Google Wallet'}</span>
        </button>
      </div>

      {/* Geofencing: Alertas por cercanía a sucursales */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Alertas por Cercanía a Sucursales (Geofencing)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {branchesWithGpsCount} {branchesWithGpsCount === 1 ? 'sede con GPS' : 'sedes con GPS'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Cuando el cliente pase cerca de una sucursal Khalessi, Android mostrará su tarjeta automáticamente en la pantalla de bloqueo.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateGw({ enableLocationAlerts: gw.enableLocationAlerts === false })}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-colors whitespace-nowrap shrink-0 ${
            gw.enableLocationAlerts !== false
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
        >
          {gw.enableLocationAlerts !== false ? 'Activado' : 'Desactivado'}
        </button>
      </div>

      {/* Campañas y Notificaciones Push Personalizables / Programadas */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-zinc-900 dark:text-white">
                Enviar o Programar Notificación de Promoción
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Envía avisos push directo a Google Wallet (máx. 3 notificaciones push cada 24h por pase según política de Google).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
              Título de la Notificación *
            </label>
            <input
              type="text"
              maxLength={80}
              placeholder="Ej: 🍕 ¡Hoy 2x1 en Pizzas Familiares!"
              value={promoHeader}
              onChange={e => setPromoHeader(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
              Enlace de Destino (HTTPS opcional)
            </label>
            <input
              type="url"
              placeholder="https://tudominio.com/promociones"
              value={promoUrl}
              onChange={e => setPromoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
              Mensaje Personalizado * ({promoBody.length}/400)
            </label>
            <textarea
              rows={2}
              maxLength={400}
              placeholder="Ej: Presenta tu tarjeta Khalessi hoy y acumula doble sello en tu pedido."
              value={promoBody}
              onChange={e => setPromoBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
              Alcance de Envío
            </label>
            <select
              value={promoTargetMode}
              onChange={e => setPromoTargetMode(e.target.value as 'all_class' | 'test_preview')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
            >
              <option value="all_class">Todos los clientes con tarjeta guardada</option>
              <option value="test_preview">Solo tarjeta de prueba (demo-preview-001)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
              Modo de Notificación
            </label>
            <select
              value={promoMessageType}
              onChange={e => setPromoMessageType(e.target.value as 'TEXT_AND_NOTIFY' | 'TEXT')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
            >
              <option value="TEXT_AND_NOTIFY">Notificación Push + Mensaje en tarjeta</option>
              <option value="TEXT">Solo guardar en detalle de tarjeta (silencioso)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
              Momento de Envío
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPromoScheduleMode('now')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-colors ${
                  promoScheduleMode === 'now'
                    ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-amber-500 dark:text-zinc-950 dark:border-amber-500'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Enviar Ahora
              </button>
              <button
                type="button"
                onClick={() => setPromoScheduleMode('scheduled')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-colors ${
                  promoScheduleMode === 'scheduled'
                    ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-amber-500 dark:text-zinc-950 dark:border-amber-500'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Programar Fecha
              </button>
            </div>
          </div>

          {promoScheduleMode === 'scheduled' && (
            <div>
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                Fecha y Hora Exacta *
              </label>
              <input
                type="datetime-local"
                value={promoScheduledAt}
                onChange={e => setPromoScheduledAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDispatchPromo}
            disabled={sendingPromo || !gw.enabled || !gw.issuerId.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-45 text-white text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {promoScheduleMode === 'scheduled' ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Programar Notificación</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{sendingPromo ? 'Enviando...' : 'Enviar Notificación Ahora'}</span>
              </>
            )}
          </button>
        </div>

        {scheduledPromos.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <span className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Historial y Programadas ({scheduledPromos.length})
            </span>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {scheduledPromos.map(item => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-zinc-900 dark:text-white">{item.header}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.status === 'sent'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : item.status === 'scheduled'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : item.status === 'failed'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'bg-zinc-500/15 text-zinc-500'
                        }`}
                      >
                        {item.status === 'sent'
                          ? 'Enviada'
                          : item.status === 'scheduled'
                          ? 'Programada'
                          : item.status === 'failed'
                          ? 'Error'
                          : 'Cancelada'}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {item.targetMode === 'test_preview' ? 'Prueba' : 'Todos'} ·{' '}
                        {new Date(item.sentAt || item.scheduledAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">{item.body}</p>
                    {item.error && <p className="text-[10px] text-rose-500 font-semibold">{item.error}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => handleCancelScheduled(item.id)}
                        title="Cancelar envío programado"
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePromoRecord(item.id)}
                      title="Eliminar registro"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
