import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  Clipboard,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Check,
  Maximize2,
  Sparkles,
  Loader2,
  FileImage,
  X,
  HardDrive,
  Filter,
} from 'lucide-react';
import { useMediaGallery, MediaItem } from '../../context/MediaGalleryContext';
import { useSettings } from '../../context/SettingsContext';
import { formatBytes } from '../../utils/imageCompressor';

export const MediaGalleryView: React.FC = () => {
  const { mediaItems, isProcessing, uploadFiles, uploadBase64, deleteMediaItems } = useMediaGallery();
  const { openNoticeModal, dispatchToast } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escuchar pegar imagen con Ctrl+V mientras se visualiza la galería
  useEffect(() => {
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
            }
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [uploadFiles, dispatchToast]);

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
        dispatchToast('Formato Inválido', 'Arrastra únicamente imágenes (JPG, PNG, WebP).', 'warning');
        return;
      }

      dispatchToast('Comprimiendo Imágenes', `Optimizando ${files.length} imagen(es)...`, 'info');
      const created = await uploadFiles(files);
      dispatchToast('Galería Actualizada', `Se agregaron ${created.length} foto(s) comprimida(s).`, 'success');
    },
    [uploadFiles, dispatchToast]
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    dispatchToast('Comprimiendo', `Optimizando ${files.length} imagen(es)...`, 'info');
    const created = await uploadFiles(files);
    dispatchToast('Carga Completa', `Se agregaron ${created.length} foto(s) a la galería.`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          }
          return;
        }
      }
      dispatchToast('Portapapeles Vacío', 'Copia una imagen y presiona Ctrl+V o pulsa este botón.', 'warning');
    } catch {
      dispatchToast('Atajo Ctrl+V', 'Presiona Ctrl+V en tu teclado para pegar la imagen.', 'info');
    }
  };

  const filteredMedia = mediaItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalBytes = mediaItems.reduce((acc, m) => acc + (m.sizeBytes || 0), 0);

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
      message: `Se eliminarán ${selectedIds.length} imagen(es) de la galería definitivamente.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Lote',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        deleteMediaItems(selectedIds);
        setSelectedIds([]);
        dispatchToast('Imágenes Eliminadas', 'El lote de fotos fue retirado.', 'info');
      },
    });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 text-zinc-900 dark:text-zinc-100"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <FileImage className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
              Galería de Medios
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Biblioteca centralizada de fotos de productos, ingredientes y complementos con compresión automática.
            </p>
          </div>
        </div>

        {/* Global Statistics Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {mediaItems.length} Archivos
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {formatBytes(totalBytes)} en Uso
            </span>
          </div>
        </div>
      </div>

      {/* Drag & Drop Visual Drop Zone Notice */}
      <div
        className={`p-6 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
          isDraggingOver
            ? 'border-amber-500 bg-amber-500/10 ring-4 ring-amber-500/20 scale-[1.01]'
            : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/60'
        }`}
      >
        <Upload className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
        <h3 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white">
          Arrastra y suelta fotos aquí para subirlas
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-3.5">
          También puedes pegar capturas directamente con <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Ctrl + V</kbd> o presionar el botón de selección.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
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
            className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>Seleccionar Archivos</span>
          </button>

          <button
            type="button"
            onClick={handleManualPasteButton}
            disabled={isProcessing}
            className="px-4 py-2 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Clipboard className="w-4 h-4" />
            <span>Pegar Foto (Ctrl+V)</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filter, Batch Selection, Batch Deletion */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de foto..."
            className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-xs sm:text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filteredMedia.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-2 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {selectedIds.length === filteredMedia.length ? (
                <CheckSquare className="w-4 h-4 text-amber-500" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>
                {selectedIds.length === filteredMedia.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
              </span>
            </button>
          )}

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Selección ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Images */}
      {filteredMedia.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/60">
          <FileImage className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="font-black text-base text-zinc-800 dark:text-zinc-200">
            {searchQuery ? 'No hay resultados coincidentes' : 'Aún no tienes fotos en la galería'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Sube o pega imágenes de pizzas, bebidas o complementos para usarlas en cualquier producto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMedia.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className={`group relative rounded-3xl border-2 overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 cursor-pointer transition-all aspect-square flex flex-col justify-between shadow-xs ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Selection Checkbox */}
                <button
                  type="button"
                  onClick={(e) => handleToggleSelectItem(item.id, e)}
                  className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500 text-neutral-950'
                      : 'border-white/70 bg-black/40 text-white hover:bg-black/60'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Visor / Lightbox Trigger */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewItem(item);
                  }}
                  title="Ver visor ampliado"
                  className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Footer caption */}
                <div className="absolute bottom-0 inset-x-0 p-3 text-white z-10 pointer-events-none">
                  <span className="text-xs font-bold block truncate leading-tight">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-zinc-300 font-medium block mt-0.5">
                    {formatBytes(item.sizeBytes)}
                    {item.width && item.height ? ` • ${item.width}x${item.height}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISOR LIGHTBOX */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="min-w-0 pr-4">
                <h4 className="text-sm sm:text-base font-black text-white truncate">{previewItem.name}</h4>
                <p className="text-xs text-zinc-400">
                  {formatBytes(previewItem.sizeBytes)}
                  {previewItem.width && previewItem.height ? ` • ${previewItem.width}x${previewItem.height} px` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-3 sm:p-6 bg-zinc-950/60 overflow-hidden">
              <img
                src={previewItem.dataUrl}
                alt={previewItem.name}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
