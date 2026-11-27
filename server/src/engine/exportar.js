// Exportaciones CSV (entregables 2, 3 y 4, más la lista auditable de excluidas y las alertas).
// Reciben la lista de períodos procesados y devuelven texto CSV (UTF-8, coma, punto decimal).
// Los montos se formatean a 2 decimales y la ponderación a 4 decimales solo aquí, al exportar.
import { formatearCentavos, formatearE4 } from './montos.js';

export const COLUMNAS = {
  rankings: ['Fecha', 'Ranking', 'Posicion', 'Codigo_Banco', 'Banco', 'Saldo_Actividad', 'Total_Cartera_Local_Valida', 'Ponderacion_Pct', 'Operaciones_Validas'],
  desglose: ['Fecha', 'Ranking', 'Subactividad', 'Codigo_Banco', 'Saldo'],
  calidad: [
    // Columnas del reporte oficial de calidad (entregable 4)
    'Fecha', 'Filas_Leidas', 'E1_Duplicados', 'E2_Destino_Extranjero', 'E3_Saldo_No_Positivo',
    'E4_Actividad_No_Catalogada', 'Universo_Local_Valido', 'Saldo_Total_Valido',
    // Controles adicionales
    'Cascada_Cuadra', 'Reclasificadas_Tarjeta_SB21', 'Alertas_Banco_Fuera_Catalogo',
    'Alertas_Facilidad_Fuera_Catalogo', 'Alertas_Incoherencia_Consumo', 'Alertas_Tipo_Dato',
    'Reconciliacion_1', 'Reconciliacion_2', 'Reconciliacion_3', 'Unicidad_Prestamos',
  ],
  excluidas: ['Fecha', 'Fila_Archivo', 'Numero_Prestamo', 'Codigo_Banco', 'Motivo', 'Detalle'],
  alertas: ['Fecha', 'Fila_Archivo', 'Numero_Prestamo', 'Tipo', 'Detalle'],
};

// Entregable 2: rankings por período.
export function csvRankings(periodos) {
  const filas = [];
  for (const p of periodos) {
    for (const { ranking, filas: bancos } of p.rankings) {
      for (const b of bancos) {
        filas.push([
          p.fecha, ranking, b.posicion, b.codigoBanco, b.banco,
          formatearCentavos(b.saldoActividad), formatearCentavos(b.totalCartera),
          formatearE4(b.ponderacionE4), b.operacionesValidas,
        ]);
      }
    }
  }
  return aCsv(COLUMNAS.rankings, filas);
}

// Entregable 3: desglose por subactividad (incluye la reclasificación SB21 a Tarjeta).
export function csvDesglose(periodos) {
  const filas = [];
  for (const p of periodos) {
    for (const d of p.desglose) {
      filas.push([p.fecha, d.ranking, d.subactividad, d.codigoBanco, formatearCentavos(d.saldo)]);
    }
  }
  return aCsv(COLUMNAS.desglose, filas);
}

// Entregable 4: reporte de calidad por período (cascada E1-E4 y universo válido) + controles.
export function csvCalidad(periodos) {
  const okONo = (control) => (control.ok ? 'OK' : 'DESCUADRE');
  const filas = periodos.map(({ fecha, calidad: c, reconciliaciones: r }) => [
    fecha, c.filasLeidas, c.e1Duplicados, c.e2DestinoExtranjero, c.e3SaldoNoPositivo,
    c.e4ActividadNoCatalogada, c.universoValido, formatearCentavos(c.saldoTotalValido),
    c.cascadaCuadra ? 'SI' : 'NO', c.reclasificadasTarjeta, c.alertasBancoFueraDeCatalogo,
    c.alertasFacilidadFueraDeCatalogo, c.alertasIncoherenciaConsumo, c.alertasTipoDeDato,
    okONo(r.r1), okONo(r.r2), okONo(r.r3), okONo(r.unicidad),
  ]);
  return aCsv(COLUMNAS.calidad, filas);
}

// Exclusión auditable: cada fila excluida con su motivo.
export function csvExcluidas(periodos) {
  const filas = [];
  for (const p of periodos) {
    for (const e of p.excluidas) filas.push([p.fecha, e.fila, e.numeroPrestamo, e.codigoBanco, e.motivo, e.detalle]);
  }
  return aCsv(COLUMNAS.excluidas, filas);
}

// Alertas de calidad (no excluyen filas).
export function csvAlertas(periodos) {
  const filas = [];
  for (const p of periodos) {
    for (const a of p.alertas) filas.push([p.fecha, a.fila, a.numeroPrestamo ?? '', a.tipo, a.detalle]);
  }
  return aCsv(COLUMNAS.alertas, filas);
}

function aCsv(columnas, filas) {
  const lineas = [columnas.join(',')];
  for (const fila of filas) lineas.push(fila.map(escapar).join(','));
  return lineas.join('\n') + '\n';
}

// Comillas solo cuando hacen falta, por ejemplo "Alimentos, bebidas y tabaco".
function escapar(valor) {
  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}
