import { ChatAsistente } from '@/components/asistente/ChatAsistente.jsx'
import { ExplicacionesMovimientos } from '@/components/asistente/ExplicacionesMovimientos.jsx'
import { GraficosAsistente } from '@/components/asistente/GraficosAsistente.jsx'
import { Pagina } from './Pagina.jsx'

// Asistente IA (#62): chat de exploración (#3), gráficos de lo que se pregunta (#108) y explicación
// de movimientos (#2). La IA explica y consulta lo que calcula el motor; nunca calcula (contracts/ia.md).
export default function Asistente() {
  return (
    <Pagina
      titulo="Asistente IA"
      descripcion="Pregunta por los rankings en lenguaje natural: el asistente responde y muestra los gráficos de lo que pediste. Los cálculos son del motor determinista."
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ChatAsistente />
        <div className="flex min-w-0 flex-col gap-6">
          <GraficosAsistente conAyuda />
          <ExplicacionesMovimientos />
        </div>
      </div>
    </Pagina>
  )
}
