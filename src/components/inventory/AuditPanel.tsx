import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { ClipboardCheck, Lock, Plus, X } from 'lucide-react';

export const AuditPanel: React.FC = () => {
  const { audits, openStockAudit, recordAuditCount, closeStockAudit, items } = useInventory();
  const { openNoticeModal, dispatchToast } = useSettings();
  const { hasPermission } = useRBAC();

  const [selectedAuditId, setSelectedAuditId] = useState<string>(audits[0]?.id || '');
  const [isNewAuditModalOpen, setIsNewAuditModalOpen] = useState<boolean>(false);
  const [newAuditPeriod, setNewAuditPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [newAuditNotes, setNewAuditNotes] = useState<string>('Conteo físico mensual');

  const activeAudit = audits.find(a => a.id === selectedAuditId);

  const canAudit = hasPermission('inventory:audit');

  const handleOpenNewAudit = () => {
    setIsNewAuditModalOpen(true);
  };

  const handleConfirmCreateAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPeriod = newAuditPeriod.trim() || '2026-11';
    const cleanNotes = newAuditNotes.trim() || 'Conteo físico mensual';
    const created = openStockAudit(cleanPeriod, cleanNotes);
    setSelectedAuditId(created.id);
    setIsNewAuditModalOpen(false);
    dispatchToast('Auditoría Abierta', `Se inició el período de conteo ${cleanPeriod}.`);
  };

  const handleCloseAuditConfirm = (auditId: string, period: string) => {
    openNoticeModal({
      title: 'Cerrar Auditoría y Ajustar Kardex',
      message: `¿Confirmas el cierre definitivo de la auditoría ${period}? Las diferencias registradas ajustarán el stock del almacén.`,
      tone: 'warning',
      confirmLabel: 'Cerrar y Ajustar',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        closeStockAudit(auditId);
        dispatchToast('Auditoría Cerrada', `El período ${period} fue cerrado y el Kardex actualizado.`);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-500" />
            Auditoría de Stock e Inventario Físico
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Compara el conteo ciego en bodega vs. el stock registrado en el sistema y valoriza las diferencias.
          </p>
        </div>

        {canAudit && (
          <button
            type="button"
            onClick={handleOpenNewAudit}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm whitespace-nowrap shrink-0 transition-colors"
          >
            Abrir Auditoría Mensual
          </button>
        )}
      </div>

      {audits.length === 0 ? (
        <div className="p-12 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
          No hay auditorías activas. Haz clic en "Abrir Auditoría Mensual".
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selector de auditorías */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-500">Período:</span>
            <select
              value={selectedAuditId}
              onChange={(e) => setSelectedAuditId(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
            >
              {audits.map(a => (
                <option key={a.id} value={a.id}>
                  {a.period} • {a.status.toUpperCase()} ({new Date(a.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>

            {activeAudit?.status === 'abierta' && canAudit && (
              <button
                type="button"
                onClick={() => handleCloseAuditConfirm(activeAudit.id, activeAudit.period)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <Lock className="w-4 h-4" />
                Cerrar y Ajustar Kardex
              </button>
            )}
          </div>

          {activeAudit && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-4">Insumo</th>
                    <th className="p-4">Stock Sistema</th>
                    <th className="p-4 w-40">Conteo Físico</th>
                    <th className="p-4">Diferencia</th>
                    <th className="p-4 text-right">Impacto Valorizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {activeAudit.lines.map(line => {
                    const item = items.find(i => i.id === line.itemId);
                    const diffValue = line.difference * line.unitCost;

                    return (
                      <tr key={line.itemId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{item?.name}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">{item?.sku}</div>
                        </td>
                        <td className="p-4 font-mono font-semibold text-xs">
                          {line.systemQty} {item?.unit}
                        </td>
                        <td className="p-4">
                          {activeAudit.status === 'abierta' ? (
                            <input
                              type="number"
                              step="0.1"
                              value={line.countedQty}
                              onChange={(e) => recordAuditCount(activeAudit.id, line.itemId, Number(e.target.value))}
                              className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
                            />
                          ) : (
                            <span className="font-mono font-bold text-xs">{line.countedQty} {item?.unit}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`font-mono font-bold text-xs ${
                            line.difference < 0 ? 'text-rose-500' : line.difference > 0 ? 'text-emerald-500' : 'text-zinc-400'
                          }`}>
                            {line.difference > 0 ? `+${line.difference}` : line.difference} {item?.unit}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-xs">
                          <span className={diffValue < 0 ? 'text-rose-600 dark:text-rose-400' : diffValue > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}>
                            S/ {diffValue.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isNewAuditModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-audit-modal-title"
        >
          <form
            onSubmit={handleConfirmCreateAudit}
            className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 id="new-audit-modal-title" className="text-sm font-black text-zinc-900 dark:text-white">
                    Abrir Nueva Auditoría de Stock
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Inicia un corte de inventario físico para valorizar diferencias.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewAuditModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Período de Auditoría (AAAA-MM)
                </label>
                <input
                  type="text"
                  required
                  value={newAuditPeriod}
                  onChange={e => setNewAuditPeriod(e.target.value)}
                  placeholder="Ej. 2026-11"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Observaciones / Motivo
                </label>
                <input
                  type="text"
                  value={newAuditNotes}
                  onChange={e => setNewAuditNotes(e.target.value)}
                  placeholder="Conteo físico mensual"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewAuditModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm whitespace-nowrap shrink-0 transition-colors"
              >
                Iniciar Auditoría
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
