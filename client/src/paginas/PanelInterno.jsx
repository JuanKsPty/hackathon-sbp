import { calidad as pedirCalidad, movimientos as pedirMovimientos, movimientosDescomposicion as pedirDescomposicion } from '@/api/cliente.js'
import { IndicadoresAdicionales } from '@/components/panel/IndicadoresAdicionales.jsx'
import { Accesos } from '@/components/panel/interno/Accesos.jsx'
import { AlertasCalidad } from '@/components/panel/interno/AlertasCalidad.jsx'
import { EstadoOperacion } from '@/components/panel/interno/EstadoOperacion.jsx'
import { EvolucionPosiciones } from '@/components/panel/interno/EvolucionPosiciones.jsx'
import { MovimientosExplicados } from '@/components/panel/interno/MovimientosExplicados.jsx'
import { ResumenCorte } from '@/components/panel/interno/ResumenCorte.jsx'
import { SeccionGris, TituloDosTonos } from '@/components/marca'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { periodoAnterior } from '@/lib/periodos.js'

// Página principal del sitio interno (#140): un dashboard según el perfil.
// - Analista: qué cambió y por qué (cifras del corte, movimientos con su descomposición y explicación,
//   evolución de posiciones, alertas de calidad y accesos a Comparar y Reportes).
// - Administrador: lo anterior más el estado de la operación (último corte, regla vigente y bitácora).
// Toda cifra sale del API (R2). Los movimientos y la descomposición se piden una sola vez aquí y se
// comparten entre el bloque oscuro y la sección de movimientos.
export default function PanelInterno() {
  const { perfil, nombre } = usePerfil()
  const { periodos, periodo } = usePeriodo()
  const analiza = perfil === 'analista' || perfil === 'admin'
  const desde = periodo ? periodoAnterior(periodos, periodo) : null
  const comparar = analiza && Boolean(desde && periodo)

  const consultaMovimientos = useConsulta(
    (opciones) => pedirMovimientos({ desde, hasta: periodo, solo_significativos: true }, opciones),
    [perfil, desde, periodo],
    { activa: comparar },
  )
  const consultaDescomposicion = useConsulta(
    (opciones) => pedirDescomposicion({ desde, hasta: periodo }, opciones),
    [perfil, desde, periodo],
    { activa: comparar },
  )
  const consultaCalidad = useConsulta((opciones) => pedirCalidad({ periodo }, opciones), [periodo], { activa: Boolean(periodo) })

  // useConsulta conserva la última respuesta aunque la consulta quede inactiva (primer período).
  const movimientos = comparar ? consultaMovimientos.datos : null
  const descomposicion = comparar ? consultaDescomposicion.datos : null

  return (
    <div className="flex flex-col gap-6">
      <ResumenCorte nombrePerfil={nombre} desde={desde} movimientos={movimientos} descomposicion={descomposicion} />

      {analiza && (
        <MovimientosExplicados
          desde={desde}
          hasta={periodo}
          consultaMovimientos={comparar ? consultaMovimientos : { datos: null, error: null, cargando: false }}
          consultaDescomposicion={comparar ? consultaDescomposicion : { datos: null, error: null, cargando: false }}
        />
      )}

      <EvolucionPosiciones />

      <SeccionGris role="region" className="flex flex-col gap-5 animate-aparecer" aria-labelledby="titulo-control">
        <TituloDosTonos fuerte={<span id="titulo-control">Calidad y siguientes pasos</span>} suave="del corte" />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <AlertasCalidad consulta={consultaCalidad} />
          <Accesos />
        </div>
      </SeccionGris>

      <EstadoOperacion />

      <IndicadoresAdicionales />
    </div>
  )
}
