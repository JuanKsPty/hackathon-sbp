// Datos de los gráficos de productos de crédito (#200), a partir de GET /api/productos.
// Aquí solo se eligen, ordenan y renombran valores del API: ninguna cifra se calcula (R2).

// Productos que van en las tarjetas de indicadores. Los nombres son los del catálogo CINU.
export const DESTACADOS = [
  { clave: 'tarjetas', ranking: 'CONSUMO', subactividad: 'Tarjeta', titulo: 'Tarjetas de crédito' },
  { clave: 'automovil', ranking: 'CONSUMO', subactividad: 'Automovil', titulo: 'Automóvil' },
  { clave: 'vivienda', ranking: 'HIPOTECARIO', subactividad: 'Vivienda propia', titulo: 'Vivienda propia' },
]

// Producto que se muestra por banco al abrir el panel: tarjetas de crédito.
export const PRODUCTO_INICIAL = claveProducto(DESTACADOS[0])

export function claveProducto({ ranking, subactividad, Ranking, Subactividad }) {
  return `${ranking ?? Ranking}|${subactividad ?? Subactividad}`
}

export function buscarProducto(datos, clave) {
  return (datos?.productos ?? []).find((p) => claveProducto(p) === clave) ?? null
}

// Opciones del selector de producto, en el orden del catálogo: "CONSUMO · Tarjeta".
export function opcionesProducto(datos) {
  return (datos?.productos ?? []).map((p) => ({ valor: claveProducto(p), etiqueta: `${p.Ranking} · ${p.Subactividad}` }))
}

// Barras de un producto por banco, de mayor a menor saldo (en empate, el código menor).
export function barrasDeProducto(producto) {
  return [...(producto?.Bancos ?? [])]
    .sort((a, b) => b.Saldo - a.Saldo || a.Codigo_Banco.localeCompare(b.Codigo_Banco))
    .map((b) => ({ codigo: b.Codigo_Banco, nombre: b.Banco, saldo: b.Saldo, operaciones: b.Operaciones }))
}

// Barras de la cartera válida de cada banco, de mayor a menor.
export function barrasDeCartera(datos) {
  return [...(datos?.bancos ?? [])]
    .sort((a, b) => b.Total_Cartera_Local_Valida - a.Total_Cartera_Local_Valida || a.Codigo_Banco.localeCompare(b.Codigo_Banco))
    .map((b) => ({ codigo: b.Codigo_Banco, nombre: b.Banco, saldo: b.Total_Cartera_Local_Valida, operaciones: b.Operaciones_Validas }))
}

// Una fila por banco con el saldo de cada producto de un ranking, para barras apiladas.
// Devuelve { filas: [{ codigo, nombre, [subactividad]: saldo }], series: [subactividad] }.
export function apiladoPorBanco(datos, ranking) {
  const productos = (datos?.productos ?? []).filter((p) => p.Ranking === ranking)
  const porBanco = new Map()
  for (const producto of productos) {
    for (const b of producto.Bancos ?? []) {
      if (!porBanco.has(b.Codigo_Banco)) porBanco.set(b.Codigo_Banco, { codigo: b.Codigo_Banco, nombre: b.Banco })
      porBanco.get(b.Codigo_Banco)[producto.Subactividad] = b.Saldo
    }
  }
  const filas = [...porBanco.values()].sort((a, b) => a.codigo.localeCompare(b.codigo))
  return { filas, series: productos.map((p) => p.Subactividad) }
}

// Producto del banco elegido (#204), del bloque `banco` de GET /api/productos?banco=.
export function productoDelBanco(datos, clave) {
  return (datos?.banco?.productos ?? []).find((p) => claveProducto(p) === clave) ?? null
}

// Saldo de un producto en cada corte (solo Analista y Administrador): [{ periodo, saldo }].
// `delBanco`: el saldo del banco elegido en lugar del total del sistema.
export function evolucionDeProducto(respuestas, clave, delBanco = false) {
  const buscar = delBanco ? productoDelBanco : buscarProducto
  return (respuestas ?? [])
    .map((r) => ({ periodo: r?.periodo, saldo: buscar(r, clave)?.Saldo ?? null }))
    .filter((f) => f.periodo && f.saldo !== null)
    .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)))
}
