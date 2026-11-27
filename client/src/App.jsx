import { BrowserRouter } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PeriodoProvider } from '@/contexto/PeriodoContext.jsx'
import { PerfilProvider } from '@/contexto/PerfilContext.jsx'
import { TemaProvider } from '@/contexto/TemaContext.jsx'
import { GuiaProvider } from '@/guia/GuiaContext.jsx'
import { CapaGuia } from '@/guia/CapaGuia.jsx'
import { AgenteProvider } from '@/agente/AgenteContext.jsx'
// Tabla de rutas del sitio que se construye (SITIO=publico | interno, ver vite.config.js).
import { RutasDelSitio } from '#sitio'

export default function App() {
  return (
    <TemaProvider>
      <PerfilProvider>
        <PeriodoProvider>
          <TooltipProvider>
            <BrowserRouter>
              {/* Cursor guía (#72): necesita el router para cambiar de página entre pasos. */}
              <GuiaProvider>
              <AgenteProvider>
              <RutasDelSitio />
              <CapaGuia />
              </AgenteProvider>
              </GuiaProvider>
            </BrowserRouter>
          </TooltipProvider>
        </PeriodoProvider>
      </PerfilProvider>
    </TemaProvider>
  )
}
