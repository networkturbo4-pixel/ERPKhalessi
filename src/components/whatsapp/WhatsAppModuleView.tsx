import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Bot,
  Send,
  Settings2,
  GitBranch,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  UserCheck,
  Sparkles,
  Store,
  Building2,
  ShoppingBag,
  ExternalLink,
  RotateCcw,
  Activity,
  PhoneCall,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import {
  WhatsAppConversation,
  WhatsAppDeliveryLog,
  WhatsAppFlowNode,
  WhatsAppMetaCredentials,
  WhatsAppModuleConfig,
} from '../../types/whatsapp';
import {
  createDefaultWhatsAppConfig,
  createEmptyMetaCredentials,
  DEFAULT_CHATBOT_FLOW_NODES,
  loadWhatsAppConfig,
  loadWhatsAppConversations,
  loadWhatsAppLogs,
  runLocalChatbotTurn,
  saveWhatsAppConfig,
  saveWhatsAppConversations,
  sendAgentWhatsAppReply,
  syncWhatsAppConfigToServer,
  testMetaConnection,
} from '../../utils/whatsappService';
import { WhatsAppFlowCanvas, WhatsAppNodePresetKey } from './WhatsAppFlowCanvas';

type WhatsAppTab = 'inbox' | 'flows' | 'tracking' | 'connection';

const TEMPLATE_VARIABLES = [
  '{{cliente}}',
  '{{pedido}}',
  '{{sucursal}}',
  '{{total}}',
  '{{repartidor}}',
  '{{link_tienda}}',
];

interface WhatsAppModuleViewProps {
  onOpenInbox?: () => void;
}

