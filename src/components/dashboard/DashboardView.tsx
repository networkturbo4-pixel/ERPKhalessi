import React, { useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { TabId } from '../../types/settings';
import {
  Pizza,
  Clock,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Store,
  DollarSign,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Bot,
  Palette,
  Globe2,
  MapPin,
  UserCheck,
  Thermometer,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToSettings: (tab?: TabId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToSettings }) => {
  const {
    customization,
    activeTenant,
    tenants,
    branchScope,
    currentBranchProfile,
    switchTenant,
    setActiveTab,
    users,
  } = useSettings();

  const jumpToTab = (tab: TabId) => {
    setActiveTab(tab);
    onNavigateToSettings(tab);
  };

  const { orders } = useOrderCatalog();

  const scopedOrders = useMemo(() => {
    return orders.filter(o => {
      if (branchScope === 'consolidated') return true;
      return o.tenantId === activeTenant.id;
    });
  }, [orders, branchScope, activeTenant.id]);

  const validOrders = useMemo(() => {
    return scopedOrders.filter(o => o.status !== 'cancelado');
  }, [scopedOrders]);

  const liveOrdersSales = useMemo(() => {
    return validOrders.reduce((acc, o) => acc + o.total, 0);
  }, [validOrders]);

  const livePizzasCount = useMemo(() => {
    return validOrders.reduce((acc, o) => {
      return acc + (o.items || []).reduce((iAcc, item) => iAcc + item.quantity, 0);
    }, 0);
  }, [validOrders]);

  const totalSalesToday = currentBranchProfile.salesTodaySoles + liveOrdersSales;
  const totalPizzasToday = currentBranchProfile.pizzasToday + livePizzasCount;

  const liveOrdersKdsStream = useMemo(() => {
    if (scopedOrders.length === 0) return currentBranchProfile.liveOrders;

    return scopedOrders
      .filter(o => o.status !== 'cancelado')
      .slice(0, 10)
      .map(o => {
        const tenant = tenants.find(t => t.id === o.tenantId);
        const branchName = tenant ? tenant.name.replace('Khalessi Pizza - ', '') : 'Principal';

        let statusStr = 'Preparación';
        if (o.status === 'en_horno' || o.status === 'en_cocina') statusStr = 'En horno';
        else if (o.status === 'listo') statusStr = 'Empaque';
        else if (o.status === 'en_ruta') statusStr = 'En ruta';
        else if (o.status === 'entregado') statusStr = 'Entregado';

        const diffMin = Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000));
        const itemsSummary = (o.items || []).map(i => `${i.quantity}x ${i.productName}`).join(' · ');

        return {
          id: o.orderNumber.replace(/\D/g, ''),
          customer: o.customerName || (o.tableNumber ? `Mesa ${o.tableNumber}` : 'Cliente Mostrador'),
          branchName,
          items: itemsSummary,
          totalSoles: o.total,
          status: statusStr,
          timeAgo: `hace ${diffMin}m`,
        };
      });
  }, [scopedOrders, tenants, currentBranchProfile.liveOrders]);

  const activeUsersInScope =
    branchScope === 'consolidated'
      ? users.filter(u => u.status === 'active').length
      : users.filter(
          u =>
            u.status === 'active' &&
            (!u.branchIds ||
              u.branchIds.includes('all') ||
              u.branchIds.includes(activeTenant.id))
        ).length;

  const kpis = [
    {
      title: branchScope === 'consolidated' ? 'Ventas consolidadas hoy' : 'Ventas netas local hoy',
      value: `S/ ${totalSalesToday.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
      })}`,
      change: currentBranchProfile.salesGrowthPct,
      positive: true,
      subtitle:
        branchScope === 'consolidated'
          ? `Suma de ${tenants.length} locales activos (${validOrders.length} pedidos)`
          : `Encargado: ${currentBranchProfile.managerName} (${validOrders.length} pedidos)`,
      icon: DollarSign,
      progress: Math.min(95, Math.round((totalSalesToday / 9000) * 100)),
    },
    {
      title: 'Pizzas despachadas',
      value: `${totalPizzasToday}`,
      change: `${activeUsersInScope} en turno`,
      positive: true,
      subtitle: currentBranchProfile.activeOvens,
      icon: Pizza,
      progress: Math.min(92, Math.round((totalPizzasToday / 220) * 100)),
    },
    {
      title: 'Horno de piedra & KDS',
      value: `${currentBranchProfile.avgOvenMinutes} min`,
      change: `${currentBranchProfile.ovenTempC}°C`,
      positive: currentBranchProfile.avgOvenMinutes <= 12,
      subtitle: 'Temperatura y cocción promedio',
      icon: Clock,
      progress: Math.max(40, Math.round(100 - (currentBranchProfile.avgOvenMinutes - 8) * 12)),
    },
    {
      title: 'Estado de almacén',
      value:
        currentBranchProfile.stockAlertsCount === 0
          ? 'Óptimo'
          : `${currentBranchProfile.stockAlertsCount} alerta(s)`,
      change: currentBranchProfile.stockAlertsCount === 0 ? '100% OK' : 'Reponer',
      positive: currentBranchProfile.stockAlertsCount === 0,
      subtitle: currentBranchProfile.stockAlertSummary,
      icon: AlertTriangle,
      progress: currentBranchProfile.stockAlertsCount === 0 ? 96 : 38,
    },
  ];

  const getOrderBadge = (status: string) => {
    switch (status) {
      case 'En horno':
        return {
          dot: 'bg-amber-500',
          badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30',
        };
      case 'Preparación':
        return {
          dot: 'bg-orange-500',
          badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-orange-500/30',
        };
      case 'Empaque':
        return {
          dot: 'bg-sky-500',
          badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/30',
        };
      case 'En ruta':
        return {
          dot: 'bg-indigo-500',
          badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-500/30',
        };
      default:
        return {
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
        };
    }
  };

  const quickShortcuts: Array<{
    id: TabId;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'appearance', label: 'Design System', desc: 'Contraste dual, fondos y escala', icon: Palette },
    { id: 'dialogs', label: 'Toasts 3D & Modales', desc: 'Isla dinámica y estilos de aviso', icon: Sparkles },
    { id: 'roles', label: 'Matriz RBAC', desc: 'Tabla ágil de 13 módulos ERP', icon: ShieldCheck },
    { id: 'connections', label: 'Gemini AI', desc: 'Predicción de demanda por local', icon: Bot },
  ];

  const maxBranchSales = Math.max(
    1,
    ...tenants.map(t => t.operations?.salesTodaySoles || 1000)
  );

  return (
    <div className="w-full space-y-7 animate-in fade-in duration-200">
      {/* Top Row: Context Header + Quick Multisucursal Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full saas-subcard text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">
              {branchScope === 'consolidated'
                ? 'Vista Consolidada Corporativa'
                : activeTenant.name}
            </span>
            <span className="text-zinc-400">•</span>
            <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
              <MapPin className="h-3 w-3" />
              {currentBranchProfile.address}
            </span>
          </div>

          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            {branchScope === 'consolidated'
              ? 'Centro de Comando Multisucursal'
              : `Operación en Vivo — ${activeTenant.name.replace('Khalessi Pizza - ', '')}`}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {customization.slogan || 'Monitoreo unificado de hornos, ventas POS e inventario por sucursal.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateToSettings()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:opacity-95 whitespace-nowrap"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Configurar Plataforma
          </button>
        </div>
      </div>

      {/* Interactive Multi-Branch Filter Strip (Instant Switching!) */}
      <div className="saas-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-2">
            Sucursal Activa:
          </span>

          <button
            type="button"
            onClick={() => switchTenant('consolidated')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              branchScope === 'consolidated' ? 'saas-option-active' : 'saas-option'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5 text-emerald-500" />
            Todas las Sedes ({tenants.length})
          </button>

          {tenants.map(t => {
            const active = branchScope === 'branch' && t.id === activeTenant.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTenant(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  active ? 'saas-option-active' : 'saas-option'
                }`}
              >
                <Store className="h-3.5 w-3.5" style={active ? { color: customization.primaryColor } : undefined} />
                {t.name.replace('Khalessi Pizza - ', '')}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 px-2 text-xs text-zinc-600 dark:text-zinc-300 shrink-0">
          <span className="inline-flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
            {currentBranchProfile.managerName}
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Thermometer className="h-3.5 w-3.5 text-amber-500" />
            {currentBranchProfile.ovenTempC}°C
          </span>
        </div>
      </div>

      {/* SaaS Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="group saas-card hover:border-zinc-300 dark:hover:border-zinc-600 p-5 transition-colors flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {kpi.title}
                </span>
                <Icon className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors" />
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                    {kpi.value}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset tabular-nums whitespace-nowrap ${
                      kpi.positive
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30'
                    }`}
                  >
                    {kpi.positive && <ArrowUpRight className="h-3 w-3" />}
                    {kpi.change}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${kpi.progress}%`,
                        backgroundColor: kpi.positive ? customization.primaryColor : '#f59e0b',
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
                    {kpi.subtitle}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
        {/* Live Kitchen / POS Stream per Branch */}
        <div className="lg:col-span-7 xl:col-span-8 saas-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Flame className="h-4 w-4" style={{ color: customization.primaryColor }} />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Comandas KDS en vivo —{' '}
                {branchScope === 'consolidated'
                  ? 'Todas las Sucursales'
                  : activeTenant.name.replace('Khalessi Pizza - ', '')}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Yape Local: {currentBranchProfile.yapeNumber}
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {liveOrdersKdsStream.map((order, idx) => {
              const badgeInfo = getOrderBadge(order.status);
              return (
                <div
                  key={`${order.branchName}-${order.id}-${idx}`}
                  className="px-5 py-3.5 hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-zinc-700 dark:text-zinc-200 saas-subcard px-2.5 py-1 rounded-md shrink-0">
                      #{order.id}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {order.customer}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
                          {order.branchName}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                        {order.items}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {order.timeAgo}
                    </span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums w-20 text-right">
                      S/ {order.totalSoles.toFixed(2)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${badgeInfo.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${badgeInfo.dot}`} />
                      {order.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Rail: Interactive Branch Ranking + Shortcuts */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="saas-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Store className="h-4 w-4 text-zinc-400" />
                Comparativa por Sucursal
              </h2>
              <button
                type="button"
                onClick={() => jumpToTab('tenants')}
                className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Administrar sedes
              </button>
            </div>

            <div className="space-y-3">
              {tenants.map(t => {
                const sales = t.operations?.salesTodaySoles || 0;
                const pct = Math.round((sales / maxBranchSales) * 100);
                const isCurrent = branchScope === 'branch' && t.id === activeTenant.id;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => switchTenant(t.id)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all space-y-1.5 ${
                      isCurrent ? 'saas-option-active' : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                        {t.name.replace('Khalessi Pizza - ', '')}
                        {isCurrent && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </span>
                      <span className="font-bold text-zinc-950 dark:text-white tabular-nums">
                        S/ {sales.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-200/70 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: customization.primaryColor }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="saas-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Accesos directos ERP
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">12 secciones</span>
            </div>

            <div className="space-y-2">
              {quickShortcuts.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpToTab(item.id)}
                    className="w-full group flex items-center justify-between gap-3 p-2.5 rounded-xl saas-option text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-700/70 text-zinc-700 dark:text-zinc-200">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
