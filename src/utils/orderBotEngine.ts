import {
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  ProductCategoryItem,
  ProductSizeConfig,
} from '../types/catalog';

export interface BotSuggestion {
  product: Product;
  suggestedSize?: ProductSizeConfig;
  unitPrice: number;
  reason: string;
}

export interface CustomerBotPreferences {
  favoriteFlavors: string[];
  preferredSize?: string;
  preferredMode?: 'delivery' | 'pickup' | 'salon';
  preferredPayment?: PaymentMethod;
  lastOrderedNames?: string[];
  updatedAt: string;
}

export interface OrderBotContext {
  storeName?: string;
  branchName?: string;
  branchAddress?: string;
  customerName?: string;
  isRegistered?: boolean;
  requireRegistration?: boolean;
  preferences?: CustomerBotPreferences;
  activeOrder?: Order | null;
  activeOrders?: Order[];
  lastOrder?: Order | null;
}

export interface OrderBotResponse {
  reply: string;
  suggestions: BotSuggestion[];
  quickReplies: string[];
  orderCards?: Order[];
  action?: 'start_checkout' | 'repeat_last_order' | 'open_auth';
}

const BOT_PREFS_STORAGE_KEY = 'kh_order_bot_prefs_v1';

const FLAVOR_KEYWORDS = [
  'pepperoni',
  'hawaiana',
  'americana',
  'vegetariana',
  'suprema',
  'carnivora',
  'margarita',
  'napolitana',
  'cuatro quesos',
  'tocino',
  'jamon',
  'chorizo',
  'pollo',
  'bbq',
  'champinones',
  'aceituna',
  'picante',
  'coca',
  'inca',
  'pan al ajo',
  'alitas',
];

export function normalizeBotText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function loadBotPreferences(userKey: string): CustomerBotPreferences {
  if (typeof window === 'undefined' || !userKey) {
    return { favoriteFlavors: [], updatedAt: new Date().toISOString() };
  }
  try {
    const raw = window.localStorage.getItem(BOT_PREFS_STORAGE_KEY);
    if (!raw) return { favoriteFlavors: [], updatedAt: new Date().toISOString() };
    const map = JSON.parse(raw) as Record<string, CustomerBotPreferences>;
    return map[userKey] || { favoriteFlavors: [], updatedAt: new Date().toISOString() };
  } catch {
    return { favoriteFlavors: [], updatedAt: new Date().toISOString() };
  }
}

export function saveBotPreferences(
  userKey: string,
  partial: Partial<CustomerBotPreferences>
): CustomerBotPreferences {
  const current = loadBotPreferences(userKey);
  const mergedFlavors = Array.from(
    new Set([...(partial.favoriteFlavors || []), ...current.favoriteFlavors])
  ).slice(0, 6);

  const next: CustomerBotPreferences = {
    ...current,
    ...partial,
    favoriteFlavors: mergedFlavors,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && userKey) {
    try {
      const raw = window.localStorage.getItem(BOT_PREFS_STORAGE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, CustomerBotPreferences>) : {};
      map[userKey] = next;
      window.localStorage.setItem(BOT_PREFS_STORAGE_KEY, JSON.stringify(map));

      // Sincronización silenciosa con el servidor PHP para CRM/Marketing multidispositivo
      void fetch('/api/order-bot.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_prefs',
          userKey,
          preferences: next,
        }),
      }).catch(() => {});
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

export async function hydrateBotPreferencesFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const resp = await fetch('/api/order-bot.php?action=prefs');
    if (!resp.ok) return;
    const json = (await resp.json()) as {
      success?: boolean;
      preferencesMap?: Record<string, CustomerBotPreferences>;
    };
    if (!json.success || !json.preferencesMap) return;
    const raw = window.localStorage.getItem(BOT_PREFS_STORAGE_KEY);
    const localMap = raw ? (JSON.parse(raw) as Record<string, CustomerBotPreferences>) : {};
    const merged = { ...json.preferencesMap, ...localMap };
    window.localStorage.setItem(BOT_PREFS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore when offline or without PHP backend
  }
}

