// Acciones de pantalla del agente (#121). Además de responder en el chat, la IA puede dejar el
// dashboard listo para lo que se preguntó (modo "ejecutar") o mostrar con el cursor cómo se hace
// (modo "demostrar"). La IA propone acciones declarativas; aquí se validan contra este catálogo,
// el perfil y los datos cargados, y la ruta de cada acción la pone el catálogo, no la IA.

import { ELEMENTOS_GUIA, elementoGuia, perfilVeElemento } from './guia.js';

// Qué acciones admite cada control (su id es el data-guia de contracts/guia.md).
//   elegir:   qué tipo de valor acepta ('periodo' | 'ranking' | 'banco' | 'subactividad')
//   ordenar:  columnas por las que se puede ordenar
//   resaltar: qué identifica a la fila ('banco')
export const COLUMNAS_RANKING = [
  'Posicion',
  'Banco',
  'Saldo_Actividad',
  'Total_Cartera_Local_Valida',
  'Ponderacion_Pct',
  'Operaciones_Validas',
];

export const CONTROLES = {
  'global.selector-periodo': { elegir: 'periodo' },
  'rankings.selector-ranking': { elegir: 'ranking' },
  'rankings.filtro-banco': { elegir: 'banco' },
  'rankings.filtro-subactividad': { elegir: 'subactividad' },
  'rankings.tabla': { ordenar: COLUMNAS_RANKING, resaltar: 'banco' },
  // Comparar períodos (#126): solo perfiles con comparar_periodos (lo decide la guía).
  'comparar.selector-desde': { elegir: 'periodo' },
  'comparar.selector-hasta': { elegir: 'periodo' },
  'comparar.selector-ranking': { elegir: 'ranking' },
  'comparar.tabla-movimientos': { resaltar: 'banco' },
};

export const TIPOS_ACCION = ['ir', 'elegir', 'ordenar', 'resaltar', 'señalar'];
export const MODOS = ['ejecutar', 'demostrar'];
export const MAX_ACCIONES = 8;

// Valores especiales de los filtros: quitar el filtro.
export const SIN_FILTRO = { banco: 'todos', subactividad: 'todas' };

/**
 * Datos cargados contra los que se validan las acciones: períodos, rankings, bancos y subactividades.
 * Se arma desde el almacén del motor (nunca desde lo que diga la IA).
 */
export function contextoPantalla(almacen) {
  return {
    fechas: almacen.fechas(),
    rankings: [...almacen.catalogos.macroactividades],
    bancos: new Map(almacen.catalogos.bancos),
    subactividades: [...almacen.catalogos.subactividadesPorMacro.values()].flat(),
  };
}

/** Valida un valor de "elegir" según su tipo. Devuelve un mensaje de error o null si es válido. */
export function errorDeValor(tipo, valor, contexto) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) return `falta el valor (${tipo}).`;
  switch (tipo) {
    case 'periodo':
      return contexto.fechas.includes(texto) ? null : `el período "${texto}" no está cargado (hay ${contexto.fechas.join(', ')}).`;
    case 'ranking':
      return contexto.rankings.includes(texto) ? null : `el ranking "${texto}" no existe (${contexto.rankings.join(', ')}).`;
    case 'banco':
      return texto === SIN_FILTRO.banco || contexto.bancos.has(texto) ? null : `el banco "${texto}" no existe en el catálogo (usa el código de 3 dígitos o "${SIN_FILTRO.banco}").`;
    case 'subactividad':
      return texto === SIN_FILTRO.subactividad || contexto.subactividades.includes(texto)
        ? null
        : `la subactividad "${texto}" no existe en el catálogo (o usa "${SIN_FILTRO.subactividad}").`;
    default:
      return `tipo de valor desconocido: ${tipo}.`;
  }
}

// Páginas a las que el perfil puede ir: las rutas de los elementos de la guía que ve.
function rutasPara(perfil) {
  return [...new Set(ELEMENTOS_GUIA.filter((e) => e.ruta && perfilVeElemento(e.guia, perfil)).map((e) => e.ruta))];
}

