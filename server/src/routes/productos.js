// GET /api/productos: totales por producto de crédito (las 22 subactividades), calculados por el
// motor (engine/productos.js). Abierto a los 3 perfiles. Formato en contracts/productos.md.
import { Router } from 'express';
import { calcularProductos } from '../engine/index.js';
import { encabezado, monto, porcentaje } from './formato.js';
import { periodoPedido } from './parametros.js';

export function rutasDeProductos(almacen) {
  const rutas = Router();

  rutas.get('/productos', (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo, { permitirTodos: true });
    const resultado = calcularProductos(periodo, almacen.catalogos);
    res.json({
      ...encabezado(periodo),
      Saldo_Total_Valido: monto(resultado.saldoTotal),
      Universo_Local_Valido: resultado.universo,
      Reclasificadas_Tarjeta: resultado.reclasificadas,
      productos: resultado.productos.map(productoJson),
      bancos: resultado.bancos.map((b) => ({
        Codigo_Banco: b.codigoBanco,
        Banco: b.banco,
        Total_Cartera_Local_Valida: monto(b.totalCartera),
        Operaciones_Validas: b.operacionesValidas,
      })),
    });
  });

  return rutas;
}

function productoJson(p) {
  return {
    Ranking: p.ranking,
    Subactividad: p.subactividad,
    Saldo: monto(p.saldo),
    Operaciones: p.operaciones, // null si el período no trae operaciones
    Pct_Del_Ranking: porcentaje(p.pctRankingE4),
    Pct_Del_Total: porcentaje(p.pctTotalE4),
    Lider: p.lider && { Codigo_Banco: p.lider.codigoBanco, Banco: p.lider.banco, Saldo: monto(p.lider.saldo) },
    Bancos: p.bancos.map((b) => ({ Codigo_Banco: b.codigoBanco, Banco: b.banco, Saldo: monto(b.saldo), Operaciones: b.operaciones })),
  };
}
