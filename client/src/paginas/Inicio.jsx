import { EncabezadoCorte } from '@/components/landing/EncabezadoCorte.jsx'
import { CalidadCorte, ComposicionCartera, Concentracion, Morosidad } from '@/components/landing/GraficasDelCorte.jsx'
import { GraficoPrincipal } from '@/components/landing/GraficoPrincipal.jsx'
import { LideresDelCorte } from '@/components/landing/LideresDelCorte.jsx'
import { MovimientosDelMes } from '@/components/landing/MovimientosDelMes.jsx'
import { useDatosLanding } from '@/components/landing/useDatosLanding.js'
import { SeccionGris } from '@/components/marca'

// Dashboard del sitio público (#139): el corte vigente elegido en el encabezado, con gráficas de
// datos del API (R2). Conserva los data-guia de la ruta / (contracts/guia.md): panel.indicadores
// (encabezado), panel.lideres, panel.movimientos y panel.indicadores-adicionales.
export default function Inicio() {
  const datos = useDatosLanding()

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <EncabezadoCorte datos={datos} />

      <SeccionGris className="flex min-w-0 flex-col gap-4">
        <GraficoPrincipal datos={datos} />
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ComposicionCartera indicadores={datos.indicadores} />
          <CalidadCorte calidad={datos.calidad} />
        </div>
        {/* Análisis adicional (concentración y morosidad), fuera de los 6 rankings oficiales. */}
        <div data-guia="panel.indicadores-adicionales" className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Concentracion indicadores={datos.indicadores} />
          <Morosidad indicadores={datos.indicadores} />
        </div>
        <LideresDelCorte datos={datos} />
      </SeccionGris>

      {/* Única sección que compara con el corte anterior: pendiente de decisión, se quita con esta línea. */}
      <MovimientosDelMes />
    </div>
  )
}
