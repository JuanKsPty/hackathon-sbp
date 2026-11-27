import { useControlGuia } from '@/agente/useControlGuia.js'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CheckIcon, DownloadIcon, InfoIcon, LinkIcon } from 'lucide-react'
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
import { AyudaTermino } from '@/components/glosario/AyudaTermino.jsx'
import { DesgloseSubactividades } from '@/components/rankings/DesgloseSubactividades.jsx'
import { FiltrosRanking, TODOS } from '@/components/rankings/FiltrosRanking.jsx'
import { GraficoRanking } from '@/components/rankings/GraficoRanking.jsx'
import { SelectorRanking } from '@/components/rankings/SelectorRanking.jsx'
import { ORDEN_INICIAL, TablaRanking } from '@/components/rankings/TablaRanking.jsx'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { escribirFiltros, leerFiltros } from '@/lib/filtrosUrl.js'
import { formatearEntero, formatearPeriodo } from '@/lib/formato.js'
import { Pagina } from './Pagina.jsx'

// La regla SB21 (sección 6) solo mueve saldo dentro de este ranking: Crédito personal con facilidad 07 → Tarjeta.
const RANKING_CON_REGLA_SB21 = 'CONSUMO'

// Página Rankings (#64): período (encabezado), los 6 rankings, tabla ordenable, gráfico,
// filtros por banco y subactividad, y desglose por subactividad. Todas las cifras vienen del API (R2).
// Los filtros viven en la URL (#129): la vista se recarga igual y se puede compartir.
export default function Rankings() {
  const { periodos, periodo, cambiarPeriodo, cargando: cargandoPeriodos, error: errorPeriodos } = usePeriodo()
  const catalogo = useConsulta(pedirCatalogos)
  const listaRankings = catalogo.datos?.rankings ?? []
  const listaBancos = catalogo.datos?.bancos ?? []

  const [parametros, setParametros] = useSearchParams()
  const filtros = leerFiltros(parametros, { periodos: periodos.map((p) => p.Fecha), rankings: listaRankings, bancos: listaBancos })
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

  // Período: al abrir un enlace manda el de la URL; después, el del encabezado se copia a la URL.
  const listoCatalogo = !catalogo.cargando && !cargandoPeriodos && periodos.length > 0
  const sincronizado = useRef(false)
  useEffect(() => {
    if (!listoCatalogo) return
    if (!sincronizado.current) {
      sincronizado.current = true
      if (filtros.periodo && filtros.periodo !== periodo) {
        cambiarPeriodo(filtros.periodo)
        return
      }
    }
    // Solo el período, partiendo de la URL más reciente: así no pisa un filtro que se acaba de
    // cambiar en el mismo instante (por ejemplo, el ranking que eligió el agente, #125).
    if (periodo && parametros.get('periodo') !== periodo) {
      setParametros((previos) => {
        const nuevos = new URLSearchParams(previos)
        nuevos.set('periodo', periodo)
        return nuevos
      }, { replace: true })
    }
    // Solo reacciona a que el catálogo esté listo y al período del encabezado.
  }, [listoCatalogo, periodo]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const [delAgente, setDelAgente] = useState(null)
  useControlGuia('rankings.tabla', {
    ordenar: (columna, sentido) => setOrdenTabla({ clave: columna, ascendente: sentido === 'asc' }),
    resaltar: (codigo) => setDelAgente(codigo),
    ordenActual: () => ({ columna: ordenTabla.clave, orden: ordenTabla.ascendente ? 'asc' : 'desc' }),
    estado: () => ({ orden: ordenTabla, delAgente }),
    restaurar: (anterior) => {
      setOrdenTabla(anterior?.orden ?? ORDEN_INICIAL)
      setDelAgente(anterior?.delAgente ?? null)
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
    <Contenedor>
      <Card>
        <CardHeader>
          <CardTitle>Ranking y filtros</CardTitle>
          <CardDescription>El período se elige en el encabezado. La dirección de la página guarda esta vista.</CardDescription>
          <CardAction>
            <CopiarEnlace />
          </CardAction>
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

// Copia la dirección de la vista actual (con sus filtros) para compartirla (#129).
function CopiarEnlace() {
  const [estado, setEstado] = useState('listo') // listo | copiado | error

  const copiar = async () => {
    setEstado((await copiarTexto(window.location.href)) ? 'copiado' : 'error')
    setTimeout(() => setEstado('listo'), 2500)
  }

  if (estado === 'error') {
    return <span className="text-xs text-muted-foreground">No se pudo copiar: usa la dirección del navegador.</span>
  }
  return (
    <Button variant="outline" size="sm" onClick={copiar} aria-live="polite">
      {estado === 'copiado' ? <CheckIcon aria-hidden="true" /> : <LinkIcon aria-hidden="true" />}
      {estado === 'copiado' ? 'Enlace copiado' : 'Copiar enlace'}
    </Button>
  )
}

// El portapapeles moderno solo existe en https o localhost; si no está (por ejemplo, al abrir la app
// por la IP de la red local), se usa una caja de texto oculta.
async function copiarTexto(texto) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // sigue con el método de respaldo
  }
  const caja = document.createElement('textarea')
  caja.value = texto
  caja.setAttribute('readonly', '')
  caja.style.position = 'fixed'
  caja.style.opacity = '0'
  document.body.appendChild(caja)
  caja.select()
  const copiado = document.execCommand('copy')
  caja.remove()
  return copiado
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
