import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const carpetaCliente = path.dirname(fileURLToPath(import.meta.url))
// Raíz del repo: un solo .env para el server y el client (ver .env.example en la raíz).
const raizRepo = path.resolve(carpetaCliente, '..')

export default defineConfig(({ mode }) => {
  // loadEnv con prefijo '' lee también las variables sin VITE_ (API_URL, PORT), solo para esta config.
  const env = loadEnv(mode, raizRepo, '')
  const destinoApi =
    process.env.API_URL || env.API_URL || `http://localhost:${env.PORT || 3001}`

  return {
    plugins: [react(), tailwindcss()],
    envDir: raizRepo,
    resolve: {
      alias: { '@': path.resolve(carpetaCliente, 'src') },
    },
    server: {
      proxy: {
        '/api': { target: destinoApi, changeOrigin: true },
      },
      fs: {
        // Permite leer /contracts (modo mock en desarrollo) además de client/.
        allow: [raizRepo],
      },
    },
    preview: {
      proxy: {
        '/api': { target: destinoApi, changeOrigin: true },
      },
    },
  }
})
