import { ProductCategory } from './catalog';

export type BuilderViewport = 'mobile' | 'tablet' | 'desktop';

export type StoreAnimationType = 'none' | 'fade-in' | 'slide-up' | 'zoom-in';

export interface BlockAdvancedOptions {
  paddingTop: number;
  paddingBottom: number;
  marginBottom: number;
  animation: StoreAnimationType;
  isHidden?: boolean;
}

export interface BlockDeviceVisibility {
  onlyMobile: boolean;
  onlyTablet: boolean;
  onlyDesktop: boolean;
}

export interface SliderSlideItem {
  id: string;
  badge?: string;
  headline: string;
  subheadline?: string;
  ctaLabel?: string;
  overlayOpacity: number;
  imageDesktop: string;
  imageTablet: string;
  imageMobile: string;
  actionType: 'none' | 'url' | 'product';
  linkUrl?: string;
  productId?: string;
}

export type SliderVisualStyle =
  | 'classic'
  | 'cinema'
  | 'floating_glass'
  | 'split_card'
  | 'magazine';

export interface SliderBlockConfig extends BlockDeviceVisibility {
  type: 'slider';
  id: string;
  title?: string;
  visualStyle?: SliderVisualStyle;
  columnsMobile?: 1 | 2;
  columnsTablet?: 1 | 2 | 3;
  columnsDesktop?: 1 | 2 | 3 | 4;
  heightMobile: number;
  heightTablet: number;
  heightDesktop: number;
  widthMobile: string;
  widthTablet: string;
  widthDesktop: string;
  autoplay: boolean;
  autoplaySpeedSec: number;
  showArrows: boolean;
  showDots: boolean;
  borderRadiusPx: number;
  slides: SliderSlideItem[];
  advanced: BlockAdvancedOptions;
}

export type CategoryWidgetStyle =
  | 'bento_soft'
  | 'editorial_photo'
  | 'float_avatar'
  | 'neon_pill'
  | 'underline_tab'
  | 'accent_rail'
  | 'frosted_glass'
  | 'solid_duo'
  // Legacy styles preserved for backward compatibility with existing saved templates
  | 'app_stories'
  | 'app_dock'
  | 'ecom_segmented'
  | 'ecom_tile'
  | 'pills'
  | 'cards'
  | 'circles'
  | 'tabs'
  | 'banners'
  | 'glass'
  | 'mosaic'
  | 'minimal_chip'
  | 'split_badge';

export interface CategoriesBlockConfig extends BlockDeviceVisibility {
  type: 'categories';
  id: string;
  title?: string;
  style: CategoryWidgetStyle;
  hiddenCategories: string[];
  showCount: boolean;
  gapPx: number;
  columnsMobile: 'auto' | 1 | 2 | 3 | 4;
  columnsTablet: 'auto' | 1 | 2 | 3 | 4 | 5 | 6;
  columnsDesktop: 'auto' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  advanced: BlockAdvancedOptions;
}

export type ProductCardStyle =
  | 'elegante'
  | 'clasica'
  | 'compacta'
  | 'minimalista'
  | 'inmersiva'
  | 'vitrina'
  | 'bento'
  | 'galeria'
  | 'lista_menu'
  | 'neon_promo'
  | 'app_delivery'
  | 'ecom_glass'
  | 'app_split'
  | 'ecom_retail';

export interface ProductGridBlockConfig extends BlockDeviceVisibility {
  type: 'product_grid';
  id: string;
  title?: string;
  cardStyle: ProductCardStyle;
  columnsMobile: 1 | 2 | 3 | 4;
  columnsTablet: 1 | 2 | 3 | 4 | 5 | 6;
  columnsDesktop: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  categoryFilter: 'active_sync' | 'all' | ProductCategory;
  manualIds: string;
  maxInitialProducts: number;
  enableLoadMore: boolean;
  horizontalCarousel: boolean;
  bleedImages: boolean;
  squareImage?: boolean;
  imageFit?: 'cover' | 'contain';
  quickViewButton: boolean;
  showPrice: boolean;
  showStock: boolean;
  showDescription: boolean;
  showVariants: boolean;
  gapPx: number;
  advanced: BlockAdvancedOptions;
}

