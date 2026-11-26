import React, { useState } from 'react';
import {
  BookOpenCheck,
  CalendarClock,
  Clock,
  CreditCard,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Share2,
} from 'lucide-react';
import {
  BuilderViewport,
  CustomPage,
  FooterLinkItem,
  FooterWidget,
  isBlockVisibleOnViewport,
} from '../../types/storeBuilder';

export interface FooterRuntimeContext {
  viewport: BuilderViewport;
  accentColor: string;
  logoUrl?: string;
  collapsedLogo?: string;
  brandName: string;
  legalName?: string;
  ruc?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  schedule?: string;
  publishedFooterPages: CustomPage[];
  isBuilderEditing?: boolean;
  selectedWidgetId?: string | null;
  onSelectWidget?: (widgetId: string) => void;
  onGoHome?: () => void;
  onSelectCategory?: (cat: string) => void;
  onOpenOrders?: () => void;
  onOpenBenefits?: () => void;
  onOpenComplaintsBook: () => void;
  onNotify: (title: string, message: string, tone?: 'success' | 'info' | 'warning') => void;
}

const PAYMENT_LABELS: Record<
  'visa' | 'mastercard' | 'yape' | 'plin' | 'efectivo' | 'culqi',
  string
> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  yape: 'Yape',
  plin: 'Plin',
  efectivo: 'Efectivo',
  culqi: 'Culqi',
};

const SOCIAL_LABELS: Record<'instagram' | 'facebook' | 'tiktok' | 'whatsapp' | 'web', string> = {
  instagram: 'IG',
  facebook: 'FB',
  tiktok: 'TT',
  whatsapp: 'WA',
  web: 'WEB',
};

