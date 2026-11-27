// Rutas de IA (#2 y #3). La IA solo lee resultados del motor; sin ANTHROPIC_API_KEY responden
// igual, con la explicación por reglas o avisando que la IA no está disponible.
import { Router } from 'express';
import { explicarMovimientos } from '../ai/explicaciones.js';
import { preguntarAlAgente } from '../ai/agente.js';
import { crearEjecutor } from '../ai/herramientas.js';
import { MODELO_POR_DEFECTO } from '../ai/redaccionIA.js';
import { encabezado } from './formato.js';
import { ErrorApi } from './errores.js';

const MAX_PREGUNTA = 500;
const MAX_HISTORIAL = 6;

function validarPregunta(cuerpo) {
  const { pregunta, historial = [] } = cuerpo ?? {};
  if (typeof pregunta !== 'string' || pregunta.trim() === '' || pregunta.length > MAX_PREGUNTA) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', `pregunta es obligatoria y tiene un máximo de ${MAX_PREGUNTA} caracteres.`);
  }
  const historialValido = Array.isArray(historial) && historial.every(
    (t) => ['usuario', 'asistente'].includes(t?.rol) && typeof t.texto === 'string' && t.texto.length <= 4000,
  );
  if (!historialValido) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'historial debe ser una lista de { rol: "usuario" | "asistente", texto }.');
  }
  return { pregunta: pregunta.trim(), historial: historial.slice(-MAX_HISTORIAL) };
}

/**
 * @param {object} deps
 * @param {Function} [deps.obtenerMovimientos] cálculo de /api/movimientos (#32)
 * @param {object} [deps.opcionesIA] { cliente, apiKey, modelo } (para tests; por defecto el .env)
 */
export function rutasDeIA({ obtenerMovimientos, opcionesIA = {} } = {}) {
  const rutas = Router();
  const apiKey = () => opcionesIA.apiKey ?? process.env.ANTHROPIC_API_KEY;

  // Para que la UI sepa si mostrar el chat o el aviso "IA no disponible".
  rutas.get('/ia/estado', (req, res) => {
    const disponible = Boolean(apiKey() || opcionesIA.cliente);
    res.json({
      ia_disponible: disponible,
      modelo: disponible ? opcionesIA.modelo ?? (process.env.AI_MODEL || MODELO_POR_DEFECTO) : null,
    });
  });

  // #2: explicación de los movimientos (acepta los mismos parámetros que /api/movimientos).
  rutas.get('/explicaciones', async (req, res) => {
    if (!obtenerMovimientos) {
      throw new ErrorApi(501, 'NO_DISPONIBLE', 'La comparación entre períodos (/api/movimientos) no está conectada.');
    }
    const datos = obtenerMovimientos(req.query);
    const explicacion = await explicarMovimientos(datos, opcionesIA);
    res.json({
      ...encabezado(),
      periodo_anterior: datos.periodo_anterior,
      periodo_actual: datos.periodo_actual,
      ...explicacion,
    });
  });

  // #3: pregunta en lenguaje natural. La IA consulta la misma API con herramientas de solo lectura.
  rutas.post('/ia/preguntar', async (req, res) => {
    const { pregunta, historial } = validarPregunta(req.body);
    const baseUrl = `${req.protocol}://${req.get('host')}/api`;
    try {
      const resultado = await preguntarAlAgente(pregunta, {
        ...opcionesIA,
        historial,
        perfil: req.perfil,
        ejecutar: crearEjecutor(baseUrl, { perfil: req.perfil }),
      });
      res.json({ ...encabezado(), pregunta, ...resultado });
    } catch (error) {
      console.error('[ia] el agente falló:', error.message);
      res.json({
        ...encabezado(),
        pregunta,
        ia_disponible: false,
        motivo: 'IA no disponible en este momento. Puedes consultar los rankings y filtros directamente.',
        respuesta: null,
        verificada: false,
        consultas: [],
      });
    }
  });

  return rutas;
}
