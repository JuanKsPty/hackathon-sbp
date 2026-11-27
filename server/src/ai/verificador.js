// Verifica que todo número de un texto provenga de la respuesta del motor.
// Es la garantía de que la IA explica pero no calcula (sección 9 de las indicaciones).

// Números con separador de miles ("1,400,000.00") o sin él ("12", "-2.17").
const NUMERO = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

// No son cifras del motor, y no hay por qué verificarlas (#86):
//  - Los códigos: letras seguidas de dígitos pegados ("E1", "E1–E4", "SB21", "AT03", "R2").
//  - Las referencias a una parte de un documento o de la app: la etiqueta y su número ("entregable 4",
//    "reconciliación 1 y 2", "sección 11.1", "paso 3"). Una lista continúa con "y", "e", "a" o un guion
//    y con números de 1 o 2 dígitos que no sean una cifra ("criterio 2, 10.5%" deja el 10.5).
// Se borran del texto (se reemplazan por espacios) antes de buscar números.
const LETRA = 'A-Za-zÁÉÍÓÚÜáéíóúüÑñ';
const CODIGO = new RegExp(`[${LETRA}]+\\d+(?:[.,]\\d+)*`, 'g');
const ETIQUETAS = 'entregables?|reconciliaci(?:ón|on|ones)|reconciliacion(?:es)?|secci(?:ón|on|ones)|láminas?|laminas?|criterios?|puntos?|pasos?|reglas?';
const REFERENCIA_NUM = '\\d+(?:\\.\\d+)*';
const CONTINUA = '\\d{1,2}(?![\\d%]|[.,]\\d)';
const REFERENCIA = new RegExp(
  `(?<![${LETRA}])(?:${ETIQUETAS})\\s+(?:` +
    `${REFERENCIA_NUM}(?:\\s*,\\s*${CONTINUA})+\\s+(?:y|e)\\s+${CONTINUA}` + // 1, 2 y 3
    `|${REFERENCIA_NUM}\\s+(?:y|e|a)\\s+${CONTINUA}` + // 1 y 2
    `|${REFERENCIA_NUM}\\s*[–-]\\s*${CONTINUA}` + // 1–4
    `|${REFERENCIA_NUM})`, // 4
  'gi',
);
const enBlanco = (texto) => ' '.repeat(texto.length);

/**
 * Extrae los números de un texto como { valor, decimales, texto } (valor absoluto), sin los códigos
 * ni las referencias a "entregable 4" y similares.
 */
export function extraerNumeros(texto) {
  const encontrados = [];
  const limpio = texto.replace(REFERENCIA, enBlanco).replace(CODIGO, enBlanco);
  for (const match of limpio.matchAll(NUMERO)) {
    const crudo = match[0];
    const decimales = crudo.includes('.') ? crudo.split('.')[1].length : 0;
    encontrados.push({ texto: crudo, valor: Number(crudo.replaceAll(',', '')), decimales });
  }
  return encontrados;
}

/**
 * Valores que un texto puede citar: todos los números del JSON del motor (en valor
 * absoluto, porque el signo se expresa con palabras como "sube" o "baja") y los códigos
 * numéricos que vienen como texto ("101"). De las fechas AAAAMMDD se admiten también
 * el año y el día, para poder escribir "30 de septiembre de 2026".
 */
function valoresCitables(datos) {
  const valores = [];
  const recorrer = (nodo) => {
    if (typeof nodo === 'number') {
      valores.push(Math.abs(nodo));
    } else if (typeof nodo === 'string' && /^\d+$/.test(nodo)) {
      valores.push(Number(nodo));
      if (nodo.length === 8) {
        valores.push(Number(nodo.slice(0, 4)), Number(nodo.slice(6, 8)));
      }
    } else if (Array.isArray(nodo)) {
      nodo.forEach(recorrer);
    } else if (nodo && typeof nodo === 'object') {
      Object.values(nodo).forEach(recorrer);
    }
  };
  recorrer(datos);
  return valores;
}

// Un número citado coincide si es un valor del motor redondeado a los decimales con que
// se escribió (formato de presentación: -2.1739 puede mostrarse como "2.17").
function coincide(numero, valor) {
  return Number(valor.toFixed(numero.decimales)) === numero.valor;
}

/** Devuelve { ok, noEncontrados } para un texto contra la respuesta del motor. */
export function verificarNumeros(texto, datos) {
  const citables = valoresCitables(datos);
  const noEncontrados = extraerNumeros(texto)
    .filter((numero) => !citables.some((valor) => coincide(numero, valor)))
    .map((numero) => numero.texto);
  return { ok: noEncontrados.length === 0, noEncontrados };
}
