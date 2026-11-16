import React, { useMemo, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Download,
  Globe,
  Image as ImageIcon,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useSettings, DEFAULT_CUSTOMIZATION } from '../../context/SettingsContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import { StoreSeoConfig } from '../../types/settings';
import {
  buildLlmsTxtContent,
  buildRobotsTxtContent,
} from '../../utils/pwaManager';

export const SeoTab: React.FC = () => {
  const {
    customization,
    updateCustomization,
    companyInfo,
    dispatchToast,
  } = useSettings();
  const { products } = useOrderCatalog();

  const seo: StoreSeoConfig = useMemo(
    () => ({
      ...(DEFAULT_CUSTOMIZATION.seoConfig as StoreSeoConfig),
      ...(customization.seoConfig || {}),
    }),
    [customization.seoConfig]
  );

  const [copiedType, setCopiedType] = useState<'robots' | 'llms' | null>(null);

  const updateSeo = (partial: Partial<StoreSeoConfig>) => {
    updateCustomization({
      seoConfig: {
        ...seo,
        ...partial,
      },
    });
  };

  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      dispatchToast(
        'Imagen muy pesada',
        'Para Open Graph usa una imagen menor a 2.5 MB (recomendado 1200×630 px).',
        'warning'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSeo({ ogImage: reader.result });
        dispatchToast('Imagen Open Graph actualizada', 'Se aplicará al compartir la tienda.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const topProducts = useMemo(
    () =>
      products
        .filter(p => p.isAvailable)
        .slice(0, 12)
        .map(p => ({
          name: p.name,
          price: p.hasSizes ? (p.sizes.find(s => s.enabled)?.price ?? p.basePrice) : p.basePrice,
        })),
    [products]
  );

  const robotsTxt = useMemo(() => buildRobotsTxtContent(seo), [seo]);
  const llmsTxt = useMemo(
    () => buildLlmsTxtContent(seo, companyInfo.commercialName, topProducts),
    [seo, companyInfo.commercialName, topProducts]
  );

  const handleCopyText = async (type: 'robots' | 'llms') => {
    const text = type === 'robots' ? robotsTxt : llmsTxt;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      dispatchToast(
        `${type === 'robots' ? 'robots.txt' : 'llms.txt'} copiado`,
        'Listo para pegar en la raíz de tu servidor o CDN.',
        'success'
      );
      window.setTimeout(() => setCopiedType(null), 2000);
    } catch {
      dispatchToast('No se pudo copiar', 'Copia manualmente el contenido generado.', 'warning');
    }
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleResetSeo = () => {
    updateCustomization({
      seoConfig: DEFAULT_CUSTOMIZATION.seoConfig,
    });
    dispatchToast('SEO restablecido', 'Se restauraron los valores recomendados de SEO y Open Graph.', 'info');
  };

  const resolvedTitle = seo.metaTitle?.trim() || companyInfo.commercialName;
  const resolvedDesc = seo.metaDescription?.trim() || seo.aiBrandSummary || '';
  const resolvedUrl = seo.canonicalUrl?.trim() || 'https://pizzakhalessi.com';
  const resolvedOgTitle = seo.ogTitle?.trim() || resolvedTitle;
  const resolvedOgDesc = seo.ogDescription?.trim() || resolvedDesc;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="saas-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" style={{ color: customization.primaryColor }} />
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
              SEO, Buscadores de IA (GEO) & Open Graph
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configura cómo aparece tu tienda en Google, Bing, buscadores con IA (ChatGPT, Perplexity, Google AI) y al compartir en WhatsApp o redes sociales.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetSeo}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold saas-btn-secondary whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Recomendados</span>
        </button>
      </div>

      {/* 1. SEO Clásico (Google / Bing) */}
      <section className="saas-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              1. Posicionamiento en Buscadores (Google & Bing)
            </h3>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Permitir Indexación
            </span>
            <input
              type="checkbox"
              checked={seo.robotsIndex}
              onChange={e => updateSeo({ robotsIndex: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Título SEO Principal (&lt;title&gt;)
              </label>
              <span
                className={`text-[11px] font-mono ${
                  (seo.metaTitle?.length || 0) > 65 ? 'text-amber-500' : 'text-zinc-400'
                }`}
              >
                {seo.metaTitle?.length || 0}/60 rec.
              </span>
            </div>
            <input
              type="text"
              value={seo.metaTitle}
              onChange={e => updateSeo({ metaTitle: e.target.value })}
              placeholder="Ej: Khalessi Pizza Artesanal | Pizzas a la Leña y Delivery"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Meta Descripción
              </label>
              <span
                className={`text-[11px] font-mono ${
                  (seo.metaDescription?.length || 0) > 165 ? 'text-amber-500' : 'text-zinc-400'
                }`}
              >
                {seo.metaDescription?.length || 0}/160 rec.
              </span>
            </div>
            <textarea
              rows={2}
              value={seo.metaDescription}
              onChange={e => updateSeo({ metaDescription: e.target.value })}
              placeholder="Describe brevemente qué vendes, tu diferencial y zonas de entrega..."
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Palabras Clave (Keywords separadas por coma)
            </label>
            <input
              type="text"
              value={seo.keywords}
              onChange={e => updateSeo({ keywords: e.target.value })}
              placeholder="pizza artesanal, delivery lima, pizza napolitana, promociones..."
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              URL Canónica Principal
            </label>
            <input
              type="url"
              value={seo.canonicalUrl}
              onChange={e => updateSeo({ canonicalUrl: e.target.value })}
              placeholder="https://pizzakhalessi.com"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Idioma y Región (Locale)
            </label>
            <select
              value={seo.locale}
              onChange={e => updateSeo({ locale: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            >
              <option value="es_PE">Español — Perú (es_PE)</option>
              <option value="es_LA">Español — Latinoamérica (es_LA)</option>
              <option value="es_ES">Español — España (es_ES)</option>
              <option value="en_US">English — US (en_US)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Verificación Google Search Console (opcional)
            </label>
            <input
              type="text"
              value={seo.googleSiteVerification || ''}
              onChange={e => updateSeo({ googleSiteVerification: e.target.value })}
              placeholder="Código meta google-site-verification"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Verificación Bing Webmaster (opcional)
            </label>
            <input
              type="text"
              value={seo.bingSiteVerification || ''}
              onChange={e => updateSeo({ bingSiteVerification: e.target.value })}
              placeholder="Código meta msvalidate.01"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm font-mono"
            />
          </div>
        </div>

        {/* Live Google SERP Preview */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Vista Previa en Google
          </span>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{resolvedUrl}</div>
          <div className="text-base font-semibold text-blue-600 dark:text-blue-400 leading-snug line-clamp-1">
            {resolvedTitle}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {resolvedDesc}
          </p>
        </div>
      </section>

      {/* 2. Buscadores de IA (GEO / ChatGPT / Perplexity / Google AI) */}
      <section className="saas-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              2. Posicionamiento en Buscadores de IA (ChatGPT, Perplexity, Google AI)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Schema JSON-LD
              </span>
              <input
                type="checkbox"
                checked={seo.enableJsonLdSchema}
                onChange={e => updateSeo({ enableJsonLdSchema: e.target.checked })}
                className="w-4 h-4 accent-violet-600 rounded"
              />
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Permitir Bots de IA
              </span>
              <input
                type="checkbox"
                checked={seo.allowAiCrawlers}
                onChange={e => updateSeo({ allowAiCrawlers: e.target.checked })}
                className="w-4 h-4 accent-violet-600 rounded"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Tipo Schema.org
            </label>
            <select
              value={seo.businessTypeSchema}
              onChange={e =>
                updateSeo({
                  businessTypeSchema: e.target.value as StoreSeoConfig['businessTypeSchema'],
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            >
              <option value="Restaurant">Restaurant (Restaurante / Pizzería)</option>
              <option value="FastFoodRestaurant">FastFoodRestaurant (Comida Rápida)</option>
              <option value="LocalBusiness">LocalBusiness (Negocio Local)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Especialidad / Cocina (servesCuisine)
            </label>
            <input
              type="text"
              value={seo.cuisineType}
              onChange={e => updateSeo({ cuisineType: e.target.value })}
              placeholder="Pizzería Artesanal, Pizza Napolitana"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Rango de Precios (priceRange)
            </label>
            <input
              type="text"
              value={seo.priceRange}
              onChange={e => updateSeo({ priceRange: e.target.value })}
              placeholder="S/ 15 - S/ 70"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Resumen Estructurado para IAs (Contexto para LLMs y respuestas generativas)
            </label>
            <textarea
              rows={2}
              value={seo.aiBrandSummary}
              onChange={e => updateSeo({ aiBrandSummary: e.target.value })}
              placeholder="Explica con claridad qué ofrece la marca, ingredientes, horarios, sedes y cómo pedir..."
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Entidades y Temas Clave (knowsAbout — separados por coma)
            </label>
            <input
              type="text"
              value={seo.aiKeyTopics}
              onChange={e => updateSeo({ aiKeyTopics: e.target.value })}
              placeholder="Pizza artesanal a la leña, Masa madre 48h, Delivery Puente Piedra"
              className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* robots.txt & llms.txt Quick Export */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span>Archivos robots.txt y llms.txt listos para IA</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Incluye reglas para GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot y Google-Extended junto con tu catálogo activo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopyText('robots')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              {copiedType === 'robots' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar robots.txt</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopyText('llms')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              {copiedType === 'llms' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar llms.txt</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadFile('llms.txt', llmsTxt)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar llms.txt</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Open Graph & Redes Sociales */}
      <section className="saas-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <Share2 className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
            3. Open Graph & Redes Sociales (WhatsApp, Facebook, Instagram, X)
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Título al Compartir (og:title)
              </label>
              <input
                type="text"
                value={seo.ogTitle}
                onChange={e => updateSeo({ ogTitle: e.target.value })}
                placeholder="Si lo dejas vacío, usará el Título SEO"
                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Descripción al Compartir (og:description)
              </label>
              <textarea
                rows={2}
                value={seo.ogDescription}
                onChange={e => updateSeo({ ogDescription: e.target.value })}
                placeholder="Texto atractivo para cuando compartan el link por WhatsApp o Facebook..."
                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Imagen Open Graph (1200×630 px recomendada)
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="url"
                  value={seo.ogImage}
                  onChange={e => updateSeo({ ogImage: e.target.value })}
                  placeholder="https://... o sube una imagen"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
                />
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold saas-btn-secondary cursor-pointer whitespace-nowrap shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleOgImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nombre del Sitio (og:site_name)
              </label>
              <input
                type="text"
                value={seo.ogSiteName}
                onChange={e => updateSeo({ ogSiteName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tipo Open Graph (og:type)
              </label>
              <select
                value={seo.ogType}
                onChange={e =>
                  updateSeo({ ogType: e.target.value as StoreSeoConfig['ogType'] })
                }
                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
              >
                <option value="website">website (Tienda / Web general)</option>
                <option value="restaurant.restaurant">restaurant.restaurant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Formato X / Twitter Card
              </label>
              <select
                value={seo.twitterCard}
                onChange={e =>
                  updateSeo({ twitterCard: e.target.value as StoreSeoConfig['twitterCard'] })
                }
                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
              >
                <option value="summary_large_image">Imagen Grande (summary_large_image)</option>
                <option value="summary">Tarjeta Compacta (summary)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Usuario X / Twitter (opcional)
              </label>
              <input
                type="text"
                value={seo.twitterHandle || ''}
                onChange={e => updateSeo({ twitterHandle: e.target.value })}
                placeholder="@pizzakhalessi"
                className="w-full px-3.5 py-2.5 rounded-xl saas-input text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Live Social Share Preview Card */}
          <div className="lg:col-span-5 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Vista Previa al Compartir (WhatsApp / Facebook / X)
            </span>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden shadow-sm">
              <div className="aspect-[1200/630] bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                {seo.ogImage ? (
                  <img
                    src={seo.ogImage}
                    alt="Vista previa Open Graph"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-[11px]">Sin imagen Open Graph</span>
                  </div>
                )}
              </div>
              <div className="p-3.5 space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 truncate">
                  {resolvedUrl.replace(/^https?:\/\//, '')}
                </div>
                <div className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">
                  {resolvedOgTitle}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {resolvedOgDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
