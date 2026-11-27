import { CierreLanding } from '@/components/landing/CierreLanding.jsx'
import { ConfianzaDatos } from '@/components/landing/ConfianzaDatos.jsx'
import { GraficoPrincipal } from '@/components/landing/GraficoPrincipal.jsx'
import { HeroPeriodo } from '@/components/landing/HeroPeriodo.jsx'
import { LideresDelCorte } from '@/components/landing/LideresDelCorte.jsx'
import { MovimientosDelMes } from '@/components/landing/MovimientosDelMes.jsx'
import { useDatosLanding } from '@/components/landing/useDatosLanding.js'
import { IndicadoresAdicionales } from '@/components/panel/IndicadoresAdicionales.jsx'

// Landing del sitio público (#139): dashboard del período elegido en el encabezado, en orden de
// importancia. Toda cifra sale del API (R2). Conserva los data-guia de la ruta / (contracts/guia.md):
// panel.indicadores (hero), panel.lideres, panel.movimientos y panel.indicadores-adicionales.
export default function Inicio() {
  const datos = useDatosLanding()

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <HeroPeriodo datos={datos} />
      <LideresDelCorte datos={datos} />
      <GraficoPrincipal datos={datos} />
      <MovimientosDelMes datos={datos} />
      <ConfianzaDatos datos={datos} />
      {/* Análisis adicional (morosidad, vencimientos y concentración), fuera de los 6 rankings. */}
      <section aria-label="Indicadores adicionales" className="min-w-0 rounded-3xl bg-muted p-2 sm:p-4">
        <IndicadoresAdicionales />
      </section>
      <CierreLanding datos={datos} />
    </div>
  )
}
