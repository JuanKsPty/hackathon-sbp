// Intención de una pregunta al chat (#108): qué gráficos mostrar en pantalla.
//
// Aquí no se calcula ninguna cifra. Solo se reconoce el tipo de informe, el período, el ranking y
// el banco, y se validan contra los catálogos y los períodos cargados. Los gráficos los dibuja el
// front con lo que ya devuelven /api/rankings, /api/subactividades, /api/movimientos y /api/calidad,
// que salen del motor (R2).
//
// Hay dos formas de llegar a la misma acción:
//   - con IA: el agente llama a la herramienta `mostrar_graficos` y validarAccion() revisa su entrada;
//   - sin IA (sin ANTHROPIC_API_KEY o si la IA falla): interpretarPregunta(), por palabras clave.
// Las dos terminan en construirAccion(), así que producen exactamente lo mismo.
import { NOMBRES_PERFIL, OPCIONES } from '../middleware/perfiles.js';

export const NOMBRE_HERRAMIENTA_GRAFICOS = 'mostrar_graficos';

export const TIPOS = ['informe', 'ranking', 'comparar', 'movimientos', 'banco', 'calidad'];

// Cada gráfico exige una opción de perfil (middleware/perfiles.js): la misma regla del 403.
export const GRAFICOS = {
  rankings: { opcion: 'consultar_rankings', nombre: 'Rankings por banco' },
  subactividades: { opcion: 'consultar_rankings', nombre: 'Desglose por subactividad' },
  banco: { opcion: 'consultar_rankings', nombre: 'Posiciones del banco por período' },
  movimientos: { opcion: 'comparar_periodos', nombre: 'Movimientos entre períodos' },
  calidad: { opcion: 'consultar_rankings', nombre: 'Calidad de datos del período' },
};

