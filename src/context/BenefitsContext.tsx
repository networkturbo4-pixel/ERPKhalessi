import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  PromoCoupon,
  PointsProgramConfig,
  PointReward,
  RewardRedemptionRecord,
  GameSettingsConfig,
} from '../types/benefits';

const BENEFITS_STORAGE_KEY = 'kh_erp_benefits_v1';

const DEFAULT_COUPONS: PromoCoupon[] = [
  {
    id: 'cpn-khalessi15',
    code: 'KHALESSI15',
    title: '15% Dscto. Pedido Web',
    description: '15% de descuento en pedidos desde S/ 40.00 en la Tienda Virtual.',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 40,
    maxDiscountAmount: 30,
    usedCount: 14,
    isActive: true,
    createdAt: '2025-01-10T12:00:00.000Z',
  },
  {
    id: 'cpn-pizza10',
    code: 'PIZZA10',
    title: 'S/ 10.00 Dscto. Familiar',
    description: 'Descuento directo de S/ 10.00 por compras mayores a S/ 55.00.',
    discountType: 'fixed',
    discountValue: 10,
    minOrderAmount: 55,
    usedCount: 9,
    isActive: true,
    createdAt: '2025-01-15T12:00:00.000Z',
  },
  {
    id: 'cpn-bienvenido',
    code: 'BIENVENIDO',
    title: '10% Primera Compra Online',
    description: '10% de descuento desde S/ 30.00 para clientes de la web.',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 30,
    maxDiscountAmount: 20,
    usedCount: 23,
    isActive: true,
    createdAt: '2025-01-20T12:00:00.000Z',
  },
];

const DEFAULT_POINTS_CONFIG: PointsProgramConfig = {
  enabled: true,
  status: 'active',
  cardTitle: 'Tarjeta de Puntos Khalessi',
  cardSubtitle: 'Acumula 1 punto por cada compra online y canjea pizzas o complementos gratis.',
  cardIcon: 'crown',
  cardBgColor: '#18181b',
  recommendedDimensionsNote: '1000 x 600 px (proporción 5:3 / tarjeta estándar)',
  awardPointPerOrder: true,
  awardPointOnRegister: true,
  pointsPerPurchase: 1,
  minPurchaseAmountForPoint: 20,
  stampsPerCardGoal: 8,
};

const DEFAULT_GAME_SETTINGS: GameSettingsConfig = {
  enabled: true,
  title: 'Ruleta Khalessi de la Suerte',
  subtitle: '¡Gira y gana descuentos directos, bebidas o pizzas familiares gratis!',
  gameType: 'ruleta',
  frequency: 'daily',
  maxAttempts: 1,
  themeColor: '#f59e0b',
  difficultyLevel: 'medio',
  winAnimation: 'confetti',
  loseAnimation: 'shake',
  prizes: [
    {
      id: 'prz-1',
      label: '10% Descuento',
      rewardType: 'discount_percent',
      discountValue: 10,
      color: '#f59e0b',
      weight: 8,
      isWinning: true,
    },
    {
      id: 'prz-2',
      label: 'S/ 5.00 Cupón',
      rewardType: 'discount_fixed',
      discountValue: 5,
      color: '#10b981',
      weight: 6,
      isWinning: true,
    },
    {
      id: 'prz-3',
      label: 'Gaseosa 1.5L Gratis',
      rewardType: 'free_product',
      freeProductName: 'Gaseosa 1.5L',
      discountValue: 10.5,
      color: '#3b82f6',
      weight: 4,
      isWinning: true,
    },
    {
      id: 'prz-4',
      label: 'Sigue Intentando',
      rewardType: 'no_prize',
      color: '#6b7280',
      weight: 10,
      isWinning: false,
    },
    {
      id: 'prz-5',
      label: '1 Pizza Personal Gratis',
      rewardType: 'free_product',
      freeProductName: 'Pizza Personal',
      discountValue: 24.9,
      color: '#ec4899',
      weight: 2,
      isWinning: true,
    },
    {
      id: 'prz-6',
      label: '+2 Puntos Extra',
      rewardType: 'points',
      pointsValue: 2,
      color: '#8b5cf6',
      weight: 5,
      isWinning: true,
    },
  ],
};

