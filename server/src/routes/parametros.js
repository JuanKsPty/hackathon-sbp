// Validación de los parámetros de consulta (?periodo=&ranking=&banco=...).
// Los valores válidos salen de los catálogos y de los períodos cargados, nunca de listas fijas.
import { ErrorApi } from './errores.js';
import { MOTIVOS } from '../engine/cascada.js';
import { TODOS } from '../engine/acumulado.js';

const invalido = (mensaje) => new ErrorApi(400, 'PARAMETRO_INVALIDO', mensaje);

// Período pedido o, si no se indica, el último cargado.
// `todos` ("Todos los períodos") devuelve el acumulado de los cortes cargados, solo donde se
// permite (`permitirTodos`): no en movimientos ni descomposición, que comparan dos cortes.
export function periodoPedido(almacen, valor, { permitirTodos = false } = {}) {
  if (valor === TODOS && permitirTodos) {
    const acumulado = almacen.acumulado();
    if (!acumulado) throw new ErrorApi(404, 'PERIODO_SIN_DATOS', 'Todavía no hay períodos cargados.');
    return acumulado;
  }
  if (valor !== undefined && !/^\d{8}$/.test(valor)) {
    const opciones = permitirTodos ? ` o "${TODOS}"` : '';
    throw invalido(`periodo debe tener el formato AAAAMMDD${opciones} (llegó "${valor}").`);
  }
  const fecha = valor ?? almacen.ultimaFecha();
  if (!fecha) throw new ErrorApi(404, 'PERIODO_SIN_DATOS', 'Todavía no hay períodos cargados.');
  const periodo = almacen.obtener(fecha);
  if (!periodo) throw new ErrorApi(404, 'PERIODO_SIN_DATOS', `No hay datos cargados para ${fecha}.`);
  return periodo;
}

// Todos los períodos, o solo el pedido. `todos`: con `acumular`, el acumulado en un solo período;
// sin `acumular` (las descargas CSV), cada período por separado, igual que sin ?periodo.
export function periodosPedidos(almacen, valor, { acumular = false } = {}) {
  if (valor === TODOS && acumular) return [periodoPedido(almacen, valor, { permitirTodos: true })];
  if (valor !== undefined && valor !== TODOS) return [periodoPedido(almacen, valor)];
  const todos = almacen.todos();
  if (todos.length === 0) throw new ErrorApi(404, 'PERIODO_SIN_DATOS', 'Todavía no hay períodos cargados.');
  return todos;
}

export function rankingPedido(almacen, valor) {
  if (valor === undefined) return null;
  const validos = almacen.catalogos.macroactividades;
  if (!validos.includes(valor)) throw invalido(`ranking "${valor}" no existe. Valores: ${validos.join(', ')}.`);
  return valor;
}

export function bancoPedido(almacen, valor) {
  if (valor === undefined) return null;
  if (!almacen.catalogos.bancos.has(valor)) throw invalido(`banco "${valor}" no existe en el catálogo de bancos.`);
  return valor;
}

export function subactividadPedida(almacen, valor) {
  if (valor === undefined) return null;
  const todas = [...almacen.catalogos.subactividadesPorMacro.values()].flat();
  if (!todas.includes(valor)) throw invalido(`subactividad "${valor}" no existe en el catálogo CINU.`);
  return valor;
}

export function motivoPedido(valor) {
  if (valor === undefined) return null;
  // Object.hasOwn y no `in`: con `in`, motivo=toString o motivo=constructor pasaban la validación.
  if (typeof valor !== 'string' || !Object.hasOwn(MOTIVOS, valor)) {
    throw invalido(`motivo debe ser uno de ${Object.keys(MOTIVOS).join(', ')}.`);
  }
  return valor;
}
