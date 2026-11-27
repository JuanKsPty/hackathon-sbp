import { ArrowRightIcon, CheckCircle2Icon, DownloadIcon, XCircleIcon } from 'lucide-react'
import { Link } from 'react-router'
import { urlDescarga } from '@/api/cliente.js'
import { EstadoControl } from '@/components/calidad/EstadoControl.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatearPeriodo } from '@/lib/formato.js'
import { cumple } from './puntos.js'

// Una tarjeta por punto de la sección 11.1: qué pide el jurado, el dato que devuelve el API
// (`children`), el estado de sus chequeos de la sección 12, el enlace a la página donde vive el
// dato y el CSV del entregable que lo respalda.
export function PuntoVerificacion({ punto, resultado, periodo, banco, children }) {
  const alcance = punto.alcance === 'periodo' ? `Período: ${formatearPeriodo(periodo)}` : 'Todos los períodos cargados'
  const rutaCsv = urlDescarga(punto.csv.tipo, punto.alcance === 'periodo' ? { periodo } : {})

  return (
    // id: ancla del resumen de arriba. data-guia: identificador para el agente guía (contracts/guia.md, #72).
    <Card id={`punto-${punto.numero}`} data-guia={punto.guia} className="scroll-mt-44">
      <CardHeader>
        <CardTitle className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {punto.numero}
          </span>
          <span>
            <span className="sr-only">Punto {punto.numero}: </span>
            {resultado.titulo}
          </span>
        </CardTitle>
        <CardDescription>El jurado pide: {punto.pide}</CardDescription>
        <CardAction>
          <EstadoControl ok={cumple(resultado)} textoOk="Cumple" textoMal="No cumple" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          {alcance}
          {punto.alcance === 'periodo' && banco ? ` · Banco: ${banco.Banco} (${banco.Codigo_Banco})` : ''}
        </p>
        {children}
        <Chequeos chequeos={resultado.chequeos} />
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={punto.verEn.ruta}>
            Ver en la app: {punto.verEn.nombre}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={rutaCsv} download>
            <DownloadIcon aria-hidden="true" />
            {punto.csv.nombre} · entregable {punto.csv.entregable}
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}

// Chequeos de la sección 12 de este punto: el `ok` de cada uno lo calcula el API.
function Chequeos({ chequeos }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">Chequeos de la lista de autoverificación</p>
      <ul className="flex flex-col gap-1.5">
        {chequeos.map((c) => (
          <li key={c.nombre} className="flex items-start gap-2 text-sm">
            {c.ok ? (
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-sube" aria-hidden="true" />
            ) : (
              <XCircleIcon className="mt-0.5 size-4 shrink-0 text-baja" aria-hidden="true" />
            )}
            <span>
              <span className="sr-only">{c.ok ? 'Cumple: ' : 'No cumple: '}</span>
              {c.nombre}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
