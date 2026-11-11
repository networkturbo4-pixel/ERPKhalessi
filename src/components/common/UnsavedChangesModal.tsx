import React, { useEffect, useRef, useId } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { AlertCircle, ArrowRight } from 'lucide-react';

export const UnsavedChangesModal: React.FC = () => {
  const {
    showUnsavedModal,
    confirmDiscardAndNavigate,
    cancelNavigation,
    saveAllSettings,
    isSaving,
    customization,
  } = useSettings();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showUnsavedModal) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [showUnsavedModal]);

  const handleNativeClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = '';
    }
    if (showUnsavedModal) {
      cancelNavigation();
    }
  };

  if (!showUnsavedModal) return null;

  const modalStyle = customization.modalStyle || 'halo';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleNativeClose}
      className="bg-transparent p-4 outline-none"
      style={{ maxWidth: 'min(96vw, 35rem)' }}
    >
      <div
        className={`w-full bg-white dark:bg-[#18181c] shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden ${
          modalStyle === 'minimalist'
            ? 'rounded-xl p-6'
            : modalStyle === 'halo'
            ? 'rounded-3xl p-7 text-center'
            : 'rounded-2xl'
        }`}
      >
        {modalStyle === 'frost' && (
          <div className="h-1.5 w-full bg-amber-500" />
        )}

        {modalStyle === 'executive' && (
          <div className="px-6 py-3 bg-zinc-900 dark:bg-[#0d0e12] text-white text-xs font-bold uppercase tracking-wider border-b border-zinc-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <span>Control de Cambios sin Confirmar</span>
          </div>
        )}

        <div className={modalStyle === 'frost' || modalStyle === 'executive' ? 'p-6' : ''}>
          <div
            className={`flex ${
              modalStyle === 'halo' ? 'flex-col items-center gap-3.5' : 'items-start gap-4'
            }`}
          >
            <div className="rounded-full bg-amber-500/15 p-3 text-amber-600 dark:text-amber-400 shrink-0 ring-4 ring-amber-500/10 border border-amber-500/30">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 id={titleId} className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
                ¿Descartar cambios pendientes?
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Tienes modificaciones sin confirmar como punto de control. Elige si deseas seguir editando, revertir al punto anterior o guardar ahora.
              </p>
            </div>
          </div>

          {/* Single-row non-wrapping action bar */}
          <div
            className={`mt-6 flex flex-wrap sm:flex-nowrap items-center ${
              modalStyle === 'halo' ? 'justify-center' : 'justify-end'
            } gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800`}
          >
            <button
              type="button"
              autoFocus
              onClick={cancelNavigation}
              className="px-4 py-2.5 text-xs font-semibold saas-btn-secondary rounded-xl whitespace-nowrap shrink-0"
            >
              Seguir Editando
            </button>
            <button
              type="button"
              onClick={confirmDiscardAndNavigate}
              className="px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-xl transition-colors border border-rose-200 dark:border-rose-500/30 whitespace-nowrap shrink-0"
            >
              Descartar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                await saveAllSettings();
                setShowUnsavedModalAndContinue(confirmDiscardAndNavigate);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-95 whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <span>{isSaving ? 'Guardando...' : 'Guardar y Continuar'}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

function setShowUnsavedModalAndContinue(cb: () => void) {
  cb();
}