export type SearchBarVisualStyle =
  | 'modern'
  | 'pill'
  | 'minimal'
  | 'glass'
  | 'hero_banner'
  | 'elevated_card'
  | 'neon_outline';

export interface SearchBarBlockConfig extends BlockDeviceVisibility {
  type: 'search_bar';
  id: string;
  title?: string;
  placeholder: string;
  visualStyle: SearchBarVisualStyle;
  columnsMobile?: 1 | 2;
  columnsTablet?: 1 | 2;
  columnsDesktop?: 1 | 2 | 3;
  advanced: BlockAdvancedOptions;
}

export type PromoStripVisualStyle =
  | 'banner'
  | 'ticket_coupon'
  | 'glass_glow'
  | 'split_hero'
  | 'compact_bar';

export type PromoStripTone =
  | 'amber'
  | 'crimson'
  | 'emerald'
  | 'dark'
  | 'royal'
  | 'sunset'
  | 'gold';

export interface PromoStripBlockConfig extends BlockDeviceVisibility {
  type: 'promo_strip';
  id: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  ctaLabel?: string;
  actionType: 'none' | 'url' | 'product';
  linkUrl?: string;
  productId?: string;
  bgTone: PromoStripTone;
  visualStyle?: PromoStripVisualStyle;
  columnsMobile?: 1 | 2;
  columnsTablet?: 1 | 2 | 3;
  columnsDesktop?: 1 | 2 | 3 | 4;
  advanced: BlockAdvancedOptions;
}

export type TextAlignOption = 'left' | 'center' | 'right';
export type ParagraphAlignOption = 'left' | 'center' | 'right' | 'justify';
export type BlockShadowSize = 'none' | 'sm' | 'md' | 'lg';

export interface TextBlockConfig extends BlockDeviceVisibility {
  type: 'text';
  id: string;
  text: string;
  eyebrow?: string;
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'p';
  fontSizeMobile: number;
  fontSizeTablet: number;
  fontSizeDesktop: number;
  alignMobile: TextAlignOption;
  alignTablet: TextAlignOption;
  alignDesktop: TextAlignOption;
  maxWidthMobile: string;
  maxWidthTablet: string;
  maxWidthDesktop: string;
  fontWeight: 500 | 600 | 700 | 800 | 900;
  letterSpacing: 'tight' | 'normal' | 'wide';
  lineHeight: 'tight' | 'normal' | 'relaxed';
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth: number;
  borderRadiusPx: number;
  paddingX: number;
  paddingY: number;
  accentPosition: 'none' | 'left' | 'bottom';
  accentColor?: string;
  advanced: BlockAdvancedOptions;
}

export interface ParagraphBlockConfig extends BlockDeviceVisibility {
  type: 'paragraph';
  id: string;
  leadText?: string;
  text: string;
  fontSizeMobile: number;
  fontSizeTablet: number;
  fontSizeDesktop: number;
  alignMobile: ParagraphAlignOption;
  alignTablet: ParagraphAlignOption;
  alignDesktop: ParagraphAlignOption;
  maxWidthMobile: string;
  maxWidthTablet: string;
  maxWidthDesktop: string;
  fontWeight: 400 | 500 | 600;
  lineHeight: 'snug' | 'relaxed' | 'loose';
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth: number;
  borderRadiusPx: number;
  paddingX: number;
  paddingY: number;
  leftBorderAccent: boolean;
  accentColor?: string;
  advanced: BlockAdvancedOptions;
}

export interface VideoBlockConfig extends BlockDeviceVisibility {
  type: 'video';
  id: string;
  title?: string;
  videoUrl: string;
  posterUrl?: string;
  caption?: string;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' | '21:9';
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
  widthMobile: string;
  widthTablet: string;
  widthDesktop: string;
  heightMobile: number;
  heightTablet: number;
  heightDesktop: number;
  alignMobile: TextAlignOption;
  alignTablet: TextAlignOption;
  alignDesktop: TextAlignOption;
  borderRadiusPx: number;
  borderColor?: string;
  borderWidth: number;
  shadow: BlockShadowSize;
  advanced: BlockAdvancedOptions;
}

