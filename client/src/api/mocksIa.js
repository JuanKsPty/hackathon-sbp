// Modo mock de los endpoints de IA (contracts/ia.md). Solo lo carga api/ia.js con import() cuando
// corre `npm run dev` con VITE_USAR_MOCKS=true; el build de producción no lo incluye (regla R2).
// Los textos y números son ilustrativos (los del ejemplo del contrato): sirven para maquetar.
//
// Para ver el aviso "IA no disponible": VITE_MOCK_IA=false en el .env de la raíz del repo
// (vite.config.js lee el .env de la raíz).
// Para ver una respuesta no verificada: pregunta algo con "pronóstico" o "predice".
import { ApiError } from './errores.js'
import { AVISO_RESPALDO, FUENTE_RESPALDO } from './fuente.js'
import { ETIQUETA_EXPLICACION, ETIQUETA_RESPUESTA } from './ia.js'

const ETIQUETA_REGLAS = 'Explicación automática por reglas · los cálculos provienen del motor determinista'
const MOTIVO_SIN_KEY = 'IA no disponible: falta ANTHROPIC_API_KEY en el .env del servidor'

const iaDisponible = () => import.meta.env.VITE_MOCK_IA !== 'false'

function esperar(milisegundos, signal) {
  return new Promise((listo, fallo) => {
    const reloj = setTimeout(listo, milisegundos)
    signal?.addEventListener('abort', () => {
      clearTimeout(reloj)
      fallo(new DOMException('Petición cancelada', 'AbortError'))
    })
  })
}

const encabezado = () => ({ fuente: FUENTE_RESPALDO, aviso: AVISO_RESPALDO })

function mockExplicaciones({ desde = '20260831', hasta = '20260930', ranking } = {}, perfil) {
  if (perfil === 'publico') {
    throw new ApiError({
      status: 403,
      codigo: 'PERFIL_NO_AUTORIZADO',
      mensaje: 'Las explicaciones de movimientos son para los perfiles Analista y Administrador.',
    })
  }
  const disponible = iaDisponible()
  const items = [
    {
      id: 'COMERCIO:lider', Ranking: 'COMERCIO', Codigo_Banco: '112', tipo: 'cambio_lider',
      texto: 'Banco Solidez pasa a liderar COMERCIO y desplaza a Banco Regional.', fuente: 'reglas',
    },
    {
      id: 'COMERCIO:108', Ranking: 'COMERCIO', Codigo_Banco: '108', tipo: 'movimiento',
      texto: 'Banco Capital sube 4 posiciones en COMERCIO (del 7.º al 3.º), con una variación de saldo de +21.07%.',
      fuente: disponible ? 'ia' : 'reglas',
    },
    {
      id: 'HIPOTECARIO:101', Ranking: 'HIPOTECARIO', Codigo_Banco: '101', tipo: 'movimiento',
      texto: 'Banco Istmo baja 2 posiciones en HIPOTECARIO (del 2.º al 4.º).', fuente: 'reglas',
    },
  ].filter((item) => !ranking || item.Ranking === ranking)
  return {
    ...encabezado(),
    periodo_anterior: desde,
    periodo_actual: hasta,
    ia_disponible: disponible,
    motivo: disponible ? null : MOTIVO_SIN_KEY,
    etiqueta: disponible ? ETIQUETA_EXPLICACION : ETIQUETA_REGLAS,
    items,
  }
}

function mockPreguntar({ pregunta = '' } = {}) {
  const base = { ...encabezado(), pregunta, etiqueta: ETIQUETA_RESPUESTA }
  if (!iaDisponible()) {
    return { ...base, ia_disponible: false, motivo: MOTIVO_SIN_KEY, respuesta: null, verificada: false, consultas: [] }
  }
  if (/pron[oó]stico|predic|futuro/i.test(pregunta)) {
    return {
      ...base,
      ia_disponible: true,
      motivo: 'La IA no pudo responder solo con números verificados del motor; prueba con una pregunta más concreta.',
      respuesta: null,
      verificada: false,
      consultas: [{ herramienta: 'listar_periodos', entrada: {}, ok: true, ruta: '/periodos' }],
    }
  }
  return {
    ...base,
    ia_disponible: true,
    motivo: null,
    respuesta:
      'Respuesta de ejemplo (modo mock). En el período 20260930 lidera **HIPOTECARIO** Banco Solidez.\n' +
      'Con el API encendido, aquí llega la respuesta de la IA verificada contra el motor.',
    verificada: true,
    consultas: [
      { herramienta: 'listar_periodos', entrada: {}, ok: true, ruta: '/periodos' },
      {
        herramienta: 'consultar_rankings',
        entrada: { periodo: '20260930', ranking: 'HIPOTECARIO' },
        ok: true,
        ruta: '/rankings?periodo=20260930&ranking=HIPOTECARIO',
      },
    ],
  }
}

export async function responderConMockIA(ruta, { parametros, cuerpo, perfil, signal } = {}) {
  if (ruta === '/ia/estado') {
    await esperar(150, signal)
    return { ia_disponible: iaDisponible(), modelo: iaDisponible() ? 'mock' : null }
  }
  if (ruta === '/explicaciones') {
    await esperar(400, signal)
    return mockExplicaciones(parametros, perfil)
  }
  if (ruta === '/ia/preguntar') {
    await esperar(900, signal)
    return mockPreguntar(cuerpo)
  }
  throw new ApiError({
    status: 0,
    codigo: 'MOCK_NO_DISPONIBLE',
    mensaje: `No hay mock de IA para /api${ruta}. Apaga VITE_USAR_MOCKS para usar el API.`,
  })
}
