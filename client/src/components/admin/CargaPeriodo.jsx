import { useState } from 'react'
import { Loader2Icon, UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cargarPeriodo } from '@/api/admin.js'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { ErrorDeCarga } from './ErrorDeCarga.jsx'
import { ResultadoCarga } from './ResultadoCarga.jsx'

// Carga o actualización de un período: sube un AT03 a POST /api/periodos (#29) y muestra
// la cascada E1–E4, el universo y los cambios de ranking. alCambiar avisa a la bitácora.
export function CargaPeriodo({ alCambiar }) {
  const { perfil } = usePerfil()
  const { reintentar: recargarPeriodos } = usePeriodo()
  const [archivo, setArchivo] = useState(null)
  const [estado, setEstado] = useState({ cargando: false, resultado: null, error: null })

  async function enviar(evento) {
    evento.preventDefault()
    if (!archivo) return
    setEstado({ cargando: true, resultado: null, error: null })
    try {
      const resultado = await cargarPeriodo(perfil, archivo)
      setEstado({ cargando: false, resultado, error: null })
      recargarPeriodos() // el período nuevo aparece en el selector del encabezado y en todas las páginas
    } catch (error) {
      setEstado({ cargando: false, resultado: null, error })
    }
    alCambiar?.() // la bitácora registra la carga, con éxito o con error
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cargar o actualizar un período</CardTitle>
        <CardDescription>
          Sube un archivo AT03 (.csv, 61 columnas). El período sale del campo Fecha; si ya estaba cargado, se
          reemplaza. Si el archivo no es válido no se guarda nada.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={enviar} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="archivo-at03">
            Archivo AT03
          </label>
          <input
            id="archivo-at03"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          />
          <Button type="submit" disabled={!archivo || estado.cargando}>
            {estado.cargando ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <UploadIcon aria-hidden="true" />
            )}
            {estado.cargando ? 'Procesando…' : 'Cargar período'}
          </Button>
        </form>

        <div aria-live="polite" className="flex flex-col gap-4">
          {estado.error && <ErrorDeCarga error={estado.error} />}
          {estado.resultado && <ResultadoCarga resultado={estado.resultado} />}
        </div>
      </CardContent>
    </Card>
  )
}
