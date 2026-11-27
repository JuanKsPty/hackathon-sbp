import { EncabezadoCorte } from '@/components/landing/EncabezadoCorte.jsx'
import { ComposicionCartera, Concentracion, Morosidad } from '@/components/landing/GraficasDelCorte.jsx'
import { GraficoPrincipal } from '@/components/landing/GraficoPrincipal.jsx'
import { LideresDelCorte } from '@/components/landing/LideresDelCorte.jsx'
import { useDatosLanding } from '@/components/landing/useDatosLanding.js'
import { SeccionGris } from '@/components/marca'

// Panel del sitio público (/panel; / es la landing, paginas/Inicio.jsx): dashboard del corte elegido,
// con gráficas de datos del API (R2). Solo el corte vigente: no compara períodos. Conserva los
// data-guia públicos del Panel (contracts/guia.md): panel.indicadores (encabezado del corte),
// panel.lideres y panel.indicadores-adicionales. No muestra nada del Analista ni del Administrador.
// Fuente, período y aviso van al pie (BarraFuente).
export default function PanelPublico() {
  const datos = useDatosLanding()

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <section aria-label="Dashboard del corte" className="flex min-w-0 flex-col gap-4 sm:gap-6">
        <EncabezadoCorte datos={datos} />
        <SeccionGris className="flex min-w-0 flex-col gap-4">
          <GraficoPrincipal datos={datos} />
          {/* Sin el bloque "Calidad del corte": la calidad de datos no se muestra en el sitio público. */}
          <ComposicionCartera indicadores={datos.indicadores} />
          {/* Análisis adicional (concentración y morosidad), fuera de los 6 rankings oficiales. */}
          <div data-guia="panel.indicadores-adicionales" className="grid min-w-0 gap-4 lg:grid-cols-2">
            <Concentracion indicadores={datos.indicadores} />
            <Morosidad indicadores={datos.indicadores} />
          </div>
          <LideresDelCorte datos={datos} />
        </SeccionGris>
      </section>
    </div>
  )
}
