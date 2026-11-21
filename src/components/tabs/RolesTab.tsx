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
  Eye,
  Eraser,
  Users,
  Layers,
  Globe,
  ShoppingBag,
  Settings,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

const ACTION_LABELS: Record<PermissionActionType, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Anular',
  special: 'Especial',
};

const APARTADOS: Array<{
  id: ErpModuleMeta['category'];
  label: string;
  shortDesc: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
}> = [
  {
    id: 'plataforma',
    label: 'Plataforma & Gestión',
    shortDesc: 'Dashboard, Pedidos, Almacén, Clientes, Productos, RRHH, Finanzas y SUNAT',
    icon: Layers,
  },
  {
    id: 'canales',
    label: 'Web, Medios & Canales',
    shortDesc: 'Galería, Páginas, Marketing, Bandeja Omnicanal y WhatsApp Bot',
    icon: Globe,
  },
  {
    id: 'operaciones',
    label: 'Operaciones & Ventas',
    shortDesc: 'POS & Mesas, Kiosco 9:16, Cocina KDS, Delivery y Beneficios',
    icon: ShoppingBag,
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    shortDesc: 'Marca, Design System, Usuarios, Matriz RBAC, Sedes y DevOps',
    icon: Settings,
  },
];

interface TactileSwitchProps {
  checked: boolean;
  disabled?: boolean;
  accentColor: string;
  onChange: () => void;
  ariaLabel: string;
}

