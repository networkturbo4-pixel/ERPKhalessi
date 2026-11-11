import React, { useState, useMemo } from 'react';
import { useRBAC, ErpModuleMeta } from '../../context/RBACContext';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { PermissionActionType, Role } from '../../types/settings';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Lock,
  ShieldAlert,
  X,
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Eye,
  PlusCircle,
  Edit3,
  Eraser,
} from 'lucide-react';

const ACTION_COLUMNS: Array<{
  action: PermissionActionType;
  label: string;
  short: string;
}> = [
  { action: 'view', label: 'Ver / Acceso', short: 'Ver' },
  { action: 'create', label: 'Crear / Emitir', short: 'Crear' },
  { action: 'edit', label: 'Editar / Operar', short: 'Editar' },
  { action: 'delete', label: 'Eliminar / Anular', short: 'Anular' },
  { action: 'special', label: 'Autorizar / Especial', short: 'Especial' },
];

const CATEGORY_TABS: Array<{
  id: 'all' | ErpModuleMeta['category'];
  label: string;
}> = [
  { id: 'all', label: 'Todos los Módulos' },
  { id: 'operaciones', label: 'Operaciones Tienda' },
  { id: 'inventario', label: 'Recetas & Almacén' },
  { id: 'comercial', label: 'Comercial & Finanzas' },
  { id: 'administracion', label: 'Gobierno & Sistema' },
];

