import React, { useState, useRef, useEffect, useId } from 'react';
import { Customer, Order } from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { lookupPersonByDni } from '../../utils/dniLookup';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Compass,
  Receipt,
  Sparkles,
  Loader2,
  Store,
  X,
  MessageCircle,
  IdCard,
} from 'lucide-react';

export const ClientsCRMView: React.FC = () => {
  const { customers, orders, upsertCustomer, deleteCustomer } = useOrderCatalog();
  const { activeTenant, branchScope, tenants, dispatchToast, openNoticeModal } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>(
    branchScope === 'consolidated' ? 'all' : activeTenant.id
  );

  // Sync default filter when global tenant switcher changes
  useEffect(() => {
    setBranchFilter(branchScope === 'consolidated' ? 'all' : activeTenant.id);
  }, [activeTenant.id, branchScope]);

  // Modal state for Create / Edit Customer
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | undefined>(undefined);
  const [dniInput, setDniInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [referenceInput, setReferenceInput] = useState('');
  const [customerTenantId, setCustomerTenantId] = useState(activeTenant.id);
  const [isLookingUpDni, setIsLookingUpDni] = useState(false);

  // History modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  const editorDialogRef = useRef<HTMLDialogElement>(null);
  const historyDialogRef = useRef<HTMLDialogElement>(null);
  const editorTitleId = useId();
  const historyTitleId = useId();

  useEffect(() => {
    const dialog = editorDialogRef.current;
    if (!dialog) return;
    if (isEditorOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isEditorOpen]);

  useEffect(() => {
    const dialog = historyDialogRef.current;
    if (!dialog) return;
    if (historyCustomer) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [historyCustomer]);

  const getCustomerOrders = (customer: Customer): Order[] => {
    return orders.filter(
      (o) =>
        o.customerId === customer.id ||
        (customer.dni && o.customerDni === customer.dni) ||
        (customer.whatsapp && o.customerPhone === customer.whatsapp)
    );
  };

  const getBranchName = (tenantId: string) => {
    const found = tenants.find((t) => t.id === tenantId);
    return found ? found.name.replace('Khalessi Pizza - ', '') : tenantId;
  };

  const filteredCustomers = customers.filter((c) => {
    if (branchFilter !== 'all' && c.tenantId && c.tenantId !== branchFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.dni.includes(q) ||
      c.whatsapp.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  const openNewCustomerModal = () => {
    setEditingCustomerId(undefined);
    setDniInput('');
    setFullNameInput('');
    setEmailInput('');
    setWhatsappInput('');
    setAddressInput('');
    setReferenceInput('');
    setCustomerTenantId(activeTenant.id);
    setIsEditorOpen(true);
  };

  const openEditCustomerModal = (c: Customer) => {
    setEditingCustomerId(c.id);
    setDniInput(c.dni);
    setFullNameInput(c.fullName);
    setEmailInput(c.email);
    setWhatsappInput(c.whatsapp);
    setAddressInput(c.address);
    setReferenceInput(c.reference);
    setCustomerTenantId(c.tenantId || activeTenant.id);
    setIsEditorOpen(true);
  };

  const handleDniSearch = async () => {
    const clean = dniInput.replace(/\D/g, '');
    if (clean.length !== 8) {
      dispatchToast('DNI Inválido', 'Ingresa un número de DNI peruano de 8 dígitos.', 'warning');
      return;
    }
    setIsLookingUpDni(true);
    try {
      const res = await lookupPersonByDni(clean, customers);
      if (res.found) {
        setFullNameInput(res.fullName);
        if (res.email) setEmailInput(res.email);
        if (res.whatsapp) setWhatsappInput(res.whatsapp);
        if (res.address) setAddressInput(res.address);
        if (res.reference) setReferenceInput(res.reference);
        dispatchToast('DNI Encontrado', res.message || `Datos cargados: ${res.fullName}`, 'success');
      } else {
        dispatchToast('Registro Manual', res.message || 'Completa los nombres manualmente.', 'info');
      }
    } finally {
      setIsLookingUpDni(false);
    }
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      dispatchToast('Nombre Requerido', 'Ingresa los nombres y apellidos del cliente.', 'warning');
      return;
    }

    upsertCustomer({
      id: editingCustomerId,
      dni: dniInput,
      fullName: fullNameInput,
      email: emailInput,
      whatsapp: whatsappInput,
      address: addressInput,
      reference: referenceInput,
      tenantId: customerTenantId,
    });
    setIsEditorOpen(false);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    openNoticeModal({
      title: '¿Eliminar Cliente del CRM?',
      message: `Se eliminará la ficha de "${customer.fullName}" de la cartera de clientes junto con todo su historial de pedidos asociados.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Cliente',
      cancelLabel: 'Cancelar',
      onConfirm: () => deleteCustomer(customer.id),
    });
  };

  const verifiedDniCount = filteredCustomers.filter((c) => c.dni.length === 8).length;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-5 touch-surface">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Directorio de Clientes CRM</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Base unificada sincronizada con POS, consulta DNI y Tienda Online.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewCustomerModal}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>Registrar Cliente (DNI / Manual)</span>
        </button>
      </div>

      {/* KPI Strip + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        <div className="lg:col-span-5 grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Total Clientes
            </span>
            <span className="text-xl font-black text-zinc-950 dark:text-white mt-0.5 block">
              {filteredCustomers.length}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Con DNI (8d)
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {verifiedDniCount}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Con Dirección
            </span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
              {filteredCustomers.filter((c) => Boolean(c.address)).length}
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por DNI, nombres, WhatsApp, correo o dirección..."
              aria-label="Buscar cliente"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 px-3 min-h-[44px] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0">
            <Store className="w-4 h-4 text-amber-500 shrink-0" />
            <select
              aria-label="Filtrar por sucursal"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-900 dark:text-white focus:outline-none"
            >
              <option value="all" className="bg-white dark:bg-zinc-900">
                Todas las Sucursales
              </option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-white dark:bg-zinc-900">
                  {t.name.replace('Khalessi Pizza - ', '')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customer Cards Grid (Responsive Touch-Friendly) */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 space-y-2">
          <Users className="w-10 h-10 text-zinc-400 mx-auto" />
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            No se encontraron clientes registrados con este filtro
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Todo cliente registrado en el POS (por DNI o manual) aparece aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const custOrders = getCustomerOrders(customer);
            const totalSpent = custOrders
              .filter((o) => o.status !== 'cancelado')
              .reduce((acc, o) => acc + o.total, 0);
            const waClean = customer.whatsapp.replace(/\D/g, '');
            const waHref = waClean
              ? `https://wa.me/${waClean.startsWith('51') ? waClean : `51${waClean}`}`
              : null;

            return (
              <div
                key={customer.id}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-black text-sm sm:text-base text-zinc-950 dark:text-white truncate">
                        {customer.fullName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {customer.dni ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                            <IdCard className="w-3 h-3" /> DNI {customer.dni}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            Registro Manual
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {getBranchName(customer.tenantId)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                        S/ {totalSpent.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {custOrders.length} {custOrders.length === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 pt-1">
                    {customer.whatsapp && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{customer.whatsapp}</span>
                        </span>
                        {waHref && (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] hover:bg-emerald-500/20"
                          >
                            <MessageCircle className="w-3 h-3" /> Chat
                          </a>
                        )}
                      </div>
                    )}

                    {customer.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}

                    {customer.address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    )}

                    {customer.reference && (
                      <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                        <Compass className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">Ref: {customer.reference}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryCustomer(customer)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-500" />
                    <span>Historial ({custOrders.length})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Editar cliente ${customer.fullName}`}
                      onClick={() => openEditCustomerModal(customer)}
                      className="min-h-[38px] min-w-[38px] p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar cliente ${customer.fullName}`}
                      onClick={() => handleDeleteCustomer(customer)}
                      className="min-h-[38px] min-w-[38px] p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Native <dialog> for Create / Edit Customer with DNI API */}
      <dialog
        ref={editorDialogRef}
        aria-labelledby={editorTitleId}
        onClose={(e) => {
          e.currentTarget.returnValue = '';
          setIsEditorOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
        }}
        className="backdrop:bg-black/70 backdrop:backdrop-blur-sm bg-transparent p-3 sm:p-4 m-auto w-full max-w-lg"
      >
        {isEditorOpen && (
          <form
            onSubmit={handleSaveCustomer}
            className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 id={editorTitleId} className="font-black text-base text-zinc-950 dark:text-white">
                  {editingCustomerId ? 'Editar Ficha de Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Consulta automática por API de DNI o registro manual completo
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* DNI + API Lookup */}
              <div>
                <label
                  htmlFor="crm-dni-input"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  DNI (8 dígitos — Opcional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="crm-dni-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={dniInput}
                    onChange={(e) => setDniInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 45892134"
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={isLookingUpDni}
                    onClick={handleDniSearch}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {isLookingUpDni ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Buscar DNI</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="crm-name-input"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Nombres y Apellidos *
                </label>
                <input
                  id="crm-name-input"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder="Ej: Valeria Gómez Paredes"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="crm-whatsapp-input"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    WhatsApp / Celular
                  </label>
                  <input
                    id="crm-whatsapp-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    placeholder="+51 987 654 321"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="crm-email-input"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Correo Electrónico
                  </label>
                  <input
                    id="crm-email-input"
                    type="email"
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="cliente@correo.com"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="crm-address-input"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Dirección de Entrega
                </label>
                <input
                  id="crm-address-input"
                  type="text"
                  autoComplete="address-line1"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Av. / Calle / Número / Urbanización"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="crm-ref-input"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Referencia de Ubicación
                  </label>
                  <input
                    id="crm-ref-input"
                    type="text"
                    autoComplete="address-line2"
                    value={referenceInput}
                    onChange={(e) => setReferenceInput(e.target.value)}
                    placeholder="Ej: Frente al parque, portón negro"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="crm-branch-select"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Sucursal Principal
                  </label>
                  <select
                    id="crm-branch-select"
                    value={customerTenantId}
                    onChange={(e) => setCustomerTenantId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5 bg-zinc-50 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs sm:text-sm font-black shadow-sm whitespace-nowrap shrink-0"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Native <dialog> for Customer Order History */}
      <dialog
        ref={historyDialogRef}
        aria-labelledby={historyTitleId}
        onClose={(e) => {
          e.currentTarget.returnValue = '';
          setHistoryCustomer(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close('backdrop');
        }}
        className="backdrop:bg-black/70 backdrop:backdrop-blur-sm bg-transparent p-3 sm:p-4 m-auto w-full max-w-lg"
      >
        {historyCustomer && (
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 id={historyTitleId} className="font-black text-base text-zinc-950 dark:text-white">
                  Pedidos de {historyCustomer.fullName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Historial sincronizado entre POS, Cocina y Tienda Online
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar historial"
                onClick={() => setHistoryCustomer(null)}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[65vh] overflow-y-auto space-y-2.5">
              {getCustomerOrders(historyCustomer).length === 0 ? (
                <p className="text-xs text-center text-zinc-500 py-8">
                  Este cliente aún no registra pedidos emitidos.
                </p>
              ) : (
                getCustomerOrders(historyCustomer).map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs sm:text-sm text-zinc-950 dark:text-white">
                        {ord.orderNumber} · {getBranchName(ord.tenantId)}
                      </span>
                      <span className="font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                        S/ {ord.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                      <span>{new Date(ord.createdAt).toLocaleString()}</span>
                      <span className="uppercase font-bold">{ord.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                      {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setHistoryCustomer(null)}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
};
