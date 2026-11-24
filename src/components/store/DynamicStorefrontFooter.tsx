import React, { useMemo, useState } from 'react';
import { BookOpenCheck, X } from 'lucide-react';
import {
  BuilderViewport,
  CustomPage,
  FooterBandId,
  FooterColumnId,
  StoreFooterTemplate,
} from '../../types/storeBuilder';
import { ComplaintGoodType, ComplaintType } from '../../types/settings';
import { useSettings } from '../../context/SettingsContext';
import { FooterRuntimeContext, FooterWidgetRenderer } from './StorefrontFooterWidgets';

export interface DynamicStorefrontFooterProps {
  footer: StoreFooterTemplate;
  viewport: BuilderViewport;
  accentColor: string;
  publishedFooterPages: CustomPage[];
  isBuilderEditing?: boolean;
  selectedWidgetId?: string | null;
  selectedBand?: FooterBandId;
  selectedColumn?: FooterColumnId;
  onSelectWidget?: (widgetId: string) => void;
  onSelectSlot?: (band: FooterBandId, col: FooterColumnId) => void;
  onGoHome?: () => void;
  onSelectCategory?: (cat: string) => void;
  onOpenOrders?: () => void;
  onOpenBenefits?: () => void;
}

const BAND_LABELS: Record<FooterBandId, string> = {
  ribbon: 'Cinta Superior',
  main: 'Cuerpo Principal',
  bottom: 'Barra Legal',
};

const COL_KEYS: FooterColumnId[] = ['col1', 'col2', 'col3', 'col4'];

