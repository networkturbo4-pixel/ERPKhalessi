import React, { useState } from 'react';
import {
  Gift,
  Ticket,
  Award,
  Users,
  Truck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  PauseCircle,
  Sparkles,
  Check,
  X,
  Star,
  History,
  Sliders,
} from 'lucide-react';
import { useBenefits } from '../../context/BenefitsContext';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { useSettings } from '../../context/SettingsContext';
import { PromoCoupon, PointReward, CouponDiscountType, RewardBenefitType } from '../../types/benefits';
import { DeliveryDistanceBracket } from '../../types/settings';

type BenefitsTab = 'coupons' | 'points_card' | 'customers_points' | 'delivery_tariff';

export const BenefitsModuleView: React.FC = () => {
  const {
    coupons,
    pointsConfig,
    rewards,
    redemptionHistory,
    saveCoupon,
    toggleCouponActive,
    deleteCoupon,
    updatePointsConfig,
    saveReward,
    toggleRewardActive,
    deleteReward,
  } = useBenefits();
  const { allCustomerAccounts, adjustAccountPointsById } = useStoreCustomer();
  const { companyInfo, updateCompanyInfo, dispatchToast, openNoticeModal } = useSettings();

  const [activeTab, setActiveTab] = useState<BenefitsTab>('coupons');

  // Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | undefined>(undefined);
  const [cpnCode, setCpnCode] = useState('');
  const [cpnTitle, setCpnTitle] = useState('');
  const [cpnDesc, setCpnDesc] = useState('');
  const [cpnType, setCpnType] = useState<CouponDiscountType>('percentage');
  const [cpnValue, setCpnValue] = useState(15);
  const [cpnMinOrder, setCpnMinOrder] = useState(40);
  const [cpnMaxDiscount, setCpnMaxDiscount] = useState<string>('30');
  const [cpnUsageLimit, setCpnUsageLimit] = useState<string>('');

  // Reward Modal State
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | undefined>(undefined);
  const [rewTitle, setRewTitle] = useState('');
  const [rewDesc, setRewDesc] = useState('');
  const [rewPointsCost, setRewPointsCost] = useState(5);
  const [rewType, setRewType] = useState<RewardBenefitType>('free_product');
  const [rewValue, setRewValue] = useState(24.9);
  const [rewIcon, setRewIcon] = useState('🍕');

  // Delivery Bracket New Row State
  const [newMinKm, setNewMinKm] = useState(10);
  const [newMaxKm, setNewMaxKm] = useState(14);
  const [newFeeSoles, setNewFeeSoles] = useState(15);

  const openCreateCoupon = () => {
    setEditingCouponId(undefined);
    setCpnCode('');
    setCpnTitle('');
    setCpnDesc('');
    setCpnType('percentage');
    setCpnValue(15);
    setCpnMinOrder(40);
    setCpnMaxDiscount('30');
    setCpnUsageLimit('');
    setIsCouponModalOpen(true);
  };

  const openEditCoupon = (c: PromoCoupon) => {
    setEditingCouponId(c.id);
    setCpnCode(c.code);
    setCpnTitle(c.title);
    setCpnDesc(c.description);
    setCpnType(c.discountType);
    setCpnValue(c.discountValue);
    setCpnMinOrder(c.minOrderAmount);
    setCpnMaxDiscount(c.maxDiscountAmount ? String(c.maxDiscountAmount) : '');
    setCpnUsageLimit(c.usageLimit ? String(c.usageLimit) : '');
    setIsCouponModalOpen(true);
  };

  const handleSaveCouponForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpnCode.trim() || !cpnTitle.trim() || cpnValue <= 0) {
      dispatchToast('Campos Incompletos', 'Ingresa un código, título y valor de descuento válido.', 'warning');
      return;
    }
    saveCoupon({
      id: editingCouponId,
      code: cpnCode,
      title: cpnTitle.trim(),
      description: cpnDesc.trim() || 'Promoción exclusiva Tienda Virtual Khalessi',
      discountType: cpnType,
      discountValue: Number(cpnValue),
      minOrderAmount: Math.max(0, Number(cpnMinOrder)),
      maxDiscountAmount: cpnMaxDiscount ? Number(cpnMaxDiscount) : undefined,
      usageLimit: cpnUsageLimit ? Number(cpnUsageLimit) : undefined,
      isActive: true,
    });
    setIsCouponModalOpen(false);
    dispatchToast(
      editingCouponId ? 'Cupón Actualizado' : 'Cupón Creado',
      `El código ${cpnCode.toUpperCase()} ya está disponible para la tienda virtual.`,
      'success'
    );
  };

  const handleConfirmDeleteCoupon = (c: PromoCoupon) => {
    openNoticeModal({
      title: `¿Eliminar cupón ${c.code}?`,
      message: `Se retirará permanentemente "${c.title}" del gestor de beneficios.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Cupón',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        deleteCoupon(c.id);
        dispatchToast('Cupón Eliminado', `Se eliminó el código ${c.code}.`, 'info');
      },
    });
  };

  const openCreateReward = () => {
    setEditingRewardId(undefined);
    setRewTitle('');
    setRewDesc('');
    setRewPointsCost(4);
    setRewType('free_product');
    setRewValue(18.9);
    setRewIcon('🍕');
    setIsRewardModalOpen(true);
  };

  const openEditReward = (r: PointReward) => {
    setEditingRewardId(r.id);
    setRewTitle(r.title);
    setRewDesc(r.description);
    setRewPointsCost(r.pointsCost);
    setRewType(r.benefitType);
    setRewValue(r.discountValue);
    setRewIcon(r.badgeIcon);
    setIsRewardModalOpen(true);
  };

  const handleSaveRewardForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewTitle.trim() || rewPointsCost < 1 || rewValue <= 0) {
      dispatchToast('Datos Inválidos', 'Revisa el nombre, puntos requeridos y valor del premio.', 'warning');
      return;
    }
    saveReward({
      id: editingRewardId,
      title: rewTitle.trim(),
      description: rewDesc.trim() || `Canjeable con ${rewPointsCost} puntos acumulados.`,
      pointsCost: Math.max(1, Math.round(rewPointsCost)),
      benefitType: rewType,
      discountValue: Number(rewValue),
      badgeIcon: rewIcon || '🎁',
      isActive: true,
    });
    setIsRewardModalOpen(false);
    dispatchToast(
      editingRewardId ? 'Premio Actualizado' : 'Premio Creado',
      `"${rewTitle}" ahora forma parte del catálogo de puntos.`,
      'success'
    );
  };

  const handleConfirmDeleteReward = (r: PointReward) => {
    openNoticeModal({
      title: '¿Retirar premio del programa?',
      message: `El premio "${r.title}" (${r.pointsCost} pts) ya no aparecerá para canje.`,
      tone: 'danger',
      confirmLabel: 'Eliminar Premio',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        deleteReward(r.id);
        dispatchToast('Premio Eliminado', `Se retiró "${r.title}" del programa de puntos.`, 'info');
      },
    });
  };

  const tariff = companyInfo.deliveryTariff || {
    enabled: true,
    baseFallbackFeeSoles: 5,
    extraPerKmSoles: 1.5,
    freeDeliveryMinSubtotal: 120,
    brackets: [],
  };

  const updateTariffPatch = (patch: Partial<typeof tariff>) => {
    updateCompanyInfo({
      ...companyInfo,
      deliveryTariff: {
        ...tariff,
        ...patch,
      },
    });
  };

  const handleUpdateBracketField = (
    bracketId: string,
    field: keyof Omit<DeliveryDistanceBracket, 'id'>,
    val: number
  ) => {
    const nextBrackets = tariff.brackets.map(b =>
      b.id === bracketId ? { ...b, [field]: Math.max(0, Number(val)) } : b
    );
    updateTariffPatch({ brackets: nextBrackets });
  };

  const handleAddBracket = () => {
    if (newMaxKm <= newMinKm) {
      dispatchToast('Rango Inválido', 'El kilómetro final debe ser mayor al kilómetro inicial.', 'warning');
      return;
    }
    const created: DeliveryDistanceBracket = {
      id: `km-${Date.now()}`,
      minKm: Number(newMinKm),
      maxKm: Number(newMaxKm),
      feeSoles: Math.max(0, Number(newFeeSoles)),
    };
    const sorted = [...tariff.brackets, created].sort((a, b) => a.minKm - b.minKm);
    updateTariffPatch({ brackets: sorted });
    setNewMinKm(Number(newMaxKm));
    setNewMaxKm(Number(newMaxKm) + 3);
    dispatchToast('Tramo Agregado', `Se añadió el tramo ${created.minKm}–${created.maxKm} km (S/ ${created.feeSoles.toFixed(2)}).`, 'success');
  };

  const handleRemoveBracket = (bracketId: string) => {
    if (tariff.brackets.length <= 1) {
      dispatchToast('Acción no permitida', 'Mantén al menos un tramo de kilometraje activo.', 'warning');
      return;
    }
    updateTariffPatch({ brackets: tariff.brackets.filter(b => b.id !== bracketId) });
    dispatchToast('Tramo Eliminado', 'Se actualizó el tarifario de delivery por kilómetro.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-sm">
              <Gift className="w-5 h-5" />
            </span>
            Módulo de Beneficios, Cupones & Tarjetas de Puntos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Gestiona cupones promocionales, tarjetas de puntos (1 punto por compra web), premios canjeables y tarifario de delivery por km.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5">
          {[
            { id: 'coupons' as const, label: 'Cupones', icon: Ticket, count: coupons.length },
            { id: 'points_card' as const, label: 'Tarjetas de Puntos & Premios', icon: Award, count: rewards.length },
            { id: 'customers_points' as const, label: 'Puntos de Clientes', icon: Users, count: allCustomerAccounts.length },
            { id: 'delivery_tariff' as const, label: 'Tarifario Delivery / Km', icon: Truck, count: tariff.brackets.length },
          ].map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    active ? 'bg-zinc-950/15 text-zinc-950' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CUPONES PROMOCIONALES */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <div>
              <h2 className="text-base font-black text-zinc-950 dark:text-white">Gestor de Cupones de Descuento</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Los códigos activos pueden aplicarse directamente en el carrito y checkout de la Tienda Virtual.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateCoupon}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Cupón</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {coupons.map(c => (
              <div
                key={c.id}
                className={`rounded-2xl border p-5 bg-white dark:bg-zinc-900 flex flex-col justify-between gap-4 transition-colors ${
                  c.isActive
                    ? 'border-zinc-200 dark:border-zinc-800'
                    : 'border-zinc-200/60 dark:border-zinc-800/60 opacity-65'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-sm font-black tracking-wider border border-amber-500/30">
                      <Ticket className="w-3.5 h-3.5" />
                      {c.code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        c.isActive
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {c.isActive ? 'Activo' : 'Pausado'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">{c.title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{c.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
                    <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60">
                      <div className="text-[10px] uppercase font-bold text-zinc-400">Beneficio</div>
                      <div className="text-sm font-black text-zinc-900 dark:text-white">
                        {c.discountType === 'percentage' ? `${c.discountValue}%` : `S/ ${c.discountValue.toFixed(2)}`}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60">
                      <div className="text-[10px] uppercase font-bold text-zinc-400">Mínimo</div>
                      <div className="text-sm font-black text-zinc-900 dark:text-white">
                        S/ {c.minOrderAmount.toFixed(0)}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60">
                      <div className="text-[10px] uppercase font-bold text-zinc-400">Usos</div>
                      <div className="text-sm font-black text-zinc-900 dark:text-white">
                        {c.usedCount}
                        {c.usageLimit ? `/${c.usageLimit}` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => toggleCouponActive(c.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 whitespace-nowrap shrink-0"
                  >
                    {c.isActive ? <PauseCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{c.isActive ? 'Pausar' : 'Activar'}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditCoupon(c)}
                      className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-amber-500"
                      title="Editar cupón"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmDeleteCoupon(c)}
                      className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-rose-500"
                      title="Eliminar cupón"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TARJETAS DE PUNTOS & PREMIOS */}
      {activeTab === 'points_card' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Configurador de Reglas de la Tarjeta */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className="text-base font-black text-zinc-950 dark:text-white">
                      Reglas de la Tarjeta de Puntos
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Cada compra en la tienda virtual suma puntos automáticamente a la tarjeta digital del cliente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updatePointsConfig({ enabled: !pointsConfig.enabled });
                    dispatchToast(
                      !pointsConfig.enabled ? 'Tarjeta de Puntos Activa' : 'Programa Pausado',
                      !pointsConfig.enabled
                        ? 'Los clientes volverán a acumular puntos por cada compra online.'
                        : 'Se pausó temporalmente la acumulación de puntos.',
                      'info'
                    );
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 ${
                    pointsConfig.enabled
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {pointsConfig.enabled ? 'Programa Activo' : 'Pausado'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Nombre de la Tarjeta Digital
                  </label>
                  <input
                    type="text"
                    value={pointsConfig.cardTitle}
                    onChange={e => updatePointsConfig({ cardTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Puntos Ganados por Compra Web
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={pointsConfig.pointsPerPurchase}
                    onChange={e =>
                      updatePointsConfig({ pointsPerPurchase: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Compra Mínima para Ganar Punto (S/)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={pointsConfig.minPurchaseAmountForPoint}
                    onChange={e =>
                      updatePointsConfig({ minPurchaseAmountForPoint: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Meta Visual de Sellos en Tarjeta
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={15}
                    value={pointsConfig.stampsPerCardGoal}
                    onChange={e =>
                      updatePointsConfig({
                        stampsPerCardGoal: Math.min(15, Math.max(4, Number(e.target.value) || 8)),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Descripción en el Perfil del Cliente
                </label>
                <input
                  type="text"
                  value={pointsConfig.cardSubtitle}
                  onChange={e => updatePointsConfig({ cardSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            {/* Vista Previa en Vivo de la Tarjeta de Puntos (Sin degradados) */}
            <div className="lg:col-span-5 bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> Vista Previa Cliente
                  </span>
                  <h3 className="text-lg font-black mt-2">{pointsConfig.cardTitle}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{pointsConfig.cardSubtitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-amber-400">5 / {pointsConfig.stampsPerCardGoal}</div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Puntos</div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 py-2">
                {Array.from({ length: pointsConfig.stampsPerCardGoal }).map((_, idx) => {
                  const stamped = idx < 5;
                  return (
                    <div
                      key={idx}
                      className={`h-12 rounded-xl border flex flex-col items-center justify-center text-xs font-black ${
                        stamped
                          ? 'bg-amber-500 border-amber-400 text-zinc-950'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {stamped ? <Star className="w-4 h-4 fill-current" /> : <span>#{idx + 1}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800">
                <span>+{pointsConfig.pointsPerPurchase} pto(s) por compra web ≥ S/ {pointsConfig.minPurchaseAmountForPoint}</span>
                <span className="font-bold text-amber-400">{rewards.filter(r => r.isActive).length} premios activos</span>
              </div>
            </div>
          </div>

          {/* Catálogo de Premios Canjeables */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 dark:text-white">
                  Catálogo de Premios Canjeables con Puntos
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Define cuántos puntos cuesta cada premio y el beneficio que se descuenta automáticamente en el pedido.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateReward}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Premio</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rewards.map(r => (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-5 bg-white dark:bg-zinc-900 flex flex-col justify-between gap-4 ${
                    r.isActive ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-200/60 dark:border-zinc-800/60 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="h-11 w-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl">
                        {r.badgeIcon}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-zinc-950 dark:bg-amber-500 text-white dark:text-zinc-950 text-xs font-black">
                        {r.pointsCost} {r.pointsCost === 1 ? 'Punto' : 'Puntos'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-zinc-950 dark:text-white">{r.title}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{r.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500">Equivalente en Checkout:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {r.benefitType === 'percentage_discount'
                          ? `${r.discountValue}% Dscto.`
                          : `- S/ ${r.discountValue.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => toggleRewardActive(r.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0"
                    >
                      {r.isActive ? 'Pausar' : 'Activar'}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400 mr-1">{r.redeemedCount} canjes</span>
                      <button
                        type="button"
                        onClick={() => openEditReward(r)}
                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-amber-500"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDeleteReward(r)}
                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PUNTOS DE CLIENTES & HISTORIAL DE CANJES */}
      {activeTab === 'customers_points' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-black text-zinc-950 dark:text-white">
                Tarjetas Digitales de Clientes Registrados ({allCustomerAccounts.length})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Otorga bonos manuales o revisa cuántos puntos acumula cada usuario de la Tienda Virtual.
              </p>
            </div>

            {allCustomerAccounts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                Aún no hay cuentas registradas desde el Perfil de la Tienda Virtual. Cuando un cliente se registre, aparecerá aquí con su tarjeta de puntos.
              </div>
            ) : (
              <div className="space-y-2.5">
                {allCustomerAccounts.map(acc => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-black text-zinc-900 dark:text-white">{acc.fullName}</div>
                      <div className="text-xs text-zinc-500">
                        {acc.phone} • {acc.email} • {acc.orderIds.length} pedidos
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-xs">
                        {acc.points || 0} pts
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          adjustAccountPointsById(acc.id, 1, 'Bono otorgado por Administración');
                          dispatchToast('Punto Agregado', `+1 punto acreditado a ${acc.fullName}.`, 'success');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-black whitespace-nowrap shrink-0"
                      >
                        +1 Pto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if ((acc.points || 0) <= 0) return;
                          adjustAccountPointsById(acc.id, -1, 'Ajuste manual de puntos');
                          dispatchToast('Punto Descontado', `-1 punto ajustado a ${acc.fullName}.`, 'info');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold whitespace-nowrap shrink-0"
                      >
                        -1
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-black text-zinc-950 dark:text-white">Últimos Premios Canjeados</h3>
            </div>
            {redemptionHistory.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                Los canjes de premios realizados en el checkout aparecerán aquí en tiempo real.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {redemptionHistory.map(rec => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-white">{rec.rewardTitle}</div>
                      <div className="text-zinc-500">
                        {rec.customerName} • Pedido {rec.orderNumber}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black whitespace-nowrap shrink-0">
                      -{rec.pointsSpent} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TARIFARIO DE DELIVERY DINÁMICO POR KILÓMETRO */}
      {activeTab === 'delivery_tariff' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-black text-zinc-950 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                Tarifario Oficial de Delivery Dinámico por Kilómetro
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Calcula automáticamente el costo de envío según los kilómetros reales entre la sucursal seleccionada y el GPS del cliente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateTariffPatch({ enabled: !tariff.enabled });
                dispatchToast(
                  !tariff.enabled ? 'Tarifa Dinámica Activa' : 'Tarifa Fija Activa',
                  !tariff.enabled
                    ? 'La tienda calculará el envío por tramos de kilometraje.'
                    : 'Se usará la tarifa base fija de respaldo.',
                  'info'
                );
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 ${
                tariff.enabled ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600'
              }`}
            >
              {tariff.enabled ? 'Cálculo por Km Activo' : 'Usando Tarifa Fija'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                Tarifa Base sin GPS (S/)
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={tariff.baseFallbackFeeSoles}
                onChange={e => updateTariffPatch({ baseFallbackFeeSoles: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                Recargo por Km Adicional fuera de tramo (S/)
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={tariff.extraPerKmSoles}
                onChange={e => updateTariffPatch({ extraPerKmSoles: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                Delivery Gratis desde Compra Mayor a (S/)
              </label>
              <input
                type="number"
                min={0}
                step="5"
                value={tariff.freeDeliveryMinSubtotal || 0}
                onChange={e =>
                  updateTariffPatch({ freeDeliveryMinSubtotal: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Tramos Configurados (Desde Km → Hasta Km = Precio S/)
            </div>
            {tariff.brackets.map(b => (
              <div
                key={b.id}
                className="grid grid-cols-3 sm:grid-cols-4 gap-3 items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
              >
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400">Desde (km)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={b.minKm}
                    onChange={e => handleUpdateBracketField(b.id, 'minKm', Number(e.target.value))}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400">Hasta (km)</span>
                  <input
                    type="number"
                    min={0.5}
                    step="0.5"
                    value={b.maxKm}
                    onChange={e => handleUpdateBracketField(b.id, 'maxKm', Number(e.target.value))}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400">Tarifa (S/)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={b.feeSoles}
                    onChange={e => handleUpdateBracketField(b.id, 'feeSoles', Number(e.target.value))}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-black text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveBracket(b.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Bracket Row */}
          <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 flex flex-col sm:flex-row items-end gap-3">
            <div className="w-full sm:w-32">
              <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Desde (km)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={newMinKm}
                onChange={e => setNewMinKm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Hasta (km)</label>
              <input
                type="number"
                min={0.5}
                step="0.5"
                value={newMaxKm}
                onChange={e => setNewMaxKm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold"
              />
            </div>
            <div className="w-full sm:w-36">
              <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Tarifa Envío (S/)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={newFeeSoles}
                onChange={e => setNewFeeSoles(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-black"
              />
            </div>
            <button
              type="button"
              onClick={handleAddBracket}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Tramo Km</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR CUPÓN */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <form
            onSubmit={handleSaveCouponForm}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                {editingCouponId ? 'Editar Cupón Promocional' : 'Crear Nuevo Cupón'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Código del Cupón *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. PROMO20"
                    value={cpnCode}
                    onChange={e => setCpnCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-mono font-black uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Tipo de Descuento
                  </label>
                  <select
                    value={cpnType}
                    onChange={e => setCpnType(e.target.value as CouponDiscountType)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-bold"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo (S/)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Título Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 20% Dscto. Noches de Pizza"
                  value={cpnTitle}
                  onChange={e => setCpnTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  placeholder="Condiciones breves visibles para el cliente"
                  value={cpnDesc}
                  onChange={e => setCpnDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Valor ({cpnType === 'percentage' ? '%' : 'S/'}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    required
                    value={cpnValue}
                    onChange={e => setCpnValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Compra Mín. (S/)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={cpnMinOrder}
                    onChange={e => setCpnMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Límite Usos (Opc.)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ilimitado"
                    value={cpnUsageLimit}
                    onChange={e => setCpnUsageLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cupón</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CREAR / EDITAR PREMIO DE PUNTOS */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <form
            onSubmit={handleSaveRewardForm}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                {editingRewardId ? 'Editar Premio de Puntos' : 'Nuevo Premio Canjeable'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRewardModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">Ícono</label>
                  <input
                    type="text"
                    value={rewIcon}
                    onChange={e => setRewIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center text-lg"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Nombre del Premio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pizza Personal Clásica Gratis"
                    value={rewTitle}
                    onChange={e => setRewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Detalle del premio al alcanzar la meta de puntos"
                  value={rewDesc}
                  onChange={e => setRewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Costo en Puntos *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={rewPointsCost}
                    onChange={e => setRewPointsCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Tipo Beneficio
                  </label>
                  <select
                    value={rewType}
                    onChange={e => setRewType(e.target.value as RewardBenefitType)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold"
                  >
                    <option value="free_product">Producto Gratis (Valor S/)</option>
                    <option value="fixed_discount">Bono en Soles (S/)</option>
                    <option value="percentage_discount">Descuento (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Valor ({rewType === 'percentage_discount' ? '%' : 'S/'}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    required
                    value={rewValue}
                    onChange={e => setRewValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-black"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsRewardModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Premio</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
