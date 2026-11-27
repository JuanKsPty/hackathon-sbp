import { useState } from 'react'
import { EyeIcon, EyeOffIcon, FileDownIcon, LockIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { leerCatalogo, leerCatalogosAdmin, urlCatalogoCsv } from '@/api/admin.js'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero } from '@/lib/formato.js'
import { formatearFechaHora } from './formato.js'

// Clave de cada catálogo en GET /api/admin/catalogos/:clave.
const CLAVES = { 'CINU/SB109': 'cinu', SB21: 'sb21', Bancos: 'bancos', 'Diccionario AT03': 'diccionario' }

// Estado de los catálogos (GET /api/admin/catalogos, #30): archivo, registros y fecha de carga, y el
// contenido de cada uno (GET /api/admin/catalogos/:clave) con su CSV original para descargar.
// Son de solo lectura: la clasificación usa solo los catálogos del reto (R3) y el CINU está congelado.
export function EstadoCatalogos() {
  const { perfil } = usePerfil()
  const { datos, error, cargando, reintentar } = useConsulta((opciones) => leerCatalogosAdmin(perfil, opciones), [perfil])
  const [abierto, setAbierto] = useState(null) // clave del catálogo que se está viendo

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
            <TableHead className="text-right">Contenido</TableHead>
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
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant={abierto === CLAVES[c.catalogo] ? 'secondary' : 'ghost'}
                    onClick={() => setAbierto(abierto === CLAVES[c.catalogo] ? null : CLAVES[c.catalogo])}
                    aria-expanded={abierto === CLAVES[c.catalogo]}
                  >
                    {abierto === CLAVES[c.catalogo] ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
                    Ver
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={urlCatalogoCsv(CLAVES[c.catalogo])} download aria-label={`Descargar ${c.archivo}`}>
                      <FileDownIcon aria-hidden="true" />
                      CSV
                    </a>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )

  const fuente = datos?.catalogos?.[0]?.fuente

  return (
    <Card data-guia="admin.catalogos">
      <CardHeader>
        <CardTitle>Catálogos</CardTitle>
        <CardDescription>
          La clasificación usa solo estos archivos. El CINU está congelado y no se modifica.
          {fuente ? ` Fuente: ${fuente}.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {contenido}
        {abierto && <ContenidoCatalogo clave={abierto} />}
      </CardContent>
    </Card>
  )
}

function ContenidoCatalogo({ clave }) {
  const { perfil } = usePerfil()
  const { datos, error, cargando, reintentar } = useConsulta((opciones) => leerCatalogo(perfil, clave, opciones), [perfil, clave])
  if (cargando && !datos) return <Cargando filas={4} />
  if (error) return <ErrorApi error={error} alReintentar={reintentar} />
  return (
    <section aria-label={`Contenido de ${datos.catalogo}`} className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">
        {datos.catalogo} · {formatearEntero(datos.filas.length)} registros
        {datos.congelado && <span className="font-normal text-muted-foreground"> · congelado, es la única versión válida</span>}
      </h3>
      <div className="max-h-96 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              {datos.columnas.map((columna) => (
                <TableHead key={columna} className="font-mono text-xs">
                  {columna}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {datos.filas.map((fila, i) => (
              <TableRow key={i}>
                {datos.columnas.map((columna) => (
                  <TableCell key={columna} className="max-w-80 text-xs whitespace-normal">
                    {fila[columna]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
