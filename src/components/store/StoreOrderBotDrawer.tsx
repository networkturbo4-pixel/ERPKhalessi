import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Plus,
  SlidersHorizontal,
  ShoppingBag,
  Bot,
} from 'lucide-react';
import { OrderItem, Product, ProductCategoryItem } from '../../types/catalog';
import {
  BotSuggestion,
  generateOrderBotResponse,
} from '../../utils/orderBotEngine';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  suggestions?: BotSuggestion[];
  quickReplies?: string[];
}

interface StoreOrderBotDrawerProps {
  products: Product[];
  categories: ProductCategoryItem[];
  storeName: string;
  accentColor: string;
  isLightTheme: boolean;
  cartCount: number;
  bottomOffsetClass?: string;
  mode?: 'store' | 'kiosk';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideFloatingOnMobile?: boolean;
  onAddToCart: (item: OrderItem) => void;
  onCustomizeProduct: (product: Product) => void;
  onOpenCart: () => void;
}

export const StoreOrderBotDrawer: React.FC<StoreOrderBotDrawerProps> = ({
  products,
  categories,
  storeName,
  accentColor,
  isLightTheme,
  cartCount,
  bottomOffsetClass = 'bottom-5',
  mode = 'store',
  isOpen: controlledIsOpen,
  onOpenChange,
  hideFloatingOnMobile = false,
  onAddToCart,
  onCustomizeProduct,
  onOpenCart,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = (next: boolean) => {
    setInternalIsOpen(next);
    onOpenChange?.(next);
  };
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initial = generateOrderBotResponse('hola', products, categories, storeName);
    return [
      {
        id: 'bot-welcome',
        sender: 'bot',
        text: initial.reply,
        suggestions: initial.suggestions,
        quickReplies: initial.quickReplies,
      },
    ];
  });

  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
    };

    const res = generateOrderBotResponse(text, products, categories, storeName);
    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: res.reply,
      suggestions: res.suggestions,
      quickReplies: res.quickReplies,
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    if (!rawText) setInput('');
  };

  const handleQuickAdd = (suggestion: BotSuggestion) => {
    const { product, suggestedSize, unitPrice } = suggestion;

    const hasRequiredWithoutDefault = product.subOptions.some(
      g => g.enabled && g.required && !g.choices.some(c => c.isDefault)
    );

    if (product.productType === 'half_and_half' || hasRequiredWithoutDefault) {
      setIsOpen(false);
      onCustomizeProduct(product);
      return;
    }

    const defaultSubOptions = product.subOptions
      .filter(g => g.enabled)
      .flatMap(g => {
        const def = g.choices.find(c => c.isDefault);
        if (!def) return [];
        return [
          {
            groupId: g.id,
            groupName: g.name,
            choiceId: def.id,
            choiceName: def.name,
            priceDelta: def.priceDelta,
          },
        ];
      });

    const subDelta = defaultSubOptions.reduce((sum, s) => sum + s.priceDelta, 0);
    const finalUnit = unitPrice + subDelta;

    const item: OrderItem = {
      itemId: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      size: suggestedSize
        ? {
            id: suggestedSize.id,
            name: suggestedSize.name,
            slices: suggestedSize.slices,
            price: suggestedSize.price,
          }
        : undefined,
      subOptions: defaultSubOptions,
      extras: [],
      unitPrice: finalUnit,
      quantity: 1,
      totalPrice: finalUnit,
    };

    onAddToCart(item);
  };

  const surfaceBg = isLightTheme
    ? 'bg-white text-zinc-900 border-zinc-200'
    : 'bg-zinc-900 text-zinc-100 border-zinc-800';
  const subSurfaceBg = isLightTheme
    ? 'bg-zinc-50 border-zinc-200'
    : 'bg-zinc-950 border-zinc-800';
  const mutedText = isLightTheme ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir asistente de pedidos"
          className={`${hideFloatingOnMobile ? 'hidden lg:inline-flex' : 'inline-flex'} fixed right-4 ${bottomOffsetClass} z-40 items-center gap-2 px-3.5 py-2.5 rounded-full text-white text-xs font-semibold shadow-lg hover:opacity-95 transition-opacity whitespace-nowrap`}
          style={{ backgroundColor: accentColor }}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="sm:hidden">Asistente</span>
          <span className="hidden sm:inline">
            {mode === 'kiosk' ? '¿Ayuda para pedir?' : '¿Te ayudo a pedir?'}
          </span>
        </button>
      )}

      {/* Chat Drawer / Bottom Sheet */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-end sm:justify-end p-0 sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full sm:max-w-md h-[82dvh] sm:h-[600px] rounded-t-3xl sm:rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${surfaceBg}`}
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${subSurfaceBg}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">
                    Asistente de Pedidos
                  </h3>
                  <p className={`text-[11px] truncate ${mutedText}`}>
                    Te ayudo a elegir en segundos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {cartCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCart();
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span className="tabular-nums">Pedido ({cartCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Cerrar asistente"
                  onClick={() => setIsOpen(false)}
                  className={`p-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 ${mutedText}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ overscrollBehavior: 'contain' }}
            >
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'text-white rounded-br-sm'
                        : `${subSurfaceBg} border rounded-bl-sm`
                    }`}
                    style={msg.sender === 'user' ? { backgroundColor: accentColor } : undefined}
                  >
                    {msg.text}
                  </div>

                  {/* Product Suggestions */}
                  {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="w-full space-y-2">
                      {msg.suggestions.map(sugg => (
                        <div
                          key={`${msg.id}-${sugg.product.id}`}
                          className={`p-2.5 rounded-xl border flex items-center gap-3 ${subSurfaceBg}`}
                        >
                          {sugg.product.imageUrl && (
                            <img
                              src={sugg.product.imageUrl}
                              alt={sugg.product.name}
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">
                              {sugg.product.name}
                            </p>
                            <p className={`text-[11px] truncate ${mutedText}`}>
                              {sugg.reason}
                            </p>
                            <p className="text-xs font-semibold tabular-nums mt-0.5">
                              S/ {sugg.unitPrice.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              aria-label={`Personalizar ${sugg.product.name}`}
                              onClick={() => {
                                setIsOpen(false);
                                onCustomizeProduct(sugg.product);
                              }}
                              className={`p-2 rounded-lg border hover:opacity-80 transition-opacity ${
                                isLightTheme
                                  ? 'border-zinc-200 bg-white text-zinc-700'
                                  : 'border-zinc-700 bg-zinc-900 text-zinc-200'
                              }`}
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(sugg)}
                              className="px-2.5 py-2 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 hover:opacity-95 transition-opacity"
                              style={{ backgroundColor: accentColor }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Replies */}
                  {msg.sender === 'bot' && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.quickReplies.map(qr => (
                        <button
                          key={`${msg.id}-${qr}`}
                          type="button"
                          onClick={() => handleSend(qr)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap ${
                            isLightTheme
                              ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                          }`}
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={listEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className={`p-3 border-t flex items-center gap-2 ${subSurfaceBg}`}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ej: Pizza para 4 personas, promos, S/ 35..."
                className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isLightTheme
                    ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                    : 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
                }`}
              />
              <button
                type="submit"
                aria-label="Enviar mensaje"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl text-white disabled:opacity-40 transition-opacity shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
