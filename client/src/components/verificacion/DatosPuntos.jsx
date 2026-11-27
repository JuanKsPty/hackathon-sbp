import { useState } from 'react'
import { InfoIcon } from 'lucide-react'
import { EstadoControl } from '@/components/calidad/EstadoControl.jsx'
import { MOTIVOS } from '@/components/calidad/motivos.js'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'

// El dato que devuelve GET /api/verificacion para cada punto. Aquí solo se muestra y se da formato:
// ninguna cifra se calcula ni se escribe en el código (R2).

// La regla SB21 (sección 6) solo mueve saldo dentro de CONSUMO: Crédito personal con facilidad 07 → Tarjeta.
const SUBACTIVIDAD_SB21 = 'Tarjeta'
// En las tablas con un banco por fila, la columna del banco se queda fija al desplazar de lado (celular).
// En celular el nombre se parte en líneas para dejar lugar a las cifras.
const BANCO_FIJO = 'sticky left-0 z-10 bg-card max-w-36 whitespace-normal sm:max-w-none sm:whitespace-nowrap'

function SinDatos() {
  return <Vacio titulo="Sin datos" descripcion="No hay datos para los filtros elegidos." />
}

function CeldaBanco({ banco, codigo }) {
  return (
    <>
      <div className="font-medium">{banco}</div>
      <div className="text-xs text-muted-foreground">{codigo}</div>
    </>
  )
}

// Encabezado con una versión corta para celular.
function Rotulo({ corto, largo }) {
  return (
    <>
      <span className="sm:hidden" aria-hidden="true">{corto}</span>
      <span className="sr-only sm:not-sr-only">{largo}</span>
    </>
  )
}

