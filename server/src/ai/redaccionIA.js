// Redacción de las explicaciones con Claude. La IA solo reescribe frases a partir de la
// respuesta del motor; los números que use se verifican después (verificador.js).

import Anthropic from '@anthropic-ai/sdk';

export const MODELO_POR_DEFECTO = 'claude-opus-5-5';

const SISTEMA = `Eres el redactor de un panel informativo de rankings de crédito bancario con datos ficticios.
Recibes la respuesta JSON de un motor de cálculo determinista y un borrador de frases generado por reglas.
Reescribe cada frase en español claro y breve (una o dos oraciones), en tono neutral e informativo.

Reglas estrictas:
- No calcules nada. Usa solo números que aparezcan textualmente en el JSON o en el borrador; no sumes, restes, promedies ni estimes.
- Escribe los números con dígitos, con el mismo formato del borrador (por ejemplo 1,400,000.00 o +12.00%).
- No agregues cantidades, fechas ni porcentajes que no estén en los datos. No opines ni recomiendes.
- Conserva el mismo "id" de cada frase del borrador y devuelve una frase por cada id.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          texto: { type: 'string' },
        },
        required: ['id', 'texto'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

export function crearCliente(apiKey) {
  return new Anthropic({ apiKey });
}

/**
 * Pide a Claude que redacte las frases del borrador.
 * @returns {Promise<Map<string, string>>} id → texto propuesto por la IA
 */
export async function redactarConIA(datos, borrador, { cliente, modelo = MODELO_POR_DEFECTO }) {
  const contenido = JSON.stringify({
    datos_motor: datos,
    borrador: borrador.map(({ id, texto }) => ({ id, texto })),
  });

  const respuesta = await cliente.beta.messages.create({
    model: modelo,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SISTEMA,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: ESQUEMA },
    },
    messages: [{ role: 'user', content: contenido }],
  });

  if (respuesta.stop_reason !== 'end_turn') {
    throw new Error(`La IA no completó la respuesta (stop_reason: ${respuesta.stop_reason})`);
  }
  const bloque = respuesta.content.find((b) => b.type === 'text');
  const { items } = JSON.parse(bloque?.text ?? '{}');
  return new Map((items ?? []).map(({ id, texto }) => [id, texto]));
}
