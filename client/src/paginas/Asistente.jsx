import { ChatAsistente } from '@/components/asistente/ChatAsistente.jsx'
import { ExplicacionesMovimientos } from '@/components/asistente/ExplicacionesMovimientos.jsx'
import { Pagina } from './Pagina.jsx'

// Asistente IA (#62): chat de exploración (#3) y explicación de movimientos (#2).
// La IA explica y consulta lo que calcula el motor; nunca calcula (contracts/ia.md).
export default function Asistente() {
  return (
    <Pagina
      titulo="Asistente IA"
      descripcion="Pregunta por los rankings en lenguaje natural y revisa por qué se movió cada banco. Los cálculos son del motor determinista."
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChatAsistente />
        <ExplicacionesMovimientos />
      </div>
    </Pagina>
  )
}
