// Láminas de la presentación web (/presentacion). Siguen la historia del deck de presentacion/
// (#71), más corta. Ninguna cifra se escribe aquí (R2): todas llegan en `datos`
// (useDatosPresentacion), y mientras no llegan se ve "—".
import { Link } from 'react-router'
import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  BellRingIcon,
  BotIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  CreditCardIcon,
  CrownIcon,
  DatabaseIcon,
  FileDownIcon,
  FileSpreadsheetIcon,
  FilterIcon,
  FlaskConicalIcon,
  GitCompareArrowsIcon,
  GlobeIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  LockIcon,
  MessageSquareTextIcon,
  MonitorIcon,
  MousePointerClickIcon,
  RadarIcon,
  RefreshCwIcon,
  ScaleIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagsIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  UploadIcon,
  UsersIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { BloqueOscuro, Etiqueta, SeccionGris } from '@/components/marca'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { CifraGrande, EncabezadoLamina, IconoCirculo, Lamina, SinDatos, Tarjeta } from './piezas.jsx'

// '20260930' -> 'sep 2026' (sin el día: en la lámina se habla del mes).
const mesDe = (fecha) => formatearPeriodo(fecha).replace(/^\d+\s/, '')

const sumar = (lista, campo) =>
  lista.length > 0 && lista.every((p) => typeof p[campo] === 'number') ? lista.reduce((t, p) => t + p[campo], 0) : null