export const DynamicStorefrontFooter: React.FC<DynamicStorefrontFooterProps> = ({
  footer,
  viewport,
  accentColor,
  publishedFooterPages,
  isBuilderEditing,
  selectedWidgetId,
  selectedBand,
  selectedColumn,
  onSelectWidget,
  onSelectSlot,
  onGoHome,
  onSelectCategory,
  onOpenOrders,
  onOpenBenefits,
}) => {
  const { customization, companyInfo, activeTenant, addComplaint, dispatchToast } = useSettings();
  const [complaintsOpen, setComplaintsOpen] = useState(false);

  // Complaints Book form state
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [goodType, setGoodType] = useState<ComplaintGoodType>('producto');
  const [claimType, setClaimType] = useState<ComplaintType>('reclamo');
  const [detail, setDetail] = useState('');
  const [consumerRequest, setConsumerRequest] = useState('');

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !documentId.trim() || !detail.trim()) {
      dispatchToast(
        'Datos incompletos',
        'Completa nombre, documento y detalle de tu reclamo o queja.',
        'warning'
      );
      return;
    }
    const created = addComplaint({
      branchId: activeTenant.id,
      branchName: activeTenant.name.replace('Gastro - ', ''),
      consumerName: fullName.trim(),
      documentType: documentId.trim().length > 8 ? 'RUC' : 'DNI',
      documentNumber: documentId.trim(),
      email: email.trim() || 'sin-correo@cliente.local',
      phone: phone.trim() || '-',
      address: activeTenant.operations?.address || 'No especificado',
      isMinor: false,
      goodType,
      claimedAmount: 0,
      goodDescription: 'Consumo / Pedido en tienda',
      claimType,
      detail: detail.trim(),
      consumerRequest: consumerRequest.trim() || 'Atención y respuesta formal',
    });
    dispatchToast(
      'Hoja de Reclamación Registrada',
      `Código ${created.ticketCode}. Hemos registrado tu solicitud.`,
      'success'
    );
    setComplaintsOpen(false);
    setFullName('');
    setDocumentId('');
    setEmail('');
    setPhone('');
    setDetail('');
    setConsumerRequest('');
  };

  const runtimeCtx: FooterRuntimeContext = useMemo(
    () => ({
      viewport,
      accentColor,
      logoUrl: customization.storeHeaderLogo,
      collapsedLogo: customization.collapsedLogo,
      brandName: companyInfo.commercialName || customization.appName || 'Gastro Restaurante',
      legalName: companyInfo.legalName,
      ruc: companyInfo.taxId,
      address: activeTenant.operations?.address || companyInfo.address,
      phone: activeTenant.operations?.phone || companyInfo.phone,
      whatsapp: activeTenant.operations?.whatsappNumber || activeTenant.operations?.phone || companyInfo.phone,
      email: companyInfo.email,
      schedule: activeTenant.operations?.schedule,
      publishedFooterPages,
      isBuilderEditing,
      selectedWidgetId,
      onSelectWidget,
      onGoHome,
      onSelectCategory,
      onOpenOrders,
      onOpenBenefits,
      onOpenComplaintsBook: () => setComplaintsOpen(true),
      onNotify: (title, message, tone = 'info') => dispatchToast(title, message, tone),
    }),
    [
      viewport,
      accentColor,
      customization.storeHeaderLogo,
      customization.collapsedLogo,
      customization.appName,
      companyInfo.commercialName,
      companyInfo.legalName,
      companyInfo.taxId,
      companyInfo.address,
      companyInfo.phone,
      companyInfo.email,
      activeTenant.operations?.address,
      activeTenant.operations?.phone,
      activeTenant.operations?.whatsappNumber,
      activeTenant.operations?.schedule,
      publishedFooterPages,
      isBuilderEditing,
      selectedWidgetId,
      onSelectWidget,
      onGoHome,
      onSelectCategory,
      onOpenOrders,
      onOpenBenefits,
      dispatchToast,
    ]
  );

  const renderBand = (bandId: FooterBandId) => {
    const band = footer.bands[bandId];
    if (!band.enabled) return null;

    const colCount = Math.min(4, Math.max(1, band.columnsDesktop || 1));
    const activeCols = COL_KEYS.slice(0, colCount);

    const gridColsClass =
      viewport === 'mobile'
        ? 'grid-cols-1'
        : viewport === 'tablet'
        ? colCount >= 2
          ? 'grid-cols-2'
          : 'grid-cols-1'
        : colCount === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : colCount === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : colCount === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1';

    return (
      <div
        key={bandId}
        style={{
          backgroundColor: band.bgColor,
          color: band.textColor,
          borderTopColor: band.showBorderTop ? band.borderColor || 'rgba(128,128,128,0.2)' : 'transparent',
          paddingTop: `${band.paddingY ?? 28}px`,
          paddingBottom: `${band.paddingY ?? 28}px`,
        }}
        className={`w-full px-4 sm:px-6 lg:px-8 ${band.showBorderTop ? 'border-t' : ''}`}
      >
        <div
          style={{
            maxWidth: band.maxWidth === '100%' ? '100%' : band.maxWidth || '1600px',
          }}
          className={`mx-auto w-full grid gap-6 sm:gap-8 ${gridColsClass} ${
            bandId === 'bottom' ? 'items-center' : 'items-start'
          }`}
        >
          {activeCols.map((colId, idx) => {
            const widgets = band.columns[colId] || [];
            const isSlotSelected =
              isBuilderEditing && selectedBand === bandId && selectedColumn === colId;
            return (
              <div
                key={colId}
                onClick={e => {
                  if (!isBuilderEditing || !onSelectSlot) return;
                  e.stopPropagation();
                  onSelectSlot(bandId, colId);
                }}
                className={`space-y-4 min-w-0 ${
                  bandId === 'bottom' && idx === activeCols.length - 1 && activeCols.length > 1
                    ? 'sm:justify-self-end'
                    : ''
                } ${
                  isBuilderEditing
                    ? `rounded-xl p-2 -m-2 cursor-pointer transition-all ${
                        isSlotSelected
                          ? 'ring-1 ring-amber-400 bg-amber-400/10'
                          : 'hover:ring-1 hover:ring-white/20'
                      }`
                    : ''
                }`}
              >
                {widgets.map(w => (
                  <FooterWidgetRenderer key={w.id} widget={w} ctx={runtimeCtx} />
                ))}
                {isBuilderEditing && widgets.length === 0 && (
                  <div className="p-3 rounded-xl border border-dashed border-current/25 text-center text-[10px] font-bold uppercase tracking-wider opacity-50">
                    {BAND_LABELS[bandId]} · Col {idx + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <footer className="w-full max-w-full overflow-x-clip">
        {renderBand('ribbon')}
        {renderBand('main')}
        {renderBand('bottom')}
      </footer>

      {/* Accessible Libro de Reclamaciones Modal */}
      {complaintsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Libro de Reclamaciones"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpenCheck className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-black truncate">Libro de Reclamaciones Virtual</h3>
                  <p className="text-[11px] text-zinc-500 truncate">{companyInfo.commercialName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComplaintsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nombre completo *"
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
                />
                <input
                  type="text"
                  required
                  value={documentId}
                  onChange={e => setDocumentId(e.target.value)}
                  placeholder="DNI / CE / RUC *"
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Teléfono / WhatsApp"
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={goodType}
                  onChange={e => setGoodType(e.target.value as ComplaintGoodType)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
                >
                  <option value="producto">Bien: Producto</option>
                  <option value="servicio">Bien: Servicio</option>
                </select>
                <select
                  value={claimType}
                  onChange={e => setClaimType(e.target.value as ComplaintType)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
                >
                  <option value="reclamo">Tipo: Reclamo</option>
                  <option value="queja">Tipo: Queja</option>
                </select>
              </div>

              <textarea
                rows={3}
                required
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="Detalle del reclamo o queja *"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
              />

              <input
                type="text"
                value={consumerRequest}
                onChange={e => setConsumerRequest(e.target.value)}
                placeholder="Pedido del consumidor (opcional)"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setComplaintsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold whitespace-nowrap shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
                >
                  Registrar Hoja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