export interface ImageBlockConfig extends BlockDeviceVisibility {
  type: 'image';
  id: string;
  src: string;
  srcTablet?: string;
  srcMobile?: string;
  alt: string;
  caption?: string;
  actionType: 'none' | 'url' | 'product' | 'lightbox';
  linkUrl?: string;
  productId?: string;
  openInNewTab?: boolean;
  widthMobile: string;
  widthTablet: string;
  widthDesktop: string;
  heightMobile: number;
  heightTablet: number;
  heightDesktop: number;
  alignMobile: TextAlignOption;
  alignTablet: TextAlignOption;
  alignDesktop: TextAlignOption;
  objectFit: 'cover' | 'contain';
  aspectRatio: 'auto' | '16:9' | '4:3' | '1:1' | '3:4' | '21:9';
  borderRadiusPx: number;
  borderColor?: string;
  borderWidth: number;
  shadow: BlockShadowSize;
  advanced: BlockAdvancedOptions;
}

export type ButtonIconOption =
  | 'none'
  | 'arrow'
  | 'cart'
  | 'whatsapp'
  | 'phone'
  | 'external'
  | 'sparkles';

export interface ButtonBlockConfig extends BlockDeviceVisibility {
  type: 'button';
  id: string;
  label: string;
  sublabel?: string;
  icon: ButtonIconOption;
  actionType: 'url' | 'product' | 'whatsapp' | 'scroll_top';
  linkUrl?: string;
  productId?: string;
  whatsappNumber?: string;
  whatsappMessage?: string;
  openInNewTab?: boolean;
  alignMobile: TextAlignOption | 'full';
  alignTablet: TextAlignOption | 'full';
  alignDesktop: TextAlignOption | 'full';
  sizeMobile: 'sm' | 'md' | 'lg' | 'xl';
  sizeTablet: 'sm' | 'md' | 'lg' | 'xl';
  sizeDesktop: 'sm' | 'md' | 'lg' | 'xl';
  variant: 'solid' | 'outline' | 'soft';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadiusPx: number;
  fontWeight: 600 | 700 | 800;
  shadow: BlockShadowSize;
  advanced: BlockAdvancedOptions;
}

export interface ColumnSlot {
  id: string;
  blocks: StoreBlock[];
}

export interface ColumnsBlockConfig extends BlockDeviceVisibility {
  type: 'columns';
  id: string;
  title?: string;
  columnsMobile: 1 | 2;
  columnsTablet: 1 | 2 | 3;
  columnsDesktop: 2 | 3 | 4;
  gapPx: number;
  verticalAlign: 'start' | 'center' | 'stretch';
  bgColor?: string;
  borderColor?: string;
  borderWidth: number;
  borderRadiusPx: number;
  paddingPx: number;
  columns: ColumnSlot[];
  advanced: BlockAdvancedOptions;
}

