import React, { useState, useMemo } from 'react';
import { Order, PaymentMethod, RestaurantTable, TableReservation } from '../../types/catalog';
import {
  X,
  Plus,
  Receipt,
  ArrowRightLeft,
  Scissors,
  CheckCircle2,
  Users,
  CalendarClock,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';

interface TableOperationsModalProps {
  isOpen: boolean;
  table: RestaurantTable | null;
  activeOrder: Order | null;
  allBranchTables: RestaurantTable[];
  occupiedTableIds: Set<string>;
  onClose: () => void;
  onAddRoundToTable: (table: RestaurantTable) => void;
  onToggleBillRequested: (table: RestaurantTable, requested: boolean) => void;
  onTransferOrMerge: (orderId: string, targetTable: RestaurantTable) => void;
  onSplitByItems: (orderId: string, itemIds: string[], method: PaymentMethod) => void;
  onCollectFullTable: (order: Order, method: PaymentMethod) => void;
  onSaveReservation: (table: RestaurantTable, reservation: TableReservation | null) => void;
}

type ModalTab = 'cuenta' | 'dividir' | 'mover';

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string; icon: React.ReactNode }> = [
  { id: 'efectivo', label: 'Efectivo', icon: <Banknote className="w-3.5 h-3.5" /> },
  { id: 'yape_plin', label: 'Yape / Plin', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { id: 'tarjeta', label: 'Tarjeta', icon: <CreditCard className="w-3.5 h-3.5" /> },
  { id: 'culqi', label: 'Culqi', icon: <CreditCard className="w-3.5 h-3.5" /> },
];

export const TableOperationsModal: React.FC<TableOperationsModalProps> = ({
  isOpen,
  table,
  activeOrder,
  allBranchTables,
  occupiedTableIds,
  onClose,
  onAddRoundToTable,
  onToggleBillRequested,
  onTransferOrMerge,
  onSplitByItems,
  onCollectFullTable,
  onSaveReservation,
}) => {
  const [tab, setTab] = useState<ModalTab>('cuenta');
  const [splitMode, setSplitMode] = useState<'items' | 'equal'>('items');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [equalWays, setEqualWays] = useState<number>(2);
  const [equalPaidCount, setEqualPaidCount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('efectivo');
  const [targetTableId, setTargetTableId] = useState<string>('');

  // Reservation state (when table has no active order)
  const [resName, setResName] = useState(table?.reservation?.customerName || '');
  const [resTime, setResTime] = useState(table?.reservation?.time || '20:00');
  const [resGuests, setResGuests] = useState(table?.reservation?.guests || table?.capacity || 4);
  const [resNotes, setResNotes] = useState(table?.reservation?.notes || '');

  const otherTables = useMemo(
    () => (table ? allBranchTables.filter((t) => t.id !== table.id) : []),
    [allBranchTables, table]
  );

  const selectedItemsTotal = useMemo(() => {
    if (!activeOrder) return 0;
    const set = new Set(selectedItemIds);
    return activeOrder.items
      .filter((i) => set.has(i.itemId))
      .reduce((acc, i) => acc + i.totalPrice, 0);
  }, [activeOrder, selectedItemIds]);

  if (!isOpen || !table) return null;

  // Free table -> Reservation & Open Table modal
  if (!activeOrder) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      >
        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-zinc-900 dark:text-white truncate">
                  {table.name} · Reserva / Apertura
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {table.zone} · Capacidad {table.capacity} personas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Nombre de Reserva
                </label>
                <input
                  type="text"
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  placeholder="Ej. Familia Quispe"
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  value={resTime}
                  onChange={(e) => setResTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Comensales
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={resGuests}
                  onChange={(e) => setResGuests(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="Ej. Cumpleaños / silla de bebé"
                  className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              {table.reservation && (
                <button
                  type="button"
                  onClick={() => {
                    onSaveReservation(table, null);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap shrink-0"
                >
                  Liberar Reserva
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onAddRoundToTable(table);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                Abrir Mesa (Ir a Carta)
              </button>
              <button
                type="button"
                disabled={!resName.trim()}
                onClick={() => {
                  onSaveReservation(table, {
                    customerName: resName.trim(),
                    time: resTime || '20:00',
                    guests: resGuests,
                    notes: resNotes.trim() || undefined,
                  });
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black whitespace-nowrap shrink-0"
              >
                Guardar Reserva
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const perPersonAmount = Number((activeOrder.total / Math.max(2, equalWays)).toFixed(2));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                {table.name} · {activeOrder.orderNumber}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300">
                {activeOrder.status}
              </span>
              {table.billRequested && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                  Cuenta Pedida
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {table.zone} · Total actual: <strong className="text-zinc-900 dark:text-white">S/ {activeOrder.total.toFixed(2)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de mesa"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('cuenta')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              tab === 'cuenta'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Cuenta & Rondas</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('dividir')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              tab === 'dividir'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Dividir Cuenta</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('mover');
              if (!targetTableId && otherTables[0]) setTargetTableId(otherTables[0].id);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              tab === 'mover'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Mover / Unir Mesa</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {tab === 'cuenta' && (
            <>
              <div className="space-y-2">
                {activeOrder.items.map((item) => (
                  <div
                    key={item.itemId}
                    className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {item.quantity}x {item.productName} {item.size?.name ? `(${item.size.name})` : ''}
                      </p>
                      {item.notes && (
                        <p className="text-[11px] text-zinc-500 truncate">Nota: {item.notes}</p>
                      )}
                    </div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white shrink-0">
                      S/ {item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <p className="text-[11px] font-bold uppercase text-zinc-500">
                  Método de cobro rápido (Cuenta completa)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_OPTIONS.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPayMethod(pm.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                        payMethod === pm.id
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {pm.icon}
                      <span>{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'dividir' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => setSplitMode('items')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
                    splitMode === 'items'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  Por Ítems Seleccionados
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('equal')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
                    splitMode === 'equal'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  Partes Iguales
                </button>
              </div>

              {splitMode === 'items' ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-zinc-500">
                    Marca los ítems que paga este comensal para generar su cobro independiente:
                  </p>
                  {activeOrder.items.map((item) => {
                    const checked = selectedItemIds.includes(item.itemId);
                    return (
                      <label
                        key={item.itemId}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          checked
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedItemIds((prev) =>
                                e.target.checked
                                  ? [...prev, item.itemId]
                                  : prev.filter((id) => id !== item.itemId)
                              );
                            }}
                            className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {item.quantity}x {item.productName}
                          </span>
                        </div>
                        <span className="text-xs font-black text-zinc-900 dark:text-white shrink-0">
                          S/ {item.totalPrice.toFixed(2)}
                        </span>
                      </label>
                    );
                  })}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {PAYMENT_OPTIONS.map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPayMethod(pm.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                          payMethod === pm.id
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {pm.icon}
                        <span>{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-500" />
                      Dividir entre comensales:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEqualWays((w) => Math.max(2, w - 1));
                          setEqualPaidCount(0);
                        }}
                        className="w-8 h-8 rounded-xl border border-zinc-300 dark:border-zinc-700 font-black text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black text-sm">{equalWays}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEqualWays((w) => Math.min(10, w + 1));
                          setEqualPaidCount(0);
                        }}
                        className="w-8 h-8 rounded-xl border border-zinc-300 dark:border-zinc-700 font-black text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Cuota por persona ({equalPaidCount}/{equalWays} pagadas)
                    </span>
                    <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                      S/ {perPersonAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = equalPaidCount + 1;
                        if (next >= equalWays) {
                          onCollectFullTable(activeOrder, payMethod);
                          onClose();
                        } else {
                          setEqualPaidCount(next);
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black whitespace-nowrap shrink-0"
                    >
                      {equalPaidCount + 1 >= equalWays
                        ? `Cobrar Última Cuota (S/ ${perPersonAmount.toFixed(2)}) y Liberar Mesa`
                        : `Registrar Pago ${equalPaidCount + 1} de ${equalWays} (S/ ${perPersonAmount.toFixed(2)})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'mover' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Elige una mesa libre para transferir la cuenta, o una mesa ocupada para fusionar ambos pedidos:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {otherTables.map((t) => {
                  const occ = occupiedTableIds.has(t.id);
                  const selected = targetTableId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetTableId(t.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selected
                          ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                      }`}
                    >
                      <span className="block text-xs font-black text-zinc-900 dark:text-white truncate">
                        {t.name}
                      </span>
                      <span className="block text-[10px] text-zinc-500 truncate">{t.zone}</span>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          occ
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {occ ? 'Ocupada (Unir)' : 'Libre (Mover)'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-zinc-50/70 dark:bg-zinc-950/60">
          {tab === 'cuenta' && (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAddRoundToTable(table);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Ronda</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleBillRequested(table, !table.billRequested)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 ${
                    table.billRequested
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30'
                  }`}
                >
                  {table.billRequested ? 'Cuenta Pedida ✓' : 'Pedir Cuenta'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCollectFullTable(activeOrder, payMethod);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cobrar S/ {activeOrder.total.toFixed(2)} y Liberar</span>
              </button>
            </>
          )}

          {tab === 'dividir' && splitMode === 'items' && (
            <>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                Selección: <strong>S/ {selectedItemsTotal.toFixed(2)}</strong>
              </span>
              <button
                type="button"
                disabled={selectedItemIds.length === 0}
                onClick={() => {
                  onSplitByItems(activeOrder.id, selectedItemIds, payMethod);
                  setSelectedItemIds([]);
                  if (selectedItemIds.length === activeOrder.items.length) {
                    onClose();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Cobrar Selección (S/ {selectedItemsTotal.toFixed(2)})</span>
              </button>
            </>
          )}

          {tab === 'dividir' && splitMode === 'equal' && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold whitespace-nowrap shrink-0"
            >
              Cerrar
            </button>
          )}

          {tab === 'mover' && (
            <button
              type="button"
              disabled={!targetTableId}
              onClick={() => {
                const target = otherTables.find((t) => t.id === targetTableId);
                if (target) {
                  onTransferOrMerge(activeOrder.id, target);
                  onClose();
                }
              }}
              className="ml-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Confirmar Movimiento / Unión</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
