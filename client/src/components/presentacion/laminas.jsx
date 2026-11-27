// Láminas de la presentación web (/presentacion). La historia va por roles y con poco lenguaje
// técnico: el problema de cada persona (Público, Analista, Administrador), lo que la app le da a
// cada una y por qué confiar en los números. Lo técnico queda en un anexo, para las preguntas del
// jurado. Ninguna cifra se escribe aquí (R2): todas llegan en `datos` (useDatosPresentacion), y
// mientras no llegan se ve "—".
import { Link } from 'react-router'
import {
  ArrowRightIcon,
  BellRingIcon,
  BotIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  CrownIcon,
  DatabaseIcon,
  FileDownIcon,
  FileSpreadsheetIcon,
  FilterIcon,
  FlaskConicalIcon,
  GlobeIcon,
  KeyRoundIcon,
  ListOrderedIcon,
  LockIcon,
  MessageSquareTextIcon,
  MonitorIcon,
  MousePointerClickIcon,
  RadarIcon,
  ScaleIcon,
  SearchIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagsIcon,
  TriangleAlertIcon,
  UploadIcon,
  UsersIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { BloqueOscuro, Etiqueta, SeccionGris } from '@/components/marca'
import { formatearEntero, formatearPeriodo } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { EncabezadoLamina, IconoCirculo, Lamina, SinDatos, Tarjeta } from './piezas.jsx'

// '20260930' -> 'sep 2026' (sin el día: en la lámina se habla del mes).
const mesDe = (fecha) => formatearPeriodo(fecha).replace(/^\d+\s/, '')


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
              Qué bancos prestan más en cada sector de la economía y cómo cambia mes a mes. Para el público, el analista y el administrador.
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
// 2. El problema, contado por las tres personas que usan la información
// ---------------------------------------------------------------------------------------------
export function Problema({ datos }) {
  const c = datos.calidadUltimo
  const conErrores = c && MOTIVOS.every(({ campo }) => typeof c[campo] === 'number') ? MOTIVOS.reduce((t, { campo }) => t + c[campo], 0) : null
  const personas = [
    {
      icono: GlobeIcon,
      rol: 'Público',
      pregunta: '¿Qué banco presta más para vivienda?',
      hoy: ['Busca en archivos Excel y PDF', 'No puede filtrar ni comparar a su gusto'],
    },
    {
      icono: UsersIcon,
      rol: 'Analista',
      pregunta: '¿Qué cambió de agosto a septiembre?',
      hoy: ['Cruza hojas a mano durante horas', 'Entender el porqué de cada cambio es otro trabajo'],
    },
    {
      icono: KeyRoundIcon,
      rol: 'Administrador',
      pregunta: '¿Cómo publico el mes sin errores?',
      hoy: [
        'Prepara cada corte a mano',
        conErrores != null
          ? `El archivo trae errores: ${formatearEntero(conErrores)} filas con problemas en el último corte`
          : 'El archivo trae errores: préstamos repetidos, saldos en cero, sectores que no existen',
      ],
    },
  ]

  return (
    <Lamina>
      <EncabezadoLamina
        icono={TriangleAlertIcon}
        etiqueta="El problema"
        fuerte="La información de crédito existe,"
        suave="pero llegar a ella cuesta."
      />
      <div className="grid flex-1 grid-cols-3 gap-6">
        {personas.map(({ icono, rol, pregunta, hoy }) => (
          <Tarjeta key={rol} className="gap-6 p-8">
            <div className="flex items-center gap-4">
              <IconoCirculo icono={icono} />
              <span className="text-xl font-medium text-muted-foreground">{rol}</span>
            </div>
            <p className="text-[32px] leading-tight font-medium tracking-tight">“{pregunta}”</p>
            <div className="mt-auto flex flex-col gap-3">
              <span className="text-base font-medium tracking-wide text-muted-foreground uppercase">Hoy</span>
              <ul className="flex flex-col gap-3 text-[21px] leading-snug">
                {hoy.map((texto) => (
                  <li key={texto} className="flex items-start gap-3">
                    <span aria-hidden="true" className="mt-2.5 size-2.5 shrink-0 rounded-full bg-baja" />
                    {texto}
                  </li>
                ))}
              </ul>
            </div>
          </Tarjeta>
        ))}
      </div>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 3. La propuesta: una app, tres roles
// ---------------------------------------------------------------------------------------------
export function Propuesta() {
  const roles = [
    { icono: GlobeIcon, rol: 'Público', acceso: 'Sin cuenta', texto: 'Consulta, explora, pregunta y descarga.' },
    { icono: UsersIcon, rol: 'Analista', acceso: 'Con usuario', texto: 'Todo lo del público, más comparar meses y bancos y armar reportes a la medida.' },
    { icono: KeyRoundIcon, rol: 'Administrador', acceso: 'Con usuario', texto: 'Todo lo anterior, más cargar el mes, decidir las reglas y quién entra.' },
  ]
  return (
    <Lamina>
      <EncabezadoLamina
        icono={RadarIcon}
        etiqueta="La propuesta"
        fuerte="Una sola app,"
        suave="y cada persona ve lo que necesita."
      />
      <div className="grid flex-1 grid-cols-3 gap-6">
        {roles.map(({ icono, rol, acceso, texto }, i) => (
          <Tarjeta key={rol} className="gap-8 p-8">
            <div className="flex items-center justify-between">
              <IconoCirculo icono={icono} />
              <Badge variant="outline" size="pildora" className="h-8 px-3 text-base">
                {acceso}
              </Badge>
            </div>
            <div className="flex flex-col gap-3">
              <span className="cifra text-lg text-muted-foreground">0{i + 1}</span>
              <h3 className="text-[40px] font-medium tracking-tight">{rol}</h3>
              <p className="text-[23px] leading-snug text-muted-foreground">{texto}</p>
            </div>
          </Tarjeta>
        ))}
      </div>
      <BloqueOscuro className="flex items-center gap-5 px-8 py-6 sm:px-8 sm:py-6">
        <ShieldCheckIcon aria-hidden="true" className="size-8 shrink-0 text-brillo" />
        <p className="text-[24px] leading-snug text-bloque-foreground">
          Para todos, lo mismo: cada número sale del archivo del mes y se puede comprobar.
        </p>
      </BloqueOscuro>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// Lámina de un rol: quién es y su pregunta a la izquierda, lo que la app le da a la derecha.
// ---------------------------------------------------------------------------------------------
function LaminaRol({ icono, etiqueta, fuerte, suave, quien, pregunta, funciones, pie }) {
  return (
    <Lamina className="gap-8">
      <EncabezadoLamina icono={icono} etiqueta={etiqueta} fuerte={fuerte} suave={suave} />
      <div className="grid flex-1 grid-cols-[340px_1fr] gap-6">
        <BloqueOscuro className="flex flex-col justify-between gap-6 p-8 sm:p-8">
          <div className="flex flex-col gap-2">
            <span className="text-base text-bloque-muted">Para quién</span>
            <p className="text-[24px] leading-snug font-medium text-bloque-foreground">{quien}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-base text-bloque-muted">Su pregunta</span>
            <p className="text-[30px] leading-tight font-medium text-bloque-foreground">“{pregunta}”</p>
          </div>
        </BloqueOscuro>
        <ul className="grid grid-cols-3 grid-rows-2 gap-4">
          {funciones.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo}>
              <Tarjeta className="h-full gap-3 p-6">
                <IconoCirculo icono={Icono} />
                <h3 className="text-[25px] leading-tight font-medium tracking-tight">{titulo}</h3>
                <p className="text-[19px] leading-snug text-muted-foreground">{texto}</p>
              </Tarjeta>
            </li>
          ))}
        </ul>
      </div>
      {pie && <p className="text-xl text-muted-foreground">{pie}</p>}
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 4. Público
// ---------------------------------------------------------------------------------------------
export function RolPublico() {
  return (
    <LaminaRol
      icono={GlobeIcon}
      etiqueta="Público · sin cuenta"
      fuerte="Consultar sin saber nada técnico."
      suave="Si sabes hacer una pregunta, sabes usar la app."
      quien="Un ciudadano, un periodista, un estudiante."
      pregunta="¿Qué banco presta más para vivienda?"
      funciones={[
        { icono: CrownIcon, titulo: 'Ver quién lidera', texto: 'Seis rankings por sector, siempre con los doce bancos.' },
        { icono: FilterIcon, titulo: 'Filtrar y explorar', texto: 'Por mes, banco y sector. Un clic en el gráfico filtra y la tabla se ordena.' },
        { icono: MessageSquareTextIcon, titulo: 'Preguntar en español', texto: 'El asistente responde con los datos y deja la pantalla lista.' },
        { icono: MousePointerClickIcon, titulo: 'Te enseña dónde', texto: 'Si preguntas “¿cómo…?”, un cursor recorre la app y señala dónde tocar.' },
        { icono: FileDownIcon, titulo: 'Descargar', texto: 'Rankings, sectores y calidad de los datos, en CSV.' },
        { icono: BellRingIcon, titulo: 'Alertas por correo', texto: 'Se suscribe a los bancos y sectores que le interesan.' },
      ]}
      pie="Funciona en el celular y se instala como app. Cada pantalla dice la fuente, el período y que los datos son ficticios."
    />
  )
}

// ---------------------------------------------------------------------------------------------
// 5. Lo que nos diferencia
// ---------------------------------------------------------------------------------------------
export function Diferencia() {
  const puntos = [
    { icono: SparklesIcon, titulo: 'IA que no inventa', texto: 'Si la IA cita un número que el motor no dio, se descarta y queda la explicación por reglas.' },
    { icono: SearchIcon, titulo: 'Explica por qué cambió', texto: 'Cada movimiento trae su frase, y el saldo se separa en préstamos nuevos, salidas y pagos.' },
    { icono: MousePointerClickIcon, titulo: 'Te enseña a usarla', texto: 'Preguntas “¿cómo…?” y un cursor recorre la app señalando dónde tocar.' },
    { icono: UploadIcon, titulo: 'El mes nuevo, en segundos', texto: 'Se sube el archivo, todo se recalcula y los suscriptores reciben el aviso por correo.' },
    { icono: ShieldCheckIcon, titulo: 'Funciona sin IA', texto: 'Sin llave de IA la app responde igual, por reglas. Nada depende de un tercero.' },
    { icono: BotIcon, titulo: 'Conectada a Claude', texto: 'Se consulta desde Claude por MCP, de solo lectura y con el perfil que corresponde.' },
  ]
  return (
    <Lamina>
      <EncabezadoLamina
        icono={RadarIcon}
        etiqueta="Lo que nos diferencia"
        fuerte="No es otro tablero de rankings."
        suave="Explica, enseña y se comprueba."
      />
      <ul className="grid flex-1 grid-cols-3 grid-rows-2 gap-5">
        {puntos.map(({ icono, titulo, texto }) => (
          <li key={titulo}>
            <Tarjeta className="h-full gap-4 p-7">
              <IconoCirculo icono={icono} />
              <h3 className="text-[28px] leading-tight font-medium tracking-tight">{titulo}</h3>
              <p className="text-[20px] leading-snug text-muted-foreground">{texto}</p>
            </Tarjeta>
          </li>
        ))}
      </ul>
      <BloqueOscuro className="flex items-center gap-5 px-8 py-6 sm:px-8 sm:py-6">
        <CheckCircle2Icon aria-hidden="true" className="size-8 shrink-0 text-brillo" />
        <p className="text-[24px] leading-snug text-bloque-foreground">
          Lo que antes eran horas cruzando hojas, ahora es un clic, con la explicación incluida.
        </p>
      </BloqueOscuro>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// 6. Por qué confiar en los números (lo técnico, en palabras simples)
// ---------------------------------------------------------------------------------------------
const MOTIVOS = [
  { campo: 'E1_Duplicados', nombre: 'Repetidas', color: 'bg-chart-3' },
  { campo: 'E2_Destino_Extranjero', nombre: 'Del extranjero', color: 'bg-chart-2' },
  { campo: 'E3_Saldo_No_Positivo', nombre: 'Saldo en cero o negativo', color: 'bg-chart-4' },
  { campo: 'E4_Actividad_No_Catalogada', nombre: 'Sector que no existe', color: 'bg-chart-5' },
]

export function Confianza({ datos }) {
  const { periodos } = datos
  const c = datos.calidadUltimo
  const leidas = c?.Filas_Leidas
  const reconciliado = periodos.length > 0 && periodos.every((p) => p.Reconciliaciones_OK === true)
  const razones = [
    'Ningún número está escrito a mano: todo sale del archivo del mes.',
    'Cada fila que se quita tiene su motivo, y se puede revisar.',
    reconciliado
      ? `Todo cuadra al centavo, en los ${formatearEntero(periodos.length)} meses cargados.`
      : 'Todo se cuadra al centavo, mes por mes.',
    'La IA ayuda a preguntar y a explicar. Nunca calcula un ranking.',
    'Un botón, “Verificación del jurado”, reúne todo en una pantalla.',
  ]

  return (
    <Lamina>
      <EncabezadoLamina
        icono={ShieldCheckIcon}
        etiqueta="Confianza"
        fuerte="¿Por qué confiar en los números?"
        suave="Porque cualquiera los puede comprobar."
      />
      <div className="grid flex-1 grid-cols-[1fr_620px] gap-6">
        <SeccionGris className="flex flex-col gap-6 p-8 sm:p-8">
          {!c ? (
            <SinDatos cargando={datos.cargando && !datos.sinApi} />
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-lg text-muted-foreground">Archivo de {formatearPeriodo(c.Fecha)}</span>
                <span className="cifra text-[44px] leading-none font-medium tracking-tight">
                  {formatearEntero(leidas)} <span className="text-2xl font-normal text-muted-foreground">filas</span>
                </span>
              </div>
              <div className="flex h-10 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Filas válidas y filas quitadas por cada motivo">
                <div className="h-full bg-chart-1" style={{ width: `${(c.Universo_Local_Valido / leidas) * 100}%` }} />
                {MOTIVOS.map(({ campo, color }) => (
                  <div key={campo} className={cn('h-full', color)} style={{ width: `${(c[campo] / leidas) * 100}%`, minWidth: c[campo] > 0 ? 6 : 0 }} />
                ))}
              </div>
              <ul className="flex flex-col gap-3">
                <li className="flex items-center justify-between gap-4 rounded-tarjeta bg-accent px-5 py-3">
                  <span className="flex items-center gap-3 text-[21px] font-medium">
                    <span aria-hidden="true" className="size-3 rounded-full bg-chart-1" />
                    Válidas: entran al ranking
                  </span>
                  <span className="cifra text-[24px] font-medium">{formatearEntero(c.Universo_Local_Valido)}</span>
                </li>
                {MOTIVOS.map(({ campo, nombre, color }) => (
                  <li key={campo} className="flex items-center justify-between gap-4 rounded-tarjeta bg-card px-5 py-3 shadow-tarjeta dark:shadow-none">
                    <span className="flex items-center gap-3 text-[20px]">
                      <span aria-hidden="true" className={cn('size-3 rounded-full', color)} />
                      Quitadas · {nombre}
                    </span>
                    <span className="cifra text-[22px] font-medium">{formatearEntero(c[campo])}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SeccionGris>
        <ul className="flex flex-col justify-center gap-4">
          {razones.map((texto) => (
            <li key={texto} className="flex items-start gap-4 text-[24px] leading-snug">
              <CheckCircle2Icon aria-hidden="true" className="mt-1 size-7 shrink-0 text-sube" />
              {texto}
            </li>
          ))}
        </ul>
      </div>
    </Lamina>
  )
}

// ---------------------------------------------------------------------------------------------
// Anexo técnico: separador. Lo que sigue se muestra solo si el jurado pregunta.
// ---------------------------------------------------------------------------------------------
export function Anexo() {
  const temas = ['Del archivo al ranking', 'Cómo se limpia el archivo', 'Arquitectura', 'Decisiones técnicas']
  return (
    <div className="h-full p-6 pb-0">
      <BloqueOscuro className="flex h-full flex-col justify-between p-16 sm:p-16">
        <Etiqueta icono={CalculatorIcon} className="h-8 self-start px-4 text-sm">
          Anexo técnico
        </Etiqueta>
        <div className="flex flex-col gap-10">
          <h2 className="text-[84px] leading-[1.02] font-medium tracking-tight text-bloque-foreground">Cómo funciona por dentro</h2>
          <ol className="grid grid-cols-2 gap-x-12 gap-y-4 text-[28px] text-bloque-muted">
            {temas.map((t, i) => (
              <li key={t} className="flex items-baseline gap-4">
                <span className="cifra text-xl text-brillo">0{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xl text-bloque-muted">Para las preguntas del jurado.</p>
      </BloqueOscuro>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Anexo 2. Cascada E1 a E4
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
        etiqueta="Anexo · cascada E1 a E4"
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
// Anexo 1. Del archivo al ranking
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
        etiqueta="Anexo · del archivo al ranking"
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
// Anexo 3. Arquitectura
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
        etiqueta="Anexo · arquitectura"
        fuerte="Un client, un server y un motor puro."
        suave="Todo corre en local con Docker."
      />
      <SeccionGris className="flex flex-1 items-stretch gap-4 p-8 sm:p-8">
        <div className="flex w-[200px] flex-col justify-center">
          <Caja icono={MonitorIcon} titulo="Navegador" texto="Celular o escritorio; se instala como app" />
        </div>
        <Flecha />
        <div className="flex w-[300px] flex-col justify-center gap-4">
          <Caja icono={GlobeIcon} titulo="Client web" texto="React + Vite en nginx. Funciona como app instalable (PWA)." />
          <Caja icono={LockIcon} titulo="Por perfil" texto="Cada perfil ve solo sus opciones; el API responde 403 al resto." />
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
// Anexo 4. Decisiones y calidad técnica
// ---------------------------------------------------------------------------------------------
export function Decisiones() {
  const filas = [
    { icono: CalculatorIcon, titulo: 'Motor puro, sin Express ni disco', texto: 'Determinista: los mismos CSV dan siempre el mismo ranking.' },
    { icono: ScaleIcon, titulo: 'Centavos enteros y BigInt', texto: 'Sumas exactas al centavo y ponderación sin errores de punto flotante.' },
    { icono: FlaskConicalIcon, titulo: 'Pruebas con node:test', texto: 'Con los CSV reales, incluida la autoverificación de la sección 12.' },
    { icono: CheckCircle2Icon, titulo: 'CI en cada PR', texto: 'Pruebas del server y del client, y el build en cada cambio.' },
    { icono: FileSpreadsheetIcon, titulo: 'Contratos del API', texto: 'Cada ejemplo de /contracts se compara con la respuesta real.' },
    { icono: KeyRoundIcon, titulo: 'Sin secretos en el repo', texto: 'Llaves y usuarios en el .env; el repo solo trae .env.example (R5).' },
  ]
  return (
    <Lamina>
      <EncabezadoLamina
        icono={FlaskConicalIcon}
        etiqueta="Anexo · decisiones técnicas"
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
// 7. Cierre
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
            Una app, tres personas y la misma información confiable.
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
        <p className="flex flex-col gap-1 text-xl">
          <span className="text-bloque-muted">Consulta pública</span>
          <span className="font-medium text-bloque-foreground">sbp.juank.tech</span>
        </p>
      </BloqueOscuro>
    </div>
  )
}
