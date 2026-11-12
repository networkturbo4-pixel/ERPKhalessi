import { ProductCategory } from './catalog';

export type BuilderViewport = 'mobile' | 'tablet' | 'desktop';

export type StoreAnimationType = 'none' | 'fade-in' | 'slide-up' | 'zoom-in';

export interface BlockAdvancedOptions {
  paddingTop: number;
  paddingBottom: number;
  marginBottom: number;
  animation: StoreAnimationType;
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

export type StoreBlock =
  | SliderBlockConfig
  | CategoriesBlockConfig
  | ProductGridBlockConfig
  | SearchBarBlockConfig
  | PromoStripBlockConfig;

export type StoreBlockType = StoreBlock['type'];

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
