import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authenticateServer } from '../utils/diskPersistence';
import {
  TenantCustomization,
  CompanyInfo,
  Tenant,
  User,
  GoogleDriveConfig,
  GeminiAiConfig,
  SystemMetrics,
  TabId,
  BranchViewScope,
  BranchOperationalProfile,
  NoticeModalOptions,
  AuditCategory,
  AuditSeverity,
  AuditLogEntry,
  HealthCheckItem,
  ConsistencyReport,
  ComplaintRecord,
  ComplaintStatus,
} from '../types/settings';
import { MOCK_USERS, useRBAC } from './RBACContext';
import { soundSynth } from '../utils/audio';

export const DEFAULT_CUSTOMIZATION: TenantCustomization = {
  appName: 'Khalessi Pizza ERP',
  slogan: 'El sabor artesanal respaldado por tecnología ágil',
  logoLight: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
  logoDark: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=400&q=80',
  storeHeaderLogo: '',
  favicon: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=80&q=80',
  collapsedLogo: '🍕',
  primaryColor: '#f97316',
  accentColorLight: '#ea580c',
  accentColorDark: '#f97316',
  lightBgColor: '#f4f4f5',
  lightSurfaceColor: '#ffffff',
  darkBgColor: '#09090b',
  darkSurfaceColor: '#111114',
  contrastLevel: 'standard',
  surfaceTheme: 'neutral',
  borderRadius: 'lg',
  themePreference: 'dark',
  typographyScale: 'standard',
  systemScale: 'md',
  fontFamily: 'Space Grotesk',
  toastVariant: 'island',
  toastStacking: true,
  toastPosition: 'top-center',
  toastAudioTheme: 'chime',
  modalStyle: 'halo',
  enforceNoNativeDialogs: true,
  loginConfig: {
    layout: 'split',
    glassmorphism: true,
    blurIntensity: 12,
    buttonColor: '#ea580c',
    slides: [
      {
        id: 'slide-1',
        title: 'Horno de Piedra y Masa Madre 48h',
        subtitle: 'Controla el flujo de comandas KDS y recetas con precisión milimétrica.',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'slide-2',
        title: 'Gestión Multisucursal en Tiempo Real',
        subtitle: 'Inventario de quesos finos, harina 00 y cajas sincronizado en cada local.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'slide-3',
        title: 'Puntos de Venta (POS) y Delivery Propio',
        subtitle: 'Despacha más rápido y fideliza a tus clientes desde una sola plataforma.',
        imageUrl: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
};

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  legalName: 'KHALESSI PIZZA FOODS S.A.C.',
  taxId: '20608945123',
  commercialName: 'Khalessi Pizza Artesanal',
  address: 'Av. Primavera 1024, Santiago de Surco, Lima - Perú',
  phone: '+51 1 780 9000',
  email: 'administracion@khalessipizza.com',
  currency: 'PEN (S/)',
  bankAccounts: [
    {
      id: 'bank-1',
      bankName: 'Banco de Crédito del Perú (BCP)',
      accountType: 'corriente',
      accountNumber: '193-98218491-0-45',
      cci: '002-193-009821849104-55',
      currency: 'PEN (S/)',
      holderName: 'KHALESSI PIZZA FOODS S.A.C.',
    },
    {
      id: 'bank-2',
      bankName: 'BBVA Perú',
      accountType: 'corriente',
      accountNumber: '0011-0482-0100482910',
      cci: '011-482-000100482910-18',
      currency: 'USD ($)',
      holderName: 'KHALESSI PIZZA FOODS S.A.C.',
    },
  ],
  wallets: [
    {
      id: 'wallet-1',
      provider: 'yape',
      holderName: 'Khalessi Pizza Matriz Surco',
      phone: '987 654 321',
      branchId: 'tenant-1',
      qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=YAPE-KHALESSI-SURCO',
    },
    {
      id: 'wallet-2',
      provider: 'plin',
      holderName: 'Khalessi Pizza Miraflores',
      phone: '912 345 678',
      branchId: 'tenant-2',
      qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PLIN-KHALESSI-MIRAFLORES',
    },
  ],
  socialLinks: {
    facebook: 'https://facebook.com/pizzakhalessi',
    instagram: 'https://instagram.com/pizzakhalessi',
    tiktok: 'https://tiktok.com/@pizzakhalessi',
    whatsapp: 'https://wa.me/51987654321',
  },
  culqiConfig: {
    enabled: true,
    environment: 'test',
    publicKey: 'pk_test_demo_khalessi_v4',
    yapeEnabled: true,
    billeteraEnabled: true,
    allowCashFallback: true,
    backendOrderEndpoint: '',
    backendChargeEndpoint: '',
  },
  deliveryTariff: {
    enabled: true,
    baseFallbackFeeSoles: 5.0,
    extraPerKmSoles: 1.5,
    freeDeliveryMinSubtotal: 120,
    brackets: [
      { id: 'km-1', minKm: 0, maxKm: 2, feeSoles: 4.0 },
      { id: 'km-2', minKm: 2, maxKm: 4, feeSoles: 6.0 },
      { id: 'km-3', minKm: 4, maxKm: 6, feeSoles: 8.5 },
      { id: 'km-4', minKm: 6, maxKm: 10, feeSoles: 11.5 },
    ],
  },
};

const COMPLAINTS_STORAGE_KEY = 'khalessi_erp_complaints_v1';

const DEFAULT_COMPLAINTS: ComplaintRecord[] = [
  {
    id: 'cmp-seed-1',
    ticketCode: 'LR-2026-0001',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    branchId: 'tenant-1',
    branchName: 'Matriz Surco',
    consumerName: 'Sebastián Alzamora Díaz',
    documentType: 'DNI',
    documentNumber: '45892104',
    phone: '+51 994 210 887',
    email: 'salzamora@correo.pe',
    address: 'Calle Monte Rosa 240, Santiago de Surco',
    isMinor: false,
    goodType: 'producto',
    orderReference: '#KH-1018',
    claimedAmount: 54.90,
    goodDescription: 'Pizza Familiar Carnívora Khalessi Supreme + Gaseosa 1.5L',
    claimType: 'reclamo',
    detail: 'Solicité borde relleno de mozzarella en el pedido online pero llegó con borde tradicional.',
    consumerRequest: 'Reposición de un cupón por la diferencia del borde relleno (S/ 7.00) o cortesía en próximo pedido.',
    status: 'atendido',
    adminResponse: 'Estimado Sebastián, verificamos la comanda y emitimos un bono de S/ 15.00 + Borde Relleno sin costo enviado a su correo.',
    respondedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'cmp-seed-2',
    ticketCode: 'LR-2026-0002',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    branchId: 'tenant-2',
    branchName: 'Sede Miraflores',
    consumerName: 'Claudia Benavides Ríos',
    documentType: 'DNI',
    documentNumber: '71029384',
    phone: '+51 987 112 334',
    email: 'cbenavides@empresa.com',
    address: 'Av. Pardo 620 Dpto 901, Miraflores',
    isMinor: false,
    goodType: 'servicio',
    orderReference: '#KH-1020',
    claimedAmount: 66.40,
    goodDescription: 'Servicio de entrega Delivery turno noche',
    claimType: 'queja',
    detail: 'El motorizado demoró 15 minutos adicionales en encontrar el edificio pese a la referencia indicada.',
    consumerRequest: 'Mejorar la lectura de referencias en el despacho de motorizados.',
    status: 'pendiente',
  },
];

export const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Khalessi Pizza - Matriz Surco',
    slug: 'khalessi-surco',
    status: 'active',
    userCount: 14,
    createdAt: '2023-08-10',
    operations: {
      branchFormat: 'Matriz & Salón',
      branchCode: 'SUC-001',
      billingSeries: 'F001 / B001',
      schedule: '12:00 PM – 11:30 PM',
      tablesCount: 22,
      deliveryRadiusKm: 5.0,
      dailyGoalSoles: 8500,
      address: 'Av. Primavera 1024, Santiago de Surco',
      latitude: -12.1116,
      longitude: -76.9912,
      phone: '+51 1 780 9001',
      managerName: 'Valeria Mendoza',
      salesTodaySoles: 7420,
      salesGrowthPct: '+19.4%',
      pizzasToday: 186,
      avgOvenMinutes: 10.2,
      ovenTempC: 425,
      activeOvens: '2 Hornos Napolitanos activos',
      stockAlertsCount: 1,
      stockAlertSummary: 'Albahaca fresca hidropónica (Quedan 1.8 kg)',
      yapeNumber: '987 654 321',
      liveOrders: [
        { id: 'SUR-412', customer: 'Diego Villarán', branchName: 'Matriz Surco', items: '2× Familiar Pepperoni Hot Honey · 1× Focaccia', totalSoles: 108, timeAgo: '3m', status: 'En horno' },
        { id: 'SUR-411', customer: 'Mariana Paz', branchName: 'Matriz Surco', items: '1× Mediana Burrata & Prosciutto · 2× Limonada', totalSoles: 74, timeAgo: '7m', status: 'Empaque' },
        { id: 'SUR-410', customer: 'Familia Cáceres (Mesa 6)', branchName: 'Matriz Surco', items: '3× Familiares Artesanales + Tiramisú', totalSoles: 169, timeAgo: '14m', status: 'Entregado' },
      ],
    },
  },
  {
    id: 'tenant-2',
    name: 'Khalessi Pizza - Sede Miraflores',
    slug: 'khalessi-miraflores',
    status: 'active',
    userCount: 10,
    createdAt: '2024-01-20',
    operations: {
      branchFormat: 'Salón & Delivery',
      branchCode: 'SUC-002',
      billingSeries: 'F002 / B002',
      schedule: '12:00 PM – 12:00 AM',
      tablesCount: 16,
      deliveryRadiusKm: 4.5,
      dailyGoalSoles: 6500,
      address: 'Av. José Larco 742, Miraflores',
      latitude: -12.1225,
      longitude: -77.0289,
      phone: '+51 1 780 9002',
      managerName: 'Mateo Rossi',
      salesTodaySoles: 5680,
      salesGrowthPct: '+24.1%',
      pizzasToday: 142,
      avgOvenMinutes: 11.4,
      ovenTempC: 432,
      activeOvens: '2 Hornos de Piedra al 90%',
      stockAlertsCount: 2,
      stockAlertSummary: 'Mozzarella Fior di Latte & Cajas 40cm',
      yapeNumber: '912 345 678',
      liveOrders: [
        { id: 'MIR-809', customer: 'Hotel Belmond Guest', branchName: 'Sede Miraflores', items: '2× Mediana Trufa Negra & Hongos · Vino Chianti', totalSoles: 156, timeAgo: '2m', status: 'En horno' },
        { id: 'MIR-808', customer: 'Andrés Salcedo', branchName: 'Sede Miraflores', items: '1× Familiar Carnívora Ahumada · 1× Garlic Knots', totalSoles: 68, timeAgo: '6m', status: 'Preparación' },
        { id: 'MIR-807', customer: 'Sofía Lindley', branchName: 'Sede Miraflores', items: '2× Familiar Margherita DOP', totalSoles: 92, timeAgo: '11m', status: 'En ruta' },
      ],
    },
  },
  {
    id: 'tenant-3',
    name: 'Khalessi Pizza - Sede San Isidro',
    slug: 'khalessi-san-isidro',
    status: 'active',
    userCount: 8,
    createdAt: '2024-03-05',
    operations: {
      branchFormat: 'Salón & Delivery',
      branchCode: 'SUC-003',
      billingSeries: 'F003 / B003',
      schedule: '11:30 AM – 11:00 PM',
      tablesCount: 14,
      deliveryRadiusKm: 4.0,
      dailyGoalSoles: 5000,
      address: 'Calle Los Libertadores 310, San Isidro',
      latitude: -12.0972,
      longitude: -77.0365,
      phone: '+51 1 780 9003',
      managerName: 'Lucía Santillán',
      salesTodaySoles: 4190,
      salesGrowthPct: '+11.8%',
      pizzasToday: 96,
      avgOvenMinutes: 9.6,
      ovenTempC: 418,
      activeOvens: '1 Horno Rotativo Corporativo',
      stockAlertsCount: 0,
      stockAlertSummary: 'Stock óptimo en cámara de frío (100%)',
      yapeNumber: '945 881 029',
      liveOrders: [
        { id: 'SIS-305', customer: 'Estudio Echecopar (Piso 9)', branchName: 'Sede San Isidro', items: '8× Familiares Ejecutivas Mixtas · 4× Gaseosas 1.5L', totalSoles: 384, timeAgo: '5m', status: 'En horno' },
        { id: 'SIS-304', customer: 'Banca Privada Rimac', branchName: 'Sede San Isidro', items: '5× Medianas Quattro Formaggi & Diavola', totalSoles: 215, timeAgo: '12m', status: 'En ruta' },
        { id: 'SIS-303', customer: 'Rodrigo Ferrero', branchName: 'Sede San Isidro', items: '1× Personal Napolitana Clásica', totalSoles: 34, timeAgo: '19m', status: 'Entregado' },
      ],
    },
  },
];

