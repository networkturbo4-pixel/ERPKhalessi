import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  StoreTemplate,
  StoreBlock,
  StoreBlockType,
  BuilderViewport,
  SliderBlockConfig,
  CategoriesBlockConfig,
  ProductGridBlockConfig,
  SearchBarBlockConfig,
  PromoStripBlockConfig,
  TextBlockConfig,
  ParagraphBlockConfig,
  VideoBlockConfig,
  ImageBlockConfig,
  ButtonBlockConfig,
  ColumnsBlockConfig,
  SpacerBlockConfig,
  FaqBlockConfig,
  CountdownBlockConfig,
  LeadFormBlockConfig,
  CustomPage,
  getOptimalContrastHex,
  toProductSlug,
} from '../types/storeBuilder';
import { useSettings } from './SettingsContext';

const BUILDER_STORAGE_KEY = 'kh_store_builder_v2';

export function createDefaultBlock(type: StoreBlockType): StoreBlock {
  const uid = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

  if (type === 'slider') {
    const block: SliderBlockConfig = {
      type: 'slider',
      id: uid,
      title: '',
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      heightMobile: 250,
      heightTablet: 330,
      heightDesktop: 400,
      widthMobile: '100%',
      widthTablet: '100%',
      widthDesktop: '100%',
      autoplay: true,
      autoplaySpeedSec: 5,
      showArrows: true,
      showDots: true,
      borderRadiusPx: 20,
      slides: [
        {
          id: `sld-${Date.now()}-1`,
          badge: '✨ Pizzas Artesanales de Verdad',
          headline: 'Masa Madre, Borde Relleno & Hot Honey Artesanal',
          subheadline:
            'Personaliza cada ingrediente, selecciona el tamaño ideal y recibe tu pizza recién salida del horno en minutos.',
          ctaLabel: 'Pedir Pepperoni Hot Honey',
          overlayOpacity: 60,
          imageDesktop:
            'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1400&q=80',
          imageTablet:
            'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
          imageMobile:
            'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=80',
          actionType: 'product',
          productId: 'prod-pepperoni-honey',
        },
        {
          id: `sld-${Date.now()}-2`,
          badge: '🔥 Súper Ahorro Familiar',
          headline: 'Combo Pareja Khalessi con Pan al Ajo & Bebida 1.5L',
          subheadline: 'Ideal para compartir hoy mismo con despacho express desde nuestro horno de piedra.',
          ctaLabel: 'Ver Combo Especial',
          overlayOpacity: 58,
          imageDesktop:
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=80',
          imageTablet:
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
          imageMobile:
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80',
          actionType: 'product',
          productId: 'prod-combo-khalessi',
        },
      ],
      advanced: {
        paddingTop: 4,
        paddingBottom: 8,
        marginBottom: 8,
        animation: 'fade-in',
      },
    };
    return block;
  }

  if (type === 'categories') {
    const block: CategoriesBlockConfig = {
      type: 'categories',
      id: uid,
      title: '',
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      style: 'pills',
      hiddenCategories: [],
      showCount: true,
      gapPx: 12,
      columnsMobile: 'auto',
      columnsTablet: 'auto',
      columnsDesktop: 'auto',
      advanced: {
        paddingTop: 4,
        paddingBottom: 4,
        marginBottom: 8,
        animation: 'none',
      },
    };
    return block;
  }

  if (type === 'product_grid') {
    const block: ProductGridBlockConfig = {
      type: 'product_grid',
      id: uid,
      title: 'Nuestro Menú Artesanal',
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      cardStyle: 'elegante',
      columnsMobile: 1,
      columnsTablet: 2,
      columnsDesktop: 3,
      categoryFilter: 'active_sync',
      manualIds: '',
      maxInitialProducts: 10,
      enableLoadMore: true,
      horizontalCarousel: false,
      bleedImages: true,
      squareImage: false,
      imageFit: 'cover',
      quickViewButton: true,
      showPrice: true,
      showStock: false,
      showDescription: true,
      showVariants: true,
      gapPx: 20,
      advanced: {
        paddingTop: 4,
        paddingBottom: 12,
        marginBottom: 12,
        animation: 'slide-up',
      },
    };
    return block;
  }

  if (type === 'search_bar') {
    const block: SearchBarBlockConfig = {
      type: 'search_bar',
      id: uid,
      title: '',
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      placeholder: 'Buscar por nombre, ingredientes o categoría...',
      visualStyle: 'modern',
      advanced: {
        paddingTop: 0,
        paddingBottom: 4,
        marginBottom: 4,
        animation: 'none',
      },
    };
    return block;
  }

  if (type === 'text') {
    const block: TextBlockConfig = {
      type: 'text',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      eyebrow: 'DESTACADO',
      text: 'Título Personalizable para tu Página',
      tag: 'h2',
      fontSizeMobile: 22,
      fontSizeTablet: 28,
      fontSizeDesktop: 34,
      alignMobile: 'left',
      alignTablet: 'left',
      alignDesktop: 'left',
      maxWidthMobile: '100%',
      maxWidthTablet: '100%',
      maxWidthDesktop: '100%',
      fontWeight: 800,
      letterSpacing: 'tight',
      lineHeight: 'tight',
      textColor: '',
      bgColor: '',
      borderColor: '',
      borderWidth: 0,
      borderRadiusPx: 14,
      paddingX: 0,
      paddingY: 4,
      accentPosition: 'none',
      accentColor: '',
      advanced: {
        paddingTop: 6,
        paddingBottom: 6,
        marginBottom: 8,
        animation: 'fade-in',
      },
    };
    return block;
  }

  if (type === 'paragraph') {
    const block: ParagraphBlockConfig = {
      type: 'paragraph',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      leadText: '',
      text: 'Escribe aquí tu contenido editorial, historia de marca, condiciones de una promoción o detalles especiales. Puedes ajustar tamaño, alineación, ancho máximo, colores y bordes para cada pantalla.',
      fontSizeMobile: 14,
      fontSizeTablet: 15,
      fontSizeDesktop: 16,
      alignMobile: 'left',
      alignTablet: 'left',
      alignDesktop: 'left',
      maxWidthMobile: '100%',
      maxWidthTablet: '100%',
      maxWidthDesktop: '85%',
      fontWeight: 400,
      lineHeight: 'relaxed',
      textColor: '',
      bgColor: '',
      borderColor: '',
      borderWidth: 0,
      borderRadiusPx: 14,
      paddingX: 0,
      paddingY: 4,
      leftBorderAccent: false,
      accentColor: '',
      advanced: {
        paddingTop: 4,
        paddingBottom: 8,
        marginBottom: 8,
        animation: 'none',
      },
    };
    return block;
  }

  if (type === 'video') {
    const block: VideoBlockConfig = {
      type: 'video',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      title: '',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      posterUrl: '',
      caption: '',
      aspectRatio: '16:9',
      autoplay: false,
      muted: false,
      loop: false,
      controls: true,
      widthMobile: '100%',
      widthTablet: '100%',
      widthDesktop: '100%',
      heightMobile: 0,
      heightTablet: 0,
      heightDesktop: 0,
      alignMobile: 'center',
      alignTablet: 'center',
      alignDesktop: 'center',
      borderRadiusPx: 18,
      borderColor: '',
      borderWidth: 0,
      shadow: 'md',
      advanced: {
        paddingTop: 6,
        paddingBottom: 10,
        marginBottom: 10,
        animation: 'fade-in',
      },
    };
    return block;
  }

  if (type === 'image') {
    const block: ImageBlockConfig = {
      type: 'image',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      src: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
      srcTablet: '',
      srcMobile: '',
      alt: 'Imagen promocional Khalessi Pizza',
      caption: '',
      actionType: 'none',
      linkUrl: '',
      productId: '',
      openInNewTab: false,
      widthMobile: '100%',
      widthTablet: '100%',
      widthDesktop: '100%',
      heightMobile: 0,
      heightTablet: 0,
      heightDesktop: 0,
      alignMobile: 'center',
      alignTablet: 'center',
      alignDesktop: 'center',
      objectFit: 'cover',
      aspectRatio: '16:9',
      borderRadiusPx: 18,
      borderColor: '',
      borderWidth: 0,
      shadow: 'sm',
      advanced: {
        paddingTop: 6,
        paddingBottom: 10,
        marginBottom: 10,
        animation: 'fade-in',
      },
    };
    return block;
  }

  if (type === 'button') {
    const block: ButtonBlockConfig = {
      type: 'button',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      label: 'Ordenar Ahora',
      sublabel: '',
      icon: 'arrow',
      actionType: 'url',
      linkUrl: '/',
      productId: '',
      whatsappNumber: '',
      whatsappMessage: 'Hola, quiero hacer un pedido',
      openInNewTab: false,
      alignMobile: 'full',
      alignTablet: 'left',
      alignDesktop: 'left',
      sizeMobile: 'md',
      sizeTablet: 'md',
      sizeDesktop: 'lg',
      variant: 'solid',
      bgColor: '',
      textColor: '',
      borderColor: '',
      borderRadiusPx: 14,
      fontWeight: 700,
      shadow: 'sm',
      advanced: {
        paddingTop: 6,
        paddingBottom: 8,
        marginBottom: 8,
        animation: 'none',
      },
    };
    return block;
  }

  if (type === 'columns') {
    const tId = Date.now();
    const block: ColumnsBlockConfig = {
      type: 'columns',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      title: '',
      columnsMobile: 1,
      columnsTablet: 2,
      columnsDesktop: 2,
      gapPx: 20,
      verticalAlign: 'center',
      bgColor: '',
      borderColor: '',
      borderWidth: 0,
      borderRadiusPx: 18,
      paddingPx: 0,
      columns: [
        {
          id: `col-${tId}-1`,
          blocks: [createDefaultBlock('image')],
        },
        {
          id: `col-${tId}-2`,
          blocks: [createDefaultBlock('text'), createDefaultBlock('paragraph'), createDefaultBlock('button')],
        },
      ],
      advanced: {
        paddingTop: 8,
        paddingBottom: 8,
        marginBottom: 12,
        animation: 'fade-in',
      },
    };
    return block;
  }

  if (type === 'spacer') {
    const block: SpacerBlockConfig = {
      type: 'spacer',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      heightMobile: 16,
      heightTablet: 24,
      heightDesktop: 32,
      showDivider: true,
      dividerColor: '',
      dividerStyle: 'solid',
      dividerThickness: 1,
      dividerWidth: '100%',
      advanced: {
        paddingTop: 0,
        paddingBottom: 0,
        marginBottom: 4,
        animation: 'none',
      },
    };
    return block;
  }

  if (type === 'faq') {
    const tId = Date.now();
    const block: FaqBlockConfig = {
      type: 'faq',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      title: 'Preguntas Frecuentes',
      subtitle: 'Resolvemos tus dudas al instante',
      allowMultipleOpen: false,
      accentColor: '',
      borderRadiusPx: 16,
      items: [
        {
          id: `faq-${tId}-1`,
          question: '¿Cuál es el tiempo promedio de delivery?',
          answer: 'Entregamos en 30 a 40 minutos en nuestras zonas de cobertura activas.',
        },
        {
          id: `faq-${tId}-2`,
          question: '¿Qué métodos de pago aceptan?',
          answer: 'Aceptamos VISA, Mastercard, Yape, Plin y pago en efectivo contra entrega.',
        },
      ],
      advanced: {
        paddingTop: 8,
        paddingBottom: 8,
        marginBottom: 12,
        animation: 'fade-in',
      },
    };
    return block;
  }

  if (type === 'countdown') {
    const target = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const block: CountdownBlockConfig = {
      type: 'countdown',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      title: '¡Oferta por Tiempo Limitado!',
      subtitle: 'Aprovecha este beneficio antes de que termine el reloj.',
      targetDateIso: target.toISOString().slice(0, 16),
      expiredText: 'Esta promoción ha finalizado',
      ctaLabel: 'Pedir Ahora',
      ctaUrl: '/',
      bgColor: '',
      textColor: '',
      accentColor: '',
      borderRadiusPx: 20,
      alignMobile: 'center',
      alignTablet: 'center',
      alignDesktop: 'center',
      advanced: {
        paddingTop: 8,
        paddingBottom: 8,
        marginBottom: 12,
        animation: 'fade-in',
      },
    };
    return block;
  }

  if (type === 'lead_form') {
    const block: LeadFormBlockConfig = {
      type: 'lead_form',
      id: uid,
      onlyMobile: false,
      onlyTablet: false,
      onlyDesktop: false,
      title: 'Solicita Información o Catering',
      subtitle: 'Déjanos tus datos y te contactamos por WhatsApp en minutos.',
      submitLabel: 'Enviar Solicitud',
      successMessage: '¡Gracias! Recibimos tus datos correctamente y te contactaremos pronto.',
      showEmail: true,
      showMessage: true,
      bgColor: '',
      accentColor: '',
      borderRadiusPx: 20,
      advanced: {
        paddingTop: 8,
        paddingBottom: 8,
        marginBottom: 12,
        animation: 'fade-in',
      },
    };
    return block;
  }

  const promo: PromoStripBlockConfig = {
    type: 'promo_strip',
    id: uid,
    onlyMobile: false,
    onlyTablet: false,
    onlyDesktop: false,
    badgeText: 'HORNO DE LEÑA 430°C',
    title: '¡Delivery Gratis en pedidos mayores a S/ 85.00!',
    subtitle: 'Masa fermentada 48 horas e ingredientes importados frescos en cada porción.',
    ctaLabel: 'Aprovechar Promo',
    actionType: 'product',
    productId: 'prod-combo-khalessi',
    bgTone: 'amber',
    advanced: {
      paddingTop: 4,
      paddingBottom: 4,
      marginBottom: 8,
      animation: 'fade-in',
    },
  };
  return promo;
}

