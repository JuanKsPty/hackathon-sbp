import { useCallback, useEffect, useRef, useState } from 'react'
import { DatabaseIcon, ScrollTextIcon, SlidersHorizontalIcon, UsersIcon } from 'lucide-react'
import { Bitacora } from '@/components/admin/Bitacora.jsx'
import { CargaPeriodo } from '@/components/admin/CargaPeriodo.jsx'
import { EstadoCatalogos } from '@/components/admin/EstadoCatalogos.jsx'
import { PerfilesPermisos } from '@/components/admin/PerfilesPermisos.jsx'
import { ReglaSignificativo } from '@/components/admin/ReglaSignificativo.jsx'
import { SoloAdministrador } from '@/components/admin/SoloAdministrador.jsx'
import { Usuarios } from '@/components/admin/Usuarios.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { Pagina } from './Pagina.jsx'

const DESCRIPCION = 'Datos, parámetros y catálogos, usuarios y permisos, y el registro de operaciones.'

// Las cuatro tareas del Administrador (lámina 6), en el orden en que se hacen.
const TAREAS = [
  { id: 'datos', nombre: 'Cargar datos', icono: DatabaseIcon },
  { id: 'parametros', nombre: 'Parámetros y catálogos', icono: SlidersHorizontalIcon },
  { id: 'usuarios', nombre: 'Usuarios y permisos', icono: UsersIcon },
  { id: 'registro', nombre: 'Registro de operaciones', icono: ScrollTextIcon },
]

// Cada tarea es una pestaña. Todas quedan montadas (forceMount) y las cerradas solo se ocultan: así no
// se pierde lo que se estaba haciendo al cambiar de pestaña (un archivo elegido, el resultado de una
// carga, un formulario a medias).
function Tarea({ id, titulo, descripcion, children }) {
  return (
    <TabsContent
      value={id}
      forceMount
      data-tarea={id}
      className="flex flex-col gap-4 pt-2 data-[state=inactive]:hidden"
    >
      <div className="flex flex-col gap-0.5 border-b pb-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {titulo}
        </h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {children}
    </TabsContent>
  )
}

// La pestaña inicial sale del hash (/admin#usuarios) para poder enlazar una tarea.
function tareaDelHash() {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1)
  return TAREAS.some((t) => t.id === hash) ? hash : TAREAS[0].id
}

// Página /admin (#66), solo para el perfil Administrador (lámina 6 y sección 10, entregable 8):
// cargar o actualizar un período; administrar parámetros y catálogos; configurar usuarios, perfiles y
// permisos; y consultar el registro de operaciones. Cada tarea va en su pestaña. Si el agente guía
// señala una tarjeta de una pestaña cerrada, esperarElemento (guia/dom.js) lanza 'guia:revelar' desde
// ella y aquí se abre su pestaña.
// Fuente, período y aviso de datos ficticios los muestra la BarraFuente del layout.
export default function Admin() {
  const { perfil, puede } = usePerfil()
  // Cada carga o cambio sube la versión para que la bitácora se vuelva a pedir.
  const [version, setVersion] = useState(0)
  const avisarCambio = useCallback(() => setVersion((n) => n + 1), [])
  const [tarea, setTarea] = useState(tareaDelHash)
  const raiz = useRef(null)

  const elegirTarea = useCallback((id) => {
    setTarea(id)
    window.history.replaceState(window.history.state, '', `#${id}`)
  }, [])

  // El agente guía pide abrir la pestaña que contiene la tarjeta que va a señalar.
  useEffect(() => {
    const el = raiz.current
    if (!el) return undefined
    const revelar = (evento) => {
      const panel = evento.target.closest?.('[data-tarea]')
      if (panel && panel.dataset.tarea !== tarea) setTarea(panel.dataset.tarea)
    }
    el.addEventListener('guia:revelar', revelar)
    return () => el.removeEventListener('guia:revelar', revelar)
  }, [tarea, perfil])

  if (perfil !== 'admin') {
    return (
      <Pagina titulo="Administración" descripcion={DESCRIPCION}>
        <SoloAdministrador perfil={perfil} />
      </Pagina>
    )
  }

  return (
    <Pagina titulo="Administración" descripcion={DESCRIPCION}>
      <Tabs ref={raiz} value={tarea} onValueChange={elegirTarea} className="-mt-2 gap-4">
        <TabsList aria-label="Tareas de Administración" className="h-auto! w-full flex-wrap justify-start sm:w-fit">
          {TAREAS.map(({ id, nombre, icono: Icono }) => (
            <TabsTrigger key={id} value={id} className="h-8 flex-none px-3">
              <Icono aria-hidden="true" />
              {nombre}
            </TabsTrigger>
          ))}
        </TabsList>

        <Tarea id="datos" titulo="Cargar datos" descripcion="Sube un AT03 nuevo o reemplaza un período. El ranking, la calidad y los movimientos se recalculan solos.">
          <CargaPeriodo alCambiar={avisarCambio} />
        </Tarea>

        <Tarea id="parametros" titulo="Parámetros y catálogos" descripcion="La regla que decide qué movimiento es significativo y los catálogos con los que se clasifica.">
          <div className="max-w-2xl">
            <ReglaSignificativo alCambiar={avisarCambio} />
          </div>
          <EstadoCatalogos />
        </Tarea>

        <Tarea id="usuarios" titulo="Usuarios y permisos" descripcion="Quién entra al sitio interno, con qué perfil, y qué puede hacer cada perfil.">
          {puede('gestionar_usuarios') && <Usuarios alCambiar={avisarCambio} />}
          {puede('configurar_permisos') && <PerfilesPermisos alCambiar={avisarCambio} />}
        </Tarea>

        <Tarea id="registro" titulo="Registro de operaciones" descripcion="Qué se hizo, cuándo, quién y con qué resultado.">
          <Bitacora version={version} />
        </Tarea>
      </Tabs>
    </Pagina>
  )
}