export function learnTastesFromText(
  userKey: string,
  rawQuery: string,
  matchedProducts: Product[] = []
): CustomerBotPreferences {
  const q = normalizeBotText(rawQuery);
  const detected: string[] = [];

  for (const kw of FLAVOR_KEYWORDS) {
    if (q.includes(kw)) detected.push(kw);
  }
  for (const prod of matchedProducts.slice(0, 2)) {
    const pName = normalizeBotText(prod.name);
    for (const kw of FLAVOR_KEYWORDS) {
      if (pName.includes(kw)) detected.push(kw);
    }
  }

  let preferredSize: string | undefined;
  if (/\bfamiliar\b/.test(q)) preferredSize = 'Familiar';
  else if (/\bmediana\b/.test(q)) preferredSize = 'Mediana';
  else if (/\bpersonal\b/.test(q)) preferredSize = 'Personal';

  if (detected.length === 0 && !preferredSize) {
    return loadBotPreferences(userKey);
  }

  return saveBotPreferences(userKey, {
    favoriteFlavors: detected,
    ...(preferredSize ? { preferredSize } : {}),
  });
}

export function learnTastesFromItems(userKey: string, items: OrderItem[]): void {
  const detected: string[] = [];
  const names: string[] = [];
  let preferredSize: string | undefined;

  for (const item of items) {
    names.push(item.productName);
    const norm = normalizeBotText(item.productName);
    for (const kw of FLAVOR_KEYWORDS) {
      if (norm.includes(kw)) detected.push(kw);
    }
    if (item.size?.name) preferredSize = item.size.name;
  }

  saveBotPreferences(userKey, {
    favoriteFlavors: detected,
    lastOrderedNames: names.slice(0, 4),
    ...(preferredSize ? { preferredSize } : {}),
  });
}

function getDefaultSize(product: Product): ProductSizeConfig | undefined {
  if (!product.hasSizes) return undefined;
  const enabled = product.sizes.filter(s => s.enabled);
  return enabled.find(s => s.isDefault) || enabled[0];
}

function getEffectivePrice(product: Product, size?: ProductSizeConfig): number {
  return size ? size.price : product.basePrice;
}

function pickSizeForPeople(product: Product, peopleCount: number): ProductSizeConfig | undefined {
  if (!product.hasSizes) return undefined;
  const enabled = product.sizes.filter(s => s.enabled).sort((a, b) => a.slices - b.slices);
  if (enabled.length === 0) return undefined;

  if (peopleCount <= 1) return enabled.find(s => s.slices <= 4) || enabled[0];
  if (peopleCount <= 3) {
    return enabled.find(s => s.slices >= 6 && s.slices <= 8) || enabled[Math.floor(enabled.length / 2)];
  }
  return enabled.find(s => s.slices >= 8) || enabled[enabled.length - 1];
}

function pickSizeForBudget(product: Product, maxBudget: number): ProductSizeConfig | undefined {
  if (!product.hasSizes) return undefined;
  return product.sizes
    .filter(s => s.enabled && s.price <= maxBudget)
    .sort((a, b) => b.price - a.price)[0];
}

function formatOrderStatusLabel(status: Order['status']): string {
  switch (status) {
    case 'recibido':
      return 'Recibido en cocina';
    case 'en_cocina':
      return 'Preparando tu masa';
    case 'en_horno':
      return 'En el horno de piedra';
    case 'listo':
      return 'Listo para despacho / recojo';
    case 'en_ruta':
      return 'En ruta hacia tu dirección';
    case 'entregado':
      return 'Entregado';
    default:
      return 'En proceso';
  }
}

