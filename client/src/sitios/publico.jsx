// Rutas del sitio público (sbp.juank.tech): sin inicio de sesión y sin las páginas de Analista ni de
// Administrador (tampoco el Panel: la ruta / es el Inicio para el público).
// Vite apunta `#sitio` a este archivo cuando SITIO=publico (vite.config.js), así que
// el código de sitios/interno.jsx no entra en este bundle.
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell.jsx'
import Asistente from '@/paginas/Asistente.jsx'
import Calidad from '@/paginas/Calidad.jsx'
import Inicio from '@/paginas/Inicio.jsx'
import NoEncontrada from '@/paginas/NoEncontrada.jsx'
import Rankings from '@/paginas/Rankings.jsx'
import Reportes from '@/paginas/Reportes.jsx'
import Verificacion from '@/paginas/Verificacion.jsx'

// Presentación de la app para la demo (/presentacion): pantalla completa, sin el AppShell. Se carga
// aparte para no sumar peso al resto del sitio.
const Presentacion = lazy(() => import('@/paginas/Presentacion.jsx'))

export function RutasDelSitio() {
  return (
    <Routes>
      <Route
        path="presentacion"
        element={
          <Suspense fallback={null}>
            <Presentacion />
          </Suspense>
        }
      />
      <Route element={<AppShell />}>
        {/* Inicio para el público: portada, casos de uso y dashboard del corte (#139). */}
        <Route index element={<Inicio />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="calidad" element={<Calidad />} />
        <Route path="verificacion" element={<Verificacion />} />
        <Route path="asistente" element={<Asistente />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}
