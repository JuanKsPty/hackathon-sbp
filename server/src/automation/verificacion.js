// Verificación del jurado (#63): un dato de cada punto de la sección 11.1 en una sola respuesta,
// con chequeos automáticos de la sección 12. No recalcula nada: ordena resultados que el motor
// ya calculó (rankings, desglose, calidad y reconciliaciones) y los compara entre sí, en centavos.
import { monto, porcentaje } from '../routes/formato.js';

// Sección 5 de las indicaciones: los 4 rankings obligatorios y los 2 adicionales.
export const RANKINGS_OBLIGATORIOS = ['HIPOTECARIO', 'CONSTRUCCION', 'INDUSTRIA', 'AGROPECUARIO'];
export const RANKINGS_ADICIONALES = ['COMERCIO', 'CONSUMO'];
const CONSUMO = 'CONSUMO';
const TARJETA = 'Tarjeta';
// Las 6 ponderaciones de un banco suman 100 salvo el redondeo a 4 decimales: hasta 0.5 diezmilésimas cada una.
const TOLERANCIA_SUMA_E4 = 3;

const chequeo = (nombre, ok) => ({ nombre, ok: Boolean(ok) });

const filaRanking = (f) => ({
  Posicion: f.posicion,
  Codigo_Banco: f.codigoBanco,
  Banco: f.banco,
  Saldo_Actividad: monto(f.saldoActividad),
});

function rankingsDe(periodo, nombres, banco) {
  return nombres
    .map((nombre) => periodo.rankings.find((r) => r.ranking === nombre))
    .filter(Boolean)
    .map((r) => ({ Ranking: r.ranking, bancos: r.filas.filter((f) => !banco || f.codigoBanco === banco).map(filaRanking) }));
}

// Cada ranking tiene todos los bancos, con posiciones 1..n sin huecos.
function rankingsCompletos(periodo, nombres, totalBancos) {
  return nombres.every((nombre) => {
    const r = periodo.rankings.find((x) => x.ranking === nombre);
    return r && r.filas.length === totalBancos && r.filas.every((f, i) => f.posicion === i + 1);
  });
}

/**
 * @param {object} almacen almacén de períodos (datos/almacen.js)
 * @param {object} periodo período elegido (el último si no se indica)
 * @param {string|null} banco código de banco para acotar los datos (los chequeos usan todos)
 */
