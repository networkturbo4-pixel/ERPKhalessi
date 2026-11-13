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

export type LoyaltyCardStyle = 'modern_dark' | 'glass_light' | 'gold_vip' | 'gradient_brand' | 'classic_paper';
export type LoyaltyStampStyle = 'pills' | 'circles' | 'squares' | 'minimal_dots' | 'tickets';

export interface PointsProgramConfig {
  enabled: boolean;
  status: 'active' | 'paused';
  cardTitle: string;
  cardSubtitle: string;
  cardIcon: string; // 'crown', 'pizza', 'flame', 'gift', 'award', 'star'
  customIconUrl?: string; // URL o DataURL para ícono personalizado subido por el usuario
  iconSize?: number; // Tamaño del ícono en px (14 - 40)
  cardStyle?: LoyaltyCardStyle; // Estilo visual de la tarjeta
  stampStyle?: LoyaltyStampStyle; // Estilo visual de los sellos / puntos
  cardBgImage?: string;
  cardBgColor?: string;
  cardAccentColor?: string;
  cardTextColor?: string;
  cardTitleColor?: string;
  cardSubtitleColor?: string;
  cardBadgeBgColor?: string;
  cardBadgeTextColor?: string;
  cardCounterColor?: string;
  cardBgOverlayOpacity?: number; // Opacidad del velo sobre la imagen (0 - 90)
  recommendedDimensionsNote?: string; // "1000 x 600 px (proporción 5:3 / tarjeta estándar)"
  awardPointPerOrder: boolean; // +N puntos al realizar una nueva orden
  awardPointOnRegister: boolean; // +N puntos al registrarse por primera vez
  welcomePointsAmount?: number; // Cantidad de puntos de bienvenida al registrarse
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

// Configuración de Juegos Interactivos (Ruleta & Rompecabezas)
export type GameType = 'ruleta' | 'rompecabezas';
export type GameFrequency = 'daily' | 'weekly' | 'monthly' | 'on_register_only' | 'unlimited';
export type GameWinAnimation = 'confetti' | 'fireworks' | 'pulse' | 'glow';
export type GameLoseAnimation = 'shake' | 'fade' | 'sad_emoji';

export interface GamePrizeItem {
  id: string;
  label: string;
  rewardType: 'discount_fixed' | 'discount_percent' | 'free_product' | 'points' | 'no_prize';
  discountValue?: number;
  freeProductName?: string;
  pointsValue?: number;
  color: string;
  weight: number; // Probabilidad de ganar (ej. 1 = muy difícil, 10 = fácil)
  isWinning: boolean;
}

export interface GameSettingsConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  gameType: GameType;
  frequency: GameFrequency;
  maxAttempts: number;
  brandLogoUrl?: string;
  themeColor: string;
  difficultyLevel: 'facil' | 'medio' | 'dificil' | 'experto';
  winAnimation: GameWinAnimation;
  loseAnimation: GameLoseAnimation;
  prizes: GamePrizeItem[];
}
