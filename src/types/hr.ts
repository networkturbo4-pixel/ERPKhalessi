export type HRPosition =
  | 'Dirección General'
  | 'Gerente de Local'
  | 'Maestro Pizzero'
  | 'Hornero & Masa'
  | 'Cajero POS'
  | 'Atención Salón'
  | 'Motorizado Propio';

export type ContractType =
  | 'Planilla MYPE / General'
  | 'Part-Time (Medio Tiempo)'
  | 'Por Turno / Jornal'
  | 'Locación / Apoyo';

export type AttendanceEventType =
  | 'check_in'
  | 'break_start'
  | 'break_end'
  | 'check_out';

export type AttendanceMethod = 'biometric' | 'dni_pin' | 'totp_override';

export type AttendanceStatus =
  | 'puntual'
  | 'tardanza'
  | 'en_refrigerio'
  | 'salida_completada'
  | 'desbloqueo_totp';

export interface EmployeeHRProfile {
  userId: string;
  position: HRPosition;
  contractType: ContractType;
  baseSalarySoles: number;
  scheduledEntryTime: string; // HH:MM (24h)
  toleranceMinutes: number;
  healthCardNumber: string;
  healthCardExpiry: string; // YYYY-MM-DD
  isDriver: boolean;
  driverLicense?: string;
  soatExpiry?: string; // YYYY-MM-DD
  emergencyContact: string;
  requiresAttendanceToLogin: boolean;
  totpEnabled: boolean;
  personalTotpSecret: string;
  birthday?: string; // YYYY-MM-DD
  hireDate?: string; // YYYY-MM-DD
  bankAccountInfo?: string;
  portalAccessToken?: string; // unique slug/token for public portal
  duties?: string[]; // Responsabilidades y tareas operativas según cargo
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  credentialCode: string;
  branchId: string;
  branchName: string;
  date: string; // YYYY-MM-DD local
  scheduledEntryTime: string;
  checkInTime?: string; // HH:MM:SS
  breakStartTime?: string;
  breakEndTime?: string;
  checkOutTime?: string;
  method: AttendanceMethod;
  status: AttendanceStatus;
  lateMinutes: number;
  notes?: string;
}

export type ShiftType = 'apertura' | 'tarde' | 'punta_noche' | 'descanso';

export interface WeeklyShiftAssignment {
  id: string;
  userId: string;
  branchId: string;
  dayIndex: number; // 0 (Lun) .. 6 (Dom)
  shiftType: ShiftType;
  hoursLabel: string;
  isSupportCover: boolean;
}

export type PayrollMovementType =
  | 'adelanto'
  | 'hora_extra'
  | 'bono_puntualidad'
  | 'consumo_personal';

export interface PayrollMovement {
  id: string;
  userId: string;
  branchId: string;
  date: string;
  type: PayrollMovementType;
  amountSoles: number;
  description: string;
  registeredBy: string;
}

export interface HRSecurityPolicy {
  enforceAttendanceToLogin: boolean;
  exemptSuperAdmin: boolean;
  allowPersonalTotpUnlock: boolean;
  allowMasterTotpUnlock: boolean;
  masterTotpSecret: string;
  masterTotpAccount: string;
  biometricDeviceName: string;
}

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'tel'
  | 'email'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'url';

export interface JobFormField {
  id: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  helperText?: string;
}

export interface JobPostingFormConfig {
  id: string;
  positionTitle: string;
  department: string;
  modality: ContractType;
  salaryRange?: string;
  description: string;
  isActive: boolean;
  branchIds: string[];
  fields: JobFormField[];
}

export type ApplicantStatus =
  | 'nuevo'
  | 'en_revision'
  | 'entrevista'
  | 'contratado'
  | 'descartado';

export interface JobApplication {
  id: string;
  applicationCode: string;
  createdAt: string;
  postingId: string;
  positionTitle: string;
  branchId: string;
  branchName: string;
  fullName: string;
  documentType: 'DNI' | 'CE' | 'Pasaporte';
  documentNumber: string;
  phone: string;
  email: string;
  districtOrAddress?: string;
  availability?: string;
  cvLinkOrSummary?: string;
  answers: Array<{
    fieldId: string;
    label: string;
    value: string;
  }>;
  status: ApplicantStatus;
  hrNotes?: string;
}

export type HRSubTabId =
  | 'legajos'
  | 'asistencia'
  | 'horarios'
  | 'preplanilla'
  | 'postulantes'
  | 'seguridad_totp'
  | 'portal_publico';
