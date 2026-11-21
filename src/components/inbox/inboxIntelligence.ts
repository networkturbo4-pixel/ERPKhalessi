import { Order, Product } from '../../types/catalog';
import {
  InboxOperationsConfig,
  OmnichannelType,
  WhatsAppConversation,
  WhatsAppDeliveryLog,
} from '../../types/whatsapp';

export const INBOX_OPS_CONFIG_KEY = 'kh_inbox_ops_config_v1';

export function createDefaultInboxOpsConfig(): InboxOperationsConfig {
  return {
    agentStatus: 'available',
    roundRobinEnabled: false,
    signMessagesWithAgentName: false,
    chatBackground: 'whatsapp_pattern',
    nightModeEnabled: false,
    nightShiftStart: '22:00',
    nightShiftEnd: '08:00',
    slaAlertThresholdMinutes: 5,
    slaAlertMaxWaiting: 3,
    autoReactivateBotMinutes: 30,
    blockedPhones: [],
  };
}

export function loadInboxOpsConfig(): InboxOperationsConfig {
  try {
    const raw = localStorage.getItem(INBOX_OPS_CONFIG_KEY);
    if (!raw) return createDefaultInboxOpsConfig();
    return { ...createDefaultInboxOpsConfig(), ...JSON.parse(raw) };
  } catch {
    return createDefaultInboxOpsConfig();
  }
}

