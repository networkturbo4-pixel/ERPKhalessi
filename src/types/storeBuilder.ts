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
  | 'neon_promo';

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

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft';
  themeMode: 'dark' | 'light';
  footerTheme: 'light' | 'dark';
  accentColor: string;
  buttonColor?: string;
  buttonTextColor?: string;
  autoButtonContrast?: boolean;
  showStoreHeader: boolean;
  showStoreFooter: boolean;
  showInStoreNav?: boolean;
  showInStoreFooter?: boolean;
  navLabel?: string;
  analytics?: CustomPageAnalytics;
  blocks: StoreBlock[];
  seo: CustomPageSeo;
  createdAt: string;
  updatedAt: string;
}

export interface StoreTemplate {
  id: string;
  name: string;
  tagline: string;
  previewBadge: string;
  themeMode: 'dark' | 'light';
  footerTheme: 'light' | 'dark';
  accentColor: string;
  buttonColor?: string;
  buttonTextColor?: string;
  autoButtonContrast?: boolean;
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
