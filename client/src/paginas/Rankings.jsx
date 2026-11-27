import { useControlGuia } from '@/agente/useControlGuia.js'
import { useState } from 'react'
import { DownloadIcon, InfoIcon } from 'lucide-react'
import {
  calidad as pedirCalidad,
  catalogos as pedirCatalogos,
  rankings as pedirRankings,
  subactividades as pedirSubactividades,
  urlDescarga,
} from '@/api/cliente.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { DesgloseSubactividades } from '@/components/rankings/DesgloseSubactividades.jsx'
import { FiltrosRanking, TODOS } from '@/components/rankings/FiltrosRanking.jsx'
import { GraficoRanking } from '@/components/rankings/GraficoRanking.jsx'
import { SelectorRanking } from '@/components/rankings/SelectorRanking.jsx'
import { TablaRanking } from '@/components/rankings/TablaRanking.jsx'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearPeriodo } from '@/lib/formato.js'
import { Pagina } from './Pagina.jsx'

// La regla SB21 (sección 6) solo mueve saldo dentro de este ranking: Crédito personal con facilidad 07 → Tarjeta.
const RANKING_CON_REGLA_SB21 = 'CONSUMO'

// Página Rankings (#64): período (encabezado), los 6 rankings, tabla ordenable, gráfico,
// filtros por banco y subactividad, y desglose por subactividad. Todas las cifras vienen del API (R2).
export default function Rankings() {
  const { periodo, cargando: cargandoPeriodos, error: errorPeriodos } = usePeriodo()
  const catalogo = useConsulta(pedirCatalogos)
  const listaRankings = catalogo.datos?.rankings ?? []
  const listaBancos = catalogo.datos?.bancos ?? []

  const [elegido, setElegido] = useState(null)
  const [banco, setBanco] = useState(TODOS)
  const [subactividad, setSubactividad] = useState(TODOS)
  const ranking = elegido ?? listaRankings[0]?.Ranking ?? null
  const subactividadesDelRanking = listaRankings.find((r) => r.Ranking === ranking)?.Subactividades ?? []

  const listo = Boolean(periodo && ranking)
  const consultaRanking = useConsulta((o) => pedirRankings({ periodo, ranking }, o), [periodo, ranking], { activa: listo })
  const consultaDesglose = useConsulta((o) => pedirSubactividades({ periodo, ranking }, o), [periodo, ranking], { activa: listo })
  const conReglaSB21 = ranking === RANKING_CON_REGLA_SB21
  const consultaCalidad = useConsulta((o) => pedirCalidad({ periodo }, o), [periodo], { activa: Boolean(periodo) && conReglaSB21 })

  const cambiarRanking = (nuevo) => {
    setElegido(nuevo)
    setSubactividad(TODOS) // las subactividades cambian con el ranking
  }

  // Acciones de pantalla del agente (#125). Van antes de los returns tempranos (reglas de los hooks).
  useControlGuia('rankings.selector-ranking', {
    elegir: (valor) => cambiarRanking(valor),
    estado: () => elegido,
    restaurar: (anterior) => setElegido(anterior),
  })

  if (catalogo.cargando || cargandoPeriodos) {
    return <Contenedor><Cargando filas={6} /></Contenedor>
  }
  if (catalogo.error || errorPeriodos) {
    return <Contenedor><ErrorApi error={catalogo.error ?? errorPeriodos} alReintentar={catalogo.reintentar} /></Contenedor>
  }
  if (!periodo) {
    return (
      <Contenedor>
        <Vacio imagen="/marca/vacio-periodo.webp" titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 aparecerán aquí sus rankings." />
      </Contenedor>
    )
  }

  const bancosDelRanking = consultaRanking.datos?.rankings?.[0]?.bancos ?? []
  const bancoFiltrado = banco === TODOS ? null : banco
  const bancosVisibles = bancoFiltrado ? bancosDelRanking.filter((b) => b.Codigo_Banco === bancoFiltrado) : bancosDelRanking
  const subactividadesVisibles = subactividad === TODOS ? subactividadesDelRanking : [subactividad]
  const reclasificadas = consultaCalidad.datos?.periodos?.[0]?.Reclasificadas_Tarjeta
  const contexto = `${ranking} · ${formatearPeriodo(periodo)}`

  return (
    <Contenedor>
      <Card>
        <CardHeader>
          <CardTitle>Ranking y filtros</CardTitle>
          <CardDescription>El período se elige en el encabezado.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SelectorRanking rankings={listaRankings} valor={ranking} alCambiar={cambiarRanking} />
          <FiltrosRanking
            bancos={listaBancos}
            subactividades={subactividadesDelRanking}
            banco={banco}
            subactividad={subactividad}
            alCambiarBanco={setBanco}
            alCambiarSubactividad={setSubactividad}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posición de los bancos</CardTitle>
          <CardDescription>{contexto} · ordena con un clic en cada encabezado</CardDescription>
          <CardAction>
            <Descarga href={urlDescarga('rankings', { periodo })} guia="rankings.descargar">
              CSV de rankings
            </Descarga>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Estado consulta={consultaRanking} vacio={bancosVisibles.length === 0}>
            <TablaRanking bancos={bancosVisibles} bancoResaltado={bancoFiltrado} />
          </Estado>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saldos por banco</CardTitle>
          <CardDescription>{contexto} · un clic en una barra filtra ese banco</CardDescription>
        </CardHeader>
        <CardContent>
          <Estado consulta={consultaRanking} vacio={bancosDelRanking.length === 0}>
            <GraficoRanking
              bancos={bancosDelRanking}
              bancoResaltado={bancoFiltrado}
              alElegirBanco={(codigo) => codigo && setBanco(codigo === bancoFiltrado ? TODOS : codigo)}
            />
          </Estado>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desglose por subactividad</CardTitle>
          <CardDescription>{contexto}</CardDescription>
          <CardAction>
            <Descarga href={urlDescarga('subactividades', { periodo })}>CSV de subactividades</Descarga>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {conReglaSB21 && (
            <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Incluye la regla SB21: los créditos personales con facilidad 07 cuentan en Tarjeta.
                {typeof reclasificadas === 'number' && ` En este período se reclasificaron ${formatearEntero(reclasificadas)} operaciones.`}
                {' '}El total de la actividad no cambia.
              </span>
            </p>
          )}
          <Estado consulta={consultaDesglose} vacio={bancosVisibles.length === 0}>
            <DesgloseSubactividades
              filas={consultaDesglose.datos?.subactividades ?? []}
              subactividades={subactividadesVisibles}
              bancos={bancosVisibles}
              bancoResaltado={bancoFiltrado}
            />
          </Estado>
        </CardContent>
      </Card>
    </Contenedor>
  )
}

function Contenedor({ children }) {
  return (
    <Pagina titulo="Rankings" descripcion="Posición de cada banco en las actividades de crédito, con su saldo, ponderación y desglose.">
      {children}
    </Pagina>
  )
}

// Carga, error o contenido de una consulta.
function Estado({ consulta, vacio, children }) {
  if (consulta.cargando) return <Cargando filas={4} />
  if (consulta.error) return <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  if (vacio) return <Vacio titulo="Sin datos" descripcion="No hay datos para los filtros elegidos." />
  return children
}

// `guia`: identificador data-guia para el agente guía (contracts/guia.md), si el contrato lo define.
function Descarga({ href, guia, children }) {
  return (
    <a href={href} download data-guia={guia} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
      <DownloadIcon aria-hidden="true" />
      {children}
    </a>
  )
}
