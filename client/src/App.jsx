import { BrowserRouter, Route, Routes } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell.jsx'
import { PeriodoProvider } from '@/contexto/PeriodoContext.jsx'
import { PerfilProvider } from '@/contexto/PerfilContext.jsx'
import { TemaProvider } from '@/contexto/TemaContext.jsx'
import { GuiaProvider } from '@/guia/GuiaContext.jsx'
import { CapaGuia } from '@/guia/CapaGuia.jsx'
import Admin from '@/paginas/Admin.jsx'
import Asistente from '@/paginas/Asistente.jsx'
import Calidad from '@/paginas/Calidad.jsx'
import Comparar from '@/paginas/Comparar.jsx'
import NoEncontrada from '@/paginas/NoEncontrada.jsx'
import Panel from '@/paginas/Panel.jsx'
import Rankings from '@/paginas/Rankings.jsx'
import Reportes from '@/paginas/Reportes.jsx'
import Verificacion from '@/paginas/Verificacion.jsx'

export default function App() {
  return (
    <TemaProvider>
      <PerfilProvider>
        <PeriodoProvider>
          <TooltipProvider>
            <BrowserRouter>
              {/* Cursor guía (#72): necesita el router para cambiar de página entre pasos. */}
              <GuiaProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Panel />} />
                  <Route path="rankings" element={<Rankings />} />
                  <Route path="comparar" element={<Comparar />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="calidad" element={<Calidad />} />
                  <Route path="verificacion" element={<Verificacion />} />
                  <Route path="admin" element={<Admin />} />
                  <Route path="asistente" element={<Asistente />} />
                  <Route path="*" element={<NoEncontrada />} />
                </Route>
              </Routes>
              <CapaGuia />
              </GuiaProvider>
            </BrowserRouter>
          </TooltipProvider>
        </PeriodoProvider>
      </PerfilProvider>
    </TemaProvider>
  )
}
