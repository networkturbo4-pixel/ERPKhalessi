export type ThemePreference = 'light' | 'dark' | 'system';
export type TypographyScale = 'compact' | 'standard' | 'comfortable';
export type SystemScaleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ContrastLevel = 'standard' | 'high' | 'ultra';
export type ToastVariant = 'island' | 'card' | 'pill' | 'bordered' | 'minimal';
export type ToastPosition = 'top-center' | 'top-right' | 'bottom-right' | 'bottom-center';
export type ToastAudioTheme = 'modern' | 'chime' | 'soft' | 'silent';
export type BorderRadiusSize = 'sm' | 'md' | 'lg' | 'full';
export type ModalStyle = 'halo' | 'frost' | 'executive' | 'minimalist';
export type BranchViewScope = 'branch' | 'consolidated';

export interface WelcomeSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface TenantCustomization {
  appName: string;
  slogan?: string;
  logoLight?: string;
  logoDark?: string;
  storeHeaderLogo?: string;
  favicon?: string;
  collapsedLogo?: string;
  // Active resolved accent color (auto-synced with light/dark accent)
  primaryColor: string;
  // Separate contrast/accent colors for Light & Dark modes
  accentColorLight: string;
  accentColorDark: string;
  // Separate background colors for Light & Dark modes
  lightBgColor: string;
  lightSurfaceColor: string;
  darkBgColor: string;
  darkSurfaceColor: string;
  contrastLevel: ContrastLevel;
  surfaceTheme: 'neutral' | 'cool' | 'warm';
  borderRadius: BorderRadiusSize;
  themePreference: ThemePreference;
  typographyScale: TypographyScale;
  systemScale: SystemScaleSize;
  fontFamily: string;
  toastVariant: ToastVariant;
  toastStacking: boolean;
  toastPosition: ToastPosition;
  toastAudioTheme: ToastAudioTheme;
  modalStyle: ModalStyle;
  enforceNoNativeDialogs: boolean;
  loginConfig: {
    layout: 'split' | 'centered';
    glassmorphism: boolean;
    blurIntensity: number;
    buttonColor: string;
    slides: WelcomeSlide[];
  };
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: 'corriente' | 'ahorros' | 'maestra';
  accountNumber: string;
  cci?: string;
  currency: string;
  holderName?: string;
}

export interface DigitalWallet {
  id: string;
  provider: 'yape' | 'plin' | 'other';
  holderName: string;
  phone: string;
  qrImageUrl?: string;
  branchId?: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  youtube?: string;
}

export type ComplaintType = 'reclamo' | 'queja';
export type ComplaintGoodType = 'producto' | 'servicio';
export type ComplaintStatus = 'pendiente' | 'en_proceso' | 'atendido';

export interface ComplaintRecord {
  id: string;
  ticketCode: string;
  createdAt: string;
  branchId: string;
  branchName: string;
  consumerName: string;
  documentType: 'DNI' | 'CE' | 'RUC' | 'Pasaporte';
  documentNumber: string;
  phone: string;
  email: string;
  address: string;
  isMinor: boolean;
  guardianName?: string;
  goodType: ComplaintGoodType;
  orderReference?: string;
  claimedAmount: number;
  goodDescription: string;
  claimType: ComplaintType;
  detail: string;
  consumerRequest: string;
  status: ComplaintStatus;
  adminResponse?: string;
  respondedAt?: string;
}

export interface CulqiGatewayConfig {
  enabled: boolean;
  environment: 'test' | 'live';
  publicKey: string;
  yapeEnabled: boolean;
  billeteraEnabled: boolean;
  allowCashFallback: boolean;
  backendOrderEndpoint?: string;
  backendChargeEndpoint?: string;
}

export interface DeliveryDistanceBracket {
  id: string;
  minKm: number;
  maxKm: number;
  feeSoles: number;
}

export interface DeliveryTariffConfig {
  enabled: boolean;
  baseFallbackFeeSoles: number;
  extraPerKmSoles: number;
  freeDeliveryMinSubtotal?: number;
  brackets: DeliveryDistanceBracket[];
}

