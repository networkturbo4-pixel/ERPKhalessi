import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { compressPhotoEvidence } from '../../utils/imageCompressor';

interface ProofPhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  stage: 'pickup' | 'delivery';
  orderNumber: string;
  customerName?: string;
  deliveryAddress?: string;
  onConfirm: (photoBase64: string, authorizerOrDriver: string) => void;
}

export const ProofPhotoCaptureModal: React.FC<ProofPhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  title,
  stage,
  orderNumber,
  customerName,
  deliveryAddress,
  onConfirm,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const [authorizerInput, setAuthorizerInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (isOpen) {
      setPreviewDataUrl(null);
      setPhotoSizeKb(null);
      setErrorMsg('');
      setAuthorizerInput('');
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
    }
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const compressed = await compressPhotoEvidence(file, 800, 0.7);
      setPreviewDataUrl(compressed);
      // Calcular tamaño aproximado en KB
      const bytes = Math.round((compressed.length * 3) / 4);
      setPhotoSizeKb(Math.round(bytes / 1024));
    } catch {
      setErrorMsg('No se pudo procesar la fotografía. Intenta tomarla de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewDataUrl) {
      setErrorMsg('Debes tomar o subir la fotografía de evidencia antes de continuar.');
      return;
    }
    onConfirm(previewDataUrl, authorizerInput.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-0 bg-transparent border-0 backdrop:bg-black/75 fixed inset-0 z-50 max-w-lg w-[94vw] outline-none"
    >
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl ${
              stage === 'pickup'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base text-zinc-950 dark:text-white">
                {title}
              </h2>
              <p className="text-xs text-zinc-500">
                Orden <strong className="text-zinc-800 dark:text-zinc-200">{orderNumber}</strong>
                {customerName ? ` · ${customerName}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {deliveryAddress && (
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">Destino:</span>{' '}
            <span className="text-zinc-900 dark:text-zinc-100">{deliveryAddress}</span>
          </div>
        )}

        {/* Input file oculto con captura nativa de cámara para móviles */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Preview / Capture Area */}
        <div className="space-y-3">
          {previewDataUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black/5 dark:bg-black/40 flex items-center justify-center max-h-64">
                <img
                  src={previewDataUrl}
                  alt="Evidencia capturada"
                  className="max-h-64 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleTriggerCamera}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-950 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Volver a Tomar</span>
                </button>
              </div>

              {photoSizeKb !== null && (
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
                  <span>
                    ✓ Imagen optimizada ({photoSizeKb} KB)
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Lista para registrar
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={handleTriggerCamera}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-zinc-950/40 min-h-[180px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Camera className="w-7 h-7" />
              </div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Tocar para activar la Cámara del Dispositivo
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                {stage === 'pickup'
                  ? 'Fotografía del pedido empaquetado al salir de tienda.'
                  : 'Fotografía obligatoria del pedido entregado al cliente.'}
              </p>
              <button
                type="button"
                className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Abrir Cámara</span>
              </button>
            </div>
          )}

          {isProcessing && (
            <p className="text-xs text-amber-600 dark:text-amber-400 animate-pulse text-center">
              Comprimiendo y optimizando foto...
            </p>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Campo de autorizador / observador */}
        <div>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
            {stage === 'pickup'
              ? 'Autorizado / Despachado por (Opcional)'
              : 'Recibido por / Nota de entrega (Opcional)'}
          </label>
          <input
            type="text"
            value={authorizerInput}
            onChange={(e) => setAuthorizerInput(e.target.value)}
            placeholder={
              stage === 'pickup'
                ? 'Ej. Encargado de Despacho Turno Mañana'
                : 'Ej. Cliente en puerta, recepción o portería'
            }
            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Buttons conforming to SINGLE_LINE_MODAL_ACTIONS */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap shrink-0 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!previewDataUrl || isProcessing}
            className={`whitespace-nowrap shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all ${
              stage === 'pickup'
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {stage === 'pickup' ? 'Registrar Salida y Poner En Ruta' : 'Confirmar Entrega con Evidencia'}
            </span>
          </button>
        </div>
      </div>
    </dialog>
  );
};
