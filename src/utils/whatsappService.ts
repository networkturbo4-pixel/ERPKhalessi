import { Order, OrderStatus, Product } from '../types/catalog';
import {
  InboxNoteItem,
  InboxQuickReply,
  InboxTagItem,
  WhatsAppConversation,
  WhatsAppDeliveryLog,
  WhatsAppFlowNode,
  WhatsAppInteractiveButton,
  WhatsAppInteractionType,
  WhatsAppMetaCredentials,
  WhatsAppModuleConfig,
  WhatsAppOrderNotificationRule,
} from '../types/whatsapp';

export const WHATSAPP_CONFIG_KEY = 'kh_whatsapp_config_v1';
export const WHATSAPP_CONVERSATIONS_KEY = 'kh_whatsapp_conversations_v1';
export const WHATSAPP_LOGS_KEY = 'kh_whatsapp_logs_v1';
export const INBOX_TAGS_KEY = 'kh_inbox_tags_v1';
export const INBOX_QUICK_REPLIES_KEY = 'kh_inbox_quick_replies_v1';
export const INBOX_NOTES_KEY = 'kh_inbox_notes_v1';

export const DEFAULT_INBOX_TAGS: InboxTagItem[] = [
  { id: 'tag-pedido', name: 'Pedido Activo', color: '#10b981' },
  { id: 'tag-vip', name: 'Cliente VIP', color: '#f59e0b' },
  { id: 'tag-delivery', name: 'Delivery', color: '#0ea5e9' },
  { id: 'tag-pago', name: 'Pendiente Pago', color: '#8b5cf6' },
  { id: 'tag-reclamo', name: 'Reclamo', color: '#ef4444' },
  { id: 'tag-consulta', name: 'Consulta', color: '#64748b' },
];

export const DEFAULT_INBOX_QUICK_REPLIES: InboxQuickReply[] = [
  {
    id: 'qr-menu',
    shortcut: '/menu',
    title: 'Carta y Promociones',
    body: '¡Hola! Puedes revisar nuestra carta completa con precios actualizados y promociones aquí: {{link_tienda}}',
  },
  {
    id: 'qr-yape',
    shortcut: '/yape',
    title: 'Datos de Pago Yape / Plin',
    body: 'Puedes pagar por Yape o Plin al número oficial de la sede. Por favor envíanos la captura del comprobante por este mismo chat para confirmar tu pedido.',
  },
  {
    id: 'qr-horario',
    shortcut: '/horario',
    title: 'Horario de Atención',
    body: 'Atendemos de Lunes a Domingo de 12:00 p.m. a 11:00 p.m. en salón, recojo en tienda y delivery.',
  },
  {
    id: 'qr-demora',
    shortcut: '/demora',
    title: 'Tiempo Estimado de Entrega',
    body: 'Tu pedido se encuentra en preparación. El tiempo estimado de entrega es de 25 a 35 minutos. Te avisaremos apenas salga con el repartidor.',
  },
];

export function createEmptyMetaCredentials(webhookBase?: string): WhatsAppMetaCredentials {
  const origin =
    webhookBase ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com');
  return {
    enabled: false,
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    verifyToken: `kh_wa_${Math.random().toString(36).slice(2, 10)}`,
    appSecret: '',
    displayPhoneNumber: '',
    apiVersion: 'v21.0',
    webhookUrl: `${origin.replace(/\/+$/, '')}/api/whatsapp/webhook`,
  };
}

