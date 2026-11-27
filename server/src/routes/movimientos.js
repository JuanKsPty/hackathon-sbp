// GET /api/movimientos: comparación entre dos períodos (contracts/movimientos.json, issues #1 y #32).
import { Router } from 'express';
import { compararPeriodos } from '../automation/movimientos.js';
import { leerReglaMovimientos } from '../automation/parametros.js';
import { encabezado, monto, porcentaje } from './formato.js';
import { periodoPedido, rankingPedido } from './parametros.js';
import { ErrorApi } from './errores.js';
import { requiereOpcion } from '../middleware/perfiles.js';

const lider = (fila) => (fila ? { Codigo_Banco: fila.codigoBanco, Banco: fila.banco } : null);

function movimientoDeContrato(m) {
  return {
    Codigo_Banco: m.codigoBanco,
    Banco: m.banco,
    Posicion_anterior: m.posicionAnterior,
    Posicion_actual: m.posicionActual,
    Cambio_Posicion: m.cambioPosicion,
    Saldo_anterior: monto(m.saldoAnterior),
    Saldo_actual: monto(m.saldoActual),
    Var_Saldo: monto(m.varSaldo),
    Var_Saldo_Pct: m.varSaldoPctE4 === null ? null : porcentaje(m.varSaldoPctE4),
    Significativo: m.significativo,
    Motivos: m.motivos,
  };
}

// Período cargado inmediatamente anterior a `fecha` (comparación consecutiva por defecto).
function periodoPrevio(almacen, fecha) {
  const previa = almacen.fechas().filter((f) => f < fecha).at(-1);
  if (!previa) {
    throw new ErrorApi(404, 'PERIODO_SIN_DATOS', `No hay un período cargado anterior a ${fecha} para comparar.`);
  }
  return almacen.obtener(previa);
}

function soloSignificativosPedido(valor) {
  if (valor === undefined || valor === 'false') return false;
  if (valor === 'true') return true;
  throw new ErrorApi(400, 'PARAMETRO_INVALIDO', `solo_significativos debe ser true o false (llegó "${valor}").`);
}

/**
 * Función que arma la respuesta de /api/movimientos a partir de la query (desde, hasta, ranking,
 * solo_significativos). La usan la ruta y la exportación del entregable 5.
 * obtenerRegla devuelve la regla de movimiento significativo vigente (parámetros del Administrador).
 */
export function crearObtenerMovimientos(almacen, { obtenerRegla = () => leerReglaMovimientos() } = {}) {
  return function obtenerMovimientos(query = {}) {
    const actual = periodoPedido(almacen, query.hasta);
    const anterior = query.desde === undefined ? periodoPrevio(almacen, actual.fecha) : periodoPedido(almacen, query.desde);
    if (anterior.fecha >= actual.fecha) {
      throw new ErrorApi(422, 'PERIODOS_INVALIDOS', `desde (${anterior.fecha}) debe ser anterior a hasta (${actual.fecha}).`);
    }
    const ranking = rankingPedido(almacen, query.ranking);
    const soloSignificativos = soloSignificativosPedido(query.solo_significativos);
    const regla = obtenerRegla();

    const rankings = compararPeriodos(anterior, actual, regla, { ranking }).map((r) => ({
      Ranking: r.ranking,
      Lider_anterior: lider(r.liderAnterior),
      Lider_actual: lider(r.liderActual),
      Cambio_Lider: r.cambioLider,
      movimientos: r.movimientos.filter((m) => !soloSignificativos || m.significativo).map(movimientoDeContrato),
    }));

    return {
      ...encabezado(),
      periodo_anterior: anterior.fecha,
      periodo_actual: actual.fecha,
      regla_significativo: regla,
      rankings,
    };
  };
}

export function rutasDeMovimientos(obtenerMovimientos) {
  const rutas = Router();
  // Comparar períodos es de Analista y Administrador (sección 10); Público recibe 403.
  rutas.get('/movimientos', requiereOpcion('comparar_periodos'), (req, res) => res.json(obtenerMovimientos(req.query)));
  return rutas;
}
