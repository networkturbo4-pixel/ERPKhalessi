import {
  HeaderAccountWidgetConfig,
  HeaderAnnouncementWidgetConfig,
  HeaderCartWidgetConfig,
  HeaderContactWidgetConfig,
  HeaderDividerWidgetConfig,
  HeaderLocationWidgetConfig,
  HeaderLogoWidgetConfig,
  HeaderMobileTriggerWidgetConfig,
  HeaderNavMenuWidgetConfig,
  HeaderOpenStatusWidgetConfig,
  HeaderQuickActionsWidgetConfig,
  HeaderRowConfig,
  HeaderSearchWidgetConfig,
  HeaderWidget,
  HeaderWidgetType,
  StoreHeaderConfig,
  StoreHeaderTemplate,
  StoreHeaderVariant,
} from '../types/storeBuilder';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createDefaultHeaderWidget(type: HeaderWidgetType): HeaderWidget {
  const base = {
    id: uid(type),
    onlyMobile: false,
    onlyTablet: false,
    onlyDesktop: false,
    isHidden: false,
  };

  switch (type) {
    case 'header_logo': {
      const w: HeaderLogoWidgetConfig = {
        ...base,
        type: 'header_logo',
        showBrandText: true,
        showSeasonalBadge: true,
        heightMobile: 30,
        heightTablet: 34,
        heightDesktop: 38,
      };
      return w;
    }
    case 'header_nav_menu': {
      const w: HeaderNavMenuWidgetConfig = {
        ...base,
        type: 'header_nav_menu',
        style: 'inline',
        includePublishedPages: true,
        gapPx: 18,
        fontSizePx: 13,
        items: [
          { id: uid('nav'), label: 'Carta', actionType: 'home' },
          { id: uid('nav'), label: 'Promociones', actionType: 'promos', highlight: true },
          { id: uid('nav'), label: 'Reservas', actionType: 'reservations' },
          { id: uid('nav'), label: 'Beneficios', actionType: 'benefits' },
        ],
      };
      return w;
    }
    case 'header_search': {
      const w: HeaderSearchWidgetConfig = {
        ...base,
        type: 'header_search',
        style: 'pill_white',
        placeholder: 'Buscar pizzas, combos, bebidas...',
        maxWidthPx: 420,
      };
      return w;
    }
    case 'header_location': {
      const w: HeaderLocationWidgetConfig = {
        ...base,
        type: 'header_location',
        style: 'pill_compact',
        showEta: true,
      };
      return w;
    }
    case 'header_cart': {
      const w: HeaderCartWidgetConfig = {
        ...base,
        type: 'header_cart',
        style: 'pill_full',
        showTotalAmount: true,
        showItemCount: true,
      };
      return w;
    }
    case 'header_account': {
      const w: HeaderAccountWidgetConfig = {
        ...base,
        type: 'header_account',
        style: 'pill',
        loginLabel: 'Identifícate',
        showCustomerName: true,
      };
      return w;
    }
    case 'header_announcement': {
      const w: HeaderAnnouncementWidgetConfig = {
        ...base,
        type: 'header_announcement',
        messages: [
          'Delivery gratis en pedidos desde S/ 49 · Recién salido del horno',
          'Acumula puntos en cada compra y canjea pizzas gratis',
        ],
        rotateSeconds: 5,
        icon: 'flame',
        ctaLabel: 'Ver Combos',
        ctaUrl: '#combos',
        dismissible: false,
      };
      return w;
    }
    case 'header_mobile_trigger': {
      const w: HeaderMobileTriggerWidgetConfig = {
        ...base,
        type: 'header_mobile_trigger',
        onlyMobile: true,
        onlyTablet: true,
        onlyDesktop: false,
        style: 'icon',
        label: 'Menú',
      };
      return w;
    }
    case 'header_open_status': {
      const w: HeaderOpenStatusWidgetConfig = {
        ...base,
        type: 'header_open_status',
        openLabel: 'Abierto ahora',
        closedLabel: 'Cerrado',
        showHours: true,
        style: 'pill',
      };
      return w;
    }
    case 'header_contact': {
      const w: HeaderContactWidgetConfig = {
        ...base,
        type: 'header_contact',
        mode: 'phone',
        topLabel: 'Llámanos',
        style: 'inline',
      };
      return w;
    }
    case 'header_quick_actions': {
      const w: HeaderQuickActionsWidgetConfig = {
        ...base,
        type: 'header_quick_actions',
        showOrders: true,
        showBenefits: true,
        showReservations: false,
        showBuilderShortcut: true,
        style: 'icons',
      };
      return w;
    }
    case 'header_divider': {
      const w: HeaderDividerWidgetConfig = {
        ...base,
        type: 'header_divider',
        mode: 'line',
        heightPx: 22,
        widthPx: 1,
      };
      return w;
    }
  }
}

