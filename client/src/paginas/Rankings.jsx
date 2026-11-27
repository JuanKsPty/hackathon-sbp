import { useControlGuia } from '@/agente/useControlGuia.js'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { DownloadIcon, InfoIcon } from 'lucide-react'
import {
  calidad as pedirCalidad,
  catalogos as pedirCatalogos,
  rankings as pedirRankings,
  subactividades as pedirSubactividades,
  urlDescarga,
} from '@/api/cliente.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { PlaceholderGrafico } from '@/components/estados/PlaceholderGrafico.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { AyudaTermino } from '@/components/glosario/AyudaTermino.jsx'
import { DesgloseSubactividades } from '@/components/rankings/DesgloseSubactividades.jsx'
import { FiltrosRanking, TODOS } from '@/components/rankings/FiltrosRanking.jsx'
import { GraficoRanking } from '@/components/rankings/GraficoRanking.jsx'
import { SelectorRanking } from '@/components/rankings/SelectorRanking.jsx'
import { ORDEN_INICIAL, TablaRanking } from '@/components/rankings/TablaRanking.jsx'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { decidirPeriodo, escribirFiltros, leerFiltros } from '@/lib/filtrosUrl.js'
import { formatearEntero, formatearPeriodo } from '@/lib/formato.js'
import { PeriodoDePagina } from '@/components/layout/PeriodoDePagina.jsx'
import { Pagina } from './Pagina.jsx'
import { TODOS_LOS_PERIODOS } from '@/lib/periodos.js'
import { NUEVA_PREGUNTA } from '@/components/asistente/conversacion.js'

// Cuánto queda resaltada la fila que marca el agente.
const RESALTADO_MS = 3000

// La regla SB21 (sección 6) solo mueve saldo dentro de este ranking: Crédito personal con facilidad 07 → Tarjeta.
const RANKING_CON_REGLA_SB21 = 'CONSUMO'

