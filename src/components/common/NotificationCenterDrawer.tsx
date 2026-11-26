import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Flame,
  Bike,
  Package,
  Trash2,
  X,
  ChevronRight,
} from 'lucide-react';
import { useSettings, ErpNotificationItem } from '../../context/SettingsContext';

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateModule?: (moduleId: string) => void;
  kitchenQueueCount?: number;
  deliveryPendingCount?: number;
  lowStockCount?: number;
}

type FilterTab = 'all' | 'unread' | 'alerts';

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return 'Ahora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs} h`;
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

export const NotificationCenterDrawer: React.FC<NotificationCenterDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateModule,
  kitchenQueueCount = 0,
  deliveryPendingCount = 0,
  lowStockCount = 0,
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    customization,
  } = useSettings();

  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.read);
    if (filter === 'alerts') {
      return notifications.filter(
        n => n.type === 'warning' || n.type === 'error' || n.type === 'critical'
      );
    }
    return notifications;
  }, [notifications, filter]);

  if (!isOpen) return null;

  const hasLiveAlerts = kitchenQueueCount > 0 || deliveryPendingCount > 0 || lowStockCount > 0;

  const getToneBadge = (type: ErpNotificationItem['type']) => {
    switch (type) {
      case 'success':
        return {
          cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle2 className="h-4 w-4" />,
        };
      case 'warning':
        return {
          cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: <AlertTriangle className="h-4 w-4" />,
        };
      case 'error':
        return {
          cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          icon: <XCircle className="h-4 w-4" />,
        };
      case 'critical':
        return {
          cls: 'bg-rose-600/20 text-rose-600 dark:text-rose-400 border-rose-500/40',
          icon: <Flame className="h-4 w-4" />,
        };
      default:
        return {
          cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
          icon: <Info className="h-4 w-4" />,
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end items-end sm:items-stretch bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Centro de notificaciones del sistema"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md h-[86dvh] sm:h-dvh bg-white dark:bg-[#111114] border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-zinc-950 dark:text-white tracking-tight truncate">
                Centro de Notificaciones
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {unreadNotificationsCount > 0
                  ? `${unreadNotificationsCount} aviso${unreadNotificationsCount === 1 ? '' : 's'} sin leer`
                  : 'Todo al día en tu operación'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar centro de notificaciones"
            className="h-8 w-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Operational Alerts Strip */}
        {hasLiveAlerts && (
          <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 space-y-2 shrink-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Alertas Operativas en Vivo
            </div>
            <div className="space-y-1.5">
              {kitchenQueueCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateModule?.('kds');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-left hover:bg-amber-500/15 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Flame className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      Cocina KDS: {kitchenQueueCount} pedido{kitchenQueueCount === 1 ? '' : 's'} en cola
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                </button>
              )}

              {deliveryPendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateModule?.('delivery');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 text-left hover:bg-sky-500/15 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bike className="h-4 w-4 text-sky-500 shrink-0" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      Delivery: {deliveryPendingCount} despacho{deliveryPendingCount === 1 ? '' : 's'} activo{deliveryPendingCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                </button>
              )}

              {lowStockCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateModule?.('inventory');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-left hover:bg-rose-500/15 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      Inventario: {lowStockCount} insumo{lowStockCount === 1 ? '' : 's'} con stock bajo
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter Bar + Bulk Actions */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            {(
              [
                { id: 'all', label: 'Todas' },
                { id: 'unread', label: 'No leídas' },
                { id: 'alerts', label: 'Alertas' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Leídas</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors whitespace-nowrap shrink-0"
                title="Limpiar historial"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Sin notificaciones en esta vista
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                Todos los avisos de POS, Kiosco, Cocina, Delivery, Beneficios, Inventarios, RRHH y Facturación aparecerán registrados aquí.
              </p>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const tone = getToneBadge(item.type);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => markNotificationRead(item.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                    item.read
                      ? 'bg-transparent border-zinc-200/70 dark:border-zinc-800/70 opacity-75 hover:opacity-100'
                      : 'bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-700/80 shadow-xs'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${tone.cls}`}
                  >
                    {tone.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 whitespace-nowrap shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5 break-words">
                      {item.message}
                    </p>
                  </div>
                  {!item.read && (
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full shrink-0 mt-2"
                      style={{ backgroundColor: customization.primaryColor }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
