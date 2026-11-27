// Utilidades sobre la lista de períodos del API (GET /api/periodos). Los períodos llegan como AAAAMMDD.

// Período cargado inmediatamente anterior a `periodo`, o null si es el primero (o no está en la lista).
export function periodoAnterior(periodos, periodo) {
  const fechas = (periodos ?? []).map((p) => p.Fecha).filter(Boolean).sort()
  const indice = fechas.indexOf(periodo)
  return indice > 0 ? fechas[indice - 1] : null
}
