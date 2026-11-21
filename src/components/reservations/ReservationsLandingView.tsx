import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  Users,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  UtensilsCrossed,
  ShoppingBag,
  ArrowLeft,
  Clock,
  Phone,
  Share2,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { PublicReservation, OrderItem } from '../../types/catalog';
import {
  getReservationSettingsForTenant,
  loadPublicReservations,
  savePublicReservations,
} from '../../utils/posOperations';

interface ReservationsLandingViewProps {
  tenantSlugOrId?: string | null;
  onNavigateHome?: () => void;
}

export const ReservationsLandingView: React.FC<ReservationsLandingViewProps> = ({
  tenantSlugOrId,
  onNavigateHome,
}) => {
  const { tenants, companyInfo, customization, dispatchToast } = useSettings();
  const { products, getTablesForTenant, setTableReservation } = useOrderCatalog();

  const initialTenant = useMemo(() => {
    if (tenantSlugOrId) {
      const clean = tenantSlugOrId.toLowerCase();
      const matched = tenants.find(
        (t) =>
          t.id.toLowerCase() === clean ||
          t.name.toLowerCase().replace(/\s+/g, '-').includes(clean)
      );
      if (matched) return matched;
    }
    return tenants[0];
  }, [tenants, tenantSlugOrId]);

  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenant?.id || '');
  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId) || tenants[0],
    [tenants, selectedTenantId]
  );

  const config = useMemo(
    () => getReservationSettingsForTenant(selectedTenant?.id || ''),
    [selectedTenant?.id]
  );

  const branchTables = useMemo(
    () => (selectedTenant ? getTablesForTenant(selectedTenant.id) : []),
    [selectedTenant, getTablesForTenant]
  );
  const zones = useMemo(
    () => Array.from(new Set(branchTables.map((t) => t.zone))).filter(Boolean),
    [branchTables]
  );

  const [mode, setMode] = useState<'mesa' | 'pedido'>(
    config.allowTableReservation ? 'mesa' : 'pedido'
  );
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('20:00');
  const [guests, setGuests] = useState(4);
  const [zone, setZone] = useState(zones[0] || 'Salón Principal');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDni, setCustomerDni] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'takeaway' | 'delivery'>('takeaway');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedPreOrderIds, setSelectedPreOrderIds] = useState<Record<string, number>>({});

  const [confirmedReservation, setConfirmedReservation] = useState<PublicReservation | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const shareableUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/reservas';
    return `${window.location.origin}/reservas`;
  }, []);

  const availableProducts = useMemo(
    () => products.filter((p) => p.isAvailable).slice(0, 8),
    [products]
  );

  const handleCopyShareUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(shareableUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      dispatchToast('Enlace Copiado', 'URL de reservas lista para compartir.', 'success');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    if (!config.enabled) {
      dispatchToast('Reservas Deshabilitadas', 'Esta sucursal no acepta reservas online en este momento.', 'warning');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      dispatchToast('Datos Requeridos', 'Ingresa tu nombre y número de WhatsApp para confirmar.', 'warning');
      return;
    }

    const preOrderItems: OrderItem[] = Object.entries(selectedPreOrderIds)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const prod = products.find((p) => p.id === productId);
        const unitPrice = prod?.hasSizes
          ? prod.sizes.find((s) => s.enabled)?.price || prod.basePrice
          : prod?.basePrice || 0;
        return {
          itemId: `pre-${productId}-${Date.now()}`,
          productId,
          productName: prod?.name || 'Producto',
          productImage: prod?.imageUrl || '',
          subOptions: [],
          extras: [],
          unitPrice,
          quantity: qty,
          totalPrice: unitPrice * qty,
        };
      });

    let assignedTableId: string | undefined;
    if (mode === 'mesa') {
      const candidateTable = branchTables.find(
        (t) =>
          !t.reservation &&
          t.capacity >= guests &&
          (!zone || t.zone === zone)
      ) || branchTables.find((t) => !t.reservation);

      if (candidateTable) {
        assignedTableId = candidateTable.id;
        setTableReservation(candidateTable.id, {
          customerName: customerName.trim(),
          time,
          guests,
          notes: notes.trim() || `Reserva Web (${date})`,
        });
      }
    }

    const code = `RES-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newRes: PublicReservation = {
      id: `res-${Date.now()}`,
      code,
      tenantId: selectedTenant.id,
      type: mode,
      date,
      time,
      guests: mode === 'mesa' ? guests : undefined,
      zone: mode === 'mesa' ? zone : undefined,
      tableId: assignedTableId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerDni: customerDni.trim() || undefined,
      notes: notes.trim() || undefined,
      preOrderItems: preOrderItems.length > 0 ? preOrderItems : undefined,
      deliveryMode: mode === 'pedido' ? deliveryMode : undefined,
      deliveryAddress: mode === 'pedido' && deliveryMode === 'delivery' ? deliveryAddress.trim() : undefined,
      status: 'confirmada',
      createdAt: new Date().toISOString(),
    };

    const existing = loadPublicReservations();
    savePublicReservations([newRes, ...existing]);
    setConfirmedReservation(newRes);
    dispatchToast('Reserva Confirmada', `Código ${code} registrado en ${selectedTenant.name}.`, 'success');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => (onNavigateHome ? onNavigateHome() : (window.location.href = '/'))}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              aria-label="Volver a la tienda"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-white truncate">
                {companyInfo.commercialName || 'Gastro Restaurante'} · Reservas
              </h1>
              <p className="text-[11px] text-zinc-400 truncate">
                Reserva tu mesa o programa tu pedido sin colas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyShareUrl}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-xs font-bold text-zinc-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedUrl ? 'Enlace copiado' : 'Compartir URL'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {confirmedReservation ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-emerald-500/30 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                Reserva Confirmada
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                Código: {confirmedReservation.code}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {selectedTenant?.name} · {confirmedReservation.date} a las {confirmedReservation.time}
              </p>
            </div>

            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                  `${shareableUrl}?code=${confirmedReservation.code}`
                )}`}
                alt="QR Reserva"
                className="w-36 h-36 rounded-2xl bg-white p-2"
              />
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-1.5 max-w-md mx-auto">
              <p><strong>Cliente:</strong> {confirmedReservation.customerName}</p>
              <p><strong>WhatsApp:</strong> {confirmedReservation.customerPhone}</p>
              {confirmedReservation.type === 'mesa' ? (
                <p><strong>Mesa:</strong> {confirmedReservation.guests} personas · Zona {confirmedReservation.zone}</p>
              ) : (
                <p><strong>Pedido programado:</strong> {confirmedReservation.deliveryMode === 'delivery' ? 'Delivery' : 'Recojo en tienda'}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyShareUrl}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar link de reservas</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmedReservation(null)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black whitespace-nowrap shrink-0"
              >
                Hacer otra reserva
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Sucursal Selector */}
            <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                1. Elige tu Sede
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tenants.map((t) => {
                  const active = t.id === selectedTenant?.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTenantId(t.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        active
                          ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      <p className="text-xs font-black text-white">{t.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{t.operations?.address || t.slug}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Horario de reservas: {config.openTime} a {config.closeTime}
              </p>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800">
              {config.allowTableReservation && (
                <button
                  type="button"
                  onClick={() => setMode('mesa')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors ${
                    mode === 'mesa'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Reservar Mesa</span>
                </button>
              )}
              {config.allowScheduledOrder && (
                <button
                  type="button"
                  onClick={() => setMode('pedido')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors ${
                    mode === 'pedido'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Programar Pedido</span>
                </button>
              )}
            </div>

            {/* Details */}
            <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Hora</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                </div>
                {mode === 'mesa' ? (
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                      Personas (máx. {config.maxGuestsPerReservation})
                    </label>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-400 shrink-0" />
                      <input
                        type="number"
                        min={1}
                        max={config.maxGuestsPerReservation}
                        value={guests}
                        onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">Entrega</label>
                    <select
                      value={deliveryMode}
                      onChange={(e) => setDeliveryMode(e.target.value as 'takeaway' | 'delivery')}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                    >
                      <option value="takeaway">Recojo en tienda</option>
                      <option value="delivery">Delivery programado</option>
                    </select>
                  </div>
                )}
              </div>

              {mode === 'mesa' && zones.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">Zona preferida</label>
                  <div className="flex flex-wrap gap-2">
                    {zones.map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZone(z)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                          zone === z
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'pedido' && deliveryMode === 'delivery' && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Dirección de entrega</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Av. / Calle, número y referencia"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                </div>
              )}

              {/* Quick Pre-Order */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-400 block">
                  {mode === 'pedido' ? 'Selecciona tus productos' : 'Pre-ordenar pizzas (opcional)'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableProducts.map((p) => {
                    const qty = selectedPreOrderIds[p.id] || 0;
                    const price = p.hasSizes
                      ? p.sizes.find((s) => s.enabled)?.price || p.basePrice
                      : p.basePrice;
                    return (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-amber-400 font-bold">S/ {price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPreOrderIds((prev) => ({
                                ...prev,
                                [p.id]: Math.max(0, (prev[p.id] || 0) - 1),
                              }))
                            }
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-black">{qty}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPreOrderIds((prev) => ({
                                ...prev,
                                [p.id]: (prev[p.id] || 0) + 1,
                              }))
                            }
                            className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 text-xs font-black"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Nombre completo *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">WhatsApp *</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="999 888 777"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">DNI (opcional)</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={customerDni}
                    onChange={(e) => setCustomerDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="8 dígitos"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Notas adicionales</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Cumpleaños, silla para bebé, sin cebolla..."
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              style={customization.primaryColor ? { backgroundColor: customization.primaryColor } : undefined}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <CalendarClock className="w-4 h-4" />
              <span>{mode === 'mesa' ? 'Confirmar Reserva de Mesa' : 'Programar Pedido'}</span>
            </button>

            {/* Shareable URL Box */}
            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                  URL Pública de Reservas para Compartir
                </span>
                <code className="text-amber-400 font-mono text-xs truncate block">{shareableUrl}</code>
              </div>
              <button
                type="button"
                onClick={handleCopyShareUrl}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar URL</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
