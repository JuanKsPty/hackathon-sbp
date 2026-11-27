import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Los 6 rankings, con el nombre exacto que trae GET /api/catalogos (nada fijado a mano).
// En celular la fila de pestañas se desplaza de lado.
export function SelectorRanking({ rankings, valor, alCambiar }) {
  return (
    <Tabs value={valor} onValueChange={alCambiar}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList aria-label="Ranking" data-guia="rankings.selector-ranking">
          {rankings.map(({ Ranking }) => (
            <TabsTrigger key={Ranking} value={Ranking} className="px-3">
              {Ranking}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
