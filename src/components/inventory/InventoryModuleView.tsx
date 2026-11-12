import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { InventoryItem, InventoryLot, MovementType, WasteReason } from '../../types/inventory';
import { RecipeEditor } from './RecipeEditor';
import { PurchasesPanel } from './PurchasesPanel';
import { TransfersPanel } from './TransfersPanel';
import { AuditPanel } from './AuditPanel';
import { ReportsPanel } from './ReportsPanel';
import { LabelDesigner } from './LabelDesigner';
import { ScanInput } from './ScanInput';
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Layers,
  ChefHat,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardCheck,
  BarChart3,
  Printer,
  Sparkles,
  AlertTriangle,
  History,
  Tag,
  Search,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

type InventoryTabId = 'stock' | 'lots' | 'kardex' | 'production' | 'recipes' | 'purchases' | 'transfers' | 'audit' | 'reports';

export const InventoryModuleView: React.FC = () => {
  const {
    items,
    stockLevels,
    lots,
    movements,
    saveItem,
    deleteItem,
    registerMovement,
    registerProductionBatch,
    getItemStock,
    getItemAvgCost,
    getExpiringLotsSummary,
  } = useInventory();

  const { activeTenant, tenants, dispatchToast, openNoticeModal } = useSettings();
  const { hasPermission } = useRBAC();

  const [activeTab, setActiveTab] = useState<InventoryTabId>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Label Designer Modal
  const [labelModalData, setLabelModalData] = useState<{ item: InventoryItem; lot?: InventoryLot } | null>(null);

  // New Item Modal
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemData, setEditingItemData] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'masas',
    unit: 'kg',
    costPerUnit: 1,
    minStock: 10,
    reorderPoint: 20,
    trackLots: true,
    enabled: true,
  });

  // Manual Movement Modal (Ingreso / Merma / Ajuste)
  const [movementModal, setMovementModal] = useState<{
    isOpen: boolean;
    item?: InventoryItem;
    type: MovementType;
  }>({ isOpen: false, type: 'ingreso' });
  const [movQty, setMovQty] = useState<number>(1);
  const [movCost, setMovCost] = useState<number>(0);
  const [movReason, setMovReason] = useState<WasteReason>('error_cocina');
  const [movNote, setMovNote] = useState('');

  // Production batch state
  const [prodItem, setProdItem] = useState<string>(items.find(i => i.isPrepared)?.id || '');
  const [prodQty, setProdQty] = useState<number>(10);
  const [prodNotes, setProdNotes] = useState('');

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.includes(searchTerm);
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const expiringSummary = getExpiringLotsSummary();

  const handleScanCode = (code: string) => {
    // 1. Try finding by lot code
    const lotFound = lots.find(l => l.code === code);
    if (lotFound) {
      const itm = items.find(i => i.id === lotFound.itemId);
      if (itm) {
        dispatchToast('Lote Identificado', `Lote: ${lotFound.code} • ${itm.name} (Stock: ${lotFound.quantity} ${itm.unit})`, 'info');
        setLabelModalData({ item: itm, lot: lotFound });
        return;
      }
    }

    // 2. Try finding by item barcode or SKU
    const itemFound = items.find(i => i.barcode === code || i.sku === code);
    if (itemFound) {
      setSearchTerm(itemFound.name);
      dispatchToast('Insumo Encontrado', `${itemFound.name} (Stock: ${getItemStock(itemFound.id)} ${itemFound.unit})`, 'success');
      return;
    }

    dispatchToast('Código No Registrado', `El código "${code}" no coincide con ningún insumo o lote activo.`, 'warning');
  };

  const handleSaveItem = () => {
    if (!editingItemData.name?.trim()) {
      dispatchToast('Campo Obligatorio', 'El insumo debe tener un nombre representativo.', 'error');
      return;
    }

    const itemToSave: InventoryItem = {
      id: editingItemData.id || `item-${Date.now()}`,
      sku: editingItemData.sku || `KH-${(editingItemData.category || 'GEN').substring(0, 3).toUpperCase()}-${String(items.length + 1).padStart(3, '0')}`,
      barcode: editingItemData.barcode || `775${Date.now().toString().slice(-10)}`,
      name: editingItemData.name.trim(),
      category: editingItemData.category || 'masas',
      unit: editingItemData.unit || 'kg',
      costPerUnit: editingItemData.costPerUnit || 1,
      minStock: editingItemData.minStock || 5,
      reorderPoint: editingItemData.reorderPoint || 10,
      shelfLifeDays: editingItemData.shelfLifeDays,
      isPrepared: editingItemData.isPrepared ?? false,
      trackLots: editingItemData.trackLots ?? true,
      supplierIds: editingItemData.supplierIds || [],
      enabled: true,
      description: editingItemData.description?.trim(),
    };

    saveItem(itemToSave);
    setIsEditingItem(false);
  };

  const handleConfirmMovement = () => {
    if (!movementModal.item) return;

    const qty = movementModal.type === 'ingreso' ? Math.abs(movQty) : -Math.abs(movQty);

    registerMovement({
      itemId: movementModal.item.id,
      type: movementModal.type,
      quantity: qty,
      unitCost: movCost > 0 ? movCost : undefined,
      wasteReason: movementModal.type === 'merma' ? movReason : undefined,
      note: movNote.trim() || undefined,
    });

    setMovementModal({ isOpen: false, type: 'ingreso' });
    setMovQty(1);
    setMovCost(0);
    setMovNote('');
  };

  const handleExecuteProduction = () => {
    const targetItem = items.find(i => i.id === prodItem);
    if (!targetItem) return;

    // Default recipe for batch: 1 und masa = 0.25 kg harina + 0.05 g levadura
    const lines = [
      { itemId: 'item-harina-00', qty: prodQty * 0.22 },
      { itemId: 'item-albahaca-fresca', qty: prodQty * 0.01 },
    ];

    const newLot = registerProductionBatch({
      preparedItemId: targetItem.id,
      producedQty: prodQty,
      ingredientLines: lines,
      notes: prodNotes.trim() || undefined,
    });

    setLabelModalData({ item: targetItem, lot: newLot });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Navigation */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Boxes className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              Inventario, Recetas & Trazabilidad
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Control de existencias multisede, escandallos BOM, rotación FEFO, compras y etiquetas térmicas.
            </p>
          </div>
        </div>

        {/* Global Barcode / QR Scanner Input */}
        <div className="w-full md:w-80">
          <ScanInput onScan={handleScanCode} />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'stock', label: 'Existencias & Almacén', icon: Boxes },
          { id: 'lots', label: `Lotes FEFO ${expiringSummary.expired.length > 0 ? `(${expiringSummary.expired.length} Vencidos)` : ''}`, icon: Layers },
          { id: 'kardex', label: 'Kardex & Mermas', icon: History },
          { id: 'production', label: 'Producción de Masas', icon: Sparkles },
          { id: 'recipes', label: 'Escandallos BOM', icon: ChefHat },
          { id: 'purchases', label: 'Compras & Proveedores', icon: ShoppingCart },
          { id: 'transfers', label: 'Transferencias Sedes', icon: ArrowLeftRight },
          { id: 'audit', label: 'Auditoría Física', icon: ClipboardCheck },
          { id: 'reports', label: 'Reportes & Métricas', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as InventoryTabId)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STOCK & ALMACÉN */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Controls: Search, Categories, New Insumo */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar insumo o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold"
              >
                <option value="all">Todas las categorías</option>
                <option value="masas">Masas & Harinas</option>
                <option value="quesos">Quesos</option>
                <option value="salsas">Salsas</option>
                <option value="toppings">Toppings & Embutidos</option>
                <option value="empaques">Empaques & Cajas</option>
                <option value="bebidas">Bebidas</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingItemData({
                  name: '',
                  category: 'masas',
                  unit: 'kg',
                  costPerUnit: 1,
                  minStock: 10,
                  reorderPoint: 20,
                  trackLots: true,
                  enabled: true,
                });
                setIsEditingItem(true);
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Insumo
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-4">Insumo / SKU</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Stock Actual</th>
                  <th className="p-4">Mínimo / Reorden</th>
                  <th className="p-4">Costo Promedio</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredItems.map(item => {
                  const stock = getItemStock(item.id);
                  const avgCost = getItemAvgCost(item.id);
                  const isLow = stock <= item.minStock;
                  const isOut = stock <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          {item.name}
                          {item.isPrepared && (
                            <span className="text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">
                              Preparado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          SKU: {item.sku} • Barra: {item.barcode}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold capitalize text-zinc-600 dark:text-zinc-400">
                        {item.category}
                      </td>
                      <td className="p-4 font-mono font-bold text-xs">
                        <span className={`text-base ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-zinc-900 dark:text-white'}`}>
                          {stock}
                        </span> {item.unit}
                      </td>
                      <td className="p-4 text-xs font-mono text-zinc-500">
                        Min: {item.minStock} / Reorden: {item.reorderPoint}
                      </td>
                      <td className="p-4 text-xs font-mono font-semibold text-zinc-900 dark:text-white">
                        S/ {avgCost.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isOut
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : isLow
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isOut ? 'Agotado' : isLow ? 'Stock Bajo' : 'Óptimo'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Ingreso de Stock"
                            onClick={() => {
                              setMovementModal({ isOpen: true, item, type: 'ingreso' });
                              setMovCost(item.costPerUnit);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          >
                            <ArrowDownLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Registrar Merma"
                            onClick={() => {
                              setMovementModal({ isOpen: true, item, type: 'merma' });
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          >
                            <TrendingDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Imprimir Etiquetas Adhesivas"
                            onClick={() => setLabelModalData({ item })}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LOTES FEFO */}
      {activeTab === 'lots' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block mb-1">Vencidos</span>
              <span className="text-2xl font-black font-mono text-rose-700 dark:text-rose-300">
                {expiringSummary.expired.length} lotes
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1">Vencen Hoy / 24h</span>
              <span className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300">
                {expiringSummary.today.length + expiringSummary.in1Day.length} lotes
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1">Vencen en 48h - 72h</span>
              <span className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300">
                {expiringSummary.in2Days.length + expiringSummary.in3Days.length} lotes
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Lotes Óptimos</span>
              <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                {lots.filter(l => l.quantity > 0).length} en total
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-4">Código Lote</th>
                  <th className="p-4">Insumo</th>
                  <th className="p-4">Stock Restante</th>
                  <th className="p-4">Elaboración</th>
                  <th className="p-4">Vencimiento</th>
                  <th className="p-4">Origen</th>
                  <th className="p-4 text-right">Etiqueta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {lots.filter(l => l.quantity > 0).map(lot => {
                  const itm = items.find(i => i.id === lot.itemId);
                  const isExp = lot.expiresAt && new Date(lot.expiresAt).getTime() < Date.now();

                  return (
                    <tr key={lot.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                        {lot.code}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">{itm?.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{itm?.sku}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-xs">
                        {lot.quantity} / {lot.initialQuantity} {itm?.unit}
                      </td>
                      <td className="p-4 text-xs text-zinc-500">
                        {new Date(lot.producedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-xs font-semibold">
                        <span className={isExp ? 'text-rose-500 font-bold' : 'text-zinc-700 dark:text-zinc-300'}>
                          {lot.expiresAt ? new Date(lot.expiresAt).toLocaleDateString() : 'Sin caducidad'}
                        </span>
                      </td>
                      <td className="p-4 capitalize text-xs text-zinc-500">
                        {lot.source}
                      </td>
                      <td className="p-4 text-right">
                        {itm && (
                          <button
                            type="button"
                            onClick={() => setLabelModalData({ item: itm, lot })}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto whitespace-nowrap shrink-0 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: KARDEX & MERMAS */}
      {activeTab === 'kardex' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4">Fecha & Hora</th>
                <th className="p-4">Insumo</th>
                <th className="p-4">Tipo Movimiento</th>
                <th className="p-4">Cantidad</th>
                <th className="p-4">Costo U.</th>
                <th className="p-4">Responsable / Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-zinc-400">
                    No hay movimientos registrados en el kardex.
                  </td>
                </tr>
              ) : (
                movements.map(m => {
                  const itm = items.find(i => i.id === m.itemId);
                  const isPositive = m.quantity > 0;

                  return (
                    <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-xs text-zinc-500 font-mono">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">{itm?.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{itm?.sku}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          m.type === 'ingreso' || m.type === 'produccion_in' || m.type === 'reposicion'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : m.type === 'merma'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-zinc-500/10 text-zinc-600'
                        }`}>
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-xs">
                        <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                          {isPositive ? `+${m.quantity}` : m.quantity} {itm?.unit}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-zinc-500">
                        S/ {m.unitCost.toFixed(2)}
                      </td>
                      <td className="p-4 text-xs text-zinc-600 dark:text-zinc-400">
                        <div>{m.note || '--'}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">Por: {m.userName}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: PRODUCCIÓN DE MASAS */}
      {activeTab === 'production' && (
        <div className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                Registro de Lote de Producción Interna
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Transforma harina y levadura en bollos de masa madre fermentada con etiqueta térmica y código QR FEFO.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Producto / Masa a Elaborar
              </label>
              <select
                value={prodItem}
                onChange={(e) => setProdItem(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold"
              >
                {items.filter(i => i.isPrepared).map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Cantidad Producida
                </label>
                <input
                  type="number"
                  min="1"
                  value={prodQty}
                  onChange={(e) => setProdQty(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Vida Útil (Días en Cámara)
                </label>
                <input
                  type="number"
                  value={3}
                  disabled
                  className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Notas de Horneado / Temperatura de Fermentación
              </label>
              <input
                type="text"
                placeholder="ej. Fermentación 48h a 18°C en cámara fría..."
                value={prodNotes}
                onChange={(e) => setProdNotes(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
              />
            </div>

            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl text-xs space-y-1 text-purple-700 dark:text-purple-300">
              <div className="font-bold">Consumo Automático de Ingredientes:</div>
              <div>• ~{(prodQty * 0.22).toFixed(2)} kg Harina 00 Caputo</div>
              <div>• ~{(prodQty * 0.01).toFixed(2)} g Albahaca / Aromáticas</div>
            </div>

            <button
              type="button"
              onClick={handleExecuteProduction}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Producir Lote & Generar Etiquetas Adhesivas
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: ESCANDALLOS BOM */}
      {activeTab === 'recipes' && (
        <RecipeEditor />
      )}

      {/* TAB 6: COMPRAS & PROVEEDORES */}
      {activeTab === 'purchases' && (
        <PurchasesPanel />
      )}

      {/* TAB 7: TRANSFERENCIAS */}
      {activeTab === 'transfers' && (
        <TransfersPanel />
      )}

      {/* TAB 8: AUDITORÍA */}
      {activeTab === 'audit' && (
        <AuditPanel />
      )}

      {/* TAB 9: REPORTES */}
      {activeTab === 'reports' && (
        <ReportsPanel />
      )}

      {/* MODAL: ETIQUETAS ADHESIVAS (DESIGNER) */}
      {labelModalData && (
        <LabelDesigner
          item={labelModalData.item}
          lot={labelModalData.lot}
          isOpen={Boolean(labelModalData)}
          onClose={() => setLabelModalData(null)}
        />
      )}

      {/* MODAL: CREAR / EDITAR INSUMO */}
      {isEditingItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-4">
              {editingItemData.id ? 'Editar Insumo' : 'Nuevo Insumo de Cocina'}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Nombre del Insumo</label>
                <input
                  type="text"
                  placeholder="ej. Queso Fior di Latte Artesanal"
                  value={editingItemData.name || ''}
                  onChange={(e) => setEditingItemData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Categoría</label>
                  <select
                    value={editingItemData.category || 'masas'}
                    onChange={(e) => setEditingItemData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="masas">Masas & Harinas</option>
                    <option value="quesos">Quesos</option>
                    <option value="salsas">Salsas</option>
                    <option value="toppings">Toppings</option>
                    <option value="empaques">Empaques</option>
                    <option value="bebidas">Bebidas</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Unidad de Medida</label>
                  <select
                    value={editingItemData.unit || 'kg'}
                    onChange={(e) => setEditingItemData(prev => ({ ...prev, unit: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="g">Gramos (g)</option>
                    <option value="l">Litros (l)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="und">Unidades (und)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Costo Unitario</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItemData.costPerUnit || 0}
                    onChange={(e) => setEditingItemData(prev => ({ ...prev, costPerUnit: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={editingItemData.minStock || 0}
                    onChange={(e) => setEditingItemData(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Pto. Reorden</label>
                  <input
                    type="number"
                    value={editingItemData.reorderPoint || 0}
                    onChange={(e) => setEditingItemData(prev => ({ ...prev, reorderPoint: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItemData.trackLots ?? true}
                    onChange={(e) => setEditingItemData(prev => ({ ...prev, trackLots: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-amber-500/20"
                  />
                  Controlar Lotes & Vencimiento (FEFO)
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItemData.isPrepared ?? false}
                    onChange={(e) => setEditingItemData(prev => ({ ...prev, isPrepared: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-amber-500/20"
                  />
                  Es Preparado Interno (Masa/Salsa)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsEditingItem(false)}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-600/20 whitespace-nowrap shrink-0 transition-all"
              >
                Guardar Insumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO MANUAL DE MOVIMIENTO (INGRESO / MERMA) */}
      {movementModal.isOpen && movementModal.item && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-1 capitalize">
              {movementModal.type === 'ingreso' ? 'Registrar Ingreso Manual' : 'Registrar Merma / Pérdida'}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              {movementModal.item.name} ({movementModal.item.unit})
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Cantidad ({movementModal.item.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={movQty}
                  onChange={(e) => setMovQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold"
                />
              </div>

              {movementModal.type === 'ingreso' && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Costo Unitario (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={movCost}
                    onChange={(e) => setMovCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono"
                  />
                </div>
              )}

              {movementModal.type === 'merma' && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Causa de la Merma</label>
                  <select
                    value={movReason}
                    onChange={(e) => setMovReason(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="error_cocina">Error en Cocina / Quema de masa</option>
                    <option value="caducidad">Vencimiento / Caducidad</option>
                    <option value="devolucion">Devolución de cliente</option>
                    <option value="temperatura">Pérdida de cadena de frío</option>
                    <option value="rotura">Rotura / Accidente físico</option>
                    <option value="otro">Otro motivo</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Detalle / Justificación</label>
                <input
                  type="text"
                  placeholder="ej. Sobrante no aprovechable tras servicio..."
                  value={movNote}
                  onChange={(e) => setMovNote(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setMovementModal({ isOpen: false, type: 'ingreso' })}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMovement}
                className={`px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg whitespace-nowrap shrink-0 transition-all ${
                  movementModal.type === 'ingreso'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                Registrar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