export interface SpacerBlockConfig extends BlockDeviceVisibility {
  type: 'spacer';
  id: string;
  heightMobile: number;
  heightTablet: number;
  heightDesktop: number;
  showDivider: boolean;
  dividerColor?: string;
  dividerStyle: 'solid' | 'dashed' | 'dotted';
  dividerThickness: number;
  dividerWidth: '100%' | '75%' | '50%' | '25%';
  advanced: BlockAdvancedOptions;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqBlockConfig extends BlockDeviceVisibility {
  type: 'faq';
  id: string;
  title?: string;
  subtitle?: string;
  items: FaqItem[];
  allowMultipleOpen: boolean;
  accentColor?: string;
  borderRadiusPx: number;
  advanced: BlockAdvancedOptions;
}

export interface CountdownBlockConfig extends BlockDeviceVisibility {
  type: 'countdown';
  id: string;
  title: string;
  subtitle?: string;
  targetDateIso: string;
  expiredText: string;
  ctaLabel?: string;
  ctaUrl?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  borderRadiusPx: number;
  alignMobile: TextAlignOption;
  alignTablet: TextAlignOption;
  alignDesktop: TextAlignOption;
  advanced: BlockAdvancedOptions;
}

export interface LeadFormBlockConfig extends BlockDeviceVisibility {
  type: 'lead_form';
  id: string;
  title: string;
  subtitle?: string;
  submitLabel: string;
  successMessage: string;
  showEmail: boolean;
  showMessage: boolean;
  bgColor?: string;
  accentColor?: string;
  borderRadiusPx: number;
  advanced: BlockAdvancedOptions;
}

export type StoreBlock =
  | SliderBlockConfig
  | CategoriesBlockConfig
  | ProductGridBlockConfig
  | SearchBarBlockConfig
  | PromoStripBlockConfig
  | TextBlockConfig
  | ParagraphBlockConfig
  | VideoBlockConfig
  | ImageBlockConfig
  | ButtonBlockConfig
  | ColumnsBlockConfig
  | SpacerBlockConfig
  | FaqBlockConfig
  | CountdownBlockConfig
  | LeadFormBlockConfig;

export type StoreBlockType = StoreBlock['type'];

export interface CustomPageSeo {
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: 'website' | 'article';
}

export interface CustomPageAnalytics {
  views: number;
  ctaClicks: number;
  lastVisitedAt?: string;
}

export type StoreHeaderSource = 'preset' | 'global' | 'custom';

export type HeaderRowId = 'top' | 'main' | 'sub';
export type HeaderZoneId = 'left' | 'center' | 'right';

export type HeaderWidgetType =
  | 'header_logo'
  | 'header_nav_menu'
  | 'header_search'
  | 'header_location'
  | 'header_cart'
  | 'header_account'
  | 'header_announcement'
  | 'header_mobile_trigger'
  | 'header_open_status'
  | 'header_contact'
  | 'header_quick_actions'
  | 'header_divider';

export interface HeaderWidgetBase extends BlockDeviceVisibility {
  id: string;
  type: HeaderWidgetType;
  isHidden?: boolean;
}

export interface HeaderLogoWidgetConfig extends HeaderWidgetBase {
  type: 'header_logo';
  customLogoUrl?: string;
  showBrandText: boolean;
  customBrandText?: string;
  showSeasonalBadge: boolean;
  heightMobile: number;
  heightTablet: number;
  heightDesktop: number;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  badgeBgColor?: string;
}

export type HeaderNavActionType =
  | 'home'
  | 'category'
  | 'promos'
  | 'reservations'
  | 'orders'
  | 'benefits'
  | 'custom_page'
  | 'url';

export interface HeaderNavItem {
  id: string;
  label: string;
  actionType: HeaderNavActionType;
  targetValue?: string; // category id, page slug, or external/internal url
  openInNewTab?: boolean;
  highlight?: boolean;
}

export interface HeaderNavMenuWidgetConfig extends HeaderWidgetBase {
  type: 'header_nav_menu';
  style: 'inline' | 'pills' | 'underline';
  includePublishedPages: boolean;
  gapPx: number;
  fontSizePx: number;
  textColor?: string;
  activeColor?: string;
  pillBgColor?: string;
  activeBgColor?: string;
  borderColor?: string;
  items: HeaderNavItem[];
}

export interface HeaderSearchWidgetConfig extends HeaderWidgetBase {
  type: 'header_search';
  style: 'pill_white' | 'glass' | 'outline' | 'icon_only';
  placeholder: string;
  maxWidthPx: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  iconColor?: string;
}

export interface HeaderLocationWidgetConfig extends HeaderWidgetBase {
  type: 'header_location';
  style: 'pill_compact' | 'card_eta' | 'minimal_icon';
  labelOverride?: string;
  showEta: boolean;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  iconColor?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
}

export interface HeaderCartWidgetConfig extends HeaderWidgetBase {
  type: 'header_cart';
  style: 'pill_full' | 'icon_badge' | 'compact';
  showTotalAmount: boolean;
  showItemCount: boolean;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
}

export interface HeaderAccountWidgetConfig extends HeaderWidgetBase {
  type: 'header_account';
  style: 'pill' | 'minimal' | 'icon_only';
  loginLabel: string;
  showCustomerName: boolean;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  iconColor?: string;
}

export interface HeaderAnnouncementWidgetConfig extends HeaderWidgetBase {
  type: 'header_announcement';
  messages: string[];
  rotateSeconds: number;
  icon: 'sparkles' | 'flame' | 'truck' | 'tag' | 'none';
  ctaLabel?: string;
  ctaUrl?: string;
  dismissible: boolean;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
}

export interface HeaderMobileTriggerWidgetConfig extends HeaderWidgetBase {
  type: 'header_mobile_trigger';
  label?: string;
  style: 'icon' | 'pill';
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}

export interface HeaderOpenStatusWidgetConfig extends HeaderWidgetBase {
  type: 'header_open_status';
  openLabel: string;
  closedLabel: string;
  showHours: boolean;
  style: 'pill' | 'dot_minimal';
  openBgColor?: string;
  openTextColor?: string;
  closedBgColor?: string;
  closedTextColor?: string;
  borderColor?: string;
}

export interface HeaderContactWidgetConfig extends HeaderWidgetBase {
  type: 'header_contact';
  mode: 'phone' | 'whatsapp';
  topLabel?: string;
  customNumber?: string;
  whatsappMessage?: string;
  style: 'inline' | 'pill';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  iconColor?: string;
}

export interface HeaderQuickActionsWidgetConfig extends HeaderWidgetBase {
  type: 'header_quick_actions';
  showOrders: boolean;
  showBenefits: boolean;
  showReservations: boolean;
  showBuilderShortcut: boolean;
  style: 'icons' | 'pills';
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  iconColor?: string;
}

export interface HeaderDividerWidgetConfig extends HeaderWidgetBase {
  type: 'header_divider';
  mode: 'line' | 'flex_spacer';
  color?: string;
  heightPx: number;
  widthPx: number;
}

export type HeaderWidget =
  | HeaderLogoWidgetConfig
  | HeaderNavMenuWidgetConfig
  | HeaderSearchWidgetConfig
  | HeaderLocationWidgetConfig
  | HeaderCartWidgetConfig
  | HeaderAccountWidgetConfig
  | HeaderAnnouncementWidgetConfig
  | HeaderMobileTriggerWidgetConfig
  | HeaderOpenStatusWidgetConfig
  | HeaderContactWidgetConfig
  | HeaderQuickActionsWidgetConfig
  | HeaderDividerWidgetConfig;

export interface HeaderRowZones {
  left: HeaderWidget[];
  center: HeaderWidget[];
  right: HeaderWidget[];
}

export interface HeaderRowConfig {
  enabled: boolean;
  sticky?: boolean;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  showBorderBottom: boolean;
  blurGlass?: boolean;
  heightPx: number;
  paddingX: number;
  maxWidth: '1280px' | '1440px' | '1600px' | '100%';
  zones: HeaderRowZones;
}

export interface HeaderMobileDrawerConfig {
  bgColor?: string;
  textColor?: string;
  showSearch: boolean;
  showLocation: boolean;
  showAccount: boolean;
  showContact: boolean;
  showPublishedPages: boolean;
}

export interface StoreHeaderTemplate {
  id: string;
  name: string;
  description?: string;
  rows: {
    top: HeaderRowConfig;
    main: HeaderRowConfig;
    sub: HeaderRowConfig;
  };
  mobileDrawer: HeaderMobileDrawerConfig;
  createdAt: string;
  updatedAt: string;
}

export type StoreFooterSource = 'preset' | 'global' | 'custom';
export type FooterBandId = 'ribbon' | 'main' | 'bottom';
export type FooterColumnId = 'col1' | 'col2' | 'col3' | 'col4';

export type FooterWidgetType =
  | 'footer_brand'
  | 'footer_link_list'
  | 'footer_contact'
  | 'footer_newsletter'
  | 'footer_complaints_book'
  | 'footer_payment_badges'
  | 'footer_reservations_cta'
  | 'footer_social_links'
  | 'footer_copyright'
  | 'footer_custom_text';

export interface FooterWidgetBase extends BlockDeviceVisibility {
  id: string;
  type: FooterWidgetType;
  isHidden?: boolean;
}

export interface FooterBrandWidgetConfig extends FooterWidgetBase {
  type: 'footer_brand';
  customLogoUrl?: string;
  showBrandName: boolean;
  description: string;
  showRuc: boolean;
  logoHeightPx: number;
  bgColor?: string;
  borderColor?: string;
  titleColor?: string;
  textColor?: string;
  accentColor?: string;
}

export interface FooterLinkItem {
  id: string;
  label: string;
  actionType: HeaderNavActionType;
  targetValue?: string;
  openInNewTab?: boolean;
}

export interface FooterLinkListWidgetConfig extends FooterWidgetBase {
  type: 'footer_link_list';
  title: string;
  includePublishedFooterPages: boolean;
  layout: 'vertical' | 'inline';
  bgColor?: string;
  borderColor?: string;
  titleColor?: string;
  textColor?: string;
  items: FooterLinkItem[];
}

export interface FooterContactWidgetConfig extends FooterWidgetBase {
  type: 'footer_contact';
  title: string;
  showAddress: boolean;
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  showSchedule: boolean;
  bgColor?: string;
  borderColor?: string;
  titleColor?: string;
  textColor?: string;
  iconColor?: string;
}

export interface FooterNewsletterWidgetConfig extends FooterWidgetBase {
  type: 'footer_newsletter';
  title: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  accentColor?: string;
  bgColor?: string;
  borderColor?: string;
  titleColor?: string;
  textColor?: string;
  inputBgColor?: string;
  inputTextColor?: string;
  inputBorderColor?: string;
  buttonTextColor?: string;
}

export interface FooterComplaintsBookWidgetConfig extends FooterWidgetBase {
  type: 'footer_complaints_book';
  title: string;
  subtitle: string;
  style: 'card' | 'pill' | 'minimal';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  iconBgColor?: string;
  iconColor?: string;
}

export interface FooterPaymentBadgesWidgetConfig extends FooterWidgetBase {
  type: 'footer_payment_badges';
  title?: string;
  methods: Array<'visa' | 'mastercard' | 'yape' | 'plin' | 'efectivo' | 'culqi'>;
  style: 'pills' | 'outline';
  bgColor?: string;
  titleColor?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  badgeBorderColor?: string;
}

export interface FooterReservationsCtaWidgetConfig extends FooterWidgetBase {
  type: 'footer_reservations_cta';
  title: string;
  subtitle: string;
  buttonLabel: string;
  showShareButton: boolean;
  accentColor?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  buttonTextColor?: string;
  iconBgColor?: string;
  iconColor?: string;
}

export interface FooterSocialItem {
  id: string;
  network: 'instagram' | 'facebook' | 'tiktok' | 'whatsapp' | 'web';
  url: string;
}

export interface FooterSocialLinksWidgetConfig extends FooterWidgetBase {
  type: 'footer_social_links';
  title?: string;
  style: 'circle' | 'pill';
  titleColor?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  badgeBorderColor?: string;
  items: FooterSocialItem[];
}

export interface FooterCopyrightWidgetConfig extends FooterWidgetBase {
  type: 'footer_copyright';
  text: string; // supports {year} and {brand}
  align: TextAlignOption;
  bgColor?: string;
  textColor?: string;
}

export interface FooterCustomTextWidgetConfig extends FooterWidgetBase {
  type: 'footer_custom_text';
  title?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  align: TextAlignOption;
  bgColor?: string;
  borderColor?: string;
  titleColor?: string;
  textColor?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
}

export type FooterWidget =
  | FooterBrandWidgetConfig
  | FooterLinkListWidgetConfig
  | FooterContactWidgetConfig
  | FooterNewsletterWidgetConfig
  | FooterComplaintsBookWidgetConfig
  | FooterPaymentBadgesWidgetConfig
  | FooterReservationsCtaWidgetConfig
  | FooterSocialLinksWidgetConfig
  | FooterCopyrightWidgetConfig
  | FooterCustomTextWidgetConfig;

export interface FooterBandColumns {
  col1: FooterWidget[];
  col2: FooterWidget[];
  col3: FooterWidget[];
  col4: FooterWidget[];
}

export interface FooterBandConfig {
  enabled: boolean;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  showBorderTop: boolean;
  paddingY: number;
  maxWidth: '1280px' | '1440px' | '1600px' | '100%';
  columnsDesktop: 1 | 2 | 3 | 4;
  columns: FooterBandColumns;
}

export interface StoreFooterTemplate {
  id: string;
  name: string;
  description?: string;
  bands: {
    ribbon: FooterBandConfig;
    main: FooterBandConfig;
    bottom: FooterBandConfig;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft';
  themeMode: 'dark' | 'light';
  footerTheme: 'light' | 'dark';
  pageBgColor?: string;
  contrastLevel?: 'standard' | 'high' | 'ultra';
  accentColor: string;
  buttonColor?: string;
  buttonTextColor?: string;
  autoButtonContrast?: boolean;
  showHeaderCartButton?: boolean;
  showStoreHeader: boolean;
  showStoreFooter: boolean;
  headerSource?: StoreHeaderSource;
  customHeaderId?: string;
  footerSource?: StoreFooterSource;
  customFooterId?: string;
  showInStoreNav?: boolean;
  showInStoreFooter?: boolean;
  navLabel?: string;
  analytics?: CustomPageAnalytics;
  blocks: StoreBlock[];
  seo: CustomPageSeo;
  createdAt: string;
  updatedAt: string;
}

export type StoreHeaderVariant =
  | 'default'
  | 'hut_crimson'
  | 'papa_fresh'
  | 'flame_grill'
  | 'electric_blue';

export type StoreFooterVariant =
  | 'default'
  | 'hut_crimson'
  | 'papa_fresh'
  | 'flame_grill'
  | 'electric_blue';

export interface StoreHeaderConfig {
  bgColor?: string;
  textColor?: string;
  subBarBgColor?: string;
  subBarTextColor?: string;
  accentColor?: string;
  searchPlaceholder?: string;
  menuLabel?: string;
  promosLabel?: string;
  reservationsLabel?: string;
  ordersLabel?: string;
  benefitsLabel?: string;
  loginLabel?: string;
  showSearch?: boolean;
  showLocation?: boolean;
  showPhone?: boolean;
  showAccount?: boolean;
  showSubBar?: boolean;
  showPromosLink?: boolean;
  showReservationsLink?: boolean;
  showOrdersLink?: boolean;
  showBenefitsLink?: boolean;
}

export interface StoreFooterConfig {
  ribbonBgColor?: string;
  ribbonTextColor?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  ribbonText?: string;
  brandDescription?: string;
  newsletterTitle?: string;
  newsletterDescription?: string;
  newsletterButtonLabel?: string;
  copyrightText?: string;
  showRibbon?: boolean;
  showReservationsCta?: boolean;
  showNewsletter?: boolean;
  showComplaintsBook?: boolean;
  showPaymentBadges?: boolean;
  showShareReservations?: boolean;
}

export interface StoreTemplate {
  id: string;
  name: string;
  tagline: string;
  previewBadge: string;
  themeMode: 'dark' | 'light';
  footerTheme: 'light' | 'dark';
  pageBgColor?: string;
  contrastLevel?: 'standard' | 'high' | 'ultra';
  headerSource?: StoreHeaderSource;
  customHeaderId?: string;
  footerSource?: StoreFooterSource;
  customFooterId?: string;
  headerVariant?: StoreHeaderVariant;
  footerVariant?: StoreFooterVariant;
  headerConfig?: StoreHeaderConfig;
  footerConfig?: StoreFooterConfig;
  accentColor: string;
  buttonColor?: string;
  buttonTextColor?: string;
  autoButtonContrast?: boolean;
  showHeaderCartButton?: boolean;
  blocks: StoreBlock[];
}

export function getOptimalContrastHex(bgHex: string): string {
  const clean = (bgHex || '#f59e0b').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '#09090b';
  const toLinear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(parseInt(clean.slice(0, 2), 16));
  const g = toLinear(parseInt(clean.slice(2, 4), 16));
  const b = toLinear(parseInt(clean.slice(4, 6), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.17913 ? '#09090b' : '#ffffff';
}

export function toProductSlug(name: string, fallbackId?: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallbackId || 'producto';
}

export function isBlockVisibleOnViewport(
  block: BlockDeviceVisibility,
  viewport: BuilderViewport
): boolean {
  const anyExplicit = block.onlyMobile || block.onlyTablet || block.onlyDesktop;
  if (!anyExplicit) return true;
  if (viewport === 'mobile') return block.onlyMobile;
  if (viewport === 'tablet') return block.onlyTablet;
  return block.onlyDesktop;
}
