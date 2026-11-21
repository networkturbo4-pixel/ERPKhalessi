import React, { useState } from 'react';
import {
  X,
  BarChart3,
  Bot,
  Clock,
  AlertTriangle,
  Moon,
  Users,
  ShieldBan,
  DollarSign,
  Sliders,
} from 'lucide-react';
import { InboxOperationsConfig, WhatsAppConversation, WhatsAppDeliveryLog } from '../../types/whatsapp';
import { User } from '../../types/settings';
import { Order as CatalogOrder } from '../../types/catalog';
import { computeInboxAnalytics, isNightShiftActive } from './inboxIntelligence';

interface InboxMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: WhatsAppConversation[];
  logs: WhatsAppDeliveryLog[];
  orders: CatalogOrder[];
  users: User[];
  opsConfig: InboxOperationsConfig;
  onUpdateOpsConfig: (patch: Partial<InboxOperationsConfig>) => void;
  onUnblockPhone: (phone: string) => void;
  primaryColor: string;
}

export const InboxMetricsModal: React.FC<InboxMetricsModalProps> = ({
  isOpen,
  onClose,
  conversations,
  logs,
  orders,
  users,
  opsConfig,
  onUpdateOpsConfig,
  onUnblockPhone,
  primaryColor,
}) => {
  const [tab, setTab] = useState<'analytics' | 'operations'>('analytics');

  if (!isOpen) return null;

  const analytics = computeInboxAnalytics(
    conversations,
    logs,
    orders,
    opsConfig.slaAlertThresholdMinutes
  );
  const maxHeat = Math.max(1, ...analytics.hourlyHeatmap);
  const nightActive = isNightShiftActive(opsConfig);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5" style={{ color: primaryColor }} />
            <h2 className="font-bold text-base text-zinc-900 dark:text-white">
              Métricas SLA, BI y Operación de Bandeja
            </h2>
            {nightActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                <Moon className="w-3 h-3" />
                Guardia Nocturna Activa
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setTab('analytics')}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 ${
                  tab === 'analytics' ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'
                }`}
                style={tab === 'analytics' ? { backgroundColor: primaryColor } : undefined}
              >
                Métricas y SLA
              </button>
              <button
                type="button"
                onClick={() => setTab('operations')}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 ${
                  tab === 'operations' ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'
                }`}
                style={tab === 'operations' ? { backgroundColor: primaryColor } : undefined}
              >
                Operación y Turnos
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'analytics' ? (
            <>
              {/* Alerta al gerente si hay demasiados chats esperando */}
              {analytics.waitingCriticalCount >= opsConfig.slaAlertMaxWaiting && (
                <div className="p-3.5 rounded-xl bg-rose-500/12 border border-rose-500/30 flex items-center gap-3 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="text-xs">
                    <strong>Alerta SLA Gerencia:</strong> Hay {analytics.waitingCriticalCount} clientes esperando respuesta humana hace más de {opsConfig.slaAlertThresholdMinutes} minutos.
                  </div>
                </div>
              )}

              {/* KPIs principales */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    Tiempo 1ra Respuesta (FRT)
                  </div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                    {analytics.avgFirstResponseMin} min
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                    <Bot className="w-3.5 h-3.5 text-emerald-500" />
                    Autoservicio del Bot
                  </div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {analytics.botSelfServiceRate}%
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    Humanos sin Asignar
                  </div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {analytics.unassignedHumanCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                    <DollarSign className="w-3.5 h-3.5 text-purple-500" />
                    Costo Est. Plantillas Meta
                  </div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                    ${analytics.estimatedMetaMonthlyCostUsd.toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Conversión por canal + Top Etiquetas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Conversión de Ventas por Canal
                  </h3>
                  {(
                    [
                      { id: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
                      { id: 'facebook', label: 'Facebook Messenger', color: '#0084FF' },
                      { id: 'instagram', label: 'Instagram DM', color: '#E1306C' },
                    ] as const
                  ).map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                        {ch.label} ({analytics.ordersByChannel[ch.id]} ped.)
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-white">
                        S/ {analytics.revenueByChannel[ch.id].toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Top Etiquetas y Motivos de Contacto
                  </h3>
                  {analytics.topTags.length === 0 ? (
                    <p className="text-xs text-zinc-500">Sin etiquetas registradas aún.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {analytics.topTags.map((t) => (
                        <div key={t.name} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-700 dark:text-zinc-300">{t.name}</span>
                          <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                            {t.count} chats
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Mapa de calor por hora (RRHH) */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Mapa de Calor de Horas Pico (Planificación de Turnos)
                </h3>
                <div className="grid grid-cols-12 gap-1.5 pt-1">
                  {analytics.hourlyHeatmap.map((count, hour) => {
                    const intensity = count / maxHeat;
                    return (
                      <div key={hour} className="flex flex-col items-center gap-1">
                        <div
                          className="w-full h-7 rounded-md border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-[10px] font-mono font-bold"
                          style={{
                            backgroundColor:
                              count === 0
                                ? 'transparent'
                                : `rgba(16, 185, 129, ${Math.max(0.18, intensity)})`,
                          }}
                          title={`${hour}:00 h — ${count} mensajes`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                        <span className="text-[9px] text-zinc-400 font-mono">{hour}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rendimiento por Asesor */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Rendimiento por Asesor
                </h3>
                {analytics.agentLeaderboard.length === 0 ? (
                  <p className="text-xs text-zinc-500">Aún no hay chats asignados a asesores.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {analytics.agentLeaderboard.map((item) => {
                      const u = users.find((usr) => usr.id === item.userId);
                      return (
                        <div key={item.userId} className="py-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {u?.name || item.userId}
                          </span>
                          <span className="text-zinc-500">
                            {item.chats} atendidos · {item.resolved} resueltos
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Reglas operativas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-white">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    Atención, Fondo y Asignación
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                      Tu estado de disponibilidad
                    </label>
                    <select
                      value={opsConfig.agentStatus}
                      onChange={(e) =>
                        onUpdateOpsConfig({
                          agentStatus: e.target.value as InboxOperationsConfig['agentStatus'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="available">Disponible (recibe Round-Robin)</option>
                      <option value="paused">En pausa (no asignar nuevos chats)</option>
                      <option value="readonly">Solo lectura (modo supervisión)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                      Fondo del área de mensajes
                    </label>
                    <select
                      value={opsConfig.chatBackground}
                      onChange={(e) =>
                        onUpdateOpsConfig({
                          chatBackground: e.target.value as InboxOperationsConfig['chatBackground'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="whatsapp_pattern">Patrón sutil tipo WhatsApp</option>
                      <option value="minimal">Liso minimalista Apple</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opsConfig.roundRobinEnabled}
                      onChange={(e) => onUpdateOpsConfig({ roundRobinEnabled: e.target.checked })}
                      className="accent-emerald-600"
                    />
                    Asignación automática Round-Robin al tomar control
                  </label>

                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opsConfig.signMessagesWithAgentName}
                      onChange={(e) =>
                        onUpdateOpsConfig({ signMessagesWithAgentName: e.target.checked })
                      }
                      className="accent-emerald-600"
                    />
                    Firmar mensajes con mi nombre (*Asesor:* mensaje)
                  </label>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-white">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    Guardia Nocturna y Alertas SLA
                  </div>

                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opsConfig.nightModeEnabled}
                      onChange={(e) => onUpdateOpsConfig({ nightModeEnabled: e.target.checked })}
                      className="accent-indigo-600"
                    />
                    Activar modo Guardia Nocturna según horario
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-1">Inicio turno noche</label>
                      <input
                        type="time"
                        value={opsConfig.nightShiftStart}
                        onChange={(e) => onUpdateOpsConfig({ nightShiftStart: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-1">Fin turno noche</label>
                      <input
                        type="time"
                        value={opsConfig.nightShiftEnd}
                        onChange={(e) => onUpdateOpsConfig({ nightShiftEnd: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-1">Alerta SLA (min)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={opsConfig.slaAlertThresholdMinutes}
                        onChange={(e) =>
                          onUpdateOpsConfig({
                            slaAlertThresholdMinutes: Math.max(1, Number(e.target.value) || 5),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-1">Reactivar Bot (min)</label>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        value={opsConfig.autoReactivateBotMinutes}
                        onChange={(e) =>
                          onUpdateOpsConfig({
                            autoReactivateBotMinutes: Math.max(5, Number(e.target.value) || 30),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista negra de spam */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-white">
                  <ShieldBan className="w-4 h-4 text-rose-500" />
                  Números Bloqueados / Lista Negra Spam ({opsConfig.blockedPhones.length})
                </div>
                {opsConfig.blockedPhones.length === 0 ? (
                  <p className="text-xs text-zinc-500">No hay números bloqueados.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {opsConfig.blockedPhones.map((phone) => (
                      <span
                        key={phone}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-mono"
                      >
                        {phone}
                        <button
                          type="button"
                          onClick={() => onUnblockPhone(phone)}
                          className="font-sans font-bold hover:underline"
                        >
                          Desbloquear
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
