// GET /api/productos?periodo=&banco=: totales por producto de crédito (las 22 subactividades),
// calculados por el motor (engine/productos.js). Con `banco`, agrega el detalle de ese banco.
// Abierto a los 3 perfiles. Formato en contracts/productos.md.
import { Router } from 'express';
import { calcularProductos } from '../engine/index.js';
import { encabezado, monto, porcentaje } from './formato.js';
import { periodoPedido, bancoPedido } from './parametros.js';

export function rutasDeProductos(almacen) {
  const rutas = Router();

  rutas.get('/productos', (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo, { permitirTodos: true });
    const banco = bancoPedido(almacen, req.query.banco); // null = sin detalle de banco
    const resultado = calcularProductos(periodo, almacen.catalogos, { banco });
    res.json({
      ...encabezado(periodo),
      Saldo_Total_Valido: monto(resultado.saldoTotal),
      Universo_Local_Valido: resultado.universo,
      Reclasificadas_Tarjeta: resultado.reclasificadas,
      // Composición del sistema: los 6 rankings, en el orden del catálogo.
      rankings: resultado.rankings.map((r) => ({ Ranking: r.ranking, Saldo: monto(r.saldo), Pct_Del_Total: porcentaje(r.pctTotalE4) })),
      productos: resultado.productos.map(productoJson),
      bancos: resultado.bancos.map((b) => ({
        Codigo_Banco: b.codigoBanco,
        Banco: b.banco,
        Total_Cartera_Local_Valida: monto(b.totalCartera),
        Operaciones_Validas: b.operacionesValidas,
      })),
      ...(resultado.banco ? { banco: bancoJson(resultado.banco) } : {}),
    });
  });

  return rutas;
}

function bancoJson(b) {
  return {
    Codigo_Banco: b.codigoBanco,
    Banco: b.banco,
    Total_Cartera_Local_Valida: monto(b.totalCartera),
    Operaciones_Validas: b.operacionesValidas,
    Participacion_Pct: porcentaje(b.participacionE4),
    Posicion_Cartera: b.posicionCartera,
    Rankings_Liderados: b.rankingsLiderados,
    rankings: b.rankings.map((r) => ({
      Ranking: r.ranking,
      Posicion: r.posicion,
      Saldo_Actividad: monto(r.saldoActividad),
      Ponderacion_Pct: porcentaje(r.ponderacionE4),
      Participacion_Pct: porcentaje(r.participacionE4),
      Operaciones_Validas: r.operacionesValidas,
    })),
    productos: b.productos.map((p) => ({
      Ranking: p.ranking,
      Subactividad: p.subactividad,
      Saldo: monto(p.saldo),
      Operaciones: p.operaciones, // null si el período no trae operaciones
      Pct_Del_Ranking: porcentaje(p.pctRankingE4),
      Participacion_Pct: porcentaje(p.participacionE4),
      Posicion: p.posicion,
    })),
  };
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