// Página Rankings (#64): período (junto al título), los 6 rankings, tabla ordenable, gráfico,
// filtros por banco y subactividad, y desglose por subactividad. Todas las cifras vienen del API (R2).
// Los filtros viven en la URL (#129): la vista se recarga igual y se puede compartir.
export default function Rankings() {
  const { periodos, periodo: periodoGlobal, cambiarPeriodo, cargando: cargandoPeriodos, error: errorPeriodos } = usePeriodo()
  const catalogo = useConsulta(pedirCatalogos)
  const listaRankings = catalogo.datos?.rankings ?? []
  const listaBancos = catalogo.datos?.bancos ?? []

  const [parametros, setParametros] = useSearchParams()
  const filtros = leerFiltros(parametros, {
    periodos: [...periodos.map((p) => p.Fecha), TODOS_LOS_PERIODOS],
    rankings: listaRankings,
    bancos: listaBancos,
  })
  // El período de la vista sale de la URL desde el primer render (un enlace compartido no pide antes
  // el período por defecto); si la URL no trae uno válido, es el del encabezado.
  const periodo = filtros.periodo ?? periodoGlobal
  const ranking = filtros.ranking ?? listaRankings[0]?.Ranking ?? null
  const banco = filtros.banco ?? TODOS
  const subactividad = filtros.subactividad ?? TODOS
  const subactividadesDelRanking = listaRankings.find((r) => r.Ranking === ranking)?.Subactividades ?? []

  // Cambia uno o más filtros en la URL sin crear una entrada nueva en el historial.
  const actualizar = (cambios) =>
    setParametros(
      escribirFiltros({ periodo, ranking: filtros.ranking, banco: filtros.banco, subactividad: filtros.subactividad, ...cambios }),
      { replace: true },
    )
  const setBanco = (valor) => actualizar({ banco: valor === TODOS ? null : valor })
  const setSubactividad = (valor) => actualizar({ subactividad: valor === TODOS ? null : valor })

  // Período de la URL ↔ encabezado (PeriodoContext, sin modificarlo). Cada vez que cambia uno de los
  // dos, decidirPeriodo (lib/filtrosUrl.js) dice cuál manda:
  // - si el usuario eligió otro período en el encabezado, la URL lo sigue;
  // - si cambió la URL (enlace, atrás/adelante, un Link o el agente), el encabezado la sigue.
  const listoCatalogo = !catalogo.cargando && !cargandoPeriodos && periodos.length > 0
  const periodoGlobalAnterior = useRef(null)
  useEffect(() => {
    if (!listoCatalogo) return
    const accion = decidirPeriodo({
      periodoUrl: filtros.periodo,
      periodoGlobal,
      periodoGlobalAnterior: periodoGlobalAnterior.current,
    })
    periodoGlobalAnterior.current = periodoGlobal
    if (accion?.tipo === 'encabezado') cambiarPeriodo(accion.periodo)
    // Solo el período, partiendo de la URL más reciente: así no pisa un filtro que se acaba de
    // cambiar en el mismo instante (por ejemplo, el ranking que eligió el agente, #125).
    else if (accion?.tipo === 'url') {
      setParametros((previos) => {
        const nuevos = new URLSearchParams(previos)
        nuevos.set('periodo', accion.periodo)
        return nuevos
      }, { replace: true })
    }
    // Reacciona a que el catálogo esté listo y a cualquier cambio del período en la URL o el encabezado.
  }, [listoCatalogo, periodoGlobal, filtros.periodo]) // eslint-disable-line react-hooks/exhaustive-deps

  const listo = Boolean(periodo && ranking)
  const consultaRanking = useConsulta((o) => pedirRankings({ periodo, ranking }, o), [periodo, ranking], { activa: listo })
  const consultaDesglose = useConsulta((o) => pedirSubactividades({ periodo, ranking }, o), [periodo, ranking], { activa: listo })
  const conReglaSB21 = ranking === RANKING_CON_REGLA_SB21
  const consultaCalidad = useConsulta((o) => pedirCalidad({ periodo }, o), [periodo], { activa: Boolean(periodo) && conReglaSB21 })

  // Las subactividades cambian con el ranking: al cambiarlo se quita ese filtro.
  const cambiarRanking = (nuevo) => actualizar({ ranking: nuevo, subactividad: null })

  // Acciones de pantalla del agente (#125). Van antes de los returns tempranos (reglas de los hooks).
  // El agente puede aplicar varias acciones seguidas antes de que la página se vuelva a dibujar: por
  // eso cada una parte de la URL más reciente (actualización funcional), no de los filtros del render.
  const cambiarEnUrl = (cambios) =>
    setParametros(
      (previos) => {
        const nuevos = new URLSearchParams(previos)
        for (const [nombre, valor] of Object.entries(cambios)) {
          if (valor) nuevos.set(nombre, valor)
          else nuevos.delete(nombre)
        }
        return nuevos
      },
      { replace: true },
    )
  // El backend usa "todos"/"todas" para quitar el filtro.
  const sinFiltro = (valor) => (valor === 'todos' || valor === 'todas' || valor === TODOS ? null : valor)
  useControlGuia('rankings.selector-ranking', {
    elegir: (valor) => cambiarEnUrl({ ranking: valor, subactividad: null }),
    actual: () => ranking,
    estado: () => ({ ranking: filtros.ranking, subactividad: filtros.subactividad }),
    restaurar: (anterior) => cambiarEnUrl({ ranking: anterior?.ranking, subactividad: anterior?.subactividad }),
  })
  // La tabla: su orden y la fila del agente viven aquí, así sobreviven a que la tabla se vuelva a
  // montar cuando cambian los datos (por ejemplo, justo después de elegir otro ranking).
  const [ordenTabla, setOrdenTabla] = useState(ORDEN_INICIAL)
  // La fila del agente es temporal: se quita a los 3 s y con cada pregunta nueva. `vez` hace que
  // resaltar otra vez la misma fila vuelva a contar los 3 s.
  const [resaltada, setResaltada] = useState(null)
  const delAgente = resaltada?.codigo ?? null
  useEffect(() => {
    if (!resaltada) return undefined
    const reloj = setTimeout(() => setResaltada(null), RESALTADO_MS)
    return () => clearTimeout(reloj)
  }, [resaltada])
  useEffect(() => {
    const limpiar = () => setResaltada(null)
    window.addEventListener(NUEVA_PREGUNTA, limpiar)
    return () => window.removeEventListener(NUEVA_PREGUNTA, limpiar)
  }, [])
  useControlGuia('rankings.tabla', {
    ordenar: (columna, sentido) => setOrdenTabla({ clave: columna, ascendente: sentido === 'asc' }),
    resaltar: (codigo) => setResaltada({ codigo, vez: Date.now() }),
    ordenActual: () => ({ columna: ordenTabla.clave, orden: ordenTabla.ascendente ? 'asc' : 'desc' }),
    estado: () => ({ orden: ordenTabla }),
    // Deshacer vuelve al orden de antes y quita el resaltado (no se restaura uno viejo).
    restaurar: (anterior) => {
      setOrdenTabla(anterior?.orden ?? ORDEN_INICIAL)
      setResaltada(null)
    },
  })
  useControlGuia('rankings.filtro-banco', {
    elegir: (valor) => cambiarEnUrl({ banco: sinFiltro(valor) }),
    actual: () => filtros.banco ?? 'todos',
    estado: () => filtros.banco,
    restaurar: (anterior) => cambiarEnUrl({ banco: anterior }),
  })
  useControlGuia('rankings.filtro-subactividad', {
    elegir: (valor) => cambiarEnUrl({ subactividad: sinFiltro(valor) }),
    actual: () => filtros.subactividad ?? 'todas',
    estado: () => filtros.subactividad,
    restaurar: (anterior) => cambiarEnUrl({ subactividad: anterior }),
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
    <Contenedor
      filtros={
        <FiltrosRanking
          bancos={listaBancos}
          subactividades={subactividadesDelRanking}
          banco={banco}
          subactividad={subactividad}
          alCambiarBanco={setBanco}
          alCambiarSubactividad={setSubactividad}
        />
      }
    >
      {/* Título y pestañas en la misma línea; si no caben, las pestañas bajan. */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <CardTitle>Actividad económica</CardTitle>
          <div className="min-w-0 max-w-full">
            <SelectorRanking rankings={listaRankings} valor={ranking} alCambiar={cambiarRanking} />
          </div>
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
            <TablaRanking
              bancos={bancosVisibles}
              bancoResaltado={bancoFiltrado}
              orden={ordenTabla}
              alOrdenar={setOrdenTabla}
              delAgente={delAgente}
            />
          </Estado>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saldos por banco</CardTitle>
          <CardDescription>{contexto} · un clic en una barra filtra ese banco</CardDescription>
        </CardHeader>
        <CardContent>
          <Estado consulta={consultaRanking} vacio={bancosDelRanking.length === 0} alto={420}>
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
          <CardTitle className="flex items-center gap-1.5">
            Desglose por subactividad <AyudaTermino clave="subactividad" />
          </CardTitle>
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
              <AyudaTermino clave="regla_sb21" className="mt-0.5" />
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

// Banco y subactividad van a la izquierda del período, en la línea del título.
function Contenedor({ filtros = null, children }) {
  return (
    <Pagina
      titulo="Rankings"
      descripcion="Posición y saldo de cada banco por actividad."
      acciones={
        <>
          {filtros}
          <PeriodoDePagina />
        </>
      }
    >
      {children}
    </Pagina>
  )
}

// Carga, error o contenido de una consulta.
// `alto` (px): si es un gráfico, la carga ocupa ese alto para que no cambie el tamaño.
function Estado({ consulta, vacio, alto, children }) {
  // Al volver a pedir (otro ranking u otro período), lo anterior sigue a la vista hasta que llegan
  // los datos nuevos: la página no se achica y el scroll no salta.
  if (consulta.cargando && !consulta.datos) return alto ? <PlaceholderGrafico alto={alto} /> : <Cargando filas={4} />
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
