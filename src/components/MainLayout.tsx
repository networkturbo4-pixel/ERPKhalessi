import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useRBAC } from '../context/RBACContext';
import { useHR } from '../context/HRContext';
import { useOrderCatalog } from '../context/OrderCatalogContext';
import { ToastContainer } from './common/ToastContainer';
import { UnsavedChangesModal } from './common/UnsavedChangesModal';
import { SystemNoticeModal } from './common/SystemNoticeModal';
import { SeasonalOverlay } from './common/SeasonalOverlay';
import { ModuleWorkspaceSkeleton } from './common/AppSurfaceSkeleton';
import { MediaGalleryModal } from './media/MediaGalleryModal';
import { compressImageFile } from '../utils/imageCompressor';

const loadDashboardView = () =>
  import('./dashboard/DashboardView').then(m => ({ default: m.DashboardView }));
const loadSettingsView = () =>
  import('./settings/SettingsView').then(m => ({ default: m.SettingsView }));
const loadHRModuleView = () =>
  import('./hr/HRModuleView').then(m => ({ default: m.HRModuleView }));
const loadPOSView = () =>
  import('./pos/POSView').then(m => ({ default: m.POSView }));
const loadKitchenKDSView = () =>
  import('./kitchen/KitchenKDSView').then(m => ({ default: m.KitchenKDSView }));
const loadDeliveryView = () =>
  import('./delivery/DeliveryView').then(m => ({ default: m.DeliveryView }));
const loadOrdersManagementView = () =>
  import('./orders/OrdersManagementView').then(m => ({ default: m.OrdersManagementView }));
const loadClientsCRMView = () =>
  import('./crm/ClientsCRMView').then(m => ({ default: m.ClientsCRMView }));
const loadBenefitsModuleView = () =>
  import('./benefits/BenefitsModuleView').then(m => ({ default: m.BenefitsModuleView }));
const loadMarketingModuleView = () =>
  import('./marketing/MarketingModuleView').then(m => ({ default: m.MarketingModuleView }));
const loadOmnichannelInboxView = () =>
  import('./inbox/OmnichannelInboxView').then(m => ({ default: m.OmnichannelInboxView }));
const loadWhatsAppModuleView = () =>
  import('./whatsapp/WhatsAppModuleView').then(m => ({ default: m.WhatsAppModuleView }));
const loadProductCatalogView = () =>
  import('./pos/ProductCatalogView').then(m => ({ default: m.ProductCatalogView }));
const loadKioskSelfServiceView = () =>
  import('./kiosk/KioskSelfServiceView').then(m => ({ default: m.KioskSelfServiceView }));
const loadPublicEmployeePortal = () =>
  import('./hr/PublicEmployeePortal').then(m => ({ default: m.PublicEmployeePortal }));
const loadThermalTicketBuilderModal = () =>
  import('./pos/ThermalTicketBuilderModal').then(m => ({ default: m.ThermalTicketBuilderModal }));
const loadInventoryModuleView = () =>
  import('./inventory/InventoryModuleView').then(m => ({ default: m.InventoryModuleView }));
const loadMediaGalleryView = () =>
  import('./media/MediaGalleryView').then(m => ({ default: m.MediaGalleryView }));
const loadPagesModuleView = () =>
  import('./pages/PagesModuleView').then(m => ({ default: m.PagesModuleView }));
const loadFinanceModuleView = () =>
  import('./finance/FinanceModuleView').then(m => ({ default: m.FinanceModuleView }));
const loadBillingModuleView = () =>
  import('./billing/BillingModuleView').then(m => ({ default: m.BillingModuleView }));

const DashboardView = lazy(loadDashboardView);
const SettingsView = lazy(loadSettingsView);
const HRModuleView = lazy(loadHRModuleView);
const POSView = lazy(loadPOSView);
const KitchenKDSView = lazy(loadKitchenKDSView);
const DeliveryView = lazy(loadDeliveryView);
const OrdersManagementView = lazy(loadOrdersManagementView);
const ClientsCRMView = lazy(loadClientsCRMView);
const BenefitsModuleView = lazy(loadBenefitsModuleView);
const MarketingModuleView = lazy(loadMarketingModuleView);
const OmnichannelInboxView = lazy(loadOmnichannelInboxView);
const WhatsAppModuleView = lazy(loadWhatsAppModuleView);
const ProductCatalogView = lazy(loadProductCatalogView);
const KioskSelfServiceView = lazy(loadKioskSelfServiceView);
const PublicEmployeePortal = lazy(loadPublicEmployeePortal);
const ThermalTicketBuilderModal = lazy(loadThermalTicketBuilderModal);
const InventoryModuleView = lazy(loadInventoryModuleView);
const MediaGalleryView = lazy(loadMediaGalleryView);
const PagesModuleView = lazy(loadPagesModuleView);
const FinanceModuleView = lazy(loadFinanceModuleView);
const BillingModuleView = lazy(loadBillingModuleView);

import {
  LayoutDashboard,
  FileCheck2,
  Settings,
  Pizza,
  Flame,
  Users,
  Bike,
  ClipboardList,
  Sun,
  Moon,
  Laptop,
  Save,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  Check,
  ShieldCheck,
  Store,
  Globe2,
  RotateCcw,
  LogOut,
  UserCheck,
  Edit2,
  FileText,
  Receipt,
  Gift,
  Megaphone,
  Inbox,
  MessageSquare,
  Smartphone,
  Boxes,
  FileImage,
  Upload,
  Clipboard as ClipboardIcon,
  Layers,
  Wallet,
  Lock,
  Unlock,
} from 'lucide-react';

export type MainModuleId =
  | 'dashboard'
  | 'pos'
  | 'kiosk'
  | 'kitchen'
  | 'delivery'
  | 'orders'
  | 'clients'
  | 'benefits'
  | 'marketing'
  | 'inbox'
  | 'whatsapp'
  | 'products'
  | 'media'
  | 'pages'
  | 'inventory'
  | 'hr'
  | 'finance'
  | 'billing'
  | 'settings';

export interface MainLayoutProps {
  onNavigateToStore?: () => void;
  onNavigateToKiosk?: () => void;
}

const MODULE_MOBILE_LABELS: Record<MainModuleId, string> = {
  dashboard: 'Inicio',
  pos: 'Caja POS',
  kiosk: 'Kiosco',
  kitchen: 'Cocina KDS',
  delivery: 'Delivery',
  orders: 'Pedidos',
  clients: 'Clientes CRM',
  benefits: 'Beneficios',
  marketing: 'Marketing',
  inbox: 'Bandeja',
  whatsapp: 'WhatsApp Bot',
  products: 'Catálogo',
  media: 'Galería',
  pages: 'Páginas',
  inventory: 'Inventario',
  hr: 'RRHH',
  finance: 'Finanzas',
  billing: 'Facturación',
  settings: 'Configuración',
};

