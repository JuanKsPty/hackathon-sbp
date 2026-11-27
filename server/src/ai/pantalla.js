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
