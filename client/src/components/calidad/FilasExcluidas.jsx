import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from 'lucide-react'
import { catalogos as pedirCatalogos, excluidas as pedirExcluidas, urlDescarga } from '@/api/cliente.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero } from '@/lib/formato.js'
import { MOTIVOS, nombreDeMotivo } from './motivos.js'

const TODOS = 'todos'
const FILAS_POR_PAGINA = 50

// Exclusión auditable: filas excluidas del período, filtrables por motivo y banco (GET /api/excluidas).
export function FilasExcluidas({ periodo }) {
  const [motivo, setMotivo] = useState(TODOS)
  const [banco, setBanco] = useState(TODOS)
  const filtro = { periodo, motivo: motivo === TODOS ? undefined : motivo, banco: banco === TODOS ? undefined : banco }

  const consulta = useConsulta((opciones) => pedirExcluidas(filtro, opciones), [periodo, motivo, banco])
  const { datos: catalogos } = useConsulta(pedirCatalogos)
  const bancos = catalogos?.bancos ?? []
  const nombreBanco = (codigo) => bancos.find((b) => b.Codigo_Banco === codigo)?.Banco ?? `Banco ${codigo}`

  let contenido
  if (consulta.cargando) contenido = <Cargando filas={5} />
  else if (consulta.error) contenido = <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  else if (consulta.datos.excluidas.length === 0)
    contenido = <Vacio titulo="Sin filas excluidas" descripcion="Ninguna fila del período cumple el filtro elegido." />
  else
    contenido = (
      // key: al cambiar el filtro, la tabla vuelve a la primera página.
      <TablaPaginada key={`${periodo}-${motivo}-${banco}`} filas={consulta.datos.excluidas} nombreBanco={nombreBanco} />
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filas excluidas</CardTitle>
        <CardDescription>
          Exclusión auditable: cada fila con su motivo.
          {consulta.datos && ` ${formatearEntero(consulta.datos.total)} filas con el filtro actual.`}
        </CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <a href={urlDescarga('excluidas', { periodo })} download>
              <DownloadIcon aria-hidden="true" />
              CSV
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Filtro etiqueta="Motivo" valor={motivo} alCambiar={setMotivo}>
            {MOTIVOS.map((m) => (
              <SelectItem key={m.codigo} value={m.codigo}>
                {m.codigo} · {m.nombre}
              </SelectItem>
            ))}
          </Filtro>
          <Filtro etiqueta="Banco" valor={banco} alCambiar={setBanco}>
            {bancos.map((b) => (
              <SelectItem key={b.Codigo_Banco} value={b.Codigo_Banco}>
                {b.Codigo_Banco} · {b.Banco}
              </SelectItem>
            ))}
          </Filtro>
        </div>
        {contenido}
      </CardContent>
    </Card>
  )
}

function Filtro({ etiqueta, valor, alCambiar, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <Select value={valor} onValueChange={alCambiar}>
        <SelectTrigger aria-label={etiqueta} className="min-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={TODOS}>Todos</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </label>
  )
}

function TablaPaginada({ filas, nombreBanco }) {
  const [pagina, setPagina] = useState(0)
  const paginas = Math.ceil(filas.length / FILAS_POR_PAGINA)
  const visibles = filas.slice(pagina * FILAS_POR_PAGINA, (pagina + 1) * FILAS_POR_PAGINA)

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">Fila</TableHead>
            <TableHead>Préstamo</TableHead>
            <TableHead>Banco</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibles.map((e) => (
            <TableRow key={e.Fila_Archivo}>
              <TableCell className="cifra text-right">{formatearEntero(e.Fila_Archivo)}</TableCell>
              <TableCell className="font-mono text-xs">{e.Numero_Prestamo}</TableCell>
              <TableCell>{nombreBanco(e.Codigo_Banco)}</TableCell>
              <TableCell>
                {e.Motivo} · {nombreDeMotivo(e.Motivo)}
              </TableCell>
              <TableCell className="text-xs whitespace-normal text-muted-foreground">{e.Detalle}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {paginas > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Página {pagina + 1} de {paginas}
          </span>
          <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
            <ChevronLeftIcon aria-hidden="true" />
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={pagina >= paginas - 1} onClick={() => setPagina(pagina + 1)}>
            Siguiente
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
