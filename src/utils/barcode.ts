import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

/**
 * Generates an SVG string representation of a Code128 barcode
 */
export function generateBarcodeSvg(value: string, options?: { height?: number; displayValue?: boolean }): string {
  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, value, {
      format: 'CODE128',
      width: 1.5,
      height: options?.height || 36,
      displayValue: options?.displayValue ?? true,
      fontSize: 10,
      font: 'monospace',
      margin: 2,
    });
    return svgNode.outerHTML;
  } catch (err) {
    console.error('Error generating barcode SVG:', err);
    return `<div style="font-family:monospace;font-size:10px;padding:4px;border:1px dashed #ccc;">[BARCODE ERROR: ${value}]</div>`;
  }
}

/**
 * Generates a base64 DataURL or SVG string for a QR code
 */
export async function generateQrDataUrl(text: string, size = 96): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Error generating QR DataURL:', err);
    return '';
  }
}

/**
 * Formats a clean SKU or internal Barcode
 * e.g. KH-HAR-001 or KHL-20261112-001
 */
export function generateSku(category: string, index: number): string {
  const prefix = category.substring(0, 3).toUpperCase();
  const padded = String(index).padStart(3, '0');
  return `KH-${prefix}-${padded}`;
}

export function generateLotCode(itemSku: string, date: Date = new Date()): string {
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `L${y}${m}${d}-${itemSku.replace('KH-', '')}-${randomSuffix}`;
}
