// Datos del Panel interno para el filtro por banco (#204). Aquí solo se eligen, filtran, ordenan y
// renombran valores del API: ninguna cifra se calcula (R2). Sin banco (null) dan lo mismo que antes.
import { TODOS_LOS_PERIODOS } from '../../../lib/periodos.js'

// Cortes que se piden a GET /api/productos con el banco: los cargados hasta el elegido y, si se
// eligió "Todos los períodos", también el acumulado (para las cifras del encabezado).
export function cortesDelBanco(periodos, periodo) {
  if (!periodo) return []
  const fechas = (periodos ?? [])
    .map((p) => p.Fecha)
    .filter((f) => f && f <= periodo)
    .sort()
  return periodo === TODOS_LOS_PERIODOS ? [...fechas, periodo] : fechas
}

// La respuesta de un corte (o del acumulado), o null.
export const respuestaDe = (respuestas, periodo) => (respuestas ?? []).find((r) => r.periodo === periodo) ?? null

// Solo los cortes reales, del más antiguo al más reciente (sin el acumulado).
const cortesReales = (respuestas) =>
  (respuestas ?? []).filter((r) => r.periodo && r.periodo !== TODOS_LOS_PERIODOS).sort((a, b) => a.periodo.localeCompare(b.periodo))

// Cartera y operaciones válidas del banco en cada corte, con la forma de GET /api/periodos
// (Fecha + campo) para reutilizar el mismo gráfico de área.
export function serieDelBanco(respuestas) {
  return cortesReales(respuestas).map((r) => ({
    Fecha: r.periodo,
    Total_Cartera_Local_Valida: r.banco?.Total_Cartera_Local_Valida ?? null,
    Operaciones_Validas: r.banco?.Operaciones_Validas ?? null,
  }))
}

// Saldo por ranking de cada corte. Del sistema: Total_Ranking de GET /api/indicadores.
export const cortesDelSistema = (respuestas) =>
  (respuestas ?? []).map((r) => ({ periodo: r.periodo, filas: (r.concentracion ?? []).map((c) => ({ Ranking: c.Ranking, Saldo: c.Total_Ranking })) }))

// Del banco: Saldo_Actividad de cada ranking en el bloque `banco` de GET /api/productos.
export const cortesDeBanco = (respuestas) =>
  cortesReales(respuestas).map((r) => ({ periodo: r.periodo, filas: (r.banco?.rankings ?? []).map((x) => ({ Ranking: x.Ranking, Saldo: x.Saldo_Actividad })) }))

// Composición por macroactividad: una fila por ranking (en el orden del último corte) con el saldo
// de cada corte en `c<periodo>`. cortes: [{ periodo, filas: [{ Ranking, Saldo }] }].
export function composicionPorCorte(cortes) {
  return (cortes.at(-1)?.filas ?? []).map(({ Ranking }) => {
    const fila = { ranking: Ranking }
    for (const c of cortes) fila[`c${c.periodo}`] = c.filas.find((f) => f.Ranking === Ranking)?.Saldo ?? null
    return fila
  })
}

// Rankings en los que el banco es el primero, según el bloque `banco` de GET /api/productos.
export const rankingsLiderados = (detalle) => (detalle?.rankings ?? []).filter((r) => r.Posicion === 1).map((r) => r.Ranking)

// Movimientos significativos de GET /api/movimientos, los de mayor cambio de posición primero.
// Con `banco`, solo los de ese banco.
export function movimientosSignificativos(datos, banco = null) {
  return (datos?.rankings ?? [])
    .flatMap((r) => (r.movimientos ?? []).filter((m) => m.Significativo !== false).map((m) => ({ ...m, Ranking: r.Ranking })))
    .filter((m) => !banco || m.Codigo_Banco === banco)
    .sort((a, b) => Math.abs(b.Cambio_Posicion ?? 0) - Math.abs(a.Cambio_Posicion ?? 0) || Math.abs(b.Var_Saldo_Pct ?? 0) - Math.abs(a.Var_Saldo_Pct ?? 0))
}

// Rankings que cambiaron de líder. Con `banco`, solo donde ese banco ganó o perdió el primer lugar.
export function cambiosDeLider(datos, banco = null) {
  return (datos?.rankings ?? []).filter(
    (r) => r.Cambio_Lider && (!banco || r.Lider_anterior?.Codigo_Banco === banco || r.Lider_actual?.Codigo_Banco === banco),
  )
}

// Una fila de GET /api/movimientos/descomposicion lista para las barras apiladas; `etiqueta` va en el eje.
const barraDescomposicion = (f, etiqueta) => ({
  etiqueta,
  Nuevos: f.Nuevos?.Saldo ?? null,
  Salen: f.Salen?.Saldo ?? null,
  Amortizacion: f.Amortizacion?.Saldo ?? null,
  Var_Saldo: f.Var_Saldo,
  operaciones: { Nuevos: f.Nuevos?.Operaciones, Salen: f.Salen?.Operaciones, Amortizacion: f.Amortizacion?.Operaciones },
})

// Sin banco: los bancos del ranking elegido, de mayor a menor variación del saldo.
// Con banco: ese banco en cada ranking, en el orden en que llegan del API.
export function datosDescomposicion(filas, { ranking = null, banco = null } = {}) {
  if (banco) return (filas ?? []).filter((f) => f.Codigo_Banco === banco).map((f) => barraDescomposicion(f, f.Ranking))
  return (filas ?? [])
    .filter((f) => f.Ranking === ranking)
    .sort((a, b) => (b.Var_Saldo ?? 0) - (a.Var_Saldo ?? 0))
    .map((f) => barraDescomposicion(f, f.Banco))
}

// Morosidad y vencimientos del banco en una respuesta de GET /api/indicadores, o null.
export function riesgoDelBanco(datos, banco) {
  if (!banco) return null
  const mora = datos?.morosidad?.bancos?.find((b) => b.Codigo_Banco === banco) ?? null
  const vencimientos = datos?.vencimientos?.bancos?.find((b) => b.Codigo_Banco === banco) ?? null
  return mora || vencimientos ? { mora, vencimientos } : null
}
