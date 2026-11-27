import { useState } from 'react'
import { CreditCardIcon, FileDownIcon, CarIcon, HouseIcon, WalletIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { productos as pedirProductos, urlInformePdf } from '@/api/cliente.js'
import { TarjetaGrafico } from '@/components/landing/TarjetaGrafico.jsx'
import { montoCompacto } from '@/components/landing/formatoLanding.js'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { buttonVariants } from '@/components/ui/button'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConsulta } from '@/hooks/useConsulta.js'
import { alPeriodo, formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import {
  apiladoPorBanco,
  barrasDeCartera,
  barrasDeProducto,
  buscarProducto,
  claveProducto,
  DESTACADOS,
  evolucionDeProducto,
  opcionesProducto,
  PRODUCTO_INICIAL,
} from './datosProductos.js'

const ICONOS = { tarjetas: CreditCardIcon, automovil: CarIcon, vivienda: HouseIcon }
const COLORES = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)']
const esFecha = (valor) => /^\d{8}$/.test(String(valor ?? ''))

// Saldo y productos de crédito del corte (#200): tarjetas de indicadores, un producto por banco
// (tarjetas de crédito al abrir), el saldo de cada banco y CONSUMO por producto, de GET /api/productos.
// Va en el Panel público y en el interno. `fechas` (solo Analista y Administrador) agrega la evolución
// por corte: el Público no compara períodos. Ninguna cifra se calcula aquí (R2).
export function ProductosCredito({ periodo, fechas = [] }) {
  const consulta = useConsulta((o) => pedirProductos({ periodo }, o), [periodo], { activa: Boolean(periodo) })
  const datos = consulta.datos
  const [elegido, setElegido] = useState(PRODUCTO_INICIAL)
  const producto = buscarProducto(datos, elegido) ?? buscarProducto(datos, PRODUCTO_INICIAL) ?? datos?.productos?.[0] ?? null
  const clave = producto ? claveProducto(producto) : elegido
  const sinDatos = !datos?.productos?.length

  return (
    <div className="flex min-w-0 flex-col gap-4" data-guia="panel.productos">
      <TarjetaGrafico
        id="titulo-productos"
        fuerte="Saldo y productos de crédito"
        suave={alPeriodo(periodo)}
        accion={<BotonInforme periodo={periodo} />}
        pie="Saldos del universo local válido. Tarjetas incluye los créditos personales con facilidad 07 (regla SB21)."
      >
        <EstadoBloque consulta={consulta} filas={2} vacio={sinDatos} tituloVacio="Sin productos en este período">
          <TarjetasIndicadores datos={datos} />
        </EstadoBloque>
      </TarjetaGrafico>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <TarjetaGrafico
          id="titulo-producto-bancos"
          fuerte={producto ? producto.Subactividad : 'Producto'}
          suave={producto ? `por banco · ${producto.Ranking}` : 'por banco'}
          accion={<SelectorProducto datos={datos} valor={clave} alCambiar={setElegido} />}
          pie="De mayor a menor saldo. Elige otro producto en el selector."
        >
          <EstadoBloque consulta={consulta} alto={340} vacio={sinDatos}>
            <BarrasHorizontales filas={barrasDeProducto(producto)} color="var(--chart-1)" etiqueta={producto?.Subactividad ?? 'Saldo'} />
          </EstadoBloque>
        </TarjetaGrafico>

        <TarjetaGrafico id="titulo-saldo-bancos" fuerte="Saldo total" suave="por banco" pie="Cartera local válida de cada banco: la suma de sus 6 actividades.">
          <EstadoBloque consulta={consulta} alto={340} vacio={!datos?.bancos?.length}>
            <BarrasHorizontales filas={barrasDeCartera(datos)} color="var(--chart-3)" etiqueta="Saldo total" />
          </EstadoBloque>
        </TarjetaGrafico>
      </div>

      <TarjetaGrafico id="titulo-consumo-bancos" fuerte="Consumo" suave="por producto y banco" pie="Crédito personal, automóvil y tarjetas de cada banco, ya con la regla SB21.">
        <EstadoBloque consulta={consulta} alto={300} vacio={sinDatos}>
          <BarrasApiladas datos={datos} ranking="CONSUMO" />
        </EstadoBloque>
      </TarjetaGrafico>

      {fechas.length > 1 && producto && <EvolucionProducto fechas={fechas} clave={clave} nombre={producto.Subactividad} />}
    </div>
  )
}

// Descarga directa del informe PDF del período (#200). Con "Todos los períodos" usa el último corte.
function BotonInforme({ periodo }) {
  return (
    <a
      href={urlInformePdf(esFecha(periodo) ? { periodo } : {})}
      download
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
      title={esFecha(periodo) ? `Informe PDF de ${formatearPeriodo(periodo)}` : 'Informe PDF del último corte'}
    >
      <FileDownIcon aria-hidden="true" />
      Informe PDF
    </a>
  )
}