export const DEFAULT_ORDER_NOTIFICATION_RULES: WhatsAppOrderNotificationRule[] = [
  {
    status: 'recibido',
    label: 'Pedido Recibido / Confirmado',
    enabled: true,
    useMetaTemplate: true,
    templateName: 'pedido_confirmado',
    templateLanguage: 'es',
    bodyText:
      '¡Hola {{cliente}}! Recibimos tu pedido *#{{pedido}}* en *{{sucursal}}* por *S/ {{total}}*. Te avisaremos por aquí cada avance.',
  },
  {
    status: 'en_cocina',
    label: 'En Preparación (Cocina)',
    enabled: true,
    useMetaTemplate: true,
    templateName: 'pedido_en_cocina',
    templateLanguage: 'es',
    bodyText:
      '¡Buenas noticias {{cliente}}! Tu pedido *#{{pedido}}* ya está siendo preparado por nuestros maestros pizzeros en *{{sucursal}}*.',
  },
  {
    status: 'en_horno',
    label: 'En Horno',
    enabled: true,
    useMetaTemplate: true,
    templateName: 'pedido_en_horno',
    templateLanguage: 'es',
    bodyText:
      '¡Tu pedido *#{{pedido}}* acaba de entrar al horno! En pocos minutos saldrá bien calientito.',
  },
  {
    status: 'listo',
    label: 'Listo para Recoger / Empacado',
    enabled: true,
    useMetaTemplate: true,
    templateName: 'pedido_listo',
    templateLanguage: 'es',
    bodyText:
      '¡{{cliente}}, tu pedido *#{{pedido}}* ya está listo y empacado en *{{sucursal}}*!',
  },
  {
    status: 'en_ruta',
    label: 'En Camino (Delivery)',
    enabled: true,
    useMetaTemplate: true,
    templateName: 'pedido_en_camino',
    templateLanguage: 'es',
    bodyText:
      '¡Tu pedido *#{{pedido}}* ya salió en camino! Repartidor asignado: *{{repartidor}}*. Prepárate para disfrutar.',
  },
  {
    status: 'entregado',
    label: 'Entregado (Cierre + Encuesta)',
    enabled: true,
    useMetaTemplate: true,
    templateName: 'pedido_entregado',
    templateLanguage: 'es',
    bodyText:
      '¡Gracias por tu preferencia, {{cliente}}! Tu pedido *#{{pedido}}* fue entregado. Si deseas pedir nuevamente, visita {{link_tienda}}.',
  },
  {
    status: 'cancelado',
    label: 'Pedido Cancelado / Anulado',
    enabled: false,
    useMetaTemplate: true,
    templateName: 'pedido_cancelado',
    templateLanguage: 'es',
    bodyText:
      'Hola {{cliente}}, te informamos que el pedido *#{{pedido}}* fue cancelado. Si necesitas ayuda responde a este mensaje.',
  },
];

export const DEFAULT_CHATBOT_FLOW_NODES: WhatsAppFlowNode[] = [
  {
    id: 'welcome',
    title: 'Bienvenida Principal',
    type: 'welcome',
    enabled: true,
    triggerKeywords: ['hola', 'buenas', 'inicio', 'menu', 'menú', 'hi'],
    messageBody:
      '¡Hola! Soy el asistente virtual de *{{marca}}*. Estoy aquí para ayudarte las 24 h. ¿Qué deseas hacer hoy?',
    interactionType: 'buttons',
    position: { x: 40, y: 170 },
    options: [
      { id: 'opt_order', label: 'Hacer un pedido', nextNodeId: 'order_catalog' },
      { id: 'opt_track', label: 'Seguir mi pedido', nextNodeId: 'order_status' },
      { id: 'opt_agent', label: 'Hablar con asesor', nextNodeId: 'handoff' },
    ],
  },
  {
    id: 'order_catalog',
    title: 'Catálogo / Toma de Pedido',
    type: 'order_catalog',
    enabled: true,
    triggerKeywords: ['pedir', 'pizza', 'carta', 'catalogo', 'catálogo', 'comprar', 'ordenar'],
    messageBody:
      'Aquí tienes nuestros productos destacados disponibles hoy. Selecciona el que deseas agregar a tu pedido:',
    interactionType: 'list',
    position: { x: 410, y: 30 },
    options: [
      { id: 'opt_cat_store', label: 'Ver Tienda Online', nextNodeId: 'store_link' },
    ],
  },
  {
    id: 'store_link',
    title: 'Enlace a Tienda Online',
    type: 'store_link',
    enabled: true,
    triggerKeywords: ['tienda', 'web', 'link', 'pagar', 'online'],
    messageBody:
      'Puedes ver toda nuestra carta con fotos, elegir promociones y pagar al instante desde nuestra tienda online:\n{{link_tienda}}',
    interactionType: 'buttons',
    position: { x: 780, y: 30 },
    options: [
      { id: 'opt_track_2', label: 'Seguir mi pedido', nextNodeId: 'order_status' },
      { id: 'opt_faq_2', label: 'Horarios y sedes', nextNodeId: 'faq' },
    ],
  },
  {
    id: 'order_status',
    title: 'Seguimiento de Pedido',
    type: 'order_status',
    enabled: true,
    triggerKeywords: ['pedido', 'seguimiento', 'estado', 'donde esta', 'dónde está', 'demora'],
    messageBody:
      'Con gusto reviso tu pedido en tiempo real. Por favor indícame tu *número de pedido* (ejemplo: 1024).',
    interactionType: 'text',
    position: { x: 410, y: 220 },
    options: [],
  },
  {
    id: 'faq',
    title: 'Horarios, Delivery y FAQ',
    type: 'faq',
    enabled: true,
    triggerKeywords: ['horario', 'horarios', 'direccion', 'dirección', 'ubicacion', 'ubicación', 'delivery', 'yape', 'pago'],
    messageBody:
      '*Horario de atención:* Lunes a Domingo de 12:00 p.m. a 11:00 p.m.\n*Medios de pago:* Yape, Plin, Tarjeta, Transferencia y Efectivo.\n*Delivery:* Cobertura rápida desde tu sucursal más cercana.',
    interactionType: 'buttons',
    position: { x: 780, y: 250 },
    options: [
      { id: 'opt_order_faq', label: 'Hacer un pedido', nextNodeId: 'order_catalog' },
      { id: 'opt_home_faq', label: 'Menú principal', nextNodeId: 'welcome' },
    ],
  },
  {
    id: 'handoff',
    title: 'Derivar a Asesor Humano',
    type: 'handoff',
    enabled: true,
    triggerKeywords: ['asesor', 'humano', 'persona', 'reclamo', 'ayuda', 'soporte'],
    messageBody:
      'Perfecto, he pausado el asistente automático y notifiqué a nuestro equipo. Un asesor te responderá en breve por este mismo chat.',
    interactionType: 'text',
    position: { x: 410, y: 390 },
    options: [],
  },
];