export function buildWelcomeResponse(
  products: Product[],
  ctx: OrderBotContext
): OrderBotResponse {
  const available = products.filter(p => p.isAvailable);
  const brand = ctx.storeName?.trim() || 'Gastro Restaurante';

  if (ctx.requireRegistration && !ctx.isRegistered) {
    return {
      reply: `¡Hola! Bienvenido a ${brand}. Para hacer tu pedido, acumular puntos y recordar tus gustos, regístrate o inicia sesión primero (toma 10 segundos).`,
      suggestions: [],
      quickReplies: ['Ver promociones', 'Horarios y local'],
      action: 'open_auth',
    };
  }

  const firstName = ctx.customerName ? ctx.customerName.trim().split(' ')[0] : '';
  const favs = ctx.preferences?.favoriteFlavors || [];

  // Prioritize products matching remembered flavors
  const sorted = [...available].sort((a, b) => {
    const aMatch = favs.some(f => normalizeBotText(a.name).includes(f)) ? 1 : 0;
    const bMatch = favs.some(f => normalizeBotText(b.name).includes(f)) ? 1 : 0;
    return bMatch - aMatch;
  });

  const featured = sorted.slice(0, 3).map(product => {
    const size = getDefaultSize(product);
    const isFav = favs.some(f => normalizeBotText(product.name).includes(f));
    return {
      product,
      suggestedSize: size,
      unitPrice: getEffectivePrice(product, size),
      reason: isFav
        ? 'Según tus gustos guardados'
        : size
        ? `${size.name} (${size.slices} tajadas)`
        : 'Disponible ahora',
    };
  });

  const favGreeting =
    favs.length > 0
      ? ` Recuerdo que te gusta: ${favs.slice(0, 3).join(', ')}.`
      : '';

  const reply = firstName
    ? `¡Hola ${firstName}! Qué gusto verte de nuevo en ${brand}.${favGreeting} ¿Qué te provoca pedir hoy?`
    : `¡Hola! Soy tu asistente de ${brand}. Dime cuántas personas son, tu presupuesto o qué sabor te provoca y armamos tu pedido.`;

  const activeList =
    ctx.activeOrders && ctx.activeOrders.length > 0
      ? ctx.activeOrders
      : ctx.activeOrder
      ? [ctx.activeOrder]
      : [];

  const quickReplies = [
    ...(ctx.lastOrder ? ['Repetir último pedido'] : []),
    ...(activeList.length > 0 ? ['¿Cómo va mi pedido?'] : []),
    'Ver promociones',
    'Para 4 personas',
    'Presupuesto S/ 35',
  ].slice(0, 4);

  return {
    reply,
    suggestions: featured,
    quickReplies,
  };
}

