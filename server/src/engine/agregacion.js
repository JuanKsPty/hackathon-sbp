// Agregación en centavos enteros (Sección 4.C, pasos 5 a 7).
// Las tres sumas salen directamente de las operaciones; las reconciliaciones
// verifican después que cuadren entre sí al centavo.

export const claveSub = (macro, banco, sub) => `${macro}|${banco}|${sub}`;
export const claveActividad = (macro, banco) => `${macro}|${banco}`;

// operaciones: universo local válido ya clasificado, de UN período.
export function agregar(operaciones) {
  const saldoPorSubactividad = new Map(); // Macro+Banco+Sub -> Saldo_Subactividad
  const actividadPorBanco = new Map(); // Macro+Banco -> { saldo: Saldo_Actividad_Banco, operaciones }
  const totalPorBanco = new Map(); // Banco -> Total_Cartera_Local_Valida (las 6 macroactividades)
  let saldoTotal = 0; // suma de Saldo de todo el universo válido del período

  for (const op of operaciones) {
    sumarEn(saldoPorSubactividad, claveSub(op.macro, op.codigoBanco, op.sub), op.saldo);

    const clave = claveActividad(op.macro, op.codigoBanco);
    const actual = actividadPorBanco.get(clave) ?? { saldo: 0, operaciones: 0 };
    actividadPorBanco.set(clave, { saldo: actual.saldo + op.saldo, operaciones: actual.operaciones + 1 });

    // El denominador usa TODO el universo válido del banco, nunca un subconjunto filtrado por ranking.
    sumarEn(totalPorBanco, op.codigoBanco, op.saldo);
    saldoTotal += op.saldo;
  }
  return { saldoPorSubactividad, actividadPorBanco, totalPorBanco, saldoTotal };
}

function sumarEn(mapa, clave, monto) {
  mapa.set(clave, (mapa.get(clave) ?? 0) + monto);
}
