import { useState } from 'react'
import { CheckCircle2Icon, LockIcon, RotateCcwIcon, SaveIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { guardarPermisos, leerPermisos, restablecerPermisos } from '@/api/admin.js'
import { DESCRIPCIONES_PERFIL, usePerfil } from '@/contexto/PerfilContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'

const CONFIGURABLES = ['publico', 'analista']

// { opcion: [perfiles sin admin] } de las opciones configurables, para editar y mandar al PUT.
const aBorrador = (opciones) =>
  Object.fromEntries(opciones.filter((o) => o.configurable).map((o) => [o.opcion, o.perfiles.filter((p) => p !== 'admin')]))

// Marca o desmarca un perfil respetando la jerarquía: lo del Público también lo tiene el Analista.
function alternar(perfiles, perfil, marcado) {
  const conjunto = new Set(perfiles)
  if (marcado) {
    conjunto.add(perfil)
    if (perfil === 'publico') conjunto.add('analista')
  } else {
    conjunto.delete(perfil)
    if (perfil === 'analista') conjunto.delete('publico')
  }
  return CONFIGURABLES.filter((p) => conjunto.has(p))
}

const iguales = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

// Perfiles y permisos (lámina 6, Administrador): qué perfil puede usar cada opción.
// GET/PUT/DELETE /api/admin/permisos. Al guardar, el menú se vuelve a pedir (GET /api/perfil).
export function PerfilesPermisos({ alCambiar }) {
  const { perfil, perfiles, recargar } = usePerfil()
  const consulta = useConsulta((opciones) => leerPermisos(perfil, opciones), [perfil])
  const [guardado, setGuardado] = useState(null)
  const [editado, setEditado] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const datos = guardado ?? consulta.datos
  const borrador = editado ?? (datos ? aBorrador(datos.opciones) : null)
  const hayCambios = datos && borrador && datos.opciones.some((o) => o.configurable && !iguales(borrador[o.opcion], o.perfiles.filter((p) => p !== 'admin')))

  async function ejecutar(accion, textoOk) {
    setGuardando(true)
    setAviso(null)
    try {
      const respuesta = await accion()
      setGuardado(respuesta)
      setEditado(null)
      setAviso({ tipo: 'ok', texto: textoOk })
      recargar() // el menú y las opciones de la sesión salen de GET /api/perfil
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.mensaje ?? error.message, codigo: error.codigo })
    } finally {
      setGuardando(false)
      alCambiar?.()
    }
  }

  let contenido
  if (consulta.cargando && !datos) contenido = <Cargando filas={6} />
  else if (consulta.error && !datos) contenido = <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  else if (datos) {
    const columnas = datos.perfiles ?? perfiles
    contenido = (
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opción</TableHead>
                {columnas.map((p) => (
                  <TableHead key={p.perfil} className="text-center" title={DESCRIPCIONES_PERFIL[p.perfil]}>
                    {p.nombre}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.opciones.map((o) => {
                const actuales = o.configurable ? [...borrador[o.opcion], 'admin'] : o.perfiles
                return (
                  <TableRow key={o.opcion}>
                    <TableCell className="max-w-72 whitespace-normal">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        {o.nombre}
                        {!o.configurable && <LockIcon className="size-3.5 text-muted-foreground" aria-label="Fija" />}
                        {o.configurable && !iguales(actuales, o.por_defecto) && (
                          <Badge variant="outline" className="text-[11px]">
                            Cambiada
                          </Badge>
                        )}
                      </div>
                      {o.motivo && <p className="text-xs text-muted-foreground">{o.motivo}</p>}
                    </TableCell>
                    {columnas.map((p) => {
                      const marcado = actuales.includes(p.perfil)
                      const editable = o.configurable && CONFIGURABLES.includes(p.perfil)
                      return (
                        <TableCell key={p.perfil} className="text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary disabled:opacity-60"
                            checked={marcado}
                            disabled={!editable || guardando}
                            aria-label={`${o.nombre}: ${p.nombre}`}
                            onChange={(e) =>
                              setEditado({ ...borrador, [o.opcion]: alternar(borrador[o.opcion], p.perfil, e.target.checked) })
                            }
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          El Administrador siempre tiene todas las opciones. Lo que marca el Público también lo tiene el Analista. Público es
          cualquier persona en el sitio público, sin iniciar sesión.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!hayCambios || guardando}
            onClick={() => ejecutar(() => guardarPermisos(perfil, borrador), 'Permisos guardados. Ya aplican al menú y a la API.')}
          >
            <SaveIcon aria-hidden="true" />
            Guardar permisos
          </Button>
          {hayCambios && (
            <Button type="button" variant="ghost" disabled={guardando} onClick={() => setEditado(null)}>
              Descartar cambios
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={guardando || datos.origen === 'por_defecto'}
            onClick={() => ejecutar(() => restablecerPermisos(perfil), 'Se restablecieron los permisos por defecto.')}
          >
            <RotateCcwIcon aria-hidden="true" />
            Permisos por defecto
          </Button>
        </div>
        <div aria-live="polite">
          {aviso?.tipo === 'ok' && (
            <Alert>
              <CheckCircle2Icon aria-hidden="true" />
              <AlertTitle>{aviso.texto}</AlertTitle>
            </Alert>
          )}
          {aviso?.tipo === 'error' && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>No se guardaron los permisos</AlertTitle>
              <AlertDescription>
                <p>{aviso.texto}</p>
                {aviso.codigo && <p className="font-mono text-xs">Código: {aviso.codigo}</p>}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card data-guia="admin.permisos">
      <CardHeader>
        <CardTitle>Perfiles y permisos</CardTitle>
        <CardDescription>Qué puede hacer cada perfil. Las opciones con candado son fijas.</CardDescription>
        {datos && (
          <CardAction>
            <Badge variant={datos.origen === 'por_defecto' ? 'secondary' : 'outline'}>
              {datos.origen === 'por_defecto' ? 'Por defecto' : 'Personalizados'}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{contenido}</CardContent>
    </Card>
  )
}
