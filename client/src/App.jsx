import { BrowserRouter } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PeriodoProvider } from '@/contexto/PeriodoContext.jsx'
import { PerfilProvider } from '@/contexto/PerfilContext.jsx'
import { TemaProvider } from '@/contexto/TemaContext.jsx'
import { GuiaProvider } from '@/guia/GuiaContext.jsx'
import { CapaGuia } from '@/guia/CapaGuia.jsx'
import { AgenteProvider } from '@/agente/AgenteContext.jsx'
import { DemostracionProvider } from '@/agente/DemostracionContext.jsx'
import { CapaDemostracion } from '@/agente/CapaDemostracion.jsx'
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
              {/* Demostración con el cursor (#123): recorre las acciones de pantalla del agente. */}
              <DemostracionProvider>
              <RutasDelSitio />
              <CapaGuia />
              <CapaDemostracion />
              </DemostracionProvider>
              </AgenteProvider>
              </GuiaProvider>
            </BrowserRouter>
          </TooltipProvider>
        </PeriodoProvider>
      </PerfilProvider>
    </TemaProvider>
  )
}