function emptyRow(overrides: Partial<HeaderRowConfig> = {}): HeaderRowConfig {
  return {
    enabled: false,
    sticky: false,
    bgColor: '#111318',
    textColor: '#ffffff',
    borderColor: '#27272a',
    showBorderBottom: false,
    blurGlass: false,
    heightPx: 40,
    paddingX: 20,
    maxWidth: '1600px',
    zones: { left: [], center: [], right: [] },
    ...overrides,
  };
}

export const FACTORY_HEADER_TEMPLATES: StoreHeaderTemplate[] = [
  {
    id: 'hdr-classic-delivery',
    name: 'Clásica Delivery (Global)',
    description: 'Barra superior de anuncios + barra principal limpia con logo, ubicación/ETA, buscador, cuenta y carrito.',
    rows: {
      top: emptyRow({
        enabled: true,
        bgColor: '#18181b',
        textColor: '#f4f4f5',
        heightPx: 34,
        zones: {
          left: [
            {
              id: 'hd-cd-status',
              type: 'header_open_status',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              openLabel: 'Abierto',
              closedLabel: 'Cerrado',
              showHours: true,
              style: 'dot_minimal',
            },
          ],
          center: [
            {
              id: 'hd-cd-ann',
              type: 'header_announcement',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              messages: [
                'Envío express recién salido del horno · Pide en línea sin comisiones',
                'Acumula sellos digitales y gana pizzas gratis en nuestro Club',
              ],
              rotateSeconds: 6,
              icon: 'flame',
              dismissible: false,
            },
          ],
          right: [
            {
              id: 'hd-cd-contact',
              type: 'header_contact',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              mode: 'phone',
              topLabel: 'Pedidos',
              style: 'inline',
            },
          ],
        },
      }),
      main: emptyRow({
        enabled: true,
        sticky: true,
        bgColor: '#ffffff',
        textColor: '#18181b',
        borderColor: '#e4e4e7',
        showBorderBottom: true,
        heightPx: 66,
        zones: {
          left: [
            {
              id: 'hd-cd-mob',
              type: 'header_mobile_trigger',
              onlyMobile: true,
              onlyTablet: true,
              onlyDesktop: false,
              style: 'icon',
            },
            {
              id: 'hd-cd-logo',
              type: 'header_logo',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              showBrandText: true,
              showSeasonalBadge: true,
              heightMobile: 30,
              heightTablet: 34,
              heightDesktop: 38,
            },
            {
              id: 'hd-cd-div',
              type: 'header_divider',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              mode: 'line',
              heightPx: 24,
              widthPx: 1,
            },
            {
              id: 'hd-cd-loc',
              type: 'header_location',
              onlyMobile: false,
              onlyTablet: true,
              onlyDesktop: true,
              style: 'card_eta',
              showEta: true,
            },
          ],
          center: [
            {
              id: 'hd-cd-nav',
              type: 'header_nav_menu',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              style: 'inline',
              includePublishedPages: true,
              gapPx: 20,
              fontSizePx: 13,
              items: [
                { id: 'n-carta', label: 'Carta', actionType: 'home' },
                { id: 'n-promos', label: 'Promociones', actionType: 'promos', highlight: true },
                { id: 'n-reservas', label: 'Reservas', actionType: 'reservations' },
                { id: 'n-beneficios', label: 'Beneficios', actionType: 'benefits' },
              ],
            },
          ],
          right: [
            {
              id: 'hd-cd-search',
              type: 'header_search',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              style: 'icon_only',
              placeholder: 'Buscar pizzas, combos...',
              maxWidthPx: 280,
            },
            {
              id: 'hd-cd-quick',
              type: 'header_quick_actions',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              showOrders: true,
              showBenefits: false,
              showReservations: false,
              showBuilderShortcut: true,
              style: 'icons',
            },
            {
              id: 'hd-cd-acc',
              type: 'header_account',
              onlyMobile: false,
              onlyTablet: true,
              onlyDesktop: true,
              style: 'pill',
              loginLabel: 'Ingresar',
              showCustomerName: true,
            },
            {
              id: 'hd-cd-cart',
              type: 'header_cart',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              style: 'pill_full',
              showTotalAmount: true,
              showItemCount: true,
            },
          ],
        },
      }),
      sub: emptyRow({
        enabled: false,
        bgColor: '#fafafa',
        textColor: '#27272a',
        borderColor: '#e4e4e7',
        showBorderBottom: true,
        heightPx: 42,
      }),
    },
    mobileDrawer: {
      bgColor: '#ffffff',
      textColor: '#18181b',
      showSearch: true,
      showLocation: true,
      showAccount: true,
      showContact: true,
      showPublishedPages: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'hdr-crimson-two-row',
    name: 'Carmesí Doble Barra (Estilo Cadena)',
    description: 'Barra principal roja con buscador central blanco + sub-barra de navegación y accesos.',
    rows: {
      top: emptyRow({ enabled: false }),
      main: emptyRow({
        enabled: true,
        sticky: true,
        bgColor: '#C8102E',
        textColor: '#ffffff',
        showBorderBottom: false,
        heightPx: 64,
        zones: {
          left: [
            {
              id: 'hd-cr-mob',
              type: 'header_mobile_trigger',
              onlyMobile: true,
              onlyTablet: true,
              onlyDesktop: false,
              style: 'icon',
            },
            {
              id: 'hd-cr-logo',
              type: 'header_logo',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              showBrandText: true,
              showSeasonalBadge: false,
              heightMobile: 28,
              heightTablet: 34,
              heightDesktop: 38,
            },
          ],
          center: [
            {
              id: 'hd-cr-search',
              type: 'header_search',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              style: 'pill_white',
              placeholder: 'Buscar pizzas, combos, entradas...',
              maxWidthPx: 520,
            },
          ],
          right: [
            {
              id: 'hd-cr-loc',
              type: 'header_location',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              style: 'pill_compact',
              showEta: false,
            },
            {
              id: 'hd-cr-contact',
              type: 'header_contact',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              mode: 'phone',
              topLabel: 'Llámanos',
              style: 'inline',
            },
            {
              id: 'hd-cr-acc',
              type: 'header_account',
              onlyMobile: false,
              onlyTablet: true,
              onlyDesktop: true,
              style: 'minimal',
              loginLabel: 'Identifícate',
              showCustomerName: true,
            },
            {
              id: 'hd-cr-quick',
              type: 'header_quick_actions',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              showOrders: false,
              showBenefits: false,
              showReservations: false,
              showBuilderShortcut: true,
              style: 'icons',
            },
            {
              id: 'hd-cr-cart',
              type: 'header_cart',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              style: 'pill_full',
              showTotalAmount: true,
              showItemCount: true,
              bgColor: '#00000033',
              textColor: '#ffffff',
              badgeBgColor: '#ffffff',
              badgeTextColor: '#09090b',
            },
          ],
        },
      }),
      sub: emptyRow({
        enabled: true,
        bgColor: '#ffffff',
        textColor: '#27272a',
        borderColor: '#e4e4e7',
        showBorderBottom: true,
        heightPx: 44,
        zones: {
          left: [
            {
              id: 'hd-cr-nav',
              type: 'header_nav_menu',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              style: 'inline',
              includePublishedPages: true,
              gapPx: 22,
              fontSizePx: 13,
              activeColor: '#C8102E',
              items: [
                { id: 'ncr-1', label: 'Carta', actionType: 'home' },
                { id: 'ncr-2', label: 'Promociones', actionType: 'promos', highlight: true },
                { id: 'ncr-3', label: 'Mis Pedidos', actionType: 'orders' },
                { id: 'ncr-4', label: 'Beneficios', actionType: 'benefits' },
              ],
            },
          ],
          center: [],
          right: [
            {
              id: 'hd-cr-status',
              type: 'header_open_status',
              onlyMobile: false,
              onlyTablet: true,
              onlyDesktop: true,
              openLabel: 'Abierto ahora',
              closedLabel: 'Cerrado',
              showHours: true,
              style: 'pill',
            },
          ],
        },
      }),
    },
    mobileDrawer: {
      bgColor: '#ffffff',
      textColor: '#18181b',
      showSearch: true,
      showLocation: true,
      showAccount: true,
      showContact: true,
      showPublishedPages: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'hdr-minimal-dark',
    name: 'Nocturna Glass (Boutique)',
    description: 'Cabecera oscura traslúcida con desenfoque glassmorphism, navegación centrada y acento ámbar.',
    rows: {
      top: emptyRow({ enabled: false }),
      main: emptyRow({
        enabled: true,
        sticky: true,
        bgColor: '#0b0c10',
        textColor: '#f4f4f5',
        borderColor: '#27272a',
        showBorderBottom: true,
        blurGlass: true,
        heightPx: 66,
        zones: {
          left: [
            {
              id: 'hd-md-mob',
              type: 'header_mobile_trigger',
              onlyMobile: true,
              onlyTablet: true,
              onlyDesktop: false,
              style: 'icon',
            },
            {
              id: 'hd-md-logo',
              type: 'header_logo',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              showBrandText: true,
              showSeasonalBadge: true,
              heightMobile: 30,
              heightTablet: 34,
              heightDesktop: 38,
            },
          ],
          center: [
            {
              id: 'hd-md-nav',
              type: 'header_nav_menu',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              style: 'pills',
              includePublishedPages: true,
              gapPx: 10,
              fontSizePx: 13,
              items: [
                { id: 'nmd-1', label: 'Menú', actionType: 'home' },
                { id: 'nmd-2', label: 'Promos', actionType: 'promos', highlight: true },
                { id: 'nmd-3', label: 'Reservas', actionType: 'reservations' },
                { id: 'nmd-4', label: 'Club', actionType: 'benefits' },
              ],
            },
          ],
          right: [
            {
              id: 'hd-md-loc',
              type: 'header_location',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              style: 'pill_compact',
              showEta: true,
            },
            {
              id: 'hd-md-search',
              type: 'header_search',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              style: 'icon_only',
              placeholder: 'Buscar...',
              maxWidthPx: 260,
            },
            {
              id: 'hd-md-quick',
              type: 'header_quick_actions',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: true,
              showOrders: true,
              showBenefits: false,
              showReservations: false,
              showBuilderShortcut: true,
              style: 'icons',
            },
            {
              id: 'hd-md-cart',
              type: 'header_cart',
              onlyMobile: false,
              onlyTablet: false,
              onlyDesktop: false,
              style: 'pill_full',
              showTotalAmount: true,
              showItemCount: true,
            },
          ],
        },
      }),
      sub: emptyRow({ enabled: false }),
    },
    mobileDrawer: {
      bgColor: '#0b0c10',
      textColor: '#f4f4f5',
      showSearch: true,
      showLocation: true,
      showAccount: true,
      showContact: true,
      showPublishedPages: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export function convertPresetToHeaderTemplate(
  variant: StoreHeaderVariant,
  config?: StoreHeaderConfig,
  customName?: string
): StoreHeaderTemplate {
  const now = new Date().toISOString();
  const baseTemplate =
    variant === 'hut_crimson' || variant === 'flame_grill'
      ? structuredClone(FACTORY_HEADER_TEMPLATES[1])
      : structuredClone(FACTORY_HEADER_TEMPLATES[0]);

  const paletteMap: Record<
    StoreHeaderVariant,
    { bg: string; text: string; subBg: string; subText: string; label: string }
  > = {
    default: {
      bg: '#ffffff',
      text: '#18181b',
      subBg: '#fafafa',
      subText: '#27272a',
      label: 'Cabecera Estándar (Editable)',
    },
    hut_crimson: {
      bg: '#C8102E',
      text: '#ffffff',
      subBg: '#ffffff',
      subText: '#27272a',
      label: 'Hut Carmesí (Editable)',
    },
    papa_fresh: {
      bg: '#ffffff',
      text: '#14532d',
      subBg: '#15803d',
      subText: '#ffffff',
      label: 'Papa Fresh (Editable)',
    },
    flame_grill: {
      bg: '#D62300',
      text: '#ffffff',
      subBg: '#F5EBDC',
      subText: '#502314',
      label: 'Flame Grill (Editable)',
    },
    electric_blue: {
      bg: '#006491',
      text: '#ffffff',
      subBg: '#ffffff',
      subText: '#0f172a',
      label: 'Electric Blue (Editable)',
    },
  };

  const p = paletteMap[variant] || paletteMap.default;
  baseTemplate.id = uid('hdr');
  baseTemplate.name = customName?.trim() || p.label;
  baseTemplate.description = `Convertida desde el diseño preset "${variant}".`;
  baseTemplate.rows.main.bgColor = config?.bgColor || p.bg;
  baseTemplate.rows.main.textColor = config?.textColor || p.text;
  baseTemplate.rows.sub.bgColor = config?.subBarBgColor || p.subBg;
  baseTemplate.rows.sub.textColor = config?.subBarTextColor || p.subText;
  if (config?.showSubBar !== undefined) {
    baseTemplate.rows.sub.enabled = config.showSubBar;
  }
  baseTemplate.createdAt = now;
  baseTemplate.updatedAt = now;

  return baseTemplate;
}