const TactileSwitch: React.FC<TactileSwitchProps> = ({
  checked,
  disabled,
  accentColor,
  onChange,
  ariaLabel,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={e => {
      e.stopPropagation();
      onChange();
    }}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-erp-card ${
      disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]'
    } ${
      checked
        ? 'border-transparent'
        : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'
    }`}
    style={checked ? { backgroundColor: accentColor } : undefined}
  >
    <span
      className={`pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out ${
        checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
      }`}
    />
  </button>
);

export const RolesTab: React.FC = () => {
  const { roles, setRoles, permissions, modulesCatalog, canEditRole } = useRBAC();
  const { users, customization, dispatchToast, openNoticeModal, logAuditEvent } = useSettings();

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'role-admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Create Role Modal state
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleApartados, setNewRoleApartados] = useState<ErpModuleMeta['category'][]>([
    'operaciones',
  ]);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  const editPermissionCheck = canEditRole(selectedRole?.id || '');
  const isLockedRole =
    !editPermissionCheck.allowed || (selectedRole.isSystem && selectedRole.id === 'role-admin');

  const usersCountByRole = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of users) {
      map[u.roleId] = (map[u.roleId] || 0) + 1;
    }
    return map;
  }, [users]);

  const getApartadoPermissionCodes = (cat: ErpModuleMeta['category']): string[] => {
    const modKeys = new Set(modulesCatalog.filter(m => m.category === cat).map(m => m.key));
    return permissions.filter(p => modKeys.has(p.module)).map(p => p.code);
  };

  const isApartadoFull = (rolePerms: string[], cat: ErpModuleMeta['category']): boolean => {
    const codes = getApartadoPermissionCodes(cat);
    return codes.length > 0 && codes.every(c => rolePerms.includes(c));
  };

  const getApartadoPartialCount = (rolePerms: string[], cat: ErpModuleMeta['category']) => {
    const mods = modulesCatalog.filter(m => m.category === cat);
    let activeMods = 0;
    for (const m of mods) {
      const mCodes = permissions.filter(p => p.module === m.key).map(p => p.code);
      if (mCodes.some(c => rolePerms.includes(c))) activeMods++;
    }
    return { activeMods, totalMods: mods.length };
  };

  const guardEditable = (): boolean => {
    if (!editPermissionCheck.allowed) {
      dispatchToast(
        'Acción no permitida',
        editPermissionCheck.reason || 'Permiso denegado',
        'error'
      );
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

  const handleToggleApartado = (cat: ErpModuleMeta['category']) => {
    if (!guardEditable()) return;
    const codes = getApartadoPermissionCodes(cat);
    if (codes.length === 0) return;
    const activeFull = isApartadoFull(selectedRole.permissions, cat);
    if (activeFull) {
      updateRolePermissions(selectedRole.permissions.filter(c => !codes.includes(c)));
    } else {
      updateRolePermissions([...selectedRole.permissions, ...codes]);
    }
  };

  const handleToggleModule = (moduleKey: string) => {
    if (!guardEditable()) return;
    const codes = permissions.filter(p => p.module === moduleKey).map(p => p.code);
    const anyActive = codes.some(c => selectedRole.permissions.includes(c));
    if (anyActive) {
      updateRolePermissions(selectedRole.permissions.filter(c => !codes.includes(c)));
    } else {
      updateRolePermissions([...selectedRole.permissions, ...codes]);
    }
  };

  const handleToggleSingle = (code: string) => {
    if (!guardEditable()) return;
    const exists = selectedRole.permissions.includes(code);
    const next = exists
      ? selectedRole.permissions.filter(p => p !== code)
      : [...selectedRole.permissions, code];
    updateRolePermissions(next);
  };

  const applyQuickPreset = (preset: 'readonly' | 'clear') => {
    if (!guardEditable()) return;
    if (preset === 'readonly') {
      updateRolePermissions(permissions.filter(p => p.action === 'view').map(p => p.code));
      dispatchToast(
        'Solo Lectura Aplicado',
        `El rol "${selectedRole.name}" ahora tiene acceso de lectura en todos los módulos.`,
        'info'
      );
    } else {
      updateRolePermissions([]);
      dispatchToast(
        'Permisos Limpiados',
        `Se desactivaron todos los permisos de "${selectedRole.name}".`,
        'info'
      );
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

    const initialPermissions = Array.from(
      new Set(newRoleApartados.flatMap(cat => getApartadoPermissionCodes(cat)))
    );

    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: newRoleName.trim(),
      description:
        newRoleDesc.trim() ||
        (newRoleApartados.length > 0
          ? `Acceso a: ${newRoleApartados
              .map(id => APARTADOS.find(a => a.id === id)?.label)
              .filter(Boolean)
              .join(', ')}.`
          : 'Rol personalizado con permisos por módulo.'),
      isSystem: false,
      permissions: initialPermissions,
    };

    setRoles(prev => [...prev, newRole]);
    setSelectedRoleId(newRole.id);
    setIsCreatingRole(false);
    setNewRoleName('');
    setNewRoleDesc('');
    setNewRoleApartados(['operaciones']);
    logAuditEvent(
      'rbac',
      'critical',
      'Creación de Nuevo Rol RBAC',
      `Se creó el rol "${newRole.name}" con ${newRole.permissions.length} permisos iniciales.`
    );
    dispatchToast(
      'Rol Creado',
      `"${newRole.name}" está listo. Ya puedes asignarlo a usuarios en la pestaña Usuarios.`
    );
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) return;
    const assignedCount = usersCountByRole[role.id] || 0;
    openNoticeModal({
      title: '¿Eliminar este rol?',
      message:
        assignedCount > 0
          ? `El rol "${role.name}" está asignado actualmente a ${assignedCount} usuario(s). Si lo eliminas, deberás reasignarles otro rol.`
          : `Se eliminará el rol "${role.name}" de forma permanente. Esta acción no se puede deshacer.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Rol',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        setRoles(prev => prev.filter(r => r.id !== role.id));
        if (selectedRoleId === role.id) {
          setSelectedRoleId(roles[0]?.id || 'role-admin');
        }
        logAuditEvent(
          'rbac',
          'critical',
          'Eliminación de Rol RBAC',
          `Se eliminó el rol personalizado "${role.name}".`
        );
        dispatchToast('Rol Eliminado', `El perfil "${role.name}" fue removido.`, 'info');
      },
    });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const activeApartadosCount = APARTADOS.filter(ap =>
    isApartadoFull(selectedRole.permissions, ap.id)
  ).length;

  const activeModulesCount = useMemo(() => {
    return modulesCatalog.filter(mod => {
      const mCodes = permissions.filter(p => p.module === mod.key).map(p => p.code);
      return mCodes.some(c => selectedRole.permissions.includes(c));
    }).length;
  }, [modulesCatalog, permissions, selectedRole.permissions]);

  return (
    <PermissionGate permission="settings:roles">
      <div className="space-y-5">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-erp-text">
              <ShieldCheck
                className="h-5 w-5 shrink-0"
                style={{ color: customization.primaryColor }}
              />
              Roles y Permisos
            </h2>
            <p className="text-xs text-erp-muted mt-0.5">
              Activa apartados completos en 1 toque o personaliza módulos específicos. Los cambios aplican en tiempo real.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingRole(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-transform duration-150 ease-out hover:brightness-110 active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <Plus className="h-4 w-4" />
            Nuevo Rol
          </button>
        </div>

        {/* Master-Detail Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: Role List (Master) */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-erp-muted">
                Perfiles ({roles.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {roles.map(role => {
                const isSelected = role.id === selectedRole.id;
                const assignedUsers = usersCountByRole[role.id] || 0;
                const roleModCount = modulesCatalog.filter(mod =>
                  permissions
                    .filter(p => p.module === mod.key)
                    .some(p => role.permissions.includes(p.code))
                ).length;
                const pct =
                  modulesCatalog.length > 0
                    ? Math.round((roleModCount / modulesCatalog.length) * 100)
                    : 0;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRoleId(role.id);
                      setExpandedModules({});
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors duration-150 ease-out active:scale-[0.99] cursor-pointer ${
                      isSelected
                        ? 'bg-erp-card border-erp-border shadow-sm ring-1'
                        : 'bg-erp-card/60 border-transparent hover:bg-erp-card hover:border-erp-border/80'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: customization.primaryColor,
                            boxShadow: `0 0 0 1px ${customization.primaryColor}33`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-erp-text truncate">
                            {role.name}
                          </span>
                          {role.isSystem && role.id === 'role-admin' && (
                            <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-erp-muted">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {assignedUsers}
                          </span>
                          <span>·</span>
                          <span>
                            {roleModCount}/{modulesCatalog.length} mód.
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-erp-muted shrink-0">
                        {pct}%
                      </span>
                    </div>

                    <div className="w-full h-1 bg-erp-subcard rounded-full overflow-hidden mt-2.5">
                      <div
                        className="h-full rounded-full transition-[width] duration-200 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isSelected ? customization.primaryColor : '#71717a',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT: Focused Role Editor (Detail) */}
          <section className="lg:col-span-8 xl:col-span-9 space-y-5">
            {/* Selected Role Summary Card */}
            <div className="bg-erp-card border border-erp-border rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-erp-text">{selectedRole.name}</h3>
                    {selectedRole.isSystem ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-500/10 text-erp-muted border border-erp-border">
                        Rol del sistema
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Personalizado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-erp-muted mt-1 leading-relaxed">
                    {selectedRole.description}
                  </p>
                </div>

                {/* Role Actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {!isLockedRole && (
                    <>
                      <button
                        type="button"
                        onClick={() => applyQuickPreset('readonly')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-erp-subcard border border-erp-border text-erp-text hover:bg-erp-hover transition-colors duration-150 active:scale-[0.97] whitespace-nowrap cursor-pointer"
                        title="Solo permiso de lectura en todo el sistema"
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-500" />
                        Solo Lectura
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickPreset('clear')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-erp-subcard border border-erp-border text-erp-muted hover:text-rose-500 hover:border-rose-500/30 transition-colors duration-150 active:scale-[0.97] whitespace-nowrap cursor-pointer"
                        title="Quitar todos los permisos"
                      >
                        <Eraser className="h-3.5 w-3.5" />
                        Vaciar
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCloneRole(selectedRole)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-erp-subcard border border-erp-border text-erp-text hover:bg-erp-hover transition-colors duration-150 active:scale-[0.97] whitespace-nowrap cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicar
                  </button>
                  {!selectedRole.isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(selectedRole)}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg bg-erp-subcard border border-erp-border text-erp-muted hover:text-rose-500 hover:border-rose-500/30 transition-colors duration-150 active:scale-[0.97] cursor-pointer"
                      title="Eliminar rol"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Compact Stats Strip */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-3 border-t border-erp-border text-xs text-erp-muted">
                <span>
                  <strong className="text-erp-text font-semibold">{activeApartadosCount}/4</strong>{' '}
                  apartados completos
                </span>
                <span>
                  <strong className="text-erp-text font-semibold">
                    {activeModulesCount}/{modulesCatalog.length}
                  </strong>{' '}
                  módulos activos
                </span>
                <span>
                  <strong className="text-erp-text font-semibold">
                    {usersCountByRole[selectedRole.id] || 0}
                  </strong>{' '}
                  usuario(s) asignados
                </span>
              </div>

              {isLockedRole && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>
                    {!editPermissionCheck.allowed
                      ? editPermissionCheck.reason
                      : 'Super Administrador tiene acceso total garantizado. Usa "Duplicar" si deseas crear un rol con menos permisos.'}
                  </span>
                </div>
              )}
            </div>

            {/* STEP 1: Apartados Completos */}
            <div className="bg-erp-card border border-erp-border rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-erp-text">
                  1. Acceso rápido por Apartados
                </h4>
                <p className="text-xs text-erp-muted mt-0.5">
                  Activa un apartado para conceder acceso completo a todos sus módulos sin configurarlos uno por uno.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {APARTADOS.map(ap => {
                  const Icon = ap.icon;
                  const full = isApartadoFull(selectedRole.permissions, ap.id);
                  const { activeMods, totalMods } = getApartadoPartialCount(
                    selectedRole.permissions,
                    ap.id
                  );

                  return (
                    <div
                      key={ap.id}
                      onClick={() => !isLockedRole && handleToggleApartado(ap.id)}
                      className={`p-3.5 rounded-xl border transition-colors duration-150 ease-out flex items-start justify-between gap-3 ${
                        isLockedRole ? 'cursor-default' : 'cursor-pointer hover:border-erp-text/20'
                      } ${
                        full
                          ? 'bg-erp-subcard/80 border-erp-border shadow-xs'
                          : 'bg-erp-subcard/30 border-erp-border/70'
                      }`}
                      style={
                        full
                          ? {
                              borderColor: `${customization.primaryColor}66`,
                              backgroundColor: `${customization.primaryColor}0D`,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={
                            full
                              ? {
                                  backgroundColor: `${customization.primaryColor}20`,
                                  color: customization.primaryColor,
                                }
                              : undefined
                          }
                        >
                          <Icon className={`h-4 w-4 ${full ? '' : 'text-erp-muted'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-erp-text">{ap.label}</span>
                          </div>
                          <p className="text-[11px] text-erp-muted mt-0.5 leading-snug line-clamp-2">
                            {ap.shortDesc}
                          </p>
                          <span
                            className={`inline-block text-[10px] font-semibold mt-1.5 ${
                              full
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : activeMods > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-erp-muted'
                            }`}
                          >
                            {full
                              ? `Completo (${totalMods} módulos)`
                              : activeMods > 0
                              ? `Personalizado (${activeMods}/${totalMods} módulos)`
                              : `Sin acceso (0/${totalMods})`}
                          </span>
                        </div>
                      </div>

                      <div className="pt-0.5">
                        <TactileSwitch
                          checked={full}
                          disabled={isLockedRole}
                          accentColor={customization.primaryColor}
                          onChange={() => handleToggleApartado(ap.id)}
                          ariaLabel={`Activar apartado ${ap.label}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: Ajuste fino por Módulo (solo para apartados que NO están completos) */}
            <div className="bg-erp-card border border-erp-border rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-erp-text">
                    2. Módulos por Apartado
                  </h4>
                  <p className="text-xs text-erp-muted mt-0.5">
                    Los apartados completos se gestionan arriba. Para el resto, activa módulos individuales o despliega sus acciones.
                  </p>
                </div>

                <div className="relative sm:w-56 shrink-0">
                  <Search className="h-3.5 w-3.5 text-erp-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar módulo..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-erp-subcard border border-erp-border text-xs text-erp-text placeholder:text-erp-muted focus:outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as string]: customization.primaryColor }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {APARTADOS.map(ap => {
                  const full = isApartadoFull(selectedRole.permissions, ap.id);
                  const apModules = modulesCatalog.filter(m => {
                    if (m.category !== ap.id) return false;
                    if (!normalizedQuery) return true;
                    const mPerms = permissions.filter(p => p.module === m.key);
                    return (
                      m.label.toLowerCase().includes(normalizedQuery) ||
                      m.shortDesc.toLowerCase().includes(normalizedQuery) ||
                      mPerms.some(
                        p =>
                          p.name.toLowerCase().includes(normalizedQuery) ||
                          p.description.toLowerCase().includes(normalizedQuery)
                      )
                    );
                  });

                  if (normalizedQuery && apModules.length === 0) return null;

                  return (
                    <div
                      key={ap.id}
                      className="rounded-xl border border-erp-border/80 overflow-hidden"
                    >
                      <div className="px-3.5 py-2.5 bg-erp-subcard/60 border-b border-erp-border/70 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-erp-text">
                          {ap.label}
                        </span>
                        {full && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Apartado completo activo
                          </span>
                        )}
                      </div>

                      {full ? (
                        <div className="px-3.5 py-3 bg-erp-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-xs text-erp-muted">
                            Todos los módulos de <strong className="text-erp-text">{ap.label}</strong> están habilitados automáticamente. No necesitas marcar permisos uno por uno.
                          </p>
                          {!isLockedRole && (
                            <button
                              type="button"
                              onClick={() => handleToggleApartado(ap.id)}
                              className="text-[11px] font-semibold text-erp-muted hover:text-erp-text underline underline-offset-2 shrink-0 cursor-pointer self-start sm:self-auto"
                            >
                              Desactivar apartado
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-erp-border/60 bg-erp-card">
                          {apModules.map(mod => {
                            const modPerms = permissions.filter(p => p.module === mod.key);
                            const activeCount = modPerms.filter(p =>
                              selectedRole.permissions.includes(p.code)
                            ).length;
                            const isEnabled = activeCount > 0;
                            const isPartial = isEnabled && activeCount < modPerms.length;
                            const isExpanded = !!expandedModules[mod.key];

                            return (
                              <div key={mod.key} className="transition-colors duration-150">
                                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-erp-hover/40">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-semibold text-erp-text">
                                        {mod.label}
                                      </span>
                                      {isPartial && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                                          {activeCount}/{modPerms.length}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-erp-muted truncate mt-0.5">
                                      {mod.shortDesc}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0">
                                    {modPerms.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedModules(prev => ({
                                            ...prev,
                                            [mod.key]: !prev[mod.key],
                                          }))
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-erp-muted hover:text-erp-text hover:bg-erp-subcard transition-colors duration-150 cursor-pointer"
                                        title="Ajustar permisos específicos"
                                      >
                                        <SlidersHorizontal className="h-3 w-3" />
                                        <span className="hidden sm:inline">Permisos</span>
                                        <ChevronDown
                                          className={`h-3 w-3 transition-transform duration-150 ease-out ${
                                            isExpanded ? 'rotate-180' : ''
                                          }`}
                                        />
                                      </button>
                                    )}

                                    <TactileSwitch
                                      checked={isEnabled}
                                      disabled={isLockedRole}
                                      accentColor={customization.primaryColor}
                                      onChange={() => handleToggleModule(mod.key)}
                                      ariaLabel={`Activar módulo ${mod.label}`}
                                    />
                                  </div>
                                </div>

                                {/* Expandable Granular Action Pills */}
                                {isExpanded && (
                                  <div className="px-3.5 pb-3 pt-1 bg-erp-subcard/35 border-t border-erp-border/40">
                                    <div className="flex flex-wrap gap-1.5">
                                      {modPerms.map(perm => {
                                        const active = selectedRole.permissions.includes(perm.code);
                                        return (
                                          <button
                                            key={perm.code}
                                            type="button"
                                            disabled={isLockedRole}
                                            onClick={() => handleToggleSingle(perm.code)}
                                            title={perm.description}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors duration-150 ease-out active:scale-[0.97] ${
                                              isLockedRole
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer'
                                            } ${
                                              active
                                                ? 'text-white border-transparent shadow-xs'
                                                : 'bg-erp-card border-erp-border text-erp-muted hover:text-erp-text'
                                            }`}
                                            style={
                                              active
                                                ? { backgroundColor: customization.primaryColor }
                                                : undefined
                                            }
                                          >
                                            {active && <Check className="h-3 w-3 shrink-0" />}
                                            <span>{perm.name}</span>
                                            <span
                                              className={`text-[9px] uppercase font-mono px-1 rounded ${
                                                active
                                                  ? 'bg-white/20 text-white'
                                                  : 'bg-erp-subcard text-erp-muted'
                                              }`}
                                            >
                                              {ACTION_LABELS[perm.action]}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Create New Role Modal */}
        {isCreatingRole && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-erp-card border border-erp-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-erp-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-erp-text">Crear Nuevo Rol</h3>
                  <p className="text-[11px] text-erp-muted mt-0.5">
                    Elige un nombre y los apartados iniciales. Luego podrás ajustar módulos si lo necesitas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingRole(false)}
                  className="p-1.5 rounded-lg text-erp-muted hover:text-erp-text hover:bg-erp-subcard transition-colors duration-150 cursor-pointer"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-erp-text">Nombre del Rol</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="Ej. Soporte WhatsApp, Supervisor de Turno..."
                    className="w-full px-3.5 py-2 rounded-xl bg-erp-subcard border border-erp-border text-sm text-erp-text placeholder:text-erp-muted focus:outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as string]: customization.primaryColor }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-erp-text">
                    Descripción breve <span className="text-erp-muted font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    placeholder="Ej. Atención de bandeja omnicanal y pedidos en vivo"
                    className="w-full px-3.5 py-2 rounded-xl bg-erp-subcard border border-erp-border text-xs text-erp-text placeholder:text-erp-muted focus:outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as string]: customization.primaryColor }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-erp-text">
                      Apartados con acceso completo
                    </label>
                    <span className="text-[11px] text-erp-muted">
                      {newRoleApartados.length} seleccionado(s)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {APARTADOS.map(ap => {
                      const Icon = ap.icon;
                      const active = newRoleApartados.includes(ap.id);
                      const modCount = modulesCatalog.filter(m => m.category === ap.id).length;

                      return (
                        <button
                          key={ap.id}
                          type="button"
                          onClick={() =>
                            setNewRoleApartados(prev =>
                              prev.includes(ap.id)
                                ? prev.filter(x => x !== ap.id)
                                : [...prev, ap.id]
                            )
                          }
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors duration-150 active:scale-[0.99] cursor-pointer ${
                            active
                              ? 'border-transparent'
                              : 'bg-erp-subcard/40 border-erp-border hover:bg-erp-subcard'
                          }`}
                          style={
                            active
                              ? {
                                  backgroundColor: `${customization.primaryColor}14`,
                                  borderColor: `${customization.primaryColor}66`,
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className="h-4 w-4 shrink-0"
                              style={active ? { color: customization.primaryColor } : undefined}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-erp-text">
                                {ap.label}{' '}
                                <span className="text-[10px] font-normal text-erp-muted">
                                  ({modCount} mód.)
                                </span>
                              </div>
                              <p className="text-[11px] text-erp-muted truncate">{ap.shortDesc}</p>
                            </div>
                          </div>

                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center border shrink-0 transition-colors duration-150 ${
                              active ? 'border-transparent text-white' : 'border-erp-border'
                            }`}
                            style={active ? { backgroundColor: customization.primaryColor } : undefined}
                          >
                            {active && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-erp-border">
                  <button
                    type="button"
                    onClick={() => setIsCreatingRole(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-erp-subcard border border-erp-border text-erp-text hover:bg-erp-hover transition-colors duration-150 active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-transform duration-150 ease-out hover:brightness-110 active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    Crear Rol
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
};