export function saveInboxOpsConfig(cfg: InboxOperationsConfig): void {
  try {
    localStorage.setItem(INBOX_OPS_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export function isNightShiftActive(cfg: InboxOperationsConfig): boolean {
  if (!cfg.nightModeEnabled) return false;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = cfg.nightShiftStart.split(':').map((n) => parseInt(n, 10) || 0);
  const [eh, em] = cfg.nightShiftEnd.split(':').map((n) => parseInt(n, 10) || 0);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start <= end) return mins >= start && mins <= end;
  return mins >= start || mins <= end;
}

export function detectSentimentAndIntent(text: string): {
  sentiment: 'positive' | 'neutral' | 'angry';
  intent: string;
} {
  const lower = (text || '').toLowerCase();
  const angryWords = ['reclamo', 'pésimo', 'pesimo', 'demora', 'nunca llegó', 'nunca llego', 'fría', 'fria', 'malo', 'horrible', 'estafa', 'cancelar', 'queja'];
  const positiveWords = ['gracias', 'excelente', 'rico', 'delicioso', 'buenazo', 'genial', 'perfecto', 'amo'];

  let sentiment: 'positive' | 'neutral' | 'angry' = 'neutral';
  if (angryWords.some((w) => lower.includes(w))) sentiment = 'angry';
  else if (positiveWords.some((w) => lower.includes(w))) sentiment = 'positive';

  let intent = 'Consulta';
  if (/(pedir|quiero|pizza|combo|ordenar|manda|envía|envia)/i.test(lower)) intent = 'Pedido';
  else if (/(yape|plin|pagar|pago|comprobante|transferencia|culqi)/i.test(lower)) intent = 'Pago';
  else if (/(donde|dónde|estado|demora|llega|repartidor|motorizado)/i.test(lower)) intent = 'Seguimiento';
  else if (/(horario|abierto|dirección|direccion|ubicacion|ubicación|local)/i.test(lower)) intent = 'Horario/Sede';
  else if (sentiment === 'angry') intent = 'Reclamo';

  return { sentiment, intent };
}

export function extractOrderDraftFromText(
  text: string,
  products: Product[]
): {
  items: Array<{ product: Product; quantity: number; unitPrice: number }>;
  detectedAddress: string;
} {
  const lower = (text || '').toLowerCase();
  const items: Array<{ product: Product; quantity: number; unitPrice: number }> = [];

  for (const prod of products) {
    if (!prod.isAvailable) continue;
    const tokens = prod.name
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 4);
    const matched = tokens.some((tk) => lower.includes(tk));
    if (matched) {
      const qtyMatch = lower.match(new RegExp(`(\\d+)\\s*(?:x\\s*)?[^.,\\n]*${tokens[0]}`));
      const quantity = qtyMatch ? Math.min(20, Math.max(1, parseInt(qtyMatch[1], 10))) : 1;
      const unitPrice = prod.hasSizes && prod.sizes.length > 0 ? prod.sizes[0].price : prod.basePrice;
      items.push({ product: prod, quantity, unitPrice });
    }
  }

  const addrMatch = text.match(/(?:en|a|direcci[oó]n[: ]+)\s*([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ#°., -]{6,70})/i);
  const detectedAddress = addrMatch ? addrMatch[1].trim() : '';
  return { items: items.slice(0, 5), detectedAddress };
}

export function generateCopilotSuggestions(params: {
  conv: WhatsAppConversation;
  products: Product[];
  linkedOrders: Order[];
  storeUrl: string;
}): string[] {
  const { conv, products, linkedOrders, storeUrl } = params;
  const lastCustomerMsg = [...conv.messages].reverse().find((m) => m.sender === 'customer');
  const text = (lastCustomerMsg?.text || '').toLowerCase();
  const activeOrder = linkedOrders[0];

  const suggestions: string[] = [];

  if (conv.sentiment === 'angry') {
    suggestions.push(
      `Lamentamos mucho el inconveniente, ${conv.customerName}. Ya estoy revisando tu caso con prioridad para darte una solución inmediata.`
    );
  }

  if (activeOrder) {
    suggestions.push(
      `Hola ${conv.customerName}, tu pedido *${activeOrder.orderNumber}* está actualmente en *${activeOrder.status.replace(/_/g, ' ').toUpperCase()}*. ¡En breve estará contigo!`
    );
  }

  if (/(yape|plin|pagar|pago|cuenta)/i.test(text)) {
    suggestions.push(
      `Puedes realizar tu pago por Yape o Plin y enviarnos la captura por aquí para validar tu comanda al instante.`
    );
  }

  const topProd = products.find((p) => p.isAvailable);
  if (topProd) {
    const price = topProd.hasSizes && topProd.sizes.length > 0 ? topProd.sizes[0].price : topProd.basePrice;
    suggestions.push(
      `Hoy te recomendamos nuestra *${topProd.name}* desde *S/ ${price.toFixed(2)}*. ¿Te gustaría pedirla ahora o ver la carta en ${storeUrl}?`
    );
  }

  if (suggestions.length < 3) {
    suggestions.push(
      `¡Con gusto te ayudo, ${conv.customerName}! ¿Deseas hacer un pedido para delivery o recojo en tienda?`
    );
  }

  return suggestions.slice(0, 3);
}

export function polishAgentDraft(text: string, mode: 'friendly' | 'concise'): string {
  const clean = text.trim();
  if (!clean) return '';
  if (mode === 'friendly') {
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    return `¡Hola! ${capitalized.endsWith('.') || capitalized.endsWith('!') ? capitalized : `${capitalized}.`} 😊 Quedamos atentos para ayudarte.`;
  }
  return clean
    .replace(/\s+/g, ' ')
    .replace(/(por favor|muchas gracias|con mucho gusto)/gi, '')
    .trim();
}

export function getSlaStatus(conv: WhatsAppConversation): {
  level: 'ok' | 'warning' | 'critical';
  waitMinutes: number;
  label: string;
} {
  if (conv.controlMode === 'bot' || conv.isResolved || conv.isArchived) {
    return { level: 'ok', waitMinutes: 0, label: '' };
  }
  const lastMsg = conv.messages[conv.messages.length - 1];
  if (!lastMsg || lastMsg.sender !== 'customer') {
    return { level: 'ok', waitMinutes: 0, label: 'Al día' };
  }
  const waitMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(lastMsg.timestamp)) / 60_000));
  if (waitMinutes >= 5) return { level: 'critical', waitMinutes, label: `${waitMinutes}m espera` };
  if (waitMinutes >= 2) return { level: 'warning', waitMinutes, label: `${waitMinutes}m espera` };
  return { level: 'ok', waitMinutes, label: `${waitMinutes}m` };
}

export interface InboxAnalyticsSnapshot {
  totalChats: number;
  botOnlyCount: number;
  botSelfServiceRate: number;
  avgFirstResponseMin: number;
  waitingCriticalCount: number;
  unassignedHumanCount: number;
  revenueByChannel: Record<OmnichannelType, number>;
  ordersByChannel: Record<OmnichannelType, number>;
  topTags: Array<{ name: string; count: number }>;
  hourlyHeatmap: number[];
  agentLeaderboard: Array<{ userId: string; chats: number; resolved: number }>;
  estimatedMetaMonthlyCostUsd: number;
}

export function computeInboxAnalytics(
  conversations: WhatsAppConversation[],
  logs: WhatsAppDeliveryLog[],
  orders: Order[],
  slaThresholdMin = 5
): InboxAnalyticsSnapshot {
  const totalChats = conversations.length;
  const botOnlyCount = conversations.filter((c) => c.controlMode === 'bot' && !c.assignedUserId).length;
  const botSelfServiceRate = totalChats > 0 ? Math.round((botOnlyCount / totalChats) * 100) : 0;

  const frts = conversations
    .map((c) => c.firstResponseMs)
    .filter((ms): ms is number => typeof ms === 'number' && ms > 0);
  const avgFirstResponseMin =
    frts.length > 0 ? Math.round((frts.reduce((a, b) => a + b, 0) / frts.length / 60_000) * 10) / 10 : 1.8;

  let waitingCriticalCount = 0;
  let unassignedHumanCount = 0;

  const revenueByChannel: Record<OmnichannelType, number> = { whatsapp: 0, facebook: 0, instagram: 0 };
  const ordersByChannel: Record<OmnichannelType, number> = { whatsapp: 0, facebook: 0, instagram: 0 };
  const tagMap = new Map<string, number>();
  const hourlyHeatmap = new Array(24).fill(0);
  const agentMap = new Map<string, { chats: number; resolved: number }>();

  for (const c of conversations) {
    const sla = getSlaStatus(c);
    if (c.controlMode === 'human' && sla.waitMinutes >= slaThresholdMin) waitingCriticalCount += 1;
    if (c.controlMode === 'human' && !c.assignedUserId) unassignedHumanCount += 1;

    for (const t of c.tags) {
      tagMap.set(t, (tagMap.get(t) || 0) + 1);
    }

    for (const m of c.messages) {
      const h = new Date(m.timestamp).getHours();
      if (Number.isFinite(h) && h >= 0 && h < 24) hourlyHeatmap[h] += 1;
    }

    if (c.assignedUserId) {
      const cur = agentMap.get(c.assignedUserId) || { chats: 0, resolved: 0 };
      cur.chats += 1;
      if (c.isResolved || c.isArchived) cur.resolved += 1;
      agentMap.set(c.assignedUserId, cur);
    }

    const matchingOrders = orders.filter(
      (o) =>
        (c.linkedOrderNumber && o.orderNumber === c.linkedOrderNumber) ||
        (c.customerPhone.length >= 9 &&
          o.customerPhone &&
          o.customerPhone.replace(/\D/g, '').endsWith(c.customerPhone.replace(/\D/g, '').slice(-9)))
    );
    for (const o of matchingOrders) {
      revenueByChannel[c.channel] += Number(o.total || 0);
      ordersByChannel[c.channel] += 1;
    }
  }

  const topTags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const agentLeaderboard = Array.from(agentMap.entries())
    .map(([userId, stats]) => ({ userId, ...stats }))
    .sort((a, b) => b.chats - a.chats);

  // Costo estimado Utility Meta (~$0.02 USD por plantilla enviada)
  const templateLogs = logs.filter((l) => l.channelType === 'order_status' && l.status === 'sent').length;
  const estimatedMetaMonthlyCostUsd = Math.round(templateLogs * 0.02 * 100) / 100;

  return {
    totalChats,
    botOnlyCount,
    botSelfServiceRate,
    avgFirstResponseMin,
    waitingCriticalCount,
    unassignedHumanCount,
    revenueByChannel,
    ordersByChannel,
    topTags,
    hourlyHeatmap,
    agentLeaderboard,
    estimatedMetaMonthlyCostUsd,
  };
}

export function exportConversationToPdf(conv: WhatsAppConversation, brandName: string): void {
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return;
  const rows = conv.messages
    .map(
      (m) => `
      <div style="margin-bottom:10px;padding:8px 12px;border-radius:10px;background:${
        m.sender === 'customer' ? '#f4f4f5' : '#ecfdf5'
      };border:1px solid #e4e4e7;">
        <div style="font-size:11px;color:#52525b;margin-bottom:4px;">
          <strong>${m.sender === 'customer' ? conv.customerName : m.senderName || 'Bot/Asesor'}</strong>
          · ${new Date(m.timestamp).toLocaleString()}
        </div>
        <div style="font-size:13px;white-space:pre-wrap;color:#18181b;">${m.text
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</div>
      </div>`
    )
    .join('');

  win.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Historial ${conv.customerName} - ${brandName}</title>
      </head>
      <body style="font-family:system-ui,sans-serif;padding:24px;color:#18181b;">
        <h2 style="margin:0 0 4px;">${brandName} — Historial de Conversación</h2>
        <p style="margin:0 0 16px;font-size:12px;color:#52525b;">
          Cliente: <strong>${conv.customerName}</strong> (${conv.customerPhone}) · Canal: ${conv.channel.toUpperCase()} · Exportado: ${new Date().toLocaleString()}
        </p>
        ${rows}
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
}
