import { useMemo, useState } from 'react'
import { CalendarRangeIcon, DownloadIcon } from 'lucide-react'
import {
  catalogos as pedirCatalogos,
  descargarArchivo,
  movimientos as pedirMovimientos,
  rankings as pedirRankings,
} from '@/api/cliente.js'
import { AvisoCambioLider } from '@/components/comparar/AvisoCambioLider.jsx'
import { COLOR_BANCO_A, COLOR_BANCO_B, COLOR_BANCO_ELEGIDO } from '@/components/comparar/colores.js'
import { ComparacionBancos } from '@/components/comparar/ComparacionBancos.jsx'
import { DescomposicionMovimiento } from '@/components/comparar/DescomposicionMovimiento.jsx'
import { Estado } from '@/components/comparar/Estado.jsx'
import { ExplicacionesPar } from '@/components/comparar/ExplicacionesPar.jsx'
import { GraficoPosiciones } from '@/components/comparar/GraficoPosiciones.jsx'
import { ordenarMovimientos, periodosPorDefecto, resolverOpcion, validarRango } from '@/components/comparar/movimientos.js'
import { Selector } from '@/components/comparar/Selector.jsx'
import { ReglaVigente } from '@/components/comparar/ReglaVigente.jsx'
import { elegirParDeBancos } from '@/components/comparar/series.js'
import { SoloAnalista } from '@/components/comparar/SoloAnalista.jsx'
import { TablaMovimientos } from '@/components/comparar/TablaMovimientos.jsx'
import { useDescarga } from '@/components/comparar/useDescarga.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearPeriodo } from '@/lib/formato.js'
import { Pagina } from './Pagina.jsx'

// Comparar períodos (comparar_periodos) y comparar entidades (comparar_entidades) son de
// Analista y Administrador; el backend responde 403 al resto aunque se llame directo a la API.
const puedeComparar = (perfil) => perfil === 'analista' || perfil === 'admin'

// Página Comparar (#61): movimientos entre dos períodos, evolución de posiciones, descomposición
// del saldo y comparación de 2 bancos. Todas las cifras vienen del API (R2).
export default function Comparar() {
  const { perfil } = usePerfil()
  const { periodos, cargando, error, reintentar } = usePeriodo()
  const permitido = puedeComparar(perfil)
  const catalogo = useConsulta(pedirCatalogos, [], { activa: permitido })

  if (!permitido) {
    return (
      <Contenedor>
        <Card>
          <CardHeader>
            <CardTitle>Comparación entre períodos y bancos</CardTitle>
            <CardDescription>Movimientos, evolución de posiciones y comparación de 2 bancos</CardDescription>
          </CardHeader>
          <CardContent>
            <SoloAnalista perfil={perfil} que="Comparar períodos y bancos" />
          </CardContent>
        </Card>
      </Contenedor>
    )
  }
  if (cargando || catalogo.cargando || (!catalogo.datos && !catalogo.error)) {
    return <Contenedor><Cargando filas={6} /></Contenedor>
  }
  if (error || catalogo.error) {
    return (
      <Contenedor>
        <ErrorApi error={error ?? catalogo.error} alReintentar={error ? reintentar : catalogo.reintentar} />
      </Contenedor>
    )
  }
  if (periodos.length === 0) {
    return (
      <Contenedor>
        <Vacio imagen="/marca/vacio-periodo.webp" titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 podrás comparar sus períodos aquí." />
      </Contenedor>
    )
  }
  if (periodos.length < 2) {
    return (
      <Contenedor>
        <Vacio
          icono={CalendarRangeIcon}
          titulo="Hacen falta 2 períodos para comparar"
          descripcion={`Solo hay un período cargado (${formatearPeriodo(periodos[0].Fecha)}). Para ver movimientos, cambios de posición y de saldo, el Administrador debe cargar otro período en Administración.`}
        />
      </Contenedor>
    )
  }

  return (
    <Contenedor>
      <Comparacion periodos={periodos} rankings={catalogo.datos.rankings ?? []} bancos={catalogo.datos.bancos ?? []} />
    </Contenedor>
  )
}

function Contenedor({ children }) {
  return (
    <Pagina titulo="Comparar períodos" descripcion="Cambios de posición y de saldo de cada banco entre dos períodos, y comparación de dos bancos.">
      {children}
    </Pagina>
  )
}

