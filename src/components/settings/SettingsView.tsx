import React, { useState, Suspense, lazy } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { TabId } from '../../types/settings';
import { ModuleWorkspaceSkeleton } from '../common/AppSurfaceSkeleton';

// Lazy-loaded Settings Tabs (splits heavy Company, Tenants, Users & RBAC tabs)
const IdentityTab = lazy(() =>
  import('../tabs/IdentityTab').then(m => ({ default: m.IdentityTab }))
);
const AppearanceTab = lazy(() =>
  import('../tabs/AppearanceTab').then(m => ({ default: m.AppearanceTab }))
);
const DialogsTab = lazy(() =>
  import('../tabs/DialogsTab').then(m => ({ default: m.DialogsTab }))
);
const LoginTab = lazy(() =>
  import('../tabs/LoginTab').then(m => ({ default: m.LoginTab }))
);
const CompanyTab = lazy(() =>
  import('../tabs/CompanyTab').then(m => ({ default: m.CompanyTab }))
);
const UsersTab = lazy(() =>
  import('../tabs/UsersTab').then(m => ({ default: m.UsersTab }))
);
const RolesTab = lazy(() =>
  import('../tabs/RolesTab').then(m => ({ default: m.RolesTab }))
);
const TenantsTab = lazy(() =>
  import('../tabs/TenantsTab').then(m => ({ default: m.TenantsTab }))
);
const AuditHealthTab = lazy(() =>
  import('../tabs/AuditHealthTab').then(m => ({ default: m.AuditHealthTab }))
);
const DriveTab = lazy(() =>
  import('../tabs/DriveTab').then(m => ({ default: m.DriveTab }))
);
const ConnectionsTab = lazy(() =>
  import('../tabs/ConnectionsTab').then(m => ({ default: m.ConnectionsTab }))
);
const SystemUpdateTab = lazy(() =>
  import('../tabs/SystemUpdateTab').then(m => ({ default: m.SystemUpdateTab }))
);

import {
  Sparkles,
  Palette,
  Bell,
  LogIn,
  Building2,
  Users,
  ShieldCheck,
  Network,
  Activity,
  Cloud,
  Bot,
  Terminal,
  Search,
  Lock
} from 'lucide-react';

export interface TabItem {
  id: TabId;
  label: string;
  category: 'Marca y Diseño' | 'Experiencia' | 'Empresa, Sedes y RBAC' | 'Cloud y DevOps';
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  requiredPermission?: string;
}

export const SETTINGS_TABS: TabItem[] = [
  { id: 'identity', label: 'Identidad y Marca', category: 'Marca y Diseño', icon: Sparkles, requiredPermission: 'settings:manage' },
  { id: 'appearance', label: 'Design System', category: 'Marca y Diseño', icon: Palette, requiredPermission: 'settings:manage' },
  { id: 'dialogs', label: 'Toasts 3D y Modales', category: 'Experiencia', icon: Bell, requiredPermission: 'settings:manage' },
  { id: 'login', label: 'Pantalla de Login', category: 'Experiencia', icon: LogIn, requiredPermission: 'settings:manage' },
  { id: 'company', label: 'Datos Fiscales y QR', category: 'Empresa, Sedes y RBAC', icon: Building2, requiredPermission: 'settings:manage' },
  { id: 'users', label: 'Usuarios y PIN POS', category: 'Empresa, Sedes y RBAC', icon: Users, requiredPermission: 'settings:users' },
  { id: 'roles', label: 'Matriz RBAC', category: 'Empresa, Sedes y RBAC', icon: ShieldCheck, badge: '13 Mód', requiredPermission: 'settings:roles' },
  { id: 'tenants', label: 'Sucursales y Locales', category: 'Empresa, Sedes y RBAC', icon: Network, requiredPermission: 'settings:manage' },
  { id: 'audit', label: 'Auditoría y Salud', category: 'Empresa, Sedes y RBAC', icon: Activity, badge: 'Live', requiredPermission: 'settings:view' },
  { id: 'drive', label: 'Google Drive Cloud', category: 'Cloud y DevOps', icon: Cloud, requiredPermission: 'settings:manage' },
  { id: 'connections', label: 'Google Gemini AI', category: 'Cloud y DevOps', icon: Bot, badge: 'IA', requiredPermission: 'settings:manage' },
  { id: 'system-update', label: 'Servidor y DevOps', category: 'Cloud y DevOps', icon: Terminal, badge: 'v2.8', requiredPermission: 'settings:system_update' },
];

const CATEGORIES: TabItem['category'][] = [
  'Marca y Diseño',
  'Experiencia',
  'Empresa, Sedes y RBAC',
  'Cloud y DevOps',
];

export const SettingsView: React.FC = () => {
  const { activeTab, tryChangeTab, customization } = useSettings();
  const { hasPermission } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTabs = SETTINGS_TABS.filter(t =>
    t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'identity': return <IdentityTab />;
      case 'appearance': return <AppearanceTab />;
      case 'dialogs': return <DialogsTab />;
      case 'login': return <LoginTab />;
      case 'company': return <CompanyTab />;
      case 'users': return <UsersTab />;
      case 'roles': return <RolesTab />;
      case 'tenants': return <TenantsTab />;
      case 'audit': return <AuditHealthTab />;
      case 'drive': return <DriveTab />;
      case 'connections': return <ConnectionsTab />;
      case 'system-update': return <SystemUpdateTab />;
      default: return <IdentityTab />;
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-10 items-start animate-in fade-in duration-200">
      {/* Modern SaaS Settings Rail (Clean, Grouped, No Heavy Boxes) */}
      <aside className="w-full lg:w-56 xl:w-60 shrink-0 lg:sticky lg:top-0 space-y-5">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
            Configuración
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ajustes globales del ecosistema ERP
          </p>
        </div>

        {/* Clean Filter Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar ajuste..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg saas-input"
          />
        </div>

        {/* Mobile Horizontal Pill Scroller */}
        <div className="flex lg:hidden gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {filteredTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => tryChangeTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Desktop Categorized SaaS Nav */}
        <nav className="hidden lg:block space-y-5">
          {CATEGORIES.map(category => {
            const groupTabs = filteredTabs.filter(t => t.category === category);
            if (groupTabs.length === 0) return null;

            return (
              <div key={category} className="space-y-0.5">
                <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                  {category}
                </span>

                {groupTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const isPermitted = !tab.requiredPermission || hasPermission(tab.requiredPermission);

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => tryChangeTab(tab.id)}
                      className={`relative w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors ${
                        isActive
                          ? 'bg-zinc-100 dark:bg-[#1e1e24] text-zinc-950 dark:text-white font-semibold ring-1 ring-zinc-200/80 dark:ring-zinc-700/80'
                          : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 font-medium'
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                          style={{ backgroundColor: customization.primaryColor }}
                        />
                      )}

                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isActive ? '' : 'text-zinc-400 dark:text-zinc-400'}`}
                          style={isActive ? { color: customization.primaryColor } : undefined}
                        />
                        <span className="truncate">{tab.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isPermitted && (
                          <span title="Restringido por rol RBAC">
                            <Lock className="h-3 w-3 text-amber-500" />
                          </span>
                        )}
                        {tab.badge && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {tab.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Active Tab Content Area */}
      <div className="flex-1 w-full min-w-0">
        <Suspense fallback={<ModuleWorkspaceSkeleton compact />}>
          {renderActiveTabContent()}
        </Suspense>
      </div>
    </div>
  );
};
