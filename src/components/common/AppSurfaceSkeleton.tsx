import React from 'react';

export interface InitialBrandBootTheme {
  isLight: boolean;
  primaryColor: string;
  faviconUrl: string;
  surfaceType: 'storefront' | 'admin' | 'kiosk';
}

export function resolveInitialBootTheme(pathname?: string): InitialBrandBootTheme {
  if (typeof window === 'undefined') {
    return {
      isLight: false,
      primaryColor: '#e11d48',
      faviconUrl: '/api/favicon.php',
      surfaceType: 'storefront',
    };
  }

  const path = pathname ?? window.location.pathname ?? '/';
  const hash = window.location.hash ?? '';
  const isAdmin = path.startsWith('/admin') || hash.startsWith('#admin');
  const isKiosk = path.startsWith('/kiosco') || hash.startsWith('#kiosco');
  const surfaceType: InitialBrandBootTheme['surfaceType'] = isKiosk
    ? 'kiosk'
    : isAdmin
    ? 'admin'
    : 'storefront';

  let faviconUrl = '/api/favicon.php';
  let primaryColor = '#e11d48';
  let erpTheme = '';
  let storeThemeMode: 'light' | 'dark' | '' = '';

  try {
    faviconUrl = localStorage.getItem('kh_brand_favicon_v1') || faviconUrl;
    primaryColor = localStorage.getItem('kh_brand_primary_v1') || primaryColor;
    erpTheme = localStorage.getItem('kh_brand_theme_v1') || '';

    const rawSettings = localStorage.getItem('khalessi_erp_settings_v3');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      const c = parsed?.customization;
      if (c) {
        faviconUrl =
          localStorage.getItem('kh_brand_favicon_v1') ||
          c.favicon ||
          c.storeHeaderLogo ||
          c.logoDark ||
          c.logoLight ||
          faviconUrl;
        primaryColor = localStorage.getItem('kh_brand_primary_v1') || c.primaryColor || primaryColor;
        erpTheme = erpTheme || c.themePreference || '';
      }
    }

    if (surfaceType === 'storefront') {
      const rawBuilder = localStorage.getItem('kh_store_builder_v2');
      if (rawBuilder) {
        const parsedBuilder = JSON.parse(rawBuilder);
        if (Array.isArray(parsedBuilder?.templates) && parsedBuilder.templates.length > 0) {
          const activeId = parsedBuilder.activeTemplateId || parsedBuilder.templates[0].id;
          const activeTpl =
            parsedBuilder.templates.find((t: { id?: string }) => t.id === activeId) ||
            parsedBuilder.templates[0];
          if (activeTpl?.themeMode === 'light' || activeTpl?.themeMode === 'dark') {
            storeThemeMode = activeTpl.themeMode;
          }
        }
      }
    }
  } catch {
    // Fallback to defaults if storage is unavailable
  }

  let isLight = false;
  if (surfaceType === 'storefront') {
    // Factory default template is dark ('tpl-artesanal-dark') unless persisted template specifies 'light'
    isLight = storeThemeMode ? storeThemeMode === 'light' : false;
  } else if (surfaceType === 'kiosk') {
    isLight = false;
  } else {
    if (erpTheme === 'light') {
      isLight = true;
    } else if (erpTheme === 'dark') {
      isLight = false;
    } else {
      isLight = !window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    }
  }

  return {
    isLight,
    primaryColor: /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : '#e11d48',
    faviconUrl,
    surfaceType,
  };
}

/**
 * Skeleton progresivo instantáneo para la Tienda Online (evita pantallazos negros/blancos o saltos bruscos).
 */
