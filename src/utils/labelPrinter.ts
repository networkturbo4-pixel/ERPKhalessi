import { LabelConfig } from '../types/labels';
import { InventoryItem, InventoryLot } from '../types/inventory';
import { generateBarcodeSvg, generateQrDataUrl } from './barcode';

export interface LabelPrintData {
  item: InventoryItem;
  lot?: InventoryLot;
  branchName?: string;
  responsibleName?: string;
  customNote?: string;
}

/**
 * Standard browser-based thermal label printer driver.
 * Uses an invisible iframe configured with exact millimeter dimensions,
 * @page rules and CSS page-break properties.
 */
export async function printInventoryLabels(
  config: LabelConfig,
  data: LabelPrintData,
  copies = config.copies || 1
): Promise<void> {
  const qrData = data.lot
    ? JSON.stringify({ type: 'lot', code: data.lot.code, item: data.item.sku, exp: data.lot.expiresAt })
    : JSON.stringify({ type: 'item', sku: data.item.sku, bar: data.item.barcode });

  let qrImgUrl = '';
  if (config.symbology === 'qr' || config.symbology === 'both') {
    qrImgUrl = await generateQrDataUrl(qrData, 120);
  }

  const barcodeValue = data.lot ? data.lot.code : data.item.barcode || data.item.sku;
  const barcodeSvg = (config.symbology === 'code128' || config.symbology === 'both')
    ? generateBarcodeSvg(barcodeValue, { height: config.heightMm <= 25 ? 24 : 32, displayValue: true })
    : '';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('No se pudo inicializar el driver de impresión de etiquetas.');
  }

  // Format dates
  const fmtDate = (dStr?: string) => {
    if (!dStr) return '--';
    const d = new Date(dStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const expDateStr = data.lot?.expiresAt ? fmtDate(data.lot.expiresAt) : undefined;
  const prodDateStr = data.lot?.producedAt ? fmtDate(data.lot.producedAt) : fmtDate(new Date().toISOString());

  // Generate pages HTML
  let pagesHtml = '';
  for (let i = 0; i < copies; i++) {
    pagesHtml += `
      <div class="label-page">
        ${config.customHeader ? `<div class="label-header">${config.customHeader}</div>` : ''}

        <div class="label-title">${data.item.name}</div>

        <div class="label-body">
          <div class="label-details">
            ${config.fields.showBranchName && data.branchName ? `<div class="meta-row"><strong>SEDE:</strong> ${data.branchName}</div>` : ''}
            ${config.fields.showSkuBarcode ? `<div class="meta-row"><strong>SKU:</strong> ${data.item.sku}</div>` : ''}
            ${config.fields.showLotCode && data.lot ? `<div class="meta-row"><strong>LOTE:</strong> ${data.lot.code}</div>` : ''}
            ${config.fields.showProductionDate ? `<div class="meta-row"><strong>ELAB:</strong> ${prodDateStr}</div>` : ''}
            ${config.fields.showExpiryDate && expDateStr ? `<div class="meta-row meta-alert"><strong>VENCE:</strong> ${expDateStr}</div>` : ''}
            ${config.fields.showPriceOrCost ? `<div class="meta-row"><strong>COSTO U:</strong> S/ ${(data.lot?.unitCost || data.item.costPerUnit || 0).toFixed(2)}</div>` : ''}
            ${config.fields.showResponsible && data.responsibleName ? `<div class="meta-row"><strong>RESP:</strong> ${data.responsibleName}</div>` : ''}
          </div>

          ${qrImgUrl ? `
            <div class="label-qr">
              <img src="${qrImgUrl}" alt="QR" />
            </div>
          ` : ''}
        </div>

        ${barcodeSvg ? `
          <div class="label-barcode">
            ${barcodeSvg}
          </div>
        ` : ''}
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Etiquetas - ${data.item.name}</title>
        <style>
          @page {
            size: ${config.widthMm}mm ${config.heightMm}mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #fff;
            color: #000;
          }
          .label-page {
            width: ${config.widthMm}mm;
            height: ${config.heightMm}mm;
            page-break-after: always;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
          }
          .label-header {
            font-size: 6pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-align: center;
            border-bottom: 0.5px solid #000;
            padding-bottom: 0.5mm;
            margin-bottom: 0.5mm;
            text-transform: uppercase;
          }
          .label-title {
            font-size: ${config.heightMm <= 25 ? '7pt' : '8.5pt'};
            font-weight: 900;
            line-height: 1.1;
            text-align: left;
            margin-bottom: 0.8mm;
            max-height: 2.3em;
            overflow: hidden;
            text-transform: uppercase;
          }
          .label-body {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            flex: 1;
            gap: 1.5mm;
          }
          .label-details {
            font-size: ${config.heightMm <= 25 ? '5.5pt' : '6.5pt'};
            line-height: 1.25;
            flex: 1;
            font-family: monospace;
          }
          .meta-row {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .meta-alert {
            font-weight: bold;
            font-size: 1.05em;
          }
          .label-qr {
            width: ${config.heightMm <= 25 ? '14mm' : '18mm'};
            height: ${config.heightMm <= 25 ? '14mm' : '18mm'};
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .label-qr img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .label-barcode {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 0.5mm;
          }
          .label-barcode svg {
            max-width: 100%;
            max-height: ${config.heightMm <= 25 ? '6mm' : '9mm'};
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for images and fonts to render
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 350);
}
