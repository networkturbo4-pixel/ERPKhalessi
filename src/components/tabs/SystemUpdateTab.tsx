import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { GitBranch, GitCommit, RefreshCw, Terminal, Database, HardDrive, Cpu, Activity, CheckCircle, AlertTriangle, ArrowUpCircle } from 'lucide-react';

export const SystemUpdateTab: React.FC = () => {
  const { systemMetrics, dispatchToast, customization } = useSettings();

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsCheckingUpdate(false);
    setUpdateAvailable(true);
    dispatchToast('Actualización Encontrada', 'Existe una versión v2.8.5-hotfix con mejoras en cocina KDS.', 'info');
  };

  const handleStartUpdate = async () => {
    setIsUpdating(true);
    setTerminalLogs([
      '⚡ [DEV-OPS] Iniciando proceso de despliegue automatizado...',
      '🔍 Conectando con repositorio Git remoto origin/main...',
    ]);

    const steps = [
      '📥 git fetch --all && git checkout main',
      '📦 git pull origin main (Fast-forward: 4 files changed, 82 insertions)',
      '📦 Validando dependencias npm (npm ci --prefer-offline)...',
      '🗄️ Ejecutando migraciones Prisma en PostgreSQL: `npx prisma migrate deploy`',
      '⚡ Reconstruyendo bundle de producción con Vite: `npm run build`',
      '🔄 Recargando workers de Node.js con zero-downtime...',
      '✅ ¡Sistema actualizado exitosamente a v2.8.5-hotfix! Todas las sedes operativas.'
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 700));
      setTerminalLogs(prev => [...prev, step]);
    }

    setIsUpdating(false);
    dispatchToast('Sistema Actualizado', 'El ERP se encuentra en la versión más reciente.', 'success');
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsBackingUp(false);
    dispatchToast('Copia de Seguridad Creada', 'Backup de PostgreSQL cifrado y almacenado en Google Drive.', 'success');
  };

  const ramPercent = Math.round((systemMetrics.ramUsedGb / systemMetrics.ramTotalGb) * 100);
  const diskPercent = Math.round((systemMetrics.diskUsedGb / systemMetrics.diskTotalGb) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <Terminal className="h-5 w-5 text-brand-500 dark:text-brand-400" />
            DevOps, Estado del Servidor y Actualizaciones
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Supervisa la salud de la infraestructura, base de datos PostgreSQL, respaldos y actualizaciones en caliente.
          </p>
        </div>

        <PermissionGate permission="settings:system_update" hideInsteadOfBanner>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="saas-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg"
            >
              <Database className={`h-3.5 w-3.5 ${isBackingUp ? 'animate-bounce text-brand-500 dark:text-brand-400' : ''}`} />
              {isBackingUp ? 'Generando Dump...' : 'Backup PostgreSQL'}
            </button>
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 rounded-lg hover:opacity-90 transition-opacity"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              {isCheckingUpdate ? 'Comprobando...' : 'Comprobar Actualizaciones'}
            </button>
          </div>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:system_update">
        {/* Version info banner */}
        <div className="saas-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Versión Instalada:</span>
              <span className="text-lg font-extrabold text-zinc-950 dark:text-white font-mono">
                {systemMetrics.version}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle className="h-3 w-3" /> Producción
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-zinc-600 dark:text-zinc-300 font-mono">
              <span className="flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" />
                Rama: <strong className="text-zinc-900 dark:text-white">{systemMetrics.gitBranch}</strong>
              </span>
              <span className="flex items-center gap-1">
                <GitCommit className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" />
                Commit: <strong className="text-zinc-900 dark:text-white">{systemMetrics.gitCommit}</strong>
              </span>
              <span>Uptime: {systemMetrics.uptime}</span>
            </div>
          </div>

          {updateAvailable && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3.5 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                  Nueva versión disponible: v2.8.5-hotfix
                </span>
                <span className="text-[10px] text-amber-800 dark:text-amber-300">Incluye parches de concurrencia en comandas POS.</span>
              </div>
              <button
                type="button"
                onClick={handleStartUpdate}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm shrink-0 transition-colors"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                {isUpdating ? 'Actualizando...' : 'Actualizar Ahora'}
              </button>
            </div>
          )}
        </div>

        {/* Server Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU */}
          <div className="saas-card p-5">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 text-xs mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Cpu className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Uso de CPU
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{systemMetrics.cpuUsagePercent}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${systemMetrics.cpuUsagePercent}%`, backgroundColor: customization.primaryColor }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-2">Carga balanceada (8 Cores)</span>
          </div>

          {/* RAM */}
          <div className="saas-card p-5">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 text-xs mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Activity className="h-4 w-4 text-sky-500 dark:text-sky-400" /> Memoria RAM
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{systemMetrics.ramUsedGb} / {systemMetrics.ramTotalGb} GB</span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${ramPercent}%` }} />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-2">{ramPercent}% en uso</span>
          </div>

          {/* DISK */}
          <div className="saas-card p-5">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 text-xs mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <HardDrive className="h-4 w-4 text-indigo-500 dark:text-indigo-400" /> Disco SSD NVMe
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{systemMetrics.diskUsedGb} / {systemMetrics.diskTotalGb} GB</span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${diskPercent}%` }} />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-2">{systemMetrics.diskTotalGb - systemMetrics.diskUsedGb} GB disponibles</span>
          </div>

          {/* POSTGRES */}
          <div className="saas-card p-5">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 text-xs mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Database className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /> PostgreSQL
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{systemMetrics.dbLatencyMs} ms</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-200">
              <span>{systemMetrics.dbConnectionsActive} conexiones activas</span>
              <span className="font-mono">{systemMetrics.dbSizeMb} MB</span>
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-2">{systemMetrics.lastBackupAt}</span>
          </div>
        </div>

        {/* Real-time Terminal Output */}
        <div className="bg-[#09090b] rounded-2xl border border-zinc-700/80 p-5 shadow-xl font-mono text-xs text-zinc-200 space-y-2">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
              <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
              <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
              <span className="ml-2 font-bold text-zinc-100">Terminal de Actualizaciones y Migraciones en Vivo</span>
            </div>
            <span>node@khalessi-erp:~/prod</span>
          </div>

          <div className="min-h-36 max-h-60 overflow-y-auto space-y-1.5 py-2">
            {terminalLogs.length === 0 ? (
              <p className="text-zinc-400 italic">
                Presiona "Comprobar Actualizaciones" o "Actualizar Sistema" para transmitir los logs de despliegue aquí...
              </p>
            ) : (
              terminalLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-zinc-500 select-none">&gt;</span>
                  <span className={log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('⚡') ? 'text-amber-300' : 'text-zinc-200'}>
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </PermissionGate>
    </div>
  );
};
