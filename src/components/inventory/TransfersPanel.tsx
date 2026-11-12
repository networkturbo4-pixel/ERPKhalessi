import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { StockTransfer } from '../../types/inventory';
import { ArrowLeftRight, Send, CheckCircle, PackageCheck, Clock, MapPin } from 'lucide-react';

export const TransfersPanel: React.FC = () => {
  const { transfers, createStockTransfer, shipTransfer, receiveTransfer, items, getItemStock } = useInventory();
  const { tenants, dispatchToast } = useSettings();
  const { currentUser } = useRBAC();

  const [isCreating, setIsCreating] = useState(false);
  const [fromTenant, setFromTenant] = useState('tenant-1');
  const [toTenant, setToTenant] = useState('tenant-2');
  const [lines, setLines] = useState<{ itemId: string; qty: number }[]>([
    { itemId: items[0]?.id || '', qty: 5 },
  ]);
  const [notes, setNotes] = useState('');

  const handleCreate = () => {
    if (fromTenant === toTenant) {
      dispatchToast('Error de Transferencia', 'La sede de origen y destino deben ser distintas.', 'error');
      return;
    }

    createStockTransfer({
      fromTenantId: fromTenant,
      toTenantId: toTenant,
      lines: lines.map(l => ({ ...l, receivedQty: 0 })),
      notes: notes.trim() || undefined,
      createdBy: currentUser?.name || 'Operador Sede',
    });

    setIsCreating(false);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-500" />
            Transferencias y Despachos Inter-Sedes
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Envía materia prima y masas preparadas desde la Matriz a sucursales satélite con trazabilidad en tránsito.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm whitespace-nowrap shrink-0 transition-colors"
        >
          Nueva Transferencia
        </button>
      </div>

      {/* Transfer cards / list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {transfers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
            No hay transferencias entre sedes registradas.
          </div>
        ) : (
          transfers.map(tr => {
            const fromName = tenants.find(t => t.id === tr.fromTenantId)?.name || tr.fromTenantId;
            const toName = tenants.find(t => t.id === tr.toTenantId)?.name || tr.toTenantId;

            return (
              <div key={tr.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                      {tr.number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      tr.status === 'recibida'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : tr.status === 'en_transito'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                        : 'bg-zinc-500/10 text-zinc-600'
                    }`}>
                      {tr.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                    <span className="p-1 rounded bg-zinc-100 dark:bg-zinc-800">{fromName}</span>
                    <span className="text-zinc-400">➔</span>
                    <span className="p-1 rounded bg-zinc-100 dark:bg-zinc-800">{toName}</span>
                  </div>

                  <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 mb-4">
                    {tr.lines.map((l, i) => {
                      const item = items.find(it => it.id === l.itemId);
                      return (
                        <div key={i} className="flex items-center justify-between text-xs text-zinc-500">
                          <span>{item?.name}</span>
                          <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                            {l.qty} {item?.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                  {tr.status === 'solicitada' && (
                    <button
                      type="button"
                      onClick={() => shipTransfer(tr.id)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Despachar (En Tránsito)
                    </button>
                  )}

                  {tr.status === 'en_transito' && (
                    <button
                      type="button"
                      onClick={() => receiveTransfer(tr.id, tr.lines.map(l => ({ itemId: l.itemId, receivedQty: l.qty })))}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 transition-colors"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      Confirmar Recepción
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Crear transferencia */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-4">
              Nueva Guía de Transferencia Interna
            </h3>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Sede de Origen</label>
                  <select
                    value={fromTenant}
                    onChange={(e) => setFromTenant(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Sede de Destino</label>
                  <select
                    value={toTenant}
                    onChange={(e) => setToTenant(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Insumo a Enviar</label>
                <div className="space-y-2">
                  {lines.map((l, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={l.itemId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLines(prev => prev.map((item, i) => i === idx ? { ...item, itemId: val } : item));
                        }}
                        className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                      >
                        {items.map(it => (
                          <option key={it.id} value={it.id}>
                            {it.name} (Stock: {getItemStock(it.id, fromTenant)} {it.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={l.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLines(prev => prev.map((item, i) => i === idx ? { ...item, qty: val } : item));
                        }}
                        className="w-24 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-600/20 whitespace-nowrap shrink-0 transition-all"
              >
                Generar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
