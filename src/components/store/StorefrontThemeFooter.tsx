import React, { useState } from 'react';
import {
  Phone,
  BookOpen,
  CalendarClock,
  Copy,
  Check,
  CreditCard,
  Share2,
  Mail,
  Send,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { StoreFooterVariant } from '../../types/storeBuilder';

export interface StorefrontThemeFooterProps {
  variant: Exclude<StoreFooterVariant, 'default'>;
  brandName: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  ruc?: string;
  reservationsUrl: string;
  onOpenTerms: () => void;
  onOpenReturns: () => void;
  onOpenOrders: () => void;
  onOpenJobs: () => void;
  onOpenClaim: () => void;
  onSubscribeNewsletter: (name: string, email: string) => void;
  onCopyReserveUrl: () => void;
}

export const StorefrontThemeFooter: React.FC<StorefrontThemeFooterProps> = ({
  variant,
  brandName,
  logoUrl,
  phone,
  email,
  ruc,
  reservationsUrl,
  onOpenTerms,
  onOpenReturns,
  onOpenOrders,
  onOpenJobs,
  onOpenClaim,
  onSubscribeNewsletter,
  onCopyReserveUrl,
}) => {
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyReserveUrl();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    onSubscribeNewsletter(subName.trim(), subEmail.trim());
    setSubName('');
    setSubEmail('');
  };

  // =========================================================================
  // 1. HUT CRIMSON & FLAME GRILL: Cinta social superior + 4 columnas oscuras + Formulario
  // =========================================================================
  if (variant === 'hut_crimson' || variant === 'flame_grill') {
    const isCrimson = variant === 'hut_crimson';
    const ribbonBg = isCrimson ? '#C8102E' : '#D62300';
    const bodyBg = isCrimson ? '#161618' : '#502314';
    const inputBg = isCrimson ? '#222226' : '#3d1a0f';
    const borderCol = isCrimson ? '#2f2f35' : '#6e3420';

    return (
      <footer className="mt-14 w-full">
        {/* Top Brand Social Ribbon */}
        <div style={{ backgroundColor: ribbonBg }} className="py-3.5 px-4 text-white">
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-center gap-4 text-xs font-bold">
            <span>Síguenos en nuestras redes sociales</span>
            <div className="flex items-center gap-2">
              <a
                href="/reservas"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-zinc-950 text-[11px] font-black hover:opacity-90 transition-opacity"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Reservar Mesa / Pedido</span>
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/20 hover:bg-black/30 text-white text-[11px] font-bold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Enlace copiado' : 'Compartir /reservas'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column Dark / Grill Body */}
        <div style={{ backgroundColor: bodyBg }} className="text-zinc-200 px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
            {/* Col 1: Contacto */}
            <div className="space-y-3">
              <h4 className="font-black text-white text-sm">Contacto y Atención al Cliente</h4>
              <ul className="space-y-2 text-zinc-300">
                {phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 opacity-80" />
                    <span>Teléfono: {phone}</span>
                  </li>
                )}
                {email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 opacity-80" />
                    <span className="truncate">{email}</span>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={onOpenClaim}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors mt-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Libro de Reclamaciones</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 2: Sobre Nosotros */}
            <div className="space-y-3">
              <h4 className="font-black text-white text-sm">Sobre Nosotros</h4>
              <ul className="space-y-2 text-zinc-300">
                <li>
                  <button type="button" onClick={onOpenJobs} className="hover:text-white hover:underline">
                    Trabaja con nosotros
                  </button>
                </li>
                <li>
                  <a href="/reservas" className="hover:text-white hover:underline">
                    Reservas y Eventos Corporativos
                  </a>
                </li>
                <li>
                  <button type="button" onClick={onOpenOrders} className="hover:text-white hover:underline">
                    Mis Pedidos y Comprobantes
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Políticas */}
            <div className="space-y-3">
              <h4 className="font-black text-white text-sm">Políticas y Términos</h4>
              <ul className="space-y-2 text-zinc-300">
                <li>
                  <button type="button" onClick={onOpenTerms} className="hover:text-white hover:underline">
                    Términos y condiciones de la web
                  </button>
                </li>
                <li>
                  <button type="button" onClick={onOpenReturns} className="hover:text-white hover:underline">
                    Cambios y devoluciones
                  </button>
                </li>
              </ul>
              <div className="pt-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                  URL de Reservas
                </span>
                <div className="flex items-center gap-1.5">
                  <code
                    style={{ backgroundColor: inputBg, borderColor: borderCol }}
                    className="flex-1 px-2 py-1 rounded border text-[10px] font-mono truncate text-zinc-200"
                  >
                    {reservationsUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{ backgroundColor: ribbonBg }}
                    className="px-2 py-1 rounded text-white text-[10px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Col 4: Newsletter Form */}
            <div className="space-y-3">
              <h4 className="font-black text-white text-sm">Recibe nuestras ofertas y novedades</h4>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Suscríbete para recibir promociones exclusivas y lanzamientos.
              </p>
              <form onSubmit={handleNewsletter} className="space-y-2">
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Tu nombre"
                  style={{ backgroundColor: inputBg, borderColor: borderCol }}
                  className="w-full px-3 py-2 rounded-lg border text-xs text-white placeholder:text-zinc-400"
                />
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  style={{ backgroundColor: inputBg, borderColor: borderCol }}
                  className="w-full px-3 py-2 rounded-lg border text-xs text-white placeholder:text-zinc-400"
                />
                <button
                  type="submit"
                  style={{ backgroundColor: ribbonBg }}
                  className="w-full py-2 px-3 rounded-lg text-white text-xs font-black flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Suscribirme</span>
                </button>
              </form>
            </div>
          </div>

          <div
            style={{ borderColor: borderCol }}
            className="max-w-[1400px] mx-auto mt-8 pt-5 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-400"
          >
            <span>
              © {new Date().getFullYear()} {brandName} {ruc ? `· RUC ${ruc}` : ''}
            </span>
            <span>Todos los derechos reservados</span>
          </div>
        </div>
      </footer>
    );
  }

  // =========================================================================
  // 2. PAPA FRESH & ELECTRIC BLUE: Editorial blanco limpio 4 columnas + CTA local + pagos
  // =========================================================================
  const isFresh = variant === 'papa_fresh';
  const primaryHex = isFresh ? '#00643C' : '#1C1B9E';

  return (
    <footer className="mt-14 bg-white text-zinc-700 border-t border-zinc-200 w-full">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
          {/* Col 1: Brand + Contact */}
          <div className="space-y-3">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              <span
                style={{ color: primaryHex }}
                className="font-black text-lg tracking-tight uppercase block"
              >
                {brandName}
              </span>
            )}
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Calidad artesanal en cada pedido. Delivery rápido, recojo en local y reservas online.
            </p>
            {phone && (
              <p className="flex items-center gap-1.5 font-bold text-zinc-800">
                <Phone className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                <span>{phone}</span>
              </p>
            )}
          </div>

          {/* Col 2: Nuestros Productos */}
          <div className="space-y-2.5">
            <h4 className="font-black text-zinc-950 text-xs uppercase tracking-wider">
              Nuestros Productos
            </h4>
            <ul className="space-y-2 text-zinc-600">
              <li>
                <a href="/" className="hover:underline">Promociones</a>
              </li>
              <li>
                <a href="/" className="hover:underline">Pizzas Artesanales</a>
              </li>
              <li>
                <a href="/" className="hover:underline">Combos Familiares</a>
              </li>
              <li>
                <a href="/reservas" className="hover:underline">Pedidos Programados y Eventos</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Ayuda + CTA */}
          <div className="space-y-2.5">
            <h4 className="font-black text-zinc-950 text-xs uppercase tracking-wider">Ayuda</h4>
            <ul className="space-y-2 text-zinc-600">
              <li>
                <button type="button" onClick={onOpenOrders} className="hover:underline">
                  Comprobantes y Mis Pedidos
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenTerms} className="hover:underline">
                  Términos y Condiciones
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenReturns} className="hover:underline">
                  Cambios y Devoluciones
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenJobs} className="hover:underline">
                  Trabaja con Nosotros
                </button>
              </li>
            </ul>
            <a
              href="/reservas"
              style={{ backgroundColor: primaryHex }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-[11px] font-black hover:opacity-90 transition-opacity"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Reservar Mesa / Pedido</span>
            </a>
          </div>

          {/* Col 4: Métodos de Pago + Reclamaciones + URL */}
          <div className="space-y-3">
            <div>
              <h4 className="font-black text-zinc-950 text-xs uppercase tracking-wider mb-2">
                Métodos de Pago
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {['VISA', 'Mastercard', 'Yape / Plin', 'Efectivo'].map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-700"
                  >
                    <CreditCard className="w-3 h-3 text-zinc-400" />
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenClaim}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 hover:border-zinc-400 text-zinc-800 font-bold transition-colors"
            >
              <BookOpen className="w-4 h-4" style={{ color: primaryHex }} />
              <span>Libro de Reclamaciones</span>
            </button>

            <div className="pt-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                Compartir página de reservas
              </span>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 px-2 py-1 rounded border border-zinc-200 bg-zinc-50 text-[10px] font-mono truncate text-zinc-700">
                  {reservationsUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{ backgroundColor: primaryHex }}
                  className="px-2.5 py-1 rounded text-white text-[10px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: primaryHex }} />
            © {new Date().getFullYear()} {brandName} {ruc ? `· RUC ${ruc}` : ''}
          </span>
          <span>Todos los derechos reservados</span>
        </div>
      </div>
    </footer>
  );
};
