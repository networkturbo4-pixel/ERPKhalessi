import {
  FooterBandConfig,
  FooterBrandWidgetConfig,
  FooterComplaintsBookWidgetConfig,
  FooterContactWidgetConfig,
  FooterCopyrightWidgetConfig,
  FooterCustomTextWidgetConfig,
  FooterLinkListWidgetConfig,
  FooterNewsletterWidgetConfig,
  FooterPaymentBadgesWidgetConfig,
  FooterReservationsCtaWidgetConfig,
  FooterSocialLinksWidgetConfig,
  FooterWidget,
  FooterWidgetType,
  StoreFooterConfig,
  StoreFooterTemplate,
  StoreFooterVariant,
} from '../types/storeBuilder';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createDefaultFooterWidget(type: FooterWidgetType): FooterWidget {
  const base = {
    id: uid(type),
    onlyMobile: false,
    onlyTablet: false,
    onlyDesktop: false,
    isHidden: false,
  };

  switch (type) {
    case 'footer_brand': {
      const w: FooterBrandWidgetConfig = {
        ...base,
        type: 'footer_brand',
        showBrandName: true,
        description:
          'Masa madre fermentada en frío, ingredientes seleccionados y despacho express directo de nuestro horno a tu mesa.',
        showRuc: true,
        logoHeightPx: 38,
      };
      return w;
    }
    case 'footer_link_list': {
      const w: FooterLinkListWidgetConfig = {
        ...base,
        type: 'footer_link_list',
        title: 'Explorar',
        includePublishedFooterPages: true,
        layout: 'vertical',
        items: [
          { id: uid('fl'), label: 'Carta Completa', actionType: 'home' },
          { id: uid('fl'), label: 'Promociones y Combos', actionType: 'promos' },
          { id: uid('fl'), label: 'Reservas de Mesa', actionType: 'reservations' },
          { id: uid('fl'), label: 'Club y Beneficios', actionType: 'benefits' },
        ],
      };
      return w;
    }
    case 'footer_contact': {
      const w: FooterContactWidgetConfig = {
        ...base,
        type: 'footer_contact',
        title: 'Atención y Sede',
        showAddress: true,
        showPhone: true,
        showWhatsapp: true,
        showEmail: true,
        showSchedule: true,
      };
      return w;
    }
    case 'footer_newsletter': {
      const w: FooterNewsletterWidgetConfig = {
        ...base,
        type: 'footer_newsletter',
        title: 'Recibe Cupones Exclusivos',
        description: 'Suscríbete para enterarte primero de 2x1, nuevos sabores y promos flash.',
        placeholder: 'tu@correo.com',
        buttonLabel: 'Suscribirme',
      };
      return w;
    }
    case 'footer_complaints_book': {
      const w: FooterComplaintsBookWidgetConfig = {
        ...base,
        type: 'footer_complaints_book',
        title: 'Libro de Reclamaciones',
        subtitle: 'Conforme al Código de Protección al Consumidor',
        style: 'card',
      };
      return w;
    }
    case 'footer_payment_badges': {
      const w: FooterPaymentBadgesWidgetConfig = {
        ...base,
        type: 'footer_payment_badges',
        title: 'Medios de Pago',
        methods: ['visa', 'mastercard', 'yape', 'plin', 'efectivo'],
        style: 'pills',
      };
      return w;
    }
    case 'footer_reservations_cta': {
      const w: FooterReservationsCtaWidgetConfig = {
        ...base,
        type: 'footer_reservations_cta',
        title: '¿Planeas una celebración o evento?',
        subtitle: 'Reserva tu mesa o cotiza pedidos corporativos al instante.',
        buttonLabel: 'Reservar Ahora',
        showShareButton: true,
      };
      return w;
    }
    case 'footer_social_links': {
      const w: FooterSocialLinksWidgetConfig = {
        ...base,
        type: 'footer_social_links',
        title: 'Síguenos',
        style: 'circle',
        items: [
          { id: uid('soc'), network: 'instagram', url: 'https://instagram.com' },
          { id: uid('soc'), network: 'facebook', url: 'https://facebook.com' },
          { id: uid('soc'), network: 'tiktok', url: 'https://tiktok.com' },
        ],
      };
      return w;
    }
    case 'footer_copyright': {
      const w: FooterCopyrightWidgetConfig = {
        ...base,
        type: 'footer_copyright',
        text: '© {year} {brand}. Todos los derechos reservados.',
        align: 'left',
      };
      return w;
    }
    case 'footer_custom_text': {
      const w: FooterCustomTextWidgetConfig = {
        ...base,
        type: 'footer_custom_text',
        title: 'Delivery Express',
        body: 'Cobertura en tiempo real y seguimiento de repartidor desde que sale del horno.',
        ctaLabel: 'Ver Carta',
        ctaUrl: '/',
        align: 'left',
      };
      return w;
    }
  }
}

