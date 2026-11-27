// Glosario en lenguaje simple para el perfil Público (#129). Explica los términos técnicos
// donde aparecen, con un ícono ⓘ (components/glosario/AyudaTermino.jsx).
// Las definiciones salen de las indicaciones del reto (secciones 4 a 7) y no traen cifras (R2).
export const GLOSARIO = {
  posicion: {
    termino: 'Posición',
    definicion: 'Lugar del banco en el ranking. El 1 es el banco con mayor saldo en esa actividad; si dos bancos empatan, va primero el de código menor.',
  },
  saldo_actividad: {
    termino: 'Saldo de la actividad',
    definicion: 'Suma de lo que deben los préstamos locales válidos del banco en esa actividad económica, al cierre del período.',
  },
  total_cartera: {
    termino: 'Total cartera válida',
    definicion: 'Suma de todos los préstamos locales válidos del banco, en las 6 actividades. Es la base para calcular la ponderación.',
  },
  ponderacion: {
    termino: 'Ponderación',
    definicion: 'Qué parte de la cartera válida del banco está en esta actividad: saldo de la actividad ÷ total cartera válida × 100, con 4 decimales.',
  },
  operaciones: {
    termino: 'Operaciones',
    definicion: 'Cantidad de préstamos válidos que suman el saldo de la actividad.',
  },
  subactividad: {
    termino: 'Subactividad',
    definicion: 'Parte de una actividad según el catálogo CINU, por ejemplo Vivienda propia dentro de HIPOTECARIO. La suma de las subactividades da el saldo de la actividad.',
  },
  regla_sb21: {
    termino: 'Regla SB21',
    definicion: 'En CONSUMO, los créditos personales pagados con tarjeta de crédito (facilidad 07) se cuentan en Tarjeta. Solo mueve saldo dentro de CONSUMO: el total no cambia.',
  },
  universo: {
    termino: 'Universo local válido',
    definicion: 'Préstamos que quedan después de las cuatro exclusiones (E1 a E4). Con ellos se calculan todos los rankings.',
  },
  filas_leidas: {
    termino: 'Filas leídas',
    definicion: 'Cantidad de préstamos que trae el archivo AT03 del período, antes de cualquier exclusión.',
  },
  E1: {
    termino: 'E1 · Duplicados',
    definicion: 'Préstamos con un número que ya apareció antes en el mismo período. Se conserva solo la primera vez que aparece en el archivo.',
  },
  E2: {
    termino: 'E2 · Destino extranjero',
    definicion: 'Préstamos cuyo destino no es local (Destino distinto de L). Los rankings solo miden la cartera local.',
  },
  E3: {
    termino: 'E3 · Saldo no positivo',
    definicion: 'Préstamos con saldo en cero o negativo. No suman a ningún ranking.',
  },
  E4: {
    termino: 'E4 · Actividad no catalogada',
    definicion: 'Préstamos con un código de actividad que no está en el catálogo CINU, así que no se pueden clasificar.',
  },
  cascada: {
    termino: 'Cascada de exclusiones',
    definicion: 'Las exclusiones se aplican en orden (E1, E2, E3 y E4) y cada préstamo cuenta solo en la primera que incumple. Por eso filas leídas = E1 + E2 + E3 + E4 + universo.',
  },
}

export function definicion(clave) {
  return GLOSARIO[clave] ?? null
}