const MODULE_PERMISSION_MAP: Record<MainModuleId, string[]> = {
  dashboard: ['dashboard:view'],
  orders: ['orders:view', 'pos:view', 'kds:view', 'delivery:view'],
  inventory: ['inventory:view', 'purchases:view'],
  clients: ['clients:view'],
  products: ['services:view'],
  hr: ['hr:view', 'hr:attendance', 'hr:schedules'],
  finance: ['finances:view'],
  billing: ['billing:view', 'finances:view'],
  media: ['media:view'],
  pages: ['pages:view'],
  marketing: ['marketing:view'],
  inbox: ['inbox:view'],
  whatsapp: ['whatsapp:view'],
  settings: ['settings:view', 'settings:users', 'settings:roles', 'settings:manage'],
  pos: ['pos:view', 'tables:view'],
  kiosk: ['kiosk:view', 'pos:view'],
  kitchen: ['kds:view'],
  delivery: ['delivery:view'],
  benefits: ['benefits:view'],
};

const ALL_MAIN_MODULES_ORDER: MainModuleId[] = [
  'dashboard',
  'orders',
  'pos',
  'inbox',
  'whatsapp',
  'kitchen',
  'delivery',
  'clients',
  'products',
  'inventory',
  'hr',
  'finance',
  'billing',
  'marketing',
  'benefits',
  'media',
  'pages',
  'kiosk',
  'settings',
];

