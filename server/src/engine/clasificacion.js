// Clasificación con el catálogo CINU + regla especial de CONSUMO con SB21 (Sección 6).
// Solo se usan Tipo_Actividad y Facilidad_Crediticia: nunca nombres ni datos del cliente (R3).
import { aCentavos } from './montos.js';

// Códigos de la regla de CONSUMO tal como los define la Sección 6 de las indicaciones.
// El NOMBRE de la subactividad destino no se escribe aquí: se lee del catálogo CINU.
export const REGLA_CONSUMO = {
  cinuCreditoPersonal: 'K.64.649.6492.64921',
  cinuAutomovil: 'K.64.649.6492.64922',
  cinuTarjeta: 'K.64.649.6499.64991',
  facilidadTarjeta: '07',
  facilidadAutomovil: '03',
};

// Convierte las filas del universo válido en operaciones clasificadas, listas para agregar.
// aplicarReglaConsumo = false existe solo para probar que el total de CONSUMO no cambia.
export function clasificarOperaciones(filasValidas, catalogos, aplicarReglaConsumo = true) {
  const subTarjeta = subactividadTarjeta(catalogos);
  const operaciones = [];
  const alertas = [];

  for (const { numeroFila, datos } of filasValidas) {
    // Cruce exacto Tipo_Actividad = Codigo_CINU (la cascada ya garantizó que existe).
    const actividad = catalogos.cinu.get(datos.Tipo_Actividad);
    const reclasificada = aplicarReglaConsumo && esCreditoPersonalConTarjeta(datos);

    const alerta = alertaDeCoherencia(datos);
    if (alerta) alertas.push({ fila: numeroFila, numeroPrestamo: datos.Numero_Prestamo, ...alerta });

    operaciones.push({
      fila: numeroFila,
      numeroPrestamo: datos.Numero_Prestamo,
      codigoBanco: datos.Codigo_Banco,
      tipoActividad: datos.Tipo_Actividad,
      facilidad: datos.Facilidad_Crediticia,
      macro: actividad.macro,
      sub: reclasificada ? subTarjeta : actividad.sub, // solo mueve saldo dentro de CONSUMO
      reclasificada,
      saldo: aCentavos(datos.Saldo),
      datos, // fila original, para análisis adicionales (mora, vencimientos, tasa)
    });
  }
  return { operaciones, alertas };
}

// Crédito personal pagado con tarjeta de crédito (facilidad 07): en realidad es Tarjeta.
function esCreditoPersonalConTarjeta(datos) {
  return (
    datos.Tipo_Actividad === REGLA_CONSUMO.cinuCreditoPersonal &&
    datos.Facilidad_Crediticia === REGLA_CONSUMO.facilidadTarjeta
  );
}

// Control de coherencia: CINU de Tarjeta debe venir con 07 y CINU de Automóvil con 03.
// Si no cumple, se reporta y se conserva la subactividad del catálogo (no se excluye).
function alertaDeCoherencia(datos) {
  const cinu = datos.Tipo_Actividad;
  const facilidad = datos.Facilidad_Crediticia;
  if (cinu === REGLA_CONSUMO.cinuTarjeta && facilidad !== REGLA_CONSUMO.facilidadTarjeta) {
    return { tipo: 'INCOHERENCIA_CONSUMO', detalle: `CINU de Tarjeta con facilidad "${facilidad}" (se esperaba 07)` };
  }
  if (cinu === REGLA_CONSUMO.cinuAutomovil && facilidad !== REGLA_CONSUMO.facilidadAutomovil) {
    return { tipo: 'INCOHERENCIA_CONSUMO', detalle: `CINU de Automóvil con facilidad "${facilidad}" (se esperaba 03)` };
  }
  return null;
}

// Nombre de la subactividad destino de la reclasificación, leído del catálogo.
function subactividadTarjeta(catalogos) {
  const actividad = catalogos.cinu.get(REGLA_CONSUMO.cinuTarjeta);
  if (!actividad) {
    throw new Error(`El catálogo CINU no contiene ${REGLA_CONSUMO.cinuTarjeta}, necesario para la regla de CONSUMO.`);
  }
  return actividad.sub;
}
