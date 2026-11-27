import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Pestañas para elegir un ranking. Se desplazan en horizontal si no caben (360 px).
export function SelectorRanking({ rankings, valor, onCambio, etiqueta = 'Ranking' }) {
  if (rankings.length < 2) return null
  return (
    <Tabs value={valor} onValueChange={onCambio}>
      <div className="max-w-full overflow-x-auto">
        <TabsList aria-label={etiqueta}>
          {rankings.map((r) => (
            <TabsTrigger key={r} value={r} className="px-2.5">
              {r}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
