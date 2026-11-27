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
  '/indicadores': 'indicadores',
  '/perfil': 'perfil',
}

// Perfil mínimo que pide cada opción (contracts/perfiles.md). perfil.json es la respuesta de
// Administrador: para los demás perfiles se filtra con esta tabla. Una opción que no esté aquí
// se trata como de Administrador.
const ORDEN_PERFILES = ['publico', 'analista', 'admin']
const PERFIL_MINIMO = {
  consultar_rankings: 'publico',
  descargar: 'publico',
  comparar_periodos: 'analista',
  comparar_entidades: 'analista',
  reportes_personalizados: 'analista',
}

// GET /api/perfil respeta el perfil elegido (header X-Perfil), como el API real.
function mockPerfil(ejemplo, perfil) {
  const elegido = ORDEN_PERFILES.includes(perfil) ? perfil : 'publico'
  const nivel = ORDEN_PERFILES.indexOf(elegido)
  return {
    ...ejemplo,
    perfil: elegido,
    nombre: ejemplo.perfiles.find((p) => p.perfil === elegido)?.nombre ?? elegido,
    opciones: ejemplo.opciones.filter(({ opcion }) => ORDEN_PERFILES.indexOf(PERFIL_MINIMO[opcion] ?? 'admin') <= nivel),
  }
}

export async function responderConMock(ruta, parametros, perfil) {
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
  return ruta === '/perfil' ? mockPerfil(ejemplo, perfil) : ejemplo
}
