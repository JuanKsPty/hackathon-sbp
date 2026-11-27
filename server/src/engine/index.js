// Motor del reto: JavaScript puro, sin Express ni acceso a disco. Recibe textos CSV y devuelve resultados.
// Flujo por período: leer -> validar -> cascada E1-E4 -> clasificar (CINU + SB21) -> agregar -> rankings
import { leerCsv, ErrorDeDatos } from './csv.js';
import { validarEsquema, validarTipos, revisarIntegridad } from './validacion.js';
import { aplicarCascada, conteosIndependientes } from './cascada.js';
import { clasificarOperaciones } from './clasificacion.js';
import { agregar } from './agregacion.js';
import { construirRankings, construirDesglose } from './rankings.js';

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
  const clasificacion = clasificarOperaciones(cascada.validas, catalogos, opciones.aplicarReglaConsumo ?? true);
  const operaciones = clasificacion.operaciones;
  const alertas = [...alertasIntegridad, ...clasificacion.alertas, ...alertasTipo];

  const agregado = agregar(operaciones);
  const rankings = construirRankings(agregado, catalogos); // [{ ranking, filas: [12 bancos] }]
  const desglose = construirDesglose(agregado, catalogos); // [{ ranking, subactividad, codigoBanco, saldo }]

  return {
    fecha,
    nombreArchivo,
    calidad: resumenDeCalidad(filas, cascada, operaciones, agregado, alertas, catalogos),
    rankings,
    desglose,
    operaciones, // universo local válido ya clasificado (un registro por préstamo)
    excluidas: cascada.excluidas,
    alertas,
  };
}

// Reporte de calidad del período (entregable 4). Montos en centavos.
function resumenDeCalidad(filas, cascada, operaciones, agregado, alertas, catalogos) {
  const { E1, E2, E3, E4 } = cascada.conteos;
  const universoValido = operaciones.length;
  return {
    filasLeidas: filas.length,
    e1Duplicados: E1,
    e2DestinoExtranjero: E2,
    e3SaldoNoPositivo: E3,
    e4ActividadNoCatalogada: E4,
    universoValido,
    saldoTotalValido: agregado.saldoTotal,
    cascadaCuadra: filas.length === E1 + E2 + E3 + E4 + universoValido,
    reclasificadasTarjeta: operaciones.filter((op) => op.reclasificada).length,
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
    alertasIncoherenciaConsumo: contar('INCOHERENCIA_CONSUMO'),
    alertasTipoDeDato: contar('TIPO_DE_DATO'),
  };
}
