import { AyudaTermino } from '@/components/glosario/AyudaTermino.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { EstadoControl } from './EstadoControl.jsx'
import { MOTIVOS } from './motivos.js'

// Cascada oficial E1 -> E2 -> E3 -> E4 de cada período (GET /api/calidad).
// Cada fila cuenta solo en el primer filtro que incumple; el período elegido va resaltado.
export function CascadaPeriodos({ periodos, periodoElegido }) {
  const elegido = periodos.find((p) => p.Fecha === periodoElegido) ?? periodos.at(-1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Cascada de exclusiones por período <AyudaTermino clave="cascada" />
        </CardTitle>
        <CardDescription>
          Reporte oficial: cada fila excluida cuenta solo en el primer filtro que incumple (E1, luego E2, E3 y E4).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* data-guia: identificador para el agente guía (contracts/guia.md, #72) */}
        <Table data-guia="calidad.cascada">
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">
                <ConAyuda clave="filas_leidas">Filas leídas</ConAyuda>
              </TableHead>
              {MOTIVOS.map((m) => (
                <TableHead key={m.codigo} className="text-right" title={m.nombre}>
                  <ConAyuda clave={m.codigo}>
                    {m.codigo} · {m.nombre}
                  </ConAyuda>
                </TableHead>
              ))}
              <TableHead className="text-right">
                <ConAyuda clave="universo">Universo local válido</ConAyuda>
              </TableHead>
              <TableHead className="text-right">Saldo total válido</TableHead>
              <TableHead>Cuadre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodos.map((p) => (
              <TableRow key={p.Fecha} data-state={p.Fecha === elegido?.Fecha ? 'selected' : undefined}>
                <TableCell>
                  <div className="font-medium">{formatearPeriodo(p.Fecha)}</div>
                  <div className="text-xs text-muted-foreground">{p.Archivo}</div>
                </TableCell>
                <TableCell className="cifra text-right">{formatearEntero(p.Filas_Leidas)}</TableCell>
                {MOTIVOS.map((m) => (
                  <TableCell key={m.codigo} className="cifra text-right">
                    {formatearEntero(p[m.campo])}
                  </TableCell>
                ))}
                <TableCell className="cifra text-right font-medium">{formatearEntero(p.Universo_Local_Valido)}</TableCell>
                <TableCell className="cifra text-right">{formatearMonto(p.Saldo_Total_Valido)}</TableCell>
                <TableCell>
                  <EstadoControl ok={p.Cascada_Cuadra} textoOk="Cuadra" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {elegido && <Verificacion periodo={elegido} />}
      </CardContent>
    </Card>
  )
}

// Encabezado con el ícono ⓘ del glosario (#129).
function ConAyuda({ clave, children }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <AyudaTermino clave={clave} />
    </span>
  )
}

// La verificación con los números del período: leídas = E1 + E2 + E3 + E4 + universo.
function Verificacion({ periodo }) {
  const sumandos = [...MOTIVOS.map((m) => periodo[m.campo]), periodo.Universo_Local_Valido]
  const suma = sumandos.reduce((total, n) => total + n, 0)
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
      <span className="text-xs text-muted-foreground">
        Verificación de {formatearPeriodo(periodo.Fecha)}: leídas = E1 + E2 + E3 + E4 + universo
      </span>
      <span className="cifra flex flex-wrap items-center gap-2 font-medium">
        {formatearEntero(periodo.Filas_Leidas)} = {sumandos.map(formatearEntero).join(' + ')}
        <span className="text-muted-foreground">({formatearEntero(suma)})</span>
        <EstadoControl ok={periodo.Cascada_Cuadra} textoOk="Cuadra" textoMal="No cuadra" />
      </span>
    </div>
  )
}
