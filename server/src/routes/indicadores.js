// GET /api/indicadores (#35): morosidad, vencimientos y concentración, calculados por el motor.
// Es análisis adicional: no forma parte de los 6 rankings oficiales. Formato en contracts/indicadores.md.
import { Router } from 'express';
import { calcularIndicadores } from '../engine/index.js';
import { encabezado, monto, porcentaje } from './formato.js';
import { periodoPedido, rankingPedido } from './parametros.js';

export const ROTULO_ANALISIS = 'Análisis adicional: no forma parte de los 6 rankings oficiales ni de su cálculo';

export function rutasDeIndicadores(almacen) {
  const rutas = Router();

  rutas.get('/indicadores', (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo, { permitirTodos: true });
    const ranking = rankingPedido(almacen, req.query.ranking);
    const indicadores = calcularIndicadores(periodo, almacen.catalogos, { ranking });
    res.json({
      ...encabezado(periodo),
      analisis: ROTULO_ANALISIS,
      ranking, // null = todo el universo local válido
      morosidad: {
        total: morosidadJson(indicadores.total),
        bancos: indicadores.bancos.map((b) => ({ Codigo_Banco: b.codigoBanco, Banco: b.banco, ...morosidadJson(b) })),
      },
      vencimientos: {
        total: vencimientosJson(indicadores.total),
        bancos: indicadores.bancos.map((b) => ({ Codigo_Banco: b.codigoBanco, Banco: b.banco, ...vencimientosJson(b) })),
      },
      concentracion: indicadores.concentracion.map(concentracionJson),
    });
  });

  return rutas;
}

function morosidadJson(r) {
  return {
    Operaciones: r.operaciones,
    Saldo: monto(r.saldo),
    Monto_Vencido: monto(r.vencido),
    Pct_Vencido: porcentaje(r.pctVencidoE4),
    Operaciones_En_Mora: r.operacionesEnMora,
    Saldo_En_Mora: monto(r.saldoEnMora),
    Pct_Saldo_En_Mora: porcentaje(r.pctSaldoEnMoraE4),
    Dias_Mora_Promedio: r.diasMoraPromedioE2 / 100,
    Tramos_Vencido: montosDe(r.tramosVencido),
  };
}

function vencimientosJson(r) {
  return {
    Saldo: monto(r.saldo),
    Monto_Por_Vencer: monto(r.porVencer),
    Monto_Vencido: monto(r.vencido),
    Tramos_Por_Vencer: montosDe(r.tramosPorVencer),
  };
}

function concentracionJson(c) {
  return {
    Ranking: c.ranking,
    Total_Ranking: monto(c.total),
    Participacion_Top3_Pct: porcentaje(c.participacionTop3E4),
    HHI: porcentaje(c.hhiE4), // 4 decimales; va de 0 a 10000
    Top3: c.top3.map((f) => ({
      Posicion: f.posicion,
      Codigo_Banco: f.codigoBanco,
      Banco: f.banco,
      Saldo_Actividad: monto(f.saldoActividad),
      Participacion_Pct: porcentaje(f.participacionE4),
    })),
  };
}

function montosDe(tramos) {
  return Object.fromEntries(Object.entries(tramos).map(([campo, centavos]) => [campo, monto(centavos)]));
}
