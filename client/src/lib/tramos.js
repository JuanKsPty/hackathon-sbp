// Nombres legibles de los tramos de /api/indicadores. Las claves son los campos del diccionario AT03
// (Monto_por_Vencer_1_a_5_anos, Monto_Vencido_mas_1_ano, ...); los montos los calcula el API (R2).

// 'Monto_por_Vencer_30_dias' -> '30 días'; 'Monto_por_Vencer_1_a_5_anos' -> '1 a 5 años';
// 'Monto_Vencido_mas_1_ano' -> 'Más de 1 año'.
export function etiquetaTramo(clave) {
  const resto = String(clave ?? '').replace(/^Monto_(por_Vencer|Vencido)_/i, '')
  const texto = resto
    .replace(/^mas_/, 'más de ')
    .replace(/(?<![a-z])dias(?![a-z])/, 'días')
    .replace(/(?<![a-z])anos(?![a-z])/, 'años')
    .replace(/(?<![a-z])ano(?![a-z])/, 'año')
    .replaceAll('_', ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// { clave: monto } -> [{ clave, tramo, monto }], conservando el orden del API (de menor a mayor plazo).
export function tramosParaGrafico(tramos) {
  return Object.entries(tramos ?? {}).map(([clave, monto]) => ({ clave, tramo: etiquetaTramo(clave), monto }))
}
