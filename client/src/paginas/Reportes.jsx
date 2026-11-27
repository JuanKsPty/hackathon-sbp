import { useState } from 'react'
import { DownloadIcon, LockIcon } from 'lucide-react'
import {
  catalogos as pedirCatalogos,
  descargarArchivo,
  parametrosPersonalizado,
  urlDescarga,
} from '@/api/cliente.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { AlertasPorCorreo } from '@/components/reportes/AlertasPorCorreo.jsx'
import { ReportePorCorreo } from '@/components/reportes/ReportePorCorreo.jsx'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AVISO_ACCESO, NOMBRES_PERFIL, usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearPeriodo } from '@/lib/formato.js'
import { Pagina } from './Pagina.jsx'

// Radix Select no admite un valor vacío: "todos" significa sin filtro.
const TODOS = 'todos'

// Descargas de los entregables 2 a 4 (abiertas a los 3 perfiles): un enlace directo al CSV.
const DESCARGAS_ABIERTAS = [
  { tipo: 'rankings', titulo: 'Rankings', entregable: 'Entregable 2', descripcion: 'Posición, saldo y ponderación de cada banco en los 6 rankings.', guia: 'reportes.descarga-rankings' },
  { tipo: 'subactividades', titulo: 'Desglose por subactividad', entregable: 'Entregable 3', descripcion: 'Saldo de cada banco por subactividad CINU.', guia: 'reportes.descarga-subactividades' },
  { tipo: 'calidad', titulo: 'Calidad de los datos', entregable: 'Entregable 4', descripcion: 'Exclusiones E1–E4, alertas y reconciliaciones.', guia: 'reportes.descarga-calidad' },
  { tipo: 'excluidas', titulo: 'Filas excluidas', entregable: 'Exclusión auditable', descripcion: 'Cada fila excluida con su motivo.' },
  { tipo: 'alertas', titulo: 'Alertas de calidad', entregable: 'Alertas', descripcion: 'Avisos de calidad que no excluyen filas.' },
]


// Página Reportes (#68): descargas de los entregables 2 a 5, el reporte personalizado del Analista y
// la suscripción a las alertas por correo (#7). Todas las cifras salen del API (R2); aquí solo se
// eligen filtros y se piden los CSV.
export default function Reportes() {
  const { perfil, puede, opcionesListas } = usePerfil()
  const { periodo, periodos, cargando, error, reintentar } = usePeriodo()
  const catalogo = useConsulta(pedirCatalogos)

  if (cargando || catalogo.cargando) {
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
        <Vacio imagen="/marca/vacio-periodo.webp" titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 aparecerán aquí sus reportes." />
      </Contenedor>
    )
  }

  const rankings = catalogo.datos?.rankings ?? []
  const bancos = catalogo.datos?.bancos ?? []

  return (
    <Contenedor>
      {/* Las tres opciones son configurables por el Administrador (perfiles y permisos). */}
      {!opcionesListas || puede('descargar') ? (
        <DescargasAbiertas periodos={periodos} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Descargas</CardTitle>
          </CardHeader>
          <CardContent>
            <SoloAnalista perfil={perfil} que="La descarga de reportes" />
          </CardContent>
        </Card>
      )}
      {/* El sitio público no muestra las descargas del Analista: ni bloqueadas (no entran en su bundle). */}
      {!__INTERNO__ ? null : puede('comparar_periodos') ? (
        <DescargaMovimientos periodos={periodos} rankings={rankings} />
      ) : (
        <Card data-guia="reportes.descarga-movimientos">
          <CardHeader>
            <CardTitle>Movimientos de posición</CardTitle>
            <CardDescription>Entregable 5</CardDescription>
          </CardHeader>
          <CardContent>
            <SoloAnalista perfil={perfil} que="La descarga de movimientos entre períodos" />
          </CardContent>
        </Card>
      )}
      {!__INTERNO__ ? null : puede('reportes_personalizados') ? (
        <ReportePersonalizado periodos={periodos} rankings={rankings} bancos={bancos} />
      ) : (
        <Card data-guia="reportes.personalizado">
          <CardHeader>
            <CardTitle>Reporte personalizado</CardTitle>
            <CardDescription>Períodos, rankings y bancos a tu medida</CardDescription>
          </CardHeader>
          <CardContent>
            <SoloAnalista perfil={perfil} que="El reporte personalizado" />
          </CardContent>
        </Card>
      )}
      {/* Abierta a los 3 perfiles y a los dos sitios: no depende de las opciones del perfil. */}
      <AlertasPorCorreo bancos={bancos} rankings={rankings} />
      <ReportePorCorreo periodo={periodo} />
    </Contenedor>
  )
}

function Contenedor({ children }) {
  return (
    <Pagina
      titulo="Reportes"
      descripcion={
        __INTERNO__
          ? 'Descargas CSV de los entregables: rankings, subactividades, calidad, excluidas, alertas, movimientos y el reporte personalizado. Aquí también te suscribes a las alertas por correo.'
          : 'Descarga los datos en CSV para tu propio análisis: rankings, subactividades, calidad, filas excluidas y alertas. Aquí también te suscribes a las alertas por correo.'
      }
    >
      {children}
    </Pagina>
  )
}

