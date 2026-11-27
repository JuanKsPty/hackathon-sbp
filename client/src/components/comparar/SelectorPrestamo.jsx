import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { catalogos as pedirCatalogos, prestamos as pedirPrestamos } from '@/api/cliente.js'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'

// Cuántas opciones se pintan a la vez en la lista de préstamos (el resto se alcanza filtrando).
const VISIBLES = 200

// Elegir un préstamo en cascada: período → banco → ranking → préstamo (GET /api/prestamos).
// Con ~25 mil préstamos por período, la lista solo trae los del banco y ranking elegidos, de mayor a
// menor saldo, con un filtro por número o subactividad. alElegir(numero) abre la ficha.
export function SelectorPrestamo({ alElegir }) {
  const { periodos } = usePeriodo()
  const catalogo = useConsulta(pedirCatalogos)
  const bancos = catalogo.datos?.bancos ?? []
  const rankings = catalogo.datos?.rankings ?? []
  const [periodo, setPeriodo] = useState(null)
  const [banco, setBanco] = useState(null)
  const [ranking, setRanking] = useState(null)

  // Por defecto: el último período cargado y el primer banco y ranking del catálogo.
  const periodoElegido = periodo ?? periodos.at(-1)?.Fecha ?? null
  const bancoElegido = banco ?? bancos[0]?.Codigo_Banco ?? null
  const rankingElegido = ranking ?? rankings[0]?.Ranking ?? null
  const listo = Boolean(periodoElegido && bancoElegido && rankingElegido)
  const lista = useConsulta(
    (opciones) => pedirPrestamos({ periodo: periodoElegido, banco: bancoElegido, ranking: rankingElegido }, opciones),
    [periodoElegido, bancoElegido, rankingElegido],
    { activa: listo },
  )

  if (catalogo.error) return <ErrorApi error={catalogo.error} alReintentar={catalogo.reintentar} />

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Selector etiqueta="Período" valor={periodoElegido} alCambiar={setPeriodo}>
          {periodos.map((p) => (
            <SelectItem key={p.Fecha} value={p.Fecha}>
              {formatearPeriodo(p.Fecha)}
            </SelectItem>
          ))}
        </Selector>
        <Selector etiqueta="Banco" valor={bancoElegido} alCambiar={setBanco}>
          {bancos.map((b) => (
            <SelectItem key={b.Codigo_Banco} value={b.Codigo_Banco}>
              {b.Codigo_Banco} · {b.Banco}
            </SelectItem>
          ))}
        </Selector>
        <Selector etiqueta="Ranking" valor={rankingElegido} alCambiar={setRanking}>
          {rankings.map((r) => (
            <SelectItem key={r.Ranking} value={r.Ranking}>
              {r.Ranking}
            </SelectItem>
          ))}
        </Selector>
      </div>
      <DesplegablePrestamos consulta={lista} alElegir={alElegir} />
    </div>
  )
}

// Lista desplegable con filtro dentro (sin dependencias nuevas): un botón abre el panel con el filtro
// y las opciones "número · subactividad · saldo". Se cierra al elegir, con Escape o al hacer clic fuera.
// El panel se despliega en el flujo (no flotante): la Card recorta lo que sobresale.
function DesplegablePrestamos({ consulta, alElegir }) {
  const [abierto, setAbierto] = useState(false)
  const [filtro, setFiltro] = useState('')
  const contenedor = useRef(null)
  const todos = useMemo(() => consulta.datos?.prestamos ?? [], [consulta.datos])

  const filtrados = useMemo(() => {
    const texto = filtro.trim().toLowerCase()
    if (!texto) return todos
    return todos.filter((p) => p.Numero_Prestamo.toLowerCase().includes(texto) || p.Subactividad.toLowerCase().includes(texto))
  }, [todos, filtro])

  useEffect(() => {
    if (!abierto) return undefined
    const alPresionarFuera = (evento) => {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', alPresionarFuera)
    return () => document.removeEventListener('mousedown', alPresionarFuera)
  }, [abierto])

  const elegir = (numero) => {
    setAbierto(false)
    alElegir(numero)
  }

  const etiqueta = consulta.cargando
    ? 'Cargando préstamos…'
    : todos.length === 0
      ? 'Sin préstamos en este banco y ranking'
      : `Elegir préstamo (${formatearEntero(todos.length)})`

  return (
    <div ref={contenedor} className="relative flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">Préstamo</span>
      <Button
        type="button"
        variant="outline"
        className="justify-between font-normal"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        disabled={consulta.cargando || todos.length === 0}
        onClick={() => setAbierto(!abierto)}
      >
        {etiqueta}
        <ChevronDownIcon aria-hidden="true" />
      </Button>
      {consulta.error && <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} titulo="No se pudo cargar la lista de préstamos" />}
      {abierto && (
        <div
          className="mt-1 w-full rounded-md border bg-popover p-2 text-popover-foreground shadow-md"
          onKeyDown={(evento) => evento.key === 'Escape' && setAbierto(false)}
        >
          <Input
            autoFocus
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value)}
            placeholder="Filtrar por número o subactividad"
            aria-label="Filtrar préstamos por número o subactividad"
            className="mb-2 h-8 text-xs"
          />
          <ul role="listbox" aria-label="Préstamos del banco y ranking" className="max-h-72 overflow-y-auto">
            {filtrados.slice(0, VISIBLES).map((p) => (
              <li key={p.Numero_Prestamo} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => elegir(p.Numero_Prestamo)}
                  className="flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span className="shrink-0 font-mono">{p.Numero_Prestamo}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{p.Subactividad}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="cifra shrink-0">{formatearMonto(p.Saldo)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 px-2 text-xs text-muted-foreground">
            {filtrados.length === 0
              ? 'Ningún préstamo coincide con el filtro.'
              : filtrados.length > VISIBLES
                ? `Mostrando ${formatearEntero(VISIBLES)} de ${formatearEntero(filtrados.length)}, de mayor a menor saldo: escribe para filtrar.`
                : `${formatearEntero(filtrados.length)} préstamos, de mayor a menor saldo.`}
          </p>
        </div>
      )}
    </div>
  )
}

function Selector({ etiqueta, valor, alCambiar, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <Select value={valor ?? undefined} onValueChange={alCambiar}>
        <SelectTrigger aria-label={etiqueta} className="w-full text-foreground">
          <SelectValue placeholder="Cargando…" />
        </SelectTrigger>
        <SelectContent position="popper">{children}</SelectContent>
      </Select>
    </label>
  )
}
