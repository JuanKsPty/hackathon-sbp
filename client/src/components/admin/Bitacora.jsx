import { useMemo, useState } from 'react'
import { FileDownIcon, RotateCwIcon } from 'lucide-react'
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
  GRUPOS_OPERACION,
  NOMBRES_OPERACION,
  NOMBRES_PERFIL_BITACORA,
  NOMBRES_RESULTADO,
  descargarCsv,
  formatearFechaHora,
} from './formato.js'

const POR_PAGINA = 50
const CAMPO = 'h-8 rounded-md border border-input bg-background px-2 text-sm'
const TODOS = ''

const nombreOperacion = (o) => NOMBRES_OPERACION[o.operacion] ?? o.operacion

// Registro de operaciones (GET /api/bitacora, #31): qué se hizo, con qué archivo, cuándo, quién
// (usuario y perfil) y con qué resultado. Se filtra y se descarga en el navegador: es un registro
// básico, de cientos de filas. version cambia cuando la página hace una carga o un cambio.
export function Bitacora({ version }) {
  const { perfil } = usePerfil()
  const { datos, error, cargando, reintentar } = useConsulta((opciones) => leerBitacora(perfil, opciones), [perfil, version])
  const [grupo, setGrupo] = useState(TODOS)
  const [perfilFiltro, setPerfilFiltro] = useState(TODOS)
  const [resultado, setResultado] = useState(TODOS)
  const [texto, setTexto] = useState('')
  const [visibles, setVisibles] = useState(POR_PAGINA)

  const filtradas = useMemo(() => {
    if (!datos) return []
    const operaciones = GRUPOS_OPERACION.find((g) => g.valor === grupo)?.operaciones
    const buscado = texto.trim().toLowerCase()
    return datos.operaciones.filter(
      (o) =>
        (!operaciones || operaciones.includes(o.operacion)) &&
        (!perfilFiltro || o.perfil === perfilFiltro) &&
        (!resultado || o.resultado === resultado) &&
        (!buscado || [nombreOperacion(o), o.detalle, o.archivo, o.usuario].some((v) => v && String(v).toLowerCase().includes(buscado))),
    )
  }, [datos, grupo, perfilFiltro, resultado, texto])

  const hayFiltros = grupo || perfilFiltro || resultado || texto
  const limpiar = () => {
    setGrupo(TODOS)
    setPerfilFiltro(TODOS)
    setResultado(TODOS)
    setTexto('')
  }
  const filtro = (valor, setter) => (e) => {
    setter(e.target.value)
    setVisibles(POR_PAGINA)
    return valor
  }

  function descargar() {
    const hoy = new Date().toISOString().slice(0, 10)
    descargarCsv(`bitacora_${hoy}.csv`, [
      { titulo: 'Fecha_Hora', valor: (o) => o.fecha_hora },
      { titulo: 'Operacion', valor: nombreOperacion },
      { titulo: 'Detalle', valor: (o) => o.detalle },
      { titulo: 'Archivo', valor: (o) => o.archivo },
      { titulo: 'Usuario', valor: (o) => o.usuario },
      { titulo: 'Perfil', valor: (o) => NOMBRES_PERFIL_BITACORA[o.perfil] ?? o.perfil },
      { titulo: 'Resultado', valor: (o) => NOMBRES_RESULTADO[o.resultado] ?? o.resultado },
    ], filtradas)
  }

  let contenido
  if (cargando && !datos) contenido = <Cargando filas={5} />
  else if (error) contenido = <ErrorApi error={error} alReintentar={reintentar} />
  else if (datos.operaciones.length === 0) contenido = <Vacio titulo="Todavía no hay operaciones registradas" />
  else {
    const filas = filtradas.slice(0, visibles)
    contenido = (
      <>
        <div className="flex flex-wrap items-end gap-2" role="search" aria-label="Filtrar el registro de operaciones">
          <label className="flex flex-col gap-1 text-xs font-medium">
            Tipo
            <select className={CAMPO} value={grupo} onChange={filtro(grupo, setGrupo)}>
              <option value={TODOS}>Todas</option>
              {GRUPOS_OPERACION.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Perfil
            <select className={CAMPO} value={perfilFiltro} onChange={filtro(perfilFiltro, setPerfilFiltro)}>
              <option value={TODOS}>Todos</option>
              {Object.entries(NOMBRES_PERFIL_BITACORA).map(([valor, nombre]) => (
                <option key={valor} value={valor}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Resultado
            <select className={CAMPO} value={resultado} onChange={filtro(resultado, setResultado)}>
              <option value={TODOS}>Todos</option>
              {Object.entries(NOMBRES_RESULTADO).map(([valor, nombre]) => (
                <option key={valor} value={valor}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium">
            Buscar
            <input
              type="search"
              className={CAMPO}
              placeholder="Archivo, usuario, período o ruta"
              value={texto}
              onChange={filtro(texto, setTexto)}
            />
          </label>
          {hayFiltros && (
            <Button variant="ghost" size="sm" onClick={limpiar}>
              Quitar filtros
            </Button>
          )}
        </div>

        {filtradas.length === 0 ? (
          <Vacio titulo="Ninguna operación coincide con los filtros" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Operación y detalle</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Quién</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((o, i) => (
                  <TableRow key={`${o.fecha_hora}-${i}`}>
                    <TableCell className="text-xs whitespace-nowrap">{formatearFechaHora(o.fecha_hora)}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal">
                      <div>{nombreOperacion(o)}</div>
                      {o.detalle && <div className="text-xs break-words text-muted-foreground">{o.detalle}</div>}
                    </TableCell>
                    <TableCell className="max-w-48 font-mono text-xs whitespace-normal break-all">{o.archivo ?? '—'}</TableCell>
                    <TableCell className="whitespace-normal">
                      <div>{NOMBRES_PERFIL_BITACORA[o.perfil] ?? o.perfil}</div>
                      {o.usuario && <div className="font-mono text-xs text-muted-foreground">{o.usuario}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge className={COLOR_RESULTADO[o.resultado] ?? ''}>{NOMBRES_RESULTADO[o.resultado] ?? o.resultado}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {filas.length} de {filtradas.length}
            {hayFiltros ? ` que coinciden (de ${datos.total} en total)` : ''}.
          </p>
          {filtradas.length > filas.length && (
            <Button variant="outline" size="sm" onClick={() => setVisibles((v) => v + POR_PAGINA)}>
              Mostrar {Math.min(POR_PAGINA, filtradas.length - filas.length)} más
            </Button>
          )}
        </div>
      </>
    )
  }

  return (
    <Card data-guia="admin.bitacora">
      <CardHeader>
        <CardTitle>Registro de operaciones</CardTitle>
        <CardDescription>
          Cargas de archivos, cambios de parámetros, permisos y usuarios, inicios de sesión y accesos denegados, de la más reciente
          a la más antigua.
          {datos ? ` Total: ${datos.total}.` : ''}
        </CardDescription>
        <CardAction className="flex gap-2">
          <Button variant="outline" size="sm" onClick={descargar} disabled={!datos || filtradas.length === 0}>
            <FileDownIcon aria-hidden="true" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={reintentar} disabled={cargando}>
            <RotateCwIcon aria-hidden="true" />
            Actualizar
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{contenido}</CardContent>
    </Card>
  )
}
