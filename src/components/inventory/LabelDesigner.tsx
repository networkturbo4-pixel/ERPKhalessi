import React, { useState, useEffect } from 'react';
import { LabelConfig, LabelPreset, BarcodeSymbology } from '../../types/labels';
import { InventoryItem, InventoryLot } from '../../types/inventory';
import { printInventoryLabels } from '../../utils/labelPrinter';
import { generateBarcodeSvg, generateQrDataUrl } from '../../utils/barcode';
import { useSettings } from '../../context/SettingsContext';
import { Printer, Settings2, Sliders, X, CheckCircle2 } from 'lucide-react';

interface LabelDesignerProps {
  item: InventoryItem;
  lot?: InventoryLot;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_DIMENSIONS: Record<LabelPreset, { w: number; h: number; label: string }> = {
  '50x30': { w: 50, h: 30, label: '50 × 30 mm (Estándar Adhesivo Cocina)' },
  '40x25': { w: 40, h: 25, label: '40 × 25 mm (Frasco / Caja Compacta)' },
  '58x40': { w: 58, h: 40, label: '58 × 40 mm (Amplia / Lote con QR)' },
  'custom': { w: 50, h: 30, label: 'Personalizado (mm)' },
};

export const LabelDesigner: React.FC<LabelDesignerProps> = ({
  item,
  lot,
  isOpen,
  onClose,
}) => {
  const { tenants, activeTenant } = useSettings();

  const [preset, setPreset] = useState<LabelPreset>('50x30');
  const [widthMm, setWidthMm] = useState<number>(50);
  const [heightMm, setHeightMm] = useState<number>(30);
  const [symbology, setSymbology] = useState<BarcodeSymbology>('both');
  const [copies, setCopies] = useState<number>(1);
  const [customHeader, setCustomHeader] = useState<string>('KHALESSI PIZZA ARTESANAL');

  const [showItemName, setShowItemName] = useState(true);
  const [showSkuBarcode, setShowSkuBarcode] = useState(true);
  const [showLotCode, setShowLotCode] = useState(Boolean(lot));
  const [showProductionDate, setShowProductionDate] = useState(true);
  const [showExpiryDate, setShowExpiryDate] = useState(true);
  const [showBranchName, setShowBranchName] = useState(true);
  const [showPriceOrCost, setShowPriceOrCost] = useState(false);

  // Live preview generators
  const [previewBarcodeSvg, setPreviewBarcodeSvg] = useState<string>('');
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>('');

  const currentBranchName = tenants.find(t => t.id === activeTenant?.id)?.name || activeTenant?.name || 'Sede Principal';

  // Update dimensions when changing preset
  const handlePresetChange = (p: LabelPreset) => {
    setPreset(p);
    if (p !== 'custom') {
      setWidthMm(PRESET_DIMENSIONS[p].w);
      setHeightMm(PRESET_DIMENSIONS[p].h);
    }
  };

  useEffect(() => {
    const code = lot ? lot.code : item.barcode || item.sku;
    setPreviewBarcodeSvg(generateBarcodeSvg(code, { height: heightMm <= 25 ? 24 : 32 }));

    const qrData = lot
      ? JSON.stringify({ t: 'lot', c: lot.code, sku: item.sku, exp: lot.expiresAt })
      : JSON.stringify({ t: 'item', sku: item.sku, b: item.barcode });

    generateQrDataUrl(qrData, 120).then(setPreviewQrDataUrl);
  }, [item, lot, heightMm]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    const config: LabelConfig = {
      preset,
      widthMm,
      heightMm,
      symbology,
      fields: {
        showItemName,
        showSkuBarcode,
        showLotCode,
        showExpiryDate,
        showProductionDate,
        showBranchName,
        showPriceOrCost,
        showResponsible: false,
      },
      customHeader,
      copies,
    };

    await printInventoryLabels(config, {
      item,
      lot,
      branchName: currentBranchName,
      responsibleName: 'Operador ERP',
    }, copies);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                Impresión de Etiquetas Adhesivas
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.name} • SKU: <span className="font-mono font-semibold">{item.sku}</span>
                {lot && <> • Lote: <span className="font-mono font-semibold text-amber-500">{lot.code}</span></>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls column */}
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                Tamaño de Etiqueta (Preset)
              </label>
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value as LabelPreset)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                {Object.entries(PRESET_DIMENSIONS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>

              {preset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Ancho (mm)</label>
                    <input
                      type="number"
                      value={widthMm}
                      onChange={(e) => setWidthMm(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Alto (mm)</label>
                    <input
                      type="number"
                      value={heightMm}
                      onChange={(e) => setHeightMm(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                Código Gráfico (Simbología)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'both', label: 'Ambos (Barra + QR)' },
                  { id: 'code128', label: 'Solo Code128' },
                  { id: 'qr', label: 'Solo QR' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSymbology(s.id as BarcodeSymbology)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                      symbology === s.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                Campos Visibles en Etiqueta
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Nombre Insumo', checked: showItemName, set: setShowItemName },
                  { label: 'SKU / Código', checked: showSkuBarcode, set: setShowSkuBarcode },
                  { label: 'Lote de Producción', checked: showLotCode, set: setShowLotCode },
                  { label: 'Fecha Elaboración', checked: showProductionDate, set: setShowProductionDate },
                  { label: 'Fecha Vencimiento', checked: showExpiryDate, set: setShowExpiryDate },
                  { label: 'Nombre Sucursal', checked: showBranchName, set: setShowBranchName },
                  { label: 'Costo Unitario', checked: showPriceOrCost, set: setShowPriceOrCost },
                ].map((f, i) => (
                  <label key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.checked}
                      onChange={(e) => f.set(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500/20"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                  N° de Copias
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                  Encabezado
                </label>
                <input
                  type="text"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Live Preview column */}
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-100 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Vista Previa en Escala ({widthMm} × {heightMm} mm)
            </span>

            {/* Sticker Mockup */}
            <div
              style={{
                width: `${widthMm * 5.5}px`,
                minHeight: `${heightMm * 5.5}px`,
              }}
              className="bg-white text-black p-3.5 rounded-lg shadow-xl border border-zinc-300 flex flex-col justify-between font-sans select-none overflow-hidden"
            >
              {customHeader && (
                <div className="text-[9px] font-black uppercase text-center border-b border-black pb-0.5 mb-1 tracking-wider">
                  {customHeader}
                </div>
              )}

              {showItemName && (
                <div className="text-[12px] font-black leading-tight uppercase mb-1">
                  {item.name}
                </div>
              )}

              <div className="flex items-start justify-between gap-2 my-1">
                <div className="text-[9px] font-mono leading-tight flex-1">
                  {showBranchName && <div><strong>SEDE:</strong> {currentBranchName}</div>}
                  {showSkuBarcode && <div><strong>SKU:</strong> {item.sku}</div>}
                  {showLotCode && lot && <div><strong>LOTE:</strong> {lot.code}</div>}
                  {showProductionDate && <div><strong>ELAB:</strong> {new Date().toLocaleDateString()}</div>}
                  {showExpiryDate && (
                    <div className="font-bold text-black">
                      <strong>VENCE:</strong> {lot?.expiresAt ? new Date(lot.expiresAt).toLocaleDateString() : '30 DÍAS'}
                    </div>
                  )}
                  {showPriceOrCost && <div><strong>COSTO:</strong> S/ {item.costPerUnit.toFixed(2)}</div>}
                </div>

                {(symbology === 'qr' || symbology === 'both') && previewQrDataUrl && (
                  <div className="w-14 h-14 flex-shrink-0">
                    <img src={previewQrDataUrl} alt="QR Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {(symbology === 'code128' || symbology === 'both') && previewBarcodeSvg && (
                <div
                  className="w-full flex justify-center mt-1"
                  dangerouslySetInnerHTML={{ __html: previewBarcodeSvg }}
                />
              )}
            </div>

            <p className="text-[11px] text-zinc-400 mt-4 text-center max-w-xs">
              Optimizado para impresoras térmicas adhesivas directas (Zebra, Xprinter, TSC, Bixolon, etc.)
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-600/20 flex items-center gap-2 whitespace-nowrap shrink-0 transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir {copies} {copies === 1 ? 'Etiqueta' : 'Etiquetas'}
          </button>
        </div>
      </div>
    </div>
  );
};
