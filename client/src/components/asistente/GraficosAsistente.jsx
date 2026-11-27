import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartColumnIcon, TriangleAlertIcon } from 'lucide-react'
import { calidad, catalogos, movimientos, rankings, subactividades } from '@/api/cliente.js'
import { EstadoControl } from '@/components/calidad/EstadoControl.jsx'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import {
  bancosDelRanking,
  barrasCalidad,
  cambiosDeLider,
  filasMovimientos,
  lideres,
  posicionesPorPeriodo,
  reconciliaciones,
  subactividadesPorBanco,
  ultimaAccion,
} from './accion.js'
import { useConversacion } from './conversacion.js'
import { traerALaVista } from './desplazar.js'
import { PieFuente } from './PieFuente.jsx'

// Gráficos de lo que se le pidió al chat (#108). La acción (qué mostrar) la interpreta el server, con
// IA o por reglas; los datos de cada gráfico se piden aquí a la API, que los saca del motor (R2):
// la IA nunca entrega cifras para dibujar. Cada consulta lleva el perfil elegido (X-Perfil).

// Cinco colores de serie: el verde de "sube" no se usa como serie para no leerse como dato positivo.
const COLORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

// Eje en millones para que quepa: 87562053.92 -> "87.6 M".
const compacto = new Intl.NumberFormat('es-PA', { notation: 'compact', maximumFractionDigits: 1 })

// Alto de un gráfico de barras horizontales: una franja por fila.
const altoPara = (filas) => Math.max(160, filas * 30 + 40)

function textoPeriodo(accion) {
  if (accion.tipo === 'banco' && accion.periodos?.length > 1) {
    return `${formatearPeriodo(accion.periodos[0])} a ${formatearPeriodo(accion.periodos.at(-1))}`
  }
  if (accion.periodo_anterior) {
    return `${formatearPeriodo(accion.periodo)} · comparado con ${formatearPeriodo(accion.periodo_anterior)}`
  }
  return formatearPeriodo(accion.periodo)
}

// Panel con los gráficos de la última pregunta (si los pedía) o de la respuesta elegida con "Ver gráficos". `conAyuda`: si todavía no hay gráficos, muestra
// una tarjeta que explica qué se puede pedir (en la página /asistente).
export function GraficosAsistente({ className, conAyuda = false }) {
  const { mensajes, graficos } = useConversacion()
  const accion = ultimaAccion(mensajes, graficos)
  const contenedor = useRef(null)
  const vista = useRef(accion?.id ?? null)

  // Al llegar gráficos nuevos, si quedaron fuera de la vista, se traen a la vista. Dentro del chat
  // flotante (un contenedor con data-desplazable) solo se desplaza ese contenedor: la página de
  // atrás se queda donde está.
  useEffect(() => {
    if (!accion?.id || accion.id === vista.current) return
    vista.current = accion.id
    traerALaVista(contenedor.current, { soloSiOculto: true })
  }, [accion?.id])

  if (!accion && !conAyuda) return null
  return (
    <div ref={contenedor} data-graficos-asistente="" className={cn('min-w-0 scroll-mt-32', className)}>
      {accion ? <Tablero key={accion.id} accion={accion} /> : <SinGraficos />}
    </div>
  )
}

function SinGraficos() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartColumnIcon className="size-4" aria-hidden="true" />
          Gráficos de tu pregunta
        </CardTitle>
        <CardDescription>
          Pide un informe, un ranking, una comparación de períodos o cómo va un banco, y aquí aparecen sus gráficos. Por
          ejemplo: «Dame el informe de septiembre» o «¿Cómo va el banco 108?». Funciona también sin IA.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <PieFuente />
      </CardFooter>
    </Card>
  )
}

