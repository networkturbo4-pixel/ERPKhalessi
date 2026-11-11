import React, { useEffect, useRef, useId } from 'react';
import { useSettings } from '../../context/SettingsContext';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

export const SystemNoticeModal: React.FC = () => {
  const { noticeModal, closeNoticeModal, customization } = useSettings();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const handleConfirm = async () => {
    await noticeModal?.onConfirm?.();
    closeNoticeModal();
  };

  const handleCancel = () => {
    noticeModal?.onCancel?.();
    closeNoticeModal();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (noticeModal) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [noticeModal]);

  // Keyboard shortcut: Pressing Enter accepts/confirms the modal automatically.
  // Registered in the CAPTURE phase on `document` so nested editors/dialogs that call
  // stopPropagation() on keydown (e.g. product editor, checkout drawer) can never swallow it.
  const confirmRef = useRef(handleConfirm);
  confirmRef.current = handleConfirm;

  useEffect(() => {
    if (!noticeModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing || e.repeat) return;

      const activeEl = document.activeElement as HTMLElement | null;

      // If focus is specifically on the Cancel or Close button, respect user's explicit selection
      if (
        activeEl &&
        (activeEl.getAttribute('data-action') === 'cancel' ||
          activeEl.getAttribute('aria-label') === 'Cerrar diálogo')
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      void confirmRef.current();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [noticeModal]);

  // Reset returnValue on native close (Esc / backdrop)
  const handleNativeClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = '';
    }
    if (noticeModal) {
      noticeModal.onCancel?.();
      closeNoticeModal();
    }
  };

  if (!noticeModal) return null;

  const activeStyle = noticeModal.styleOverride || customization.modalStyle || 'halo';
  const tone = noticeModal.tone || 'info';

  const getToneColors = () => {
    switch (tone) {
      case 'danger':
        return {
          ring: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-8 ring-rose-500/10 border border-rose-500/30',
          bar: 'bg-rose-500',
          btnBg: '#e11d48',
          icon: <ShieldAlert className="h-6 w-6" />,
        };
      case 'warning':
        return {
          ring: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-8 ring-amber-500/10 border border-amber-500/30',
          bar: 'bg-amber-500',
          btnBg: '#d97706',
          icon: <AlertTriangle className="h-6 w-6" />,
        };
      case 'success':
        return {
          ring: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/10 border border-emerald-500/30',
          bar: 'bg-emerald-500',
          btnBg: '#059669',
          icon: <CheckCircle2 className="h-6 w-6" />,
        };
      case 'info':
      default:
        return {
          ring: 'bg-brand-500/15 text-brand-600 dark:text-brand-400 ring-8 ring-brand-500/10 border border-brand-500/30',
          bar: 'bg-brand-500',
          btnBg: customization.primaryColor,
          icon: <Sparkles className="h-6 w-6" />,
        };
    }
  };

  const visuals = getToneColors();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleNativeClose}
      className="bg-transparent p-4 outline-none"
    >
      {/* Style 1: Centrado con Halo */}
      {activeStyle === 'halo' && (
        <div className="w-full max-w-lg mx-auto rounded-3xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-700/90 shadow-2xl p-7 text-center space-y-5">
          <div className={`h-14 w-14 mx-auto rounded-full flex items-center justify-center ${visuals.ring}`}>
            {visuals.icon}
          </div>

          <div className="space-y-2">
            <h2 id={titleId} className="text-lg font-bold text-zinc-950 dark:text-white">
              {noticeModal.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md mx-auto">
              {noticeModal.message}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-3 pt-2">
            {!noticeModal.hideCancel && (
              <button
                type="button"
                data-action="cancel"
                onClick={handleCancel}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
              >
                {noticeModal.cancelLabel || 'Cancelar'}
              </button>
            )}
            <button
              type="button"
              autoFocus
              onClick={handleConfirm}
              className="px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-sm hover:opacity-95 transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
              style={{ backgroundColor: visuals.btnBg }}
            >
              <span>{noticeModal.confirmLabel || 'Entendido'}</span>
              <span className="opacity-75 text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded bg-black/25 dark:bg-white/20 border border-white/20 whitespace-nowrap">
                ↵ Enter
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Style 2: Cristal Esmerilado (Blur con franja superior sólida) */}
      {activeStyle === 'frost' && (
        <div className="w-full max-w-lg mx-auto rounded-2xl bg-white/90 dark:bg-[#16171d]/90 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-700/90 shadow-2xl overflow-hidden">
          <div
            className={`h-1.5 w-full ${visuals.bar}`}
            style={tone === 'info' ? { backgroundColor: customization.primaryColor } : undefined}
          />
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${visuals.ring} !ring-0`}>
                  {visuals.icon}
                </div>
                <div>
                  <h2 id={titleId} className="text-base font-bold text-zinc-950 dark:text-white">
                    {noticeModal.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
                    {noticeModal.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                aria-label="Cerrar diálogo"
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
              {!noticeModal.hideCancel && (
                <button
                  type="button"
                  data-action="cancel"
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-semibold rounded-xl saas-btn-secondary whitespace-nowrap shrink-0"
                >
                  {noticeModal.cancelLabel || 'Cancelar'}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                className="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm hover:opacity-95 whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
                style={{ backgroundColor: visuals.btnBg }}
              >
                <span>{noticeModal.confirmLabel || 'Confirmar'}</span>
                <span className="opacity-75 text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded bg-black/25 dark:bg-white/20 border border-white/20 whitespace-nowrap">
                  ↵ Enter
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style 3: Banner Ejecutivo (Horizontal con cabecera y pie de acción) */}
      {activeStyle === 'executive' && (
        <div className="w-full max-w-lg mx-auto rounded-2xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden">
          <div className="px-6 py-3.5 bg-zinc-900 dark:bg-[#0d0e12] text-white flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {visuals.icon}
              <span>Aviso Operativo del Sistema</span>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Cerrar diálogo"
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-2">
            <h2 id={titleId} className="text-base font-bold text-zinc-950 dark:text-white">
              {noticeModal.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {noticeModal.message}
            </p>
          </div>

          <div className="px-6 py-3.5 bg-zinc-50 dark:bg-[#121317] border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            {!noticeModal.hideCancel && (
              <button
                type="button"
                data-action="cancel"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold rounded-lg saas-btn-secondary whitespace-nowrap shrink-0"
              >
                {noticeModal.cancelLabel || 'Cancelar'}
              </button>
            )}
            <button
              type="button"
              autoFocus
              onClick={handleConfirm}
              className="px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-95 whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
              style={{ backgroundColor: visuals.btnBg }}
            >
              <span>{noticeModal.confirmLabel || 'Aceptar'}</span>
              <span className="opacity-75 text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded bg-black/25 dark:bg-white/20 border border-white/20 whitespace-nowrap">
                ↵ Enter
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Style 4: Minimalista */}
      {activeStyle === 'minimalist' && (
        <div className="w-full max-w-lg mx-auto rounded-xl bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700 shadow-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <h2 id={titleId} className="text-base font-bold text-zinc-950 dark:text-white">
              {noticeModal.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {noticeModal.message}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            {!noticeModal.hideCancel && (
              <button
                type="button"
                data-action="cancel"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold rounded-lg saas-btn-secondary whitespace-nowrap shrink-0"
              >
                {noticeModal.cancelLabel || 'Cancelar'}
              </button>
            )}
            <button
              type="button"
              autoFocus
              onClick={handleConfirm}
              className="px-4 py-2 text-xs font-semibold text-white rounded-lg whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
              style={{ backgroundColor: visuals.btnBg }}
            >
              <span>{noticeModal.confirmLabel || 'Confirmar'}</span>
              <span className="opacity-75 text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded bg-black/25 dark:bg-white/20 border border-white/20 whitespace-nowrap">
                ↵ Enter
              </span>
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
};
