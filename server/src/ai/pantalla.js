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
