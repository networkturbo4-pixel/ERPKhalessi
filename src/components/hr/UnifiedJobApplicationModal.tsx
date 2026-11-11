import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { useHR } from '../../context/HRContext';
import { useSettings } from '../../context/SettingsContext';
import {
  Briefcase,
  CheckCircle2,
  QrCode,
  Send,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';

interface UnifiedJobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShowQr?: boolean;
}

export const UnifiedJobApplicationModal: React.FC<UnifiedJobApplicationModalProps> = ({
  isOpen,
  onClose,
  initialShowQr = false,
}) => {
  const { jobPostings, submitJobApplication } = useHR();
  const { tenants, activeTenant, companyInfo, customization, dispatchToast } = useSettings();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const activePostings = useMemo(
    () => jobPostings.filter(p => p.isActive),
    [jobPostings]
  );

  const [selectedPostingId, setSelectedPostingId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>(activeTenant.id);
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<'DNI' | 'CE' | 'Pasaporte'>('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [districtOrAddress, setDistrictOrAddress] = useState('');
  const [availability, setAvailability] = useState('Inmediata');
  const [cvLinkOrSummary, setCvLinkOrSummary] = useState('');
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const [showQrPanel, setShowQrPanel] = useState(initialShowQr);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  useEffect(() => {
    setShowQrPanel(initialShowQr);
  }, [initialShowQr, isOpen]);

  useEffect(() => {
    if (activePostings.length > 0 && !activePostings.some(p => p.id === selectedPostingId)) {
      setSelectedPostingId(activePostings[0].id);
    }
  }, [activePostings, selectedPostingId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const selectedPosting = useMemo(
    () => activePostings.find(p => p.id === selectedPostingId) || activePostings[0],
    [activePostings, selectedPostingId]
  );

  // Initialize default select options when position changes
  useEffect(() => {
    if (!selectedPosting) return;
    setDynamicValues(prev => {
      const next = { ...prev };
      selectedPosting.fields.forEach(f => {
        if (next[f.id] === undefined) {
          if (f.type === 'select' && f.options && f.options.length > 0) {
            next[f.id] = f.options[0];
          } else if (f.type === 'checkbox') {
            next[f.id] = 'No';
          } else {
            next[f.id] = '';
          }
        }
      });
      return next;
    });
  }, [selectedPosting]);

  const portalApplyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?postular=1`
      : 'https://pizzakhalessi.com/?postular=1';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    portalApplyUrl
  )}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosting) {
      dispatchToast('Sin Vacantes Activas', 'Actualmente no hay puestos habilitados para postulación.', 'warning');
      return;
    }

    if (!fullName.trim() || !documentNumber.trim() || !phone.trim() || !email.trim()) {
      dispatchToast('Datos Incompletos', 'Completa tus datos personales de contacto para continuar.', 'warning');
      return;
    }

    // Validate required custom fields of the selected job position
    for (const field of selectedPosting.fields) {
      const val = (dynamicValues[field.id] || '').trim();
      if (field.required && field.type !== 'checkbox' && !val) {
        dispatchToast('Campo Requerido', `Por favor responde: "${field.label}"`, 'warning');
        return;
      }
    }

    const chosenBranch = tenants.find(t => t.id === branchId) || activeTenant;
    const answers = selectedPosting.fields.map(field => ({
      fieldId: field.id,
      label: field.label,
      value:
        field.type === 'checkbox'
          ? dynamicValues[field.id] === 'Sí'
            ? 'Sí'
            : 'No'
          : (dynamicValues[field.id] || '').trim() || 'No especificado',
    }));

    const created = submitJobApplication({
      postingId: selectedPosting.id,
      positionTitle: selectedPosting.positionTitle,
      branchId: chosenBranch.id,
      branchName: chosenBranch.name.replace('Khalessi Pizza - ', ''),
      fullName: fullName.trim(),
      documentType,
      documentNumber: documentNumber.trim(),
      phone: phone.trim(),
      email: email.trim(),
      districtOrAddress: districtOrAddress.trim(),
      availability: availability.trim(),
      cvLinkOrSummary: cvLinkOrSummary.trim(),
      answers,
    });

    setSubmittedCode(created.applicationCode);
    dispatchToast(
      '¡Postulación Recibida!',
      `Tu expediente ${created.applicationCode} para ${selectedPosting.positionTitle} fue enviado a RR.HH.`,
      'success'
    );
  };

  const resetAndClose = () => {
    setSubmittedCode(null);
    setFullName('');
    setDocumentNumber('');
    setPhone('');
    setEmail('');
    setDistrictOrAddress('');
    setCvLinkOrSummary('');
    setDynamicValues({});
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = '';
        onClose();
      }}
      className="max-w-2xl"
    >
      {isOpen && (
        <div className="w-full rounded-3xl bg-white dark:bg-[#141418] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-950 text-white flex items-center justify-between gap-3 shrink-0 border-b border-emerald-500/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                  BOLSA DE TRABAJO OFICIAL • {companyInfo.commercialName}
                </span>
                <h2 id={titleId} className="text-base sm:text-lg font-black truncate">
                  ¡Trabaja con Nosotros! — Formulario Único de Postulación
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowQrPanel(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                  showQrPanel
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                    : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>{showQrPanel ? 'Ver Formulario' : 'Código QR'}</span>
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                aria-label="Cerrar ventana de postulación"
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {submittedCode ? (
              <div className="py-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    ¡Postulación Registrada en Recursos Humanos!
                  </span>
                  <h3 className="text-2xl font-black text-zinc-950 dark:text-white">
                    Código {submittedCode}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                    Gracias por postular al puesto de <strong>{selectedPosting?.positionTitle}</strong>. Nuestro equipo de Selección revisará tu ficha y se comunicará contigo vía WhatsApp o llamada.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md whitespace-nowrap shrink-0"
                    style={{ backgroundColor: customization.primaryColor }}
                  >
                    Finalizar y Volver a la Tienda
                  </button>
                </div>
              </div>
            ) : showQrPanel ? (
              <div className="py-4 text-center space-y-4">
                <div className="inline-flex p-4 bg-white rounded-3xl border-2 border-emerald-500/30 shadow-xl">
                  <img
                    src={qrImageUrl}
                    alt="QR Bolsa de Trabajo"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Escanea el QR desde tu celular para postular
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Comparte este código en mostrador o redes sociales. Dirige directamente al formulario unificado con todas las vacantes activas de {companyInfo.commercialName}.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 pt-1 break-all">
                    {portalApplyUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrPanel(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white whitespace-nowrap shrink-0"
                >
                  Completar Formulario Aquí Mismo
                </button>
              </div>
            ) : activePostings.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 space-y-2">
                <Briefcase className="h-10 w-10 mx-auto opacity-40" />
                <p className="text-sm font-bold">No hay convocatorias abiertas en este momento</p>
                <p className="text-xs">Vuelve pronto para conocer nuevas vacantes en nuestras sedes.</p>
              </div>
            ) : (
              <form id="unified-job-form" onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Position Selector */}
                <fieldset className="space-y-2.5">
                  <legend className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    1. Elige el Puesto al que deseas postular ({activePostings.length} disponibles)
                  </legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activePostings.map(post => {
                      const isSelected = selectedPosting?.id === post.id;
                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setSelectedPostingId(post.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white">
                              {post.positionTitle}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                              {post.department}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {post.description}
                          </p>
                          {post.salaryRange && (
                            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 block">
                              {post.salaryRange} · {post.modality}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* 2. General Candidate Info */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    2. Tus Datos Personales y Sede Preferida
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label htmlFor="job-fullname" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Nombres y Apellidos Completos *
                      </label>
                      <div className="relative">
                        <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          id="job-fullname"
                          name="fullName"
                          type="text"
                          required
                          autoComplete="name"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="Ej: Rodrigo Quispe Mendoza"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="job-doc-num" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Documento de Identidad *
                      </label>
                      <div className="flex gap-1.5">
                        <select
                          aria-label="Tipo de documento"
                          value={documentType}
                          onChange={e => setDocumentType(e.target.value as 'DNI' | 'CE' | 'Pasaporte')}
                          className="px-2.5 py-2.5 rounded-xl saas-input text-xs font-bold shrink-0"
                        >
                          <option value="DNI">DNI</option>
                          <option value="CE">CE</option>
                          <option value="Pasaporte">Pasap.</option>
                        </select>
                        <input
                          id="job-doc-num"
                          name="documentNumber"
                          type="text"
                          inputMode="numeric"
                          autoCorrect="off"
                          required
                          value={documentNumber}
                          onChange={e => setDocumentNumber(e.target.value)}
                          placeholder="72849102"
                          className="w-full px-3 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="job-phone" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Celular / WhatsApp *
                      </label>
                      <div className="relative">
                        <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          id="job-phone"
                          name="phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+51 987 654 321"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="job-email" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Correo Electrónico *
                      </label>
                      <div className="relative">
                        <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          id="job-email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          autoCorrect="off"
                          autoCapitalize="none"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="tucorreo@ejemplo.com"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="job-branch" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Sucursal de Preferencia *
                      </label>
                      <select
                        id="job-branch"
                        name="branchId"
                        value={branchId}
                        onChange={e => setBranchId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-medium"
                      >
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="job-district" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Distrito de Residencia
                      </label>
                      <div className="relative">
                        <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          id="job-district"
                          name="district"
                          type="text"
                          value={districtOrAddress}
                          onChange={e => setDistrictOrAddress(e.target.value)}
                          placeholder="Ej: Surco, Chorrillos, Miraflores"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="job-cv" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Enlace a CV (Google Drive / LinkedIn) — Opcional
                      </label>
                      <div className="relative">
                        <FileText className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          id="job-cv"
                          name="cvLink"
                          type="text"
                          autoCorrect="off"
                          value={cvLinkOrSummary}
                          onChange={e => setCvLinkOrSummary(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Dynamic Position-Specific Questions from HR Form Builder */}
                {selectedPosting && selectedPosting.fields.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        3. Preguntas Específicas — {selectedPosting.positionTitle}
                      </h3>
                      <span className="text-[10px] font-semibold text-zinc-500">
                        Disponibilidad:
                        <select
                          aria-label="Disponibilidad"
                          value={availability}
                          onChange={e => setAvailability(e.target.value)}
                          className="ml-1 bg-transparent font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none"
                        >
                          <option value="Inmediata">Inmediata</option>
                          <option value="En 1 semana">En 1 semana</option>
                          <option value="Fines de semana">Fines de semana</option>
                        </select>
                      </span>
                    </div>

                    <div className="space-y-3">
                      {selectedPosting.fields.map(field => {
                        const inputId = `dyn-${field.id}`;
                        const val = dynamicValues[field.id] ?? '';

                        if (field.type === 'checkbox') {
                          return (
                            <div key={field.id} className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                              <div className="flex items-center gap-2.5">
                                <input
                                  id={inputId}
                                  name={field.id}
                                  type="checkbox"
                                  checked={val === 'Sí'}
                                  onChange={e =>
                                    setDynamicValues(prev => ({
                                      ...prev,
                                      [field.id]: e.target.checked ? 'Sí' : 'No',
                                    }))
                                  }
                                  className="h-4 w-4 rounded accent-emerald-600"
                                />
                                <label htmlFor={inputId} className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                                  {field.label}
                                </label>
                              </div>
                              {field.helperText && (
                                <p className="text-[11px] text-zinc-500 mt-1 pl-6">{field.helperText}</p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={field.id}>
                            <label htmlFor={inputId} className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                              {field.label} {field.required && <span className="text-rose-500">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                              <textarea
                                id={inputId}
                                name={field.id}
                                rows={2}
                                required={field.required}
                                value={val}
                                onChange={e =>
                                  setDynamicValues(prev => ({ ...prev, [field.id]: e.target.value }))
                                }
                                placeholder={field.placeholder || 'Escribe tu respuesta aquí...'}
                                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
                              />
                            ) : field.type === 'select' ? (
                              <select
                                id={inputId}
                                name={field.id}
                                required={field.required}
                                value={val}
                                onChange={e =>
                                  setDynamicValues(prev => ({ ...prev, [field.id]: e.target.value }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-medium"
                              >
                                {(field.options || []).map(opt => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                id={inputId}
                                name={field.id}
                                type={field.type}
                                required={field.required}
                                value={val}
                                onChange={e =>
                                  setDynamicValues(prev => ({ ...prev, [field.id]: e.target.value }))
                                }
                                placeholder={field.placeholder || ''}
                                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
                              />
                            )}
                            {field.helperText && (
                              <span className="text-[11px] text-zinc-500 mt-0.5 block">{field.helperText}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Footer Actions (SINGLE_LINE_MODAL_ACTIONS compliant) */}
          {!submittedCode && !showQrPanel && activePostings.length > 0 && (
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-zinc-500 hidden sm:inline">
                Tus datos son tratados confidencialmente por RR.HH. de {companyInfo.commercialName}.
              </span>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="unified-job-form"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all whitespace-nowrap shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Enviar Postulación</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
};
