// Botón flotante del agente, abajo a la derecha de todas las páginas: es la única entrada al asistente
// IA. Abre y minimiza el chat flotante (AgenteFlotante), que aparece justo encima. Su posición es el
// origen del cursor en la demostración (#123): por eso lleva la referencia `boton` del contexto.
import { BotIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgente } from './AgenteContext.jsx'

export function BotonAgente() {
  const { abierto, alternar, boton } = useAgente()
  const Icono = abierto ? XIcon : BotIcon
  return (
    <Button
      ref={boton}
      onClick={alternar}
      aria-expanded={abierto}
      aria-controls="agente-flotante"
      aria-label={abierto ? 'Minimizar el asistente IA' : 'Abrir el asistente IA'}
      title={abierto ? 'Minimizar el asistente IA' : 'Asistente IA'}
      data-guia="global.abrir-asistente"
      className="fixed right-4 bottom-14 z-40 size-12 rounded-full shadow-lg"
    >
      <Icono aria-hidden="true" className="size-5" />
    </Button>
  )
}
