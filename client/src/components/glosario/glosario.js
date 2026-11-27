// Glosario en contexto (#129): términos técnicos explicados en lenguaje simple.
// Las definiciones resumen info/INDICACIONES_RETO_RANKING_CREDITO.md y no traen cifras (R2).
export const GLOSARIO = {
  ponderacion: {
    nombre: 'Ponderación',
    definicion:
      'Qué parte de la cartera del banco está en esta actividad: el saldo de la actividad dividido entre su total de cartera local válida, en porcentaje con cuatro decimales.',
  },
  total_cartera: {
    nombre: 'Total de cartera local válida',
    definicion:
      'La suma de los saldos de todos los préstamos válidos del banco en el período, en todas las actividades. Es el denominador de la ponderación y no cambia al filtrar por ranking.',
  },
  universo: {
    nombre: 'Universo local válido',
    definicion:
      'Los préstamos que quedan después de las exclusiones E1 a E4. Con ellos se calculan todos los rankings del período.',
  },
  cascada: {
    nombre: 'Exclusiones E1–E4',
    definicion:
      'Filtros de calidad que se aplican en orden, de E1 a E4. Cada fila excluida se cuenta una sola vez, en el primer filtro que incumple.',
  },
  e1: {
    nombre: 'E1 · Duplicados',
    definicion:
      'Si un mismo número de préstamo aparece más de una vez en el período, se conserva la primera vez que aparece en el archivo y las demás se excluyen.',
  },
  e2: {
    nombre: 'E2 · Destino extranjero',
    definicion: 'Se excluyen los préstamos cuyo destino no es local, es decir, los otorgados para usarse fuera del país.',
  },
  e3: {
    nombre: 'E3 · Saldo no positivo',
    definicion: 'Se excluyen los préstamos con saldo cero o negativo, porque no suman cartera.',
  },
  e4: {
    nombre: 'E4 · Actividad no catalogada',
    definicion:
      'Se excluyen los préstamos cuya actividad económica no está en el catálogo CINU del reto, porque no se pueden clasificar en un ranking.',
  },
  operaciones: {
    nombre: 'Operaciones válidas',
    definicion: 'Cuántos préstamos del universo local válido forman el saldo del banco en esta actividad.',
  },
  sb21: {
    nombre: 'Regla SB21',
    definicion:
      'Los préstamos registrados como crédito personal pero otorgados con tarjeta de crédito (facilidad 07) se cuentan en la subactividad Tarjeta. Solo mueve saldo dentro de CONSUMO: el total de la actividad no cambia.',
  },
}

export const entradaDeGlosario = (termino) => GLOSARIO[termino] ?? null
