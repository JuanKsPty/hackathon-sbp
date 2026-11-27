// Acciones de pantalla del agente (#121). Además de responder en el chat, la IA puede dejar el
// dashboard listo para lo que se preguntó (modo "ejecutar") o mostrar con el cursor cómo se hace
// (modo "demostrar"). La IA propone acciones declarativas; aquí se validan contra este catálogo,
// el perfil y los datos cargados, y la ruta de cada acción la pone el catálogo, no la IA.

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
