import React, { useState, useEffect, useRef, useId } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { useHR, SHIFT_META } from '../../context/HRContext';
import { User } from '../../types/settings';
import { ToastContainer } from '../common/ToastContainer';
import {
  FileText,
  User as UserIcon,
  Cake,
  Calendar,
  DollarSign,
  Download,
  Printer,
  ShieldCheck,
  Store,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Search,
  ExternalLink,
  Receipt,
  Wallet,
  Building2,
  Phone,
  Mail,
  CreditCard,
  HeartPulse,
} from 'lucide-react';

interface PublicEmployeePortalProps {
  initialDni?: string;
  onClose?: () => void;
  lockToCurrentUser?: boolean;
}

export const PublicEmployeePortal: React.FC<PublicEmployeePortalProps> = ({
  initialDni = '',
  onClose,
  lockToCurrentUser,
}) => {
  const { customization, companyInfo, tenants, users, isDarkResolved } = useSettings();
  const { currentUser } = useRBAC();
  const {
    getEmployeeProfile,
    payrollMovements,
    todayRecords,
    weeklyShifts,
  } = useHR();

  const isRestrictedToSelf = lockToCurrentUser ?? (currentUser.roleId !== 'role-admin');

  const [dniQuery, setDniQuery] = useState(initialDni);
  const [selectedUser, setSelectedUser] = useState<User | null>(() => {
    if (isRestrictedToSelf) {
      return currentUser;
    }
    if (initialDni) {
      const match = users.find(u => u.pin === initialDni || u.id === initialDni);
      return match || currentUser || users[0] || null;
    }
    return currentUser || users[0] || null;
  });

  // Keep synced if currentUser changes (e.g. role simulator or switch operator)
  useEffect(() => {
    if (isRestrictedToSelf) {
      setSelectedUser(currentUser);
    }
  }, [currentUser, isRestrictedToSelf]);

  const [activeTab, setActiveTab] = useState<'voucher' | 'movements' | 'profile' | 'schedule'>('voucher');
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync if initialDni changes
  useEffect(() => {
    if (initialDni) {
      const match = users.find(u => u.pin === initialDni || u.id === initialDni);
      if (match) setSelectedUser(match);
    }
  }, [initialDni, users]);

  const profile = selectedUser ? getEmployeeProfile(selectedUser) : null;

  // Collaborator's branch
  const assignedBranch = selectedUser && selectedUser.branchIds && selectedUser.branchIds.length > 0 && selectedUser.branchIds[0] !== 'all'
    ? tenants.find(t => t.id === selectedUser.branchIds?.[0]) || tenants[0]
    : tenants[0];

  // Collaborator's movements
  const userMovements = selectedUser
    ? payrollMovements.filter(m => m.userId === selectedUser.id)
    : [];

  const additions = userMovements
    .filter(m => m.type === 'hora_extra' || m.type === 'bono_puntualidad')
    .reduce((s, m) => s + m.amountSoles, 0);

  const deductions = userMovements
    .filter(m => m.type === 'adelanto' || m.type === 'consumo_personal')
    .reduce((s, m) => s + m.amountSoles, 0);

  const baseSalary = profile?.baseSalarySoles || 0;
  const netPayable = baseSalary + additions - deductions;

  // Print voucher handler
  const handlePrint = () => {
    window.print();
  };

  const activeLogo = isDarkResolved
    ? customization.logoDark || customization.logoLight
    : customization.logoLight || customization.logoDark;

  return (
    <div
      className="min-h-dvh w-full erp-shell-surface text-zinc-900 dark:text-zinc-100 flex flex-col antialiased selection:bg-brand-500 selection:text-white"
      style={{ fontFamily: customization.fontFamily }}
    >
      {/* 1. TOP PUBLIC BRAND BAR (NON-PRINTABLE) */}
      <header className="print:hidden border-b border-zinc-200 dark:border-zinc-800 erp-canvas-surface px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl saas-btn-secondary text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white mr-1"
                title="Cerrar vista pública"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            {activeLogo ? (
              <img
                src={activeLogo}
                alt={customization.appName}
                className="h-9 w-9 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700 shadow-sm shrink-0"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                🍕
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-zinc-950 dark:text-white">
                  {customization.appName}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  Portal del Colaborador
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Consulta segura de Boletas, Vouchers y Registro de Pagos · RUC {companyInfo.taxId}
              </p>
            </div>
          </div>

          {/* Quick Collaborator Switcher / DNI Lookup (VISIBLE ONLY FOR ADMIN/MANAGERS; HIDDEN FOR REGULAR EMPLOYEES) */}
          {!isRestrictedToSelf && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por DNI o código..."
                  value={dniQuery}
                  onChange={e => {
                    const q = e.target.value;
                    setDniQuery(q);
                    const clean = q.replace(/\D/g, '');
                    if (clean) {
                      const match = users.find(u => u.pin.includes(clean));
                      if (match) setSelectedUser(match);
                    }
                  }}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs saas-input font-mono w-44 sm:w-56"
                />
              </div>

              <select
                aria-label="Seleccionar colaborador"
                value={selectedUser?.id || ''}
                onChange={e => {
                  const found = users.find(u => u.id === e.target.value);
                  if (found) setSelectedUser(found);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold saas-input max-w-[160px] sm:max-w-xs truncate"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.pin})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* 2. MAIN PORTAL BODY */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {selectedUser && profile ? (
          <>
            {/* COLLABORATOR HERO BADGE (NON-PRINTABLE) */}
            <div className="print:hidden saas-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <img
                  src={selectedUser.avatarUrl}
                  alt={selectedUser.name}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-zinc-300 dark:ring-zinc-700 shadow-md shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white">
                      {selectedUser.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold saas-subcard text-zinc-700 dark:text-zinc-300">
                      {profile.position}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>DNI / C.E.: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{selectedUser.pin}</strong></span>
                    <span>•</span>
                    <span>Sede: <strong className="text-zinc-800 dark:text-zinc-200">{assignedBranch.name.replace('Khalessi Pizza - ', '')}</strong></span>
                    <span>•</span>
                    <span>Contrato: <strong className="text-zinc-800 dark:text-zinc-200">{profile.contractType}</strong></span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pt-0.5">
                    <Cake className="h-3.5 w-3.5 text-pink-500" />
                    <span>Cumpleaños: <strong>{profile.birthday ? new Date(`${profile.birthday}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }) : 'No registrado'}</strong></span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md hover:opacity-95 active:scale-[0.98] transition-all whitespace-nowrap"
                  style={{ backgroundColor: customization.primaryColor }}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir / Descargar Voucher
                </button>
              </div>
            </div>

            {/* NAVIGATION TABS (NON-PRINTABLE) */}
            <div className="print:hidden border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'voucher' as const, label: 'Voucher Oficial de Pago', icon: Receipt },
                { id: 'movements' as const, label: `Registro de Pagos & Adelantos (${userMovements.length})`, icon: Wallet },
                { id: 'profile' as const, label: 'Datos Personales & Sanidad', icon: UserIcon },
                { id: 'schedule' as const, label: 'Mis Horarios de Turno', icon: Calendar },
              ].map(t => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all whitespace-nowrap ${
                      active
                        ? 'saas-card !rounded-xl text-zinc-950 dark:text-white font-bold shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={active ? { color: customization.primaryColor } : undefined} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* =====================================================================
                TAB 1: OFFICIAL PRINTABLE VOUCHER / BOLETA DE PAGO (PERÚ D.L. 728 / MYPE)
               ===================================================================== */}
            {(activeTab === 'voucher' || true) && (
              <div
                ref={printAreaRef}
                className={`${activeTab !== 'voucher' ? 'hidden print:block' : 'block'} saas-card !rounded-3xl p-6 sm:p-10 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:text-black bg-white dark:bg-[#18181c] print:bg-white`}
              >
                {/* VOUCHER HEADER */}
                <div className="border-b-2 border-zinc-900 dark:border-zinc-700 print:border-black pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {activeLogo ? (
                      <img
                        src={activeLogo}
                        alt={companyInfo.commercialName}
                        className="h-12 w-12 rounded-xl object-cover ring-1 ring-zinc-300 print:ring-0 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-xl">
                        🍕
                      </div>
                    )}
                    <div>
                      <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white print:text-black">
                        {companyInfo.legalName}
                      </h2>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-700 font-mono">
                        RUC: {companyInfo.taxId} · {companyInfo.address}
                      </p>
                      <p className="text-[11px] text-zinc-500 print:text-zinc-600">
                        Sede de Pago: {assignedBranch.name} · Serie: {assignedBranch.operations?.billingSeries || 'F001/B001'}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right border-l-2 sm:border-l-0 sm:border-r-0 border-orange-500 pl-3 sm:pl-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 print:text-zinc-600 block">
                      Comprobante Interno
                    </span>
                    <span className="text-base sm:text-lg font-mono font-bold text-zinc-950 dark:text-white print:text-black block">
                      VOUCHER DE REMUNERACIÓN
                    </span>
                    <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 print:text-zinc-700 block">
                      Periodo: {new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* EMPLOYEE FISCAL & PERSONAL DETAILS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl saas-subcard print:border print:border-zinc-300 print:bg-zinc-50 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 print:text-zinc-600 block">Colaborador</span>
                    <span className="font-bold text-zinc-950 dark:text-white print:text-black text-sm block">{selectedUser.name}</span>
                    <span className="text-zinc-500 font-mono">DNI: {selectedUser.pin}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 print:text-zinc-600 block">Puesto / Categoría</span>
                    <span className="font-bold text-zinc-950 dark:text-white print:text-black block">{profile.position}</span>
                    <span className="text-zinc-500">{profile.contractType}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 print:text-zinc-600 block">Fecha Cumpleaños</span>
                    <span className="font-bold text-zinc-950 dark:text-white print:text-black block">
                      {profile.birthday ? new Date(`${profile.birthday}T00:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : '18 de Abril de 1994'}
                    </span>
                    <span className="text-zinc-500">Ingreso: {profile.hireDate || '15/01/2024'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 print:text-zinc-600 block">Modalidad de Cobro</span>
                    <span className="font-bold text-zinc-950 dark:text-white print:text-black block font-mono text-[11px] truncate">
                      {profile.bankAccountInfo || `BCP Ahorros: 193-${selectedUser.pin}-0-11`}
                    </span>
                    <span className="text-zinc-500">Moneda: {companyInfo.currency}</span>
                  </div>
                </div>

                {/* VOUCHER BREAKDOWN TABLE (INGRESOS VS DESCUENTOS) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Ingresos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 print:text-emerald-800">
                        1. Ingresos y Haberes
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 print:text-emerald-800">
                        Monto (S/)
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60 print:border-zinc-200">
                        <span className="text-zinc-700 dark:text-zinc-300 print:text-black">
                          Sueldo / Jornal Base ({profile.contractType.split(' ')[0]})
                        </span>
                        <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 print:text-black">
                          S/ {baseSalary.toFixed(2)}
                        </span>
                      </div>

                      {userMovements
                        .filter(m => m.type === 'hora_extra' || m.type === 'bono_puntualidad')
                        .map(m => (
                          <div key={m.id} className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60 print:border-zinc-200">
                            <span className="text-zinc-700 dark:text-zinc-300 print:text-black">
                              {m.description} ({m.type === 'hora_extra' ? 'Sobretiempo' : 'Incentivo'})
                            </span>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                              + S/ {m.amountSoles.toFixed(2)}
                            </span>
                          </div>
                        ))}

                      {additions === 0 && (
                        <p className="text-[11px] text-zinc-400 italic py-1">Sin horas extra o bonos aplicados en el ciclo.</p>
                      )}
                    </div>

                    <div className="flex justify-between pt-2 border-t-2 border-zinc-200 dark:border-zinc-700 text-xs font-bold">
                      <span>Total Ingresos Brutos:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                        S/ {(baseSalary + additions).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Descuentos y Adelantos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 print:text-rose-800">
                        2. Descuentos y Adelantos
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400 print:text-rose-800">
                        Monto (S/)
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {userMovements
                        .filter(m => m.type === 'adelanto' || m.type === 'consumo_personal')
                        .map(m => (
                          <div key={m.id} className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60 print:border-zinc-200">
                            <span className="text-zinc-700 dark:text-zinc-300 print:text-black">
                              {m.description} ({m.date})
                            </span>
                            <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 print:text-rose-800">
                              − S/ {m.amountSoles.toFixed(2)}
                            </span>
                          </div>
                        ))}

                      {deductions === 0 && (
                        <p className="text-[11px] text-zinc-400 italic py-1">Sin adelantos ni consumos registrados en el ciclo.</p>
                      )}
                    </div>

                    <div className="flex justify-between pt-2 border-t-2 border-zinc-200 dark:border-zinc-700 text-xs font-bold">
                      <span>Total Descuentos:</span>
                      <span className="font-mono text-rose-600 dark:text-rose-400 print:text-rose-800">
                        − S/ {deductions.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NET PAYABLE BOX */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 text-white dark:bg-black/80 print:bg-zinc-100 print:text-black print:border print:border-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 print:text-zinc-600 block">
                      Neto a Percibir / Abonado a Cuenta
                    </span>
                    <span className="text-[11px] text-zinc-300 print:text-zinc-600">
                      Son: {Math.floor(netPayable)} con {Math.round((netPayable % 1) * 100)}/100 Soles
                    </span>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-white print:text-black">
                      S/ {netPayable.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* FUNCIONES ASIGNADAS AL PUESTO EN LA FICHA */}
                <div className="p-4 rounded-2xl saas-subcard print:border print:border-zinc-300 print:bg-white space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 print:text-black flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-orange-500" />
                    Funciones y Responsabilidades Operativas Asignadas ({profile.position})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {(profile.duties && profile.duties.length > 0
                      ? profile.duties
                      : [
                          'Amasado y fermentación de masa madre 48h.',
                          'Control de temperatura y cocción en horno de piedra.',
                          'Cumplimiento de estándares de inocuidad y manipulación BPM.',
                        ]
                    ).map((duty, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                        <span className="text-zinc-700 dark:text-zinc-300 print:text-zinc-900 leading-snug">
                          {duty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SIGNATURES FOOTER */}
                <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
                  <div className="border-t border-zinc-400 dark:border-zinc-600 print:border-black pt-2">
                    <p className="font-bold text-zinc-900 dark:text-white print:text-black">
                      {companyInfo.legalName}
                    </p>
                    <p className="text-[11px] text-zinc-500 print:text-zinc-600">
                      Empleador / Administración RR.HH.
                    </p>
                  </div>

                  <div className="border-t border-zinc-400 dark:border-zinc-600 print:border-black pt-2">
                    <p className="font-bold text-zinc-900 dark:text-white print:text-black">
                      {selectedUser.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 print:text-zinc-600">
                      Firma de Conformidad del Colaborador (DNI: {selectedUser.pin})
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 2: REGISTRO DE PAGOS & HISTORIAL DE MOVIMIENTOS
               ===================================================================== */}
            {activeTab === 'movements' && (
              <div className="saas-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                      Historial Detallado de Pagos, Vales y Horas Extra
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Transparencia total de cada concepto abonado o descontado en planilla.
                    </p>
                  </div>
                </div>

                {userMovements.length === 0 ? (
                  <div className="p-8 text-center saas-subcard rounded-2xl text-zinc-500 text-sm">
                    No se registran adelantos ni descuentos extraordinarios para este colaborador.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {userMovements.map(mov => {
                      const isPositive = mov.type === 'hora_extra' || mov.type === 'bono_puntualidad';
                      return (
                        <div key={mov.id} className="py-3.5 flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 block">
                              {mov.type.replace('_', ' ')} · {mov.description}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-mono">
                              Fecha: {mov.date} · Registrado por {mov.registeredBy}
                            </span>
                          </div>
                          <span
                            className={`font-mono text-sm font-bold ${
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isPositive ? '+' : '−'} S/ {mov.amountSoles.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                TAB 3: DATOS PERSONALES & SANIDAD
               ===================================================================== */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="saas-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-orange-500" />
                    Información Personal & Contacto
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Nombre Completo:</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">{selectedUser.name}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Documento / PIN:</span>
                      <span className="font-mono font-semibold">{selectedUser.pin}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Fecha de Cumpleaños:</span>
                      <span className="font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                        <Cake className="h-3.5 w-3.5" />
                        {profile.birthday ? new Date(`${profile.birthday}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : '18 de Abril de 1994'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Teléfono Personal:</span>
                      <span className="font-semibold">{selectedUser.phone}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Correo Electrónico:</span>
                      <span className="font-semibold">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Contacto de Emergencia:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">{profile.emergencyContact}</span>
                    </div>
                  </div>
                </div>

                <div className="saas-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-emerald-500" />
                    Sanidad y Cumplimiento Normativo
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Carnet de Sanidad N°:</span>
                      <span className="font-mono font-semibold">{profile.healthCardNumber}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Vencimiento Carnet:</span>
                      <span className="font-mono font-semibold">{profile.healthCardExpiry}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Cuenta de Abono:</span>
                      <span className="font-mono font-semibold">{profile.bankAccountInfo || 'BCP Soles'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Hora Programada de Entrada:</span>
                      <span className="font-mono font-semibold">{profile.scheduledEntryTime} (Tolerancia: {profile.toleranceMinutes}m)</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500">Exigir Asistencia para Entrar al ERP:</span>
                      <span className="font-semibold">{profile.requiresAttendanceToLogin ? 'Sí (Obligatorio)' : 'Exento'}</span>
                    </div>
                  </div>
                </div>

                {/* TARJETA COMPLETA DE FUNCIONES Y RESPONSABILIDADES EN PERFIL */}
                <div className="md:col-span-2 saas-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500" />
                    Funciones y Procedimientos del Cargo ({profile.position})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {(profile.duties && profile.duties.length > 0
                      ? profile.duties
                      : [
                          'Amasado y fermentación de masa madre 48h.',
                          'Control de temperatura de horneado en piedra (415°C a 435°C).',
                          'Cumplimiento de estándares de inocuidad y manipulación BPM.',
                        ]
                    ).map((duty, idx) => (
                      <div key={idx} className="p-3 rounded-xl saas-subcard flex items-start gap-2.5">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400 font-mono font-bold text-[11px] shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {duty}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 4: MIS HORARIOS DE TURNO
               ===================================================================== */}
            {activeTab === 'schedule' && (
              <div className="saas-card p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Programación Semanal de Turnos
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Horarios asignados en sede principal y turnos de apoyo multisucursal.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {[
                    { idx: 0, day: 'Lunes' },
                    { idx: 1, day: 'Martes' },
                    { idx: 2, day: 'Miércoles' },
                    { idx: 3, day: 'Jueves' },
                    { idx: 4, day: 'Viernes' },
                    { idx: 5, day: 'Sábado' },
                    { idx: 6, day: 'Domingo' },
                  ].map(d => {
                    const shift = weeklyShifts.find(s => s.userId === selectedUser.id && s.dayIndex === d.idx);
                    const shiftType = shift?.shiftType || 'punta_noche';
                    const meta = SHIFT_META[shiftType];
                    return (
                      <div key={d.idx} className={`p-3 rounded-2xl border ${meta.badgeClass} space-y-1`}>
                        <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">{d.day}</span>
                        <span className="text-xs font-bold block">{meta.label}</span>
                        <span className="text-[11px] font-mono block">{shift?.hoursLabel || meta.hours}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center saas-card rounded-3xl space-y-2">
            <UserIcon className="h-10 w-10 mx-auto text-zinc-400" />
            <p className="text-base font-bold text-zinc-950 dark:text-white">Colaborador no encontrado</p>
            <p className="text-xs text-zinc-500">Ingresa un DNI o código válido en el buscador superior.</p>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="print:hidden border-t border-zinc-200 dark:border-zinc-800 py-4 px-6 text-center text-xs text-zinc-500">
        Portal del Colaborador · {companyInfo.legalName} · Generado automáticamente por Pizza Khalessi ERP
      </footer>

      <ToastContainer />
    </div>
  );
};