// Todo el contenido de la página, ya con perfil permitido, 2 o más períodos y catálogo cargado.
function Comparacion({ periodos, rankings, bancos }) {
  const fechas = useMemo(() => periodos.map((p) => p.Fecha).sort(), [periodos])
  const nombresRankings = useMemo(() => rankings.map((r) => r.Ranking), [rankings])
  const codigosBancos = useMemo(() => bancos.map((b) => b.Codigo_Banco), [bancos])

  // Elecciones del usuario; sin elegir, por omisión el penúltimo y el último período, y el primer ranking.
  const porDefecto = periodosPorDefecto(fechas)
  const [elegidoDesde, setElegidoDesde] = useState(null)
  const [elegidoHasta, setElegidoHasta] = useState(null)
  const [elegidoRanking, setElegidoRanking] = useState(null)
  const desde = resolverOpcion(elegidoDesde, fechas, porDefecto.desde)
  const hasta = resolverOpcion(elegidoHasta, fechas, porDefecto.hasta)
  const ranking = resolverOpcion(elegidoRanking, nombresRankings, nombresRankings[0] ?? null)
  const errorRango = validarRango(desde, hasta)
  const rangoValido = errorRango === null

  const [soloSignificativos, setSoloSignificativos] = useState(false)
  const [bancoElegido, setBancoElegido] = useState(null)
  const [elegidoA, setElegidoA] = useState(null)
  const [elegidoB, setElegidoB] = useState(null)

  const consultaMovimientos = useConsulta(
    (opciones) => pedirMovimientos({ desde, hasta, ranking }, opciones),
    [desde, hasta, ranking],
    { activa: rangoValido && Boolean(ranking) },
  )
  // Posiciones de todos los períodos cargados en el ranking elegido: un /api/rankings por período.
  const consultaPosiciones = useConsulta(
    (opciones) => Promise.all(fechas.map((periodo) => pedirRankings({ periodo, ranking }, opciones))),
    [fechas.join(','), ranking],
    { activa: Boolean(ranking) },
  )

  const datosRanking = consultaMovimientos.datos?.rankings?.[0]
  const movimientos = useMemo(() => datosRanking?.movimientos ?? [], [datosRanking])
  const visibles = soloSignificativos ? movimientos.filter((m) => m.Significativo) : movimientos

  // Banco A y B: lo elegido, o los dos mejor posicionados del ranking en el período final.
  const mejores = useMemo(() => ordenarMovimientos(movimientos).map((m) => m.Codigo_Banco), [movimientos])
  const { a: bancoA, b: bancoB } = elegirParDeBancos({
    elegidoA,
    elegidoB,
    candidatos: [...mejores, ...codigosBancos],
    validos: codigosBancos,
  })

  // Bancos que el gráfico resalta, sin repetir (si coinciden, manda el de la tabla).
  const resaltados = useMemo(() => {
    const lista = []
    for (const [codigo, color] of [[bancoElegido, COLOR_BANCO_ELEGIDO], [bancoA, COLOR_BANCO_A], [bancoB, COLOR_BANCO_B]]) {
      if (codigo && !lista.some((r) => r.codigo === codigo)) lista.push({ codigo, color })
    }
    return lista
  }, [bancoElegido, bancoA, bancoB])

  const opcionesPeriodo = fechas.map((f) => ({ valor: f, etiqueta: formatearPeriodo(f) }))
  const opcionesRanking = nombresRankings.map((r) => ({ valor: r, etiqueta: r }))
  const tramo = rangoValido ? `${formatearPeriodo(desde)} → ${formatearPeriodo(hasta)}` : null
  const alElegirBanco = (codigo) => codigo && setBancoElegido((previo) => (previo === codigo ? null : codigo))

  const descarga = useDescarga()
  const descargar = () =>
    descarga.ejecutar(() =>
      descargarArchivo('/exportar/movimientos.csv', {
        desde,
        hasta,
        ranking,
        solo_significativos: soloSignificativos ? 'true' : undefined,
      }),
    )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Períodos y ranking</CardTitle>
          <CardDescription>Compara dos períodos cargados en el ranking que elijas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Selector etiqueta="Desde" guia="comparar.selector-desde" valor={desde} alCambiar={setElegidoDesde} opciones={opcionesPeriodo} />
            <Selector etiqueta="Hasta" guia="comparar.selector-hasta" valor={hasta} alCambiar={setElegidoHasta} opciones={opcionesPeriodo} />
            <Selector etiqueta="Ranking" guia="comparar.selector-ranking" valor={ranking} alCambiar={setElegidoRanking} opciones={opcionesRanking} />
          </div>
          {errorRango && (
            <p role="alert" className="text-sm text-destructive">
              {errorRango}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de posición</CardTitle>
          {/* En una tarjeta angosta el botón baja a su propia fila (igual que en Reportes). */}
          <CardDescription className="@max-md/card-header:col-start-1">
            {ranking}
            {tramo && ` · ${tramo}`} · ordena con un clic en cada encabezado y haz clic en una fila para ver por qué cambió su saldo
          </CardDescription>
          <CardAction className="@max-md/card-header:col-start-1 @max-md/card-header:row-span-1 @max-md/card-header:row-start-3 @max-md/card-header:mt-2 @max-md/card-header:justify-self-start">
            <Button variant="outline" size="sm" onClick={descargar} disabled={!rangoValido || descarga.descargando}>
              <DownloadIcon aria-hidden="true" />
              {descarga.descargando ? 'Descargando…' : 'movimientos.csv'}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={soloSignificativos}
              onChange={(e) => setSoloSignificativos(e.target.checked)}
            />
            Solo significativos
          </label>
          {descarga.error && <ErrorApi error={descarga.error} titulo="No se pudo descargar el archivo" />}
          {rangoValido ? (
            <>
              <AvisoCambioLider ranking={datosRanking} />
              <ReglaVigente regla={consultaMovimientos.datos?.regla_significativo} />
              <Estado
                consulta={consultaMovimientos}
                activa={rangoValido && Boolean(ranking)}
                vacio={visibles.length === 0}
                tituloVacio={soloSignificativos ? 'Sin movimientos significativos' : 'Sin movimientos'}
                descripcionVacio={
                  soloSignificativos
                    ? 'Ningún banco tuvo un movimiento significativo entre estos períodos. Quita el filtro para ver todos.'
                    : 'No hay movimientos para este ranking entre estos períodos.'
                }
              >
                <TablaMovimientos movimientos={visibles} bancoElegido={bancoElegido} alElegirBanco={setBancoElegido} />
              </Estado>
            </>
          ) : (
            <Vacio icono={CalendarRangeIcon} titulo="Elige un rango válido" descripcion={errorRango} />
          )}
        </CardContent>
      </Card>

      <Card data-guia="comparar.descomposicion">
        <CardHeader>
          <CardTitle>Por qué cambió el saldo</CardTitle>
          <CardDescription>
            {ranking}
            {tramo && ` · ${tramo}`} · el banco se elige en la tabla de movimientos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rangoValido ? (
            <DescomposicionMovimiento desde={desde} hasta={hasta} ranking={ranking} banco={bancoElegido} activa={rangoValido} />
          ) : (
            <Vacio icono={CalendarRangeIcon} titulo="Elige un rango válido" descripcion={errorRango} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por qué se movieron</CardTitle>
          <CardDescription>
            {ranking}
            {tramo && ` · ${tramo}`} · movimientos significativos y cambio de líder explicados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rangoValido ? (
            <ExplicacionesPar desde={desde} hasta={hasta} ranking={ranking} activa={rangoValido} />
          ) : (
            <Vacio icono={CalendarRangeIcon} titulo="Elige un rango válido" descripcion={errorRango} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolución de posiciones</CardTitle>
          <CardDescription>{ranking} · todos los períodos cargados · un clic en una línea resalta ese banco</CardDescription>
        </CardHeader>
        <CardContent>
          <Estado consulta={consultaPosiciones} activa={Boolean(ranking)} vacio={(consultaPosiciones.datos ?? []).length === 0}>
            <GraficoPosiciones
              respuestas={consultaPosiciones.datos ?? []}
              ranking={ranking}
              resaltados={resaltados}
              alElegirBanco={alElegirBanco}
            />
          </Estado>
        </CardContent>
      </Card>

      <Card data-guia="comparar.bancos">
        <CardHeader>
          <CardTitle>Comparar dos bancos</CardTitle>
          <CardDescription>
            Posición, saldo y ponderación en los 6 rankings{tramo && ` · ${tramo}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rangoValido ? (
            <ComparacionBancos
              desde={desde}
              hasta={hasta}
              activa={rangoValido}
              bancos={bancos}
              bancoA={bancoA}
              bancoB={bancoB}
              alCambiarA={setElegidoA}
              alCambiarB={setElegidoB}
            />
          ) : (
            <Vacio icono={CalendarRangeIcon} titulo="Elige un rango válido" descripcion={errorRango} />
          )}
        </CardContent>
      </Card>
    </>
  )
}
