import { DownloadIcon } from 'lucide-react'
import { descargarArchivo, prestamo as pedirPrestamo } from '@/api/cliente.js'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { Estado } from './Estado.jsx'
import { useDescarga } from './useDescarga.js'

const ESTADOS = { VALIDO: 'Válido', EXCLUIDO: 'Excluido', NO_REPORTADO: 'No reportado' }
const conSigno = (valor) => (typeof valor === 'number' && valor > 0 ? `+${formatearMonto(valor)}` : formatearMonto(valor))
// El peso llega en % con 4 decimales (Participacion_Pct): se muestra tal cual.
const peso = (valor) => (typeof valor === 'number' ? `${valor.toFixed(4)} %` : '—')

// Ficha de un préstamo (GET /api/prestamos/:numero) en un panel lateral, con la descarga de su
// informe HTML (GET /api/exportar/prestamo.html). Solo Analista y Administrador.
export function DetallePrestamo({ numero, alCerrar }) {
  const abierto = Boolean(numero)
  const consulta = useConsulta((opciones) => pedirPrestamo(numero, opciones), [numero], { activa: abierto })
  const descarga = useDescarga()
  const descargar = () => descarga.ejecutar(() => descargarArchivo('/exportar/prestamo.html', { numero }))

  return (
    <Sheet open={abierto} onOpenChange={(abrir) => !abrir && alCerrar()}>
      <SheetContent side="right" className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Préstamo {numero}</SheetTitle>
          <SheetDescription>Su historial en todos los períodos cargados y los campos del AT03.</SheetDescription>
          <Button variant="outline" size="sm" className="mt-2 self-start" onClick={descargar} disabled={descarga.descargando || !consulta.datos}>
            <DownloadIcon aria-hidden="true" />
            {descarga.descargando ? 'Descargando…' : 'Descargar informe'}
          </Button>
          {descarga.error && <ErrorApi error={descarga.error} titulo="No se pudo descargar el informe" />}
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-6">
          <Estado consulta={consulta} activa={abierto}>
            {consulta.datos && <Ficha ficha={consulta.datos} />}
          </Estado>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Ficha({ ficha }) {
  const validos = ficha.periodos.filter((p) => p.Estado === 'VALIDO')
  const ultimo = validos.at(-1)
  const avisos = ficha.periodos.flatMap((p) => [
    ...p.Exclusiones.map((e) => ({ Fecha: p.Fecha, tipo: `Exclusión ${e.Motivo}`, detalle: e.Detalle })),
    ...p.Alertas.map((a) => ({ Fecha: p.Fecha, tipo: `Alerta ${a.Tipo}`, detalle: a.Detalle })),
  ])

  return (
    <>
      {ultimo && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Dato titulo="Banco" valor={`${ultimo.Banco} (${ultimo.Codigo_Banco})`} />
          <Dato titulo="Ranking · subactividad" valor={`${ultimo.Ranking} · ${ultimo.Subactividad}`} />
          <Dato titulo={`Saldo al ${formatearPeriodo(ultimo.Fecha)}`} valor={formatearMonto(ultimo.Saldo)} />
          <Dato titulo="Peso en la cartera del banco en el ranking" valor={peso(ultimo.Participacion_Pct)} />
        </dl>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Historial por período</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Variación</TableHead>
                <TableHead className="text-right">Peso en el banco</TableHead>
                <TableHead>Posición del banco</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ficha.periodos.map((p) => (
                <TableRow key={p.Fecha}>
                  <TableCell>{formatearPeriodo(p.Fecha)}</TableCell>
                  <TableCell>
                    <Badge variant={p.Estado === 'VALIDO' ? 'secondary' : 'outline'}>{ESTADOS[p.Estado] ?? p.Estado}</Badge>
                  </TableCell>
                  <TableCell className="cifra text-right">{formatearMonto(p.Saldo)}</TableCell>
                  <TableCell className="cifra text-right">{conSigno(p.Var_Saldo)}</TableCell>
                  <TableCell className="cifra text-right">{peso(p.Participacion_Pct)}</TableCell>
                  <TableCell>{p.Posicion_Banco ? `${p.Posicion_Banco} de ${p.Bancos_en_Ranking}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {avisos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Exclusiones y alertas</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {avisos.map((a, i) => (
              <li key={i}>
                <span className="text-muted-foreground">{formatearPeriodo(a.Fecha)} · {a.tipo}:</span> {a.detalle}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ultimo?.Campos && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Campos del AT03 al {formatearPeriodo(ultimo.Fecha)}</h3>
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableBody>
                {Object.entries(ultimo.Campos).map(([campo, valor]) => (
                  <TableRow key={campo}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{campo}</TableCell>
                    <TableCell className="text-xs">{valor || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        {ficha.fuente} · {ficha.aviso}
      </p>
    </>
  )
}

function Dato({ titulo, valor }) {
  return (
    <div className="rounded-md border p-3">
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd className="cifra font-medium">{valor}</dd>
    </div>
  )
}
