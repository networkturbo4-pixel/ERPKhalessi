import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { useStoreBuilder } from '../../context/StoreBuilderContext';
import { useSettings } from '../../context/SettingsContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { BuilderViewport, isBlockVisibleOnViewport } from '../../types/storeBuilder';
import { StoreBlockRenderer } from './StorefrontWidgets';
import { ArrowLeft, Globe, Shield } from 'lucide-react';

const StorefrontFooter = lazy(() =>
  import('./StorefrontFooter').then(m => ({ default: m.StorefrontFooter }))
);

function setMetaTag(attr: 'property' | 'name', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function resolveWindowViewport(): BuilderViewport {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export const CustomPagePublicView: React.FC<{
  slug: string;
  onNavigateHome: () => void;
  onNavigateToAdmin: () => void;
}> = ({ slug, onNavigateHome, onNavigateToAdmin }) => {
  const { customPages, trackPageView, trackPageCtaClick } = useStoreBuilder();
  const { customization, companyInfo, isAuthenticated, dispatchToast, activeTenant } = useSettings();
  const { products, upsertCustomer } = useOrderCatalog();

  const [viewport, setViewport] = useState<BuilderViewport>(() => resolveWindowViewport());
  const trackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    const onResize = () => setViewport(resolveWindowViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const page = customPages.find(p => p.slug.toLowerCase() === slug.toLowerCase());
  const canView = Boolean(page && (page.status === 'published' || isAuthenticated));

  useEffect(() => {
    if (!page || page.status !== 'published') return;
    if (trackedSlugRef.current === page.slug) return;
    trackedSlugRef.current = page.slug;
    trackPageView(page.slug);
  }, [page, trackPageView]);

  // Update document title & Open Graph meta tags
  useEffect(() => {
    if (!page || !canView) return;
    const ogTitle = page.seo.ogTitle || page.title;
    const ogDesc = page.seo.ogDescription || `${page.title} — ${companyInfo.commercialName}`;
    const ogImage = page.seo.ogImage || customization.storeHeaderLogo || '';
    const pageUrl = `${window.location.origin}/p/${page.slug}`;

    document.title = `${ogTitle} | ${companyInfo.commercialName}`;
    setMetaTag('property', 'og:title', ogTitle);
    setMetaTag('property', 'og:description', ogDesc);
    setMetaTag('property', 'og:type', page.seo.ogType || 'website');
    setMetaTag('property', 'og:url', pageUrl);
    if (ogImage) setMetaTag('property', 'og:image', ogImage);
    setMetaTag('name', 'description', ogDesc);
    setMetaTag('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMetaTag('name', 'twitter:title', ogTitle);
    setMetaTag('name', 'twitter:description', ogDesc);
    if (ogImage) setMetaTag('name', 'twitter:image', ogImage);
  }, [page, canView, companyInfo.commercialName, customization.storeHeaderLogo]);

  if (!page || !canView) {
    return (
      <div className="min-h-dvh bg-[#F8F9FA] dark:bg-[#0B0C10] text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-zinc-200/70 dark:bg-zinc-900 flex items-center justify-center text-zinc-500">
          <Globe className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold">Página no encontrada</h1>
          <p className="text-xs text-zinc-500 max-w-sm">
            La dirección <code className="font-mono">/p/{slug}</code> no existe o aún se encuentra en borrador.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateHome}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ir a la Tienda</span>
        </button>
      </div>
    );
  }

  const isLight = page.themeMode === 'light';
  const accent = page.accentColor || customization.primaryColor || '#e11d48';

  return (
    <div
      className={`min-h-dvh flex flex-col transition-colors ${
        isLight ? 'bg-white text-zinc-900' : 'bg-[#0b0c10] text-zinc-100'
      }`}
    >
      {page.status === 'draft' && isAuthenticated && (
        <div className="bg-amber-500 text-zinc-950 px-4 py-1.5 text-center text-xs font-bold">
          Vista previa de Borrador — Solo visible porque iniciaste sesión como Administrador.
        </div>
      )}

      {page.showStoreHeader && (
        <header
          className={`sticky top-0 z-40 border-b ${
            isLight
              ? 'bg-white/95 border-zinc-200/80'
              : 'bg-[#0d0e14]/95 border-zinc-800/80'
          }`}
        >
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 text-left"
            >
              {customization.storeHeaderLogo ? (
                <img
                  src={customization.storeHeaderLogo}
                  alt={companyInfo.commercialName}
                  className="h-8 w-auto max-w-[160px] object-contain"
                />
              ) : (
                <span className="text-sm font-extrabold tracking-tight">
                  {companyInfo.commercialName}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateHome}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                  isLight
                    ? 'border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                    : 'border-zinc-800 hover:bg-zinc-900 text-zinc-200'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Tienda</span>
              </button>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={onNavigateToAdmin}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 ${
                    isLight
                      ? 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                      : 'border-zinc-800 hover:bg-zinc-900 text-zinc-300'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">ERP</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-1 space-y-4">
        {page.blocks.map((block, idx) => {
          if (!isBlockVisibleOnViewport(block, viewport) || block.advanced.isHidden) return null;
          return (
            <div
              key={block.id}
              style={{
                paddingTop: `${block.advanced.paddingTop}px`,
                paddingBottom: `${block.advanced.paddingBottom}px`,
                marginBottom: `${block.advanced.marginBottom}px`,
              }}
            >
              <StoreBlockRenderer
                block={block}
                index={idx}
                viewport={viewport}
                themeMode={page.themeMode}
                accentColor={accent}
                autoButtonContrast={Boolean(page.autoButtonContrast)}
                products={products}
                activeCategory="todos"
                searchQuery=""
                onSelectCategory={onNavigateHome}
                onChangeSearch={() => {}}
                onSelectProduct={onNavigateHome}
                onQuickViewProduct={onNavigateHome}
                onCtaClick={() => trackPageCtaClick(page.slug)}
                onSubmitLead={lead => {
                  upsertCustomer(
                    {
                      dni: '',
                      fullName: lead.fullName,
                      email: lead.email || '',
                      whatsapp: lead.phone,
                      address: '',
                      reference: lead.message
                        ? `Lead /p/${page.slug}: ${lead.message}`
                        : `Lead /p/${page.slug}`,
                      tenantId: activeTenant.id,
                    },
                    true
                  );
                  dispatchToast('¡Gracias! Recibimos tus datos correctamente.', 'success');
                }}
              />
            </div>
          );
        })}
      </main>

      {page.showStoreFooter && (
        <Suspense fallback={<div className="h-32" />}>
          <StorefrontFooter footerTheme={page.footerTheme} />
        </Suspense>
      )}
    </div>
  );
};
