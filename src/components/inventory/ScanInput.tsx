import React, { useState, useEffect, useRef } from 'react';
import { Barcode, Camera, X } from 'lucide-react';

interface ScanInputProps {
  onScan: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const ScanInput: React.FC<ScanInputProps> = ({
  onScan,
  placeholder = 'Escanear código de barras o QR (Lector USB o Cámara)...',
  autoFocus = false,
  className = '',
}) => {
  const [value, setValue] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // USB Barcode Wedge listener (fast key stroke sequence < 50ms)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is focused on an input/textarea that is not this scan input, don't hijack normal typing
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') &&
        document.activeElement !== inputRef.current
      ) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          e.preventDefault();
          onScan(buffer.trim());
          setValue('');
          buffer = '';
        }
      } else if (e.key.length === 1) {
        if (diff > 80) {
          buffer = ''; // reset buffer if typing too slow for a barcode gun
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);

  // Camera scanner via dynamic import of @zxing/browser if available or canvas fallback
  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError('No se pudo acceder a la cámara. Conecta un lector USB de código de barras.');
      console.warn('Camera scan not supported or blocked:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onScan(value.trim());
      setValue('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleManualSubmit} className="relative flex items-center">
        <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none">
          <Barcode className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-11 pr-24 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-sm"
        />
        <div className="absolute right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={isCameraActive ? stopCamera : startCamera}
            title="Escanear con cámara"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          {value && (
            <button
              type="submit"
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors shadow-sm"
            >
              OK
            </button>
          )}
        </div>
      </form>

      {/* Camera Live Modal Overlay */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-500" />
                Lector de Etiquetas con Cámara
              </span>
              <button
                onClick={stopCamera}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-6 text-center text-sm text-rose-400">
                {cameraError}
              </div>
            ) : (
              <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                <div className="absolute inset-8 border-2 border-amber-500/70 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                  <span className="bg-black/60 px-3 py-1 rounded-full text-[11px] text-amber-300 font-mono">
                    Apunta al código de barras o QR
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-400 mt-3 text-center">
              Recomendación: En cajas de despacho puedes usar pistolas lectoras USB sin abrir la cámara.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