// Punto 1: conteos E1–E4 y universo local válido de cada período.
export function DatosCalidad({ datos, periodo }) {
  const filas = datos.periodos ?? []
  if (filas.length === 0) return <SinDatos />
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Período</TableHead>
          <TableHead className="text-right">Filas leídas</TableHead>
          {MOTIVOS.map((m) => (
            <TableHead key={m.codigo} className="text-right" title={m.nombre}>
              {m.codigo} · {m.nombre}
            </TableHead>
          ))}
          <TableHead className="text-right">Universo local válido</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((p) => (
          <TableRow key={p.Fecha} data-state={p.Fecha === periodo ? 'selected' : undefined}>
            <TableCell className="font-medium">{formatearPeriodo(p.Fecha)}</TableCell>
            <TableCell className="text-right">{formatearEntero(p.Filas_Leidas)}</TableCell>
            {MOTIVOS.map((m) => (
              <TableCell key={m.codigo} className="text-right">
                {formatearEntero(p[m.campo])}
              </TableCell>
            ))}
            <TableCell className="text-right font-medium">{formatearEntero(p.Universo_Local_Valido)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Puntos 2 y 3: posición y saldo de cada banco en sus rankings. Con todos los bancos, una pestaña
// por ranking; con un banco, una fila por ranking (su posición real en cada uno).
export function DatosRankings({ datos, banco }) {
  const rankings = datos.rankings ?? []
  const [elegido, setElegido] = useState(null)
  const valor = rankings.some((r) => r.Ranking === elegido) ? elegido : rankings[0]?.Ranking

  if (rankings.length === 0 || rankings.every((r) => r.bancos.length === 0)) return <SinDatos />

  if (banco) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ranking</TableHead>
            <TableHead className="text-right"><Rotulo corto="Pos." largo="Posición" /></TableHead>
            <TableHead className="text-right"><Rotulo corto="Saldo" largo="Saldo de la actividad" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.flatMap((r) =>
            r.bancos.map((b) => (
              <TableRow key={`${r.Ranking}|${b.Codigo_Banco}`}>
                <TableCell className="font-medium">{r.Ranking}</TableCell>
                <TableCell className="text-right font-semibold">{formatearEntero(b.Posicion)}</TableCell>
                <TableCell className="text-right">{formatearMonto(b.Saldo_Actividad)}</TableCell>
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    )
  }

  return (
    <Tabs value={valor} onValueChange={setElegido}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList aria-label="Ranking">
          {rankings.map((r) => (
            <TabsTrigger key={r.Ranking} value={r.Ranking} className="px-3">
              {r.Ranking}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {rankings.map((r) => (
        <TabsContent key={r.Ranking} value={r.Ranking}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Rotulo corto="Pos." largo="Posición" /></TableHead>
                <TableHead>Banco</TableHead>
                <TableHead className="text-right"><Rotulo corto="Saldo" largo="Saldo de la actividad" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.bancos.map((b) => (
                <TableRow key={b.Codigo_Banco}>
                  <TableCell className="font-semibold">{formatearEntero(b.Posicion)}</TableCell>
                  <TableCell className="whitespace-normal sm:whitespace-nowrap">
                    <CeldaBanco banco={b.Banco} codigo={b.Codigo_Banco} />
                  </TableCell>
                  <TableCell className="text-right">{formatearMonto(b.Saldo_Actividad)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      ))}
    </Tabs>
  )
}

// Punto 4: total de cartera local válida (el denominador) y la ponderación en cada ranking.
export function DatosPonderacion({ datos }) {
  const bancos = datos.bancos ?? []
  if (bancos.length === 0) return <SinDatos />
  const rankings = Object.keys(bancos[0].Ponderacion_Pct ?? {})
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={BANCO_FIJO}>Banco</TableHead>
          <TableHead className="text-right">Total cartera local válida</TableHead>
          {rankings.map((r) => (
            <TableHead key={r} className="text-right">
              {r}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {bancos.map((b) => (
          <TableRow key={b.Codigo_Banco}>
            <TableCell className={BANCO_FIJO}>
              <CeldaBanco banco={b.Banco} codigo={b.Codigo_Banco} />
            </TableCell>
            <TableCell className="text-right font-medium">{formatearMonto(b.Total_Cartera_Local_Valida)}</TableCell>
            {rankings.map((r) => (
              <TableCell key={r} className="text-right">
                {formatearPorcentaje(b.Ponderacion_Pct[r])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Punto 5: CONSUMO por banco y subactividad, con cuántas operaciones movió la regla SB21 a Tarjeta.
export function DatosSubactividades({ datos }) {
  const filas = datos.consumo ?? []
  const subactividades = Object.keys(filas[0]?.Subactividades ?? {})
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Regla SB21: los créditos personales con facilidad 07 cuentan en Tarjeta.
          {typeof datos.Reclasificadas_Tarjeta === 'number' &&
            ` En este período se reclasificaron ${formatearEntero(datos.Reclasificadas_Tarjeta)} operaciones.`}{' '}
          El total de CONSUMO no cambia.
        </span>
      </p>
      {filas.length === 0 ? (
        <SinDatos />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={BANCO_FIJO}>Banco</TableHead>
              {subactividades.map((s) => (
                <TableHead key={s} className="text-right">
                  {s}
                </TableHead>
              ))}
              <TableHead className="text-right">Total de CONSUMO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.Codigo_Banco}>
                <TableCell className={BANCO_FIJO}>
                  <CeldaBanco banco={f.Banco} codigo={f.Codigo_Banco} />
                </TableCell>
                {subactividades.map((s) => (
                  <TableCell key={s} className={`text-right ${s === SUBACTIVIDAD_SB21 ? 'font-semibold' : ''}`}>
                    {formatearMonto(f.Subactividades[s])}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium">{formatearMonto(f.Saldo_Actividad)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

// Punto 6: los períodos procesados y sus reconciliaciones (el motor dice si cuadran al centavo).
export function DatosPeriodos({ datos, periodo }) {
  const filas = datos.periodos ?? []
  if (filas.length === 0) return <SinDatos />
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Período</TableHead>
          <TableHead>Reconciliación 1</TableHead>
          <TableHead>Reconciliación 2</TableHead>
          <TableHead>Reconciliación 3</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((p) => (
          <TableRow key={p.Fecha} data-state={p.Fecha === periodo ? 'selected' : undefined}>
            <TableCell>
              <div className="font-medium">{formatearPeriodo(p.Fecha)}</div>
              <div className="text-xs text-muted-foreground">{p.Archivo}</div>
            </TableCell>
            {[p.R1, p.R2, p.R3].map((ok, i) => (
              <TableCell key={i}>
                <EstadoControl ok={ok} textoOk="Cuadra" textoMal="Descuadre" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
