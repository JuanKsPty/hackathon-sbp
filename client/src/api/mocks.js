// Modo mock: responde con los ejemplos JSON de /contracts en lugar de llamar al API.
// Solo se carga con import() desde cliente.js cuando corre `npm run dev` con VITE_USAR_MOCKS=true;
// el build de producción no lo incluye (regla R2: nada de saldos ni posiciones en el bundle).
// Los números de los contratos son ilustrativos: sirven para maquetar, no para la demo.
import { ApiError } from './errores.js'

// Si /contracts no existe (por ejemplo, en la imagen Docker del client) queda vacío.
const contratos = import.meta.glob('../../../contracts/*.json', { eager: true, import: 'default' })

function contrato(nombre) {
  const entrada = Object.entries(contratos).find(([ruta]) => ruta.endsWith(`/contracts/${nombre}.json`))
  return entrada ? structuredClone(entrada[1]) : null
}

function sinMock(ruta) {
  return new ApiError({
    status: 0,
    codigo: 'MOCK_NO_DISPONIBLE',
    mensaje: `No hay un ejemplo en contracts/ para /api${ruta}. Agrega el JSON del contrato o apaga VITE_USAR_MOCKS.`,
  })
}

// ruta del API -> archivo de /contracts
const ARCHIVOS = {
  '/periodos': 'periodos',
  '/catalogos': 'catalogos',
  '/rankings': 'rankings',
  '/subactividades': 'subactividades',
  '/calidad': 'calidad',
  '/excluidas': 'excluidas',
  '/movimientos': 'movimientos',
  '/perfil': 'perfil',
}

export async function responderConMock(ruta) {
  // Una pequeña espera para ver los estados de carga.
  await new Promise((listo) => setTimeout(listo, 250))

  if (ruta === '/salud') {
    // /api/salud no tiene archivo propio: se arma con los períodos del ejemplo.
    const ejemplo = contrato('periodos')
    if (!ejemplo) throw sinMock(ruta)
    return { ok: true, periodos: ejemplo.periodos.map((p) => p.Fecha) }
  }

  const nombre = ARCHIVOS[ruta]
  const ejemplo = nombre ? contrato(nombre) : null
  if (!ejemplo) throw sinMock(ruta)
  return ejemplo
}
