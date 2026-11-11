import React, { useState, useEffect, useRef, useId } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { ComplaintGoodType, ComplaintType } from '../../types/settings';
import { UnifiedJobApplicationModal } from '../hr/UnifiedJobApplicationModal';
import {
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileText,
  ArrowLeftRight,
  Receipt,
  Briefcase,
  BookOpen,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Lock,
  Headphones,
  User,
  CheckCircle2,
  X,
  Send,
  Flame,
} from 'lucide-react';

interface StorefrontFooterProps {
  footerTheme?: 'light' | 'dark';
}

export const StorefrontFooter: React.FC<StorefrontFooterProps> = ({ footerTheme = 'light' }) => {
  const {
    companyInfo,
    tenants,
    activeTenant,
    addComplaint,
    dispatchToast,
    customization,
  } = useSettings();
  const { orders } = useOrderCatalog();

  const isLight = footerTheme === 'light';

  // Modals state
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobInitialQr, setJobInitialQr] = useState(false);
  const [infoModal, setInfoModal] = useState<'terms' | 'returns' | 'orders' | null>(null);

  const claimDialogRef = useRef<HTMLDialogElement>(null);
  const infoDialogRef = useRef<HTMLDialogElement>(null);
  const claimTitleId = useId();
  const infoTitleId = useId();

  // Auto-open Job Application Modal if visitor arrived via QR (?postular=1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('postular') === '1') {
        setJobInitialQr(false);
        setIsJobModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    const dialog = claimDialogRef.current;
    if (!dialog) return;
    if (isClaimOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isClaimOpen]);

  useEffect(() => {
    const dialog = infoDialogRef.current;
    if (!dialog) return;
    if (infoModal) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [infoModal]);

  // Libro de Reclamaciones Form State
  const [claimBranchId, setClaimBranchId] = useState<string>(activeTenant.id);
  const [consumerName, setConsumerName] = useState('');
  const [docType, setDocType] = useState<'DNI' | 'CE' | 'RUC' | 'Pasaporte'>('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [consumerPhone, setConsumerPhone] = useState('');
  const [consumerEmail, setConsumerEmail] = useState('');
  const [consumerAddress, setConsumerAddress] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [goodType, setGoodType] = useState<ComplaintGoodType>('producto');
  const [orderRef, setOrderRef] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('0.00');
  const [goodDescription, setGoodDescription] = useState('');
  const [claimType, setClaimType] = useState<ComplaintType>('reclamo');
  const [claimDetail, setClaimDetail] = useState('');
  const [consumerRequest, setConsumerRequest] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  // Order lookup phone filter for "Mis Pedidos y Recibos"
  const [lookupQuery, setLookupQuery] = useState('');

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !consumerName.trim() ||
      !docNumber.trim() ||
      !consumerPhone.trim() ||
      !consumerEmail.trim() ||
      !goodDescription.trim() ||
      !claimDetail.trim() ||
      !consumerRequest.trim()
    ) {
      dispatchToast(
        'Campos Obligatorios',
        'Por favor completa todos los datos requeridos en la Hoja de Reclamación.',
        'warning'
      );
      return;
    }

    const branchObj = tenants.find(t => t.id === claimBranchId) || activeTenant;
    const created = addComplaint({
      branchId: branchObj.id,
      branchName: branchObj.name.replace('Khalessi Pizza - ', ''),
      consumerName: consumerName.trim(),
      documentType: docType,
      documentNumber: docNumber.trim(),
      phone: consumerPhone.trim(),
      email: consumerEmail.trim(),
      address: consumerAddress.trim() || 'No especificado',
      isMinor,
      guardianName: isMinor ? guardianName.trim() : undefined,
      goodType,
      orderReference: orderRef.trim() || undefined,
      claimedAmount: parseFloat(claimedAmount) || 0,
      goodDescription: goodDescription.trim(),
      claimType,
      detail: claimDetail.trim(),
      consumerRequest: consumerRequest.trim(),
    });

    setSubmittedTicket(created.ticketCode);
    dispatchToast(
      'Hoja de Reclamación Registrada',
      `Código oficial ${created.ticketCode} generado y enviado a administración.`,
      'success'
    );
  };

  const resetClaimAndClose = () => {
    setSubmittedTicket(null);
    setConsumerName('');
    setDocNumber('');
    setConsumerPhone('');
    setConsumerEmail('');
    setConsumerAddress('');
    setIsMinor(false);
    setGuardianName('');
    setOrderRef('');
    setClaimedAmount('0.00');
    setGoodDescription('');
    setClaimDetail('');
    setConsumerRequest('');
    setIsClaimOpen(false);
  };

  const social = companyInfo.socialLinks || {};

  return (
    <>
      <footer
        className={`mt-12 border-t relative transition-colors ${
          isLight
            ? 'bg-[#f8fafc] text-slate-700 border-slate-200'
            : 'bg-neutral-950 text-neutral-300 border-neutral-800'
        }`}
      >
        {/* Top Solid Accent Line */}
        <div className="h-1 w-full bg-rose-600" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
            {/* COLUMN 1: Brand Emblem & Fiscal Data from Configuración -> Datos Fiscales */}
            <div className="lg:col-span-3 space-y-4">
              {/* Brand Emblem */}
              <div className="inline-flex items-center gap-2.5">
                {(customization.storeHeaderLogo || customization.logoDark || customization.logoLight) ? (
                  <img
                    src={customization.storeHeaderLogo || customization.logoDark || customization.logoLight}
                    alt={companyInfo.commercialName}
                    className="h-11 max-w-[180px] object-contain"
                  />
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-600 text-white shadow-sm flex items-center gap-2">
                    <Flame className="h-5 w-5 fill-amber-300 text-amber-200" />
                    <div className="leading-none">
                      <span className="block text-[10px] font-black tracking-widest uppercase text-amber-200">
                        PIZZA
                      </span>
                      <span className="block text-sm font-black tracking-tight uppercase">
                        {companyInfo.commercialName.replace(/pizza/gi, '').trim() || 'KHALESSI'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 text-xs">
                <li className="flex items-center gap-2.5">
                  <span
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <strong className={isLight ? 'text-slate-900' : 'text-white'}>RUC:</strong>{' '}
                    <span className="font-mono">{companyInfo.taxId}</span>
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-snug pt-1">{companyInfo.address}</span>
                </li>

                <li className="flex items-center gap-2.5">
                  <span
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </span>
                  <a href={`tel:${companyInfo.phone}`} className="hover:underline font-medium">
                    {companyInfo.phone}
                  </a>
                </li>

                <li className="flex items-center gap-2.5">
                  <span
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <a
                    href={`mailto:${companyInfo.email}`}
                    className="hover:underline truncate"
                  >
                    {companyInfo.email}
                  </a>
                </li>
              </ul>
            </div>

            {/* COLUMN 2: Atención al Cliente */}
            <div className="lg:col-span-3 space-y-4">
              <h4
                className={`text-sm font-extrabold tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Atención al Cliente
              </h4>

              <ul className="space-y-2.5 text-xs font-semibold">
                <li>
                  <button
                    type="button"
                    onClick={() => setInfoModal('terms')}
                    className="flex items-center gap-3 group text-left hover:opacity-85 transition-opacity"
                  >
                    <span
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="group-hover:underline">Términos y Condiciones</span>
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    onClick={() => setInfoModal('returns')}
                    className="flex items-center gap-3 group text-left hover:opacity-85 transition-opacity"
                  >
                    <span
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </span>
                    <span className="group-hover:underline">Cambios y Devoluciones</span>
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    onClick={() => setInfoModal('orders')}
                    className="flex items-center gap-3 group text-left hover:opacity-85 transition-opacity"
                  >
                    <span
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/15 text-blue-400'
                      }`}
                    >
                      <Receipt className="h-4 w-4" />
                    </span>
                    <span className="group-hover:underline">Mis Pedidos y Recibos</span>
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setJobInitialQr(false);
                      setIsJobModalOpen(true);
                    }}
                    className="flex items-center gap-3 group text-left hover:opacity-85 transition-opacity"
                  >
                    <span
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isLight
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-teal-500/15 text-teal-400'
                      }`}
                    >
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <span className="group-hover:underline">Trabaja con Nosotros</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* COLUMN 3: Métodos de Pago & Síguenos */}
            <div className="lg:col-span-3 space-y-5">
              <div className="space-y-3">
                <h4
                  className={`text-sm font-extrabold tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Métodos de Pago
                </h4>

                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1a1f71] text-white text-[11px] font-black italic tracking-wide shadow-xs">
                    VISA
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#eb001b] text-white text-[11px] font-bold shadow-xs">
                    Mastercard
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#742284] text-white text-[11px] font-bold shadow-xs">
                    📱 Yape
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00b4cc] text-white text-[11px] font-bold shadow-xs">
                    💳 Plin
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] text-white text-[11px] font-bold shadow-xs">
                    💵 Efectivo
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4
                  className={`text-sm font-extrabold tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Síguenos
                </h4>

                <div className="flex items-center gap-2">
                  {social.facebook && (
                    <a
                      href={social.facebook}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Visitar Facebook oficial"
                      className="h-9 w-9 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-sm hover:scale-105 transition-transform font-black text-base"
                    >
                      f
                    </a>
                  )}

                  {social.instagram && (
                    <a
                      href={social.instagram}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Visitar Instagram oficial"
                      className="h-9 w-9 rounded-xl bg-[#E1306C] text-white flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4a3.9 3.9 0 0 1-1.4-.9c-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2-.1-1.3-.1-1.6-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4 1.3-.1 1.6-.1 4.9-.1M12 0C8.7 0 8.3 0 7.1.1c-1.3.1-2.2.3-3 .6-.8.3-1.5.7-2.2 1.4A6 6 0 0 0 .5 4.3c-.3.8-.5 1.7-.6 3C0 8.3 0 8.7 0 12s0 3.7.1 4.9c.1 1.3.3 2.2.6 3 .3.8.7 1.5 1.4 2.2.7.7 1.4 1.1 2.2 1.4.8.3 1.7.5 3 .6 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c1.3-.1 2.2-.3 3-.6.8-.3 1.5-.7 2.2-1.4.7-.7 1.1-1.4 1.4-2.2.3-.8.5-1.7.6-3 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.1-1.3-.3-2.2-.6-3a6 6 0 0 0-1.4-2.2A6 6 0 0 0 19.8.7c-.8-.3-1.7-.5-3-.6C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z" />
                      </svg>
                    </a>
                  )}

                  {social.tiktok && (
                    <a
                      href={social.tiktok}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Visitar TikTok oficial"
                      className="h-9 w-9 rounded-xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    </a>
                  )}

                  {social.whatsapp && (
                    <a
                      href={social.whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Chatear por WhatsApp"
                      className="h-9 w-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 4: Defensa del Consumidor & Bolsa de Trabajo */}
            <div className="lg:col-span-3 space-y-3">
              <h4
                className={`text-sm font-extrabold tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Defensa del Consumidor
              </h4>

              {/* Card 1: Libro de Reclamaciones (INDECOPI) */}
              <button
                type="button"
                onClick={() => setIsClaimOpen(true)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all hover:shadow-md group ${
                  isLight
                    ? 'bg-amber-50 border-amber-300 hover:border-amber-400'
                    : 'bg-neutral-900 border-amber-500/35 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      INDECOPI • LEY N° 29571
                    </span>
                    <span
                      className={`block text-xs sm:text-sm font-extrabold truncate ${
                        isLight ? 'text-amber-950' : 'text-amber-200'
                      }`}
                    >
                      Libro de Reclamaciones
                    </span>
                    <span className="block text-[10px] text-amber-800/80 dark:text-amber-300/75">
                      Hoja de Reclamación Virtual
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Card 2: Bolsa de Trabajo • QR */}
              <div
                onClick={() => {
                  setJobInitialQr(false);
                  setIsJobModalOpen(true);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-md group ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                    : 'bg-neutral-900 border-emerald-500/30 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isLight
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      BOLSA DE TRABAJO • QR
                    </span>
                    <span
                      className={`block text-xs sm:text-sm font-extrabold truncate ${
                        isLight ? 'text-emerald-950' : 'text-emerald-200'
                      }`}
                    >
                      ¡Trabaja con Nosotros!
                    </span>
                    <span className="block text-[10px] text-emerald-800/80 dark:text-emerald-300/75">
                      Postula aquí o escanea el QR
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Mostrar código QR de Bolsa de Trabajo"
                  onClick={e => {
                    e.stopPropagation();
                    setJobInitialQr(true);
                    setIsJobModalOpen(true);
                  }}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    isLight
                      ? 'text-emerald-700 hover:bg-emerald-100'
                      : 'text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                  title="Ver QR para escanear"
                >
                  <QrCode className="h-4 w-4" />
                </button>
              </div>

              {/* Security Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <ShieldCheck className="h-3 w-3 text-rose-500" />
                  Compra 100% Segura
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <Lock className="h-3 w-3 text-rose-500" />
                  SSL 256-Bit
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Legal & Trust Strip */}
          <div
            className={`mt-10 pt-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] ${
              isLight
                ? 'border-slate-200/90 text-slate-500'
                : 'border-neutral-800/80 text-neutral-500'
            }`}
          >
            <p>
              © {new Date().getFullYear()}{' '}
              <strong className={isLight ? 'text-slate-800' : 'text-neutral-200'}>
                {companyInfo.commercialName}
              </strong>
              . Todos los derechos reservados.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Pagos Protegidos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                Comprobante Electrónico
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-emerald-500" />
                Soporte Oficial
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ======================================================================
          MODAL 1: LIBRO DE RECLAMACIONES VIRTUAL (INDECOPI LEY N° 29571)
         ====================================================================== */}
      <dialog
        ref={claimDialogRef}
        aria-labelledby={claimTitleId}
        onClose={() => {
          if (claimDialogRef.current) claimDialogRef.current.returnValue = '';
          setIsClaimOpen(false);
        }}
        className="max-w-2xl"
      >
        {isClaimOpen && (
          <div className="w-full rounded-3xl bg-white dark:bg-[#141418] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-100 block">
                    CONFORME AL CÓDIGO DE PROTECCIÓN Y DEFENSA DEL CONSUMIDOR • LEY N° 29571
                  </span>
                  <h2 id={claimTitleId} className="text-base sm:text-lg font-black truncate">
                    Libro de Reclamaciones — Hoja Virtual
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={resetClaimAndClose}
                aria-label="Cerrar Libro de Reclamaciones"
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {submittedTicket ? (
                <div className="py-8 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                      Constancia de Recepción Oficial
                    </span>
                    <h3 className="text-2xl font-black text-zinc-950 dark:text-white">
                      Hoja {submittedTicket}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                      Tu hoja ha quedado registrada en el sistema de <strong>{companyInfo.legalName}</strong> (RUC {companyInfo.taxId}). Daremos respuesta formal en un plazo máximo improrrogable de quince (15) días hábiles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetClaimAndClose}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 whitespace-nowrap shrink-0"
                  >
                    Entendido y Cerrar
                  </button>
                </div>
              ) : (
                <form id="libro-reclamaciones-form" onSubmit={handleClaimSubmit} className="space-y-5">
                  {/* Provider Identification Box */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block">
                        Razón Social del Proveedor
                      </span>
                      <strong className="text-zinc-900 dark:text-white">{companyInfo.legalName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block">
                        RUC Oficial
                      </span>
                      <strong className="font-mono text-zinc-900 dark:text-white">{companyInfo.taxId}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="claim-branch" className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block mb-1">
                        Establecimiento / Sede donde ocurrió la atención
                      </label>
                      <select
                        id="claim-branch"
                        value={claimBranchId}
                        onChange={e => setClaimBranchId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl saas-input text-xs font-semibold"
                      >
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {t.operations?.address || companyInfo.address}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 1. Consumer Identification */}
                  <fieldset className="space-y-3">
                    <legend className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      1. Identificación del Consumidor Reclamante
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label htmlFor="clm-name" className="block font-semibold mb-1">
                          Nombre Completo / Razón Social *
                        </label>
                        <input
                          id="clm-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={consumerName}
                          onChange={e => setConsumerName(e.target.value)}
                          placeholder="Nombres y Apellidos completos"
                          className="w-full px-3 py-2 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="clm-doc" className="block font-semibold mb-1">
                          Documento de Identidad *
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            aria-label="Tipo de documento"
                            value={docType}
                            onChange={e => setDocType(e.target.value as 'DNI' | 'CE' | 'RUC' | 'Pasaporte')}
                            className="px-2.5 py-2 rounded-xl saas-input font-bold"
                          >
                            <option value="DNI">DNI</option>
                            <option value="CE">CE</option>
                            <option value="RUC">RUC</option>
                            <option value="Pasaporte">Pasap.</option>
                          </select>
                          <input
                            id="clm-doc"
                            type="text"
                            inputMode="numeric"
                            required
                            value={docNumber}
                            onChange={e => setDocNumber(e.target.value)}
                            placeholder="Número"
                            className="w-full px-3 py-2 rounded-xl saas-input font-mono text-xs sm:text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="clm-phone" className="block font-semibold mb-1">
                          Teléfono / Celular *
                        </label>
                        <input
                          id="clm-phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          value={consumerPhone}
                          onChange={e => setConsumerPhone(e.target.value)}
                          placeholder="+51 999 888 777"
                          className="w-full px-3 py-2 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="clm-email" className="block font-semibold mb-1">
                          Correo Electrónico para Respuesta *
                        </label>
                        <input
                          id="clm-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={consumerEmail}
                          onChange={e => setConsumerEmail(e.target.value)}
                          placeholder="cliente@correo.com"
                          className="w-full px-3 py-2 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="clm-addr" className="block font-semibold mb-1">
                          Domicilio *
                        </label>
                        <input
                          id="clm-addr"
                          type="text"
                          required
                          autoComplete="street-address"
                          value={consumerAddress}
                          onChange={e => setConsumerAddress(e.target.value)}
                          placeholder="Dirección y distrito"
                          className="w-full px-3 py-2 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2 flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                          <input
                            type="checkbox"
                            checked={isMinor}
                            onChange={e => setIsMinor(e.target.checked)}
                            className="h-4 w-4 rounded accent-amber-500"
                          />
                          <span>Soy menor de edad (requiere datos de padre, madre o apoderado)</span>
                        </label>
                        {isMinor && (
                          <input
                            type="text"
                            required
                            value={guardianName}
                            onChange={e => setGuardianName(e.target.value)}
                            placeholder="Nombre completo y DNI del Padre / Apoderado *"
                            className="w-full px-3 py-2 rounded-xl saas-input text-xs sm:text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </fieldset>

                  {/* 2. Contracted Good */}
                  <fieldset className="space-y-3">
                    <legend className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      2. Identificación del Bien Contratado
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="clm-good-type" className="block font-semibold mb-1">
                          Tipo de Bien
                        </label>
                        <select
                          id="clm-good-type"
                          value={goodType}
                          onChange={e => setGoodType(e.target.value as ComplaintGoodType)}
                          className="w-full px-3 py-2 rounded-xl saas-input font-semibold"
                        >
                          <option value="producto">Producto (Alimentos / Bebidas)</option>
                          <option value="servicio">Servicio (Salón / Delivery)</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="clm-amount" className="block font-semibold mb-1">
                          Monto Reclamado (S/)
                        </label>
                        <input
                          id="clm-amount"
                          type="number"
                          min="0"
                          step="0.10"
                          value={claimedAmount}
                          onChange={e => setClaimedAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl saas-input font-mono"
                        />
                      </div>

                      <div>
                        <label htmlFor="clm-order" className="block font-semibold mb-1">
                          N° Pedido / Boleta (Opc.)
                        </label>
                        <input
                          id="clm-order"
                          type="text"
                          value={orderRef}
                          onChange={e => setOrderRef(e.target.value)}
                          placeholder="Ej: #KH-1021 / B001-42"
                          className="w-full px-3 py-2 rounded-xl saas-input font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="clm-good-desc" className="block font-semibold mb-1">
                          Descripción del Producto o Servicio *
                        </label>
                        <input
                          id="clm-good-desc"
                          type="text"
                          required
                          value={goodDescription}
                          onChange={e => setGoodDescription(e.target.value)}
                          placeholder="Ej: Pizza Familiar Pepperoni Hot Honey pedida por web"
                          className="w-full px-3 py-2 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* 3. Detail of Claim */}
                  <fieldset className="space-y-3">
                    <legend className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      3. Detalle de la Reclamación y Pedido del Consumidor
                    </legend>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setClaimType('reclamo')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          claimType === 'reclamo'
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                            : 'saas-subcard'
                        }`}
                      >
                        <strong className="block text-xs">RECLAMO</strong>
                        <span className="text-[11px] text-zinc-500">
                          Disconformidad relacionada directamente a los productos o servicios.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClaimType('queja')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          claimType === 'queja'
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                            : 'saas-subcard'
                        }`}
                      >
                        <strong className="block text-xs">QUEJA</strong>
                        <span className="text-[11px] text-zinc-500">
                          Malestar o descontento respecto a la atención al público.
                        </span>
                      </button>
                    </div>

                    <div>
                      <label htmlFor="clm-detail" className="block font-semibold mb-1">
                        Detalle de lo sucedido *
                      </label>
                      <textarea
                        id="clm-detail"
                        rows={3}
                        required
                        value={claimDetail}
                        onChange={e => setClaimDetail(e.target.value)}
                        placeholder="Explica de forma clara y detallada los hechos ocurridos..."
                        className="w-full px-3 py-2 rounded-xl saas-input text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="clm-request" className="block font-semibold mb-1">
                        Pedido concreto del consumidor *
                      </label>
                      <textarea
                        id="clm-request"
                        rows={2}
                        required
                        value={consumerRequest}
                        onChange={e => setConsumerRequest(e.target.value)}
                        placeholder="Indica qué solución solicitas..."
                        className="w-full px-3 py-2 rounded-xl saas-input text-xs sm:text-sm"
                      />
                    </div>
                  </fieldset>
                </form>
              )}
            </div>

            {!submittedTicket && (
              <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={resetClaimAndClose}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="libro-reclamaciones-form"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md whitespace-nowrap shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Enviar Hoja de Reclamación</span>
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>

      {/* ======================================================================
          MODAL 2: UNIFIED JOB APPLICATION MODAL (HR FORM BUILDER POWERED)
         ====================================================================== */}
      <UnifiedJobApplicationModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        initialShowQr={jobInitialQr}
      />

      {/* ======================================================================
          MODAL 3: CUSTOMER CARE INFO MODALS (Términos / Cambios / Mis Pedidos)
         ====================================================================== */}
      <dialog
        ref={infoDialogRef}
        aria-labelledby={infoTitleId}
        onClose={() => {
          if (infoDialogRef.current) infoDialogRef.current.returnValue = '';
          setInfoModal(null);
        }}
        className="max-w-lg"
      >
        {infoModal && (
          <div className="rounded-3xl bg-white dark:bg-[#16161b] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h2 id={infoTitleId} className="text-base font-black">
                {infoModal === 'terms' && 'Términos y Condiciones de Uso'}
                {infoModal === 'returns' && 'Política de Cambios y Devoluciones'}
                {infoModal === 'orders' && 'Mis Pedidos y Recibos Electrónicos'}
              </h2>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                aria-label="Cerrar"
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {infoModal === 'terms' && (
              <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  Bienvenido a la tienda oficial de <strong>{companyInfo.commercialName}</strong> operada por{' '}
                  <strong>{companyInfo.legalName}</strong> (RUC {companyInfo.taxId}).
                </p>
                <p>
                  • Los tiempos estimados de entrega oscilan entre 30 y 45 minutos dependiendo de la zona de cobertura y horneado artesanal.
                </p>
                <p>
                  • Todos los precios publicados incluyen el IGV (18%) y emiten boleta o factura electrónica autorizada por SUNAT.
                </p>
              </div>
            )}

            {infoModal === 'returns' && (
              <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  Al tratarse de alimentos perecibles recién horneados, garantizamos la calidad e inocuidad de cada pedido al momento de la entrega.
                </p>
                <p>
                  • Si tu pedido presenta algún error en ingredientes, temperatura o empaque alterado, comunícate de inmediato al <strong>{companyInfo.phone}</strong> dentro de los primeros 30 minutos para reposición inmediata sin costo.
                </p>
              </div>
            )}

            {infoModal === 'orders' && (
              <div className="space-y-3 text-xs">
                <input
                  type="search"
                  value={lookupQuery}
                  onChange={e => setLookupQuery(e.target.value)}
                  placeholder="Filtrar por tu nombre, celular o #KH-..."
                  className="w-full px-3 py-2 rounded-xl saas-input text-xs"
                />
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {orders
                    .filter(o => {
                      const q = lookupQuery.trim().toLowerCase();
                      if (!q) return o.channel === 'online';
                      return (
                        o.orderNumber.toLowerCase().includes(q) ||
                        o.customerName.toLowerCase().includes(q) ||
                        o.customerPhone.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 8)
                    .map(ord => (
                      <div key={ord.id} className="p-3 rounded-xl saas-subcard flex items-center justify-between gap-2">
                        <div>
                          <strong className="text-zinc-900 dark:text-white block">
                            {ord.orderNumber} · {ord.customerName}
                          </strong>
                          <span className="text-[11px] text-zinc-500">
                            {ord.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black block" style={{ color: customization.primaryColor }}>
                            S/ {ord.total.toFixed(2)}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-emerald-500">
                            {ord.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
};