function emptyBand(overrides: Partial<FooterBandConfig> = {}): FooterBandConfig {
  return {
    enabled: false,
    bgColor: '#0c0d12',
    textColor: '#e4e4e7',
    borderColor: '#27272a',
    showBorderTop: true,
    paddingY: 32,
    maxWidth: '1600px',
    columnsDesktop: 4,
    columns: { col1: [], col2: [], col3: [], col4: [] },
    ...overrides,
  };
}

export const FACTORY_FOOTER_TEMPLATES: StoreFooterTemplate[] = [
  {
    id: 'ftr-bento-dark',
    name: 'Corporativo Oscuro (Global)',
    description: 'Cinta superior de reservas + 4 columnas (Marca, Enlaces, Sede/Contacto, Newsletter & Reclamos) + barra legal.',
    bands: {
      ribbon: emptyBand({
        enabled: true,
        bgColor: '#18181b',
        textColor: '#ffffff',
        borderColor: '#27272a',
        showBorderTop: true,
        paddingY: 18,
        columnsDesktop: 1,
        columns: {
          col1: [
            {
              id: 'ft-bd-res',
              type: 'footer_reservations_cta',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: '¿Celebración, cumpleaños o pedido corporativo?',
              subtitle: 'Reserva mesa en cualquiera de nuestras sedes o programa tu pedido.',
              buttonLabel: 'Reservar Mesa',
              showShareButton: true,
            },
          ],
          col2: [],
          col3: [],
          col4: [],
        },
      }),
      main: emptyBand({
        enabled: true,
        bgColor: '#0b0c10',
        textColor: '#e4e4e7',
        borderColor: '#27272a',
        showBorderTop: true,
        paddingY: 44,
        columnsDesktop: 4,
        columns: {
          col1: [
            {
              id: 'ft-bd-brand',
              type: 'footer_brand',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              showBrandName: true,
              description:
                'Pizzas artesanales de masa madre horneadas a la piedra, ingredientes frescos y entrega express en tu zona.',
              showRuc: true,
              logoHeightPx: 40,
            },
            {
              id: 'ft-bd-soc',
              type: 'footer_social_links',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              style: 'circle',
              items: [
                { id: 'soc-ig', network: 'instagram', url: 'https://instagram.com' },
                { id: 'soc-fb', network: 'facebook', url: 'https://facebook.com' },
                { id: 'soc-tt', network: 'tiktok', url: 'https://tiktok.com' },
              ],
            },
          ],
          col2: [
            {
              id: 'ft-bd-links',
              type: 'footer_link_list',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Nuestra Tienda',
              includePublishedFooterPages: true,
              layout: 'vertical',
              items: [
                { id: 'fl-1', label: 'Carta Artesanal', actionType: 'home' },
                { id: 'fl-2', label: 'Combos y Promos', actionType: 'promos' },
                { id: 'fl-3', label: 'Reservas', actionType: 'reservations' },
                { id: 'fl-4', label: 'Club de Beneficios', actionType: 'benefits' },
              ],
            },
          ],
          col3: [
            {
              id: 'ft-bd-contact',
              type: 'footer_contact',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Sede y Atención',
              showAddress: true,
              showPhone: true,
              showWhatsapp: true,
              showEmail: true,
              showSchedule: true,
            },
          ],
          col4: [
            {
              id: 'ft-bd-news',
              type: 'footer_newsletter',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Cupones y Promos',
              description: 'Déjanos tu correo para recibir descuentos exclusivos.',
              placeholder: 'tu@correo.com',
              buttonLabel: 'Unirme',
            },
            {
              id: 'ft-bd-book',
              type: 'footer_complaints_book',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Libro de Reclamaciones',
              subtitle: 'Atención formal INDECOPI',
              style: 'card',
            },
          ],
        },
      }),
      bottom: emptyBand({
        enabled: true,
        bgColor: '#07080b',
        textColor: '#a1a1aa',
        borderColor: '#1f1f26',
        showBorderTop: true,
        paddingY: 16,
        columnsDesktop: 2,
        columns: {
          col1: [
            {
              id: 'ft-bd-copy',
              type: 'footer_copyright',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              text: '© {year} {brand}. Todos los derechos reservados.',
              align: 'left',
            },
          ],
          col2: [
            {
              id: 'ft-bd-pay',
              type: 'footer_payment_badges',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              methods: ['visa', 'mastercard', 'yape', 'plin', 'efectivo'],
              style: 'pills',
            },
          ],
          col3: [],
          col4: [],
        },
      }),
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ftr-crimson-ribbon',
    name: 'Carmesí Cadena (Cinta Roja)',
    description: 'Cinta superior roja llamativa + bloque carbón de 3 columnas + barra legal con medios de pago.',
    bands: {
      ribbon: emptyBand({
        enabled: true,
        bgColor: '#C8102E',
        textColor: '#ffffff',
        showBorderTop: false,
        paddingY: 14,
        columnsDesktop: 1,
        columns: {
          col1: [
            {
              id: 'ft-cr-txt',
              type: 'footer_custom_text',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              body: '🔥 Pide directo en nuestra web oficial y acumula puntos en cada compra · Sin sobrecargos de apps.',
              ctaLabel: 'Ver Combos',
              ctaUrl: '#combos',
              align: 'center',
            },
          ],
          col2: [],
          col3: [],
          col4: [],
        },
      }),
      main: emptyBand({
        enabled: true,
        bgColor: '#141417',
        textColor: '#f4f4f5',
        borderColor: '#27272a',
        showBorderTop: false,
        paddingY: 40,
        columnsDesktop: 3,
        columns: {
          col1: [
            {
              id: 'ft-cr-brand',
              type: 'footer_brand',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              showBrandName: true,
              description: 'Sabor intenso recién salido del horno con delivery rápido y promociones todos los días.',
              showRuc: true,
              logoHeightPx: 38,
            },
          ],
          col2: [
            {
              id: 'ft-cr-links',
              type: 'footer_link_list',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Accesos Rápidos',
              includePublishedFooterPages: true,
              layout: 'vertical',
              items: [
                { id: 'fcr-1', label: 'Carta', actionType: 'home' },
                { id: 'fcr-2', label: 'Promociones', actionType: 'promos' },
                { id: 'fcr-3', label: 'Reservas', actionType: 'reservations' },
                { id: 'fcr-4', label: 'Beneficios', actionType: 'benefits' },
              ],
            },
          ],
          col3: [
            {
              id: 'ft-cr-contact',
              type: 'footer_contact',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Contáctanos',
              showAddress: true,
              showPhone: true,
              showWhatsapp: true,
              showEmail: false,
              showSchedule: true,
            },
            {
              id: 'ft-cr-book',
              type: 'footer_complaints_book',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Libro de Reclamaciones',
              subtitle: 'Registro virtual INDECOPI',
              style: 'pill',
            },
          ],
          col4: [],
        },
      }),
      bottom: emptyBand({
        enabled: true,
        bgColor: '#0b0b0e',
        textColor: '#a1a1aa',
        borderColor: '#222228',
        showBorderTop: true,
        paddingY: 16,
        columnsDesktop: 2,
        columns: {
          col1: [
            {
              id: 'ft-cr-copy',
              type: 'footer_copyright',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              text: '© {year} {brand}. Todos los derechos reservados.',
              align: 'left',
            },
          ],
          col2: [
            {
              id: 'ft-cr-pay',
              type: 'footer_payment_badges',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              methods: ['visa', 'mastercard', 'yape', 'plin', 'culqi'],
              style: 'pills',
            },
          ],
          col3: [],
          col4: [],
        },
      }),
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ftr-editorial-light',
    name: 'Editorial Claro Minimalista',
    description: 'Footer limpio sobre fondo blanco ideal para temas luminosos y boutiques.',
    bands: {
      ribbon: emptyBand({ enabled: false }),
      main: emptyBand({
        enabled: true,
        bgColor: '#ffffff',
        textColor: '#18181b',
        borderColor: '#e4e4e7',
        showBorderTop: true,
        paddingY: 40,
        columnsDesktop: 3,
        columns: {
          col1: [
            {
              id: 'ft-el-brand',
              type: 'footer_brand',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              showBrandName: true,
              description: 'Cocina artesanal, ingredientes de origen y atención cálida en salón o delivery.',
              showRuc: true,
              logoHeightPx: 36,
            },
          ],
          col2: [
            {
              id: 'ft-el-links',
              type: 'footer_link_list',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Menú y Legal',
              includePublishedFooterPages: true,
              layout: 'vertical',
              items: [
                { id: 'fel-1', label: 'Carta', actionType: 'home' },
                { id: 'fel-2', label: 'Reservas', actionType: 'reservations' },
                { id: 'fel-3', label: 'Beneficios', actionType: 'benefits' },
              ],
            },
          ],
          col3: [
            {
              id: 'ft-el-contact',
              type: 'footer_contact',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Ubicación y Horario',
              showAddress: true,
              showPhone: true,
              showWhatsapp: true,
              showEmail: true,
              showSchedule: true,
            },
          ],
          col4: [],
        },
      }),
      bottom: emptyBand({
        enabled: true,
        bgColor: '#fafafa',
        textColor: '#52525b',
        borderColor: '#e4e4e7',
        showBorderTop: true,
        paddingY: 16,
        columnsDesktop: 2,
        columns: {
          col1: [
            {
              id: 'ft-el-copy',
              type: 'footer_copyright',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              text: '© {year} {brand}. Todos los derechos reservados.',
              align: 'left',
            },
          ],
          col2: [
            {
              id: 'ft-el-book',
              type: 'footer_complaints_book',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              title: 'Libro de Reclamaciones',
              subtitle: '',
              style: 'minimal',
            },
          ],
          col3: [],
          col4: [],
        },
      }),
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export function convertPresetToFooterTemplate(
  variant: StoreFooterVariant,
  config?: StoreFooterConfig,
  customName?: string
): StoreFooterTemplate {
  const now = new Date().toISOString();
  const base =
    variant === 'hut_crimson' || variant === 'flame_grill'
      ? structuredClone(FACTORY_FOOTER_TEMPLATES[1])
      : variant === 'papa_fresh' || variant === 'electric_blue'
      ? structuredClone(FACTORY_FOOTER_TEMPLATES[2])
      : structuredClone(FACTORY_FOOTER_TEMPLATES[0]);

  const palette: Record<
    StoreFooterVariant,
    { ribbonBg: string; ribbonText: string; bg: string; text: string; label: string }
  > = {
    default: {
      ribbonBg: '#18181b',
      ribbonText: '#ffffff',
      bg: '#0b0c10',
      text: '#e4e4e7',
      label: 'Footer Estándar (Editable)',
    },
    hut_crimson: {
      ribbonBg: '#C8102E',
      ribbonText: '#ffffff',
      bg: '#141417',
      text: '#f4f4f5',
      label: 'Footer Hut Carmesí (Editable)',
    },
    papa_fresh: {
      ribbonBg: '#15803d',
      ribbonText: '#ffffff',
      bg: '#ffffff',
      text: '#14532d',
      label: 'Footer Papa Fresh (Editable)',
    },
    flame_grill: {
      ribbonBg: '#D62300',
      ribbonText: '#ffffff',
      bg: '#2b160d',
      text: '#f5ebdc',
      label: 'Footer Flame Grill (Editable)',
    },
    electric_blue: {
      ribbonBg: '#006491',
      ribbonText: '#ffffff',
      bg: '#ffffff',
      text: '#0f172a',
      label: 'Footer Electric Blue (Editable)',
    },
  };

  const p = palette[variant] || palette.default;
  base.id = uid('ftr');
  base.name = customName?.trim() || p.label;
  base.description = `Convertido desde el diseño preset "${variant}".`;
  base.bands.ribbon.bgColor = config?.ribbonBgColor || p.ribbonBg;
  base.bands.ribbon.textColor = config?.ribbonTextColor || p.ribbonText;
  if (config?.showRibbon !== undefined) {
    base.bands.ribbon.enabled = config.showRibbon;
  }
  base.bands.main.bgColor = config?.bgColor || p.bg;
  base.bands.main.textColor = config?.textColor || p.text;
  base.createdAt = now;
  base.updatedAt = now;

  return base;
}
