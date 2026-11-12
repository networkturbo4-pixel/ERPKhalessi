import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { PermissionGate } from '../common/PermissionGate';
import { User } from '../../types/settings';
import {
  Users,
  Search,
  Plus,
  KeyRound,
  Shield,
  CheckCircle,
  Ban,
  Edit2,
  Trash2,
  X,
  Lock,
  Store,
  FileImage,
  Upload,
  Clipboard,
} from 'lucide-react';
import { MediaGalleryModal } from '../media/MediaGalleryModal';
import { compressImageFile } from '../../utils/imageCompressor';

export const UsersTab: React.FC = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    customization,
    tenants,
    activeTenant,
    branchScope,
    openNoticeModal,
    dispatchToast,
  } = useSettings();
  const { roles } = useRBAC();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [onlyCurrentBranch, setOnlyCurrentBranch] = useState<boolean>(true);

  const [mediaPickerConfig, setMediaPickerConfig] = useState<{
    isOpen: boolean;
    title: string;
    onSelect: (url: string) => void;
  }>({
    isOpen: false,
    title: 'Foto de Perfil',
    onSelect: () => {},
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    roleId: roles[1]?.id || roles[0]?.id || 'role-manager',
    status: 'active' as const,
    pin: '',
    documentType: 'DNI (8d)' as User['documentType'],
    branchId: activeTenant.id,
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm) ||
      u.pin.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesRole = roleFilter === 'all' || u.roleId === roleFilter;

    const matchesBranch =
      branchScope === 'consolidated' ||
      !onlyCurrentBranch ||
      !u.branchIds ||
      u.branchIds.includes('all') ||
      u.branchIds.includes(activeTenant.id);

    return matchesSearch && matchesStatus && matchesRole && matchesBranch;
  });

  const validatePinOrNotify = (pin: string, currentUserId?: string): boolean => {
    const clean = pin.replace(/\D/g, '');
    if ((clean.length !== 8 && clean.length !== 6 && clean.length !== 4) || /\D/.test(clean)) {
      openNoticeModal({
        title: 'Formato de Credencial Inválido',
        message:
          'El código de inicio de sesión debe tener exactamente 8 dígitos (DNI / Carnet de Extranjería estándar), o bien 6 o 4 dígitos numéricos.',
        tone: 'warning',
        confirmLabel: 'Corregir Código',
        hideCancel: true,
      });
      return false;
    }

    const duplicate = users.find(u => u.pin === clean && u.id !== currentUserId);
    if (duplicate) {
      openNoticeModal({
        title: 'Credencial ya registrada',
        message: `Ese número (${clean.length} dígitos) ya pertenece a ${duplicate.name}. Cada colaborador requiere un documento o PIN único para el Login numérico.`,
        tone: 'warning',
        confirmLabel: 'Cambiar Número',
        hideCancel: true,
      });
      return false;
    }
    return true;
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    if (!validatePinOrNotify(formData.pin)) return;

    const cleanPin = formData.pin.replace(/\D/g, '');
    const roleObj = roles.find(r => r.id === formData.roleId);
    addUser({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      avatarUrl: formData.avatarUrl,
      roleId: formData.roleId,
      roleName: roleObj ? roleObj.name : 'Colaborador',
      status: formData.status,
      pin: cleanPin,
      documentType:
        cleanPin.length === 8
          ? formData.documentType === 'CE (8d)'
            ? 'CE (8d)'
            : 'DNI (8d)'
          : cleanPin.length === 6
          ? 'Código (6d)'
          : 'PIN (4d)',
      branchIds: formData.branchId === 'all' ? ['all'] : [formData.branchId],
    });
    setIsCreateOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      roleId: roles[1]?.id || roles[0]?.id || 'role-manager',
      status: 'active',
      pin: '',
      documentType: 'DNI (8d)',
      branchId: activeTenant.id,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!validatePinOrNotify(editingUser.pin, editingUser.id)) return;

    const cleanPin = editingUser.pin.replace(/\D/g, '');
    const roleObj = roles.find(r => r.id === editingUser.roleId);
    updateUser({
      ...editingUser,
      pin: cleanPin,
      roleName: roleObj ? roleObj.name : editingUser.roleName,
    });
    setEditingUser(null);
  };

  const handleToggleStatus = (u: User) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    updateUser({ ...u, status: nextStatus });
  };

  const handleConfirmPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (newPassword.length < 6) {
      openNoticeModal({
        title: 'Contraseña demasiado corta',
        message: 'Por política de seguridad corporativa, la contraseña temporal debe tener al menos 6 caracteres.',
        tone: 'warning',
        confirmLabel: 'Entendido',
        hideCancel: true,
      });
      return;
    }

    const targetName = resettingUser.name;
    const targetMail = resettingUser.email;
    setResettingUser(null);
    setNewPassword('');

    dispatchToast(
      'Credencial Actualizada',
      `Se actualizó la clave de ${targetName} y se notificó a ${targetMail}.`,
      'success'
    );
  };

  const formatUserBranches = (u: User) => {
    if (!u.branchIds || u.branchIds.includes('all')) return 'Todas las Sedes';
    return u.branchIds
      .map(id => tenants.find(t => t.id === id)?.name.replace('Khalessi Pizza - ', '') || 'Sede')
      .join(', ');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Personal, Roles y PIN POS por Sucursal
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {branchScope === 'consolidated'
              ? `Mostrando planilla corporativa consolidada (${users.length} colaboradores).`
              : `Contexto activo: ${activeTenant.name.replace('Khalessi Pizza - ', '')}.`}
          </p>
        </div>

        <PermissionGate permission="settings:users" hideInsteadOfBanner>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 whitespace-nowrap shrink-0"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <Plus className="h-4 w-4" />
            Nuevo Colaborador
          </button>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:users">
        {/* Search & Multi-Branch Filters Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 saas-card p-4">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o celular..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl saas-input"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {branchScope === 'branch' && (
              <button
                type="button"
                onClick={() => setOnlyCurrentBranch(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                  onlyCurrentBranch ? 'saas-option-active' : 'saas-option'
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                {onlyCurrentBranch
                  ? `Solo ${activeTenant.name.replace('Khalessi Pizza - ', '')}`
                  : 'Ver toda la empresa'}
              </button>
            )}

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 text-xs rounded-xl saas-input font-medium"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
            </select>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl saas-input font-medium"
            >
              <option value="all">Todos los Roles</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="saas-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-[#202026] text-zinc-600 dark:text-zinc-300 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-700/80">
                <tr>
                  <th className="px-4 py-3.5">Colaborador</th>
                  <th className="px-4 py-3.5">Sucursal Asignada</th>
                  <th className="px-4 py-3.5">Rol RBAC</th>
                  <th className="px-4 py-3.5">DNI / Código Login</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                      No hay colaboradores asignados con estos filtros en esta sucursal.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                          />
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-white block">
                              {user.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-200 font-medium">
                          <Store className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          {formatUserBranches(user)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold saas-subcard text-zinc-800 dark:text-zinc-200">
                          <Shield className="h-3 w-3" style={{ color: customization.primaryColor }} />
                          {user.roleName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono saas-subcard px-2.5 py-1 rounded-lg text-[11px] font-bold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5">
                          <span className="text-[10px] font-sans font-semibold text-zinc-500 dark:text-zinc-400">
                            {user.documentType || `${user.pin.length}d`}
                          </span>
                          <span>
                            {'•'.repeat(Math.max(2, user.pin.length - 3))}
                            {user.pin.slice(-3)}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30 px-2.5 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 ring-1 ring-inset ring-rose-500/30 px-2.5 py-0.5 rounded-full">
                            <Ban className="h-3 w-3" /> Suspendido
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setResettingUser(user)}
                            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Restablecer Contraseña"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title={user.status === 'active' ? 'Suspender acceso' : 'Reactivar acceso'}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300 hover:text-brand-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Editar colaborador"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(user.id)}
                            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Revocar acceso"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Crear Colaborador */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-[#18181c] rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  Registrar Nuevo Colaborador
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCreate} className="space-y-3.5">
                {/* Selector de Foto de Perfil */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <img
                    src={formData.avatarUrl}
                    alt="Avatar preview"
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-zinc-300 dark:ring-zinc-700 shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase block">
                      Foto de Perfil
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setMediaPickerConfig({
                            isOpen: true,
                            title: 'Foto de Perfil del Colaborador',
                            onSelect: (url) => setFormData((prev) => ({ ...prev, avatarUrl: url })),
                          })
                        }
                        className="px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-zinc-950 text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                      >
                        <FileImage className="w-3 h-3" />
                        <span>Galería</span>
                      </button>

                      <label className="px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs">
                        <Upload className="w-3 h-3" />
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
                              setFormData((prev) => ({ ...prev, avatarUrl: comp.dataUrl }));
                              dispatchToast('Foto Lista', 'Se adjuntó la foto del usuario.', 'success');
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
                              const type = it.types.find((t) => t.startsWith('image/'));
                              if (type) {
                                const blob = await it.getType(type);
                                const file = new File([blob], `avatar-${Date.now()}.png`, { type });
                                const comp = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
                                setFormData((prev) => ({ ...prev, avatarUrl: comp.dataUrl }));
                                dispatchToast('Foto Pegada', 'Foto pegada desde el portapapeles.', 'success');
                                return;
                              }
                            }
                          } catch {
                            dispatchToast('Portapapeles', 'Copia una imagen para pegarla.', 'info');
                          }
                        }}
                        className="px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 whitespace-nowrap shadow-xs"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>Pegar</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Rodrigo Quispe"
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Correo Corporativo
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="rodrigo@khalessipizza.com"
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Celular / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+51 987 654 321"
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Sucursal Asignada
                    </label>
                    <select
                      value={formData.branchId}
                      onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    >
                      <option value="all">Todas las Sucursales (Corporativo)</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name.replace('Khalessi Pizza - ', '')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Rol RBAC
                    </label>
                    <select
                      value={formData.roleId}
                      onChange={e => setFormData({ ...formData, roleId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase">
                        DNI / C.E. o Código Numérico de Login (8, 6 o 4 dígitos)
                      </label>
                      <span className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400">
                        {formData.pin.length} dígitos
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '8 dígitos (DNI / C.E.)', sample: '8' },
                        { label: '6 dígitos (Supervisor)', sample: '6' },
                        { label: '4 dígitos (PIN Rápido)', sample: '4' },
                      ].map(opt => {
                        const isTargetLen =
                          (opt.sample === '8' && (formData.pin.length === 8 || formData.pin.length === 0)) ||
                          (opt.sample === '6' && formData.pin.length === 6) ||
                          (opt.sample === '4' && formData.pin.length === 4);
                        return (
                          <span
                            key={opt.sample}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold text-center ${
                              isTargetLen ? 'saas-option-active' : 'saas-subcard text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            {opt.label}
                          </span>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={8}
                      required
                      value={formData.pin}
                      onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                      placeholder="Ej. 74829105 (DNI 8 dígitos), 559012 (6d) o 4580 (4d)"
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm whitespace-nowrap shrink-0"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    Guardar Colaborador
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Colaborador */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-[#18181c] rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  Editar Colaborador
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3.5">
                {/* Selector de Foto de Perfil */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <img
                    src={editingUser.avatarUrl}
                    alt="Avatar preview"
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-zinc-300 dark:ring-zinc-700 shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase block">
                      Foto de Perfil
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setMediaPickerConfig({
                            isOpen: true,
                            title: 'Foto de Perfil del Colaborador',
                            onSelect: (url) => setEditingUser((prev) => (prev ? { ...prev, avatarUrl: url } : null)),
                          })
                        }
                        className="px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-zinc-950 text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                      >
                        <FileImage className="w-3 h-3" />
                        <span>Galería</span>
                      </button>

                      <label className="px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs">
                        <Upload className="w-3 h-3" />
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
                              setEditingUser((prev) => (prev ? { ...prev, avatarUrl: comp.dataUrl } : null));
                              dispatchToast('Foto Lista', 'Se actualizó la foto.', 'success');
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
                              const type = it.types.find((t) => t.startsWith('image/'));
                              if (type) {
                                const blob = await it.getType(type);
                                const file = new File([blob], `avatar-${Date.now()}.png`, { type });
                                const comp = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
                                setEditingUser((prev) => (prev ? { ...prev, avatarUrl: comp.dataUrl } : null));
                                dispatchToast('Foto Pegada', 'Foto pegada desde el portapapeles.', 'success');
                                return;
                              }
                            }
                          } catch {
                            dispatchToast('Portapapeles', 'Copia una imagen para pegarla.', 'info');
                          }
                        }}
                        className="px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 whitespace-nowrap shadow-xs"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>Pegar</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={editingUser.name}
                      onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={editingUser.email}
                      onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Sucursal Asignada
                    </label>
                    <select
                      value={editingUser.branchIds?.[0] || 'all'}
                      onChange={e =>
                        setEditingUser({
                          ...editingUser,
                          branchIds: e.target.value === 'all' ? ['all'] : [e.target.value],
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    >
                      <option value="all">Todas las Sucursales</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name.replace('Khalessi Pizza - ', '')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      Rol RBAC
                    </label>
                    <select
                      value={editingUser.roleId}
                      onChange={e => setEditingUser({ ...editingUser, roleId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                      DNI / C.E. / PIN (8, 6 o 4 dígitos)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={8}
                      value={editingUser.pin}
                      onChange={e =>
                        setEditingUser({ ...editingUser, pin: e.target.value.replace(/\D/g, '') })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg saas-input font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm whitespace-nowrap shrink-0"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Restablecer Contraseña */}
        {resettingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-[#18181c] rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500" />
                  Restablecer Credencial
                </h3>
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Define una contraseña provisoria para <strong>{resettingUser.name}</strong> ({resettingUser.email}).
              </p>

              <form onSubmit={handleConfirmPasswordReset} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                    Nueva Contraseña Temporal
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 text-xs rounded-lg saas-input"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-sm whitespace-nowrap shrink-0"
                  >
                    Confirmar Cambio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Media Gallery Modal for Avatars */}
        <MediaGalleryModal
          isOpen={mediaPickerConfig.isOpen}
          title={mediaPickerConfig.title}
          onClose={() => setMediaPickerConfig((prev) => ({ ...prev, isOpen: false }))}
          onSelect={(url) => {
            mediaPickerConfig.onSelect(url);
            setMediaPickerConfig((prev) => ({ ...prev, isOpen: false }));
          }}
        />
      </PermissionGate>
    </div>
  );
};