// ---------------------------------------------------------------------------------------------
// 1. Portada
// ---------------------------------------------------------------------------------------------
export function Portada({ datos }) {
  const { periodos, ultimo } = datos
  const maximo = Math.max(0, ...periodos.map((p) => p.Saldo_Total_Valido ?? 0))

  return (
    <div className="h-full p-6 pb-0">
      <BloqueOscuro className="flex h-full gap-12 p-16 sm:p-16">
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex items-center gap-4">
            <img src="/marca/logo.svg" alt="" className="size-14" />
            <Etiqueta icono={RadarIcon} className="h-8 px-4 text-sm">
              Hackathon SBP 2026
            </Etiqueta>
          </div>

          <div className="flex flex-col gap-8">
            <h1 className="text-[92px] leading-[0.98] font-medium tracking-tight text-bloque-foreground">
              Rankings de Crédito
            </h1>
            <p className="max-w-[760px] text-[30px] leading-snug text-balance text-bloque-muted">
              Del archivo AT03 al ranking de cada banco y actividad económica, con cada cifra verificable.
            </p>
          </div>

          <div className="flex items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-xl font-medium text-bloque-foreground">Jesús · Juan · Agustín</p>
              <p className="text-lg text-bloque-muted">
                {ultimo
                  ? `${periodos.length} períodos procesados · último corte ${formatearPeriodo(ultimo)}`
                  : 'Plataforma interactiva de rankings y análisis bancario'}
              </p>
            </div>
          </div>
        </div>

        {/* Saldo total válido de cada período: barras con datos reales del API. */}
        {periodos.length > 0 && maximo > 0 && (
          <figure className="flex w-[440px] flex-col justify-end gap-4" aria-label="Saldo total válido por período">
            <div className="flex h-[480px] items-end gap-5">
              {periodos.map((p, i) => {
                const alto = Math.max(6, ((p.Saldo_Total_Valido ?? 0) / maximo) * 100)
                const esUltimo = i === periodos.length - 1
                return (
                  <div key={p.Fecha} className="flex flex-1 flex-col items-center gap-3" style={{ height: '100%' }}>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={cn(
                          'w-full rounded-t-2xl border-t-4',
                          esUltimo ? 'border-brillo bg-bloque-foreground/20' : 'border-bloque-foreground/40 bg-bloque-foreground/10',
                        )}
                        style={{ height: `${alto}%` }}
                      />
                    </div>
                    <span className="cifra text-base text-bloque-muted">{mesDe(p.Fecha)}</span>
                  </div>
                )
              })}
            </div>
            <figcaption className="text-sm text-bloque-muted">Saldo total de la cartera local válida, por corte</figcaption>
          </figure>
        )}
      </BloqueOscuro>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// 2. El problema
// ---------------------------------------------------------------------------------------------
export function Problema({ datos }) {
  const c = datos.calidadUltimo
  const trampas = [
    { nombre: 'Préstamos duplicados', campo: 'E1_Duplicados' },
    { nombre: 'Operaciones extranjeras', campo: 'E2_Destino_Extranjero' },
    { nombre: 'Saldos en cero o negativos', campo: 'E3_Saldo_No_Positivo' },
    { nombre: 'Actividades fuera del catálogo CINU', campo: 'E4_Actividad_No_Catalogada' },
  ]

  return (
    <Lamina>
      <EncabezadoLamina
        icono={TriangleAlertIcon}
        etiqueta="El problema"
        fuerte="Consultar el crédito es lento y manual,"
        suave="y los datos traen trampas."
      />
      <div className="grid flex-1 grid-cols-2 gap-8">
        <SeccionGris className="flex flex-col gap-6 p-10 sm:p-10">
          <h3 className="text-2xl font-medium">Hoy</h3>
          <ul className="flex flex-col gap-5 text-[26px] leading-snug">
            {[
              'Estadísticas en archivos Excel y PDF',
              'Exploración interactiva limitada',
              'Comparar entidades y períodos toma tiempo',
              'Cada corte se prepara a mano',
            ].map((texto) => (
              <li key={texto} className="flex items-start gap-4">
                <span aria-hidden="true" className="mt-3 size-2.5 shrink-0 rounded-full bg-muted-foreground" />
                {texto}
              </li>
            ))}
          </ul>
        </SeccionGris>

        <SeccionGris className="flex flex-col gap-6 p-10 sm:p-10">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-2xl font-medium">Casos de calidad en el AT03</h3>
            {c && <span className="text-base text-muted-foreground">corte {formatearPeriodo(c.Fecha)}</span>}
          </div>
          <ul className="flex flex-col gap-3">
            {trampas.map(({ nombre, campo }) => (
              <li key={campo} className="flex items-center justify-between gap-4 rounded-tarjeta bg-card px-6 py-4 shadow-tarjeta dark:shadow-none">
                <span className="text-[22px]">{nombre}</span>
                <span className="cifra text-[28px] font-medium">{formatearEntero(c?.[campo])}</span>
              </li>
            ))}
          </ul>
          <p className="text-lg text-muted-foreground">
            Hace falta calcular con reglas explícitas, comparar entre períodos y explicar cada resultado.
          </p>
        </SeccionGris>
      </div>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 3. La propuesta
// ---------------------------------------------------------------------------------------------
export function Propuesta() {
  const pilares = [
    { icono: CalculatorIcon, titulo: 'Calcular', texto: 'Un motor determinista arma los rankings desde los archivos, sin cifras escritas a mano.' },
    { icono: GitCompareArrowsIcon, titulo: 'Comparar', texto: 'Movimientos de posición entre períodos, con una regla configurable.' },
    { icono: SparklesIcon, titulo: 'Explicar', texto: 'La IA consulta y redacta, con un verificador de números. Nunca calcula.' },
    { icono: ClipboardCheckIcon, titulo: 'Verificar', texto: 'El modo del jurado muestra los 6 puntos de la sección 11.1 en un clic.' },
  ]
  return (
    <Lamina>
      <EncabezadoLamina
        icono={RadarIcon}
        etiqueta="La propuesta"
        fuerte="Una app web para calcular, comparar, explicar y verificar"
        suave="los rankings de crédito."
      />
      <div className="grid flex-1 grid-cols-4 gap-6">
        {pilares.map(({ icono, titulo, texto }, i) => (
          <Tarjeta key={titulo} className="justify-between gap-6 p-8">
            <div className="flex items-center justify-between">
              <IconoCirculo icono={icono} />
              <span className="cifra text-lg text-muted-foreground">0{i + 1}</span>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-[32px] font-medium tracking-tight">{titulo}</h3>
              <p className="text-[21px] leading-snug text-muted-foreground">{texto}</p>
            </div>
          </Tarjeta>
        ))}
      </div>
      <p className="text-xl text-muted-foreground">
        React + Node.js, corre en local (R1) y está publicada en <span className="font-medium text-foreground">sbp.juank.tech</span>.
      </p>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 4. Los datos, en vivo
// ---------------------------------------------------------------------------------------------
export function DatosEnVivo({ datos }) {
  const { periodos, rankings, cargando, sinApi } = datos
  const reconciliado = periodos.length > 0 && periodos.every((p) => p.Reconciliaciones_OK === true)
  const bancos = rankings[0]?.bancos?.length

  return (
    <Lamina>
      <EncabezadoLamina
        icono={DatabaseIcon}
        etiqueta="En vivo"
        fuerte="Las cifras de esta lámina las calculó el motor"
        suave="al leer los CSV. Nada está escrito a mano (R2)."
      />
      {periodos.length === 0 ? (
        <SinDatos cargando={cargando && !sinApi} />
      ) : (
        <SeccionGris className="grid flex-1 grid-cols-3 content-start gap-5 p-8 sm:p-8">
          <CifraGrande
            etiqueta="Períodos procesados"
            valor={formatearEntero(periodos.length)}
            detalle={`${mesDe(periodos[0].Fecha)} a ${mesDe(periodos.at(-1).Fecha)}`}
          />
          <CifraGrande etiqueta="Filas AT03 leídas" valor={formatearEntero(sumar(periodos, 'Filas_Leidas'))} detalle="En todos los períodos" />
          <CifraGrande
            etiqueta="Universo local válido"
            valor={formatearEntero(sumar(periodos, 'Universo_Local_Valido'))}
            detalle="Préstamos que entran a los rankings"
          />
          <CifraGrande
            etiqueta="Rankings por período"
            valor={formatearEntero(rankings.length || null)}
            detalle={rankings.map((r) => r.Ranking).join(' · ') || undefined}
          />
          <CifraGrande etiqueta="Bancos en cada ranking" valor={formatearEntero(bancos ?? null)} detalle="Siempre todos, con saldo 0.00 si no tienen" />
          <Tarjeta className="gap-2">
            <p className="text-lg text-muted-foreground">Reconciliaciones R1, R2 y R3</p>
            {reconciliado ? (
              <p className="flex items-center gap-3 text-[40px] leading-none font-medium tracking-tight text-sube">
                <CheckCircle2Icon aria-hidden="true" className="size-10" />
                Cuadran
              </p>
            ) : (
              <p className="flex items-center gap-3 text-[40px] leading-none font-medium tracking-tight text-baja">
                <TriangleAlertIcon aria-hidden="true" className="size-10" />
                Revisar
              </p>
            )}
            <p className="text-base text-muted-foreground">Al centavo, en cada período</p>
          </Tarjeta>
        </SeccionGris>
      )}
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 5. Cascada E1 a E4
// ---------------------------------------------------------------------------------------------
const ETAPAS = [
  { clave: 'E1', campo: 'E1_Duplicados', nombre: 'Duplicados', regla: 'Se conserva la primera ocurrencia', color: 'bg-chart-3' },
  { clave: 'E2', campo: 'E2_Destino_Extranjero', nombre: 'Extranjero', regla: 'Destino distinto de L', color: 'bg-chart-2' },
  { clave: 'E3', campo: 'E3_Saldo_No_Positivo', nombre: 'Saldo', regla: 'Saldo menor o igual a 0', color: 'bg-chart-4' },
  { clave: 'E4', campo: 'E4_Actividad_No_Catalogada', nombre: 'Actividad', regla: 'Fuera del catálogo CINU', color: 'bg-chart-5' },
]

export function Cascada({ datos }) {
  const c = datos.calidadUltimo
  const leidas = c?.Filas_Leidas
  const pct = (n) => (leidas ? `${((n / leidas) * 100).toFixed(2)} %` : '—')
  const r = c?.Reconciliaciones ?? {}

  return (
    <Lamina className="gap-9">
      <EncabezadoLamina
        icono={FilterIcon}
        etiqueta="Motor · cascada E1 a E4"
        fuerte="Cada fila excluida cuenta una sola vez,"
        suave="en el primer filtro que incumple."
      />
      {!c ? (
        <SinDatos cargando={datos.cargando && !datos.sinApi} />
      ) : (
        <>
          {/* Barra de las filas leídas: universo válido y cada exclusión, en proporción real. */}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between text-lg">
              <span className="font-medium">
                {formatearEntero(leidas)} filas leídas · corte {formatearPeriodo(c.Fecha)}
              </span>
              <span className="text-muted-foreground">{c.Archivo}</span>
            </div>
            <div className="flex h-12 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Reparto de las filas leídas">
              <div className="h-full bg-chart-1" style={{ width: `${(c.Universo_Local_Valido / leidas) * 100}%` }} />
              {ETAPAS.map(({ campo, color }) => (
                <div key={campo} className={cn('h-full', color)} style={{ width: `${(c[campo] / leidas) * 100}%`, minWidth: c[campo] > 0 ? 6 : 0 }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {ETAPAS.map(({ clave, campo, nombre, regla, color }) => (
              <Tarjeta key={clave} className="gap-2 p-6">
                <span className="flex items-center gap-2 text-base font-medium text-muted-foreground">
                  <span aria-hidden="true" className={cn('size-3 rounded-full', color)} />
                  {clave} · {nombre}
                </span>
                <span className="cifra text-[40px] leading-none font-medium tracking-tight">{formatearEntero(c[campo])}</span>
                <span className="text-base text-muted-foreground">{regla}</span>
                <span className="cifra text-sm text-muted-foreground">{pct(c[campo])} de las leídas</span>
              </Tarjeta>
            ))}
            <Tarjeta className="gap-2 bg-accent p-6 ring-0">
              <span className="flex items-center gap-2 text-base font-medium text-accent-foreground">
                <span aria-hidden="true" className="size-3 rounded-full bg-chart-1" />
                Universo local válido
              </span>
              <span className="cifra text-[40px] leading-none font-medium tracking-tight">{formatearEntero(c.Universo_Local_Valido)}</span>
              <span className="text-base text-muted-foreground">Entra a los rankings</span>
              <span className="cifra text-sm text-muted-foreground">{pct(c.Universo_Local_Valido)} de las leídas</span>
            </Tarjeta>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={c.Cascada_Cuadra ? 'sube' : 'baja'} size="pildora" className="h-9 px-4 text-base">
              {c.Cascada_Cuadra ? <CheckCircle2Icon aria-hidden="true" /> : <TriangleAlertIcon aria-hidden="true" />}
              leídas = E1 + E2 + E3 + E4 + universo
            </Badge>
            {[
              ['R1', 'subactividades = actividad'],
              ['R2', 'actividades = total del banco'],
              ['R3', 'bancos = universo'],
              ['Unicidad', 'Numero_Prestamo único'],
            ].map(([clave, texto]) => (
              <Badge key={clave} variant={r[clave]?.ok ? 'sube' : 'igual'} size="pildora" className="h-9 px-4 text-base">
                {r[clave]?.ok && <CheckCircle2Icon aria-hidden="true" />}
                {clave}: {texto}
              </Badge>
            ))}
          </div>
        </>
      )}
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 6. Del archivo al ranking
// ---------------------------------------------------------------------------------------------
export function Flujo({ datos }) {
  const reclasificadas = datos.calidadUltimo?.Reclasificadas_Tarjeta
  const pasos = [
    { icono: FileSpreadsheetIcon, titulo: 'Leer y validar', texto: '61 columnas en orden. Los códigos como texto: 07 no pasa a 7.' },
    { icono: FilterIcon, titulo: 'Excluir', texto: 'Cascada E1 a E4 por período, según el campo Fecha.' },
    { icono: TagsIcon, titulo: 'Clasificar', texto: 'Tipo_Actividad = Codigo_CINU. Nunca datos del cliente (R3).' },
    {
      icono: CreditCardIcon,
      titulo: 'Regla SB21',
      texto:
        typeof reclasificadas === 'number'
          ? `Crédito personal con facilidad 07 pasa a Tarjeta: ${formatearEntero(reclasificadas)} en el último corte.`
          : 'Crédito personal con facilidad 07 pasa a Tarjeta.',
    },
    { icono: ScaleIcon, titulo: 'Sumar y ponderar', texto: 'Centavos enteros y BigInt. El denominador es toda la cartera del banco.' },
    { icono: ListOrderedIcon, titulo: 'Ordenar', texto: 'Mayor saldo primero; en empate, por Codigo_Banco. Siempre los 12 bancos.' },
  ]
  return (
    <Lamina>
      <EncabezadoLamina
        icono={CalculatorIcon}
        etiqueta="Motor · del archivo al ranking"
        fuerte="Seis pasos deterministas y reproducibles."
        suave="La IA no participa en ninguno."
      />
      <ol className="grid flex-1 grid-cols-3 grid-rows-2 gap-5">
        {pasos.map(({ icono, titulo, texto }, i) => (
          <li key={titulo}>
            <Tarjeta className="h-full gap-4 p-7">
              <div className="flex items-center gap-4">
                <IconoCirculo icono={icono} />
                <span className="cifra text-base text-muted-foreground">Paso {i + 1}</span>
              </div>
              <h3 className="text-[28px] font-medium tracking-tight">{titulo}</h3>
              <p className="text-[20px] leading-snug text-muted-foreground">{texto}</p>
            </Tarjeta>
          </li>
        ))}
      </ol>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 7. Líderes en vivo
// ---------------------------------------------------------------------------------------------
export function Lideres({ datos }) {
  const { rankings, ultimo } = datos
  return (
    <Lamina className="gap-8">
      <EncabezadoLamina
        icono={CrownIcon}
        etiqueta={ultimo ? `Rankings · ${formatearPeriodo(ultimo)}` : 'Rankings'}
        fuerte="Seis rankings, doce bancos."
        suave="Así queda el primer lugar de cada uno."
      />
      {rankings.length === 0 ? (
        <SinDatos cargando={datos.cargando && !datos.sinApi} />
      ) : (
        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-5">
          {rankings.map((r) => {
            const bancos = [...(r.bancos ?? [])].sort((a, b) => a.Posicion - b.Posicion)
            const lider = bancos[0]
            const tope = lider?.Saldo_Actividad || 1
            return (
              <Tarjeta key={r.Ranking} className="justify-between gap-4 p-6">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground">
                    <CrownIcon aria-hidden="true" className="size-4 text-destacado" />
                    {r.Ranking}
                  </span>
                  <span className="truncate text-[26px] font-medium tracking-tight">{lider?.Banco ?? '—'}</span>
                  <span className="cifra text-lg text-muted-foreground">
                    {formatearMonto(lider?.Saldo_Actividad)} · {formatearPorcentaje(lider?.Ponderacion_Pct)}
                  </span>
                </div>
                {/* Los tres primeros, con barra proporcional al saldo del líder. */}
                <ul className="flex flex-col gap-2">
                  {bancos.slice(0, 3).map((b) => (
                    <li key={b.Codigo_Banco} className="grid grid-cols-[24px_1fr] items-center gap-2 text-sm">
                      <span className="cifra text-muted-foreground">{b.Posicion}</span>
                      <div className="flex flex-col gap-1">
                        <span className="truncate">{b.Banco}</span>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={cn('h-2 rounded-full', b.Posicion === 1 ? 'bg-chart-1' : 'bg-chart-4')}
                            style={{ width: `${Math.max(2, (b.Saldo_Actividad / tope) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )
          })}
        </div>
      )}
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 8. La plataforma
// ---------------------------------------------------------------------------------------------
export function Plataforma() {
  const modulos = [
    { icono: LayoutDashboardIcon, nombre: 'Panel', texto: 'Resumen del período, líderes, movimientos e indicadores extra.' },
    { icono: ListOrderedIcon, nombre: 'Rankings', texto: 'Filtros por período, banco, ranking y subactividad; gráfico y tabla ordenable.' },
    { icono: ArrowLeftRightIcon, nombre: 'Comparar períodos', texto: 'Cambios de posición y de saldo, y de dónde sale cada variación.' },
    { icono: FileDownIcon, nombre: 'Reportes', texto: 'CSV de los entregables 2 a 5 y reportes personalizados.' },
    { icono: ShieldCheckIcon, nombre: 'Calidad de datos', texto: 'Cascada E1 a E4, filas excluidas con su motivo y alertas.' },
    { icono: ClipboardCheckIcon, nombre: 'Verificación del jurado', texto: 'Los 6 puntos de la sección 11.1 con sus chequeos.' },
  ]
  return (
    <Lamina>
      <EncabezadoLamina
        icono={LayoutDashboardIcon}
        etiqueta="La plataforma"
        fuerte={'Los cinco módulos de la lámina\u00A05,'}
        suave="más un modo para el jurado."
      />
      <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-5">
        {modulos.map(({ icono, nombre, texto }) => (
          <Tarjeta key={nombre} className="gap-4 p-7">
            <IconoCirculo icono={icono} />
            <h3 className="text-[28px] font-medium tracking-tight">{nombre}</h3>
            <p className="text-[20px] leading-snug text-muted-foreground">{texto}</p>
          </Tarjeta>
        ))}
      </div>
      <p className="text-xl text-muted-foreground">
        En todas las pantallas: fuente, período y el aviso de datos ficticios (lámina 9).
      </p>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 9. Perfiles
// ---------------------------------------------------------------------------------------------
export function Perfiles() {
  const perfiles = [
    { icono: GlobeIcon, nombre: 'Público', sub: 'Consulta · sin login', puntos: ['Rankings, filtros, gráficos y tablas', 'Descarga de los entregables 2 a 4', 'No ve Comparar ni la carga de períodos'] },
    { icono: UsersIcon, nombre: 'Analista', sub: 'Análisis · con login', puntos: ['Todo lo de Público', 'Compara períodos y entidades', 'Reportes personalizados y entregable 5'] },
    { icono: KeyRoundIcon, nombre: 'Administrador', sub: 'Control · con login', puntos: ['Todo lo de Analista', 'Carga o actualiza un período', 'Parámetros, catálogos y registro de operaciones'] },
  ]
  return (
    <Lamina>
      <EncabezadoLamina
        icono={UsersIcon}
        etiqueta="Perfiles"
        fuerte="Tres perfiles con opciones distintas"
        suave="en dos sitios: uno público y uno interno."
      />
      <div className="grid flex-1 grid-cols-3 gap-6">
        {perfiles.map(({ icono, nombre, sub, puntos }, i) => (
          <Tarjeta key={nombre} className="gap-5 p-8">
            <div className="flex items-center justify-between">
              <IconoCirculo icono={icono} />
              <span className="cifra text-lg text-muted-foreground">0{i + 1}</span>
            </div>
            <div>
              <h3 className="text-[32px] font-medium tracking-tight">{nombre}</h3>
              <p className="text-lg text-muted-foreground">{sub}</p>
            </div>
            <ul className="flex flex-col gap-3 text-[21px] leading-snug">
              {puntos.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <CheckCircle2Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-marca" />
                  {p}
                </li>
              ))}
            </ul>
          </Tarjeta>
        ))}
      </div>
      <p className="flex items-center gap-3 text-xl text-muted-foreground">
        <LockIcon aria-hidden="true" className="size-5 text-marca" />
        La UI oculta lo que no corresponde y el servidor responde 403. Sin contraseñas en el repo (R5).
      </p>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 10. Automatización
// ---------------------------------------------------------------------------------------------
export function Automatizacion({ datos }) {
  const { regla } = datos
  const pasos = [
    { icono: UploadIcon, titulo: 'Cargar', texto: 'El Administrador sube el AT03. El período sale del campo Fecha.' },
    { icono: RefreshCwIcon, titulo: 'Recalcular', texto: 'Cascada, rankings y reconciliaciones, al momento.' },
    { icono: GitCompareArrowsIcon, titulo: 'Comparar', texto: 'Contra el período anterior: Cambio_Posicion y Var_Saldo.' },
    { icono: TrendingUpIcon, titulo: 'Señalar', texto: 'Movimientos significativos según la regla vigente.' },
    { icono: MessageSquareTextIcon, titulo: 'Explicar', texto: 'Una frase por movimiento: por reglas, o con IA verificada.' },
    { icono: BellRingIcon, titulo: 'Avisar', texto: 'Correo a los suscriptores con Zapier.' },
  ]
  const criterios = regla
    ? [
        ['Cambio de posición', regla.min_cambio_posicion_abs == null ? 'apagado' : `|Δ| ≥ ${regla.min_cambio_posicion_abs}`],
        ['Cambio de líder', regla.cambio_lider ? 'sí' : 'no'],
        ['Variación de saldo', regla.min_var_saldo_pct_abs == null ? 'apagado' : `|Δ %| ≥ ${regla.min_var_saldo_pct_abs} %`],
      ]
    : []

  return (
    <Lamina>
      <EncabezadoLamina
        icono={RefreshCwIcon}
        etiqueta="Automatización"
        fuerte="Un período nuevo se procesa y se compara"
        suave="sin tocar el código."
      />
      <div className="grid flex-1 grid-cols-[1fr_400px] gap-6">
        <ol className="grid grid-cols-3 grid-rows-2 gap-4">
          {pasos.map(({ icono, titulo, texto }) => (
            <li key={titulo}>
              <Tarjeta className="h-full gap-3 p-6">
                <IconoCirculo icono={icono} />
                <h3 className="text-[26px] font-medium tracking-tight">{titulo}</h3>
                <p className="text-[19px] leading-snug text-muted-foreground">{texto}</p>
              </Tarjeta>
            </li>
          ))}
        </ol>
        <BloqueOscuro className="flex flex-col gap-6 p-8 sm:p-8">
          <Etiqueta icono={TrendingUpIcon}>Regla vigente · en vivo</Etiqueta>
          <h3 className="text-[28px] leading-tight font-medium">Movimiento significativo si cumple al menos uno:</h3>
          {criterios.length === 0 ? (
            <p className="text-lg text-bloque-muted">La regla llega de GET /api/parametros.</p>
          ) : (
            <dl className="flex flex-col gap-4">
              {criterios.map(([nombre, valor]) => (
                <div key={nombre} className="flex items-baseline justify-between gap-4 border-b border-bloque-foreground/15 pb-3">
                  <dt className="text-lg text-bloque-muted">{nombre}</dt>
                  <dd className="cifra text-2xl font-medium">{valor}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-auto text-base text-bloque-muted">El Administrador la cambia desde la app y se aplica sin reiniciar.</p>
        </BloqueOscuro>
      </div>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 11. IA
// ---------------------------------------------------------------------------------------------
export function Ia({ datos }) {
  const { ia } = datos
  const tarjetas = [
    { icono: BotIcon, titulo: 'Consulta', texto: 'Preguntas en lenguaje natural. El agente usa los endpoints del motor como herramientas.' },
    { icono: SparklesIcon, titulo: 'Explicación', texto: 'Cada movimiento tiene su frase por reglas. Si la IA cita un número que el motor no dio, se usa la de reglas.' },
    { icono: MousePointerClickIcon, titulo: 'Cursor guía', texto: 'Si preguntas cómo o dónde, un cursor recorre la app y señala cada elemento que tu perfil ve.' },
  ]
  return (
    <Lamina>
      <div className="flex items-start justify-between gap-6">
        <EncabezadoLamina
          icono={SparklesIcon}
          etiqueta="Inteligencia artificial"
          fuerte="La IA consulta, explica y guía."
          suave="Nunca calcula un ranking."
        />
        {ia && (
          <Badge variant={ia.ia_disponible ? 'sube' : 'igual'} size="pildora" className="mt-1 h-9 shrink-0 px-4 text-base">
            {ia.ia_disponible ? <CheckCircle2Icon aria-hidden="true" /> : <TriangleAlertIcon aria-hidden="true" />}
            {ia.ia_disponible ? 'IA disponible ahora' : 'IA no disponible: responde por reglas'}
          </Badge>
        )}
      </div>
      <div className="grid flex-1 grid-cols-3 gap-6">
        {tarjetas.map(({ icono, titulo, texto }) => (
          <Tarjeta key={titulo} className="gap-5 p-8">
            <IconoCirculo icono={icono} />
            <h3 className="text-[32px] font-medium tracking-tight">{titulo}</h3>
            <p className="text-[22px] leading-snug text-muted-foreground">{texto}</p>
          </Tarjeta>
        ))}
      </div>
      <p className="text-xl text-muted-foreground">
        Sin llave de IA la app funciona igual. También se conecta a Claude por MCP, de solo lectura.
      </p>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 12. Arquitectura
// ---------------------------------------------------------------------------------------------
function Caja({ icono: Icono, titulo, texto, className }) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-tarjeta bg-card p-5 shadow-tarjeta ring-1 ring-foreground/5 dark:shadow-none dark:ring-border', className)}>
      <span className="flex items-center gap-2 text-[21px] font-medium">
        {Icono && <Icono aria-hidden="true" className="size-5 text-marca" />}
        {titulo}
      </span>
      {texto && <span className="text-base leading-snug text-muted-foreground">{texto}</span>}
    </div>
  )
}

const Flecha = () => <ArrowRightIcon aria-hidden="true" className="size-8 shrink-0 self-center text-muted-foreground" />

export function Arquitectura() {
  return (
    <Lamina>
      <EncabezadoLamina
        icono={ServerIcon}
        etiqueta="Arquitectura"
        fuerte="Dos sitios, un server y un motor puro."
        suave="Todo corre en local con Docker."
      />
      <SeccionGris className="flex flex-1 items-stretch gap-4 p-8 sm:p-8">
        <div className="flex w-[200px] flex-col justify-center">
          <Caja icono={MonitorIcon} titulo="Navegador" texto="Celular o escritorio; se instala como app" />
        </div>
        <Flecha />
        <div className="flex w-[300px] flex-col justify-center gap-4">
          <Caja icono={GlobeIcon} titulo="Sitio público" texto="React + Vite en nginx. Sin login; solo una lista blanca del API." />
          <Caja icono={LockIcon} titulo="Sitio interno" texto="El mismo código, con login. Analista y Administrador." />
        </div>
        <Flecha />
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex flex-col gap-4 rounded-tarjeta bg-card p-6 shadow-tarjeta ring-1 ring-foreground/5 dark:shadow-none dark:ring-border">
            <span className="flex items-center gap-2 text-[22px] font-medium">
              <ServerIcon aria-hidden="true" className="size-5 text-marca" />
              Server Node.js + Express
            </span>
            <span className="text-base text-muted-foreground">API, sesión, perfiles (403), bitácora, carga de períodos, IA y MCP</span>
            <BloqueOscuro className="flex flex-col gap-2 rounded-tarjeta p-5 sm:p-5">
              <span className="flex items-center gap-2 text-xl font-medium">
                <CalculatorIcon aria-hidden="true" className="size-5 text-brillo" />
                Motor puro
              </span>
              <span className="text-base text-bloque-muted">E1–E4, CINU, SB21, rankings, ponderación y reconciliaciones. Sin disco ni red: se prueba con textos de CSV.</span>
            </BloqueOscuro>
          </div>
        </div>
        <Flecha />
        <div className="flex w-[260px] flex-col justify-center gap-3">
          <Caja icono={FileSpreadsheetIcon} titulo="data/" texto="AT03 y catálogos" />
          <Caja icono={DatabaseIcon} titulo="storage/" texto="Períodos, bitácora y parámetros" />
          <Caja icono={SparklesIcon} titulo="Claude · Zapier" texto="IA opcional y correo de alertas" />
        </div>
      </SeccionGris>
      <div className="flex flex-wrap gap-3">
        {['React 19 + Vite', 'Tailwind + shadcn/ui', 'Node.js + Express', 'Docker Compose', 'Dokploy', 'Contratos en /contracts'].map((t) => (
          <Badge key={t} variant="outline" size="pildora" className="h-9 px-4 text-base">
            {t}
          </Badge>
        ))}
      </div>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 13. Decisiones y calidad técnica
// ---------------------------------------------------------------------------------------------
export function Decisiones() {
  const filas = [
    { icono: CalculatorIcon, titulo: 'Motor puro, sin Express ni disco', texto: 'Determinista: los mismos CSV dan siempre el mismo ranking.' },
    { icono: ScaleIcon, titulo: 'Centavos enteros y BigInt', texto: 'Sumas exactas al centavo y ponderación sin errores de punto flotante.' },
    { icono: FlaskConicalIcon, titulo: 'Pruebas con node:test', texto: 'Con los CSV reales, incluida la autoverificación de la sección 12.' },
    { icono: CheckCircle2Icon, titulo: 'CI en cada PR', texto: 'Pruebas del server y del client, y el build de los dos sitios.' },
    { icono: FileSpreadsheetIcon, titulo: 'Contratos del API', texto: 'Cada ejemplo de /contracts se compara con la respuesta real.' },
    { icono: KeyRoundIcon, titulo: 'Sin secretos en el repo', texto: 'Llaves y usuarios en el .env; el repo solo trae .env.example (R5).' },
  ]
  return (
    <Lamina>
      <EncabezadoLamina
        icono={FlaskConicalIcon}
        etiqueta="Decisiones técnicas"
        fuerte="Resultados reproducibles"
        suave="y cálculos que se pueden verificar."
      />
      <div className="grid flex-1 grid-cols-2 grid-rows-3 gap-4">
        {filas.map(({ icono, titulo, texto }) => (
          <Tarjeta key={titulo} className="flex-row items-center gap-5 p-6">
            <IconoCirculo icono={icono} />
            <div className="flex flex-col gap-1">
              <h3 className="text-[24px] font-medium tracking-tight">{titulo}</h3>
              <p className="text-[19px] leading-snug text-muted-foreground">{texto}</p>
            </div>
          </Tarjeta>
        ))}
      </div>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 14. Cierre
// ---------------------------------------------------------------------------------------------
export function Cierre() {
  return (
    <div className="h-full p-6 pb-0">
      <BloqueOscuro className="flex h-full flex-col justify-between p-16 sm:p-16">
        <div className="flex items-center gap-4">
          <img src="/marca/logo.svg" alt="" className="size-14" />
          <Etiqueta icono={RadarIcon} className="h-8 px-4 text-sm">
            Demo en vivo
          </Etiqueta>
        </div>
        <div className="flex flex-col gap-8">
          <h2 className="max-w-[1150px] text-[84px] leading-[1.02] font-medium tracking-tight text-balance text-bloque-foreground">
            Rankings confiables para decisiones mejor informadas.
          </h2>
          <div className="flex flex-wrap gap-4">
            <Link to="/" data-slot="button" className={buttonVariants({ variant: 'claro', size: 'pildora', className: 'h-14 px-7 text-lg' })}>
              Abrir la app
              <ArrowRightIcon aria-hidden="true" />
            </Link>
            <Link to="/rankings" data-slot="button" className={buttonVariants({ variant: 'borde-claro', size: 'pildora', className: 'h-14 border-bloque-foreground/40 px-7 text-lg' })}>
              Ver rankings
            </Link>
            <Link to="/verificacion" data-slot="button" className={buttonVariants({ variant: 'borde-claro', size: 'pildora', className: 'h-14 border-bloque-foreground/40 px-7 text-lg' })}>
              Verificación del jurado
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-xl">
          <p className="flex flex-col gap-1">
            <span className="text-bloque-muted">Sitio público</span>
            <span className="font-medium text-bloque-foreground">sbp.juank.tech</span>
          </p>
          <p className="flex flex-col gap-1">
            <span className="text-bloque-muted">Sitio interno · Analista y Administrador</span>
            <span className="font-medium text-bloque-foreground">interno.sbp.juank.tech</span>
          </p>
        </div>
      </BloqueOscuro>
    </div>
  )
}
