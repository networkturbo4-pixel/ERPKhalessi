import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useSettings } from '../../context/SettingsContext';
import { PurchaseOrder, Supplier } from '../../types/inventory';
import { calculateReplenishmentSuggestion } from '../../utils/inventoryEngine';
import { ShoppingCart, Plus, CheckCircle, Truck, Calendar, Clock, DollarSign, ArrowUpRight, AlertCircle, FileText } from 'lucide-react';

export const PurchasesPanel: React.FC = () => {
  const {
    suppliers,
    saveSupplier,
    purchases,
    createPurchaseOrder,
    receivePurchaseOrder,
    items,
    stockLevels,
    movements,
    settings,
  } = useInventory();
  const { activeTenant, dispatchToast } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'suppliers' | 'replenishment'>('orders');
  const [replenishmentWindow, setReplenishmentWindow] = useState<7 | 14 | 30>(14);

  // New PO modal state
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [poLines, setPoLines] = useState<{ itemId: string; qty: number; unitCost: number }[]>([]);
  const [poNotes, setPoNotes] = useState('');

  // Receive PO modal state
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receiveLines, setReceiveLines] = useState<{ itemId: string; receivedQty: number; unitCost: number; expiresAt?: string }[]>([]);

  // Replenishment suggestions
  const activeTenantId = activeTenant?.id || 'tenant-1';
  const replenishmentTable = items.map(item => {
    const curStock = stockLevels
      .filter(s => s.itemId === item.id && s.tenantId === activeTenantId)
      .reduce((acc, s) => acc + s.quantity, 0);

    const sup = suppliers.find(sp => item.supplierIds.includes(sp.id));
    const leadDays = sup?.leadDays || 3;

    const { dailyConsumption, suggestedQty } = calculateReplenishmentSuggestion(
      movements.filter(m => m.itemId === item.id),
      curStock,
      item.minStock,
      leadDays,
      replenishmentWindow
    );

    return {
      item,
      supplier: sup,
      curStock,
      dailyConsumption,
      suggestedQty,
    };
  });

  const handleOpenNewPO = () => {
    setPoLines([{ itemId: items[0]?.id || '', qty: 10, unitCost: items[0]?.costPerUnit || 1 }]);
    setIsCreatingPO(true);
  };

  const handleSavePO = () => {
    if (poLines.length === 0) {
      dispatchToast('Error', 'Debes añadir al menos un insumo a la orden de compra.', 'error');
      return;
    }

    createPurchaseOrder({
      tenantId: activeTenantId,
      supplierId: selectedSupplierId,
      status: 'borrador',
      lines: poLines.map(l => ({ ...l, receivedQty: 0 })),
      notes: poNotes.trim() || undefined,
      createdBy: 'Operador ERP',
    });

    setIsCreatingPO(false);
    setPoLines([]);
  };

  const handleOpenReceive = (po: PurchaseOrder) => {
    setReceivingPO(po);
    setReceiveLines(po.lines.map(l => ({
      itemId: l.itemId,
      receivedQty: l.qty - l.receivedQty,
      unitCost: l.unitCost,
      expiresAt: '',
    })));
  };

  const handleConfirmReceive = () => {
    if (!receivingPO) return;
    receivePurchaseOrder(receivingPO.id, receiveLines);
    setReceivingPO(null);
  };

  return (
    <div className="space-y-6">
      {/* Subtabs navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'orders', label: 'Órdenes de Compra', icon: FileText },
            { id: 'replenishment', label: 'Sugerencia de Reposición', icon: ArrowUpRight },
            { id: 'suppliers', label: 'Proveedores Homologados', icon: Truck },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeSubTab === 'orders' && (
          <button
            type="button"
            onClick={handleOpenNewPO}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Orden de Compra
          </button>
        )}
      </div>

      {/* Tab: Órdenes de compra */}
      {activeSubTab === 'orders' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4">N° Orden</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Ítems</th>
                <th className="p-4">Total Est.</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-zinc-400">
                    No hay órdenes de compra registradas. Haz clic en "Nueva Orden de Compra".
                  </td>
                </tr>
              ) : (
                purchases.map(po => {
                  const supplier = suppliers.find(s => s.id === po.supplierId);
                  const totalEst = po.lines.reduce((acc, l) => acc + (l.qty * l.unitCost), 0);

                  return (
                    <tr key={po.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-zinc-900 dark:text-white">
                        {po.number}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {supplier?.name || 'Proveedor desconocido'}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          RUC: {supplier?.ruc || '--'}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-zinc-500">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-xs">
                        {po.lines.length} {po.lines.length === 1 ? 'insumo' : 'insumos'}
                      </td>
                      <td className="p-4 font-mono font-bold text-xs text-zinc-900 dark:text-white">
                        S/ {totalEst.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          po.status === 'recibida'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : po.status === 'parcial'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                        }`}>
                          {po.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {po.status !== 'recibida' && (
                          <button
                            type="button"
                            onClick={() => handleOpenReceive(po)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors shadow-sm"
                          >
                            Recepción de Guía
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Sugerencia de reposición */}
      {activeSubTab === 'replenishment' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200">
                  Algoritmo Predictivo de Abastecimiento
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Calcula demanda media diaria por ventas/mermas + tiempo de entrega del proveedor + colchón de seguridad.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Ventana de cálculo:</span>
              {[7, 14, 30].map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setReplenishmentWindow(days as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    replenishmentWindow === days
                      ? 'bg-amber-600 text-white'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {days} días
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-4">Insumo</th>
                  <th className="p-4">Proveedor</th>
                  <th className="p-4">Stock Actual</th>
                  <th className="p-4">Mínimo</th>
                  <th className="p-4">Consumo Diario</th>
                  <th className="p-4 text-right">Cant. Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {replenishmentTable.map(({ item, supplier, curStock, dailyConsumption, suggestedQty }) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{item.sku}</div>
                    </td>
                    <td className="p-4 text-xs text-zinc-600 dark:text-zinc-400">
                      {supplier?.name || 'Sin proveedor asignado'}
                    </td>
                    <td className="p-4 font-mono font-semibold text-xs">
                      {curStock} {item.unit}
                    </td>
                    <td className="p-4 font-mono text-xs text-zinc-500">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="p-4 font-mono text-xs text-zinc-500">
                      ~{dailyConsumption} {item.unit}/día
                    </td>
                    <td className="p-4 text-right">
                      {suggestedQty > 0 ? (
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                          + {suggestedQty} {item.unit}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">Abastecido</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Proveedores */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map(sp => (
            <div key={sp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base">
                    {sp.name}
                  </h4>
                  <span className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                    {sp.leadDays} días entrega
                  </span>
                </div>
                <div className="space-y-1 text-xs text-zinc-500 mb-4 font-mono">
                  <div>RUC: {sp.ruc}</div>
                  <div>Tel: {sp.phone}</div>
                  <div>Email: {sp.email || '--'}</div>
                  <div>Contacto: {sp.contactPerson || '--'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Recepción de Orden de Compra */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-1">
              Recepción de Mercadería: {receivingPO.number}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Ingresa las cantidades reales recibidas en almacén y registra fechas de vencimiento para generar lotes FEFO automáticos.
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6 pr-2">
              {receiveLines.map((line, idx) => {
                const item = items.find(i => i.id === line.itemId);
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3">
                    <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                      {item?.name} ({item?.unit})
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">Cant. Recibida</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.receivedQty}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, receivedQty: val } : l));
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">Costo Unitario Real</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unitCost}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, unitCost: val } : l));
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">Fecha Vence (Lote)</label>
                        <input
                          type="date"
                          value={line.expiresAt || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, expiresAt: val } : l));
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setReceivingPO(null)}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 whitespace-nowrap shrink-0 transition-all"
              >
                Confirmar Ingreso a Almacén
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
