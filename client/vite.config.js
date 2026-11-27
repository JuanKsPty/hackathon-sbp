import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const carpetaCliente = path.dirname(fileURLToPath(import.meta.url))
// Raíz del repo: un solo .env para el server y el client (ver .env.example en la raíz).
const raizRepo = path.resolve(carpetaCliente, '..')

// Sitio que se construye o se sirve (SITIO=publico | interno). Cada uno es un bundle aparte:
// - publico: sin login ni páginas de Analista o Administrador (sbp.juank.tech, :8080).
// - interno: todo, con inicio de sesión (interno.sbp.juank.tech, :8081).
// `#sitio` apunta a la tabla de rutas del sitio y __INTERNO__ es una constante de compilación: el
// bundle público no incluye el código interno.
const sitio = process.env.SITIO === 'interno' ? 'interno' : 'publico'
const interno = sitio === 'interno'

export default defineConfig(({ mode }) => {
  // loadEnv con prefijo '' lee también las variables sin VITE_ (API_URL, PORT), solo para esta config.
  const env = loadEnv(mode, raizRepo, '')
  const destinoApi =
    process.env.API_URL || env.API_URL || `http://localhost:${env.PORT || 3001}`

  return {
    plugins: [react(), tailwindcss()],
    envDir: raizRepo,
    define: { __INTERNO__: JSON.stringify(interno) },
    resolve: {
      alias: [
        { find: /^#sitio$/, replacement: path.resolve(carpetaCliente, 'src/sitios', `${sitio}.jsx`) },
        { find: '@', replacement: path.resolve(carpetaCliente, 'src') },
      ],
    },
    build: { outDir: `dist-${sitio}` },
    server: {
      port: interno ? 5174 : 5173,
      strictPort: true,
      // El proxy marca cada petición con el sitio, como lo hace nginx en Docker.
      proxy: {
        '/api': { target: destinoApi, changeOrigin: true, headers: { 'X-Sitio': sitio } },
      },
      fs: {
        // Permite leer /contracts (modo mock en desarrollo) además de client/.
        allow: [raizRepo],
      },
    },
    preview: {
      port: interno ? 4174 : 4173,
      proxy: {
        '/api': { target: destinoApi, changeOrigin: true, headers: { 'X-Sitio': sitio } },
      },
    },
  }
})
