import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { compressImageFile, compressImageDataUrl, estimateDataUrlSizeBytes } from '../utils/imageCompressor';

export interface MediaItem {
  id: string;
  name: string;
  dataUrl: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

const STORAGE_KEY = 'kh_media_gallery_v1';

const SEED_MEDIA: MediaItem[] = [
  {
    id: 'media-seed-1',
    name: 'Pizza Pepperoni Artesanal',
    dataUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=80',
    sizeBytes: 120000,
    width: 700,
    height: 700,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'media-seed-2',
    name: 'Pizza Margarita Clásica',
    dataUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80',
    sizeBytes: 135000,
    width: 700,
    height: 700,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'media-seed-3',
    name: 'Pizza Hawaiana Especial',
    dataUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=80',
    sizeBytes: 140000,
    width: 700,
    height: 700,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'media-seed-4',
    name: 'Pan al Ajo Artesanal con Mozzarella',
    dataUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=700&q=80',
    sizeBytes: 110000,
    width: 700,
    height: 700,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'media-seed-5',
    name: 'Alitas BBQ Crocantes',
    dataUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=700&q=80',
    sizeBytes: 125000,
    width: 700,
    height: 700,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'media-seed-6',
    name: 'Bebida Coca Cola Zero',
    dataUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=700&q=80',
    sizeBytes: 95000,
    width: 700,
    height: 700,
    createdAt: new Date().toISOString(),
  },
];

interface MediaGalleryContextType {
  mediaItems: MediaItem[];
  isProcessing: boolean;
  uploadFiles: (files: File[]) => Promise<MediaItem[]>;
  uploadBase64: (dataUrl: string, name?: string) => Promise<MediaItem>;
  deleteMediaItems: (ids: string[]) => void;
  clearAllMedia: () => void;
}

const MediaGalleryContext = createContext<MediaGalleryContextType | undefined>(undefined);

export const MediaGalleryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return SEED_MEDIA;
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Persist to localStorage safely with quota protection
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mediaItems));
    } catch (err) {
      console.warn('MediaGallery: Error saving to localStorage (possible quota limit):', err);
    }
  }, [mediaItems]);

  const uploadFiles = useCallback(async (files: File[]): Promise<MediaItem[]> => {
    setIsProcessing(true);
    const created: MediaItem[] = [];

    try {
      for (const file of files) {
        try {
          const compressed = await compressImageFile(file, {
            maxWidth: 1280,
            maxHeight: 1280,
            quality: 0.82,
          });

          const item: MediaItem = {
            id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name.replace(/\.[^/.]+$/, '') || 'Imagen',
            dataUrl: compressed.dataUrl,
            sizeBytes: compressed.compressedSizeBytes,
            width: compressed.width,
            height: compressed.height,
            createdAt: new Date().toISOString(),
          };
          created.push(item);
        } catch (e) {
          console.error('Error compressing file:', file.name, e);
        }
      }

      if (created.length > 0) {
        setMediaItems(prev => [...created, ...prev]);
      }
      return created;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const uploadBase64 = useCallback(async (dataUrl: string, name?: string): Promise<MediaItem> => {
    setIsProcessing(true);
    try {
      const compressed = await compressImageDataUrl(dataUrl, name || 'Captura Pegada', undefined, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.82,
      });

      const item: MediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name || `Imagen ${new Date().toLocaleTimeString()}`,
        dataUrl: compressed.dataUrl,
        sizeBytes: compressed.compressedSizeBytes,
        width: compressed.width,
        height: compressed.height,
        createdAt: new Date().toISOString(),
      };

      setMediaItems(prev => [item, ...prev]);
      return item;
    } catch {
      // Si la compresión falla (por ejemplo imagen de origen externo bloqueado por CORS), guardar tal cual
      const fallbackItem: MediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name || `Imagen ${new Date().toLocaleTimeString()}`,
        dataUrl,
        sizeBytes: estimateDataUrlSizeBytes(dataUrl),
        createdAt: new Date().toISOString(),
      };
      setMediaItems(prev => [fallbackItem, ...prev]);
      return fallbackItem;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const deleteMediaItems = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setMediaItems(prev => prev.filter(m => !idSet.has(m.id)));
  }, []);

  const clearAllMedia = useCallback(() => {
    setMediaItems([]);
  }, []);

  return (
    <MediaGalleryContext.Provider
      value={{
        mediaItems,
        isProcessing,
        uploadFiles,
        uploadBase64,
        deleteMediaItems,
        clearAllMedia,
      }}
    >
      {children}
    </MediaGalleryContext.Provider>
  );
};

export const useMediaGallery = () => {
  const context = useContext(MediaGalleryContext);
  if (!context) {
    throw new Error('useMediaGallery must be used within a MediaGalleryProvider');
  }
  return context;
};
