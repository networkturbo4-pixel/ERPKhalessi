import React, { useState, useEffect } from 'react';
import { Order, PaymentMethod } from '../../types/catalog';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { ProofPhotoCaptureModal } from './ProofPhotoCaptureModal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import {
  Bike,
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  CheckCircle2,
  Flame,
  Clock,
  PackageCheck,
  Banknote,
  Smartphone,
  CreditCard,
  User,
  Compass,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';

type MobileDeliveryTab = 'listo' | 'en_ruta' | 'cocina' | 'entregado';

export const DeliveryView: React.FC = () => {
  const { orders, updateOrderStatus } = useOrderCatalog();
  const { activeTenant, branchScope, setBranchScope, tenants, openNoticeModal, dispatchToast } = useSettings();
  const { currentUser } = useRBAC();
  const [mobileTab, setMobileTab] = useState<MobileDeliveryTab>('listo');
  const [, setTick] = useState(0);

  // Modal de evidencia fotográfica (pickup y delivery)
  const [photoModalState, setPhotoModalState] = useState<{
    isOpen: boolean;
    order: Order | null;
    stage: 'pickup' | 'delivery';
    title: string;
  }>({
    isOpen: false,
    order: null,
    stage: 'pickup',
    title: '',
  });

  // Visor Lightbox para ver evidencias
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    title: string;
    subtitle?: string;
    metadata?: {
      capturedAt?: string;
      operatorOrDriver?: string;
      stageLabel?: string;
    };
  }>({
    isOpen: false,
    imageUrl: null,
    title: '',
  });

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Filter delivery orders (Online delivery or POS delivery) for active sucursal
  const deliveryOrders = orders.filter((o) => {
    const isDelivery =
      (o.channel === 'online' && o.deliveryAddress !== 'Recojo en Sucursal') ||
      o.channel === 'pos-delivery';
    if (!isDelivery) return false;
    if (branchScope === 'consolidated') return true;
    return o.tenantId === activeTenant.id;
  });

  const otherBranchesDeliveryCount =
    branchScope === 'branch'
      ? orders.filter((o) => {
          const isDel =
            (o.channel === 'online' && o.deliveryAddress !== 'Recojo en Sucursal') ||
            o.channel === 'pos-delivery';
          return (
            isDel &&
            o.tenantId !== activeTenant.id &&
            (o.status === 'recibido' ||
              o.status === 'en_cocina' ||
              o.status === 'en_horno' ||
              o.status === 'listo' ||
              o.status === 'en_ruta')
          );
        }).length
      : 0;

  const kitchenOrders = deliveryOrders.filter(
    (o) => o.status === 'recibido' || o.status === 'en_cocina' || o.status === 'en_horno'
  );
  const readyForPickupOrders = deliveryOrders.filter((o) => o.status === 'listo');
  const inRouteOrders = deliveryOrders.filter((o) => o.status === 'en_ruta');
  const deliveredOrders = deliveryOrders.filter((o) => o.status === 'entregado').slice(0, 12);

  const getBranchShortName = (tenantId: string) => {
    const found = tenants.find((t) => t.id === tenantId);
    return found ? found.name.replace('Khalessi Pizza - ', '') : tenantId;
  };

  const getElapsedMinutes = (isoDate?: string) => {
    if (!isoDate) return 1;
    return Math.max(1, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000));
  };

  const cleanPhoneDigits = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('51') ? digits : `51${digits}`;
  };

  const paymentBadge = (method: PaymentMethod, paid: boolean, total: number) => {
    if (paid) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Pagado ({method === 'yape_plin' ? 'Yape/Plin' : method === 'tarjeta' ? 'Tarjeta' : 'Efectivo'})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
        {method === 'efectivo' ? (
          <Banknote className="w-3.5 h-3.5" />
        ) : method === 'tarjeta' ? (
          <CreditCard className="w-3.5 h-3.5" />
        ) : (
          <Smartphone className="w-3.5 h-3.5" />
        )}
        Cobrar S/ {total.toFixed(2)} ({method === 'efectivo' ? 'Efectivo' : method === 'tarjeta' ? 'POS Móvil' : 'Yape/Plin'})
      </span>
    );
  };

  // Iniciar toma de pedido con evidencia obligatoria de recojo en tienda
  const handleOpenPickupEvidence = (order: Order) => {
    setPhotoModalState({
      isOpen: true,
      order,
      stage: 'pickup',
      title: 'Evidencia de Salida de Tienda',
    });
  };

  // Iniciar entrega con evidencia obligatoria de entrega al cliente
  const handleOpenDeliveryEvidence = (order: Order) => {
    setPhotoModalState({
      isOpen: true,
      order,
      stage: 'delivery',
      title: 'Evidencia de Entrega al Cliente',
    });
  };

  const handleConfirmPhotoEvidence = (photoBase64: string, authorizerOrDriver: string) => {
    const targetOrder = photoModalState.order;
    if (!targetOrder) return;

    const nowIso = new Date().toISOString();
    const stage = photoModalState.stage;

    if (stage === 'pickup') {
      updateOrderStatus(targetOrder.id, 'en_ruta', {
        assignedDriverId: currentUser.id,
        assignedDriverName: currentUser.name,
        pickupProofPhoto: photoBase64,
        pickupProofAt: nowIso,
        pickupProofDriverName: currentUser.name,
        deliveryAuthorizedBy: authorizerOrDriver || currentUser.name,
        dispatchedAt: nowIso,
      });
      dispatchToast(
        'Salida Registrada con Foto',
        `Orden ${targetOrder.orderNumber} en ruta con evidencia optimizada.`,
        'success'
      );
    } else {
      updateOrderStatus(targetOrder.id, 'entregado', {
        paymentStatus: 'pagado',
        deliveryProofPhoto: photoBase64,
        deliveryProofAt: nowIso,
        deliveryProofDriverName: currentUser.name,
        deliveredAt: nowIso,
      });
      dispatchToast(
        'Entrega Completada',
        `Orden ${targetOrder.orderNumber} entregada y archivada con foto de conformidad.`,
        'success'
      );
    }
  };

  const renderDeliveryCard = (order: Order) => {
    const waDigits = cleanPhoneDigits(order.customerPhone);
    const mapsUrl = order.deliveryAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`
      : null;
    const waUrl = waDigits
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
          `¡Hola ${order.customerName}! Soy el motorizado de Khalessi Pizza con tu pedido ${order.orderNumber}. Estoy en camino a ${order.deliveryAddress || 'tu dirección'}. 🍕🛵`
        )}`
      : null;

    return (
      <div
        key={order.id}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 shadow-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-base text-zinc-950 dark:text-white tracking-tight">
              {order.orderNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                order.channel === 'online'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300'
              }`}
            >
              {order.channel === 'online' ? 'Tienda Online' : 'Delivery POS'}
            </span>
            {branchScope === 'consolidated' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {getBranchShortName(order.tenantId)}
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
            <Clock className="w-3 h-3 text-amber-500" />
            {getElapsedMinutes(order.dispatchedAt || order.createdAt)}m
          </span>
        </div>

        {/* Customer & Destination */}
        <div className="space-y-2 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white truncate">
                {order.customerName}
              </span>
            </div>
            {order.customerDni && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                DNI {order.customerDni}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {order.deliveryAddress || 'Dirección por confirmar'}
              </p>
              {order.deliveryReference && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                  <Compass className="w-3 h-3 shrink-0" />
                  <span>Ref: {order.deliveryReference}</span>
                </p>
              )}
            </div>
          </div>

          {/* 1-Tap Mobile Driver Actions: Call, WhatsApp, Google Maps */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {waDigits ? (
              <a
                href={`tel:+${waDigits}`}
                className="min-h-[42px] px-2 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Llamar</span>
              </a>
            ) : (
              <span className="min-h-[42px] px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 text-[11px] flex items-center justify-center">
                Sin Tel.
              </span>
            )}

            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-[42px] px-2 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </a>
            ) : (
              <span className="min-h-[42px] px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 text-[11px] flex items-center justify-center">
                Sin WA
              </span>
            )}

            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-[42px] px-2 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span>Mapa</span>
              </a>
            ) : (
              <span className="min-h-[42px] px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 text-[11px] flex items-center justify-center">
                Sin Mapa
              </span>
            )}
          </div>
        </div>

        {/* Compact Order Summary */}
        <div className="space-y-1 text-xs">
          {order.items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
              <span className="truncate">
                <strong className="text-zinc-950 dark:text-white">{it.quantity}x</strong> {it.productName}{' '}
                {it.size ? `(${it.size.name})` : ''}
              </span>
              <span className="font-semibold shrink-0 ml-2">S/ {it.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Payment & Driver Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          {paymentBadge(order.paymentMethod, order.paymentStatus === 'pagado', order.total)}
          <span className="font-black text-sm text-zinc-950 dark:text-white">
            S/ {order.total.toFixed(2)}
          </span>
        </div>

        {order.assignedDriverName && (
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5 text-orange-500" />
            <span>
              Motorizado asignado:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">{order.assignedDriverName}</strong>
            </span>
          </div>
        )}

        {/* Evidencias fotográficas registradas */}
        {(order.pickupProofPhoto || order.deliveryProofPhoto) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            {order.pickupProofPhoto && (
              <button
                type="button"
                onClick={() =>
                  setLightboxState({
                    isOpen: true,
                    imageUrl: order.pickupProofPhoto!,
                    title: `Foto Salida de Tienda · ${order.orderNumber}`,
                    subtitle: `Motorizado: ${order.pickupProofDriverName || order.assignedDriverName || 'Asignado'}`,
                    metadata: {
                      stageLabel: 'Salida de Tienda (Pickup)',
                      operatorOrDriver: order.pickupProofDriverName || order.assignedDriverName || order.deliveryAuthorizedBy,
                      capturedAt: order.pickupProofAt,
                    },
                  })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 transition-colors whitespace-nowrap shrink-0"
              >
                <Camera className="w-3 h-3 text-amber-500" />
                <span>Foto Salida</span>
              </button>
            )}

            {order.deliveryProofPhoto && (
              <button
                type="button"
                onClick={() =>
                  setLightboxState({
                    isOpen: true,
                    imageUrl: order.deliveryProofPhoto!,
                    title: `Foto Entrega Conforme · ${order.orderNumber}`,
                    subtitle: `Destino: ${order.deliveryAddress || 'Domicilio del Cliente'}`,
                    metadata: {
                      stageLabel: 'Entrega Final al Cliente',
                      operatorOrDriver: order.deliveryProofDriverName || order.assignedDriverName,
                      capturedAt: order.deliveryProofAt,
                    },
                  })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 transition-colors whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Foto Entrega</span>
              </button>
            )}
          </div>
        )}

        {/* Primary Stage Transition Buttons */}
        {order.status === 'listo' && (
          <button
            type="button"
            onClick={() => handleOpenPickupEvidence(order)}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Tomar Foto de Salida e Iniciar Ruta</span>
          </button>
        )}

        {order.status === 'en_ruta' && (
          <button
            type="button"
            onClick={() => handleOpenDeliveryEvidence(order)}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Tomar Foto de Entrega y Finalizar</span>
          </button>
        )}

        {(order.status === 'recibido' || order.status === 'en_cocina' || order.status === 'en_horno') && (
          <div className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
            <span>Preparándose en Horno KDS...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-4 touch-surface">
      {otherBranchesDeliveryCount > 0 && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Hay {otherBranchesDeliveryCount} pedido(s) delivery activos en otras sucursales.
          </span>
          <button
            type="button"
            onClick={() => setBranchScope('consolidated')}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
          >
            Ver Consolidado de Sedes
          </button>
        </div>
      )}

      {/* Mobile Tactile Stage Switcher */}
      <div className="grid grid-cols-4 gap-1.5 lg:hidden p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileTab('listo')}
          className={`min-h-[46px] px-2 py-1.5 rounded-xl text-[11px] font-black flex flex-col items-center justify-center transition-all ${
            mobileTab === 'listo'
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span>Listos ({readyForPickupOrders.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('en_ruta')}
          className={`min-h-[46px] px-2 py-1.5 rounded-xl text-[11px] font-black flex flex-col items-center justify-center transition-all ${
            mobileTab === 'en_ruta'
              ? 'bg-orange-500 text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span>Ruta ({inRouteOrders.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cocina')}
          className={`min-h-[46px] px-2 py-1.5 rounded-xl text-[11px] font-black flex flex-col items-center justify-center transition-all ${
            mobileTab === 'cocina'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span>Horno ({kitchenOrders.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('entregado')}
          className={`min-h-[46px] px-2 py-1.5 rounded-xl text-[11px] font-black flex flex-col items-center justify-center transition-all ${
            mobileTab === 'entregado'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <span>Fin ({deliveredOrders.length})</span>
        </button>
      </div>

      {/* Desktop 3-Column Dispatch Board + Mobile Active Tab */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-start">
        {/* Column 1: En Horno (Próximos a salir) */}
        <div className={`space-y-3 ${mobileTab !== 'cocina' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30">
            <span className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" /> 1. Preparándose en Cocina
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-xs font-black">
              {kitchenOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {kitchenOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-white/60 dark:bg-zinc-900/50">
                Sin pedidos delivery en horno
              </div>
            ) : (
              kitchenOrders.map(renderDeliveryCard)
            )}
          </div>
        </div>

        {/* Column 2: Listos para Recoger */}
        <div className={`space-y-3 ${mobileTab !== 'listo' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/30">
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-500" /> 2. Listos para Recoger
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-black">
              {readyForPickupOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {readyForPickupOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-white/60 dark:bg-zinc-900/50">
                No hay pedidos listos esperando motorizado
              </div>
            ) : (
              readyForPickupOrders.map(renderDeliveryCard)
            )}
          </div>
        </div>

        {/* Column 3: En Ruta Activa */}
        <div className={`space-y-3 ${mobileTab !== 'en_ruta' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-500/30">
            <span className="font-bold text-xs uppercase tracking-wider text-orange-800 dark:text-orange-300 flex items-center gap-2">
              <Bike className="w-4 h-4 text-orange-500" /> 3. En Ruta de Entrega
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-zinc-950 text-xs font-black">
              {inRouteOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {inRouteOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-white/60 dark:bg-zinc-900/50">
                Ningún motorizado en ruta en este momento
              </div>
            ) : (
              inRouteOrders.map(renderDeliveryCard)
            )}
          </div>
        </div>
      </div>

      {/* Mobile-only Entregados History View */}
      {mobileTab === 'entregado' && (
        <div className="space-y-3 lg:hidden">
          {deliveredOrders.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl">
              Aún no hay entregas completadas hoy
            </div>
          ) : (
            deliveredOrders.map(renderDeliveryCard)
          )}
        </div>
      )}

      {/* Modal de Captura Obligatoria de Foto (Salida / Entrega) */}
      <ProofPhotoCaptureModal
        isOpen={photoModalState.isOpen}
        onClose={() => setPhotoModalState(prev => ({ ...prev, isOpen: false }))}
        title={photoModalState.title}
        stage={photoModalState.stage}
        orderNumber={photoModalState.order?.orderNumber || ''}
        customerName={photoModalState.order?.customerName}
        deliveryAddress={photoModalState.order?.deliveryAddress}
        onConfirm={handleConfirmPhotoEvidence}
      />

      {/* Lightbox para Visualización de Evidencias */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState(prev => ({ ...prev, isOpen: false, imageUrl: null }))}
        imageUrl={lightboxState.imageUrl}
        title={lightboxState.title}
        subtitle={lightboxState.subtitle}
        metadata={lightboxState.metadata}
      />
    </div>
  );
};
