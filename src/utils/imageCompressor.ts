/**
 * Utilidad de compresión y optimización de imágenes en el cliente (navegador).
 * Reduce imágenes de alta resolución a dimensiones y calidad optimizadas
 * para almacenamiento en base64 / localStorage y rendimiento web.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 a 1.0 (default 0.82)
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface CompressedImageResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
  name: string;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.82,
  outputFormat: 'image/jpeg',
};

/**
 * Comprime una imagen a partir de un objeto File.
 */
export async function compressImageFile(
  file: File,
  options?: CompressionOptions
): Promise<CompressedImageResult> {
  const originalSizeBytes = file.size;
  const rawDataUrl = await fileToDataUrl(file);
  return compressImageDataUrl(rawDataUrl, file.name, originalSizeBytes, options);
}

/**
 * Comprime una imagen a partir de una cadena DataURL (Base64) existente.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  name: string = 'imagen.jpg',
  originalSizeBytes?: number,
  options?: CompressionOptions
): Promise<CompressedImageResult> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const approxOriginalSize = originalSizeBytes ?? estimateDataUrlSizeBytes(dataUrl);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;

        // Calcular escalado manteniendo relación de aspecto
        if (width > config.maxWidth || height > config.maxHeight) {
          const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('No se pudo obtener el contexto 2D de canvas');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fondo blanco para imágenes transparentes que se exportan a JPEG
        if (config.outputFormat === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL(config.outputFormat, config.quality);
        const compressedSizeBytes = estimateDataUrlSizeBytes(compressedDataUrl);

        resolve({
          dataUrl: compressedDataUrl,
          originalSizeBytes: approxOriginalSize,
          compressedSizeBytes,
          width,
          height,
          name,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(new Error('No se pudo cargar la imagen para compresión: ' + String(err)));
    };

    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Formato de archivo inválido'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function estimateDataUrlSizeBytes(dataUrl: string): number {
  const head = 'data:image/jpeg;base64,';
  const commaIndex = dataUrl.indexOf(',');
  const base64Str = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return Math.round((base64Str.length * 3) / 4);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Función de compatibilidad para captura de evidencias fotográficas en Delivery.
 * Retorna directamente el string DataURL comprimido.
 */
export async function compressPhotoEvidence(
  file: File,
  maxDimension: number = 800,
  quality: number = 0.7
): Promise<string> {
  const result = await compressImageFile(file, {
    maxWidth: maxDimension,
    maxHeight: maxDimension,
    quality,
    outputFormat: 'image/jpeg',
  });
  return result.dataUrl;
}

