import React, { useMemo, useState } from 'react';
import {
  FileCheck2,
  Search,
  Plus,
  Download,
  ExternalLink,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Settings,
  X,
  Loader2,
  Receipt,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { SunatInvoiceRecord, Order } from '../../types/catalog';
import {
  emitInvoiceFacturalo,
  getFacturaloConfig,
  saveFacturaloConfig,
  lookupRucFacturalo,
  lookupDniFacturalo,
} from '../../utils/facturaloApi';
import {
  loadSunatInvoices,
  saveSunatInvoices,
  appendSunatInvoiceRecord,
} from '../../utils/posOperations';
import { FacturaloConfig } from '../../types/settings';

export const BillingModuleView: React.FC = () => {
  const { activeTenant, branchScope, companyInfo, dispatchToast, openNoticeModal } = useSettings();

  const [invoices, setInvoices] = useState<SunatInvoiceRecord[]>(() => loadSunatInvoices());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | '01' | '03' | '07'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SunatInvoiceRecord['status']>('all');

  // Emisión Manual Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualType, setManualType] = useState<'boleta' | 'factura'>('factura');
  const [manualDoc, setManualDoc] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualConcept, setManualConcept] = useState('Consumo de alimentos y bebidas');
  const [manualTotal, setManualTotal] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);

  // Config Modal
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [factConfig, setFactConfig] = useState<FacturaloConfig>(() => getFacturaloConfig());

  const scopedInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (branchScope !== 'consolidated' && inv.tenantId !== activeTenant.id) return false;
      if (typeFilter !== 'all' && inv.documentType !== typeFilter) return false;
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${inv.serieNumero} ${inv.customerDocument} ${inv.customerName} ${inv.orderNumber || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, branchScope, activeTenant.id, typeFilter, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const active = scopedInvoices.filter((i) => i.status !== 'anulado' && i.documentType !== '07');
    const totalBilled = active.reduce((s, i) => s + i.total, 0);
    const totalIgv = active.reduce((s, i) => s + i.igv, 0);
    const facturasCount = active.filter((i) => i.documentType === '01').length;
    const boletasCount = active.filter((i) => i.documentType === '03').length;
    const pendingCount = scopedInvoices.filter((i) => i.status === 'pendiente').length;
    return { totalBilled, totalIgv, facturasCount, boletasCount, pendingCount };
  }, [scopedInvoices]);

  const handleLookupManualDoc = async () => {
    const clean = manualDoc.replace(/\D/g, '');
    setIsLookingUp(true);
    try {
      if (manualType === 'factura') {
        if (clean.length !== 11) {
          dispatchToast('RUC Inválido', 'Ingresa 11 dígitos para consultar RUC.', 'warning');
          return;
        }
        const res = await lookupRucFacturalo(clean);
        if (res.success) {
          setManualName(res.razonSocial);
          setManualAddress(res.direccion);
          dispatchToast('RUC Validado', res.razonSocial, 'success');
        }
      } else {
        if (clean.length !== 8) {
          dispatchToast('DNI Inválido', 'Ingresa 8 dígitos para consultar DNI.', 'warning');
          return;
        }
        const res = await lookupDniFacturalo(clean);
        if (res.success) {
          setManualName(res.fullName);
          dispatchToast('DNI Validado', res.fullName, 'success');
        }
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleEmitManual = async () => {
    const totalNum = Number(manualTotal);
    if (!manualDoc.trim() || !manualName.trim() || !Number.isFinite(totalNum) || totalNum <= 0) {
      dispatchToast('Datos Incompletos', 'Completa documento, razón social/nombre y monto mayor a 0.', 'warning');
      return;
    }

    setIsEmitting(true);
    try {
      const syntheticOrder: Order = {
        id: `ord-manual-${Date.now()}`,
        orderNumber: `FAC-${Date.now().toString().slice(-5)}`,
        channel: 'pos-takeaway',
        tenantId: activeTenant.id,
        customerName: manualName.trim(),
        customerPhone: '-',
        customerDni: manualDoc.trim(),
        invoiceType: manualType === 'factura' ? 'factura_ruc' : 'boleta_dni',
        invoiceDocument: manualDoc.trim(),
        invoiceBusinessName: manualName.trim(),
        invoiceFiscalAddress: manualAddress.trim(),
        paymentMethod: 'transferencia',
        paymentStatus: 'pagado',
        items: [
          {
            itemId: `item-${Date.now()}`,
            productId: 'manual-concept',
            productName: manualConcept.trim() || 'Consumo de alimentos',
            productImage: '',
            subOptions: [],
            extras: [],
            unitPrice: totalNum,
            quantity: 1,
            totalPrice: totalNum,
          },
        ],
        subtotal: Number((totalNum / 1.18).toFixed(2)),
        deliveryFee: 0,
        discount: 0,
        total: totalNum,
        status: 'entregado',
        createdAt: new Date().toISOString(),
        estimatedMinutes: 0,
      };

      const emission = await emitInvoiceFacturalo({
        order: syntheticOrder,
        invoiceType: manualType,
        tenant: activeTenant,
        companyInfo,
      });

      const created = appendSunatInvoiceRecord(
        syntheticOrder,
        manualType === 'factura' ? '01' : '03',
        emission
      );
      setInvoices(loadSunatInvoices());
      setIsManualModalOpen(false);
      setManualDoc('');
      setManualName('');
      setManualAddress('');
      setManualTotal('');
      dispatchToast(
        'Comprobante Emitido',
        `${created.serieNumero} registrado (${created.status.toUpperCase()}).`,
        'success'
      );
    } finally {
      setIsEmitting(false);
    }
  };

  const handleIssueCreditNote = (inv: SunatInvoiceRecord) => {
    openNoticeModal({
      title: `Emitir Nota de Crédito para ${inv.serieNumero}`,
      message: `Se generará una Nota de Crédito (07) por S/ ${inv.total.toFixed(2)} a nombre de ${inv.customerName} y el comprobante pasará a estado Anulado.`,
      tone: 'danger',
      confirmLabel: 'Emitir Nota de Crédito',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        const updated = invoices.map((item) =>
          item.id === inv.id ? { ...item, status: 'anulado' as const } : item
        );
        const creditNote: SunatInvoiceRecord = {
          id: `nc-${Date.now()}`,
          orderId: inv.orderId,
          orderNumber: inv.orderNumber,
          tenantId: inv.tenantId,
          documentType: '07',
          serieNumero: `${inv.documentType === '01' ? 'FC01' : 'BC01'}-${String(
            updated.length + 1
          ).padStart(6, '0')}`,
          customerDocument: inv.customerDocument,
          customerName: inv.customerName,
          customerAddress: inv.customerAddress,
          subtotal: inv.subtotal,
          igv: inv.igv,
          total: inv.total,
          status: 'aceptado',
          relatedSerieNumero: inv.serieNumero,
          voidReason: 'Anulación de operación / Nota de Crédito',
          createdAt: new Date().toISOString(),
        };
        const nextList = [creditNote, ...updated];
        saveSunatInvoices(nextList);
        setInvoices(nextList);
        dispatchToast('Nota de Crédito Emitida', `${creditNote.serieNumero} vinculada a ${inv.serieNumero}.`, 'info');
      },
    });
  };

  const handleExportCsv = () => {
    const header = 'Fecha,Tipo,SerieNumero,Documento,Cliente,Subtotal,IGV,Total,Estado\n';
    const rows = scopedInvoices
      .map((i) =>
        [
          i.createdAt.split('T')[0],
          i.documentType === '01' ? 'FACTURA' : i.documentType === '07' ? 'NOTA CREDITO' : 'BOLETA',
          i.serieNumero,
          i.customerDocument,
          `"${i.customerName.replace(/"/g, '""')}"`,
          i.subtotal.toFixed(2),
          i.igv.toFixed(2),
          i.total.toFixed(2),
          i.status.toUpperCase(),
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro-ventas-${activeTenant.id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dispatchToast('Exportación Lista', 'Registro de ventas descargado en formato CSV.', 'success');
  };

  return (
    <div className="w-full max-w-[1500px] mx-auto space-y-5">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">
              Facturación Electrónica SUNAT
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {branchScope === 'consolidated'
                ? 'Vista consolidada de todas las sucursales'
                : `Sucursal activa: ${activeTenant.name}`}
              {' · '}Entorno: <strong>{factConfig.environment === 'production' ? 'Producción' : 'Demo / Sandbox'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Series & API</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Emitir Comprobante</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Total Facturado</span>
          <p className="text-xl font-black text-zinc-950 dark:text-white mt-1">
            S/ {metrics.totalBilled.toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">IGV (18%)</span>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            S/ {metrics.totalIgv.toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Boletas / Facturas</span>
          <p className="text-xl font-black text-zinc-950 dark:text-white mt-1">
            {metrics.boletasCount} / {metrics.facturasCount}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Pendientes / Contingencia</span>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {metrics.pendingCount}
          </p>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por serie, RUC, DNI o cliente..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | '01' | '03' | '07')}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              <option value="all">Todos los tipos</option>
              <option value="03">Boletas (03)</option>
              <option value="01">Facturas (01)</option>
              <option value="07">Notas de Crédito (07)</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | SunatInvoiceRecord['status'])}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              <option value="all">Todos los estados</option>
              <option value="aceptado">Aceptados</option>
              <option value="pendiente">Pendientes</option>
              <option value="anulado">Anulados</option>
            </select>
          </div>
        </div>

        {scopedInvoices.length === 0 ? (
          <div className="py-14 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <Receipt className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
              No hay comprobantes registrados aún
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Emite Boletas o Facturas desde el POS al cobrar, o usa "Emitir Comprobante".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th className="py-2.5 px-3">Serie / Número</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Cliente / RUC-DNI</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Estado SUNAT</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {scopedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-3 font-black text-zinc-900 dark:text-white">
                      {inv.serieNumero}
                      {inv.relatedSerieNumero && (
                        <span className="block text-[10px] font-normal text-zinc-400">
                          Ref: {inv.relatedSerieNumero}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {inv.documentType === '01'
                          ? 'Factura'
                          : inv.documentType === '07'
                          ? 'Nota Crédito'
                          : 'Boleta'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-zinc-900 dark:text-white truncate max-w-[240px]">
                        {inv.customerName}
                      </p>
                      <p className="text-[10px] text-zinc-500">{inv.customerDocument}</p>
                    </td>
                    <td className="py-3 px-3 font-black text-zinc-900 dark:text-white">
                      S/ {inv.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      {inv.status === 'aceptado' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Aceptado
                        </span>
                      ) : inv.status === 'anulado' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300">
                          <Ban className="w-3 h-3" /> Anulado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3" /> {inv.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:border-amber-500 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> PDF
                          </a>
                        )}
                        {inv.documentType !== '07' && inv.status !== 'anulado' && (
                          <button
                            type="button"
                            onClick={() => handleIssueCreditNote(inv)}
                            className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-500/10 whitespace-nowrap shrink-0"
                          >
                            Nota Crédito
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Emisión Manual */}
      {isManualModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                Emitir Comprobante Manual
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['factura', 'boleta'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setManualType(t)}
                  className={`py-2 rounded-xl border text-xs font-black uppercase ${
                    manualType === t
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  {t === 'factura' ? 'Factura (RUC)' : 'Boleta (DNI)'}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={manualType === 'factura' ? 11 : 8}
                  value={manualDoc}
                  onChange={(e) => setManualDoc(e.target.value.replace(/\D/g, ''))}
                  placeholder={manualType === 'factura' ? 'RUC (11 dígitos)' : 'DNI (8 dígitos)'}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => void handleLookupManualDoc()}
                  disabled={isLookingUp}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0 flex items-center gap-1"
                >
                  {isLookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Consultar'}
                </button>
              </div>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder={manualType === 'factura' ? 'Razón Social' : 'Nombre completo'}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white"
              />
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Dirección fiscal (opcional)"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white"
              />
              <input
                type="text"
                value={manualConcept}
                onChange={(e) => setManualConcept(e.target.value)}
                placeholder="Concepto / Glosa"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={manualTotal}
                onChange={(e) => setManualTotal(e.target.value)}
                placeholder="Importe Total con IGV (S/)"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isEmitting}
                onClick={() => void handleEmitManual()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                {isEmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Emitir a SUNAT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Config Series & API */}
      {isConfigOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                Configuración SUNAT (Factúralo PRO)
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 dark:text-zinc-400 block mb-1">Entorno</label>
                <select
                  value={factConfig.environment}
                  onChange={(e) =>
                    setFactConfig((prev) => ({
                      ...prev,
                      environment: e.target.value as 'demo' | 'production',
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-bold"
                >
                  <option value="demo">Demo / Sandbox (Pruebas)</option>
                  <option value="production">Producción SUNAT</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Serie Boleta
                  </label>
                  <input
                    type="text"
                    value={factConfig.defaultSeriesBoleta}
                    onChange={(e) =>
                      setFactConfig((prev) => ({ ...prev, defaultSeriesBoleta: e.target.value.toUpperCase() }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Serie Factura
                  </label>
                  <input
                    type="text"
                    value={factConfig.defaultSeriesFactura}
                    onChange={(e) =>
                      setFactConfig((prev) => ({ ...prev, defaultSeriesFactura: e.target.value.toUpperCase() }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Token API ({factConfig.environment === 'production' ? 'Live' : 'Test'})
                </label>
                <input
                  type="password"
                  value={
                    factConfig.environment === 'production'
                      ? factConfig.liveSecretKey || ''
                      : factConfig.testSecretKey || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setFactConfig((prev) =>
                      prev.environment === 'production'
                        ? { ...prev, liveSecretKey: val }
                        : { ...prev, testSecretKey: val }
                    );
                  }}
                  placeholder="sk_test_... / sk_live_..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  saveFacturaloConfig(factConfig);
                  setIsConfigOpen(false);
                  dispatchToast('Configuración Guardada', 'Series y credenciales SUNAT actualizadas.', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