export const WhatsAppModuleView: React.FC<WhatsAppModuleViewProps> = ({ onOpenInbox }) => {
  const {
    activeTenant,
    tenants,
    branchScope,
    customization,
    dispatchToast,
    openNoticeModal,
  } = useSettings();
  const { products, orders, createOrder } = useOrderCatalog();

  const [activeTab, setActiveTab] = useState<WhatsAppTab>('flows');
  const [config, setConfig] = useState<WhatsAppModuleConfig>(() => loadWhatsAppConfig());
  const [conversations, setConversations] = useState<WhatsAppConversation[]>(() => {
    const saved = loadWhatsAppConversations();
    if (saved.length > 0) return saved;
    const demoConv: WhatsAppConversation = {
      id: `sim_${activeTenant.id}`,
      channel: 'whatsapp',
      customerPhone: '51999888777',
      customerName: 'Cliente Simulador',
      branchId: activeTenant.id,
      controlMode: 'bot',
      currentNodeId: 'welcome',
      pendingStep: null,
      cart: [],
      tags: ['Consulta'],
      unreadCount: 0,
      lastMessageAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome_init',
          sender: 'bot',
          text: `¡Hola! Soy el asistente de *${customization.appName}*. Escribe *"Hola"* o usa los botones de abajo para probar el flujo automático.`,
          timestamp: new Date().toISOString(),
          interactiveType: 'buttons',
          buttons: [
            { id: 'node:order_catalog', label: 'Hacer un pedido' },
            { id: 'node:order_status', label: 'Seguir mi pedido' },
            { id: 'node:handoff', label: 'Hablar con asesor' },
          ],
        },
      ],
    };
    return [demoConv];
  });
  const [logs, setLogs] = useState<WhatsAppDeliveryLog[]>(() => loadWhatsAppLogs());
  const [selectedConvId, setSelectedConvId] = useState<string>(() => conversations[0]?.id || '');
  const [chatInput, setChatInput] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => config.flowNodes[0]?.id || 'welcome');
  const [flowEditorMode, setFlowEditorMode] = useState<'canvas' | 'list'>('canvas');
  const [credsBranchId, setCredsBranchId] = useState<string>(activeTenant.id);
  const [isTestingMeta, setIsTestingMeta] = useState(false);
  const [isSyncingServer, setIsSyncingServer] = useState(false);

  useEffect(() => {
    setCredsBranchId(activeTenant.id);
  }, [activeTenant.id]);

  // Guardar inmediatamente en almacenamiento persistente cada cambio de configuración
  const updateConfig = (updater: (prev: WhatsAppModuleConfig) => WhatsAppModuleConfig) => {
    setConfig((prev) => {
      const next = saveWhatsAppConfig(updater(prev));
      return next;
    });
  };

  const updateConversations = (updater: (prev: WhatsAppConversation[]) => WhatsAppConversation[]) => {
    setConversations((prev) => {
      const next = updater(prev);
      saveWhatsAppConversations(next);
      return next;
    });
  };

  const visibleConversations = useMemo(() => {
    if (branchScope === 'consolidated') return conversations;
    return conversations.filter((c) => !c.branchId || c.branchId === activeTenant.id);
  }, [conversations, branchScope, activeTenant.id]);

  const activeConversation = useMemo(
    () => visibleConversations.find((c) => c.id === selectedConvId) || visibleConversations[0] || null,
    [visibleConversations, selectedConvId]
  );

  const selectedNode = useMemo(
    () => config.flowNodes.find((n) => n.id === selectedNodeId) || config.flowNodes[0] || null,
    [config.flowNodes, selectedNodeId]
  );

  const currentCreds: WhatsAppMetaCredentials = useMemo(() => {
    if (config.numberMode === 'per_branch') {
      return config.branchCredentials[credsBranchId] || createEmptyMetaCredentials(config.realtimeServerUrl);
    }
    return config.centralizedCredentials;
  }, [config, credsBranchId]);

  const updateCurrentCreds = (patch: Partial<WhatsAppMetaCredentials>) => {
    updateConfig((prev) => {
      if (prev.numberMode === 'per_branch') {
        const existing = prev.branchCredentials[credsBranchId] || createEmptyMetaCredentials(prev.realtimeServerUrl);
        return {
          ...prev,
          branchCredentials: {
            ...prev.branchCredentials,
            [credsBranchId]: { ...existing, ...patch },
          },
        };
      }
      return {
        ...prev,
        centralizedCredentials: {
          ...prev.centralizedCredentials,
          ...patch,
        },
      };
    });
  };

  // --- Interacción del Simulador / Bandeja ---
  const handleSendChatTurn = async (textOverride?: string, buttonId?: string) => {
    if (!activeConversation) return;
    const text = (textOverride ?? chatInput).trim();
    if (!text && !buttonId) return;
    setChatInput('');

    // Si el chat está en control humano, el texto sale como respuesta de asesor
    if (activeConversation.controlMode === 'human' && !buttonId) {
      const agentMsgId = `agent_${Date.now()}`;
      updateConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                lastMessageAt: new Date().toISOString(),
                messages: [
                  ...c.messages,
                  {
                    id: agentMsgId,
                    sender: 'agent',
                    text,
                    timestamp: new Date().toISOString(),
                    status: 'sent',
                  },
                ],
              }
            : c
        )
      );
      const res = await sendAgentWhatsAppReply({
        config,
        branchId: activeConversation.branchId || activeTenant.id,
        toPhone: activeConversation.customerPhone,
        text,
      });
      setLogs(loadWhatsAppLogs());
      dispatchToast(
        res.simulated ? 'Respuesta registrada (Simulador)' : 'Mensaje enviado por WhatsApp',
        res.simulated
          ? 'Activa tus credenciales de Meta Cloud API para enviarlo al teléfono real.'
          : `Enviado a ${activeConversation.customerPhone}`,
        res.ok ? 'success' : 'warning'
      );
      return;
    }

    // Flujo simulado como mensaje entrante del cliente -> respuesta automática del chatbot
    const customerMsg = {
      id: `cust_${Date.now()}`,
      sender: 'customer' as const,
      text: text || buttonId || '',
      timestamp: new Date().toISOString(),
    };

    const convWithIncoming: WhatsAppConversation = {
      ...activeConversation,
      lastMessageAt: new Date().toISOString(),
      messages: [...activeConversation.messages, customerMsg],
    };

    if (!config.autoReplyEnabled) {
      updateConversations((prev) => prev.map((c) => (c.id === activeConversation.id ? convWithIncoming : c)));
      dispatchToast('Auto-respuesta pausada', 'Activa el chatbot automático en la pestaña Flujos.', 'info');
      return;
    }

    const turn = runLocalChatbotTurn({
      config,
      conversation: convWithIncoming,
      userText: text,
      buttonId,
      brandName: customization.appName,
      branches: tenants.map((t) => ({ id: t.id, name: t.name, address: t.operations?.address })),
      products,
      orders,
    });

    // Si completó un pedido dentro de WhatsApp, crearlo realmente en el ERP
    let createdNumber: string | undefined;
    if (turn.createdOrderPayload && turn.createdOrderPayload.cart.length > 0) {
      const subtotal = turn.createdOrderPayload.cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const isPickup = turn.createdOrderPayload.deliveryAddress.toLowerCase().includes('recojo');
      const created = createOrder({
        tenantId: turn.createdOrderPayload.branchId,
        channel: isPickup ? 'pos-takeaway' : 'online',
        customerName: turn.createdOrderPayload.customerName,
        customerPhone: turn.createdOrderPayload.customerPhone,
        deliveryAddress: turn.createdOrderPayload.deliveryAddress,
        paymentMethod: 'yape_plin',
        paymentStatus: 'pendiente',
        subtotal,
        deliveryFee: 0,
        discount: 0,
        total: subtotal,
        estimatedMinutes: 30,
        items: turn.createdOrderPayload.cart.map((item, idx) => ({
          itemId: `wa_item_${Date.now()}_${idx}`,
          productId: item.productId,
          productName: item.productName,
          productImage: products.find((p) => p.id === item.productId)?.imageUrl || '',
          subOptions: [],
          extras: [],
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.unitPrice * item.quantity,
        })),
        deliveryReference: 'Pedido tomado automáticamente por Chatbot WhatsApp',
      });
      createdNumber = created.orderNumber;
    }

    const botMsg = {
      id: `bot_${Date.now() + 1}`,
      sender: 'bot' as const,
      text: createdNumber ? `${turn.replyText}\n\n*Comanda ERP:* ${createdNumber}` : turn.replyText,
      timestamp: new Date().toISOString(),
      status: 'sent' as const,
      interactiveType: turn.interactiveType,
      buttons: turn.buttons,
    };

    const finalConv: WhatsAppConversation = {
      ...turn.updatedConversation,
      linkedOrderNumber: createdNumber || turn.updatedConversation.linkedOrderNumber,
      lastMessageAt: new Date().toISOString(),
      messages: [...convWithIncoming.messages, botMsg],
    };

    updateConversations((prev) => prev.map((c) => (c.id === activeConversation.id ? finalConv : c)));
    setLogs(loadWhatsAppLogs());
  };

  const handleNewSimulatorChat = () => {
    const id = `sim_${Date.now()}`;
    const newConv: WhatsAppConversation = {
      id,
      channel: 'whatsapp',
      customerPhone: `519${Math.floor(10000000 + Math.random() * 89999999)}`,
      customerName: `Cliente Prueba #${conversations.length + 1}`,
      branchId: config.numberMode === 'per_branch' ? activeTenant.id : '',
      controlMode: 'bot',
      currentNodeId: 'welcome',
      pendingStep: null,
      cart: [],
      tags: ['Consulta'],
      unreadCount: 0,
      lastMessageAt: new Date().toISOString(),
      messages: [
        {
          id: `init_${Date.now()}`,
          sender: 'bot',
          text:
            config.numberMode === 'centralized' && tenants.length > 1
              ? `Nueva sesión de prueba en modo *Número Único Centralizado*. Escribe *"Hola"* para ver el selector de sucursal.`
              : `Nueva sesión de prueba para *${activeTenant.name}*. Escribe *"Hola"* para iniciar el flujo.`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    updateConversations((prev) => [newConv, ...prev]);
    setSelectedConvId(id);
    dispatchToast('Simulador listo', 'Prueba el flujo completo como si fueras un cliente en WhatsApp.', 'info');
  };

  const handleToggleControlMode = (convId: string) => {
    updateConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const nextMode = c.controlMode === 'bot' ? 'human' : 'bot';
        return {
          ...c,
          controlMode: nextMode,
          pausedUntil:
            nextMode === 'human'
              ? new Date(Date.now() + (config.humanHandoffMinutes || 30) * 60_000).toISOString()
              : undefined,
        };
      })
    );
  };

  // --- Gestión de Flujos ---
  const handleUpdateNode = (nodeId: string, patch: Partial<WhatsAppFlowNode>) => {
    updateConfig((prev) => ({
      ...prev,
      flowNodes: prev.flowNodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    }));
  };

  const handleAddCustomNode = (preset: WhatsAppNodePresetKey = 'custom') => {
    const newId = `${preset}_${Date.now().toString(36)}`;
    const basePosition = {
      x: 120 + (config.flowNodes.length % 3) * 340,
      y: 60 + Math.floor(config.flowNodes.length / 3) * 220,
    };

    const presetMap: Record<WhatsAppNodePresetKey, Omit<WhatsAppFlowNode, 'id' | 'position'>> = {
      custom: {
        title: 'Nuevo Paso Personalizado',
        type: 'custom',
        enabled: true,
        triggerKeywords: ['info', 'consulta'],
        messageBody: 'Escribe aquí la respuesta automática de este paso y conecta sus botones hacia otros nodos.',
        interactionType: 'buttons',
        options: [{ id: `opt_${Date.now()}`, label: 'Menú principal', nextNodeId: 'welcome' }],
      },
      promo: {
        title: 'Promociones y Combos',
        type: 'custom',
        enabled: true,
        triggerKeywords: ['promo', 'promocion', 'promoción', 'combo', 'oferta'],
        messageBody: '*Promociones de hoy:*\n• 2x1 en Pizzas Familiares\n• Combo Dúo + Gaseosa 1.5L\n\n¿Deseas pedir alguna promoción?',
        interactionType: 'buttons',
        options: [
          { id: `opt_p1_${Date.now()}`, label: 'Pedir promo', nextNodeId: 'order_catalog' },
          { id: `opt_p2_${Date.now()}`, label: 'Menú principal', nextNodeId: 'welcome' },
        ],
      },
      branch_select: {
        title: 'Selector de Sucursal',
        type: 'branch_select',
        enabled: true,
        triggerKeywords: ['sucursal', 'local', 'sede', 'tienda'],
        messageBody: 'Selecciona la *sucursal más cercana* para atender tu pedido:',
        interactionType: 'list',
        options: [{ id: `opt_b1_${Date.now()}`, label: 'Ver catálogo', nextNodeId: 'order_catalog' }],
      },
      faq: {
        title: 'Horarios y Medios de Pago',
        type: 'faq',
        enabled: true,
        triggerKeywords: ['horario', 'pago', 'yape', 'plin', 'tarjeta'],
        messageBody: '*Horario:* Lunes a Domingo 12:00 p.m. - 11:00 p.m.\n*Pagos:* Yape, Plin, Tarjeta y Efectivo.',
        interactionType: 'buttons',
        options: [{ id: `opt_f1_${Date.now()}`, label: 'Hacer un pedido', nextNodeId: 'order_catalog' }],
      },
      store_link: {
        title: 'Enlace a Tienda Online',
        type: 'store_link',
        enabled: true,
        triggerKeywords: ['link', 'web', 'tienda'],
        messageBody: 'Realiza tu pedido y paga online al instante aquí:\n{{link_tienda}}',
        interactionType: 'buttons',
        options: [{ id: `opt_s1_${Date.now()}`, label: 'Seguir pedido', nextNodeId: 'order_status' }],
      },
      order_status: {
        title: 'Consultar Estado de Pedido',
        type: 'order_status',
        enabled: true,
        triggerKeywords: ['seguimiento', 'estado', 'pedido'],
        messageBody: 'Indícame tu *número de pedido* para consultar su estado en cocina o delivery.',
        interactionType: 'text',
        options: [],
      },
      handoff: {
        title: 'Derivar a Asesor Humano',
        type: 'handoff',
        enabled: true,
        triggerKeywords: ['asesor', 'humano', 'soporte'],
        messageBody: 'He pausado el bot y notifiqué a nuestro equipo. Un asesor te atenderá en breve.',
        interactionType: 'text',
        options: [],
      },
    };

    const newNode: WhatsAppFlowNode = {
      id: newId,
      position: basePosition,
      ...presetMap[preset],
    };

    updateConfig((prev) => ({ ...prev, flowNodes: [...prev.flowNodes, newNode] }));
    setSelectedNodeId(newId);
    dispatchToast('Nodo agregado al flujo', `"${newNode.title}" ya está sincronizado en Lienzo y Vista Lista.`, 'success');
  };

  const handleDeleteNode = (nodeId: string) => {
    openNoticeModal({
      title: '¿Eliminar paso del flujo?',
      message: 'Este nodo dejará de responder automáticamente a los clientes. Podrás volver a crearlo cuando quieras.',
      tone: 'warning',
      confirmLabel: 'Eliminar Paso',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        updateConfig((prev) => ({
          ...prev,
          flowNodes: prev.flowNodes.filter((n) => n.id !== nodeId),
        }));
        setSelectedNodeId('welcome');
        dispatchToast('Nodo eliminado', 'El flujo del chatbot fue actualizado.', 'info');
      },
    });
  };

  const handleRestoreDefaultFlows = () => {
    openNoticeModal({
      title: '¿Restaurar flujos recomendados?',
      message: 'Se reemplazarán tus pasos actuales por la plantilla recomendada para pizzería (Bienvenida, Catálogo, Tienda, Seguimiento, FAQ y Asesor).',
      tone: 'warning',
      confirmLabel: 'Restaurar Flujos',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        updateConfig((prev) => ({
          ...prev,
          flowNodes: DEFAULT_CHATBOT_FLOW_NODES,
        }));
        setSelectedNodeId('welcome');
        dispatchToast('Flujos restaurados', 'Se cargó la plantilla oficial de pizzería.', 'success');
      },
    });
  };

  // --- Conexión Meta Cloud API ---
  const handleTestMeta = async () => {
    setIsTestingMeta(true);
    const res = await testMetaConnection(currentCreds, config.realtimeServerUrl);
    setIsTestingMeta(false);
    if (res.ok) {
      dispatchToast(
        'Conexión exitosa con Meta Cloud API',
        `Cuenta verificada: ${res.verifiedName || 'WhatsApp Business'} (${res.displayPhoneNumber || currentCreds.phoneNumberId})`,
        'success'
      );
    } else {
      openNoticeModal({
        title: 'No se pudo validar con Meta Graph API',
        message: res.error || 'Verifica tu Phone Number ID, Access Token y que tu servidor Node.js esté activo.',
        tone: 'danger',
        confirmLabel: 'Entendido',
        hideCancel: true,
      });
    }
  };

  const handleSyncServer = async () => {
    setIsSyncingServer(true);
    const res = await syncWhatsAppConfigToServer({
      config,
      products,
      branches: tenants.map((t) => ({ id: t.id, name: t.name, address: t.operations?.address })),
      orders,
    });
    setIsSyncingServer(false);
    if (res.ok) {
      dispatchToast('Sincronizado con el servidor', 'El webhook de Meta ya tiene tus flujos, catálogo y credenciales actualizadas.', 'success');
    } else {
      dispatchToast('Configuración guardada localmente', `No se pudo alcanzar el servidor Node.js (${res.error}). Se sincronizará cuando esté en línea.`, 'warning');
    }
  };

  const handleCopyText = (val: string, label: string) => {
    navigator.clipboard?.writeText(val).then(
      () => dispatchToast('Copiado', `${label} copiado al portapapeles.`, 'success'),
      () => dispatchToast('No se pudo copiar', 'Copia el valor manualmente.', 'warning')
    );
  };

  const activeTrackingCount = config.orderNotifications.filter((r) => r.enabled).length;
  const activeNodesCount = config.flowNodes.filter((n) => n.enabled).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="saas-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                WhatsApp Cloud API & Chatbot
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                Meta Oficial
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {config.numberMode === 'centralized' ? 'Número Único' : 'Número por Sucursal'}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {config.salesMode === 'in_chat_order' ? 'Pedido en Chat' : 'Link a Tienda'}
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Seguimiento automático de estados de pedido ({activeTrackingCount}/7 activos) y atención autónoma 24/7 con {activeNodesCount} flujos configurados.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenInbox && (
            <button
              type="button"
              onClick={onOpenInbox}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <MessageSquare className="w-4 h-4" />
              Abrir Bandeja Omnicanal
            </button>
          )}
          <button
            type="button"
            onClick={handleSyncServer}
            disabled={isSyncingServer}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingServer ? 'animate-spin' : ''}`} />
            Sincronizar Webhook
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        {(
          [
            { id: 'flows', label: 'Flujos del Chatbot', icon: GitBranch },
            { id: 'tracking', label: 'Seguimiento de Pedidos', icon: BellRing },
            { id: 'connection', label: 'Conexión Meta API & Logs', icon: Settings2 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                active
                  ? 'text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
              }`}
              style={active ? { backgroundColor: customization.primaryColor } : undefined}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: BANDEJA & SIMULADOR */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Lista de conversaciones */}
          <div className="lg:col-span-4 saas-card p-4 flex flex-col gap-3 max-h-[680px]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Conversaciones ({visibleConversations.length})
              </h2>
              <button
                type="button"
                onClick={handleNewSimulatorChat}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                Probar Bot
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1">
              {visibleConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const lastMsg = conv.messages[conv.messages.length - 1];
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                        {conv.customerName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                          conv.controlMode === 'bot'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {conv.controlMode === 'bot' ? 'Bot 24/7' : 'Asesor'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center justify-between">
                      <span>+{conv.customerPhone}</span>
                      {conv.linkedOrderNumber && (
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                          {conv.linkedOrderNumber}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-1.5">
                        {lastMsg.text}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ventana de chat */}
          <div className="lg:col-span-8 saas-card flex flex-col h-[680px] overflow-hidden">
            {activeConversation ? (
              <>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-900 dark:text-white">
                        {activeConversation.customerName}
                      </h3>
                      <span className="text-xs text-zinc-500 font-mono">
                        +{activeConversation.customerPhone}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {activeConversation.controlMode === 'bot'
                        ? 'Chatbot atendiendo automáticamente. Escribe abajo para simular al cliente.'
                        : 'Bot pausado. Tus mensajes se enviarán como respuesta de asesor humano.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleControlMode(activeConversation.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 ${
                      activeConversation.controlMode === 'bot'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {activeConversation.controlMode === 'bot' ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        Tomar Control Humano
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5" />
                        Reactivar Chatbot
                      </>
                    )}
                  </button>
                </div>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/70 dark:bg-zinc-950/40">
                  {activeConversation.messages.map((msg) => {
                    const isCustomer = msg.sender === 'customer';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${
                            isCustomer
                              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700'
                              : msg.sender === 'bot'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-sky-600 text-white'
                          }`}
                        >
                          <div className="text-[10px] opacity-75 mb-1 font-semibold uppercase tracking-wide">
                            {isCustomer ? 'Cliente' : msg.sender === 'bot' ? 'Chatbot Automático' : 'Asesor Humano'}
                          </div>
                          <div>{msg.text}</div>

                          {msg.buttons && msg.buttons.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {msg.buttons.map((btn) => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  onClick={() => handleSendChatTurn(btn.label, btn.id)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/95 text-emerald-800 hover:bg-white transition-colors shadow-sm text-left"
                                >
                                  <div>{btn.label}</div>
                                  {btn.description && (
                                    <div className="text-[10px] font-normal text-zinc-500">
                                      {btn.description}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendChatTurn();
                  }}
                  className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-zinc-900"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      activeConversation.controlMode === 'bot'
                        ? 'Simula un mensaje del cliente (ej. "Hola", "Quiero pedir", "1021")...'
                        : 'Escribe una respuesta como asesor humano...'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap shrink-0"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <Send className="w-4 h-4" />
                    Enviar
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
                Selecciona o crea una conversación para empezar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FLUJOS DEL CHATBOT */}
      {activeTab === 'flows' && (
        <div className="space-y-4">
          {flowEditorMode === 'canvas' ? (
            <WhatsAppFlowCanvas
              nodes={config.flowNodes}
              selectedNodeId={selectedNode?.id || 'welcome'}
              primaryColor={customization.primaryColor}
              viewMode={flowEditorMode}
              onChangeViewMode={setFlowEditorMode}
              onSelectNode={setSelectedNodeId}
              onUpdateNode={handleUpdateNode}
              onUpdateAllNodes={(nextNodes) => updateConfig((prev) => ({ ...prev, flowNodes: nextNodes }))}
              onAddNode={handleAddCustomNode}
              onDeleteNode={handleDeleteNode}
              onRestoreDefaults={handleRestoreDefaultFlows}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4 saas-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Pasos del Flujo ({config.flowNodes.length})
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFlowEditorMode('canvas')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
                    >
                      Lienzo
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreDefaultFlows}
                      title="Restaurar plantilla recomendada"
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomNode('custom')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                      style={{ backgroundColor: customization.primaryColor }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nuevo Paso
                    </button>
                  </div>
                </div>

              <div className="space-y-2">
                {config.flowNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedNode?.id === node.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                        {node.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          node.enabled
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {node.enabled ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-1">
                      Disparadores: {node.triggerKeywords.join(', ') || 'Por botón'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 saas-card p-5 space-y-4">
              {selectedNode ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-zinc-900 dark:text-white">
                        Editando: {selectedNode.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedNode.enabled}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { enabled: e.target.checked })}
                          className="accent-emerald-600"
                        />
                        Paso activo
                      </label>
                      {selectedNode.id !== 'welcome' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNode(selectedNode.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
                          title="Eliminar paso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Nombre del Paso
                      </label>
                      <input
                        type="text"
                        value={selectedNode.title}
                        onChange={(e) => handleUpdateNode(selectedNode.id, { title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Tipo de Respuesta Interactiva (Meta)
                      </label>
                      <select
                        value={selectedNode.interactionType}
                        onChange={(e) =>
                          handleUpdateNode(selectedNode.id, {
                            interactionType: e.target.value as WhatsAppFlowNode['interactionType'],
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                      >
                        <option value="buttons">Botones rápidos (hasta 3)</option>
                        <option value="list">Lista desplegable (hasta 10)</option>
                        <option value="text">Solo texto</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Palabras clave disparadoras (separadas por coma)
                    </label>
                    <input
                      type="text"
                      value={selectedNode.triggerKeywords.join(', ')}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          triggerKeywords: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Mensaje que envía el Chatbot (soporta {'{{marca}}'} y {'{{link_tienda}}'})
                    </label>
                    <textarea
                      rows={4}
                      value={selectedNode.messageBody}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { messageBody: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    />
                  </div>

                  {selectedNode.interactionType !== 'text' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          Botones / Opciones de navegación
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNode(selectedNode.id, {
                              options: [
                                ...selectedNode.options,
                                {
                                  id: `opt_${Date.now()}`,
                                  label: 'Nueva opción',
                                  nextNodeId: 'welcome',
                                },
                              ],
                            })
                          }
                          className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Añadir botón
                        </button>
                      </div>

                      {selectedNode.options.map((opt, idx) => (
                        <div key={opt.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={opt.label}
                            maxLength={20}
                            onChange={(e) => {
                              const next = [...selectedNode.options];
                              next[idx] = { ...opt, label: e.target.value };
                              handleUpdateNode(selectedNode.id, { options: next });
                            }}
                            placeholder="Texto del botón (máx. 20 car.)"
                            className="md:col-span-5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                          />
                          <select
                            value={opt.nextNodeId}
                            onChange={(e) => {
                              const next = [...selectedNode.options];
                              next[idx] = { ...opt, nextNodeId: e.target.value };
                              handleUpdateNode(selectedNode.id, { options: next });
                            }}
                            className="md:col-span-6 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                          >
                            {config.flowNodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                Ir a → {n.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                options: selectedNode.options.filter((_, i) => i !== idx),
                              })
                            }
                            className="md:col-span-1 p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg justify-self-end"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
          )}
        </div>
      )}

      {/* TAB 3: SEGUIMIENTO DE PEDIDOS */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          <div className="saas-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Mensajes Automáticos de Seguimiento de Proceso
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Se envían solos al WhatsApp del cliente cada vez que Cocina KDS, POS o Delivery cambia el estado del pedido.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <span
                  key={v}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {config.orderNotifications.map((rule) => (
              <div key={rule.status} className="saas-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{rule.label}</h3>
                    <span className="text-[11px] font-mono text-zinc-500">Estado ERP: {rule.status}</span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          orderNotifications: prev.orderNotifications.map((r) =>
                            r.status === rule.status ? { ...r, enabled: e.target.checked } : r
                          ),
                        }))
                      }
                      className="w-4 h-4 accent-emerald-600"
                    />
                    {rule.enabled ? 'Activo' : 'Inactivo'}
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                      Plantilla Meta (Utility)
                    </label>
                    <input
                      type="text"
                      value={rule.templateName}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          orderNotifications: prev.orderNotifications.map((r) =>
                            r.status === rule.status ? { ...r, templateName: e.target.value } : r
                          ),
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                      Idioma / Modo
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rule.templateLanguage}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            orderNotifications: prev.orderNotifications.map((r) =>
                              r.status === rule.status ? { ...r, templateLanguage: e.target.value } : r
                            ),
                          }))
                        }
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                      />
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={rule.useMetaTemplate}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              orderNotifications: prev.orderNotifications.map((r) =>
                                r.status === rule.status ? { ...r, useMetaTemplate: e.target.checked } : r
                              ),
                            }))
                          }
                          className="accent-emerald-600"
                        />
                        Usar Template Meta
                      </label>
                    </div>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={rule.bodyText}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      orderNotifications: prev.orderNotifications.map((r) =>
                        r.status === rule.status ? { ...r, bodyText: e.target.value } : r
                      ),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CONEXIÓN META CLOUD API & LOGS */}
      {activeTab === 'connection' && (
        <div className="space-y-5">
          {/* Modo de Atención y Ventas del Chatbot */}
          <div className="saas-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Modo de Atención y Ventas del Chatbot
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Elige cómo cerrará los pedidos el bot cuando un cliente quiera comprar.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoReplyEnabled}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, autoReplyEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Chatbot 24/7 Activo
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => updateConfig((prev) => ({ ...prev, salesMode: 'in_chat_order' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  config.salesMode === 'in_chat_order'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold text-zinc-900 dark:text-white">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  Pedido Completo dentro de WhatsApp
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5">
                  El bot muestra tu catálogo interactivo en lista, arma el carrito del cliente, pide la dirección y registra el pedido automáticamente en Cocina KDS y Pedidos.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateConfig((prev) => ({ ...prev, salesMode: 'storefront_link' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  config.salesMode === 'storefront_link'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold text-zinc-900 dark:text-white">
                  <ExternalLink className="w-5 h-5 text-emerald-600" />
                  Asistente + Link a Tienda Online para Pagar
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5">
                  El bot responde dudas, horarios, menú y seguimiento de pedidos, y envía el enlace directo a tu tienda online para elegir toppings y pagar con tarjeta o Yape/Plin.
                </p>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  URL de tu Tienda Online (variable {'{{link_tienda}}'})
                </label>
                <input
                  type="url"
                  value={config.storefrontBaseUrl}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, storefrontBaseUrl: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Pausa automática del bot al responder un asesor (minutos)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={config.humanHandoffMinutes}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      humanHandoffMinutes: Math.max(5, Number(e.target.value) || 30),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Arquitectura de números */}
          <div className="saas-card p-5 space-y-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Arquitectura de Números WhatsApp Business
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => updateConfig((prev) => ({ ...prev, numberMode: 'centralized' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  config.numberMode === 'centralized'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Un solo número para todas las sucursales
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Ideal para call center o marca centralizada. El chatbot pregunta al cliente la sucursal más cercana antes de tomar el pedido.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateConfig((prev) => ({ ...prev, numberMode: 'per_branch' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  config.numberMode === 'per_branch'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                  <Store className="w-5 h-5 text-emerald-600" />
                  Un número dedicado por sucursal
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Cada sede tiene su propio Phone Number ID y Token de Meta. El webhook identifica la sede automáticamente por el número receptor.
                </p>
              </button>
            </div>
          </div>

          {/* Credenciales oficiales de Meta */}
          <div className="saas-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">
                    Credenciales WhatsApp Cloud API (Meta for Developers)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {config.numberMode === 'centralized'
                      ? 'Configuración global compartida por todas las sucursales.'
                      : `Editando credenciales exclusivas de la sede seleccionada.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {config.numberMode === 'per_branch' && (
                  <select
                    value={credsBranchId}
                    onChange={(e) => setCredsBranchId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        Sucursal: {t.name}
                      </option>
                    ))}
                  </select>
                )}

                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentCreds.enabled}
                    onChange={(e) => updateCurrentCreds({ enabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  Envío Real Activo
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Phone Number ID (Meta)
                </label>
                <input
                  type="text"
                  value={currentCreds.phoneNumberId}
                  onChange={(e) => updateCurrentCreds({ phoneNumberId: e.target.value.trim() })}
                  placeholder="Ej. 108456789012345"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  value={currentCreds.wabaId}
                  onChange={(e) => updateCurrentCreds({ wabaId: e.target.value.trim() })}
                  placeholder="Ej. 109876543210987"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Permanent Access Token (System User Token)
                </label>
                <input
                  type="password"
                  value={currentCreds.accessToken}
                  onChange={(e) => updateCurrentCreds({ accessToken: e.target.value.trim() })}
                  placeholder="EAAG..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Webhook Verify Token (pegar en Meta)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentCreds.verifyToken}
                    onChange={(e) => updateCurrentCreds({ verifyToken: e.target.value.trim() })}
                    className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyText(currentCreds.verifyToken, 'Verify Token')}
                    className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Copiar Verify Token"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  App Secret (opcional — valida firma X-Hub-Signature-256)
                </label>
                <input
                  type="password"
                  value={currentCreds.appSecret}
                  onChange={(e) => updateCurrentCreds({ appSecret: e.target.value.trim() })}
                  placeholder="Opcional pero recomendado en producción"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  URL del Webhook (configurar en Meta → WhatsApp → Configuration)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={currentCreds.webhookUrl}
                    onChange={(e) => updateCurrentCreds({ webhookUrl: e.target.value.trim() })}
                    className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyText(currentCreds.webhookUrl, 'URL Webhook')}
                    className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Copiar URL Webhook"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  URL Servidor Node.js (Realtime / Webhook)
                </label>
                <input
                  type="url"
                  value={config.realtimeServerUrl}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, realtimeServerUrl: e.target.value.trim() }))}
                  placeholder="https://tu-dominio.com/realtime"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestMeta}
                disabled={isTestingMeta}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: '#25D366' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isTestingMeta ? 'Probando con Meta...' : 'Probar Conexión con Meta'}
              </button>

              <button
                type="button"
                onClick={handleSyncServer}
                disabled={isSyncingServer}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingServer ? 'animate-spin' : ''}`} />
                Guardar y Sincronizar con Servidor
              </button>

              <button
                type="button"
                onClick={() => {
                  const defaults = createDefaultWhatsAppConfig();
                  updateConfig(() => defaults);
                  dispatchToast('Configuración reiniciada', 'Se cargaron valores iniciales por defecto.', 'info');
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer valores
              </button>
            </div>
          </div>

          {/* Canales Sociales Meta (Facebook Messenger & Instagram DM) */}
          <div className="saas-card p-5 space-y-4">
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Facebook Messenger & Instagram DM (Meta Graph API)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Conecta tu Página de Facebook y cuenta profesional de Instagram para recibir y responder mensajes desde el nuevo módulo Bandeja Omnicanal.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Facebook Messenger */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0084FF]">Facebook Messenger</span>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.metaSocialChannels.facebookEnabled}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          metaSocialChannels: {
                            ...prev.metaSocialChannels,
                            facebookEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="accent-[#0084FF]"
                    />
                    Activo
                  </label>
                </div>
                <input
                  type="text"
                  value={config.metaSocialChannels.facebookPageId}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      metaSocialChannels: {
                        ...prev.metaSocialChannels,
                        facebookPageId: e.target.value.trim(),
                      },
                    }))
                  }
                  placeholder="Facebook Page ID"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                />
                <input
                  type="password"
                  value={config.metaSocialChannels.facebookAccessToken}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      metaSocialChannels: {
                        ...prev.metaSocialChannels,
                        facebookAccessToken: e.target.value.trim(),
                      },
                    }))
                  }
                  placeholder="Page Access Token (Meta)"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                />
              </div>

              {/* Instagram DM */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#E1306C]">Instagram Direct (DM)</span>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.metaSocialChannels.instagramEnabled}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          metaSocialChannels: {
                            ...prev.metaSocialChannels,
                            instagramEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="accent-[#E1306C]"
                    />
                    Activo
                  </label>
                </div>
                <input
                  type="text"
                  value={config.metaSocialChannels.instagramAccountId}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      metaSocialChannels: {
                        ...prev.metaSocialChannels,
                        instagramAccountId: e.target.value.trim(),
                      },
                    }))
                  }
                  placeholder="Instagram Business Account ID"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                />
                <input
                  type="password"
                  value={config.metaSocialChannels.instagramAccessToken}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      metaSocialChannels: {
                        ...prev.metaSocialChannels,
                        instagramAccessToken: e.target.value.trim(),
                      },
                    }))
                  }
                  placeholder="Instagram Access Token (Meta)"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="saas-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Registro de Envíos y Seguimiento ({logs.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLogs(loadWhatsAppLogs())}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Actualizar
              </button>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                Aún no hay envíos registrados. Cambia el estado de un pedido o prueba el chatbot en la Bandeja para ver la actividad aquí.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Destino</th>
                      <th className="py-2 pr-3">Resumen</th>
                      <th className="py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {logs.slice(0, 25).map((log) => (
                      <tr key={log.id}>
                        <td className="py-2 pr-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap font-semibold">
                          {log.channelType === 'order_status'
                            ? `Seguimiento ${log.orderNumber || ''}`
                            : log.channelType === 'agent_reply'
                              ? 'Asesor'
                              : 'Chatbot'}
                        </td>
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">+{log.toPhone}</td>
                        <td className="py-2 pr-3 max-w-xs truncate text-zinc-600 dark:text-zinc-300">
                          {log.summary}
                        </td>
                        <td className="py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'sent'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : log.status === 'simulated'
                                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {log.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                            {log.status === 'sent' ? 'Enviado' : log.status === 'simulated' ? 'Simulado' : 'Error'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
