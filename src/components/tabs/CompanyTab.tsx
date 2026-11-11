import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PermissionGate } from '../common/PermissionGate';
import {
  BankAccount,
  DigitalWallet,
  ComplaintRecord,
  ComplaintStatus,
  SocialLinks,
} from '../../types/settings';
import {
  Building2,
  CreditCard,
  QrCode,
  Plus,
  Trash2,
  Upload,
  Smartphone,
  Save,
  BookOpen,
  Share2,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Globe,
} from 'lucide-react';

export const CompanyTab: React.FC = () => {
  const {
    companyInfo,
    updateCompanyInfo,
    complaints,
    updateComplaintStatus,
    deleteComplaint,
    openNoticeModal,
    saveAllSettings,
    isSaving,
    customization,
    activeTenant,
    branchScope,
  } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState<'legal' | 'banks' | 'wallets' | 'complaints' | 'culqi'>('legal');
  const [complaintFilter, setComplaintFilter] = useState<'all' | ComplaintStatus>('all');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
  const [responseDraft, setResponseDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<ComplaintStatus>('pendiente');

  const complaintDialogRef = useRef<HTMLDialogElement>(null);
  const complaintDialogTitleId = useId();

  useEffect(() => {
    const dialog = complaintDialogRef.current;
    if (!dialog) return;
    if (selectedComplaint) {
      setResponseDraft(selectedComplaint.adminResponse || '');
      setStatusDraft(selectedComplaint.status);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [selectedComplaint]);

  const handleUpdateSocial = (key: keyof SocialLinks, value: string) => {
    updateCompanyInfo({
      socialLinks: {
        ...(companyInfo.socialLinks || {}),
        [key]: value,
      },
    });
  };

  const handleAddBank = () => {
    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: 'Interbank',
      accountType: 'corriente',
      accountNumber: '200-300123456-0',
      cci: '003-200-003001234560-12',
      currency: 'PEN (S/)',
      holderName: companyInfo.legalName,
    };
    updateCompanyInfo({ bankAccounts: [...companyInfo.bankAccounts, newBank] });
  };

  const handleUpdateBank = (id: string, partial: Partial<BankAccount>) => {
    const updated = companyInfo.bankAccounts.map(b => (b.id === id ? { ...b, ...partial } : b));
    updateCompanyInfo({ bankAccounts: updated });
  };

  const handleDeleteBank = (id: string) => {
    updateCompanyInfo({ bankAccounts: companyInfo.bankAccounts.filter(b => b.id !== id) });
  };

  const handleAddWallet = () => {
    const newWallet: DigitalWallet = {
      id: `wallet-${Date.now()}`,
      provider: 'yape',
      holderName: companyInfo.commercialName,
      phone: '999 888 777',
      qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=YAPE-NUEVO-LOCAL',
    };
    updateCompanyInfo({ wallets: [...companyInfo.wallets, newWallet] });
  };

  const handleUpdateWallet = (id: string, partial: Partial<DigitalWallet>) => {
    const updated = companyInfo.wallets.map(w => (w.id === id ? { ...w, ...partial } : w));
    updateCompanyInfo({ wallets: updated });
  };

  const handleDeleteWallet = (id: string) => {
    updateCompanyInfo({ wallets: companyInfo.wallets.filter(w => w.id !== id) });
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>, walletId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) {
          handleUpdateWallet(walletId, { qrImageUrl: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (branchScope === 'branch' && c.branchId && c.branchId !== activeTenant.id) {
        // Show all in consolidated or matching branch; if legacy seed doesn't match, allow viewing in consolidated or matching branch
      }
      const matchesStatus = complaintFilter === 'all' || c.status === complaintFilter;
      const q = complaintSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.ticketCode.toLowerCase().includes(q) ||
        c.consumerName.toLowerCase().includes(q) ||
        c.documentNumber.toLowerCase().includes(q) ||
        c.goodDescription.toLowerCase().includes(q) ||
        c.branchName.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [complaints, complaintFilter, complaintSearch, branchScope, activeTenant.id]);

  const pendingComplaintsCount = useMemo(
    () => complaints.filter(c => c.status === 'pendiente').length,
    [complaints]
  );

  const handleSaveComplaintResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    updateComplaintStatus(selectedComplaint.id, statusDraft, responseDraft);
    setSelectedComplaint(null);
  };

  const handleConfirmDeleteComplaint = (item: ComplaintRecord) => {
    openNoticeModal({
      title: `¿Archivar hoja ${item.ticketCode}?`,
      message: `Se removerá el registro de ${item.consumerName} del panel activo. Asegúrate de haber descargado o respondido conforme al plazo legal INDECOPI.`,
      tone: 'danger',
      confirmLabel: 'Sí, Archivar Registro',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        deleteComplaint(item.id);
        if (selectedComplaint?.id === item.id) {
          setSelectedComplaint(null);
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" style={{ color: customization.primaryColor }} />
            Datos Fiscales, Redes Sociales y Libro de Reclamaciones
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Información legal sincronizada en vivo con el pie de página de la Tienda Virtual, SUNAT/INDECOPI y métodos de cobro.
          </p>
        </div>

        <PermissionGate permission="settings:manage" hideInsteadOfBanner>
          <button
            type="button"
            onClick={saveAllSettings}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: customization.primaryColor }}
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Guardando...' : 'Guardar Datos de Empresa'}
          </button>
        </PermissionGate>
      </div>

      <PermissionGate permission="settings:manage">
        {/* Modern SaaS Segmented Subtabs */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-700/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('legal')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'legal'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            1. Datos Fiscales y Redes
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('banks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'banks'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            2. Cuentas Bancarias ({companyInfo.bankAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('wallets')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'wallets'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            3. Billeteras Digitales y QR ({companyInfo.wallets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('complaints')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'complaints'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-500" />
            <span>4. Libro de Reclamaciones ({complaints.length})</span>
            {pendingComplaintsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-zinc-950">
                {pendingComplaintsCount} pend.
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('culqi')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'culqi'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-emerald-500" />
            <span>5. Pasarela Culqi Checkout</span>
          </button>
        </div>

        {/* Tab 1: Legal Info + Social Media Links */}
        {activeSubTab === 'legal' && (
          <div className="space-y-6">
            <div className="saas-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Identificación Fiscal y Contacto Oficial
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Estos datos se muestran automáticamente en el Footer de la Tienda Virtual y en las Hojas de Reclamación.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Globe className="h-3 w-3" /> Sincronizado con Tienda Virtual
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="comp-legal-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
                    Razón Social (Persona Jurídica / Natural)
                  </label>
                  <input
                    id="comp-legal-name"
                    name="legalName"
                    type="text"
                    value={companyInfo.legalName}
                    onChange={e => updateCompanyInfo({ legalName: e.target.value })}
                    placeholder="Ej. KHALESSI PIZZA FOODS S.A.C."
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="comp-tax-id" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
                    RUC / Identificación Fiscal
                  </label>
                  <input
                    id="comp-tax-id"
                    name="taxId"
                    type="text"
                    inputMode="numeric"
                    autoCorrect="off"
                    value={companyInfo.taxId}
                    onChange={e => updateCompanyInfo({ taxId: e.target.value })}
                    placeholder="10469969598"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="comp-commercial-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
                    Nombre Comercial / Marca Registrada
                  </label>
                  <input
                    id="comp-commercial-name"
                    name="commercialName"
                    type="text"
                    value={companyInfo.commercialName}
                    onChange={e => updateCompanyInfo({ commercialName: e.target.value })}
                    placeholder="Ej. Pizza Khalessi"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="comp-currency" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
                    Moneda Base del ERP
                  </label>
                  <select
                    id="comp-currency"
                    name="currency"
                    value={companyInfo.currency}
                    onChange={e => updateCompanyInfo({ currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm font-medium"
                  >
                    <option value="PEN (S/)">Soles Peruanos (S/ - PEN)</option>
                    <option value="USD ($)">Dólares Americanos ($ - USD)</option>
                    <option value="EUR (€)">Euros (€ - EUR)</option>
                    <option value="COP ($)">Pesos Colombianos (COP)</option>
                    <option value="MXN ($)">Pesos Mexicanos (MXN)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="comp-address" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
                    Dirección Fiscal / Local Principal
                  </label>
                  <input
                    id="comp-address"
                    name="address"
                    type="text"
                    autoComplete="street-address"
                    value={companyInfo.address}
                    onChange={e => updateCompanyInfo({ address: e.target.value })}
                    placeholder="Los Lirios 2 / Av. Primavera 1024, Surco"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="comp-phone" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
                    Teléfono Central / WhatsApp Atención
                  </label>
                  <input
                    id="comp-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={companyInfo.phone}
                    onChange={e => updateCompanyInfo({ phone: e.target.value })}
                    placeholder="+51 935 292 793"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="comp-email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 mb-2">
                    Email Oficial de Atención y Facturación
                  </label>
                  <input
                    id="comp-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="none"
                    value={companyInfo.email}
                    onChange={e => updateCompanyInfo({ email: e.target.value })}
                    placeholder="pizzakhalessi22@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Links Card */}
            <div className="saas-card p-6 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Share2 className="h-4 w-4" style={{ color: customization.primaryColor }} />
                  Enlaces de Redes Sociales (Sección «Síguenos» del Footer)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Configura las URLs oficiales de tus redes sociales. Si dejas un campo vacío, ese botón se ocultará en el pie de página.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="soc-fb" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                    Facebook Oficial (URL)
                  </label>
                  <input
                    id="soc-fb"
                    name="facebook"
                    type="url"
                    autoCorrect="off"
                    autoCapitalize="none"
                    value={companyInfo.socialLinks?.facebook || ''}
                    onChange={e => handleUpdateSocial('facebook', e.target.value)}
                    placeholder="https://facebook.com/pizzakhalessi"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="soc-ig" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                    Instagram Oficial (URL)
                  </label>
                  <input
                    id="soc-ig"
                    name="instagram"
                    type="url"
                    autoCorrect="off"
                    autoCapitalize="none"
                    value={companyInfo.socialLinks?.instagram || ''}
                    onChange={e => handleUpdateSocial('instagram', e.target.value)}
                    placeholder="https://instagram.com/pizzakhalessi"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="soc-tt" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                    TikTok Oficial (URL)
                  </label>
                  <input
                    id="soc-tt"
                    name="tiktok"
                    type="url"
                    autoCorrect="off"
                    autoCapitalize="none"
                    value={companyInfo.socialLinks?.tiktok || ''}
                    onChange={e => handleUpdateSocial('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@pizzakhalessi"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="soc-wa" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                    WhatsApp Directo (Enlace wa.me)
                  </label>
                  <input
                    id="soc-wa"
                    name="whatsapp"
                    type="url"
                    autoCorrect="off"
                    autoCapitalize="none"
                    value={companyInfo.socialLinks?.whatsapp || ''}
                    onChange={e => handleUpdateSocial('whatsapp', e.target.value)}
                    placeholder="https://wa.me/51935292793"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bank Accounts */}
        {activeSubTab === 'banks' && (
          <div className="saas-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Cuentas para Transferencias Bancarias
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Aparecerán impresas en facturas y órdenes de catering corporativo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBank}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Cuenta
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyInfo.bankAccounts.map(bank => (
                <div key={bank.id} className="p-4 saas-subcard space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={bank.bankName}
                      onChange={e => handleUpdateBank(bank.id, { bankName: e.target.value })}
                      placeholder="Nombre del Banco"
                      className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg saas-input"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteBank(bank.id)}
                      className="p-1.5 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 block mb-1">Tipo Cuenta</span>
                      <select
                        value={bank.accountType}
                        onChange={e => handleUpdateBank(bank.id, { accountType: e.target.value as BankAccount['accountType'] })}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg saas-input"
                      >
                        <option value="corriente">Corriente</option>
                        <option value="ahorros">Ahorros</option>
                        <option value="maestra">Maestra</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 block mb-1">Moneda</span>
                      <input
                        type="text"
                        value={bank.currency}
                        onChange={e => handleUpdateBank(bank.id, { currency: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg saas-input"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 block mb-1">Número de Cuenta</span>
                    <input
                      type="text"
                      value={bank.accountNumber}
                      onChange={e => handleUpdateBank(bank.id, { accountNumber: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg saas-input font-mono"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 block mb-1">Código Interbancario (CCI)</span>
                    <input
                      type="text"
                      value={bank.cci || ''}
                      onChange={e => handleUpdateBank(bank.id, { cci: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg saas-input font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Digital Wallets & QR */}
        {activeSubTab === 'wallets' && (
          <div className="saas-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Billeteras Móviles (Yape, Plin y Códigos QR)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Los clientes escanean el QR desde las comandas o pantallas del mostrador.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddWallet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Billetera
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {companyInfo.wallets.map(wallet => (
                <div
                  key={wallet.id}
                  className="p-5 saas-subcard flex flex-col sm:flex-row gap-5"
                >
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="h-32 w-32 bg-white rounded-xl p-2 border border-zinc-200 shadow-sm flex items-center justify-center overflow-hidden">
                      {wallet.qrImageUrl ? (
                        <img src={wallet.qrImageUrl} alt="QR Code" className="h-full w-full object-contain" />
                      ) : (
                        <QrCode className="h-12 w-12 text-zinc-400" />
                      )}
                    </div>
                    <label className="cursor-pointer text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                      <Upload className="h-3 w-3" /> Subir QR
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleQrUpload(e, wallet.id)}
                      />
                    </label>
                  </div>

                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={wallet.provider}
                        onChange={e => handleUpdateWallet(wallet.id, { provider: e.target.value as DigitalWallet['provider'] })}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg saas-input uppercase"
                      >
                        <option value="yape">YAPE (BCP)</option>
                        <option value="plin">PLIN (Interbank/BBVA)</option>
                        <option value="other">OTRA BILLETERA</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteWallet(wallet.id)}
                        className="text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors"
                        title="Eliminar billetera"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 block mb-1">Número Celular Asociado</span>
                      <div className="relative flex items-center">
                        <Smartphone className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="text"
                          value={wallet.phone}
                          onChange={e => handleUpdateWallet(wallet.id, { phone: e.target.value })}
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg saas-input font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 block mb-1">Titular visible en App</span>
                      <input
                        type="text"
                        value={wallet.holderName}
                        onChange={e => handleUpdateWallet(wallet.id, { holderName: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg saas-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Libro de Reclamaciones (INDECOPI Ley N° 29571) */}
        {activeSubTab === 'complaints' && (
          <div className="space-y-5">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="saas-card p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Total Hojas Recibidas
                </span>
                <span className="text-2xl font-black text-zinc-950 dark:text-white mt-1 block">
                  {complaints.length}
                </span>
              </div>
              <div className="saas-card p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Pendientes de Atención
                </span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                  {complaints.filter(c => c.status === 'pendiente').length}
                </span>
              </div>
              <div className="saas-card p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">
                  En Evaluación
                </span>
                <span className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 block">
                  {complaints.filter(c => c.status === 'en_proceso').length}
                </span>
              </div>
              <div className="saas-card p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Atendidas / Cerradas
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {complaints.filter(c => c.status === 'atendido').length}
                </span>
              </div>
            </div>

            <div className="saas-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-500" />
                    Registro Oficial — Libro de Reclamaciones Virtual (INDECOPI Ley N° 29571)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Todos los formularios enviados por los clientes desde el Footer de la Tienda Virtual aparecen aquí en tiempo real. Plazo legal máximo de respuesta: 15 días hábiles.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(['all', 'pendiente', 'en_proceso', 'atendido'] as const).map(st => {
                    const labels = {
                      all: 'Todos',
                      pendiente: 'Pendientes',
                      en_proceso: 'En Proceso',
                      atendido: 'Atendidos',
                    };
                    const active = complaintFilter === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setComplaintFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                            : 'saas-subcard text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        {labels[st]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <search>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    name="complaintSearch"
                    value={complaintSearch}
                    onChange={e => setComplaintSearch(e.target.value)}
                    placeholder="Buscar por código LR-2026, nombre del consumidor, DNI/RUC o detalle..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl saas-input text-xs sm:text-sm"
                  />
                </div>
              </search>

              {filteredComplaints.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
                  <BookOpen className="h-9 w-9 mx-auto opacity-40" />
                  <p className="text-sm font-semibold">No hay hojas de reclamación con este filtro</p>
                  <p className="text-xs">Las reclamaciones enviadas desde la Tienda Virtual se registrarán automáticamente en esta bandeja.</p>
                </div>
              ) : (
                <div className="erp-table-wrapper">
                  <table className="erp-stack-table text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/90 dark:bg-zinc-900/90">
                        <th className="py-3 px-3 font-bold">Hoja / Fecha</th>
                        <th className="py-3 px-3 font-bold">Consumidor</th>
                        <th className="py-3 px-3 font-bold">Sede / Bien</th>
                        <th className="py-3 px-3 font-bold">Tipo</th>
                        <th className="py-3 px-3 font-bold">Estado</th>
                        <th className="py-3 px-3 font-bold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                      {filteredComplaints.map(item => (
                        <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                          <th scope="row" className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                            <span className="block text-amber-600 dark:text-amber-400">{item.ticketCode}</span>
                            <span className="text-[11px] font-normal text-zinc-500">
                              {new Date(item.createdAt).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </th>
                          <td data-label="Consumidor" className="py-3 px-3">
                            <div className="text-right sm:text-left">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">{item.consumerName}</span>
                              <span className="text-[11px] text-zinc-500 font-mono">
                                {item.documentType}: {item.documentNumber} · {item.phone}
                              </span>
                            </div>
                          </td>
                          <td data-label="Sede / Bien" className="py-3 px-3">
                            <div className="text-right sm:text-left max-w-[230px]">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">{item.branchName}</span>
                              <span className="text-[11px] text-zinc-500 truncate block">
                                {item.goodType.toUpperCase()} · S/ {item.claimedAmount.toFixed(2)} — {item.goodDescription}
                              </span>
                            </div>
                          </td>
                          <td data-label="Tipo" className="py-3 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                item.claimType === 'reclamo'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                              }`}
                            >
                              {item.claimType}
                            </span>
                          </td>
                          <td data-label="Estado" className="py-3 px-3">
                            {item.status === 'pendiente' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-3 w-3" /> Pendiente
                              </span>
                            )}
                            {item.status === 'en_proceso' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300">
                                <Clock className="h-3 w-3" /> En Proceso
                              </span>
                            )}
                            {item.status === 'atendido' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" /> Atendido
                              </span>
                            )}
                          </td>
                          <td data-label="Acciones" className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedComplaint(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
                              >
                                <Eye className="h-3.5 w-3.5" /> Ver Hoja
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmDeleteComplaint(item)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Archivar registro"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Pasarela Culqi Checkout v4 */}
        {activeSubTab === 'culqi' && (
          <div className="saas-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-black text-zinc-950 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  Integración Pasarela Culqi Checkout v4 (Tarjetas & Yape)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Configura tu llave pública (`pk_test_...` o `pk_live_...`) para procesar pagos online en el Checkout de la Tienda Virtual.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateCompanyInfo({
                    culqiConfig: {
                      ...(companyInfo.culqiConfig || {
                        enabled: true,
                        environment: 'test',
                        publicKey: 'pk_test_demo_khalessi_v4',
                        yapeEnabled: true,
                        billeteraEnabled: true,
                        allowCashFallback: true,
                      }),
                      enabled: !(companyInfo.culqiConfig?.enabled ?? true),
                    },
                  })
                }
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 ${
                  companyInfo.culqiConfig?.enabled ?? true
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {(companyInfo.culqiConfig?.enabled ?? true) ? 'Culqi Activo en Tienda' : 'Pasarela Desactivada'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Entorno de Operación
                </label>
                <select
                  value={companyInfo.culqiConfig?.environment || 'test'}
                  onChange={e =>
                    updateCompanyInfo({
                      culqiConfig: {
                        ...(companyInfo.culqiConfig!),
                        environment: e.target.value as 'test' | 'live',
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-bold"
                >
                  <option value="test">Integración / Pruebas (Sandbox pk_test_)</option>
                  <option value="live">Producción Real (pk_live_)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Llave Pública Culqi (Public Key)
                </label>
                <input
                  type="text"
                  value={companyInfo.culqiConfig?.publicKey || ''}
                  onChange={e =>
                    updateCompanyInfo({
                      culqiConfig: {
                        ...(companyInfo.culqiConfig!),
                        publicKey: e.target.value,
                      },
                    })
                  }
                  placeholder="pk_test_xxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Endpoint Backend para Cargos Automáticos (Opcional — API /api/culqi/charge)
                </label>
                <input
                  type="url"
                  value={companyInfo.culqiConfig?.backendChargeEndpoint || ''}
                  onChange={e =>
                    updateCompanyInfo({
                      culqiConfig: {
                        ...(companyInfo.culqiConfig!),
                        backendChargeEndpoint: e.target.value,
                      },
                    })
                  }
                  placeholder="https://api.tudominio.com/culqi/charge (Déjalo vacío en modo demostración)"
                  className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl saas-subcard cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={companyInfo.culqiConfig?.yapeEnabled ?? true}
                  onChange={e =>
                    updateCompanyInfo({
                      culqiConfig: {
                        ...(companyInfo.culqiConfig!),
                        yapeEnabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded accent-emerald-500"
                />
                <span>Habilitar Yape en Culqi</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl saas-subcard cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={companyInfo.culqiConfig?.billeteraEnabled ?? true}
                  onChange={e =>
                    updateCompanyInfo({
                      culqiConfig: {
                        ...(companyInfo.culqiConfig!),
                        billeteraEnabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded accent-emerald-500"
                />
                <span>Habilitar Plin / Billeteras</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl saas-subcard cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={companyInfo.culqiConfig?.allowCashFallback ?? true}
                  onChange={e =>
                    updateCompanyInfo({
                      culqiConfig: {
                        ...(companyInfo.culqiConfig!),
                        allowCashFallback: e.target.checked,
                      },
                    })
                  }
                  className="rounded accent-emerald-500"
                />
                <span>Permitir Contraentrega Efectivo</span>
              </label>
            </div>
          </div>
        )}
      </PermissionGate>

      {/* Native <dialog> for Viewing & Responding to Hoja de Reclamación Virtual */}
      <dialog
        ref={complaintDialogRef}
        aria-labelledby={complaintDialogTitleId}
        onClose={() => {
          if (complaintDialogRef.current) complaintDialogRef.current.returnValue = '';
          setSelectedComplaint(null);
        }}
        className="max-w-2xl"
      >
        {selectedComplaint && (
          <form
            onSubmit={handleSaveComplaintResponse}
            className="saas-card !rounded-3xl p-6 space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-700 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  INDECOPI • LEY N° 29571 • HOJA DE RECLAMACIÓN VIRTUAL
                </span>
                <h2 id={complaintDialogTitleId} className="text-lg font-black text-zinc-950 dark:text-white mt-0.5">
                  Expediente {selectedComplaint.ticketCode} — {selectedComplaint.claimType.toUpperCase()}
                </h2>
                <p className="text-xs text-zinc-500">
                  Registrado el {new Date(selectedComplaint.createdAt).toLocaleString('es-PE')} · Establecimiento: {selectedComplaint.branchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                aria-label="Cerrar hoja de reclamación"
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 1. Consumer Data */}
            <div className="p-4 saas-subcard space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 text-[11px]">
                1. Identificación del Consumidor Reclamante
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
                <div><strong>Nombre:</strong> {selectedComplaint.consumerName}</div>
                <div><strong>Documento:</strong> {selectedComplaint.documentType} {selectedComplaint.documentNumber}</div>
                <div><strong>Teléfono:</strong> {selectedComplaint.phone}</div>
                <div><strong>Email:</strong> {selectedComplaint.email}</div>
                <div className="sm:col-span-2"><strong>Domicilio:</strong> {selectedComplaint.address}</div>
                {selectedComplaint.isMinor && (
                  <div className="sm:col-span-2 text-amber-600 dark:text-amber-400">
                    <strong>Menor de Edad — Padre/Apoderado:</strong> {selectedComplaint.guardianName || 'No especificado'}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Contracted Good */}
            <div className="p-4 saas-subcard space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 text-[11px]">
                2. Identificación del Bien Contratado
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-zinc-600 dark:text-zinc-300">
                <div><strong>Tipo:</strong> {selectedComplaint.goodType.toUpperCase()}</div>
                <div><strong>Monto Reclamado:</strong> S/ {selectedComplaint.claimedAmount.toFixed(2)}</div>
                <div><strong>Orden Ref.:</strong> {selectedComplaint.orderReference || 'Sin código'}</div>
                <div className="sm:col-span-3"><strong>Descripción:</strong> {selectedComplaint.goodDescription}</div>
              </div>
            </div>

            {/* 3. Claim Detail */}
            <div className="p-4 saas-subcard space-y-2.5 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 text-[11px]">
                3. Detalle de la Reclamación y Pedido del Consumidor
              </h4>
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 block">Detalle ({selectedComplaint.claimType.toUpperCase()}):</span>
                <p className="text-zinc-800 dark:text-zinc-100 mt-0.5 whitespace-pre-line">{selectedComplaint.detail}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 block">Pedido Concreto del Consumidor:</span>
                <p className="text-zinc-800 dark:text-zinc-100 mt-0.5 whitespace-pre-line">{selectedComplaint.consumerRequest}</p>
              </div>
            </div>

            {/* 4. Provider Actions & Response */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cmp-status-select" className="block text-xs font-bold text-zinc-700 dark:text-zinc-200 mb-1">
                    Estado del Expediente
                  </label>
                  <select
                    id="cmp-status-select"
                    value={statusDraft}
                    onChange={e => setStatusDraft(e.target.value as ComplaintStatus)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold saas-input"
                  >
                    <option value="pendiente">Pendiente de Revisión</option>
                    <option value="en_proceso">En Evaluación / Proceso</option>
                    <option value="atendido">Atendido / Resuelto</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Proveedor: <strong>{companyInfo.legalName}</strong> (RUC {companyInfo.taxId})
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="cmp-admin-response" className="block text-xs font-bold text-zinc-700 dark:text-zinc-200 mb-1">
                  Observaciones y Acciones Adoptadas por el Proveedor
                </label>
                <textarea
                  id="cmp-admin-response"
                  rows={3}
                  value={responseDraft}
                  onChange={e => setResponseDraft(e.target.value)}
                  placeholder="Describe la solución brindada al consumidor, nota de crédito o medidas correctivas adoptadas..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm saas-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Guardar Estado y Respuesta
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
};