export function createDefaultWhatsAppConfig(): WhatsAppModuleConfig {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com';
  const realtimeBase = `${origin.replace(/\/+$/, '')}/realtime`;
  return {
    numberMode: 'centralized',
    salesMode: 'in_chat_order',
    autoReplyEnabled: true,
    humanHandoffMinutes: 30,
    storefrontBaseUrl: origin,
    realtimeServerUrl: realtimeBase,
    centralizedCredentials: createEmptyMetaCredentials(realtimeBase),
    branchCredentials: {},
    metaSocialChannels: {
      facebookEnabled: false,
      facebookPageId: '',
      facebookPageName: '',
      facebookAccessToken: '',
      instagramEnabled: false,
      instagramAccountId: '',
      instagramUsername: '',
      instagramAccessToken: '',
    },
    orderNotifications: DEFAULT_ORDER_NOTIFICATION_RULES,
    flowNodes: DEFAULT_CHATBOT_FLOW_NODES,
    updatedAt: new Date().toISOString(),
  };
}

export function loadWhatsAppConfig(): WhatsAppModuleConfig {
  try {
    const raw = localStorage.getItem(WHATSAPP_CONFIG_KEY);
    if (!raw) return createDefaultWhatsAppConfig();
    const parsed = JSON.parse(raw) as Partial<WhatsAppModuleConfig>;
    const defaults = createDefaultWhatsAppConfig();
    return {
      ...defaults,
      ...parsed,
      centralizedCredentials: {
        ...defaults.centralizedCredentials,
        ...(parsed.centralizedCredentials || {}),
      },
      branchCredentials: parsed.branchCredentials || {},
      metaSocialChannels: {
        ...defaults.metaSocialChannels,
        ...(parsed.metaSocialChannels || {}),
      },
      orderNotifications:
        Array.isArray(parsed.orderNotifications) && parsed.orderNotifications.length > 0
          ? parsed.orderNotifications
          : defaults.orderNotifications,
      flowNodes:
        Array.isArray(parsed.flowNodes) && parsed.flowNodes.length > 0
          ? parsed.flowNodes
          : defaults.flowNodes,
    };
  } catch {
    return createDefaultWhatsAppConfig();
  }
}

