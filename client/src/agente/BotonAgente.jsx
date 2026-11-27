// Botón del agente, arriba a la derecha del encabezado: es la única entrada al asistente IA en todas
// las páginas. Abre y minimiza el chat flotante (AgenteFlotante). Su posición es el origen del cursor
// en la demostración (#123): por eso lleva la referencia `boton` del contexto.
import { BotIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgente } from './AgenteContext.jsx'

export function BotonAgente() {
  const { abierto, alternar, boton } = useAgente()
  const Icono = abierto ? XIcon : BotIcon
  return (
    <Button
      ref={boton}
      size="sm"
      onClick={alternar}
      aria-expanded={abierto}
      aria-controls="agente-flotante"
      aria-label={abierto ? 'Minimizar el asistente IA' : 'Abrir el asistente IA'}
      data-guia="global.abrir-asistente"
    >
      <Icono aria-hidden="true" />
      <span>Asistente IA</span>
    </Button>
  )
}
