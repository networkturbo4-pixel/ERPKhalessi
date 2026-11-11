import React, { useState, useMemo, useId } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { AuditCategory, AuditSeverity } from '../../types/settings';
import {
  ShieldCheck,
  Activity,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Wifi,
  WifiOff,
  HardDrive,
  Eraser,
  Clock,
} from 'lucide-react';

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  auth: 'Acceso Numérico',
  rbac: 'Matriz RBAC',
  fiscal: 'Datos Fiscales',
  branch: 'Sucursales',
  users: 'Colaboradores',
  hr: 'RR.HH. & Biométrico',
  appearance: 'Interfaz / Marca',
  system: 'Núcleo / Salud',
};

export const AuditHealthTab: React.FC = () => {
  const {
    customization,
    auditLogs,
    clearInfoAuditLogs,
    consistencyReport,
    runHealthDiagnostics,
    exportBackupSnapshot,
  } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditSeverity>('all');
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  const searchInputId = useId();

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auditLogs.filter(entry => {
      const catOk = categoryFilter === 'all' || entry.category === categoryFilter;
      const sevOk = severityFilter === 'all' || entry.severity === severityFilter;
      if (!catOk || !sevOk) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.actorName.toLowerCase().includes(q) ||
        entry.branchName.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, categoryFilter, severityFilter, searchQuery]);

  const handleRunDiagnostics = async () => {
    setIsRunningCheck(true);
    await new Promise(r => setTimeout(r, 350));
    runHealthDiagnostics();
    setIsRunningCheck(false);
  };

  const healthyCount = consistencyReport.checks.filter(c => c.status === 'healthy').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Auditoría, Consistencia Local y Salud del Núcleo
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Trazabilidad inmutable de eventos críticos, verificación de integridad en caché y diagnóstico pre-operativo.
          </p>
        </div>

        <PermissionGate permission="settings:view" hideInsteadOfBanner>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={exportBackupSnapshot}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar Snapshot JSON
            </button>
            <button
              type="button"
              onClick={handleRunDiagnostics}
              disabled={isRunningCheck}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm hover:opacity-95 transition-all disabled:opacity-60 whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRunningCheck ? 'animate-spin' : ''}`} />
              {isRunningCheck ? 'Verificando...' : 'Ejecutar Diagnóstico Integral'}
            </button>
          </div>
        </PermissionGate>
      </div>

      {/* 1. Real-Time Resilience & Consistency KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="saas-card p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Firma de Consistencia Local
            </span>
            <span className="text-base font-bold font-mono text-zinc-950 dark:text-white mt-1 block">
              {consistencyReport.checksum}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
              {(consistencyReport.storageBytes / 1024).toFixed(1)} KB persistidos · Verificado {consistencyReport.lastVerifiedAt}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <HardDrive className="h-5 w-5" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Salud de Subsistemas
            </span>
            <span className="text-base font-bold text-zinc-950 dark:text-white mt-1 block">
              {healthyCount} / {consistencyReport.checks.length} Controles Óptimos
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
              {consistencyReport.schemaValid ? 'Esquema multisucursal íntegro' : 'Revisión sugerida'}
            </span>
          </div>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Estado de Red & Sincronía
            </span>
            <span className="text-base font-bold text-zinc-950 dark:text-white mt-1 block">
              {consistencyReport.isOnline ? 'En Línea (Tiempo Real)' : 'Modo Resiliente Offline'}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
              {auditLogs.length} eventos registrados en bitácora
            </span>
          </div>
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              consistencyReport.isOnline
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}
          >
            {consistencyReport.isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* 2. Subsystem Health Matrix */}
      <div className="saas-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
            Verificación de Consistencia Pre-Operativa
          </h3>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Auto-monitoreo activo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {consistencyReport.checks.map(chk => (
            <div key={chk.id} className="p-3.5 rounded-xl saas-subcard flex flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white leading-snug">
                  {chk.label}
                </span>
                {chk.status === 'healthy' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : chk.status === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {chk.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Critical Event Audit Trail */}
      <div className="saas-card overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <search className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-sm">
              <label htmlFor={searchInputId} className="sr-only">
                Buscar evento en auditoría
              </label>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                id={searchInputId}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filtrar por usuario, sede o acción..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl saas-input"
              />
            </div>

            <select
              aria-label="Filtrar por módulo"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as 'all' | AuditCategory)}
              className="px-3 py-2 text-xs rounded-xl saas-input font-medium"
            >
              <option value="all">Todas las Categorías</option>
              <option value="auth">Accesos Numéricos (Login)</option>
              <option value="rbac">Matriz RBAC y Roles</option>
              <option value="fiscal">Datos Fiscales y Cobros</option>
              <option value="branch">Sucursales</option>
              <option value="users">Colaboradores</option>
              <option value="system">Salud y Sistema</option>
            </select>

            <select
              aria-label="Filtrar por nivel de severidad"
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as 'all' | AuditSeverity)}
              className="px-3 py-2 text-xs rounded-xl saas-input font-medium"
            >
              <option value="all">Todas las Severidades</option>
              <option value="critical">Críticos</option>
              <option value="warning">Advertencias</option>
              <option value="info">Informativos</option>
            </select>
          </search>

          <button
            type="button"
            onClick={clearInfoAuditLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
          >
            <Eraser className="h-3.5 w-3.5" />
            Depurar Informativos
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-[#202026] text-zinc-600 dark:text-zinc-300 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-700/80">
              <tr>
                <th className="px-4 py-3">Fecha / Hora</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Responsable & Sede</th>
                <th className="px-4 py-3">Evento Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No existen registros de auditoría que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(entry => {
                  const dateObj = new Date(entry.timestamp);
                  const timeStr = Number.isNaN(dateObj.getTime())
                    ? entry.timestamp
                    : dateObj.toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          {timeStr}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {entry.severity === 'critical' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            Crítico
                          </span>
                        ) : entry.severity === 'warning' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Alerta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Info
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md saas-subcard text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-zinc-900 dark:text-white block">
                          {entry.actorName}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {entry.actorRole} · {entry.branchName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-zinc-900 dark:text-white block">
                          {entry.action}
                        </span>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                          {entry.details}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
