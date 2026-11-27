// Rutas del sitio público (sbp.juank.tech): sin inicio de sesión y sin las páginas de Analista ni de
// Administrador. Vite apunta `#sitio` a este archivo cuando SITIO=publico (vite.config.js), así que
// el código de sitios/interno.jsx no entra en este bundle.
import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell.jsx'
import Asistente from '@/paginas/Asistente.jsx'
import Calidad from '@/paginas/Calidad.jsx'
import NoEncontrada from '@/paginas/NoEncontrada.jsx'
import Panel from '@/paginas/Panel.jsx'
import Rankings from '@/paginas/Rankings.jsx'
import Reportes from '@/paginas/Reportes.jsx'
import Verificacion from '@/paginas/Verificacion.jsx'

export function RutasDelSitio() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Panel />} />
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
