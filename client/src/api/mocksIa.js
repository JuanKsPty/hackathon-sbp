// Modo mock de los endpoints de IA (contracts/ia.md). Solo lo carga api/ia.js con import() cuando
// corre `npm run dev` con VITE_USAR_MOCKS=true; el build de producción no lo incluye (regla R2).
// Valores ilustrativos de modo mock, no son resultados del motor (R2): bancos "Banco Ejemplo A/B/C",
// códigos EJ-* y cifras redondas, solo para maquetar los estados de la pantalla.
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
  // Valores ilustrativos de modo mock, no son resultados del motor (R2).
  const items = [
    {
      id: 'COMERCIO:lider', Ranking: 'COMERCIO', Codigo_Banco: 'EJ-A', tipo: 'cambio_lider',
      texto: 'Banco Ejemplo A pasa a liderar COMERCIO y desplaza a Banco Ejemplo B (texto de ejemplo).', fuente: 'reglas',
    },
    {
      id: 'COMERCIO:EJ-C', Ranking: 'COMERCIO', Codigo_Banco: 'EJ-C', tipo: 'movimiento',
      texto: 'Banco Ejemplo C sube 2 posiciones en COMERCIO (del 5.º al 3.º), con una variación de saldo de +10.00% (texto de ejemplo).',
      fuente: disponible ? 'ia' : 'reglas',
    },
    {
      id: 'HIPOTECARIO:EJ-B', Ranking: 'HIPOTECARIO', Codigo_Banco: 'EJ-B', tipo: 'movimiento',
      texto: 'Banco Ejemplo B baja 1 posición en HIPOTECARIO (del 2.º al 3.º) (texto de ejemplo).', fuente: 'reglas',
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
  // Cursor guía (#72): preguntas de "cómo" o "dónde" traen pasos para probar la guía sin IA.
  if (/c[oó]mo|d[oó]nde/i.test(pregunta)) {
    return {
      ...base,
      ia_disponible: true,
      motivo: null,
      respuesta: 'Guía de ejemplo (modo mock): te muestro en la pantalla cómo ver un ranking y su desglose.',
      verificada: true,
      consultas: [],
      guia: {
        pasos: [
          { ruta: null, guia: 'global.menu-rankings', texto: 'Entra a Rankings desde el menú.' },
          { ruta: '/rankings', guia: 'rankings.selector-ranking', texto: 'Elige aquí el ranking que quieres ver.' },
          { ruta: '/rankings', guia: 'rankings.tabla', texto: 'En la tabla ves la posición, el saldo y la ponderación de cada banco.' },
          { ruta: '/rankings', guia: 'rankings.desglose-subactividades', texto: 'Abajo está el desglose por subactividad.' },
        ],
      },
    }
  }
  return {
    ...base,
    ia_disponible: true,
    motivo: null,
    // Valores ilustrativos de modo mock, no son resultados del motor (R2).
    respuesta:
      'Respuesta de ejemplo (modo mock). En **HIPOTECARIO** lidera el Banco Ejemplo A (valor ilustrativo).\n' +
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