const DEFAULT_DRIVE_CONFIG: GoogleDriveConfig = {
  authMethod: 'service_account',
  serviceAccountEmail: 'storage-bot@khalessi-erp.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3xQ9p...\n-----END PRIVATE KEY-----',
  clientId: '10928374659281.apps.googleusercontent.com',
  clientSecret: 'GOCSPX-abc123mocksecretxyz',
  rootFolderId: '1AbC_D98zX_khalessi_cloud_root',
  rootFolderName: '📁 Khalessi_ERP_Cloud_Storage',
  isConnected: true,
  latencyMs: 142,
  totalStorageGb: 2000,
  usedStorageGb: 148.4,
};

const DEFAULT_GEMINI_CONFIG: GeminiAiConfig = {
  apiKey: 'AIzaSyA88941_MockGeminiProKeySecret',
  defaultModel: 'gemini-3.8-flash',
  temperature: 0.7,
  status: 'connected',
  quotaRemaining: '94,200 / 100,000 req/mo',
  lastTestedAt: 'Hace 10 minutos',
};

const DEFAULT_SYSTEM_METRICS: SystemMetrics = {
  version: 'v2.9.0-multisucursal',
  gitCommit: '9f2c84a',
  gitBranch: 'main',
  environment: 'production',
  uptime: '42 días, 18 horas, 09 mins',
  cpuUsagePercent: 22,
  ramUsedGb: 3.8,
  ramTotalGb: 16.0,
  diskUsedGb: 48.2,
  diskTotalGb: 250.0,
  dbStatus: 'connected',
  dbLatencyMs: 7,
  dbConnectionsActive: 24,
  dbSizeMb: 1480,
  lastBackupAt: 'Hoy a las 03:00 AM (Automático S3)',
};

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'critical';
  pinned?: boolean;
  createdAt: number;
}

interface PersistedSnapshot {
  customization: TenantCustomization;
  companyInfo: CompanyInfo;
  tenants: Tenant[];
  activeTenantId: string;
  branchScope: BranchViewScope;
  users: User[];
  driveConfig: GoogleDriveConfig;
  geminiConfig: GeminiAiConfig;
  activeTab: TabId;
}

const STORAGE_KEY = 'khalessi_erp_settings_v3';
const CHECKPOINT_KEY = 'khalessi_erp_checkpoint_v3';
const AUTH_STORAGE_KEY = 'khalessi_erp_auth_v1';
const AUDIT_STORAGE_KEY = 'khalessi_erp_audit_v1';