export const RolesTab: React.FC = () => {
  const { roles, setRoles, permissions, modulesCatalog, canEditRole } = useRBAC();
  const { customization, dispatchToast, openNoticeModal, logAuditEvent } = useSettings();

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'role-admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | ErpModuleMeta['category']>('all');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [cloneFromRoleId, setCloneFromRoleId] = useState<string>('role-cashier');

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  const editPermissionCheck = canEditRole(selectedRole?.id || '');
  const isLockedRole =
    !editPermissionCheck.allowed || (selectedRole.isSystem && selectedRole.id === 'role-admin');

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return modulesCatalog.filter(mod => {
      const catMatch = activeCategory === 'all' || mod.category === activeCategory;
      if (!catMatch) return false;
      if (!q) return true;
      const modPerms = permissions.filter(p => p.module === mod.key);
      return (
        mod.label.toLowerCase().includes(q) ||
        mod.shortDesc.toLowerCase().includes(q) ||
        modPerms.some(
          p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q)
        )
      );
    });
  }, [modulesCatalog, permissions, activeCategory, searchQuery]);

  const guardEditable = (): boolean => {
    if (!editPermissionCheck.allowed) {
      dispatchToast('Acción no permitida', editPermissionCheck.reason || 'Permiso denegado', 'error');
      return false;
    }
    if (selectedRole.isSystem && selectedRole.id === 'role-admin') {
      dispatchToast(
        'Rol Protegido',
        'El Super Administrador conserva siempre el 100% de privilegios. Duplícalo para crear una variante.',
        'warning'
      );
      return false;
    }
    return true;
  };

  const updateRolePermissions = (nextPerms: string[]) => {
    const unique = Array.from(new Set(nextPerms));
    setRoles(prev =>
      prev.map(r => (r.id === selectedRole.id ? { ...r, permissions: unique } : r))
    );
    logAuditEvent(
      'rbac',
      'warning',
      `Actualización Matriz RBAC (${selectedRole.name})`,
      `El rol "${selectedRole.name}" quedó configurado con ${unique.length} permisos activos.`
    );
  };

  const handleToggleSingle = (code: string) => {
    if (!guardEditable()) return;
    const exists = selectedRole.permissions.includes(code);
    const next = exists
      ? selectedRole.permissions.filter(p => p !== code)
      : [...selectedRole.permissions, code];
    updateRolePermissions(next);
  };

  const handleToggleModuleRow = (moduleKey: string) => {
    if (!guardEditable()) return;
    const codes = permissions.filter(p => p.module === moduleKey).map(p => p.code);
    const allActive = codes.every(c => selectedRole.permissions.includes(c));
    if (allActive) {
      updateRolePermissions(selectedRole.permissions.filter(c => !codes.includes(c)));
    } else {
      updateRolePermissions([...selectedRole.permissions, ...codes]);
    }
  };

  const handleToggleColumnAction = (action: PermissionActionType) => {
    if (!guardEditable()) return;
    const visibleModuleKeys = new Set(filteredModules.map(m => m.key));
    const columnCodes = permissions
      .filter(p => visibleModuleKeys.has(p.module) && p.action === action)
      .map(p => p.code);
    if (columnCodes.length === 0) return;

    const allChecked = columnCodes.every(c => selectedRole.permissions.includes(c));
    if (allChecked) {
      updateRolePermissions(selectedRole.permissions.filter(c => !columnCodes.includes(c)));
    } else {
      updateRolePermissions([...selectedRole.permissions, ...columnCodes]);
    }
  };

  const applyQuickPreset = (preset: 'readonly' | 'store_ops' | 'full' | 'clear') => {
    if (!guardEditable()) return;
    if (preset === 'readonly') {
      updateRolePermissions(permissions.filter(p => p.action === 'view').map(p => p.code));
      dispatchToast('Plantilla Aplicada', 'Se asignaron permisos de Solo Lectura en todos los módulos.', 'info');
    } else if (preset === 'store_ops') {
      const opsModules = new Set(['dashboard', 'pos', 'kds', 'delivery', 'tables', 'clients', 'workspace']);
      updateRolePermissions(
        permissions
          .filter(p => opsModules.has(p.module) && p.action !== 'delete')
          .map(p => p.code)
      );
      dispatchToast('Plantilla Aplicada', 'Perfil Operativo de Tienda configurado.', 'success');
    } else if (preset === 'full') {
      updateRolePermissions(permissions.map(p => p.code));
      dispatchToast('Acceso Completo', 'Todos los permisos fueron habilitados para este rol.', 'success');
    } else {
      updateRolePermissions([]);
      dispatchToast('Permisos Limpiados', 'Se desmarcaron todos los privilegios del rol.', 'info');
    }
  };

  const handleCloneRole = (sourceRole: Role) => {
    const cloned: Role = {
      id: `role-${Date.now()}`,
      name: `${sourceRole.name} (Copia)`,
      description: sourceRole.description,
      isSystem: false,
      permissions: [...sourceRole.permissions],
    };
    setRoles(prev => [...prev, cloned]);
    setSelectedRoleId(cloned.id);
    dispatchToast('Rol Duplicado', `Ahora puedes personalizar "${cloned.name}" libremente.`);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const templateRole = roles.find(r => r.id === cloneFromRoleId);
    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Perfil personalizado para operaciones multisucursal.',
      isSystem: false,
      permissions: templateRole ? [...templateRole.permissions] : ['dashboard:view'],
    };

    setRoles(prev => [...prev, newRole]);
    setSelectedRoleId(newRole.id);
    setIsCreatingRole(false);
    setNewRoleName('');
    setNewRoleDesc('');
    logAuditEvent(
      'rbac',
      'critical',
      'Creación de Nuevo Rol RBAC',
      `Se creó el rol "${newRole.name}" con ${newRole.permissions.length} permisos iniciales.`
    );
    dispatchToast('Rol Creado', `Se registró "${newRole.name}" en la matriz RBAC.`);
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) {
      dispatchToast('Rol Protegido', 'No se pueden eliminar roles base del sistema.', 'error');
      return;
    }
    openNoticeModal({
      title: `¿Eliminar el rol "${role.name}"?`,
      message:
        'Los usuarios que tengan este rol deberán ser reasignados a otro perfil activo para operar en sucursal.',
      tone: 'danger',
      confirmLabel: 'Eliminar Rol',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        setRoles(prev => prev.filter(r => r.id !== role.id));
        setSelectedRoleId(roles[0].id);
        logAuditEvent(
          'rbac',
          'critical',
          'Eliminación de Rol RBAC',
          `Se eliminó el rol personalizado "${role.name}" de la matriz corporativa.`
        );
        dispatchToast('Rol Eliminado', 'El perfil fue retirado de la matriz RBAC.', 'info');
      },
    });
  };

  const toggleExpandModule = (key: string) => {
    setExpandedModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Matriz RBAC Escalable por Módulos y Acciones
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Gestiona {modulesCatalog.length} módulos del ERP y {permissions.length} permisos granulares con marcado por fila, columna y plantillas rápidas.
          </p>
        </div>

        <PermissionGate permission="settings:roles" hideInsteadOfBanner>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCloneRole(selectedRole)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicar Rol Actual
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingRole(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 whitespace-nowrap"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Plus className="h-4 w-4" />
              Nuevo Rol
            </button>
          </div>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:roles">
        {/* 1. Horizontal Compact Role Cards Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {roles.map(role => {
            const isSelected = selectedRole.id === role.id;
            const coveragePct = Math.round((role.permissions.length / permissions.length) * 100);

            return (
              <div
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`p-4 rounded-2xl cursor-pointer flex flex-col justify-between gap-3 transition-all ${
                  isSelected
                    ? 'saas-option-active'
                    : 'saas-card hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                        {role.name}
                      </span>
                      {role.isSystem && (
                        <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1">
                      {role.description}
                    </p>
                  </div>

                  {!role.isSystem && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteRole(role);
                      }}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
                      title="Eliminar rol"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold" style={{ color: customization.primaryColor }}>
                      {role.permissions.length} / {permissions.length} permisos
                    </span>
                    <span className="font-mono text-zinc-500 dark:text-zinc-400">{coveragePct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${coveragePct}%`,
                        backgroundColor: customization.primaryColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Matrix Control Bar (Search + Category Filter + 1-Click Presets) */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                Editando: {selectedRole.name}
              </h3>
              {selectedRole.isSystem && selectedRole.id === 'role-admin' && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold">
                  <Lock className="h-3 w-3" /> Rol Maestro Protegido (Duplica para editar)
                </span>
              )}
              {!editPermissionCheck.allowed && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/15 px-3 py-1 rounded-lg border border-amber-500/30">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  {editPermissionCheck.reason}
                </span>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mr-1">
                Plantillas rápidas:
              </span>
              <button
                type="button"
                disabled={isLockedRole}
                onClick={() => applyQuickPreset('readonly')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold saas-btn-secondary disabled:opacity-40"
              >
                <Eye className="h-3 w-3" /> Solo Lectura
              </button>
              <button
                type="button"
                disabled={isLockedRole}
                onClick={() => applyQuickPreset('store_ops')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold saas-btn-secondary disabled:opacity-40"
              >
                <Sparkles className="h-3 w-3 text-amber-500" /> Operativo Tienda
              </button>
              <button
                type="button"
                disabled={isLockedRole}
                onClick={() => applyQuickPreset('full')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold saas-btn-secondary disabled:opacity-40"
              >
                <Check className="h-3 w-3 text-emerald-500" /> Marcar Todo
              </button>
              <button
                type="button"
                disabled={isLockedRole}
                onClick={() => applyQuickPreset('clear')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 disabled:opacity-40 whitespace-nowrap"
              >
                <Eraser className="h-3 w-3" /> Vaciar
              </button>
            </div>
          </div>

          {/* Search + Category Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORY_TABS.map(cat => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      active ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filtrar módulo o permiso (ej. KDS, SUNAT)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl saas-input"
              />
            </div>
          </div>

          {/* 3. High-Density Tabular RBAC Matrix */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-100/90 dark:bg-[#202026] text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700/80">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider min-w-[240px]">
                    Módulo del ERP ({filteredModules.length})
                  </th>
                  {ACTION_COLUMNS.map(col => (
                    <th key={col.action} className="py-3 px-2.5 text-center min-w-[92px]">
                      <button
                        type="button"
                        disabled={isLockedRole}
                        onClick={() => handleToggleColumnAction(col.action)}
                        className="inline-flex flex-col items-center gap-0.5 mx-auto group disabled:cursor-not-allowed"
                        title={`Marcar o desmarcar columna "${col.label}" en los módulos visibles`}
                      >
                        <span className="font-bold uppercase tracking-wider group-hover:text-brand-500 transition-colors">
                          {col.short}
                        </span>
                        <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">
                          Columna
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right font-bold uppercase tracking-wider whitespace-nowrap">
                    Fila Completa
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                {filteredModules.map(mod => {
                  const modPerms = permissions.filter(p => p.module === mod.key);
                  const activeCount = modPerms.filter(p =>
                    selectedRole.permissions.includes(p.code)
                  ).length;
                  const allRowActive =
                    modPerms.length > 0 && activeCount === modPerms.length;
                  const isExpanded = Boolean(expandedModules[mod.key]);

                  return (
                    <React.Fragment key={mod.key}>
                      <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                        {/* Module Name + Expand Button */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => toggleExpandModule(mod.key)}
                              className="mt-0.5 p-1 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 shrink-0"
                              title="Ver detalle granular de permisos"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleExpandModule(mod.key)}
                                className="font-bold text-zinc-900 dark:text-white hover:underline text-left"
                              >
                                {mod.label}
                              </button>
                              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                                {mod.shortDesc}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 5 Action Cells */}
                        {ACTION_COLUMNS.map(col => {
                          const matching = modPerms.filter(p => p.action === col.action);
                          if (matching.length === 0) {
                            return (
                              <td key={col.action} className="py-3 px-2.5 text-center">
                                <span className="text-zinc-300 dark:text-zinc-700 select-none">—</span>
                              </td>
                            );
                          }

                          // Usually 1 permission per action cell
                          const perm = matching[0];
                          const checked = selectedRole.permissions.includes(perm.code);

                          return (
                            <td key={col.action} className="py-3 px-2.5 text-center">
                              <button
                                type="button"
                                disabled={isLockedRole}
                                onClick={() => handleToggleSingle(perm.code)}
                                title={`${perm.name}: ${perm.description}`}
                                className={`h-7 w-7 rounded-lg inline-flex items-center justify-center border transition-all disabled:opacity-50 ${
                                  checked
                                    ? 'text-white border-transparent shadow-sm'
                                    : 'bg-zinc-100 dark:bg-[#22232a] border-zinc-300 dark:border-zinc-700 text-transparent hover:border-zinc-400 dark:hover:border-zinc-500'
                                }`}
                                style={
                                  checked
                                    ? { backgroundColor: customization.primaryColor }
                                    : undefined
                                }
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </td>
                          );
                        })}

                        {/* Row Summary & Toggle All */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2.5">
                            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                              {activeCount}/{modPerms.length}
                            </span>
                            <button
                              type="button"
                              disabled={isLockedRole}
                              onClick={() => handleToggleModuleRow(mod.key)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                                allRowActive
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'saas-btn-secondary'
                              }`}
                            >
                              {allRowActive ? 'Completo' : 'Marcar fila'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Granular Drawer */}
                      {isExpanded && (
                        <tr className="bg-zinc-50/90 dark:bg-[#14151a]">
                          <td colSpan={7} className="px-6 py-3.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {modPerms.map(perm => {
                                const isChecked = selectedRole.permissions.includes(perm.code);
                                return (
                                  <label
                                    key={perm.code}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer ${
                                      isChecked ? 'saas-option-active' : 'saas-option'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isLockedRole}
                                      onChange={() => handleToggleSingle(perm.code)}
                                      className="mt-0.5 h-4 w-4 rounded"
                                    />
                                    <div className="min-w-0">
                                      <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                                        {perm.name}
                                      </span>
                                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block">
                                        {perm.description}
                                      </span>
                                      <code className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                                        {perm.code}
                                      </code>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Crear Nuevo Rol (Single-line buttons!) */}
        {isCreatingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-[#18181c] rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  Crear Nuevo Perfil RBAC
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingRole(false)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                    Nombre del Rol
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="Ej. Supervisor de Delivery / Auditor de Almacén"
                    className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                    Copiar Permisos Base Desde
                  </label>
                  <select
                    value={cloneFromRoleId}
                    onChange={e => setCloneFromRoleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.permissions.length} permisos)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                    Descripción Operativa
                  </label>
                  <textarea
                    rows={2}
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    placeholder="Responsabilidades principales en las sucursales..."
                    className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreatingRole(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm whitespace-nowrap shrink-0"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Crear y Configurar Rol
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PermissionGate>
    </div>
  );
};
