import { LockIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { leerCatalogosAdmin } from '@/api/admin.js'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero } from '@/lib/formato.js'
import { formatearFechaHora } from './formato.js'

// Estado de los catálogos (GET /api/admin/catalogos, #30): archivo, registros y fecha de carga.
// Son de solo lectura; el CINU está congelado (sección 2 de las indicaciones).
export function EstadoCatalogos() {
  const { perfil } = usePerfil()
  const { datos, error, cargando, reintentar } = useConsulta((opciones) => leerCatalogosAdmin(perfil, opciones), [perfil])

  let contenido
  if (cargando) contenido = <Cargando filas={4} />
  else if (error) contenido = <ErrorApi error={error} alReintentar={reintentar} />
  else
    contenido = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Catálogo y archivo</TableHead>
            <TableHead className="text-right">Registros</TableHead>
            <TableHead>Cargado</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {datos.catalogos.map((c) => (
            <TableRow key={c.catalogo}>
              <TableCell>
                <div className="font-medium">{c.catalogo}</div>
                <div className="font-mono text-xs text-muted-foreground">{c.archivo}</div>
              </TableCell>
              <TableCell className="cifra text-right">{formatearEntero(c.registros)}</TableCell>
              <TableCell className="text-xs">{formatearFechaHora(c.fecha_carga)}</TableCell>
              <TableCell>
                <Badge variant={c.congelado ? 'secondary' : 'outline'} title={c.nota}>
                  {c.congelado && <LockIcon aria-hidden="true" />}
                  {c.congelado ? 'Congelado' : 'Solo lectura'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )

  const fuente = datos?.catalogos?.[0]?.fuente

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogos</CardTitle>
        <CardDescription>
          La clasificación usa solo estos archivos. El CINU está congelado y no se modifica.
          {fuente ? ` Fuente: ${fuente}.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>{contenido}</CardContent>
    </Card>
  )
}
