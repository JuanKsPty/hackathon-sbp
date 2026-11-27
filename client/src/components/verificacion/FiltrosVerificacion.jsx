import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TODOS } from '@/components/rankings/FiltrosRanking.jsx'
import { formatearPeriodo } from '@/lib/formato.js'

// Filtros del modo verificación: período (el mismo de Panel, Rankings y Calidad) y banco (los del catálogo).
// El período solo cambia los puntos 2 a 5; los puntos 1 y 6 traen siempre todos los períodos.
export function FiltrosVerificacion({ periodos, periodo, alCambiarPeriodo, bancos, banco, alCambiarBanco }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>
          El período es el mismo de Panel, Rankings y Calidad y cambia los puntos 2 a 5. Los puntos 1 y 6 muestran todos los períodos y los
          chequeos usan siempre todos los bancos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* data-guia: identificador para el agente guía (contracts/guia.md, #72) */}
        <div data-guia="verificacion.filtros" className="grid max-w-xl gap-3 sm:grid-cols-2">
          <Filtro etiqueta="Período">
            <Select value={periodo ?? undefined} onValueChange={alCambiarPeriodo} disabled={periodos.length === 0}>
              <SelectTrigger aria-label="Período" className="w-full text-foreground">
                <SelectValue placeholder="Sin períodos" />
              </SelectTrigger>
              <SelectContent position="popper">
                {periodos.map((p) => (
                  <SelectItem key={p.Fecha} value={p.Fecha}>
                    {formatearPeriodo(p.Fecha)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filtro>
          <Filtro etiqueta="Banco">
            <Select value={banco} onValueChange={alCambiarBanco}>
              <SelectTrigger aria-label="Banco" className="w-full text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={TODOS}>Todos los bancos</SelectItem>
                {bancos.map((b) => (
                  <SelectItem key={b.Codigo_Banco} value={b.Codigo_Banco}>
                    {b.Codigo_Banco} · {b.Banco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filtro>
        </div>
      </CardContent>
    </Card>
  )
}

function Filtro({ etiqueta, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      {children}
    </label>
  )
}
