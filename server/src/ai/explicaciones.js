// Punto de entrada: explica los movimientos de /api/movimientos.
// 1. Genera las frases por reglas (siempre disponibles).
// 2. Si hay API key, la IA las redacta mejor; cada frase de la IA se verifica y, si cita
//    un número que no está en la respuesta del motor, se usa la frase por reglas.

import { explicarPorReglas } from './plantillas.js';
import { verificarNumeros } from './verificador.js';
import { crearCliente, redactarConIA, MODELO_POR_DEFECTO } from './redaccionIA.js';

export const ETIQUETA_IA =
  'Explicación generada con IA · los cálculos provienen del motor determinista';
export const ETIQUETA_REGLAS =
  'Explicación automática por reglas · los cálculos provienen del motor determinista';

/**
 * @param {object} datos respuesta de /api/movimientos
 * @param {object} [opciones]
 * @param {boolean} [opciones.soloSignificativos=true]
 * @param {string}  [opciones.apiKey]  por defecto ANTHROPIC_API_KEY del .env
 * @param {string}  [opciones.modelo]  por defecto AI_MODEL del .env o claude-opus-5-5
 * @param {object}  [opciones.cliente] cliente de Anthropic (para tests)
 */
export async function explicarMovimientos(datos, opciones = {}) {
  const {
    soloSignificativos = true,
    apiKey = process.env.ANTHROPIC_API_KEY,
    modelo = process.env.AI_MODEL || MODELO_POR_DEFECTO,
  } = opciones;

  const borrador = explicarPorReglas(datos, { soloSignificativos });
  const porReglas = (motivo) => ({
    ia_disponible: false,
    motivo,
    etiqueta: ETIQUETA_REGLAS,
    items: borrador.map((item) => ({ ...item, fuente: 'reglas' })),
  });

  if (borrador.length === 0) {
    return { ...porReglas(null), ia_disponible: Boolean(apiKey || opciones.cliente) };
  }
  if (!apiKey && !opciones.cliente) {
    return porReglas('IA no disponible: falta ANTHROPIC_API_KEY en el .env del servidor');
  }

  let propuestas;
  try {
    const cliente = opciones.cliente ?? crearCliente(apiKey);
    propuestas = await redactarConIA(datos, borrador, { cliente, modelo });
  } catch (error) {
    console.error('[ia] explicación con IA falló, se usan reglas:', error.message);
    return porReglas('IA no disponible en este momento; se muestra la explicación por reglas');
  }

  const items = borrador.map((item) => {
    const texto = propuestas.get(item.id);
    if (!texto) return { ...item, fuente: 'reglas' };
    const { ok, noEncontrados } = verificarNumeros(texto, datos);
    if (!ok) {
      console.warn(`[ia] ${item.id}: números no presentes en el motor (${noEncontrados.join(', ')}); se usa la regla`);
      return { ...item, fuente: 'reglas' };
    }
    return { ...item, texto, fuente: 'ia' };
  });

  const usaIA = items.some((item) => item.fuente === 'ia');
  return {
    ia_disponible: true,
    motivo: null,
    etiqueta: usaIA ? ETIQUETA_IA : ETIQUETA_REGLAS,
    items,
  };
}