export function armarVerificacion(almacen, periodo, banco = null) {
  const { catalogos } = almacen;
  const todos = almacen.todos();
  const totalBancos = periodo.rankings[0]?.filas.length ?? 0;
  const deBanco = (codigo) => !banco || codigo === banco;

  // ---- 1. Reporte de calidad: cascada E1–E4 y universo, por período ----
  const punto1 = {
    punto: 1,
    titulo: 'Reporte de calidad: E1–E4 y universo local válido',
    datos: {
      periodos: todos.map((p) => ({
        Fecha: p.fecha,
        Filas_Leidas: p.calidad.filasLeidas,
        E1_Duplicados: p.calidad.e1Duplicados,
        E2_Destino_Extranjero: p.calidad.e2DestinoExtranjero,
        E3_Saldo_No_Positivo: p.calidad.e3SaldoNoPositivo,
        E4_Actividad_No_Catalogada: p.calidad.e4ActividadNoCatalogada,
        Universo_Local_Valido: p.calidad.universoValido,
      })),
    },
    chequeos: [
      chequeo('Filas leídas = E1 + E2 + E3 + E4 + universo, en cada período', todos.every((p) => p.calidad.cascadaCuadra)),
      chequeo('Ningún préstamo se repite en el universo válido', todos.every((p) => p.reconciliaciones.unicidad.ok)),
    ],
  };

  // ---- 2 y 3. Rankings: posiciones y saldos ----
  const punto2 = {
    punto: 2,
    titulo: 'Rankings obligatorios: posiciones y saldos',
    datos: { rankings: rankingsDe(periodo, RANKINGS_OBLIGATORIOS, banco) },
    chequeos: [chequeo(`Cada ranking tiene ${totalBancos} bancos con posiciones 1 a ${totalBancos} sin huecos`, rankingsCompletos(periodo, RANKINGS_OBLIGATORIOS, totalBancos))],
  };
  const punto3 = {
    punto: 3,
    titulo: 'Rankings COMERCIO y CONSUMO: posiciones y saldos',
    datos: { rankings: rankingsDe(periodo, RANKINGS_ADICIONALES, banco) },
    chequeos: [chequeo(`Cada ranking tiene ${totalBancos} bancos con posiciones 1 a ${totalBancos} sin huecos`, rankingsCompletos(periodo, RANKINGS_ADICIONALES, totalBancos))],
  };

  // ---- 4. Total de cartera y ponderación ----
  const porBanco = new Map();
  for (const r of periodo.rankings) {
    for (const f of r.filas) {
      const b = porBanco.get(f.codigoBanco) ?? { codigo: f.codigoBanco, banco: f.banco, totales: new Set(), total: f.totalCartera, pond: {}, sumaE4: 0 };
      b.totales.add(f.totalCartera);
      b.pond[r.ranking] = f.ponderacionE4;
      b.sumaE4 += f.ponderacionE4;
      porBanco.set(f.codigoBanco, b);
    }
  }
  const bancos = [...porBanco.values()];
  const punto4 = {
    punto: 4,
    titulo: 'Total de cartera local válida y ponderación',
    datos: {
      bancos: bancos.filter((b) => deBanco(b.codigo)).map((b) => ({
        Codigo_Banco: b.codigo,
        Banco: b.banco,
        Total_Cartera_Local_Valida: monto(b.total),
        Ponderacion_Pct: Object.fromEntries(Object.entries(b.pond).map(([k, v]) => [k, porcentaje(v)])),
      })),
    },
    chequeos: [
      chequeo('El denominador (total de cartera) es el mismo en los 6 rankings de cada banco', bancos.every((b) => b.totales.size === 1)),
      chequeo('Las 6 ponderaciones de cada banco suman 100 (con la tolerancia del redondeo)', bancos.every((b) => b.total === 0 || Math.abs(b.sumaE4 - 1_000_000) <= TOLERANCIA_SUMA_E4)),
    ],
  };

  // ---- 5. Desglose por subactividad, incluida la reclasificación a Tarjeta ----
  const subConsumo = catalogos.subactividadesPorMacro.get(CONSUMO) ?? [];
  const saldoSub = new Map(periodo.desglose.map((d) => [`${d.ranking}|${d.codigoBanco}|${d.subactividad}`, d.saldo]));
  const rConsumo = periodo.rankings.find((r) => r.ranking === CONSUMO);
  const cuadraDesglose = periodo.rankings.every((r) =>
    r.filas.every((f) => {
      const suma = periodo.desglose.filter((d) => d.ranking === r.ranking && d.codigoBanco === f.codigoBanco).reduce((s, d) => s + d.saldo, 0);
      return suma === f.saldoActividad;
    }),
  );
  const punto5 = {
    punto: 5,
    titulo: 'Desglose por subactividad (CONSUMO con la reclasificación SB21 a Tarjeta)',
    datos: {
      Reclasificadas_Tarjeta: periodo.calidad.reclasificadasTarjeta,
      consumo: (rConsumo?.filas ?? []).filter((f) => deBanco(f.codigoBanco)).map((f) => ({
        Codigo_Banco: f.codigoBanco,
        Banco: f.banco,
        Saldo_Actividad: monto(f.saldoActividad),
        Subactividades: Object.fromEntries(subConsumo.map((s) => [s, monto(saldoSub.get(`${CONSUMO}|${f.codigoBanco}|${s}`) ?? 0)])),
      })),
    },
    chequeos: [
      chequeo('CONSUMO incluye la subactividad Tarjeta', subConsumo.includes(TARJETA)),
      chequeo('En cada ranking y banco, la suma de subactividades = saldo de la actividad (el total de CONSUMO no cambia con SB21)', cuadraDesglose),
    ],
  };

  // ---- 6. Los períodos procesados y las reconciliaciones 1 y 2 ----
  const punto6 = {
    punto: 6,
    titulo: 'Períodos procesados y reconciliaciones',
    datos: {
      periodos: todos.map((p) => ({
        Fecha: p.fecha,
        Archivo: p.nombreArchivo,
        R1: p.reconciliaciones.r1.ok,
        R2: p.reconciliaciones.r2.ok,
        R3: p.reconciliaciones.r3.ok,
      })),
    },
    chequeos: [
      chequeo(`Hay ${todos.length} períodos procesados (se esperan al menos 3)`, todos.length >= 3),
      chequeo('Reconciliaciones 1 y 2 cuadran al centavo en todos los períodos', todos.every((p) => p.reconciliaciones.r1.ok && p.reconciliaciones.r2.ok)),
    ],
  };

  // Un objeto con una clave por punto (cada punto tiene datos de forma distinta).
  const puntos = {
    calidad: punto1,
    rankings_obligatorios: punto2,
    rankings_adicionales: punto3,
    ponderacion: punto4,
    subactividades: punto5,
    periodos: punto6,
  };
  return {
    periodo: periodo.fecha,
    archivo: periodo.nombreArchivo,
    periodos: todos.map((p) => p.fecha),
    banco: banco ? { Codigo_Banco: banco, Banco: catalogos.bancos.get(banco) ?? banco } : null,
    todo_ok: Object.values(puntos).every((p) => p.chequeos.every((c) => c.ok)),
    puntos,
  };
}
