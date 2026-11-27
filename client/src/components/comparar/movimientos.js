// Lógica pura de la página Comparar (#61): períodos por omisión, validación del rango, orden de
// la tabla de movimientos y nombres de los motivos. No calcula cifras: todo valor numérico
// llega del API (R2); aquí solo se ordena y se decide qué mostrar.
// Sin imports de la app para poder probarlo con `npm test` (node:test).

// Nombres para mostrar de los motivos de movimiento significativo (contracts/movimientos.json).
export const MOTIVOS = {
  cambio_posicion: 'Cambio de posición',
  cambio_lider: 'Cambio de líder',
  var_saldo_pct: 'Variación de saldo',
}

export const nombreDeMotivo = (motivo) => MOTIVOS[motivo] ?? motivo

// Qué pasó con la posición: Cambio_Posicion > 0 sube, < 0 baja, 0 se mantiene.
// Es null cuando el banco no estaba en el período anterior ('sin_dato').
export function tendenciaDeCambio(cambio) {
  if (typeof cambio !== 'number' || Number.isNaN(cambio)) return 'sin_dato'
  if (cambio > 0) return 'sube'
  if (cambio < 0) return 'baja'
  return 'igual'
}

const ordenarFechas = (fechas) => [...fechas].filter(Boolean).sort()

// Por omisión se compara el penúltimo período con el último. Con un solo período no hay desde.
export function periodosPorDefecto(fechas) {
  const orden = ordenarFechas(fechas)
  return { desde: orden.length >= 2 ? orden.at(-2) : null, hasta: orden.at(-1) ?? null }
}

// Usa la elección del usuario si sigue existiendo entre las opciones válidas (períodos cargados,
// rankings del catálogo); si no, la de omisión.
export function resolverOpcion(elegido, validas, porDefecto) {
  return elegido && validas.includes(elegido) ? elegido : porDefecto
}

// Las fechas son AAAAMMDD, así que comparar texto equivale a comparar fechas.
// Devuelve el mensaje de error, o null si el rango es válido.
export function validarRango(desde, hasta) {
  if (!desde || !hasta) return 'Elige el período inicial y el final.'
  if (desde >= hasta) return 'El período inicial debe ser anterior al final.'
  return null
}

// Columnas de la tabla de movimientos. `valor` es lo que se usa para ordenar.
export const COLUMNAS_MOVIMIENTOS = [
  { clave: 'Banco', titulo: 'Banco', valor: (f) => f.Banco },
  { clave: 'Posicion_anterior', titulo: 'Posición anterior', valor: (f) => f.Posicion_anterior },
  { clave: 'Posicion_actual', titulo: 'Posición actual', valor: (f) => f.Posicion_actual },
  { clave: 'Cambio_Posicion', titulo: 'Cambio de posición', valor: (f) => f.Cambio_Posicion },
  { clave: 'Var_Saldo', titulo: 'Variación de saldo', valor: (f) => f.Var_Saldo },
  { clave: 'Var_Saldo_Pct', titulo: 'Variación %', valor: (f) => f.Var_Saldo_Pct },
  { clave: 'Significativo', titulo: 'Significativo', valor: (f) => (f.Significativo ? 1 : 0) },
  { clave: 'Motivos', titulo: 'Motivos', valor: (f) => f.Motivos?.length ?? 0 },
]

export const ORDEN_INICIAL = { clave: 'Posicion_actual', ascendente: true }

const vacio = (valor) => valor === null || valor === undefined || Number.isNaN(valor)

function compararValores(x, y) {
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y), 'es')
}

// Ordena sin tocar la lista original. Los valores vacíos (por ejemplo Var_Saldo_Pct sin base)
// van siempre al final, sea cual sea el sentido. Los empates se resuelven por posición actual.
export function ordenarMovimientos(filas, { clave, ascendente } = ORDEN_INICIAL) {
  const columna = COLUMNAS_MOVIMIENTOS.find((c) => c.clave === clave) ?? COLUMNAS_MOVIMIENTOS[2]
  const sentido = ascendente ? 1 : -1
  return [...filas].sort((a, b) => {
    const x = columna.valor(a)
    const y = columna.valor(b)
    if (vacio(x) && vacio(y)) return 0
    if (vacio(x)) return 1
    if (vacio(y)) return -1
    const diferencia = compararValores(x, y) * sentido
    if (diferencia !== 0) return diferencia
    return compararValores(a.Posicion_actual, b.Posicion_actual)
  })
}

// Siguiente orden al hacer clic en una columna: otro clic en la misma invierte el sentido.
export function alternarOrden(orden, clave) {
  return { clave, ascendente: orden.clave === clave ? !orden.ascendente : true }
}
