/**
 * Khalessi Pizza ERP — WhatsApp Cloud API Engine (Meta Official)
 * Cero dependencias externas. Compatible con Node.js 18+ en cPanel / VPS.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'whatsapp_state.json');
const MAX_LOGS = 200;
const MAX_MESSAGES_PER_CHAT = 100;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        return {
          config: parsed.config || null,
          catalog: Array.isArray(parsed.catalog) ? parsed.catalog : [],
          branches: Array.isArray(parsed.branches) ? parsed.branches : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          conversations: parsed.conversations && typeof parsed.conversations === 'object' ? parsed.conversations : {},
          logs: Array.isArray(parsed.logs) ? parsed.logs : [],
        };
      }
    }
  } catch (err) {
    console.warn('[WhatsAppEngine] No se pudo leer whatsapp_state.json:', err.message);
  }
  return {
    config: null,
    catalog: [],
    branches: [],
    orders: [],
    conversations: {},
    logs: [],
  };
}

const state = loadState();

function persistState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('[WhatsAppEngine] Error guardando whatsapp_state.json:', err.message);
  }
}

function appendLog(entry) {
  state.logs.unshift({
    id: `wa_log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (state.logs.length > MAX_LOGS) {
    state.logs.length = MAX_LOGS;
  }
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9 && digits.startsWith('9')) {
    return `51${digits}`;
  }
  return digits;
}

function resolveCredentials(branchId, incomingPhoneNumberId) {
  const cfg = state.config;
  if (!cfg) return null;

  if (cfg.numberMode === 'per_branch') {
    const map = cfg.branchCredentials || {};
    if (incomingPhoneNumberId) {
      for (const [bId, creds] of Object.entries(map)) {
        if (creds && creds.phoneNumberId === incomingPhoneNumberId) {
          return { creds, branchId: bId };
        }
      }
    }
    if (branchId && map[branchId]) {
      return { creds: map[branchId], branchId };
    }
    const firstEntry = Object.entries(map).find(([, c]) => c && c.enabled && c.phoneNumberId);
    if (firstEntry) {
      return { creds: firstEntry[1], branchId: firstEntry[0] };
    }
  }

  return {
    creds: cfg.centralizedCredentials || null,
    branchId: branchId || (state.branches[0] && state.branches[0].id) || 'branch-1',
  };
}

function getAllVerifyTokens() {
  const tokens = new Set();
  if (process.env.WHATSAPP_VERIFY_TOKEN) {
    tokens.add(String(process.env.WHATSAPP_VERIFY_TOKEN).trim());
  }
  const cfg = state.config;
  if (cfg) {
    if (cfg.centralizedCredentials && cfg.centralizedCredentials.verifyToken) {
      tokens.add(String(cfg.centralizedCredentials.verifyToken).trim());
    }
    if (cfg.branchCredentials && typeof cfg.branchCredentials === 'object') {
      for (const creds of Object.values(cfg.branchCredentials)) {
        if (creds && creds.verifyToken) {
          tokens.add(String(creds.verifyToken).trim());
        }
      }
    }
  }
  return Array.from(tokens).filter(Boolean);
}

function verifyMetaSignature(rawBodyBuffer, signatureHeader, appSecret) {
  if (!appSecret) return true;
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBodyBuffer).digest('hex')}`;
  const a = Buffer.from(signatureHeader, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function sendMetaGraphPayload(creds, payload) {
  if (!creds || !creds.enabled || !creds.phoneNumberId || !creds.accessToken) {
    return { ok: false, simulated: true, error: 'Credenciales de Meta Cloud API no configuradas o desactivadas' };
  }
  const version = creds.apiVersion || 'v21.0';
  const endpoint = `https://graph.facebook.com/${version}/${creds.phoneNumberId}/messages`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...payload,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return {
      ok: false,
      simulated: false,
      error: data?.error?.message || `HTTP ${resp.status}`,
      raw: data,
    };
  }
  return { ok: true, simulated: false, messageId: data?.messages?.[0]?.id, raw: data };
}

async function sendInteractiveOrText(creds, toPhone, text, interactiveType, options) {
  const cleanTo = normalizePhone(toPhone);
  if (!cleanTo) return { ok: false, error: 'Número de destino inválido' };

  if (interactiveType === 'buttons' && Array.isArray(options) && options.length > 0) {
    return sendMetaGraphPayload(creds, {
      to: cleanTo,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: String(text).slice(0, 1024) },
        action: {
          buttons: options.slice(0, 3).map((opt) => ({
            type: 'reply',
            reply: {
              id: String(opt.id).slice(0, 256),
              title: String(opt.label).slice(0, 20),
            },
          })),
        },
      },
    });
  }

  if (interactiveType === 'list' && Array.isArray(options) && options.length > 0) {
    return sendMetaGraphPayload(creds, {
      to: cleanTo,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: String(text).slice(0, 1024) },
        action: {
          button: 'Ver opciones',
          sections: [
            {
              title: 'Opciones disponibles',
              rows: options.slice(0, 10).map((opt) => ({
                id: String(opt.id).slice(0, 200),
                title: String(opt.label).slice(0, 24),
                description: opt.description ? String(opt.description).slice(0, 72) : undefined,
              })),
            },
          ],
        },
      },
    });
  }

  return sendMetaGraphPayload(creds, {
    to: cleanTo,
    type: 'text',
    text: { preview_url: true, body: String(text).slice(0, 4096) },
  });
}

async function uploadMediaToMeta(creds, dataUrl, filename) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato dataUrl inválido para subir multimedia a Meta');
  }
  const mimeType = match[1] || 'application/octet-stream';
  const buffer = Buffer.from(match[2], 'base64');
  const version = creds.apiVersion || 'v21.0';
  const endpoint = `https://graph.facebook.com/${version}/${creds.phoneNumberId}/media`;
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', new Blob([buffer], { type: mimeType }), filename || 'archivo');

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.accessToken}` },
    body: form,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.id) {
    throw new Error(data?.error?.message || `Error subiendo media a Meta (HTTP ${resp.status})`);
  }
  return data.id;
}

async function sendMediaMessage(creds, toPhone, { mediaType, mediaUrl, mediaFilename, caption }) {
  const cleanTo = normalizePhone(toPhone);
  if (!cleanTo) return { ok: false, error: 'Número de destino inválido' };
  if (!creds || !creds.enabled || !creds.phoneNumberId || !creds.accessToken) {
    return { ok: false, simulated: true, error: 'Credenciales de Meta Cloud API no configuradas o desactivadas' };
  }

  const normalizedType = ['image', 'video', 'audio', 'document'].includes(mediaType) ? mediaType : 'document';
  let mediaPayload;
  if (String(mediaUrl || '').startsWith('data:')) {
    const mediaId = await uploadMediaToMeta(creds, mediaUrl, mediaFilename || `adjunto_${Date.now()}`);
    mediaPayload = { id: mediaId };
  } else if (/^https?:\/\//i.test(String(mediaUrl || ''))) {
    mediaPayload = { link: String(mediaUrl) };
  } else {
    return { ok: false, error: 'URL de multimedia no soportada por Meta Cloud API' };
  }

  if (caption && normalizedType !== 'audio') {
    mediaPayload.caption = String(caption).slice(0, 1024);
  }
  if (normalizedType === 'document' && mediaFilename) {
    mediaPayload.filename = String(mediaFilename).slice(0, 240);
  }

  return sendMetaGraphPayload(creds, {
    to: cleanTo,
    type: normalizedType,
    [normalizedType]: mediaPayload,
  });
}

function buildMediaProxyUrl(mediaId, branchId) {
  const base = String(state.config?.realtimeServerUrl || '')
    .trim()
    .replace(/\/api\/whatsapp\/.*$/i, '')
    .replace(/\/+$/, '');
  const prefix = base || '/realtime';
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  return `${prefix}/api/whatsapp/media/${encodeURIComponent(mediaId)}${query}`;
}

function buildBotReply(conv, userInput, buttonId) {
  const cfg = state.config || {};
  const nodes = Array.isArray(cfg.flowNodes) ? cfg.flowNodes.filter((n) => n.enabled) : [];
  const lower = String(userInput || '').trim().toLowerCase();
  const salesMode = cfg.salesMode || 'in_chat_order';
  const storeUrl = cfg.storefrontBaseUrl || 'https://tu-tienda.com';

  // 1. Selección de sucursal
  if (buttonId && buttonId.startsWith('branch:')) {
    const selectedBranchId = buttonId.slice('branch:'.length);
    const branch = state.branches.find((b) => b.id === selectedBranchId);
    conv.branchId = selectedBranchId;
    return {
      text: `Perfecto, te atenderemos desde *${branch ? branch.name : selectedBranchId}*. ¿Qué deseas hacer ahora?`,
      interactiveType: 'buttons',
      options: [
        {
          id: salesMode === 'in_chat_order' ? 'node:order_catalog' : 'node:store_link',
          label: salesMode === 'in_chat_order' ? 'Pedir por aquí' : 'Pedir en Tienda',
        },
        { id: 'node:order_status', label: 'Seguir mi pedido' },
        { id: 'node:handoff', label: 'Hablar con asesor' },
      ],
    };
  }

  // 2. Agregar producto al carrito en modo pedido dentro de WhatsApp
  if (buttonId && buttonId.startsWith('add_prod:')) {
    const prodId = buttonId.slice('add_prod:'.length);
    const prod = state.catalog.find((p) => p.id === prodId);
    if (prod) {
      if (!Array.isArray(conv.cart)) conv.cart = [];
      const existing = conv.cart.find((i) => i.productId === prod.id);
      if (existing) existing.quantity += 1;
      else conv.cart.push({ productId: prod.id, productName: prod.name, unitPrice: Number(prod.price || 0), quantity: 1 });
      const total = conv.cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const summary = conv.cart.map((i) => `• ${i.quantity}x ${i.productName} (S/ ${(i.unitPrice * i.quantity).toFixed(2)})`).join('\n');
      return {
        text: `Agregado *${prod.name}*.\n\n*Tu carrito actual:*\n${summary}\n\n*Total estimado:* S/ ${total.toFixed(2)}`,
        interactiveType: 'buttons',
        options: [
          { id: 'action:confirm_cart', label: 'Confirmar pedido' },
          { id: 'node:order_catalog', label: 'Agregar más' },
          { id: 'action:clear_cart', label: 'Vaciar carrito' },
        ],
      };
    }
  }

  if (buttonId === 'action:clear_cart') {
    conv.cart = [];
    conv.pendingStep = null;
    return {
      text: 'Listo, hemos vaciado tu carrito. ¿Deseas volver al menú principal?',
      interactiveType: 'buttons',
      options: [
        { id: 'node:welcome', label: 'Menú principal' },
        { id: 'node:order_catalog', label: 'Ver catálogo' },
      ],
    };
  }

  if (buttonId === 'action:confirm_cart') {
    conv.pendingStep = 'awaiting_address';
    return {
      text: 'Excelente. Por favor envíame tu *dirección de entrega y referencia* (o escribe *"Recojo en tienda"*).',
      interactiveType: 'text',
      options: [],
    };
  }

  if (conv.pendingStep === 'awaiting_address' && userInput) {
    conv.pendingStep = null;
    const total = (conv.cart || []).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const fakeCode = `WA-${String(Date.now()).slice(-4)}`;
    conv.linkedOrderNumber = fakeCode;
    const summary = (conv.cart || []).map((i) => `• ${i.quantity}x ${i.productName}`).join('\n');
    conv.cart = [];
    return {
      text: `¡Pedido registrado *#${fakeCode}*!\n\n${summary}\n*Entrega:* ${userInput}\n*Total:* S/ ${total.toFixed(2)}\n\nTe avisaremos por este mismo chat cuando entre al horno y salga en camino.`,
      interactiveType: 'buttons',
      options: [
        { id: 'node:order_status', label: 'Ver estado' },
        { id: 'node:welcome', label: 'Menú principal' },
      ],
    };
  }

  // 3. Consulta de estado de pedido
  if (conv.pendingStep === 'awaiting_order_lookup' || lower.includes('#') || /^ped[- ]?\d+/i.test(lower)) {
    conv.pendingStep = null;
    const digits = lower.replace(/\D/g, '');
    const matched = state.orders.find((o) => {
      const oNum = String(o.orderNumber || '').replace(/\D/g, '');
      const oPhone = normalizePhone(o.customerPhone);
      return (digits && oNum && oNum.endsWith(digits)) || (oPhone && oPhone === normalizePhone(conv.customerPhone));
    });
    if (matched) {
      return {
        text: `Tu pedido *${matched.orderNumber}* está actualmente en estado: *${String(matched.status || 'recibido').replace(/_/g, ' ').toUpperCase()}*.\nTotal: S/ ${Number(matched.total || 0).toFixed(2)}.`,
        interactiveType: 'buttons',
        options: [
          { id: 'node:welcome', label: 'Menú principal' },
          { id: 'node:handoff', label: 'Hablar con asesor' },
        ],
      };
    }
    return {
      text: 'No encontré un pedido activo con ese número. Escribe el número de pedido (ej. 1024) o solicita hablar con un asesor.',
      interactiveType: 'buttons',
      options: [
        { id: 'node:handoff', label: 'Hablar con asesor' },
        { id: 'node:welcome', label: 'Menú principal' },
      ],
    };
  }

  // 4. Navegación por nodo explícito o palabras clave
  let targetNode = null;
  if (buttonId && buttonId.startsWith('node:')) {
    const nodeId = buttonId.slice('node:'.length);
    targetNode = nodes.find((n) => n.id === nodeId || n.type === nodeId);
  }
  if (!targetNode && lower) {
    targetNode = nodes.find((n) =>
      Array.isArray(n.triggerKeywords) &&
      n.triggerKeywords.some((kw) => kw && lower.includes(String(kw).toLowerCase()))
    );
  }
  if (!targetNode) {
    if (cfg.numberMode === 'centralized' && state.branches.length > 1 && !conv.branchId) {
      return {
        text: '¡Hola! Bienvenido. Selecciona la *sucursal* más cercana para atenderte:',
        interactiveType: 'list',
        options: state.branches.slice(0, 10).map((b) => ({
          id: `branch:${b.id}`,
          label: b.name,
          description: b.address || 'Sucursal disponible',
        })),
      };
    }
    targetNode = nodes.find((n) => n.type === 'welcome') || nodes[0];
  }

  if (!targetNode) {
    return {
      text: `¡Hola! Gracias por escribirnos. Puedes hacer tu pedido aquí: ${storeUrl}`,
      interactiveType: 'text',
      options: [],
    };
  }

  conv.currentNodeId = targetNode.id;

  if (targetNode.type === 'handoff') {
    conv.controlMode = 'human';
    const mins = Number(cfg.humanHandoffMinutes || 30);
    conv.pausedUntil = new Date(Date.now() + mins * 60_000).toISOString();
    return {
      text: targetNode.messageBody || 'Te estoy comunicando con un asesor humano. En breve te responderán por este chat.',
      interactiveType: 'text',
      options: [],
    };
  }

  if (targetNode.type === 'order_status') {
    conv.pendingStep = 'awaiting_order_lookup';
    return {
      text: targetNode.messageBody || 'Por favor indícame tu *número de pedido* para consultar su estado en cocina o delivery.',
      interactiveType: 'text',
      options: [],
    };
  }

  if (targetNode.type === 'order_catalog') {
    if (salesMode === 'storefront_link') {
      return {
        text: `Puedes ver nuestra carta completa con fotos y pagar en línea desde aquí:\n${storeUrl}`,
        interactiveType: 'buttons',
        options: [
          { id: 'node:order_status', label: 'Seguir pedido' },
          { id: 'node:handoff', label: 'Hablar con asesor' },
        ],
      };
    }
    const items = state.catalog.slice(0, 8);
    if (items.length > 0) {
      return {
        text: targetNode.messageBody || 'Elige los productos que deseas agregar a tu pedido:',
        interactiveType: 'list',
        options: items.map((p) => ({
          id: `add_prod:${p.id}`,
          label: p.name,
          description: `S/ ${Number(p.price || 0).toFixed(2)}`,
        })),
      };
    }
  }

  if (targetNode.type === 'store_link') {
    return {
      text: (targetNode.messageBody || 'Haz tu pedido online y paga al instante aquí: {{link_tienda}}').replace(
        /\{\{link_tienda\}\}/g,
        storeUrl
      ),
      interactiveType: 'buttons',
      options: [
        { id: 'node:order_status', label: 'Seguir pedido' },
        { id: 'node:handoff', label: 'Hablar con asesor' },
      ],
    };
  }

  return {
    text: String(targetNode.messageBody || '').replace(/\{\{link_tienda\}\}/g, storeUrl),
    interactiveType: targetNode.interactionType || 'buttons',
    options: (targetNode.options || []).map((o) => ({
      id: `node:${o.nextNodeId}`,
      label: o.label,
      description: o.description,
    })),
  };
}

function readBodyBuffer(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handleWhatsAppRoute(req, res, parsedUrl, pathname, maxBodyBytes, broadcastSseEvent) {
  // 1. Verificación oficial de Webhook Meta (GET)
  if (pathname === '/api/whatsapp/webhook' && req.method === 'GET') {
    const mode = String(parsedUrl.query['hub.mode'] || '');
    const token = String(parsedUrl.query['hub.verify_token'] || '');
    const challenge = String(parsedUrl.query['hub.challenge'] || '');
    const validTokens = getAllVerifyTokens();

    if (mode === 'subscribe' && challenge && (validTokens.length === 0 || validTokens.includes(token))) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(challenge);
      return true;
    }
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Invalid Meta verify token' }));
    return true;
  }

  // 2. Recepción de mensajes y estados desde Meta (POST)
  if (pathname === '/api/whatsapp/webhook' && req.method === 'POST') {
    try {
      const rawBuf = await readBodyBuffer(req, maxBodyBytes);
      const body = JSON.parse(rawBuf.toString('utf8') || '{}');
      const entries = Array.isArray(body.entry) ? body.entry : [];

      for (const entry of entries) {
        const changes = Array.isArray(entry.changes) ? entry.changes : [];
        for (const change of changes) {
          const val = change.value || {};
          const incomingPhoneNumberId = val?.metadata?.phone_number_id || '';
          const resolved = resolveCredentials(null, incomingPhoneNumberId);
          const creds = resolved ? resolved.creds : null;

          if (creds && creds.appSecret) {
            const sig = String(req.headers['x-hub-signature-256'] || '');
            if (!verifyMetaSignature(rawBuf, sig, creds.appSecret)) {
              appendLog({
                direction: 'inbound',
                channelType: 'webhook',
                branchId: resolved?.branchId || 'central',
                toPhone: incomingPhoneNumberId || 'webhook',
                summary: 'Firma X-Hub-Signature-256 inválida (revisa App Secret)',
                status: 'failed',
                errorMessage: 'Invalid X-Hub-Signature-256',
              });
              persistState();
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Invalid X-Hub-Signature-256' }));
              return true;
            }
          }

          const contacts = Array.isArray(val.contacts) ? val.contacts : [];
          const messages = Array.isArray(val.messages) ? val.messages : [];

          for (const msg of messages) {
            const fromPhone = normalizePhone(msg.from);
            if (!fromPhone) continue;
            const profileName =
              (contacts.find((c) => normalizePhone(c.wa_id) === fromPhone)?.profile?.name) || `Cliente ${fromPhone.slice(-4)}`;

            let userText = '';
            let buttonId = '';
            let mediaType;
            let mediaUrl;
            let mediaFilename;
            if (msg.type === 'text') {
              userText = msg.text?.body || '';
            } else if (msg.type === 'interactive') {
              if (msg.interactive?.type === 'button_reply') {
                buttonId = msg.interactive.button_reply.id || '';
                userText = msg.interactive.button_reply.title || buttonId;
              } else if (msg.interactive?.type === 'list_reply') {
                buttonId = msg.interactive.list_reply.id || '';
                userText = msg.interactive.list_reply.title || buttonId;
              }
            } else if (msg.type === 'image' && msg.image?.id) {
              mediaType = 'image';
              mediaUrl = buildMediaProxyUrl(msg.image.id, resolved?.branchId);
              userText = msg.image.caption || '';
            } else if (msg.type === 'sticker' && msg.sticker?.id) {
              mediaType = 'image';
              mediaUrl = buildMediaProxyUrl(msg.sticker.id, resolved?.branchId);
              mediaFilename = 'sticker.webp';
              userText = '';
            } else if (msg.type === 'video' && msg.video?.id) {
              mediaType = 'video';
              mediaUrl = buildMediaProxyUrl(msg.video.id, resolved?.branchId);
              userText = msg.video.caption || '';
            } else if (msg.type === 'audio' && msg.audio?.id) {
              mediaType = 'audio';
              mediaUrl = buildMediaProxyUrl(msg.audio.id, resolved?.branchId);
              userText = '';
            } else if (msg.type === 'document' && msg.document?.id) {
              mediaType = 'document';
              mediaUrl = buildMediaProxyUrl(msg.document.id, resolved?.branchId);
              mediaFilename = msg.document.filename || 'documento';
              userText = msg.document.caption || '';
            } else {
              userText = `[${msg.type || 'mensaje'}]`;
            }

            const convKey = `${resolved?.branchId || 'central'}:${fromPhone}`;
            let conv = state.conversations[convKey];
            if (!conv) {
              conv = {
                id: convKey,
                customerPhone: fromPhone,
                customerName: profileName,
                branchId: resolved?.branchId || '',
                controlMode: 'bot',
                currentNodeId: 'welcome',
                pendingStep: null,
                cart: [],
                unreadCount: 0,
                lastMessageAt: new Date().toISOString(),
                messages: [],
              };
              state.conversations[convKey] = conv;
            }

            conv.customerName = profileName;
            conv.lastMessageAt = new Date().toISOString();
            conv.unreadCount = (conv.unreadCount || 0) + 1;
            conv.messages.push({
              id: msg.id || `in_${Date.now()}`,
              sender: 'customer',
              text: userText,
              timestamp: new Date().toISOString(),
              ...(mediaType ? { mediaType } : {}),
              ...(mediaUrl ? { mediaUrl } : {}),
              ...(mediaFilename ? { mediaFilename } : {}),
            });
            if (conv.messages.length > MAX_MESSAGES_PER_CHAT) {
              conv.messages = conv.messages.slice(-MAX_MESSAGES_PER_CHAT);
            }

            // Verificar si la pausa humana expiró
            if (conv.controlMode === 'human' && conv.pausedUntil && Date.now() >= Date.parse(conv.pausedUntil)) {
              conv.controlMode = 'bot';
              conv.pausedUntil = undefined;
            }

            // Auto-respuesta del chatbot
            if (state.config?.autoReplyEnabled !== false && conv.controlMode === 'bot') {
              const reply = buildBotReply(conv, userText, buttonId);
              const sendRes = await sendInteractiveOrText(
                creds,
                fromPhone,
                reply.text,
                reply.interactiveType,
                reply.options
              );

              conv.messages.push({
                id: sendRes.messageId || `bot_${Date.now()}`,
                sender: 'bot',
                text: reply.text,
                timestamp: new Date().toISOString(),
                status: sendRes.ok ? 'sent' : 'failed',
                interactiveType: reply.interactiveType,
                buttons: reply.options,
              });

              appendLog({
                direction: 'outbound',
                channelType: 'chatbot_flow',
                branchId: conv.branchId || 'central',
                toPhone: fromPhone,
                summary: reply.text.slice(0, 120),
                status: sendRes.ok ? 'sent' : sendRes.simulated ? 'simulated' : 'failed',
                errorMessage: sendRes.ok ? undefined : sendRes.error,
              });
            }

            persistState();
            if (typeof broadcastSseEvent === 'function') {
              broadcastSseEvent({
                action: 'whatsapp_message',
                branchId: conv.branchId || 'all',
                conversation: conv,
              });
            }
          }
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return true;
  }

  // 3. Sincronizar configuración, flujos, catálogo y pedidos desde el ERP
  if (pathname === '/api/whatsapp/config' && req.method === 'POST') {
    try {
      const rawBuf = await readBodyBuffer(req, maxBodyBytes);
      const payload = JSON.parse(rawBuf.toString('utf8') || '{}');
      if (payload.config) state.config = payload.config;
      if (Array.isArray(payload.catalog)) state.catalog = payload.catalog;
      if (Array.isArray(payload.branches)) state.branches = payload.branches;
      if (Array.isArray(payload.orders)) state.orders = payload.orders;
      persistState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, syncedAt: new Date().toISOString() }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return true;
  }

  // 4. Enviar notificación de seguimiento de pedido (Plantilla Meta o texto)
  if (pathname === '/api/whatsapp/send-template' && req.method === 'POST') {
    try {
      const rawBuf = await readBodyBuffer(req, maxBodyBytes);
      const payload = JSON.parse(rawBuf.toString('utf8') || '{}');
      const { branchId, toPhone, useMetaTemplate, templateName, templateLanguage, bodyText, variables, orderNumber, credentialsOverride } = payload;

      const resolved = resolveCredentials(branchId, null);
      const creds = credentialsOverride || (resolved ? resolved.creds : null);
      const cleanTo = normalizePhone(toPhone);

      let result;
      if (useMetaTemplate && templateName) {
        const components =
          Array.isArray(variables) && variables.length > 0
            ? [
                {
                  type: 'body',
                  parameters: variables.map((v) => ({ type: 'text', text: String(v) })),
                },
              ]
            : undefined;
        result = await sendMetaGraphPayload(creds, {
          to: cleanTo,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLanguage || 'es' },
            ...(components ? { components } : {}),
          },
        });
      } else {
        result = await sendInteractiveOrText(creds, cleanTo, bodyText || '', 'text', []);
      }

      appendLog({
        direction: 'outbound',
        channelType: 'order_status',
        branchId: branchId || 'central',
        toPhone: cleanTo,
        summary: String(bodyText || templateName || '').slice(0, 120),
        templateName: useMetaTemplate ? templateName : undefined,
        orderNumber,
        status: result.ok ? 'sent' : result.simulated ? 'simulated' : 'failed',
        errorMessage: result.ok ? undefined : result.error,
      });
      persistState();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return true;
  }

  // 5. Enviar respuesta manual de un asesor humano (texto o multimedia)
  if (pathname === '/api/whatsapp/send-message' && req.method === 'POST') {
    try {
      const rawBuf = await readBodyBuffer(req, maxBodyBytes);
      const { branchId, toPhone, text, mediaType, mediaUrl, mediaFilename, credentialsOverride } = JSON.parse(
        rawBuf.toString('utf8') || '{}'
      );
      const resolved = resolveCredentials(branchId, null);
      const creds = credentialsOverride || (resolved ? resolved.creds : null);
      const cleanTo = normalizePhone(toPhone);
      const cleanCaption =
        mediaUrl && text && String(text).startsWith('Adjunto:') ? '' : text || '';
      const result =
        mediaUrl && mediaType
          ? await sendMediaMessage(creds, cleanTo, {
              mediaType,
              mediaUrl,
              mediaFilename,
              caption: cleanCaption,
            })
          : await sendInteractiveOrText(creds, cleanTo, text || '', 'text', []);

      appendLog({
        direction: 'outbound',
        channelType: 'agent_reply',
        branchId: branchId || 'central',
        toPhone: cleanTo,
        summary: String(text || mediaFilename || mediaType || '').slice(0, 120),
        status: result.ok ? 'sent' : result.simulated ? 'simulated' : 'failed',
        errorMessage: result.ok ? undefined : result.error,
      });
      persistState();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return true;
  }

  // 5B. Proxy seguro para descargar imágenes, stickers, videos, audios y documentos de Meta
  if (pathname.startsWith('/api/whatsapp/media/') && req.method === 'GET') {
    try {
      const mediaId = pathname.slice('/api/whatsapp/media/'.length).replace(/[^A-Za-z0-9_-]/g, '');
      const branchId = parsedUrl.query?.branchId ? String(parsedUrl.query.branchId) : null;
      const resolved = resolveCredentials(branchId, null);
      const creds = resolved ? resolved.creds : null;

      if (!mediaId || !creds || !creds.accessToken) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Media o credenciales no disponibles' }));
        return true;
      }

      const version = creds.apiVersion || 'v21.0';
      const metaResp = await fetch(`https://graph.facebook.com/${version}/${mediaId}`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const metaInfo = await metaResp.json().catch(() => ({}));
      if (!metaResp.ok || !metaInfo?.url) {
        res.writeHead(metaResp.status || 502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: metaInfo?.error?.message || 'No se pudo obtener URL de media' }));
        return true;
      }

      const fileResp = await fetch(metaInfo.url, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      if (!fileResp.ok) {
        res.writeHead(fileResp.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: `Error descargando media (${fileResp.status})` }));
        return true;
      }

      const arrayBuf = await fileResp.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      res.writeHead(200, {
        'Content-Type': metaInfo.mime_type || fileResp.headers.get('content-type') || 'application/octet-stream',
        'Content-Length': String(buf.length),
        'Cache-Control': 'private, max-age=3600',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(buf);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return true;
  }

  // 6. Probar credenciales oficiales de Meta Graph API
  if (pathname === '/api/whatsapp/test-connection' && req.method === 'POST') {
    try {
      const rawBuf = await readBodyBuffer(req, maxBodyBytes);
      const { phoneNumberId, accessToken, apiVersion = 'v21.0' } = JSON.parse(rawBuf.toString('utf8') || '{}');
      if (!phoneNumberId || !accessToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Phone Number ID y Access Token son obligatorios' }));
        return true;
      }
      const resp = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: data?.error?.message || `Error HTTP ${resp.status}` }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          verifiedName: data.verified_name,
          displayPhoneNumber: data.display_phone_number,
          qualityRating: data.quality_rating,
        })
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return true;
  }

  // 7. Obtener conversaciones y logs almacenados en el servidor
  if (pathname === '/api/whatsapp/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        conversations: Object.values(state.conversations),
        logs: state.logs,
      })
    );
    return true;
  }

  return false;
}

module.exports = { handleWhatsAppRoute };
