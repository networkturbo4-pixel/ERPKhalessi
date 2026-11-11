import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { User } from '../types/settings';
import {
  EmployeeHRProfile,
  AttendanceRecord,
  AttendanceEventType,
  AttendanceMethod,
  WeeklyShiftAssignment,
  ShiftType,
  PayrollMovement,
  HRSecurityPolicy,
  HRPosition,
  ContractType,
  JobPostingFormConfig,
  JobApplication,
  ApplicantStatus,
} from '../types/hr';
import { useSettings } from './SettingsContext';
import { generateTotpSecret, verifyTotpCode } from '../utils/totp';

const HR_STORAGE_KEY = 'khalessi_erp_hr_v1';

export function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalTimeFormatted(): string {
  return new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function addDaysIso(daysOffset: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysOffset);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function inferDefaultPosition(user: User): {
  position: HRPosition;
  contractType: ContractType;
  salary: number;
  entryTime: string;
} {
  if (user.roleId === 'role-admin') {
    return {
      position: 'Dirección General',
      contractType: 'Planilla MYPE / General',
      salary: 5500,
      entryTime: '09:30',
    };
  }
  if (user.roleId === 'role-manager') {
    return {
      position: 'Gerente de Local',
      contractType: 'Planilla MYPE / General',
      salary: 3200,
      entryTime: '11:30',
    };
  }
  if (user.roleId === 'role-kitchen') {
    return {
      position: 'Maestro Pizzero',
      contractType: 'Planilla MYPE / General',
      salary: 2650,
      entryTime: '11:30',
    };
  }
  if (user.roleId === 'role-cashier') {
    return {
      position: 'Cajero POS',
      contractType: 'Part-Time (Medio Tiempo)',
      salary: 1450,
      entryTime: '16:30',
    };
  }
  return {
    position: 'Atención Salón',
    contractType: 'Por Turno / Jornal',
    salary: 1600,
    entryTime: '12:00',
  };
}

function createDefaultProfileForUser(user: User, index: number): EmployeeHRProfile {
  const defaults = inferDefaultPosition(user);
  // Give realistic staggered Carnet de Sanidad expirations (healthy, expiring soon, expired) for demo visibility
  const expiryOffsets = [165, 18, -6, 92, 14, 120];
  const offset = expiryOffsets[index % expiryOffsets.length];
  const isDriver = user.roleName.toLowerCase().includes('motorizado') || user.roleName.toLowerCase().includes('delivery');

  // Realistic birthdays and bank info
  const birthdays = ['1994-04-18', '1998-08-25', '1992-11-12', '2001-02-03', '1996-07-30'];
  const birthday = birthdays[index % birthdays.length];

  return {
    userId: user.id,
    position: defaults.position,
    contractType: defaults.contractType,
    baseSalarySoles: defaults.salary,
    scheduledEntryTime: defaults.entryTime,
    toleranceMinutes: 10,
    healthCardNumber: `CS-LIM-${202600 + index + 11}`,
    healthCardExpiry: addDaysIso(offset),
    isDriver,
    driverLicense: isDriver ? `Q${user.pin.slice(0, 7)}` : undefined,
    soatExpiry: isDriver ? addDaysIso(45) : undefined,
    emergencyContact: '+51 998 410 220 (Familiar Directo)',
    requiresAttendanceToLogin: user.roleId !== 'role-admin',
    totpEnabled: true,
    personalTotpSecret: generateTotpSecret(16),
    birthday,
    hireDate: '2024-01-15',
    bankAccountInfo: `BCP Ahorros: 193-${user.pin}1-0-22 (CCI: 002-193-${user.pin}1022-19)`,
    portalAccessToken: `khalessi-${user.pin}-${user.id}`,
    duties: DEFAULT_POSITION_DUTIES[defaults.position] || [],
  };
}

export const DEFAULT_POSITION_DUTIES: Record<HRPosition, string[]> = {
  'Maestro Pizzero': [
    'Amasado, hidratación al 65% y fermentación lenta de masa madre (48 horas).',
    'Estirado manual a mano sin rodillo respetando el cornicione (borde aireado).',
    'Control estricto de temperatura de horneado en piedra (415°C a 435°C).',
    'Revisión diaria de mermas de insumos críticos: Fior di Latte, salsa San Marzano y albahaca.',
    'Limpieza profunda, desinfección y raspado de solera del horno al término del turno.',
  ],
  'Hornero & Masa': [
    'Encendido, precalentamiento y mantenimiento de refractarios del horno de piedra.',
    'Giro y rotación periódica de las pizzas dentro de la cámara para cocción homogénea.',
    'Control de tiempos de comanda KDS procurando despacho menor a 11 minutos.',
    'Apoyo directo al Maestro Pizzero en boleado y reposo de masas.',
    'Monitoreo de termocuplas y ductos de extracción de humos.',
  ],
  'Cajero POS': [
    'Apertura, verificación de fondo de sencillo y arqueo ciego de caja registradora.',
    'Recepción ágil de comandas en mostrador, salón y pedidos delivery.',
    'Cobro exacto mediante efectivo, POS bancario y billeteras digitales (Yape / Plin).',
    'Emisión de boletas y facturas electrónicas asegurando la serie correcta de la sucursal.',
    'Custodia de comprobantes y entrega de balance de caja a gerencia al cierre.',
  ],
  'Atención Salón': [
    'Recepción cordial de comensales y asignación de mesas en salón o terraza.',
    'Explicación de promociones, maridajes sugeridos y carta artesanal.',
    'Servicio ágil de pizzas y bebidas manteniendo mesas limpias y desinfectadas.',
    'Coordinación directa con cocina para requerimientos dietéticos o alérgenos.',
    'Entrega de precuentas y despedida cálida asegurando la satisfacción del cliente.',
  ],
  'Motorizado Propio': [
    'Inspección diaria de motocicleta (frenos, presión de llantas, luces y combustible).',
    'Portar SOAT vigente y Brevete clase B-II en cada recorrido.',
    'Uso de mochila térmica homologada asegurando que las cajas viajen niveladas.',
    'Entrega puntual en destino siguiendo rutas optimizadas y protocolos de seguridad.',
    'Cobro contraentrega en efectivo o POS portátil y liquidación inmediata en caja.',
  ],
  'Gerente de Local': [
    'Supervisión integral de apertura, operación continua y cierre de la sucursal.',
    'Control diario de asistencia, puntualidad y cumplimiento del reglamento interno.',
    'Gestión de inventarios, compras de emergencia de caja chica y recepción de guías.',
    'Asegurar el cumplimiento de estándares sanitarios (BPM) y carnets de sanidad.',
    'Análisis de ventas por hora frente a la meta diaria asignada.',
  ],
  'Dirección General': [
    'Planificación estratégica y expansión de la cadena de pizzerías.',
    'Supervisión financiera consolidada, rentabilidad y gobierno corporativo.',
    'Aprobación de políticas salariales, matriz RBAC y Design System.',
    'Relación institucional con entidades regulatorias y auditoría general.',
  ],
};

export const SHIFT_META: Record<
  ShiftType,
  { label: string; short: string; hours: string; badgeClass: string }
> = {
  apertura: {
    label: 'Apertura & Masa',
    short: 'Apertura',
    hours: '11:00 - 19:00',
    badgeClass:
      'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  },
  tarde: {
    label: 'Turno Intermedio',
    short: 'Tarde',
    hours: '14:00 - 22:00',
    badgeClass:
      'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
  },
  punta_noche: {
    label: 'Punta Horno / Cierre',
    short: 'Punta Noche',
    hours: '17:00 - 23:45',
    badgeClass:
      'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
  },
  descanso: {
    label: 'Día Libre / Descanso',
    short: 'Descanso',
    hours: 'Libre',
    badgeClass:
      'bg-zinc-200/80 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700',
  },
};

const DEFAULT_SECURITY_POLICY: HRSecurityPolicy = {
  enforceAttendanceToLogin: true,
  exemptSuperAdmin: true,
  allowPersonalTotpUnlock: true,
  allowMasterTotpUnlock: true,
  masterTotpSecret: 'JBSWY3DPEHPK3PXP', // Standard RFC Base32 seed (rotatable in 1 click)
  masterTotpAccount: 'Llave Maestra Supervisión',
  biometricDeviceName: 'ZKTeco SpeedFace-V5L (Red Multisucursal)',
};

export const DEFAULT_JOB_POSTINGS: JobPostingFormConfig[] = [
  {
    id: 'post-pizzero',
    positionTitle: 'Maestro Pizzero',
    department: 'Cocina & Horno',
    modality: 'Planilla MYPE / General',
    salaryRange: 'S/ 2,400 – S/ 2,900 + Bonos',
    description: 'Elaboración de masa madre 48h, estirado manual napolitano y dominio de horno a la leña/piedra.',
    isActive: true,
    branchIds: ['all'],
    fields: [
      {
        id: 'fld-exp-masa',
        label: 'Años de experiencia en pizzería o panadería artesanal',
        type: 'select',
        required: true,
        options: ['Menos de 1 año', '1 a 2 años', '3 a 5 años', 'Más de 5 años'],
      },
      {
        id: 'fld-horno',
        label: '¿Qué tipos de horno dominas?',
        type: 'select',
        required: true,
        options: ['Horno a la Leña / Piedra', 'Horno de Piso a Gas', 'Horno Rotativo / Cinta', 'En aprendizaje'],
      },
      {
        id: 'fld-sanidad',
        label: '¿Cuentas con Carnet de Sanidad vigente de Manipulación de Alimentos?',
        type: 'checkbox',
        required: false,
        helperText: 'Marca la casilla si tu carnet está vigente o en trámite.',
      },
      {
        id: 'fld-especialidad',
        label: 'Cuéntanos brevemente tu experiencia preparando masas e insumos',
        type: 'textarea',
        placeholder: 'Ej: Trabajé 3 años preparando masa napolitana 65% hidratación...',
        required: true,
      },
    ],
  },
  {
    id: 'post-motorizado',
    positionTitle: 'Motorizado Propio',
    department: 'Logística & Delivery',
    modality: 'Por Turno / Jornal',
    salaryRange: 'S/ 1,600 + Comisión por Pedido + Gasolina',
    description: 'Reparto ágil y seguro de pedidos calientes en nuestras zonas de cobertura con moto propia.',
    isActive: true,
    branchIds: ['all'],
    fields: [
      {
        id: 'fld-brevete',
        label: 'Número de Licencia de Conducir (Clase B-II)',
        type: 'text',
        placeholder: 'Ej: Q45891203',
        required: true,
      },
      {
        id: 'fld-placa',
        label: 'Placa y Modelo de Motocicleta',
        type: 'text',
        placeholder: 'Ej: Honda CB125F — Placa 4582-AB',
        required: true,
      },
      {
        id: 'fld-soat',
        label: 'Fecha de vencimiento de tu SOAT vigente',
        type: 'date',
        required: true,
      },
      {
        id: 'fld-zonas',
        label: 'Distritos de reparto que conoces a la perfección',
        type: 'text',
        placeholder: 'Ej: Surco, Miraflores, San Borja, San Isidro',
        required: true,
      },
    ],
  },
  {
    id: 'post-cajero',
    positionTitle: 'Cajero POS & Atención',
    department: 'Salón & Operaciones',
    modality: 'Part-Time (Medio Tiempo)',
    salaryRange: 'S/ 1,350 – S/ 1,650',
    description: 'Atención cordial en mostrador, recepción de pedidos web/WhatsApp, arqueo de caja y cobros QR.',
    isActive: true,
    branchIds: ['all'],
    fields: [
      {
        id: 'fld-exp-caja',
        label: 'Experiencia previa en manejo de Caja POS y Billeteras (Yape/Plin)',
        type: 'select',
        required: true,
        options: ['Sin experiencia (aprendizaje rápido)', '6 meses a 1 año', '1 a 3 años', 'Más de 3 años'],
      },
      {
        id: 'fld-turno-disp',
        label: 'Disponibilidad de Turno Preferida',
        type: 'select',
        required: true,
        options: ['Turno Apertura (11:00 - 19:00)', 'Turno Punta Noche (17:00 - Cierre)', 'Fines de Semana', 'Disponibilidad Completa'],
      },
      {
        id: 'fld-presentacion',
        label: '¿Por qué te gustaría sumarte al equipo de Pizza Khalessi?',
        type: 'textarea',
        placeholder: 'Cuéntanos sobre tu actitud de servicio al cliente...',
        required: true,
      },
    ],
  },
  {
    id: 'post-salon',
    positionTitle: 'Atención Salón (Anfitrión / Mesero)',
    department: 'Salón & Experiencia',
    modality: 'Planilla MYPE / General',
    salaryRange: 'S/ 1,500 + Propinas y Bonos',
    description: 'Servicio cálido en mesa, recomendación de maridajes y cuidado impecable del salón.',
    isActive: true,
    branchIds: ['all'],
    fields: [
      {
        id: 'fld-exp-rest',
        label: 'Experiencia en restaurantes o cafeterías',
        type: 'select',
        required: true,
        options: ['Primera experiencia', '1 año en restaurantes', '2+ años en atención gastronómica'],
      },
      {
        id: 'fld-idiomas',
        label: '¿Hablas inglés básico/intermedio para atención a turistas?',
        type: 'checkbox',
        required: false,
      },
    ],
  },
];

const DEFAULT_JOB_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-seed-1',
    applicationCode: 'POST-2026-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    postingId: 'post-pizzero',
    positionTitle: 'Maestro Pizzero',
    branchId: 'tenant-1',
    branchName: 'Matriz Surco',
    fullName: 'Marco Antonio Bellido',
    documentType: 'DNI',
    documentNumber: '70482915',
    phone: '+51 982 410 551',
    email: 'mbellido.pizzaiolo@gmail.com',
    districtOrAddress: 'Chorrillos, Lima',
    availability: 'Inmediata — Tiempo Completo',
    cvLinkOrSummary: 'https://linkedin.com/in/marcobellido-pizzaiolo',
    answers: [
      { fieldId: 'fld-exp-masa', label: 'Años de experiencia en pizzería o panadería artesanal', value: '3 a 5 años' },
      { fieldId: 'fld-horno', label: '¿Qué tipos de horno dominas?', value: 'Horno a la Leña / Piedra' },
      { fieldId: 'fld-sanidad', label: '¿Cuentas con Carnet de Sanidad vigente de Manipulación de Alimentos?', value: 'Sí' },
      { fieldId: 'fld-especialidad', label: 'Cuéntanos brevemente tu experiencia preparando masas e insumos', value: 'Especialista en fermentación poolish y biga 48h, manejo de temperatura 430°C en horno napolitano.' },
    ],
    status: 'entrevista',
    hrNotes: 'Excelente perfil técnico. Programar prueba práctica de estirado en Surco.',
  },
  {
    id: 'app-seed-2',
    applicationCode: 'POST-2026-002',
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    postingId: 'post-motorizado',
    positionTitle: 'Motorizado Propio',
    branchId: 'tenant-2',
    branchName: 'Sede Miraflores',
    fullName: 'Kevin Josué Paredes',
    documentType: 'DNI',
    documentNumber: '74119208',
    phone: '+51 991 330 218',
    email: 'kparedes.moto@correo.pe',
    districtOrAddress: 'Surquillo, Lima',
    availability: 'Turno Noche / Fines de Semana',
    answers: [
      { fieldId: 'fld-brevete', label: 'Número de Licencia de Conducir (Clase B-II)', value: 'Q74119208' },
      { fieldId: 'fld-placa', label: 'Placa y Modelo de Motocicleta', value: 'Yamaha FZ 150 — Placa 8914-KC' },
      { fieldId: 'fld-soat', label: 'Fecha de vencimiento de tu SOAT vigente', value: '2027-04-15' },
      { fieldId: 'fld-zonas', label: 'Distritos de reparto que conoces a la perfección', value: 'Miraflores, San Isidro, Surquillo, Barranco' },
    ],
    status: 'nuevo',
  },
];