const GRAFICOS_POR_TIPO = {
  informe: ['rankings', 'movimientos', 'calidad'],
  ranking: ['rankings', 'subactividades'],
  comparar: ['movimientos'],
  movimientos: ['movimientos'],
  banco: ['banco', 'movimientos'],
  calidad: ['calidad'],
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Palabras (ya sin tildes) que nombran un mes. "mar" y "may" no van: chocan con otras palabras.
const PALABRAS_MES = new Map([
  ...MESES.map((mes, i) => [mes, i + 1]),
  ['setiembre', 9],
  ['ene', 1], ['feb', 2], ['abr', 4], ['jun', 6], ['jul', 7], ['ago', 8],
  ['sep', 9], ['sept', 9], ['set', 9], ['oct', 10], ['nov', 11], ['dic', 12],
]);

// Sinónimos de cada ranking, además de su propio nombre (sin tildes, en minúsculas).
const SINONIMOS_RANKING = {
  HIPOTECARIO: ['hipotecario', 'hipotecarios', 'hipoteca', 'hipotecas', 'vivienda'],
  CONSTRUCCION: ['construccion', 'construcciones', 'constructoras', 'interino'],
  INDUSTRIA: ['industria', 'industrias', 'industrial', 'manufactura'],
  AGROPECUARIO: ['agropecuario', 'agropecuaria', 'agro', 'agricultura', 'ganaderia', 'pesca'],
  COMERCIO: ['comercio', 'comercios', 'comerciales'],
  CONSUMO: ['consumo', 'tarjeta', 'tarjetas', 'automovil', 'autos'],
};

// Palabras de cada tipo de pedido (se comparan contra la pregunta sin tildes).
const PATRONES = {
  comparar: /\b(compar\w*|versus|vs|contra|respecto|frente a|entre .+ y )/,
  movimientos: /\b(movimiento\w*|sub(e|en|io|ieron|ido)|baj(a|an|o|aron|ado)|cambi(o|os|aron|ado) de (posicion|lider)|variacion\w*|escal\w*|cay(o|eron))\b/,
  calidad: /\b(calidad|exclu\w*|cascada|e[1-4]|reconcilia\w*|duplicad\w*|alertas?|universo)\b/,
  informe: /\b(informe\w*|reporte\w*|resumen|resume\w*|panorama|balance|todo)\b|que paso|como (le )?fue|como cerro/,
  ranking: /\b(ranking\w*|lider\w*|lidera\w*|top|primer\w*|posicion\w*|puesto\w*)\b/,
};

// "¿Cómo descargo…?", "¿Dónde cambio…?": es para el cursor guía (#72), no para mostrar gráficos.
const COMO_HACER =
  /\b(como|donde)\s+(se\s+)?(descarg\w*|hago|hacer|puedo|cambi\w*|sub(o|ir)|carg(o|ar)|encuentro|elijo|elegir|filtr\w*|uso|usar|activ\w*|export\w*|configur\w*)\b/;

/** Minúsculas, sin tildes y sin signos: "¿Cómo va el Banco 108?" -> "como va el banco 108". */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/** '20260930' -> 'septiembre de 2026'. */
export function nombrePeriodo(fecha) {
  const mes = MESES[Number(String(fecha).slice(4, 6)) - 1];
  return mes ? `${mes} de ${String(fecha).slice(0, 4)}` : String(fecha);
}

/**
 * Contexto de la interpretación, desde el almacén de períodos: fechas cargadas y catálogos.
 * @returns {{ fechas: string[], rankings: string[], bancos: Map<string, string> }}
 */
export function contextoDe(almacen) {
  return {
    fechas: almacen.fechas(),
    rankings: [...almacen.catalogos.macroactividades],
    bancos: new Map(almacen.catalogos.bancos),
  };
}

const puede = (perfil, opcion) => OPCIONES.find((o) => o.opcion === opcion)?.perfiles.includes(perfil) ?? false;

function quienesPueden(opcion) {
  const fila = OPCIONES.find((o) => o.opcion === opcion);
  return (fila?.perfiles ?? []).map((p) => NOMBRES_PERFIL[p]).join(' y ');
}

const anteriorA = (fechas, fecha) => fechas.filter((f) => f < fecha).at(-1) ?? null;

function titulo({ tipo, periodo, periodoAnterior, ranking, banco, nombreBanco }) {
  const mes = nombrePeriodo(periodo);
  switch (tipo) {
    case 'informe':
      return `Informe de ${mes}${ranking ? ` · ${ranking}` : ''}`;
    case 'ranking':
      return ranking ? `Ranking ${ranking} · ${mes}` : `Rankings de ${mes}`;
    case 'comparar':
    case 'movimientos':
      return periodoAnterior
        ? `Movimientos de ${nombrePeriodo(periodoAnterior)} a ${mes}${ranking ? ` · ${ranking}` : ''}`
        : `Movimientos de ${mes}`;
    case 'banco':
      return `${nombreBanco} (${banco}) hasta ${mes}`;
    default:
      return `Calidad de datos · ${mes}`;
  }
}

// Frase fija que acompaña los gráficos cuando la respuesta no la redacta la IA. Solo nombra lo que
// se muestra (períodos, ranking, banco): no trae cifras del motor.
function resumen(accion, nombreBanco) {
  const { tipo, periodo, periodo_anterior: anterior, ranking, graficos } = accion;
  const mes = `${nombrePeriodo(periodo)} (${periodo})`;
  const contra = anterior ? `${nombrePeriodo(anterior)} (${anterior})` : null;
  const partes = {
    rankings: ranking ? `el ranking ${ranking}` : 'los 6 rankings',
    subactividades: 'su desglose por subactividad',
    banco: `las posiciones de ${nombreBanco} en cada ranking y período`,
    movimientos: contra ? `los movimientos contra ${contra}` : 'los movimientos',
    calidad: 'la calidad de datos del período',
  };
  if (graficos.length === 0) return `No hay gráficos que pueda mostrarte para ${mes}.`;
  const lista = graficos.map((g) => partes[g]);
  const enumeracion = lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0];
  const encabezado = tipo === 'informe' ? `Este es el informe de ${mes}: ` : `Te muestro, para ${mes}, `;
  return `${encabezado}${enumeracion}.`;
}

/**
 * Arma la acción final: períodos resueltos, gráficos que el perfil puede ver y avisos.
 * Recibe datos ya validados (vienen de las reglas o de validarAccion).
 */
export function construirAccion(pedido, contexto, perfil = 'publico', origen = 'reglas') {
  const { tipo, ranking = null, banco = null } = pedido;
  const avisos = [...(pedido.avisos ?? [])];
  const periodo = pedido.periodo ?? contexto.fechas.at(-1);
  if (!periodo) return null;

  let periodoAnterior = null;
  let graficos = [...GRAFICOS_POR_TIPO[tipo]];
  if (graficos.includes('movimientos')) {
    periodoAnterior = pedido.periodoAnterior ?? anteriorA(contexto.fechas, periodo);
    if (!periodoAnterior) {
      graficos = graficos.filter((g) => g !== 'movimientos');
      avisos.push(`No hay un período cargado anterior a ${periodo} para comparar.`);
    }
  }

  // Lo que el perfil no puede ver no se muestra (la API respondería 403).
  const omitidos = graficos.filter((g) => !puede(perfil, GRAFICOS[g].opcion));
  for (const g of omitidos) {
    avisos.push(`${GRAFICOS[g].nombre}: solo para los perfiles ${quienesPueden(GRAFICOS[g].opcion)}.`);
  }
  graficos = graficos.filter((g) => !omitidos.includes(g));
  if (!graficos.includes('movimientos')) periodoAnterior = null;

  const nombreBanco = banco ? contexto.bancos.get(banco) : null;
  const periodos = tipo === 'banco' ? contexto.fechas.filter((f) => f <= periodo) : [periodo];
  const accion = {
    tipo,
    origen,
    titulo: titulo({ tipo, periodo, periodoAnterior, ranking, banco, nombreBanco }),
    periodo,
    periodo_anterior: periodoAnterior,
    periodos,
    ranking,
    banco,
    banco_nombre: nombreBanco,
    graficos,
    avisos,
  };
  accion.resumen = resumen(accion, nombreBanco);
  return accion;
}