const DEFAULT_REWARDS: PointReward[] = [
  {
    id: 'rew-pan-bebida',
    title: 'Bebida 1.5L o Pan al Ajo Gratis',
    description: 'Descuento equivalente a S/ 10.50 para cubrir tu bebida familiar o entrada.',
    pointsCost: 3,
    benefitType: 'free_product',
    discountValue: 10.5,
    badgeIcon: '🥤',
    isActive: true,
    redeemedCount: 18,
  },
  {
    id: 'rew-pizza-personal',
    title: 'Pizza Personal Artesanal Gratis',
    description: 'Canjea 5 puntos por S/ 24.90 de descuento equivalente a 1 Pizza Personal.',
    pointsCost: 5,
    benefitType: 'free_product',
    discountValue: 24.9,
    badgeIcon: '🍕',
    isActive: true,
    redeemedCount: 11,
  },
  {
    id: 'rew-pizza-familiar',
    title: 'Pizza Familiar Clásica Gratis',
    description: 'Completa tus 8 puntos y obtén S/ 49.90 de descuento en tu pedido.',
    pointsCost: 8,
    benefitType: 'free_product',
    discountValue: 49.9,
    badgeIcon: '👑',
    isActive: true,
    redeemedCount: 6,
  },
];

interface PersistedBenefitsState {
  coupons: PromoCoupon[];
  pointsConfig: PointsProgramConfig;
  rewards: PointReward[];
  redemptionHistory: RewardRedemptionRecord[];
  gameSettings: GameSettingsConfig;
}

