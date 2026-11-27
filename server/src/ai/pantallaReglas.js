// Acciones de pantalla por reglas (#121): sin IA (o si la IA no propone nada), las preguntas típicas
// ("¿cuál es el banco con más operaciones en COMERCIO?", "¿cómo veo…?") también dejan la pantalla
// lista. Solo lee resultados del motor y los ordena, como lo hace la tabla: no calcula nada nuevo.
import { normalizar } from './intencion.js';

/** "¿Cómo veo…?" o "¿Dónde está…?" → demostrar; cualquier otra pregunta → ejecutar. */
export function modoDe(pregunta) {
  return /\b(como|donde)\b/.test(normalizar(pregunta)) ? 'demostrar' : 'ejecutar';
}

// Palabras de cada columna de la tabla de rankings (sin tildes).
const PALABRAS_COLUMNA = [
  ['Operaciones_Validas', /\b(operacion\w*|prestamos|creditos otorgados)\b/],
  ['Ponderacion_Pct', /\b(ponderacion\w*|peso|participacion|porcentaje)\b/],
  ['Total_Cartera_Local_Valida', /\b(cartera|total de cartera|cartera total)\b/],
  ['Saldo_Actividad', /\b(saldo\w*|monto\w*|dinero|plata)\b/],
  ['Posicion', /\b(posicion\w*|puesto\w*|lugar|lider\w*|primero|mejor|peor|ultimo)\b/],
];

/** Columna por la que pregunta, o null si no nombra ninguna. */
export function columnaDe(pregunta) {
  const texto = normalizar(pregunta);
  return PALABRAS_COLUMNA.find(([, patron]) => patron.test(texto))?.[0] ?? null;
}

/**
 * Orden que deja arriba lo que se pregunta. Para valores, "más" es descendente y "menos" ascendente.
 * Para la posición es al revés: la mejor es la 1.
 */
export function ordenDe(pregunta, columna) {
  const texto = normalizar(pregunta);
  const menos = /\b(menos|menor\w*|peor|ultimo|minimo|mas bajo|mas chico)\b/.test(texto);
  if (columna === 'Posicion') return menos ? 'desc' : 'asc';
  return menos ? 'asc' : 'desc';
}
