// Rankings por macroactividad y desglose por subactividad (Sección 4.C, pasos 8 y 9).
import { claveActividad, claveSub } from './agregacion.js';
import { ponderacionE4 } from './montos.js';

// Bancos del catálogo, más cualquier código presente en los datos que no esté catalogado
// (ya se reportó como alerta; se incluye para que la reconciliación 3 cuadre). Ordenados por código.
export function listaDeBancos(agregado, catalogos) {
  const codigos = new Set([...catalogos.bancos.keys(), ...agregado.totalPorBanco.keys()]);
  return [...codigos].sort(compararTexto).map((codigo) => ({
    codigoBanco: codigo,
    banco: catalogos.bancos.get(codigo) ?? `Banco ${codigo} (no catalogado)`,
  }));
}

// Un ranking por cada macroactividad del catálogo, siempre con todos los bancos.
export function construirRankings(agregado, catalogos) {
  const bancos = listaDeBancos(agregado, catalogos);
  return catalogos.macroactividades.map((macro) => ({
    ranking: macro,
    filas: ordenarYNumerar(bancos.map((banco) => filaDeRanking(macro, banco, agregado))),
  }));
}

function filaDeRanking(macro, { codigoBanco, banco }, agregado) {
  const actividad = agregado.actividadPorBanco.get(claveActividad(macro, codigoBanco));
  const saldoActividad = actividad?.saldo ?? 0; // banco sin saldo en la actividad: 0.00
  const totalCartera = agregado.totalPorBanco.get(codigoBanco) ?? 0;
  return {
    codigoBanco,
    banco,
    saldoActividad, // centavos
    totalCartera, // centavos
    ponderacionE4: ponderacionE4(saldoActividad, totalCartera), // diezmilésimas de %
    operacionesValidas: actividad?.operaciones ?? 0,
  };
}

// Saldo descendente; en empate exacto, Codigo_Banco ascendente. Posicion 1 = mayor saldo.
function ordenarYNumerar(filas) {
  const ordenadas = [...filas].sort(
    (a, b) => b.saldoActividad - a.saldoActividad || compararTexto(a.codigoBanco, b.codigoBanco),
  );
  return ordenadas.map((fila, i) => ({ posicion: i + 1, ...fila }));
}

// Desglose: cada subactividad del catálogo por cada banco (0 si no tiene saldo).
export function construirDesglose(agregado, catalogos) {
  const bancos = listaDeBancos(agregado, catalogos);
  const desglose = [];
  for (const macro of catalogos.macroactividades) {
    for (const sub of catalogos.subactividadesPorMacro.get(macro)) {
      for (const { codigoBanco } of bancos) {
        const saldo = agregado.saldoPorSubactividad.get(claveSub(macro, codigoBanco, sub)) ?? 0;
        desglose.push({ ranking: macro, subactividad: sub, codigoBanco, saldo });
      }
    }
  }
  return desglose;
}

function compararTexto(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