export const FACTORY_TEMPLATES: StoreTemplate[] = [
  {
    id: 'tpl-artesanal-dark',
    name: 'Brasas Nocturnas (Dark)',
    tagline: 'Estilo gourmet oscuro de alto contraste con Slider Hero, Pastillas y Tarjetas Elegantes.',
    previewBadge: 'Predeterminada 🔥',
    themeMode: 'dark',
    footerTheme: 'light',
    accentColor: '#f59e0b',
    buttonColor: '#f59e0b',
    buttonTextColor: '#09090b',
    autoButtonContrast: false,
    blocks: [
      {
        type: 'slider',
        id: 'blk-dark-slider',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        heightMobile: 260,
        heightTablet: 340,
        heightDesktop: 390,
        widthMobile: '100%',
        widthTablet: '100%',
        widthDesktop: '100%',
        autoplay: true,
        autoplaySpeedSec: 5,
        showArrows: true,
        showDots: true,
        borderRadiusPx: 22,
        slides: [
          {
            id: 's-dark-1',
            badge: '✨ Pizzas Artesanales de Verdad',
            headline: 'Masa Madre, Borde Relleno & Hot Honey Artesanal',
            subheadline:
              'Personaliza cada ingrediente, selecciona el tamaño ideal y recibe tu pizza recién salida del horno en minutos.',
            ctaLabel: 'Ordenar Hot Honey',
            overlayOpacity: 62,
            imageDesktop:
              'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1400&q=80',
            imageTablet:
              'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
            imageMobile:
              'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=80',
            actionType: 'product',
            productId: 'prod-pepperoni-honey',
          },
          {
            id: 's-dark-2',
            badge: '🥩 Especialidad de la Casa',
            headline: 'Carnívora Khalessi Supreme al Horno de Leña',
            subheadline:
              'Jamón selecto, pepperoni crocante, carne sazonada, tocino ahumado y doble mozzarella fundida.',
            ctaLabel: 'Personalizar Pizza',
            overlayOpacity: 58,
            imageDesktop:
              'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=80',
            imageTablet:
              'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
            imageMobile:
              'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80',
            actionType: 'product',
            productId: 'prod-carnivora-khalessi',
          },
          {
            id: 's-dark-3',
            badge: '💰 Combo Pareja',
            headline: 'Pizza Familiar + Pan al Ajo + Gaseosa 1.5L',
            subheadline: 'La combinación favorita para tus noches de películas o reuniones en casa.',
            ctaLabel: 'Pedir Combo S/ 59.90',
            overlayOpacity: 60,
            imageDesktop:
              'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=1400&q=80',
            imageTablet:
              'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=1000&q=80',
            imageMobile:
              'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=700&q=80',
            actionType: 'product',
            productId: 'prod-combo-khalessi',
          },
        ],
        advanced: { paddingTop: 4, paddingBottom: 4, marginBottom: 8, animation: 'fade-in' },
      },
      {
        type: 'search_bar',
        id: 'blk-dark-search',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        placeholder: 'Buscar por nombre, ingredientes o categoría...',
        visualStyle: 'modern',
        advanced: { paddingTop: 0, paddingBottom: 0, marginBottom: 6, animation: 'none' },
      },
      {
        type: 'categories',
        id: 'blk-dark-cats',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        style: 'pills',
        hiddenCategories: [],
        showCount: true,
        gapPx: 12,
        columnsMobile: 'auto',
        columnsTablet: 'auto',
        columnsDesktop: 'auto',
        advanced: { paddingTop: 0, paddingBottom: 0, marginBottom: 8, animation: 'none' },
      },
      {
        type: 'product_grid',
        id: 'blk-dark-products',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'elegante',
        columnsMobile: 1,
        columnsTablet: 2,
        columnsDesktop: 3,
        categoryFilter: 'active_sync',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: true,
        horizontalCarousel: false,
        bleedImages: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: true,
        gapPx: 20,
        advanced: { paddingTop: 0, paddingBottom: 12, marginBottom: 8, animation: 'slide-up' },
      },
    ],
  },
  {
    id: 'tpl-napolitana-light',
    name: 'Trattoria Napolitana (Claro)',
    tagline: 'Diseño luminoso editorial italiano con tarjetas limpias, carrusel de promos y footer blanco.',
    previewBadge: 'Luminosa ☀️',
    themeMode: 'light',
    footerTheme: 'light',
    accentColor: '#e11d48',
    buttonColor: '#e11d48',
    buttonTextColor: '#ffffff',
    autoButtonContrast: false,
    blocks: [
      {
        type: 'slider',
        id: 'blk-light-slider',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        heightMobile: 250,
        heightTablet: 350,
        heightDesktop: 420,
        widthMobile: '100%',
        widthTablet: '100%',
        widthDesktop: '100%',
        autoplay: true,
        autoplaySpeedSec: 5,
        showArrows: true,
        showDots: true,
        borderRadiusPx: 24,
        slides: [
          {
            id: 's-light-1',
            badge: '🇮🇹 Auténtica Receta Italiana',
            headline: 'Cuatro Quesos Fior di Latte & Mozzarella de Búfala',
            subheadline: 'Harina tipo 00 italiana, tomate San Marzano y horneado tradicional a la leña.',
            ctaLabel: 'Probar Fior di Latte',
            overlayOpacity: 52,
            imageDesktop:
              'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=1400&q=80',
            imageTablet:
              'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=1000&q=80',
            imageMobile:
              'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=700&q=80',
            actionType: 'product',
            productId: 'prod-cuatro-quesos',
          },
          {
            id: 's-light-2',
            badge: '🔥 Favorita de la Casa',
            headline: 'Pepperoni Crocante con Toque de Hot Honey',
            subheadline: 'Equilibrio perfecto entre picante sutil, dulzor artesanal y borde aireado.',
            ctaLabel: 'Ordenar Ahora',
            overlayOpacity: 55,
            imageDesktop:
              'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1400&q=80',
            imageTablet:
              'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
            imageMobile:
              'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=80',
            actionType: 'product',
            productId: 'prod-pepperoni-honey',
          },
        ],
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 8, animation: 'fade-in' },
      },
      {
        type: 'categories',
        id: 'blk-light-cats',
        title: 'Explora Nuestras Categorías',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        style: 'cards',
        hiddenCategories: [],
        showCount: true,
        gapPx: 14,
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        advanced: { paddingTop: 4, paddingBottom: 6, marginBottom: 8, animation: 'slide-up' },
      },
      {
        type: 'search_bar',
        id: 'blk-light-search',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        placeholder: '¿Qué pizza o entrada te provoca hoy?',
        visualStyle: 'pill',
        advanced: { paddingTop: 0, paddingBottom: 4, marginBottom: 6, animation: 'none' },
      },
      {
        type: 'product_grid',
        id: 'blk-light-promos',
        title: 'Nuestras Promociones & Favoritas',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'clasica',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 4,
        categoryFilter: 'all',
        manualIds: '1, 2, 5, 7',
        maxInitialProducts: 4,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        quickViewButton: true,
        showPrice: true,
        showStock: true,
        showDescription: false,
        showVariants: true,
        gapPx: 16,
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 10, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-light-all',
        title: 'Carta Artesanal Completa',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'elegante',
        columnsMobile: 1,
        columnsTablet: 2,
        columnsDesktop: 3,
        categoryFilter: 'active_sync',
        manualIds: '',
        maxInitialProducts: 12,
        enableLoadMore: true,
        horizontalCarousel: false,
        bleedImages: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: true,
        gapPx: 20,
        advanced: { paddingTop: 4, paddingBottom: 12, marginBottom: 8, animation: 'slide-up' },
      },
    ],
  },
  {
    id: 'tpl-express-promos',
    name: 'Express Delivery Pro',
    tagline: 'Optimizada para conversión rápida tipo app móvil con tarjetas compactas y círculos.',
    previewBadge: 'Alta Conversión ⚡',
    themeMode: 'dark',
    footerTheme: 'dark',
    accentColor: '#ea580c',
    buttonColor: '#ea580c',
    buttonTextColor: '#ffffff',
    autoButtonContrast: false,
    blocks: [
      {
        type: 'promo_strip',
        id: 'blk-exp-strip',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        badgeText: 'DESPACHO EN 30 MIN',
        title: 'Pide directo sin comisiones y acumula puntos Khalessi',
        subtitle: 'Atención directa de nuestro horno a tu puerta con empaque térmico sellado.',
        ctaLabel: 'Ver Combo Pareja',
        actionType: 'product',
        productId: 'prod-combo-khalessi',
        bgTone: 'crimson',
        advanced: { paddingTop: 0, paddingBottom: 4, marginBottom: 6, animation: 'fade-in' },
      },
      {
        type: 'slider',
        id: 'blk-exp-slider',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        heightMobile: 220,
        heightTablet: 300,
        heightDesktop: 340,
        widthMobile: '100%',
        widthTablet: '100%',
        widthDesktop: '100%',
        autoplay: true,
        autoplaySpeedSec: 4,
        showArrows: true,
        showDots: true,
        borderRadiusPx: 18,
        slides: [
          {
            id: 's-exp-1',
            badge: '⚡ Promo Relámpago',
            headline: 'Combo Pareja Khalessi S/ 59.90',
            subheadline: 'Pizza Familiar + Pan al Ajo con Mozzarella + Bebida 1.5L helada.',
            ctaLabel: 'Agregar Combo',
            overlayOpacity: 60,
            imageDesktop:
              'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=1400&q=80',
            imageTablet:
              'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=1000&q=80',
            imageMobile:
              'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=700&q=80',
            actionType: 'product',
            productId: 'prod-combo-khalessi',
          },
          {
            id: 's-exp-2',
            badge: '🍗 Complemento Ideal',
            headline: 'Alitas Glaseadas BBQ o Spicy Recién Horneadas',
            subheadline: 'Crujientes por fuera y bañadas en salsa artesanal con ajonjolí tostado.',
            ctaLabel: 'Pedir Alitas',
            overlayOpacity: 58,
            imageDesktop:
              'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1400&q=80',
            imageTablet:
              'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1000&q=80',
            imageMobile:
              'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=700&q=80',
            actionType: 'product',
            productId: 'prod-alitas-bbq',
          },
        ],
        advanced: { paddingTop: 0, paddingBottom: 4, marginBottom: 6, animation: 'fade-in' },
      },
      {
        type: 'categories',
        id: 'blk-exp-cats',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        style: 'circles',
        hiddenCategories: [],
        showCount: false,
        gapPx: 16,
        columnsMobile: 'auto',
        columnsTablet: 'auto',
        columnsDesktop: 'auto',
        advanced: { paddingTop: 4, paddingBottom: 4, marginBottom: 6, animation: 'none' },
      },
      {
        type: 'product_grid',
        id: 'blk-exp-compact',
        title: 'Pide en 1 Toque',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'compacta',
        columnsMobile: 1,
        columnsTablet: 2,
        columnsDesktop: 2,
        categoryFilter: 'active_sync',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: true,
        horizontalCarousel: false,
        bleedImages: true,
        quickViewButton: true,
        showPrice: true,
        showStock: true,
        showDescription: true,
        showVariants: true,
        gapPx: 14,
        advanced: { paddingTop: 0, paddingBottom: 12, marginBottom: 8, animation: 'slide-up' },
      },
    ],
  },
  {
    id: 'tpl-gourmet-editorial',
    name: 'Editorial Póster Gourmet',
    tagline: 'Tarjetas inmersivas a pantalla completa, pestañas minimalistas y estética de autor.',
    previewBadge: 'Gourmet 👑',
    themeMode: 'dark',
    footerTheme: 'light',
    accentColor: '#eab308',
    buttonColor: '#eab308',
    buttonTextColor: '#09090b',
    autoButtonContrast: false,
    blocks: [
      {
        type: 'slider',
        id: 'blk-grm-slider',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        heightMobile: 280,
        heightTablet: 380,
        heightDesktop: 450,
        widthMobile: '100%',
        widthTablet: '100%',
        widthDesktop: '100%',
        autoplay: true,
        autoplaySpeedSec: 6,
        showArrows: true,
        showDots: true,
        borderRadiusPx: 26,
        slides: [
          {
            id: 's-grm-1',
            badge: '👑 Colección de Autor',
            headline: 'Fermentación Lenta 48 Horas & Fuego Vivo',
            subheadline: 'Descubre nuestra carta de pizzas de autor con ingredientes seleccionados.',
            ctaLabel: 'Explorar Selección',
            overlayOpacity: 55,
            imageDesktop:
              'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=1400&q=80',
            imageTablet:
              'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=1000&q=80',
            imageMobile:
              'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=700&q=80',
            actionType: 'product',
            productId: 'prod-cuatro-quesos',
          },
        ],
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 10, animation: 'zoom-in' },
      },
      {
        type: 'categories',
        id: 'blk-grm-cats',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        style: 'tabs',
        hiddenCategories: [],
        showCount: true,
        gapPx: 18,
        columnsMobile: 'auto',
        columnsTablet: 'auto',
        columnsDesktop: 'auto',
        advanced: { paddingTop: 0, paddingBottom: 4, marginBottom: 8, animation: 'none' },
      },
      {
        type: 'product_grid',
        id: 'blk-grm-grid',
        title: 'Selección del Maestro Pizzero',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'inmersiva',
        columnsMobile: 1,
        columnsTablet: 2,
        columnsDesktop: 3,
        categoryFilter: 'active_sync',
        manualIds: '',
        maxInitialProducts: 9,
        enableLoadMore: true,
        horizontalCarousel: false,
        bleedImages: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: true,
        gapPx: 22,
        advanced: { paddingTop: 4, paddingBottom: 14, marginBottom: 10, animation: 'fade-in' },
      },
    ],
  },
  // =========================================================================
  // 4 NUEVAS PLANTILLAS RESPONSIVE INSPIRADAS EN CADENAS FAST-FOOD & PIZZA
  // =========================================================================
  {
    id: 'tpl-hut-express',
    name: 'Hut Express (Rojo & Blanco)',
    tagline: 'Estilo fast-food rojo carmesí con barra promocional superior, carruseles horizontales, chips de categorías y footer oscuro.',
    previewBadge: 'Fast-Food',
    themeMode: 'light',
    footerTheme: 'dark',
    headerVariant: 'hut_crimson',
    footerVariant: 'hut_crimson',
    accentColor: '#C8102E',
    buttonColor: '#C8102E',
    buttonTextColor: '#ffffff',
    autoButtonContrast: false,
    showHeaderCartButton: true,
    blocks: [
      {
        type: 'promo_strip',
        id: 'blk-hut-top-strip',
        title: 'Pizza XXL: 24 porciones hechas con masa fresca diaria',
        subtitle: 'Contundente y viene con 6 sabores a elección · Aplican TyC',
        badgeText: 'EXCLUSIVO WEB',
        ctaLabel: 'Ver Promos',
        actionType: 'none',
        bgTone: 'dark',
        visualStyle: 'compact_bar',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        advanced: { paddingTop: 0, paddingBottom: 0, marginBottom: 8, animation: 'fade-in' },
      },
      {
        type: 'slider',
        id: 'blk-hut-hero',
        title: '',
        visualStyle: 'classic',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        heightMobile: 210,
        heightTablet: 300,
        heightDesktop: 360,
        widthMobile: '100%',
        widthTablet: '100%',
        widthDesktop: '100%',
        autoplay: true,
        autoplaySpeedSec: 5,
        showArrows: true,
        showDots: true,
        borderRadiusPx: 18,
        slides: [
          {
            id: 's-hut-1',
            badge: 'COMBO ESPECIAL',
            headline: 'Combo Familiar + Postre desde S/ 49.90',
            subheadline: '01 Pizza Familiar + 01 Complemento + Bebida 1.5L · ¡Compra aquí!',
            ctaLabel: '¡COMPRA AQUÍ!',
            overlayOpacity: 45,
            imageDesktop: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=80',
            imageTablet: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
            imageMobile: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80',
            actionType: 'none',
          },
          {
            id: 's-hut-2',
            badge: '2x1 WEB',
            headline: '2x1 en Pizzas Medianas Clásicas',
            subheadline: 'Lleva 2 pizzas recién horneadas al precio de una.',
            ctaLabel: 'Pedir 2x1',
            overlayOpacity: 50,
            imageDesktop: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1400&q=80',
            imageTablet: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
            imageMobile: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=80',
            actionType: 'none',
          },
        ],
        advanced: { paddingTop: 4, paddingBottom: 6, marginBottom: 10, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-hut-top',
        title: 'Lo más top del momento',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'clasica',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'combos',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 6, paddingBottom: 6, marginBottom: 12, animation: 'slide-up' },
      },
      {
        type: 'categories',
        id: 'blk-hut-cats',
        title: 'Las del momento',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        style: 'split_badge',
        hiddenCategories: [],
        showCount: false,
        gapPx: 12,
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 4,
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 12, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-hut-pide',
        title: 'Pide Ahora',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'clasica',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'pizzas',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 6, marginBottom: 12, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-hut-antojitos',
        title: 'Antojitos y Complementos',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'clasica',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'entradas',
        manualIds: '',
        maxInitialProducts: 8,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 12, marginBottom: 8, animation: 'fade-in' },
      },
    ],
  },
  {
    id: 'tpl-papa-fresh',
    name: 'Papa Fresh (Verde & Lima)',
    tagline: 'Diseño fresco verde bosque y lima vibrante con categorías circulares, banners de horario/cupones, bloques dobles y FAQ.',
    previewBadge: 'Fresco',
    themeMode: 'light',
    footerTheme: 'light',
    headerVariant: 'papa_fresh',
    footerVariant: 'papa_fresh',
    accentColor: '#00643C',
    buttonColor: '#B7E300',
    buttonTextColor: '#09090b',
    autoButtonContrast: false,
    showHeaderCartButton: true,
    blocks: [
      {
        type: 'promo_strip',
        id: 'blk-papa-strip',
        title: 'Incluye Delivery GRATIS en pedidos web y WhatsApp',
        subtitle: 'Promociones exclusivas online todos los días',
        badgeText: 'PAPA DAYS',
        ctaLabel: 'Ver Tiendas',
        actionType: 'none',
        bgTone: 'amber',
        visualStyle: 'compact_bar',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        advanced: { paddingTop: 0, paddingBottom: 0, marginBottom: 8, animation: 'fade-in' },
      },
      {
        type: 'slider',
        id: 'blk-papa-hero',
        title: '',
        visualStyle: 'classic',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        heightMobile: 220,
        heightTablet: 310,
        heightDesktop: 370,
        widthMobile: '100%',
        widthTablet: '100%',
        widthDesktop: '100%',
        autoplay: true,
        autoplaySpeedSec: 5,
        showArrows: true,
        showDots: true,
        borderRadiusPx: 18,
        slides: [
          {
            id: 's-papa-1',
            badge: 'DESDE S/ 29.90',
            headline: 'Mejores Ingredientes, Mejor Pizza',
            subheadline: 'En las pizzas con más ingredientes frescos · ¡Por tiempo limitado!',
            ctaLabel: 'COMPRAR',
            overlayOpacity: 48,
            imageDesktop: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1400&q=80',
            imageTablet: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=80',
            imageMobile: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=700&q=80',
            actionType: 'none',
          },
        ],
        advanced: { paddingTop: 2, paddingBottom: 6, marginBottom: 10, animation: 'fade-in' },
      },
      {
        type: 'categories',
        id: 'blk-papa-cats',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        style: 'circles',
        hiddenCategories: [],
        showCount: false,
        gapPx: 14,
        columnsMobile: 3,
        columnsTablet: 5,
        columnsDesktop: 6,
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 10, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-papa-promos',
        title: 'PROMOS IMPERDIBLES',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'elegante',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'combos',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 6, marginBottom: 12, animation: 'slide-up' },
      },
      {
        type: 'promo_strip',
        id: 'blk-papa-horario',
        title: 'HORARIO EXTENDIDO HASTA LAS 12:30 AM',
        subtitle: 'Los viernes y sábados disfruta de tus pizzas favoritas hasta tarde.',
        badgeText: 'NOCTURNO',
        ctaLabel: 'VER TIENDAS',
        actionType: 'none',
        bgTone: 'emerald',
        visualStyle: 'banner',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        advanced: { paddingTop: 4, paddingBottom: 4, marginBottom: 12, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-papa-recs',
        title: 'PIZZAS RECOMENDADAS PARA TI',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'elegante',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'pizzas',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 6, marginBottom: 12, animation: 'fade-in' },
      },
      {
        type: 'promo_strip',
        id: 'blk-papa-cupon',
        title: '¿TIENES CUPONES DE DESCUENTO?',
        subtitle: 'Canjéalos directo en tu carrito y ahorra en tus combos favoritos.',
        badgeText: 'CUPONES',
        ctaLabel: 'CANJÉALOS AQUÍ',
        actionType: 'none',
        bgTone: 'dark',
        visualStyle: 'ticket_coupon',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 12, animation: 'zoom-in' },
      },
      {
        type: 'faq',
        id: 'blk-papa-faq',
        title: 'Dudas frecuentes sobre nuestros pedidos',
        subtitle: 'Todo lo que necesitas saber antes de ordenar.',
        allowMultipleOpen: false,
        accentColor: '#00643C',
        borderRadiusPx: 14,
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        items: [
          {
            id: 'faq-p1',
            question: '¿Qué tipos de pizzas y masas tienen disponibles?',
            answer: 'Ofrecemos masa artesanal fresca hecha diariamente, bordes rellenos de queso y especialidades gourmet.',
          },
          {
            id: 'faq-p2',
            question: '¿Cuál es el tiempo estimado de delivery?',
            answer: 'Entregamos en 30 a 40 minutos según tu zona de cobertura, con seguimiento en tiempo real.',
          },
        ],
        advanced: { paddingTop: 6, paddingBottom: 14, marginBottom: 8, animation: 'fade-in' },
      },
    ],
  },
  {
    id: 'tpl-flame-cream',
    name: 'Flame Grill (Crema & Fuego)',
    tagline: 'Estética cálida con acento naranja fuego, tarjetas limpias de promos, explorador horizontal de carta y footer marrón oscuro.',
    previewBadge: 'Grill',
    themeMode: 'light',
    footerTheme: 'dark',
    headerVariant: 'flame_grill',
    footerVariant: 'flame_grill',
    accentColor: '#D62300',
    buttonColor: '#D62300',
    buttonTextColor: '#ffffff',
    autoButtonContrast: false,
    showHeaderCartButton: true,
    blocks: [
      {
        type: 'slider',
        id: 'blk-flame-hero',
        title: '',
        visualStyle: 'classic',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        heightMobile: 220,
        heightTablet: 300,
        heightDesktop: 360,
        widthMobile: '100%',
        widthTablet: '100%',
        widthDesktop: '100%',
        autoplay: true,
        autoplaySpeedSec: 5,
        showArrows: true,
        showDots: true,
        borderRadiusPx: 20,
        slides: [
          {
            id: 's-flame-1',
            badge: 'A LA PARRILLA Y HORNO',
            headline: 'CONTUNDENTES — SABOR REAL AL FUEGO',
            subheadline: 'Combos irresistibles para compartir con familia o amigos.',
            ctaLabel: 'PIDE AQUÍ',
            overlayOpacity: 44,
            imageDesktop: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=1400&q=80',
            imageTablet: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=1000&q=80',
            imageMobile: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=700&q=80',
            actionType: 'none',
          },
        ],
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 12, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-flame-promos',
        title: 'Promos',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'clasica',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'combos',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 12, animation: 'slide-up' },
      },
      {
        type: 'categories',
        id: 'blk-flame-cats',
        title: 'Explora nuestra carta',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        style: 'split_badge',
        hiddenCategories: [],
        showCount: false,
        gapPx: 12,
        columnsMobile: 2,
        columnsTablet: 4,
        columnsDesktop: 4,
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 12, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-flame-favs',
        title: 'Nuestros Favoritos',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'clasica',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'all',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 14, marginBottom: 10, animation: 'fade-in' },
      },
    ],
  },
  {
    id: 'tpl-bembos-electric',
    name: 'Electric Blue (Azul & Amarillo)',
    tagline: 'Estilo urbano de alto impacto en azul eléctrico y amarillo, 3 carruseles de catálogo, banner de eventos y preguntas frecuentes.',
    previewBadge: 'Urbano',
    themeMode: 'light',
    footerTheme: 'light',
    headerVariant: 'electric_blue',
    footerVariant: 'electric_blue',
    accentColor: '#1C1B9E',
    buttonColor: '#1C1B9E',
    buttonTextColor: '#ffffff',
    autoButtonContrast: false,
    showHeaderCartButton: true,
    blocks: [
      {
        type: 'promo_strip',
        id: 'blk-bembos-top',
        title: 'Pide tus favoritos con delivery rápido o recojo sin colas',
        subtitle: 'Acumula puntos en cada compra con nuestro Programa de Lealtad.',
        badgeText: 'PROGRAMA LEALTAD',
        ctaLabel: 'Ver Beneficios',
        actionType: 'none',
        bgTone: 'royal',
        visualStyle: 'compact_bar',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        advanced: { paddingTop: 0, paddingBottom: 0, marginBottom: 8, animation: 'fade-in' },
      },
      {
        type: 'slider',
        id: 'blk-bembos-hero',
        title: '',
        visualStyle: 'classic',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        heightMobile: 220,
        heightTablet: 310,
        heightDesktop: 375,
        widthMobile: '100%',
        widthTablet: '100%',
        widthDesktop: '100%',
        autoplay: true,
        autoplaySpeedSec: 5,
        showArrows: true,
        showDots: true,
        borderRadiusPx: 18,
        slides: [
          {
            id: 's-bembos-1',
            badge: 'NUEVA EDICIÓN EXTREMA',
            headline: 'EXTREMADAMENTE BUENAZA',
            subheadline: 'Doble sabor, ingredientes premium y combos épicos directo a tu mesa.',
            ctaLabel: 'Compra Aquí',
            overlayOpacity: 46,
            imageDesktop: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1400&q=80',
            imageTablet: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=80',
            imageMobile: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=80',
            actionType: 'none',
          },
        ],
        advanced: { paddingTop: 2, paddingBottom: 6, marginBottom: 10, animation: 'fade-in' },
      },
      {
        type: 'categories',
        id: 'blk-bembos-cats',
        title: '',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        style: 'cards',
        hiddenCategories: [],
        showCount: false,
        gapPx: 12,
        columnsMobile: 2,
        columnsTablet: 4,
        columnsDesktop: 6,
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 10, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-bembos-promos',
        title: 'PROMOCIONES',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'elegante',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'combos',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 6, marginBottom: 12, animation: 'slide-up' },
      },
      {
        type: 'product_grid',
        id: 'blk-bembos-recs',
        title: 'RECOMENDADOS PARA TI',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'elegante',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'pizzas',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 6, marginBottom: 12, animation: 'fade-in' },
      },
      {
        type: 'product_grid',
        id: 'blk-bembos-best',
        title: 'LOS MÁS VENDIDOS',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        cardStyle: 'elegante',
        columnsMobile: 2,
        columnsTablet: 3,
        columnsDesktop: 5,
        categoryFilter: 'all',
        manualIds: '',
        maxInitialProducts: 10,
        enableLoadMore: false,
        horizontalCarousel: true,
        bleedImages: false,
        squareImage: true,
        quickViewButton: true,
        showPrice: true,
        showStock: false,
        showDescription: true,
        showVariants: false,
        gapPx: 14,
        advanced: { paddingTop: 4, paddingBottom: 6, marginBottom: 12, animation: 'fade-in' },
      },
      {
        type: 'promo_strip',
        id: 'blk-bembos-eventos',
        title: 'DALE SABOR A TUS EVENTOS',
        subtitle: 'Cotiza pedidos corporativos, cumpleaños y reuniones con descuento especial.',
        badgeText: 'EVENTOS',
        ctaLabel: '¡COTIZA AQUÍ!',
        actionType: 'url',
        linkUrl: '/reservas',
        bgTone: 'sunset',
        visualStyle: 'banner',
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        advanced: { paddingTop: 4, paddingBottom: 8, marginBottom: 12, animation: 'zoom-in' },
      },
      {
        type: 'faq',
        id: 'blk-bembos-faq',
        title: 'Preguntas frecuentes',
        subtitle: 'Resolvemos tus dudas sobre delivery, locales y programa de puntos.',
        allowMultipleOpen: false,
        accentColor: '#1C1B9E',
        borderRadiusPx: 14,
        onlyMobile: false,
        onlyTablet: false,
        onlyDesktop: false,
        items: [
          {
            id: 'faq-b1',
            question: '¿Cómo acumulo puntos en el Programa de Lealtad?',
            answer: 'Cada compra en tienda web o POS suma puntos automáticamente con tu DNI o WhatsApp.',
          },
          {
            id: 'faq-b2',
            question: '¿Puedo reservar mesa o programar mi pedido?',
            answer: 'Sí, desde nuestra página de reservas (/reservas) puedes elegir sede, fecha y hora exacta.',
          },
        ],
        advanced: { paddingTop: 4, paddingBottom: 14, marginBottom: 8, animation: 'fade-in' },
      },
    ],
  },
];

