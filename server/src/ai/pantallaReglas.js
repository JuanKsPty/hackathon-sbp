// Acciones de pantalla por reglas (#121): sin IA (o si la IA no propone nada), las preguntas típicas
// ("¿cuál es el banco con más operaciones en COMERCIO?", "¿cómo veo…?") también dejan la pantalla
// lista. Solo lee resultados del motor y los ordena, como lo hace la tabla: no calcula nada nuevo.
import { normalizar, nombrePeriodo, periodosMencionados, rankingMencionado, bancoMencionado } from './intencion.js';
import { contextoPantalla, validarPantalla } from './pantalla.js';

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

// Columna de la tabla (contrato /api/rankings) → campo de la fila del motor.
const CAMPO_DEL_MOTOR = {
  Posicion: 'posicion',
  Banco: 'banco',
  Saldo_Actividad: 'saldoActividad',
  Total_Cartera_Local_Valida: 'totalCartera',
  Ponderacion_Pct: 'ponderacionE4',
  Operaciones_Validas: 'operacionesValidas',
};

/**
 * Banco que queda arriba al ordenar la tabla como lo haría el usuario: lee las filas que el motor
 * ya calculó para ese período y ranking y las ordena (en empate, por posición). No calcula valores.
 * @returns {string|null} código del banco
 */
export function bancoArriba(almacen, periodo, ranking, columna, orden) {
  const filas = almacen.obtener(periodo)?.rankings.find((r) => r.ranking === ranking)?.filas;
  const campo = CAMPO_DEL_MOTOR[columna];
  if (!filas?.length || !campo) return null;
  const signo = orden === 'asc' ? 1 : -1;
  const comparar = (a, b) => {
    const x = a[campo];
    const y = b[campo];
    const diferencia = typeof x === 'string' ? x.localeCompare(y, 'es') : x - y;
    return signo * diferencia || a.posicion - b.posicion;
  };
  return [...filas].sort(comparar)[0].codigoBanco;
}

const NOMBRE_COLUMNA = {
  Posicion: 'Posición',
  Banco: 'Banco',
  Saldo_Actividad: 'Saldo de la actividad',
  Total_Cartera_Local_Valida: 'Total cartera válida',
  Ponderacion_Pct: 'Ponderación',
  Operaciones_Validas: 'Operaciones',
};

/**
 * Pantalla por reglas para preguntas sobre la tabla de rankings: período, ranking, columna, orden
 * y banco salen de la pregunta; el banco a resaltar, de las filas del motor. Devuelve null si la
 * pregunta no es de ese tipo. Las acciones pasan por validarPantalla, igual que las de la IA.
 */
export function pantallaPorReglas(pregunta, almacen, perfil = 'publico') {
  const texto = normalizar(pregunta);
  const contexto = contextoPantalla(almacen);
  if (!contexto.fechas.length) return null;
  const mencionado = bancoMencionado(texto, contexto.bancos);
  const columna = columnaDe(pregunta) ?? (mencionado ? 'Posicion' : null);
  if (!columna) return null;

  const periodo = periodosMencionados(texto, contexto.fechas, []).at(-1) ?? contexto.fechas.at(-1);
  const ranking = rankingMencionado(texto, contexto.rankings) ?? contexto.rankings[0];
  const orden = ordenDe(pregunta, columna);
  const banco = mencionado ?? bancoArriba(almacen, periodo, ranking, columna, orden);
  if (!banco) return null;
  const mayorMenor = orden === 'desc' ? 'de mayor a menor' : 'de menor a mayor';

  const acciones = [
    { tipo: 'ir', ruta: '/rankings', texto: 'Entra a Rankings desde el menú.' },
    { tipo: 'elegir', control: 'global.selector-periodo', valor: periodo, texto: `Elige el período de ${nombrePeriodo(periodo)}.` },
    { tipo: 'elegir', control: 'rankings.selector-ranking', valor: ranking, texto: `Elige el ranking ${ranking}.` },
    // La tabla ya viene ordenada por posición (de la 1 a la 12): ese orden no hace falta pedirlo.
    ...(columna === 'Posicion' && orden === 'asc'
      ? []
      : [{ tipo: 'ordenar', control: 'rankings.tabla', columna, orden, texto: `Ordena la columna ${NOMBRE_COLUMNA[columna]} ${mayorMenor}.` }]),
    { tipo: 'resaltar', control: 'rankings.tabla', fila: banco, texto: `Aquí está ${contexto.bancos.get(banco)}.` },
  ];
  const validacion = validarPantalla({ modo: modoDe(pregunta), acciones }, { contexto, perfil });
  return validacion.ok ? validacion.pantalla : null;
}
