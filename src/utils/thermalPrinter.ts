import { Order, OrderItem } from '../types/catalog';
import { DEFAULT_THERMAL_CONFIG, ThermalPrintConfig } from '../types/thermal';

export type { ThermalPrintConfig };

const STORAGE_KEY = 'kh_thermal_print_config';

export function getThermalConfig(): ThermalPrintConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_THERMAL_CONFIG,
        ...parsed,
        receipt: { ...DEFAULT_THERMAL_CONFIG.receipt, ...(parsed.receipt || {}) },
        comanda: { ...DEFAULT_THERMAL_CONFIG.comanda, ...(parsed.comanda || {}) },
      };
    }
  } catch (e) {
    console.error('Error reading thermal print config', e);
  }
  return DEFAULT_THERMAL_CONFIG;
}

export function saveThermalConfig(config: ThermalPrintConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving thermal print config', e);
  }
}

export function printThermalTicket(
  type: 'receipt' | 'comanda',
  order: Partial<Order> & { items: OrderItem[]; total: number },
  customConfig?: ThermalPrintConfig
): void {
  const config = customConfig || getThermalConfig();
  const widthMm = config.paperWidth === '58mm' ? '54mm' : '76mm';
  const fontSize =
    config.density === 'compact' ? '11px' : config.density === 'expanded' ? '14px' : '12px';
  const fontFamily =
    config.fontFamily === 'monospace' ? "'Courier New', Courier, monospace" : "system-ui, -apple-system, sans-serif";

  const orderNum = order.orderNumber || '#KH-000';
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('es-PE') : new Date().toLocaleString('es-PE');
  const channelLabel =
    order.channel === 'pos-salon'
      ? `SALÓN ${order.tableNumber ? `(Mesa: ${order.tableNumber})` : ''}`
      : order.channel === 'pos-takeaway'
      ? 'PARA LLEVAR'
      : order.channel === 'pos-delivery'
      ? 'DELIVERY POS'
      : order.channel === 'online'
      ? 'TIENDA WEB'
      : 'VENTA DIRECTA';

  let htmlContent = '';

  if (type === 'receipt') {
    const r = config.receipt;
    const subtotal = order.subtotal ?? (order.total - (order.deliveryFee || 0));
    const igvAmount = subtotal * 0.18;
    const tipAmount = order.total * ((r.tipPercentage || 10) / 100);

    htmlContent = `
      <div style="text-align: center; margin-bottom: 8px;">
        ${r.showLogo ? '<div style="font-size: 20px; font-weight: 900; letter-spacing: 1px;">🍕 KHALESSI PIZZA</div>' : ''}
        <div style="font-weight: bold; font-size: 13px;">${r.businessName}</div>
        ${r.slogan ? `<div style="font-size: 10px; font-style: italic; margin-bottom: 2px;">${r.slogan}</div>` : ''}
        ${r.ruc ? `<div style="font-size: 11px;">${r.ruc}</div>` : ''}
        ${r.address ? `<div style="font-size: 10px;">${r.address}</div>` : ''}
        ${r.phone ? `<div style="font-size: 10px;">${r.phone}</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin-bottom: 8px; font-size: 11px;">
        ${r.showOrderNumber ? `<div><strong>ORDEN:</strong> ${orderNum}</div>` : ''}
        ${r.showDateTime ? `<div><strong>FECHA:</strong> ${dateStr}</div>` : ''}
        ${r.showChannel ? `<div><strong>CANAL:</strong> ${channelLabel}</div>` : ''}
        ${r.showCustomer && order.customerName ? `<div><strong>CLIENTE:</strong> ${order.customerName}${order.customerDni ? ` · DNI: ${order.customerDni}` : ''}</div>` : ''}
        ${order.deliveryAddress ? `<div><strong>DIRECCIÓN:</strong> ${order.deliveryAddress}</div>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px;">
        <thead>
          <tr style="border-bottom: 1px solid #000; text-align: left;">
            <th style="padding-bottom: 2px;">CANT. DESCRIPCIÓN</th>
            <th style="text-align: right; padding-bottom: 2px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || [])
            .map(
              (item) => `
            <tr>
              <td style="padding-top: 3px; vertical-align: top;">
                <strong>${item.quantity}x</strong> ${item.productName}
                ${r.showItemSizes && item.size ? `<span style="font-size: 10px;"> (${item.size.name})</span>` : ''}
                ${
                  item.halfAndHalf
                    ? `<div style="font-size: 10px; padding-left: 6px;">½ ${item.halfAndHalf.firstHalfName} + ½ ${item.halfAndHalf.secondHalfName}</div>`
                    : ''
                }
                ${
                  r.showItemModifiers && item.subOptions && item.subOptions.length > 0
                    ? item.subOptions
                        .map((s) => `<div style="font-size: 9px; padding-left: 6px;">• ${s.groupName}: ${s.choiceName}</div>`)
                        .join('')
                    : ''
                }
                ${
                  r.showItemModifiers && item.extras && item.extras.length > 0
                    ? item.extras
                        .map((e) => `<div style="font-size: 9px; padding-left: 6px;">+ ${e.name} (x${e.quantity})</div>`)
                        .join('')
                    : ''
                }
                ${
                  r.showItemNotes && item.notes
                    ? `<div style="font-size: 9px; font-style: italic; padding-left: 6px;">Nota: ${item.notes}</div>`
                    : ''
                }
              </td>
              <td style="text-align: right; padding-top: 3px; vertical-align: top; white-space: nowrap;">
                S/ ${item.totalPrice.toFixed(2)}
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #000; padding-top: 4px; margin-bottom: 8px; font-size: 11px;">
        ${r.showSubtotal ? `<div style="display: flex; justify-content: space-between;"><span>SUBTOTAL:</span><span>S/ ${subtotal.toFixed(2)}</span></div>` : ''}
        ${r.showIgvBreakdown ? `<div style="display: flex; justify-content: space-between;"><span>OP. GRAVADA / IGV (18%):</span><span>S/ ${igvAmount.toFixed(2)}</span></div>` : ''}
        ${r.showDeliveryFee && order.deliveryFee && order.deliveryFee > 0 ? `<div style="display: flex; justify-content: space-between;"><span>ENVÍO DELIVERY:</span><span>S/ ${order.deliveryFee.toFixed(2)}</span></div>` : ''}
        ${r.showDiscount && order.discount && order.discount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>DESCUENTO:</span><span>- S/ ${order.discount.toFixed(2)}</span></div>` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px;">
          <span>TOTAL A PAGAR:</span>
          <span>S/ ${order.total.toFixed(2)}</span>
        </div>
        ${r.showTipSuggestion ? `<div style="display: flex; justify-content: space-between; font-size: 10px; font-style: italic; margin-top: 2px;"><span>Propina Sugerida (${r.tipPercentage}%):</span><span>S/ ${tipAmount.toFixed(2)}</span></div>` : ''}
      </div>

      <div style="text-align: center; border-top: 1px dashed #000; padding-top: 6px; font-size: 10px;">
        ${r.wifiInfo ? `<div style="margin-bottom: 2px;">${r.wifiInfo}</div>` : ''}
        ${r.footerMessage ? `<div style="font-weight: bold; margin-bottom: 4px;">${r.footerMessage}</div>` : ''}
        ${
          r.showQrCode
            ? `<div style="margin-top: 4px; display: inline-block; padding: 4px; border: 1px solid #000; font-size: 8px; font-weight: bold;">
                [ QR PAGOS YAPE / SUNAT ]<br/>
                <span style="font-family: monospace;">KH-PAGOS-${orderNum.replace(/\D/g, '')}</span>
               </div>`
            : ''
        }
      </div>
    `;
  } else {
    // Comanda Cocina / Horno
    const c = config.comanda;
    htmlContent = `
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
        <div style="font-size: 16px; font-weight: 900; letter-spacing: 1px;">*** COMANDA DE ${c.headerStation} ***</div>
        ${c.showBigOrderNumber ? `<div style="font-size: 24px; font-weight: 900; margin: 2px 0;">${orderNum}</div>` : ''}
        ${
          c.showTableHighlight && order.tableNumber
            ? `<div style="display: inline-block; font-size: 18px; font-weight: 900; padding: 2px 8px; border: 2px solid #000; margin-top: 2px;">MESA: ${order.tableNumber}</div>`
            : ''
        }
      </div>

      <div style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; font-size: 11px;">
        ${c.showOrderTime ? `<div><strong>HORA:</strong> ${dateStr}</div>` : ''}
        ${c.showChannelBadge ? `<div><strong>CANAL:</strong> ${channelLabel}</div>` : ''}
        ${order.customerName ? `<div><strong>CLIENTE:</strong> ${order.customerName}</div>` : ''}
      </div>

      <div style="margin-bottom: 8px;">
        ${(order.items || [])
          .map(
            (item) => `
          <div style="border-bottom: 1px dashed #666; padding: 4px 0;">
            <div style="font-size: 14px; font-weight: 900;">
              ${item.quantity} x ${item.productName}
              ${item.size ? `<span style="font-size: 12px; font-weight: bold;"> (${item.size.name})</span>` : ''}
            </div>
            ${
              item.halfAndHalf
                ? `<div style="font-size: 12px; font-weight: bold; padding-left: 8px;">🍕 ½ ${item.halfAndHalf.firstHalfName} + ½ ${item.halfAndHalf.secondHalfName}</div>`
                : ''
            }
            ${
              c.showItemModifiers && item.subOptions && item.subOptions.length > 0
                ? item.subOptions
                    .map((s) => `<div style="font-size: 11px; padding-left: 8px;">• ${s.groupName}: <strong>${s.choiceName}</strong></div>`)
                    .join('')
                : ''
            }
            ${
              c.showItemModifiers && item.extras && item.extras.length > 0
                ? item.extras
                    .map((e) => `<div style="font-size: 11px; font-weight: bold; padding-left: 8px;">+ EXTRA: ${e.name} (x${e.quantity})</div>`)
                    .join('')
                : ''
            }
            ${
              c.highlightItemNotes && item.notes
                ? `<div style="font-size: 12px; font-weight: 900; background: #eee; border-left: 3px solid #000; padding: 2px 4px; margin-top: 2px;">
                    ⚠️ NOTA: ${item.notes.toUpperCase()}
                   </div>`
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>

      <div style="text-align: center; border-top: 1px dashed #000; padding-top: 4px; font-size: 10px; font-style: italic;">
        ${c.footerNote}
      </div>
    `;
  }

  // Create isolated print frame to avoid altering the main DOM
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Impresión Térmica ${orderNum}</title>
        <style>
          @page {
            size: ${widthMm} auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 4mm;
            width: ${widthMm};
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: 1.25;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() {
              window.frameElement && window.frameElement.remove();
            }, 1000);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();
}
