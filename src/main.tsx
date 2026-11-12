import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { preloadInitialRouteChunk } from './App.tsx'
import { installStorageInterceptor, initDiskPersistence } from './utils/diskPersistence'

// 1. Conectar sincrónicamente el interceptor de almacenamiento ANTES de montar React
installStorageInterceptor()

// 2. Iniciar en paralelo la precarga del chunk de la vista activa para cero cascada de red
preloadInitialRouteChunk()

const rootEl = document.getElementById('root')!

async function bootstrap() {
  const hasCachedState = Boolean(localStorage.getItem('khalessi_erp_settings_v3'))

  if (!hasCachedState) {
    // Primera visita en un dispositivo nuevo: hidratar desde el servidor (máx 750ms) en paralelo con el chunk JS
    await Promise.race([
      initDiskPersistence(),
      new Promise<void>(resolve => setTimeout(resolve, 750)),
    ])
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
