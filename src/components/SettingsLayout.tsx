import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useRBAC } from '../context/RBACContext';
import { TabId } from '../types/settings';
import { ToastContainer } from './common/ToastContainer';
import { UnsavedChangesModal } from './common/UnsavedChangesModal';

// Tabs
import { IdentityTab } from './tabs/IdentityTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { DialogsTab } from './tabs/DialogsTab';
import { LoginTab } from './tabs/LoginTab';
import { CompanyTab } from './tabs/CompanyTab';
import { UsersTab } from './tabs/UsersTab';
import { RolesTab } from './tabs/RolesTab';
import { TenantsTab } from './tabs/TenantsTab';
import { DriveTab } from './tabs/DriveTab';
import { ConnectionsTab } from './tabs/ConnectionsTab';
import { SystemUpdateTab } from './tabs/SystemUpdateTab';

import {
  Sparkles,
  Palette,
  Bell,
  LogIn,
  Building2,
  Users,
  ShieldCheck,
  Network,
  Cloud,
  Bot,
  Terminal,
  Save,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';

interface TabItem {
  id: TabId;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiredPermission?: string;
}

const TABS: TabItem[] = [
  { id: 'identity', label: 'Identidad y Marca', category: 'Personalización', icon: Sparkles, requiredPermission: 'settings:manage' },
  { id: 'appearance', label: 'Design System & Apariencia', category: 'Personalización', icon: Palette, requiredPermission: 'settings:manage' },
  { id: 'dialogs', label: 'Toasts, Modales & Audio', category: 'Experiencia', icon: Bell, requiredPermission: 'settings:manage' },
  { id: 'login', label: 'Pantalla de Inicio de Sesión', category: 'Experiencia', icon: LogIn, requiredPermission: 'settings:manage' },
  { id: 'company', label: 'Datos Fiscales & Cobros', category: 'Empresa', icon: Building2, requiredPermission: 'settings:manage' },
  { id: 'users', label: 'Gestión de Usuarios & PIN', category: 'Seguridad', icon: Users, badge: 'RBAC', requiredPermission: 'settings:users' },
  { id: 'roles', label: 'Matriz RBAC de Roles', category: 'Seguridad', icon: ShieldCheck, badge: 'Seguridad', requiredPermission: 'settings:roles' },
  { id: 'tenants', label: 'Sucursales y Locales', category: 'Empresa', icon: Network, badge: 'Sedes', requiredPermission: 'settings:manage' },
  { id: 'drive', label: 'Google Drive Cloud', category: 'Infraestructura', icon: Cloud, requiredPermission: 'settings:manage' },
  { id: 'connections', label: 'Google Gemini AI', category: 'Integraciones', icon: Bot, badge: 'IA Flash', requiredPermission: 'settings:manage' },
  { id: 'system-update', label: 'DevOps & Actualizaciones', category: 'Infraestructura', icon: Terminal, badge: 'v2.8.4', requiredPermission: 'settings:system_update' },
];

export const SettingsLayout: React.FC = () => {
  const {
    activeTab,
    tryChangeTab,
    isDirty,
    isSaving,
    saveAllSettings,
    customization,
    updateCustomization,
    activeTenant,
    tenants,
    switchTenant
  } = useSettings();

  const { currentUser, setCurrentUser, roles, hasPermission } = useRBAC();

  const [sidebarSearch, setSidebarSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredTabs = TABS.filter(t =>
    t.label.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    t.category.toLowerCase().includes(sidebarSearch.toLowerCase())
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
      case 'drive': return <DriveTab />;
      case 'connections': return <ConnectionsTab />;
      case 'system-update': return <SystemUpdateTab />;
      default: return <IdentityTab />;
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200"
      style={{ fontFamily: customization.fontFamily }}
    >
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              {customization.logoLight ? (
                <img
                  src={customization.logoLight}
                  alt="Logo"
                  className="h-8 w-8 rounded-lg object-cover shadow-xs"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: customization.primaryColor }}
                >
                  {customization.collapsedLogo || '🍕'}
                </div>
              )}
              <div>
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight block">
                  {customization.appName}
                </span>
                <span className="text-[10px] text-slate-400 -mt-1 block font-medium">
                  Módulo de Configuración & Administración
                </span>
              </div>
            </div>

            {/* Sede Switcher Quick Select */}
            <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3 text-brand-500" /> Sede:
              </span>
              <select
                value={activeTenant.id}
                onChange={e => switchTenant(e.target.value)}
                className="text-xs font-semibold py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right actions: Role Previewer, Theme Toggle, Dirty Indicator, Save Button */}
          <div className="flex items-center gap-3">
            {/* Quick RBAC Simulator Toggle */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Simular Rol:</span>
              <select
                value={currentUser.roleId}
                onChange={e => {
                  const targetRole = roles.find(r => r.id === e.target.value);
                  if (targetRole) {
                    setCurrentUser({
                      ...currentUser,
                      roleId: targetRole.id,
                      roleName: targetRole.name
                    });
                  }
                }}
                className="text-xs font-bold bg-transparent text-brand-600 dark:text-brand-400 focus:outline-none cursor-pointer"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = customization.themePreference === 'dark' ? 'light' : 'dark';
                updateCustomization({ themePreference: next });
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cambiar tema claro/oscuro"
            >
              {customization.themePreference === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>

            {/* Dirty Changes Badge */}
            {isDirty && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 rounded-full animate-pulse">
                Cambios pendientes
              </span>
            )}

            {/* Save Button */}
            <button
              type="button"
              onClick={saveAllSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isSaving ? 'Guardando...' : 'Guardar Todo'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Navigation */}
          <aside
            className={`lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4 ${
              mobileMenuOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Search Tabs */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar sección..."
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Tabs List */}
            <nav className="space-y-1">
              {filteredTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isPermitted = !tab.requiredPermission || hasPermission(tab.requiredPermission);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      tryChangeTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                    style={isActive ? { backgroundColor: customization.primaryColor } : {}}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{tab.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isPermitted && (
                        <span title="Permiso requerido">
                          <ShieldAlert className={`h-3 w-3 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                        </span>
                      )}
                      {tab.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Quick Context Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Versión ERP:</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">v2.8.4</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sesión activa:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{currentUser.name}</span>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-9 bg-transparent min-w-0">
            {renderActiveTabContent()}
          </main>
        </div>
      </div>

      {/* Global Elements */}
      <ToastContainer />
      <UnsavedChangesModal />
    </div>
  );
};
