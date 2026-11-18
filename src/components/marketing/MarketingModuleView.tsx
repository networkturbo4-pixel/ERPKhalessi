import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Megaphone,
  Bell,
  Users,
  Sparkles,
  Server,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Copy,
  RefreshCw,
  MessageCircle,
  ExternalLink,
  Smartphone,
  Laptop,
  Apple,
  Crown,
  AlertTriangle,
  Pizza,
  Search,
  Play,
  Wallet,
  Globe2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { useSettings } from '../../context/SettingsContext';
import { useBenefits } from '../../context/BenefitsContext';
import { toProductSlug } from '../../types/storeBuilder';
import {
  findBotPreferencesForCustomer,
  hydrateBotPreferencesFromServer,
} from '../../utils/orderBotEngine';
import {
  MarketingCampaign,
  MarketingChannel,
  MarketingPlatform,
  MarketingSegment,
  CustomerMarketingInsight,
  WebPushStatsResponse,
} from '../../types/marketing';
import {
  fetchMarketingPushStats,
  fetchMarketingCampaigns,
  sendMarketingWebPush,
  scheduleMarketingCampaign,
  updateMarketingCampaignStatus,
  runScheduledMarketingCampaignsNow,
} from '../../utils/webPushClient';
import { sendGoogleWalletPromo } from '../../utils/googleWallet';

type MarketingTab = 'clients' | 'campaigns' | 'automations' | 'cron';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerLabel: string;
  channel: MarketingChannel;
  enabled: boolean;
  titleTemplate: string;
  bodyTemplate: string;
}

const AUTOMATIONS_STORAGE_KEY = 'kh_marketing_automations_v1';

const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  {
    id: 'auto-inactive-15d',
    name: 'Recuperación de Poca Recurrencia (15+ días)',
    description:
      'Envía una invitación personalizada con la pizza favorita del cliente cuando lleva más de 15 días sin realizar un pedido.',
    triggerLabel: '15 días sin compras',
    channel: 'both',
    enabled: true,
    titleTemplate: '🍕 ¡Te extrañamos en Pizza Khalessi!',
    bodyTemplate:
      'Tu {{pizza_favorita}} te espera recién salida del horno. Pídela hoy con un toque directo aquí.',
  },
  {
    id: 'auto-almost-stamp',
    name: 'Recordatorio "A 1 Sello de tu Premio" (7/8)',
    description:
      'Notifica por Web Push y Google Wallet cuando al cliente le falta solo 1 sello para completar su tarjeta de puntos.',
    triggerLabel: '7 de 8 sellos',
    channel: 'both',
    enabled: true,
    titleTemplate: '🔥 ¡Estás a 1 solo sello de tu premio!',
    bodyTemplate:
      'Haz tu próximo pedido hoy y completa tu Tarjeta de Puntos Khalessi para canjear tu recompensa.',
  },
  {
    id: 'auto-reward-unlocked',
    name: 'Premio Desbloqueado (8/8 Sellos)',
    description:
      'Avisa automáticamente al cliente cuando alcanza la meta de sellos para que regrese a canjear su beneficio.',
    triggerLabel: '8 de 8 sellos',
    channel: 'web_push',
    enabled: true,
    titleTemplate: '🎉 ¡Completaste tus 8 sellos Khalessi!',
    bodyTemplate:
      'Ya tienes tu recompensa lista para canjear en tu próximo pedido online o en tienda.',
  },
  {
    id: 'auto-fav-weekend',
    name: 'Impulso Fin de Semana — Pizza Favorita',
    description:
      'Campaña sugerida para clientes regulares invitándolos a repetir su producto más pedido.',
    triggerLabel: 'Cada viernes 6:00 PM',
    channel: 'web_push',
    enabled: false,
    titleTemplate: '🍕 ¿Noche de {{pizza_favorita}}?',
    bodyTemplate:
      'Hoy es el día perfecto para disfrutar tu favorita recién horneada. Haz tu pedido en segundos.',
  },
];

function normalizePhoneForMatch(phone: string | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-9);
}

function normalizePhoneForWhatsApp(phone: string | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0519') && digits.length === 12) {
    digits = digits.slice(1);
  }
  if (digits.startsWith('51519') && digits.length === 13) {
    digits = digits.slice(2);
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return `51${digits}`;
  }
  return digits;
}

function getPlatformBadge(platform?: MarketingPlatform) {
  switch (platform) {
    case 'android':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <Smartphone className="w-3 h-3" /> Android
        </span>
      );
    case 'ios':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/15 text-zinc-700 dark:text-zinc-200">
          <Apple className="w-3 h-3" /> iOS
        </span>
      );
    case 'windows':
    case 'macos':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300">
          <Laptop className="w-3 h-3" /> {platform === 'macos' ? 'macOS' : 'Windows'}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Bell className="w-3 h-3" /> Web Push
        </span>
      );
  }
}

