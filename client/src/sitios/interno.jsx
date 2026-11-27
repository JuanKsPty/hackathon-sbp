// Rutas del sitio interno (interno.sbp.juank.tech): Analista y Administrador, con inicio de sesión
// obligatorio. Vite apunta `#sitio` a este archivo cuando SITIO=interno (vite.config.js).
import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell.jsx'
import { RequiereSesion } from '@/components/sesion/RequiereSesion.jsx'
import Admin from '@/paginas/Admin.jsx'
import Asistente from '@/paginas/Asistente.jsx'
import Calidad from '@/paginas/Calidad.jsx'
import Comparar from '@/paginas/Comparar.jsx'
import Entrar from '@/paginas/Entrar.jsx'
import NoEncontrada from '@/paginas/NoEncontrada.jsx'
import PanelInterno from '@/paginas/PanelInterno.jsx'
import Rankings from '@/paginas/Rankings.jsx'
import Reportes from '@/paginas/Reportes.jsx'

export function RutasDelSitio() {
  return (
    <Routes>
      <Route path="entrar" element={<Entrar />} />
      <Route element={<RequiereSesion />}>
        <Route element={<AppShell />}>
          {/* Dashboard según el perfil: Analista y Administrador (#140). */}
          <Route index element={<PanelInterno />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="comparar" element={<Comparar />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="calidad" element={<Calidad />} />
          <Route path="admin" element={<Admin />} />
          <Route path="asistente" element={<Asistente />} />
          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Route>
    </Routes>
  )
}
