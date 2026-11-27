// Totales por producto de crédito: las 22 subactividades del catálogo CINU, en su orden.
// Sale de lo que ya calculó procesarPeriodo (desglose, operaciones, rankings y calidad):
// montos en centavos enteros y porcentajes en diezmilésimas con ponderacionE4 (BigInt, half-up).
import { ponderacionE4 } from './montos.js';

// periodo: resultado de procesarPeriodo (o el acumulado). Si no trae `operaciones`,
// los conteos por subactividad quedan en null en lugar de inventarse.
// banco (opcional): Codigo_Banco; agrega `banco` con el detalle de ese banco (detalleDeBanco).
export function calcularProductos(periodo, catalogos, { banco = null } = {}) {
  const bancos = bancosDelPeriodo(periodo);
  const conteos = periodo.operaciones ? contarOperaciones(periodo.operaciones) : null;
  const saldoTotal = periodo.calidad.saldoTotalValido;

  const rankings = []; // composición: saldo de cada ranking y su % del total
  const productos = [];
  for (const ranking of catalogos.macroactividades) {
    const totalRanking = totalDeRanking(periodo, ranking);
    rankings.push({ ranking, saldo: totalRanking, pctTotalE4: ponderacionE4(totalRanking, saldoTotal) });
    for (const subactividad of catalogos.subactividadesPorMacro.get(ranking)) {
      productos.push(armarProducto({ periodo, ranking, subactividad, bancos, conteos, totalRanking, saldoTotal }));
    }
  }

  const resultado = {
    saldoTotal,
    universo: periodo.calidad.universoValido,
    reclasificadas: periodo.calidad.reclasificadasTarjeta,
    rankings,
    productos,
    bancos,
  };
  if (banco) resultado.banco = detalleDeBanco(periodo, resultado, banco);
  return resultado;
}

// Detalle de UN banco: su cartera, su lugar en el sistema y su mezcla por ranking y por producto.
// Posición, saldo y ponderación de cada ranking se toman tal cual de los rankings del motor.
function detalleDeBanco(periodo, { saldoTotal, rankings, productos, bancos }, codigoBanco) {
  const banco = bancos.find((b) => b.codigoBanco === codigoBanco);
  const filaEn = (ranking) => periodo.rankings.find((r) => r.ranking === ranking).filas.find((f) => f.codigoBanco === codigoBanco);

  const susRankings = rankings.map(({ ranking, saldo: totalRanking }) => {
    const fila = filaEn(ranking);
    return {
      ranking,
      posicion: fila.posicion,
      saldoActividad: fila.saldoActividad,
      ponderacionE4: fila.ponderacionE4,
      participacionE4: ponderacionE4(fila.saldoActividad, totalRanking), // del total del ranking
      operacionesValidas: fila.operacionesValidas,
    };
  });

  const susProductos = productos.map((p) => {
    const suyo = p.bancos.find((b) => b.codigoBanco === codigoBanco);
    return {
      ranking: p.ranking,
      subactividad: p.subactividad,
      saldo: suyo.saldo,
      operaciones: suyo.operaciones, // null si el período no trae operaciones
      pctRankingE4: ponderacionE4(suyo.saldo, filaEn(p.ranking).saldoActividad), // de lo que el banco tiene en el ranking
      participacionE4: ponderacionE4(suyo.saldo, p.saldo), // del total de la subactividad en los 12 bancos
      posicion: posicionDe(p.bancos, codigoBanco),
    };
  });

  return {
    codigoBanco,
    banco: banco.banco,
    totalCartera: banco.totalCartera,
    operacionesValidas: banco.operacionesValidas,
    participacionE4: ponderacionE4(banco.totalCartera, saldoTotal), // del saldo total válido del sistema
    posicionCartera: posicionDe(bancos.map((b) => ({ codigoBanco: b.codigoBanco, saldo: b.totalCartera })), codigoBanco),
    rankingsLiderados: susRankings.filter((r) => r.posicion === 1).length,
    rankings: susRankings,
    productos: susProductos,
  };
}

// Lugar del banco por saldo, de mayor a menor; en empate, el código menor va primero (como los rankings).
function posicionDe(filas, codigoBanco) {
  const ordenadas = [...filas].sort((a, b) => b.saldo - a.saldo || (a.codigoBanco < b.codigoBanco ? -1 : 1));
  return ordenadas.findIndex((f) => f.codigoBanco === codigoBanco) + 1;
}

function armarProducto({ periodo, ranking, subactividad, bancos, conteos, totalRanking, saldoTotal }) {
  const filas = bancos.map((b) => ({
    codigoBanco: b.codigoBanco,
    banco: b.banco,
    saldo: saldoDelDesglose(periodo, ranking, subactividad, b.codigoBanco),
    operaciones: conteos ? (conteos.get(clave(ranking, subactividad, b.codigoBanco)) ?? 0) : null,
  }));
  const saldo = filas.reduce((suma, f) => suma + f.saldo, 0);
  return {
    ranking,
    subactividad,
    saldo,
    operaciones: conteos ? filas.reduce((suma, f) => suma + f.operaciones, 0) : null,
    pctRankingE4: ponderacionE4(saldo, totalRanking),
    pctTotalE4: ponderacionE4(saldo, saldoTotal),
    lider: liderDe(filas),
    bancos: filas,
  };
}

// Los bancos del período (los mismos del ranking), ordenados por código, con su cartera total
// y sus operaciones válidas: la suma de las operaciones del banco en los 6 rankings.
function bancosDelPeriodo(periodo) {
  const bancos = periodo.rankings[0].filas.map((f) => ({
    codigoBanco: f.codigoBanco,
    banco: f.banco,
    totalCartera: f.totalCartera,
    operacionesValidas: 0,
  }));
  for (const { filas } of periodo.rankings) {
    for (const f of filas) bancos.find((b) => b.codigoBanco === f.codigoBanco).operacionesValidas += f.operacionesValidas;
  }
  return bancos.sort((a, b) => (a.codigoBanco < b.codigoBanco ? -1 : 1));
}

// Banco con más saldo; en empate, el de código menor (los bancos ya vienen por código).
// Sin saldo en la subactividad no hay líder: null.
function liderDe(filas) {
  let lider = null;
  for (const f of filas) {
    if (f.saldo > 0 && (!lider || f.saldo > lider.saldo)) lider = f;
  }
  return lider && { codigoBanco: lider.codigoBanco, banco: lider.banco, saldo: lider.saldo };
}

function totalDeRanking(periodo, ranking) {
  const { filas } = periodo.rankings.find((r) => r.ranking === ranking);
  return filas.reduce((suma, f) => suma + f.saldoActividad, 0);
}

function saldoDelDesglose(periodo, ranking, subactividad, codigoBanco) {
  const fila = periodo.desglose.find(
    (d) => d.ranking === ranking && d.subactividad === subactividad && d.codigoBanco === codigoBanco,
  );
  return fila?.saldo ?? 0;
}

// Operaciones válidas por ranking, subactividad (ya reclasificada por SB21) y banco.
function contarOperaciones(operaciones) {
  const conteos = new Map();
  for (const op of operaciones) {
    const llave = clave(op.macro, op.sub, op.codigoBanco);
    conteos.set(llave, (conteos.get(llave) ?? 0) + 1);
  }
  return conteos;
}

const clave = (ranking, subactividad, codigoBanco) => `${ranking}|${subactividad}|${codigoBanco}`;