interface PersistedHRData {
  profiles: Record<string, EmployeeHRProfile>;
  attendanceRecords: AttendanceRecord[];
  weeklyShifts: WeeklyShiftAssignment[];
  payrollMovements: PayrollMovement[];
  securityPolicy: HRSecurityPolicy;
  jobPostings?: JobPostingFormConfig[];
  jobApplications?: JobApplication[];
}

interface HRContextType {
  profiles: Record<string, EmployeeHRProfile>;
  getEmployeeProfile: (user: User) => EmployeeHRProfile;
  updateEmployeeProfile: (userId: string, partial: Partial<EmployeeHRProfile>) => void;
  regenerateEmployeeTotpSecret: (userId: string) => string;

  attendanceRecords: AttendanceRecord[];
  todayRecords: AttendanceRecord[];
  hasActiveAttendanceToday: (userId: string) => boolean;
  getTodayRecordForUser: (userId: string) => AttendanceRecord | undefined;

  shouldGateLoginByAttendance: (user: User) => {
    gated: boolean;
    reason?: string;
    profile: EmployeeHRProfile;
  };

  clockAttendance: (params: {
    codeOrUserId: string;
    eventType: AttendanceEventType;
    method: AttendanceMethod;
    branchId?: string;
  }) => { ok: boolean; message: string; record?: AttendanceRecord };

