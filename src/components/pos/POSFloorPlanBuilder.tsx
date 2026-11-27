import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import {
  RestaurantTable,
  FloorPlanFixture,
  FloorFixtureType,
  Order,
} from '../../types/catalog';
import { NoticeModalOptions } from '../../types/settings';
import {
  LayoutGrid,
  Map as MapIcon,
  Wrench,
  Plus,
  QrCode,
  Users,
  Edit2,
  Trash2,
  RotateCw,
  DoorOpen,
  LogOut,
  Bath,
  Wine,
  ChefHat,
  Monitor,
  Minus,
  RotateCcw,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  Move,
  Building2,
  X,
} from 'lucide-react';

const FIXTURES_STORAGE_KEY = 'kh_floor_plan_fixtures_v1';
export const FLOOR_ZONES_STORAGE_KEY = 'kh_floor_zones_v1';

export interface BranchFloorZonesRecord {
  /** Lista ordenada de pisos / ambientes configurados por sucursal */
  zonesByTenant: Record<string, string[]>;
  /** Registro de pisos cuyo plano base ya fue inicializado (evita re-crear detalles eliminados) */
  seededZones: Record<string, boolean>;
}

export function loadBranchFloorZonesRecord(): BranchFloorZonesRecord {
  try {
    const raw = localStorage.getItem(FLOOR_ZONES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          zonesByTenant:
            parsed.zonesByTenant && typeof parsed.zonesByTenant === 'object'
              ? parsed.zonesByTenant
              : {},
          seededZones:
            parsed.seededZones && typeof parsed.seededZones === 'object'
              ? parsed.seededZones
              : {},
        };
      }
    }
  } catch {
    // ignore
  }
  return { zonesByTenant: {}, seededZones: {} };
}

