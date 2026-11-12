import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initDiskPersistence } from './utils/diskPersistence'

// Renderizado inmediato de React: no bloqueamos el primer render esperando red
const rootEl = document.getElementById('root')!
const root = createRoot(rootEl)

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Inicializar la sincronización de disco y tiempo real en segundo plano
void initDiskPersistence()
