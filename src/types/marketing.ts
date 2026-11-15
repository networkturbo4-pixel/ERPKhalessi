export type MarketingPlatform = 'android' | 'ios' | 'windows' | 'macos' | 'other';

export interface WebPushSubscriptionRecord {
  id: string;
  endpoint: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  platform: MarketingPlatform;
  tenantId?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export type MarketingSegment = 'all' | 'vip' | 'inactive' | 'single_customer';
export type MarketingChannel = 'web_push' | 'google_wallet' | 'both';

export interface MarketingCampaign {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetUrl?: string;
  productId?: string;
  productName?: string;
  segment: MarketingSegment;
  channel: MarketingChannel;
  targetCustomerId?: string;
  targetCustomerPhone?: string;
  targetCustomerName?: string;
  scheduledAt: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  sentCount?: number;
  failedCount?: number;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export interface CustomerMarketingInsight {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string;
  daysSinceLastOrder: number;
  favoriteProductId?: string;
  favoriteProductName?: string;
  favoriteProductImage?: string;
  favoriteProductUrl?: string;
  favoriteProductCount: number;
  segment: 'vip' | 'regular' | 'at_risk' | 'inactive';
  hasWebPush: boolean;
  webPushPlatform?: MarketingPlatform;
}

export interface WebPushStatsResponse {
  success: boolean;
  totalSubscribers: number;
  byPlatform: Record<MarketingPlatform, number>;
  subscribers: WebPushSubscriptionRecord[];
  cronKey?: string;
}
