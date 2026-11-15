import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Fuel,
  Receipt,
  CheckCircle2,
  Trash2,
  Bike,
  TrendingUp,
  ArrowDownRight,
  Lock,
  Calendar,
  Building2,
  X,
  Banknote,
} from 'lucide-react';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { useHR } from '../../context/HRContext';
import { FuelExpenseSource, getLocalIsoDate } from '../../utils/deliveryOperations';
import {
  FinanceExpense,
  DailyCashClosing,
  ExpenseCategory,
  ExpensePaymentSource,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_SOURCE_LABELS,
  loadFinanceExpenses,
  saveFinanceExpenses,
  loadCashClosings,
  saveCashClosings,
  computeFinanceDaySummary,
  toLocalIsoDate,
} from '../../utils/financeOperations';

type FinanceTab = 'cuadre' | 'egresos' | 'cierres';
type NewExpenseKind = 'operativo' | 'combustible';

export const FinanceModuleView: React.FC = () => {
  const { orders, fuelExpenses, recordFuelExpense } = useOrderCatalog();
  const { activeTenant, branchScope, tenants, users, openNoticeModal, dispatchToast } = useSettings();
  const { currentUser } = useRBAC();
  const { profiles } = useHR();

  const [activeTab, setActiveTab] = useState<FinanceTab>('cuadre');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalIsoDate());
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'combustible' | ExpenseCategory>('all');
  const [financeExpenses, setFinanceExpenses] = useState<FinanceExpense[]>(() => loadFinanceExpenses());
  const [cashClosings, setCashClosings] = useState<DailyCashClosing[]>(() => loadCashClosings());

  useEffect(() => {
    const syncExpenses = () => setFinanceExpenses(loadFinanceExpenses());
    const syncClosings = () => setCashClosings(loadCashClosings());
    window.addEventListener('kh:finance-expenses-changed', syncExpenses);
    window.addEventListener('storage', syncExpenses);
    window.addEventListener('storage', syncClosings);
    return () => {
      window.removeEventListener('kh:finance-expenses-changed', syncExpenses);
      window.removeEventListener('storage', syncExpenses);
      window.removeEventListener('storage', syncClosings);
    };
  }, []);

  // Modal de registro de egreso / combustible
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseKind, setExpenseKind] = useState<NewExpenseKind>('operativo');
  const [formTenantId, setFormTenantId] = useState<string>(activeTenant.id);
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('insumos');
  const [formSource, setFormSource] = useState<ExpensePaymentSource>('caja_chica');
  const [formFuelSource, setFormFuelSource] = useState<FuelExpenseSource>('caja_chica');
  const [formDriverId, setFormDriverId] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');

  const driverProfiles = useMemo(() => {
    const driverIds = new Set(
      Object.values(profiles)
        .filter((p) => p.isDriver || p.position === 'Motorizado Propio')
        .map((p) => p.userId)
    );
    const list = users
      .filter((u) => driverIds.has(u.id) || u.roleId === 'role-driver')
      .map((u) => ({ userId: u.id, fullName: u.name }));
    return list;
  }, [profiles, users]);

  const scopeTenantId = branchScope === 'consolidated' ? 'consolidated' : activeTenant.id;

  const summary = useMemo(
    () =>
      computeFinanceDaySummary(orders, fuelExpenses, financeExpenses, {
        tenantId: scopeTenantId,
        date: selectedDate,
      }),
    [orders, fuelExpenses, financeExpenses, scopeTenantId, selectedDate]
  );

  const branchNameById = (tenantId: string) => {
    const found = tenants.find((t) => t.id === tenantId);
    return found ? found.name.replace('Khalessi Pizza - ', '') : tenantId;
  };

  // Lista unificada de egresos del día (combustible + otros egresos)
  const unifiedDayOutflows = useMemo(() => {
    const fuelItems = fuelExpenses
      .filter((f) => {
        if (scopeTenantId !== 'consolidated' && f.tenantId !== scopeTenantId) return false;
        return toLocalIsoDate(f.createdAt) === selectedDate;
      })
      .map((f) => ({
        id: f.id,
        kind: 'combustible' as const,
        tenantId: f.tenantId,
        categoryLabel: 'Combustible Motorizado',
        categoryKey: 'combustible' as const,
        amount: f.amount,
        sourceLabel: f.source === 'efectivo_ruta' ? 'Efectivo de ruta' : 'Caja Chica',
        description: `${f.driverName} — ${f.note}`,
        createdAt: f.createdAt,
        canDelete: false,
      }));

    const otherItems = financeExpenses
      .filter((e) => {
        if (scopeTenantId !== 'consolidated' && e.tenantId !== scopeTenantId) return false;
        return toLocalIsoDate(e.createdAt) === selectedDate;
      })
      .map((e) => ({
        id: e.id,
        kind: 'operativo' as const,
        tenantId: e.tenantId,
        categoryLabel: EXPENSE_CATEGORY_LABELS[e.category] || e.category,
        categoryKey: e.category,
        amount: e.amount,
        sourceLabel: EXPENSE_SOURCE_LABELS[e.source] || e.source,
        description: e.description,
        createdAt: e.createdAt,
        canDelete: true,
      }));

    return [...fuelItems, ...otherItems]
      .filter((item) => categoryFilter === 'all' || item.categoryKey === categoryFilter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [fuelExpenses, financeExpenses, scopeTenantId, selectedDate, categoryFilter]);

  const filteredClosings = useMemo(
    () =>
      cashClosings
        .filter((c) => scopeTenantId === 'consolidated' || c.tenantId === scopeTenantId)
        .sort((a, b) => b.closedAt.localeCompare(a.closedAt)),
    [cashClosings, scopeTenantId]
  );

  const openCreateModal = () => {
    setFormTenantId(activeTenant.id);
    setFormAmount('');
    setFormDescription('');
    setFormDriverId(driverProfiles[0]?.userId || currentUser.id);
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(formAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      dispatchToast('Monto inválido', 'Ingresa un monto mayor a S/ 0.00.', 'warning');
      return;
    }

    if (expenseKind === 'combustible') {
      const matchedProfile = driverProfiles.find((p) => p.userId === formDriverId);
      const driverName = matchedProfile?.fullName || currentUser.name;
      const driverId = matchedProfile?.userId || formDriverId || currentUser.id;
      recordFuelExpense({
        driverId,
        driverName,
        tenantId: formTenantId,
        amount: numericAmount,
        source: formFuelSource,
        note: formDescription.trim() || 'Recarga registrada en Finanzas',
      });
      setIsModalOpen(false);
      return;
    }

    const newItem: FinanceExpense = {
      id: `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: formTenantId,
      category: formCategory,
      amount: Math.round((numericAmount + Number.EPSILON) * 100) / 100,
      source: formSource,
      description: formDescription.trim() || EXPENSE_CATEGORY_LABELS[formCategory],
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    const next = [newItem, ...financeExpenses];
    setFinanceExpenses(next);
    saveFinanceExpenses(next);
    setIsModalOpen(false);
    dispatchToast(
      'Egreso Registrado',
      `${EXPENSE_CATEGORY_LABELS[formCategory]}: S/ ${newItem.amount.toFixed(2)} en ${branchNameById(formTenantId)}.`,
      'success'
    );
  };

  const handleDeleteExpense = (expenseId: string, description: string, amount: number) => {
    openNoticeModal({
      title: 'Eliminar Egreso',
      message: `¿Confirmas eliminar el gasto "${description}" por S/ ${amount.toFixed(2)}? Esta acción actualizará el cuadre del día.`,
      tone: 'warning',
      confirmLabel: 'Eliminar Egreso',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        const next = financeExpenses.filter((item) => item.id !== expenseId);
        setFinanceExpenses(next);
        saveFinanceExpenses(next);
        dispatchToast('Egreso Eliminado', 'El registro fue removido del flujo de caja.', 'info');
      },
    });
  };

  const handleCloseDailyCash = () => {
    const targetTenantId = scopeTenantId === 'consolidated' ? activeTenant.id : scopeTenantId;
    const targetTenantName = branchNameById(targetTenantId);

    openNoticeModal({
      title: `Cerrar Caja — ${targetTenantName}`,
      message: `Fecha ${selectedDate}: Ingresos S/ ${summary.totalRevenue.toFixed(2)}, Egresos S/ ${summary.totalOutflows.toFixed(2)}. Efectivo esperado en gaveta: S/ ${summary.expectedCashInDrawer.toFixed(2)}. ¿Confirmas registrar este cierre?`,
      tone: 'info',
      confirmLabel: 'Confirmar Cierre',
      cancelLabel: 'Seguir Editando',
      onConfirm: () => {
        const closing: DailyCashClosing = {
          id: `cls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: selectedDate,
          tenantId: targetTenantId,
          tenantName: targetTenantName,
          totalRevenue: summary.totalRevenue,
          cashRevenue: summary.cashRevenue,
          digitalRevenue: summary.digitalRevenue,
          fuelExpensesTotal: summary.fuelExpensesTotal,
          fuelFromRouteCash: summary.fuelFromRouteCash,
          fuelFromPettyCash: summary.fuelFromPettyCash,
          otherExpensesTotal: summary.otherExpensesTotal,
          otherExpensesFromCash: summary.otherExpensesFromCash,
          expectedCashInDrawer: summary.expectedCashInDrawer,
          netBalance: summary.netBalance,
          deliveredOrdersCount: summary.deliveredOrdersCount,
          costPerDelivery: summary.costPerDelivery,
          closedBy: currentUser.name,
          closedAt: new Date().toISOString(),
        };
        const next = [closing, ...cashClosings];
        setCashClosings(next);
        saveCashClosings(next);
        dispatchToast('Cierre de Caja Guardado', `Se registró el cierre del ${selectedDate} para ${targetTenantName}.`, 'success');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
              Finanzas &amp; Control de Caja
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Consolidado de ingresos, egresos por sucursal, combustible de motorizados y cierre automático.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>{branchScope === 'consolidated' ? 'Todas las Sucursales' : branchNameById(activeTenant.id)}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Registrar Egreso
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="saas-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span>Ingresos del Día</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-zinc-950 dark:text-white">
            S/ {summary.totalRevenue.toFixed(2)}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Efectivo: S/ {summary.cashRevenue.toFixed(2)} · Digital: S/ {summary.digitalRevenue.toFixed(2)}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            POS: S/ {summary.posRevenue.toFixed(2)} ({summary.posOrdersCount}) · Tienda: S/ {summary.storeRevenue.toFixed(2)} ({summary.storeOrdersCount})
          </p>
        </div>

        <div className="saas-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span>Egresos Totales</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            S/ {summary.totalOutflows.toFixed(2)}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Combustible: S/ {summary.fuelExpensesTotal.toFixed(2)} · Otros: S/ {summary.otherExpensesTotal.toFixed(2)}
          </p>
        </div>

        <div className="saas-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span>Efectivo Esperado en Caja</span>
            <Banknote className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-zinc-950 dark:text-white">
            S/ {summary.expectedCashInDrawer.toFixed(2)}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Balance neto (Ingresos − Egresos): S/ {summary.netBalance.toFixed(2)}
          </p>
        </div>

        <div className="saas-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span>Costo Operativo Delivery</span>
            <Bike className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-zinc-950 dark:text-white">
            S/ {summary.costPerDelivery.toFixed(2)} <span className="text-xs font-semibold text-zinc-400">/ envío</span>
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {summary.deliveredOrdersCount} entregas · Margen envío: S/ {summary.netDeliveryMargin.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        {[
          { id: 'cuadre' as const, label: 'Cuadre & Cierre de Caja', icon: CheckCircle2 },
          { id: 'egresos' as const, label: `Egresos & Combustible (${unifiedDayOutflows.length})`, icon: Receipt },
          { id: 'cierres' as const, label: `Historial de Cierres (${filteredClosings.length})`, icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Cuadre & Cierre */}
      {activeTab === 'cuadre' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 saas-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Bike className="w-4 h-4 text-amber-500" />
                Cuadre Automático por Motorizado ({selectedDate})
              </h2>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Efectivo cobrado − Gasolina de ruta
              </span>
            </div>

            {summary.driverRows.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
                No hay entregas completadas ni vales de combustible registrados para esta fecha.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                      <th className="py-2.5 pr-3 font-semibold">Motorizado</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Entregas</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Efectivo</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Gasolina</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Costo/Envío</th>
                      <th className="py-2.5 pl-3 font-semibold text-right">Neto a Rendir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {summary.driverRows.map((row) => (
                      <tr key={row.driverId} className="text-zinc-800 dark:text-zinc-200">
                        <td className="py-2.5 pr-3 font-bold">{row.driverName}</td>
                        <td className="py-2.5 px-3 text-right">{row.deliveredCount}</td>
                        <td className="py-2.5 px-3 text-right">S/ {row.cashCollected.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                          S/ {row.fuelTotal.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">S/ {row.costPerDelivery.toFixed(2)}</td>
                        <td className="py-2.5 pl-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          S/ {row.netCashToSettle.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Resumen Cierre de Caja */}
          <div className="saas-card p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                Resumen de Cierre de Caja
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Ventas en Efectivo</span>
                  <span className="font-bold">S/ {summary.cashRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Ventas Yape / Plin</span>
                  <span className="font-bold">S/ {summary.yapePlinRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Ventas Tarjeta</span>
                  <span className="font-bold">S/ {summary.cardRevenue.toFixed(2)}</span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-800 my-2 pt-2 flex justify-between text-rose-600 dark:text-rose-400">
                  <span>− Gasolina (Caja Chica)</span>
                  <span className="font-bold">S/ {summary.fuelFromPettyCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>− Gasolina (Efectivo Ruta)</span>
                  <span className="font-bold">S/ {summary.fuelFromRouteCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>− Otros Egresos Caja Chica</span>
                  <span className="font-bold">S/ {summary.otherExpensesFromCash.toFixed(2)}</span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2.5 flex justify-between text-sm font-black text-zinc-950 dark:text-white">
                  <span>Efectivo en Gaveta</span>
                  <span>S/ {summary.expectedCashInDrawer.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseDailyCash}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
            >
              Cerrar Caja del Día
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Egresos y Combustible */}
      {activeTab === 'egresos' && (
        <div className="saas-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
              Detalle de Egresos y Combustible ({selectedDate})
            </h2>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'combustible' | ExpenseCategory)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-100"
            >
              <option value="all">Todas las categorías</option>
              <option value="combustible">Combustible Motorizado</option>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {unifiedDayOutflows.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No hay egresos registrados para los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <th className="py-2.5 pr-3 font-semibold">Hora</th>
                    <th className="py-2.5 px-3 font-semibold">Sucursal</th>
                    <th className="py-2.5 px-3 font-semibold">Categoría</th>
                    <th className="py-2.5 px-3 font-semibold">Origen</th>
                    <th className="py-2.5 px-3 font-semibold">Detalle</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                    <th className="py-2.5 pl-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {unifiedDayOutflows.map((item) => (
                    <tr key={item.id} className="text-zinc-800 dark:text-zinc-200">
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-500">
                        {new Date(item.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{branchNameById(item.tenantId)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            item.kind === 'combustible'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {item.kind === 'combustible' && <Fuel className="w-3 h-3" />}
                          {item.categoryLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{item.sourceLabel}</td>
                      <td className="py-2.5 px-3">{item.description}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        S/ {item.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        {item.canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(item.id, item.description, item.amount)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Eliminar egreso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Auto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Historial de Cierres */}
      {activeTab === 'cierres' && (
        <div className="saas-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
            Historial de Cierres Diarios
          </h2>
          {filteredClosings.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Aún no hay cierres de caja registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <th className="py-2.5 pr-3 font-semibold">Fecha</th>
                    <th className="py-2.5 px-3 font-semibold">Sucursal</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Ingresos</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Combustible</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Otros Egresos</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Gaveta</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Balance</th>
                    <th className="py-2.5 pl-3 font-semibold">Cerrado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredClosings.map((c) => (
                    <tr key={c.id} className="text-zinc-800 dark:text-zinc-200">
                      <td className="py-2.5 pr-3 font-bold">{c.date}</td>
                      <td className="py-2.5 px-3">{c.tenantName}</td>
                      <td className="py-2.5 px-3 text-right">S/ {c.totalRevenue.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                        S/ {c.fuelExpensesTotal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                        S/ {c.otherExpensesTotal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">S/ {c.expectedCashInDrawer.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        S/ {c.netBalance.toFixed(2)}
                      </td>
                      <td className="py-2.5 pl-3 text-zinc-500 dark:text-zinc-400">{c.closedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Nuevo Egreso / Combustible */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                Registrar Egreso o Combustible
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setExpenseKind('operativo')}
                className={`py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  expenseKind === 'operativo'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                Egreso / Caja Chica
              </button>
              <button
                type="button"
                onClick={() => setExpenseKind('combustible')}
                className={`py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  expenseKind === 'combustible'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                Gasolina Motorizado
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                    Sucursal
                  </label>
                  <select
                    value={formTenantId}
                    onChange={(e) => setFormTenantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-900 dark:text-white"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name.replace('Khalessi Pizza - ', '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                    Monto (S/)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0.10"
                    required
                    placeholder="30.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {expenseKind === 'operativo' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                      Categoría
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-900 dark:text-white"
                    >
                      {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                      Fuente de Pago
                    </label>
                    <select
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value as ExpensePaymentSource)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-900 dark:text-white"
                    >
                      {Object.entries(EXPENSE_SOURCE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                      Motorizado
                    </label>
                    <select
                      value={formDriverId}
                      onChange={(e) => setFormDriverId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-900 dark:text-white"
                    >
                      {driverProfiles.length > 0 ? (
                        driverProfiles.map((p) => (
                          <option key={p.userId} value={p.userId}>
                            {p.fullName}
                          </option>
                        ))
                      ) : (
                        <option value={currentUser.id}>{currentUser.name}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                      Origen del Dinero
                    </label>
                    <select
                      value={formFuelSource}
                      onChange={(e) => setFormFuelSource(e.target.value as FuelExpenseSource)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-900 dark:text-white"
                    >
                      <option value="caja_chica">Caja Chica (Efectivo)</option>
                      <option value="efectivo_ruta">Efectivo de Ruta</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                  Descripción / Nota
                </label>
                <input
                  type="text"
                  placeholder={expenseKind === 'combustible' ? 'Ej. Tanqueo grifo Primax' : 'Ej. Compra de gas / servilletas'}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
