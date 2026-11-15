import React, { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { PointsProgramConfig } from '../../types/benefits';
import { createGoogleWalletSaveLink } from '../../utils/googleWallet';
import { useSettings } from '../../context/SettingsContext';

interface AddToGoogleWalletButtonProps {
  config: PointsProgramConfig;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  points: number;
  className?: string;
}

export const AddToGoogleWalletButton: React.FC<AddToGoogleWalletButtonProps> = ({
  config,
  customerId,
  customerName,
  customerPhone,
  points,
  className = '',
}) => {
  const { dispatchToast, openNoticeModal } = useSettings();
  const [loading, setLoading] = useState(false);

  const gw = config.googleWallet;
  if (!config.enabled || config.status === 'paused' || !gw?.enabled || !gw?.issuerId?.trim()) {
    return null;
  }

  const handleAddToWallet = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await createGoogleWalletSaveLink({
        config,
        customerId,
        customerName,
        customerPhone,
        points,
      });

      if (result.success && result.saveUrl) {
        window.open(result.saveUrl, '_blank', 'noopener,noreferrer');
        dispatchToast(
          'Tarjeta lista para Google Wallet',
          'Se abrió la ventana oficial de Google Wallet para guardar tu tarjeta.',
          'success'
        );
        return;
      }

      if (result.code === 'SERVICE_ACCOUNT_MISSING') {
        openNoticeModal({
          title: 'Google Wallet pendiente de credenciales',
          message:
            'El administrador aún debe cargar el archivo google-wallet-sa.json en el servidor para activar la firma de pases en Google Wallet.',
          tone: 'warning',
          confirmLabel: 'Entendido',
        });
        return;
      }

      dispatchToast(
        'No se pudo generar el pase',
        result.error || 'Ocurrió un error al conectar con Google Wallet.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAddToWallet}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-900 text-white border border-zinc-700/80 shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
      ) : (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 19 3 17.88 3 16.5v-9C3 6.12 4.12 5 5.5 5h13C19.88 5 21 6.12 21 7.5z"
          />
          <path
            fill="#34A853"
            d="M21 9.2H3V7.5C3 6.12 4.12 5 5.5 5h13C19.88 5 21 6.12 21 7.5v1.7z"
          />
          <path
            fill="#FBBC04"
            d="M21 11.4H3V9.2h18v2.2z"
          />
          <path
            fill="#EA4335"
            d="M21 13.6H3v-2.2h18v2.2z"
          />
          <path
            fill="#FFFFFF"
            d="M3 13.2h5.2c1.1 0 2.1.65 2.55 1.65.45.98 1.43 1.65 2.55 1.65h.4c1.12 0 2.1-.67 2.55-1.65.45-1 1.45-1.65 2.55-1.65H21v3.3c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 19 3 17.88 3 16.5v-3.3z"
            opacity="0.92"
          />
        </svg>
      )}
      <span className="text-xs font-bold tracking-tight whitespace-nowrap">
        {loading ? 'Generando pase...' : 'Agregar a Google Wallet'}
      </span>
      {!loading && <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
    </button>
  );
};
