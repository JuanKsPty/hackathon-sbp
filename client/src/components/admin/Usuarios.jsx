import { useState } from 'react'
import { CheckCircle2Icon, KeyRoundIcon, RotateCwIcon, ShuffleIcon, UserPlusIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { actualizarUsuario, crearUsuario, leerUsuarios } from '@/api/admin.js'
import { NOMBRES_PERFIL, usePerfil } from '@/contexto/PerfilContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearFechaCorta, generarClave } from './formato.js'

const LARGO_MINIMO = 10
const CAMPO = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
const FUENTES = {
  supabase: 'Se guardan en la base de datos (Supabase), con la contraseña cifrada.',
  archivo: 'Se guardan en este servidor (storage/usuarios.json), con la contraseña cifrada.',
}
const ORIGENES = { supabase: 'Base de datos', archivo: 'Servidor', env: 'Archivo .env' }

// Usuarios del sitio interno (lámina 6, Administrador: configurar perfiles). Crear, cambiar perfil,
// activar o desactivar y restablecer la contraseña. GET/POST/PATCH /api/admin/usuarios.
export function Usuarios({ alCambiar }) {
  const { perfil, usuario: sesion } = usePerfil()
  const [version, setVersion] = useState(0)
  const consulta = useConsulta((opciones) => leerUsuarios(perfil, opciones), [perfil, version])
  const [aviso, setAviso] = useState(null) // { tipo, titulo, texto, codigo?, clave? }
  const [ocupado, setOcupado] = useState(null) // usuario que se está guardando, o 'nuevo'
  const [creando, setCreando] = useState(false)
  const [claveDe, setClaveDe] = useState(null) // usuario al que se le restablece la contraseña

  async function ejecutar(quien, accion, { titulo, clave } = {}) {
    setOcupado(quien)
    setAviso(null)
    try {
      const resultado = await accion()
      setAviso({ tipo: 'ok', titulo: titulo(resultado), clave })
      setVersion((v) => v + 1)
      return true
    } catch (error) {
      setAviso({ tipo: 'error', titulo: 'No se guardó el cambio', texto: error.mensaje ?? error.message, codigo: error.codigo })
      return false
    } finally {
      setOcupado(null)
      alCambiar?.()
    }
  }

  const cambiar = (u, cambios, titulo, clave) =>
    ejecutar(u.usuario, () => actualizarUsuario(perfil, u.usuario, cambios), { titulo: () => titulo, clave })

  const datos = consulta.datos
  let contenido
  if (consulta.cargando && !datos) contenido = <Cargando filas={4} />
  else if (consulta.error && !datos) contenido = <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  else if (datos.usuarios.length === 0) contenido = <Vacio titulo="Todavía no hay usuarios" descripcion="Crea el primero con Nuevo usuario." />
  else
    contenido = (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datos.usuarios.map((u) => {
              const soyYo = sesion?.usuario === u.usuario
              const deshabilitado = !u.editable || ocupado !== null
              return (
                <TableRow key={u.usuario} className={u.activo ? '' : 'text-muted-foreground'}>
                  <TableCell className="whitespace-normal">
                    <div className="font-medium">
                      {u.nombre}
                      {soyYo && <span className="text-xs font-normal text-muted-foreground"> (tú)</span>}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{u.usuario}</div>
                    {!u.editable && <div className="text-xs text-muted-foreground">Viene del {ORIGENES[u.origen]}: se cambia ahí.</div>}
                  </TableCell>
                  <TableCell>
                    <label className="sr-only" htmlFor={`perfil-${u.usuario}`}>
                      Perfil de {u.usuario}
                    </label>
                    <select
                      id={`perfil-${u.usuario}`}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      value={u.perfil}
                      disabled={deshabilitado || soyYo}
                      title={soyYo ? 'No puedes cambiar tu propio perfil' : undefined}
                      onChange={(e) =>
                        cambiar(u, { perfil: e.target.value }, `${u.usuario} ahora es ${NOMBRES_PERFIL[e.target.value]}. Su sesión abierta se cerró.`)
                      }
                    >
                      <option value="analista">{NOMBRES_PERFIL.analista}</option>
                      <option value="admin">{NOMBRES_PERFIL.admin}</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Badge className={u.activo ? 'bg-sube-fondo text-sube' : 'bg-igual-fondo text-igual'}>{u.activo ? 'Activo' : 'Desactivado'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatearFechaCorta(u.ultimo_acceso)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deshabilitado}
                        onClick={() => setClaveDe(claveDe === u.usuario ? null : u.usuario)}
                      >
                        <KeyRoundIcon aria-hidden="true" />
                        Contraseña
                      </Button>
                      <Button
                        size="sm"
                        variant={u.activo ? 'ghost' : 'outline'}
                        disabled={deshabilitado || soyYo}
                        title={soyYo ? 'No puedes desactivar tu propia cuenta' : undefined}
                        onClick={() =>
                          cambiar(u, { activo: !u.activo }, u.activo ? `${u.usuario} quedó desactivado: ya no puede iniciar sesión.` : `${u.usuario} quedó activo otra vez.`)
                        }
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                    {claveDe === u.usuario && (
                      <RestablecerClave
                        usuario={u.usuario}
                        ocupado={ocupado !== null}
                        alCancelar={() => setClaveDe(null)}
                        alGuardar={async (clave) => {
                          const ok = await cambiar(u, { clave }, `Se restableció la contraseña de ${u.usuario}.`, clave)
                          if (ok) setClaveDe(null)
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )

  return (
    <Card data-guia="admin.usuarios">
      <CardHeader>
        <CardTitle>Usuarios</CardTitle>
        <CardDescription>
          Cuentas de Analista y Administrador del sitio interno. {datos ? FUENTES[datos.guardados_en] : ''} No se borran: se desactivan.
        </CardDescription>
        <CardAction className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={consulta.reintentar} disabled={consulta.cargando} aria-label="Actualizar usuarios">
            <RotateCwIcon aria-hidden="true" />
          </Button>
          <Button size="sm" onClick={() => setCreando((c) => !c)} aria-expanded={creando}>
            <UserPlusIcon aria-hidden="true" />
            Nuevo usuario
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {creando && (
          <NuevoUsuario
            ocupado={ocupado !== null}
            alCancelar={() => setCreando(false)}
            alCrear={async (nuevo) => {
              const ok = await ejecutar('nuevo', () => crearUsuario(perfil, nuevo), {
                titulo: (u) => `Se creó ${u.usuario} como ${NOMBRES_PERFIL[u.perfil]}.`,
                clave: nuevo.clave,
              })
              if (ok) setCreando(false)
            }}
          />
        )}
        <div aria-live="polite">
          {aviso?.tipo === 'ok' && (
            <Alert>
              <CheckCircle2Icon aria-hidden="true" />
              <AlertTitle>{aviso.titulo}</AlertTitle>
              {aviso.clave && (
                <AlertDescription>
                  <p>
                    Contraseña: <span className="font-mono font-medium text-foreground">{aviso.clave}</span>
                  </p>
                  <p>Pásala por un canal seguro. No se vuelve a mostrar.</p>
                </AlertDescription>
              )}
            </Alert>
          )}
          {aviso?.tipo === 'error' && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>{aviso.titulo}</AlertTitle>
              <AlertDescription>
                <p>{aviso.texto}</p>
                {aviso.codigo && <p className="font-mono text-xs">Código: {aviso.codigo}</p>}
              </AlertDescription>
            </Alert>
          )}
        </div>
        {contenido}
      </CardContent>
    </Card>
  )
}

function CampoClave({ id, valor, alCambiar }) {
  return (
    <div className="flex gap-2">
      <input
        id={id}
        type="text"
        // Es la contraseña de OTRA persona: que el gestor de contraseñas del Administrador no la guarde.
        autoComplete="off"
        data-1p-ignore=""
        data-lpignore="true"
        data-bwignore=""
        spellCheck={false}
        className={`${CAMPO} font-mono`}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        minLength={LARGO_MINIMO}
        required
      />
      <Button type="button" variant="outline" onClick={() => alCambiar(generarClave())}>
        <ShuffleIcon aria-hidden="true" />
        Generar
      </Button>
    </div>
  )
}

function NuevoUsuario({ ocupado, alCancelar, alCrear }) {
  const [form, setForm] = useState({ usuario: '', nombre: '', perfil: 'analista', clave: generarClave() })
  const [error, setError] = useState(null)
  const poner = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  function enviar(evento) {
    evento.preventDefault()
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,59}$/.test(form.usuario.trim())) {
      setError('El usuario debe tener de 2 a 60 caracteres: letras, números, punto, guion o guion bajo, sin espacios.')
      return
    }
    if (form.clave.length < LARGO_MINIMO) {
      setError(`La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`)
      return
    }
    setError(null)
    alCrear({ ...form, usuario: form.usuario.trim().toLowerCase(), nombre: form.nombre.trim() })
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="nuevo-usuario" className="text-sm font-medium">
          Usuario
        </label>
        <input id="nuevo-usuario" className={CAMPO} value={form.usuario} onChange={(e) => poner('usuario')(e.target.value)} autoComplete="off" placeholder="ana.perez" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="nuevo-nombre" className="text-sm font-medium">
          Nombre <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <input id="nuevo-nombre" className={CAMPO} value={form.nombre} onChange={(e) => poner('nombre')(e.target.value)} placeholder="Ana Pérez" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="nuevo-perfil" className="text-sm font-medium">
          Perfil
        </label>
        <select id="nuevo-perfil" className={CAMPO} value={form.perfil} onChange={(e) => poner('perfil')(e.target.value)}>
          <option value="analista">{NOMBRES_PERFIL.analista}: compara y genera reportes</option>
          <option value="admin">{NOMBRES_PERFIL.admin}: además administra la plataforma</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="nuevo-clave" className="text-sm font-medium">
          Contraseña inicial
        </label>
        <CampoClave id="nuevo-clave" valor={form.clave} alCambiar={poner('clave')} />
        <p className="text-xs text-muted-foreground">Mínimo {LARGO_MINIMO} caracteres. Se muestra una sola vez al crear.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={ocupado}>
          <UserPlusIcon aria-hidden="true" />
          Crear usuario
        </Button>
        <Button type="button" variant="ghost" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function RestablecerClave({ usuario, ocupado, alCancelar, alGuardar }) {
  const [clave, setClave] = useState(generarClave)
  const id = `clave-${usuario}`
  return (
    <form
      className="mt-2 flex flex-col gap-2 text-left"
      onSubmit={(e) => {
        e.preventDefault()
        if (clave.length >= LARGO_MINIMO) alGuardar(clave)
      }}
    >
      <label htmlFor={id} className="text-xs font-medium">
        Contraseña nueva para {usuario}
      </label>
      <CampoClave id={id} valor={clave} alCambiar={setClave} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={ocupado || clave.length < LARGO_MINIMO}>
          Guardar contraseña
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Cierra las sesiones abiertas de {usuario}.</p>
    </form>
  )
}