// ---------- Sin IA: por palabras clave ----------

export function periodosMencionados(texto, fechas, avisos) {
  const encontrados = new Set();
  const anio = /\b(20\d{2})\b/.exec(texto)?.[1];
  // Fechas exactas: "20260930".
  for (const [, fecha] of texto.matchAll(/\b(20\d{6})\b/g)) {
    if (fechas.includes(fecha)) encontrados.add(fecha);
    else avisos.push(`No hay datos cargados para ${fecha}.`);
  }
  // Meses por nombre: "septiembre", "sep". Si se dice el año, se usa; si no, el más reciente.
  for (const palabra of texto.split(' ')) {
    const mes = PALABRAS_MES.get(palabra);
    if (!mes) continue;
    const mm = String(mes).padStart(2, '0');
    const candidatas = fechas.filter((f) => f.slice(4, 6) === mm && (!anio || f.startsWith(anio)));
    if (candidatas.length) encontrados.add(candidatas.at(-1));
    else avisos.push(`No hay un período cargado de ${MESES[mes - 1]}${anio ? ` de ${anio}` : ''}.`);
  }
  if (/\b(ultimo|actual|mas reciente|este mes)\b/.test(texto) && fechas.length) encontrados.add(fechas.at(-1));
  return [...encontrados].sort();
}

export function rankingMencionado(texto, rankings) {
  const palabras = new Set(texto.split(' '));
  return (
    rankings.find((r) => {
      const propios = [normalizar(r), ...(SINONIMOS_RANKING[r] ?? [])];
      return propios.some((p) => (p.includes(' ') ? texto.includes(p) : palabras.has(p)));
    }) ?? null
  );
}

export function bancoMencionado(texto, bancos) {
  // Por código: "banco 108" o "108" (solo si existe en el catálogo).
  for (const [, codigo] of texto.matchAll(/\b(\d{3})\b/g)) {
    if (bancos.has(codigo)) return codigo;
  }
  // Por nombre: "banco capital", o la parte propia del nombre ("capital", "nacional delta").
  for (const [codigo, nombre] of bancos) {
    const completo = normalizar(nombre);
    const propio = completo.replace(/^banco\s+(del?\s+)?/, '');
    if (new RegExp(`\\b(${completo}|${propio})\\b`).test(texto)) return codigo;
  }
  return null;
}

/**
 * Intérprete por reglas: palabras clave para mes, ranking, banco y tipo de informe.
 * Devuelve la acción (ver construirAccion) o null si la pregunta no pide ver datos.
 */
export function interpretarPregunta(pregunta, contexto, perfil = 'publico') {
  if (!contexto?.fechas?.length) return null;
  const texto = normalizar(pregunta);
  if (!texto || COMO_HACER.test(texto)) return null;

  const avisos = [];
  const periodos = periodosMencionados(texto, contexto.fechas, avisos);
  const ranking = rankingMencionado(texto, contexto.rankings);
  const banco = bancoMencionado(texto, contexto.bancos);

  let tipo = null;
  if (banco) tipo = 'banco';
  else if (PATRONES.comparar.test(texto) || periodos.length > 1) tipo = 'comparar';
  else if (PATRONES.calidad.test(texto)) tipo = 'calidad';
  else if (PATRONES.movimientos.test(texto)) tipo = 'movimientos';
  else if (PATRONES.informe.test(texto)) tipo = 'informe';
  else if (ranking || PATRONES.ranking.test(texto)) tipo = 'ranking';
  else if (periodos.length || avisos.length) tipo = 'informe';
  if (!tipo) return null;

  // Un mes pedido que no está cargado: no se muestra otro período en su lugar, solo el aviso.
  if (avisos.length && periodos.length === 0) {
    return {
      tipo,
      origen: 'reglas',
      titulo: 'Período sin datos cargados',
      periodo: null,
      periodo_anterior: null,
      periodos: [],
      ranking,
      banco,
      banco_nombre: banco ? contexto.bancos.get(banco) : null,
      graficos: [],
      avisos,
      resumen: `${avisos.join(' ')} Períodos disponibles: ${contexto.fechas.join(', ')}.`,
    };
  }

  const comparando = periodos.length > 1;
  return construirAccion(
    {
      tipo,
      periodo: periodos.at(-1),
      periodoAnterior: comparando ? periodos[0] : undefined,
      ranking,
      banco,
      avisos,
    },
    contexto,
    perfil,
    'reglas',
  );
}

