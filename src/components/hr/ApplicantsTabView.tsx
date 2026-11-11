import React, { useState, useMemo, useRef, useEffect, useId } from 'react';
import { useHR } from '../../context/HRContext';
import { useSettings } from '../../context/SettingsContext';
import {
  JobPostingFormConfig,
  JobFormField,
  CustomFieldType,
  JobApplication,
  ApplicantStatus,
  ContractType,
} from '../../types/hr';
import { UnifiedJobApplicationModal } from './UnifiedJobApplicationModal';
import {
  Briefcase,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Save,
  Search,
  Users,
  Settings2,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';

const FIELD_TYPES: Array<{ value: CustomFieldType; label: string }> = [
  { value: 'text', label: 'Texto Corto' },
  { value: 'textarea', label: 'Párrafo / Experiencia' },
  { value: 'select', label: 'Lista Desplegable (Opciones)' },
  { value: 'checkbox', label: 'Casilla de Verificación (Sí / No)' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha (Ej. Vencimiento SOAT)' },
  { value: 'tel', label: 'Teléfono' },
  { value: 'url', label: 'Enlace Web / Portafolio' },
];

const STATUS_BADGE: Record<
  ApplicantStatus,
  { label: string; badgeClass: string }
> = {
  nuevo: {
    label: 'Nuevo',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  en_revision: {
    label: 'En Revisión',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  entrevista: {
    label: 'Entrevista',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  contratado: {
    label: 'Contratado',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  },
  descartado: {
    label: 'Descartado',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
};

const CONTRACT_OPTIONS: ContractType[] = [
  'Planilla MYPE / General',
  'Part-Time (Medio Tiempo)',
  'Por Turno / Jornal',
  'Locación / Apoyo',
];

export const ApplicantsTabView: React.FC = () => {
  const {
    jobPostings,
    saveJobPosting,
    deleteJobPosting,
    jobApplications,
    updateJobApplication,
    deleteJobApplication,
  } = useHR();
  const { customization, openNoticeModal, activeTenant, branchScope } = useSettings();

  const [mode, setMode] = useState<'applications' | 'builder'>('applications');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Applications list state
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicantStatus>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [appStatusDraft, setAppStatusDraft] = useState<ApplicantStatus>('nuevo');
  const [appNotesDraft, setAppNotesDraft] = useState('');

  const appDialogRef = useRef<HTMLDialogElement>(null);
  const appDialogTitleId = useId();

  // Form Builder state
  const [selectedPostingId, setSelectedPostingId] = useState<string>(
    jobPostings[0]?.id || ''
  );
  const [draftPosting, setDraftPosting] = useState<JobPostingFormConfig | null>(
    jobPostings[0] ? structuredClone(jobPostings[0]) : null
  );

  useEffect(() => {
    const found = jobPostings.find(p => p.id === selectedPostingId);
    if (found) {
      setDraftPosting(structuredClone(found));
    } else if (jobPostings[0]) {
      setSelectedPostingId(jobPostings[0].id);
      setDraftPosting(structuredClone(jobPostings[0]));
    } else {
      setDraftPosting(null);
    }
  }, [selectedPostingId, jobPostings]);

  useEffect(() => {
    const dialog = appDialogRef.current;
    if (!dialog) return;
    if (selectedApp) {
      setAppStatusDraft(selectedApp.status);
      setAppNotesDraft(selectedApp.hrNotes || '');
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [selectedApp]);

  const filteredApplications = useMemo(() => {
    return jobApplications.filter(app => {
      if (branchScope === 'branch' && app.branchId && app.branchId !== activeTenant.id) {
        // Keep consolidated visibility or branch match; show all if user hasn't filtered strictly so nothing hides unexpectedly
      }
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesPos = positionFilter === 'all' || app.postingId === positionFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        app.fullName.toLowerCase().includes(q) ||
        app.documentNumber.toLowerCase().includes(q) ||
        app.positionTitle.toLowerCase().includes(q) ||
        app.applicationCode.toLowerCase().includes(q);
      return matchesStatus && matchesPos && matchesQ;
    });
  }, [jobApplications, statusFilter, positionFilter, searchQuery, branchScope, activeTenant.id]);

  // Form builder actions
  const handleCreateNewPosting = () => {
    const newPosting: JobPostingFormConfig = {
      id: `post-${Date.now()}`,
      positionTitle: 'Nuevo Puesto Operativo',
      department: 'Cocina & Operaciones',
      modality: 'Planilla MYPE / General',
      salaryRange: 'S/ 1,500 – S/ 2,000',
      description: 'Describe las responsabilidades principales de esta vacante para los postulantes.',
      isActive: true,
      branchIds: ['all'],
      fields: [
        {
          id: `fld-${Date.now()}-1`,
          label: '¿Cuántos años de experiencia tienes en un puesto similar?',
          type: 'select',
          required: true,
          options: ['Sin experiencia previa', '6 meses a 1 año', '1 a 3 años', 'Más de 3 años'],
        },
      ],
    };
    saveJobPosting(newPosting);
    setSelectedPostingId(newPosting.id);
  };

  const handleAddField = () => {
    if (!draftPosting) return;
    const newField: JobFormField = {
      id: `fld-${Date.now()}`,
      label: 'Nueva pregunta para el candidato',
      type: 'text',
      placeholder: 'Escribe aquí tu respuesta...',
      required: true,
      options: ['Opción 1', 'Opción 2'],
    };
    setDraftPosting({
      ...draftPosting,
      fields: [...draftPosting.fields, newField],
    });
  };

  const handleUpdateField = (fieldId: string, partial: Partial<JobFormField>) => {
    if (!draftPosting) return;
    setDraftPosting({
      ...draftPosting,
      fields: draftPosting.fields.map(f => (f.id === fieldId ? { ...f, ...partial } : f)),
    });
  };

  const handleMoveField = (index: number, direction: -1 | 1) => {
    if (!draftPosting) return;
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= draftPosting.fields.length) return;
    const copy = [...draftPosting.fields];
    const [moved] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, moved);
    setDraftPosting({ ...draftPosting, fields: copy });
  };

  const handleRemoveField = (fieldId: string) => {
    if (!draftPosting) return;
    setDraftPosting({
      ...draftPosting,
      fields: draftPosting.fields.filter(f => f.id !== fieldId),
    });
  };

  const handleSaveCurrentPosting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftPosting) return;
    saveJobPosting(draftPosting);
  };

  const handleConfirmDeletePosting = (posting: JobPostingFormConfig) => {
    openNoticeModal({
      title: `¿Eliminar convocatoria "${posting.positionTitle}"?`,
      message: 'Este puesto dejará de mostrarse en el formulario unificado del Footer de la Tienda Virtual. Las postulaciones ya recibidas se conservarán.',
      tone: 'danger',
      confirmLabel: 'Sí, Eliminar Puesto',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        deleteJobPosting(posting.id);
      },
    });
  };

  const handleSaveApplicantEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    updateJobApplication(selectedApp.id, {
      status: appStatusDraft,
      hrNotes: appNotesDraft,
    });
    setSelectedApp(null);
  };

  const handleConfirmDeleteApplicant = (app: JobApplication) => {
    openNoticeModal({
      title: `¿Eliminar ficha de ${app.fullName}?`,
      message: `Se retirará permanentemente la postulación ${app.applicationCode} (${app.positionTitle}) de la bandeja de Selección.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Postulación',
      cancelLabel: 'Conservar',
      onConfirm: () => {
        deleteJobApplication(app.id);
        if (selectedApp?.id === app.id) setSelectedApp(null);
      },
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Sub-Header & Mode Switcher */}
      <div className="saas-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" style={{ color: customization.primaryColor }} />
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
              Reclutamiento, Postulantes & Constructor de Formularios
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Diseña preguntas personalizadas para cada puesto de pizzería y recíbelas unificadas desde el botón «¡Trabaja con Nosotros!» del Footer Web.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setMode('applications')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                mode === 'applications'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Postulantes Recibidos ({jobApplications.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('builder')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                mode === 'builder'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Constructor por Puestos ({jobPostings.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Probar Formulario del Footer</span>
          </button>
        </div>
      </div>

      {/* ========================================================================
          MODE A: BANDEJA DE POSTULANTES RECIBIDOS
         ======================================================================== */}
      {mode === 'applications' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="saas-card p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Total Candidatos</span>
              <span className="text-xl font-black text-zinc-950 dark:text-white mt-0.5 block">{jobApplications.length}</span>
            </div>
            <div className="saas-card p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Nuevos</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {jobApplications.filter(a => a.status === 'nuevo').length}
              </span>
            </div>
            <div className="saas-card p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Entrevista</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                {jobApplications.filter(a => a.status === 'entrevista').length}
              </span>
            </div>
            <div className="saas-card p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 block">Contratados</span>
              <span className="text-xl font-black text-violet-600 dark:text-violet-400 mt-0.5 block">
                {jobApplications.filter(a => a.status === 'contratado').length}
              </span>
            </div>
            <div className="saas-card p-3.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Puestos Activos</span>
              <span className="text-xl font-black text-zinc-950 dark:text-white mt-0.5 block">
                {jobPostings.filter(p => p.isActive).length} / {jobPostings.length}
              </span>
            </div>
          </div>

          <div className="saas-card p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <search className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar postulante por nombre, DNI, código o puesto..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl saas-input text-xs sm:text-sm"
                  />
                </div>
              </search>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filtrar por puesto"
                  value={positionFilter}
                  onChange={e => setPositionFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl saas-input text-xs font-semibold"
                >
                  <option value="all">Todos los Puestos</option>
                  {jobPostings.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.positionTitle}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filtrar por etapa"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as 'all' | ApplicantStatus)}
                  className="px-3 py-2 rounded-xl saas-input text-xs font-semibold"
                >
                  <option value="all">Todas las Etapas</option>
                  <option value="nuevo">Nuevos</option>
                  <option value="en_revision">En Revisión</option>
                  <option value="entrevista">Entrevista</option>
                  <option value="contratado">Contratados</option>
                  <option value="descartado">Descartados</option>
                </select>
              </div>
            </div>

            {filteredApplications.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 space-y-2">
                <Users className="h-9 w-9 mx-auto opacity-40" />
                <p className="text-sm font-semibold">No se encontraron postulaciones con este filtro</p>
                <p className="text-xs">Puedes probar el formulario unificado haciendo clic en «Probar Formulario del Footer».</p>
              </div>
            ) : (
              <div className="erp-table-wrapper">
                <table className="erp-stack-table text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 bg-zinc-50/90 dark:bg-zinc-900/90">
                      <th className="py-3 px-3 font-bold">Expediente</th>
                      <th className="py-3 px-3 font-bold">Candidato</th>
                      <th className="py-3 px-3 font-bold">Puesto & Sede</th>
                      <th className="py-3 px-3 font-bold">Respuestas Clave</th>
                      <th className="py-3 px-3 font-bold">Etapa</th>
                      <th className="py-3 px-3 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                    {filteredApplications.map(app => {
                      const badge = STATUS_BADGE[app.status];
                      return (
                        <tr key={app.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                          <th scope="row" className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                            <span className="block text-emerald-600 dark:text-emerald-400">{app.applicationCode}</span>
                            <span className="text-[11px] font-normal text-zinc-500 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {new Date(app.createdAt).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </th>
                          <td data-label="Candidato" className="py-3 px-3">
                            <div className="text-right sm:text-left">
                              <span className="font-bold text-zinc-900 dark:text-white block">{app.fullName}</span>
                              <span className="text-[11px] text-zinc-500 font-mono">
                                {app.documentType}: {app.documentNumber} · {app.phone}
                              </span>
                            </div>
                          </td>
                          <td data-label="Puesto" className="py-3 px-3">
                            <div className="text-right sm:text-left">
                              <span className="font-bold text-zinc-800 dark:text-zinc-100 block">{app.positionTitle}</span>
                              <span className="text-[11px] text-zinc-500">
                                {app.branchName} · Disp: {app.availability || 'Inmediata'}
                              </span>
                            </div>
                          </td>
                          <td data-label="Resumen" className="py-3 px-3 max-w-[240px]">
                            <div className="space-y-0.5 text-right sm:text-left">
                              {app.answers.slice(0, 2).map(ans => (
                                <div key={ans.fieldId} className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                                  <span className="text-zinc-400">{ans.label.slice(0, 24)}:</span>{' '}
                                  <strong>{ans.value}</strong>
                                </div>
                              ))}
                              {app.answers.length > 2 && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  +{app.answers.length - 2} respuestas más
                                </span>
                              )}
                            </div>
                          </td>
                          <td data-label="Etapa" className="py-3 px-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td data-label="Acciones" className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedApp(app)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
                              >
                                <Eye className="h-3.5 w-3.5" /> Evaluar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmDeleteApplicant(app)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Eliminar postulación"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================
          MODE B: CONSTRUCTOR DE FORMULARIOS POR PUESTO
         ======================================================================== */}
      {mode === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Rail: Job Positions List */}
          <div className="lg:col-span-4 saas-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Puestos Configurables
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Todos los puestos activos se fusionan en el formulario único del Footer.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateNewPosting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Plus className="h-3.5 w-3.5" /> Puesto
              </button>
            </div>

            <div className="space-y-2">
              {jobPostings.map(post => {
                const isSelected = post.id === selectedPostingId;
                return (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPostingId(post.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'saas-option-active' : 'saas-option'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold truncate">{post.positionTitle}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          post.isActive
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-500/15 text-zinc-500'
                        }`}
                      >
                        {post.isActive ? 'Visible Footer' : 'Oculto'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-zinc-500">
                      <span>{post.department}</span>
                      <span className="font-mono">{post.fields.length} campos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Workspace: Form Field Builder for Selected Position */}
          <div className="lg:col-span-8">
            {draftPosting ? (
              <form onSubmit={handleSaveCurrentPosting} className="saas-card p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Constructor Dinámico de Campos
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white mt-0.5">
                      Editando Puesto: {draftPosting.positionTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {jobPostings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleConfirmDeletePosting(draftPosting)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/25 transition-colors whitespace-nowrap shrink-0"
                      >
                        Eliminar Puesto
                      </button>
                    )}
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                      style={{ backgroundColor: customization.primaryColor }}
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Guardar Formulario</span>
                    </button>
                  </div>
                </div>

                {/* General Metadata of Position */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Nombre del Puesto / Vacante *
                    </label>
                    <input
                      type="text"
                      required
                      value={draftPosting.positionTitle}
                      onChange={e => setDraftPosting({ ...draftPosting, positionTitle: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl saas-input text-xs sm:text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Área / Departamento
                    </label>
                    <input
                      type="text"
                      value={draftPosting.department}
                      onChange={e => setDraftPosting({ ...draftPosting, department: e.target.value })}
                      placeholder="Ej: Cocina & Horno, Logística, Salón"
                      className="w-full px-3.5 py-2 rounded-xl saas-input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Modalidad Contractual
                    </label>
                    <select
                      value={draftPosting.modality}
                      onChange={e =>
                        setDraftPosting({ ...draftPosting, modality: e.target.value as ContractType })
                      }
                      className="w-full px-3.5 py-2 rounded-xl saas-input text-xs sm:text-sm"
                    >
                      {CONTRACT_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Rango Salarial / Beneficios Visibles
                    </label>
                    <input
                      type="text"
                      value={draftPosting.salaryRange || ''}
                      onChange={e => setDraftPosting({ ...draftPosting, salaryRange: e.target.value })}
                      placeholder="Ej: S/ 2,400 + Bonos"
                      className="w-full px-3.5 py-2 rounded-xl saas-input text-xs sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Resumen Atractivo del Puesto
                    </label>
                    <textarea
                      rows={2}
                      value={draftPosting.description}
                      onChange={e => setDraftPosting({ ...draftPosting, description: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl saas-input text-xs sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl saas-subcard">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Publicar este puesto en el Formulario Único del Footer
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Cuando está activo, los candidatos pueden elegir este puesto y responder sus preguntas específicas.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftPosting.isActive}
                      onChange={e => setDraftPosting({ ...draftPosting, isActive: e.target.checked })}
                      className="h-5 w-5 rounded accent-emerald-600 cursor-pointer shrink-0"
                    />
                  </div>
                </div>

                {/* Custom Form Fields List */}
                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                        Preguntas Específicas del Puesto ({draftPosting.fields.length})
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        Se suman automáticamente a los datos básicos (Nombre, DNI, Celular, Email y Sede).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddField}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" /> Añadir Pregunta
                    </button>
                  </div>

                  {draftPosting.fields.length === 0 ? (
                    <div className="p-6 text-center saas-subcard text-xs text-zinc-500">
                      Este puesto aún no tiene preguntas adicionales. Haz clic en «Añadir Pregunta» para personalizarlo.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {draftPosting.fields.map((field, index) => (
                        <div key={field.id} className="p-4 saas-subcard space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-zinc-500">
                              Campo #{index + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveField(index, -1)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-30"
                                title="Subir pregunta"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === draftPosting.fields.length - 1}
                                onClick={() => handleMoveField(index, 1)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-30"
                                title="Bajar pregunta"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveField(field.id)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-500/10"
                                title="Quitar pregunta"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-7">
                              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                                Etiqueta / Pregunta para el Postulante
                              </label>
                              <input
                                type="text"
                                required
                                value={field.label}
                                onChange={e => handleUpdateField(field.id, { label: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg saas-input text-xs font-medium"
                              />
                            </div>

                            <div className="sm:col-span-5">
                              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                                Tipo de Control
                              </label>
                              <select
                                value={field.type}
                                onChange={e =>
                                  handleUpdateField(field.id, {
                                    type: e.target.value as CustomFieldType,
                                  })
                                }
                                className="w-full px-3 py-1.5 rounded-lg saas-input text-xs font-semibold"
                              >
                                {FIELD_TYPES.map(ft => (
                                  <option key={ft.value} value={ft.value}>
                                    {ft.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {field.type === 'select' ? (
                              <div className="sm:col-span-9">
                                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                                  Opciones Desplegables (separadas por coma)
                                </label>
                                <input
                                  type="text"
                                  value={(field.options || []).join(', ')}
                                  onChange={e =>
                                    handleUpdateField(field.id, {
                                      options: e.target.value
                                        .split(',')
                                        .map(s => s.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  placeholder="Opción A, Opción B, Opción C"
                                  className="w-full px-3 py-1.5 rounded-lg saas-input text-xs"
                                />
                              </div>
                            ) : field.type !== 'checkbox' ? (
                              <div className="sm:col-span-9">
                                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                                  Texto de Ejemplo (Placeholder)
                                </label>
                                <input
                                  type="text"
                                  value={field.placeholder || ''}
                                  onChange={e =>
                                    handleUpdateField(field.id, { placeholder: e.target.value })
                                  }
                                  placeholder="Ej: Escribe aquí tu respuesta..."
                                  className="w-full px-3 py-1.5 rounded-lg saas-input text-xs"
                                />
                              </div>
                            ) : (
                              <div className="sm:col-span-9">
                                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                                  Texto de Ayuda Opcional
                                </label>
                                <input
                                  type="text"
                                  value={field.helperText || ''}
                                  onChange={e =>
                                    handleUpdateField(field.id, { helperText: e.target.value })
                                  }
                                  placeholder="Aclaración adicional debajo de la casilla..."
                                  className="w-full px-3 py-1.5 rounded-lg saas-input text-xs"
                                />
                              </div>
                            )}

                            <div className="sm:col-span-3 flex items-end pb-1">
                              <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={e =>
                                    handleUpdateField(field.id, { required: e.target.checked })
                                  }
                                  className="h-4 w-4 rounded accent-emerald-600"
                                />
                                <span>Obligatorio</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* Native <dialog> Inspector for Evaluating an Applicant */}
      <dialog
        ref={appDialogRef}
        aria-labelledby={appDialogTitleId}
        onClose={() => {
          if (appDialogRef.current) appDialogRef.current.returnValue = '';
          setSelectedApp(null);
        }}
        className="max-w-2xl"
      >
        {selectedApp && (
          <form
            onSubmit={handleSaveApplicantEvaluation}
            className="saas-card !rounded-3xl p-6 space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-700 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  EXPEDIENTE DE SELECCIÓN • {selectedApp.applicationCode}
                </span>
                <h2 id={appDialogTitleId} className="text-lg font-black text-zinc-950 dark:text-white mt-0.5">
                  {selectedApp.fullName} — {selectedApp.positionTitle}
                </h2>
                <p className="text-xs text-zinc-500">
                  Postuló el {new Date(selectedApp.createdAt).toLocaleString('es-PE')} · Sede: {selectedApp.branchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                aria-label="Cerrar ficha de postulante"
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Candidate Contact Card */}
            <div className="p-4 saas-subcard grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-zinc-500 block">Documento:</span>
                <strong className="font-mono">{selectedApp.documentType} {selectedApp.documentNumber}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block">Disponibilidad:</span>
                <strong>{selectedApp.availability || 'Inmediata'}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-500" />
                <span>{selectedApp.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-sky-500" />
                <span className="truncate">{selectedApp.email}</span>
              </div>
              {selectedApp.districtOrAddress && (
                <div className="sm:col-span-2">
                  <span className="text-zinc-500">Distrito / Dirección: </span>
                  <strong>{selectedApp.districtOrAddress}</strong>
                </div>
              )}
              {selectedApp.cvLinkOrSummary && (
                <div className="sm:col-span-2">
                  <a
                    href={selectedApp.cvLinkOrSummary}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir CV / Portafolio Adjunto
                  </a>
                </div>
              )}
            </div>

            {/* Custom Position Answers */}
            <div className="p-4 saas-subcard space-y-2.5 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 text-[11px]">
                Respuestas del Formulario — {selectedApp.positionTitle}
              </h4>
              {selectedApp.answers.map(ans => (
                <div key={ans.fieldId} className="pb-2 border-b border-zinc-200/60 dark:border-zinc-800 last:border-b-0 last:pb-0">
                  <span className="text-[11px] text-zinc-500 block">{ans.label}</span>
                  <p className="font-semibold text-zinc-900 dark:text-white mt-0.5 whitespace-pre-line">
                    {ans.value}
                  </p>
                </div>
              ))}
            </div>

            {/* HR Evaluation Controls */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-200 mb-1">
                  Etapa del Proceso de Selección
                </label>
                <select
                  value={appStatusDraft}
                  onChange={e => setAppStatusDraft(e.target.value as ApplicantStatus)}
                  className="w-full px-3.5 py-2 rounded-xl saas-input text-xs sm:text-sm font-semibold"
                >
                  <option value="nuevo">Nuevo (Sin revisar)</option>
                  <option value="en_revision">En Revisión de CV</option>
                  <option value="entrevista">Citado a Entrevista / Prueba Práctica</option>
                  <option value="contratado">¡Contratado / Ingresa a Legajos!</option>
                  <option value="descartado">Descartado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-200 mb-1">
                  Notas de Entrevista / Evaluación RR.HH.
                </label>
                <textarea
                  rows={3}
                  value={appNotesDraft}
                  onChange={e => setAppNotesDraft(e.target.value)}
                  placeholder="Anota comentarios sobre actitud, experiencia en masa/horno, pretensiones o fecha de prueba..."
                  className="w-full px-3.5 py-2 rounded-xl saas-input text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Guardar Evaluación</span>
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Live Preview of the Unified Footer Application Modal */}
      <UnifiedJobApplicationModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