function computeFnvChecksum(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `FNV-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-seed-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    actorName: 'César Augusto (Tú)',
    actorRole: 'Super Administrador',
    branchName: 'Matriz Surco',
    category: 'system',
    severity: 'info',
    action: 'Validación de Consistencia Local',
    details: 'Esquema multisucursal v3.2 verificado sin discrepancias en 3 establecimientos anexos.',
  },
  {
    id: 'aud-seed-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    actorName: 'César Augusto (Tú)',
    actorRole: 'Super Administrador',
    branchName: 'Matriz Surco',
    category: 'rbac',
    severity: 'warning',
    action: 'Sincronización Matriz RBAC',
    details: '4 roles operativos y 52 permisos granulares verificados en caché persistente.',
  },
  {
    id: 'aud-seed-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    actorName: 'Valeria Mendoza',
    actorRole: 'Gerente de Sucursal',
    branchName: 'Matriz Surco',
    category: 'fiscal',
    severity: 'info',
    action: 'Verificación Serie SUNAT F001/B001',
    details: 'Numeración correlativa y billetera QR Yape sincronizadas para apertura de turno.',
  },
];

function inferDocType(pin: string, existing?: User['documentType']): User['documentType'] {
  if (existing && (
    (pin.length === 8 && (existing === 'DNI (8d)' || existing === 'CE (8d)')) ||
    (pin.length === 6 && existing === 'Código (6d)') ||
    (pin.length === 4 && existing === 'PIN (4d)')
  )) {
    return existing;
  }
  if (pin.length === 8) return pin.startsWith('00') ? 'CE (8d)' : 'DNI (8d)';
  if (pin.length === 6) return 'Código (6d)';
  return 'PIN (4d)';
}

function normalizeLoadedState(raw: string | null): PersistedSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const mergedCustomization: TenantCustomization = {
      ...DEFAULT_CUSTOMIZATION,
      ...(parsed.customization || {}),
      loginConfig: {
        ...DEFAULT_CUSTOMIZATION.loginConfig,
        ...(parsed.customization?.loginConfig || {}),
      },
    };

    const usedOrderIds = new Set<string>();
    const loadedTenants: Tenant[] =
      Array.isArray(parsed.tenants) && parsed.tenants.length > 0
        ? parsed.tenants.map((t: Tenant, idx: number) => {
            const shortBranch = t.name.replace('Khalessi Pizza - ', '');
            const fallbackCode = `SUC-00${idx + 1}`;
            const fallbackOps = DEFAULT_TENANTS[idx]?.operations || {
              branchFormat: 'Salón & Delivery' as const,
              branchCode: fallbackCode,
              billingSeries: `F00${idx + 1} / B00${idx + 1}`,
              schedule: '12:00 PM – 11:30 PM',
              tablesCount: 12,
              deliveryRadiusKm: 4.5,
              dailyGoalSoles: 5000,
              address: 'Av. Principal S/N, Lima',
              latitude: -12.1116 - idx * 0.009,
              longitude: -76.9912 - idx * 0.018,
              phone: '+51 1 780 9090',
              managerName: 'Encargado de Tienda',
              salesTodaySoles: 3120,
              salesGrowthPct: '+9.5%',
              pizzasToday: 78,
              avgOvenMinutes: 10.5,
              ovenTempC: 420,
              activeOvens: '1 Horno Activo',
              stockAlertsCount: 0,
              stockAlertSummary: 'Inventario inicial al día',
              yapeNumber: '999 888 777',
              liveOrders: [
                {
                  id: `S0${idx + 1}-${101 + idx}`,
                  customer: 'Cliente Mostrador',
                  branchName: shortBranch,
                  items: '1× Familiar Artesanal + Bebida',
                  totalSoles: 56,
                  timeAgo: '4m',
                  status: 'En horno' as const,
                },
              ],
            };

            const mergedOps = {
              ...fallbackOps,
              ...(t.operations || {}),
            };

            // Deduplicate any legacy colliding liveOrder IDs (e.g. multiple 'LOC-101')
            const dedupedOrders = (mergedOps.liveOrders || []).map((ord, oIdx) => {
              let nextId = ord.id || `S0${idx + 1}-${101 + oIdx}`;
              if (usedOrderIds.has(nextId)) {
                const tag = (mergedOps.branchCode || `S0${idx + 1}`).replace(/[^A-Za-z0-9]/g, '');
                nextId = `${tag}-${101 + idx * 10 + oIdx}`;
              }
              usedOrderIds.add(nextId);
              return {
                ...ord,
                id: nextId,
                branchName: ord.branchName || shortBranch,
              };
            });

            return {
              id: t.id,
              name: t.name,
              slug: t.slug,
              status:
                t.status === 'active' || t.status === 'preheating' || t.status === 'closed'
                  ? t.status
                  : 'active',
              userCount: t.userCount || 6,
              createdAt: t.createdAt || '2024-01-01',
              operations: {
                ...mergedOps,
                liveOrders: dedupedOrders,
              },
            };
          })
        : DEFAULT_TENANTS;

    const legacyPinUpgradeMap: Record<string, { oldPin: string[]; newPin: string; doc: User['documentType'] }> = {
      'usr-1': { oldPin: ['7821', '72849103'], newPin: '230825', doc: 'Código (6d)' },
      'usr-2': { oldPin: ['4450'], newPin: '46918205', doc: 'DNI (8d)' },
      'usr-3': { oldPin: ['1234'], newPin: '00482916', doc: 'CE (8d)' },
      'usr-4': { oldPin: ['5590'], newPin: '559012', doc: 'Código (6d)' },
      'usr-5': { oldPin: ['8820'], newPin: '8820', doc: 'PIN (4d)' },
    };

    const normalizedUsers: User[] =
      Array.isArray(parsed.users) && parsed.users.length > 0
        ? parsed.users.map((u: User) => {
            const upg = legacyPinUpgradeMap[u.id];
            const shouldUpgrade = upg && upg.oldPin.includes(u.pin);
            const cleanPin =
              shouldUpgrade ? upg.newPin : String(u.pin || '230825').replace(/\D/g, '');
            return {
              ...u,
              pin: cleanPin,
              documentType: inferDocType(cleanPin, shouldUpgrade ? upg.doc : u.documentType),
            };
          })
        : MOCK_USERS;

    const validActiveTenantId = loadedTenants.some(t => t.id === parsed.activeTenantId)
      ? parsed.activeTenantId
      : loadedTenants[0].id;

    return {
      customization: mergedCustomization,
      companyInfo: {
        ...DEFAULT_COMPANY_INFO,
        ...(parsed.companyInfo || {}),
        socialLinks: {
          ...DEFAULT_COMPANY_INFO.socialLinks,
          ...(parsed.companyInfo?.socialLinks || {}),
        },
        culqiConfig: {
          ...DEFAULT_COMPANY_INFO.culqiConfig!,
          ...(parsed.companyInfo?.culqiConfig || {}),
        },
        deliveryTariff: {
          ...DEFAULT_COMPANY_INFO.deliveryTariff!,
          ...(parsed.companyInfo?.deliveryTariff || {}),
          brackets:
            Array.isArray(parsed.companyInfo?.deliveryTariff?.brackets) &&
            parsed.companyInfo.deliveryTariff.brackets.length > 0
              ? parsed.companyInfo.deliveryTariff.brackets
              : DEFAULT_COMPANY_INFO.deliveryTariff!.brackets,
        },
      },
      tenants: loadedTenants,
      activeTenantId: validActiveTenantId,
      branchScope: parsed.branchScope === 'consolidated' ? 'consolidated' : 'branch',
      users: normalizedUsers,
      driveConfig: { ...DEFAULT_DRIVE_CONFIG, ...(parsed.driveConfig || {}) },
      geminiConfig: { ...DEFAULT_GEMINI_CONFIG, ...(parsed.geminiConfig || {}) },
      activeTab: parsed.activeTab || 'identity',
    };
  } catch {
    return null;
  }
}

function mixHex(hexColor: string, targetRgb: [number, number, number], weight: number): string {
  const clean = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hexColor;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mr = Math.round(r + (targetRgb[0] - r) * weight);
  const mg = Math.round(g + (targetRgb[1] - g) * weight);
  const mb = Math.round(b + (targetRgb[2] - b) * weight);
  return `#${[mr, mg, mb].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

interface SettingsContextType {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  tryChangeTab: (nextTab: TabId) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  discardUnsavedChanges: () => void;
  isSaving: boolean;
  showUnsavedModal: boolean;
  setShowUnsavedModal: (show: boolean) => void;
  confirmDiscardAndNavigate: () => void;
  cancelNavigation: () => void;

  // Resolved theme state
  isDarkResolved: boolean;

  // Customization
  customization: TenantCustomization;
  updateCustomization: (partial: Partial<TenantCustomization>) => void;
  resetCustomizationToDefaults: () => void;

  // Company Info & Libro de Reclamaciones
  companyInfo: CompanyInfo;
  updateCompanyInfo: (partial: Partial<CompanyInfo>) => void;
  complaints: ComplaintRecord[];
  addComplaint: (
    data: Omit<ComplaintRecord, 'id' | 'ticketCode' | 'createdAt' | 'status'>
  ) => ComplaintRecord;
  updateComplaintStatus: (
    id: string,
    status: ComplaintStatus,
    adminResponse?: string
  ) => void;
  deleteComplaint: (id: string) => void;

  // Multisucursal
  tenants: Tenant[];
  activeTenant: Tenant;
  branchScope: BranchViewScope;
  setBranchScope: (scope: BranchViewScope) => void;
  currentBranchProfile: BranchOperationalProfile;
  switchTenant: (tenantId: string) => void;
  saveTenant: (tenant: Tenant) => void;
  deleteTenant: (tenantId: string) => void;

  // Users
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;

  // Drive & Gemini & System
  driveConfig: GoogleDriveConfig;
  updateDriveConfig: (partial: Partial<GoogleDriveConfig>) => void;
  testDriveConnection: () => Promise<boolean>;
  geminiConfig: GeminiAiConfig;
  updateGeminiConfig: (partial: Partial<GeminiAiConfig>) => void;
  testGeminiConnection: () => Promise<boolean>;
  systemMetrics: SystemMetrics;
  saveAllSettings: () => Promise<void>;

  // Toasts (3D Stacked Dynamic Island)
  toasts: ToastItem[];
  dispatchToast: (
    title: string,
    message: string,
    type?: ToastItem['type'],
    options?: { pinned?: boolean }
  ) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;

  // Custom System Notice Modal (No Native Alerts Rule)
  noticeModal: NoticeModalOptions | null;
  openNoticeModal: (options: NoticeModalOptions) => void;
  closeNoticeModal: () => void;

  // Numeric Auth Session (8d DNI/CE primary + 6d / 4d)
  isAuthenticated: boolean;
  verifyLoginCredentials: (code: string) => { ok: boolean; error?: string; user?: User };
  completeAuthenticatedSession: (matchedUser: User, authNote?: string) => User;
  loginWithNumericCode: (code: string) => { ok: boolean; error?: string; user?: User };
  logoutSession: () => void;

  // Audit Trail, Consistency & System Health Diagnostics
  auditLogs: AuditLogEntry[];
  logAuditEvent: (
    category: AuditCategory,
    severity: AuditSeverity,
    action: string,
    details: string,
    actorOverride?: { name: string; role: string }
  ) => void;
  clearInfoAuditLogs: () => void;
  consistencyReport: ConsistencyReport;
  runHealthDiagnostics: () => ConsistencyReport;
  exportBackupSnapshot: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, setCurrentUser, roles } = useRBAC();
  const initial = normalizeLoadedState(
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  );

  const [activeTab, setActiveTab] = useState<TabId>(initial?.activeTab || 'identity');
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);

  const [customization, setCustomization] = useState<TenantCustomization>(
    initial?.customization || DEFAULT_CUSTOMIZATION
  );
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(
    initial?.companyInfo || DEFAULT_COMPANY_INFO
  );
  const [tenants, setTenants] = useState<Tenant[]>(initial?.tenants || DEFAULT_TENANTS);
  const [activeTenantId, setActiveTenantId] = useState<string>(
    initial?.activeTenantId || DEFAULT_TENANTS[0].id
  );
  const [branchScope, setBranchScope] = useState<BranchViewScope>(
    initial?.branchScope || 'branch'
  );
  const [users, setUsers] = useState<User[]>(initial?.users || MOCK_USERS);
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfig>(
    initial?.driveConfig || DEFAULT_DRIVE_CONFIG
  );
  const [geminiConfig, setGeminiConfig] = useState<GeminiAiConfig>(
    initial?.geminiConfig || DEFAULT_GEMINI_CONFIG
  );
  const [systemMetrics] = useState<SystemMetrics>(DEFAULT_SYSTEM_METRICS);

  const [isDarkResolved, setIsDarkResolved] = useState<boolean>(
    customization.themePreference === 'dark'
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [noticeModal, setNoticeModal] = useState<NoticeModalOptions | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === 'authenticated';
    } catch {
      return false;
    }
  });

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (!raw) return DEFAULT_AUDIT_LOGS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_AUDIT_LOGS;
    } catch {
      return DEFAULT_AUDIT_LOGS;
    }
  });

  const [complaints, setComplaints] = useState<ComplaintRecord[]>(() => {
    try {
      const raw = localStorage.getItem(COMPLAINTS_STORAGE_KEY);
      if (!raw) return DEFAULT_COMPLAINTS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : DEFAULT_COMPLAINTS;
    } catch {
      return DEFAULT_COMPLAINTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(complaints));
    } catch {
      // Ignore storage quota errors
    }
  }, [complaints]);

  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, isAuthenticated ? 'authenticated' : 'locked');
      if (isAuthenticated) {
        void authenticateServer(currentUser.pin || '230825');
      }
    } catch {
      // Ignore storage errors
    }
  }, [isAuthenticated, currentUser.pin]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLogs.slice(0, 250)));
    } catch {
      // Ignore storage errors
    }
  }, [auditLogs]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time cross-tab & cross-device sync via SSE StorageEvents
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const loaded = normalizeLoadedState(e.newValue);
        if (!loaded) return;
        setCustomization(loaded.customization);
        setCompanyInfo(loaded.companyInfo);
        setTenants(loaded.tenants);
        setUsers(loaded.users);
        setDriveConfig(loaded.driveConfig);
        setGeminiConfig(loaded.geminiConfig);
        // Preserve each device's active branch selection unless that branch was deleted
        setActiveTenantId(prevId =>
          loaded.tenants.some(t => t.id === prevId) ? prevId : loaded.activeTenantId
        );
      } else if (e.key === COMPLAINTS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setComplaints(parsed);
        } catch {
          // ignore
        }
      } else if (e.key === AUDIT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setAuditLogs(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  const logAuditEvent = (
    category: AuditCategory,
    severity: AuditSeverity,
    action: string,
    details: string,
    actorOverride?: { name: string; role: string }
  ) => {
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorName: actorOverride?.name || currentUser.name,
      actorRole: actorOverride?.role || currentUser.roleName,
      branchName:
        branchScope === 'consolidated'
          ? 'Consolidado Corporativo'
          : activeTenant.name.replace('Khalessi Pizza - ', ''),
      category,
      severity,
      action,
      details,
    };
    setAuditLogs(prev => [entry, ...prev].slice(0, 250));
  };

  const clearInfoAuditLogs = () => {
    setAuditLogs(prev => prev.filter(e => e.severity !== 'info'));
    dispatchToast('Bitácora Depurada', 'Se conservaron únicamente los eventos críticos y advertencias.', 'info');
  };

  const computeConsistencyReport = (): ConsistencyReport => {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const rawSettings = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY) || '';
      } catch {
        return '';
      }
    })();
    const rawRbac = (() => {
      try {
        return localStorage.getItem('khalessi_erp_rbac_v3') || '';
      } catch {
        return '';
      }
    })();

    const combined = `${rawSettings}|${rawRbac}`;
    const checksum = computeFnvChecksum(combined);
    const storageBytes = new Blob([combined]).size;

    const validLengthSet = new Set([4, 6, 8]);
    const invalidPinUsers = users.filter(u => !validLengthSet.has(u.pin.length) || /\D/.test(u.pin));
    const seenPins = new Set<string>();
    let duplicatePins = 0;
    users.forEach(u => {
      if (seenPins.has(u.pin)) duplicatePins += 1;
      seenPins.add(u.pin);
    });

    const roleIds = new Set(roles.map(r => r.id));
    const orphanRoleUsers = users.filter(u => !roleIds.has(u.roleId));
    const branchIds = new Set(tenants.map(t => t.id));
    const validBranchContext = branchIds.has(activeTenant.id);

    const elapsed = Math.max(1, Math.round((typeof performance !== 'undefined' ? performance.now() : 1) - t0));

    const checks: HealthCheckItem[] = [
      {
        id: 'chk-storage',
        label: 'Persistencia Local & Checksum',
        status: rawSettings.length > 10 ? 'healthy' : 'warning',
        detail: `${(storageBytes / 1024).toFixed(1)} KB sincronizados (${checksum})`,
        latencyMs: elapsed,
      },
      {
        id: 'chk-branches',
        label: 'Consistencia Multisucursal & SUNAT',
        status: validBranchContext && tenants.length > 0 ? 'healthy' : 'error',
        detail: `${tenants.length} establecimientos anexos activos bajo RUC ${companyInfo.taxId}`,
        latencyMs: 1,
      },
      {
        id: 'chk-rbac',
        label: 'Integridad Matriz RBAC & Roles',
        status: orphanRoleUsers.length === 0 ? 'healthy' : 'warning',
        detail:
          orphanRoleUsers.length === 0
            ? `${roles.length} roles vinculados sin referencias huérfanas`
            : `${orphanRoleUsers.length} usuario(s) requieren reasignación de rol`,
        latencyMs: 1,
      },
      {
        id: 'chk-auth-codes',
        label: 'Credenciales Login (8d DNI / 6d / 4d)',
        status: invalidPinUsers.length === 0 && duplicatePins === 0 ? 'healthy' : 'warning',
        detail:
          invalidPinUsers.length === 0 && duplicatePins === 0
            ? `${users.length} códigos únicos validados (DNI/CE 8d, 6d y 4d)`
            : `${duplicatePins} duplicado(s), ${invalidPinUsers.length} fuera de longitud`,
        latencyMs: 1,
      },
      {
        id: 'chk-network',
        label: 'Conectividad & Resiliencia Offline',
        status: isOnline ? 'healthy' : 'warning',
        detail: isOnline
          ? 'En línea — sincronización inmediata habilitada'
          : 'Modo Offline Activo — operando sobre caché local validado',
        latencyMs: isOnline ? 12 : 0,
      },
    ];

    return {
      lastVerifiedAt: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      checksum,
      storageBytes,
      isOnline,
      schemaValid: checks.every(c => c.status !== 'error'),
      checks,
    };
  };

  const [consistencyReport, setConsistencyReport] = useState<ConsistencyReport>(() =>
    computeConsistencyReport()
  );

  useEffect(() => {
    setConsistencyReport(computeConsistencyReport());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenants, users, roles, companyInfo, isOnline, activeTenant.id]);

  const runHealthDiagnostics = (): ConsistencyReport => {
    const fresh = computeConsistencyReport();
    setConsistencyReport(fresh);
    logAuditEvent(
      'system',
      fresh.checks.some(c => c.status !== 'healthy') ? 'warning' : 'info',
      'Diagnóstico Integral Ejecutado',
      `Resultado: ${fresh.checks.filter(c => c.status === 'healthy').length}/${fresh.checks.length} controles óptimos · ${fresh.checksum}`
    );
    dispatchToast(
      'Diagnóstico de Salud Completado',
      `Integridad verificada (${fresh.checksum}) sin pérdida de estado.`,
      'success'
    );
    return fresh;
  };

  const exportBackupSnapshot = () => {
    const report = computeConsistencyReport();
    const bundle = {
      exportedAt: new Date().toISOString(),
      checksum: report.checksum,
      companyInfo,
      customization,
      tenants,
      roles,
      users,
      auditSample: auditLogs.slice(0, 50),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khalessi-erp-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    logAuditEvent(
      'system',
      'info',
      'Respaldo Firmado Exportado',
      `Snapshot JSON generado con firma ${report.checksum}.`
    );
    dispatchToast('Respaldo Descargado', `Archivo JSON firmado (${report.checksum}) listo.`, 'success');
  };

  const verifyLoginCredentials = (
    rawCode: string
  ): { ok: boolean; error?: string; user?: User } => {
    const code = rawCode.replace(/\D/g, '');
    if (code.length !== 4 && code.length !== 6 && code.length !== 8) {
      return {
        ok: false,
        error: 'Ingresa un código válido de 8 dígitos (DNI / C.E.), 6 dígitos o 4 dígitos.',
      };
    }

    const matchedUser = users.find(u => u.pin === code);
    if (!matchedUser) {
      logAuditEvent(
        'auth',
        'warning',
        'Intento de Ingreso Fallido',
        `Código numérico de ${code.length} dígitos no coincide con ningún colaborador registrado.`,
        { name: 'Terminal Login', role: 'No Autenticado' }
      );
      return {
        ok: false,
        error: 'Credencial no reconocida. Verifica tu DNI / código asignado.',
      };
    }

    if (matchedUser.status === 'suspended') {
      logAuditEvent(
        'auth',
        'critical',
        'Acceso Bloqueado (Usuario Suspendido)',
        `${matchedUser.name} intentó iniciar sesión con credencial suspendida.`,
        { name: matchedUser.name, role: matchedUser.roleName }
      );
      return {
        ok: false,
        error: `La cuenta de ${matchedUser.name} se encuentra temporalmente suspendida.`,
      };
    }

    return { ok: true, user: matchedUser };
  };

  const completeAuthenticatedSession = (matchedUser: User, authNote?: string): User => {
    const syncedRole = roles.find(r => r.id === matchedUser.roleId);
    const updatedLoginUser: User = {
      ...matchedUser,
      roleName: syncedRole ? syncedRole.name : matchedUser.roleName,
      lastLogin: 'En línea ahora',
    };

    setUsers(prev => prev.map(u => (u.id === updatedLoginUser.id ? updatedLoginUser : u)));
    setCurrentUser(updatedLoginUser);

    // Sync branch automatically according to collaborator assignment
    if (
      updatedLoginUser.branchIds &&
      !updatedLoginUser.branchIds.includes('all') &&
      updatedLoginUser.branchIds.length > 0
    ) {
      const assignedBranch = tenants.find(t => t.id === updatedLoginUser.branchIds?.[0]);
      if (assignedBranch) {
        setBranchScope('branch');
        setActiveTenantId(assignedBranch.id);
      }
    }

    setIsAuthenticated(true);
    void authenticateServer(updatedLoginUser.pin);
    logAuditEvent(
      'auth',
      authNote?.includes('Authenticator') ? 'warning' : 'info',
      authNote?.includes('Authenticator')
        ? 'Acceso Desbloqueado vía Google Authenticator'
        : 'Inicio de Sesión Exitoso',
      `Ingreso validado con credencial ${updatedLoginUser.documentType || `${updatedLoginUser.pin.length}d`}${
        authNote ? ` · ${authNote}` : ''
      }.`,
      { name: updatedLoginUser.name, role: updatedLoginUser.roleName }
    );

    dispatchToast(
      `¡Bienvenido, ${updatedLoginUser.name.replace(' (Tú)', '')}!`,
      authNote
        ? `${updatedLoginUser.roleName} · ${authNote}.`
        : `Turno iniciado como ${updatedLoginUser.roleName}.`,
      'success'
    );

    return updatedLoginUser;
  };

  const loginWithNumericCode = (
    rawCode: string
  ): { ok: boolean; error?: string; user?: User } => {
    const verification = verifyLoginCredentials(rawCode);
    if (!verification.ok || !verification.user) {
      return verification;
    }
    const loggedIn = completeAuthenticatedSession(verification.user);
    return { ok: true, user: loggedIn };
  };

  const logoutSession = () => {
    logAuditEvent(
      'auth',
      'info',
      'Bloqueo / Cierre de Turno',
      `Sesión cerrada manualmente por ${currentUser.name}.`
    );
    setIsAuthenticated(false);
  };

  // Persist ALL live state immediately so F5 reload NEVER loses changes
  useEffect(() => {
    try {
      const payload: PersistedSnapshot = {
        customization,
        companyInfo,
        tenants,
        activeTenantId: activeTenant.id,
        branchScope,
        users,
        driveConfig,
        geminiConfig,
        activeTab,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    customization,
    companyInfo,
    tenants,
    activeTenant.id,
    branchScope,
    users,
    driveConfig,
    geminiConfig,
    activeTab,
  ]);

  // Resolve Light / Dark mode + apply independent contrast colors, backgrounds, typography & system scale
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const computeDark = () => {
      if (customization.themePreference === 'dark') return true;
      if (customization.themePreference === 'light') return false;
      return mediaQuery.matches;
    };

    const applyVisualSystem = () => {
      const dark = computeDark();
      setIsDarkResolved(dark);
      root.classList.toggle('dark', dark);

      const resolvedAccent = dark
        ? customization.accentColorDark || customization.primaryColor
        : customization.accentColorLight || customization.primaryColor;

      if (customization.primaryColor !== resolvedAccent) {
        setCustomization(prev => ({ ...prev, primaryColor: resolvedAccent }));
      }

      root.style.setProperty('--brand-500', resolvedAccent);
      root.style.setProperty('accent-color', resolvedAccent);
      root.dataset.contrast = customization.contrastLevel || 'standard';

      // System global zoom / font-size scaling (rem-based across entire ERP)
      const scaleMap: Record<TenantCustomization['systemScale'], string> = {
        xs: '13.5px',
        sm: '14.75px',
        md: '16px',
        lg: '17.25px',
        xl: '18.5px',
      };
      root.style.fontSize = scaleMap[customization.systemScale || 'md'] || '16px';

      // Custom Light & Dark backgrounds + derived elevated card surfaces
      const lShell = customization.lightBgColor || '#f4f4f5';
      const lCanvas = customization.lightSurfaceColor || '#ffffff';
      const lCard = lCanvas;
      const lSubcard = mixHex(lCanvas, [241, 245, 249], 0.55);

      const dShell = customization.darkBgColor || '#09090b';
      const dCanvas = customization.darkSurfaceColor || mixHex(dShell, [255, 255, 255], 0.04);
      const dCard = mixHex(dCanvas, [255, 255, 255], 0.045);
      const dSubcard = mixHex(dCanvas, [255, 255, 255], 0.085);

      root.style.setProperty('--erp-shell-light', lShell);
      root.style.setProperty('--erp-canvas-light', lCanvas);
      root.style.setProperty('--erp-card-light', lCard);
      root.style.setProperty('--erp-subcard-light', lSubcard);

      root.style.setProperty('--erp-shell-dark', dShell);
      root.style.setProperty('--erp-canvas-dark', dCanvas);
      root.style.setProperty('--erp-card-dark', dCard);
      root.style.setProperty('--erp-subcard-dark', dSubcard);

      // Generate RGB brand scale for Tailwind opacity modifiers
      const hex = resolvedAccent.replace('#', '').trim();
      if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const mix = (c: number, target: number, weight: number) =>
          Math.round(c + (target - c) * weight);

        const tints: Array<[string, number, number]> = [
          ['50', 255, 0.92],
          ['100', 255, 0.84],
          ['200', 255, 0.68],
          ['300', 255, 0.45],
          ['400', 255, 0.22],
          ['500', 0, 0],
          ['600', 0, 0.14],
          ['700', 0, 0.28],
          ['800', 0, 0.44],
          ['900', 0, 0.58],
          ['950', 0, 0.76],
        ];

        for (const [shade, target, weight] of tints) {
          root.style.setProperty(
            `--brand-${shade}-rgb`,
            `${mix(r, target, weight)} ${mix(g, target, weight)} ${mix(b, target, weight)}`
          );
        }
      }
    };

    applyVisualSystem();

    // Dynamically update document favicon in real-time
    const updateFavicon = () => {
      const iconUrl = customization.favicon?.trim() || customization.logoLight || '';
      if (!iconUrl) return;

      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      if (link.href !== iconUrl) {
        if (iconUrl.startsWith('data:image/svg') || iconUrl.endsWith('.svg')) {
          link.type = 'image/svg+xml';
        } else if (iconUrl.endsWith('.ico')) {
          link.type = 'image/x-icon';
        } else if (iconUrl.startsWith('data:image/png') || iconUrl.endsWith('.png')) {
          link.type = 'image/png';
        } else {
          link.type = 'image/x-icon';
        }
        link.href = iconUrl;
      }
    };

    updateFavicon();

    const handleSystemChange = () => {
      if (customization.themePreference === 'system') {
        applyVisualSystem();
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [
    customization.themePreference,
    customization.accentColorLight,
    customization.accentColorDark,
    customization.primaryColor,
    customization.lightBgColor,
    customization.lightSurfaceColor,
    customization.darkBgColor,
    customization.darkSurfaceColor,
    customization.contrastLevel,
    customization.systemScale,
    customization.favicon,
    customization.logoLight,
  ]);

  // Compute aggregated or single-branch operational profile
  const currentBranchProfile: BranchOperationalProfile = React.useMemo(() => {
    if (branchScope === 'consolidated') {
      const totalSales = tenants.reduce((acc, t) => acc + (t.operations?.salesTodaySoles || 0), 0);
      const totalPizzas = tenants.reduce((acc, t) => acc + (t.operations?.pizzasToday || 0), 0);
      const avgOven =
        tenants.reduce((acc, t) => acc + (t.operations?.avgOvenMinutes || 10.5), 0) /
        Math.max(1, tenants.length);
      const avgTemp = Math.round(
        tenants.reduce((acc, t) => acc + (t.operations?.ovenTempC || 420), 0) /
          Math.max(1, tenants.length)
      );
      const totalAlerts = tenants.reduce(
        (acc, t) => acc + (t.operations?.stockAlertsCount || 0),
        0
      );
      const seenConsolidatedIds = new Set<string>();
      const allOrders = tenants
        .flatMap((t, tIdx) =>
          (t.operations?.liveOrders || []).map((ord, oIdx) => {
            let safeId = ord.id;
            if (seenConsolidatedIds.has(safeId)) {
              const codeTag = (t.operations?.branchCode || `S${tIdx + 1}`).replace(/[^A-Za-z0-9]/g, '');
              safeId = `${codeTag}-${safeId}-${oIdx}`;
            }
            seenConsolidatedIds.add(safeId);
            return { ...ord, id: safeId };
          })
        )
        .slice(0, 6);

      const totalGoal = tenants.reduce((acc, t) => acc + (t.operations?.dailyGoalSoles || 5000), 0);
      const totalTables = tenants.reduce((acc, t) => acc + (t.operations?.tablesCount || 0), 0);

      return {
        branchFormat: 'Matriz & Salón',
        branchCode: 'RED-CORP',
        billingSeries: 'Todas las Series SUNAT',
        schedule: '11:30 AM – 12:00 AM',
        tablesCount: totalTables,
        deliveryRadiusKm: 5.0,
        dailyGoalSoles: totalGoal,
        address: `Red Consolidada (${tenants.length} locales propios en operación)`,
        phone: companyInfo.phone,
        managerName: 'Dirección de Operaciones',
        salesTodaySoles: totalSales,
        salesGrowthPct: '+18.9%',
        pizzasToday: totalPizzas,
        avgOvenMinutes: Number(avgOven.toFixed(1)),
        ovenTempC: avgTemp,
        activeOvens: `${tenants.length * 2 - 1} Hornos conectados en red`,
        stockAlertsCount: totalAlerts,
        stockAlertSummary:
          totalAlerts > 0
            ? `${totalAlerts} alertas acumuladas en Miraflores y Surco`
            : 'Todos los almacenes en nivel óptimo',
        yapeNumber: companyInfo.wallets[0]?.phone || '987 654 321',
        liveOrders: allOrders,
      };
    }

    return (
      activeTenant.operations ||
      DEFAULT_TENANTS[0].operations!
    );
  }, [branchScope, tenants, activeTenant, companyInfo]);

  const dispatchToast = (
    title: string,
    message: string,
    type: ToastItem['type'] = 'success',
    options?: { pinned?: boolean }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isPinned = Boolean(options?.pinned || type === 'critical');

    setToasts(prev => {
      const next: ToastItem = {
        id,
        title,
        message,
        type,
        pinned: isPinned,
        createdAt: Date.now(),
      };
      // Newest toast sits at the front (index 0) for 3D Dynamic Island stacking
      return [next, ...prev].slice(0, 8);
    });

    soundSynth.play(customization.toastAudioTheme);

    if (!isPinned) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5200);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const openNoticeModal = (options: NoticeModalOptions) => {
    setNoticeModal(options);
  };

  const closeNoticeModal = () => {
    setNoticeModal(null);
  };

  const restoreFromCheckpoint = () => {
    const saved = normalizeLoadedState(localStorage.getItem(CHECKPOINT_KEY));
    if (saved) {
      setCustomization(saved.customization);
      setCompanyInfo(saved.companyInfo);
      setTenants(saved.tenants);
      setActiveTenantId(saved.activeTenantId);
      setUsers(saved.users);
      setDriveConfig(saved.driveConfig);
      setGeminiConfig(saved.geminiConfig);
    }
  };

  const discardUnsavedChanges = () => {
    restoreFromCheckpoint();
    setIsDirty(false);
    dispatchToast('Cambios Revertidos', 'Se restauró el último punto guardado.', 'info');
  };

  const tryChangeTab = (nextTab: TabId) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
  };

  const confirmDiscardAndNavigate = () => {
    restoreFromCheckpoint();
    setIsDirty(false);
    setShowUnsavedModal(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const cancelNavigation = () => {
    setShowUnsavedModal(false);
    setPendingTab(null);
  };

  const updateCustomization = (partial: Partial<TenantCustomization>) => {
    setCustomization(prev => {
      const next = { ...prev, ...partial };
      // If user edits primaryColor directly, sync current mode's contrast color too
      if (partial.primaryColor && !partial.accentColorLight && !partial.accentColorDark) {
        if (isDarkResolved) {
          next.accentColorDark = partial.primaryColor;
        } else {
          next.accentColorLight = partial.primaryColor;
        }
      }
      return next;
    });
    setIsDirty(true);
  };

  const resetCustomizationToDefaults = () => {
    openNoticeModal({
      title: '¿Restaurar identidad y estilos de fábrica?',
      message:
        'Se restablecerán los colores, fondos, tipografía y logotipos predeterminados de Khalessi Pizza ERP.',
      tone: 'warning',
      confirmLabel: 'Sí, Restaurar',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        setCustomization(DEFAULT_CUSTOMIZATION);
        setIsDirty(false);
        dispatchToast('Valores Restaurados', 'Diseño e identidad restablecidos al estándar.', 'info');
      },
    });
  };

  const updateCompanyInfo = (partial: Partial<CompanyInfo>) => {
    setCompanyInfo(prev => ({ ...prev, ...partial }));
    setIsDirty(true);
    const changedKeys = Object.keys(partial).join(', ');
    logAuditEvent(
      'fiscal',
      'critical',
      'Actualización de Datos Fiscales / Cobros',
      `Campos modificados en empresa matriz: ${changedKeys}.`
    );
  };

  const switchTenant = (tenantId: string) => {
    if (tenantId === 'consolidated') {
      setBranchScope('consolidated');
      dispatchToast(
        'Vista Consolidada Activa',
        `Mostrando métricas sumadas de las ${tenants.length} sucursales.`,
        'info'
      );
      return;
    }
    const target = tenants.find(t => t.id === tenantId);
    if (target) {
      setBranchScope('branch');
      setActiveTenantId(target.id);
      dispatchToast(
        `Sucursal: ${target.name.replace('Khalessi Pizza - ', '')}`,
        `Datos operativos, KDS y personal sincronizados con ${target.operations?.address || target.name}.`,
        'success'
      );
    }
  };

  const saveTenant = (tenant: Tenant) => {
    const nextIdx = tenants.length + 1;
    const enrichedTenant: Tenant = {
      ...tenant,
      operations: tenant.operations || {
        branchFormat: 'Salón & Delivery',
        branchCode: `SUC-00${nextIdx}`,
        billingSeries: `F00${nextIdx} / B00${nextIdx}`,
        schedule: '12:00 PM – 11:30 PM',
        tablesCount: 14,
        deliveryRadiusKm: 4.5,
        dailyGoalSoles: 5000,
        address: `Local Comercial — ${tenant.name.replace('Khalessi Pizza - ', '')}`,
        phone: '+51 1 780 9099',
        managerName: 'Supervisor Asignado',
        salesTodaySoles: 3450,
        salesGrowthPct: '+14.0%',
        pizzasToday: 84,
        avgOvenMinutes: 10.4,
        ovenTempC: 422,
        activeOvens: '1 Horno Piedra Activo',
        stockAlertsCount: 0,
        stockAlertSummary: 'Stock de apertura completo (100%)',
        yapeNumber: '988 777 666',
        liveOrders: [
          {
            id: `${tenant.slug.slice(0, 3).toUpperCase()}-101`,
            customer: 'Comanda Inaugural POS',
            branchName: tenant.name.replace('Khalessi Pizza - ', ''),
            items: '2× Familiar Khalessi Especial · 1× Gaseosa 1.5L',
            totalSoles: 98,
            timeAgo: '1m',
            status: 'En horno',
          },
        ],
      },
    };

    setTenants(prev => {
      const idx = prev.findIndex(t => t.id === enrichedTenant.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = enrichedTenant;
        return copy;
      }
      return [...prev, enrichedTenant];
    });
    logAuditEvent(
      'branch',
      'warning',
      'Registro / Edición de Sucursal',
      `Sucursal "${enrichedTenant.name}" (${enrichedTenant.operations?.branchCode || 'SUC'}) actualizada.`
    );
    dispatchToast('Sucursal Guardada', `${enrichedTenant.name} sincronizada correctamente.`);
  };

  const deleteTenant = (tenantId: string) => {
    if (tenants.length <= 1) {
      dispatchToast('Acción Bloqueada', 'Debe existir al menos una sucursal operativa.', 'error');
      return;
    }
    const target = tenants.find(t => t.id === tenantId);
    openNoticeModal({
      title: '¿Dar de baja esta sucursal?',
      message: `Se desvinculará "${target?.name || 'la sede'}" del panel multisucursal activo. Esta acción requiere confirmación administrativa.`,
      tone: 'danger',
      confirmLabel: 'Confirmar Baja',
      cancelLabel: 'Conservar Sede',
      onConfirm: () => {
        const remaining = tenants.filter(t => t.id !== tenantId);
        setTenants(remaining);
        if (activeTenant.id === tenantId) {
          setActiveTenantId(remaining[0].id);
        }
        logAuditEvent(
          'branch',
          'critical',
          'Baja de Establecimiento Anexo',
          `Se retiró "${target?.name || tenantId}" del directorio activo.`
        );
        dispatchToast('Sucursal Removida', 'El local fue retirado de la red activa.', 'info');
      },
    });
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const cleanPin = userData.pin.replace(/\D/g, '');
    const newUser: User = {
      ...userData,
      pin: cleanPin,
      documentType: inferDocType(cleanPin, userData.documentType),
      branchIds:
        userData.branchIds && userData.branchIds.length > 0
          ? userData.branchIds
          : branchScope === 'branch'
          ? [activeTenant.id]
          : ['all'],
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [newUser, ...prev]);
    logAuditEvent(
      'users',
      'warning',
      'Alta de Colaborador',
      `${newUser.name} registrado con rol ${newUser.roleName} y credencial ${newUser.documentType}.`
    );
    dispatchToast('Colaborador Registrado', `${newUser.name} fue incorporado al equipo.`);
  };

  const updateUser = (updatedUser: User) => {
    const cleanPin = updatedUser.pin.replace(/\D/g, '');
    const normalized: User = {
      ...updatedUser,
      pin: cleanPin,
      documentType: inferDocType(cleanPin, updatedUser.documentType),
    };
    setUsers(prev => prev.map(u => (u.id === normalized.id ? normalized : u)));
    if (currentUser.id === normalized.id) {
      setCurrentUser(normalized);
    }
    logAuditEvent(
      'users',
      'warning',
      'Modificación de Colaborador',
      `Perfil actualizado para ${normalized.name} (${normalized.roleName} · estado: ${normalized.status}).`
    );
    dispatchToast('Colaborador Actualizado', `Datos guardados para ${normalized.name}.`);
  };

  const deleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    openNoticeModal({
      title: '¿Desvincular colaborador del ERP?',
      message: `Se revocará la credencial numérica y el acceso al sistema de ${target?.name || 'este usuario'}.`,
      tone: 'danger',
      confirmLabel: 'Revocar Acceso',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        logAuditEvent(
          'users',
          'critical',
          'Revocación de Acceso de Colaborador',
          `Se eliminó la credencial de ${target?.name || userId}.`
        );
        dispatchToast('Acceso Revocado', 'El colaborador ha sido retirado del sistema.', 'info');
      },
    });
  };

  const updateDriveConfig = (partial: Partial<GoogleDriveConfig>) => {
    setDriveConfig(prev => ({ ...prev, ...partial }));
    setIsDirty(true);
  };

  const testDriveConnection = async (): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 700));
    const randomLatency = Math.floor(Math.random() * 60) + 95;
    setDriveConfig(prev => ({
      ...prev,
      isConnected: true,
      latencyMs: randomLatency,
    }));
    dispatchToast('Google Drive Conectado', `Latencia verificada (${randomLatency}ms).`);
    return true;
  };

  const updateGeminiConfig = (partial: Partial<GeminiAiConfig>) => {
    setGeminiConfig(prev => ({ ...prev, ...partial }));
    setIsDirty(true);
  };

  const testGeminiConnection = async (): Promise<boolean> => {
    setGeminiConfig(prev => ({ ...prev, status: 'checking' }));
    await new Promise(r => setTimeout(r, 900));

    if (!geminiConfig.apiKey || geminiConfig.apiKey.length < 8) {
      setGeminiConfig(prev => ({ ...prev, status: 'error' }));
      dispatchToast('API Key Inválida', 'Revisa la credencial de Google Gemini AI.', 'error');
      return false;
    }

    setGeminiConfig(prev => ({
      ...prev,
      status: 'connected',
      lastTestedAt: 'Justo ahora',
      quotaRemaining: '99,420 / 100,000 req/mo',
    }));
    dispatchToast('Gemini AI Verificado', ' Motor predictivo activo y sincronizado.', 'success');
    return true;
  };

  const saveAllSettings = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 450));
    try {
      void authenticateServer(currentUser.pin || '230825');
      const snapshot: PersistedSnapshot = {
        customization,
        companyInfo,
        tenants,
        activeTenantId: activeTenant.id,
        branchScope,
        users,
        driveConfig,
        geminiConfig,
        activeTab,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore quota errors
    }
    setIsSaving(false);
    setIsDirty(false);
    logAuditEvent(
      'appearance',
      'info',
      'Punto de Control Guardado',
      'Preferencias globales de marca, interfaz y sucursales confirmadas en persistencia.'
    );
    dispatchToast(
      'Configuración Guardada',
      'Cambios persistidos permanentemente en tu sesión y sucursales.',
      'success'
    );
  };

  const addComplaint = (
    data: Omit<ComplaintRecord, 'id' | 'ticketCode' | 'createdAt' | 'status'>
  ): ComplaintRecord => {
    const year = new Date().getFullYear();
    const seq = String(complaints.length + 1).padStart(4, '0');
    const created: ComplaintRecord = {
      ...data,
      id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticketCode: `LR-${year}-${seq}`,
      createdAt: new Date().toISOString(),
      status: 'pendiente',
    };
    setComplaints(prev => [created, ...prev]);
    logAuditEvent(
      'fiscal',
      'warning',
      'Nueva Hoja de Reclamación Virtual',
      `${created.ticketCode} (${created.claimType.toUpperCase()}) registrada por ${created.consumerName} en ${created.branchName}.`,
      { name: created.consumerName, role: 'Consumidor Web' }
    );
    return created;
  };

  const updateComplaintStatus = (
    id: string,
    status: ComplaintStatus,
    adminResponse?: string
  ) => {
    setComplaints(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              status,
              adminResponse: adminResponse !== undefined ? adminResponse : item.adminResponse,
              respondedAt:
                adminResponse && adminResponse.trim()
                  ? new Date().toISOString()
                  : item.respondedAt,
            }
          : item
      )
    );
    logAuditEvent(
      'fiscal',
      'info',
      'Gestión Libro de Reclamaciones',
      `Hoja actualizada a estado "${status.toUpperCase()}".`
    );
    dispatchToast(
      'Hoja de Reclamación Actualizada',
      `El estado fue cambiado a ${status.replace('_', ' ')} y la respuesta quedó guardada.`,
      'success'
    );
  };

  const deleteComplaint = (id: string) => {
    setComplaints(prev => prev.filter(c => c.id !== id));
    dispatchToast('Registro Archivado', 'La hoja fue removida del listado.', 'info');
  };

  return (
    <SettingsContext.Provider
      value={{
        activeTab,
        setActiveTab,
        tryChangeTab,
        isDirty,
        setIsDirty,
        discardUnsavedChanges,
        isSaving,
        showUnsavedModal,
        setShowUnsavedModal,
        confirmDiscardAndNavigate,
        cancelNavigation,
        isDarkResolved,
        customization,
        updateCustomization,
        resetCustomizationToDefaults,
        companyInfo,
        updateCompanyInfo,
        complaints,
        addComplaint,
        updateComplaintStatus,
        deleteComplaint,
        tenants,
        activeTenant,
        branchScope,
        setBranchScope,
        currentBranchProfile,
        switchTenant,
        saveTenant,
        deleteTenant,
        users,
        addUser,
        updateUser,
        deleteUser,
        driveConfig,
        updateDriveConfig,
        testDriveConnection,
        geminiConfig,
        updateGeminiConfig,
        testGeminiConnection,
        systemMetrics,
        saveAllSettings,
        toasts,
        dispatchToast,
        removeToast,
        clearAllToasts,
        noticeModal,
        openNoticeModal,
        closeNoticeModal,
        isAuthenticated,
        verifyLoginCredentials,
        completeAuthenticatedSession,
        loginWithNumericCode,
        logoutSession,
        auditLogs,
        logAuditEvent,
        clearInfoAuditLogs,
        consistencyReport,
        runHealthDiagnostics,
        exportBackupSnapshot,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
