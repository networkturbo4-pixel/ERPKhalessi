import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';

interface OfflineStatusBadgeProps {
  compact?: boolean;
}

export const OfflineStatusBadge: React.FC<OfflineStatusBadgeProps> = ({ compact = false }) => {
  const { offlineStatus, syncOfflineQueueNow } = useOrderCatalog();
  const { dispatchToast } = useSettings();

  const { isOnline, pendingCount, isSyncing } = offlineStatus;

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    const synced = await syncOfflineQueueNow();
    if (synced > 0) {
      dispatchToast(
        'Cola Sincronizada',
        `Se sincronizaron ${synced} operación(es) pendientes con el servidor.`,
        'success'
      );
    }
  };

  if (!isOnline) {
    return (
      <div
        title="Sin conexión: los pedidos se guardan en IndexedDB y se sincronizarán al volver la red"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 whitespace-nowrap shrink-0"
      >
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>
          {compact ? 'Offline' : 'Modo Offline'}
          {pendingCount > 0 ? ` · ${pendingCount} en cola` : ''}
        </span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => void handleManualSync()}
        disabled={isSyncing}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingCount})`}</span>
      </button>
    );
  }

  return (
    <div
      title="Conectado y sincronizado en tiempo real"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap shrink-0"
    >
      <Wifi className="w-3.5 h-3.5 shrink-0" />
      <span>{compact ? 'Online' : 'En línea'}</span>
    </div>
  );
};
