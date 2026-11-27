import { RotateCwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { leerBitacora } from '@/api/admin.js'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import {
  COLOR_RESULTADO,
  NOMBRES_OPERACION,
  NOMBRES_PERFIL_BITACORA,
  NOMBRES_RESULTADO,
  formatearFechaHora,
} from './formato.js'

const MAXIMO_FILAS = 100

// Registro de operaciones (GET /api/bitacora, #31): qué se hizo, con qué archivo, cuándo,
// con qué perfil y con qué resultado. version cambia cuando la página hace una carga o un cambio.
export function Bitacora({ version }) {
  const { perfil } = usePerfil()
  const { datos, error, cargando, reintentar } = useConsulta((opciones) => leerBitacora(perfil, opciones), [perfil, version])

  let contenido
  if (cargando && !datos) contenido = <Cargando filas={5} />
  else if (error) contenido = <ErrorApi error={error} alReintentar={reintentar} />
  else if (datos.operaciones.length === 0) contenido = <Vacio titulo="Todavía no hay operaciones registradas" />
  else {
    const filas = datos.operaciones.slice(0, MAXIMO_FILAS)
    contenido = (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Operación y detalle</TableHead>
              <TableHead>Archivo</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((o, i) => (
              <TableRow key={`${o.fecha_hora}-${i}`}>
                <TableCell className="text-xs whitespace-nowrap">{formatearFechaHora(o.fecha_hora)}</TableCell>
                <TableCell className="max-w-xs whitespace-normal">
                  <div>{NOMBRES_OPERACION[o.operacion] ?? o.operacion}</div>
                  {o.detalle && <div className="text-xs break-words text-muted-foreground">{o.detalle}</div>}
                </TableCell>
                <TableCell className="max-w-48 font-mono text-xs whitespace-normal break-all">{o.archivo ?? '—'}</TableCell>
                <TableCell>{NOMBRES_PERFIL_BITACORA[o.perfil] ?? o.perfil}</TableCell>
                <TableCell>
                  <Badge className={COLOR_RESULTADO[o.resultado] ?? ''}>{NOMBRES_RESULTADO[o.resultado] ?? o.resultado}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {datos.total > filas.length && (
          <p className="text-xs text-muted-foreground">
            Se muestran las {filas.length} más recientes de {datos.total}.
          </p>
        )}
      </>
    )
  }

  return (
    <Card data-guia="admin.bitacora">
      <CardHeader>
        <CardTitle>Registro de operaciones</CardTitle>
        <CardDescription>
          Cargas de archivos, cambios de parámetros y accesos denegados, de la más reciente a la más antigua.
          {datos ? ` Total: ${datos.total}.` : ''}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={reintentar} disabled={cargando}>
            <RotateCwIcon aria-hidden="true" />
            Actualizar
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{contenido}</CardContent>
    </Card>
  )
}
