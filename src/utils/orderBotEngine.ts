import { Product, ProductCategoryItem, ProductSizeConfig } from '../types/catalog';

export interface BotSuggestion {
  product: Product;
  suggestedSize?: ProductSizeConfig;
  unitPrice: number;
  reason: string;
}

export interface OrderBotResponse {
  reply: string;
  suggestions: BotSuggestion[];
  quickReplies: string[];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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

  if (peopleCount <= 1) {
    return enabled.find(s => s.slices <= 4) || enabled[0];
  }
  if (peopleCount <= 3) {
    return enabled.find(s => s.slices >= 6 && s.slices <= 8) || enabled[Math.floor(enabled.length / 2)];
  }
  return enabled.find(s => s.slices >= 8) || enabled[enabled.length - 1];
}

function pickSizeForBudget(product: Product, maxBudget: number): ProductSizeConfig | undefined {
  if (!product.hasSizes) return undefined;
  const affordable = product.sizes
    .filter(s => s.enabled && s.price <= maxBudget)
    .sort((a, b) => b.price - a.price);
  return affordable[0];
}

export function generateOrderBotResponse(
  rawQuery: string,
  products: Product[],
  categories: ProductCategoryItem[],
  storeName?: string
): OrderBotResponse {
  const available = products.filter(p => p.isAvailable);
  const query = normalizeText(rawQuery);
  const brand = storeName?.trim() || 'Khalessi Pizza';

  if (available.length === 0) {
    return {
      reply: `En este momento no hay productos disponibles en el catálogo de ${brand}.`,
      suggestions: [],
      quickReplies: [],
    };
  }

  // 1. Saludo o pedido inicial
  if (/^(hola|buenas|buenos|hey|hi|ola|ayuda|menu|carta|empezar)\b/.test(query) && query.length < 28) {
    const featured = available.slice(0, 3).map(product => {
      const size = getDefaultSize(product);
      return {
        product,
        suggestedSize: size,
        unitPrice: getEffectivePrice(product, size),
        reason: size ? `${size.name} (${size.slices} tajadas)` : 'Disponible ahora',
      };
    });
    return {
      reply: `¡Hola! Soy tu asistente de ${brand}. Dime cuántas personas son, tu presupuesto o qué sabor te provoca y te armo el pedido.`,
      suggestions: featured,
      quickReplies: ['Ver promociones', 'Para 4 personas', 'Presupuesto S/ 35', 'Bebidas y extras'],
    };
  }

  // 2. Presupuesto máximo (ej. "tengo 35 soles", "hasta 40", "menos de 50", "barato")
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
        quickReplies: ['Ver promociones', 'Agregar bebida', 'Para 2 personas'],
      };
    }

    return {
      reply: `No encontré productos por debajo de S/ ${maxBudget.toFixed(2)}. Aquí tienes las opciones más económicas de la carta:`,
      suggestions: available
        .map(product => {
          const size = product.hasSizes
            ? product.sizes.filter(s => s.enabled).sort((a, b) => a.price - b.price)[0]
            : undefined;
          return {
            product,
            suggestedSize: size,
            unitPrice: getEffectivePrice(product, size),
            reason: size ? `${size.name} · menor precio` : 'Menor precio',
          };
        })
        .sort((a, b) => a.unitPrice - b.unitPrice)
        .slice(0, 3),
      quickReplies: ['Ver promociones', 'Presupuesto S/ 50'],
    };
  }

  // 3. Cantidad de personas (ej. "para 4 personas", "somos 2", "familiar", "personal")
  const peopleMatch = query.match(/(?:para|somos)\s*(\d+)/);
  const isFamilyIntent = /\b(familiar|familia|grupo|reunion|fiesta)\b/.test(query);
  const isPersonalIntent = /\b(personal|solo|uno|individual)\b/.test(query);

  if (peopleMatch || isFamilyIntent || isPersonalIntent) {
    const peopleCount = peopleMatch ? Math.max(1, Number(peopleMatch[1])) : isFamilyIntent ? 4 : 1;
    const pizzaOrPromo = available.filter(p => {
      const cat = normalizeText(p.category);
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
      quickReplies: ['Bebidas y extras', 'Ver promociones', 'Presupuesto S/ 45'],
    };
  }

  // 4. Promociones / Combos
  if (/\b(promo|promocion|promociones|oferta|ofertas|combo|combos|2x1)\b/.test(query)) {
    const promos = available.filter(p => {
      const text = normalizeText(`${p.name} ${p.description} ${p.category}`);
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
      quickReplies: ['Para 4 personas', 'Bebidas y extras', 'Presupuesto S/ 35'],
    };
  }

  // 5. Bebidas, entradas o postres
  if (/\b(bebida|bebidas|gaseosa|gaseosas|coca|inca|agua|tomar|entrada|entradas|pan al ajo|alitas|postre|postres)\b/.test(query)) {
    const extras = available.filter(p => {
      const text = normalizeText(`${p.name} ${p.description} ${p.category}`);
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
      quickReplies: ['Ver promociones', 'Pizzas clásicas', 'Para 2 personas'],
    };
  }

  // 6. Búsqueda por palabras clave (sabor, ingrediente o categoría)
  const tokens = query
    .split(/\s+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(t => t.length >= 3 && !['quiero', 'una', 'unos', 'unas', 'con', 'para', 'tiene', 'tienen', 'dame', 'pizza', 'pizzas', 'por', 'favor'].includes(t));

  const wantsLarge = /\b(familiar|grande|gigante|12|8)\b/.test(query);
  const wantsSmall = /\b(personal|mediana|4|6)\b/.test(query);

  if (tokens.length > 0) {
    const scored = available
      .map(product => {
        const catName = categories.find(c => c.id === product.category)?.name || product.category;
        const haystack = normalizeText(`${product.name} ${product.description} ${catName}`);
        let score = 0;
        for (const tok of tokens) {
          if (normalizeText(product.name).includes(tok)) score += 3;
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
        quickReplies: ['Bebidas y extras', 'Ver promociones', 'Para 4 personas'],
      };
    }
  }

  // 7. Fallback amigable con catálogo real
  const fallback = available.slice(0, 3).map(product => {
    const size = getDefaultSize(product);
    return {
      product,
      suggestedSize: size,
      unitPrice: getEffectivePrice(product, size),
      reason: size ? `${size.name}` : 'Recomendado',
    };
  });

  return {
    reply: 'Puedo ayudarte a elegir por sabor (ej. pepperoni, hawaiana), por cantidad de personas o por presupuesto. Mira estas sugerencias:',
    suggestions: fallback,
    quickReplies: ['Ver promociones', 'Para 4 personas', 'Presupuesto S/ 35', 'Bebidas y extras'],
  };
}
