// Rutas de IA (#2 y #3). La IA solo lee resultados del motor; sin ANTHROPIC_API_KEY responden
// igual, con la explicación por reglas o avisando que la IA no está disponible.
// #108: /api/ia/preguntar trae además `accion`, los gráficos que el front muestra en pantalla. La
// propone la IA (mostrar_graficos) o, sin IA, el intérprete por reglas (ai/intencion.js).
import { createHash } from 'node:crypto';
import { Router } from 'express';
import { explicarMovimientos } from '../ai/explicaciones.js';
import { preguntarAlAgente } from '../ai/agente.js';
import { crearEjecutor } from '../ai/herramientas.js';
import { urlApiInterna } from '../ai/apiInterna.js';
import { elementosPara } from '../ai/guia.js';
import { contextoDe, interpretarPregunta } from '../ai/intencion.js';
import { contextoPantalla } from '../ai/pantalla.js';
import { pantallaPorReglas } from '../ai/pantallaReglas.js';
import { MODELO_POR_DEFECTO } from '../ai/redaccionIA.js';
import { encabezado } from './formato.js';
import { ErrorApi } from './errores.js';

const MAX_PREGUNTA = 500;
const MAX_HISTORIAL = 6;
// Explicaciones ya redactadas por la IA: mismos movimientos, mismo texto. Así volver al Panel o
// cambiar de perfil no vuelve a gastar la llave. La clave es el contenido de los movimientos (que
// ya refleja el período, el ranking y la regla vigente), así que un período recargado no reusa nada.
const MAX_EXPLICACIONES_EN_CACHE = 50;

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
 * @param {object} [deps.almacen] períodos cargados y catálogos: con él, las preguntas traen `accion` (#108) y las
 *   herramientas de la IA nombran sus rankings y bancos
 * @param {Function} [deps.obtenerMovimientos] cálculo de /api/movimientos (#32)
 * @param {object} [deps.opcionesIA] { cliente, apiKey, modelo } (para tests; por defecto el .env)
 */
export function rutasDeIA({ almacen, obtenerMovimientos, opcionesIA = {} } = {}) {
  const rutas = Router();
  const apiKey = () => opcionesIA.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const explicacionesEnCache = new Map(); // clave -> explicación (orden de inserción: la más vieja sale primero)

  // #72: elementos que el agente guía puede señalar para este perfil (contracts/guia.md).
  // El front lo usa para comprobar que cada uno tiene su data-guia en pantalla.
  rutas.get('/ia/guia', (req, res) => {
    res.json({
      perfil: req.perfil,
      elementos: elementosPara(req.perfil).map(({ guia, ruta, descripcion }) => ({ guia, ruta, descripcion })),
    });
  });

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
    const clave = createHash('sha256').update(JSON.stringify(datos)).digest('hex');
    let explicacion = explicacionesEnCache.get(clave);
    if (!explicacion) {
      explicacion = await explicarMovimientos(datos, opcionesIA);
      // Solo se guarda lo que redactó la IA sin errores: un respaldo por reglas se vuelve a intentar.
      if (explicacion.motivo === null && explicacion.items.some((item) => item.fuente === 'ia')) {
        if (explicacionesEnCache.size >= MAX_EXPLICACIONES_EN_CACHE) {
          explicacionesEnCache.delete(explicacionesEnCache.keys().next().value);
        }
        explicacionesEnCache.set(clave, explicacion);
      }
    }
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
    // API interna, no el Host de la petición (#89).
    const baseUrl = urlApiInterna();
    // Períodos y catálogos de este momento (un Administrador puede cargar un período nuevo).
    const contexto = almacen?.fechas().length ? contextoDe(almacen) : null;
    // Sin IA (o si la IA no propuso gráficos), las reglas producen la misma acción.
    const porReglas = () => (contexto ? interpretarPregunta(pregunta, contexto, req.perfil) : null);
    const pantallaReglas = () => (contexto ? pantallaPorReglas(pregunta, almacen, req.perfil) : null);
    try {
      const resultado = await preguntarAlAgente(pregunta, {
        ...opcionesIA,
        historial,
        perfil: req.perfil,
        contexto,
        // Acciones de pantalla (#121): se validan contra los datos cargados en este momento.
        contextoPantalla: almacen?.fechas().length ? contextoPantalla(almacen) : null,
        catalogos: almacen?.catalogos,
        ejecutar: crearEjecutor(baseUrl, { perfil: req.perfil }),
      });
      // Si la IA respondió con una guía (#72), la pregunta era de cómo usar la app: sin gráficos.
      const accion = resultado.accion ?? (resultado.guia ? null : porReglas());
      // #121: si la IA no dejó la pantalla lista (o no hay IA), las reglas lo intentan.
      const pantalla = resultado.pantalla ?? (resultado.guia ? null : pantallaReglas());
      res.json({ ...encabezado(), pregunta, ...resultado, accion, pantalla });
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
        guia: null,
        accion: porReglas(),
        pantalla: pantallaReglas(),
      });
    }
  });

  return rutas;
}
