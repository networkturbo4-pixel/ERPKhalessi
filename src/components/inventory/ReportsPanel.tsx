import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useSettings } from '../../context/SettingsContext';
import { BarChart3, TrendingDown, PieChart, AlertTriangle, Layers, DollarSign } from 'lucide-react';

export const ReportsPanel: React.FC = () => {
  const { movements, items, stockLevels, lots } = useInventory();
  const { activeTenant } = useSettings();

  // 1. Mermas por causa
  const wasteMovements = movements.filter(m => m.type === 'merma');
  const wasteByReason: Record<string, { count: number; totalCost: number }> = {};

  wasteMovements.forEach(m => {
    const reason = m.wasteReason || 'otro';
    if (!wasteByReason[reason]) {
      wasteByReason[reason] = { count: 0, totalCost: 0 };
    }
    wasteByReason[reason].count += 1;
    wasteByReason[reason].totalCost += Math.abs(m.quantity * m.unitCost);
  });

  // 2. Top insumos valorizados en inventario
  const activeTenantId = activeTenant?.id || 'tenant-1';
  const inventoryValuation = items.map(item => {
    const qty = stockLevels
      .filter(s => s.itemId === item.id && s.tenantId === activeTenantId)
      .reduce((acc, s) => acc + s.quantity, 0);
    const value = qty * item.costPerUnit;
    return { item, qty, value };
  }).sort((a, b) => b.value - a.value);

  const totalWarehouseValuation = inventoryValuation.reduce((acc, i) => acc + i.value, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Valorización Total Bodega
            </span>
            <DollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black font-mono text-zinc-900 dark:text-white">
            S/ {totalWarehouseValuation.toFixed(2)}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Basado en costo ponderado promedio de insumos activos.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Total Mermas Registradas
            </span>
            <TrendingDown className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
            S/ {wasteMovements.reduce((sum, m) => sum + Math.abs(m.quantity * m.unitCost), 0).toFixed(2)}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {wasteMovements.length} eventos de merma registrados.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Lotes FEFO Activos
            </span>
            <Layers className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {lots.filter(l => l.quantity > 0).length}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Lotes en almacén con control de rotación y fecha de vencimiento.
          </p>
        </div>
      </div>

      {/* Two column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mermas por causa */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Mermas y Pérdidas por Causa
          </h4>

          {Object.keys(wasteByReason).length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No se han registrado mermas en este período.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(wasteByReason).map(([reason, data]) => (
                <div key={reason} className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="capitalize text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {reason.replace('_', ' ')} ({data.count} ocurrencias)
                  </div>
                  <div className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                    S/ {data.totalCost.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Insumos por Valor en Almacén */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            Top Insumos por Capital Invertido
          </h4>

          <div className="space-y-3">
            {inventoryValuation.slice(0, 5).map(({ item, qty, value }) => (
              <div key={item.id} className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Stock: {qty} {item.unit}
                  </div>
                </div>
                <div className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                  S/ {value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
