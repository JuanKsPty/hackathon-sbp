import { ArrowDownIcon, ArrowUpIcon, CheckCircle2Icon, MinusIcon, TriangleAlertIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'

// Resultado de POST /api/periodos (contracts/carga.json): un bloque por período del archivo.
// Todas las cifras vienen del API (R2).
export function ResultadoCarga({ resultado }) {
  return (
    <div className="flex flex-col gap-6">
      {resultado.periodos.map((periodo) => (
        <PeriodoCargado key={periodo.Fecha} periodo={periodo} archivo={resultado.archivo} />
      ))}
    </div>
  )
}

function Estado({ ok, si, no }) {
  return ok ? (
    <Badge className="bg-sube-fondo text-sube">
      <CheckCircle2Icon aria-hidden="true" />
      {si}
    </Badge>
  ) : (
    <Badge className="bg-baja-fondo text-baja">
      <TriangleAlertIcon aria-hidden="true" />
      {no}
    </Badge>
  )
}

function PeriodoCargado({ periodo, archivo }) {
  const c = periodo.Calidad
  const r = c?.Reconciliaciones ?? {}
  const cascada = [
    ['Filas leídas', c?.Filas_Leidas],
    ['E1 · Duplicados', c?.E1_Duplicados],
    ['E2 · Destino extranjero', c?.E2_Destino_Extranjero],
    ['E3 · Saldo ≤ 0', c?.E3_Saldo_No_Positivo],
    ['E4 · Actividad no catalogada', c?.E4_Actividad_No_Catalogada],
    ['Universo local válido', c?.Universo_Local_Valido],
  ]

  return (
    <article className="flex flex-col gap-4 rounded-lg border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant={periodo.Accion === 'NUEVO' ? 'default' : 'secondary'}>
          {periodo.Accion === 'NUEVO' ? 'Nuevo' : 'Actualización'}
        </Badge>
        <h3 className="font-semibold">Período {formatearPeriodo(periodo.Fecha)}</h3>
        <span className="text-sm text-muted-foreground">{archivo}</span>
      </header>
      <p className="text-sm">{periodo.Mensaje}</p>

      <section className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">Cascada de exclusiones</h4>
        <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cascada.map(([nombre, valor]) => (
            <div key={nombre} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{nombre}</dt>
              <dd className="cifra text-lg font-semibold">{formatearEntero(valor)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm">
          Saldo total válido: <span className="cifra font-semibold">{formatearMonto(c?.Saldo_Total_Valido)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Estado ok={c?.Cascada_Cuadra} si="La cascada cuadra" no="La cascada no cuadra" />
          <Estado ok={r.R1?.ok} si="R1 OK" no="R1 con diferencias" />
          <Estado ok={r.R2?.ok} si="R2 OK" no="R2 con diferencias" />
          <Estado ok={r.R3?.ok} si="R3 OK" no="R3 con diferencias" />
          <Estado ok={r.Unicidad?.ok} si="Unicidad OK" no="Préstamos repetidos" />
          <Badge variant="outline">Alertas de calidad: {formatearEntero(c?.Alertas_Total)}</Badge>
        </div>
      </section>

      <CambiosDeRanking comparacion={periodo.Comparacion} periodoAnterior={periodo.Periodo_Anterior} />
    </article>
  )
}

function CambioPosicion({ valor }) {
  if (valor > 0)
    return (
      <span className="inline-flex items-center gap-1 text-sube">
        <ArrowUpIcon className="size-3.5" aria-hidden="true" />
        sube {valor}
      </span>
    )
  if (valor < 0)
    return (
      <span className="inline-flex items-center gap-1 text-baja">
        <ArrowDownIcon className="size-3.5" aria-hidden="true" />
        baja {Math.abs(valor)}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-igual">
      <MinusIcon className="size-3.5" aria-hidden="true" />
      igual
    </span>
  )
}

const nombreLider = (lider) => (lider ? `${lider.Banco} (${lider.Codigo_Banco})` : '—')

function CambiosDeRanking({ comparacion, periodoAnterior }) {
  if (!comparacion) {
    return (
      <p className="text-sm text-muted-foreground">
        {periodoAnterior
          ? 'El servidor no devolvió la comparación de rankings.'
          : 'Es el primer período cargado: no hay un período anterior para comparar los rankings.'}
      </p>
    )
  }

  const significativos = comparacion.rankings.flatMap((r) =>
    r.movimientos.filter((m) => m.Significativo).map((m) => ({ ...m, Ranking: r.Ranking })),
  )

  return (
    <section className="flex flex-col gap-3">
      <h4 className="text-sm font-medium">
        Cambios de ranking contra {formatearPeriodo(comparacion.periodo_anterior)}
      </h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ranking</TableHead>
            <TableHead>Líder anterior</TableHead>
            <TableHead>Líder actual</TableHead>
            <TableHead>Movimientos significativos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparacion.rankings.map((r) => (
            <TableRow key={r.Ranking}>
              <TableCell className="font-medium">{r.Ranking}</TableCell>
              <TableCell>{nombreLider(r.Lider_anterior)}</TableCell>
              <TableCell>
                {nombreLider(r.Lider_actual)}
                {r.Cambio_Lider && <Badge className="ml-2 bg-destacado/15 text-destacado">Nuevo líder</Badge>}
              </TableCell>
              <TableCell className="cifra">{r.movimientos.filter((m) => m.Significativo).length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {significativos.length > 0 && (
        <>
          <h4 className="text-sm font-medium">Movimientos significativos ({significativos.length})</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ranking</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Posición</TableHead>
                <TableHead>Cambio</TableHead>
                <TableHead className="text-right">Var. saldo %</TableHead>
                <TableHead>Motivos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {significativos.map((m) => (
                <TableRow key={`${m.Ranking}-${m.Codigo_Banco}`}>
                  <TableCell>{m.Ranking}</TableCell>
                  <TableCell>{m.Banco}</TableCell>
                  <TableCell className="cifra">
                    {m.Posicion_anterior} → {m.Posicion_actual}
                  </TableCell>
                  <TableCell>
                    <CambioPosicion valor={m.Cambio_Posicion} />
                  </TableCell>
                  <TableCell className="cifra text-right">{formatearPorcentaje(m.Var_Saldo_Pct)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.Motivos.join(', ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Regla usada: |cambio de posición| ≥ {comparacion.regla_significativo.min_cambio_posicion_abs ?? 'desactivado'}
        {' · '}cambio de líder: {comparacion.regla_significativo.cambio_lider ? 'sí' : 'no'}
        {' · '}|var. saldo %| ≥ {comparacion.regla_significativo.min_var_saldo_pct_abs ?? 'desactivado'}
      </p>
    </section>
  )
}