function Tablero({ accion }) {
  const { graficos } = accion
  const porRanking = accion.tipo !== 'banco' && graficos.some((g) => ['rankings', 'subactividades', 'movimientos'].includes(g))
  const consultaCatalogos = useConsulta((op) => catalogos(op), [], { activa: porRanking })
  const consultaRankings = useConsulta((op) => rankings({ periodo: accion.periodo }, op), [accion.periodo], {
    activa: graficos.includes('rankings') || graficos.includes('subactividades'),
  })
  const nombres = (consultaCatalogos.datos?.rankings ?? []).map((r) => r.Ranking)
  const [elegido, setElegido] = useState(accion.ranking)
  const ranking = elegido ?? nombres[0] ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartColumnIcon className="size-4 shrink-0" aria-hidden="true" />
          {accion.titulo}
        </CardTitle>
        <CardDescription className="flex flex-col items-start gap-1.5">
          <span>
            {accion.origen === 'ia'
              ? 'La IA interpretó tu pregunta; cada gráfico usa los datos de la API del motor.'
              : 'Tu pregunta se interpretó por reglas (mes, ranking, banco e informe); cada gráfico usa los datos de la API del motor.'}
          </span>
          <Badge variant="outline">{accion.origen === 'ia' ? 'Interpretado con IA' : 'Interpretado por reglas'}</Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <Avisos avisos={accion.avisos} />
        {porRanking && nombres.length > 1 && <SelectorRanking rankings={nombres} valor={ranking} alCambiar={setElegido} />}
        {graficos.includes('rankings') && (
          <SeccionRankings consulta={consultaRankings} ranking={ranking} accion={accion} />
        )}
        {graficos.includes('subactividades') && (
          <SeccionSubactividades accion={accion} ranking={ranking} consultaRankings={consultaRankings} />
        )}
        {graficos.includes('banco') && <SeccionBanco accion={accion} />}
        {graficos.includes('movimientos') && <SeccionMovimientos accion={accion} ranking={ranking} />}
        {graficos.includes('calidad') && <SeccionCalidad accion={accion} />}
      </CardContent>

      <CardFooter>
        <PieFuente periodoTexto={textoPeriodo(accion)} />
      </CardFooter>
    </Card>
  )
}

export function Avisos({ avisos }) {
  if (!avisos?.length) return null
  return (
    <ul className="flex flex-col gap-1 rounded-lg border border-aviso/30 bg-aviso-fondo px-3 py-2 text-xs text-aviso">
      {avisos.map((aviso) => (
        <li key={aviso} className="flex items-start gap-1.5">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {aviso}
        </li>
      ))}
    </ul>
  )
}