export const StorefrontSkeleton: React.FC<{ isLight?: boolean; accentColor?: string }> = ({
  isLight,
  accentColor,
}) => {
  const boot = resolveInitialBootTheme('/');
  const light = isLight ?? boot.isLight;
  const primary = accentColor ?? boot.primaryColor;

  const bgClass = light ? 'bg-[#f8fafc] text-zinc-900' : 'bg-[#0b0c10] text-white';
  const surfaceClass = light
    ? 'bg-white border-zinc-200/90'
    : 'bg-neutral-900/90 border-neutral-800';
  const pulseClass = light ? 'bg-zinc-200/80' : 'bg-neutral-800/90';

  return (
    <div
      aria-busy="true"
      aria-label="Cargando tienda..."
      className={`min-h-dvh flex flex-col ${bgClass} transition-colors duration-150`}
    >
      {/* Sticky Header Skeleton */}
      <header className={`sticky top-0 z-20 border-b ${surfaceClass} px-4 py-3`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl animate-pulse ${pulseClass}`} />
            <div className="space-y-1.5">
              <div className={`h-3.5 w-28 sm:w-36 rounded-lg animate-pulse ${pulseClass}`} />
              <div className={`h-2.5 w-20 sm:w-28 rounded-md animate-pulse ${pulseClass}`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`hidden sm:block h-9 w-36 rounded-full animate-pulse ${pulseClass}`} />
            <div
              className="h-9 w-24 rounded-full opacity-85 animate-pulse"
              style={{ backgroundColor: `${primary}33` }}
            />
          </div>
        </div>
      </header>

      {/* Main Storefront Skeleton */}
      <div className="max-w-7xl w-full mx-auto px-4 py-4 sm:py-6 space-y-5 flex-1">
        {/* Hero Banner Skeleton */}
        <div
          className={`w-full h-[250px] sm:h-[330px] lg:h-[390px] rounded-[22px] border overflow-hidden relative ${surfaceClass}`}
        >
          <div className={`absolute inset-0 animate-pulse ${pulseClass}`} />
          <div className="relative z-10 h-full px-6 sm:px-12 flex flex-col justify-center space-y-3 max-w-lg">
            <div className="h-5 w-36 rounded-full bg-white/15 animate-pulse" />
            <div className="h-8 sm:h-10 w-72 sm:w-96 max-w-full rounded-xl bg-white/15 animate-pulse" />
            <div className="h-4 w-60 max-w-full rounded-lg bg-white/10 animate-pulse" />
            <div
              className="h-10 w-40 rounded-2xl animate-pulse mt-1"
              style={{ backgroundColor: `${primary}55` }}
            />
          </div>
        </div>

        {/* Category Pills Skeleton */}
        <div className="flex items-center gap-2.5 overflow-hidden py-1">
          {[96, 132, 124, 118, 112, 92].map((w, i) => (
            <div
              key={i}
              style={{ width: `${w}px` }}
              className={`h-10 rounded-2xl shrink-0 animate-pulse ${
                i === 0 ? '' : pulseClass
              }`}
            >
              {i === 0 && (
                <div
                  className="w-full h-full rounded-2xl"
                  style={{ backgroundColor: `${primary}44` }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Product Grid Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className={`rounded-3xl border p-3 space-y-3 ${surfaceClass}`}
            >
              <div className={`h-44 w-full rounded-2xl animate-pulse ${pulseClass}`} />
              <div className="px-1 space-y-2">
                <div className={`h-4 w-3/4 rounded-lg animate-pulse ${pulseClass}`} />
                <div className={`h-3 w-full rounded-md animate-pulse ${pulseClass}`} />
                <div className="pt-2 flex items-center justify-between">
                  <div className={`h-5 w-20 rounded-lg animate-pulse ${pulseClass}`} />
                  <div
                    className="h-8 w-20 rounded-2xl animate-pulse"
                    style={{ backgroundColor: `${primary}40` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Splash continuo sin parpadeo para /admin y /kiosco (idéntico al splash inicial de index.html).
 */
export const BrandBootSplash: React.FC<{ pathname?: string }> = ({ pathname }) => {
  const { isLight, primaryColor, faviconUrl, surfaceType } = resolveInitialBootTheme(pathname);

  if (surfaceType === 'storefront') {
    return <StorefrontSkeleton isLight={isLight} accentColor={primaryColor} />;
  }

  return (
    <div
      aria-busy="true"
      aria-label="Iniciando sistema..."
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isLight ? '#f4f4f5' : '#09090b',
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: '7px',
          borderRadius: '26px',
          background: isLight ? '#ffffff' : 'rgba(255,255,255,0.04)',
          border: `2px solid ${primaryColor}88`,
          boxShadow: isLight
            ? '0 18px 40px -10px rgba(15,23,42,0.16), inset 0 0 0 1px rgba(15,23,42,0.06)'
            : `0 16px 38px -8px ${primaryColor}40, inset 0 0 0 1px rgba(255,255,255,0.12)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="animate-spin"
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '31px',
            border: '2px solid transparent',
            borderTopColor: primaryColor,
            borderRightColor: `${primaryColor}44`,
            pointerEvents: 'none',
          }}
        />
        <img
          src={faviconUrl}
          alt="Logo"
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '19px',
            objectFit: 'cover',
            display: 'block',
            border: isLight
              ? '2px solid rgba(15,23,42,0.12)'
              : '2px solid rgba(255,255,255,0.28)',
            background: isLight ? '#ffffff' : '#18181b',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Skeleton ligero para cambio de módulos internos del ERP o pestañas de configuración sin salto brusco.
 */
export const ModuleWorkspaceSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando módulo..."
      className="w-full space-y-4 animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
          <div className="h-3.5 w-72 max-w-full rounded-lg bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse hidden sm:block" />
      </div>

      {!compact && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="saas-card p-4 space-y-2.5">
              <div className="h-3.5 w-24 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
              <div className="h-7 w-28 rounded-lg bg-zinc-200/90 dark:bg-zinc-800/90 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      <div className="saas-card p-5 space-y-3.5">
        <div className="h-5 w-40 rounded-lg bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {Array.from({ length: compact ? 3 : 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