export function saveWhatsAppConfig(config: WhatsAppModuleConfig): WhatsAppModuleConfig {
  const next: WhatsAppModuleConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(WHATSAPP_CONFIG_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

export function loadWhatsAppConversations(): WhatsAppConversation[] {
  try {
    const raw = localStorage.getItem(WHATSAPP_CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c) => ({
      ...c,
      channel: c?.channel || 'whatsapp',
      tags: Array.isArray(c?.tags) ? c.tags : [],
      cart: Array.isArray(c?.cart) ? c.cart : [],
      messages: Array.isArray(c?.messages) ? c.messages : [],
    }));
  } catch {
    return [];
  }
}

export function loadInboxTags(): InboxTagItem[] {
  try {
    const raw = localStorage.getItem(INBOX_TAGS_KEY);
    if (!raw) return DEFAULT_INBOX_TAGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INBOX_TAGS;
  } catch {
    return DEFAULT_INBOX_TAGS;
  }
}

export function saveInboxTags(tags: InboxTagItem[]): void {
  try {
    localStorage.setItem(INBOX_TAGS_KEY, JSON.stringify(tags));
  } catch {
    // ignore
  }
}

export function loadInboxQuickReplies(): InboxQuickReply[] {
  try {
    const raw = localStorage.getItem(INBOX_QUICK_REPLIES_KEY);
    if (!raw) return DEFAULT_INBOX_QUICK_REPLIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INBOX_QUICK_REPLIES;
  } catch {
    return DEFAULT_INBOX_QUICK_REPLIES;
  }
}

export function saveInboxQuickReplies(items: InboxQuickReply[]): void {
  try {
    localStorage.setItem(INBOX_QUICK_REPLIES_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function loadInboxNotes(): InboxNoteItem[] {
  try {
    const raw = localStorage.getItem(INBOX_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInboxNotes(notes: InboxNoteItem[]): void {
  try {
    localStorage.setItem(INBOX_NOTES_KEY, JSON.stringify(notes.slice(0, 200)));
  } catch {
    // ignore
  }
}

export function saveWhatsAppConversations(conversations: WhatsAppConversation[]): void {
  try {
    localStorage.setItem(WHATSAPP_CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 60)));
  } catch {
    // ignore
  }
}

export function loadWhatsAppLogs(): WhatsAppDeliveryLog[] {
  try {
    const raw = localStorage.getItem(WHATSAPP_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendWhatsAppLog(entry: Omit<WhatsAppDeliveryLog, 'id' | 'timestamp'>): WhatsAppDeliveryLog {
  const full: WhatsAppDeliveryLog = {
    id: `wa_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  const current = loadWhatsAppLogs();
  const next = [full, ...current].slice(0, 150);
  try {
    localStorage.setItem(WHATSAPP_LOGS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return full;
}

export function resolveActiveCredentials(
  config: WhatsAppModuleConfig,
  branchId?: string
): WhatsAppMetaCredentials {
  if (config.numberMode === 'per_branch' && branchId) {
    return config.branchCredentials[branchId] || createEmptyMetaCredentials(config.realtimeServerUrl);
  }
  return config.centralizedCredentials;
}

export function normalizeWhatsAppPhone(raw?: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9 && digits.startsWith('9')) {
    return `51${digits}`;
  }
  return digits;
}

export function interpolateTemplateText(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

function buildWhatsAppEndpoint(serverBaseUrl: string | undefined, routePath: string): string {
  const cleaned = (serverBaseUrl || '')
    .trim()
    .replace(/\/api\/whatsapp\/.*$/i, '')
    .replace(/\/+$/, '');
  return cleaned ? `${cleaned}${routePath}` : routePath;
}

export async function syncWhatsAppConfigToServer(params: {
  config: WhatsAppModuleConfig;
  products: Product[];
  branches: Array<{ id: string; name: string; address?: string }>;
  orders: Order[];
}): Promise<{ ok: boolean; error?: string }> {
  const endpoint = buildWhatsAppEndpoint(params.config.realtimeServerUrl, '/api/whatsapp/config');
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        config: params.config,
        branches: params.branches,
        catalog: params.products
          .filter((p) => p.isAvailable)
          .slice(0, 30)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: p.hasSizes && p.sizes.length > 0 ? p.sizes[0].price : p.basePrice,
            category: p.category,
          })),
        orders: params.orders.slice(0, 50).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          total: o.total,
          customerPhone: o.customerPhone,
          tenantId: o.tenantId,
        })),
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      return { ok: false, error: data?.error || `HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'No se pudo contactar al servidor Node.js',
    };
  }
}

export async function testMetaConnection(
  creds: WhatsAppMetaCredentials,
  serverBaseUrl?: string
): Promise<{ ok: boolean; verifiedName?: string; displayPhoneNumber?: string; qualityRating?: string; error?: string }> {
  const endpoint = buildWhatsAppEndpoint(serverBaseUrl, '/api/whatsapp/test-connection');
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        apiVersion: creds.apiVersion || 'v21.0',
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.ok) {
      return { ok: false, error: data?.error || `Error HTTP ${resp.status}` };
    }
    return {
      ok: true,
      verifiedName: data.verifiedName,
      displayPhoneNumber: data.displayPhoneNumber,
      qualityRating: data.qualityRating,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error de red al probar conexión con Meta',
    };
  }
}

export async function sendAgentWhatsAppReply(params: {
  config: WhatsAppModuleConfig;
  branchId: string;
  toPhone: string;
  text: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaFilename?: string;
}): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  const creds = resolveActiveCredentials(params.config, params.branchId);
  const cleanPhone = normalizeWhatsAppPhone(params.toPhone);
  const endpoint = buildWhatsAppEndpoint(params.config.realtimeServerUrl, '/api/whatsapp/send-message');

  if (!creds.enabled || !creds.phoneNumberId || !creds.accessToken) {
    appendWhatsAppLog({
      direction: 'outbound',
      channelType: 'agent_reply',
      branchId: params.branchId,
      toPhone: cleanPhone || params.toPhone,
      summary: (params.text || params.mediaFilename || params.mediaType || '').slice(0, 120),
      status: 'simulated',
      errorMessage: 'Modo simulación (credenciales Meta inactivas)',
    });
    return { ok: true, simulated: true };
  }

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: params.branchId,
        toPhone: cleanPhone,
        text: params.text,
        mediaType: params.mediaType,
        mediaUrl: params.mediaUrl,
        mediaFilename: params.mediaFilename,
        credentialsOverride: creds,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    appendWhatsAppLog({
      direction: 'outbound',
      channelType: 'agent_reply',
      branchId: params.branchId,
      toPhone: cleanPhone,
      summary: params.text.slice(0, 120),
      status: data?.ok ? 'sent' : data?.simulated ? 'simulated' : 'failed',
      errorMessage: data?.ok ? undefined : data?.error,
    });
    return { ok: Boolean(data?.ok), simulated: Boolean(data?.simulated), error: data?.error };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al enviar mensaje';
    appendWhatsAppLog({
      direction: 'outbound',
      channelType: 'agent_reply',
      branchId: params.branchId,
      toPhone: cleanPhone,
      summary: params.text.slice(0, 120),
      status: 'failed',
      errorMessage: msg,
    });
    return { ok: false, error: msg };
  }
}

export async function notifyOrderStatusViaWhatsApp(params: {
  order: Order;
  status: OrderStatus;
  branchName: string;
  brandName?: string;
}): Promise<{ ok: boolean; skipped?: boolean; simulated?: boolean; error?: string }> {
  const config = loadWhatsAppConfig();
  const rule = config.orderNotifications.find((r) => r.status === params.status);
  if (!rule || !rule.enabled) {
    return { ok: true, skipped: true };
  }

  const cleanPhone = normalizeWhatsAppPhone(params.order.customerPhone);
  if (!cleanPhone || cleanPhone.length < 9) {
    return { ok: true, skipped: true };
  }

  const creds = resolveActiveCredentials(config, params.order.tenantId);
  const vars: Record<string, string> = {
    cliente: params.order.customerName || 'Cliente',
    pedido: params.order.orderNumber,
    sucursal: params.branchName || params.order.tenantId,
    total: Number(params.order.total || 0).toFixed(2),
    repartidor: params.order.assignedDriverName || 'Repartidor asignado',
    link_tienda: config.storefrontBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
    marca: params.brandName || 'Khalessi Pizza',
  };
  const renderedBody = interpolateTemplateText(rule.bodyText, vars);

  if (!creds.enabled || !creds.phoneNumberId || !creds.accessToken) {
    appendWhatsAppLog({
      direction: 'outbound',
      channelType: 'order_status',
      branchId: params.order.tenantId,
      toPhone: cleanPhone,
      summary: renderedBody.slice(0, 120),
      templateName: rule.useMetaTemplate ? rule.templateName : undefined,
      orderNumber: params.order.orderNumber,
      status: 'simulated',
      errorMessage: 'Registrado en simulador (activa credenciales Meta para envío real)',
    });
    return { ok: true, simulated: true };
  }

  const endpoint = buildWhatsAppEndpoint(config.realtimeServerUrl, '/api/whatsapp/send-template');

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: params.order.tenantId,
        toPhone: cleanPhone,
        useMetaTemplate: rule.useMetaTemplate,
        templateName: rule.templateName,
        templateLanguage: rule.templateLanguage || 'es',
        bodyText: renderedBody,
        variables: [vars.cliente, vars.pedido, vars.sucursal, vars.total],
        orderNumber: params.order.orderNumber,
        credentialsOverride: creds,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    appendWhatsAppLog({
      direction: 'outbound',
      channelType: 'order_status',
      branchId: params.order.tenantId,
      toPhone: cleanPhone,
      summary: renderedBody.slice(0, 120),
      templateName: rule.useMetaTemplate ? rule.templateName : undefined,
      orderNumber: params.order.orderNumber,
      status: data?.ok ? 'sent' : data?.simulated ? 'simulated' : 'failed',
      errorMessage: data?.ok ? undefined : data?.error,
    });
    return { ok: Boolean(data?.ok), simulated: Boolean(data?.simulated), error: data?.error };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red enviando WhatsApp';
    appendWhatsAppLog({
      direction: 'outbound',
      channelType: 'order_status',
      branchId: params.order.tenantId,
      toPhone: cleanPhone,
      summary: renderedBody.slice(0, 120),
      templateName: rule.useMetaTemplate ? rule.templateName : undefined,
      orderNumber: params.order.orderNumber,
      status: 'failed',
      errorMessage: msg,
    });
    return { ok: false, error: msg };
  }
}

export interface LocalBotTurnResult {
  replyText: string;
  interactiveType: WhatsAppInteractionType;
  buttons: WhatsAppInteractiveButton[];
  updatedConversation: WhatsAppConversation;
  createdOrderPayload?: {
    branchId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    cart: WhatsAppConversation['cart'];
  };
}

/**
 * Simulador fiel al motor de servidor para probar flujos en vivo dentro del ERP
 * (tanto Modo Pedido Completo en WhatsApp como Modo Link a Tienda Online).
 */
export function runLocalChatbotTurn(params: {
  config: WhatsAppModuleConfig;
  conversation: WhatsAppConversation;
  userText: string;
  buttonId?: string;
  brandName: string;
  branches: Array<{ id: string; name: string; address?: string }>;
  products: Product[];
  orders: Order[];
}): LocalBotTurnResult {
  const { config, userText, buttonId, brandName, branches, products, orders } = params;
  const conv: WhatsAppConversation = {
    ...params.conversation,
    cart: [...(params.conversation.cart || [])],
    messages: [...(params.conversation.messages || [])],
  };

  const lower = userText.trim().toLowerCase();
  const storeUrl = config.storefrontBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://tu-tienda.com');
  const activeNodes = config.flowNodes.filter((n) => n.enabled);
  const renderText = (raw: string) =>
    interpolateTemplateText(raw, {
      marca: brandName,
      link_tienda: storeUrl,
      cliente: conv.customerName,
    });

  // 1. Selección de sucursal en modo centralizado
  if (buttonId?.startsWith('branch:')) {
    const selectedId = buttonId.slice('branch:'.length);
    const branch = branches.find((b) => b.id === selectedId);
    conv.branchId = selectedId;
    return {
      replyText: `Perfecto, te atenderemos desde *${branch?.name || selectedId}*. ¿Cómo deseas continuar?`,
      interactiveType: 'buttons',
      buttons: [
        {
          id: config.salesMode === 'in_chat_order' ? 'node:order_catalog' : 'node:store_link',
          label: config.salesMode === 'in_chat_order' ? 'Pedir por WhatsApp' : 'Ir a Tienda Online',
        },
        { id: 'node:order_status', label: 'Seguir mi pedido' },
        { id: 'node:handoff', label: 'Hablar con asesor' },
      ],
      updatedConversation: conv,
    };
  }

  // 2. Carrito en chat (Modo Pedido Completo en WhatsApp)
  if (buttonId?.startsWith('add_prod:')) {
    const prodId = buttonId.slice('add_prod:'.length);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      const unitPrice = prod.hasSizes && prod.sizes.length > 0 ? prod.sizes[0].price : prod.basePrice;
      const existing = conv.cart.find((c) => c.productId === prod.id);
      if (existing) existing.quantity += 1;
      else conv.cart.push({ productId: prod.id, productName: prod.name, unitPrice, quantity: 1 });

      const total = conv.cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const summary = conv.cart
        .map((i) => `• ${i.quantity}x ${i.productName} (S/ ${(i.unitPrice * i.quantity).toFixed(2)})`)
        .join('\n');

      return {
        replyText: `Agregado *${prod.name}*.\n\n*Tu pedido actual:*\n${summary}\n\n*Subtotal:* S/ ${total.toFixed(2)}`,
        interactiveType: 'buttons',
        buttons: [
          { id: 'action:confirm_cart', label: 'Confirmar pedido' },
          { id: 'node:order_catalog', label: 'Agregar otro' },
          { id: 'action:clear_cart', label: 'Vaciar carrito' },
        ],
        updatedConversation: conv,
      };
    }
  }

  if (buttonId === 'action:clear_cart') {
    conv.cart = [];
    conv.pendingStep = null;
    return {
      replyText: 'Listo, tu carrito fue vaciado. ¿Qué deseas hacer ahora?',
      interactiveType: 'buttons',
      buttons: [
        { id: 'node:order_catalog', label: 'Ver catálogo' },
        { id: 'node:welcome', label: 'Menú principal' },
      ],
      updatedConversation: conv,
    };
  }

  if (buttonId === 'action:confirm_cart') {
    conv.pendingStep = 'awaiting_address';
    return {
      replyText:
        '¡Genial! Escríbeme tu *dirección exacta y referencia* para el delivery (o escribe *"Recojo en tienda"*).',
      interactiveType: 'text',
      buttons: [],
      updatedConversation: conv,
    };
  }

  if (conv.pendingStep === 'awaiting_address' && userText.trim()) {
    const cartCopy = [...conv.cart];
    const total = cartCopy.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const summary = cartCopy.map((i) => `• ${i.quantity}x ${i.productName}`).join('\n');
    conv.pendingStep = null;
    conv.cart = [];
    return {
      replyText: `¡Pedido confirmado!\n\n${summary}\n*Entrega:* ${userText.trim()}\n*Total:* S/ ${total.toFixed(2)}\n\nYa enviamos tu comanda al ERP. Te avisaremos automáticamente cuando entre a cocina, horno y delivery.`,
      interactiveType: 'buttons',
      buttons: [
        { id: 'node:order_status', label: 'Ver estado' },
        { id: 'node:welcome', label: 'Menú principal' },
      ],
      updatedConversation: conv,
      createdOrderPayload: {
        branchId: conv.branchId || branches[0]?.id || 'branch-1',
        customerName: conv.customerName,
        customerPhone: conv.customerPhone,
        deliveryAddress: userText.trim(),
        cart: cartCopy,
      },
    };
  }

  // 3. Seguimiento de pedido por número
  if (conv.pendingStep === 'awaiting_order_lookup' || /^#?\d{3,6}$/.test(lower)) {
    conv.pendingStep = null;
    const digits = lower.replace(/\D/g, '');
    const match = orders.find((o) => {
      const oDigits = o.orderNumber.replace(/\D/g, '');
      return (digits && oDigits.endsWith(digits)) || normalizeWhatsAppPhone(o.customerPhone) === normalizeWhatsAppPhone(conv.customerPhone);
    });
    if (match) {
      return {
        replyText: `Pedido *${match.orderNumber}* encontrado.\nEstado actual: *${match.status.replace(/_/g, ' ').toUpperCase()}*\nTotal: S/ ${match.total.toFixed(2)}`,
        interactiveType: 'buttons',
        buttons: [
          { id: 'node:welcome', label: 'Menú principal' },
          { id: 'node:handoff', label: 'Hablar con asesor' },
        ],
        updatedConversation: conv,
      };
    }
    return {
      replyText:
        'No encontré un pedido con ese código. Verifica el número (ej. 1021) o selecciona *Hablar con asesor*.',
      interactiveType: 'buttons',
      buttons: [
        { id: 'node:handoff', label: 'Hablar con asesor' },
        { id: 'node:welcome', label: 'Menú principal' },
      ],
      updatedConversation: conv,
    };
  }

  // 4. Búsqueda de nodo destino
  let targetNode: WhatsAppFlowNode | undefined;
  if (buttonId?.startsWith('node:')) {
    const id = buttonId.slice('node:'.length);
    targetNode = activeNodes.find((n) => n.id === id || n.type === id);
  }
  if (!targetNode && lower) {
    targetNode = activeNodes.find((n) =>
      n.triggerKeywords.some((kw) => kw && lower.includes(kw.toLowerCase()))
    );
  }
  if (!targetNode) {
    if (config.numberMode === 'centralized' && branches.length > 1 && !conv.branchId) {
      return {
        replyText: `¡Hola! Bienvenido a *${brandName}*. Elige la *sucursal* desde donde deseas pedir:`,
        interactiveType: 'list',
        buttons: branches.slice(0, 10).map((b) => ({
          id: `branch:${b.id}`,
          label: b.name,
          description: b.address || 'Sucursal activa',
        })),
        updatedConversation: conv,
      };
    }
    targetNode = activeNodes.find((n) => n.type === 'welcome') || activeNodes[0];
  }

  if (!targetNode) {
    return {
      replyText: `¡Hola! Gracias por escribir a *${brandName}*. Haz tu pedido en ${storeUrl}`,
      interactiveType: 'text',
      buttons: [],
      updatedConversation: conv,
    };
  }

  conv.currentNodeId = targetNode.id;

  if (targetNode.type === 'handoff') {
    conv.controlMode = 'human';
    conv.pausedUntil = new Date(Date.now() + (config.humanHandoffMinutes || 30) * 60_000).toISOString();
    return {
      replyText: renderText(targetNode.messageBody),
      interactiveType: 'text',
      buttons: [],
      updatedConversation: conv,
    };
  }

  if (targetNode.type === 'order_status') {
    conv.pendingStep = 'awaiting_order_lookup';
    return {
      replyText: renderText(targetNode.messageBody),
      interactiveType: 'text',
      buttons: [],
      updatedConversation: conv,
    };
  }

  if (targetNode.type === 'order_catalog') {
    if (config.salesMode === 'storefront_link') {
      return {
        replyText: `Puedes ver nuestra carta completa con fotos y pagar al instante en nuestra tienda online:\n${storeUrl}`,
        interactiveType: 'buttons',
        buttons: [
          { id: 'node:order_status', label: 'Seguir mi pedido' },
          { id: 'node:faq', label: 'Horarios y sedes' },
          { id: 'node:handoff', label: 'Hablar con asesor' },
        ],
        updatedConversation: conv,
      };
    }
    const available = products.filter((p) => p.isAvailable).slice(0, 8);
    return {
      replyText: renderText(targetNode.messageBody),
      interactiveType: 'list',
      buttons: available.map((p) => {
        const price = p.hasSizes && p.sizes.length > 0 ? p.sizes[0].price : p.basePrice;
        return {
          id: `add_prod:${p.id}`,
          label: p.name,
          description: `S/ ${price.toFixed(2)}`,
        };
      }),
      updatedConversation: conv,
    };
  }

  return {
    replyText: renderText(targetNode.messageBody),
    interactiveType: targetNode.interactionType,
    buttons: targetNode.options.map((o) => ({
      id: `node:${o.nextNodeId}`,
      label: o.label,
      description: o.description,
    })),
    updatedConversation: conv,
  };
}
