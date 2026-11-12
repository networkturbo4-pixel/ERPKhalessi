import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { Order, OrderChannel, OrderStatus } from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { ThermalTicketBuilderModal } from '../pos/ThermalTicketBuilderModal';
import { printThermalTicket } from '../../utils/thermalPrinter';
import {
  ClipboardList,
  Search,
  Store,
  Radio,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Globe2,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  MapPin,
  Clock,
  Smartphone,
  Printer,
  Flame,
  Camera,
  Calendar,
  UserCheck,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { ImageLightboxModal } from '../common/ImageLightboxModal';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'recibido', label: 'Recibido (Cola)' },
  { value: 'en_cocina', label: 'Preparando Masa' },
  { value: 'en_horno', label: 'En Horno' },
  { value: 'listo', label: 'Listo p/ Despacho' },
  { value: 'en_ruta', label: 'En Ruta Delivery' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export const OrdersManagementView: React.FC = () => {
  const { orders, updateOrderStatus, markOrderPaid, lastRealtimeSyncAt } = useOrderCatalog();
  const { activeTenant, branchScope, tenants, switchTenant, openNoticeModal } = useSettings();

  const [selectedBranch, setSelectedBranch] = useState<string>(
    branchScope === 'consolidated' ? 'all' : activeTenant.id
  );
  const [channelFilter, setChannelFilter] = useState<'all' | OrderChannel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [driverFilter, setDriverFilter] = useState('all');
  const [hourRangeFilter, setHourRangeFilter] = useState('all');

  const [inspectedOrderId, setInspectedOrderId] = useState<string | null>(null);
  const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);

  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    title: string;
    subtitle?: string;
    metadata?: {
      capturedAt?: string;
      operatorOrDriver?: string;
      stageLabel?: string;
    };
  }>({
    isOpen: false,
    imageUrl: null,
    title: '',
  });

  const inspectedOrder = useMemo(
    () => (inspectedOrderId ? orders.find((o) => o.id === inspectedOrderId) || null : null),
    [orders, inspectedOrderId]
  );

  const availableDrivers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.assignedDriverName) set.add(o.assignedDriverName);
      if (o.pickupProofDriverName) set.add(o.pickupProofDriverName);
      if (o.deliveryProofDriverName) set.add(o.deliveryProofDriverName);
      if (o.deliveryAuthorizedBy) set.add(o.deliveryAuthorizedBy);
    });
    return Array.from(set).filter(Boolean);
  }, [orders]);

  const inspectDialogRef = useRef<HTMLDialogElement>(null);
  const inspectTitleId = useId();

  useEffect(() => {
    setSelectedBranch(branchScope === 'consolidated' ? 'all' : activeTenant.id);
  }, [activeTenant.id, branchScope]);

  useEffect(() => {
    const dialog = inspectDialogRef.current;
    if (!dialog) return;
    if (inspectedOrder) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [inspectedOrder]);

  const getBranchName = (tenantId: string) => {
    const found = tenants.find((t) => t.id === tenantId);
    return found ? found.name.replace('Khalessi Pizza - ', '') : tenantId;
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedBranch !== 'all' && o.tenantId !== selectedBranch) return false;
    if (channelFilter !== 'all' && o.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (startDate) {
      const orderDate = o.createdAt.slice(0, 10);
      if (orderDate < startDate) return false;
    }
    if (endDate) {
      const orderDate = o.createdAt.slice(0, 10);
      if (orderDate > endDate) return false;
    }
    if (driverFilter !== 'all') {
      const match =
        o.assignedDriverName === driverFilter ||
        o.pickupProofDriverName === driverFilter ||
        o.deliveryProofDriverName === driverFilter ||
        o.deliveryAuthorizedBy === driverFilter;
      if (!match) return false;
    }
    if (hourRangeFilter !== 'all') {
      const hour = new Date(o.createdAt).getHours();
      if (hourRangeFilter === 'morning' && (hour < 6 || hour >= 14)) return false;
      if (hourRangeFilter === 'afternoon' && (hour < 14 || hour >= 19)) return false;
      if (hourRangeFilter === 'night' && (hour < 19 && hour >= 6)) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.customerDni && o.customerDni.includes(q)) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(q)) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q)) ||
      (o.assignedDriverName && o.assignedDriverName.toLowerCase().includes(q)) ||
      (o.deliveryAuthorizedBy && o.deliveryAuthorizedBy.toLowerCase().includes(q))
    );
  });

  const activeValidOrders = filteredOrders.filter((o) => o.status !== 'cancelado');
  const totalRevenue = activeValidOrders.reduce((acc, o) => acc + o.total, 0);
  const totalSubtotal = activeValidOrders.reduce((acc, o) => acc + (o.subtotal ?? o.total), 0);
  const totalDeliveryFees = activeValidOrders.reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
  const totalDiscounts = activeValidOrders.reduce((acc, o) => acc + (o.discount || 0), 0);
  const inProgressCount = filteredOrders.filter(
    (o) => o.status === 'recibido' || o.status === 'en_cocina' || o.status === 'en_horno' || o.status === 'listo' || o.status === 'en_ruta'
  ).length;

  const handleCancelOrder = (order: Order) => {
    openNoticeModal({
      title: `¿Anular Pedido ${order.orderNumber}?`,
      message: `El pedido de ${order.customerName} se marcará como cancelado en POS, Cocina KDS y Delivery en tiempo real.`,
      tone: 'danger',
      confirmLabel: 'Sí, Anular Pedido',
      cancelLabel: 'Volver',
      onConfirm: () => updateOrderStatus(order.id, 'cancelado'),
    });
  };

  const renderChannelBadge = (order: Order) => {
    switch (order.channel) {
      case 'pos-salon':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
            <UtensilsCrossed className="w-3 h-3" /> {order.tableNumber || 'Salón'}
          </span>
        );
      case 'pos-takeaway':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
            <ShoppingBag className="w-3 h-3" /> Llevar
          </span>
        );
      case 'pos-delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
            <Bike className="w-3 h-3" /> Delivery POS
          </span>
        );
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300">
            <Globe2 className="w-3 h-3" /> Tienda Web
          </span>
        );
      case 'kiosco-salon':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            <Smartphone className="w-3 h-3" /> Kiosco Salón
          </span>
        );
      case 'kiosco-takeaway':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            <Smartphone className="w-3 h-3" /> Kiosco Llevar
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-5 touch-surface">
      {/* Header + Real-Time Sync */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Central Multisucursal de Pedidos</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Control unificado en tiempo real de Salón, Para Llevar, Delivery POS y Tienda Virtual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsThermalModalOpen(true)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-amber-500" />
            <span>Constructor Térmico 🖨️</span>
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Ventas Filtradas:{' '}
            <span className="font-black text-emerald-600 dark:text-emerald-400">
              S/ {totalRevenue.toFixed(2)}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-300">
            En Curso: {inProgressCount}
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-800 dark:text-emerald-300"
            title={`Última sincronización: ${new Date(lastRealtimeSyncAt).toLocaleTimeString()}`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Sincronizado</span>
          </div>
        </div>
      </div>

      {/* Apartados de Totales y Costos (Breakdown Multi-métrica) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
            Subtotal Productos
          </span>
          <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-0.5 block">
            S/ {totalSubtotal.toFixed(2)}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
            Fletes Delivery
          </span>
          <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
            S/ {totalDeliveryFees.toFixed(2)}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
            Descuentos Aplicados
          </span>
          <span className="text-base sm:text-lg font-black text-rose-500 mt-0.5 block">
            - S/ {totalDiscounts.toFixed(2)}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
            Total General Cobrado
          </span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            S/ {totalRevenue.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Sucursal Quick Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setSelectedBranch('all');
            switchTenant('consolidated');
          }}
          className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap shrink-0 ${
            selectedBranch === 'all'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-sm'
              : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Todas las Sedes ({orders.length})</span>
        </button>

        {tenants.map((t) => {
          const count = orders.filter((o) => o.tenantId === t.id).length;
          const active = selectedBranch === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedBranch(t.id);
                switchTenant(t.id);
              }}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{t.name.replace('Khalessi Pizza - ', '')}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-[10px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Channel + Status Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar #KH-1021, cliente, DNI, mesa o dirección..."
            aria-label="Buscar pedido"
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="md:col-span-3">
          <select
            aria-label="Filtrar por canal"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as 'all' | OrderChannel)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos los Canales</option>
            <option value="kiosco-salon">Kiosco Autoservicio (Salón)</option>
            <option value="kiosco-takeaway">Kiosco Autoservicio (Para Llevar)</option>
            <option value="pos-salon">Salón (Mesas)</option>
            <option value="pos-takeaway">Para Llevar</option>
            <option value="pos-delivery">Delivery POS</option>
            <option value="online">Tienda Online</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos los Estados</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters: Fecha Desde / Hasta, Rango Horario, y Motorizado / Autorizador */}
      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-500 font-bold shrink-0">
          <Filter className="w-3.5 h-3.5 text-amber-500" />
          <span>Filtros Avanzados:</span>
        </div>

        {/* Fecha Desde */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 font-semibold">Desde:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Fecha Hasta */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 font-semibold">Hasta:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Horario / Turno */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 font-semibold">Horario:</span>
          <select
            value={hourRangeFilter}
            onChange={(e) => setHourRangeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100"
          >
            <option value="all">Todas las Horas</option>
            <option value="morning">Turno Mañana (06:00 - 14:00)</option>
            <option value="afternoon">Turno Tarde (14:00 - 19:00)</option>
            <option value="night">Turno Noche / Cena (19:00 - 05:59)</option>
          </select>
        </div>

        {/* Motorizado / Quien entrega o autoriza */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 font-semibold">Entregador / Autoriza:</span>
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 max-w-[200px]"
          >
            <option value="all">Todos los Operadores</option>
            {availableDrivers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {(startDate || endDate || driverFilter !== 'all' || hourRangeFilter !== 'all' || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setDriverFilter('all');
              setHourRangeFilter('all');
              setSearchQuery('');
            }}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer Filtros</span>
          </button>
        )}
      </div>

      {/* Orders List (Cards on Mobile, Crisp Table/Rows on Desktop) */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 space-y-2">
          <ClipboardList className="w-10 h-10 text-zinc-400 mx-auto" />
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            No hay pedidos que coincidan con los filtros seleccionados
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((liveOrder) => (
            <div
              key={liveOrder.id}
              className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                liveOrder.status === 'cancelado'
                  ? 'border-zinc-200 dark:border-zinc-800 opacity-60'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-amber-500/40'
              }`}
            >
              {/* Left: Order Metadata & Customer */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm sm:text-base text-zinc-950 dark:text-white">
                    {liveOrder.orderNumber}
                  </span>
                  {renderChannelBadge(liveOrder)}
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {getBranchName(liveOrder.tenantId)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <Clock className="w-3 h-3" />
                    {new Date(liveOrder.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {liveOrder.customerName}
                  </span>
                  {liveOrder.invoiceType === 'factura_ruc' && liveOrder.invoiceDocument && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-black">
                      FACTURA RUC {liveOrder.invoiceDocument}
                    </span>
                  )}
                  {liveOrder.customerDni && (
                    <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      DNI: {liveOrder.customerDni}
                    </span>
                  )}
                  {liveOrder.scheduledFor && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                      ⏰ Programado: {liveOrder.scheduledFor}
                    </span>
                  )}
                  {liveOrder.deliveryAddress && (
                    <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 truncate max-w-md">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate">{liveOrder.deliveryAddress}</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  {liveOrder.items
                    .map(
                      (i) =>
                        `${i.quantity}x ${i.productName}${
                          i.halfAndHalf
                            ? ` [1/2 ${i.halfAndHalf.firstHalfName} + 1/2 ${i.halfAndHalf.secondHalfName}]`
                            : ''
                        }${i.size ? ` (${i.size.name})` : ''}`
                    )
                    .join(' · ')}
                </p>

                {/* Evidencias fotográficas registradas en la orden */}
                {(liveOrder.pickupProofPhoto || liveOrder.deliveryProofPhoto) && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {liveOrder.pickupProofPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxState({
                            isOpen: true,
                            imageUrl: liveOrder.pickupProofPhoto!,
                            title: `Foto Salida de Tienda · ${liveOrder.orderNumber}`,
                            subtitle: `Motorizado: ${liveOrder.pickupProofDriverName || liveOrder.assignedDriverName || 'Asignado'}`,
                            metadata: {
                              stageLabel: 'Salida de Tienda',
                              operatorOrDriver: liveOrder.pickupProofDriverName || liveOrder.assignedDriverName || liveOrder.deliveryAuthorizedBy,
                              capturedAt: liveOrder.pickupProofAt,
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/20 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-500" />
                        <span>Foto Salida</span>
                      </button>
                    )}
                    {liveOrder.deliveryProofPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxState({
                            isOpen: true,
                            imageUrl: liveOrder.deliveryProofPhoto!,
                            title: `Foto Entrega Conforme · ${liveOrder.orderNumber}`,
                            subtitle: `Cliente: ${liveOrder.customerName}`,
                            metadata: {
                              stageLabel: 'Entrega Conforme',
                              operatorOrDriver: liveOrder.deliveryProofDriverName || liveOrder.assignedDriverName,
                              capturedAt: liveOrder.deliveryProofAt,
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Foto Entrega</span>
                      </button>
                    )}
                    {liveOrder.deliveryAuthorizedBy && (
                      <span className="text-[10px] text-zinc-500">
                        Autorizado: <strong>{liveOrder.deliveryAuthorizedBy}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Payment, Live Status Select & Quick Actions */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="text-left sm:text-right mr-1">
                  <span className="font-black text-base text-zinc-950 dark:text-white block">
                    S/ {liveOrder.total.toFixed(2)}
                  </span>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 space-x-1">
                    <span>Sub: S/ {(liveOrder.subtotal ?? liveOrder.total).toFixed(2)}</span>
                    {liveOrder.deliveryFee && liveOrder.deliveryFee > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">· Flete: S/ {liveOrder.deliveryFee.toFixed(2)}</span>
                    ) : null}
                    {liveOrder.discount && liveOrder.discount > 0 ? (
                      <span className="text-rose-500">· Desc: -S/ {liveOrder.discount.toFixed(2)}</span>
                    ) : null}
                  </div>
                  {liveOrder.paymentStatus === 'pagado' ? (
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      Pagado ({liveOrder.paymentMethod.replace('_', '/')})
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markOrderPaid(liveOrder.id)}
                      className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 underline hover:text-amber-500 block mt-0.5"
                    >
                      Cobrar Pendiente
                    </button>
                  )}
                </div>

                <select
                  aria-label={`Cambiar estado de ${liveOrder.orderNumber}`}
                  value={liveOrder.status}
                  onChange={(e) => updateOrderStatus(liveOrder.id, e.target.value as OrderStatus)}
                  className="min-h-[42px] px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  aria-label={`Ver detalle de ${liveOrder.orderNumber}`}
                  onClick={() => setInspectedOrderId(liveOrder.id)}
                  className="min-h-[42px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Detalle</span>
                </button>

                {liveOrder.status !== 'cancelado' && liveOrder.status !== 'entregado' && (
                  <button
                    type="button"
                    aria-label={`Anular pedido ${liveOrder.orderNumber}`}
                    onClick={() => handleCancelOrder(liveOrder)}
                    className="min-h-[42px] min-w-[42px] p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center shrink-0"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Native <dialog> Ticket Inspector */}
      <dialog
        ref={inspectDialogRef}
        aria-labelledby={inspectTitleId}
        onClose={(e) => {
          e.currentTarget.returnValue = '';
          setInspectedOrderId(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
        }}
        className="backdrop:bg-black/70 backdrop:backdrop-blur-sm bg-transparent p-3 sm:p-4 m-auto w-full max-w-lg"
      >
        {inspectedOrder && (
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 id={inspectTitleId} className="font-black text-base text-zinc-950 dark:text-white">
                  Comanda {inspectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {getBranchName(inspectedOrder.tenantId)} ·{' '}
                  {new Date(inspectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={() => setInspectedOrderId(null)}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Cliente:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {inspectedOrder.customerName}
                  </span>
                </div>
                {inspectedOrder.customerDni && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">DNI:</span>
                    <span className="font-mono font-bold">{inspectedOrder.customerDni}</span>
                  </div>
                )}
                {inspectedOrder.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">WhatsApp / Teléfono:</span>
                    <span className="font-semibold">{inspectedOrder.customerPhone}</span>
                  </div>
                )}
                {inspectedOrder.customerEmail && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Correo:</span>
                    <span>{inspectedOrder.customerEmail}</span>
                  </div>
                )}
                {inspectedOrder.tableNumber && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Mesa Asignada:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {inspectedOrder.tableNumber}
                    </span>
                  </div>
                )}
                {inspectedOrder.deliveryAddress && (
                  <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 block">Dirección de Entrega:</span>
                    <span className="font-semibold block">{inspectedOrder.deliveryAddress}</span>
                    {inspectedOrder.deliveryReference && (
                      <span className="text-amber-600 dark:text-amber-400 block mt-0.5">
                        Ref: {inspectedOrder.deliveryReference}
                      </span>
                    )}
                  </div>
                )}
                {inspectedOrder.invoiceType && (
                  <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Comprobante SUNAT:</span>
                      <span className="font-bold uppercase text-zinc-900 dark:text-white">
                        {inspectedOrder.invoiceType === 'factura_ruc'
                          ? `Factura (${inspectedOrder.invoiceDocument || ''})`
                          : inspectedOrder.invoiceType === 'boleta_dni'
                          ? `Boleta DNI (${inspectedOrder.invoiceDocument || inspectedOrder.customerDni || ''})`
                          : 'Boleta Simple'}
                      </span>
                    </div>
                    {inspectedOrder.invoiceBusinessName && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Razón Social:</span>
                        <span className="font-semibold">{inspectedOrder.invoiceBusinessName}</span>
                      </div>
                    )}
                    {inspectedOrder.culqiReference && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Ref. Pasarela Culqi:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {inspectedOrder.culqiReference}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sección de Evidencia Fotográfica y Despacho */}
              {(inspectedOrder.pickupProofPhoto || inspectedOrder.deliveryProofPhoto || inspectedOrder.assignedDriverName || inspectedOrder.deliveryAuthorizedBy) && (
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <span className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      Evidencias de Entrega y Despacho
                    </span>
                    {inspectedOrder.assignedDriverName && (
                      <span className="font-bold text-[11px] text-zinc-600 dark:text-zinc-400">
                        Motorizado: {inspectedOrder.assignedDriverName}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Evidencia de Recojo / Salida */}
                    <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-amber-700 dark:text-amber-400">
                          1. Salida de Tienda
                        </span>
                        {inspectedOrder.pickupProofAt && (
                          <span className="text-[10px] text-zinc-400">
                            {new Date(inspectedOrder.pickupProofAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {inspectedOrder.pickupProofPhoto ? (
                        <div
                          onClick={() =>
                            setLightboxState({
                              isOpen: true,
                              imageUrl: inspectedOrder.pickupProofPhoto!,
                              title: `Evidencia de Salida · ${inspectedOrder.orderNumber}`,
                              subtitle: `Autorizado por: ${inspectedOrder.deliveryAuthorizedBy || 'Encargado'}`,
                              metadata: {
                                stageLabel: 'Salida de Tienda (Pickup)',
                                operatorOrDriver: inspectedOrder.pickupProofDriverName || inspectedOrder.assignedDriverName,
                                capturedAt: inspectedOrder.pickupProofAt,
                              },
                            })
                          }
                          className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video cursor-pointer group bg-black/10"
                        >
                          <img
                            src={inspectedOrder.pickupProofPhoto}
                            alt="Evidencia salida"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[11px]">
                            Ver en Grande
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-center text-zinc-400 text-[11px]">
                          Sin foto de salida
                        </div>
                      )}

                      {inspectedOrder.deliveryAuthorizedBy && (
                        <p className="text-[10px] text-zinc-500">
                          Autorizó: <strong>{inspectedOrder.deliveryAuthorizedBy}</strong>
                        </p>
                      )}
                    </div>

                    {/* Evidencia de Entrega al Cliente */}
                    <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400">
                          2. Entrega al Cliente
                        </span>
                        {inspectedOrder.deliveryProofAt && (
                          <span className="text-[10px] text-zinc-400">
                            {new Date(inspectedOrder.deliveryProofAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {inspectedOrder.deliveryProofPhoto ? (
                        <div
                          onClick={() =>
                            setLightboxState({
                              isOpen: true,
                              imageUrl: inspectedOrder.deliveryProofPhoto!,
                              title: `Evidencia de Entrega · ${inspectedOrder.orderNumber}`,
                              subtitle: `Entregado a: ${inspectedOrder.customerName}`,
                              metadata: {
                                stageLabel: 'Entrega Conforme',
                                operatorOrDriver: inspectedOrder.deliveryProofDriverName || inspectedOrder.assignedDriverName,
                                capturedAt: inspectedOrder.deliveryProofAt,
                              },
                            })
                          }
                          className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video cursor-pointer group bg-black/10"
                        >
                          <img
                            src={inspectedOrder.deliveryProofPhoto}
                            alt="Evidencia entrega"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[11px]">
                            Ver en Grande
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-center text-zinc-400 text-[11px]">
                          Sin foto de entrega
                        </div>
                      )}

                      {inspectedOrder.deliveredAt && (
                        <p className="text-[10px] text-zinc-500">
                          Hora: <strong>{new Date(inspectedOrder.deliveredAt).toLocaleTimeString()}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {inspectedOrder.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-950 dark:text-white">
                        {it.quantity}x {it.productName} {it.size ? `(${it.size.name})` : ''}
                      </span>
                      {it.halfAndHalf && (
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          [1/2] {it.halfAndHalf.firstHalfName} + [1/2] {it.halfAndHalf.secondHalfName}
                        </p>
                      )}
                      {it.subOptions.length > 0 && (
                        <p className="text-[11px] text-zinc-500">
                          {it.subOptions.map((s) => s.choiceName).join(' • ')}
                        </p>
                      )}
                      {it.extras.length > 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                          + {it.extras.map((e) => e.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-zinc-900 dark:text-white shrink-0">
                      S/ {it.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span>S/ {inspectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {inspectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Costo Delivery</span>
                    <span>S/ {inspectedOrder.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-zinc-950 dark:text-white pt-1">
                  <span>Total Comanda</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    S/ {inspectedOrder.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printThermalTicket('receipt', inspectedOrder)}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Printer className="w-4 h-4 text-amber-500" />
                  <span>Imprimir Recibo</span>
                </button>
                <button
                  type="button"
                  onClick={() => printThermalTicket('comanda', inspectedOrder)}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Flame className="w-4 h-4 text-red-500" />
                  <span>Imprimir Comanda</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {inspectedOrder.paymentStatus !== 'pagado' && (
                  <button
                    type="button"
                    onClick={() => markOrderPaid(inspectedOrder.id)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Pago</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectedOrderId(null)}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* Thermal Receipt & Kitchen Comanda Builder Modal */}
      <ThermalTicketBuilderModal
        isOpen={isThermalModalOpen}
        onClose={() => setIsThermalModalOpen(false)}
      />

      {/* Lightbox para Visualización de Evidencias */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState(prev => ({ ...prev, isOpen: false, imageUrl: null }))}
        imageUrl={lightboxState.imageUrl}
        title={lightboxState.title}
        subtitle={lightboxState.subtitle}
        metadata={lightboxState.metadata}
      />
    </div>
  );
};
