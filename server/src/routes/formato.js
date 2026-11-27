// Convierte los resultados del motor (centavos, diezmilésimas, camelCase) al formato JSON
// de los contratos: nombres de campo de las indicaciones y montos como número con 2 decimales.

export const FUENTE = 'AT03 sintético · Hackathon SBP 2026';
export const AVISO = 'Datos ficticios · Uso informativo, no opinión formal de la SBP';

// Dividir un entero exacto entre 100 da el número más cercano a "x.yz", que JSON escribe como x.yz.
export const monto = (centavos) => centavos / 100;
export const porcentaje = (valorE4) => valorE4 / 10000;

// Encabezado común: fuente, aviso y, si aplica, el período y el archivo de origen.
export function encabezado(periodo) {
  const base = { fuente: FUENTE, aviso: AVISO };
  return periodo ? { ...base, periodo: periodo.fecha, archivo: periodo.nombreArchivo } : base;
}

export function resumenDePeriodo(p) {
  const r = p.reconciliaciones;
  return {
    Fecha: p.fecha,
    Archivo: p.nombreArchivo,
    Filas_Leidas: p.calidad.filasLeidas,
    Universo_Local_Valido: p.calidad.universoValido,
    Saldo_Total_Valido: monto(p.calidad.saldoTotalValido),
    Reconciliaciones_OK: r.r1.ok && r.r2.ok && r.r3.ok && r.unicidad.ok,
  };
}

export function filaDeRanking(f) {
  return {
    Posicion: f.posicion,
    Codigo_Banco: f.codigoBanco,
    Banco: f.banco,
    Saldo_Actividad: monto(f.saldoActividad),
    Total_Cartera_Local_Valida: monto(f.totalCartera),
    Ponderacion_Pct: porcentaje(f.ponderacionE4),
    Operaciones_Validas: f.operacionesValidas,
  };
}

export function filaDeSubactividad(d, catalogos) {
  return {
    Ranking: d.ranking,
    Subactividad: d.subactividad,
    Codigo_Banco: d.codigoBanco,
    Banco: catalogos.bancos.get(d.codigoBanco) ?? `Banco ${d.codigoBanco} (no catalogado)`,
    Saldo: monto(d.saldo),
  };
}

const MAX_ALERTAS = 500;

export function calidadDePeriodo(p) {
  const c = p.calidad;
  const r = p.reconciliaciones;
  return {
    Fecha: p.fecha,
    Archivo: p.nombreArchivo,
    Filas_Leidas: c.filasLeidas,
    E1_Duplicados: c.e1Duplicados,
    E2_Destino_Extranjero: c.e2DestinoExtranjero,
    E3_Saldo_No_Positivo: c.e3SaldoNoPositivo,
    E4_Actividad_No_Catalogada: c.e4ActividadNoCatalogada,
    Universo_Local_Valido: c.universoValido,
    Saldo_Total_Valido: monto(c.saldoTotalValido),
    Cascada_Cuadra: c.cascadaCuadra,
    Reclasificadas_Tarjeta: c.reclasificadasTarjeta,
    Alertas: {
      Banco_Fuera_Catalogo: c.alertasBancoFueraDeCatalogo,
      Facilidad_Fuera_Catalogo: c.alertasFacilidadFueraDeCatalogo,
      Incoherencia_Consumo: c.alertasIncoherenciaConsumo,
      Tipo_Dato: c.alertasTipoDeDato,
    },
    // Rotulado aparte: filas que incumplen cada regla por sí sola (NO es el conteo oficial en cascada)
    Conteos_Independientes: c.conteosIndependientes,
    Reconciliaciones: {
      R1: { ok: r.r1.ok, diferencias: r.r1.diferencias },
      R2: { ok: r.r2.ok, diferencias: r.r2.diferencias },
      R3: { ok: r.r3.ok, Suma_Totales: monto(r.r3.sumaTotales), Suma_Universo: monto(r.r3.sumaUniverso) },
      Unicidad: { ok: r.unicidad.ok, repetidos: r.unicidad.repetidos },
    },
    Alertas_Total: p.alertas.length,
    alertas: p.alertas.slice(0, MAX_ALERTAS).map((a) => ({
      Fila_Archivo: a.fila,
      Numero_Prestamo: a.numeroPrestamo ?? null,
      Tipo: a.tipo,
      Detalle: a.detalle,
    })),
  };
}

export function filaExcluida(e) {
  return {
    Fila_Archivo: e.fila,
    Numero_Prestamo: e.numeroPrestamo,
    Codigo_Banco: e.codigoBanco,
    Motivo: e.motivo,
    Detalle: e.detalle,
  };
}
