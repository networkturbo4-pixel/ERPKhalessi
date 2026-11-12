import React, { useEffect, useRef } from 'react';
import { X, ZoomIn, Download, ExternalLink } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
  metadata?: {
    capturedAt?: string;
    operatorOrDriver?: string;
    stageLabel?: string;
  };
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Evidencia Fotográfica',
  subtitle,
  metadata,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (isOpen && imageUrl) {
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `evidencia-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-0 bg-transparent border-0 backdrop:bg-black/85 fixed inset-0 z-50 max-w-4xl w-[94vw] outline-none"
    >
      <div className="bg-zinc-950 text-white rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-900/80">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white flex items-center gap-2 truncate">
              <ZoomIn className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{title}</span>
            </h3>
            {subtitle && (
              <p className="text-xs text-zinc-400 truncate mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              title="Descargar Foto"
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar Visor"
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 bg-black/60 flex items-center justify-center p-4 overflow-auto min-h-[300px] max-h-[70vh]">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[66vh] max-w-full object-contain rounded-2xl shadow-lg border border-zinc-800/60"
          />
        </div>

        {/* Metadata Footer */}
        {metadata && (
          <div className="px-5 py-3 bg-zinc-900/90 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
            {metadata.stageLabel && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 font-bold border border-amber-500/20">
                {metadata.stageLabel}
              </span>
            )}
            {metadata.operatorOrDriver && (
              <span>
                <strong>Registrado por:</strong> {metadata.operatorOrDriver}
              </span>
            )}
            {metadata.capturedAt && (
              <span>
                <strong>Fecha/Hora:</strong>{' '}
                {new Date(metadata.capturedAt).toLocaleString('es-PE')}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs ml-auto"
            >
              Cerrar Visor
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
};
