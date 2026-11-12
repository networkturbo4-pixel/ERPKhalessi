import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  Clipboard,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Check,
  Eye,
  Maximize2,
  Layers,
  Sparkles,
  Loader2,
  FileImage,
} from 'lucide-react';
import { useMediaGallery, MediaItem } from '../../context/MediaGalleryContext';
import { useSettings } from '../../context/SettingsContext';
import { formatBytes } from '../../utils/imageCompressor';

export interface MediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (imageUrl: string) => void;
  title?: string;
  subtitle?: string;
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Galería de Medios',
  subtitle = 'Selecciona, sube o arrastra imágenes optimizadas para tu menú y productos.',
}) => {
  const { mediaItems, isProcessing, uploadFiles, uploadBase64, deleteMediaItems } = useMediaGallery();
  const { openNoticeModal, dispatchToast } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escuchar pegar imagen con Ctrl+V mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            dispatchToast('Optimizando Imagen', 'Comprimiendo imagen pegada desde el portapapeles...', 'info');
            const created = await uploadFiles([file]);
            if (created.length > 0) {
              dispatchToast('Imagen Agregada', 'La imagen comprimida se guardó en la galería.', 'success');
              if (onSelect) {
                onSelect(created[0].dataUrl);
                onClose();
              }
            }
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, uploadFiles, dispatchToast, onSelect, onClose]);

  // Manejo de Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) {
        dispatchToast('Formato Inválido', 'Arrastra solo archivos de imagen (JPG, PNG, WebP).', 'warning');
        return;
      }

      dispatchToast('Comprimiendo Imágenes', `Optimizando ${files.length} imagen(es)...`, 'info');
      const created = await uploadFiles(files);
      dispatchToast('Galería Actualizada', `Se agregaron ${created.length} foto(s) comprimida(s).`, 'success');
      if (onSelect && created.length === 1) {
        onSelect(created[0].dataUrl);
        onClose();
      }
    },
    [uploadFiles, dispatchToast, onSelect, onClose]
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    dispatchToast('Comprimiendo', `Optimizando ${files.length} imagen(es)...`, 'info');
    const created = await uploadFiles(files);
    dispatchToast('Carga Completa', `Se agregaron ${created.length} foto(s) a la galería.`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onSelect && created.length === 1) {
      onSelect(created[0].dataUrl);
      onClose();
    }
  };

  const handleManualPasteButton = async () => {
    try {
      if (!navigator.clipboard?.read) {
        dispatchToast('Portapapeles', 'Presiona Ctrl+V para pegar directamente tu imagen.', 'info');
        return;
      }
      const clipItems = await navigator.clipboard.read();
      for (const item of clipItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `captura-${Date.now()}.png`, { type: imageType });
          dispatchToast('Comprimiendo', 'Optimizando foto desde el portapapeles...', 'info');
          const created = await uploadFiles([file]);
          if (created.length > 0) {
            dispatchToast('Imagen Guardada', 'Se optimizó y guardó en la galería.', 'success');
            if (onSelect) {
              onSelect(created[0].dataUrl);
              onClose();
            }
          }
          return;
        }
      }
      dispatchToast('Portapapeles Vacío', 'No se encontró ninguna imagen en el portapapeles. Copia una imagen y vuelve a intentarlo o usa Ctrl+V.', 'warning');
    } catch {
      dispatchToast('Atajo Ctrl+V', 'Presiona Ctrl+V con el modal abierto para pegar tu imagen.', 'info');
    }
  };

  const filteredMedia = mediaItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMedia.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMedia.map((m) => m.id));
    }
  };

  const handleToggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    openNoticeModal({
      title: '¿Eliminar imágenes seleccionadas?',
      message: `Se eliminarán ${selectedIds.length} imagen(es) de la galería de medios permanentemente.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Lote',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        deleteMediaItems(selectedIds);
        setSelectedIds([]);
        dispatchToast('Imágenes Eliminadas', 'El lote de fotos fue retirado de la galería.', 'info');
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-5xl h-[92vh] max-h-[900px] bg-white dark:bg-zinc-900 border ${
          isDraggingOver
            ? 'border-amber-500 ring-4 ring-amber-500/20'
            : 'border-zinc-200 dark:border-zinc-800'
        } rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 transition-all`}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-zinc-950 dark:text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                  {mediaItems.length} foto(s)
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Overlay Indicator */}
        {isDraggingOver && (
          <div className="p-3 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-black animate-pulse">
            <Upload className="w-4 h-4" />
            <span>Suelta tus imágenes aquí para comprimir y guardar automáticamente</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar foto por nombre..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Upload, Paste, Select All, Delete Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              multiple
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Subir Archivos</span>
            </button>

            <button
              type="button"
              onClick={handleManualPasteButton}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Pegar (Ctrl+V)</span>
            </button>

            {filteredMedia.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {selectedIds.length === filteredMedia.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>
                  {selectedIds.length === filteredMedia.length ? 'Deseleccionar' : 'Seleccionar Todo'}
                </span>
              </button>
            )}

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Lote ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
          {filteredMedia.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <FileImage className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h4 className="font-black text-sm text-zinc-700 dark:text-zinc-300">
                {searchQuery ? 'No se encontraron imágenes con ese nombre' : 'La galería de medios está vacía'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-4">
                Arrastra y suelta imágenes directamente aquí, presiona Ctrl+V para pegar desde el portapapeles o usa el botón Subir.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs shadow-xs"
              >
                Seleccionar Archivos desde el Dispositivo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredMedia.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onSelect) {
                        onSelect(item.dataUrl);
                        onClose();
                      } else {
                        setPreviewItem(item);
                      }
                    }}
                    className={`group relative rounded-2xl border-2 overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 cursor-pointer transition-all aspect-square flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    {/* Media Thumbnail */}
                    <img
                      src={item.dataUrl}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Selection Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelectItem(item.id, e)}
                      className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-neutral-950'
                          : 'border-white/70 bg-black/40 text-white hover:bg-black/60'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Preview / Eye Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      title="Ver visor ampliado"
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white transition-opacity opacity-0 group-hover:opacity-100"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Caption / Details at bottom */}
                    <div className="absolute bottom-0 inset-x-0 p-2.5 text-white z-10 pointer-events-none">
                      <span className="text-[11px] font-bold block truncate leading-tight">
                        {item.name}
                      </span>
                      <span className="text-[9px] text-zinc-300 font-medium block">
                        {formatBytes(item.sizeBytes)}
                        {item.width && item.height ? ` • ${item.width}x${item.height}` : ''}
                      </span>
                    </div>

                    {/* On Select Mode Action Pill */}
                    {onSelect && (
                      <div className="absolute inset-x-2 bottom-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(item.dataUrl);
                            onClose();
                          }}
                          className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black text-center shadow-lg transition-transform active:scale-95"
                        >
                          Usar Imagen
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Compresión automática activa (dimensiones máx. 1280px • calidad optimizada).</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-black transition-colors whitespace-nowrap shrink-0"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* VISOR LIGHTBOX EXPANDIDO */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="min-w-0 pr-4">
                <h4 className="text-sm font-black text-white truncate">{previewItem.name}</h4>
                <p className="text-[11px] text-zinc-400">
                  {formatBytes(previewItem.sizeBytes)}
                  {previewItem.width && previewItem.height ? ` • ${previewItem.width}x${previewItem.height} px` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onSelect && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(previewItem.dataUrl);
                      setPreviewItem(null);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0 shadow-xs"
                  >
                    Seleccionar Foto
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/60 overflow-hidden">
              <img
                src={previewItem.dataUrl}
                alt={previewItem.name}
                className="max-w-full max-h-[72vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
