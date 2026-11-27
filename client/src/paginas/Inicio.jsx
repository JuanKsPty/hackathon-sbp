import { CalendarDaysIcon } from 'lucide-react'
import { CasosDeUso } from '@/components/inicio/CasosDeUso.jsx'
import { PortadaPublica } from '@/components/inicio/PortadaPublica.jsx'
import { PeriodoDePagina } from '@/components/layout/PeriodoDePagina.jsx'
import { Etiqueta, TituloDosTonos } from '@/components/marca'
import { IndicadoresAdicionales } from '@/components/panel/IndicadoresAdicionales.jsx'
import { LideresRankings } from '@/components/panel/LideresRankings.jsx'
import { ResumenPeriodo } from '@/components/panel/ResumenPeriodo.jsx'

// Inicio del sitio público (ruta /, #139): la landing para el público, con el estilo SBP (paleta E+).
// 1. Portada: para quién es, qué responde y cifras del período.
// 2. Casos de uso: las preguntas del público y la sección que responde cada una.
// 3. El período en cifras: indicadores, líderes e indicadores adicionales, con sus data-guia de
//    siempre (panel.*), así que el agente y el cursor guía llegan igual que al Panel.
// No muestra nada del Analista ni del Administrador, ni bloqueado. Fuente, período y aviso van al pie.
export default function Inicio() {
  return (
    <div className="flex flex-col gap-12">
      <PortadaPublica />
      <CasosDeUso />
      <section aria-labelledby="periodo-en-cifras" className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <Etiqueta icono={CalendarDaysIcon}>Datos del período</Etiqueta>
            <TituloDosTonos id="periodo-en-cifras" fuerte="El período en cifras" suave="y el líder de cada ranking." />
          </div>
          <PeriodoDePagina />
        </div>
        <ResumenPeriodo />
        <LideresRankings />
        <IndicadoresAdicionales />
      </section>
    </div>
  )
}
