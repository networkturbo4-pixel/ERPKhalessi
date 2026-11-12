import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installStorageInterceptor, initDiskPersistence } from './utils/diskPersistence'

// 1. Conectar sincrónicamente el interceptor de almacenamiento ANTES de montar React
installStorageInterceptor()

const rootEl = document.getElementById('root')!

async function bootstrap() {
  const hasCachedState = Boolean(localStorage.getItem('khalessi_erp_settings_v3'))

  if (!hasCachedState) {
    // Primera visita en un dispositivo nuevo: hidratar desde el servidor (máx 900ms) mostrando el favicon de marca
    await Promise.race([
      initDiskPersistence(),
      new Promise<void>(resolve => setTimeout(resolve, 900)),
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
