// GET /api/movimientos/descomposicion: por qué se movió el saldo de cada banco en cada ranking.
// No cambia el contrato de /api/movimientos (#1): es un endpoint aparte, con los mismos
// parámetros desde y hasta, y con la evidencia préstamo por préstamo a pedido.
import { Router } from 'express';
import { descomponer, evidencia as evidenciaDe } from '../automation/descomposicion.js';
import { encabezado, monto } from './formato.js';
import { periodoPedido, rankingPedido, bancoPedido } from './parametros.js';
import { ErrorApi } from './errores.js';

const pieza = (p) => ({ Saldo: monto(p.saldo), Operaciones: p.operaciones });

export function crearObtenerDescomposicion(almacen) {
  return function obtenerDescomposicion(query = {}) {
    const actual = periodoPedido(almacen, query.hasta);
    const anterior = query.desde === undefined ? periodoPrevio(almacen, actual.fecha) : periodoPedido(almacen, query.desde);
    if (anterior.fecha >= actual.fecha) {
      throw new ErrorApi(422, 'PERIODOS_INVALIDOS', `desde (${anterior.fecha}) debe ser anterior a hasta (${actual.fecha}).`);
    }
    const ranking = rankingPedido(almacen, query.ranking);
    const banco = bancoPedido(almacen, query.banco);
    const conEvidencia = booleanoPedido(query.evidencia, 'evidencia');
    if (conEvidencia && (!ranking || !banco)) {
      throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'Para pedir la evidencia hay que indicar ranking y banco.');
    }

    const { continuidad, piezas } = descomponer(anterior, actual);
    const descomposicion = [];
    for (const r of actual.rankings.filter((x) => !ranking || x.ranking === ranking)) {
      const filasAnteriores = anterior.rankings.find((x) => x.ranking === r.ranking)?.filas ?? [];
      for (const fila of r.filas.filter((f) => !banco || f.codigoBanco === banco)) {
        const saldoAnterior = filasAnteriores.find((f) => f.codigoBanco === fila.codigoBanco)?.saldoActividad ?? 0;
        const p = piezas(r.ranking, fila.codigoBanco);
        descomposicion.push({
          Ranking: r.ranking,
          Codigo_Banco: fila.codigoBanco,
          Banco: fila.banco,
          Saldo_anterior: monto(saldoAnterior),
          Saldo_actual: monto(fila.saldoActividad),
          Var_Saldo: monto(fila.saldoActividad - saldoAnterior),
          Nuevos: pieza(p.nuevos),
          Salen: pieza(p.salen),
          Amortizacion: pieza(p.amortizacion),
        });
      }
    }

    const respuesta = {
      ...encabezado(),
      periodo_anterior: anterior.fecha,
      periodo_actual: actual.fecha,
      Continuidad: { Continuan: continuidad.continuan, Entran: continuidad.entran, Salen: continuidad.salen },
      descomposicion,
    };
    if (conEvidencia) respuesta.evidencia = evidenciaEnContrato(evidenciaDe(anterior, actual, ranking, banco));
    return respuesta;
  };
}

export function rutasDeDescomposicion(obtenerDescomposicion) {
  const rutas = Router();
  rutas.get('/movimientos/descomposicion', (req, res) => res.json(obtenerDescomposicion(req.query)));
  return rutas;
}

function evidenciaEnContrato({ nuevos, salen, continuan }) {
  return {
    Nuevos: nuevos.map((e) => ({ Numero_Prestamo: e.numeroPrestamo, Saldo: monto(e.saldo) })),
    Salen: salen.map((e) => ({ Numero_Prestamo: e.numeroPrestamo, Saldo: monto(e.saldo) })),
    Continuan: continuan.map((e) => ({
      Numero_Prestamo: e.numeroPrestamo,
      Saldo_anterior: monto(e.saldoAnterior),
      Saldo_actual: monto(e.saldoActual),
      Diferencia: monto(e.diferencia),
    })),
  };
}

// Mismo criterio que /api/movimientos: por defecto, el período cargado inmediatamente anterior.
function periodoPrevio(almacen, fecha) {
  const previa = almacen.fechas().filter((f) => f < fecha).at(-1);
  if (!previa) throw new ErrorApi(404, 'PERIODO_SIN_DATOS', `No hay un período cargado anterior a ${fecha} para comparar.`);
  return almacen.obtener(previa);
}

function booleanoPedido(valor, nombre) {
  if (valor === undefined || valor === 'false') return false;
  if (valor === 'true') return true;
  throw new ErrorApi(400, 'PARAMETRO_INVALIDO', `${nombre} debe ser true o false (llegó "${valor}").`);
}
