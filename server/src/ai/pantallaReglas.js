// Acciones de pantalla por reglas (#121): sin IA (o si la IA no propone nada), las preguntas típicas
// ("¿cuál es el banco con más operaciones en COMERCIO?", "¿cómo veo…?") también dejan la pantalla
// lista. Solo lee resultados del motor y los ordena, como lo hace la tabla: no calcula nada nuevo.
import { normalizar, nombrePeriodo, periodosMencionados, rankingMencionado, bancoMencionado } from './intencion.js';
import { contextoPantalla, validarPantalla } from './pantalla.js';
import { elementoGuia, perfilVeElemento } from './guia.js';

/** "¿Cómo veo…?", "¿Dónde está…?", "Muéstrame cómo…", "Enséñame…" → demostrar; cualquier otra → ejecutar. */
export function modoDe(pregunta) {
  return /\b(como|donde|ensena\w*|guiame|paso a paso)\b/.test(normalizar(pregunta)) ? 'demostrar' : 'ejecutar';
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
  const rankingPedido = rankingMencionado(texto, contexto.rankings);
  const ranking = rankingPedido ?? contexto.rankings[0];
  const orden = ordenDe(pregunta, columna);
  const banco = mencionado ?? bancoArriba(almacen, periodo, ranking, columna, orden);
  if (!banco) return null;
  const mayorMenor = orden === 'desc' ? 'de mayor a menor' : 'de menor a mayor';

  const acciones = [
    { tipo: 'ir', ruta: '/rankings', texto: 'Entra a Rankings desde el menú.' },
    { tipo: 'elegir', control: 'global.selector-periodo', valor: periodo, texto: `Elige el período de ${nombrePeriodo(periodo)}.` },
    // "Muestra el banco 108" no nombra ranking: se queda en el que está abierto.
    ...(mencionado && !rankingPedido
      ? []
      : [{ tipo: 'elegir', control: 'rankings.selector-ranking', valor: ranking, texto: `Elige el ranking ${ranking}.` }]),
    // Siempre se indica el orden (la tabla puede venir ordenada por otra columna de una pregunta
    // anterior); si ya está así, el front se salta el paso.
    { tipo: 'ordenar', control: 'rankings.tabla', columna, orden, texto: `Ordena la columna ${NOMBRE_COLUMNA[columna]} ${mayorMenor}.` },
    { tipo: 'resaltar', control: 'rankings.tabla', fila: banco, texto: `Aquí está ${contexto.bancos.get(banco)}.` },
  ];
  const validacion = validarPantalla({ modo: modoDe(pregunta), acciones }, { contexto, perfil });
  return validacion.ok ? validacion.pantalla : null;
}

// "Cómo hago X" sobre la app (#121): palabras → elemento de la guía, de lo más específico a lo general.
const ELEMENTO_POR_PALABRAS = [
  [/\b(reporte\w* personalizad\w*|personaliz\w*)\b/, 'reportes.personalizado'],
  [/\bcompar\w*\b.*\b(bancos|entidades)\b/, 'comparar.bancos'],
  [/\b(compar\w*|evolucion|entre periodos|entre meses|mes anterior)\b/, 'comparar.selector-desde'],
  [/\b(reporte\w*|entregable\w*)\b/, 'reportes.descarga-rankings'],
  [/\b(descarg\w*|export\w*|csv|bajar)\b/, 'rankings.descargar'],
  [/\b(excluid\w*|exclusion\w*|descartad\w*)\b/, 'calidad.excluidas'],
  [/\b(reconcilia\w*|unicidad)\b/, 'calidad.reconciliaciones'],
  [/\balerta\w*\b/, 'calidad.alertas'],
  [/\b(calidad|e1|e2|e3|e4)\b/, 'calidad.cascada'],
  [/\b(subir|cargar|carga|archivo|at03)\b/, 'admin.subir-archivo'],
  [/\b(subactividad\w*|tarjeta\w*|desglose)\b/, 'rankings.desglose-subactividades'],
  [/\b(filtr\w*|busc\w*)\b.*\bbanco\w*\b|\bbanco\w*\b.*\bfiltr\w*\b/, 'rankings.filtro-banco'],
  [/\bgrafic\w*\b/, 'rankings.grafico'],
  [/\b(movimiento\w*|subio|bajo|subieron|bajaron)\b/, 'panel.movimientos'],
  [/\b(lider\w*|indicador\w*|resumen)\b/, 'panel.lideres'],
  [/\b(periodo|mes|fecha|corte)\b/, 'global.selector-periodo'],
  [/\b(ranking\w*|actividad\w*)\b/, 'rankings.selector-ranking'],
  [/\b(tema|oscuro|claro)\b/, 'global.selector-tema'],
];

const NOMBRE_PAGINA = { '/': 'Panel', '/rankings': 'Rankings', '/comparar': 'Comparar', '/reportes': 'Reportes', '/calidad': 'Calidad de datos', '/admin': 'Administración' };

/**
 * Demostración por reglas para "¿cómo hago X?" en la app: entra a la página del elemento y lo señala.
 * Solo en modo demostrar y con un elemento que el perfil ve; si no, null.
 */
export function demostracionPorReglas(pregunta, almacen, perfil = 'publico') {
  if (modoDe(pregunta) !== 'demostrar') return null;
  const texto = normalizar(pregunta);
  const id = ELEMENTO_POR_PALABRAS.find(([patron, guia]) => patron.test(texto) && perfilVeElemento(guia, perfil))?.[1];
  if (!id) return null;
  const elemento = elementoGuia(id);
  const acciones = [];
  if (elemento.ruta) acciones.push({ tipo: 'ir', ruta: elemento.ruta, texto: `Entra a ${NOMBRE_PAGINA[elemento.ruta] ?? 'la página'} desde el menú.` });
  acciones.push({ tipo: 'señalar', control: id, texto: `Aquí: ${elemento.descripcion}.` });
  const validacion = validarPantalla({ modo: 'demostrar', acciones }, { contexto: contextoPantalla(almacen), perfil });
  return validacion.ok ? validacion.pantalla : null;
}