  simulateBiometricPunchForUser: (userId: string, branchId?: string) => void;
  clearTodayAttendanceForUser: (userId: string) => void;

  verifyGoogleAuthenticatorUnlock: (
    targetUser: User,
    sixDigitCode: string
  ) => Promise<{ ok: boolean; error?: string; matchedSource?: 'master' | 'personal' }>;

  weeklyShifts: WeeklyShiftAssignment[];
  upsertShiftAssignment: (params: {
    userId: string;
    branchId: string;
    dayIndex: number;
    shiftType: ShiftType;
    hoursLabel?: string;
    isSupportCover?: boolean;
  }) => void;

  payrollMovements: PayrollMovement[];
  addPayrollMovement: (movement: Omit<PayrollMovement, 'id' | 'registeredBy'>) => void;
  deletePayrollMovement: (movementId: string) => void;

  securityPolicy: HRSecurityPolicy;
  updateSecurityPolicy: (partial: Partial<HRSecurityPolicy>) => void;
  regenerateMasterTotpSecret: () => string;

  // Postulantes & Constructor de Formularios por Puesto
  jobPostings: JobPostingFormConfig[];
  saveJobPosting: (posting: JobPostingFormConfig) => void;
  deleteJobPosting: (postingId: string) => void;
  jobApplications: JobApplication[];
  submitJobApplication: (
    application: Omit<JobApplication, 'id' | 'applicationCode' | 'createdAt' | 'status'>
  ) => JobApplication;
  updateJobApplication: (
    applicationId: string,
    partial: { status?: ApplicantStatus; hrNotes?: string }
  ) => void;
  deleteJobApplication: (applicationId: string) => void;
}

