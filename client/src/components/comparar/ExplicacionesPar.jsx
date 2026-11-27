import { CrownIcon, MessageSquareTextIcon } from 'lucide-react'
import { ETIQUETA_EXPLICACION, explicaciones as pedirExplicaciones } from '@/api/ia.js'
import { EtiquetaIA, FuenteExplicacion } from '@/components/asistente/EtiquetaIA.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Badge } from '@/components/ui/badge'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { Estado } from './Estado.jsx'

// Frases de GET /api/explicaciones para el par de períodos y el ranking elegidos. Cada una dice si la
// redactó la IA (verificada contra el motor) o salió por reglas. La IA nunca calcula: solo redacta.
export function ExplicacionesPar({ desde, hasta, ranking, activa }) {
  const { perfil } = usePerfil()
  const pedir = Boolean(activa && desde && hasta && ranking)
  const consulta = useConsulta(
    (opciones) => pedirExplicaciones({ desde, hasta, ranking }, { ...opciones, perfil }),
    [desde, hasta, ranking, perfil],
    { activa: pedir },
  )

  const datos = consulta.datos
  const items = Array.isArray(datos?.items) ? datos.items : []
  return (
    <Estado consulta={consulta} activa={pedir}>
      {items.length === 0 ? (
        <Vacio
          icono={MessageSquareTextIcon}
          titulo="Sin movimientos para explicar"
          descripcion={`En ${ranking} no hubo movimientos significativos ni cambio de líder entre estos períodos.`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <EtiquetaIA texto={datos.etiqueta || ETIQUETA_EXPLICACION} porReglas={!items.some((i) => i.fuente === 'ia')} />
          {datos.motivo && <p className="text-xs text-aviso">{datos.motivo}</p>}
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.tipo === 'cambio_lider' ? (
                    <Badge>
                      <CrownIcon aria-hidden="true" />
                      Cambio de líder
                    </Badge>
                  ) : (
                    <Badge variant="ghost" className="text-muted-foreground">
                      Movimiento significativo
                    </Badge>
                  )}
                  <span className="ml-auto">
                    <FuenteExplicacion fuente={item.fuente} />
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{item.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Estado>
  )
}