const textoDe = (accion) => (typeof accion?.texto === 'string' ? accion.texto.trim() : '');

/**
 * Valida una acción propuesta por la IA y la normaliza.
 * @returns {{ ok: true, accion } | { ok: false, error }}
 */
export function validarAccion(accion, { contexto, perfil = 'publico' }) {
  const tipo = accion?.tipo;
  if (!TIPOS_ACCION.includes(tipo)) return { ok: false, error: `tipo de acción desconocido: "${tipo}" (${TIPOS_ACCION.join(', ')}).` };
  const texto = textoDe(accion);

  if (tipo === 'ir') {
    const rutas = rutasPara(perfil);
    if (!rutas.includes(accion.ruta)) return { ok: false, error: `no se puede ir a "${accion.ruta}" con el perfil ${perfil} (${rutas.join(', ')}).` };
    return { ok: true, accion: { tipo, ruta: accion.ruta, texto } };
  }
  // El resto de las acciones actúan sobre un elemento de la guía: tiene que existir y verlo el perfil.
  // "señalar" sirve para cualquiera; las demás, solo para los controles que admiten esa acción.
  const control = accion.control;
  if (!elementoGuia(control)) return { ok: false, error: `el control "${control}" no existe o no se puede manejar.` };
  const admite = CONTROLES[control] ?? {};
  if (!perfilVeElemento(control, perfil)) return { ok: false, error: `el control "${control}" no está disponible para el perfil ${perfil}.` };
  const ruta = elementoGuia(control).ruta;
  if (tipo !== 'señalar' && !admite[tipo]) {
    return { ok: false, error: `el control "${control}" no admite "${tipo}" (admite: ${Object.keys(admite).join(', ')}).` };
  }

  if (tipo === 'elegir') {
    const error = errorDeValor(admite.elegir, accion.valor, contexto);
    if (error) return { ok: false, error: `${control}: ${error}` };
    return { ok: true, accion: { tipo, control, ruta, valor: accion.valor.trim(), texto } };
  }

  if (tipo === 'ordenar') {
    if (!admite.ordenar.includes(accion.columna)) {
      return { ok: false, error: `${control}: no se puede ordenar por "${accion.columna}" (${admite.ordenar.join(', ')}).` };
    }
    const orden = accion.orden ?? 'desc';
    if (!['asc', 'desc'].includes(orden)) return { ok: false, error: `${control}: el orden debe ser "asc" o "desc".` };
    return { ok: true, accion: { tipo, control, ruta, columna: accion.columna, orden, texto } };
  }

  if (tipo === 'resaltar') {
    // Se resalta una fila concreta: "todos" no aplica.
    const error = accion.fila === SIN_FILTRO.banco ? 'hay que indicar un banco, no "todos".' : errorDeValor(admite.resaltar, accion.fila, contexto);
    if (error) return { ok: false, error: `${control}: ${error}` };
    return { ok: true, accion: { tipo, control, ruta, fila: accion.fila.trim(), texto } };
  }

  // señalar: solo apunta al elemento (no cambia nada en la pantalla).
  return { ok: true, accion: { tipo, control, ruta, texto } };
}

/**
 * Valida la propuesta completa de la IA: { modo, acciones }.
 * En "demostrar" cada acción necesita un texto (es lo que dice el globo junto al cursor).
 * @returns {{ ok: true, pantalla: { modo, acciones } } | { ok: false, errores: string[] }}
 */
