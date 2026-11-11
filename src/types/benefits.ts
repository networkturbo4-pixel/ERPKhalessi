export type CouponDiscountType = 'percentage' | 'fixed';

export interface PromoCoupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface PointsProgramConfig {
  enabled: boolean;
  cardTitle: string;
  cardSubtitle: string;
  pointsPerPurchase: number;
  minPurchaseAmountForPoint: number;
  stampsPerCardGoal: number;
}

export type RewardBenefitType = 'free_product' | 'fixed_discount' | 'percentage_discount';

export interface PointReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  benefitType: RewardBenefitType;
  discountValue: number; // S/ value if fixed_discount / free_product, or % if percentage_discount
  linkedProductId?: string;
  badgeIcon: string;
  isActive: boolean;
  redeemedCount: number;
}

export interface RewardRedemptionRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  orderNumber: string;
  redeemedAt: string;
}
