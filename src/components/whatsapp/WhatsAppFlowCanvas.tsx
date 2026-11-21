import React, { useState, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GripVertical,
  Sparkles,
  Link2,
  Unlink,
  Bot,
  ShoppingBag,
  ExternalLink,
  Search,
  HelpCircle,
  UserCheck,
  MessageSquare,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { WhatsAppFlowNode, WhatsAppFlowNodeType } from '../../types/whatsapp';

export type WhatsAppNodePresetKey =
  | 'custom'
  | 'promo'
  | 'branch_select'
  | 'faq'
  | 'store_link'
  | 'order_status'
  | 'handoff';

interface WhatsAppFlowCanvasProps {
  nodes: WhatsAppFlowNode[];
  selectedNodeId: string;
  primaryColor: string;
  viewMode: 'canvas' | 'list';
  onChangeViewMode: (mode: 'canvas' | 'list') => void;
  onSelectNode: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, patch: Partial<WhatsAppFlowNode>) => void;
  onUpdateAllNodes: (nodes: WhatsAppFlowNode[]) => void;
  onAddNode: (preset?: WhatsAppNodePresetKey) => void;
  onDeleteNode: (nodeId: string) => void;
  onRestoreDefaults: () => void;
}

const NODE_WIDTH = 276;
const HEADER_HEIGHT = 44;
const BODY_HEIGHT = 56;
const OPTION_ROW_HEIGHT = 34;

function getFallbackPosition(index: number): { x: number; y: number } {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: 40 + col * 360, y: 40 + row * 230 };
}

function getNodePos(node: WhatsAppFlowNode, index: number): { x: number; y: number } {
  return node.position || getFallbackPosition(index);
}

function getNodeVisualMeta(type: WhatsAppFlowNodeType) {
  switch (type) {
    case 'welcome':
      return { color: '#10b981', badge: 'Inicio', icon: Bot };
    case 'order_catalog':
      return { color: '#f97316', badge: 'Catálogo', icon: ShoppingBag };
    case 'store_link':
      return { color: '#6366f1', badge: 'Tienda', icon: ExternalLink };
    case 'order_status':
      return { color: '#0ea5e9', badge: 'Tracking', icon: Search };
    case 'faq':
      return { color: '#8b5cf6', badge: 'FAQ', icon: HelpCircle };
    case 'handoff':
      return { color: '#f59e0b', badge: 'Asesor', icon: UserCheck };
    default:
      return { color: '#25D366', badge: 'Paso', icon: MessageSquare };
  }
}

function buildBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(64, Math.abs(x2 - x1) * 0.55);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export const WhatsAppFlowCanvas: React.FC<WhatsAppFlowCanvasProps> = ({
  nodes,
  selectedNodeId,
  primaryColor,
  viewMode,
  onChangeViewMode,
  onSelectNode,
  onUpdateNode,
  onUpdateAllNodes,
  onAddNode,
  onDeleteNode,
  onRestoreDefaults,
}) => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0.95);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const didDragRef = useRef(false);
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{
    sourceNodeId: string;
    optionId: string;
    startX: number;
    startY: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null,
    [nodes, selectedNodeId]
  );

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => map.set(n.id, getNodePos(n, i)));
    return map;
  }, [nodes]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: (clientX - rect.left + el.scrollLeft) / zoom,
      y: (clientY - rect.top + el.scrollTop) / zoom,
    };
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: WhatsAppFlowNode, index: number) => {
    if ((e.target as HTMLElement).closest('button, input, select, [data-port]')) return;
    e.stopPropagation();
    const pos = getNodePos(node, index);
    const pt = toCanvasCoords(e.clientX, e.clientY);
    didDragRef.current = false;
    onSelectNode(node.id);
    setDraggingNode({
      id: node.id,
      offsetX: pt.x - pos.x,
      offsetY: pt.y - pos.y,
    });
  };

  const handlePortMouseDown = (
    e: React.MouseEvent,
    sourceNodeId: string,
    optionId: string,
    startX: number,
    startY: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const pt = toCanvasCoords(e.clientX, e.clientY);
    setConnectingFrom({
      sourceNodeId,
      optionId,
      startX,
      startY,
      mouseX: pt.x,
      mouseY: pt.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingNode) {
      didDragRef.current = true;
      const pt = toCanvasCoords(e.clientX, e.clientY);
      const nextX = Math.max(16, Math.round(pt.x - draggingNode.offsetX));
      const nextY = Math.max(16, Math.round(pt.y - draggingNode.offsetY));
      onUpdateNode(draggingNode.id, { position: { x: nextX, y: nextY } });
      return;
    }
    if (connectingFrom) {
      const pt = toCanvasCoords(e.clientX, e.clientY);
      setConnectingFrom((prev) => (prev ? { ...prev, mouseX: pt.x, mouseY: pt.y } : null));
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingNode) {
      setDraggingNode(null);
    }
    if (connectingFrom) {
      if (hoveredTargetNodeId && hoveredTargetNodeId !== connectingFrom.sourceNodeId) {
        const sourceNode = nodes.find((n) => n.id === connectingFrom.sourceNodeId);
        if (sourceNode) {
          const updatedOptions = sourceNode.options.map((opt) =>
            opt.id === connectingFrom.optionId
              ? { ...opt, nextNodeId: hoveredTargetNodeId }
              : opt
          );
          onUpdateNode(sourceNode.id, { options: updatedOptions });
        }
      }
      setConnectingFrom(null);
      setHoveredTargetNodeId(null);
    }
  };

  const handleAutoLayout = () => {
    // Organiza en columnas limpias (inicio a la izquierda, resto en 2 columnas)
    const laidOut = nodes.map((node, idx) => {
      if (node.type === 'welcome' || idx === 0) {
        return { ...node, position: { x: 40, y: 170 } };
      }
      const orderIdx = idx - 1;
      const col = Math.floor(orderIdx / 3) + 1;
      const row = orderIdx % 3;
      return {
        ...node,
        position: {
          x: 40 + col * 365,
          y: 30 + row * 210,
        },
      };
    });
    onUpdateAllNodes(laidOut);
  };

  const handleDisconnectOption = (sourceNodeId: string, optionId: string) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;
    onUpdateNode(sourceNodeId, {
      options: sourceNode.options.map((o) => (o.id === optionId ? { ...o, nextNodeId: '' } : o)),
    });
  };

  // Calcular conexiones SVG
  const edges = useMemo(() => {
    const list: Array<{
      id: string;
      sourceNodeId: string;
      optionId: string;
      label: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
    }> = [];

    nodes.forEach((node, idx) => {
      const srcPos = nodePositions.get(node.id) || getNodePos(node, idx);
      node.options.forEach((opt, optIdx) => {
        if (!opt.nextNodeId) return;
        const targetNode = nodes.find((n) => n.id === opt.nextNodeId);
        if (!targetNode) return;
        const tgtPos = nodePositions.get(targetNode.id);
        if (!tgtPos) return;

        const x1 = srcPos.x + NODE_WIDTH;
        const y1 = srcPos.y + HEADER_HEIGHT + BODY_HEIGHT + optIdx * OPTION_ROW_HEIGHT + OPTION_ROW_HEIGHT / 2;
        const x2 = tgtPos.x;
        const y2 = tgtPos.y + HEADER_HEIGHT / 2;
        const meta = getNodeVisualMeta(targetNode.type);

        list.push({
          id: `${node.id}:${opt.id}->${targetNode.id}`,
          sourceNodeId: node.id,
          optionId: opt.id,
          label: opt.label,
          x1,
          y1,
          x2,
          y2,
          color: meta.color,
        });
      });
    });

    return list;
  }, [nodes, nodePositions]);

  // Dimensiones mínimas del lienzo para que siempre haya espacio de arrastre
  const canvasBounds = useMemo(() => {
    let maxX = 1180;
    let maxY = 640;
    nodePositions.forEach((p) => {
      if (p.x + NODE_WIDTH + 160 > maxX) maxX = p.x + NODE_WIDTH + 160;
      if (p.y + 320 > maxY) maxY = p.y + 320;
    });
    return { width: maxX, height: maxY };
  }, [nodePositions]);

  return (
    <div className="relative w-full">
      {/* LIENZO VISUAL CON CONECTORES (ANCHO COMPLETO) */}
      <div className="w-full saas-card overflow-hidden flex flex-col">
        {/* Barra superior del lienzo */}
        <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <Link2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-zinc-900 dark:text-white">
              Lienzo Visual de Flujos
            </span>
            <span className="hidden md:inline text-zinc-500">
              — Arrastra nodos, conecta puertos y haz clic en cualquier nodo para editarlo
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                title="Alejar"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.25, Number((z + 0.1).toFixed(2))))}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                title="Acercar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAutoLayout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              title="Auto-ordenar nodos"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Auto-ordenar
            </button>

            <button
              type="button"
              onClick={() => setInspectorOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                inspectorOpen
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Abrir o cerrar editor flotante del nodo"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {inspectorOpen ? 'Ocultar Editor' : 'Editar Nodo'}
            </button>

            <button
              type="button"
              onClick={onRestoreDefaults}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Restaurar plantilla recomendada"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5">
              <button
                type="button"
                onClick={() => onChangeViewMode('canvas')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'canvas'
                    ? 'text-white'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                style={viewMode === 'canvas' ? { backgroundColor: primaryColor } : undefined}
              >
                Lienzo
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('list')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'list'
                    ? 'text-white'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                style={viewMode === 'list' ? { backgroundColor: primaryColor } : undefined}
              >
                Vista Lista
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddMenuOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo Nodo
              </button>

              {addMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1.5 w-56 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-1.5 z-40 space-y-0.5"
                >
                  {(
                    [
                      { key: 'custom', label: 'Mensaje / Menú personalizado' },
                      { key: 'promo', label: 'Promociones y Combos' },
                      { key: 'branch_select', label: 'Selector de Sucursal' },
                      { key: 'faq', label: 'Horarios / Medios de Pago' },
                      { key: 'store_link', label: 'Enlace a Tienda Online' },
                      { key: 'order_status', label: 'Consultar Estado de Pedido' },
                      { key: 'handoff', label: 'Derivar a Asesor Humano' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        onAddNode(item.key);
                        setAddMenuOpen(false);
                        setInspectorOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Área desplazable del lienzo */}
        <div
          ref={canvasRef}
          onClick={() => {
            setInspectorOpen(false);
            setAddMenuOpen(false);
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="relative h-[calc(100vh-235px)] min-h-[620px] overflow-auto select-none bg-zinc-50 dark:bg-zinc-950"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(148,163,184,0.32) 1px, transparent 1px)',
            backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
          }}
        >
          <div
            style={{
              width: canvasBounds.width,
              height: canvasBounds.height,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              position: 'relative',
            }}
          >
            {/* CAPA SVG DE CONECTORES */}
            <svg
              width={canvasBounds.width}
              height={canvasBounds.height}
              className="absolute inset-0 pointer-events-none"
            >
              <defs>
                <marker
                  id="wa-arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const path = buildBezierPath(edge.x1, edge.y1, edge.x2, edge.y2);
                const midX = (edge.x1 + edge.x2) / 2;
                const midY = (edge.y1 + edge.y2) / 2;
                const isSelectedEdge = edge.sourceNodeId === selectedNode?.id;
                return (
                  <g key={edge.id} className="pointer-events-auto">
                    <path
                      d={path}
                      fill="none"
                      stroke={edge.color}
                      strokeWidth={isSelectedEdge ? 3 : 2.2}
                      strokeOpacity={isSelectedEdge ? 0.95 : 0.65}
                      markerEnd="url(#wa-arrow)"
                    />
                    <g
                      transform={`translate(${midX}, ${midY})`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(edge.sourceNodeId);
                        setInspectorOpen(true);
                      }}
                    >
                      <rect
                        x={-54}
                        y={-11}
                        width={108}
                        height={22}
                        rx={11}
                        fill="#0f172a"
                        fillOpacity={0.82}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill="#ffffff"
                      >
                        {edge.label.length > 15 ? `${edge.label.slice(0, 14)}…` : edge.label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Cable temporal mientras arrastras desde un puerto */}
              {connectingFrom && (
                <path
                  d={buildBezierPath(
                    connectingFrom.startX,
                    connectingFrom.startY,
                    connectingFrom.mouseX,
                    connectingFrom.mouseY
                  )}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={2.8}
                  strokeDasharray="6 4"
                />
              )}
            </svg>

            {/* CAPA DE NODOS ARRASTRABLES */}
            {nodes.map((node, idx) => {
              const pos = nodePositions.get(node.id) || getNodePos(node, idx);
              const meta = getNodeVisualMeta(node.type);
              const Icon = meta.icon;
              const isSelected = selectedNode?.id === node.id;
              const isDropTarget =
                connectingFrom &&
                connectingFrom.sourceNodeId !== node.id &&
                hoveredTargetNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onMouseEnter={() => {
                    if (connectingFrom && connectingFrom.sourceNodeId !== node.id) {
                      setHoveredTargetNodeId(node.id);
                    }
                  }}
                  onMouseLeave={() => {
                    if (hoveredTargetNodeId === node.id) {
                      setHoveredTargetNodeId(null);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (didDragRef.current) {
                      didDragRef.current = false;
                      return;
                    }
                    onSelectNode(node.id);
                    setInspectorOpen(true);
                  }}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: NODE_WIDTH,
                  }}
                  className={`rounded-2xl border bg-white dark:bg-zinc-900 shadow-md transition-shadow ${
                    isDropTarget
                      ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-500/20'
                      : isSelected
                        ? 'ring-2 ring-emerald-500/70 border-emerald-500/60 shadow-lg'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  } ${!node.enabled ? 'opacity-60' : ''}`}
                >
                  {/* Puerto de ENTRADA (Izquierda) */}
                  <div
                    data-port="input"
                    title="Puerto de entrada: suelta un conector aquí"
                    className={`absolute -left-2.5 top-[15px] w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center transition-transform ${
                      isDropTarget ? 'scale-125 bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  {/* Cabecera arrastrable */}
                  <div
                    onMouseDown={(e) => handleNodeMouseDown(e, node, idx)}
                    style={{ height: HEADER_HEIGHT }}
                    className="px-3 flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 cursor-grab active:cursor-grabbing rounded-t-2xl bg-zinc-50/80 dark:bg-zinc-800/40"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {node.title}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{
                        backgroundColor: `${meta.color}20`,
                        color: meta.color,
                      }}
                    >
                      {meta.badge}
                    </span>
                  </div>

                  {/* Extracto del mensaje */}
                  <div
                    style={{ height: BODY_HEIGHT }}
                    className="px-3 py-2 text-[11px] text-zinc-600 dark:text-zinc-400 overflow-hidden leading-snug"
                  >
                    <p className="line-clamp-2">{node.messageBody || 'Sin mensaje configurado'}</p>
                  </div>

                  {/* Opciones con puertos de SALIDA (Derecha) */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {node.options.map((opt, optIdx) => {
                      const portX = pos.x + NODE_WIDTH;
                      const portY =
                        pos.y + HEADER_HEIGHT + BODY_HEIGHT + optIdx * OPTION_ROW_HEIGHT + OPTION_ROW_HEIGHT / 2;
                      const isConnected = Boolean(
                        opt.nextNodeId && nodes.some((n) => n.id === opt.nextNodeId)
                      );
                      return (
                        <div
                          key={opt.id}
                          style={{ height: OPTION_ROW_HEIGHT }}
                          className="relative px-3 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {opt.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isConnected && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDisconnectOption(node.id, opt.id);
                                }}
                                title="Desconectar cable"
                                className="p-0.5 text-zinc-400 hover:text-rose-500"
                              >
                                <Unlink className="w-3 h-3" />
                              </button>
                            )}
                            <span className="text-[10px] text-zinc-400">
                              {isConnected ? 'Conectado' : 'Arrastra →'}
                            </span>
                          </div>

                          {/* Puerto de SALIDA arrastrable */}
                          <button
                            type="button"
                            data-port="output"
                            onMouseDown={(e) => handlePortMouseDown(e, node.id, opt.id, portX, portY)}
                            title="Arrastra hacia otro nodo para conectar"
                            className={`absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center cursor-crosshair transition-transform hover:scale-125 ${
                              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Acción rápida para añadir botón conector desde el propio nodo */}
                    {node.interactionType !== 'text' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNode(node.id);
                          onUpdateNode(node.id, {
                            options: [
                              ...node.options,
                              {
                                id: `opt_${Date.now().toString(36)}`,
                                label: 'Nueva opción',
                                nextNodeId: '',
                              },
                            ],
                          });
                        }}
                        className="w-full py-1.5 px-3 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center gap-1 rounded-b-2xl"
                      >
                        <Plus className="w-3 h-3" />
                        Añadir botón conector
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* INSPECTOR FLOTANTE DEL NODO SELECCIONADO (SOLO CUANDO SE INVOCA) */}
      {inspectorOpen && selectedNode && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-14 right-4 bottom-4 w-[380px] max-w-[calc(100%-2rem)] z-30 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl p-5 space-y-4 overflow-y-auto"
        >
          <>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {selectedNode.title}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer mr-1">
                  <input
                    type="checkbox"
                    checked={selectedNode.enabled}
                    onChange={(e) => onUpdateNode(selectedNode.id, { enabled: e.target.checked })}
                    className="accent-emerald-600"
                  />
                  Activo
                </label>
                {selectedNode.id !== 'welcome' && (
                  <button
                    type="button"
                    onClick={() => onDeleteNode(selectedNode.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
                    title="Eliminar nodo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Cerrar editor flotante"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Nombre del Nodo
              </label>
              <input
                type="text"
                value={selectedNode.title}
                onChange={(e) => onUpdateNode(selectedNode.id, { title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Tipo de Respuesta Interactiva
              </label>
              <select
                value={selectedNode.interactionType}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    interactionType: e.target.value as WhatsAppFlowNode['interactionType'],
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="buttons">Botones rápidos (hasta 3)</option>
                <option value="list">Lista desplegable (hasta 10)</option>
                <option value="text">Solo texto (sin conectores)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Palabras clave disparadoras
              </label>
              <input
                type="text"
                value={selectedNode.triggerKeywords.join(', ')}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    triggerKeywords: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="hola, pedir, pizza..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Mensaje del Chatbot
              </label>
              <textarea
                rows={4}
                value={selectedNode.messageBody}
                onChange={(e) => onUpdateNode(selectedNode.id, { messageBody: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
              />
            </div>

            {selectedNode.interactionType !== 'text' && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Botones y Destinos (Conectores)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateNode(selectedNode.id, {
                        options: [
                          ...selectedNode.options,
                          {
                            id: `opt_${Date.now().toString(36)}`,
                            label: 'Nueva opción',
                            nextNodeId: '',
                          },
                        ],
                      })
                    }
                    className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir
                  </button>
                </div>

                {selectedNode.options.map((opt, idx) => (
                  <div key={opt.id} className="space-y-1.5 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/30">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={20}
                        value={opt.label}
                        onChange={(e) => {
                          const next = [...selectedNode.options];
                          next[idx] = { ...opt, label: e.target.value };
                          onUpdateNode(selectedNode.id, { options: next });
                        }}
                        placeholder="Etiqueta del botón"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateNode(selectedNode.id, {
                            options: selectedNode.options.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <select
                      value={opt.nextNodeId}
                      onChange={(e) => {
                        const next = [...selectedNode.options];
                        next[idx] = { ...opt, nextNodeId: e.target.value };
                        onUpdateNode(selectedNode.id, { options: next });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="">— Sin conectar (arrastra el puerto) —</option>
                      {nodes
                        .filter((n) => n.id !== selectedNode.id)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            Conectar a → {n.title}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </>
        </div>
      )}
    </div>
  );
};