export function validarPantalla(propuesta, { contexto, perfil = 'publico' }) {
  const modo = propuesta?.modo;
  if (!MODOS.includes(modo)) return { ok: false, errores: [`modo debe ser ${MODOS.join(' o ')}.`] };
  const lista = propuesta?.acciones;
  if (!Array.isArray(lista) || lista.length === 0 || lista.length > MAX_ACCIONES) {
    return { ok: false, errores: [`acciones debe ser una lista de 1 a ${MAX_ACCIONES} acciones.`] };
  }
  const errores = [];
  const acciones = [];
  lista.forEach((propuestaAccion, i) => {
    const resultado = validarAccion(propuestaAccion, { contexto, perfil });
    if (!resultado.ok) return errores.push(`Acción ${i + 1}: ${resultado.error}`);
    if (modo === 'demostrar' && !resultado.accion.texto) return errores.push(`Acción ${i + 1}: en una demostración cada paso necesita un texto.`);
    acciones.push(resultado.accion);
  });
  return errores.length ? { ok: false, errores } : { ok: true, pantalla: { modo, acciones } };
}

export const NOMBRE_HERRAMIENTA_PANTALLA = 'usar_pantalla';

// Cómo se describe cada control a la IA: qué acciones admite y con qué valores.
function describirControl(id) {
  const admite = CONTROLES[id];
  const partes = [];
  if (admite.elegir) partes.push(`elegir (${admite.elegir}${SIN_FILTRO[admite.elegir] ? ` o "${SIN_FILTRO[admite.elegir]}"` : ''})`);
  if (admite.ordenar) partes.push(`ordenar (${admite.ordenar.join(', ')})`);
  if (admite.resaltar) partes.push(`resaltar (fila = código de ${admite.resaltar})`);
  return `- ${id}: ${partes.join('; ')}`;
}

/** Definición de la herramienta para el perfil: solo sus páginas y controles. */
export function definicionPantalla(perfil = 'publico') {
  const controles = Object.keys(CONTROLES).filter((id) => perfilVeElemento(id, perfil));
  const senalables = ELEMENTOS_GUIA.filter((e) => perfilVeElemento(e.guia, perfil)).map((e) => e.guia);
  return {
    name: NOMBRE_HERRAMIENTA_PANTALLA,
    description: [
      'Deja la pantalla de la app lista para lo que se preguntó, además de tu respuesta en el chat.',
      'modo "ejecutar": la pregunta pide un dato ("¿cuál es…?", "¿quién…?", "¿cuánto…?"). La app aplica las acciones al instante (ir a la página, elegir filtros, ordenar, resaltar el resultado) y el usuario puede pedir "Muéstrame cómo".',
      'modo "demostrar": la pregunta es cómo o dónde se hace algo ("¿cómo veo…?", "¿dónde está…?"). Un cursor recorre cada acción en orden; cada una necesita un texto corto que explique ese paso.',
      'Usa los códigos de banco de 3 dígitos y los períodos AAAAMMDD de los resultados de las herramientas. No calcules: para el banco con más o menos de algo, ordena la columna y resalta el banco que viste en los datos.',
      `Páginas (ir): ${rutasPara(perfil).join(', ')}.`,
      'Controles que se pueden manejar:',
      ...controles.map(describirControl),
      'Cualquier elemento de la guía se puede señalar (tipo "señalar").',
    ].join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        modo: { type: 'string', enum: MODOS },
        acciones: {
          type: 'array',
          minItems: 1,
          maxItems: MAX_ACCIONES,
          items: {
            type: 'object',
            properties: {
              tipo: { type: 'string', enum: TIPOS_ACCION },
              ruta: { type: 'string', description: 'Para "ir": la página.' },
              control: { type: 'string', enum: senalables, description: 'data-guia del elemento.' },
              valor: { type: 'string', description: 'Para "elegir".' },
              columna: { type: 'string', enum: COLUMNAS_RANKING, description: 'Para "ordenar".' },
              orden: { type: 'string', enum: ['asc', 'desc'] },
              fila: { type: 'string', description: 'Para "resaltar": código de banco.' },
              texto: { type: 'string', description: 'Qué se hace en este paso, en una frase corta (obligatorio al demostrar).' },
            },
            required: ['tipo'],
            additionalProperties: false,
          },
        },
      },
      required: ['modo', 'acciones'],
      additionalProperties: false,
    },
  };
}
