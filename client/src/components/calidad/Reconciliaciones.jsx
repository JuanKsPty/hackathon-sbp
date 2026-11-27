import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatearEntero, formatearMonto } from '@/lib/formato.js'
import { EstadoControl } from './EstadoControl.jsx'

// Reconciliaciones 1, 2, 3 y unicidad del período (sección 7). El ok de cada una lo calcula el motor.
export function Reconciliaciones({ reconciliaciones }) {
  const { R1, R2, R3, Unicidad } = reconciliaciones
  const controles = [
    {
      nombre: 'Reconciliación 1',
      regla: 'Por banco y ranking, la suma de las subactividades es igual al saldo de la actividad.',
      ok: R1.ok,
      detalle: textoDeDiferencias(R1.diferencias),
    },
    {
      nombre: 'Reconciliación 2',
      regla: 'Por banco, la suma de las 6 actividades es igual a su cartera local válida.',
      ok: R2.ok,
      detalle: textoDeDiferencias(R2.diferencias),
    },
    {
      nombre: 'Reconciliación 3',
      regla: 'La suma de las carteras de los 12 bancos es igual al saldo del universo local válido.',
      ok: R3.ok,
      detalle: `Bancos: ${formatearMonto(R3.Suma_Totales)} · Universo: ${formatearMonto(R3.Suma_Universo)}`,
    },
    {
      nombre: 'Unicidad',
      regla: 'Ningún Numero_Prestamo se repite en el universo local válido.',
      ok: Unicidad.ok,
      detalle: Unicidad.repetidos.length === 0
        ? 'Sin préstamos repetidos'
        : `${formatearEntero(Unicidad.repetidos.length)} repetidos: ${Unicidad.repetidos.slice(0, 5).join(', ')}`,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliaciones</CardTitle>
        <CardDescription>Controles que deben cuadrar al centavo en cada período.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y" data-guia="calidad.reconciliaciones">
          {controles.map((c) => (
            <li key={c.nombre} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.nombre}</span>
                <EstadoControl ok={c.ok} />
              </div>
              <p className="text-sm text-muted-foreground">{c.regla}</p>
              <p className="cifra text-xs">{c.detalle}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function textoDeDiferencias(diferencias = []) {
  if (diferencias.length === 0) return 'Sin diferencias'
  return `${formatearEntero(diferencias.length)} diferencia(s), por ejemplo en ${descripcion(diferencias[0])}`
}

// Las diferencias llegan con el detalle del motor: ranking y código de banco.
function descripcion(diferencia) {
  const partes = [diferencia.ranking, diferencia.codigoBanco && `banco ${diferencia.codigoBanco}`].filter(Boolean)
  return partes.join(', ') || 'un banco'
}
