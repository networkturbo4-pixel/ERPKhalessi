import React, { useState, useRef, useEffect, useId } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import { BranchFormat, Tenant, BranchOperationalProfile } from '../../types/settings';
import {
  Store,
  Plus,
  CheckCircle,
  ArrowRightLeft,
  Users,
  Edit2,
  Trash2,
  X,
  MapPin,
  Flame,
  Globe2,
  Building2,
  Receipt,
  Clock,
  Bike,
  TrendingUp,
  FileText,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { emitInvoiceFacturalo, FacturaloEmissionResult } from '../../utils/facturaloApi';

const BRANCH_FORMATS: BranchFormat[] = [
  'Matriz & Salón',
  'Salón & Delivery',
  'Dark Kitchen',
  'Express / Mall',
  'Obrador Central',
];

const STATUS_OPTIONS: { value: Tenant['status']; label: string; dot: string; badge: string }[] = [
  {
    value: 'active',
    label: 'Abierto en Turno',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    value: 'preheating',
    label: 'Precalentando Hornos',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  {
    value: 'closed',
    label: 'Fuera de Turno',
    dot: 'bg-zinc-400',
    badge: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  },
];

export const TenantsTab: React.FC = () => {
  const {
    tenants,
    activeTenant,
    branchScope,
    switchTenant,
    saveTenant,
    deleteTenant,
    customization,
    companyInfo,
    updateCompanyInfo,
    dispatchToast,
  } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const modalTitleId = useId();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    status: 'active' as Tenant['status'],
    userCount: 8,
    branchFormat: 'Salón & Delivery' as BranchFormat,
    branchCode: '',
    billingSeries: '',
    billingSeriesBoleta: '',
    billingSeriesFactura: '',
    schedule: '12:00 PM – 11:30 PM',
    tablesCount: 14,
    deliveryRadiusKm: 5,
    dailyGoalSoles: 5500,
    address: '',
    latitude: '-12.1116',
    longitude: '-76.9912',
    managerName: '',
    yapeNumber: '',
    activeOvens: '1 Horno de Piedra Activo',
    salesTodaySoles: 3450,
    imageUrl: '',
  });

  // Estado para prueba interactiva de facturación por sucursal
  const [testingBranchTenant, setTestingBranchTenant] = useState<Tenant | null>(null);
  const [isEmittingTest, setIsEmittingTest] = useState(false);
  const [testEmissionResult, setTestEmissionResult] = useState<FacturaloEmissionResult | null>(null);

  const handleTestBranchEmission = async (t: Tenant, docType: 'boleta' | 'factura') => {
    setIsEmittingTest(true);
    setTestingBranchTenant(t);
    setTestEmissionResult(null);

    try {
      const mockOrder: any = {
        id: `test-ord-${Date.now()}`,
        orderNumber: `KP-TEST-${Math.floor(100 + Math.random() * 900)}`,
        channel: 'pos',
        tenantId: t.id,
        customerName: docType === 'factura' ? 'CORPORACION KHALESSI PRUEBA S.A.C.' : 'CLIENTE PRUEBA POS',
        customerPhone: '987654321',
        paymentMethod: 'efectivo',
        paymentStatus: 'pagado',
        invoiceType: docType === 'factura' ? 'factura_ruc' : 'boleta_dni',
        invoiceDocument: docType === 'factura' ? '20608945123' : '72849103',
        invoiceBusinessName: docType === 'factura' ? 'CORPORACION KHALESSI PRUEBA S.A.C.' : undefined,
        invoiceFiscalAddress: docType === 'factura' ? 'AV. PRINCIPAL 123 - LIMA' : undefined,
        items: [
          {
            product: { id: 'p-test', name: 'Pizza Familiar Mozzarella Artesanal', price: 42, active: true },
            quantity: 1,
            unitPrice: 42,
            subtotal: 42,
          }
        ],
        subtotal: 35.59,
        igv: 6.41,
        total: 42.00,
        status: 'entregado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await emitInvoiceFacturalo({
        order: mockOrder,
        invoiceType: docType,
        tenant: t,
        companyInfo,
      });

      setTestEmissionResult(res);
      if (res.success) {
        dispatchToast(
          'Comprobante Emitido',
          `${docType === 'factura' ? 'Factura' : 'Boleta'} ${res.serieNumero} para ${t.name.replace('Khalessi Pizza - ', '')} verificada ante SUNAT.`,
          'success'
        );
      } else {
        dispatchToast('Emisión Fallida', res.errorMessage || 'No se pudo emitir.', 'error');
      }
    } catch (err: any) {
      dispatchToast('Error', err?.message || 'Error al emitir comprobante de prueba.', 'error');
    } finally {
      setIsEmittingTest(false);
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isModalOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isModalOpen]);

  const handleDialogClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = '';
    }
    setIsModalOpen(false);
  };

  const handleOpenCreate = () => {
    // Calculo secuencial inteligente para la siguiente sucursal (B001, B002... F001, F002...)
    const maxNum = tenants.reduce((max, t) => {
      const bMatch = (t.operations?.billingSeriesBoleta || t.operations?.billingSeries || '').match(/[BF](\d{3})/i);
      if (bMatch) {
        const val = parseInt(bMatch[1], 10);
        return Math.max(max, isNaN(val) ? 0 : val);
      }
      return max;
    }, tenants.length);

    const nextSeq = String(maxNum + 1).padStart(3, '0');
    const nextBoleta = `B${nextSeq}`;
    const nextFactura = `F${nextSeq}`;
    setEditingTenant(null);
    setForm({
      name: '',
      slug: '',
      status: 'active',
      userCount: 8,
      branchFormat: 'Salón & Delivery',
      branchCode: `SUC-${nextSeq}`,
      billingSeriesBoleta: nextBoleta,
      billingSeriesFactura: nextFactura,
      billingSeries: `${nextBoleta} / ${nextFactura}`,
      schedule: '12:00 PM – 11:30 PM',
      tablesCount: 14,
      deliveryRadiusKm: 5,
      dailyGoalSoles: 5500,
      address: '',
      latitude: '-12.1116',
      longitude: '-76.9912',
      managerName: '',
      yapeNumber: '988 777 666',
      activeOvens: '1 Horno Napolitano Activo',
      salesTodaySoles: 0,
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Tenant, idx: number) => {
    const fallbackNum = String(idx + 1).padStart(3, '0');
    const bSeries =
      t.operations?.billingSeriesBoleta ||
      (t.operations?.billingSeries ? t.operations.billingSeries.match(/B[A-Z0-9]{3}/i)?.[0] : null) ||
      `B${fallbackNum}`;
    const fSeries =
      t.operations?.billingSeriesFactura ||
      (t.operations?.billingSeries ? t.operations.billingSeries.match(/F[A-Z0-9]{3}/i)?.[0] : null) ||
      `F${fallbackNum}`;

    setEditingTenant(t);
    setForm({
      name: t.name,
      slug: t.slug,
      status: t.status || 'active',
      userCount: t.userCount,
      branchFormat: t.operations?.branchFormat || 'Salón & Delivery',
      branchCode: t.operations?.branchCode || `SUC-${fallbackNum}`,
      billingSeriesBoleta: bSeries.toUpperCase(),
      billingSeriesFactura: fSeries.toUpperCase(),
      billingSeries: t.operations?.billingSeries || `${bSeries.toUpperCase()} / ${fSeries.toUpperCase()}`,
      schedule: t.operations?.schedule || '12:00 PM – 11:30 PM',
      tablesCount: t.operations?.tablesCount ?? 14,
      deliveryRadiusKm: t.operations?.deliveryRadiusKm ?? 5,
      dailyGoalSoles: t.operations?.dailyGoalSoles || 5500,
      address: t.operations?.address || '',
      latitude:
        t.operations?.latitude !== undefined ? String(t.operations.latitude) : '-12.1116',
      longitude:
        t.operations?.longitude !== undefined ? String(t.operations.longitude) : '-76.9912',
      managerName: t.operations?.managerName || '',
      yapeNumber: t.operations?.yapeNumber || '',
      activeOvens: t.operations?.activeOvens || '1 Horno Activo',
      salesTodaySoles: t.operations?.salesTodaySoles ?? 0,
      imageUrl: t.operations?.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const cleanSlug =
      form.slug.trim() ||
      form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const baseOps = editingTenant?.operations;
    const branchShort = form.name.replace('Khalessi Pizza - ', '');
    const numericSales = Math.max(0, Number(form.salesTodaySoles) || 0);
    const numericGoal = Math.max(500, Number(form.dailyGoalSoles) || 5000);

    const codePrefix = (form.branchCode || `S${tenants.length + 1}`)
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(-4);

    const finalBoleta = (form.billingSeriesBoleta.trim() || 'B001').toUpperCase();
    const finalFactura = (form.billingSeriesFactura.trim() || 'F001').toUpperCase();
    const combinedBilling = `${finalBoleta} / ${finalFactura}`;

    const updatedOperations: BranchOperationalProfile = {
      branchFormat: form.branchFormat,
      branchCode: form.branchCode.trim() || 'SUC-001',
      billingSeries: combinedBilling,
      billingSeriesBoleta: finalBoleta,
      billingSeriesFactura: finalFactura,
      schedule: form.schedule.trim() || '12:00 PM – 11:30 PM',
      tablesCount: form.branchFormat === 'Dark Kitchen' ? 0 : Math.max(0, Number(form.tablesCount) || 0),
      deliveryRadiusKm: Math.max(0, Number(form.deliveryRadiusKm) || 0),
      dailyGoalSoles: numericGoal,
      address: form.address.trim() || `Local Comercial — ${branchShort}`,
      latitude: Number.isFinite(Number(form.latitude)) ? Number(form.latitude) : -12.1116,
      longitude: Number.isFinite(Number(form.longitude)) ? Number(form.longitude) : -76.9912,
      phone: baseOps?.phone || companyInfo.phone || '+51 1 780 9090',
      managerName: form.managerName.trim() || 'Encargado de Turno',
      salesTodaySoles: numericSales,
      salesGrowthPct: baseOps?.salesGrowthPct || '+14.2%',
      pizzasToday: baseOps?.pizzasToday || Math.max(12, Math.round(numericSales / 42)),
      avgOvenMinutes: baseOps?.avgOvenMinutes || 10.4,
      ovenTempC: baseOps?.ovenTempC || 425,
      activeOvens: form.activeOvens.trim() || '1 Horno de Piedra Activo',
      stockAlertsCount: baseOps?.stockAlertsCount ?? 0,
      stockAlertSummary: baseOps?.stockAlertSummary || 'Cámara de frío y harinas operativas al 100%',
      yapeNumber: form.yapeNumber.trim() || '987 654 321',
      imageUrl: form.imageUrl?.trim() || undefined,
      liveOrders: baseOps?.liveOrders
        ? baseOps.liveOrders.map(ord => ({ ...ord, branchName: branchShort }))
        : [
            {
              id: `${codePrefix}-${101 + tenants.length}`,
              customer: 'Mostrador / Salón POS',
              branchName: branchShort,
              items: '2× Familiar Khalessi Artesanal · 1× Bebida 1.5L',
              totalSoles: 96,
              timeAgo: '2m',
              status: 'En horno' as const,
            },
          ],
    };

    if (editingTenant) {
      saveTenant({
        ...editingTenant,
        name: form.name.trim(),
        slug: cleanSlug,
        status: form.status,
        userCount: Math.max(1, Number(form.userCount) || 1),
        operations: updatedOperations,
      });
    } else {
      saveTenant({
        id: `branch-${Date.now()}`,
        name: form.name.trim(),
        slug: cleanSlug,
        status: form.status,
        userCount: Math.max(1, Number(form.userCount) || 1),
        createdAt: new Date().toISOString().split('T')[0],
        operations: updatedOperations,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Store className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Sucursales y Establecimientos Anexos
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Gestión multisucursal bajo una sola razón social, con series de facturación, hornos, caja POS y metas propias por local.
          </p>
        </div>

        <PermissionGate permission="settings:manage" hideInsteadOfBanner>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => switchTenant('consolidated')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 ${
                branchScope === 'consolidated' ? 'saas-option-active' : 'saas-btn-secondary'
              }`}
            >
              <Globe2 className="h-3.5 w-3.5 text-emerald-500" />
              Vista Consolidada
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Plus className="h-4 w-4" />
              Nueva Sucursal
            </button>
          </div>
        </PermissionGate>
      </div>

      {/* Single-Company Corporate Banner */}
      <div className="saas-subcard p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
              Empresa Matriz: {companyInfo.legalName}
            </p>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
              RUC Único: <span className="font-mono font-semibold">{companyInfo.taxId}</span> · Catálogo de recetas e inventario maestro centralizado
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
          {tenants.length} {tenants.length === 1 ? 'sucursal registrada' : 'sucursales operativas'}
        </span>
      </div>

      <PermissionGate permission="settings:manage">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {tenants.map((t, idx) => {
            const isActive = branchScope === 'branch' && t.id === activeTenant.id;
            const sales = t.operations?.salesTodaySoles || 0;
            const goal = t.operations?.dailyGoalSoles || 5000;
            const goalPercent = Math.min(100, Math.round((sales / Math.max(1, goal)) * 100));
            const statusMeta =
              STATUS_OPTIONS.find(s => s.value === t.status) || STATUS_OPTIONS[0];
            const formatLabel = t.operations?.branchFormat || 'Salón & Delivery';
            const branchCode = t.operations?.branchCode || `SUC-00${idx + 1}`;
            const fallbackSeq = String(idx + 1).padStart(3, '0');
            const boletaSeries =
              t.operations?.billingSeriesBoleta ||
              (t.operations?.billingSeries?.match(/B[A-Z0-9]{3}/i)?.[0]) ||
              `B${fallbackSeq}`;
            const facturaSeries =
              t.operations?.billingSeriesFactura ||
              (t.operations?.billingSeries?.match(/F[A-Z0-9]{3}/i)?.[0]) ||
              `F${fallbackSeq}`;
            const billingSeries = t.operations?.billingSeries || `${boletaSeries} / ${facturaSeries}`;
            const tablesCount = t.operations?.tablesCount ?? 14;
            const deliveryRadiusKm = t.operations?.deliveryRadiusKm ?? 5;

            return (
              <div
                key={t.id}
                className={`p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden ${
                  isActive
                    ? 'saas-option-active'
                    : 'saas-card hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                {isActive && (
                  <div
                    className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl shadow-sm"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    Operando Aquí
                  </div>
                )}

                <div>
                  {/* Top Badges: Code + Format + Operational Status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 pr-16">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-zinc-200/90 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {branchCode}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                        {formatLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        {t.operations?.imageUrl ? (
                          <img src={t.operations.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                        ) : customization?.favicon ? (
                          <img src={customization.favicon} alt="Favicon" className="w-full h-full object-cover p-1" />
                        ) : (
                          <Store className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white leading-snug truncate">
                        {t.name}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusMeta.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                      {statusMeta.label}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 mt-1.5">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">
                      {t.operations?.address || 'Dirección comercial pendiente'}
                    </span>
                  </p>

                  {/* Branch Operational Details */}
                  <div className="mt-3.5 p-3 rounded-xl saas-subcard space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400">Encargado:</span>
                      <span className="font-semibold text-zinc-900 dark:text-white truncate">
                        {t.operations?.managerName || 'Por asignar'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Receipt className="h-3 w-3 text-zinc-400" /> Series SUNAT:
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/20" title="Serie Boleta Electrónica">
                          {boletaSeries}
                        </span>
                        <span className="text-zinc-400">/</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20" title="Serie Factura Electrónica">
                          {facturaSeries}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3 text-amber-500" /> Test Factúralo:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestBranchEmission(t, 'boleta')}
                          disabled={isEmittingTest}
                          title={`Emitir boleta de prueba con serie ${boletaSeries}`}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors whitespace-nowrap shrink-0"
                        >
                          {isEmittingTest && testingBranchTenant?.id === t.id ? '...' : `Probar ${boletaSeries}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestBranchEmission(t, 'factura')}
                          disabled={isEmittingTest}
                          title={`Emitir factura de prueba con serie ${facturaSeries}`}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
                        >
                          {isEmittingTest && testingBranchTenant?.id === t.id ? '...' : `Probar ${facturaSeries}`}
                        </button>
                      </div>
                    </div>

                    {testEmissionResult && testingBranchTenant?.id === t.id && (
                      <div className={`p-2 rounded-lg text-[11px] border mt-1 ${
                        testEmissionResult.success
                          ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20'
                      }`}>
                        <div className="font-bold flex items-center gap-1">
                          {testEmissionResult.success ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <span>⚠️</span>}
                          <span>Doc: {testEmissionResult.serieNumero}</span>
                        </div>
                        <p className="text-[10px] opacity-80 truncate">{testEmissionResult.sunatResponse || testEmissionResult.errorMessage}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Flame className="h-3 w-3 text-amber-500" /> Hornos:
                      </span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {t.operations?.activeOvens || '1 Horno Activo'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Bike className="h-3 w-3 text-emerald-500" /> Aforo y Reparto:
                      </span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {tablesCount > 0 ? `${tablesCount} mesas` : 'Solo reparto'} · {deliveryRadiusKm} km
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-400" /> Horario:
                      </span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {t.operations?.schedule || '12:00 PM – 11:30 PM'}
                      </span>
                    </div>
                  </div>

                  {/* Daily Sales Goal Bar (Replaces SaaS GB Storage Bar) */}
                  <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 mb-1.5">
                      <span className="flex items-center gap-1.5 font-medium">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Meta Diaria de Turno
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                        S/ {sales.toLocaleString()} / S/ {goal.toLocaleString()} ({goalPercent}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${goalPercent}%`,
                          backgroundColor: customization.primaryColor,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-zinc-400" /> Personal asignado
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {t.userCount} colaboradores
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t, idx)}
                      className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Editar parámetros de sucursal"
                      aria-label={`Editar ${t.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={tenants.length <= 1}
                      onClick={() => deleteTenant(t.id)}
                      className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300 hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
                      title="Dar de baja sucursal"
                      aria-label={`Dar de baja ${t.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => switchTenant(t.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Operar en esta Sede
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 whitespace-nowrap shrink-0">
                      <CheckCircle className="h-3.5 w-3.5" /> Sede Seleccionada
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tarifario de Delivery Dinámico por Kilómetro (Editable por el Administrador) */}
        <div className="saas-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-2">
                <Bike className="h-4 w-4" style={{ color: customization.primaryColor }} />
                Tarifario de Delivery Dinámico por Kilómetro (Tienda Virtual)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Define el precio de envío según la distancia GPS desde la sucursal seleccionada hasta el domicilio del cliente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const current = companyInfo.deliveryTariff!;
                const last = current.brackets[current.brackets.length - 1];
                const fromKm = last ? last.maxKm : 0;
                updateCompanyInfo({
                  deliveryTariff: {
                    ...current,
                    brackets: [
                      ...current.brackets,
                      {
                        id: `km-${Date.now()}`,
                        minKm: fromKm,
                        maxKm: fromKm + 3,
                        feeSoles: (last?.feeSoles || 4) + 3,
                      },
                    ],
                  },
                });
                dispatchToast('Tramo Agregado', 'Nuevo tramo por kilómetro añadido al tarifario.', 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar Tramo Km</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(companyInfo.deliveryTariff?.brackets || []).map(b => (
              <div key={b.id} className="p-3 rounded-xl saas-subcard space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase text-zinc-500">
                    {b.minKm} km – {b.maxKm} km
                  </span>
                  {(companyInfo.deliveryTariff?.brackets.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = companyInfo.deliveryTariff!;
                        updateCompanyInfo({
                          deliveryTariff: {
                            ...current,
                            brackets: current.brackets.filter(x => x.id !== b.id),
                          },
                        });
                      }}
                      className="text-zinc-400 hover:text-rose-500"
                      title="Eliminar tramo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Desde</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={b.minKm}
                      onChange={e => {
                        const current = companyInfo.deliveryTariff!;
                        updateCompanyInfo({
                          deliveryTariff: {
                            ...current,
                            brackets: current.brackets.map(x =>
                              x.id === b.id ? { ...x, minKm: Math.max(0, Number(e.target.value)) } : x
                            ),
                          },
                        });
                      }}
                      className="w-full px-2 py-1 rounded-lg saas-input text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Hasta</span>
                    <input
                      type="number"
                      min={0.5}
                      step="0.5"
                      value={b.maxKm}
                      onChange={e => {
                        const current = companyInfo.deliveryTariff!;
                        updateCompanyInfo({
                          deliveryTariff: {
                            ...current,
                            brackets: current.brackets.map(x =>
                              x.id === b.id ? { ...x, maxKm: Math.max(0.5, Number(e.target.value)) } : x
                            ),
                          },
                        });
                      }}
                      className="w-full px-2 py-1 rounded-lg saas-input text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Soles</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={b.feeSoles}
                      onChange={e => {
                        const current = companyInfo.deliveryTariff!;
                        updateCompanyInfo({
                          deliveryTariff: {
                            ...current,
                            brackets: current.brackets.map(x =>
                              x.id === b.id ? { ...x, feeSoles: Math.max(0, Number(e.target.value)) } : x
                            ),
                          },
                        });
                      }}
                      className="w-full px-2 py-1 rounded-lg saas-input text-xs font-black text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accessible Native <dialog> Modal for Creating / Editing a Branch */}
        <dialog
          ref={dialogRef}
          aria-labelledby={modalTitleId}
          onClose={handleDialogClose}
          className="bg-transparent p-2 sm:p-4 outline-none max-w-6xl w-[96vw] m-auto"
        >
          {isModalOpen && (
            <div className="w-full bg-white dark:bg-[#18181c] rounded-3xl border border-zinc-200 dark:border-zinc-700 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 id={modalTitleId} className="text-base sm:text-lg font-black text-zinc-950 dark:text-white">
                    {editingTenant ? 'Editar Parámetros de Sucursal' : 'Aperturar Nueva Sucursal'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Establecimiento anexo de {companyInfo.legalName} (RUC {companyInfo.taxId})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Cerrar modal"
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* COLUMNA 1: IDENTIFICACIÓN Y FISCAL */}
                  <div className="space-y-3.5 p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      1. Identificación y Series SUNAT
                    </h3>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                        Nombre Comercial de la Sucursal
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={form.name}
                        onChange={e => {
                          const val = e.target.value;
                          const autoSlug = val
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '');
                          setForm({
                            ...form,
                            name: val,
                            slug: editingTenant ? form.slug : autoSlug,
                          });
                        }}
                        placeholder="Ej. Local Belaunde"
                        className="w-full px-3 py-2 text-xs rounded-xl saas-input font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Formato Operativo
                        </label>
                        <select
                          value={form.branchFormat}
                          onChange={e => {
                            const nextFormat = e.target.value as BranchFormat;
                            setForm({
                              ...form,
                              branchFormat: nextFormat,
                              tablesCount: nextFormat === 'Dark Kitchen' ? 0 : form.tablesCount || 12,
                            });
                          }}
                          className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                        >
                          {BRANCH_FORMATS.map(fmt => (
                            <option key={fmt} value={fmt} className="bg-white dark:bg-zinc-900">
                              {fmt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Estado Operativo
                        </label>
                        <select
                          value={form.status}
                          onChange={e => setForm({ ...form, status: e.target.value as Tenant['status'] })}
                          className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                        Código Establecimiento Anexo
                      </label>
                      <input
                        type="text"
                        required
                        value={form.branchCode}
                        onChange={e => setForm({ ...form, branchCode: e.target.value.toUpperCase() })}
                        placeholder="SUC-002"
                        className="w-full px-3 py-2 text-xs rounded-xl saas-input font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Serie Boleta (B...)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={4}
                          value={form.billingSeriesBoleta}
                          onChange={e =>
                            setForm({
                              ...form,
                              billingSeriesBoleta: e.target.value.toUpperCase(),
                              billingSeries: `${e.target.value.toUpperCase()} / ${form.billingSeriesFactura}`,
                            })
                          }
                          placeholder="B002"
                          className="w-full px-3 py-2 text-xs rounded-xl saas-input font-mono uppercase"
                        />
                        <p className="text-[10px] text-zinc-500 mt-0.5">Para consumidor final</p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Serie Factura (F...)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={4}
                          value={form.billingSeriesFactura}
                          onChange={e =>
                            setForm({
                              ...form,
                              billingSeriesFactura: e.target.value.toUpperCase(),
                              billingSeries: `${form.billingSeriesBoleta} / ${e.target.value.toUpperCase()}`,
                            })
                          }
                          placeholder="F002"
                          className="w-full px-3 py-2 text-xs rounded-xl saas-input font-mono uppercase"
                        />
                        <p className="text-[10px] text-zinc-500 mt-0.5">Para clientes con RUC</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                        Foto / Logo de la Sucursal
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          {form.imageUrl ? (
                            <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : customization?.favicon ? (
                            <img src={customization.favicon} alt="Favicon" className="w-full h-full object-cover p-1" />
                          ) : (
                            <Store className="w-6 h-6 text-zinc-400" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={form.imageUrl || ''}
                            onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                            placeholder="https://... o pega URL de imagen"
                            className="w-full px-3 py-1.5 text-xs rounded-xl saas-input font-mono"
                          />
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400">
                              <span>Subir archivo de imagen</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = ev => {
                                    if (ev.target?.result) {
                                      setForm(prev => ({ ...prev, imageUrl: String(ev.target?.result) }));
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                            {form.imageUrl && (
                              <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                                className="text-[11px] text-zinc-400 hover:text-rose-500"
                              >
                                Limpiar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA 2: UBICACIÓN Y OPERACIONES */}
                  <div className="space-y-3.5 p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      2. Ubicación GPS y Operación
                    </h3>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                        Dirección Física del Local
                      </label>
                      <input
                        type="text"
                        required
                        value={form.address}
                        onChange={e => setForm({ ...form, address: e.target.value })}
                        placeholder="Av. Belaunde Este 126A, Comas 15301"
                        className="w-full px-3 py-2 text-xs rounded-xl saas-input font-medium"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          Geolocalización GPS (Tienda Más Cercana)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!navigator.geolocation) {
                              dispatchToast(
                                'GPS No Soportado',
                                'Tu navegador no soporta geolocalización en este dispositivo.',
                                'warning'
                              );
                              return;
                            }
                            navigator.geolocation.getCurrentPosition(
                              pos => {
                                setForm(prev => ({
                                  ...prev,
                                  latitude: pos.coords.latitude.toFixed(6),
                                  longitude: pos.coords.longitude.toFixed(6),
                                }));
                                dispatchToast(
                                  'Coordenadas Capturadas',
                                  'Se asignó tu ubicación GPS actual a esta sucursal.',
                                  'success'
                                );
                              },
                              () => {
                                dispatchToast(
                                  'Permiso Denegado',
                                  'Habilita el permiso de ubicación en el navegador o ingresa las coordenadas manualmente.',
                                  'warning'
                                );
                              },
                              { enableHighAccuracy: true, timeout: 8000 }
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0 transition-colors"
                        >
                          📍 Usar mi GPS actual
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">
                            Latitud
                          </label>
                          <input
                            type="text"
                            autoCorrect="off"
                            value={form.latitude}
                            onChange={e => setForm({ ...form, latitude: e.target.value })}
                            placeholder="-11.941017"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg saas-input font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">
                            Longitud
                          </label>
                          <input
                            type="text"
                            autoCorrect="off"
                            value={form.longitude}
                            onChange={e => setForm({ ...form, longitude: e.target.value })}
                            placeholder="-77.049301"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg saas-input font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Encargado de Sede
                        </label>
                        <input
                          type="text"
                          value={form.managerName}
                          onChange={e => setForm({ ...form, managerName: e.target.value })}
                          placeholder="Encargado de Turno"
                          className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Celular Yape / Plin
                        </label>
                        <input
                          type="text"
                          value={form.yapeNumber}
                          onChange={e => setForm({ ...form, yapeNumber: e.target.value })}
                          placeholder="988 777 666"
                          className="w-full px-3 py-2 text-xs rounded-xl saas-input font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Aforo (Mesas)
                        </label>
                        <input
                          type="number"
                          min={0}
                          disabled={form.branchFormat === 'Dark Kitchen'}
                          value={form.branchFormat === 'Dark Kitchen' ? 0 : form.tablesCount}
                          onChange={e => setForm({ ...form, tablesCount: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 text-xs rounded-xl saas-input font-mono disabled:opacity-50"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Radio (km)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          value={form.deliveryRadiusKm}
                          onChange={e => setForm({ ...form, deliveryRadiusKm: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 text-xs rounded-xl saas-input font-mono"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Meta Diaria (S/)
                        </label>
                        <input
                          type="number"
                          min={500}
                          step={100}
                          value={form.dailyGoalSoles}
                          onChange={e => setForm({ ...form, dailyGoalSoles: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 text-xs rounded-xl saas-input font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Horario
                        </label>
                        <input
                          type="text"
                          value={form.schedule}
                          onChange={e => setForm({ ...form, schedule: e.target.value })}
                          placeholder="12:00 PM - 11:30 PM"
                          className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 uppercase mb-1">
                          Hornos
                        </label>
                        <input
                          type="text"
                          value={form.activeOvens}
                          onChange={e => setForm({ ...form, activeOvens: e.target.value })}
                          placeholder="1 Horno Napolitano Activo"
                          className="w-full px-3 py-2 text-xs rounded-xl saas-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTONES ACCIÓN CONFORME A SINGLE_LINE_MODAL_ACTIONS */}
                <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-black text-white rounded-xl shadow-md hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    {editingTenant ? 'Guardar Sucursal' : 'Registrar Sucursal'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </dialog>
      </PermissionGate>
    </div>
  );
};
