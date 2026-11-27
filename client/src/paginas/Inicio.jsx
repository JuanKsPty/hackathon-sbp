import { CasosDeUso } from '@/components/inicio/CasosDeUso.jsx'
import { PortadaPublica } from '@/components/inicio/PortadaPublica.jsx'
import { EncabezadoCorte } from '@/components/landing/EncabezadoCorte.jsx'
import { CalidadCorte, ComposicionCartera, Concentracion, Morosidad } from '@/components/landing/GraficasDelCorte.jsx'
import { GraficoPrincipal } from '@/components/landing/GraficoPrincipal.jsx'
import { LideresDelCorte } from '@/components/landing/LideresDelCorte.jsx'
import { useDatosLanding } from '@/components/landing/useDatosLanding.js'
import { SeccionGris } from '@/components/marca'

// Inicio del sitio público (ruta /, #139), con el estilo SBP (paleta E+):
// 1. Portada: para quién es y qué responde, con las llamadas a Rankings y a la presentación.
// 2. Casos de uso: las preguntas del público y la sección que responde cada una.
// 3. Dashboard del corte elegido, con gráficas de datos del API (R2). Solo el corte vigente: no
//    compara períodos. Conserva los data-guia públicos de la ruta / (contracts/guia.md):
//    panel.indicadores (encabezado del corte), panel.lideres y panel.indicadores-adicionales.
// No muestra nada del Analista ni del Administrador, ni enlaces al sitio interno. Fuente, período y
// aviso van al pie (BarraFuente).
export default function Inicio() {
  const datos = useDatosLanding()

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <PortadaPublica />
      <CasosDeUso />
      <section aria-label="Dashboard del corte" className="flex min-w-0 flex-col gap-4 sm:gap-6">
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
      </section>
    </div>
  )
}