// Entregables 2 a 4, excluidas y alertas, con un selector de período común.
function DescargasAbiertas({ periodos }) {
  const [periodo, setPeriodo] = useState(TODOS)
  const parametros = periodo === TODOS ? {} : { periodo }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entregables 2 a 4</CardTitle>
        <CardDescription>Sin período, cada archivo trae todos los períodos cargados (cada fila con su Fecha).</CardDescription>
        <CardAction>
          <Selector etiqueta="Período" valor={periodo} alCambiar={setPeriodo}>
            <SelectItem value={TODOS}>Todos los períodos</SelectItem>
            {periodos.map((p) => (
              <SelectItem key={p.Fecha} value={p.Fecha}>
                {formatearPeriodo(p.Fecha)}
              </SelectItem>
            ))}
          </Selector>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESCARGAS_ABIERTAS.map((d) => (
            <Card key={d.tipo} size="sm">
              <CardHeader>
                <CardTitle>{d.titulo}</CardTitle>
                <CardDescription>{d.entregable}</CardDescription>
                <CardAction>
                  <Descarga href={urlDescarga(d.tipo, parametros)} guia={d.guia} titulo={`Descargar ${d.tipo}.csv`}>
                    CSV
                  </Descarga>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{d.descripcion}</p>
              </CardContent>
            </Card>
          ))}
          {/* Dashboard HTML autocontenido (no reemplaza a los CSV). Sin período, usa el último cargado. */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>Reporte HTML</CardDescription>
              <CardAction>
                <Descarga
                  href={`/api/exportar/dashboard.html${periodo === TODOS ? '' : `?periodo=${encodeURIComponent(periodo)}`}`}
                  titulo="Descargar dashboard"
                >
                  Descargar dashboard
                </Descarga>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gráficos y tablas de los rankings con calidad E1–E4; se abre sin internet.</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}

// Entregable 5: movimientos entre dos períodos. Exige sesión de Analista o Administrador (sitio interno).
function DescargaMovimientos({ periodos, rankings }) {
  const [desde, setDesde] = useState(periodos.at(-2)?.Fecha ?? periodos[0].Fecha)
  const [hasta, setHasta] = useState(periodos.at(-1).Fecha)
  const [ranking, setRanking] = useState(TODOS)
  const [soloSignificativos, setSoloSignificativos] = useState(false)
  const descarga = useDescarga()

  const descargar = () =>
    descarga.ejecutar(() =>
      descargarArchivo('/exportar/movimientos.csv', {
        desde,
        hasta,
        ranking: ranking === TODOS ? undefined : ranking,
        solo_significativos: soloSignificativos ? 'true' : undefined,
      }),
    )

  return (
    <Card data-guia="reportes.descarga-movimientos">
      <CardHeader>
        <CardTitle>Movimientos de posición</CardTitle>
        {/* CardHeader es una grilla de 2 columnas con la acción a la derecha; en un encabezado angosto
            (móvil) dejaba el título en una columna estrecha. Ahí la descripción se queda en la
            columna 1 y el botón baja a su propia fila. */}
        <CardDescription className="@max-md/card-header:col-start-1">
          Entregable 5 · cambios de posición y saldo entre dos períodos
        </CardDescription>
        <CardAction className="@max-md/card-header:col-start-1 @max-md/card-header:row-span-1 @max-md/card-header:row-start-3 @max-md/card-header:mt-2 @max-md/card-header:justify-self-start">
          <BotonDescarga descarga={descarga} alDescargar={descargar}>movimientos.csv</BotonDescarga>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Desde" valor={desde} alCambiar={setDesde}>
            {periodos.map((p) => (
              <SelectItem key={p.Fecha} value={p.Fecha}>
                {formatearPeriodo(p.Fecha)}
              </SelectItem>
            ))}
          </Selector>
          <Selector etiqueta="Hasta" valor={hasta} alCambiar={setHasta}>
            {periodos.map((p) => (
              <SelectItem key={p.Fecha} value={p.Fecha}>
                {formatearPeriodo(p.Fecha)}
              </SelectItem>
            ))}
          </Selector>
          <Selector etiqueta="Ranking" valor={ranking} alCambiar={setRanking}>
            <SelectItem value={TODOS}>Todos los rankings</SelectItem>
            {rankings.map((r) => (
              <SelectItem key={r.Ranking} value={r.Ranking}>
                {r.Ranking}
              </SelectItem>
            ))}
          </Selector>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={soloSignificativos} onChange={(e) => setSoloSignificativos(e.target.checked)} />
            Solo significativos
          </label>
        </div>
        {descarga.error && <ErrorApi error={descarga.error} titulo="No se pudo descargar el archivo" />}
      </CardContent>
    </Card>
  )
}