// ---------- Con IA: herramienta mostrar_graficos ----------

/** Definición de la herramienta para el agente, con los valores válidos de este momento. */
export function definicionGraficos(contexto) {
  const bancos = [...contexto.bancos].map(([codigo, nombre]) => `${codigo} ${nombre}`).join(', ');
  return {
    name: NOMBRE_HERRAMIENTA_GRAFICOS,
    description:
      'Muestra en pantalla, junto a tu respuesta, los gráficos de lo que pide el usuario. Tú solo interpretas la pregunta: los datos de cada gráfico los trae la app desde el motor. ' +
      'Tipos: informe (rankings del período, movimientos contra el anterior y calidad), ranking (un ranking o los 6, con su desglose), comparar (movimientos entre dos períodos), ' +
      'movimientos (contra el período anterior), banco (posiciones de un banco en cada ranking y período, y sus movimientos) y calidad (exclusiones E1–E4 y reconciliaciones). ' +
      'Úsala una vez cuando la pregunta pida ver datos de un período, un ranking o un banco. No la uses para preguntas de cómo usar la app.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: TIPOS },
        periodo: { type: 'string', enum: contexto.fechas, description: 'Período AAAAMMDD. Si se omite, el último cargado.' },
        periodo_anterior: {
          type: 'string',
          enum: contexto.fechas,
          description: 'Solo para comparar: período inicial, anterior a periodo. Si se omite, el período cargado inmediatamente anterior.',
        },
        ranking: { type: 'string', enum: contexto.rankings, description: 'Ranking a destacar, si la pregunta nombra uno.' },
        banco: { type: 'string', enum: [...contexto.bancos.keys()], description: `Código del banco (obligatorio si tipo es banco): ${bancos}.` },
      },
      required: ['tipo'],
      additionalProperties: false,
    },
  };
}

/**
 * Valida la entrada que propone la IA contra los catálogos y los períodos cargados, y arma la
 * misma acción que las reglas. La IA no elige gráficos ni rutas: eso lo decide construirAccion.
 * @returns {{ ok: true, accion } | { ok: false, errores: string[] }}
 */
export function validarAccion(entrada, contexto, perfil = 'publico') {
  const errores = [];
  // Un campo vacío o null cuenta como no indicado.
  const valor = (campo) => (entrada?.[campo] === null || entrada?.[campo] === '' ? undefined : entrada?.[campo]);
  const [tipo, periodo, periodoAnterior, ranking, banco] = ['tipo', 'periodo', 'periodo_anterior', 'ranking', 'banco'].map(valor);
  if (!TIPOS.includes(tipo)) errores.push(`tipo debe ser uno de ${TIPOS.join(', ')}.`);
  if (periodo !== undefined && !contexto.fechas.includes(periodo)) {
    errores.push(`periodo "${periodo}" no está cargado. Períodos: ${contexto.fechas.join(', ')}.`);
  }
  if (periodoAnterior !== undefined && !contexto.fechas.includes(periodoAnterior)) {
    errores.push(`periodo_anterior "${periodoAnterior}" no está cargado.`);
  }
  const fin = periodo ?? contexto.fechas.at(-1);
  if (periodoAnterior !== undefined && fin && periodoAnterior >= fin) {
    errores.push(`periodo_anterior (${periodoAnterior}) debe ser anterior a periodo (${fin}).`);
  }
  if (ranking !== undefined && !contexto.rankings.includes(ranking)) errores.push(`ranking "${ranking}" no existe.`);
  if (banco !== undefined && !contexto.bancos.has(banco)) errores.push(`banco "${banco}" no existe en el catálogo.`);
  if (tipo === 'banco' && banco === undefined) errores.push('Para tipo banco hace falta el código del banco.');
  if (errores.length) return { ok: false, errores };

  const accion = construirAccion(
    { tipo, periodo, periodoAnterior, ranking: ranking ?? null, banco: banco ?? null },
    contexto,
    perfil,
    'ia',
  );
  return accion ? { ok: true, accion } : { ok: false, errores: ['No hay períodos cargados.'] };
}
