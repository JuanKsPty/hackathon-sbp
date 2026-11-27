// Gráficos que pide el chat (#108). La acción la arma el server (server/src/ai/intencion.js) y llega
// en `accion` de POST /api/ia/preguntar: la propone la IA o, sin IA, el intérprete por reglas.
// Aquí solo se elige la última acción y se acomodan los datos de la API para dibujarlos: ordenar,
// filtrar y renombrar campos. No se calcula ninguna cifra (R2): cada valor viene del motor.
import { MOTIVOS } from '../calidad/motivos.js'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// '20260930' -> 'septiembre'. Para escribir sugerencias con los períodos cargados.
export function nombreMes(fecha) {
  return MESES[Number(String(fecha ?? '').slice(4, 6)) - 1] ?? String(fecha ?? '')
}

// Gráficos que se ven ahora: solo los de la respuesta en la que el usuario tocó "Ver gráficos"
// (`elegido`). Nunca aparecen solos, y con cada pregunta nueva se ocultan (elegido vuelve a null).
export function ultimaAccion(mensajes = [], elegido = null) {
  if (elegido == null) return null
  const mensaje = mensajes.find((m) => m.id === elegido)
  return mensaje?.rol === 'asistente' && mensaje.datos?.accion?.graficos?.length > 0 ? { id: mensaje.id, ...mensaje.datos.accion } : null
}

// Preguntas de ejemplo con los períodos cargados. Público no compara períodos (contracts/perfiles.md).
export function sugerenciasDeGraficos(perfil, periodos = []) {
  const fechas = periodos.map((p) => p.Fecha ?? p).filter(Boolean)
  const ultimo = fechas.at(-1)
  const anterior = fechas.at(-2) ?? ultimo
  const primero = fechas[0]
  if (!ultimo) return []
  if (perfil === 'publico') {
    return [`Ranking de construcción de ${nombreMes(anterior)}`, `¿Quién lidera HIPOTECARIO en ${nombreMes(ultimo)}?`, `Calidad de datos de ${nombreMes(ultimo)}`]
  }
  const lista = [`Dame el informe de ${nombreMes(ultimo)}`, `Ranking de construcción de ${nombreMes(anterior)}`]
  if (primero !== ultimo) lista.push(`Compara ${nombreMes(primero)} y ${nombreMes(ultimo)}`)
  lista.push('¿Cómo va el banco 108?')
  return lista
}

// Rankings disponibles en una respuesta de /api/rankings, en el orden del catálogo.
export const nombresDeRankings = (respuesta) => (respuesta?.rankings ?? []).map((r) => r.Ranking)

// Bancos de un ranking (/api/rankings), en el orden de su posición.
export function bancosDelRanking(respuesta, ranking) {
  const fila = respuesta?.rankings?.find((r) => r.Ranking === ranking) ?? respuesta?.rankings?.[0]
  return [...(fila?.bancos ?? [])].sort((a, b) => a.Posicion - b.Posicion)
}

// El banco en la posición 1 de cada ranking (/api/rankings).
export function lideres(respuesta) {
  return (respuesta?.rankings ?? []).map((r) => ({
    Ranking: r.Ranking,
    lider: r.bancos.find((b) => b.Posicion === 1) ?? null,
  }))
}

// Saldos por subactividad de un ranking (/api/subactividades), una fila por banco en el orden del
// ranking y una columna por subactividad, para un gráfico de barras apiladas. Cada subactividad
// lleva una clave corta (s0, s1…) porque el gráfico la usa como nombre de variable CSS.
export function subactividadesPorBanco(respuesta, bancos, ranking) {
  const filas = (respuesta?.subactividades ?? []).filter((f) => f.Ranking === ranking)
  const subactividades = [...new Set(filas.map((f) => f.Subactividad))].map((nombre, i) => ({ clave: `s${i}`, nombre }))
  const clave = new Map(subactividades.map((s) => [s.nombre, s.clave]))
  const datos = bancos.map((b) => ({
    codigo: b.Codigo_Banco,
    nombre: `${b.Posicion}. ${b.Banco}`,
    ...Object.fromEntries(filas.filter((f) => f.Codigo_Banco === b.Codigo_Banco).map((f) => [clave.get(f.Subactividad), f.Saldo])),
  }))
  return { subactividades, datos }
}

// Movimientos (/api/movimientos) de un ranking, en el orden de la posición actual; o, si se indica
// un banco, sus movimientos en cada ranking.
export function filasMovimientos(respuesta, { ranking, banco } = {}) {
  const rankings = respuesta?.rankings ?? []
  if (banco) {
    return rankings.flatMap((r) =>
      r.movimientos.filter((m) => m.Codigo_Banco === banco).map((m) => ({ ...m, etiqueta: r.Ranking })),
    )
  }
  const fila = rankings.find((r) => r.Ranking === ranking) ?? rankings[0]
  return [...(fila?.movimientos ?? [])]
    .sort((a, b) => a.Posicion_actual - b.Posicion_actual)
    .map((m) => ({ ...m, etiqueta: `${m.Posicion_actual}. ${m.Banco}` }))
}

// Rankings donde cambió el líder (/api/movimientos).
export function cambiosDeLider(respuesta) {
  return (respuesta?.rankings ?? [])
    .filter((r) => r.Cambio_Lider)
    .map((r) => ({ Ranking: r.Ranking, anterior: r.Lider_anterior, actual: r.Lider_actual }))
}

// Posición de un banco en cada ranking y período. `respuestas` son las de
// /api/rankings?periodo=…&banco=…, una por período: una fila por período, una columna por ranking.
export function posicionesPorPeriodo(respuestas = []) {
  return respuestas.map((r) => ({
    periodo: r.periodo,
    ...Object.fromEntries((r.rankings ?? []).map((x) => [x.Ranking, x.bancos?.[0]?.Posicion ?? null])),
  }))
}

// Exclusiones E1–E4 de un período de /api/calidad, con los conteos del API.
export function barrasCalidad(periodo) {
  if (!periodo) return []
  return MOTIVOS.map((m) => ({ clave: m.codigo, nombre: `${m.codigo} · ${m.nombre}`, valor: periodo[m.campo] }))
}

// Reconciliaciones de un período de /api/calidad: nombre y si cuadran (el `ok` viene del API).
export function reconciliaciones(periodo) {
  const r = periodo?.Reconciliaciones ?? {}
  return ['R1', 'R2', 'R3', 'Unicidad'].filter((clave) => r[clave]).map((clave) => ({ clave, ok: Boolean(r[clave].ok) }))
}