// Reporte personalizado (solo Analista y Administrador): las columnas del entregable 2, solo con
// los períodos, rankings y bancos marcados. Sin marcas en una lista, entran todos.
function ReportePersonalizado({ periodos, rankings, bancos }) {
  const [periodosElegidos, setPeriodosElegidos] = useState([])
  const [rankingsElegidos, setRankingsElegidos] = useState([])
  const [bancosElegidos, setBancosElegidos] = useState([])
  const descarga = useDescarga()

  const descargar = () =>
    descarga.ejecutar(() =>
      descargarArchivo(
        '/exportar/personalizado.csv',
        parametrosPersonalizado({ periodos: periodosElegidos, rankings: rankingsElegidos, bancos: bancosElegidos }),
      ),
    )
  // Mismo filtro, como dashboard HTML autocontenido.
  const descargaDashboard = useDescarga()
  const descargarDashboard = () =>
    descargaDashboard.ejecutar(() =>
      descargarArchivo(
        '/exportar/personalizado.html',
        parametrosPersonalizado({ periodos: periodosElegidos, rankings: rankingsElegidos, bancos: bancosElegidos }),
      ),
    )

  return (
    <Card data-guia="reportes.personalizado">
      <CardHeader>
        <CardTitle>Reporte personalizado</CardTitle>
        <CardDescription>Mismas columnas que el entregable 2. Una lista sin marcas incluye todo.</CardDescription>
        <CardAction>
          <div className="flex flex-wrap gap-2">
            <BotonDescarga descarga={descarga} alDescargar={descargar}>personalizado.csv</BotonDescarga>
            <BotonDescarga descarga={descargaDashboard} alDescargar={descargarDashboard}>Descargar dashboard</BotonDescarga>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Casillas
            titulo="Períodos"
            opciones={periodos.map((p) => ({ valor: p.Fecha, etiqueta: formatearPeriodo(p.Fecha) }))}
            elegidos={periodosElegidos}
            alCambiar={setPeriodosElegidos}
          />
          <Casillas
            titulo="Rankings"
            opciones={rankings.map((r) => ({ valor: r.Ranking, etiqueta: r.Ranking }))}
            elegidos={rankingsElegidos}
            alCambiar={setRankingsElegidos}
          />
          <Casillas
            titulo="Bancos"
            opciones={bancos.map((b) => ({ valor: b.Codigo_Banco, etiqueta: `${b.Codigo_Banco} · ${b.Banco}` }))}
            elegidos={bancosElegidos}
            alCambiar={setBancosElegidos}
          />
        </div>
        {descarga.error && <ErrorApi error={descarga.error} titulo="No se pudo descargar el reporte" />}
      </CardContent>
    </Card>
  )
}

// Estado de una descarga con fetch: en curso y último error.
function useDescarga() {
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState(null)
  const ejecutar = async (accion) => {
    setDescargando(true)
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(e)
    } finally {
      setDescargando(false)
    }
  }
  return { descargando, error, ejecutar }
}

function BotonDescarga({ descarga, alDescargar, children }) {
  return (
    <Button variant="outline" size="sm" onClick={alDescargar} disabled={descarga.descargando}>
      <DownloadIcon aria-hidden="true" />
      {descarga.descargando ? 'Descargando…' : children}
    </Button>
  )
}

// `guia`: identificador data-guia para el agente guía (contracts/guia.md), si el contrato lo define.
function Descarga({ href, guia, titulo, children }) {
  return (
    <a href={href} download data-guia={guia} title={titulo} aria-label={titulo} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
      <DownloadIcon aria-hidden="true" />
      {children}
    </a>
  )
}

function Selector({ etiqueta, valor, alCambiar, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <Select value={valor} onValueChange={alCambiar}>
        <SelectTrigger aria-label={etiqueta} className="min-w-48 text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">{children}</SelectContent>
      </Select>
    </label>
  )
}

// Lista de casillas nativas; `elegidos` conserva el orden de `opciones`.
function Casillas({ titulo, opciones, elegidos, alCambiar }) {
  const alternar = (valor, marcado) => {
    const conjunto = new Set(elegidos)
    if (marcado) conjunto.add(valor)
    else conjunto.delete(valor)
    alCambiar(opciones.map((o) => o.valor).filter((v) => conjunto.has(v)))
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">
        {titulo} <span className="font-normal text-muted-foreground">({elegidos.length === 0 ? 'todos' : elegidos.length})</span>
      </legend>
      {opciones.map((o) => (
        <label key={o.valor} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={elegidos.includes(o.valor)} onChange={(e) => alternar(o.valor, e.target.checked)} />
          {o.etiqueta}
        </label>
      ))}
    </fieldset>
  )
}

// Aviso para Público: el backend también responde 403 aunque se llame directo a la API.
function SoloAnalista({ perfil, que }) {
  return (
    <Vacio
      icono={LockIcon}
      titulo="Solo para los perfiles Analista y Administrador"
      descripcion={`${que} es del Analista y del Administrador. Tu perfil actual es ${NOMBRES_PERFIL[perfil] ?? perfil}. ${AVISO_ACCESO}`}
    />
  )
}
