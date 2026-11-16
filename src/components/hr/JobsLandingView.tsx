import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Copy,
  Link2,
  MapPin,
  Search,
  Send,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useSettings } from '../../context/SettingsContext';
import { JobPostingFormConfig } from '../../types/hr';
import {
  findJobPostingBySlugOrId,
  getJobPublicPath,
  getJobPublicUrl,
} from '../../utils/jobLinks';
import { UnifiedJobApplicationModal } from './UnifiedJobApplicationModal';

interface JobsLandingViewProps {
  jobSlugOrId?: string | null;
  onNavigate: (path: string) => void;
  onNavigateHome: () => void;
  onNavigateToAdmin: () => void;
}

export const JobsLandingView: React.FC<JobsLandingViewProps> = ({
  jobSlugOrId,
  onNavigate,
  onNavigateHome,
  onNavigateToAdmin,
}) => {
  const { jobPostings } = useHR();
  const { tenants, companyInfo, customization, dispatchToast, isAuthenticated } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [modalPostingId, setModalPostingId] = useState<string | undefined>(undefined);

  const activePostings = useMemo(
    () => jobPostings.filter(p => p.isActive),
    [jobPostings]
  );

  const selectedSinglePosting = useMemo(() => {
    if (!jobSlugOrId) return undefined;
    return findJobPostingBySlugOrId(activePostings, jobSlugOrId);
  }, [activePostings, jobSlugOrId]);

  const filteredPostings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activePostings.filter(post => {
      if (branchFilter !== 'all' && !post.branchIds.includes(branchFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        post.positionTitle.toLowerCase().includes(q) ||
        post.department.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q)
      );
    });
  }, [activePostings, branchFilter, searchQuery]);

  const resolveBranchNames = (branchIds: string[]) => {
    if (!branchIds || branchIds.length === 0) return ['Todas las sedes'];
    const names = branchIds
      .map(id => tenants.find(t => t.id === id)?.name.replace('Khalessi Pizza - ', ''))
      .filter((n): n is string => Boolean(n));
    return names.length > 0 ? names : ['Sedes disponibles'];
  };

  const handleCopyLink = async (posting?: JobPostingFormConfig | null) => {
    const url = getJobPublicUrl(posting);
    const key = posting ? posting.id : 'portal';
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(key);
      dispatchToast(
        'Enlace copiado',
        posting
          ? `Link directo para "${posting.positionTitle}" copiado al portapapeles.`
          : 'Enlace del portal de empleos copiado al portapapeles.',
        'success'
      );
      window.setTimeout(() => {
        setCopiedId(prev => (prev === key ? null : prev));
      }, 2000);
    } catch {
      dispatchToast('Enlace listo', url, 'info');
    }
  };

  const openApplyModal = (postingId?: string) => {
    setModalPostingId(postingId);
    setIsApplyModalOpen(true);
  };

  const primaryColor = customization.primaryColor || '#e11d48';
  const logoUrl =
    customization.storeHeaderLogo || customization.logoLight || customization.logoDark;

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Top SPA Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0d0e14]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 text-left shrink-0"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyInfo.commercialName}
                  className="h-8 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <span className="text-sm font-black tracking-tight">
                  {companyInfo.commercialName}
                </span>
              )}
            </button>

            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <Briefcase className="w-3 h-3" />
              Bolsa de Trabajo
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {jobSlugOrId && (
              <button
                type="button"
                onClick={() => onNavigate('/trabaja')}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Todos los Puestos</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCopyLink(selectedSinglePosting || null)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedId === (selectedSinglePosting?.id || 'portal') ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Copiar Enlace</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tienda</span>
            </button>

            {isAuthenticated && (
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="hidden md:inline-flex px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Panel ERP
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {jobSlugOrId ? (
          /* ==================== VISTA DE PUESTO INDIVIDUAL (/trabaja/:slug) ==================== */
          selectedSinglePosting ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/trabaja')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a todos los puestos disponibles ({activePostings.length})</span>
                </button>

                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  {getJobPublicPath(selectedSinglePosting)}
                </span>
              </div>

              <div className="rounded-3xl bg-white dark:bg-[#12131c] border border-zinc-200/90 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-zinc-200/80 dark:border-zinc-800/80 space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      {selectedSinglePosting.department || 'Operaciones'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {selectedSinglePosting.modality}
                    </span>
                    {selectedSinglePosting.salaryRange && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        <Wallet className="w-3 h-3" />
                        {selectedSinglePosting.salaryRange}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                    <div className="space-y-2 max-w-2xl">
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                        {selectedSinglePosting.positionTitle}
                      </h1>
                      <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {selectedSinglePosting.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(selectedSinglePosting)}
                        className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedId === selectedSinglePosting.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span>
                          {copiedId === selectedSinglePosting.id ? 'Enlace Copiado' : 'Copiar Enlace'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openApplyModal(selectedSinglePosting.id)}
                        style={{ backgroundColor: primaryColor }}
                        className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white shadow-lg hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span>Postular a este puesto</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/70 dark:bg-zinc-900/30">
                  <div className="space-y-2.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      Sedes con vacante disponible
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {resolveBranchNames(selectedSinglePosting.branchIds).map(name => (
                        <span
                          key={name}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedSinglePosting.fields.length > 0 && (
                    <div className="space-y-2.5">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Evaluación rápida al postular ({selectedSinglePosting.fields.length} preguntas)
                      </h2>
                      <ul className="space-y-1.5">
                        {selectedSinglePosting.fields.map(field => (
                          <li
                            key={field.id}
                            className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                          >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{field.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-[#12131c] border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-4 max-w-lg mx-auto">
              <Briefcase className="w-10 h-10 mx-auto text-zinc-400" />
              <div className="space-y-1">
                <h1 className="text-lg font-black">Vacante no encontrada o cerrada</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Es posible que esta convocatoria ya haya cerrado o el enlace haya cambiado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/trabaja')}
                style={{ backgroundColor: primaryColor }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Ver todos los puestos disponibles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        ) : (
          /* ==================== LANDING SPA DE TODOS LOS PUESTOS (/trabaja) ==================== */
          <>
            <section className="rounded-3xl bg-white dark:bg-[#12131c] border border-zinc-200/90 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2.5 max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    Convocatoria Abierta • {activePostings.length} puestos activos
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
                    ¡Trabaja con Nosotros en {companyInfo.commercialName}!
                  </h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Explora nuestras vacantes disponibles, entra al detalle de cada puesto o postula directamente en línea.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(null)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedId === 'portal' ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedId === 'portal' ? 'Enlace Copiado' : 'Copiar Enlace General'}</span>
                  </button>

                  {activePostings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openApplyModal(activePostings[0].id)}
                      style={{ backgroundColor: primaryColor }}
                      className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span>Postular Ahora</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search + Branch Filters */}
              {activePostings.length > 0 && (
                <div className="mt-6 pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar por puesto, área o palabras clave..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div className="relative sm:w-64">
                    <Building2 className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={branchFilter}
                      onChange={e => setBranchFilter(e.target.value)}
                      aria-label="Filtrar por sede"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="all">Todas las sedes</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name.replace('Khalessi Pizza - ', '')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </section>

            {filteredPostings.length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-[#12131c] border border-zinc-200 dark:border-zinc-800 p-12 text-center space-y-2">
                <Briefcase className="w-10 h-10 mx-auto text-zinc-400" />
                <p className="text-sm font-bold">
                  {activePostings.length === 0
                    ? 'No hay convocatorias activas en este momento'
                    : 'No encontramos puestos con ese filtro'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {activePostings.length === 0
                    ? 'Vuelve pronto para conocer nuevas oportunidades en nuestras sedes.'
                    : 'Prueba limpiando la búsqueda o eligiendo otra sede.'}
                </p>
              </div>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPostings.map(post => {
                  const branchNames = resolveBranchNames(post.branchIds);
                  const isCopied = copiedId === post.id;
                  return (
                    <article
                      key={post.id}
                      className="rounded-3xl bg-white dark:bg-[#12131c] border border-zinc-200/90 dark:border-zinc-800 p-5 sm:p-6 flex flex-col justify-between gap-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            {post.department || 'Operaciones'}
                          </span>
                          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                            {post.modality}
                          </span>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => onNavigate(getJobPublicPath(post))}
                            className="text-left group"
                          >
                            <h2 className="text-lg font-black text-zinc-950 dark:text-white group-hover:underline">
                              {post.positionTitle}
                            </h2>
                          </button>
                          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {post.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {post.salaryRange && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              <Wallet className="w-3 h-3" />
                              {post.salaryRange}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            {branchNames.join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigate(getJobPublicPath(post))}
                            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Ver detalle</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(post)}
                            title="Copiar enlace directo de este puesto"
                            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{isCopied ? 'Copiado' : 'Copiar enlace'}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => openApplyModal(post.id)}
                          style={{ backgroundColor: primaryColor }}
                          className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Postular</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      {/* Modal de Postulación (se mantiene en modal al postular) */}
      <UnifiedJobApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        initialPostingId={modalPostingId}
      />
    </div>
  );
};
