// Verifica que todo número de un texto provenga de la respuesta del motor.
// Es la garantía de que la IA explica pero no calcula (sección 9 de las indicaciones).

// Números con separador de miles ("1,400,000.00") o sin él ("12", "-2.17").
const NUMERO = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

/** Extrae los números de un texto como { valor, decimales, texto } (valor absoluto). */
export function extraerNumeros(texto) {
  const encontrados = [];
  for (const match of texto.matchAll(NUMERO)) {
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
export function valoresCitables(datos) {
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
