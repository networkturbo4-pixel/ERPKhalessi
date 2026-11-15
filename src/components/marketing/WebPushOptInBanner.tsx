import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Smartphone } from 'lucide-react';
import {
  isIosSafariWithoutStandalone,
  isWebPushSupported,
  subscribeToWebPush,
} from '../../utils/webPushClient';
import { useSettings } from '../../context/SettingsContext';

interface WebPushOptInBannerProps {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  tenantId?: string;
  isLightTheme?: boolean;
}

export const WebPushOptInBanner: React.FC<WebPushOptInBannerProps> = ({
  customerId,
  customerName,
  customerPhone,
  tenantId,
  isLightTheme = false,
}) => {
  const { dispatchToast } = useSettings();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    setIosNeedsInstall(isIosSafariWithoutStandalone());
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/sw.js').then(reg => {
        if (!reg) return;
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setSubscribed(true);
        });
      }).catch(() => undefined);
    }
  }, []);

  const handleActivate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await subscribeToWebPush({
        customerId,
        customerName,
        customerPhone,
        tenantId,
      });
      if (res.success) {
        setSubscribed(true);
        dispatchToast(
          'Notificaciones activadas',
          'Recibirás alertas de promociones y tus premios directo en tu dispositivo.',
          'success'
        );
      } else {
        dispatchToast('No se pudo activar', res.error || 'Verifica los permisos de tu navegador.', 'warning');
      }
    } finally {
      setLoading(false);
    }
  };

  if (iosNeedsInstall) {
    return (
      <div
        className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
          isLightTheme
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
        }`}
      >
        <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
        <div className="space-y-0.5">
          <p className="font-black">Recibe promos en tu iPhone / iPad</p>
          <p className="opacity-85 leading-relaxed">
            Toca el botón <strong>Compartir</strong> de Safari y elige <strong>“Agregar a pantalla de inicio”</strong> para activar alertas de promos y puntos.
          </p>
        </div>
      </div>
    );
  }

  if (!isWebPushSupported()) return null;

  if (subscribed) {
    return (
      <div
        className={`px-3.5 py-2 rounded-2xl border text-[11px] font-bold flex items-center justify-between gap-2 ${
          isLightTheme
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <BellRing className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Alertas de promos y pedidos activadas</span>
        </span>
        <button
          type="button"
          onClick={handleActivate}
          className="text-[10px] underline opacity-80 hover:opacity-100 whitespace-nowrap"
        >
          Sincronizar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleActivate}
      disabled={loading}
      className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
        isLightTheme
          ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
          : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-amber-300'
      }`}
    >
      <Bell className="w-4 h-4 shrink-0" />
      <span className="whitespace-nowrap">
        {loading ? 'Activando notificaciones...' : 'Activar Alertas de Promos en mi Celular / PC'}
      </span>
    </button>
  );
};