const NewsletterWidgetView: React.FC<{
  widget: Extract<FooterWidget, { type: 'footer_newsletter' }>;
  ctx: FooterRuntimeContext;
}> = ({ widget, ctx }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ctx.isBuilderEditing) return;
    if (!email.trim() || !email.includes('@')) {
      ctx.onNotify('Correo inválido', 'Ingresa un correo electrónico válido para suscribirte.', 'warning');
      return;
    }
    setEmail('');
    ctx.onNotify('¡Suscripción confirmada!', 'Recibirás nuestras mejores promos y cupones.', 'success');
  };

  const hasBox = Boolean(widget.bgColor || widget.borderColor);
  return (
    <div
      style={{
        backgroundColor: widget.bgColor || undefined,
        borderColor: widget.borderColor || undefined,
        color: widget.textColor || undefined,
      }}
      className={`space-y-2.5 ${hasBox ? 'p-3.5 rounded-2xl border' : ''}`}
    >
      {widget.title && (
        <h4
          style={{ color: widget.titleColor || undefined }}
          className="text-xs font-black uppercase tracking-wider"
        >
          {widget.title}
        </h4>
      )}
      {widget.description && <p className="text-xs opacity-80 leading-relaxed">{widget.description}</p>}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={widget.placeholder || 'tu@correo.com'}
          disabled={ctx.isBuilderEditing}
          style={{
            backgroundColor: widget.inputBgColor || undefined,
            color: widget.inputTextColor || undefined,
            borderColor: widget.inputBorderColor || undefined,
          }}
          className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-xs placeholder:opacity-55 focus:outline-none focus:border-amber-500 ${
            !widget.inputBgColor ? 'bg-current/[0.06]' : ''
          } ${!widget.inputBorderColor ? 'border-current/15' : ''}`}
        />
        <button
          type="submit"
          style={{
            backgroundColor: widget.accentColor || ctx.accentColor,
            color: widget.buttonTextColor || '#ffffff',
          }}
          className="px-3.5 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{widget.buttonLabel || 'Unirme'}</span>
        </button>
      </form>
    </div>
  );
};

export const FooterWidgetRenderer: React.FC<{
  widget: FooterWidget;
  ctx: FooterRuntimeContext;
}> = ({ widget, ctx }) => {
  if (widget.isHidden && !ctx.isBuilderEditing) return null;
  if (!isBlockVisibleOnViewport(widget, ctx.viewport)) return null;

  const isSelected = Boolean(ctx.isBuilderEditing && ctx.selectedWidgetId === widget.id);

  const wrap = (content: React.ReactNode) => {
    if (!ctx.isBuilderEditing) return <div className="min-w-0">{content}</div>;
    return (
      <div
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          ctx.onSelectWidget?.(widget.id);
        }}
        title="Clic para editar este widget de footer"
        className={`relative min-w-0 cursor-pointer rounded-xl p-1 -m-1 transition-all ${
          widget.isHidden ? 'opacity-40' : ''
        } ${
          isSelected
            ? 'ring-2 ring-amber-400 bg-amber-400/5'
            : 'hover:ring-1 hover:ring-amber-400/50'
        }`}
      >
        {content}
      </div>
    );
  };

  const handleLinkAction = (item: FooterLinkItem) => {
    if (ctx.isBuilderEditing) return;
    switch (item.actionType) {
      case 'home':
        if (ctx.onGoHome) ctx.onGoHome();
        else window.location.assign('/');
        break;
      case 'category':
        if (ctx.onSelectCategory) ctx.onSelectCategory(item.targetValue || 'todos');
        else window.location.assign('/');
        break;
      case 'promos':
        if (ctx.onSelectCategory) ctx.onSelectCategory('combos');
        else window.location.assign('/');
        break;
      case 'reservations':
        window.location.assign('/reservas');
        break;
      case 'orders':
        ctx.onOpenOrders?.();
        break;
      case 'benefits':
        ctx.onOpenBenefits?.();
        break;
      case 'custom_page':
        if (item.targetValue) {
          window.location.assign(`/p/${item.targetValue.replace(/^\/p\//, '')}`);
        }
        break;
      case 'url':
        if (item.targetValue) {
          if (item.openInNewTab) {
            window.open(item.targetValue, '_blank', 'noopener,noreferrer');
          } else {
            window.location.assign(item.targetValue);
          }
        }
        break;
    }
  };

  switch (widget.type) {
    case 'footer_brand': {
      const logoSrc = widget.customLogoUrl?.trim() || ctx.logoUrl;
      const hasBox = Boolean(widget.bgColor || widget.borderColor);
      return wrap(
        <div
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`space-y-2.5 ${hasBox ? 'p-3.5 rounded-2xl border' : ''}`}
        >
          <div className="flex items-center gap-2.5">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={ctx.brandName}
                style={{ height: `${widget.logoHeightPx || 38}px` }}
                className="w-auto max-w-[180px] object-contain"
              />
            ) : (
              <span
                style={{ backgroundColor: widget.accentColor || ctx.accentColor }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg shrink-0"
              >
                {ctx.collapsedLogo || '🍕'}
              </span>
            )}
            {widget.showBrandName && (
              <span
                style={{ color: widget.titleColor || undefined }}
                className="font-black text-base tracking-tight"
              >
                {ctx.brandName}
              </span>
            )}
          </div>
          {widget.description && (
            <p className="text-xs opacity-75 leading-relaxed max-w-sm">{widget.description}</p>
          )}
          {widget.showRuc && (ctx.ruc || ctx.legalName) && (
            <p className="text-[11px] opacity-60 font-medium">
              {ctx.legalName ? `${ctx.legalName}` : ''}
              {ctx.legalName && ctx.ruc ? ' · ' : ''}
              {ctx.ruc ? `RUC ${ctx.ruc}` : ''}
            </p>
          )}
        </div>
      );
    }

    case 'footer_link_list': {
      const autoPages: FooterLinkItem[] = widget.includePublishedFooterPages
        ? ctx.publishedFooterPages
            .filter(p => p.status === 'published' && p.showInStoreFooter)
            .map(p => ({
              id: `auto-ftr-${p.id}`,
              label: p.navLabel?.trim() || p.title,
              actionType: 'custom_page' as const,
              targetValue: p.slug,
            }))
        : [];
      const allItems = [...widget.items, ...autoPages];
      const hasBox = Boolean(widget.bgColor || widget.borderColor);

      return wrap(
        <div
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`space-y-2.5 ${hasBox ? 'p-3.5 rounded-2xl border' : ''}`}
        >
          {widget.title && (
            <h4
              style={{ color: widget.titleColor || undefined }}
              className="text-xs font-black uppercase tracking-wider"
            >
              {widget.title}
            </h4>
          )}
          <ul
            className={
              widget.layout === 'inline'
                ? 'flex flex-wrap items-center gap-x-4 gap-y-1.5'
                : 'space-y-1.5'
            }
          >
            {allItems.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleLinkAction(item)}
                  className="text-xs opacity-80 hover:opacity-100 hover:underline underline-offset-4 transition-opacity text-left"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case 'footer_contact': {
      const hasBox = Boolean(widget.bgColor || widget.borderColor);
      const iconClr = widget.iconColor || ctx.accentColor;
      return wrap(
        <div
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`space-y-2.5 ${hasBox ? 'p-3.5 rounded-2xl border' : ''}`}
        >
          {widget.title && (
            <h4
              style={{ color: widget.titleColor || undefined }}
              className="text-xs font-black uppercase tracking-wider"
            >
              {widget.title}
            </h4>
          )}
          <div className="space-y-2 text-xs opacity-85">
            {widget.showAddress && ctx.address && (
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: iconClr }} />
                <span>{ctx.address}</span>
              </p>
            )}
            {widget.showSchedule && ctx.schedule && (
              <p className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: iconClr }} />
                <span>{ctx.schedule}</span>
              </p>
            )}
            {widget.showPhone && ctx.phone && (
              <a
                href={`tel:${ctx.phone.replace(/[^\d+]/g, '')}`}
                onClick={e => ctx.isBuilderEditing && e.preventDefault()}
                className="flex items-center gap-2 hover:opacity-100"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: iconClr }} />
                <span>{ctx.phone}</span>
              </a>
            )}
            {widget.showWhatsapp && (ctx.whatsapp || ctx.phone) && (
              <a
                href={`https://wa.me/${(ctx.whatsapp || ctx.phone || '').replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => ctx.isBuilderEditing && e.preventDefault()}
                className="flex items-center gap-2 hover:opacity-100"
              >
                <MessageCircle
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: widget.iconColor || '#10b981' }}
                />
                <span>WhatsApp Directo</span>
              </a>
            )}
            {widget.showEmail && ctx.email && (
              <a
                href={`mailto:${ctx.email}`}
                onClick={e => ctx.isBuilderEditing && e.preventDefault()}
                className="flex items-center gap-2 hover:opacity-100"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: iconClr }} />
                <span className="truncate">{ctx.email}</span>
              </a>
            )}
          </div>
        </div>
      );
    }

    case 'footer_newsletter':
      return wrap(<NewsletterWidgetView widget={widget} ctx={ctx} />);

    case 'footer_complaints_book': {
      const iconClr = widget.iconColor || ctx.accentColor;
      if (widget.style === 'minimal') {
        return wrap(
          <button
            type="button"
            onClick={() => !ctx.isBuilderEditing && ctx.onOpenComplaintsBook()}
            style={{ color: widget.textColor || undefined }}
            className="inline-flex items-center gap-1.5 text-xs font-bold opacity-85 hover:opacity-100 underline underline-offset-4"
          >
            <BookOpenCheck className="w-4 h-4 shrink-0" style={{ color: iconClr }} />
            <span>{widget.title || 'Libro de Reclamaciones'}</span>
          </button>
        );
      }

      if (widget.style === 'pill') {
        return wrap(
          <button
            type="button"
            onClick={() => !ctx.isBuilderEditing && ctx.onOpenComplaintsBook()}
            style={{
              backgroundColor: widget.bgColor || undefined,
              borderColor: widget.borderColor || undefined,
              color: widget.textColor || undefined,
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-bold transition-colors ${
              !widget.bgColor ? 'bg-current/[0.05] hover:bg-current/[0.1]' : 'hover:opacity-90'
            } ${!widget.borderColor ? 'border-current/20' : ''}`}
          >
            <BookOpenCheck className="w-4 h-4 shrink-0" style={{ color: iconClr }} />
            <span>{widget.title || 'Libro de Reclamaciones'}</span>
          </button>
        );
      }

      return wrap(
        <button
          type="button"
          onClick={() => !ctx.isBuilderEditing && ctx.onOpenComplaintsBook()}
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left transition-colors ${
            !widget.bgColor ? 'bg-current/[0.04] hover:bg-current/[0.08]' : 'hover:opacity-95'
          } ${!widget.borderColor ? 'border-current/15' : ''}`}
        >
          <span
            style={{
              backgroundColor: widget.iconBgColor || `${iconClr}22`,
              color: iconClr,
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          >
            <BookOpenCheck className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black truncate">
              {widget.title || 'Libro de Reclamaciones'}
            </span>
            {widget.subtitle && (
              <span className="block text-[10px] opacity-75 truncate">{widget.subtitle}</span>
            )}
          </span>
        </button>
      );
    }

    case 'footer_payment_badges':
      return wrap(
        <div
          style={{ backgroundColor: widget.bgColor || undefined }}
          className={`space-y-1.5 ${widget.bgColor ? 'p-3 rounded-xl' : ''}`}
        >
          {widget.title && (
            <span
              style={{ color: widget.titleColor || undefined }}
              className="block text-[10px] font-bold uppercase tracking-wider opacity-75"
            >
              {widget.title}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {widget.methods.map(m => (
              <span
                key={m}
                style={{
                  backgroundColor: widget.badgeBgColor || undefined,
                  color: widget.badgeTextColor || undefined,
                  borderColor: widget.badgeBorderColor || undefined,
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide ${
                  widget.style === 'outline' || widget.badgeBorderColor
                    ? 'border'
                    : ''
                } ${!widget.badgeBorderColor && widget.style === 'outline' ? 'border-current/25' : ''} ${
                  !widget.badgeBgColor && widget.style !== 'outline' ? 'bg-current/10' : ''
                }`}
              >
                <CreditCard className="w-3 h-3 opacity-75" />
                <span>{PAYMENT_LABELS[m]}</span>
              </span>
            ))}
          </div>
        </div>
      );

    case 'footer_reservations_cta': {
      const shareUrl = `${window.location.origin}/reservas`;
      const btnBg = widget.accentColor || ctx.accentColor;
      const iconClr = widget.iconColor || btnBg;
      const hasBox = Boolean(widget.bgColor || widget.borderColor);
      return wrap(
        <div
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            hasBox ? 'p-3.5 rounded-2xl border' : ''
          }`}
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span
              style={{
                backgroundColor: widget.iconBgColor || `${iconClr}24`,
                color: iconClr,
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            >
              <CalendarClock className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight">{widget.title}</p>
              {widget.subtitle && <p className="text-xs opacity-75 mt-0.5">{widget.subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/reservas"
              onClick={e => ctx.isBuilderEditing && e.preventDefault()}
              style={{
                backgroundColor: btnBg,
                color: widget.buttonTextColor || '#ffffff',
              }}
              className="px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap hover:opacity-90 transition-opacity"
            >
              {widget.buttonLabel || 'Reservar'}
            </a>
            {widget.showShareButton && (
              <button
                type="button"
                onClick={() => {
                  if (ctx.isBuilderEditing) return;
                  navigator.clipboard?.writeText(shareUrl).catch(() => {});
                  ctx.onNotify('Enlace Copiado', 'Link de reservas listo para compartir.', 'info');
                }}
                style={{ borderColor: widget.borderColor || undefined }}
                className="p-2 rounded-xl border border-current/20 hover:bg-current/10 transition-colors"
                title="Copiar enlace de reservas"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      );
    }

    case 'footer_social_links':
      return wrap(
        <div className="space-y-2">
          {widget.title && (
            <h4
              style={{ color: widget.titleColor || undefined }}
              className="text-xs font-black uppercase tracking-wider"
            >
              {widget.title}
            </h4>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {widget.items.map(item => (
              <a
                key={item.id}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => ctx.isBuilderEditing && e.preventDefault()}
                style={{
                  backgroundColor: widget.badgeBgColor || undefined,
                  color: widget.badgeTextColor || undefined,
                  borderColor: widget.badgeBorderColor || undefined,
                }}
                className={`${widget.badgeBorderColor ? 'border ' : ''}${
                  widget.style === 'pill'
                    ? `px-3 py-1.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                        !widget.badgeBgColor ? 'bg-current/10 hover:bg-current/20' : 'hover:opacity-90'
                      }`
                    : `w-9 h-9 rounded-full text-[11px] font-black flex items-center justify-center transition-colors ${
                        !widget.badgeBgColor ? 'bg-current/10 hover:bg-current/20' : 'hover:opacity-90'
                      }`
                }`}
                title={item.network}
              >
                {item.network === 'web' ? (
                  <Globe className="w-3.5 h-3.5" />
                ) : (
                  <span>{SOCIAL_LABELS[item.network]}</span>
                )}
                {widget.style === 'pill' && <ExternalLink className="w-3 h-3 opacity-70" />}
              </a>
            ))}
          </div>
        </div>
      );

    case 'footer_copyright': {
      const year = String(new Date().getFullYear());
      const resolved = (widget.text || '© {year} {brand}.')
        .replace(/\{year\}/g, year)
        .replace(/\{brand\}/g, ctx.brandName);
      const alignCls =
        widget.align === 'center'
          ? 'text-center'
          : widget.align === 'right'
          ? 'text-right'
          : 'text-left';
      return wrap(
        <p
          style={{
            backgroundColor: widget.bgColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`text-xs opacity-80 ${alignCls} ${widget.bgColor ? 'px-3 py-1.5 rounded-lg' : ''}`}
        >
          {resolved}
        </p>
      );
    }

    case 'footer_custom_text': {
      const alignCls =
        widget.align === 'center'
          ? 'text-center items-center'
          : widget.align === 'right'
          ? 'text-right items-end'
          : 'text-left items-start';
      const hasBox = Boolean(widget.bgColor || widget.borderColor);
      return wrap(
        <div
          style={{
            backgroundColor: widget.bgColor || undefined,
            borderColor: widget.borderColor || undefined,
            color: widget.textColor || undefined,
          }}
          className={`flex flex-col gap-1.5 ${alignCls} ${hasBox ? 'p-3.5 rounded-2xl border' : ''}`}
        >
          {widget.title && (
            <h4
              style={{ color: widget.titleColor || undefined }}
              className="text-xs font-black uppercase tracking-wider"
            >
              {widget.title}
            </h4>
          )}
          {widget.body && <p className="text-xs opacity-85 leading-relaxed">{widget.body}</p>}
          {widget.ctaLabel?.trim() && widget.ctaUrl?.trim() && (
            <a
              href={widget.ctaUrl}
              onClick={e => ctx.isBuilderEditing && e.preventDefault()}
              style={{
                backgroundColor: widget.ctaBgColor || undefined,
                color: widget.ctaTextColor || undefined,
              }}
              className={
                widget.ctaBgColor
                  ? 'px-3 py-1.5 rounded-xl text-xs font-black hover:opacity-90 mt-1 inline-block'
                  : 'text-xs font-black underline underline-offset-4 hover:opacity-80 mt-0.5'
              }
            >
              {widget.ctaLabel}
            </a>
          )}
        </div>
      );
    }
  }
};
