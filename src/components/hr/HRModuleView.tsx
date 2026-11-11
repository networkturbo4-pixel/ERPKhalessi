import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { useHR, SHIFT_META, getLocalTodayIso } from '../../context/HRContext';
import { PermissionGate } from '../common/PermissionGate';
import { User } from '../../types/settings';
import {
  HRSubTabId,
  HRPosition,
  ContractType,
  ShiftType,
  PayrollMovementType,
  AttendanceEventType,
  EmployeeHRProfile,
} from '../../types/hr';
import {
  buildOtpAuthUri,
  formatBase32Secret,
  generateCurrentTotp,
  getTotpRemainingSeconds,
  verifyTotpCode,
} from '../../utils/totp';
import { PublicEmployeePortal } from './PublicEmployeePortal';
import { ApplicantsTabView } from './ApplicantsTabView';
import {
  Users,
  Fingerprint,
  CalendarDays,
  Wallet,
  Briefcase,
  ShieldCheck,
  Store,
  Globe2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  KeyRound,
  Copy,
  RefreshCw,
  Edit3,
  Trash2,
  Sparkles,
  RotateCcw,
  UserPlus,
  BadgeCheck,
  QrCode,
  ArrowRightLeft,
  Receipt,
  Eye,
  ExternalLink,
} from 'lucide-react';

const HR_TABS: Array<{
  id: HRSubTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'legajos', label: 'Legajos & Sanidad', icon: Users },
  { id: 'asistencia', label: 'Reloj Biométrico & Asistencia', icon: Fingerprint },
  { id: 'horarios', label: 'Horarios & Rotación Sedes', icon: CalendarDays },
  { id: 'preplanilla', label: 'Adelantos & Pre-Planilla', icon: Wallet },
  { id: 'postulantes', label: 'Postulantes', icon: Briefcase },
  { id: 'seguridad_totp', label: 'Acceso & Google Authenticator', icon: KeyRound },
  { id: 'portal_publico', label: 'Mi Boleta & Autoservicio', icon: Receipt },
];

const WEEK_DAYS = [
  { idx: 0, short: 'Lun', full: 'Lunes' },
  { idx: 1, short: 'Mar', full: 'Martes' },
  { idx: 2, short: 'Mié', full: 'Miércoles' },
  { idx: 3, short: 'Jue', full: 'Jueves' },
  { idx: 4, short: 'Vie', full: 'Viernes' },
  { idx: 5, short: 'Sáb', full: 'Sábado' },
  { idx: 6, short: 'Dom', full: 'Domingo' },
];

const POSITIONS_LIST: HRPosition[] = [
  'Dirección General',
  'Gerente de Local',
  'Maestro Pizzero',
  'Hornero & Masa',
  'Cajero POS',
  'Atención Salón',
  'Motorizado Propio',
];

const CONTRACTS_LIST: ContractType[] = [
  'Planilla MYPE / General',
  'Part-Time (Medio Tiempo)',
  'Por Turno / Jornal',
  'Locación / Apoyo',
];

function computeHealthCardSemaphore(expiryIso: string): {
  status: 'healthy' | 'expiring' | 'expired';
  daysLeft: number;
  label: string;
  badgeClass: string;
} {
  const today = new Date(`${getLocalTodayIso()}T00:00:00`);
  const exp = new Date(`${expiryIso}T00:00:00`);
  const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      daysLeft: diffDays,
      label: `Vencido (${Math.abs(diffDays)}d)`,
      badgeClass:
        'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    };
  }
  if (diffDays <= 30) {
    return {
      status: 'expiring',
      daysLeft: diffDays,
      label: `Por vencer (${diffDays}d)`,
      badgeClass:
        'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    };
  }
  return {
    status: 'healthy',
    daysLeft: diffDays,
    label: `Vigente (${diffDays}d)`,
    badgeClass:
      'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
  };
}