export const MainLayout: React.FC<MainLayoutProps> = ({ onNavigateToStore, onNavigateToKiosk }) => {
  const {
    customization,
    updateCustomization,
    activeTenant,
    tenants,
    branchScope,
    switchTenant,
    isDirty,
    discardUnsavedChanges,
    isSaving,
    saveAllSettings,
    isDarkResolved,
    logoutSession,
    updateUser,
    dispatchToast,
  } = useSettings();

  const [isProfileMediaPickerOpen, setIsProfileMediaPickerOpen] = useState(false);

  const { currentUser, setCurrentUser, roles, hasPermission } = useRBAC();
  const canAccessModule = React.useCallback(
    (mod: MainModuleId): boolean => {
      if (currentUser.roleId === 'role-admin') return true;
      const requiredAny = MODULE_PERMISSION_MAP[mod];
      if (!requiredAny || requiredAny.length === 0) return true;
      return requiredAny.some((perm) => hasPermission(perm));
    },
    [currentUser.roleId, hasPermission]
  );
  const { todayRecords, getEmployeeProfile, updateEmployeeProfile } = useHR();
  const { orders, customers } = useOrderCatalog();

  const visibleCustomersCount = React.useMemo(() => {
    if (branchScope === 'consolidated') return customers.length;
    return customers.filter(c => !c.tenantId || c.tenantId === activeTenant.id).length;
  }, [customers, branchScope, activeTenant.id]);

  // Enforce assigned branch for restricted users (e.g., POS cashiers assigned to a specific branch)
  useEffect(() => {
    const assigned = currentUser.branchIds;
    if (assigned && !assigned.includes('all') && assigned.length > 0) {
      if (!assigned.includes(activeTenant.id)) {
        const target = tenants.find((t) => assigned.includes(t.id));
        if (target) {
          switchTenant(target.id);
        }
      }
    }
  }, [currentUser.branchIds, activeTenant.id, tenants, switchTenant]);

  const allowedStationTenants = React.useMemo(() => {
    const assigned = currentUser.branchIds;
    if (!assigned || assigned.includes('all') || assigned.length === 0) return tenants;
    const filtered = tenants.filter((t) => assigned.includes(t.id));
    return filtered.length > 0 ? filtered : tenants;
  }, [currentUser.branchIds, tenants]);

  // Sync POS cash register session state for the dedicated Cashier Station header
  const stationCashKey = `kh_cash_register_${activeTenant.id}_${currentUser.id}`;
  const [stationCashSession, setStationCashSession] = useState<{ isOpen: boolean; initialFloat: number }>(() => {
    try {
      const raw = localStorage.getItem(stationCashKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { isOpen: Boolean(parsed.isOpen), initialFloat: Number(parsed.initialFloat) || 0 };
      }
    } catch {
      // ignore
    }
    return { isOpen: false, initialFloat: 0 };
  });

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(stationCashKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setStationCashSession({ isOpen: Boolean(parsed.isOpen), initialFloat: Number(parsed.initialFloat) || 0 });
        } else {
          setStationCashSession({ isOpen: false, initialFloat: 0 });
        }
      } catch {
        setStationCashSession({ isOpen: false, initialFloat: 0 });
      }
    };
    syncFromStorage();

    const onCashChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string; session?: { isOpen?: boolean; initialFloat?: number } }>).detail;
      if (detail?.key === stationCashKey && detail.session) {
        setStationCashSession({
          isOpen: Boolean(detail.session.isOpen),
          initialFloat: Number(detail.session.initialFloat) || 0,
        });
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === stationCashKey) syncFromStorage();
    };
    window.addEventListener('kh:cash-session-changed', onCashChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('kh:cash-session-changed', onCashChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [stationCashKey]);

  const [todayStartMs] = useState(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return startOfToday.getTime();
  });

  // Live "ventas de hoy" per branch computed from real orders (updates in real time via SSE, no stale mock numbers)
  const liveSalesByTenant = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const o of orders) {
      if (o.status === 'cancelado') continue;
      if (new Date(o.createdAt).getTime() < todayStartMs) continue;
      totals[o.tenantId] = (totals[o.tenantId] || 0) + (o.total || 0);
    }
    return totals;
  }, [orders, todayStartMs]);

  const [activeMainModule, setActiveMainModule] = useState<MainModuleId>(() => {
    try {
      const saved = localStorage.getItem('kh_active_main_module') as MainModuleId;
      if (saved && [
        'pos', 'kitchen', 'delivery', 'orders', 'catalog', 'tables',
        'kiosk', 'benefits', 'marketing', 'inbox', 'whatsapp', 'hr', 'crm', 'store_builder', 'settings', 'dashboard', 'inventory',
        'products', 'clients', 'media', 'pages', 'finance', 'billing'
      ].includes(saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('kh_active_main_module', activeMainModule);
    } catch {
      // ignore
    }
  }, [activeMainModule]);

  // Auto-redirect to first permitted module when current role lacks access to activeMainModule
  useEffect(() => {
    if (!canAccessModule(activeMainModule)) {
      const firstAllowed = ALL_MAIN_MODULES_ORDER.find((m) => canAccessModule(m));
      if (firstAllowed && firstAllowed !== activeMainModule) {
        setActiveMainModule(firstAllowed);
      }
    }
  }, [activeMainModule, canAccessModule]);

  // Silent idle prefetch of core operational POS/Orders/Kitchen views after active view paints
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPOSView();
      void loadOrdersManagementView();
      void loadKitchenKDSView();
    }, 650);
    return () => window.clearTimeout(timer);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      // Auto-compact sidebar into 68px icon rail on square POS screens & horizontal tablets (1024-1279px)
      return window.innerWidth >= 1024 && window.innerWidth < 1280;
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isPersonalVoucherOpen, setIsPersonalVoucherOpen] = useState(false);
  const editProfileDialogRef = useRef<HTMLDialogElement>(null);
  const tenantDropdownRef = useRef<HTMLDivElement>(null);

  // Station POS Layout States (Dedicated Cashier/POS View)
  const [stationPosTab, setStationPosTab] = useState<'carta' | 'mesas'>('carta');
  const [isStationUserMenuOpen, setIsStationUserMenuOpen] = useState(false);
  const [isStationTenantMenuOpen, setIsStationTenantMenuOpen] = useState(false);
  const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);
  const stationUserMenuRef = useRef<HTMLDivElement>(null);
  const stationTenantMenuRef = useRef<HTMLDivElement>(null);

  // Manage native <dialog> for editing user profile from sidebar card
  useEffect(() => {
    const dialog = editProfileDialogRef.current;
    if (!dialog) return;
    if (isEditProfileModalOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isEditProfileModalOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tenantDropdownRef.current && !tenantDropdownRef.current.contains(e.target as Node)) {
        setTenantMenuOpen(false);
      }
      if (stationUserMenuRef.current && !stationUserMenuRef.current.contains(e.target as Node)) {
        setIsStationUserMenuOpen(false);
      }
      if (stationTenantMenuRef.current && !stationTenantMenuRef.current.contains(e.target as Node)) {
        setIsStationTenantMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '1' && canAccessModule('dashboard')) {
        e.preventDefault();
        setActiveMainModule('dashboard');
      } else if (e.altKey && e.key === '2' && canAccessModule('settings')) {
        e.preventDefault();
        setActiveMainModule('settings');
      } else if (e.altKey && e.key === '3' && canAccessModule('hr')) {
        e.preventDefault();
        setActiveMainModule('hr');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canAccessModule]);

  const activeLogo =
    isDarkResolved && customization.logoDark
      ? customization.logoDark
      : customization.logoLight;

  const activeBranchLabel =
    branchScope === 'consolidated'
      ? `Consolidado (${tenants.length} sedes)`
      : activeTenant.name.replace('Gastro - ', '');

  const isSuperAdminOrManager =
    currentUser.roleId === 'role-admin' ||
    currentUser.roleId === 'role-manager' ||
    hasPermission('workspace:manage_branch') ||
    hasPermission('workspace:consolidated');

  const BUILT_IN_ROLE_IDS = ['role-admin', 'role-manager', 'role-cashier', 'role-kitchen', 'role-delivery'];
  const isCustomRole = !BUILT_IN_ROLE_IDS.includes(currentUser.roleId);

  const isCashierRole =
    !isSuperAdminOrManager &&
    !isCustomRole &&
    (currentUser.roleId === 'role-cashier' ||
      currentUser.roleName.toLowerCase().includes('cajer') ||
      currentUser.roleName.toLowerCase().includes('caja'));

  const isKitchenRole =
    !isSuperAdminOrManager &&
    !isCustomRole &&
    (currentUser.roleId === 'role-kitchen' ||
      currentUser.roleName.toLowerCase().includes('cocin') ||
      currentUser.roleName.toLowerCase().includes('pizz') ||
      currentUser.roleName.toLowerCase().includes('horner'));

  const isDeliveryRole =
    !isSuperAdminOrManager &&
    !isCustomRole &&
    (currentUser.roleId === 'role-delivery' ||
      currentUser.roleName.toLowerCase().includes('motoriz') ||
      currentUser.roleName.toLowerCase().includes('delivery') ||
      currentUser.roleName.toLowerCase().includes('repart'));

  const occupiedTablesCount = orders.filter(
    (o) =>
      o.tenantId === activeTenant.id &&
      o.channel === 'pos-salon' &&
      o.status !== 'entregado' &&
      o.status !== 'cancelado'
  ).length;

  // If user is Cajero, Cocinero, or Motorizado Delivery, display their isolated terminal station
  if (isCashierRole || isKitchenRole || isDeliveryRole) {
    return (
      <div
        className="w-full h-dvh flex flex-col erp-shell-surface text-zinc-900 dark:text-zinc-100 antialiased overflow-hidden"
        style={{ fontFamily: customization.fontFamily }}
      >
        <ToastContainer />
        <SystemNoticeModal />

        {/* Dedicated Operational Station Top Bar */}
        <header className="h-14 sm:h-16 px-2.5 sm:px-6 border-b border-erp-border bg-erp-card flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-sm z-30">
          {/* Left: Branding & Branch Selector */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg shadow-sm shrink-0 overflow-hidden ${
                customization.favicon
                  ? 'bg-erp-subcard border border-erp-border'
                  : 'text-white'
              }`}
              style={customization.favicon ? undefined : { backgroundColor: customization.primaryColor }}
            >
              {customization.favicon ? (
                <img
                  src={customization.favicon}
                  alt="Logo"
                  className="w-7 h-7 object-contain rounded-lg"
                />
              ) : isCashierRole ? (
                '🍕'
              ) : isDeliveryRole ? (
                <Bike className="w-5 h-5 text-white" />
              ) : (
                <Flame className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-zinc-950 dark:text-white uppercase tracking-tight truncate">
                {isCashierRole
                  ? 'Punto de Venta POS'
                  : isDeliveryRole
                  ? 'Terminal Motorizado & Delivery'
                  : 'Terminal Cocina & Horno KDS'}
              </h1>

              {/* Branch Badge (Locked in POS or when user has a single assigned branch) */}
              {isCashierRole || allowedStationTenants.length <= 1 ? (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate max-w-[220px]">
                  <Store className="w-3 h-3 shrink-0" />
                  <span className="truncate">{activeTenant.name.replace('Gastro - ', '')}</span>
                </div>
              ) : (
                <div className="relative" ref={stationTenantMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsStationTenantMenuOpen((v) => !v)}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors truncate max-w-[200px]"
                  >
                    <Store className="w-3 h-3 shrink-0" />
                    <span className="truncate">{activeTenant.name.replace('Gastro - ', '')}</span>
                    <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-60" />
                  </button>

                  {isStationTenantMenuOpen && (
                    <div className="absolute left-0 top-full mt-2 w-64 saas-card shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        Cambiar de Sucursal
                      </div>
                      {allowedStationTenants.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            switchTenant(t.id);
                            setIsStationTenantMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                            t.id === activeTenant.id
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <span className="truncate">{t.name.replace('Gastro - ', '')}</span>
                          {t.id === activeTenant.id && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cash Register Action (POS) + Operator Popover Dropdown */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0" ref={stationUserMenuRef}>
            {isCashierRole && (
              stationCashSession.isOpen ? (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('kh:open-cash-close-modal'))}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-rose-500/15 text-emerald-700 dark:text-emerald-300 hover:text-rose-600 dark:hover:text-rose-400 border border-emerald-500/30 hover:border-rose-500/30 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  title="Ver resumen del día y cerrar caja"
                >
                  <Unlock className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">Caja: S/ {stationCashSession.initialFloat.toFixed(2)} ·</span>
                  <span>Cerrar Caja</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('kh:open-cash-open-modal'))}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Abrir Caja</span>
                </button>
              )
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStationUserMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 transition-all text-left shadow-xs"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-xl object-cover ring-1 ring-zinc-300 dark:ring-zinc-600"
                />
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white block leading-tight truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block leading-tight truncate">
                    {currentUser.roleName}
                  </span>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>

              {/* Operator Popover Menu */}
              {isStationUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 saas-card shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  {/* User Profile Card */}
                  <div className="p-3 saas-subcard">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-300 dark:ring-zinc-700"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-zinc-900 dark:text-white truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">DNI: {currentUser.pin}</p>
                        <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          {currentUser.roleName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mi Ficha & Boleta */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsStationUserMenuOpen(false);
                      setIsPersonalVoucherOpen(true);
                    }}
                    className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span>Mi Ficha & Boleta</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">Ver</span>
                  </button>

                  {/* Thermal Receipt & Comanda Builder (For Cashiers) */}
                  {isCashierRole && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsStationUserMenuOpen(false);
                          window.dispatchEvent(new CustomEvent('kh:open-cash-expense-modal'));
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-rose-500" />
                          <span>Registrar Gasto / Egreso</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          Caja Chica
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsStationUserMenuOpen(false);
                          window.dispatchEvent(
                            new CustomEvent(
                              stationCashSession.isOpen ? 'kh:open-cash-close-modal' : 'kh:open-cash-open-modal'
                            )
                          );
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {stationCashSession.isOpen ? (
                            <Lock className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Unlock className="w-4 h-4 text-emerald-500" />
                          )}
                          <span>{stationCashSession.isOpen ? 'Cerrar Caja del Día' : 'Aperturar Caja'}</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {stationCashSession.isOpen ? 'Abierta' : 'Cerrada'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsStationUserMenuOpen(false);
                          setIsThermalModalOpen(true);
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-amber-500" />
                          <span>Recibos & Comandas Térmicas</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          80/58mm
                        </span>
                      </button>
                    </>
                  )}

                  {/* Theme Mode Toggle (Sun / Moon) */}
                  <button
                    type="button"
                    onClick={() => {
                      updateCustomization({ themePreference: isDarkResolved ? 'light' : 'dark' });
                    }}
                    className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {isDarkResolved ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-indigo-500" />
                      )}
                      <span>Modo {isDarkResolved ? 'Claro' : 'Oscuro'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {isDarkResolved ? 'Día ☀️' : 'Noche 🌙'}
                    </span>
                  </button>

                  <div className="border-t border-zinc-200 dark:border-zinc-800 my-1" />

                  {/* Cerrar Turno */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsStationUserMenuOpen(false);
                      logoutSession();
                    }}
                    className="w-full p-2.5 rounded-xl text-left hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Turno / Salir</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Operational Workspace Body (1600px max width) */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 erp-canvas-surface custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full">
            <Suspense fallback={<ModuleWorkspaceSkeleton />}>
              {isCashierRole ? (
                <POSView
                  hideHeader={true}
                  activeTab={stationPosTab}
                  onTabChange={setStationPosTab}
                />
              ) : isDeliveryRole ? (
                <DeliveryView />
              ) : (
                <KitchenKDSView />
              )}
            </Suspense>
          </div>
        </main>

        {/* Thermal Ticket Builder Modal */}
        {isThermalModalOpen && (
          <Suspense fallback={null}>
            <ThermalTicketBuilderModal
              isOpen={isThermalModalOpen}
              onClose={() => setIsThermalModalOpen(false)}
            />
          </Suspense>
        )}

        {/* Modal for Personal Technical Sheet / Remuneration Voucher */}
        {isPersonalVoucherOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-4xl max-h-[92vh] saas-card shadow-2xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-erp-border flex items-center justify-between bg-erp-subcard">
                <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  Ficha Técnica & Boleta Oficial · {currentUser.name}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPersonalVoucherOpen(false)}
                  className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <Suspense fallback={<ModuleWorkspaceSkeleton compact />}>
                  <PublicEmployeePortal
                    initialDni={currentUser.pin}
                    lockToCurrentUser={true}
                    onClose={() => setIsPersonalVoucherOpen(false)}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full h-dvh flex erp-shell-surface text-zinc-900 dark:text-zinc-100 antialiased overflow-hidden select-none sm:select-auto"
      style={{ fontFamily: customization.fontFamily }}
    >
      {/* MOBILE OVERLAY BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-150"
        />
      )}

      {/* 1. MODERN SAAS SIDEBAR (FLUSH ON INSET SHELL) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto flex flex-col shrink-0 erp-shell-surface transition-[width,transform] duration-200 ease-out ${
          mobileMenuOpen
            ? 'translate-x-0 w-64 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl'
            : sidebarCollapsed
            ? '-translate-x-full lg:translate-x-0 lg:w-[68px]'
            : '-translate-x-full lg:translate-x-0 lg:w-64'
        }`}
      >
        {/* Top Multisucursal Switcher + Collapse Button */}
        <div className="pt-3 px-3 pb-2 flex items-center justify-between gap-1.5" ref={tenantDropdownRef}>
          <div className="relative flex-1 min-w-0">
            {isSuperAdminOrManager ? (
              <button
                type="button"
                onClick={() => setTenantMenuOpen(!tenantMenuOpen)}
                className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-zinc-200/70 dark:hover:bg-white/5 transition-colors text-left ${
                  sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
                }`}
                title={`${customization.appName} — ${activeBranchLabel}`}
              >
                {activeLogo ? (
                  <img
                    src={activeLogo}
                    alt={customization.appName}
                    className="h-7 w-7 rounded-lg object-cover shrink-0 ring-1 ring-zinc-900/10 dark:ring-white/10 block"
                  />
                ) : (
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    {customization.collapsedLogo || '🍕'}
                  </div>
                )}

                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate block leading-tight">
                        {customization.appName}
                      </span>
                      <span className="text-[11px] font-medium truncate flex items-center gap-1 leading-tight mt-0.5" style={{ color: customization.primaryColor }}>
                        {branchScope === 'consolidated' ? (
                          <Globe2 className="h-3 w-3 shrink-0" />
                        ) : (
                          <Store className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate">{activeBranchLabel}</span>
                      </span>
                    </div>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  </>
                )}
              </button>
            ) : (
              /* Non-admin collaborator sees only their fixed brand & assigned branch (no dropdown) */
              <div
                className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl text-left cursor-default ${
                  sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
                }`}
              >
                {activeLogo ? (
                  <img
                    src={activeLogo}
                    alt={customization.appName}
                    className="h-7 w-7 rounded-lg object-cover shrink-0 ring-1 ring-zinc-900/10 dark:ring-white/10 block"
                  />
                ) : (
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    {customization.collapsedLogo || '🍕'}
                  </div>
                )}

                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate block leading-tight">
                      {customization.appName}
                    </span>
                    <span className="text-[11px] font-medium truncate flex items-center gap-1 leading-tight mt-0.5 text-zinc-500 dark:text-zinc-400">
                      <Store className="h-3 w-3 shrink-0" />
                      <span className="truncate">{activeBranchLabel}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Multisucursal Popover */}
            {isSuperAdminOrManager && tenantMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-700/90 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Selector Multisucursal en Vivo
                </div>

                {/* Consolidated Option */}
                <button
                  type="button"
                  onClick={() => {
                    switchTenant('consolidated');
                    setTenantMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors mb-1 ${
                    branchScope === 'consolidated'
                      ? 'saas-option-active font-semibold'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="text-left min-w-0">
                      <span className="block truncate font-semibold">Consolidado Corporativo</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                        Suma de las {tenants.length} pizzerías
                      </span>
                    </div>
                  </div>
                  {branchScope === 'consolidated' && (
                    <Check className="h-3.5 w-3.5 shrink-0" style={{ color: customization.primaryColor }} />
                  )}
                </button>

                <div className="border-t border-zinc-200 dark:border-zinc-800 my-1" />

                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {tenants.map(t => {
                    const isSelected = branchScope === 'branch' && t.id === activeTenant.id;
                    const sales = liveSalesByTenant[t.id] || 0;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          switchTenant(t.id);
                          setTenantMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                          isSelected
                            ? 'saas-option-active font-semibold'
                            : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Store className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <div className="text-left min-w-0">
                            <span className="truncate block">
                              {t.name.replace('Gastro - ', '')}
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
                              {t.operations?.branchCode ? `${t.operations.branchCode} · ` : ''}
                              {t.operations?.branchFormat || t.operations?.managerName || 'Sucursal Propia'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                            S/ {sales.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {(!sidebarCollapsed || mobileMenuOpen) && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors shrink-0"
              title="Colapsar barra lateral"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sidebarCollapsed && !mobileMenuOpen && (
          <div className="hidden lg:flex justify-center pb-1">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors"
              title="Expandir barra lateral"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation Modules */}
        <div className="flex-1 px-2.5 py-3 space-y-5 saas-scroll">
          {(['dashboard', 'orders', 'inventory', 'clients', 'products', 'hr', 'finance', 'billing', 'media', 'pages', 'marketing', 'inbox', 'whatsapp', 'settings'] as MainModuleId[]).some(canAccessModule) && (
          <div className="space-y-0.5">
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                Plataforma
              </span>
            )}

            {canAccessModule('dashboard') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'dashboard'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Dashboard (Alt+1)"
            >
              <LayoutDashboard
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'dashboard' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Dashboard</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <kbd className="hidden xl:inline-block text-[10px] font-mono text-zinc-400">
                      ⌥1
                    </kbd>
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Pedidos Multisucursal Button */}
            {canAccessModule('orders') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('orders');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'orders'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Central de Pedidos por Sucursal"
            >
              <ClipboardList
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'orders' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Pedidos</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold">
                    {orders.length}
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Inventario & Recetas Button */}
            {canAccessModule('inventory') && (
              <button
                type="button"
                onClick={() => {
                  setActiveMainModule('inventory');
                  setMobileMenuOpen(false);
                }}
                className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                  sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
                } ${
                  activeMainModule === 'inventory'
                    ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
                }`}
                title="Inventario, Recetas y Etiquetas"
              >
                <Boxes
                  className="h-4 w-4 shrink-0 transition-colors"
                  style={activeMainModule === 'inventory' ? { color: customization.primaryColor } : undefined}
                />
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">Inventario & Recetas</span>
                  </div>
                )}
              </button>
            )}

            {/* Clientes CRM Button */}
            {canAccessModule('clients') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('clients');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'clients'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Clientes CRM (DNI / Manual)"
            >
              <Users
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'clients' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Clientes</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                    {visibleCustomersCount}
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Catálogo & Modificadores */}
            {canAccessModule('products') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('products');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'products'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Productos & Catálogo"
            >
              <Pizza
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'products' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Productos</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    Menú
                  </span>
                </div>
              )}
            </button>
            )}

            {/* MÓDULO RECURSOS HUMANOS */}
            {canAccessModule('hr') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('hr');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'hr'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Recursos Humanos & Biométrico (Alt+3)"
            >
              <UserCheck
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'hr' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Recursos Humanos</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {todayRecords.length} hoy
                    </span>
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Finanzas & Caja Button */}
            {canAccessModule('finance') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('finance');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'finance'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Finanzas, Egresos y Cierre de Caja"
            >
              <Wallet
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'finance' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Finanzas</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    Caja
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Facturación Electrónica SUNAT Button */}
            {canAccessModule('billing') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('billing');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'billing'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Facturación Electrónica SUNAT"
            >
              <FileCheck2
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'billing' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Facturación</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    SUNAT
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Galería de Medios & Fotos Button */}
            {canAccessModule('media') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('media');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'media'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Galería de Medios & Fotos"
            >
              <FileImage
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'media' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Galería de Medios</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    Fotos
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Páginas Personalizadas & Landing Pages Button */}
            {canAccessModule('pages') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('pages');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'pages'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Páginas Personalizadas & URLs Cortas"
            >
              <Layers
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'pages' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Páginas</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    /p/
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Marketing & Web Push Button */}
            {canAccessModule('marketing') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('marketing');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'marketing'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Marketing, Web Push & Campañas"
            >
              <Megaphone
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'marketing' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Marketing</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    Push
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Bandeja Omnicanal de Mensajes Button */}
            {canAccessModule('inbox') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('inbox');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'inbox'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Bandeja Omnicanal (WhatsApp, Messenger, Instagram)"
            >
              <Inbox
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'inbox' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Bandeja</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold">
                    Chat
                  </span>
                </div>
              )}
            </button>
            )}

            {/* WhatsApp Cloud API & Chatbot Button */}
            {canAccessModule('whatsapp') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('whatsapp');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'whatsapp'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="WhatsApp Cloud API & Chatbot"
            >
              <MessageSquare
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'whatsapp' ? { color: '#25D366' } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">WhatsApp</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    Bot
                  </span>
                </div>
              )}
            </button>
            )}

            {canAccessModule('settings') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('settings');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'settings'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Configuración (Alt+2)"
            >
              <Settings
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'settings' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Configuración</span>
                  <div className="flex items-center gap-1.5">
                    {isDirty && (
                      <span
                        className="h-1.5 w-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: customization.primaryColor }}
                        title="Cambios pendientes de punto de control"
                      />
                    )}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      12
                    </span>
                  </div>
                </div>
              )}
            </button>
            )}
          </div>
          )}

          {(['pos', 'kiosk', 'kitchen', 'delivery', 'benefits'] as MainModuleId[]).some(canAccessModule) && (
          <div className="space-y-0.5">
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                Operaciones & Ventas
              </span>
            )}

            {/* POS Button */}
            {canAccessModule('pos') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('pos');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'pos'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Punto de Venta POS & Mesas"
            >
              <Receipt
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'pos' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">POS & Mesas</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                    Caja
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Kiosco Autoservicio 9:16 (Culqi) Button */}
            {canAccessModule('kiosk') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('kiosk');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'kiosk'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Kiosco Vertical de Autoservicio (9:16 • Culqi)"
            >
              <Smartphone
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'kiosk' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Kiosco 9:16</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                    Culqi
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Cocina KDS Button */}
            {canAccessModule('kitchen') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('kitchen');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'kitchen'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Cocina KDS"
            >
              <Flame
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'kitchen' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Cocina KDS</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">
                    {(() => {
                      const activeKitchenCount = orders.filter(
                        (o) =>
                          o.status === 'recibido' ||
                          o.status === 'en_cocina' ||
                          o.status === 'en_horno'
                      ).length;
                      return activeKitchenCount > 0 ? `${activeKitchenCount} en cola 🔥` : 'Horno 🔥';
                    })()}
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Delivery & Motorizados Button */}
            {canAccessModule('delivery') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('delivery');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'delivery'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Central de Delivery & Motorizados"
            >
              <Bike
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'delivery' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Delivery & Ruta</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold">
                    {orders.filter((o) => o.status === 'listo' || o.status === 'en_ruta').length}
                  </span>
                </div>
              )}
            </button>
            )}

            {/* Beneficios, Cupones & Puntos Button */}
            {canAccessModule('benefits') && (
            <button
              type="button"
              onClick={() => {
                setActiveMainModule('benefits');
                setMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
              } ${
                activeMainModule === 'benefits'
                  ? 'saas-card !rounded-lg text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5 font-medium'
              }`}
              title="Beneficios, Cupones & Tarjetas de Puntos"
            >
              <Gift
                className="h-4 w-4 shrink-0 transition-colors"
                style={activeMainModule === 'benefits' ? { color: customization.primaryColor } : undefined}
              />
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Beneficios</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                    Puntos
                  </span>
                </div>
              )}
            </button>
            )}
          </div>
          )}

          {onNavigateToStore && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToStore}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition-colors ${
                  sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : ''
                }`}
                title="Abrir Tienda Virtual (Web)"
              >
                <Globe2 className="h-4 w-4 shrink-0" />
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <span className="truncate">Ver Tienda Virtual</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bottom SaaS Control Dock */}
        <div className="p-2.5 space-y-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
          {(!sidebarCollapsed || mobileMenuOpen) ? (
            <>
              {/* EDITABLE USER PROFILE CARD (CARD ELEVADA CON BOTÓN DE EDICIÓN Y ACCESO A BOLETAS) */}
              <div className="saas-card !rounded-2xl p-2.5 space-y-2.5 border border-zinc-200/90 dark:border-zinc-700/80 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="h-9 w-9 rounded-xl object-cover ring-1 ring-zinc-300 dark:ring-zinc-700 block"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white truncate block leading-tight">
                        {currentUser.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block leading-tight mt-0.5">
                        DNI: {currentUser.pin} · {currentUser.roleName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditProfileModalOpen(true)}
                      title="Editar mis datos personales"
                      aria-label="Editar perfil de usuario"
                      className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={logoutSession}
                      title="Bloquear turno / Cambiar operador"
                      aria-label="Cerrar o bloquear turno"
                      className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Direct quick-access button to view my internal voucher */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPersonalVoucherOpen(true);
                    if (mobileMenuOpen) setMobileMenuOpen(false);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl saas-subcard text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Receipt className="h-3 w-3" style={{ color: customization.primaryColor }} />
                    <span>Mi Boleta & Pagos</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    S/ {getEmployeeProfile(currentUser).baseSalarySoles.toLocaleString()}
                  </span>
                </button>
              </div>

              {/* Role simulator & Theme toggle dock */}
              <div className="saas-card !rounded-xl p-2 space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: customization.primaryColor }} />
                    <select
                      aria-label="Simular rol RBAC"
                      value={currentUser.roleId}
                      onChange={e => {
                        const target = roles.find(r => r.id === e.target.value);
                        if (target) {
                          setCurrentUser({
                            ...currentUser,
                            roleId: target.id,
                            roleName: target.name,
                          });
                        }
                      }}
                      className="w-full text-[11px] font-semibold bg-transparent text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer truncate"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/90 p-0.5 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCustomization({ themePreference: 'light' })}
                      className={`p-1 rounded-md transition-colors ${
                        customization.themePreference === 'light'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                      title="Modo claro"
                    >
                      <Sun className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCustomization({ themePreference: 'dark' })}
                      className={`p-1 rounded-md transition-colors ${
                        customization.themePreference === 'dark'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                      title="Modo oscuro"
                    >
                      <Moon className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCustomization({ themePreference: 'system' })}
                      className={`p-1 rounded-md transition-colors ${
                        customization.themePreference === 'system'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                      title="Automático (Sistema)"
                    >
                      <Laptop className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2.5 py-1">
              <button
                type="button"
                onClick={() => {
                  const next = isDarkResolved ? 'light' : 'dark';
                  updateCustomization({ themePreference: next });
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                title="Cambiar tema"
              >
                {isDarkResolved ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={logoutSession}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Bloquear turno / Login numérico"
                aria-label="Bloquear turno"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-zinc-300 dark:ring-zinc-700 block"
                title={`${currentUser.name} • ${currentUser.roleName}`}
              />
            </div>
          )}
        </div>
      </aside>

      {/* 2. HEADERLESS PC INSET WORKSPACE CANVAS */}
      <div className="flex-1 flex flex-col min-w-0 h-full lg:pr-2">
        {/* MOBILE-ONLY APP TOP BAR (HIDDEN ON PC / DESKTOP!) */}
        <header className="lg:hidden sticky top-0 z-30 erp-mobile-safe-top erp-canvas-surface/95 backdrop-blur-md border-b border-zinc-200/90 dark:border-zinc-800 shrink-0">
          <div className="flex items-center justify-between h-14 px-3.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="min-h-[40px] min-w-[40px] px-2 -ml-1 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all flex items-center gap-1.5"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5 shrink-0" />
                {activeMainModule === 'pos' && (
                  <span className="text-xs font-bold whitespace-nowrap">Menú</span>
                )}
              </button>
              <div className="min-w-0">
                <span className="font-bold text-[15px] text-zinc-900 dark:text-white truncate block leading-tight">
                  {MODULE_MOBILE_LABELS[activeMainModule]}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate block leading-tight">
                  {customization.appName}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isSuperAdminOrManager) {
                  setMobileMenuOpen(true);
                  setTenantMenuOpen(true);
                }
              }}
              className="min-h-[34px] text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 truncate max-w-[155px] flex items-center gap-1 active:scale-95 transition-transform"
            >
              {branchScope === 'consolidated' ? (
                <Globe2 className="h-3 w-3 shrink-0" style={{ color: customization.primaryColor }} />
              ) : (
                <Store className="h-3 w-3 shrink-0" style={{ color: customization.primaryColor }} />
              )}
              <span className="truncate">{activeBranchLabel}</span>
            </button>
          </div>
        </header>

        {/* ELEVATED SAAS MAIN SURFACE (1600PX WORKSPACE) */}
        <main
          className={`flex-1 w-full min-w-0 erp-canvas-surface lg:rounded-2xl lg:border lg:border-zinc-200/90 dark:lg:border-zinc-800 lg:shadow-sm ${
            activeMainModule === 'inbox' ? 'overflow-hidden' : 'saas-scroll'
          }`}
        >
          <div
            className={
              activeMainModule === 'inbox'
                ? 'w-full h-full p-0 lg:p-3'
                : `max-w-[1600px] mx-auto w-full px-3 pt-4 sm:px-5 sm:pt-5 lg:px-5 lg:py-5 xl:px-8 xl:py-7 ${
                    activeMainModule !== 'pos'
                      ? 'pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:pb-5'
                      : 'pb-24 lg:pb-5'
                  }`
            }
          >
            <Suspense fallback={<ModuleWorkspaceSkeleton />}>
              {!canAccessModule(activeMainModule) ? (
                <div className="max-w-md mx-auto my-16 saas-card p-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Sin acceso a este módulo
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Tu rol actual (<strong>{currentUser.roleName}</strong>) no tiene permisos asignados para esta vista. Solicita acceso a un administrador en la Matriz RBAC.
                  </p>
                </div>
              ) : activeMainModule === 'dashboard' ? (
                <DashboardView onNavigateToSettings={() => setActiveMainModule('settings')} />
              ) : activeMainModule === 'hr' ? (
                <HRModuleView />
              ) : activeMainModule === 'pos' ? (
                <POSView />
              ) : activeMainModule === 'kiosk' ? (
                <KioskSelfServiceView
                  embeddedInAdmin={true}
                  onOpenStandaloneKiosk={onNavigateToKiosk}
                />
              ) : activeMainModule === 'kitchen' ? (
                <KitchenKDSView />
              ) : activeMainModule === 'delivery' ? (
                <DeliveryView />
              ) : activeMainModule === 'orders' ? (
                <OrdersManagementView />
              ) : activeMainModule === 'clients' ? (
                <ClientsCRMView />
              ) : activeMainModule === 'benefits' ? (
                <BenefitsModuleView />
              ) : activeMainModule === 'marketing' ? (
                <MarketingModuleView />
              ) : activeMainModule === 'inbox' ? (
                <OmnichannelInboxView
                  onOpenWhatsAppBot={() => setActiveMainModule('whatsapp')}
                />
              ) : activeMainModule === 'whatsapp' ? (
                <WhatsAppModuleView
                  onOpenInbox={() => setActiveMainModule('inbox')}
                />
              ) : activeMainModule === 'products' ? (
                <ProductCatalogView />
              ) : activeMainModule === 'media' ? (
                <MediaGalleryView />
              ) : activeMainModule === 'pages' ? (
                <PagesModuleView />
              ) : activeMainModule === 'inventory' ? (
                <InventoryModuleView />
              ) : activeMainModule === 'finance' ? (
                <FinanceModuleView />
              ) : activeMainModule === 'billing' ? (
                <BillingModuleView />
              ) : (
                <SettingsView />
              )}
            </Suspense>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM APP TAB BAR (1-thumb navigation across ERP modules, hidden in POS so POS cart bar owns bottom edge) */}
      {activeMainModule !== 'pos' && !isEditProfileModalOpen && (() => {
        const pendingOrdersBadge = orders.filter(
          o =>
            (branchScope === 'consolidated' || !o.tenantId || o.tenantId === activeTenant.id) &&
            o.status !== 'entregado' &&
            o.status !== 'cancelado'
        ).length;
        const canDashboard = canAccessModule('dashboard');
        const canPos = canAccessModule('pos');
        const canOrders = canAccessModule('orders');
        const canKitchen = canAccessModule('kitchen');
        const canDelivery = canAccessModule('delivery');
        const canInbox = canAccessModule('inbox');

        const navItems: {
          id: MainModuleId | 'more';
          label: string;
          icon: React.ComponentType<{ className?: string }>;
          badge?: number;
        }[] = [
          ...(canDashboard ? [{ id: 'dashboard' as MainModuleId, label: 'Inicio', icon: LayoutDashboard }] : []),
          ...(canPos ? [{ id: 'pos' as MainModuleId, label: 'POS', icon: Pizza }] : []),
          ...(canOrders
            ? [{
                id: 'orders' as MainModuleId,
                label: 'Pedidos',
                icon: ClipboardList,
                badge: pendingOrdersBadge > 0 ? pendingOrdersBadge : undefined,
              }]
            : []),
          ...(canKitchen
            ? [{ id: 'kitchen' as MainModuleId, label: 'Cocina', icon: Flame }]
            : canDelivery
            ? [{ id: 'delivery' as MainModuleId, label: 'Ruta', icon: Bike }]
            : canInbox
            ? [{ id: 'inbox' as MainModuleId, label: 'Bandeja', icon: Inbox }]
            : []),
          { id: 'more', label: 'Más', icon: Menu },
        ];

        if (activeMainModule === 'inbox') {
          return null;
        }

        return (
          <nav
            aria-label="Navegación rápida móvil"
            className="lg:hidden fixed bottom-0 inset-x-0 z-30 erp-mobile-safe-bottom bg-erp-card/95 backdrop-blur-xl border-t border-erp-border shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.45)]"
          >
            <div className="grid grid-flow-col auto-cols-fr items-center px-2 pt-1.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = item.id !== 'more' && activeMainModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'more') {
                        setMobileMenuOpen(true);
                      } else {
                        setActiveMainModule(item.id);
                      }
                    }}
                    className={`relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] transition-all active:scale-95 ${
                      isActive
                        ? 'font-bold text-zinc-950 dark:text-white'
                        : 'font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className={`relative flex items-center justify-center w-9 h-6 rounded-full transition-colors ${
                        isActive ? 'bg-zinc-900/10 dark:bg-white/15' : ''
                      }`}
                      style={isActive ? { color: customization.primaryColor } : undefined}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {typeof item.badge === 'number' && (
                        <span
                          className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full text-white text-[9px] font-black flex items-center justify-center tabular-nums shadow-xs"
                          style={{ backgroundColor: customization.primaryColor }}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </span>
                    <span className="truncate max-w-[64px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        );
      })()}

      {/* FLOATING SAAS CHECKPOINT BAR (Fully Responsive for Mobile, Tablet & Desktop) */}
      {isDirty && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-auto max-w-xl flex items-center justify-between sm:justify-start gap-2 sm:gap-3 px-3.5 py-2 sm:pl-4 sm:pr-2 sm:py-2 rounded-2xl sm:rounded-full bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 shadow-2xl ring-1 ring-white/10 dark:ring-zinc-900/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            activeMainModule !== 'pos'
              ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-5'
              : 'bottom-3 sm:bottom-5'
          }`}
        >
          <span className="flex items-center gap-2 text-xs font-medium truncate min-w-0">
            <span
              className="h-2 w-2 rounded-full animate-pulse shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            />
            <span className="hidden sm:inline whitespace-nowrap">Cambios aplicados (Auto-guardados en sesión)</span>
            <span className="sm:hidden font-bold truncate">Cambios pendientes</span>
          </span>

          <div className="flex items-center gap-1.5 sm:pl-2 sm:border-l sm:border-zinc-700 dark:sm:border-zinc-300 ml-auto sm:ml-0 shrink-0">
            <button
              type="button"
              onClick={discardUnsavedChanges}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-300 dark:text-zinc-600 hover:text-white dark:hover:text-zinc-950 rounded-full transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              Revertir
            </button>
            <button
              type="button"
              onClick={saveAllSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded-full shadow-sm transition-transform active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Guardando...' : 'Confirmar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Global Accessible Native Overlays */}
      <ToastContainer />
      <UnsavedChangesModal />
      <SystemNoticeModal />
      <SeasonalOverlay surface="erp" />

      {/* MODAL NATIVO <dialog> PARA EDITAR PERFIL DESDE LA CARD DEL SIDEBAR */}
      <dialog
        ref={editProfileDialogRef}
        aria-labelledby="edit-profile-title"
        onClose={() => setIsEditProfileModalOpen(false)}
        className="max-w-md"
      >
        {isEditProfileModalOpen && (
          <form
            onSubmit={e => {
              e.preventDefault();
              updateUser(currentUser);
              setIsEditProfileModalOpen(false);
            }}
            className="saas-card !rounded-3xl p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-700"
          >
            <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 id="edit-profile-title" className="text-base font-bold text-zinc-950 dark:text-white">
                Editar Mis Datos de Perfil
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Información de contacto, foto y datos laborales vinculados a tu DNI ({currentUser.pin}).
              </p>
            </div>

            {/* Selector de Foto de Perfil del Usuario */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-500/40 shadow-sm shrink-0"
              />
              <div className="space-y-1.5 flex-1 min-w-0">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Foto de Perfil
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsProfileMediaPickerOpen(true)}
                    className="px-2.5 py-1 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-zinc-950 text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    <span>Galería</span>
                  </button>

                  <label className="px-2.5 py-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const comp = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
                          updateUser({ ...currentUser, avatarUrl: comp.dataUrl });
                          dispatchToast('Foto Actualizada', 'Tu foto de perfil se actualizó correctamente.', 'success');
                        } catch {
                          // ignore
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (!navigator.clipboard?.read) return;
                        const items = await navigator.clipboard.read();
                        for (const it of items) {
                          const type = it.types.find(t => t.startsWith('image/'));
                          if (type) {
                            const blob = await it.getType(type);
                            const file = new File([blob], `avatar-${Date.now()}.png`, { type });
                            const comp = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
                            updateUser({ ...currentUser, avatarUrl: comp.dataUrl });
                            dispatchToast('Foto Actualizada', 'Foto pegada desde el portapapeles.', 'success');
                            return;
                          }
                        }
                      } catch {
                        dispatchToast('Portapapeles', 'Copia una imagen para pegarla.', 'info');
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <ClipboardIcon className="w-3.5 h-3.5" />
                    <span>Pegar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={currentUser.name}
                  onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-sm saas-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    DNI / Documento
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.pin}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold saas-input opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Rol en Tienda
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.roleName}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold saas-input opacity-70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Teléfono Móvil
                </label>
                <input
                  type="tel"
                  value={currentUser.phone}
                  onChange={e => setCurrentUser({ ...currentUser, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-sm saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={currentUser.email}
                  onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-sm saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Fecha de Cumpleaños
                </label>
                <input
                  type="date"
                  value={getEmployeeProfile(currentUser).birthday || '1994-04-18'}
                  onChange={e => updateEmployeeProfile(currentUser.id, { birthday: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono saas-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Modal for Personal Technical Sheet / Remuneration Voucher */}
      {isPersonalVoucherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Ficha Técnica & Boleta Oficial · {currentUser.name}
              </span>
              <button
                type="button"
                onClick={() => setIsPersonalVoucherOpen(false)}
                className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <Suspense fallback={<ModuleWorkspaceSkeleton compact />}>
                <PublicEmployeePortal
                  initialDni={currentUser.pin}
                  lockToCurrentUser={true}
                  onClose={() => setIsPersonalVoucherOpen(false)}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery Selector for User Profile */}
      <MediaGalleryModal
        isOpen={isProfileMediaPickerOpen}
        title="Foto de Perfil"
        subtitle="Selecciona una imagen para tu avatar de usuario"
        onClose={() => setIsProfileMediaPickerOpen(false)}
        onSelect={(url) => {
          updateUser({ ...currentUser, avatarUrl: url });
          setIsProfileMediaPickerOpen(false);
          dispatchToast('Foto Actualizada', 'Tu avatar ha sido actualizado.', 'success');
        }}
      />
    </div>
  );
};