export const MarketingModuleView: React.FC = () => {
  const { orders, products, customers } = useOrderCatalog();
  const { allCustomerAccounts } = useStoreCustomer();
  const { activeTenant, customization, dispatchToast, openNoticeModal } = useSettings();
  const { pointsConfig } = useBenefits();

  const [activeTab, setActiveTab] = useState<MarketingTab>('clients');
  const [pushStats, setPushStats] = useState<WebPushStatsResponse | null>(null);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [showKpis, setShowKpis] = useState(false);

  useEffect(() => {
    void hydrateBotPreferencesFromServer();
  }, []);

  // Clients & Intelligence filters
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'vip' | 'regular' | 'at_risk' | 'inactive'>('all');
  const [clientSearch, setClientSearch] = useState('');

  // Campaign Composer State
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignProductId, setCampaignProductId] = useState('');
  const [campaignImageUrl, setCampaignImageUrl] = useState('');
  const [campaignTargetUrl, setCampaignTargetUrl] = useState('');
  const [campaignSegment, setCampaignSegment] = useState<MarketingSegment>('all');
  const [campaignChannel, setCampaignChannel] = useState<MarketingChannel>('web_push');
  const [targetCustomer, setTargetCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState(false);

  // Automations State
  const [automations, setAutomations] = useState<AutomationRule[]>(() => {
    try {
      const saved = localStorage.getItem(AUTOMATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback to defaults
    }
    return DEFAULT_AUTOMATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUTOMATIONS_STORAGE_KEY, JSON.stringify(automations));
    } catch {
      // ignore storage quota errors
    }
  }, [automations]);

  const [marketingNowMs] = useState(() => Date.now());
  const storeOrigin = useMemo(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://pizzakhalessi.com';
  }, []);

  const loadBackendData = useCallback(async () => {
    setLoadingBackend(true);
    try {
      const [stats, list] = await Promise.all([
        fetchMarketingPushStats(),
        fetchMarketingCampaigns(),
      ]);
      setPushStats(stats);
      setCampaigns(list);
    } finally {
      setLoadingBackend(false);
    }
  }, []);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // Compute Customer Intelligence (VIP, Low Recurrence, Favorite Pizza + Product Link)
  const customerInsights = useMemo<CustomerMarketingInsight[]>(() => {
    const productById = new Map(products.map(p => [p.id, p]));
    const subByPhone = new Map<string, { platform: MarketingPlatform }>();
    const subById = new Map<string, { platform: MarketingPlatform }>();

    for (const sub of pushStats?.subscribers || []) {
      const normPhone = normalizePhoneForMatch(sub.customerPhone);
      if (normPhone) subByPhone.set(normPhone, { platform: sub.platform });
      if (sub.customerId) subById.set(sub.customerId, { platform: sub.platform });
    }

    const scopedOrders = orders.filter(o => {
      if (o.status === 'cancelado') return false;
      if (activeTenant.id !== 'consolidated' && o.tenantId !== activeTenant.id) return false;
      return true;
    });

    interface Acc {
      id: string;
      name: string;
      phone: string;
      email: string;
      updatedAtMs: number;
      totalOrders: number;
      totalSpent: number;
      lastOrderAt: string;
      productCounts: Map<string, { name: string; count: number; image?: string }>;
    }

    const map = new Map<string, Acc>();
    const idByPhone = new Map<string, string>();
    const idByEmail = new Map<string, string>();

    const registerLookup = (id: string, phone: string, email: string) => {
      const normP = normalizePhoneForMatch(phone);
      if (normP) idByPhone.set(normP, id);
      const normE = (email || '').trim().toLowerCase();
      if (normE) idByEmail.set(normE, id);
    };

    // 1. Seed with ERP CRM customers
    for (const c of customers) {
      const updatedAtMs = new Date(c.updatedAt || c.createdAt || 0).getTime();
      map.set(c.id, {
        id: c.id,
        name: c.fullName,
        phone: c.whatsapp,
        email: c.email || '',
        updatedAtMs,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderAt: c.createdAt,
        productCounts: new Map(),
      });
      registerLookup(c.id, c.whatsapp, c.email);
    }

    // 2. Overlay latest Storefront Customer Accounts (always prefer newest updatedAt)
    for (const acc of allCustomerAccounts) {
      const accUpdatedMs = new Date(acc.updatedAt || acc.createdAt || 0).getTime();
      const normP = normalizePhoneForMatch(acc.phone);
      const normE = (acc.email || '').trim().toLowerCase();
      const matchedId =
        (acc.crmCustomerId && map.has(acc.crmCustomerId) ? acc.crmCustomerId : undefined) ||
        (normE ? idByEmail.get(normE) : undefined) ||
        (normP ? idByPhone.get(normP) : undefined) ||
        acc.crmCustomerId ||
        acc.id;

      const existing = map.get(matchedId);
      if (existing) {
        if (accUpdatedMs >= existing.updatedAtMs) {
          existing.name = acc.fullName || existing.name;
          existing.phone = acc.phone || existing.phone;
          existing.email = acc.email || existing.email;
          existing.updatedAtMs = accUpdatedMs;
        }
        registerLookup(existing.id, existing.phone, existing.email);
      } else {
        map.set(matchedId, {
          id: matchedId,
          name: acc.fullName,
          phone: acc.phone,
          email: acc.email || '',
          updatedAtMs: accUpdatedMs,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderAt: acc.createdAt,
          productCounts: new Map(),
        });
        registerLookup(matchedId, acc.phone, acc.email);
      }
    }

    // 3. Aggregate orders using customerId -> email -> phone so old order phones never overwrite current contact
    for (const order of scopedOrders) {
      const normPhone = normalizePhoneForMatch(order.customerPhone);
      const normEmail = (order.customerEmail || '').trim().toLowerCase();
      const matchedKey =
        (order.customerId && map.has(order.customerId) ? order.customerId : undefined) ||
        (normEmail ? idByEmail.get(normEmail) : undefined) ||
        (normPhone ? idByPhone.get(normPhone) : undefined) ||
        order.customerId ||
        normPhone ||
        `anon-${order.customerName}`;

      const existing = map.get(matchedKey) || {
        id: order.customerId || matchedKey,
        name: order.customerName || 'Cliente',
        phone: order.customerPhone || '',
        email: order.customerEmail || '',
        updatedAtMs: 0,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderAt: order.createdAt,
        productCounts: new Map(),
      };

      existing.totalOrders += 1;
      existing.totalSpent += order.total || 0;
      if (new Date(order.createdAt).getTime() > new Date(existing.lastOrderAt).getTime()) {
        existing.lastOrderAt = order.createdAt;
      }
      if (!existing.name && order.customerName) existing.name = order.customerName;
      if (!existing.phone && order.customerPhone) existing.phone = order.customerPhone;
      if (!existing.email && order.customerEmail) existing.email = order.customerEmail;

      for (const item of order.items || []) {
        const pid = item.productId;
        const prod = productById.get(pid);
        const cur = existing.productCounts.get(pid) || {
          name: item.productName || prod?.name || 'Pizza Khalessi',
          count: 0,
          image: item.productImage || prod?.imageUrl,
        };
        cur.count += item.quantity || 1;
        if (!cur.image && (item.productImage || prod?.imageUrl)) {
          cur.image = item.productImage || prod?.imageUrl;
        }
        existing.productCounts.set(pid, cur);
      }

      map.set(matchedKey, existing);
      registerLookup(existing.id, existing.phone, existing.email);
    }

    const nowMs = marketingNowMs;
    const list: CustomerMarketingInsight[] = [];

    for (const acc of map.values()) {
      let favId: string | undefined;
      let favName: string | undefined;
      let favImage: string | undefined;
      let favCount = 0;

      for (const [pid, info] of acc.productCounts.entries()) {
        if (info.count > favCount) {
          favId = pid;
          favName = info.name;
          favImage = info.image;
          favCount = info.count;
        }
      }

      const lastMs = new Date(acc.lastOrderAt).getTime();
      const daysSinceLastOrder = Math.max(0, Math.floor((nowMs - lastMs) / 86400000));

      let segment: CustomerMarketingInsight['segment'] = 'regular';
      if (acc.totalOrders >= 4 || acc.totalSpent >= 200) {
        segment = daysSinceLastOrder > 30 ? 'at_risk' : 'vip';
      } else if (daysSinceLastOrder >= 15 || acc.totalOrders === 0) {
        segment = 'inactive';
      } else if (daysSinceLastOrder >= 8) {
        segment = 'at_risk';
      }

      const favProduct = favId ? productById.get(favId) : undefined;
      const favoriteProductUrl = favId
        ? `${storeOrigin}/producto/${encodeURIComponent(toProductSlug(favName || favProduct?.name || '', favId))}`
        : undefined;

      const normPhone = normalizePhoneForMatch(acc.phone);
      const subMatch = subByPhone.get(normPhone) || subById.get(acc.id);

      list.push({
        id: acc.id,
        name: acc.name,
        phone: acc.phone,
        email: acc.email,
        totalOrders: acc.totalOrders,
        totalSpent: acc.totalSpent,
        lastOrderAt: acc.lastOrderAt,
        daysSinceLastOrder,
        favoriteProductId: favId,
        favoriteProductName: favName,
        favoriteProductImage: favImage,
        favoriteProductUrl,
        favoriteProductCount: favCount,
        segment,
        hasWebPush: Boolean(subMatch),
        webPushPlatform: subMatch?.platform,
      });
    }

    return list.sort((a, b) => b.totalSpent - a.totalSpent || b.totalOrders - a.totalOrders);
  }, [orders, products, customers, allCustomerAccounts, pushStats, activeTenant.id, storeOrigin, marketingNowMs]);

  const filteredInsights = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return customerInsights.filter(c => {
      if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.favoriteProductName || '').toLowerCase().includes(q)
      );
    });
  }, [customerInsights, segmentFilter, clientSearch]);

  const kpiSummary = useMemo(() => {
    let vip = 0;
    let lowRecurrence = 0;
    for (const c of customerInsights) {
      if (c.segment === 'vip') vip += 1;
      if (c.segment === 'inactive' || c.segment === 'at_risk') lowRecurrence += 1;
    }
    return {
      totalCustomers: customerInsights.length,
      vip,
      lowRecurrence,
      totalSubscribers: pushStats?.totalSubscribers || 0,
    };
  }, [customerInsights, pushStats]);

  const handleSelectProductForCampaign = (productId: string) => {
    setCampaignProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const url = `${storeOrigin}/producto/${encodeURIComponent(toProductSlug(prod.name, prod.id))}`;
    setCampaignTargetUrl(url);
    if (prod.imageUrl) {
      const absImg = prod.imageUrl.startsWith('http')
        ? prod.imageUrl
        : `${storeOrigin}${prod.imageUrl.startsWith('/') ? '' : '/'}${prod.imageUrl}`;
      setCampaignImageUrl(absImg);
    }
    if (!campaignTitle.trim()) {
      setCampaignTitle(`🍕 ¡Hoy toca ${prod.name}!`);
    }
    if (!campaignBody.trim()) {
      setCampaignBody(
        `Tu ${prod.name} recién horneada te espera en Pizza Khalessi. Toca aquí para pedirla en segundos.`
      );
    }
  };

  const handlePreparePushForCustomer = (customer: CustomerMarketingInsight) => {
    const favName = customer.favoriteProductName || 'tu pizza favorita';
    const firstName = customer.name.split(' ')[0] || 'Cliente';
    setTargetCustomer({ id: customer.id, name: customer.name, phone: customer.phone });
    setCampaignSegment('single_customer');
    setCampaignChannel('web_push');
    setScheduleMode('now');
    setCampaignTitle(`🍕 ¡Hola ${firstName}, tu ${favName} te espera!`);
    setCampaignBody(
      customer.daysSinceLastOrder >= 10
        ? `Hace ${customer.daysSinceLastOrder} días que no nos visitas. Pide tu ${favName} recién salida del horno con un toque.`
        : `¿Antojo de ${favName}? Haz tu pedido online en segundos y suma puntos en tu tarjeta Khalessi.`
    );
    if (customer.favoriteProductId) {
      setCampaignProductId(customer.favoriteProductId);
    }
    if (customer.favoriteProductUrl) {
      setCampaignTargetUrl(customer.favoriteProductUrl);
    } else {
      setCampaignTargetUrl(storeOrigin);
    }
    if (customer.favoriteProductImage) {
      const absImg = customer.favoriteProductImage.startsWith('http')
        ? customer.favoriteProductImage
        : `${storeOrigin}${customer.favoriteProductImage.startsWith('/') ? '' : '/'}${customer.favoriteProductImage}`;
      setCampaignImageUrl(absImg);
    }
    setActiveTab('campaigns');
  };

  const handleOpenWhatsApp = (customer: CustomerMarketingInsight) => {
    const waPhone = normalizePhoneForWhatsApp(customer.phone);
    if (!waPhone) {
      openNoticeModal({
        title: 'Teléfono no válido',
        message: 'Este cliente no tiene un número de celular registrado para abrir WhatsApp.',
        tone: 'warning',
        confirmLabel: 'Entendido',
      });
      return;
    }
    const firstName = customer.name.split(' ')[0] || 'hola';
    const favPizza = customer.favoriteProductName || 'nuestras pizzas artesanales';
    const link = customer.favoriteProductUrl || storeOrigin;
    const message =
      `¡Hola ${firstName}! 🍕 En Pizza Khalessi sabemos que te encanta *${favPizza}*.\n\n` +
      `Hoy puedes pedirla recién salida del horno directamente desde este enlace:\n${link}\n\n` +
      `¡Acumulas puntos en cada compra! 🔥`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSendOrScheduleCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim() || !campaignBody.trim()) {
      openNoticeModal({
        title: 'Campos obligatorios',
        message: 'Ingresa un título y el mensaje de la notificación antes de continuar.',
        tone: 'warning',
        confirmLabel: 'Completar',
      });
      return;
    }

    if (scheduleMode === 'scheduled' && !scheduledDateTime) {
      openNoticeModal({
        title: 'Fecha y hora requerida',
        message: 'Selecciona la fecha y hora exacta en que deseas programar el envío.',
        tone: 'warning',
        confirmLabel: 'Elegir fecha',
      });
      return;
    }

    const campaignId = `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const selectedProduct = products.find(p => p.id === campaignProductId);
    const resolvedTargetUrl = campaignTargetUrl.trim() || storeOrigin;

    setSendingCampaign(true);
    try {
      if (scheduleMode === 'scheduled') {
        const isoScheduled = new Date(scheduledDateTime).toISOString();
        const campaignPayload: MarketingCampaign & { issuerId?: string; classSuffix?: string } = {
          id: campaignId,
          title: campaignTitle.trim(),
          body: campaignBody.trim(),
          imageUrl: campaignImageUrl.trim() || undefined,
          targetUrl: resolvedTargetUrl,
          productId: selectedProduct?.id,
          productName: selectedProduct?.name,
          segment: campaignSegment,
          channel: campaignChannel,
          targetCustomerId: campaignSegment === 'single_customer' ? targetCustomer?.id : undefined,
          targetCustomerPhone: campaignSegment === 'single_customer' ? targetCustomer?.phone : undefined,
          targetCustomerName: campaignSegment === 'single_customer' ? targetCustomer?.name : undefined,
          scheduledAt: isoScheduled,
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          issuerId: pointsConfig.googleWallet?.issuerId,
          classSuffix: pointsConfig.googleWallet?.classSuffix,
        };

        const res = await scheduleMarketingCampaign(campaignPayload);
        if (!res.success) {
          throw new Error(res.error || 'No se pudo programar la campaña.');
        }

        dispatchToast(
          'Campaña programada',
          `Se enviará automáticamente el ${new Date(isoScheduled).toLocaleString('es-PE')} vía Cron.`,
          'success'
        );
      } else {
        // Immediate send
        let pushResultMsg = '';
        let walletResultMsg = '';

        if (campaignChannel === 'web_push' || campaignChannel === 'both') {
          const pushRes = await sendMarketingWebPush({
            id: campaignId,
            title: campaignTitle.trim(),
            body: campaignBody.trim(),
            imageUrl: campaignImageUrl.trim() || undefined,
            targetUrl: resolvedTargetUrl,
            targetCustomerId: campaignSegment === 'single_customer' ? targetCustomer?.id : undefined,
            targetCustomerPhone: campaignSegment === 'single_customer' ? targetCustomer?.phone : undefined,
          });
          if (!pushRes.success) {
            throw new Error(pushRes.error || 'Error enviando notificación Web Push.');
          }
          pushResultMsg = `Web Push: ${pushRes.sent ?? 0} enviado(s)`;
        }

        if (campaignChannel === 'google_wallet' || campaignChannel === 'both') {
          const gw = pointsConfig.googleWallet;
          if (!gw?.enabled || !gw.issuerId) {
            walletResultMsg = 'Google Wallet no configurado (omitido)';
          } else {
            const gwRes = await sendGoogleWalletPromo({
              issuerId: gw.issuerId,
              classSuffix: gw.classSuffix || 'khalessi_loyalty_v1',
              header: campaignTitle.trim(),
              body: campaignBody.trim(),
              promoUrl: resolvedTargetUrl,
              messageType: 'TEXT_AND_NOTIFY',
              targetCustomerId: campaignSegment === 'single_customer' ? targetCustomer?.id : undefined,
            });
            walletResultMsg = gwRes.success
              ? 'Google Wallet: notificación enviada'
              : `Google Wallet error: ${gwRes.error}`;
          }
        }

        dispatchToast(
          'Campaña enviada',
          [pushResultMsg, walletResultMsg].filter(Boolean).join(' · '),
          'success'
        );
      }

      await loadBackendData();
      setCampaignTitle('');
      setCampaignBody('');
      setScheduledDateTime('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error procesando la campaña.';
      openNoticeModal({
        title: 'No se pudo completar el envío',
        message: msg,
        tone: 'danger',
        confirmLabel: 'Cerrar',
      });
    } finally {
      setSendingCampaign(false);
    }
  };

  const handleCancelOrDeleteCampaign = (action: 'cancel' | 'delete', camp: MarketingCampaign) => {
    openNoticeModal({
      title: action === 'cancel' ? 'Cancelar campaña programada' : 'Eliminar registro de campaña',
      message:
        action === 'cancel'
          ? `¿Deseas cancelar el envío programado de "${camp.title}"?`
          : `¿Deseas eliminar "${camp.title}" del historial de marketing?`,
      tone: 'warning',
      confirmLabel: action === 'cancel' ? 'Sí, cancelar' : 'Sí, eliminar',
      cancelLabel: 'Volver',
      onConfirm: async () => {
        const updated = await updateMarketingCampaignStatus(action, camp.id);
        setCampaigns(updated);
        dispatchToast(
          action === 'cancel' ? 'Campaña cancelada' : 'Registro eliminado',
          camp.title,
          'info'
        );
      },
    });
  };

  const handleRunCronNow = async () => {
    setLoadingBackend(true);
    try {
      const res = await runScheduledMarketingCampaignsNow();
      await loadBackendData();
      if (res.success) {
        dispatchToast(
          'Cola Cron ejecutada',
          `Campañas procesadas: ${res.processed ?? 0} · Envíos realizados: ${res.sent ?? 0}`,
          'success'
        );
      } else {
        dispatchToast('Sin cambios en la cola', 'No se pudo ejecutar el runner de Cron.', 'warning');
      }
    } finally {
      setLoadingBackend(false);
    }
  };

  const cronEndpointUrl = useMemo(() => {
    const key = pushStats?.cronKey || 'TU_CRON_KEY_AQUI';
    return `${storeOrigin}/api/marketing-push.php?action=run-scheduled&cron_key=${key}`;
  }, [storeOrigin, pushStats?.cronKey]);

  const cpanelCronCommand = useMemo(
    () => `curl -s "${cronEndpointUrl}" > /dev/null 2>&1`,
    [cronEndpointUrl]
  );

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      dispatchToast('Copiado al portapapeles', label, 'success');
    } catch {
      openNoticeModal({
        title: label,
        message: text,
        tone: 'info',
        confirmLabel: 'Cerrar',
      });
    }
  };

  const toggleAutomation = (id: string) => {
    setAutomations(prev =>
      prev.map(rule => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule))
    );
    dispatchToast('Regla actualizada', 'El estado de la automatización fue guardado.', 'success');
  };

  return (
    <div className="w-full space-y-4 pb-10">
      {/* Header */}
      <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white tracking-tight truncate">
            <span className="sm:hidden">Marketing</span>
            <span className="hidden sm:inline">Marketing &amp; Web Push Inteligente</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={loadBackendData}
          disabled={loadingBackend}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingBackend ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sincronizar Suscriptores</span>
          <span className="sm:hidden">Sincronizar</span>
        </button>
      </div>

      {/* Mobile KPI Summary Toggle */}
      <button
        type="button"
        onClick={() => setShowKpis((v) => !v)}
        className="w-full md:hidden px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center justify-between gap-2"
      >
        <span className="tabular-nums truncate">
          {kpiSummary.totalSubscribers} suscriptores · {kpiSummary.vip} VIP · {campaigns.filter(c => c.status === 'scheduled').length} programadas
        </span>
        {showKpis ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
      </button>

      {/* KPI Strip */}
      <div className={`${showKpis ? 'grid' : 'hidden md:grid'} grid-cols-2 lg:grid-cols-4 gap-3`}>
        <div className="saas-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Suscriptores Web Push</span>
            <Bell className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {kpiSummary.totalSubscribers}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Android: {pushStats?.byPlatform?.android || 0}</span>
            <span>·</span>
            <span>iOS: {pushStats?.byPlatform?.ios || 0}</span>
            <span>·</span>
            <span>Win: {pushStats?.byPlatform?.windows || 0}</span>
          </div>
        </div>

        <div className="saas-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Clientes VIP (Frecuentes)</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {kpiSummary.vip}
          </div>
          <div className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            4+ pedidos o S/ 200+ acumulados
          </div>
        </div>

        <div className="saas-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Poca Recurrencia / Riesgo</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {kpiSummary.lowRecurrence}
          </div>
          <div className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            8+ días sin pedir (listos para recuperar)
          </div>
        </div>

        <div className="saas-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Campañas Programadas</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {campaigns.filter(c => c.status === 'scheduled').length}
          </div>
          <div className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            Total historial: {campaigns.length} campañas
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {[
          { id: 'clients', label: 'Clientes & Pizza Favorita', icon: Users },
          { id: 'campaigns', label: 'Campañas Web Push & Wallet', icon: Megaphone },
          { id: 'automations', label: 'Automatizaciones', icon: Sparkles },
          { id: 'cron', label: 'Cron cPanel (PC Apagada)', icon: Server },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as MarketingTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CLIENTS & FAVORITE PIZZA */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: `Todos (${customerInsights.length})` },
                { id: 'vip', label: 'VIP' },
                { id: 'regular', label: 'Regulares' },
                { id: 'at_risk', label: 'En Riesgo' },
                { id: 'inactive', label: 'Poca Recurrencia' },
              ].map(seg => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setSegmentFilter(seg.id as typeof segmentFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    segmentFilter === seg.id
                      ? 'text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  style={segmentFilter === seg.id ? { backgroundColor: customization.primaryColor || '#db0021' } : undefined}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Buscar cliente, teléfono o pizza..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <div className="saas-card rounded-2xl overflow-hidden">
            <div className="erp-table-wrapper overflow-x-auto">
              <table className="erp-stack-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/70 dark:bg-zinc-900/60">
                    <th className="py-3 px-4 font-semibold">Cliente</th>
                    <th className="py-3 px-4 font-semibold">Segmento</th>
                    <th className="py-3 px-4 font-semibold">Compras / Recurrencia</th>
                    <th className="py-3 px-4 font-semibold">Pizza Favorita &amp; Enlace</th>
                    <th className="py-3 px-4 font-semibold">Canal Push</th>
                    <th className="py-3 px-4 font-semibold text-right">Acciones Directas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                  {filteredInsights.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-500 dark:text-zinc-400">
                        No se encontraron clientes con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredInsights.slice(0, 60).map(c => (
                      <tr
                        key={c.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <th scope="row" className="py-3 px-4 text-left font-normal">
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {c.phone || 'Sin teléfono'}
                          </div>
                        </th>
                        <td data-label="Segmento" className="py-3 px-4">
                          {c.segment === 'vip' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              <Crown className="w-3 h-3" /> VIP
                            </span>
                          )}
                          {c.segment === 'regular' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              Regular
                            </span>
                          )}
                          {c.segment === 'at_risk' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/15 text-orange-700 dark:text-orange-300">
                              En Riesgo
                            </span>
                          )}
                          {c.segment === 'inactive' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300">
                              Poca Recurrencia
                            </span>
                          )}
                        </td>
                        <td data-label="Recurrencia" className="py-3 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-white tabular-nums">
                            {c.totalOrders} pedidos · S/ {c.totalSpent.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {c.totalOrders > 0
                              ? `Último hace ${c.daysSinceLastOrder} día(s)`
                              : 'Sin pedidos registrados'}
                          </div>
                        </td>
                        <td data-label="Favorita" className="py-3 px-4">
                          {(() => {
                            const botPrefs = findBotPreferencesForCustomer([c.phone, c.email]);
                            return (
                              <div className="space-y-1.5">
                                {c.favoriteProductName ? (
                                  <div className="flex items-center gap-2.5">
                                    {c.favoriteProductImage ? (
                                      <img
                                        src={c.favoriteProductImage}
                                        alt={c.favoriteProductName}
                                        className="w-9 h-9 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                                        <Pizza className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-semibold text-zinc-900 dark:text-white truncate max-w-[180px]">
                                        {c.favoriteProductName}
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                        <span>{c.favoriteProductCount}x pedida</span>
                                        {c.favoriteProductUrl && (
                                          <a
                                            href={c.favoriteProductUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 hover:underline font-medium"
                                          >
                                            Ver producto <ExternalLink className="w-2.5 h-2.5" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 text-[11px]">Sin historial aún</span>
                                )}
                                {botPrefs && botPrefs.favoriteFlavors.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[10px] text-zinc-400">Bot:</span>
                                    {botPrefs.favoriteFlavors.slice(0, 3).map(fl => (
                                      <span
                                        key={fl}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 capitalize"
                                      >
                                        {fl}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td data-label="Canal Push" className="py-3 px-4">
                          {c.hasWebPush ? (
                            getPlatformBadge(c.webPushPlatform)
                          ) : (
                            <span className="text-[11px] text-zinc-400">Sin suscripción Push</span>
                          )}
                        </td>
                        <td data-label="Acciones" className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePreparePushForCustomer(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-semibold hover:opacity-90 transition-opacity"
                              title="Preparar Web Push personalizado con su pizza favorita"
                            >
                              <Bell className="w-3 h-3" />
                              Push
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors"
                              title="Invitar por WhatsApp con enlace directo de su pizza favorita"
                            >
                              <MessageCircle className="w-3 h-3" />
                              WhatsApp
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS COMPOSER & HISTORY */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Composer */}
          <form onSubmit={handleSendOrScheduleCampaign} className="lg:col-span-7 saas-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-500" />
                Crear Campaña de Notificación
              </h2>
              {targetCustomer && campaignSegment === 'single_customer' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                  Para: {targetCustomer.name}
                  <button
                    type="button"
                    onClick={() => {
                      setTargetCustomer(null);
                      setCampaignSegment('all');
                    }}
                    className="hover:text-rose-500"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Canal de Envío
                </label>
                <select
                  value={campaignChannel}
                  onChange={e => setCampaignChannel(e.target.value as MarketingChannel)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
                >
                  <option value="web_push">Web Push (Android / Apple iOS / Windows)</option>
                  <option value="google_wallet">Google Wallet (Tarjeta de Puntos)</option>
                  <option value="both">Ambos (Web Push + Google Wallet)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Segmento de Audiencia
                </label>
                <select
                  value={campaignSegment}
                  onChange={e => setCampaignSegment(e.target.value as MarketingSegment)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
                >
                  <option value="all">Todos los suscriptores</option>
                  <option value="vip">Solo Clientes VIP (Más compras)</option>
                  <option value="inactive">Poca Recurrencia / Inactivos</option>
                  {targetCustomer && (
                    <option value="single_customer">Cliente: {targetCustomer.name}</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Vincular Pizza / Producto de la Tienda (opcional)
              </label>
              <select
                value={campaignProductId}
                onChange={e => handleSelectProductForCampaign(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
              >
                <option value="">-- Seleccionar producto para autocompletar enlace e imagen --</option>
                {products
                  .filter(p => p.isAvailable !== false)
                  .map(p => {
                    const displayPrice =
                      p.hasSizes && p.sizes.length > 0
                        ? Math.min(...p.sizes.filter(s => s.enabled).map(s => s.price))
                        : p.basePrice;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} — S/ {(Number.isFinite(displayPrice) ? displayPrice : p.basePrice).toFixed(2)}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Título de la Notificación *
              </label>
              <input
                type="text"
                value={campaignTitle}
                onChange={e => setCampaignTitle(e.target.value)}
                placeholder="Ej: 🍕 ¡Hoy 2x1 en Pizzas Familiares!"
                maxLength={100}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Mensaje Real que verá el Cliente *
              </label>
              <textarea
                rows={3}
                value={campaignBody}
                onChange={e => setCampaignBody(e.target.value)}
                placeholder="Escribe un mensaje atractivo para que el cliente haga clic y ordene..."
                maxLength={300}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Enlace al hacer Clic (Tienda / Producto)
                </label>
                <input
                  type="url"
                  value={campaignTargetUrl}
                  onChange={e => setCampaignTargetUrl(e.target.value)}
                  placeholder={`${storeOrigin}/producto/...`}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Imagen Banner (HTTPS opcional)
                </label>
                <input
                  type="url"
                  value={campaignImageUrl}
                  onChange={e => setCampaignImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleMode"
                    checked={scheduleMode === 'now'}
                    onChange={() => setScheduleMode('now')}
                  />
                  Enviar Inmediatamente
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleMode"
                    checked={scheduleMode === 'scheduled'}
                    onChange={() => setScheduleMode('scheduled')}
                  />
                  Programar Fecha y Hora Exacta (Cron cPanel)
                </label>
              </div>

              {scheduleMode === 'scheduled' && (
                <div>
                  <label className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                    Fecha y hora de envío automático (funciona incluso con la PC apagada vía Cron)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={e => setScheduledDateTime(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={sendingCampaign}
              className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: customization.primaryColor || '#db0021' }}
            >
              {scheduleMode === 'scheduled' ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sendingCampaign
                ? 'Procesando envío...'
                : scheduleMode === 'scheduled'
                ? 'Programar Campaña Automática'
                : 'Enviar Notificación Ahora'}
            </button>
          </form>

          {/* Right Column: Live Preview & History */}
          <div className="lg:col-span-5 space-y-5">
            {/* Live Preview */}
            <div className="saas-card p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Vista Previa Real en Celular
                </h3>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  {campaignChannel === 'google_wallet' ? (
                    <>
                      <Wallet className="w-3.5 h-3.5" /> Google Wallet
                    </>
                  ) : (
                    <>
                      <Globe2 className="w-3.5 h-3.5" /> Android / iOS / Win
                    </>
                  )}
                </span>
              </div>

              <div className="rounded-2xl bg-zinc-900 text-white p-4 shadow-lg border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-rose-600 flex items-center justify-center text-[9px] font-bold text-white">
                      K
                    </span>
                    <span className="font-semibold text-zinc-200">Pizza Khalessi</span>
                    <span>· ahora</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold leading-snug">
                    {campaignTitle || '🍕 ¡Hoy 2x1 en Pizzas Familiares!'}
                  </div>
                  <div className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {campaignBody ||
                      'Tu pizza artesanal favorita te espera recién salida del horno. Toca para ordenar.'}
                  </div>
                </div>
                {campaignImageUrl && (
                  <img
                    src={campaignImageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-xl border border-zinc-700"
                  />
                )}
                {campaignTargetUrl && (
                  <div className="text-[10px] text-amber-400 truncate">
                    Enlace: {campaignTargetUrl}
                  </div>
                )}
              </div>
            </div>

            {/* Campaign History */}
            <div className="saas-card p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Historial &amp; Cola Programada ({campaigns.length})
              </h3>
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {campaigns.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4 text-center">
                    Aún no hay campañas registradas.
                  </p>
                ) : (
                  campaigns.map(camp => (
                    <div
                      key={camp.id}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-bold text-zinc-900 dark:text-white leading-snug">
                          {camp.title}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            camp.status === 'sent'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : camp.status === 'scheduled'
                              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                              : camp.status === 'cancelled'
                              ? 'bg-zinc-500/15 text-zinc-500'
                              : 'bg-rose-500/15 text-rose-600'
                          }`}
                        >
                          {camp.status === 'sent'
                            ? `Enviado (${camp.sentCount ?? 0})`
                            : camp.status === 'scheduled'
                            ? 'Programado'
                            : camp.status === 'cancelled'
                            ? 'Cancelado'
                            : 'Fallido'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {camp.body}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                        <span>
                          {camp.status === 'scheduled'
                            ? `Para: ${new Date(camp.scheduledAt).toLocaleString('es-PE')}`
                            : new Date(camp.sentAt || camp.createdAt).toLocaleString('es-PE')}
                        </span>
                        <div className="flex items-center gap-2">
                          {camp.status === 'scheduled' && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrDeleteCampaign('cancel', camp)}
                              className="text-amber-600 hover:underline font-semibold"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCancelOrDeleteCampaign('delete', camp)}
                            className="text-rose-500 hover:text-rose-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATIONS */}
      {activeTab === 'automations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automations.map(rule => (
            <div key={rule.id} className="saas-card p-5 rounded-2xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 mb-1.5">
                      Disparador: {rule.triggerLabel}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {rule.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAutomation(rule.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
                      rule.enabled
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {rule.enabled ? 'Activo' : 'Pausado'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{rule.description}</p>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                  <div className="font-semibold text-zinc-900 dark:text-white">{rule.titleTemplate}</div>
                  <div className="text-zinc-600 dark:text-zinc-400">{rule.bodyTemplate}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Canal: {rule.channel === 'both' ? 'Web Push + Google Wallet' : 'Web Push'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCampaignTitle(rule.titleTemplate);
                    setCampaignBody(rule.bodyTemplate);
                    setCampaignChannel(rule.channel);
                    setActiveTab('campaigns');
                  }}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Probar en Campaña →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: CPANEL CRON SETUP */}
      {activeTab === 'cron' && (
        <div className="saas-card p-6 rounded-2xl space-y-5 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                Envíos Programados con la PC Apagada (Cron Job en cPanel)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Configura esta tarea una sola vez en cPanel → <strong>Trabajos de Cron (Cron Jobs)</strong> para que el servidor envíe tus campañas programadas aunque todas las computadoras estén apagadas.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunCronNow}
              disabled={loadingBackend}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shrink-0 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              Ejecutar Cola Ahora
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  1. Frecuencia recomendada en cPanel
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                  * * * * * (Cada minuto) o */5 * * * *
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                En cPanel selecciona <strong>Una vez por minuto (* * * * *)</strong> o cada 5 minutos para puntualidad exacta.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  2. Comando exacto para pegar en cPanel
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(cpanelCronCommand, 'Comando Cron copiado')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-semibold"
                >
                  <Copy className="w-3 h-3" /> Copiar Comando
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto">
                {cpanelCronCommand}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  3. Endpoint directo (para pruebas en navegador)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(cronEndpointUrl, 'URL de Cron copiada')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                >
                  <Copy className="w-3 h-3" /> Copiar URL
                </button>
              </div>
              <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-all">
                {cronEndpointUrl}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Compatibilidad Apple iOS / Android / Windows:</strong> En Android y Windows/macOS las notificaciones Web Push funcionan directo desde el navegador. En <strong>iPhone/iPad (iOS 16.4+)</strong>, el cliente solo debe tocar <em>Compartir → Agregar a pantalla de inicio</em> en Safari (nuestro banner de la tienda ya lo guía paso a paso).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