export function saveBranchFloorZonesRecord(record: BranchFloorZonesRecord): void {
  try {
    localStorage.setItem(FLOOR_ZONES_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

interface POSFloorPlanBuilderProps {
  tenantId: string;
  tenantName: string;
  branchTables: RestaurantTable[];
  visibleTables: RestaurantTable[];
  availableZones: string[];
  activeZoneFilter: string;
  onChangeZoneFilter: (zone: string) => void;
  selectedTable: RestaurantTable | null;
  activeSalonOrdersByTable: Map<string, Order>;
  isBuilderMode: boolean;
  onToggleBuilderMode: () => void;
  onSelectTable: (table: RestaurantTable, activeOrder: Order | undefined) => void;
  onOpenTableOps: (tableId: string) => void;
  onOpenCreateTable: () => void;
  onOpenEditTable: (table: RestaurantTable) => void;
  onConfirmDeleteTable: (table: RestaurantTable) => void;
  onUpdateTable: (table: RestaurantTable) => void;
  onMoveTableOrder: (tableId: string, dir: 'prev' | 'next') => void;
  onMarkOrderServed: (orderId: string) => void;
  onOpenQrModal: (initialTableId: string | null) => void;
  onCreateZone: (zoneName: string, includeDefaultFixtures: boolean) => void;
  onRenameZone: (oldName: string, newName: string) => void;
  onDeleteZone: (zoneName: string) => void;
  openNoticeModal: (opts: NoticeModalOptions) => void;
  dispatchToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const FIXTURE_CATALOG: Array<{
  type: FloorFixtureType;
  label: string;
  defaultLabel: string;
  defaultSize: 'sm' | 'md' | 'lg' | 'xl';
  icon: React.FC<{ className?: string }>;
}> = [
  {
    type: 'entrance',
    label: 'Puerta Entrada',
    defaultLabel: 'Puerta Entrada',
    defaultSize: 'md',
    icon: DoorOpen,
  },
  {
    type: 'exit',
    label: 'Puerta Salida',
    defaultLabel: 'Puerta Salida',
    defaultSize: 'md',
    icon: LogOut,
  },
  {
    type: 'bar',
    label: 'Barra / Bar',
    defaultLabel: 'Barra & Bebidas',
    defaultSize: 'lg',
    icon: Wine,
  },
  {
    type: 'restroom',
    label: 'Baños SS.HH.',
    defaultLabel: 'Baños SS.HH.',
    defaultSize: 'md',
    icon: Bath,
  },
  {
    type: 'kitchen',
    label: 'Cocina / Horno',
    defaultLabel: 'Pase Cocina / Horno',
    defaultSize: 'lg',
    icon: ChefHat,
  },
  {
    type: 'cashier',
    label: 'Caja POS',
    defaultLabel: 'Caja POS',
    defaultSize: 'md',
    icon: Monitor,
  },
  {
    type: 'wall',
    label: 'Muro / División',
    defaultLabel: 'Muro Divisor',
    defaultSize: 'lg',
    icon: Minus,
  },
];

export function buildDefaultFixturesForZone(tenantId: string, zone: string): FloorPlanFixture[] {
  const z = zone === 'todas' ? 'Salón Principal' : zone;
  const prefix = `fix-${tenantId}-${z.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return [
    {
      id: `${prefix}-entrance`,
      tenantId,
      zone: z,
      type: 'entrance',
      label: 'Puerta Entrada',
      x: 20,
      y: 91,
      size: 'md',
      rotation: 0,
    },
    {
      id: `${prefix}-exit`,
      tenantId,
      zone: z,
      type: 'exit',
      label: 'Puerta Salida',
      x: 80,
      y: 91,
      size: 'md',
      rotation: 0,
    },
    {
      id: `${prefix}-bar`,
      tenantId,
      zone: z,
      type: 'bar',
      label: 'Barra & Bebidas',
      x: 25,
      y: 12,
      size: 'lg',
      rotation: 0,
    },
    {
      id: `${prefix}-kitchen`,
      tenantId,
      zone: z,
      type: 'kitchen',
      label: 'Pase Cocina / Horno',
      x: 57,
      y: 11,
      size: 'lg',
      rotation: 0,
    },
    {
      id: `${prefix}-restroom`,
      tenantId,
      zone: z,
      type: 'restroom',
      label: 'Baños SS.HH.',
      x: 86,
      y: 13,
      size: 'md',
      rotation: 0,
    },
    {
      id: `${prefix}-cashier`,
      tenantId,
      zone: z,
      type: 'cashier',
      label: 'Caja POS',
      x: 11,
      y: 52,
      size: 'md',
      rotation: 0,
    },
  ];
}

function loadAllFixtures(): FloorPlanFixture[] {
  try {
    const raw = localStorage.getItem(FIXTURES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function getDefaultTablePosition(index: number, total: number): { x: number; y: number } {
  const cols = total <= 4 ? 2 : total <= 9 ? 3 : 4;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const totalRows = Math.max(1, Math.ceil(total / cols));

  const xSpan = 60;
  const xStart = 26;
  const x = xStart + (col / Math.max(1, cols - 1)) * xSpan;

  const ySpan = 46;
  const yStart = 32;
  const y = totalRows === 1 ? 54 : yStart + (row / Math.max(1, totalRows - 1)) * ySpan;

  return {
    x: Math.round(Math.max(16, Math.min(86, x))),
    y: Math.round(Math.max(26, Math.min(78, y))),
  };
}

function formatElapsedMinutes(createdAtIso?: string): string {
  if (!createdAtIso) return '';
  const diffMs = Date.now() - new Date(createdAtIso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return '1m';
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins}m`;
}

export const POSFloorPlanBuilder: React.FC<POSFloorPlanBuilderProps> = ({
  tenantId,
  tenantName,
  branchTables,
  visibleTables,
  availableZones,
  activeZoneFilter,
  onChangeZoneFilter,
  selectedTable,
  activeSalonOrdersByTable,
  isBuilderMode,
  onToggleBuilderMode,
  onSelectTable,
  onOpenTableOps,
  onOpenCreateTable,
  onOpenEditTable,
  onConfirmDeleteTable,
  onUpdateTable,
  onMoveTableOrder,
  onMarkOrderServed,
  onOpenQrModal,
  onCreateZone,
  onRenameZone,
  onDeleteZone,
  openNoticeModal,
  dispatchToast,
}) => {
  const [viewMode, setViewMode] = useState<'blueprint' | 'grid'>('blueprint');
  const [allFixtures, setAllFixtures] = useState<FloorPlanFixture[]>(() => loadAllFixtures());
  const [selectedEntity, setSelectedEntity] = useState<
    { kind: 'table'; id: string } | { kind: 'fixture'; id: string } | null
  >(null);

  // Floor / Zone Modal state (Create or Rename Piso/Ambiente)
  const zoneDialogRef = useRef<HTMLDialogElement>(null);
  const zoneDialogTitleId = useId();
  const [zoneModalMode, setZoneModalMode] = useState<'create' | 'edit' | null>(null);
  const [zoneNameInput, setZoneNameInput] = useState('');
  const [zoneTargetOldName, setZoneTargetOldName] = useState('');
  const [includeDefaultFixturesOnNewZone, setIncludeDefaultFixturesOnNewZone] = useState(true);

  useEffect(() => {
    const dlg = zoneDialogRef.current;
    if (!dlg) return;
    if (zoneModalMode) {
      if (!dlg.open) {
        try {
          dlg.showModal();
        } catch {
          // ignore
        }
      }
    } else if (dlg.open) {
      dlg.close();
    }
  }, [zoneModalMode]);

  // Live position overrides while dragging
  const [dragCoords, setDragCoords] = useState<{
    kind: 'table' | 'fixture';
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<{
    kind: 'table' | 'fixture';
    id: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    offsetXPercent: number;
    offsetYPercent: number;
    hasMoved: boolean;
    captured: boolean;
  } | null>(null);

  const effectiveZone =
    activeZoneFilter === 'todas'
      ? availableZones[0] || 'Salón Principal'
      : activeZoneFilter;

  // In 2D Blueprint mode, only show tables belonging to the active floor (`effectiveZone`)
  // so tables from different floors don't stack on top of each other.
  const blueprintTables = useMemo(() => {
    if (activeZoneFilter === 'todas') {
      return visibleTables;
    }
    return branchTables.filter((t) => t.zone === effectiveZone);
  }, [activeZoneFilter, visibleTables, branchTables, effectiveZone]);

  // Sync fixtures across tabs & SSE
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FIXTURES_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setAllFixtures(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persistFixtures = (updater: (prev: FloorPlanFixture[]) => FloorPlanFixture[]) => {
    setAllFixtures((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(FIXTURES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Seed default architectural fixtures ONLY ONCE per (tenantId + zone) so user deletions are permanent
  useEffect(() => {
    const record = loadBranchFloorZonesRecord();
    const seedKey = `${tenantId}::${effectiveZone}`;
    if (record.seededZones[seedKey]) return;

    const alreadyHasFixtures = allFixtures.some(
      (f) => f.tenantId === tenantId && f.zone === effectiveZone
    );
    record.seededZones[seedKey] = true;
    saveBranchFloorZonesRecord(record);

    if (!alreadyHasFixtures) {
      const seeded = buildDefaultFixturesForZone(tenantId, effectiveZone);
      persistFixtures((prev) => {
        if (prev.some((f) => f.tenantId === tenantId && f.zone === effectiveZone)) return prev;
        return [...prev, ...seeded];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, effectiveZone]);

  const zoneFixtures = useMemo(() => {
    return allFixtures.filter((f) => f.tenantId === tenantId && f.zone === effectiveZone);
  }, [allFixtures, tenantId, effectiveZone]);

  const handleAddFixture = (type: FloorFixtureType) => {
    const meta = FIXTURE_CATALOG.find((c) => c.type === type) || FIXTURE_CATALOG[0];
    const countSame = zoneFixtures.filter((f) => f.type === type).length;
    const newFixture: FloorPlanFixture = {
      id: `fix-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      zone: effectiveZone,
      type,
      label: countSame > 0 ? `${meta.defaultLabel} ${countSame + 1}` : meta.defaultLabel,
      x: 50,
      y: type === 'entrance' || type === 'exit' ? 88 : 22,
      size: meta.defaultSize,
      rotation: 0,
    };
    persistFixtures((prev) => [...prev, newFixture]);
    setSelectedEntity({ kind: 'fixture', id: newFixture.id });
    dispatchToast('Detalle Agregado', `"${newFixture.label}" añadido a ${effectiveZone}.`, 'success');
  };

  const handleUpdateFixture = (id: string, patch: Partial<FloorPlanFixture>) => {
    persistFixtures((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const handleDeleteFixture = (id: string, label?: string) => {
    persistFixtures((prev) => prev.filter((f) => f.id !== id));
    if (selectedEntity?.kind === 'fixture' && selectedEntity.id === id) {
      setSelectedEntity(null);
    }
    dispatchToast(
      'Detalle Eliminado',
      label ? `"${label}" fue retirado del plano.` : 'Elemento retirado del plano.',
      'info'
    );
  };

  const handleClearAllZoneFixtures = () => {
    if (zoneFixtures.length === 0) return;
    openNoticeModal({
      title: `¿Limpiar detalles de ${effectiveZone}?`,
      message: `Se quitarán los ${zoneFixtures.length} detalles arquitectónicos (puertas, baños, barra, cocina) de "${effectiveZone}". Las mesas se conservarán.`,
      tone: 'warning',
      confirmLabel: 'Limpiar Detalles',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        persistFixtures((prev) =>
          prev.filter((f) => !(f.tenantId === tenantId && f.zone === effectiveZone))
        );
        setSelectedEntity(null);
        dispatchToast('Plano Limpio', `Se quitaron los detalles de ${effectiveZone}.`, 'info');
      },
    });
  };

  const handleResetZoneBlueprint = () => {
    const defaults = buildDefaultFixturesForZone(tenantId, effectiveZone);
    persistFixtures((prev) => [
      ...prev.filter((f) => !(f.tenantId === tenantId && f.zone === effectiveZone)),
      ...defaults,
    ]);
    blueprintTables.forEach((tbl, idx) => {
      const pos = getDefaultTablePosition(idx, blueprintTables.length);
      onUpdateTable({ ...tbl, x: pos.x, y: pos.y, rotation: 0 });
    });
    setSelectedEntity(null);
    dispatchToast('Plano Restaurado', `Diseño base restaurado en ${effectiveZone}.`, 'success');
  };

  // Floor / Zone CRUD Modal Submit
  const handleOpenCreateZoneModal = () => {
    setZoneModalMode('create');
    setZoneNameInput(`Piso ${availableZones.length + 1}`);
    setIncludeDefaultFixturesOnNewZone(true);
  };

  const handleOpenEditZoneModal = (zoneName: string) => {
    setZoneModalMode('edit');
    setZoneTargetOldName(zoneName);
    setZoneNameInput(zoneName);
  };

  const handleSaveZoneModal = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = zoneNameInput.trim();
    if (!clean) return;

    if (zoneModalMode === 'create') {
      if (availableZones.some((z) => z.toLowerCase() === clean.toLowerCase())) {
        dispatchToast('Piso ya existe', `Ya existe un piso o ambiente llamado "${clean}".`, 'warning');
        return;
      }
      const record = loadBranchFloorZonesRecord();
      const seedKey = `${tenantId}::${clean}`;
      record.seededZones[seedKey] = true;
      saveBranchFloorZonesRecord(record);

      if (includeDefaultFixturesOnNewZone) {
        const defaults = buildDefaultFixturesForZone(tenantId, clean);
        persistFixtures((prev) => [...prev, ...defaults]);
      }
      onCreateZone(clean, includeDefaultFixturesOnNewZone);
      setZoneModalMode(null);
    } else if (zoneModalMode === 'edit' && zoneTargetOldName) {
      if (clean !== zoneTargetOldName) {
        if (
          availableZones.some(
            (z) =>
              z.toLowerCase() === clean.toLowerCase() &&
              z.toLowerCase() !== zoneTargetOldName.toLowerCase()
          )
        ) {
          dispatchToast('Nombre Duplicado', `Ya existe otro piso llamado "${clean}".`, 'warning');
          return;
        }
        // Migrate fixtures of this floor to the new floor name
        persistFixtures((prev) =>
          prev.map((f) =>
            f.tenantId === tenantId && f.zone === zoneTargetOldName ? { ...f, zone: clean } : f
          )
        );
        const record = loadBranchFloorZonesRecord();
        record.seededZones[`${tenantId}::${clean}`] = true;
        saveBranchFloorZonesRecord(record);
        onRenameZone(zoneTargetOldName, clean);
      }
      setZoneModalMode(null);
    }
  };

  const handleRequestDeleteZone = (zoneName: string) => {
    if (availableZones.length <= 1) {
      dispatchToast(
        'Acción No Permitida',
        'El local debe tener al menos un piso o ambiente activo.',
        'warning'
      );
      return;
    }
    const tablesInZone = branchTables.filter((t) => t.zone === zoneName);
    const hasOccupiedInZone = tablesInZone.some((t) => activeSalonOrdersByTable.has(t.id));
    if (hasOccupiedInZone) {
      dispatchToast(
        'Piso con Mesas Ocupadas',
        `Cobra o mueve las cuentas activas de "${zoneName}" antes de eliminar el piso.`,
        'warning'
      );
      return;
    }

    openNoticeModal({
      title: `¿Eliminar piso "${zoneName}"?`,
      message:
        tablesInZone.length > 0
          ? `Se eliminará el piso "${zoneName}", sus detalles arquitectónicos y sus ${tablesInZone.length} mesa(s) configuradas.`
          : `Se eliminará el piso "${zoneName}" y sus detalles arquitectónicos del plano.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Piso',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        persistFixtures((prev) =>
          prev.filter((f) => !(f.tenantId === tenantId && f.zone === zoneName))
        );
        onDeleteZone(zoneName);
        setSelectedEntity(null);
      },
    });
  };

  // 1:1 Direct Manipulation Pointer Events with Hysteresis (so clicks on child delete/edit buttons NEVER get swallowed)
  const startDrag = (
    e: React.PointerEvent<HTMLElement>,
    kind: 'table' | 'fixture',
    id: string,
    currentX: number,
    currentY: number
  ) => {
    if (!isBuilderMode) return;
    // Ignore if user clicked on an inline action button (delete/edit/rotate)
    if ((e.target as HTMLElement).closest('button')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.stopPropagation();

    const rect = canvas.getBoundingClientRect();
    const pointerXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const pointerYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    dragSessionRef.current = {
      kind,
      id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offsetXPercent: pointerXPercent - currentX,
      offsetYPercent: pointerYPercent - currentY,
      hasMoved: false,
      captured: false,
    };
    setSelectedEntity({ kind, id });
  };

  const moveDrag = (e: React.PointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const distPx = Math.hypot(
      e.clientX - session.startClientX,
      e.clientY - session.startClientY
    );
    if (!session.hasMoved && distPx < 4) return;

    if (!session.captured) {
      session.captured = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    const rect = canvas.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100 - session.offsetXPercent;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100 - session.offsetYPercent;

    const clampedX = Math.round(Math.max(6, Math.min(94, rawX)));
    const clampedY = Math.round(Math.max(7, Math.min(93, rawY)));

    session.hasMoved = true;
    setDragCoords({
      kind: session.kind,
      id: session.id,
      x: clampedX,
      y: clampedY,
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    if (session.captured) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (session.hasMoved && dragCoords && dragCoords.id === session.id) {
      if (session.kind === 'table') {
        const tbl = branchTables.find((t) => t.id === session.id);
        if (tbl) {
          onUpdateTable({ ...tbl, x: dragCoords.x, y: dragCoords.y });
        }
      } else {
        handleUpdateFixture(session.id, { x: dragCoords.x, y: dragCoords.y });
      }
    }

    dragSessionRef.current = null;
    setDragCoords(null);
  };

  // Counts for status summary bar
  const stats = useMemo(() => {
    let free = 0;
    let occupied = 0;
    let ready = 0;
    let reserved = 0;
    blueprintTables.forEach((t) => {
      const ord = activeSalonOrdersByTable.get(t.id);
      if (ord) {
        if (ord.status === 'listo') ready += 1;
        else occupied += 1;
      } else if (t.reservation) {
        reserved += 1;
      } else {
        free += 1;
      }
    });
    return { free, occupied, ready, reserved };
  }, [blueprintTables, activeSalonOrdersByTable]);

  const activeFixtureInspector =
    selectedEntity?.kind === 'fixture'
      ? zoneFixtures.find((f) => f.id === selectedEntity.id) || null
      : null;

  const activeTableInspector =
    selectedEntity?.kind === 'table'
      ? blueprintTables.find((t) => t.id === selectedEntity.id) || null
      : null;

  return (
    <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
      {/* Top Architectural Bar: Floors / Zones Manager & View Mode Switcher */}
      <div className="px-4 py-3 bg-zinc-50/70 dark:bg-zinc-950/60 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Floor / Zone Tabs + Floor CRUD buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-wrap">
          {availableZones.map((zone) => {
            const active = effectiveZone === zone && activeZoneFilter !== 'todas';
            const countInZone = branchTables.filter((t) => t.zone === zone).length;
            return (
              <div key={zone} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => onChangeZoneFilter(zone)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors active:scale-[0.97] flex items-center gap-1.5 ${
                    active || (activeZoneFilter === 'todas' && zone === effectiveZone && viewMode === 'blueprint')
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{zone}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      active || (activeZoneFilter === 'todas' && zone === effectiveZone && viewMode === 'blueprint')
                        ? 'bg-white/15 dark:bg-zinc-900/15'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {countInZone}
                  </span>
                </button>
              </div>
            );
          })}

          {viewMode === 'grid' && availableZones.length > 1 && (
            <button
              type="button"
              onClick={() => onChangeZoneFilter('todas')}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeZoneFilter === 'todas'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              Todas ({branchTables.length})
            </button>
          )}

          {/* Direct Floor / Zone Management Controls (+ Piso, Editar Piso, Eliminar Piso) */}
          <div className="inline-flex items-center gap-1 pl-1 border-l border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleOpenCreateZoneModal}
              title="Crear nuevo piso o ambiente del local"
              className="min-h-[34px] px-2.5 py-1 rounded-xl border border-dashed border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Piso</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenEditZoneModal(effectiveZone)}
              title={`Renombrar piso "${effectiveZone}"`}
              className="min-h-[34px] px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-500/60 text-zinc-600 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              <span className="hidden sm:inline">Editar Piso</span>
            </button>

            {availableZones.length > 1 && (
              <button
                type="button"
                onClick={() => handleRequestDeleteZone(effectiveZone)}
                title={`Eliminar piso "${effectiveZone}"`}
                className="min-h-[34px] px-2 py-1 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Eliminar Piso</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: View Switcher (Plano 2D vs Cuadrícula), QRs & Builder Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-0.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 border border-zinc-300/60 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => {
                setViewMode('blueprint');
                if (activeZoneFilter === 'todas' && availableZones[0]) {
                  onChangeZoneFilter(availableZones[0]);
                }
              }}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'blueprint'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Plano 2D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cuadrícula</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenQrModal(null)}
            className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-amber-500/60 transition-colors whitespace-nowrap shrink-0 active:scale-[0.97]"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-500" />
            <span>QRs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleBuilderMode();
              setSelectedEntity(null);
            }}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 active:scale-[0.97] ${
              isBuilderMode
                ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow-xs'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-amber-500/50'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{isBuilderMode ? 'Guardar Plano' : 'Diseñar Plano'}</span>
          </button>
        </div>
      </div>

      {/* Builder Architectural Palette (Visible when Designing Floor Plan) */}
      {isBuilderMode && (
        <div className="px-4 py-3 bg-amber-500/[0.07] dark:bg-amber-500/[0.08] border-b border-amber-500/25 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 text-[11px] font-bold">
                <Move className="w-3 h-3" /> Editando: {effectiveZone}
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-300">
                Arrastra cualquier elemento o usa el botón rojo <strong className="text-rose-600 dark:text-rose-400">🗑</strong> sobre cada mesa o detalle para eliminarlo.
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {zoneFixtures.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllZoneFixtures}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1 transition-colors active:scale-[0.97]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpiar Detalles</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetZoneBlueprint}
                className="min-h-[32px] px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-amber-500 text-[11px] font-semibold flex items-center gap-1 transition-colors active:scale-[0.97]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Plano Base</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={onOpenCreateTable}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Mesa</span>
            </button>

            <span className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 shrink-0" />

            {FIXTURE_CATALOG.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddFixture(item.type)}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors active:scale-[0.97]"
                >
                  <Plus className="w-3 h-3 text-amber-500" />
                  <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Salon Telemetry Strip */}
      <div className="px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <strong className="font-mono text-zinc-900 dark:text-white">{stats.free}</strong> Libres
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <strong className="font-mono text-zinc-900 dark:text-white">{stats.occupied}</strong> En Consumo
          </span>
          {stats.ready > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <strong className="font-mono">{stats.ready}</strong> Listas p/ Servir
            </span>
          )}
          {stats.reserved > 0 && (
            <span className="inline-flex items-center gap-1.5 font-medium text-purple-600 dark:text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <strong className="font-mono">{stats.reserved}</strong> Reservadas
            </span>
          )}
        </div>

        <span className="text-[11px] text-zinc-400">
          {isBuilderMode
            ? 'Cada mesa y detalle tiene botones directos para rotar (↻), editar (✎) o eliminar (🗑)'
            : 'Toca una mesa libre para tomar pedido o una ocupada para cobrar / agregar ronda'}
        </span>
      </div>

      {/* MAIN VIEW: 2D ARCHITECTURAL FLOOR PLAN vs COMPACT GRID */}
      {viewMode === 'blueprint' ? (
        <div className="p-3 sm:p-4 bg-zinc-100/70 dark:bg-zinc-950/80">
          <div
            ref={canvasRef}
            onClick={() => {
              if (isBuilderMode) setSelectedEntity(null);
            }}
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(161, 161, 170, 0.28) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
            className={`relative w-full h-[540px] sm:h-[600px] rounded-2xl bg-white dark:bg-[#111319] border-2 overflow-hidden select-none shadow-inner transition-colors ${
              isBuilderMode
                ? 'border-amber-500/60'
                : 'border-zinc-300/80 dark:border-zinc-800'
            }`}
          >
            {/* Subtle Inner Architectural Wall Frame & Zone Watermark */}
            <div className="pointer-events-none absolute inset-2 rounded-xl border border-dashed border-zinc-200/80 dark:border-zinc-800/80" />
            <div className="pointer-events-none absolute top-3 left-3.5 z-0 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Plano Arquitectónico · {effectiveZone} ({tenantName.replace('Gastro - ', '')})
              </span>
            </div>

            {/* 1. ARCHITECTURAL FIXTURES (Entrance, Exit, Restrooms, Bar, Kitchen, Cashier, Walls) */}
            {zoneFixtures.map((fix) => {
              const isDraggingThis =
                dragCoords?.kind === 'fixture' && dragCoords.id === fix.id;
              const x = isDraggingThis ? dragCoords.x : fix.x;
              const y = isDraggingThis ? dragCoords.y : fix.y;
              const isSelectedFix =
                isBuilderMode &&
                selectedEntity?.kind === 'fixture' &&
                selectedEntity.id === fix.id;
              const rot = fix.rotation || 0;
              const size = fix.size || 'md';

              const sizeDimensions: Record<
                FloorFixtureType,
                Record<'sm' | 'md' | 'lg' | 'xl', string>
              > = {
                entrance: {
                  sm: 'w-36 h-11',
                  md: 'w-44 h-12',
                  lg: 'w-52 h-13',
                  xl: 'w-60 h-14',
                },
                exit: {
                  sm: 'w-36 h-11',
                  md: 'w-44 h-12',
                  lg: 'w-52 h-13',
                  xl: 'w-60 h-14',
                },
                restroom: {
                  sm: 'w-36 h-14',
                  md: 'w-44 h-16',
                  lg: 'w-52 h-20',
                  xl: 'w-60 h-24',
                },
                bar: {
                  sm: 'w-44 h-15',
                  md: 'w-56 h-17',
                  lg: 'w-64 h-19',
                  xl: 'w-80 h-21',
                },
                kitchen: {
                  sm: 'w-44 h-13',
                  md: 'w-56 h-15',
                  lg: 'w-64 h-16',
                  xl: 'w-76 h-18',
                },
                cashier: {
                  sm: 'w-32 h-12',
                  md: 'w-38 h-14',
                  lg: 'w-44 h-16',
                  xl: 'w-52 h-16',
                },
                wall: {
                  sm: 'w-28 h-3.5',
                  md: 'w-44 h-3.5',
                  lg: 'w-64 h-4',
                  xl: 'w-84 h-4',
                },
              };

              const dimClass = sizeDimensions[fix.type]?.[size] || 'w-44 h-12';

              return (
                <div
                  key={fix.id}
                  onPointerDown={(e) => startDrag(e, 'fixture', fix.id, x, y)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isBuilderMode) {
                      setSelectedEntity({ kind: 'fixture', id: fix.id });
                    }
                  }}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    touchAction: isBuilderMode ? 'none' : 'manipulation',
                  }}
                  className={`absolute z-10 group ${dimClass} transition-shadow ${
                    isBuilderMode ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
                  } ${
                    isSelectedFix
                      ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 rounded-xl'
                      : ''
                  }`}
                >
                  {/* Direct 1-Tap Action Badges on every architectural detail in Builder Mode */}
                  {isBuilderMode && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -top-3 -right-2 z-30 flex items-center gap-1 bg-zinc-950/90 text-white px-1.5 py-0.5 rounded-full shadow-md border border-white/15"
                    >
                      <button
                        type="button"
                        title="Rotar 90°"
                        onClick={() =>
                          handleUpdateFixture(fix.id, {
                            rotation: ((fix.rotation || 0) + 90) % 360,
                          })
                        }
                        className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center text-zinc-200 hover:text-amber-400"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title={`Eliminar ${fix.label}`}
                        onClick={() => handleDeleteFixture(fix.id, fix.label)}
                        className="w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* ENTRANCE DOOR */}
                  {fix.type === 'entrance' && (
                    <div className="w-full h-full rounded-xl bg-emerald-500/12 dark:bg-emerald-500/15 border-2 border-emerald-500/70 px-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500 text-zinc-950 flex items-center justify-center shrink-0">
                          <DoorOpen className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 block truncate leading-tight">
                            {fix.label}
                          </span>
                          <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-400 block leading-none">
                            Ingreso Clientes ↑
                          </span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4 20V6a14 14 0 0 1 14 14H4Z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeDasharray="2 2"
                        />
                      </svg>
                    </div>
                  )}

                  {/* EXIT DOOR */}
                  {fix.type === 'exit' && (
                    <div className="w-full h-full rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border-2 border-rose-500/60 px-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                          <LogOut className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-rose-900 dark:text-rose-200 block truncate leading-tight">
                            {fix.label}
                          </span>
                          <span className="text-[9px] font-medium text-rose-700 dark:text-rose-400 block leading-none">
                            Salida / Evacuación ↓
                          </span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 20V6A14 14 0 0 0 6 20h14Z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeDasharray="2 2"
                        />
                      </svg>
                    </div>
                  )}

                  {/* RESTROOMS / BAÑOS SS.HH. */}
                  {fix.type === 'restroom' && (
                    <div
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, rgba(14, 165, 233, 0.06) 25%, transparent 25%, transparent 75%, rgba(14, 165, 233, 0.06) 75%), linear-gradient(45deg, rgba(14, 165, 233, 0.06) 25%, transparent 25%, transparent 75%, rgba(14, 165, 233, 0.06) 75%)',
                        backgroundSize: '12px 12px',
                        backgroundPosition: '0 0, 6px 6px',
                      }}
                      className="w-full h-full rounded-xl bg-sky-50/90 dark:bg-sky-950/40 border-2 border-sky-500/50 px-3 py-2 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                          <Bath className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-sky-950 dark:text-sky-100 block truncate">
                            {fix.label}
                          </span>
                          <span className="text-[9px] font-mono font-semibold text-sky-700 dark:text-sky-300 block">
                            WC · Damas / Caballeros
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BAR / BARRA */}
                  {fix.type === 'bar' && (
                    <div className="relative w-full h-full flex flex-col justify-between">
                      <div className="w-full flex-1 rounded-xl bg-amber-950/10 dark:bg-amber-500/15 border-2 border-amber-600/60 dark:border-amber-500/60 px-3.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                            <Wine className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-zinc-900 dark:text-amber-100 block truncate">
                              {fix.label}
                            </span>
                            <span className="text-[9px] font-medium text-amber-800 dark:text-amber-300/80 block">
                              Mostrador & Bebidas
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-around px-3 pt-1">
                        {[0, 1, 2, 3, 4].map((stool) => (
                          <span
                            key={stool}
                            className="w-3.5 h-3.5 rounded-full bg-amber-500/30 dark:bg-amber-400/25 border border-amber-600/60 dark:border-amber-400/50 block"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KITCHEN / HORNO PASS */}
                  {fix.type === 'kitchen' && (
                    <div className="w-full h-full rounded-xl bg-orange-500/10 dark:bg-orange-500/15 border-2 border-orange-500/50 px-3 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-orange-500 text-zinc-950 flex items-center justify-center shrink-0">
                          <ChefHat className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-zinc-900 dark:text-orange-100 block truncate">
                            {fix.label}
                          </span>
                          <span className="text-[9px] font-medium text-orange-700 dark:text-orange-300 block">
                            Despacho KDS & Horno
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CASHIER / CAJA POS */}
                  {fix.type === 'cashier' && (
                    <div className="w-full h-full rounded-xl bg-zinc-900 dark:bg-zinc-800 border-2 border-zinc-700 dark:border-zinc-600 px-3 py-1.5 flex items-center gap-2 text-white shadow-xs">
                      <span className="w-6 h-6 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                        <Monitor className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold block truncate leading-tight">
                          {fix.label}
                        </span>
                        <span className="text-[9px] text-zinc-400 block leading-none">
                          Cobro & Facturación
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ARCHITECTURAL WALL / DIVIDER */}
                  {fix.type === 'wall' && (
                    <div className="w-full h-full rounded-full bg-zinc-400 dark:bg-zinc-600 border border-zinc-500 dark:border-zinc-500 flex items-center justify-center">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-white dark:text-zinc-200 px-1 truncate">
                        {fix.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. TOP-DOWN INTERACTIVE TABLES WITH RENDERED CHAIRS */}
            {blueprintTables.map((table, idx) => {
              const fallbackPos = getDefaultTablePosition(idx, blueprintTables.length);
              const isDraggingThis =
                dragCoords?.kind === 'table' && dragCoords.id === table.id;
              const x = isDraggingThis
                ? dragCoords.x
                : typeof table.x === 'number'
                ? table.x
                : fallbackPos.x;
              const y = isDraggingThis
                ? dragCoords.y
                : typeof table.y === 'number'
                ? table.y
                : fallbackPos.y;
              const rot = table.rotation || 0;

              const isSelected = selectedTable?.id === table.id;
              const isBuilderSelected =
                isBuilderMode &&
                selectedEntity?.kind === 'table' &&
                selectedEntity.id === table.id;
              const activeOrder = activeSalonOrdersByTable.get(table.id);
              const isReady = activeOrder?.status === 'listo';
              const isOccupied = Boolean(activeOrder);
              const isBillReq = Boolean(isOccupied && table.billRequested);
              const isReserved = Boolean(!isOccupied && table.reservation);

              const cap = Math.max(2, Math.min(12, table.capacity || 4));
              const topChairs = Math.ceil((cap - 2) / 2);
              const bottomChairs = Math.max(1, Math.floor((cap - 2) / 2));

              const shapeSizeClass =
                table.shape === 'rect'
                  ? 'w-36 sm:w-40 h-22 sm:h-24 rounded-2xl'
                  : table.shape === 'round'
                  ? 'w-26 sm:w-28 h-26 sm:h-28 rounded-full'
                  : 'w-28 sm:w-30 h-24 sm:h-26 rounded-2xl';

              const surfaceClass = isSelected
                ? 'border-amber-500 bg-amber-500/18 dark:bg-amber-500/22 ring-2 ring-amber-500/40 shadow-md'
                : isBillReq
                ? 'border-indigo-500 bg-indigo-50/95 dark:bg-indigo-950/60 shadow-sm'
                : isReady
                ? 'border-blue-500 bg-blue-50/95 dark:bg-blue-950/60 shadow-sm'
                : isOccupied
                ? 'border-amber-500/80 bg-amber-50/95 dark:bg-amber-950/45 shadow-sm'
                : isReserved
                ? 'border-purple-500/80 bg-purple-50/95 dark:bg-purple-950/45 shadow-sm'
                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-emerald-500/70 shadow-xs';

              const chairColorClass = isOccupied
                ? 'bg-amber-500/45 border-amber-600/70'
                : isReserved
                ? 'bg-purple-500/40 border-purple-500/60'
                : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700';

              return (
                <div
                  key={table.id}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => startDrag(e, 'table', table.id, x, y)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isBuilderMode) {
                      setSelectedEntity({ kind: 'table', id: table.id });
                      return;
                    }
                    onSelectTable(table, activeOrder);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (isBuilderMode) {
                        setSelectedEntity({ kind: 'table', id: table.id });
                      } else {
                        onSelectTable(table, activeOrder);
                      }
                    }
                  }}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    touchAction: isBuilderMode ? 'none' : 'manipulation',
                  }}
                  className={`absolute z-20 p-2 transition-transform active:scale-[0.97] ${
                    isBuilderMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                  }`}
                >
                  {/* Direct 1-Tap Action Badges on every table in Builder Mode (Rotate, Edit, Delete) */}
                  {isBuilderMode && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -top-1 right-0 z-30 flex items-center gap-1 bg-zinc-950/90 text-white px-1.5 py-0.5 rounded-full shadow-md border border-white/15"
                    >
                      <button
                        type="button"
                        title={`Rotar ${table.name}`}
                        onClick={() =>
                          onUpdateTable({
                            ...table,
                            rotation: ((table.rotation || 0) + 90) % 360,
                          })
                        }
                        className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center text-zinc-200 hover:text-amber-400"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title={`Editar ${table.name}`}
                        onClick={() => onOpenEditTable(table)}
                        className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center text-zinc-200 hover:text-amber-400"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title={`Eliminar ${table.name}`}
                        onClick={() => onConfirmDeleteTable(table)}
                        className="w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Top Chairs */}
                  <div className="flex items-center justify-around px-3 mb-1">
                    {Array.from({ length: Math.max(1, topChairs) }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-5 h-1.5 rounded-t-md border ${chairColorClass}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center">
                    {/* Left Chair */}
                    <span
                      className={`w-1.5 h-6 rounded-l-md border mr-1 shrink-0 ${chairColorClass}`}
                    />

                    {/* Table Top Surface */}
                    <div
                      className={`relative border-2 p-2.5 flex flex-col justify-between transition-colors ${shapeSizeClass} ${surfaceClass} ${
                        isBuilderSelected ? 'ring-2 ring-amber-500' : ''
                      }`}
                    >
                      {/* Top Row: Table Name + Capacity / QR */}
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-zinc-900 dark:text-white leading-tight truncate">
                          {table.name}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-black/[0.05] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 shrink-0">
                          <Users className="w-2.5 h-2.5" />
                          {table.capacity}
                        </span>
                      </div>

                      {/* Middle / Bottom Telemetry */}
                      {activeOrder ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-300 truncate">
                              S/ {activeOrder.total.toFixed(2)}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-zinc-500 dark:text-zinc-400">
                              <Clock className="w-2.5 h-2.5" />
                              {formatElapsedMinutes(activeOrder.createdAt)}
                            </span>
                          </div>
                          {isReady ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkOrderServed(activeOrder.id);
                              }}
                              className="w-full py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center gap-0.5"
                            >
                              <Check className="w-2.5 h-2.5" /> Servir
                            </button>
                          ) : (
                            <span className="block text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                              {isBillReq ? '🧾 Cuenta pedida' : activeOrder.orderNumber}
                            </span>
                          )}
                        </div>
                      ) : isReserved && table.reservation ? (
                        <div className="text-[9px] font-semibold text-purple-700 dark:text-purple-300 truncate">
                          ⏰ {table.reservation.time} · {table.reservation.customerName}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Libre
                          </span>
                          {!isBuilderMode && (
                            <button
                              type="button"
                              title={`Ver QR de ${table.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenQrModal(table.id);
                              }}
                              className="p-0.5 rounded text-zinc-400 hover:text-amber-500"
                            >
                              <QrCode className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Chair */}
                    <span
                      className={`w-1.5 h-6 rounded-r-md border ml-1 shrink-0 ${chairColorClass}`}
                    />
                  </div>

                  {/* Bottom Chairs */}
                  <div className="flex items-center justify-around px-3 mt-1">
                    {Array.from({ length: Math.max(1, bottomChairs) }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-5 h-1.5 rounded-b-md border ${chairColorClass}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {blueprintTables.length === 0 && zoneFixtures.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                  Este piso ({effectiveZone}) está vacío
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Activa "Diseñar Plano" para agregar mesas, puertas, baños o barra.
                </p>
              </div>
            )}
          </div>

          {/* INLINE BUILDER INSPECTOR DOCK (when a table or fixture is selected in Builder Mode) */}
          {isBuilderMode && (activeFixtureInspector || activeTableInspector) && (
            <div className="mt-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-500/40 shadow-sm flex flex-wrap items-center justify-between gap-3">
              {activeFixtureInspector ? (
                <>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                      Nombre del Detalle:
                    </span>
                    <input
                      type="text"
                      value={activeFixtureInspector.label}
                      onChange={(e) =>
                        handleUpdateFixture(activeFixtureInspector.id, { label: e.target.value })
                      }
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 border border-zinc-200 dark:border-zinc-700">
                      {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() =>
                            handleUpdateFixture(activeFixtureInspector.id, { size: sz })
                          }
                          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                            (activeFixtureInspector.size || 'md') === sz
                              ? 'bg-amber-500 text-zinc-950'
                              : 'text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateFixture(activeFixtureInspector.id, {
                          rotation: ((activeFixtureInspector.rotation || 0) + 90) % 360,
                        })
                      }
                      className="min-h-[34px] px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1 hover:border-amber-500 whitespace-nowrap shrink-0"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotar 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteFixture(
                          activeFixtureInspector.id,
                          activeFixtureInspector.label
                        )
                      }
                      className="min-h-[34px] px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:bg-rose-500/20 whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Detalle</span>
                    </button>
                  </div>
                </>
              ) : activeTableInspector ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {activeTableInspector.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ({activeTableInspector.zone} · {activeTableInspector.capacity} sillas)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTable({
                          ...activeTableInspector,
                          rotation: ((activeTableInspector.rotation || 0) + 90) % 360,
                        })
                      }
                      className="min-h-[34px] px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1 hover:border-amber-500 whitespace-nowrap shrink-0"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotar 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEditTable(activeTableInspector)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1 hover:border-amber-500 whitespace-nowrap shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Mesa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onConfirmDeleteTable(activeTableInspector)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:bg-rose-500/20 whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Mesa</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        /* COMPACT GRID VIEW */
        <div className="p-4 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
          {visibleTables.map((table) => {
            const isSelected = selectedTable?.id === table.id;
            const activeOrder = activeSalonOrdersByTable.get(table.id);
            const isReady = activeOrder?.status === 'listo';
            const isOccupied = Boolean(activeOrder);
            const isBillReq = Boolean(isOccupied && table.billRequested);
            const isReserved = Boolean(!isOccupied && table.reservation);

            return (
              <div
                key={table.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isBuilderMode) {
                    onOpenEditTable(table);
                    return;
                  }
                  onSelectTable(table, activeOrder);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTable(table, activeOrder);
                  }
                }}
                className={`relative p-3.5 rounded-2xl border transition-colors cursor-pointer select-none active:scale-[0.98] flex flex-col justify-between min-h-[104px] ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40'
                    : isBillReq
                    ? 'border-indigo-500/70 bg-indigo-50/70 dark:bg-indigo-950/25'
                    : isReady
                    ? 'border-blue-500/60 bg-blue-50/60 dark:bg-blue-950/25'
                    : isOccupied
                    ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20'
                    : isReserved
                    ? 'border-purple-400/70 bg-purple-50/60 dark:bg-purple-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white block truncate">
                      {table.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                      {table.zone}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700 shrink-0">
                    <Users className="w-2.5 h-2.5" />
                    {table.capacity}
                  </span>
                </div>

                {isBuilderMode ? (
                  <div
                    className="flex items-center justify-between gap-1 pt-2 mt-2 border-t border-zinc-200/80 dark:border-zinc-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onMoveTableOrder(table.id, 'prev')}
                        className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveTableOrder(table.id, 'next')}
                        className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenEditTable(table)}
                        className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onConfirmDeleteTable(table)}
                        className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : activeOrder ? (
                  <div className="pt-2 mt-1.5 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 truncate">
                      {activeOrder.orderNumber} · S/ {activeOrder.total.toFixed(2)}
                    </span>
                    {isReady && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkOrderServed(activeOrder.id);
                        }}
                        className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold shrink-0"
                      >
                        Servir ✓
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 mt-1.5 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Disponible
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTableOps(table.id);
                      }}
                      className="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-[9px] font-semibold"
                    >
                      Opciones
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* NATIVE <dialog>: CREAR O RENOMBRAR PISO / AMBIENTE DEL LOCAL */}
      <dialog
        ref={zoneDialogRef}
        aria-labelledby={zoneDialogTitleId}
        onClose={() => setZoneModalMode(null)}
        onClick={(e) => {
          if (e.target === zoneDialogRef.current) setZoneModalMode(null);
        }}
        className="max-w-lg w-full p-0 bg-transparent border-0 backdrop:bg-black/70 backdrop:backdrop-blur-xs"
      >
        {zoneModalMode && (
          <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-zinc-900 dark:text-zinc-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 id={zoneDialogTitleId} className="font-bold text-base text-zinc-950 dark:text-white">
                    {zoneModalMode === 'create'
                      ? 'Crear Nuevo Piso o Ambiente'
                      : `Editar Piso "${zoneTargetOldName}"`}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {tenantName.replace('Gastro - ', '')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZoneModalMode(null)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZoneModal} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Nombre del Piso / Ambiente *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={zoneNameInput}
                  onChange={(e) => setZoneNameInput(e.target.value)}
                  placeholder="Ej: Piso 1, Piso 2, Terraza, Salón VIP, Azotea..."
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {['Piso 1', 'Piso 2', 'Piso 3', 'Salón Principal', 'Terraza', 'Salón VIP', 'Azotea'].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setZoneNameInput(preset)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500/20 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300"
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>
              </div>

              {zoneModalMode === 'create' && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={includeDefaultFixturesOnNewZone}
                    onChange={(e) => setIncludeDefaultFixturesOnNewZone(e.target.checked)}
                    className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Incluir plano base con Puerta de Entrada, Salida, Baños y Barra (puedes editarlos o eliminarlos luego)
                  </span>
                </label>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setZoneModalMode(null)}
                  className="whitespace-nowrap shrink-0 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="whitespace-nowrap shrink-0 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md"
                >
                  {zoneModalMode === 'create' ? 'Crear Piso' : 'Guardar Nombre'}
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>
    </section>
  );
};