interface PersistedBuilderState {
  activeTemplateId: string;
  templates: StoreTemplate[];
  customPages?: CustomPage[];
}

interface StoreBuilderContextType {
  templates: StoreTemplate[];
  activeTemplateId: string;
  activeTemplate: StoreTemplate;
  selectTemplate: (templateId: string) => void;
  updateActiveTemplateMeta: (
    partial: Partial<
      Pick<
        StoreTemplate,
        | 'name'
        | 'themeMode'
        | 'footerTheme'
        | 'headerVariant'
        | 'footerVariant'
        | 'accentColor'
        | 'buttonColor'
        | 'buttonTextColor'
        | 'autoButtonContrast'
        | 'showHeaderCartButton'
      >
    >
  ) => void;
  resetActiveTemplateToFactory: () => void;

  // Custom Pages (Páginas module + Short URLs + Open Graph)
  customPages: CustomPage[];
  activeEditingPageId: string | null;
  setActiveEditingPageId: (pageId: string | null) => void;
  activeEditingPage: CustomPage | null;
  createCustomPage: (input: {
    title: string;
    slug?: string;
    themeMode?: 'dark' | 'light';
    starter?: 'blank' | 'promo' | 'story';
  }) => CustomPage;
  updateCustomPage: (pageId: string, partial: Partial<CustomPage>) => void;
  deleteCustomPage: (pageId: string) => void;
  duplicateCustomPage: (pageId: string) => CustomPage | null;
  generateUniqueSlug: (rawTitleOrSlug: string, excludePageId?: string) => string;

