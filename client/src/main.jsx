import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker (#8): solo en producción y solo en el sitio público, para no guardar en caché los
// archivos de `npm run dev` ni las páginas del sitio interno.
if (__INTERNO__ && 'serviceWorker' in navigator) {
  // Por si quedó uno registrado de antes en este origen.
  navigator.serviceWorker.getRegistrations().then((registros) => registros.forEach((r) => r.unregister())).catch(() => {})
} else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('No se pudo registrar el service worker', error)
    })
  })
}
