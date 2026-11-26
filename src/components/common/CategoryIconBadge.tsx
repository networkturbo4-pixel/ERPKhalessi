import React from 'react';
import { Tag } from 'lucide-react';

export interface CategoryIconData {
  icon?: string;
  iconType?: 'svg' | 'image' | 'emoji';
  iconSvg?: string;
  iconImageUrl?: string;
  iconColor?: string;
  iconBgColor?: string;
}

/**
 * Sanitizes uploaded SVG markup and normalizes hardcoded fills/strokes to `currentColor`
 * so the user's chosen `iconColor` tints the icon cleanly and safely.
 */
export function sanitizeCategorySvg(rawSvg: string, tintWithCurrentColor = true): string | null {
  const trimmed = (rawSvg || '').trim();
  const svgMatch = trimmed.match(/<svg[\s\S]*?<\/svg>/i);
  if (!svgMatch) return null;

  let clean = svgMatch[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');

  // Ensure responsive sizing inside badge container
  clean = clean.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    const cleanedAttrs = attrs
      .replace(/\s(width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
    return `<svg${cleanedAttrs} width="100%" height="100%" aria-hidden="true">`;
  });

  if (tintWithCurrentColor) {
    clean = clean
      .replace(/\bfill="(?!none\b|transparent\b|currentColor\b|url\()([^"]+)"/gi, 'fill="currentColor"')
      .replace(/\bfill='(?!none\b|transparent\b|currentColor\b|url\()([^']+)'/gi, "fill='currentColor'")
      .replace(/\bstroke="(?!none\b|transparent\b|currentColor\b|url\()([^"]+)"/gi, 'stroke="currentColor"')
      .replace(/\bstroke='(?!none\b|transparent\b|currentColor\b|url\()([^']+)'/gi, "stroke='currentColor'");
  }

  return clean;
}

interface CategoryIconBadgeProps {
  category?: CategoryIconData | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CategoryIconBadgeProps['size']>, { box: string; inner: string; text: string }> = {
  xs: { box: 'w-5 h-5 rounded-md', inner: 'w-3.5 h-3.5', text: 'text-xs' },
  sm: { box: 'w-6 h-6 rounded-lg', inner: 'w-4 h-4', text: 'text-sm' },
  md: { box: 'w-9 h-9 rounded-xl', inner: 'w-5 h-5', text: 'text-base' },
  lg: { box: 'w-11 h-11 rounded-2xl', inner: 'w-6 h-6', text: 'text-xl' },
};

export const CategoryIconBadge: React.FC<CategoryIconBadgeProps> = ({
  category,
  alt = '',
  size = 'sm',
  className = '',
}) => {
  const s = SIZE_CLASSES[size];
  const bg = category?.iconBgColor && category.iconBgColor !== 'transparent' ? category.iconBgColor : undefined;
  const fg = category?.iconColor || 'currentColor';

  // 1. Custom SVG icon with chosen color & background
  if (category?.iconType === 'svg' && category.iconSvg) {
    const safeSvg = sanitizeCategorySvg(category.iconSvg, true);
    if (safeSvg) {
      return (
        <span
          style={{ backgroundColor: bg, color: fg }}
          className={`inline-flex items-center justify-center shrink-0 overflow-hidden ${s.box} ${className}`}
        >
          <span
            className={`${s.inner} flex items-center justify-center [&>svg]:w-full [&>svg]:h-full`}
            dangerouslySetInnerHTML={{ __html: safeSvg }}
          />
        </span>
      );
    }
  }

  // 2. Custom PNG / Image icon with optional background
  if (category?.iconType === 'image' && category.iconImageUrl) {
    return (
      <span
        style={{ backgroundColor: bg }}
        className={`inline-flex items-center justify-center shrink-0 overflow-hidden ${s.box} ${className}`}
      >
        <img
          src={category.iconImageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`${bg ? `${s.inner} object-contain` : 'w-full h-full object-contain'}`}
        />
      </span>
    );
  }

  // 3. Legacy emoji fallback (if an older category still has an emoji)
  if (category?.icon && category.icon.trim()) {
    return (
      <span
        aria-hidden="true"
        style={bg ? { backgroundColor: bg } : undefined}
        className={`inline-flex items-center justify-center shrink-0 leading-none ${bg ? s.box : ''} ${s.text} ${className}`}
      >
        {category.icon}
      </span>
    );
  }

  // 4. Clean neutral vector fallback (no emoji)
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: bg, color: fg }}
      className={`inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}
    >
      <Tag className={s.inner} />
    </span>
  );
};
