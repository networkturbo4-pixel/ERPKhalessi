import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { preloadInitialRouteChunk } from './App.tsx'
import { installStorageInterceptor, initDiskPersistence } from './utils/diskPersistence'
import { registerServiceWorker } from './utils/pwaManager'

// 1. Conectar sincrónicamente el interceptor de almacenamiento ANTES de montar React
installStorageInterceptor()

// 2. Registrar Service Worker para PWA instalable y notificaciones
void registerServiceWorker()

// 2. Iniciar en paralelo la precarga del chunk de la vista activa para cero cascada de red
preloadInitialRouteChunk()

const rootEl = document.getElementById('root')!

function resolveHeroPreloadUrl(): string {
  try {
    const path = window.location.pathname || '/'
    const hash = window.location.hash || ''
    if (path.startsWith('/admin') || path.startsWith('/kiosco') || path.startsWith('/p/') || hash.startsWith('#admin') || hash.startsWith('#kiosco')) {
      return ''
    }
    const raw = localStorage.getItem('kh_store_builder_v2')
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    const templates = Array.isArray(parsed?.templates) ? parsed.templates : []
    const active = templates.find((t: any) => t?.id === parsed?.activeTemplateId) || templates[0]
    const blocks = Array.isArray(active?.blocks) ? active.blocks : []
    const w = window.innerWidth
    const heroSlider = blocks.find((b: any) => b?.type === 'slider' && b?.visible !== false && Array.isArray(b?.slides) && b.slides.length > 0)
    const firstSlide = heroSlider?.slides?.[0]
    if (!firstSlide) return ''
    const url =
      w < 640
        ? firstSlide.imageMobile || firstSlide.imageTablet || firstSlide.imageDesktop
        : w < 1024
        ? firstSlide.imageTablet || firstSlide.imageDesktop
        : firstSlide.imageDesktop || firstSlide.imageTablet || firstSlide.imageMobile
    return typeof url === 'string' && url.trim() ? url.trim() : ''
  } catch {
    return ''
  }
}

function preloadHeroLcpImage(url: string, maxWaitMs: number): Promise<void> {
  if (!url || typeof document === 'undefined') return Promise.resolve()
  if (!url.startsWith('data:')) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = url
    link.setAttribute('fetchpriority', 'high')
    document.head.appendChild(link)
  }
  return new Promise<void>(resolve => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const timer = window.setTimeout(done, maxWaitMs)
    const img = new Image()
    img.onload = () => {
      window.clearTimeout(timer)
      done()
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      done()
    }
    img.src = url
    if (img.complete && img.naturalWidth > 0) {
      window.clearTimeout(timer)
      done()
    }
  })
}

async function bootstrap() {
  const hasCachedState = Boolean(localStorage.getItem('khalessi_erp_settings_v3'))

  if (!hasCachedState) {
    // Primera visita en un dispositivo nuevo: hidratar desde el servidor (máx 3000ms) mientras se muestra el splash de marca
    await Promise.race([
      initDiskPersistence(),
      new Promise<void>(resolve => setTimeout(resolve, 3000)),
    ])
    // Precargar la imagen Hero LCP antes de quitar el splash para evitar recuadros grises vacíos
    const heroUrl = resolveHeroPreloadUrl()
    if (heroUrl) {
      await preloadHeroLcpImage(heroUrl, 1200)
    }
  } else {
    // Recarga habitual (F5): renderizar en 0ms y sincronizar cambios del servidor en vivo vía eventos
    void initDiskPersistence()
  }

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void bootstrap()
