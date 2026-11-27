// Rutas del sitio público (sbp.juank.tech): sin inicio de sesión y sin las páginas de Analista ni de
// Administrador. La ruta / es la landing (Inicio, a pantalla completa, sin el menú) y lleva a los
// datos: el Panel del público está en /panel, dentro del AppShell. Calidad de datos vive solo en
// el sitio interno (RUTAS_SOLO_INTERNAS en navegacion.js).
// Vite apunta `#sitio` a este archivo cuando SITIO=publico (vite.config.js), así que
// el código de sitios/interno.jsx no entra en este bundle.
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell.jsx'
import Asistente from '@/paginas/Asistente.jsx'
import Inicio from '@/paginas/Inicio.jsx'
import NoEncontrada from '@/paginas/NoEncontrada.jsx'
import PanelPublico from '@/paginas/PanelPublico.jsx'
import Rankings from '@/paginas/Rankings.jsx'
import Reportes from '@/paginas/Reportes.jsx'

// Presentación de la app para la demo (/presentacion): URL privada, solo para presentar; ningún
// botón ni enlace de la app lleva aquí. Pantalla completa, sin el AppShell. Se carga
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
      {/* Landing: portada, casos de uso y "Ver los datos". */}
      <Route index element={<Inicio />} />
      <Route element={<AppShell />}>
        {/* Panel del público: dashboard del corte (#139). */}
        <Route path="panel" element={<PanelPublico />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="asistente" element={<Asistente />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}
