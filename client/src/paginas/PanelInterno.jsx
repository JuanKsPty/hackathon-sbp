import {
  calidad as pedirCalidad,
  indicadores as pedirIndicadores,
  movimientos as pedirMovimientos,
  movimientosDescomposicion as pedirDescomposicion,
} from '@/api/cliente.js'
import { PeriodoDePagina } from '@/components/layout/PeriodoDePagina.jsx'
import { Accesos } from '@/components/panel/interno/Accesos.jsx'
import { AlertasCalidad } from '@/components/panel/interno/AlertasCalidad.jsx'
import { CalidadPorCorte } from '@/components/panel/interno/CalidadPorCorte.jsx'
import { CarteraPorCorte } from '@/components/panel/interno/CarteraPorCorte.jsx'
import { DescomposicionBancos } from '@/components/panel/interno/DescomposicionBancos.jsx'
import { EstadoOperacion } from '@/components/panel/interno/EstadoOperacion.jsx'
import { EvolucionPosiciones } from '@/components/panel/interno/EvolucionPosiciones.jsx'
import { MovimientosExplicados } from '@/components/panel/interno/MovimientosExplicados.jsx'
import { ResumenCorte } from '@/components/panel/interno/ResumenCorte.jsx'
import { RiesgoCartera } from '@/components/panel/interno/RiesgoCartera.jsx'
import { Seccion } from '@/components/panel/interno/Seccion.jsx'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { periodoAnterior } from '@/lib/periodos.js'
import { Pagina } from './Pagina.jsx'

// Cortes que entran en los gráficos de composición (el elegido y los anteriores).
const CORTES_INDICADORES = 3
const SIN_CONSULTA = { datos: null, error: null, cargando: false, reintentar: () => {} }

// Página principal del sitio interno (#140): un dashboard de gráficas según el perfil.
// - Analista: qué cambió y por qué. Cifras del corte; la cartera corte a corte; de dónde sale la
//   variación de cada banco; movimientos significativos con su explicación; concentración y morosidad;
//   calidad por corte; evolución de posiciones; accesos a Comparar y Reportes.
// - Administrador: lo anterior más el estado de la operación, compacto, al final.
// Toda cifra sale del API (R2). Cada consulta se pide una sola vez aquí y se comparte entre bloques.
export default function PanelInterno() {
  const { perfil, puede } = usePerfil()
  const { periodos, periodo } = usePeriodo()
  // Comparar períodos es configurable por el Administrador (perfiles y permisos): se pregunta por la opción.
  const analiza = puede('comparar_periodos')
  const desde = periodo ? periodoAnterior(periodos, periodo) : null
  const comparar = analiza && Boolean(desde && periodo)
  const fechas = periodos
    .map((p) => p.Fecha)
    .filter((f) => f && periodo && f <= periodo)
    .sort()
    .slice(-CORTES_INDICADORES)

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
  const consultaIndicadores = useConsulta(
    (opciones) => Promise.all(fechas.map((fecha) => pedirIndicadores({ periodo: fecha }, opciones))),
    [fechas.join(',')],
    { activa: fechas.length > 0 },
  )
  // Sin período: todos los cortes, para el gráfico de exclusiones y las alertas del elegido.
  const consultaCalidad = useConsulta((opciones) => pedirCalidad({}, opciones), [periodos.length], { activa: periodos.length > 0 })

  // useConsulta conserva la última respuesta aunque la consulta quede inactiva (primer período).
  const movimientos = comparar ? consultaMovimientos.datos : null
  const descomposicion = comparar ? consultaDescomposicion.datos : null
  const calidadElegida = consultaCalidad.datos?.periodos?.find((p) => p.Fecha === periodo) ?? null
  const consultaAlertas = { ...consultaCalidad, datos: consultaCalidad.datos ? { periodos: calidadElegida ? [calidadElegida] : [] } : null }

  return (
    <Pagina
      titulo="Panel"
      descripcion="Qué cambió en el corte y por qué: la cartera, la variación de cada banco, el riesgo y la calidad."
      acciones={<PeriodoDePagina />}
    >
      <ResumenCorte desde={desde} movimientos={movimientos} descomposicion={descomposicion} />

      <CarteraPorCorte consultaIndicadores={consultaIndicadores} />

      {analiza && <DescomposicionBancos desde={desde} hasta={periodo} consulta={comparar ? consultaDescomposicion : SIN_CONSULTA} />}

      {analiza && (
        <MovimientosExplicados
          desde={desde}
          hasta={periodo}
          consultaMovimientos={comparar ? consultaMovimientos : SIN_CONSULTA}
          consultaDescomposicion={comparar ? consultaDescomposicion : SIN_CONSULTA}
        />
      )}

      <RiesgoCartera consulta={consultaIndicadores} />

      <Seccion id="titulo-control" titulo="Calidad de los datos corte a corte" descripcion="Exclusiones de la cascada y alertas del corte elegido.">
        <CalidadPorCorte consulta={consultaCalidad} />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <AlertasCalidad consulta={consultaAlertas} />
          <Accesos />
        </div>
      </Seccion>

      <EvolucionPosiciones />

      <EstadoOperacion />
    </Pagina>
  )
}
