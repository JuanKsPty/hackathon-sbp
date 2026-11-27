import { useCallback, useState } from 'react'
import { DatabaseIcon, ScrollTextIcon, SlidersHorizontalIcon, UsersIcon } from 'lucide-react'
import { Bitacora } from '@/components/admin/Bitacora.jsx'
import { CargaPeriodo } from '@/components/admin/CargaPeriodo.jsx'
import { EstadoCatalogos } from '@/components/admin/EstadoCatalogos.jsx'
import { PerfilesPermisos } from '@/components/admin/PerfilesPermisos.jsx'
import { ReglaSignificativo } from '@/components/admin/ReglaSignificativo.jsx'
import { SoloAdministrador } from '@/components/admin/SoloAdministrador.jsx'
import { Usuarios } from '@/components/admin/Usuarios.jsx'
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

function Tarea({ id, titulo, descripcion, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-col gap-0.5 border-b pb-2">
        <h2 id={`${id}-titulo`} className="text-lg font-semibold tracking-tight">
          {titulo}
        </h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {children}
    </section>
  )
}

// Página /admin (#66), solo para el perfil Administrador (lámina 6 y sección 10, entregable 8):
// cargar o actualizar un período; administrar parámetros y catálogos; configurar usuarios, perfiles y
// permisos; y consultar el registro de operaciones. Todo queda en la misma página (el agente guía
// señala cualquier tarjeta por su data-guia) y el índice de arriba lleva a cada tarea.
// Fuente, período y aviso de datos ficticios los muestra la BarraFuente del layout.
export default function Admin() {
  const { perfil, puede } = usePerfil()
  // Cada carga o cambio sube la versión para que la bitácora se vuelva a pedir.
  const [version, setVersion] = useState(0)
  const avisarCambio = useCallback(() => setVersion((n) => n + 1), [])

  if (perfil !== 'admin') {
    return (
      <Pagina titulo="Administración" descripcion={DESCRIPCION}>
        <SoloAdministrador perfil={perfil} />
      </Pagina>
    )
  }

  return (
    <Pagina titulo="Administración" descripcion={DESCRIPCION}>
      <nav aria-label="Tareas de Administración" className="-mt-2">
        <ul className="flex flex-wrap gap-2">
          {TAREAS.map(({ id, nombre, icono: Icono }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Icono className="size-4" aria-hidden="true" />
                {nombre}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Tarea id="datos" titulo="Cargar datos" descripcion="Sube un AT03 nuevo o reemplaza un período. El ranking, la calidad y los movimientos se recalculan solos.">
        <CargaPeriodo alCambiar={avisarCambio} />
      </Tarea>

      <Tarea id="parametros" titulo="Parámetros y catálogos" descripcion="La regla que decide qué movimiento es significativo y los catálogos con los que se clasifica.">
        <div className="grid gap-6 xl:grid-cols-2">
          <ReglaSignificativo alCambiar={avisarCambio} />
          <EstadoCatalogos />
        </div>
      </Tarea>

      <Tarea id="usuarios" titulo="Usuarios y permisos" descripcion="Quién entra al sitio interno, con qué perfil, y qué puede hacer cada perfil.">
        {puede('gestionar_usuarios') && <Usuarios alCambiar={avisarCambio} />}
        {puede('configurar_permisos') && <PerfilesPermisos alCambiar={avisarCambio} />}
      </Tarea>

      <Tarea id="registro" titulo="Registro de operaciones" descripcion="Qué se hizo, cuándo, quién y con qué resultado.">
        <Bitacora version={version} />
      </Tarea>
    </Pagina>
  )
}
