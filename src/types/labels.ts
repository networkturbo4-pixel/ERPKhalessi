export type LabelPreset = '50x30' | '40x25' | '58x40' | 'custom';
export type BarcodeSymbology = 'code128' | 'qr' | 'both';

export interface LabelFieldConfig {
  showItemName: boolean;
  showSkuBarcode: boolean;
  showLotCode: boolean;
  showExpiryDate: boolean;
  showProductionDate: boolean;
  showBranchName: boolean;
  showPriceOrCost: boolean;
  showResponsible: boolean;
}

export interface LabelConfig {
  preset: LabelPreset;
  widthMm: number;
  heightMm: number;
  symbology: BarcodeSymbology;
  fields: LabelFieldConfig;
  customHeader?: string;
  copies: number;
}

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  preset: '50x30',
  widthMm: 50,
  heightMm: 30,
  symbology: 'both',
  fields: {
    showItemName: true,
    showSkuBarcode: true,
    showLotCode: true,
    showExpiryDate: true,
    showProductionDate: true,
    showBranchName: true,
    showPriceOrCost: false,
    showResponsible: false,
  },
  customHeader: 'KHALESSI PIZZA ARTESANAL',
  copies: 1,
};