export interface CompanyInfo {
  legalName: string;
  taxId: string;
  commercialName: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  bankAccounts: BankAccount[];
  wallets: DigitalWallet[];
  socialLinks?: SocialLinks;
  culqiConfig?: CulqiGatewayConfig;
  deliveryTariff?: DeliveryTariffConfig;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  roleId: string;
  roleName: string;
  status: 'active' | 'suspended';
  pin: string; // 8 digits (DNI / CE primary), 6 digits, or 4 digits
  documentType?: 'DNI (8d)' | 'CE (8d)' | 'Código (6d)' | 'PIN (4d)';
  branchIds?: string[]; // ['all'] or specific tenant IDs
  createdAt: string;
  lastLogin?: string;
}

export type PermissionActionType = 'view' | 'create' | 'edit' | 'delete' | 'special';

export type ErpModuleKey =
  | 'dashboard'
  | 'pos'
  | 'kds'
  | 'delivery'
  | 'tables'
  | 'services'
  | 'inventory'
  | 'purchases'
  | 'finances'
  | 'clients'
  | 'benefits'
  | 'quotes'
  | 'hr'
  | 'workspace'
  | 'settings';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  module: ErpModuleKey;
  action: PermissionActionType;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export interface BranchLiveOrder {
  id: string;
  customer: string;
  branchName: string;
  items: string;
  totalSoles: number;
  timeAgo: string;
  status: 'En horno' | 'Preparación' | 'Empaque' | 'En ruta' | 'Entregado';
}

export type BranchFormat =
  | 'Matriz & Salón'
  | 'Salón & Delivery'
  | 'Dark Kitchen'
  | 'Express / Mall'
  | 'Obrador Central';

export interface BranchOperationalProfile {
  branchFormat: BranchFormat;
  branchCode: string;
  billingSeries: string;
  schedule: string;
  tablesCount: number;
  deliveryRadiusKm: number;
  dailyGoalSoles: number;
  address: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  managerName: string;
  salesTodaySoles: number;
  salesGrowthPct: string;
  pizzasToday: number;
  avgOvenMinutes: number;
  ovenTempC: number;
  activeOvens: string;
  stockAlertsCount: number;
  stockAlertSummary: string;
  yapeNumber: string;
  liveOrders: BranchLiveOrder[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'preheating' | 'closed';
  userCount: number;
  createdAt: string;
  operations?: BranchOperationalProfile;
}

export interface GoogleDriveConfig {
  authMethod: 'service_account' | 'oauth2';
  serviceAccountEmail?: string;
  privateKey?: string;
  clientId?: string;
  clientSecret?: string;
  rootFolderId: string;
  rootFolderName: string;
  isConnected: boolean;
  latencyMs: number;
  totalStorageGb: number;
  usedStorageGb: number;
}

export interface GeminiAiConfig {
  apiKey: string;
  defaultModel: 'gemini-2.5-flash' | 'gemini-3.8-flash' | 'gemini-2.5-pro' | 'gemini-3.8-pro';
  temperature: number;
  status: 'idle' | 'checking' | 'connected' | 'error';
  quotaRemaining?: string;
  lastTestedAt?: string;
}

export interface SystemMetrics {
  version: string;
  gitCommit: string;
  gitBranch: string;
  environment: string;
  uptime: string;
  cpuUsagePercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  dbStatus: 'connected' | 'latency_high' | 'disconnected';
  dbLatencyMs: number;
  dbConnectionsActive: number;
  dbSizeMb: number;
  lastBackupAt?: string;
}

export interface NoticeModalOptions {
  title: string;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  styleOverride?: ModalStyle;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export type AuditCategory =
  | 'auth'
  | 'rbac'
  | 'fiscal'
  | 'branch'
  | 'users'
  | 'hr'
  | 'appearance'
  | 'system';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  branchName: string;
  category: AuditCategory;
  severity: AuditSeverity;
  action: string;
  details: string;
}

export interface HealthCheckItem {
  id: string;
  label: string;
  status: 'healthy' | 'warning' | 'error';
  detail: string;
  latencyMs?: number;
}

export interface ConsistencyReport {
  lastVerifiedAt: string;
  checksum: string;
  storageBytes: number;
  isOnline: boolean;
  schemaValid: boolean;
  checks: HealthCheckItem[];
}

export type TabId =
  | 'identity'
  | 'appearance'
  | 'dialogs'
  | 'login'
  | 'company'
  | 'users'
  | 'roles'
  | 'tenants'
  | 'audit'
  | 'drive'
  | 'connections'
  | 'system-update';
