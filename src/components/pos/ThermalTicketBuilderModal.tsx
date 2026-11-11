import React, { useState, useEffect, useRef, useId } from 'react';
import {
  ThermalPrintConfig,
  getThermalConfig,
  saveThermalConfig,
  printThermalTicket,
} from '../../utils/thermalPrinter';
import { DEFAULT_THERMAL_CONFIG } from '../../types/thermal';
import { useSettings } from '../../context/SettingsContext';
import {
  Printer,
  X,
  FileText,
  Flame,
  RotateCcw,
  Check,
  Sliders,
  QrCode,
  Wifi,
  Store,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ThermalTicketBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
  badge?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  badge,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onChange(!checked)}
    onKeyDown={(e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onChange(!checked);
      }
    }}
    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
      checked
        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 text-zinc-950 dark:text-white shadow-xs'
        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
    }`}
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-bold leading-tight">{label}</span>
        {badge && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5 truncate">
          {description}
        </span>
      )}
    </div>
    {/* Animated Pill Switch */}
    <div
      className={`w-9 h-5 rounded-full transition-colors relative shrink-0 p-0.5 ${
        checked ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </div>
  </div>
);

export const ThermalTicketBuilderModal: React.FC<ThermalTicketBuilderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { activeTenant, dispatchToast } = useSettings();

  const [activeTab, setActiveTab] = useState<'receipt' | 'comanda'>('receipt');
  const [mobileViewMode, setMobileViewMode] = useState<'editor' | 'preview'>('editor');
  const [config, setConfig] = useState<ThermalPrintConfig>(() => getThermalConfig());

  useEffect(() => {
    if (isOpen) {
      setConfig(getThermalConfig());
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveThermalConfig(config);
    dispatchToast('Plantilla Guardada', 'La configuración de impresión térmica se guardó con éxito.', 'success');
    onClose();
  };

  const handleReset = () => {
    setConfig(DEFAULT_THERMAL_CONFIG);
    saveThermalConfig(DEFAULT_THERMAL_CONFIG);
    dispatchToast('Valores Restablecidos', 'Se restauró el diseño de fábrica para recibos y comandas.', 'info');
  };

  const sampleOrder = {
    id: 'demo-sample-1',
    orderNumber: '#KH-1028',
    createdAt: new Date().toISOString(),
    customerName: 'Cesar Alexander',
    customerDni: '72849102',
    channel: 'pos-salon' as const,
    tableNumber: 'Mesa 4',
    tenantId: activeTenant.id,
    subtotal: 74.0,
    deliveryFee: 0,
    discount: 5.0,
    total: 69.0,
    items: [
      {
        itemId: 'item-demo-1',
        productId: 'prod-1',
        productName: 'Pizza Americana',
        productImage: '',
        size: { id: 'familiar' as any, name: '08 Tajadas Familiar', slices: 8, price: 45.0 },
        subOptions: [
          { groupId: 'g1', groupName: 'Tipo de Masa', choiceId: 'c1', choiceName: 'Masa Clásica a la Piedra', priceDelta: 0 },
          { groupId: 'g2', groupName: 'Salsa Base', choiceId: 'c2', choiceName: 'Salsa Pizzera Tradicional', priceDelta: 0 },
        ],
        extras: [
          { id: 'e1', name: 'Queso Mozzarella Extra', price: 6.0, quantity: 1 },
        ],
        notes: 'Bien doradita por favor',
        unitPrice: 51.0,
        quantity: 1,
        totalPrice: 51.0,
      },
      {
        itemId: 'item-demo-2',
        productId: 'prod-2',
        productName: 'Gaseosa Inka Cola 1.5L',
        productImage: '',
        subOptions: [],
        extras: [],
        unitPrice: 11.5,
        quantity: 2,
        totalPrice: 23.0,
      },
    ],
  };

  const handleTestPrint = () => {
    printThermalTicket(activeTab, sampleOrder, config);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-xs w-dvw h-dvh max-w-none max-h-none m-0 border-0 outline-hidden"
    >
      <div className="w-[96vw] max-w-[1360px] h-[92vh] rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 id={titleId} className="font-black text-base sm:text-xl text-zinc-950 dark:text-white flex items-center gap-2">
                <span>Constructor de Recibos & Comandas Térmicas</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                  Impresión Térmica 80mm / 58mm
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Personaliza la cabecera fiscal, desglose de ítems, totales, códigos QR y formato de cocina para cualquier ticketera térmica.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar constructor"
            onClick={onClose}
            className="p-2.5 rounded-2xl text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Roll Width Switcher */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('receipt')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'receipt'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>Recibo / Pre-cuenta</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comanda')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'comanda'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span>Comanda Cocina</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-500">Papel:</span>
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setConfig((c: ThermalPrintConfig) => ({ ...c, paperWidth: '80mm' }))}
                  className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                    config.paperWidth === '80mm'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  80 mm
                </button>
                <button
                  type="button"
                  onClick={() => setConfig((c: ThermalPrintConfig) => ({ ...c, paperWidth: '58mm' }))}
                  className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                    config.paperWidth === '58mm'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  58 mm
                </button>
              </div>
            </div>

            {/* Mobile View Toggle Switch (Editor vs Preview) */}
            <div className="flex lg:hidden items-center gap-1 p-1 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMobileViewMode('editor')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  mobileViewMode === 'editor'
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                Ajustes
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('preview')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  mobileViewMode === 'preview'
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                Ticket 🧾
              </button>
            </div>
          </div>
        </div>

        {/* Main Content: 2-Column Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
          {/* LEFT: Configuration Settings Panel */}
          <div className={`lg:col-span-7 p-4 sm:p-6 overflow-y-auto space-y-5 border-r border-zinc-200 dark:border-zinc-800 ${
            mobileViewMode === 'preview' ? 'hidden lg:block' : 'block'
          }`}>
            {activeTab === 'receipt' ? (
              // RECEIPT SETTINGS
              <div className="space-y-5">
                {/* 1. Cabecera & Datos de Empresa */}
                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      <span>1. Cabecera y Razón Social Emisora</span>
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-bold">Datos en el encabezado</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold block text-zinc-500 mb-1">Nombre Comercial</label>
                      <input
                        type="text"
                        value={config.receipt.businessName}
                        onChange={(e) =>
                          setConfig((c: ThermalPrintConfig) => ({
                            ...c,
                            receipt: { ...c.receipt, businessName: e.target.value },
                          }))
                        }
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold block text-zinc-500 mb-1">RUC Emisor</label>
                      <input
                        type="text"
                        value={config.receipt.ruc}
                        onChange={(e) =>
                          setConfig((c: ThermalPrintConfig) => ({
                            ...c,
                            receipt: { ...c.receipt, ruc: e.target.value },
                          }))
                        }
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold block text-zinc-500 mb-1">Slogan / Leyenda</label>
                      <input
                        type="text"
                        value={config.receipt.slogan}
                        onChange={(e) =>
                          setConfig((c: ThermalPrintConfig) => ({
                            ...c,
                            receipt: { ...c.receipt, slogan: e.target.value },
                          }))
                        }
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold block text-zinc-500 mb-1">Dirección del Local</label>
                      <input
                        type="text"
                        value={config.receipt.address}
                        onChange={(e) =>
                          setConfig((c: ThermalPrintConfig) => ({
                            ...c,
                            receipt: { ...c.receipt, address: e.target.value },
                          }))
                        }
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold block text-zinc-500 mb-1">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        value={config.receipt.phone}
                        onChange={(e) =>
                          setConfig((c: ThermalPrintConfig) => ({
                            ...c,
                            receipt: { ...c.receipt, phone: e.target.value },
                          }))
                        }
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <ToggleSwitch
                      checked={config.receipt.showLogo}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showLogo: val },
                        }))
                      }
                      label="Mostrar Logo e Ícono de Pizza"
                      description="Imprime el encabezado decorativo en la parte superior del recibo"
                    />
                  </div>
                </div>

                {/* 2. Metadatos de Orden & Cliente (Modern Toggle Switches) */}
                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span>2. Datos de Orden y Cliente (Interruptores Táctiles)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <ToggleSwitch
                      checked={config.receipt.showOrderNumber}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showOrderNumber: val },
                        }))
                      }
                      label="Nº de Orden"
                      description="Ej: #KH-1028"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showDateTime}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showDateTime: val },
                        }))
                      }
                      label="Fecha y Hora Exacta"
                      description="Timestamp de emisión"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showChannel}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showChannel: val },
                        }))
                      }
                      label="Canal / Mesa"
                      description="Salón (Mesa), Llevar o Delivery"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showCustomer}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showCustomer: val },
                        }))
                      }
                      label="Nombre y DNI Cliente"
                      description="Identificación fiscal del cliente"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showWaiter}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showWaiter: val },
                        }))
                      }
                      label="Mozo / Atendido por"
                      description="Nombre del operador o mozo"
                    />
                  </div>
                </div>

                {/* 3. Desglose de Productos y Opciones */}
                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>3. Desglose de Ítems y Modificadores</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <ToggleSwitch
                      checked={config.receipt.showItemSizes}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showItemSizes: val },
                        }))
                      }
                      label="Tamaño de Pizza"
                      description="Personal, Mediana, Familiar"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showItemModifiers}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showItemModifiers: val },
                        }))
                      }
                      label="Masas, Salsas y Extras"
                      description="Detalla ingredientes opcionales"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showItemNotes}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showItemNotes: val },
                        }))
                      }
                      label="Notas de Preparación"
                      description="Instrucciones del cliente"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showUnitPrice}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showUnitPrice: val },
                        }))
                      }
                      label="Precio Unitario"
                      description="Muestra el valor por unidad"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showSubtotal}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showSubtotal: val },
                        }))
                      }
                      label="Subtotal General"
                      description="Monto antes de impuestos"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showIgvBreakdown}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showIgvBreakdown: val },
                        }))
                      }
                      label="Desglose IGV (18%)"
                      description="Operación gravada e impuesto"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showDiscount}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showDiscount: val },
                        }))
                      }
                      label="Descuentos / Cupones"
                      description="Línea de rebaja aplicada"
                    />
                    <ToggleSwitch
                      checked={config.receipt.showDeliveryFee}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          receipt: { ...c.receipt, showDeliveryFee: val },
                        }))
                      }
                      label="Flete de Delivery"
                      description="Muestra el costo de motorizado"
                    />
                  </div>
                </div>

                {/* 4. Pie de Recibo, WiFi y QR */}
                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    <span>4. Pie de Recibo, Clave WiFi y Código QR</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold block text-zinc-500 mb-1">Mensaje de Despedida</label>
                      <input
                        type="text"
                        value={config.receipt.footerMessage}
                        onChange={(e) =>
                          setConfig((c: ThermalPrintConfig) => ({
                            ...c,
                            receipt: { ...c.receipt, footerMessage: e.target.value },
                          }))
                        }
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold block text-zinc-500 mb-1">Clave de WiFi para Clientes</label>
                      <input
                        type="text"
                        value={config.receipt.wifiInfo}
                        onChange={(e) =>
                          setConfig((c: ThermalPrintConfig) => ({
                            ...c,
                            receipt: { ...c.receipt, wifiInfo: e.target.value },
                          }))
                        }
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div className="pt-1">
                      <ToggleSwitch
                        checked={config.receipt.showQrCode}
                        onChange={(val) =>
                          setConfig((c: ThermalPrintConfig) => ({
                            ...c,
                            receipt: { ...c.receipt, showQrCode: val },
                          }))
                        }
                        label="Imprimir Bloque de Código QR"
                        description="Para pagos con Yape, Plin o validación de comprobante electrónico SUNAT"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // COMANDA SETTINGS
              <div className="space-y-5">
                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    <span>Estación de Comanda y Destino</span>
                  </h4>
                  <div>
                    <label className="text-[11px] font-bold block text-zinc-500 mb-1">Título de la Estación en Papel</label>
                    <select
                      value={config.comanda.headerStation}
                      onChange={(e) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          comanda: { ...c.comanda, headerStation: e.target.value as any },
                        }))
                      }
                      className="w-full text-xs font-bold p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    >
                      <option value="COCINA & HORNO">COCINA & HORNO (General)</option>
                      <option value="HORNO DE PIEDRA">HORNO DE PIEDRA (Maestro Pizzero)</option>
                      <option value="COCINA CALIENTE">COCINA CALIENTE (Alitas / Pastas / Entradas)</option>
                      <option value="BARRA & BEBIDAS">BARRA & BEBIDAS (Despacho Bebidas)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-3.5">
                  <h4 className="font-black text-xs uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>Visibilidad de Cocina / KDS Térmico (Interruptores Táctiles)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <ToggleSwitch
                      checked={config.comanda.showBigOrderNumber}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          comanda: { ...c.comanda, showBigOrderNumber: val },
                        }))
                      }
                      label="Nº de Orden Gigante"
                      description="Fácil lectura para el pizzero"
                    />
                    <ToggleSwitch
                      checked={config.comanda.showTableHighlight}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          comanda: { ...c.comanda, showTableHighlight: val },
                        }))
                      }
                      label="Caja Destacada de Mesa"
                      description="Borde grueso 'MESA 4'"
                    />
                    <ToggleSwitch
                      checked={config.comanda.showChannelBadge}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          comanda: { ...c.comanda, showChannelBadge: val },
                        }))
                      }
                      label="Etiqueta de Canal"
                      description="Salón, Llevar o Delivery"
                    />
                    <ToggleSwitch
                      checked={config.comanda.showOrderTime}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          comanda: { ...c.comanda, showOrderTime: val },
                        }))
                      }
                      label="Hora Exacta de Ingreso"
                      description="Control de tiempo de horneado"
                    />
                    <ToggleSwitch
                      checked={config.comanda.showItemModifiers}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          comanda: { ...c.comanda, showItemModifiers: val },
                        }))
                      }
                      label="Desglose Masas y Salsas"
                      description="Detalles de preparación"
                    />
                    <ToggleSwitch
                      checked={config.comanda.highlightItemNotes}
                      onChange={(val) =>
                        setConfig((c: ThermalPrintConfig) => ({
                          ...c,
                          comanda: { ...c.comanda, highlightItemNotes: val },
                        }))
                      }
                      label="Resaltar Notas de Cocina"
                      description="Fondo gris y mayúsculas"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-2">
                  <label className="text-[11px] font-bold block text-zinc-500">Nota al Pie de Comanda</label>
                  <input
                    type="text"
                    value={config.comanda.footerNote}
                    onChange={(e) =>
                      setConfig((c: ThermalPrintConfig) => ({
                        ...c,
                        comanda: { ...c.comanda, footerNote: e.target.value },
                      }))
                    }
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Live Realistic Thermal Ticket Roll Preview (Ample Room, No Text Clipping) */}
          <div className={`lg:col-span-5 p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-start overflow-y-auto ${
            mobileViewMode === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}>
            <div className="text-center mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Vista Previa Térmica en Vivo ({config.paperWidth})
              </span>
            </div>

            {/* Paper Ticket Simulation */}
            <div
              style={{
                width: config.paperWidth === '58mm' ? '280px' : '360px',
                fontFamily: config.fontFamily === 'monospace' ? "'Courier New', Courier, monospace" : 'system-ui',
              }}
              className="bg-white text-zinc-950 p-5 shadow-2xl rounded-xs border-t-8 border-b-8 border-dashed border-zinc-400 text-xs leading-normal transition-all my-auto max-w-[calc(100vw-48px)]"
            >
              {activeTab === 'receipt' ? (
                // RECEIPT PREVIEW
                <div>
                  {config.receipt.showLogo && (
                    <div className="text-center text-sm font-black tracking-wider mb-1">
                      🍕 KHALESSI PIZZA
                    </div>
                  )}
                  <div className="text-center font-bold text-xs uppercase mb-0.5 break-words">
                    {config.receipt.businessName}
                  </div>
                  {config.receipt.slogan && (
                    <div className="text-center text-[10px] italic text-zinc-600 mb-0.5 break-words">
                      {config.receipt.slogan}
                    </div>
                  )}
                  {config.receipt.ruc && (
                    <div className="text-center text-[10px]">{config.receipt.ruc}</div>
                  )}
                  {config.receipt.address && (
                    <div className="text-center text-[9px] text-zinc-600 break-words">{config.receipt.address}</div>
                  )}
                  {config.receipt.phone && (
                    <div className="text-center text-[9px] text-zinc-600 mb-2">{config.receipt.phone}</div>
                  )}

                  <div className="border-t border-b border-dashed border-zinc-900 py-1.5 my-2 text-[10px] space-y-0.5">
                    {config.receipt.showOrderNumber && (
                      <div className="flex justify-between font-bold">
                        <span>ORDEN:</span>
                        <span>#KH-1028</span>
                      </div>
                    )}
                    {config.receipt.showDateTime && (
                      <div className="flex justify-between">
                        <span>FECHA:</span>
                        <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {config.receipt.showChannel && (
                      <div className="flex justify-between">
                        <span>CANAL:</span>
                        <span className="font-bold">SALÓN (Mesa 4)</span>
                      </div>
                    )}
                    {config.receipt.showCustomer && (
                      <div className="flex justify-between">
                        <span>CLIENTE:</span>
                        <span>Cesar Alexander (72849102)</span>
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <div className="py-1 space-y-2 text-[10px]">
                    <div className="flex justify-between font-bold border-b border-zinc-900 pb-0.5">
                      <span>CANT. DESCRIPCIÓN</span>
                      <span className="shrink-0 ml-2">TOTAL</span>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between font-bold">
                          <span>1x Pizza Americana</span>
                          <span className="shrink-0 ml-2">S/ 51.00</span>
                        </div>
                        {config.receipt.showItemSizes && (
                          <div className="text-[9px] text-zinc-600 pl-2">· 08 Tajadas Familiar</div>
                        )}
                        {config.receipt.showItemModifiers && (
                          <div className="text-[9px] text-zinc-600 pl-2 leading-tight">
                            • Tipo de Masa: Masa Clásica<br />
                            • Salsa: Pizzera Tradicional<br />
                            + Queso Mozzarella Extra (+S/ 6.00)
                          </div>
                        )}
                        {config.receipt.showItemNotes && (
                          <div className="text-[9px] italic text-zinc-500 pl-2">Nota: Bien doradita por favor</div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between font-bold">
                          <span>2x Gaseosa Inka Cola 1.5L</span>
                          <span className="shrink-0 ml-2">S/ 23.00</span>
                        </div>
                        {config.receipt.showUnitPrice && (
                          <div className="text-[9px] text-zinc-600 pl-2">S/ 11.50 c/u</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t border-dashed border-zinc-900 pt-1.5 mt-2 space-y-0.5 text-[10px]">
                    {config.receipt.showSubtotal && (
                      <div className="flex justify-between">
                        <span>SUBTOTAL:</span>
                        <span>S/ 74.00</span>
                      </div>
                    )}
                    {config.receipt.showIgvBreakdown && (
                      <div className="flex justify-between text-zinc-600">
                        <span>OP. GRAVADA / IGV (18%):</span>
                        <span>S/ 11.29</span>
                      </div>
                    )}
                    {config.receipt.showDiscount && (
                      <div className="flex justify-between text-zinc-600">
                        <span>DESCUENTO:</span>
                        <span>- S/ 5.00</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-xs border-t border-zinc-900 pt-1 mt-1">
                      <span>TOTAL A PAGAR:</span>
                      <span>S/ 69.00</span>
                    </div>
                  </div>

                  {/* Footer Message & QR */}
                  <div className="border-t border-dashed border-zinc-900 pt-2 mt-2 text-center text-[9px] space-y-1">
                    {config.receipt.wifiInfo && <div className="break-words">{config.receipt.wifiInfo}</div>}
                    {config.receipt.footerMessage && (
                      <div className="font-bold break-words">{config.receipt.footerMessage}</div>
                    )}
                    {config.receipt.showQrCode && (
                      <div className="mt-2 p-2 border border-zinc-900 inline-block font-mono text-[8px] font-bold">
                        [ CÓDIGO QR SUNAT / YAPE ]<br />
                        KH-PAGOS-1028
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // COMANDA PREVIEW
                <div>
                  <div className="text-center font-black text-xs border-b-2 border-zinc-900 pb-1 mb-1">
                    *** COMANDA DE {config.comanda.headerStation} ***
                  </div>
                  {config.comanda.showBigOrderNumber && (
                    <div className="text-center font-black text-2xl my-1">
                      #KH-1028
                    </div>
                  )}
                  {config.comanda.showTableHighlight && (
                    <div className="text-center my-1.5">
                      <span className="font-black text-sm px-4 py-0.5 border-2 border-zinc-900 inline-block">
                        MESA 4 (SALÓN)
                      </span>
                    </div>
                  )}

                  <div className="border-b border-dashed border-zinc-900 py-1 my-1 text-[10px] space-y-0.5">
                    {config.comanda.showOrderTime && (
                      <div className="flex justify-between">
                        <span>HORA:</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                      </div>
                    )}
                    {config.comanda.showChannelBadge && (
                      <div className="flex justify-between font-bold">
                        <span>CANAL:</span>
                        <span>SALÓN</span>
                      </div>
                    )}
                    <div>CLIENTE: Cesar Alexander</div>
                  </div>

                  <div className="py-2 space-y-2 text-xs">
                    <div className="border-b border-dashed border-zinc-400 pb-1.5">
                      <div className="font-black text-xs">
                        1x Pizza Americana (08 Tajadas Familiar)
                      </div>
                      {config.comanda.showItemModifiers && (
                        <div className="text-[10px] text-zinc-700 pl-2 font-medium leading-tight mt-0.5">
                          • Tipo de Masa: Masa Clásica<br />
                          • Salsa: Pizzera Tradicional<br />
                          + Queso Mozzarella Extra (x1)
                        </div>
                      )}
                      {config.comanda.highlightItemNotes && (
                        <div className="mt-1 p-1 bg-zinc-200 border-l-2 border-zinc-900 text-[10px] font-black">
                          ⚠️ NOTA: BIEN DORADITA POR FAVOR
                        </div>
                      )}
                    </div>

                    <div className="border-b border-dashed border-zinc-400 pb-1.5">
                      <div className="font-black text-xs">
                        2x Gaseosa Inka Cola 1.5L
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-zinc-900 pt-2 text-center text-[9px] italic text-zinc-600 break-words">
                    {config.comanda.footerNote}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Single line, whitespace-nowrap shrink-0) */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restablecer Fábrica</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestPrint}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2 whitespace-nowrap shrink-0 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-500" />
              <span>Imprimir Ticket de Prueba</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
