import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  getOptimalContrastHex,
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
];

interface PersistedBuilderState {
  activeTemplateId: string;
  templates: StoreTemplate[];
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
        | 'accentColor'
        | 'buttonColor'
        | 'buttonTextColor'
        | 'autoButtonContrast'
      >
    >
  ) => void;
  resetActiveTemplateToFactory: () => void;

  // Builder UI Mode
  isBuilderOpen: boolean;
  setIsBuilderOpen: (open: boolean) => void;
  previewViewport: BuilderViewport;
  setPreviewViewport: (vp: BuilderViewport) => void;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;

  // Block CRUD on activeTemplate
  addBlock: (type: StoreBlockType, afterBlockId?: string) => StoreBlock;
  updateBlock: (blockId: string, updater: (prev: StoreBlock) => StoreBlock) => void;
  moveBlock: (blockId: string, direction: -1 | 1) => void;
  duplicateBlock: (blockId: string) => void;
  removeBlock: (blockId: string) => void;
}

const StoreBuilderContext = createContext<StoreBuilderContextType | undefined>(undefined);

function loadPersistedBuilder(): PersistedBuilderState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BUILDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.templates) || parsed.templates.length === 0) return null;
    return {
      activeTemplateId: parsed.activeTemplateId || parsed.templates[0].id,
      templates: parsed.templates.map((t: StoreTemplate) => {
        const btnBg = t.buttonColor || t.accentColor || '#f59e0b';
        return {
          ...t,
          buttonColor: btnBg,
          buttonTextColor: t.buttonTextColor || getOptimalContrastHex(btnBg),
          autoButtonContrast: Boolean(t.autoButtonContrast),
        };
      }),
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

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<BuilderViewport>('desktop');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const activeTemplate = useMemo(
    () => templates.find(t => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  // Persist immediately on any change
  useEffect(() => {
    try {
      const snapshot: PersistedBuilderState = {
        activeTemplateId,
        templates,
      };
      localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore quota errors
    }
  }, [activeTemplateId, templates]);

  // Live sync across devices when admin updates storefront design or active template
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== BUILDER_STORAGE_KEY || isBuilderOpen) return;
      const fresh = loadPersistedBuilder();
      if (!fresh) return;
      setTemplates(fresh.templates);
      setActiveTemplateId(fresh.activeTemplateId);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isBuilderOpen]);

  const selectTemplate = (templateId: string) => {
    const target = templates.find(t => t.id === templateId);
    if (!target) return;
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
        | 'accentColor'
        | 'buttonColor'
        | 'buttonTextColor'
        | 'autoButtonContrast'
      >
    >
  ) => {
    setTemplates(prev =>
      prev.map(t => (t.id === activeTemplate.id ? { ...t, ...partial } : t))
    );
  };

  const resetActiveTemplateToFactory = () => {
    const factory = FACTORY_TEMPLATES.find(f => f.id === activeTemplate.id) || FACTORY_TEMPLATES[0];
    const cloned = structuredClone(factory);
    setTemplates(prev =>
      prev.map(t => (t.id === activeTemplate.id ? { ...cloned, id: activeTemplate.id } : t))
    );
    setSelectedBlockId(null);
    dispatchToast(
      'Plantilla Restaurada',
      `Se restableció el diseño original de "${factory.name}".`,
      'info'
    );
  };

  const addBlock = (type: StoreBlockType, afterBlockId?: string): StoreBlock => {
    const created = createDefaultBlock(type);
    setTemplates(prev =>
      prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        if (!afterBlockId) {
          return { ...t, blocks: [...t.blocks, created] };
        }
        const idx = t.blocks.findIndex(b => b.id === afterBlockId);
        if (idx < 0) return { ...t, blocks: [...t.blocks, created] };
        const copy = [...t.blocks];
        copy.splice(idx + 1, 0, created);
        return { ...t, blocks: copy };
      })
    );
    setSelectedBlockId(created.id);
    return created;
  };

  const updateBlock = (blockId: string, updater: (prev: StoreBlock) => StoreBlock) => {
    setTemplates(prev =>
      prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        return {
          ...t,
          blocks: t.blocks.map(b => (b.id === blockId ? updater(b) : b)),
        };
      })
    );
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    setTemplates(prev =>
      prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        const idx = t.blocks.findIndex(b => b.id === blockId);
        const nextIdx = idx + direction;
        if (idx < 0 || nextIdx < 0 || nextIdx >= t.blocks.length) return t;
        const copy = [...t.blocks];
        const [moved] = copy.splice(idx, 1);
        copy.splice(nextIdx, 0, moved);
        return { ...t, blocks: copy };
      })
    );
  };

  const duplicateBlock = (blockId: string) => {
    let newId: string | null = null;
    setTemplates(prev =>
      prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        const idx = t.blocks.findIndex(b => b.id === blockId);
        if (idx < 0) return t;
        const cloned = structuredClone(t.blocks[idx]);
        cloned.id = `${cloned.type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        newId = cloned.id;
        const copy = [...t.blocks];
        copy.splice(idx + 1, 0, cloned);
        return { ...t, blocks: copy };
      })
    );
    if (newId) setSelectedBlockId(newId);
    dispatchToast('Widget Duplicado', 'Se creó una copia exacta debajo del bloque original.', 'info');
  };

  const removeBlock = (blockId: string) => {
    setTemplates(prev =>
      prev.map(t => {
        if (t.id !== activeTemplate.id) return t;
        return { ...t, blocks: t.blocks.filter(b => b.id !== blockId) };
      })
    );
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
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
        isBuilderOpen,
        setIsBuilderOpen,
        previewViewport,
        setPreviewViewport,
        selectedBlockId,
        setSelectedBlockId,
        addBlock,
        updateBlock,
        moveBlock,
        duplicateBlock,
        removeBlock,
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