// Pestañas de los 6 rankings (sin data-guia: el cursor guía señala las de la página Rankings).
function SelectorRanking({ rankings: lista, valor, alCambiar }) {
  return (
    <Tabs value={valor ?? undefined} onValueChange={alCambiar}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList aria-label="Ranking de los gráficos">
          {lista.map((r) => (
            <TabsTrigger key={r} value={r} className="px-2.5 text-xs">
              {r}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}

// Encabezado, estado de la consulta y la ruta del API de donde salen los datos.
function Seccion({ titulo, descripcion, consulta, ruta, children }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>}
      </div>
      {consulta.cargando && <Cargando filas={4} />}
      {!consulta.cargando && consulta.error && <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />}
      {!consulta.cargando && !consulta.error && consulta.datos && children}
      <p className="font-mono text-[11px] break-all text-muted-foreground">Datos: GET /api{ruta}</p>
    </section>
  )
}

function Metricas({ opciones, valor, alCambiar }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Valor del gráfico">
      {opciones.map(([clave, etiqueta]) => (
        <Button key={clave} size="xs" variant={clave === valor ? 'default' : 'outline'} aria-pressed={clave === valor} onClick={() => alCambiar(clave)}>
          {etiqueta}
        </Button>
      ))}
    </div>
  )
}

// ---- Rankings (GET /api/rankings) ----

const METRICAS_RANKING = {
  saldo: { campo: 'Saldo_Actividad', etiqueta: 'Saldo de la actividad', formato: formatearMonto, eje: (v) => compacto.format(v) },
  ponderacion: { campo: 'Ponderacion_Pct', etiqueta: 'Ponderación', formato: formatearPorcentaje, eje: (v) => `${v} %` },
}

function SeccionRankings({ consulta, ranking, accion }) {
  const [metrica, setMetrica] = useState('saldo')
  const { campo, etiqueta, formato, eje } = METRICAS_RANKING[metrica]
  const bancos = bancosDelRanking(consulta.datos, ranking)
  const datos = bancos.map((b) => ({ codigo: b.Codigo_Banco, nombre: `${b.Posicion}. ${b.Banco}`, valor: b[campo] }))

  return (
    <Seccion
      titulo={`Ranking ${ranking ?? ''} · ${formatearPeriodo(accion.periodo)}`}
      descripcion="Bancos en el orden de su posición."
      consulta={consulta}
      ruta={`/rankings?periodo=${accion.periodo}`}
    >
      <Metricas
        opciones={Object.entries(METRICAS_RANKING).map(([clave, m]) => [clave, m.etiqueta])}
        valor={metrica}
        alCambiar={setMetrica}
      />
      <ChartContainer config={{ valor: { label: etiqueta, color: 'var(--chart-1)' } }} className="aspect-auto w-full" style={{ height: altoPara(datos.length) }}>
        <BarChart data={datos} layout="vertical" margin={{ left: 4, right: 12 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={eje} />
          <YAxis type="category" dataKey="nombre" width={150} tickLine={false} axisLine={false} interval={0} />
          <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<ChartTooltipContent formatter={(v) => <span className="cifra font-medium">{formato(v)}</span>} />} />
          <Bar dataKey="valor" radius={4}>
            {datos.map((d) => (
              <Cell key={d.codigo} fill="var(--color-valor)" fillOpacity={!accion.banco || accion.banco === d.codigo ? 1 : 0.3} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {accion.tipo === 'informe' && <Lideres respuesta={consulta.datos} />}
    </Seccion>
  )
}

function Lideres({ respuesta }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-medium text-muted-foreground">Líder de cada ranking</h4>
      <ul className="grid gap-2 sm:grid-cols-2">
        {lideres(respuesta).map(({ Ranking, lider }) => (
          <li key={Ranking} className="flex flex-col rounded-lg border px-3 py-2 text-xs">
            <span className="text-muted-foreground">{Ranking}</span>
            <span className="font-medium">{lider?.Banco ?? '—'}</span>
            {lider && <span className="cifra text-muted-foreground">Ponderación {formatearPorcentaje(lider.Ponderacion_Pct)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---- Subactividades (GET /api/subactividades) ----

// El orden de los bancos sale del ranking (GET /api/rankings), que ya pide el tablero.
function SeccionSubactividades({ accion, ranking, consultaRankings }) {
  const propia = useConsulta((op) => subactividades({ periodo: accion.periodo }, op), [accion.periodo])
  const consulta = {
    datos: propia.datos && consultaRankings.datos ? propia.datos : null,
    cargando: propia.cargando || consultaRankings.cargando,
    error: propia.error ?? consultaRankings.error,
    reintentar: propia.error ? propia.reintentar : consultaRankings.reintentar,
  }
  const bancos = bancosDelRanking(consultaRankings.datos, ranking)
  const { subactividades: lista, datos } = subactividadesPorBanco(propia.datos, bancos, ranking)
  const config = Object.fromEntries(lista.map((s, i) => [s.clave, { label: s.nombre, color: COLORES[i % COLORES.length] }]))

  return (
    <Seccion
      titulo={`Desglose por subactividad · ${ranking ?? ''}`}
      descripcion="Saldo de cada subactividad por banco (incluye la reclasificación SB21 a Tarjeta)."
      consulta={consulta}
      ruta={`/subactividades?periodo=${accion.periodo}`}
    >
      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin subactividades para este ranking.</p>
      ) : (
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: altoPara(datos.length) + 30 }}>
          <BarChart data={datos} layout="vertical" margin={{ left: 4, right: 12 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => compacto.format(v)} />
            <YAxis type="category" dataKey="nombre" width={150} tickLine={false} axisLine={false} interval={0} />
            <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<ChartTooltipContent formatter={(v, nombre) => <FilaTooltip etiqueta={config[nombre]?.label ?? nombre} valor={formatearMonto(v)} />} />} />
            <ChartLegend content={<ChartLegendContent />} />
            {lista.map((s) => (
              <Bar key={s.clave} dataKey={s.clave} stackId="saldo" fill={`var(--color-${s.clave})`} />
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </Seccion>
  )
}

function FilaTooltip({ etiqueta, valor }) {
  return (
    <span className="flex w-full justify-between gap-3">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="cifra font-medium">{valor}</span>
    </span>
  )
}

// ---- Movimientos (GET /api/movimientos) ----

const METRICAS_MOVIMIENTO = {
  posicion: { campo: 'Cambio_Posicion', etiqueta: 'Cambio de posición', eje: (v) => String(v) },
  saldo: { campo: 'Var_Saldo_Pct', etiqueta: 'Variación de saldo %', eje: (v) => `${v} %` },
}

function colorDe(valor) {
  if (valor > 0) return 'var(--sube)'
  if (valor < 0) return 'var(--baja)'
  return 'var(--muted-foreground)'
}

function SeccionMovimientos({ accion, ranking }) {
  const consulta = useConsulta(
    (op) => movimientos({ desde: accion.periodo_anterior, hasta: accion.periodo }, op),
    [accion.periodo_anterior, accion.periodo],
  )
  const [metrica, setMetrica] = useState('posicion')
  const { campo, etiqueta, eje } = METRICAS_MOVIMIENTO[metrica]
  const delBanco = accion.tipo === 'banco'
  const filas = filasMovimientos(consulta.datos, { ranking, banco: delBanco ? accion.banco : undefined })
  const datos = filas.map((m) => ({ ...m, valor: m[campo] }))
  // Si la pregunta nombró un ranking, solo el suyo; si no, los cambios de líder de todos.
  const lideresNuevos = cambiosDeLider(consulta.datos).filter((c) => !accion.ranking || c.Ranking === accion.ranking)
  const desde = formatearPeriodo(accion.periodo_anterior)
  const hasta = formatearPeriodo(accion.periodo)

  return (
    <Seccion
      titulo={delBanco ? `Movimientos de ${accion.banco_nombre} · ${desde} → ${hasta}` : `Movimientos ${ranking ?? ''} · ${desde} → ${hasta}`}
      descripcion="Verde sube, rojo baja. Las barras llenas son movimientos significativos según la regla vigente."
      consulta={consulta}
      ruta={`/movimientos?desde=${accion.periodo_anterior}&hasta=${accion.periodo}`}
    >
      <Metricas
        opciones={Object.entries(METRICAS_MOVIMIENTO).map(([clave, m]) => [clave, m.etiqueta])}
        valor={metrica}
        alCambiar={setMetrica}
      />
      <ChartContainer config={{ valor: { label: etiqueta, color: 'var(--chart-1)' } }} className="aspect-auto w-full" style={{ height: altoPara(datos.length) }}>
        <BarChart data={datos} layout="vertical" margin={{ left: 4, right: 12 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={eje} allowDecimals={metrica !== 'posicion'} />
          <YAxis type="category" dataKey="etiqueta" width={150} tickLine={false} axisLine={false} interval={0} />
          <ReferenceLine x={0} stroke="var(--border)" />
          <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<ChartTooltipContent hideLabel={false} formatter={(_, __, item) => <DetalleMovimiento m={item.payload} />} />} />
          <Bar dataKey="valor" radius={3}>
            {datos.map((d) => (
              <Cell key={`${d.etiqueta}-${d.Codigo_Banco}`} fill={colorDe(d.valor)} fillOpacity={d.Significativo ? 1 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {lideresNuevos.length > 0 && (
        <div className="flex flex-col gap-1 text-xs">
          <h4 className="font-medium text-muted-foreground">Cambios de líder</h4>
          <ul className="flex flex-col gap-1">
            {lideresNuevos.map((c) => (
              <li key={c.Ranking}>
                <span className="font-medium">{c.Ranking}:</span> {c.actual?.Banco} pasa a liderar y desplaza a {c.anterior?.Banco}.
              </li>
            ))}
          </ul>
        </div>
      )}
    </Seccion>
  )
}

function DetalleMovimiento({ m }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span>
        Posición <span className="cifra font-medium">{m.Posicion_anterior}</span> → <span className="cifra font-medium">{m.Posicion_actual}</span>
      </span>
      <span>
        Variación de saldo <span className="cifra font-medium">{m.Var_Saldo_Pct === null ? '—' : formatearPorcentaje(m.Var_Saldo_Pct)}</span>
      </span>
      {m.Significativo && <span className="font-medium">Significativo</span>}
    </span>
  )
}

// ---- Calidad (GET /api/calidad) ----

function SeccionCalidad({ accion }) {
  const consulta = useConsulta((op) => calidad({ periodo: accion.periodo }, op), [accion.periodo])
  const periodo = consulta.datos?.periodos?.[0]
  const barras = barrasCalidad(periodo)

  return (
    <Seccion
      titulo={`Calidad de datos · ${formatearPeriodo(accion.periodo)}`}
      descripcion="Exclusiones en cascada: cada fila cuenta solo en el primer filtro que incumple."
      consulta={consulta}
      ruta={`/calidad?periodo=${accion.periodo}`}
    >
      {periodo && (
        <>
          <dl className="grid gap-2 sm:grid-cols-3">
            <Indicador nombre="Filas leídas" valor={formatearEntero(periodo.Filas_Leidas)} />
            <Indicador nombre="Universo local válido" valor={formatearEntero(periodo.Universo_Local_Valido)} />
            <Indicador nombre="Saldo total válido" valor={formatearMonto(periodo.Saldo_Total_Valido)} />
          </dl>
          <ChartContainer config={{ valor: { label: 'Filas excluidas', color: 'var(--chart-2)' } }} className="aspect-auto h-48 w-full">
            <BarChart data={barras} margin={{ left: 4, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="clave" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} allowDecimals={false} />
              <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.nombre} formatter={(v) => <span className="cifra font-medium">{formatearEntero(v)} filas</span>} />} />
              <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
            </BarChart>
          </ChartContainer>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Cascada:</span>
            <EstadoControl ok={periodo.Cascada_Cuadra} textoOk="Cuadra" textoMal="No cuadra" />
            {reconciliaciones(periodo).map(({ clave, ok }) => (
              <span key={clave} className="inline-flex items-center gap-1">
                <span className="text-muted-foreground">{clave}:</span>
                <EstadoControl ok={ok} />
              </span>
            ))}
          </div>
        </>
      )}
    </Seccion>
  )
}

function Indicador({ nombre, valor }) {
  return (
    <div className="flex flex-col rounded-lg border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{nombre}</dt>
      <dd className="cifra text-sm font-semibold">{valor}</dd>
    </div>
  )
}

// ---- Un banco en el tiempo (GET /api/rankings?banco=… de cada período) ----

function SeccionBanco({ accion }) {
  const consulta = useConsulta(
    (op) => Promise.all(accion.periodos.map((periodo) => rankings({ periodo, banco: accion.banco }, op))),
    [accion.banco, accion.periodos.join(',')],
  )
  const respuestas = consulta.datos ?? []
  const serie = posicionesPorPeriodo(respuestas).map((fila) => ({ ...fila, etiqueta: formatearPeriodo(fila.periodo) }))
  const ultima = respuestas.at(-1)
  const nombres = (ultima?.rankings ?? []).map((r) => r.Ranking)
  const config = Object.fromEntries(nombres.map((r, i) => [r, { label: r, color: COLORES[i % COLORES.length] }]))

  return (
    <Seccion
      titulo={`${accion.banco_nombre} (${accion.banco}) · posición en cada ranking`}
      descripcion="Posición 1 arriba. Una línea por ranking y un punto por período cargado."
      consulta={consulta}
      ruta={`/rankings?periodo=…&banco=${accion.banco} (${accion.periodos.length} ${accion.periodos.length === 1 ? 'período' : 'períodos'})`}
    >
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <LineChart data={serie} margin={{ left: 4, right: 16, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} />
          <YAxis reversed allowDecimals={false} domain={[1, 'dataMax']} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v, nombre) => <FilaTooltip etiqueta={nombre} valor={`${v}.º`} />} />} />
          <ChartLegend content={<ChartLegendContent />} />
          {nombres.map((r) => (
            <Line key={r} dataKey={r} type="monotone" stroke={`var(--color-${r})`} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ))}
        </LineChart>
      </ChartContainer>
      {ultima && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="pb-1 text-left text-muted-foreground">En {formatearPeriodo(ultima.periodo)}</caption>
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 font-medium">Ranking</th>
                <th className="py-1 text-right font-medium">Posición</th>
                <th className="py-1 text-right font-medium">Saldo</th>
                <th className="py-1 text-right font-medium">Ponderación</th>
              </tr>
            </thead>
            <tbody>
              {ultima.rankings.map((r) => {
                const b = r.bancos[0]
                return (
                  <tr key={r.Ranking} className="border-b last:border-0">
                    <td className="py-1">{r.Ranking}</td>
                    <td className="cifra py-1 text-right font-medium">{b ? `${b.Posicion}.º` : '—'}</td>
                    <td className="cifra py-1 text-right">{formatearMonto(b?.Saldo_Actividad)}</td>
                    <td className="cifra py-1 text-right">{formatearPorcentaje(b?.Ponderacion_Pct)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Seccion>
  )
}