export const HRModuleView: React.FC = () => {
  const {
    customization,
    tenants,
    activeTenant,
    branchScope,
    switchTenant,
    users,
    addUser,
    dispatchToast,
    openNoticeModal,
  } = useSettings();

  const { roles, hasPermission, currentUser } = useRBAC();

  const isSuperAdmin = currentUser.roleId === 'role-admin';
  const canManageHR = hasPermission('hr:schedules') || hasPermission('hr:payroll') || isSuperAdmin;
  const canViewAttendance = hasPermission('hr:attendance') || hasPermission('hr:view') || isSuperAdmin;

  // Strict RBAC filtering: operational roles (Hornero, Maestro Pizzero, Cajero) only see their own voucher / autoservicio!
  const availableTabs = useMemo(() => {
    return HR_TABS.filter(tab => {
      if (!canManageHR && !canViewAttendance) {
        return tab.id === 'portal_publico';
      }
      if (tab.id === 'portal_publico') return true;
      if (tab.id === 'seguridad_totp') return hasPermission('hr:totp_security') || isSuperAdmin;
      if (tab.id === 'preplanilla') return hasPermission('hr:payroll') || isSuperAdmin;
      if (tab.id === 'postulantes') return canManageHR;
      if (tab.id === 'horarios') return hasPermission('hr:schedules') || isSuperAdmin;
      if (tab.id === 'asistencia') return canViewAttendance;
      if (tab.id === 'legajos') return canManageHR;
      return true;
    });
  }, [canManageHR, canViewAttendance, hasPermission, isSuperAdmin]);

  const [activeSubTab, setActiveSubTab] = useState<HRSubTabId>(() => {
    if (!canManageHR && !canViewAttendance) return 'portal_publico';
    return 'legajos';
  });

  useEffect(() => {
    if (!availableTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(availableTabs[0]?.id || 'portal_publico');
    }
  }, [availableTabs, activeSubTab]);
  const {
    getEmployeeProfile,
    updateEmployeeProfile,
    regenerateEmployeeTotpSecret,
    todayRecords,
    hasActiveAttendanceToday,
    getTodayRecordForUser,
    clockAttendance,
    simulateBiometricPunchForUser,
    clearTodayAttendanceForUser,
    weeklyShifts,
    upsertShiftAssignment,
    payrollMovements,
    addPayrollMovement,
    deletePayrollMovement,
    securityPolicy,
    updateSecurityPolicy,
    regenerateMasterTotpSecret,
  } = useHR();

  const [searchQuery, setSearchQuery] = useState('');

  // Tab refs for accessible scrollIntoView & hidden="until-found" beforematch sync
  const tabButtonRefs = useRef<Record<HRSubTabId, HTMLButtonElement | null>>({
    legajos: null,
    asistencia: null,
    horarios: null,
    preplanilla: null,
    postulantes: null,
    seguridad_totp: null,
    portal_publico: null,
  });
  const panelRefs = useRef<Record<HRSubTabId, HTMLDivElement | null>>({
    legajos: null,
    asistencia: null,
    horarios: null,
    preplanilla: null,
    postulantes: null,
    seguridad_totp: null,
    portal_publico: null,
  });

  const baseTabId = useId();
  const legajosCaptionId = useId();
  const attendanceCaptionId = useId();
  const payrollCaptionId = useId();

  // Keep selected tab scrolled into view inside single-row scroller
  useEffect(() => {
    const btn = tabButtonRefs.current[activeSubTab];
    btn?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeSubTab]);

  // Wire hidden="until-found" + beforematch sync on inactive tabpanels (per modern-web-guidance tabs)
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    (Object.keys(panelRefs.current) as HRSubTabId[]).forEach(tabId => {
      const el = panelRefs.current[tabId];
      if (!el) return;
      if (tabId === activeSubTab) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', 'until-found');
      }
      const onBeforeMatch = () => setActiveSubTab(tabId);
      el.addEventListener('beforematch', onBeforeMatch);
      cleanups.push(() => el.removeEventListener('beforematch', onBeforeMatch));
    });
    return () => cleanups.forEach(fn => fn());
  }, [activeSubTab]);

  // Filter collaborators by activeTenant or consolidated scope
  const scopedUsers = useMemo(() => {
    return users.filter(u => {
      if (branchScope === 'consolidated') return true;
      if (!u.branchIds || u.branchIds.includes('all')) return true;
      return u.branchIds.includes(activeTenant.id);
    });
  }, [users, branchScope, activeTenant.id]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scopedUsers;
    return scopedUsers.filter(u => {
      const prof = getEmployeeProfile(u);
      return (
        u.name.toLowerCase().includes(q) ||
        u.pin.includes(q) ||
        u.roleName.toLowerCase().includes(q) ||
        prof.position.toLowerCase().includes(q) ||
        prof.healthCardNumber.toLowerCase().includes(q)
      );
    });
  }, [scopedUsers, searchQuery, getEmployeeProfile]);

  // Summary KPIs
  const kpis = useMemo(() => {
    const totalStaff = scopedUsers.length;
    const clockedInCount = scopedUsers.filter(u => hasActiveAttendanceToday(u.id)).length;
    let sanidadAlerts = 0;
    scopedUsers.forEach(u => {
      const sem = computeHealthCardSemaphore(getEmployeeProfile(u).healthCardExpiry);
      if (sem.status !== 'healthy') sanidadAlerts += 1;
    });
    const estimatedPayroll = scopedUsers.reduce((sum, u) => {
      const base = getEmployeeProfile(u).baseSalarySoles;
      const moves = payrollMovements.filter(m => m.userId === u.id);
      const plus = moves
        .filter(m => m.type === 'hora_extra' || m.type === 'bono_puntualidad')
        .reduce((a, b) => a + b.amountSoles, 0);
      const minus = moves
        .filter(m => m.type === 'adelanto' || m.type === 'consumo_personal')
        .reduce((a, b) => a + b.amountSoles, 0);
      return sum + base + plus - minus;
    }, 0);

    return { totalStaff, clockedInCount, sanidadAlerts, estimatedPayroll };
  }, [scopedUsers, hasActiveAttendanceToday, getEmployeeProfile, payrollMovements]);

  // ============================================================================
  // MODAL 1: EDITAR LEGAJO DIGITAL (<dialog>)
  // ============================================================================
  const legajoDialogRef = useRef<HTMLDialogElement>(null);
  const legajoTitleId = useId();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [legajoForm, setLegajoForm] = useState<EmployeeHRProfile | null>(null);

  const openLegajoModal = (user: User) => {
    setEditingUser(user);
    setLegajoForm({ ...getEmployeeProfile(user) });
  };

  useEffect(() => {
    const dialog = legajoDialogRef.current;
    if (!dialog) return;
    if (editingUser && legajoForm) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [editingUser, legajoForm]);

  const closeLegajoModal = () => {
    if (legajoDialogRef.current) legajoDialogRef.current.returnValue = '';
    setEditingUser(null);
    setLegajoForm(null);
  };

  const handleSaveLegajo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !legajoForm) return;
    updateEmployeeProfile(editingUser.id, legajoForm);
    closeLegajoModal();
  };

  // ============================================================================
  // MODAL 2: ALTA RÁPIDA DE COLABORADOR (<dialog>)
  // ============================================================================
  const newStaffDialogRef = useRef<HTMLDialogElement>(null);
  const newStaffTitleId = useId();
  const [isNewStaffOpen, setIsNewStaffOpen] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: '',
    pin: '',
    phone: '+51 9',
    email: '',
    roleId: 'role-kitchen',
    branchId: activeTenant.id,
  });

  useEffect(() => {
    const dialog = newStaffDialogRef.current;
    if (!dialog) return;
    if (isNewStaffOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isNewStaffOpen]);

  const handleCreateCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = newStaffData.pin.replace(/\D/g, '');
    if (![4, 6, 8].includes(cleanPin.length)) {
      dispatchToast(
        'Credencial Inválida',
        'El documento/código debe tener exactamente 8 dígitos (DNI/CE), 6 dígitos o 4 dígitos.',
        'error'
      );
      return;
    }
    if (users.some(u => u.pin === cleanPin)) {
      dispatchToast('Código Duplicado', 'Ese DNI o PIN ya pertenece a otro colaborador.', 'error');
      return;
    }
    const targetRole = roles.find(r => r.id === newStaffData.roleId) || roles[roles.length - 1];
    addUser({
      name: newStaffData.name.trim(),
      email:
        newStaffData.email.trim() ||
        `${newStaffData.name.trim().toLowerCase().replace(/\s+/g, '.')}@khalessipizza.com`,
      phone: newStaffData.phone.trim(),
      avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      roleId: targetRole.id,
      roleName: targetRole.name,
      status: 'active',
      pin: cleanPin,
      branchIds: newStaffData.branchId === 'all' ? ['all'] : [newStaffData.branchId],
    });
    setIsNewStaffOpen(false);
    setNewStaffData({
      name: '',
      pin: '',
      phone: '+51 9',
      email: '',
      roleId: 'role-kitchen',
      branchId: activeTenant.id,
    });
  };

  // ============================================================================
  // MODAL 3: ASIGNAR TURNO / APOYO MULTISUCURSAL (<dialog>)
  // ============================================================================
  const shiftDialogRef = useRef<HTMLDialogElement>(null);
  const shiftTitleId = useId();
  const [editingShiftTarget, setEditingShiftTarget] = useState<{
    user: User;
    dayIndex: number;
    shiftType: ShiftType;
    hoursLabel: string;
    branchId: string;
    isSupportCover: boolean;
  } | null>(null);

  useEffect(() => {
    const dialog = shiftDialogRef.current;
    if (!dialog) return;
    if (editingShiftTarget) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [editingShiftTarget]);

  const handleSaveShiftModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShiftTarget) return;
    upsertShiftAssignment({
      userId: editingShiftTarget.user.id,
      branchId: editingShiftTarget.branchId,
      dayIndex: editingShiftTarget.dayIndex,
      shiftType: editingShiftTarget.shiftType,
      hoursLabel: editingShiftTarget.hoursLabel,
      isSupportCover: editingShiftTarget.isSupportCover,
    });
    setEditingShiftTarget(null);
  };

  // ============================================================================
  // MODAL 4: REGISTRAR ADELANTO / HORA EXTRA / BONO (<dialog>)
  // ============================================================================
  const movementDialogRef = useRef<HTMLDialogElement>(null);
  const movementTitleId = useId();
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<{
    userId: string;
    type: PayrollMovementType;
    amountSoles: string;
    description: string;
  }>({
    userId: users[0]?.id || '',
    type: 'adelanto',
    amountSoles: '100',
    description: '',
  });

  useEffect(() => {
    const dialog = movementDialogRef.current;
    if (!dialog) return;
    if (isMovementOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isMovementOpen]);

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(movementForm.amountSoles);
    if (!movementForm.userId || Number.isNaN(amount) || amount <= 0) {
      dispatchToast('Monto Inválido', 'Ingresa un importe mayor a S/ 0.00.', 'error');
      return;
    }
    addPayrollMovement({
      userId: movementForm.userId,
      branchId: activeTenant.id,
      date: getLocalTodayIso(),
      type: movementForm.type,
      amountSoles: amount,
      description:
        movementForm.description.trim() ||
        (movementForm.type === 'adelanto'
          ? 'Adelanto de remuneración'
          : movementForm.type === 'hora_extra'
          ? 'Sobretiempo operativo autorizado'
          : movementForm.type === 'bono_puntualidad'
          ? 'Incentivo de desempeño'
          : 'Consumo interno de personal'),
    });
    setIsMovementOpen(false);
    setMovementForm(prev => ({ ...prev, amountSoles: '100', description: '' }));
  };

  // ============================================================================
  // ATTENDANCE TERMINAL & GOOGLE AUTHENTICATOR LIVE SYNC
  // ============================================================================
  const [terminalCode, setTerminalCode] = useState('');
  const [terminalEvent, setTerminalEvent] = useState<AttendanceEventType>('check_in');

  const [liveMasterTotp, setLiveMasterTotp] = useState('------');
  const [totpSecondsLeft, setTotpSecondsLeft] = useState(getTotpRemainingSeconds());
  const [selectedTotpTarget, setSelectedTotpTarget] = useState<'master' | string>('master');
  const [testTotpInput, setTestTotpInput] = useState('');
  const testTotpInputId = useId();
  const testTotpHintId = useId();

  const activeSecretForQr = useMemo(() => {
    if (selectedTotpTarget === 'master') {
      return {
        secret: securityPolicy.masterTotpSecret,
        accountLabel: securityPolicy.masterTotpAccount || 'Supervision Corporativa',
      };
    }
    const targetUser = users.find(u => u.id === selectedTotpTarget);
    if (!targetUser) {
      return {
        secret: securityPolicy.masterTotpSecret,
        accountLabel: 'Supervision Corporativa',
      };
    }
    const prof = getEmployeeProfile(targetUser);
    return {
      secret: prof.personalTotpSecret,
      accountLabel: `${targetUser.name.replace(' (Tú)', '')} (${targetUser.pin})`,
    };
  }, [selectedTotpTarget, securityPolicy, users, getEmployeeProfile]);

  const otpAuthUri = useMemo(
    () =>
      buildOtpAuthUri({
        secret: activeSecretForQr.secret,
        accountLabel: activeSecretForQr.accountLabel,
        issuer: customization.appName,
      }),
    [activeSecretForQr, customization.appName]
  );

  const qrImageUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
        otpAuthUri
      )}`,
    [otpAuthUri]
  );

  useEffect(() => {
    let mounted = true;
    const refreshTotp = async () => {
      const code = await generateCurrentTotp(activeSecretForQr.secret);
      if (mounted) {
        setLiveMasterTotp(code);
        setTotpSecondsLeft(getTotpRemainingSeconds());
      }
    };
    void refreshTotp();
    const timer = window.setInterval(() => {
      void refreshTotp();
    }, 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [activeSecretForQr.secret]);

  const handleTestTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = await verifyTotpCode(activeSecretForQr.secret, testTotpInput, 1);
    if (check.valid) {
      dispatchToast(
        'Google Authenticator Sincronizado',
        `El código ${testTotpInput} es 100% válido (RFC 6238 HMAC-SHA1). Listo para desbloquear accesos.`,
        'success'
      );
      setTestTotpInput('');
    } else {
      dispatchToast(
        'Código No Coincide',
        'Revisa que la hora de tu teléfono esté en automático e ingresa los 6 dígitos actuales.',
        'error'
      );
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* 1. HEADER & MULTISUCURSAL FILTER PILLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold saas-subcard text-zinc-700 dark:text-zinc-300">
            <BadgeCheck className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
            <span>Módulo Principal Fase 1 · Gestión de Talento Gastronómico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Recursos Humanos, Biométrico y Accesos
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Control de carnets sanitarios, reloj de asistencia, turnos multisucursal, pre-planilla y desbloqueo por Google Authenticator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <PermissionGate permission="hr:schedules" hideInsteadOfBanner>
            <button
              type="button"
              onClick={() => setIsNewStaffOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              Alta de Colaborador
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Multisucursal Context Selector Strip (ONLY VISIBLE FOR SUPERADMIN & MANAGERS; HIDDEN FOR OPERATIONAL STAFF) */}
      {canManageHR && (
        <div className="saas-card p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-2">
              Ámbito RR.HH.:
            </span>
            <button
              type="button"
              onClick={() => switchTenant('consolidated')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                branchScope === 'consolidated' ? 'saas-option-active' : 'saas-option'
              }`}
            >
              <Globe2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              Todas las Sedes ({tenants.length})
            </button>

            {tenants.map(t => {
              const active = branchScope === 'branch' && activeTenant.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTenant(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    active ? 'saas-option-active' : 'saas-option'
                  }`}
                >
                  <Store className="h-3.5 w-3.5 shrink-0 opacity-75" />
                  {t.name.replace('Khalessi Pizza - ', '')}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar DNI, nombre o cargo..."
              aria-label="Filtrar colaboradores"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs saas-input"
            />
          </div>
        </div>
      )}

      {/* 2. KPI SUMMARY CARDS (VISIBLE FOR ADMINS/MANAGERS) */}
      {canManageHR && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="saas-card p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <span>Personal Habilitado</span>
              <Users className="h-4 w-4" style={{ color: customization.primaryColor }} />
            </div>
            <p className="text-2xl font-bold text-zinc-950 dark:text-white">{kpis.totalStaff}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {branchScope === 'consolidated'
                ? `Red completa (${tenants.length} locales)`
                : activeTenant.name.replace('Khalessi Pizza - ', '')}
            </p>
          </div>

          <div className="saas-card p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <span>Asistencia Registrada Hoy</span>
              <Fingerprint className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-zinc-950 dark:text-white">
              {kpis.clockedInCount} / {kpis.totalStaff}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {securityPolicy.enforceAttendanceToLogin
                ? 'Bloqueo Login sin asistencia: ACTIVO'
                : 'Bloqueo Login sin asistencia: Pausado'}
            </p>
          </div>

          <div className="saas-card p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <span>Alertas Carnet Sanidad</span>
              <AlertTriangle
                className={`h-4 w-4 ${
                  kpis.sanidadAlerts > 0 ? 'text-amber-500' : 'text-emerald-500'
                }`}
              />
            </div>
            <p className="text-2xl font-bold text-zinc-950 dark:text-white">{kpis.sanidadAlerts}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {kpis.sanidadAlerts > 0
                ? 'Colaboradores por renovar o vencidos'
                : '100% de carnets municipales al día'}
            </p>
          </div>

          <div className="saas-card p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <span>Pre-Planilla Neta Estimada</span>
              <Wallet className="h-4 w-4 text-sky-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-zinc-950 dark:text-white">
              S/ {kpis.estimatedPayroll.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Incluye horas extra, bonos y adelantos
            </p>
          </div>
        </div>
      )}

      {/* 3. SINGLE-ROW ACCESSIBLE TABLIST (per modern-web-guidance tabs) */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div
          role="tablist"
          aria-label="Secciones de Recursos Humanos"
          className="erp-tablist gap-1"
        >
          {availableTabs.map(tab => {
            const Icon = tab.icon;
            const selected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={el => {
                  tabButtonRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`${baseTabId}-tab-${tab.id}`}
                aria-selected={selected}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
                  selected
                    ? 'text-zinc-950 dark:text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================
          TABPANEL 1: LEGAJOS DIGITALES & SANIDAD
          (Note: styles live on child wrapper inside role="tabpanel" per tabs guide)
         ======================================================================== */}
      <div
        ref={el => {
          panelRefs.current.legajos = el;
        }}
        role="tabpanel"
        aria-labelledby={`${baseTabId}-tab-legajos`}
      >
        <div className="saas-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Directorio de Legajos, Contratos y Carnets de Sanidad
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Semáforo municipal de manipulación de alimentos, credenciales de ingreso y política de asistencia obligatoria.
              </p>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby={legajosCaptionId}
            className="erp-table-wrapper"
          >
            <table className="erp-stack-table text-left text-xs sm:text-sm">
              <caption id={legajosCaptionId} className="sr-only">
                Legajos digitales del personal por sucursal
              </caption>
              <thead className="bg-zinc-100/95 dark:bg-zinc-900/95 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Colaborador</th>
                  <th scope="col" className="px-4 py-3 font-bold">Cargo & Contrato</th>
                  <th scope="col" className="px-4 py-3 font-bold">Credencial Login</th>
                  <th scope="col" className="px-4 py-3 font-bold">Carnet Sanidad</th>
                  <th scope="col" className="px-4 py-3 font-bold">Control Login</th>
                  <th scope="col" className="px-4 py-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {filteredUsers.map(user => {
                  const prof = getEmployeeProfile(user);
                  const sem = computeHealthCardSemaphore(prof.healthCardExpiry);
                  const todayRec = getTodayRecordForUser(user.id);
                  const isExemptAdmin =
                    user.roleId === 'role-admin' && securityPolicy.exemptSuperAdmin;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <th scope="row" className="px-4 py-3.5 font-semibold text-zinc-950 dark:text-white">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-zinc-300 dark:ring-zinc-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="block truncate font-bold">{user.name}</span>
                            <span className="block text-[11px] font-normal text-zinc-500 dark:text-zinc-400 truncate">
                              {user.roleName} · Entrada {prof.scheduledEntryTime}
                            </span>
                          </div>
                        </div>
                      </th>

                      <td data-label="Cargo & Contrato" className="px-4 py-3.5">
                        <div className="text-right sm:text-left">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                            {prof.position}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {prof.contractType} · S/ {prof.baseSalarySoles.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td data-label="Credencial" className="px-4 py-3.5 font-mono">
                        <span className="px-2 py-1 rounded-lg saas-subcard text-xs font-bold">
                          {user.documentType || `${user.pin.length}d`}: {user.pin}
                        </span>
                      </td>

                      <td data-label="Carnet Sanidad" className="px-4 py-3.5">
                        <div className="flex flex-col sm:items-start items-end gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sem.badgeClass}`}
                          >
                            {sem.status === 'expired' ? (
                              <AlertOctagon className="h-3 w-3 shrink-0" />
                            ) : sem.status === 'expiring' ? (
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            )}
                            {sem.label}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            {prof.healthCardNumber} · Vence {prof.healthCardExpiry}
                          </span>
                        </div>
                      </td>

                      <td data-label="Acceso Sistema" className="px-4 py-3.5">
                        <div className="flex flex-col sm:items-start items-end gap-1">
                          {isExemptAdmin || !prof.requiresAttendanceToLogin ? (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                              Ingreso Libre (Exento)
                            </span>
                          ) : todayRec?.checkInTime ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                              Habilitado ({todayRec.checkInTime})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                              Retenido sin Asistencia / TOTP
                            </span>
                          )}
                        </div>
                      </td>

                      <td data-label="Acción" className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openLegajoModal(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Legajo
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================
          TABPANEL 2: RELOJ BIOMÉTRICO & ASISTENCIA EN VIVO
         ======================================================================== */}
      <div
        ref={el => {
          panelRefs.current.asistencia = el;
        }}
        role="tabpanel"
        aria-labelledby={`${baseTabId}-tab-asistencia`}
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Terminal Simulator */}
          <div className="saas-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: customization.primaryColor }}
                >
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                    Terminal Biométrico / DNI
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {securityPolicy.biometricDeviceName}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'check_in', label: '1. Entrada' },
                  { id: 'break_start', label: '2. Refrigerio' },
                  { id: 'break_end', label: '3. Retorno' },
                  { id: 'check_out', label: '4. Salida' },
                ] as const
              ).map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setTerminalEvent(ev.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    terminalEvent === ev.id ? 'saas-option-active' : 'saas-option'
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!terminalCode.trim()) return;
                const res = clockAttendance({
                  codeOrUserId: terminalCode,
                  eventType: terminalEvent,
                  method: 'dni_pin',
                  branchId: activeTenant.id,
                });
                if (res.ok) {
                  setTerminalCode('');
                } else {
                  dispatchToast('Marcación Rechazada', res.message, 'error');
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  DNI (8d) o Código de Colaborador
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={terminalCode}
                  onChange={e => setTerminalCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 46918205"
                  className="w-full px-3.5 py-2.5 rounded-xl font-mono text-base font-bold saas-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!terminalCode.trim()) {
                      dispatchToast(
                        'Ingresa DNI/Código',
                        'Escribe los dígitos del colaborador para simular su huella biométrica.',
                        'warning'
                      );
                      return;
                    }
                    const res = clockAttendance({
                      codeOrUserId: terminalCode,
                      eventType: terminalEvent,
                      method: 'biometric',
                      branchId: activeTenant.id,
                    });
                    if (res.ok) setTerminalCode('');
                    else dispatchToast('Error Biométrico', res.message, 'error');
                  }}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold saas-btn-secondary flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Fingerprint className="h-4 w-4 shrink-0" style={{ color: customization.primaryColor }} />
                  Huella ZKTeco
                </button>

                <button
                  type="submit"
                  className="px-3 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  style={{ backgroundColor: customization.primaryColor }}
                >
                  <Clock className="h-4 w-4 shrink-0" />
                  Registrar Marca
                </button>
              </div>
            </form>

            <div className="p-3 rounded-xl saas-subcard text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-200">
                ¿Cómo probar el bloqueo de Login?
              </p>
              <p>
                Cualquier colaborador marcado abajo como <strong>Sin marcación hoy</strong> verá bloqueado su acceso al cerrar turno e intentar ingresar su DNI/PIN, pidiéndole <strong>Google Authenticator</strong> o marcar entrada.
              </p>
            </div>
          </div>

          {/* Right Live Attendance Board */}
          <div className="xl:col-span-2 saas-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Estado de Asistencia de Hoy ({getLocalTodayIso()})
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Sincronizado en tiempo real con el candado de inicio de sesión del ERP.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                {todayRecords.length} marcaciones hoy
              </span>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-labelledby={attendanceCaptionId}
              className="erp-table-wrapper"
            >
              <table className="erp-stack-table text-left text-xs sm:text-sm">
                <caption id={attendanceCaptionId} className="sr-only">
                  Registro de asistencia diaria y marcaciones biométricas
                </caption>
                <thead className="bg-zinc-100/95 dark:bg-zinc-900/95 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Colaborador</th>
                    <th scope="col" className="px-4 py-3 font-bold">Entrada / Refrigerio / Salida</th>
                    <th scope="col" className="px-4 py-3 font-bold">Vía de Validación</th>
                    <th scope="col" className="px-4 py-3 font-bold">Estado</th>
                    <th scope="col" className="px-4 py-3 font-bold text-right">Acción Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                  {filteredUsers.map(u => {
                    const rec = getTodayRecordForUser(u.id);
                    const prof = getEmployeeProfile(u);

                    return (
                      <tr key={u.id} className="hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]">
                        <th scope="row" className="px-4 py-3 font-semibold text-zinc-950 dark:text-white">
                          <div>
                            <span className="block font-bold">{u.name}</span>
                            <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 font-mono">
                              Prog: {prof.scheduledEntryTime} · PIN/DNI: {u.pin}
                            </span>
                          </div>
                        </th>

                        <td data-label="Horarios Hoy" className="px-4 py-3 font-mono text-xs">
                          {rec ? (
                            <div className="space-y-0.5 text-right sm:text-left">
                              <span className="block text-zinc-900 dark:text-zinc-100 font-bold">
                                In: {rec.checkInTime || '--:--'}
                                {rec.checkOutTime ? ` · Out: ${rec.checkOutTime}` : ''}
                              </span>
                              {(rec.breakStartTime || rec.breakEndTime) && (
                                <span className="block text-[11px] text-zinc-500">
                                  Refrig: {rec.breakStartTime || '--'} → {rec.breakEndTime || '--'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500">Sin marcación hoy</span>
                          )}
                        </td>

                        <td data-label="Método" className="px-4 py-3">
                          {rec ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg saas-subcard text-[11px] font-semibold">
                              {rec.method === 'biometric'
                                ? 'Huella Biométrica'
                                : rec.method === 'totp_override'
                                ? 'Google Authenticator'
                                : 'Terminal DNI'}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>

                        <td data-label="Puntualidad" className="px-4 py-3">
                          {rec ? (
                            rec.status === 'desbloqueo_totp' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                                Desbloqueo TOTP
                              </span>
                            ) : rec.lateMinutes > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                Tardanza (+{rec.lateMinutes}m)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                Puntual
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              Ausente / No marcó
                            </span>
                          )}
                        </td>

                        <td data-label="Control" className="px-4 py-3 text-right">
                          {!rec ? (
                            <button
                              type="button"
                              onClick={() => simulateBiometricPunchForUser(u.id, activeTenant.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
                            >
                              <Fingerprint className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
                              Simular Huella
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => clearTodayAttendanceForUser(u.id)}
                              title="Borrar asistencia de hoy para probar bloqueo de Login"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reiniciar Hoy
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          TABPANEL 3: HORARIOS SEMANALES & ROTACIÓN MULTISUCURSAL
         ======================================================================== */}
      <div
        ref={el => {
          panelRefs.current.horarios = el;
        }}
        role="tabpanel"
        aria-labelledby={`${baseTabId}-tab-horarios`}
      >
        <div className="saas-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Roster Semanal de Turnos y Préstamo entre Sucursales
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Haz clic en cualquier turno para reasignar horario (Apertura Masa, Intermedio, Punta Horno o Apoyo en otra sede).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {(Object.keys(SHIFT_META) as ShiftType[]).map(k => (
                <span
                  key={k}
                  className={`px-2 py-0.5 rounded-md font-semibold border ${SHIFT_META[k].badgeClass}`}
                >
                  {SHIFT_META[k].short}
                </span>
              ))}
            </div>
          </div>

          <div tabIndex={0} role="region" aria-label="Cuadrante semanal de turnos" className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[780px]">
              <thead className="bg-zinc-100/95 dark:bg-zinc-900/95 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold w-52">Colaborador</th>
                  {WEEK_DAYS.map(d => (
                    <th key={d.idx} scope="col" className="px-2.5 py-3 font-bold text-center">
                      {d.full}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {filteredUsers.map(u => {
                  const prof = getEmployeeProfile(u);
                  return (
                    <tr key={u.id} className="hover:bg-zinc-100/40 dark:hover:bg-white/[0.015]">
                      <th scope="row" className="px-4 py-3 font-semibold text-zinc-950 dark:text-white">
                        <span className="block truncate font-bold">{u.name}</span>
                        <span className="block text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                          {prof.position}
                        </span>
                      </th>

                      {WEEK_DAYS.map(day => {
                        const cell = weeklyShifts.find(
                          s => s.userId === u.id && s.dayIndex === day.idx
                        ) || {
                          id: `temp-${u.id}-${day.idx}`,
                          userId: u.id,
                          branchId: activeTenant.id,
                          dayIndex: day.idx,
                          shiftType: 'punta_noche' as ShiftType,
                          hoursLabel: SHIFT_META.punta_noche.hours,
                          isSupportCover: false,
                        };
                        const meta = SHIFT_META[cell.shiftType];
                        const assignedBranch = tenants.find(t => t.id === cell.branchId);

                        return (
                          <td key={day.idx} className="p-1.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingShiftTarget({
                                  user: u,
                                  dayIndex: day.idx,
                                  shiftType: cell.shiftType,
                                  hoursLabel: cell.hoursLabel,
                                  branchId: cell.branchId,
                                  isSupportCover: cell.isSupportCover,
                                })
                              }
                              className={`w-full p-2 rounded-xl border text-left transition-transform hover:scale-[1.02] active:scale-[0.98] ${meta.badgeClass}`}
                            >
                              <span className="block text-[11px] font-bold leading-tight truncate">
                                {meta.short}
                              </span>
                              <span className="block text-[10px] font-mono opacity-80 mt-0.5 truncate">
                                {cell.hoursLabel}
                              </span>
                              {cell.isSupportCover && assignedBranch && (
                                <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 truncate max-w-full">
                                  <ArrowRightLeft className="h-2.5 w-2.5 shrink-0" />
                                  {assignedBranch.name.replace('Khalessi Pizza - ', '')}
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================
          TABPANEL 4: ADELANTOS, EXTRAS & PRE-PLANILLA
         ======================================================================== */}
      <div
        ref={el => {
          panelRefs.current.preplanilla = el;
        }}
        role="tabpanel"
        aria-labelledby={`${baseTabId}-tab-preplanilla`}
      >
        <div className="space-y-5">
          <div className="saas-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Consolidado de Pre-Planilla, Horas Extra y Adelantos
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cálculo transparente de remuneración base más incentivos menos vales/adelantos de caja.
                </p>
              </div>

              <PermissionGate permission="hr:payroll" hideInsteadOfBanner>
                <button
                  type="button"
                  onClick={() => setIsMovementOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                  style={{ backgroundColor: customization.primaryColor }}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Registrar Adelanto / Extra
                </button>
              </PermissionGate>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-labelledby={payrollCaptionId}
              className="erp-table-wrapper"
            >
              <table className="erp-stack-table text-left text-xs sm:text-sm">
                <caption id={payrollCaptionId} className="sr-only">
                  Liquidación preliminar de pre-planilla por colaborador
                </caption>
                <thead className="bg-zinc-100/95 dark:bg-zinc-900/95 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Colaborador</th>
                    <th scope="col" className="px-4 py-3 font-bold">Base Mensual / Jornal</th>
                    <th scope="col" className="px-4 py-3 font-bold">+ Extras / Bonos</th>
                    <th scope="col" className="px-4 py-3 font-bold">− Adelantos / Consumos</th>
                    <th scope="col" className="px-4 py-3 font-bold text-right">Neto Proyectado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                  {filteredUsers.map(u => {
                    const prof = getEmployeeProfile(u);
                    const moves = payrollMovements.filter(m => m.userId === u.id);
                    const additions = moves
                      .filter(m => m.type === 'hora_extra' || m.type === 'bono_puntualidad')
                      .reduce((s, m) => s + m.amountSoles, 0);
                    const deductions = moves
                      .filter(m => m.type === 'adelanto' || m.type === 'consumo_personal')
                      .reduce((s, m) => s + m.amountSoles, 0);
                    const net = prof.baseSalarySoles + additions - deductions;

                    return (
                      <tr key={u.id} className="hover:bg-zinc-100/40 dark:hover:bg-white/[0.02]">
                        <th scope="row" className="px-4 py-3.5 font-semibold text-zinc-950 dark:text-white">
                          <span className="block font-bold">{u.name}</span>
                          <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                            {prof.position} · {prof.contractType}
                          </span>
                        </th>
                        <td data-label="Base" className="px-4 py-3.5 font-mono">
                          S/ {prof.baseSalarySoles.toFixed(2)}
                        </td>
                        <td data-label="Bonos / Extras" className="px-4 py-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          + S/ {additions.toFixed(2)}
                        </td>
                        <td data-label="Adelantos" className="px-4 py-3.5 font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          − S/ {deductions.toFixed(2)}
                        </td>
                        <td data-label="Neto Estimado" className="px-4 py-3.5 font-mono font-bold text-right text-zinc-950 dark:text-white">
                          S/ {net.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movements Ledger */}
          <div className="saas-card p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              Bitácora Reciente de Movimientos de Planilla
            </h3>
            {payrollMovements.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin movimientos adicionales registrados en el periodo.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {payrollMovements.map(mov => {
                  const usr = users.find(u => u.id === mov.userId);
                  const isPositive =
                    mov.type === 'hora_extra' || mov.type === 'bono_puntualidad';
                  return (
                    <div
                      key={mov.id}
                      className="p-3 rounded-xl saas-subcard flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                          {usr?.name || 'Colaborador'} ·{' '}
                          <span className="uppercase text-[10px] opacity-75">
                            {mov.type.replace('_', ' ')}
                          </span>
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {mov.description} ({mov.date})
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : '−'} S/ {mov.amountSoles.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => deletePayrollMovement(mov.id)}
                          aria-label="Anular movimiento"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================
          TABPANEL 5: SEGURIDAD DE ACCESO & GOOGLE AUTHENTICATOR (RFC 6238)
         ======================================================================== */}
      <div
        ref={el => {
          panelRefs.current.seguridad_totp = el;
        }}
        role="tabpanel"
        aria-labelledby={`${baseTabId}-tab-seguridad_totp`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Policy Controls */}
          <div className="lg:col-span-6 saas-card p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: customization.primaryColor }} />
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Candado de Acceso por Asistencia & Biométrico
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Impide que el personal opere el ERP si no marcó entrada, salvo autorización con Google Authenticator.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  key: 'enforceAttendanceToLogin' as const,
                  title: 'Exigir Asistencia Registrada para Entrar al Sistema',
                  desc: 'Si el colaborador no tiene marcación biométrica ni de reloj hoy, el Login retiene el ingreso.',
                  value: securityPolicy.enforceAttendanceToLogin,
                },
                {
                  key: 'exemptSuperAdmin' as const,
                  title: 'Eximir a Super Administrador del Candado Diario',
                  desc: 'Permite que Dirección General ingrese directo sin marcación (desactívalo si deseas probar el candado con tu propio usuario).',
                  value: securityPolicy.exemptSuperAdmin,
                },
                {
                  key: 'allowMasterTotpUnlock' as const,
                  title: 'Habilitar Llave Maestra Google Authenticator (Supervisión)',
                  desc: 'Un gerente o dueño puede autorizar el desbloqueo en pantalla con su código TOTP corporativo de 6 dígitos.',
                  value: securityPolicy.allowMasterTotpUnlock,
                },
                {
                  key: 'allowPersonalTotpUnlock' as const,
                  title: 'Habilitar Google Authenticator Individual por Colaborador',
                  desc: 'Permite que personal autorizado use su propio TOTP enrolado cuando opera fuera de tienda.',
                  value: securityPolicy.allowPersonalTotpUnlock,
                },
              ].map(item => (
                <label
                  key={item.key}
                  className="p-3.5 rounded-2xl saas-subcard flex items-start justify-between gap-3 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white block">
                      {item.title}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                      {item.desc}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={e => updateSecurityPolicy({ [item.key]: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded shrink-0 cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Identificador de Reloj Biométrico de Tienda
              </label>
              <input
                type="text"
                value={securityPolicy.biometricDeviceName}
                onChange={e => updateSecurityPolicy({ biometricDeviceName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm saas-input"
              />
            </div>
          </div>

          {/* Right Google Authenticator Enrollment & Live RFC 6238 Verifier */}
          <div className="lg:col-span-6 saas-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <QrCode className="h-5 w-5 shrink-0" style={{ color: customization.primaryColor }} />
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Vinculación Google Authenticator (TOTP Real)
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Compatible con la app oficial Google Authenticator en Android y iPhone (RFC 6238 · 30s).
                  </p>
                </div>
              </div>

              <select
                aria-label="Seleccionar llave Google Authenticator a configurar"
                value={selectedTotpTarget}
                onChange={e => setSelectedTotpTarget(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold saas-input"
              >
                <option value="master">🔑 Llave Maestra Supervisión</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* QR + Base32 Secret Box */}
            <div className="p-4 rounded-2xl saas-subcard flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2.5 rounded-2xl bg-white shadow-sm shrink-0 border border-zinc-200">
                <img
                  src={qrImageUrl}
                  alt="Código QR para escanear en Google Authenticator"
                  className="h-36 w-36 object-contain block"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2.5 w-full">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Cuenta a escanear en Google Authenticator
                  </span>
                  <span className="text-sm font-bold text-zinc-950 dark:text-white truncate block">
                    {activeSecretForQr.accountLabel}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Clave Secreta Manual (Base32)
                  </span>
                  <code className="block mt-0.5 px-2.5 py-1.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-900 font-mono text-xs font-bold tracking-wider text-zinc-900 dark:text-zinc-100 break-all">
                    {formatBase32Secret(activeSecretForQr.secret)}
                  </code>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(activeSecretForQr.secret);
                      dispatchToast('Clave Base32 Copiada', 'Pégala en Google Authenticator si prefieres configuración manual.', 'info');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar Clave
                  </button>

                  {hasPermission('hr:totp_security') && (
                    <button
                      type="button"
                      onClick={() => {
                        openNoticeModal({
                          title: '¿Rotar semilla secreta de Google Authenticator?',
                          message:
                            'Los códigos anteriores dejarán de funcionar y deberás volver a escanear el nuevo código QR en tu teléfono.',
                          tone: 'warning',
                          confirmLabel: 'Generar Nueva Clave',
                          cancelLabel: 'Cancelar',
                          onConfirm: () => {
                            if (selectedTotpTarget === 'master') {
                              regenerateMasterTotpSecret();
                            } else {
                              regenerateEmployeeTotpSecret(selectedTotpTarget);
                            }
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Rotar Semilla
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Admin TOTP Monitor + Interactive Verification Form */}
            {hasPermission('hr:totp_security') && (
              <div className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: customization.primaryColor }} />
                      Código Vigente en Tiempo Real (Verificación Admin)
                    </span>
                    <p className="font-mono text-2xl font-bold tracking-[0.28em] text-zinc-950 dark:text-white mt-0.5">
                      {liveMasterTotp}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full saas-subcard">
                      Renueva en {totpSecondsLeft}s
                    </span>
                  </div>
                </div>

                <form onSubmit={handleTestTotpVerify} className="space-y-2 pt-1">
                  <label
                    htmlFor={testTotpInputId}
                    className="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
                  >
                    Probar código desde tu celular
                  </label>
                  <p id={testTotpHintId} className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Escribe los 6 dígitos que muestra tu app Google Authenticator para confirmar la sincronización.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      id={testTotpInputId}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      maxLength={6}
                      required
                      aria-describedby={testTotpHintId}
                      value={testTotpInput}
                      onChange={e => setTestTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl font-mono text-base font-bold tracking-[0.3em] saas-input"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                      style={{ backgroundColor: customization.primaryColor }}
                    >
                      Verificar 6 Dígitos
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================
          TABPANEL 5.5: POSTULANTES & CONSTRUCTOR DE FORMULARIOS POR PUESTO
         ======================================================================== */}
      <div
        ref={el => {
          panelRefs.current.postulantes = el;
        }}
        role="tabpanel"
        aria-labelledby={`${baseTabId}-tab-postulantes`}
      >
        <ApplicantsTabView />
      </div>

      {/* ========================================================================
          TABPANEL 6: AUTOSERVICIO DEL COLABORADOR & VOUCHER DE PAGO
         ======================================================================== */}
      <div
        ref={el => {
          panelRefs.current.portal_publico = el;
        }}
        role="tabpanel"
        aria-labelledby={`${baseTabId}-tab-portal_publico`}
      >
        <PublicEmployeePortal />
      </div>
      <dialog
        ref={legajoDialogRef}
        aria-labelledby={legajoTitleId}
        onClose={closeLegajoModal}
        className="max-w-xl"
      >
        {editingUser && legajoForm && (
          <form
            onSubmit={handleSaveLegajo}
            className="saas-card !rounded-3xl p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-700"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 id={legajoTitleId} className="text-lg font-bold text-zinc-950 dark:text-white">
                  Legajo Laboral y Sanitario — {editingUser.name}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Credencial: {editingUser.pin} · Rol RBAC: {editingUser.roleName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Puesto Operativo
                </label>
                <select
                  value={legajoForm.position}
                  onChange={e =>
                    setLegajoForm({ ...legajoForm, position: e.target.value as HRPosition })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm saas-input"
                >
                  {POSITIONS_LIST.map(pos => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Modalidad Contractual
                </label>
                <select
                  value={legajoForm.contractType}
                  onChange={e =>
                    setLegajoForm({ ...legajoForm, contractType: e.target.value as ContractType })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm saas-input"
                >
                  {CONTRACTS_LIST.map(ct => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Fecha de Cumpleaños
                </label>
                <input
                  type="date"
                  value={legajoForm.birthday || '1994-04-18'}
                  onChange={e =>
                    setLegajoForm({ ...legajoForm, birthday: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Cuenta de Abono / Banco
                </label>
                <input
                  type="text"
                  placeholder="BCP Ahorros: 193-..."
                  value={legajoForm.bankAccountInfo || ''}
                  onChange={e =>
                    setLegajoForm({ ...legajoForm, bankAccountInfo: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Remuneración / Base (S/)
                </label>
                <input
                  type="number"
                  min={0}
                  step="10"
                  value={legajoForm.baseSalarySoles}
                  onChange={e =>
                    setLegajoForm({
                      ...legajoForm,
                      baseSalarySoles: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono saas-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Hora Entrada
                  </label>
                  <input
                    type="time"
                    value={legajoForm.scheduledEntryTime}
                    onChange={e =>
                      setLegajoForm({ ...legajoForm, scheduledEntryTime: e.target.value })
                    }
                    className="w-full px-2.5 py-2 rounded-xl text-xs sm:text-sm font-mono saas-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tolerancia (m)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={legajoForm.toleranceMinutes}
                    onChange={e =>
                      setLegajoForm({
                        ...legajoForm,
                        toleranceMinutes: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-xl text-xs sm:text-sm font-mono saas-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  N° Carnet de Sanidad
                </label>
                <input
                  type="text"
                  value={legajoForm.healthCardNumber}
                  onChange={e =>
                    setLegajoForm({ ...legajoForm, healthCardNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Vencimiento Carnet Sanidad
                </label>
                <input
                  type="date"
                  value={legajoForm.healthCardExpiry}
                  onChange={e =>
                    setLegajoForm({ ...legajoForm, healthCardExpiry: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono saas-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Contacto de Emergencia
                </label>
                <input
                  type="text"
                  value={legajoForm.emergencyContact}
                  onChange={e =>
                    setLegajoForm({ ...legajoForm, emergencyContact: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm saas-input"
                />
              </div>

              {/* FUNCIONES Y RESPONSABILIDADES SEGÚN CARGO */}
              <div className="sm:col-span-2 space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Funciones y Tareas del Cargo ({legajoForm.position})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const current = legajoForm.duties || [];
                      setLegajoForm({
                        ...legajoForm,
                        duties: [...current, ''],
                      });
                    }}
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Añadir Función
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Estas funciones se reflejan de inmediato en la ficha técnica y boleta del colaborador.
                </p>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(legajoForm.duties && legajoForm.duties.length > 0
                    ? legajoForm.duties
                    : ['Control operativo y cumplimiento del reglamento de tienda']
                  ).map((duty, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-zinc-400 w-5 text-right shrink-0">
                        {dIdx + 1}.
                      </span>
                      <input
                        type="text"
                        value={duty}
                        onChange={e => {
                          const updated = [...(legajoForm.duties || [])];
                          updated[dIdx] = e.target.value;
                          setLegajoForm({ ...legajoForm, duties: updated });
                        }}
                        placeholder="Descripción de la tarea o función asignada..."
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs saas-input"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (legajoForm.duties || []).filter((_, idx) => idx !== dIdx);
                          setLegajoForm({ ...legajoForm, duties: updated });
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                        title="Eliminar función"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <label className="p-3 rounded-2xl saas-subcard flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                  Requerir marcación de asistencia para iniciar sesión en el ERP
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                  Si no ha marcado asistencia hoy, solo podrá entrar desbloqueando con Google Authenticator.
                </span>
              </div>
              <input
                type="checkbox"
                checked={legajoForm.requiresAttendanceToLogin}
                onChange={e =>
                  setLegajoForm({
                    ...legajoForm,
                    requiresAttendanceToLogin: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded shrink-0"
              />
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeLegajoModal}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Guardar Legajo
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* ========================================================================
          NATIVE <dialog> 2: ALTA DE COLABORADOR (SINGLE_LINE_MODAL_ACTIONS)
         ======================================================================== */}
      <dialog
        ref={newStaffDialogRef}
        aria-labelledby={newStaffTitleId}
        onClose={() => setIsNewStaffOpen(false)}
        className="max-w-lg"
      >
        {isNewStaffOpen && (
          <form
            onSubmit={handleCreateCollaborator}
            className="saas-card !rounded-3xl p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-700"
          >
            <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 id={newStaffTitleId} className="text-lg font-bold text-zinc-950 dark:text-white">
                Incorporar Nuevo Colaborador
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Se sincronizará automáticamente con Login Numérico, Matriz RBAC y Reloj Biométrico.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newStaffData.name}
                  onChange={e => setNewStaffData({ ...newStaffData, name: e.target.value })}
                  placeholder="Ej. Diego Paredes"
                  className="w-full px-3.5 py-2 rounded-xl text-sm saas-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    DNI / C.E. (8d) o PIN (6d/4d)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    value={newStaffData.pin}
                    onChange={e =>
                      setNewStaffData({
                        ...newStaffData,
                        pin: e.target.value.replace(/\D/g, '').slice(0, 8),
                      })
                    }
                    placeholder="8 dígitos estándar"
                    className="w-full px-3.5 py-2 rounded-xl font-mono text-sm font-bold saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    value={newStaffData.phone}
                    onChange={e => setNewStaffData({ ...newStaffData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-sm saas-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Rol RBAC Asignado
                  </label>
                  <select
                    value={newStaffData.roleId}
                    onChange={e => setNewStaffData({ ...newStaffData, roleId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm saas-input"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Sucursal Base
                  </label>
                  <select
                    value={newStaffData.branchId}
                    onChange={e => setNewStaffData({ ...newStaffData, branchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm saas-input"
                  >
                    <option value="all">Todas las Sedes (Corporativo)</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name.replace('Khalessi Pizza - ', '')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsNewStaffOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Registrar Colaborador
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* ========================================================================
          NATIVE <dialog> 3: ASIGNAR TURNO SEMANAL / APOYO ENTRE SEDES
         ======================================================================== */}
      <dialog
        ref={shiftDialogRef}
        aria-labelledby={shiftTitleId}
        onClose={() => setEditingShiftTarget(null)}
        className="max-w-lg"
      >
        {editingShiftTarget && (
          <form
            onSubmit={handleSaveShiftModal}
            className="saas-card !rounded-3xl p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-700"
          >
            <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 id={shiftTitleId} className="text-lg font-bold text-zinc-950 dark:text-white">
                Programar Turno — {WEEK_DAYS[editingShiftTarget.dayIndex]?.full}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Colaborador: {editingShiftTarget.user.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SHIFT_META) as ShiftType[]).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() =>
                    setEditingShiftTarget({
                      ...editingShiftTarget,
                      shiftType: st,
                      hoursLabel: SHIFT_META[st].hours,
                    })
                  }
                  className={`p-3 rounded-2xl text-left transition-all ${
                    editingShiftTarget.shiftType === st ? 'saas-option-active' : 'saas-option'
                  }`}
                >
                  <span className="block text-xs font-bold">{SHIFT_META[st].label}</span>
                  <span className="block text-[11px] font-mono opacity-75">
                    {SHIFT_META[st].hours}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Franja Horaria Exacta
                </label>
                <input
                  type="text"
                  value={editingShiftTarget.hoursLabel}
                  onChange={e =>
                    setEditingShiftTarget({ ...editingShiftTarget, hoursLabel: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sucursal donde Opera el Turno
                </label>
                <select
                  value={editingShiftTarget.branchId}
                  onChange={e =>
                    setEditingShiftTarget({ ...editingShiftTarget, branchId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm saas-input"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name.replace('Khalessi Pizza - ', '')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="p-3 rounded-2xl saas-subcard flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                  Marcar como Turno de Apoyo / Cobertura Multisucursal
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                  Identifica préstamos de personal entre locales en horas punta.
                </span>
              </div>
              <input
                type="checkbox"
                checked={editingShiftTarget.isSupportCover}
                onChange={e =>
                  setEditingShiftTarget({
                    ...editingShiftTarget,
                    isSupportCover: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded shrink-0"
              />
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingShiftTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Guardar Turno
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* ========================================================================
          NATIVE <dialog> 4: REGISTRAR MOVIMIENTO DE PRE-PLANILLA
         ======================================================================== */}
      <dialog
        ref={movementDialogRef}
        aria-labelledby={movementTitleId}
        onClose={() => setIsMovementOpen(false)}
        className="max-w-lg"
      >
        {isMovementOpen && (
          <form
            onSubmit={handleSaveMovement}
            className="saas-card !rounded-3xl p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-700"
          >
            <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 id={movementTitleId} className="text-lg font-bold text-zinc-950 dark:text-white">
                Registrar Movimiento en Pre-Planilla
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Impacta de inmediato en el neto proyectado y queda registrado en Auditoría.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Colaborador
                </label>
                <select
                  value={movementForm.userId}
                  onChange={e => setMovementForm({ ...movementForm, userId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm saas-input"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roleName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tipo de Concepto
                  </label>
                  <select
                    value={movementForm.type}
                    onChange={e =>
                      setMovementForm({
                        ...movementForm,
                        type: e.target.value as PayrollMovementType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-sm saas-input"
                  >
                    <option value="adelanto">− Adelanto de Sueldo</option>
                    <option value="consumo_personal">− Consumo de Personal</option>
                    <option value="hora_extra">+ Horas Extra Autorizadas</option>
                    <option value="bono_puntualidad">+ Bono Desempeño / Puntualidad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Importe en Soles (S/)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.50"
                    required
                    value={movementForm.amountSoles}
                    onChange={e =>
                      setMovementForm({ ...movementForm, amountSoles: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl font-mono text-sm font-bold saas-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sustento / Observación
                </label>
                <input
                  type="text"
                  value={movementForm.description}
                  onChange={e => setMovementForm({ ...movementForm, description: e.target.value })}
                  placeholder="Ej. Vale autorizado de caja chica / 2h cierre inventario"
                  className="w-full px-3.5 py-2 rounded-xl text-sm saas-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsMovementOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Confirmar Movimiento
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
};
