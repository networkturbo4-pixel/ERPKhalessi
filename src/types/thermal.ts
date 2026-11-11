export type ThermalPaperWidth = '80mm' | '58mm';
export type ThermalDensity = 'compact' | 'normal' | 'expanded';
export type ThermalFontFamily = 'monospace' | 'sans-serif';

export interface ThermalReceiptSettings {
  showLogo: boolean;
  businessName: string;
  slogan: string;
  ruc: string;
  address: string;
  phone: string;
  showOrderNumber: boolean;
  showChannel: boolean;
  showWaiter: boolean;
  showCustomer: boolean;
  showDateTime: boolean;
  showItemSizes: boolean;
  showItemModifiers: boolean;
  showItemNotes: boolean;
  showUnitPrice: boolean;
  showSubtotal: boolean;
  showIgvBreakdown: boolean;
  showDiscount: boolean;
  showDeliveryFee: boolean;
  showTipSuggestion: boolean;
  tipPercentage: number;
  showQrCode: boolean;
  qrType: 'yape_plin' | 'electronic_invoice' | 'store_url';
  footerMessage: string;
  wifiInfo: string;
}

export interface ThermalComandaSettings {
  headerStation: 'COCINA & HORNO' | 'HORNO DE PIEDRA' | 'COCINA CALIENTE' | 'BARRA & BEBIDAS';
  showBigOrderNumber: boolean;
  showTableHighlight: boolean;
  showChannelBadge: boolean;
  showOrderTime: boolean;
  showItemModifiers: boolean;
  highlightItemNotes: boolean;
  showServerName: boolean;
  footerNote: string;
}

export interface ThermalPrintConfig {
  paperWidth: ThermalPaperWidth;
  density: ThermalDensity;
  fontFamily: ThermalFontFamily;
  receipt: ThermalReceiptSettings;
  comanda: ThermalComandaSettings;
}

export const DEFAULT_THERMAL_CONFIG: ThermalPrintConfig = {
  paperWidth: '80mm',
  density: 'normal',
  fontFamily: 'monospace',
  receipt: {
    showLogo: true,
    businessName: 'KHALESSI PIZZA ARTESANAL',
    slogan: 'El verdadero sabor al horno de piedra',
    ruc: 'RUC 20608945123',
    address: 'Av. Primavera 1024, Santiago de Surco - Lima',
    phone: 'Central: (01) 748-9000 · WhatsApp: 998-289-752',
    showOrderNumber: true,
    showChannel: true,
    showWaiter: true,
    showCustomer: true,
    showDateTime: true,
    showItemSizes: true,
    showItemModifiers: true,
    showItemNotes: true,
    showUnitPrice: true,
    showSubtotal: true,
    showIgvBreakdown: true,
    showDiscount: true,
    showDeliveryFee: true,
    showTipSuggestion: false,
    tipPercentage: 10,
    showQrCode: true,
    qrType: 'yape_plin',
    footerMessage: '¡Gracias por su preferencia! Que disfrute su pizza.',
    wifiInfo: 'WiFi Clientes: Khalessi_Guest (Clave: pizza2026)',
  },
  comanda: {
    headerStation: 'COCINA & HORNO',
    showBigOrderNumber: true,
    showTableHighlight: true,
    showChannelBadge: true,
    showOrderTime: true,
    showItemModifiers: true,
    highlightItemNotes: true,
    showServerName: true,
    footerNote: '--- FIN DE COMANDA / CONTROL INTERNO ---',
  },
};