  // Builder UI Mode
  isBuilderOpen: boolean;
  setIsBuilderOpen: (open: boolean) => void;
  previewViewport: BuilderViewport;
  setPreviewViewport: (vp: BuilderViewport) => void;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;

  // Block CRUD on activeTemplate (or activeEditingPage when editing a custom page)
  addBlock: (type: StoreBlockType, afterBlockId?: string) => StoreBlock;
  updateBlock: (blockId: string, updater: (prev: StoreBlock) => StoreBlock) => void;
  moveBlock: (blockId: string, direction: -1 | 1) => void;
  reorderBlock: (fromIndex: number, toIndex: number) => void;
  duplicateBlock: (blockId: string) => void;
  removeBlock: (blockId: string) => void;
  toggleBlockVisibility: (blockId: string) => void;

  // Undo / Redo & Style Clipboard
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  copiedStyleType: StoreBlockType | null;
  copyBlockStyles: (block: StoreBlock) => void;
  pasteBlockStyles: (blockId: string) => void;

  // Page Analytics
  trackPageView: (slug: string) => void;
  trackPageCtaClick: (slug: string) => void;
}

const StoreBuilderContext = createContext<StoreBuilderContextType | undefined>(undefined);

function loadPersistedBuilder(): PersistedBuilderState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BUILDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.templates) || parsed.templates.length === 0) return null;
    const hydratedSaved: StoreTemplate[] = parsed.templates.map((t: StoreTemplate) => {
      const factoryMatch = FACTORY_TEMPLATES.find((ft) => ft.id === t.id);
      const btnBg = t.buttonColor || t.accentColor || '#f59e0b';
      return {
        ...t,
        headerVariant: t.headerVariant || factoryMatch?.headerVariant || 'default',
        footerVariant: t.footerVariant || factoryMatch?.footerVariant || 'default',
        buttonColor: btnBg,
        buttonTextColor: t.buttonTextColor || getOptimalContrastHex(btnBg),
        autoButtonContrast: Boolean(t.autoButtonContrast),
      };
    });
    const existingIds = new Set(hydratedSaved.map((t) => t.id));
    const missingFactory = FACTORY_TEMPLATES.filter((ft) => !existingIds.has(ft.id)).map((ft) =>
      structuredClone(ft)
    );
    return {
      activeTemplateId: parsed.activeTemplateId || hydratedSaved[0].id,
      templates: [...hydratedSaved, ...missingFactory],
      customPages: Array.isArray(parsed.customPages) ? parsed.customPages : [],
    };
  } catch {
    return null;
  }
}