const HRContext = createContext<HRContextType | undefined>(undefined);

function loadPersistedHR(): PersistedHRData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      profiles: parsed.profiles || {},
      attendanceRecords: Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : [],
      weeklyShifts: Array.isArray(parsed.weeklyShifts) ? parsed.weeklyShifts : [],
      payrollMovements: Array.isArray(parsed.payrollMovements) ? parsed.payrollMovements : [],
      securityPolicy: {
        ...DEFAULT_SECURITY_POLICY,
        ...(parsed.securityPolicy || {}),
      },
      jobPostings: Array.isArray(parsed.jobPostings) && parsed.jobPostings.length > 0 ? parsed.jobPostings : undefined,
      jobApplications: Array.isArray(parsed.jobApplications) ? parsed.jobApplications : undefined,
    };
  } catch {
    return null;
  }
}

export const HRProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    users,
    tenants,
    activeTenant,
    dispatchToast,
    openNoticeModal,
    logAuditEvent,
  } = useSettings();

  const saved = useMemo(() => loadPersistedHR(), []);

  const [profiles, setProfiles] = useState<Record<string, EmployeeHRProfile>>(() => {
    const base: Record<string, EmployeeHRProfile> = { ...(saved?.profiles || {}) };
    users.forEach((u, idx) => {
      if (!base[u.id]) {
        base[u.id] = createDefaultProfileForUser(u, idx);
      }
    });
    return base;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    if (saved && saved.attendanceRecords.length > 0) {
      return saved.attendanceRecords;
    }
    // Seed 1 realistic biometric morning check-in on the last kitchen/staff user so the board looks alive,
    // while keeping other non-admin users un-clocked today so Attendance-Gated Login can be tested immediately!
    const today = getLocalTodayIso();
    const firstBranch = tenants[0];
    const sampleCook = users.find(u => u.roleId === 'role-kitchen') || users[users.length - 1];
    if (sampleCook && sampleCook.roleId !== 'role-admin' && firstBranch) {
      return [
        {
          id: `att-seed-${today}`,
          userId: sampleCook.id,
          userName: sampleCook.name,
          credentialCode: sampleCook.pin,
          branchId: firstBranch.id,
          branchName: firstBranch.name.replace('Khalessi Pizza - ', ''),
          date: today,
          scheduledEntryTime: '11:30',
          checkInTime: '11:26:14',
          method: 'biometric',
          status: 'puntual',
          lateMinutes: 0,
          notes: 'Huella verificada en terminal ZKTeco de ingreso',
        },
      ];
    }
    return [];
  });

  const [weeklyShifts, setWeeklyShifts] = useState<WeeklyShiftAssignment[]>(() => {
    if (saved && saved.weeklyShifts.length > 0) {
      return saved.weeklyShifts;
    }
    const seeded: WeeklyShiftAssignment[] = [];
    const pattern: ShiftType[] = [
      'apertura',
      'apertura',
      'tarde',
      'punta_noche',
      'punta_noche',
      'punta_noche',
      'descanso',
    ];
    users.forEach((u, uIdx) => {
      const assignedBranchId =
        u.branchIds && !u.branchIds.includes('all') && u.branchIds[0]
          ? tenants.some(t => t.id === u.branchIds?.[0])
            ? u.branchIds[0]
            : tenants[uIdx % tenants.length]?.id
          : tenants[uIdx % Math.max(1, tenants.length)]?.id;

      if (!assignedBranchId) return;

      for (let day = 0; day < 7; day += 1) {
        const shiftType = pattern[(day + uIdx) % pattern.length];
        seeded.push({
          id: `shf-${u.id}-${day}`,
          userId: u.id,
          branchId: assignedBranchId,
          dayIndex: day,
          shiftType,
          hoursLabel: SHIFT_META[shiftType].hours,
          isSupportCover: false,
        });
      }
    });
    return seeded;
  });

  const [payrollMovements, setPayrollMovements] = useState<PayrollMovement[]>(() => {
    if (saved && saved.payrollMovements.length > 0) {
      return saved.payrollMovements;
    }
    const seededMovements: PayrollMovement[] = [];
    const staffSample = users.filter(u => u.roleId !== 'role-admin').slice(0, 3);
    const today = getLocalTodayIso();
    if (staffSample[0] && tenants[0]) {
      seededMovements.push({
        id: 'pay-seed-1',
        userId: staffSample[0].id,
        branchId: tenants[0].id,
        date: today,
        type: 'bono_puntualidad',
        amountSoles: 120,
        description: 'Bono meta de despacho horno < 11 min',
        registeredBy: 'Dirección General',
      });
    }
    if (staffSample[1] && tenants[0]) {
      seededMovements.push({
        id: 'pay-seed-2',
        userId: staffSample[1].id,
        branchId: tenants[Math.min(1, tenants.length - 1)].id,
        date: today,
        type: 'adelanto',
        amountSoles: 150,
        description: 'Adelanto quincenal autorizado por gerencia',
        registeredBy: 'Dirección General',
      });
    }
    if (staffSample[2] && tenants[0]) {
      seededMovements.push({
        id: 'pay-seed-3',
        userId: staffSample[2].id,
        branchId: tenants[0].id,
        date: today,
        type: 'hora_extra',
        amountSoles: 65,
        description: '2.5 horas extra cierre inventario cámara de frío',
        registeredBy: 'Dirección General',
      });
    }
    return seededMovements;
  });

  const [securityPolicy, setSecurityPolicy] = useState<HRSecurityPolicy>(
    saved?.securityPolicy || DEFAULT_SECURITY_POLICY
  );

  const [jobPostings, setJobPostings] = useState<JobPostingFormConfig[]>(
    saved?.jobPostings || DEFAULT_JOB_POSTINGS
  );

  const [jobApplications, setJobApplications] = useState<JobApplication[]>(
    saved?.jobApplications || DEFAULT_JOB_APPLICATIONS
  );

  // Sync HR profiles whenever new users are created in Settings -> Usuarios
  useEffect(() => {
    setProfiles(prev => {
      let changed = false;
      const next = { ...prev };
      users.forEach((u, idx) => {
        if (!next[u.id]) {
          next[u.id] = createDefaultProfileForUser(u, idx);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [users]);

  // Persist HR state immediately so F5 reload never loses data
  useEffect(() => {
    try {
      const payload: PersistedHRData = {
        profiles,
        attendanceRecords,
        weeklyShifts,
        payrollMovements,
        securityPolicy,
        jobPostings,
        jobApplications,
      };
      localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [profiles, attendanceRecords, weeklyShifts, payrollMovements, securityPolicy, jobPostings, jobApplications]);

  // Real-time cross-device HR sync (attendance punches, job applications, shifts)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== HR_STORAGE_KEY) return;
      const fresh = loadPersistedHR();
      if (!fresh) return;
      setProfiles(fresh.profiles);
      setAttendanceRecords(fresh.attendanceRecords);
      setWeeklyShifts(fresh.weeklyShifts);
      setPayrollMovements(fresh.payrollMovements);
      setSecurityPolicy(fresh.securityPolicy);
      if (fresh.jobPostings) setJobPostings(fresh.jobPostings);
      if (fresh.jobApplications) setJobApplications(fresh.jobApplications);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const getEmployeeProfile = (user: User): EmployeeHRProfile => {
    return profiles[user.id] || createDefaultProfileForUser(user, 0);
  };

  const updateEmployeeProfile = (userId: string, partial: Partial<EmployeeHRProfile>) => {
    const targetUser = users.find(u => u.id === userId);
    setProfiles(prev => {
      const current = prev[userId] || (targetUser ? createDefaultProfileForUser(targetUser, 0) : undefined);
      if (!current) return prev;
      return {
        ...prev,
        [userId]: { ...current, ...partial },
      };
    });
    if (targetUser) {
      logAuditEvent(
        'hr',
        'info',
        'Actualización de Legajo RR.HH.',
        `Legajo laboral/sanitario actualizado para ${targetUser.name}.`
      );
      dispatchToast('Legajo Guardado', `Datos laborales de ${targetUser.name} sincronizados.`, 'success');
    }
  };

  const regenerateEmployeeTotpSecret = (userId: string): string => {
    const nextSecret = generateTotpSecret(16);
    updateEmployeeProfile(userId, { personalTotpSecret: nextSecret, totpEnabled: true });
    return nextSecret;
  };

  const todayIso = getLocalTodayIso();
  const todayRecords = useMemo(
    () => attendanceRecords.filter(r => r.date === todayIso),
    [attendanceRecords, todayIso]
  );

  const getTodayRecordForUser = (userId: string): AttendanceRecord | undefined => {
    return attendanceRecords.find(r => r.userId === userId && r.date === getLocalTodayIso());
  };

  const hasActiveAttendanceToday = (userId: string): boolean => {
    const rec = getTodayRecordForUser(userId);
    if (!rec) return false;
    return Boolean(rec.checkInTime);
  };

  const shouldGateLoginByAttendance = (
    user: User
  ): { gated: boolean; reason?: string; profile: EmployeeHRProfile } => {
    const profile = getEmployeeProfile(user);

    if (!securityPolicy.enforceAttendanceToLogin) {
      return { gated: false, profile };
    }

    if (user.roleId === 'role-admin' && securityPolicy.exemptSuperAdmin) {
      return { gated: false, profile };
    }

    if (!profile.requiresAttendanceToLogin) {
      return { gated: false, profile };
    }

    if (hasActiveAttendanceToday(user.id)) {
      return { gated: false, profile };
    }

    return {
      gated: true,
      reason:
        'No registramos tu marcación de entrada hoy en el Reloj Biométrico ni en Asistencia de Tienda.',
      profile,
    };
  };

  const clockAttendance = (params: {
    codeOrUserId: string;
    eventType: AttendanceEventType;
    method: AttendanceMethod;
    branchId?: string;
  }): { ok: boolean; message: string; record?: AttendanceRecord } => {
    const cleanInput = params.codeOrUserId.trim();
    const matchedUser =
      users.find(u => u.id === cleanInput) ||
      users.find(u => u.pin === cleanInput.replace(/\D/g, ''));

    if (!matchedUser) {
      return {
        ok: false,
        message: 'No se encontró ningún colaborador con ese DNI / código numérico.',
      };
    }

    if (matchedUser.status === 'suspended') {
      return {
        ok: false,
        message: `El colaborador ${matchedUser.name} tiene el acceso suspendido.`,
      };
    }

    const resolvedBranch =
      tenants.find(t => t.id === params.branchId) ||
      (matchedUser.branchIds && !matchedUser.branchIds.includes('all')
        ? tenants.find(t => t.id === matchedUser.branchIds?.[0])
        : undefined) ||
      activeTenant;

    const branchShortName = resolvedBranch.name.replace('Khalessi Pizza - ', '');
    const today = getLocalTodayIso();
    const nowTime = getLocalTimeFormatted();
    const profile = getEmployeeProfile(matchedUser);
    const existing = attendanceRecords.find(
      r => r.userId === matchedUser.id && r.date === today
    );

    if (params.eventType === 'check_in') {
      if (existing?.checkInTime) {
        return {
          ok: true,
          message: `${matchedUser.name} ya cuenta con entrada registrada hoy a las ${existing.checkInTime}.`,
          record: existing,
        };
      }

      // Compute punctuality against scheduledEntryTime + tolerance
      const [schedH, schedM] = (profile.scheduledEntryTime || '12:00')
        .split(':')
        .map(n => parseInt(n, 10) || 0);
      const now = new Date();
      const nowTotalMin = now.getHours() * 60 + now.getMinutes();
      const schedTotalMin = schedH * 60 + schedM;
      const diff = nowTotalMin - schedTotalMin;
      const lateMinutes = diff > profile.toleranceMinutes ? diff : 0;
      const computedStatus = lateMinutes > 0 ? 'tardanza' : 'puntual';

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: matchedUser.id,
        userName: matchedUser.name,
        credentialCode: matchedUser.pin,
        branchId: resolvedBranch.id,
        branchName: branchShortName,
        date: today,
        scheduledEntryTime: profile.scheduledEntryTime,
        checkInTime: nowTime,
        method: params.method,
        status: computedStatus,
        lateMinutes,
        notes:
          params.method === 'biometric'
            ? `Huella validada en ${securityPolicy.biometricDeviceName}`
            : 'Marcación en terminal táctil de tienda',
      };

      setAttendanceRecords(prev => [newRecord, ...prev]);
      logAuditEvent(
        'hr',
        lateMinutes > 0 ? 'warning' : 'info',
        params.method === 'biometric'
          ? 'Marcación Biométrica de Entrada'
          : 'Marcación de Entrada en Tienda',
        `${matchedUser.name} marcó entrada en ${branchShortName} (${nowTime})${
          lateMinutes > 0 ? ` · Tardanza: ${lateMinutes} min` : ' · Puntual'
        }.`,
        { name: matchedUser.name, role: matchedUser.roleName }
      );

      dispatchToast(
        `Entrada Registrada · ${matchedUser.name.replace(' (Tú)', '')}`,
        `${branchShortName} · ${nowTime} (${lateMinutes > 0 ? `${lateMinutes}m tardanza` : 'Puntual'})`,
        lateMinutes > 0 ? 'warning' : 'success'
      );

      return {
        ok: true,
        message: `Entrada registrada a las ${nowTime} en ${branchShortName}.`,
        record: newRecord,
      };
    }

    if (!existing || !existing.checkInTime) {
      return {
        ok: false,
        message: `${matchedUser.name} debe registrar su Entrada antes de marcar refrigerio o salida.`,
      };
    }

    let updated: AttendanceRecord = { ...existing };
    let label = '';

    if (params.eventType === 'break_start') {
      updated = { ...existing, breakStartTime: nowTime, status: 'en_refrigerio' };
      label = 'Inicio de Refrigerio';
    } else if (params.eventType === 'break_end') {
      updated = {
        ...existing,
        breakEndTime: nowTime,
        status: existing.lateMinutes > 0 ? 'tardanza' : 'puntual',
      };
      label = 'Retorno de Refrigerio';
    } else if (params.eventType === 'check_out') {
      updated = { ...existing, checkOutTime: nowTime, status: 'salida_completada' };
      label = 'Salida de Turno';
    }

    setAttendanceRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    logAuditEvent(
      'hr',
      'info',
      label,
      `${matchedUser.name} registró ${label.toLowerCase()} a las ${nowTime} (${branchShortName}).`,
      { name: matchedUser.name, role: matchedUser.roleName }
    );
    dispatchToast(label, `${matchedUser.name} · ${nowTime}`, 'info');

    return { ok: true, message: `${label} registrado a las ${nowTime}.`, record: updated };
  };

  const simulateBiometricPunchForUser = (userId: string, branchId?: string) => {
    clockAttendance({
      codeOrUserId: userId,
      eventType: 'check_in',
      method: 'biometric',
      branchId,
    });
  };

  const clearTodayAttendanceForUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    const today = getLocalTodayIso();
    setAttendanceRecords(prev =>
      prev.filter(r => !(r.userId === userId && r.date === today))
    );
    if (targetUser) {
      logAuditEvent(
        'hr',
        'warning',
        'Reinicio de Marcación Diaria',
        `Se reinició la asistencia de hoy para ${targetUser.name} (quedará sujeto a bloqueo de login si intenta ingresar sin marcar).`
      );
      dispatchToast(
        'Asistencia de Hoy Reiniciada',
        `${targetUser.name} ahora requerirá marcar asistencia o usar Google Authenticator al iniciar sesión.`,
        'info'
      );
    }
  };

  const verifyGoogleAuthenticatorUnlock = async (
    targetUser: User,
    sixDigitCode: string
  ): Promise<{ ok: boolean; error?: string; matchedSource?: 'master' | 'personal' }> => {
    const clean = sixDigitCode.replace(/\D/g, '');
    if (clean.length !== 6) {
      return {
        ok: false,
        error: 'Ingresa los 6 dígitos generados por la app Google Authenticator.',
      };
    }

    const profile = getEmployeeProfile(targetUser);
    let matchedSource: 'master' | 'personal' | undefined;

    if (securityPolicy.allowMasterTotpUnlock && securityPolicy.masterTotpSecret) {
      const masterCheck = await verifyTotpCode(securityPolicy.masterTotpSecret, clean, 1);
      if (masterCheck.valid) {
        matchedSource = 'master';
      }
    }

    if (
      !matchedSource &&
      securityPolicy.allowPersonalTotpUnlock &&
      profile.totpEnabled &&
      profile.personalTotpSecret
    ) {
      const personalCheck = await verifyTotpCode(profile.personalTotpSecret, clean, 1);
      if (personalCheck.valid) {
        matchedSource = 'personal';
      }
    }

    if (!matchedSource) {
      logAuditEvent(
        'auth',
        'critical',
        'Código Google Authenticator Rechazado',
        `Intento fallido de desbloqueo sin asistencia para ${targetUser.name}.`,
        { name: targetUser.name, role: targetUser.roleName }
      );
      return {
        ok: false,
        error:
          'Código TOTP inválido o expirado. Verifica los 6 dígitos actuales en Google Authenticator.',
      };
    }

    // Register TOTP override attendance record so today's entry is audited and unlocked
    const resolvedBranch =
      (targetUser.branchIds && !targetUser.branchIds.includes('all')
        ? tenants.find(t => t.id === targetUser.branchIds?.[0])
        : undefined) || activeTenant;

    const today = getLocalTodayIso();
    const nowTime = getLocalTimeFormatted();
    const branchShort = resolvedBranch.name.replace('Khalessi Pizza - ', '');

    const overrideRecord: AttendanceRecord = {
      id: `att-totp-${Date.now()}`,
      userId: targetUser.id,
      userName: targetUser.name,
      credentialCode: targetUser.pin,
      branchId: resolvedBranch.id,
      branchName: branchShort,
      date: today,
      scheduledEntryTime: profile.scheduledEntryTime,
      checkInTime: nowTime,
      method: 'totp_override',
      status: 'desbloqueo_totp',
      lateMinutes: 0,
      notes:
        matchedSource === 'master'
          ? 'Acceso autorizado con Google Authenticator (Llave Maestra Supervisión)'
          : 'Acceso autorizado con Google Authenticator Personal',
    };

    setAttendanceRecords(prev => [
      overrideRecord,
      ...prev.filter(r => !(r.userId === targetUser.id && r.date === today)),
    ]);

    return { ok: true, matchedSource };
  };

  const upsertShiftAssignment = (params: {
    userId: string;
    branchId: string;
    dayIndex: number;
    shiftType: ShiftType;
    hoursLabel?: string;
    isSupportCover?: boolean;
  }) => {
    const resolvedHours = params.hoursLabel || SHIFT_META[params.shiftType].hours;
    setWeeklyShifts(prev => {
      const existingIdx = prev.findIndex(
        s => s.userId === params.userId && s.dayIndex === params.dayIndex
      );
      const nextItem: WeeklyShiftAssignment = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `shf-${params.userId}-${params.dayIndex}-${Date.now()}`,
        userId: params.userId,
        branchId: params.branchId,
        dayIndex: params.dayIndex,
        shiftType: params.shiftType,
        hoursLabel: resolvedHours,
        isSupportCover: Boolean(params.isSupportCover),
      };
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = nextItem;
        return copy;
      }
      return [...prev, nextItem];
    });

    const targetUser = users.find(u => u.id === params.userId);
    const targetBranch = tenants.find(t => t.id === params.branchId);
    dispatchToast(
      'Horario Actualizado',
      `${targetUser?.name || 'Colaborador'} · ${SHIFT_META[params.shiftType].short}${
        params.isSupportCover
          ? ` (Apoyo en ${targetBranch?.name.replace('Khalessi Pizza - ', '') || 'Sede'})`
          : ''
      }`,
      'success'
    );
  };

  const addPayrollMovement = (movement: Omit<PayrollMovement, 'id' | 'registeredBy'>) => {
    const targetUser = users.find(u => u.id === movement.userId);
    const created: PayrollMovement = {
      ...movement,
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      registeredBy: 'RR.HH. / Administración',
    };
    setPayrollMovements(prev => [created, ...prev]);
    logAuditEvent(
      'hr',
      movement.type === 'adelanto' ? 'warning' : 'info',
      'Movimiento de Pre-Planilla Registrado',
      `${movement.type.toUpperCase()} de S/ ${movement.amountSoles.toFixed(2)} para ${
        targetUser?.name || movement.userId
      }: ${movement.description}.`
    );
    dispatchToast(
      'Movimiento Registrado',
      `S/ ${movement.amountSoles.toFixed(2)} aplicado en la pre-planilla de ${
        targetUser?.name || 'colaborador'
      }.`,
      'success'
    );
  };

  const deletePayrollMovement = (movementId: string) => {
    const target = payrollMovements.find(m => m.id === movementId);
    if (!target) return;
    const targetUser = users.find(u => u.id === target.userId);

    openNoticeModal({
      title: '¿Anular movimiento de pre-planilla?',
      message: `Se eliminará el registro de S/ ${target.amountSoles.toFixed(2)} (${target.description}) asociado a ${targetUser?.name || 'este colaborador'}.`,
      tone: 'danger',
      confirmLabel: 'Confirmar Anulación',
      cancelLabel: 'Conservar',
      onConfirm: () => {
        setPayrollMovements(prev => prev.filter(m => m.id !== movementId));
        logAuditEvent(
          'hr',
          'warning',
          'Anulación en Pre-Planilla',
          `Registro de S/ ${target.amountSoles.toFixed(2)} anulado para ${targetUser?.name || target.userId}.`
        );
        dispatchToast('Registro Anulado', 'La pre-planilla ha sido recalculada.', 'info');
      },
    });
  };

  const updateSecurityPolicy = (partial: Partial<HRSecurityPolicy>) => {
    setSecurityPolicy(prev => ({ ...prev, ...partial }));
    logAuditEvent(
      'hr',
      'warning',
      'Política de Control de Acceso RR.HH. Actualizada',
      `Ajuste modificado: ${Object.keys(partial).join(', ')}.`
    );
    dispatchToast(
      'Seguridad RR.HH. Actualizada',
      'Política de asistencia y Google Authenticator guardada.',
      'success'
    );
  };

  const regenerateMasterTotpSecret = (): string => {
    const newSecret = generateTotpSecret(16);
    setSecurityPolicy(prev => ({ ...prev, masterTotpSecret: newSecret }));
    logAuditEvent(
      'hr',
      'critical',
      'Rotación de Llave Maestra Google Authenticator',
      'Se generó una nueva semilla secreta TOTP RFC 6238 para desbloqueo corporativo.'
    );
    dispatchToast(
      'Nueva Clave Google Authenticator',
      'Escanea el nuevo código QR en tu teléfono para sincronizar la llave maestra.',
      'warning'
    );
    return newSecret;
  };

  const saveJobPosting = (posting: JobPostingFormConfig) => {
    setJobPostings(prev => {
      const exists = prev.some(p => p.id === posting.id);
      if (exists) {
        return prev.map(p => (p.id === posting.id ? posting : p));
      }
      return [...prev, posting];
    });
    logAuditEvent(
      'hr',
      'info',
      'Formulario de Puesto Actualizado',
      `Puesto "${posting.positionTitle}" (${posting.fields.length} campos personalizados) sincronizado con Bolsa de Trabajo.`
    );
    dispatchToast(
      'Formulario de Puesto Guardado',
      `El puesto "${posting.positionTitle}" ya está sincronizado con el formulario del Footer.`,
      'success'
    );
  };

  const deleteJobPosting = (postingId: string) => {
    const target = jobPostings.find(p => p.id === postingId);
    if (!target) return;
    setJobPostings(prev => prev.filter(p => p.id !== postingId));
    logAuditEvent(
      'hr',
      'warning',
      'Convocatoria Eliminada',
      `Se retiró el formulario del puesto "${target.positionTitle}".`
    );
    dispatchToast('Puesto Eliminado', `Se quitó "${target.positionTitle}" de las vacantes.`, 'info');
  };

  const submitJobApplication = (
    application: Omit<JobApplication, 'id' | 'applicationCode' | 'createdAt' | 'status'>
  ): JobApplication => {
    const year = new Date().getFullYear();
    const seq = String(jobApplications.length + 1).padStart(3, '0');
    const created: JobApplication = {
      ...application,
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationCode: `POST-${year}-${seq}`,
      createdAt: new Date().toISOString(),
      status: 'nuevo',
    };
    setJobApplications(prev => [created, ...prev]);
    logAuditEvent(
      'hr',
      'info',
      'Nueva Postulación Web Recibida',
      `${created.fullName} postuló al cargo de ${created.positionTitle} (${created.branchName}).`,
      { name: created.fullName, role: 'Postulante Web' }
    );
    return created;
  };

  const updateJobApplication = (
    applicationId: string,
    partial: { status?: ApplicantStatus; hrNotes?: string }
  ) => {
    setJobApplications(prev =>
      prev.map(a => (a.id === applicationId ? { ...a, ...partial } : a))
    );
    dispatchToast(
      'Postulación Actualizada',
      'El estado y notas del candidato han sido guardados.',
      'success'
    );
  };

  const deleteJobApplication = (applicationId: string) => {
    setJobApplications(prev => prev.filter(a => a.id !== applicationId));
    dispatchToast('Postulación Descartada', 'El expediente fue removido de la bandeja.', 'info');
  };

  return (
    <HRContext.Provider
      value={{
        profiles,
        getEmployeeProfile,
        updateEmployeeProfile,
        regenerateEmployeeTotpSecret,
        attendanceRecords,
        todayRecords,
        hasActiveAttendanceToday,
        getTodayRecordForUser,
        shouldGateLoginByAttendance,
        clockAttendance,
        simulateBiometricPunchForUser,
        clearTodayAttendanceForUser,
        verifyGoogleAuthenticatorUnlock,
        weeklyShifts,
        upsertShiftAssignment,
        payrollMovements,
        addPayrollMovement,
        deletePayrollMovement,
        securityPolicy,
        updateSecurityPolicy,
        regenerateMasterTotpSecret,
        jobPostings,
        saveJobPosting,
        deleteJobPosting,
        jobApplications,
        submitJobApplication,
        updateJobApplication,
        deleteJobApplication,
      }}
    >
      {children}
    </HRContext.Provider>
  );
};

export const useHR = () => {
  const ctx = useContext(HRContext);
  if (!ctx) {
    throw new Error('useHR must be used within an HRProvider');
  }
  return ctx;
};
