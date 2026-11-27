// Motor del reto: JavaScript puro, sin Express ni acceso a disco. Recibe textos CSV y devuelve resultados.
// Flujo por período: leer -> validar -> cascada E1-E4 -> (siguientes issues: clasificación, agregación, rankings)
import { leerCsv, ErrorDeDatos } from './csv.js';
import { validarEsquema, validarTipos, revisarIntegridad } from './validacion.js';
import { aplicarCascada, conteosIndependientes } from './cascada.js';

export { cargarCatalogos } from './catalogos.js';
export { ErrorDeDatos } from './csv.js';

// Lee un AT03 completo y lo separa por período. El período sale del campo Fecha,
// no del nombre del archivo, así que un archivo puede traer más de un período.
// Devuelve [{ fecha, filas }] ordenado por Fecha; cada fila es { numeroFila, datos }.
export function leerAT03(texto, catalogos, nombreArchivo = 'AT03') {
  const { encabezados, filas } = leerCsv(texto, nombreArchivo);
  validarEsquema(encabezados, catalogos.campos, nombreArchivo);
  if (filas.length === 0) {
    throw new ErrorDeDatos(`${nombreArchivo} no tiene filas de datos.`);
  }
  const grupos = new Map();
  for (const fila of filas) {
    const fecha = fila.datos.Fecha;
    if (!grupos.has(fecha)) grupos.set(fecha, []);
    grupos.get(fecha).push(fila);
  }
  return [...grupos.keys()].sort().map((fecha) => ({ fecha, filas: grupos.get(fecha) }));
}

// Atajo: lee el archivo y procesa cada período que contenga.
export function procesarArchivo(texto, catalogos, opciones = {}) {
  const nombreArchivo = opciones.nombreArchivo ?? 'AT03';
  return leerAT03(texto, catalogos, nombreArchivo).map(({ filas }) =>
    procesarPeriodo(filas, catalogos, { ...opciones, nombreArchivo }),
  );
}

// Procesa UN período. filas: [{ numeroFila, datos }] con la misma Fecha, en el orden del archivo.
// Es la función que reutiliza la carga de un período nuevo: no hay que tocar código para procesarlo.
export function procesarPeriodo(filas, catalogos, opciones = {}) {
  const nombreArchivo = opciones.nombreArchivo ?? 'AT03';
  const fecha = fechaUnica(filas, nombreArchivo);

  const alertasTipo = validarTipos(filas, catalogos.campos, nombreArchivo); // rechaza si Fecha o Saldo son inválidos
  const alertasIntegridad = revisarIntegridad(filas, catalogos);
  const cascada = aplicarCascada(filas, catalogos);
  const alertas = [...alertasIntegridad, ...alertasTipo];

  return {
    fecha,
    nombreArchivo,
    calidad: resumenDeCalidad(filas, cascada, alertas, catalogos),
    filasValidas: cascada.validas,
    excluidas: cascada.excluidas,
    alertas,
  };
}

// Reporte de calidad del período (entregable 4).
function resumenDeCalidad(filas, cascada, alertas, catalogos) {
  const { E1, E2, E3, E4 } = cascada.conteos;
  const universoValido = cascada.validas.length;
  return {
    filasLeidas: filas.length,
    e1Duplicados: E1,
    e2DestinoExtranjero: E2,
    e3SaldoNoPositivo: E3,
    e4ActividadNoCatalogada: E4,
    universoValido,
    cascadaCuadra: filas.length === E1 + E2 + E3 + E4 + universoValido,
    ...contarAlertas(alertas),
    // Rotulado aparte: cuántas filas incumplen cada regla por sí sola (NO es el reporte oficial).
    conteosIndependientes: conteosIndependientes(filas, catalogos),
  };
}

function fechaUnica(filas, nombreArchivo) {
  if (filas.length === 0) {
    throw new ErrorDeDatos(`${nombreArchivo}: el período no tiene filas.`);
  }
  const fechas = new Set(filas.map((f) => f.datos.Fecha));
  if (fechas.size > 1) {
    throw new ErrorDeDatos(`${nombreArchivo}: procesarPeriodo recibió varias fechas (${[...fechas].join(', ')}).`);
  }
  return filas[0].datos.Fecha;
}

function contarAlertas(alertas) {
  const contar = (tipo) => alertas.filter((a) => a.tipo === tipo).length;
  return {
    alertasBancoFueraDeCatalogo: contar('BANCO_FUERA_DE_CATALOGO'),
    alertasFacilidadFueraDeCatalogo: contar('FACILIDAD_FUERA_DE_CATALOGO'),
    alertasTipoDeDato: contar('TIPO_DE_DATO'),
  };
}