function loadBenefitsState(): PersistedBenefitsState {
  if (typeof window === 'undefined') {
    return {
      coupons: DEFAULT_COUPONS,
      pointsConfig: DEFAULT_POINTS_CONFIG,
      rewards: DEFAULT_REWARDS,
      redemptionHistory: [],
      gameSettings: DEFAULT_GAME_SETTINGS,
    };
  }
  try {
    const raw = localStorage.getItem(BENEFITS_STORAGE_KEY);
    if (!raw) {
      return {
        coupons: DEFAULT_COUPONS,
        pointsConfig: DEFAULT_POINTS_CONFIG,
        rewards: DEFAULT_REWARDS,
        redemptionHistory: [],
        gameSettings: DEFAULT_GAME_SETTINGS,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : DEFAULT_COUPONS,
      pointsConfig: { ...DEFAULT_POINTS_CONFIG, ...(parsed.pointsConfig || {}) },
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : DEFAULT_REWARDS,
      redemptionHistory: Array.isArray(parsed.redemptionHistory) ? parsed.redemptionHistory : [],
      gameSettings: { ...DEFAULT_GAME_SETTINGS, ...(parsed.gameSettings || {}) },
    };
  } catch {
    return {
      coupons: DEFAULT_COUPONS,
      pointsConfig: DEFAULT_POINTS_CONFIG,
      rewards: DEFAULT_REWARDS,
      redemptionHistory: [],
      gameSettings: DEFAULT_GAME_SETTINGS,
    };
  }
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: PromoCoupon;
  discountAmount: number;
  error?: string;
}

interface BenefitsContextType {
  coupons: PromoCoupon[];
  pointsConfig: PointsProgramConfig;
  rewards: PointReward[];
  redemptionHistory: RewardRedemptionRecord[];
  gameSettings: GameSettingsConfig;
  saveCoupon: (coupon: Omit<PromoCoupon, 'id' | 'createdAt' | 'usedCount'> & { id?: string }) => void;
  toggleCouponActive: (couponId: string) => void;
  deleteCoupon: (couponId: string) => void;
  validateCoupon: (rawCode: string, cartSubtotal: number) => CouponValidationResult;
  registerCouponUsage: (code: string) => void;
  updatePointsConfig: (patch: Partial<PointsProgramConfig>) => void;
  updateGameSettings: (patch: Partial<GameSettingsConfig>) => void;
  saveReward: (reward: Omit<PointReward, 'id' | 'redeemedCount'> & { id?: string }) => void;
  toggleRewardActive: (rewardId: string) => void;
  deleteReward: (rewardId: string) => void;
  calculateRewardDiscount: (reward: PointReward, cartSubtotal: number) => number;
  registerRewardRedemption: (payload: Omit<RewardRedemptionRecord, 'id' | 'redeemedAt'>) => void;
  redeemReward: (rewardId: string, customerName: string, customerPhone: string, orderNumber: string) => void;
}

const BenefitsContext = createContext<BenefitsContextType | undefined>(undefined);

export const BenefitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedBenefitsState>(loadBenefitsState);

  useEffect(() => {
    try {
      localStorage.setItem(BENEFITS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BENEFITS_STORAGE_KEY) {
        setState(loadBenefitsState());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const saveCoupon = useCallback(
    (couponInput: Omit<PromoCoupon, 'id' | 'createdAt' | 'usedCount'> & { id?: string }) => {
      const cleanCode = couponInput.code.trim().toUpperCase().replace(/\s+/g, '');
      setState(prev => {
        if (couponInput.id) {
          return {
            ...prev,
            coupons: prev.coupons.map(c =>
              c.id === couponInput.id
                ? {
                    ...c,
                    ...couponInput,
                    code: cleanCode,
                  }
                : c
            ),
          };
        }
        const created: PromoCoupon = {
          ...couponInput,
          id: `cpn-${Date.now()}`,
          code: cleanCode,
          usedCount: 0,
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          coupons: [created, ...prev.coupons],
        };
      });
    },
    []
  );

  const toggleCouponActive = useCallback((couponId: string) => {
    setState(prev => ({
      ...prev,
      coupons: prev.coupons.map(c => (c.id === couponId ? { ...c, isActive: !c.isActive } : c)),
    }));
  }, []);

  const deleteCoupon = useCallback((couponId: string) => {
    setState(prev => ({
      ...prev,
      coupons: prev.coupons.filter(c => c.id !== couponId),
    }));
  }, []);

  const validateCoupon = useCallback(
    (rawCode: string, cartSubtotal: number): CouponValidationResult => {
      const code = rawCode.trim().toUpperCase();
      if (!code) {
        return { valid: false, discountAmount: 0, error: 'Ingresa un código de cupón.' };
      }
      const found = state.coupons.find(c => c.code.toUpperCase() === code);
      if (!found) {
        return { valid: false, discountAmount: 0, error: 'El cupón ingresado no existe.' };
      }
      if (!found.isActive) {
        return { valid: false, discountAmount: 0, error: 'Este cupón se encuentra inactivo.' };
      }
      if (found.usageLimit && found.usedCount >= found.usageLimit) {
        return { valid: false, discountAmount: 0, error: 'Este cupón alcanzó su límite de canjes.' };
      }
      if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
        return { valid: false, discountAmount: 0, error: 'Este cupón ha expirado.' };
      }
      if (cartSubtotal < found.minOrderAmount) {
        return {
          valid: false,
          discountAmount: 0,
          error: `Compra mínima de S/ ${found.minOrderAmount.toFixed(2)} para usar ${found.code}.`,
        };
      }

      let discount =
        found.discountType === 'percentage'
          ? (cartSubtotal * found.discountValue) / 100
          : found.discountValue;

      if (found.maxDiscountAmount && found.maxDiscountAmount > 0) {
        discount = Math.min(discount, found.maxDiscountAmount);
      }
      discount = Math.min(discount, cartSubtotal);

      return {
        valid: true,
        coupon: found,
        discountAmount: Number(discount.toFixed(2)),
      };
    },
    [state.coupons]
  );

  const registerCouponUsage = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    setState(prev => ({
      ...prev,
      coupons: prev.coupons.map(c =>
        c.code.toUpperCase() === clean ? { ...c, usedCount: c.usedCount + 1 } : c
      ),
    }));
  }, []);

  const updatePointsConfig = useCallback((patch: Partial<PointsProgramConfig>) => {
    setState(prev => ({
      ...prev,
      pointsConfig: { ...prev.pointsConfig, ...patch },
    }));
  }, []);

  const updateGameSettings = useCallback((patch: Partial<GameSettingsConfig>) => {
    setState(prev => ({
      ...prev,
      gameSettings: { ...prev.gameSettings, ...patch },
    }));
  }, []);

  const saveReward = useCallback(
    (rewardInput: Omit<PointReward, 'id' | 'redeemedCount'> & { id?: string }) => {
      setState(prev => {
        if (rewardInput.id) {
          return {
            ...prev,
            rewards: prev.rewards.map(r => (r.id === rewardInput.id ? { ...r, ...rewardInput } : r)),
          };
        }
        const created: PointReward = {
          ...rewardInput,
          id: `rew-${Date.now()}`,
          redeemedCount: 0,
        };
        return {
          ...prev,
          rewards: [...prev.rewards, created].sort((a, b) => a.pointsCost - b.pointsCost),
        };
      });
    },
    []
  );

  const toggleRewardActive = useCallback((rewardId: string) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => (r.id === rewardId ? { ...r, isActive: !r.isActive } : r)),
    }));
  }, []);

  const deleteReward = useCallback((rewardId: string) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.filter(r => r.id !== rewardId),
    }));
  }, []);

  const calculateRewardDiscount = useCallback((reward: PointReward, cartSubtotal: number): number => {
    if (cartSubtotal <= 0) return 0;
    const raw =
      reward.benefitType === 'percentage_discount'
        ? (cartSubtotal * reward.discountValue) / 100
        : reward.discountValue;
    return Number(Math.min(raw, cartSubtotal).toFixed(2));
  }, []);

  const registerRewardRedemption = useCallback(
    (payload: Omit<RewardRedemptionRecord, 'id' | 'redeemedAt'>) => {
      const record: RewardRedemptionRecord = {
        ...payload,
        id: `red-${Date.now()}`,
        redeemedAt: new Date().toISOString(),
      };
      setState(prev => ({
        ...prev,
        rewards: prev.rewards.map(r =>
          r.id === payload.rewardId ? { ...r, redeemedCount: r.redeemedCount + 1 } : r
        ),
        redemptionHistory: [record, ...prev.redemptionHistory],
      }));
    },
    []
  );

  const redeemReward = useCallback(
    (rewardId: string, customerName: string, customerPhone: string, orderNumber: string) => {
      const reward = state.rewards.find(r => r.id === rewardId);
      registerRewardRedemption({
        rewardId,
        rewardTitle: reward?.title || 'Premio Canjeado',
        customerName: customerName || 'Cliente',
        customerPhone: customerPhone || 'Sin celular',
        pointsSpent: reward?.pointsCost || 0,
        orderNumber: orderNumber || 'PED-000',
      });
    },
    [state.rewards, registerRewardRedemption]
  );

  return (
    <BenefitsContext.Provider
      value={{
        coupons: state.coupons,
        pointsConfig: state.pointsConfig,
        rewards: state.rewards,
        redemptionHistory: state.redemptionHistory,
        gameSettings: state.gameSettings,
        saveCoupon,
        toggleCouponActive,
        deleteCoupon,
        validateCoupon,
        registerCouponUsage,
        updatePointsConfig,
        updateGameSettings,
        saveReward,
        toggleRewardActive,
        deleteReward,
        calculateRewardDiscount,
        registerRewardRedemption,
        redeemReward,
      }}
    >
      {children}
    </BenefitsContext.Provider>
  );
};

export const useBenefits = () => {
  const ctx = useContext(BenefitsContext);
  if (!ctx) {
    throw new Error('useBenefits must be used within a BenefitsProvider');
  }
  return ctx;
};