export function generateOrderBotResponse(
  rawQuery: string,
  products: Product[],
  categories: ProductCategoryItem[],
  ctx: OrderBotContext = {}
): OrderBotResponse {
  const available = products.filter(p => p.isAvailable);
  const query = normalizeBotText(rawQuery);
  const brand = ctx.storeName?.trim() || 'Gastro Restaurante';

  if (available.length === 0) {
    return {
      reply: `En este momento no hay productos disponibles en el catálogo de ${brand}.`,
      suggestions: [],
      quickReplies: [],
    };
  }

  // 1. Saludo
  if (/^(hola|buenas|buenos|hey|hi|ola|ayuda|menu|carta|empezar)\b/.test(query) && query.length < 28) {
    return buildWelcomeResponse(products, ctx);
  }

  // 2. Estado de pedido(s) en vivo
  if (/\b(estado|donde esta|como va|mi pedido|mis pedidos|seguimiento|orden)\b/.test(query)) {
    const activeList =
      ctx.activeOrders && ctx.activeOrders.length > 0
        ? ctx.activeOrders
        : ctx.activeOrder
        ? [ctx.activeOrder]
        : [];

    if (activeList.length >= 1) {
      return {
        reply:
          activeList.length === 1
            ? 'Aquí tienes el estado de tu pedido activo:'
            : `Tienes ${activeList.length} pedidos activos en curso:`,
        suggestions: [],
        orderCards: activeList,
        quickReplies: ['Ver promociones', 'Bebidas y extras'],
      };
    }

    return {
      reply: 'No tienes un pedido activo en curso ahora mismo. ¿Te ayudo a armar uno nuevo?',
      suggestions: available.slice(0, 2).map(product => {
        const size = getDefaultSize(product);
        return {
          product,
          suggestedSize: size,
          unitPrice: getEffectivePrice(product, size),
          reason: size ? size.name : 'Recomendado',
        };
      }),
      quickReplies: ['Ver promociones', 'Para 4 personas'],
    };
  }

  // 3. Repetir último pedido
  if (/\b(repetir|lo de siempre|ultimo pedido|mismo pedido)\b/.test(query)) {
    if (ctx.lastOrder && ctx.lastOrder.items.length > 0) {
      return {
        reply: `¡Listo! Agregué los productos de tu último pedido (#${ctx.lastOrder.orderNumber.replace(/^#/, '')}) al carrito.`,
        suggestions: [],
        quickReplies: ['Finalizar compra', 'Agregar bebida'],
        action: 'repeat_last_order',
      };
    }
    return {
      reply: 'Aún no encuentro un pedido anterior en tu historial. Te sugiero estas opciones:',
      suggestions: available.slice(0, 3).map(product => {
        const size = getDefaultSize(product);
        return {
          product,
          suggestedSize: size,
          unitPrice: getEffectivePrice(product, size),
          reason: size ? size.name : 'Popular',
        };
      }),
      quickReplies: ['Ver promociones', 'Para 4 personas'],
    };
  }

  // 4. Finalizar compra / pagar
  if (/\b(pagar|finalizar|comprar|cerrar pedido|checkout|confirmar compra)\b/.test(query)) {
    return {
      reply: 'Perfecto, vamos a completar tu compra paso a paso aquí mismo.',
      suggestions: [],
      quickReplies: [],
      action: 'start_checkout',
    };
  }

  // 5. Horarios y ubicación
  if (/\b(horario|hora|atienden|abierto|ubicacion|direccion|donde estan|local|sede)\b/.test(query)) {
    return {
      reply: `Estás comprando en ${ctx.branchName || brand}${
        ctx.branchAddress ? ` (${ctx.branchAddress})` : ''
      }. Atendemos pedidos web para Delivery (25–35 min) y Recojo en local (15–20 min).`,
      suggestions: [],
      quickReplies: ['Ver promociones', 'Para 4 personas', 'Finalizar compra'],
    };
  }

  // 6. Presupuesto máximo
  const budgetMatch = query.match(/(?:tengo|hasta|maximo|presupuesto|menos de|s\/\.?)\s*(\d+(?:\.\d+)?)/);
  const isCheapIntent = /\b(barat|econom|accesible)\b/.test(query);
  if (budgetMatch || isCheapIntent) {
    const maxBudget = budgetMatch ? Number(budgetMatch[1]) : 35;
    const candidates: BotSuggestion[] = [];

    for (const product of available) {
      if (product.hasSizes) {
        const size = pickSizeForBudget(product, maxBudget);
        if (size) {
          candidates.push({
            product,
            suggestedSize: size,
            unitPrice: size.price,
            reason: `${size.name} dentro de S/ ${maxBudget.toFixed(0)}`,
          });
        }
      } else if (product.basePrice <= maxBudget) {
        candidates.push({
          product,
          unitPrice: product.basePrice,
          reason: `Dentro de S/ ${maxBudget.toFixed(0)}`,
        });
      }
    }

    candidates.sort((a, b) => b.unitPrice - a.unitPrice);
    const top = candidates.slice(0, 4);

    if (top.length > 0) {
      return {
        reply: `Con un presupuesto de hasta S/ ${maxBudget.toFixed(2)}, estas opciones te calzan perfecto:`,
        suggestions: top,
        quickReplies: ['Finalizar compra', 'Agregar bebida', 'Ver promociones'],
      };
    }
  }

  // 7. Cantidad de personas
  const peopleMatch = query.match(/(?:para|somos)\s*(\d+)/);
  const isFamilyIntent = /\b(familiar|familia|grupo|reunion|fiesta)\b/.test(query);
  const isPersonalIntent = /\b(personal|solo|uno|individual)\b/.test(query);

  if (peopleMatch || isFamilyIntent || isPersonalIntent) {
    const peopleCount = peopleMatch ? Math.max(1, Number(peopleMatch[1])) : isFamilyIntent ? 4 : 1;
    const pizzaOrPromo = available.filter(p => {
      const cat = normalizeBotText(p.category);
      return cat.includes('pizza') || cat.includes('promo') || cat.includes('combo') || p.hasSizes;
    });
    const pool = pizzaOrPromo.length > 0 ? pizzaOrPromo : available;
    const suggestions = pool.slice(0, 4).map(product => {
      const size = pickSizeForPeople(product, peopleCount);
      return {
        product,
        suggestedSize: size,
        unitPrice: getEffectivePrice(product, size),
        reason: size
          ? `Ideal para ${peopleCount} ${peopleCount === 1 ? 'persona' : 'personas'} · ${size.name}`
          : `Recomendado para ${peopleCount} ${peopleCount === 1 ? 'persona' : 'personas'}`,
      };
    });

    return {
      reply:
        peopleCount >= 4
          ? `Para ${peopleCount} personas te recomiendo tamaños familiares/grandes o promociones dobles:`
          : peopleCount >= 2
          ? `Para ${peopleCount} personas una pizza mediana/grande o promo compartida va ideal:`
          : `Para 1 persona te recomiendo estas opciones personales:`,
      suggestions,
      quickReplies: ['Bebidas y extras', 'Finalizar compra', 'Ver promociones'],
    };
  }

  // 8. Promociones / Combos
  if (/\b(promo|promocion|promociones|oferta|ofertas|combo|combos|2x1)\b/.test(query)) {
    const promos = available.filter(p => {
      const text = normalizeBotText(`${p.name} ${p.description} ${p.category}`);
      return text.includes('promo') || text.includes('combo') || text.includes('oferta');
    });
    const list = (promos.length > 0 ? promos : available).slice(0, 4).map(product => {
      const size = getDefaultSize(product);
      return {
        product,
        suggestedSize: size,
        unitPrice: getEffectivePrice(product, size),
        reason: 'Promoción destacada',
      };
    });
    return {
      reply:
        promos.length > 0
          ? 'Estas son las promociones y combos activos ahora mismo:'
          : 'Aquí tienes nuestras opciones más pedidas de la carta:',
      suggestions: list,
      quickReplies: ['Para 4 personas', 'Bebidas y extras', 'Finalizar compra'],
    };
  }

  // 9. Bebidas, entradas o postres
  if (/\b(bebida|bebidas|gaseosa|gaseosas|coca|inca|agua|tomar|entrada|entradas|pan al ajo|alitas|postre|postres)\b/.test(query)) {
    const extras = available.filter(p => {
      const text = normalizeBotText(`${p.name} ${p.description} ${p.category}`);
      return (
        text.includes('bebida') ||
        text.includes('gaseosa') ||
        text.includes('coca') ||
        text.includes('inca') ||
        text.includes('entrada') ||
        text.includes('ajo') ||
        text.includes('alita') ||
        text.includes('postre')
      );
    });
    const list = (extras.length > 0 ? extras : available).slice(0, 4).map(product => {
      const size = getDefaultSize(product);
      return {
        product,
        suggestedSize: size,
        unitPrice: getEffectivePrice(product, size),
        reason: 'Complemento ideal',
      };
    });
    return {
      reply:
        extras.length > 0
          ? 'Aquí tienes bebidas y acompañamientos para completar tu pedido:'
          : 'No encontré bebidas con ese nombre, pero mira estas opciones:',
      suggestions: list,
      quickReplies: ['Finalizar compra', 'Ver promociones'],
    };
  }

  // 10. Preguntas sobre detalles, ingredientes o tamaños de un producto
  if (/\b(que trae|incluye|ingrediente|ingredientes|detalles|tamanos|tamano|opciones|masa)\b/.test(query)) {
    const tokens = query
      .split(/\s+/)
      .map(t => t.replace(/[^a-z0-9]/g, ''))
      .filter(t => t.length >= 3 && !['que', 'trae', 'incluye', 'ingredientes', 'detalles', 'tamanos', 'tamano', 'tiene', 'esa', 'ese', 'esta', 'este', 'pizza', 'promo'].includes(t));

    const matched = available.filter(p => {
      const text = normalizeBotText(`${p.name} ${p.description}`);
      return tokens.length === 0 || tokens.some(tok => text.includes(tok));
    });
    const picks = (matched.length > 0 ? matched : available).slice(0, 3);
    const lines = picks.map(p => {
      const sizeStr = p.hasSizes
        ? p.sizes
            .filter(s => s.enabled)
            .map(s => `${s.name} S/ ${s.price.toFixed(2)}`)
            .join(', ')
        : `S/ ${p.basePrice.toFixed(2)}`;
      const optsStr = p.subOptions
        .filter(g => g.enabled)
        .map(g => `${g.name}: ${g.choices.slice(0, 4).map(c => c.name).join('/')}`)
        .join(' · ');
      return `• ${p.name}: ${p.description || 'Recién horneada'}${sizeStr ? ` (${sizeStr})` : ''}${optsStr ? ` — ${optsStr}` : ''}`;
    });

    return {
      reply: `Aquí tienes los detalles:\n${lines.join('\n')}`,
      suggestions: picks.map(product => {
        const size = getDefaultSize(product);
        return {
          product,
          suggestedSize: size,
          unitPrice: getEffectivePrice(product, size),
          reason: 'Pulsa el botón de ajustes para elegir detalles',
        };
      }),
      quickReplies: ['Finalizar compra', 'Ver promociones'],
    };
  }

  // 11. Búsqueda por palabras clave
  const tokens = query
    .split(/\s+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(
      t =>
        t.length >= 3 &&
        ![
          'quiero',
          'una',
          'unos',
          'unas',
          'con',
          'para',
          'tiene',
          'tienen',
          'dame',
          'pizza',
          'pizzas',
          'por',
          'favor',
        ].includes(t)
    );

  const wantsLarge = /\b(familiar|grande|gigante|12|8)\b/.test(query);
  const wantsSmall = /\b(personal|mediana|4|6)\b/.test(query);

  if (tokens.length > 0) {
    const scored = available
      .map(product => {
        const catName = categories.find(c => c.id === product.category)?.name || product.category;
        const haystack = normalizeBotText(`${product.name} ${product.description} ${catName}`);
        let score = 0;
        for (const tok of tokens) {
          if (normalizeBotText(product.name).includes(tok)) score += 3;
          else if (haystack.includes(tok)) score += 1;
        }
        return { product, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    if (scored.length > 0) {
      const suggestions = scored.map(({ product }) => {
        const size = wantsLarge
          ? pickSizeForPeople(product, 4)
          : wantsSmall
          ? pickSizeForPeople(product, 1)
          : getDefaultSize(product);
        return {
          product,
          suggestedSize: size,
          unitPrice: getEffectivePrice(product, size),
          reason: size ? `${size.name} (${size.slices} tajadas)` : 'Coincide con tu búsqueda',
        };
      });

      return {
        reply: 'Encontré estas opciones según lo que buscas. Puedes agregarlas directo o personalizarlas:',
        suggestions,
        quickReplies: ['Finalizar compra', 'Bebidas y extras', 'Ver promociones'],
      };
    }
  }

  // 11. Fallback con catálogo real y gustos
  const favs = ctx.preferences?.favoriteFlavors || [];
  const fallbackPool = [...available].sort((a, b) => {
    const aFav = favs.some(f => normalizeBotText(a.name).includes(f)) ? 1 : 0;
    const bFav = favs.some(f => normalizeBotText(b.name).includes(f)) ? 1 : 0;
    return bFav - aFav;
  });

  return {
    reply: 'Puedo ayudarte a elegir por sabor (ej. pepperoni, hawaiana), por personas, presupuesto o finalizar tu compra. Mira estas sugerencias:',
    suggestions: fallbackPool.slice(0, 3).map(product => {
      const size = getDefaultSize(product);
      return {
        product,
        suggestedSize: size,
        unitPrice: getEffectivePrice(product, size),
        reason: size ? size.name : 'Recomendado',
      };
    }),
    quickReplies: ['Ver promociones', 'Para 4 personas', 'Finalizar compra'],
  };
}

export function findBotPreferencesForCustomer(
  keys: Array<string | undefined>
): CustomerBotPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BOT_PREFS_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, CustomerBotPreferences>;
    const cleanKeys = keys
      .filter((k): k is string => Boolean(k && k.trim()))
      .flatMap(k => {
        const digits = k.replace(/\D/g, '');
        return digits.length >= 7 ? [k.trim(), digits, digits.slice(-9)] : [k.trim()];
      });

    for (const [storedKey, prefs] of Object.entries(map)) {
      const storedDigits = storedKey.replace(/\D/g, '');
      if (
        cleanKeys.includes(storedKey) ||
        (storedDigits.length >= 7 && cleanKeys.some(ck => ck === storedDigits || ck === storedDigits.slice(-9)))
      ) {
        return prefs;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getUpsellSuggestions(
  cartItems: OrderItem[],
  products: Product[]
): BotSuggestion[] {
  const inCartIds = new Set(cartItems.map(i => i.productId));
  const hasDrinkOrSide = cartItems.some(item => {
    const prod = products.find(p => p.id === item.productId);
    const cat = normalizeBotText(prod?.category || '');
    return cat.includes('bebida') || cat.includes('entrada') || cat.includes('postre');
  });

  if (hasDrinkOrSide) return [];

  const drinks = products.filter(
    p => p.isAvailable && !inCartIds.has(p.id) && normalizeBotText(p.category).includes('bebida')
  );
  const sides = products.filter(
    p =>
      p.isAvailable &&
      !inCartIds.has(p.id) &&
      (normalizeBotText(p.category).includes('entrada') || normalizeBotText(p.category).includes('postre'))
  );

  const picks = [drinks[0], sides[0]].filter((p): p is Product => Boolean(p));
  return picks.map(product => {
    const size = getDefaultSize(product);
    return {
      product,
      suggestedSize: size,
      unitPrice: getEffectivePrice(product, size),
      reason: 'Para acompañar tu pizza',
    };
  });
}

export function extractTastesFromOrders(orders: Order[]): string[] {
  const counts = new Map<string, number>();
  for (const ord of orders) {
    if (ord.status === 'cancelado') continue;
    for (const item of ord.items || []) {
      const norm = normalizeBotText(item.productName);
      for (const kw of FLAVOR_KEYWORDS) {
        if (norm.includes(kw)) {
          counts.set(kw, (counts.get(kw) || 0) + item.quantity);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw]) => kw);
}

export async function askOrderBotSmart(
  rawQuery: string,
  products: Product[],
  categories: ProductCategoryItem[],
  ctx: OrderBotContext = {}
): Promise<OrderBotResponse> {
  const available = products.filter(p => p.isAvailable);
  const activeList =
    ctx.activeOrders && ctx.activeOrders.length > 0
      ? ctx.activeOrders
      : ctx.activeOrder
      ? [ctx.activeOrder]
      : [];

  try {
    const resp = await fetch('/api/order-bot.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        query: rawQuery,
        storeName: ctx.storeName,
        branchName: ctx.branchName,
        customerName: ctx.customerName,
        preferences: ctx.preferences || {},
        activeOrders: activeList.map(o => ({
          orderNumber: o.orderNumber,
          status: formatOrderStatusLabel(o.status),
          estimatedMinutes: o.estimatedMinutes || 25,
          total: o.total,
        })),
        catalog: available.slice(0, 45).map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          basePrice: p.basePrice,
          sizes: p.hasSizes
            ? p.sizes.filter(s => s.enabled).map(s => ({ name: s.name, slices: s.slices, price: s.price }))
            : [],
          subOptions: p.subOptions
            .filter(g => g.enabled)
            .map(g => ({ name: g.name, required: g.required, choices: g.choices.map(c => c.name) })),
          extras: (p.allowedExtras || [])
            .filter(e => e.enabled)
            .map(e => ({ name: e.name, price: e.price })),
        })),
      }),
    });

    if (resp.ok) {
      const json = (await resp.json()) as {
        success?: boolean;
        fallback?: boolean;
        data?: {
          reply: string;
          suggestedProductIds?: string[];
          quickReplies?: string[];
          action?: OrderBotResponse['action'] | null;
        };
      };

      if (json.success && json.data?.reply) {
        const idSet = new Set(json.data.suggestedProductIds || []);
        const suggestions: BotSuggestion[] = available
          .filter(p => idSet.has(p.id))
          .slice(0, 4)
          .map(product => {
            const size = getDefaultSize(product);
            return {
              product,
              suggestedSize: size,
              unitPrice: getEffectivePrice(product, size),
              reason: size ? `${size.name} (${size.slices} tajadas)` : 'Sugerido por IA',
            };
          });

        return {
          reply: json.data.reply,
          suggestions,
          quickReplies:
            json.data.quickReplies && json.data.quickReplies.length > 0
              ? json.data.quickReplies
              : ['Finalizar compra', 'Ver promociones'],
          action: json.data.action || undefined,
        };
      }
    }
  } catch {
    // Fallback to local NLU engine
  }

  return generateOrderBotResponse(rawQuery, products, categories, ctx);
}
