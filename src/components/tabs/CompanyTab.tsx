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
  EyeOff,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Globe,
  Copy,
  Check,
  Info,
  Layers,
  Power,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const CompanyTab: React.FC = () => {
  const {
    companyInfo,
    updateCompanyInfo,
    complaints,
    addComplaint,
    updateComplaintStatus,
    deleteComplaint,
    openNoticeModal,
    saveAllSettings,
    isSaving,
    customization,
    activeTenant,
    tenants,
    branchScope,
    dispatchToast,
  } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState<'legal' | 'payments' | 'complaints'>('legal');
  const [complaintFilter, setComplaintFilter] = useState<'all' | ComplaintStatus>('all');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
  const [responseDraft, setResponseDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<ComplaintStatus>('pendiente');

  // New Complaint Dialog State
  const [isAddingComplaint, setIsAddingComplaint] = useState(false);
  const [newConsumerName, setNewConsumerName] = useState('');
  const [newDocType, setNewDocType] = useState<'DNI' | 'CE' | 'RUC' | 'Pasaporte'>('DNI');
  const [newDocNum, setNewDocNum] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newBranchId, setNewBranchId] = useState(activeTenant.id);
  const [newGoodType, setNewGoodType] = useState<'producto' | 'servicio'>('producto');
  const [newGoodDesc, setNewGoodDesc] = useState('');
  const [newClaimAmount, setNewClaimAmount] = useState('0');
  const [newClaimType, setNewClaimType] = useState<'reclamo' | 'queja'>('reclamo');
  const [newDetail, setNewDetail] = useState('');
  const [newRequest, setNewRequest] = useState('');

  // Culqi Show/Hide Password & Copy Webhook states
  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const complaintDialogRef = useRef<HTMLDialogElement>(null);
  const complaintDialogTitleId = useId();
  const addComplaintDialogRef = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    const dialog = addComplaintDialogRef.current;
    if (!dialog) return;
    if (isAddingComplaint) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isAddingComplaint]);

  const handleUpdateSocial = (key: keyof SocialLinks, value: string) => {
    updateCompanyInfo({
      socialLinks: {
        ...(companyInfo.socialLinks || {}),
        [key]: value,
      },
    });
  };

  const handleAddBank = () => {
    const currentList = Array.isArray(companyInfo.bankAccounts) ? companyInfo.bankAccounts : [];
    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: 'Banco de Crédito del Perú (BCP)',
      accountType: 'corriente',
      accountNumber: '',
      cci: '',
      currency: 'PEN (S/)',
      holderName: companyInfo.legalName || 'KHALESSI PIZZA FOODS S.A.C.',
    };
    const next = [...currentList, newBank];
    updateCompanyInfo({ bankAccounts: next });
    dispatchToast('Cuenta Agregada', 'Se añadió una nueva cuenta bancaria. Completa los números de cuenta.', 'success');
  };

  const handleUpdateBank = (id: string, partial: Partial<BankAccount>) => {
    const currentList = Array.isArray(companyInfo.bankAccounts) ? companyInfo.bankAccounts : [];
    const updated = currentList.map(b => (b.id === id ? { ...b, ...partial } : b));
    updateCompanyInfo({ bankAccounts: updated });
  };

  const handleDeleteBank = (id: string) => {
    const currentList = Array.isArray(companyInfo.bankAccounts) ? companyInfo.bankAccounts : [];
    const updated = currentList.filter(b => b.id !== id);
    updateCompanyInfo({ bankAccounts: updated });
    dispatchToast('Cuenta Eliminada', 'La cuenta bancaria fue removida exitosamente.', 'info');
  };

  const handleAddWallet = () => {
    const currentList = Array.isArray(companyInfo.wallets) ? companyInfo.wallets : [];
    const newWallet: DigitalWallet = {
      id: `wallet-${Date.now()}`,
      provider: 'yape',
      holderName: companyInfo.commercialName || 'Khalessi Pizza',
      phone: '999 888 777',
      qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=YAPE-KHALESSI-PIZZA',
    };
    const next = [...currentList, newWallet];
    updateCompanyInfo({ wallets: next });
    dispatchToast('Billetera Agregada', 'Nueva billetera registrada. Puedes subir la imagen del QR.', 'success');
  };

  const handleUpdateWallet = (id: string, partial: Partial<DigitalWallet>) => {
    const currentList = Array.isArray(companyInfo.wallets) ? companyInfo.wallets : [];
    const updated = currentList.map(w => (w.id === id ? { ...w, ...partial } : w));
    updateCompanyInfo({ wallets: updated });
  };

  const handleDeleteWallet = (id: string) => {
    const currentList = Array.isArray(companyInfo.wallets) ? companyInfo.wallets : [];
    const updated = currentList.filter(w => w.id !== id);
    updateCompanyInfo({ wallets: updated });
    dispatchToast('Billetera Eliminada', 'La billetera móvil fue removida.', 'info');
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>, walletId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) {
          handleUpdateWallet(walletId, { qrImageUrl: event.target.result as string });
          dispatchToast('Código QR Actualizado', 'Imagen QR cargada correctamente.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateManualComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsumerName.trim() || !newDocNum.trim() || !newDetail.trim()) {
      dispatchToast('Campos requeridos', 'Por favor completa el nombre, documento y detalle.', 'warning');
      return;
    }
    const branch = tenants.find(t => t.id === newBranchId) || activeTenant;
    const created = addComplaint({
      consumerName: newConsumerName.trim(),
      documentType: newDocType,
      documentNumber: newDocNum.trim(),
      phone: newPhone.trim() || 'No especificado',
      email: newEmail.trim() || 'No especificado',
      address: newAddress.trim() || 'No especificado',
      branchId: branch.id,
      branchName: branch.name,
      goodType: newGoodType,
      goodDescription: newGoodDesc.trim() || 'Consumo en tienda o pedido online',
      claimedAmount: parseFloat(newClaimAmount) || 0,
      claimType: newClaimType,
      detail: newDetail.trim(),
      consumerRequest: newRequest.trim() || 'Atención y solución conforme a ley',
      isMinor: false,
    });
    setIsAddingComplaint(false);
    // Reset form
    setNewConsumerName('');
    setNewDocNum('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewGoodDesc('');
    setNewClaimAmount('0');
    setNewDetail('');
    setNewRequest('');
    dispatchToast('Hoja Registrada', `Se creó el registro ${created.ticketCode} exitosamente.`, 'success');
  };

  const handleCopyWebhookUrl = () => {
    const webhookUrl =
      companyInfo.culqiConfig?.webhookUrl ||
      `${typeof window !== 'undefined' ? window.location.origin : 'https://pizzakhalessi.com'}/api/culqi/webhook`;
    navigator.clipboard?.writeText(webhookUrl);
    setCopiedWebhook(true);
    dispatchToast('URL Copiada', 'Endpoint del Webhook copiado al portapapeles.', 'info');
    setTimeout(() => setCopiedWebhook(false), 2500);
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
            onClick={() => setActiveSubTab('payments')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'payments'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              2. Métodos de Pago ({(companyInfo.bankAccounts || []).length + (companyInfo.wallets || []).length})
            </span>
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
            <span>3. Libro de Reclamaciones ({complaints.length})</span>
            {pendingComplaintsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-zinc-950">
                {pendingComplaintsCount} pend.
              </span>
            )}
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

        {/* Tab 2: Métodos de Pago Unificados */}
        {activeSubTab === 'payments' && (
          <div className="space-y-6">
            {/* Checkout Activation Matrix */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-100">
                    Métodos de Pago Activos en el Checkout Web
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Define qué opciones verá el cliente al finalizar su pedido en la tienda virtual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveAllSettings}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0 hover:opacity-95"
                  style={{ backgroundColor: customization.primaryColor }}
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? 'Guardando...' : 'Guardar Métodos'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Pasarela Culqi */}
                <label className="p-4 rounded-2xl saas-subcard flex items-start justify-between gap-3 cursor-pointer">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                      Pasarela Culqi
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-snug">
                      Tarjetas de crédito/débito y PagoEfectivo online.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={
                      companyInfo.checkoutPaymentMethods?.culqiEnabled ??
                      companyInfo.culqiConfig?.enabled ??
                      true
                    }
                    onChange={e =>
                      updateCompanyInfo({
                        checkoutPaymentMethods: {
                          ...(companyInfo.checkoutPaymentMethods || {}),
                          culqiEnabled: e.target.checked,
                        },
                        culqiConfig: {
                          ...(companyInfo.culqiConfig!),
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded accent-rose-600 shrink-0"
                  />
                </label>

                {/* 2. Billeteras Digitales y QR */}
                <label
                  className={`p-4 rounded-2xl saas-subcard flex items-start justify-between gap-3 ${
                    (companyInfo.wallets || []).length === 0 ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                      Billeteras / QR
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-snug">
                      {(companyInfo.wallets || []).length === 0
                        ? 'Agrega al menos 1 billetera abajo para mostrarla.'
                        : `Yape / Plin con QR (${(companyInfo.wallets || []).length} configuradas).`}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={(companyInfo.wallets || []).length === 0}
                    checked={
                      (companyInfo.wallets || []).length > 0 &&
                      (companyInfo.checkoutPaymentMethods?.walletsEnabled ?? true)
                    }
                    onChange={e =>
                      updateCompanyInfo({
                        checkoutPaymentMethods: {
                          ...(companyInfo.checkoutPaymentMethods || {}),
                          walletsEnabled: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded accent-purple-600 shrink-0"
                  />
                </label>

                {/* 3. Transferencia Bancaria */}
                <label
                  className={`p-4 rounded-2xl saas-subcard flex items-start justify-between gap-3 ${
                    (companyInfo.bankAccounts || []).length === 0 ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                      Transferencia Bancaria
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-snug">
                      {(companyInfo.bankAccounts || []).length === 0
                        ? 'Agrega al menos 1 cuenta abajo para mostrarla.'
                        : `Cuentas BCP/BBVA/CCI (${(companyInfo.bankAccounts || []).length} cuentas).`}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={(companyInfo.bankAccounts || []).length === 0}
                    checked={
                      (companyInfo.bankAccounts || []).length > 0 &&
                      (companyInfo.checkoutPaymentMethods?.bankTransferEnabled ?? true)
                    }
                    onChange={e =>
                      updateCompanyInfo({
                        checkoutPaymentMethods: {
                          ...(companyInfo.checkoutPaymentMethods || {}),
                          bankTransferEnabled: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded accent-blue-600 shrink-0"
                  />
                </label>

                {/* 4. Efectivo Contraentrega */}
                <label className="p-4 rounded-2xl saas-subcard flex items-start justify-between gap-3 cursor-pointer">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                      Efectivo Contraentrega
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-snug">
                      Pago en efectivo o POS al recibir el pedido.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={
                      companyInfo.checkoutPaymentMethods?.cashEnabled ??
                      companyInfo.culqiConfig?.allowCashFallback ??
                      true
                    }
                    onChange={e =>
                      updateCompanyInfo({
                        checkoutPaymentMethods: {
                          ...(companyInfo.checkoutPaymentMethods || {}),
                          cashEnabled: e.target.checked,
                        },
                        culqiConfig: {
                          ...(companyInfo.culqiConfig!),
                          allowCashFallback: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded accent-emerald-600 shrink-0"
                  />
                </label>
              </div>
            </div>

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
              {(companyInfo.bankAccounts || []).length === 0 ? (
                <div className="md:col-span-2 py-10 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
                  <CreditCard className="h-8 w-8 mx-auto text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No hay cuentas bancarias registradas aún</p>
                  <button
                    type="button"
                    onClick={handleAddBank}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar Primera Cuenta
                  </button>
                </div>
              ) : (
                (companyInfo.bankAccounts || []).map(bank => (
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
                ))
              )}
            </div>
            </div>

            {/* Digital Wallets & QR */}
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
              {(companyInfo.wallets || []).length === 0 ? (
                <div className="md:col-span-2 py-10 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
                  <QrCode className="h-8 w-8 mx-auto text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No hay billeteras digitales configuradas</p>
                  <button
                    type="button"
                    onClick={handleAddWallet}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar Primera Billetera
                  </button>
                </div>
              ) : (
                (companyInfo.wallets || []).map(wallet => (
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
                ))
              )}
            </div>
          </div>
          </div>
        )}

        {/* Tab 3: Libro de Reclamaciones (INDECOPI Ley N° 29571) */}
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingComplaint(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all whitespace-nowrap shrink-0 hover:opacity-90"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Nueva Hoja de Reclamación
                  </button>
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

        {/* Pasarela Culqi Checkout v4 & API v2 */}
        {activeSubTab === 'payments' && (
          <div className="saas-card p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">
                      Pasarela de Pagos Culqi (Checkout v4 & API v2)
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      Tarjetas · Yape · PagoEfectivo
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Acepta pagos instantáneos con tarjetas de crédito y débito (Visa, Mastercard, Amex, Diners), Yape y billeteras móviles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={saveAllSettings}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0 hover:opacity-95"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? 'Guardando...' : 'Guardar Pasarela'}
              </button>
            </div>

            {/* Information Alert Banner */}
            <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-rose-500 text-white shrink-0 mt-0.5">
                <Info className="h-4 w-4" />
              </div>
              <div className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                <h4 className="font-bold text-zinc-950 dark:text-white">
                  ¿Cómo funciona la integración oficial con Culqi Checkout v4?
                </h4>
                <p>
                  Tu tienda abre el modal oficial seguro de <strong className="text-rose-600 dark:text-rose-400 underline">Culqi Checkout v4</strong> para tokenizar la tarjeta o código Yape del cliente en el navegador y procesar el cargo en tiempo real vía <span className="font-mono text-[11px] bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">https://api.culqi.com/v2/charges</span>. El pedido se registra y envía a cocina únicamente cuando el cargo es aprobado.
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1">
                  <span>🔑 Obtén tus llaves en tu CulqiPanel:</span>
                  <a
                    href="https://panel.culqi.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    panel.culqi.com &gt; Desarrollo &gt; API Keys <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>

            {/* Row 1: Activar Pasarela & Entorno Activo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Activar Pasarela Culqi */}
              <div className="p-4 rounded-2xl saas-subcard flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                    <Power className={`h-4 w-4 ${(companyInfo.culqiConfig?.enabled ?? true) ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`} />
                    Activar Pasarela Culqi
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Habilita los cobros con Culqi en el checkout web de todas tus tiendas.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={companyInfo.culqiConfig?.enabled ?? true}
                    onChange={e =>
                      updateCompanyInfo({
                        checkoutPaymentMethods: {
                          ...(companyInfo.checkoutPaymentMethods || {}),
                          culqiEnabled: e.target.checked,
                        },
                        culqiConfig: {
                          ...(companyInfo.culqiConfig || {
                            enabled: true,
                            environment: 'test',
                            publicKey: 'pk_test_demo_khalessi_v4',
                            yapeEnabled: true,
                            billeteraEnabled: true,
                            allowCashFallback: true,
                          }),
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600" />
                </label>
              </div>

              {/* Box 2: Entorno Activo (Modo) */}
              <div className="p-4 rounded-2xl saas-subcard space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${companyInfo.culqiConfig?.environment === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    Entorno Activo (Modo)
                  </h4>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">
                    {companyInfo.culqiConfig?.environment === 'live' ? 'Producción' : 'Sandbox'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Selecciona si operarás con tarjetas de prueba o cobros reales.
                </p>
                <select
                  value={companyInfo.culqiConfig?.environment || 'test'}
                  onChange={e =>
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
                        environment: e.target.value as 'test' | 'live',
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl saas-input text-xs font-bold"
                >
                  <option value="test">⚡ Modo Prueba / Integración (pk_test_... / sk_test_...)</option>
                  <option value="live">🟢 Modo Producción Real (pk_live_... / sk_live_...)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Multipagos Asíncronos */}
            <div className="p-4 rounded-2xl saas-subcard flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-sky-500" />
                  Habilitar Multipagos Asíncronos (PagoEfectivo / Banca Móvil / Cuotéalo - API Orders)
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Tarjetas y Yape funcionan de inmediato sin activar esta opción. Actívala solo si tu cuenta Culqi tiene habilitada la creación de Órdenes (/v2/orders).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={companyInfo.culqiConfig?.multipayEnabled ?? false}
                  onChange={e =>
                    updateCompanyInfo({
                      culqiConfig: {
                        ...(companyInfo.culqiConfig!),
                        multipayEnabled: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
              </label>
            </div>

            {/* Row 3: Claves de Modo Prueba (Integración / Sandbox) */}
            <div className="p-5 rounded-2xl border-2 border-amber-300/80 dark:border-amber-600/40 bg-amber-50/30 dark:bg-amber-950/15 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Claves de Modo Prueba (Integración / Sandbox)
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/60 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                  Sin dinero real
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                    Llave Pública de Prueba (Public Key) *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.culqiConfig?.testPublicKey || companyInfo.culqiConfig?.publicKey || ''}
                    onChange={e => {
                      const val = e.target.value.trim();
                      updateCompanyInfo({
                        culqiConfig: {
                          ...(companyInfo.culqiConfig!),
                          testPublicKey: val,
                          publicKey: companyInfo.culqiConfig?.environment === 'test' ? val : (companyInfo.culqiConfig?.publicKey || val),
                        },
                      });
                    }}
                    placeholder="pk_test_xxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs font-mono bg-white dark:bg-zinc-900"
                  />
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                    Empieza con pk_test_. Se usa en el navegador para abrir Culqi Checkout v4.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                    Llave Secreta de Prueba (Secret Key) *
                  </label>
                  <div className="relative">
                    <input
                      type={showTestSecret ? 'text' : 'password'}
                      value={companyInfo.culqiConfig?.testSecretKey || companyInfo.culqiConfig?.secretKey || ''}
                      onChange={e =>
                        updateCompanyInfo({
                          culqiConfig: {
                            ...(companyInfo.culqiConfig!),
                            testSecretKey: e.target.value.trim(),
                            secretKey: e.target.value.trim(),
                          },
                        })
                      }
                      placeholder="sk_test_xxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl saas-input text-xs font-mono bg-white dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTestSecret(!showTestSecret)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      aria-label="Ver clave secreta de prueba"
                    >
                      {showTestSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                    Empieza con sk_test_. Se usa en el servidor PHP para procesar cargos.
                  </span>
                </div>
              </div>
            </div>

            {/* Row 4: Claves de Modo Producción (Live) */}
            <div className="p-5 rounded-2xl border-2 border-emerald-300/80 dark:border-emerald-600/40 bg-emerald-50/30 dark:bg-emerald-950/15 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    Claves de Modo Producción (Live)
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/60 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
                  Cobros Reales
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                    Llave Pública de Producción (Public Key) *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.culqiConfig?.livePublicKey || ''}
                    onChange={e => {
                      const val = e.target.value.trim();
                      updateCompanyInfo({
                        culqiConfig: {
                          ...(companyInfo.culqiConfig!),
                          livePublicKey: val,
                          publicKey: companyInfo.culqiConfig?.environment === 'live' ? val : (companyInfo.culqiConfig?.publicKey || val),
                        },
                      });
                    }}
                    placeholder="pk_live_xxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs font-mono bg-white dark:bg-zinc-900"
                  />
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                    Empieza con pk_live_. Abre el Checkout oficial para cobros reales.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                    Llave Secreta de Producción (Secret Key) *
                  </label>
                  <div className="relative">
                    <input
                      type={showLiveSecret ? 'text' : 'password'}
                      value={companyInfo.culqiConfig?.liveSecretKey || ''}
                      onChange={e =>
                        updateCompanyInfo({
                          culqiConfig: {
                            ...(companyInfo.culqiConfig!),
                            liveSecretKey: e.target.value.trim(),
                          },
                        })
                      }
                      placeholder="sk_live_xxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl saas-input text-xs font-mono bg-white dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLiveSecret(!showLiveSecret)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      aria-label="Ver clave secreta de producción"
                    >
                      {showLiveSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                    Empieza con sk_live_. Procesa los cargos reales en tu cuenta Culqi.
                  </span>
                </div>
              </div>
            </div>

            {/* Row 5: Endpoint de Webhook para Culqi */}
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 space-y-2">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span>📡 Endpoint de Webhook para Culqi</span>
              </h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Si utilizas pagos asíncronos (Multipagos / PagoEfectivo), registra esta URL en tu <strong>CulqiPanel &gt; Eventos &gt; Webhooks</strong> con el evento <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">order.status.changed</code> y <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">charge.creation.succeeded</code>:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    companyInfo.culqiConfig?.webhookUrl ||
                    `${typeof window !== 'undefined' ? window.location.origin : 'https://pizzakhalessi.com'}/api/culqi/webhook`
                  }
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs font-mono bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 shrink-0 transition-all whitespace-nowrap"
                >
                  {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedWebhook ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Additional toggles: Yape, Plin & Cash fallback */}
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
                  className="rounded accent-rose-600"
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
                  className="rounded accent-rose-600"
                />
                <span>Habilitar Plin / Billeteras</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl saas-subcard cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={companyInfo.culqiConfig?.allowCashFallback ?? true}
                  onChange={e =>
                    updateCompanyInfo({
                      checkoutPaymentMethods: {
                        ...(companyInfo.checkoutPaymentMethods || {}),
                        cashEnabled: e.target.checked,
                      },
                      culqiConfig: {
                        ...(companyInfo.culqiConfig!),
                        allowCashFallback: e.target.checked,
                      },
                    })
                  }
                  className="rounded accent-rose-600"
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

      {/* Native <dialog> for Registering a New Hoja de Reclamación Virtual */}
      <dialog
        ref={addComplaintDialogRef}
        onClose={() => {
          if (addComplaintDialogRef.current) addComplaintDialogRef.current.returnValue = '';
          setIsAddingComplaint(false);
        }}
        className="max-w-2xl"
      >
        {isAddingComplaint && (
          <form
            onSubmit={handleCreateManualComplaint}
            className="saas-card !rounded-3xl p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-700 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  ADMINISTRACIÓN • LIBRO DE RECLAMACIONES VIRTUAL
                </span>
                <h3 className="text-lg font-black text-zinc-950 dark:text-white mt-0.5">
                  Nueva Hoja de Reclamación / Queja
                </h3>
                <p className="text-xs text-zinc-500">
                  Registra un reclamo recibido presencialmente, por teléfono o correo oficial para seguimiento INDECOPI.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingComplaint(false)}
                aria-label="Cerrar modal de reclamación"
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Consumer details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                1. Datos del Consumidor
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Nombres y Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={newConsumerName}
                    onChange={e => setNewConsumerName(e.target.value)}
                    placeholder="Ej. Rodrigo Mendoza Salazar"
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Tipo y Número de Documento *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newDocType}
                      onChange={e => setNewDocType(e.target.value as any)}
                      className="w-24 px-2 py-2 rounded-xl text-xs saas-input font-bold"
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">C.E.</option>
                      <option value="RUC">RUC</option>
                      <option value="Pasaporte">Pasap.</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={newDocNum}
                      onChange={e => setNewDocNum(e.target.value)}
                      placeholder="Número de documento"
                      className="flex-1 px-3 py-2 rounded-xl text-xs saas-input font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Teléfono Celular / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="Ej. 987 654 321"
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Domicilio del Consumidor
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    placeholder="Av. / Calle / Distrito"
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input"
                  />
                </div>
              </div>
            </div>

            {/* Claim details */}
            <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                2. Detalle del Bien y la Reclamación
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Establecimiento / Sede *
                  </label>
                  <select
                    value={newBranchId}
                    onChange={e => setNewBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input font-semibold"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Tipo de Hoja *
                  </label>
                  <select
                    value={newClaimType}
                    onChange={e => setNewClaimType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input font-bold"
                  >
                    <option value="reclamo">Reclamo (Disconformidad de producto)</option>
                    <option value="queja">Queja (Malestar en la atención)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Monto Reclamado (S/)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={newClaimAmount}
                    onChange={e => setNewClaimAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Descripción del Producto o Servicio Contratado
                  </label>
                  <input
                    type="text"
                    value={newGoodDesc}
                    onChange={e => setNewGoodDesc(e.target.value)}
                    placeholder="Ej. Pizza Familiar Carnívora Napolitana + Bebida"
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Detalle del Reclamo / Queja *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newDetail}
                    onChange={e => setNewDetail(e.target.value)}
                    placeholder="Describe los hechos ocurridos..."
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Pedido Concreto del Consumidor
                  </label>
                  <input
                    type="text"
                    value={newRequest}
                    onChange={e => setNewRequest(e.target.value)}
                    placeholder="Ej. Reposición del producto o devolución"
                    className="w-full px-3 py-2 rounded-xl text-xs saas-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAddingComplaint(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm whitespace-nowrap shrink-0 hover:opacity-95"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Crear Hoja de Reclamación
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
};