export const StoreBuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dispatchToast } = useSettings();
  const saved = useMemo(() => loadPersistedBuilder(), []);

  const [templates, setTemplates] = useState<StoreTemplate[]>(
    () => saved?.templates || structuredClone(FACTORY_TEMPLATES)
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    () => saved?.activeTemplateId || FACTORY_TEMPLATES[0].id
  );
  const [customPages, setCustomPages] = useState<CustomPage[]>(() => saved?.customPages || []);
  const [activeEditingPageId, setActiveEditingPageId] = useState<string | null>(null);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<BuilderViewport>('desktop');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Undo / Redo history stacks
  type HistorySnapshot = { templates: StoreTemplate[]; customPages: CustomPage[] };
  const [historyPast, setHistoryPast] = useState<HistorySnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<HistorySnapshot[]>([]);
  const [copiedStyles, setCopiedStyles] = useState<{
    sourceType: StoreBlockType;
    payload: Record<string, unknown>;
  } | null>(null);

  const pushHistorySnapshot = () => {
    setHistoryPast(prev => [
      ...prev.slice(-29),
      { templates: structuredClone(templates), customPages: structuredClone(customPages) },
    ]);
    setHistoryFuture([]);
  };

  const undo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryFuture(prev => [
      { templates: structuredClone(templates), customPages: structuredClone(customPages) },
      ...prev.slice(0, 29),
    ]);
    setHistoryPast(prev => prev.slice(0, -1));
    setTemplates(previous.templates);
    setCustomPages(previous.customPages);
    dispatchToast('Deshecho', 'Se revirtió el último cambio en el editor.', 'info');
  };

  const redo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryPast(prev => [
      ...prev.slice(-29),
      { templates: structuredClone(templates), customPages: structuredClone(customPages) },
    ]);
    setHistoryFuture(prev => prev.slice(1));
    setTemplates(next.templates);
    setCustomPages(next.customPages);
    dispatchToast('Rehecho', 'Se reaplicó el cambio revertido.', 'info');
  };

  // Keyboard shortcuts: Ctrl+Z / Cmd+Z (Undo) & Ctrl+Y / Cmd+Shift+Z (Redo)
  useEffect(() => {
    if (!isBuilderOpen && !activeEditingPageId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (historyPast.length > 0) {
          e.preventDefault();
          undo();
        }
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        if (historyFuture.length > 0) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const storeTemplate = useMemo(
    () => templates.find(t => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  const activeEditingPage = useMemo(
    () => (activeEditingPageId ? customPages.find(p => p.id === activeEditingPageId) || null : null),
    [customPages, activeEditingPageId]
  );

  // When editing a custom page in the Páginas module, expose a StoreTemplate-compatible view
  // so ElementorBuilderSidebar works identically on both Storefront & Custom Pages.
  const activeTemplate: StoreTemplate = useMemo(() => {
    if (activeEditingPage) {
      return {
        id: activeEditingPage.id,
        name: activeEditingPage.title,
        tagline: `/p/${activeEditingPage.slug}`,
        previewBadge: activeEditingPage.status === 'published' ? 'Publicada' : 'Borrador',
        themeMode: activeEditingPage.themeMode,
        footerTheme: activeEditingPage.footerTheme,
        accentColor: activeEditingPage.accentColor,
        buttonColor: activeEditingPage.buttonColor || activeEditingPage.accentColor,
        buttonTextColor:
          activeEditingPage.buttonTextColor ||
          getOptimalContrastHex(activeEditingPage.buttonColor || activeEditingPage.accentColor),
        autoButtonContrast: Boolean(activeEditingPage.autoButtonContrast),
        showHeaderCartButton: activeEditingPage.showHeaderCartButton,
        blocks: activeEditingPage.blocks,
      };
    }
    return storeTemplate;
  }, [activeEditingPage, storeTemplate]);

  const lastPersistedJsonRef = useRef<string | null>(null);
  const lastLocalWriteAtRef = useRef<number>(0);

  // Persist immediately on any change
  useEffect(() => {
    try {
      const snapshot: PersistedBuilderState = {
        activeTemplateId,
        templates,
        customPages,
      };
      const serialized = JSON.stringify(snapshot);
      lastPersistedJsonRef.current = serialized;
      lastLocalWriteAtRef.current = Date.now();
      localStorage.setItem(BUILDER_STORAGE_KEY, serialized);
    } catch {
      // Ignore quota errors
    }
  }, [activeTemplateId, templates, customPages]);

  // Live sync across devices when admin updates storefront design, active template, or pages
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== BUILDER_STORAGE_KEY || isBuilderOpen) return;
      if (e.newValue && e.newValue === lastPersistedJsonRef.current) return;
      if (Date.now() - lastLocalWriteAtRef.current < 1500) return;
      const fresh = loadPersistedBuilder();
      if (!fresh) return;
      setTemplates(fresh.templates);
      setActiveTemplateId(fresh.activeTemplateId);
      if (Array.isArray(fresh.customPages)) {
        setCustomPages(fresh.customPages);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isBuilderOpen]);

  const generateUniqueSlug = (rawTitleOrSlug: string, excludePageId?: string): string => {
    const base = toProductSlug(rawTitleOrSlug, 'pagina') || 'pagina';
    const existing = new Set(
      customPages.filter(p => p.id !== excludePageId).map(p => p.slug.toLowerCase())
    );
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base}-${counter}`)) {
      counter++;
    }
    return `${base}-${counter}`;
  };

  const createCustomPage: StoreBuilderContextType['createCustomPage'] = ({
    title,
    slug,
    themeMode = 'light',
    starter = 'promo',
  }) => {
    const now = new Date().toISOString();
    const id = `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanTitle = title.trim() || 'Nueva Página';
    const finalSlug = generateUniqueSlug(slug?.trim() || cleanTitle);

    let initialBlocks: StoreBlock[] = [];
    if (starter === 'promo') {
      initialBlocks = [
        createDefaultBlock('text'),
        createDefaultBlock('paragraph'),
        createDefaultBlock('image'),
        createDefaultBlock('button'),
      ];
    } else if (starter === 'story') {
      initialBlocks = [
        createDefaultBlock('image'),
        createDefaultBlock('text'),
        createDefaultBlock('paragraph'),
        createDefaultBlock('video'),
      ];
    }

    const created: CustomPage = {
      id,
      title: cleanTitle,
      slug: finalSlug,
      status: 'published',
      themeMode,
      footerTheme: themeMode,
      accentColor: storeTemplate.accentColor || '#e11d48',
      buttonColor: storeTemplate.buttonColor || storeTemplate.accentColor || '#e11d48',
      buttonTextColor: storeTemplate.buttonTextColor || '#ffffff',
      autoButtonContrast: Boolean(storeTemplate.autoButtonContrast),
      showStoreHeader: true,
      showStoreFooter: true,
      blocks: initialBlocks,
      seo: {
        ogTitle: cleanTitle,
        ogDescription: `Descubre ${cleanTitle} en nuestra tienda oficial.`,
        ogImage: '',
        ogType: 'website',
      },
      createdAt: now,
      updatedAt: now,
    };

    setCustomPages(prev => [created, ...prev]);
    dispatchToast('Página Creada', `URL corta lista: /p/${finalSlug}`, 'success');
    return created;
  };

  const updateCustomPage = (pageId: string, partial: Partial<CustomPage>) => {
    setCustomPages(prev =>
      prev.map(p =>
        p.id === pageId
          ? {
              ...p,
              ...partial,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
  };

  const deleteCustomPage = (pageId: string) => {
    setCustomPages(prev => prev.filter(p => p.id !== pageId));
    if (activeEditingPageId === pageId) {
      setActiveEditingPageId(null);
      setSelectedBlockId(null);
    }
    dispatchToast('Página Eliminada', 'La página fue eliminada del sistema.', 'info');
  };

  const duplicateCustomPage = (pageId: string): CustomPage | null => {
    const source = customPages.find(p => p.id === pageId);
    if (!source) return null;
    const now = new Date().toISOString();
    const cloned = structuredClone(source);
    cloned.id = `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    cloned.title = `${source.title} (Copia)`;
    cloned.slug = generateUniqueSlug(`${source.slug}-copia`);
    cloned.status = 'draft';
    cloned.createdAt = now;
    cloned.updatedAt = now;
    setCustomPages(prev => [cloned, ...prev]);
    dispatchToast('Página Duplicada', `Se creó el borrador /p/${cloned.slug}.`, 'info');
    return cloned;
  };

  const selectTemplate = (templateId: string) => {
    const target = templates.find(t => t.id === templateId);
    if (!target) return;
    setActiveEditingPageId(null);
    setActiveTemplateId(templateId);
    setSelectedBlockId(null);
    dispatchToast(
      'Plantilla Aplicada',
      `Ahora estás usando "${target.name}". Todos sus bloques son 100% editables.`,
      'success'
    );
  };

  const updateActiveTemplateMeta = (
    partial: Partial<
      Pick<
        StoreTemplate,
        | 'name'
        | 'themeMode'
        | 'footerTheme'
        | 'headerVariant'
        | 'footerVariant'
        | 'accentColor'
        | 'buttonColor'
        | 'buttonTextColor'
        | 'autoButtonContrast'
        | 'showHeaderCartButton'
      >
    >
  ) => {
    if (activeEditingPageId) {
      setCustomPages(prev =>
        prev.map(p => {
          if (p.id !== activeEditingPageId) return p;
          const { name, ...rest } = partial;
          return {
            ...p,
            ...rest,
            ...(name !== undefined ? { title: name } : {}),
            updatedAt: new Date().toISOString(),
          };
        })
      );
      return;
    }
    setTemplates(prev =>
      prev.map(t => (t.id === activeTemplateId ? { ...t, ...partial } : t))
    );
  };

  const resetActiveTemplateToFactory = () => {
    if (activeEditingPageId) {
      setCustomPages(prev =>
        prev.map(p =>
          p.id === activeEditingPageId
            ? { ...p, blocks: [], updatedAt: new Date().toISOString() }
            : p
        )
      );
      setSelectedBlockId(null);
      dispatchToast('Lienzo Limpiado', 'Se vaciaron los bloques de la página actual.', 'info');
      return;
    }
    const factory = FACTORY_TEMPLATES.find(f => f.id === storeTemplate.id) || FACTORY_TEMPLATES[0];
    const cloned = structuredClone(factory);
    setTemplates(prev =>
      prev.map(t => (t.id === storeTemplate.id ? { ...cloned, id: storeTemplate.id } : t))
    );
    setSelectedBlockId(null);
    dispatchToast(
      'Plantilla Restaurada',
      `Se restableció el diseño original de "${factory.name}".`,
      'info'
    );
  };

  const mutateActiveBlocks = (mutator: (blocks: StoreBlock[]) => StoreBlock[]) => {
    pushHistorySnapshot();
    if (activeEditingPageId) {
      setCustomPages(prev =>
        prev.map(p =>
          p.id === activeEditingPageId
            ? { ...p, blocks: mutator(p.blocks), updatedAt: new Date().toISOString() }
            : p
        )
      );
      return;
    }
    setTemplates(prev =>
      prev.map(t => (t.id === storeTemplate.id ? { ...t, blocks: mutator(t.blocks) } : t))
    );
  };

  const addBlock = (type: StoreBlockType, afterBlockId?: string): StoreBlock => {
    const created = createDefaultBlock(type);
    mutateActiveBlocks(blocks => {
      if (!afterBlockId) return [...blocks, created];
      if (afterBlockId === '__TOP__') return [created, ...blocks];
      const idx = blocks.findIndex(b => b.id === afterBlockId);
      if (idx < 0) return [...blocks, created];
      const copy = [...blocks];
      copy.splice(idx + 1, 0, created);
      return copy;
    });
    setSelectedBlockId(created.id);
    return created;
  };

  const updateBlock = (blockId: string, updater: (prev: StoreBlock) => StoreBlock) => {
    mutateActiveBlocks(blocks => blocks.map(b => (b.id === blockId ? updater(b) : b)));
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    mutateActiveBlocks(blocks => {
      const idx = blocks.findIndex(b => b.id === blockId);
      const nextIdx = idx + direction;
      if (idx < 0 || nextIdx < 0 || nextIdx >= blocks.length) return blocks;
      const copy = [...blocks];
      const [moved] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, moved);
      return copy;
    });
  };

  const reorderBlock = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    mutateActiveBlocks(blocks => {
      if (fromIndex >= blocks.length || toIndex >= blocks.length) return blocks;
      const copy = [...blocks];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const duplicateBlock = (blockId: string) => {
    let newId: string | null = null;
    mutateActiveBlocks(blocks => {
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx < 0) return blocks;
      const cloned = structuredClone(blocks[idx]);
      cloned.id = `${cloned.type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      newId = cloned.id;
      const copy = [...blocks];
      copy.splice(idx + 1, 0, cloned);
      return copy;
    });
    if (newId) setSelectedBlockId(newId);
    dispatchToast('Widget Duplicado', 'Se creó una copia exacta debajo del bloque original.', 'info');
  };

  const removeBlock = (blockId: string) => {
    mutateActiveBlocks(blocks => blocks.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const toggleBlockVisibility = (blockId: string) => {
    mutateActiveBlocks(blocks =>
      blocks.map(b =>
        b.id === blockId
          ? ({
              ...b,
              advanced: { ...b.advanced, isHidden: !b.advanced.isHidden },
            } as StoreBlock)
          : b
      )
    );
  };

  const STYLE_KEYS = [
    'bgColor',
    'textColor',
    'borderColor',
    'borderWidth',
    'borderRadiusPx',
    'accentColor',
    'accentPosition',
    'leftBorderAccent',
    'paddingX',
    'paddingY',
    'paddingPx',
    'shadow',
    'variant',
    'fontWeight',
    'letterSpacing',
    'lineHeight',
    'objectFit',
    'aspectRatio',
    'cardStyle',
    'style',
    'visualStyle',
    'bgTone',
    'advanced',
  ];

  const copyBlockStyles = (block: StoreBlock) => {
    const payload: Record<string, unknown> = {};
    const rec = block as unknown as Record<string, unknown>;
    for (const k of STYLE_KEYS) {
      if (rec[k] !== undefined) {
        payload[k] = structuredClone(rec[k]);
      }
    }
    setCopiedStyles({ sourceType: block.type, payload });
    dispatchToast('Estilos Copiados', 'Ahora puedes pegarlos en otro widget del lienzo.', 'success');
  };

  const pasteBlockStyles = (blockId: string) => {
    if (!copiedStyles) return;
    mutateActiveBlocks(blocks =>
      blocks.map(b => {
        if (b.id !== blockId) return b;
        const next = { ...(b as unknown as Record<string, unknown>) };
        if (b.type === copiedStyles.sourceType) {
          for (const [k, v] of Object.entries(copiedStyles.payload)) {
            next[k] = structuredClone(v);
          }
        } else {
          // Cross-type: apply shared visual tokens safely
          const sharedKeys = [
            'bgColor',
            'textColor',
            'borderColor',
            'borderWidth',
            'borderRadiusPx',
            'accentColor',
            'shadow',
            'advanced',
          ];
          for (const k of sharedKeys) {
            if (copiedStyles.payload[k] !== undefined && k in next) {
              next[k] = structuredClone(copiedStyles.payload[k]);
            }
          }
        }
        return next as unknown as StoreBlock;
      })
    );
    dispatchToast('Estilos Pegados', 'Se aplicaron los estilos copiados al bloque.', 'success');
  };

  const trackPageView = (slug: string) => {
    setCustomPages(prev =>
      prev.map(p => {
        if (p.slug.toLowerCase() !== slug.toLowerCase()) return p;
        const current = p.analytics || { views: 0, ctaClicks: 0 };
        return {
          ...p,
          analytics: {
            ...current,
            views: current.views + 1,
            lastVisitedAt: new Date().toISOString(),
          },
        };
      })
    );
  };

  const trackPageCtaClick = (slug: string) => {
    setCustomPages(prev =>
      prev.map(p => {
        if (p.slug.toLowerCase() !== slug.toLowerCase()) return p;
        const current = p.analytics || { views: 0, ctaClicks: 0 };
        return {
          ...p,
          analytics: {
            ...current,
            ctaClicks: current.ctaClicks + 1,
          },
        };
      })
    );
  };

  return (
    <StoreBuilderContext.Provider
      value={{
        templates,
        activeTemplateId: activeTemplate.id,
        activeTemplate,
        selectTemplate,
        updateActiveTemplateMeta,
        resetActiveTemplateToFactory,
        customPages,
        activeEditingPageId,
        setActiveEditingPageId,
        activeEditingPage,
        createCustomPage,
        updateCustomPage,
        deleteCustomPage,
        duplicateCustomPage,
        generateUniqueSlug,
        isBuilderOpen,
        setIsBuilderOpen,
        previewViewport,
        setPreviewViewport,
        selectedBlockId,
        setSelectedBlockId,
        addBlock,
        updateBlock,
        moveBlock,
        reorderBlock,
        duplicateBlock,
        removeBlock,
        toggleBlockVisibility,
        canUndo: historyPast.length > 0,
        canRedo: historyFuture.length > 0,
        undo,
        redo,
        copiedStyleType: copiedStyles?.sourceType || null,
        copyBlockStyles,
        pasteBlockStyles,
        trackPageView,
        trackPageCtaClick,
      }}
    >
      {children}
    </StoreBuilderContext.Provider>
  );
};

export const useStoreBuilder = () => {
  const ctx = useContext(StoreBuilderContext);
  if (!ctx) {
    throw new Error('useStoreBuilder must be used within a StoreBuilderProvider');
  }
  return ctx;
};