// Tarjetas: saldo total válido y los productos destacados (tarjetas, automóvil, vivienda propia).
function TarjetasIndicadores({ datos }) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador
        icono={WalletIcon}
        titulo="Saldo total válido"
        valor={formatearMonto(datos?.Saldo_Total_Valido)}
        detalle={`${formatearEntero(datos?.Universo_Local_Valido)} préstamos válidos`}
      />
      {DESTACADOS.map((d) => {
        const p = buscarProducto(datos, claveProducto(d))
        if (!p) return null
        const detalles = [`${formatearPorcentaje(p.Pct_Del_Ranking)} de ${p.Ranking}`]
        if (typeof p.Operaciones === 'number') detalles.push(`${formatearEntero(p.Operaciones)} operaciones`)
        if (d.clave === 'tarjetas' && typeof datos?.Reclasificadas_Tarjeta === 'number') {
          detalles.push(`${formatearEntero(datos.Reclasificadas_Tarjeta)} reclasificadas por SB21`)
        }
        return (
          <Indicador
            key={d.clave}
            icono={ICONOS[d.clave]}
            titulo={d.titulo}
            valor={formatearMonto(p.Saldo)}
            detalle={detalles.join(' · ')}
            lider={p.Lider ? `Líder: ${p.Lider.Banco}` : null}
          />
        )
      })}
    </div>
  )
}

function Indicador({ icono: Icono, titulo, valor, detalle, lider }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/30 p-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icono && <Icono className="size-3.5" aria-hidden="true" />}
        {titulo}
      </span>
      <span className="cifra truncate text-lg font-semibold tracking-tight">{valor}</span>
      <span className="text-xs text-muted-foreground">{detalle}</span>
      {lider && <span className="truncate text-xs font-medium">{lider}</span>}
    </div>
  )
}

function SelectorProducto({ datos, valor, alCambiar }) {
  const opciones = opcionesProducto(datos)
  if (opciones.length === 0) return null
  return (
    <Select value={valor} onValueChange={alCambiar}>
      <SelectTrigger aria-label="Producto de crédito" size="sm" className="max-w-56 min-w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Barras horizontales de los 12 bancos (saldo), con el monto exacto y las operaciones en el tooltip.
function BarrasHorizontales({ filas, color, etiqueta }) {
  const config = { saldo: { label: etiqueta, color } }
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(220, filas.length * 26 + 40) }}>
      <BarChart data={filas} layout="vertical" margin={{ left: 0, right: 12 }} barCategoryGap={5}>
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={montoCompacto} />
        <YAxis type="category" dataKey="nombre" width={130} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.15 }}
          content={
            <ChartTooltipContent
              formatter={(v, _n, item) => (
                <div className="flex flex-col gap-0.5">
                  <span className="cifra font-medium">{formatearMonto(v)}</span>
                  {typeof item?.payload?.operaciones === 'number' && (
                    <span className="cifra text-muted-foreground">{formatearEntero(item.payload.operaciones)} operaciones</span>
                  )}
                </div>
              )}
            />
          }
        />
        <Bar dataKey="saldo" fill="var(--color-saldo)" fillOpacity={0.85} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

// Barras apiladas de un ranking: un color por producto, una barra por banco.
function BarrasApiladas({ datos, ranking }) {
  const { filas: porBanco, series } = apiladoPorBanco(datos, ranking)
  // Claves sin espacios (s0, s1…) para las variables de color del gráfico; el nombre va en `label`.
  const claves = series.map((_, i) => `s${i}`)
  const config = Object.fromEntries(series.map((s, i) => [claves[i], { label: s, color: COLORES[i % COLORES.length] }]))
  const filas = porBanco.map((f) => ({ codigo: f.codigo, nombre: f.nombre, ...Object.fromEntries(series.map((s, i) => [claves[i], f[s] ?? 0])) }))
  return (
    <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
      <BarChart data={filas} margin={{ left: 0, right: 8 }} barCategoryGap={8}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="codigo" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={montoCompacto} width={60} tick={{ fontSize: 11 }} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.15 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_l, carga) => carga?.[0]?.payload?.nombre}
              formatter={(v, clave) => <span className="cifra">{config[clave]?.label}: {formatearMonto(v)}</span>}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {claves.map((clave, i) => (
          <Bar key={clave} dataKey={clave} stackId="producto" fill={`var(--color-${clave})`} radius={i === claves.length - 1 ? [4, 4, 0, 0] : 0} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

// Analista y Administrador: saldo del producto elegido en cada corte (un GET /api/productos por corte).
function EvolucionProducto({ fechas, clave, nombre }) {
  const consulta = useConsulta(
    (o) => Promise.all(fechas.map((fecha) => pedirProductos({ periodo: fecha }, o))),
    [fechas.join(',')],
    { activa: fechas.length > 0 },
  )
  const filas = evolucionDeProducto(consulta.datos, clave).map((f) => ({ ...f, corte: formatearPeriodo(f.periodo) }))
  const config = { saldo: { label: nombre, color: 'var(--chart-1)' } }

  return (
    <TarjetaGrafico id="titulo-evolucion-producto" fuerte={nombre} suave="corte a corte" pie="Saldo del producto elegido en cada corte cargado (Analista y Administrador).">
      <EstadoBloque consulta={consulta} alto={220} vacio={filas.length === 0}>
        <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
          <LineChart data={filas} margin={{ left: 0, right: 16, top: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="corte" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={montoCompacto} width={60} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="cifra font-medium">{formatearMonto(v)}</span>} />} />
            <Line dataKey="saldo" type="monotone" stroke="var(--color-saldo)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ChartContainer>
      </EstadoBloque>
    </TarjetaGrafico>
  )
}
