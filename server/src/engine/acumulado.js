// Acumulado de todos los períodos cargados ("Todos los períodos" en el selector del front).
// Junta las operaciones válidas de cada corte y vuelve a pasar por el mismo motor: agregación en
// centavos, rankings con desempate, ponderación y desglose. Así el acumulado sale del cálculo y no
// de sumar a mano lo que ya se mostró (regla R2).
// El resultado tiene la misma forma que procesarPeriodo, con fecha TODOS, para que la API lo trate
// como un período más.
import { agregar } from './agregacion.js';
import { construirRankings, construirDesglose } from './rankings.js';
import { reconciliar } from './reconciliaciones.js';

export const TODOS = 'todos';

// periodos: resultados de procesarPeriodo, en orden de Fecha.
export function acumularPeriodos(periodos, catalogos) {
  const operaciones = periodos.flatMap((p) => p.operaciones);
  const agregado = agregar(operaciones);
  const rankings = construirRankings(agregado, catalogos);
  const desglose = construirDesglose(agregado, catalogos);
  const reconciliaciones = reconciliar({ operaciones, rankings, desglose });
  // Un préstamo sigue vivo de un corte al siguiente: la unicidad se controla dentro de cada período.
  const unicidades = periodos.map((p) => p.reconciliaciones.unicidad);
  reconciliaciones.unicidad = { ok: unicidades.every((u) => u.ok), repetidos: unicidades.flatMap((u) => u.repetidos ?? []) };

  return {
    fecha: TODOS,
    fechas: periodos.map((p) => p.fecha),
    nombreArchivo: periodos.map((p) => p.nombreArchivo).join(', '),
    calidad: sumarCalidad(periodos.map((p) => p.calidad)),
    reconciliaciones,
    rankings,
    desglose,
    operaciones,
    excluidas: periodos.flatMap((p) => p.excluidas),
    alertas: periodos.flatMap((p) => p.alertas),
  };
}

// Suma campo a campo el resumen de calidad: números se suman, los sí/no tienen que cumplirse en
// todos los cortes y los objetos (conteos independientes) se suman por clave.
function sumarCalidad(calidades) {
  const total = {};
  for (const calidad of calidades) {
    for (const [clave, valor] of Object.entries(calidad)) {
      if (typeof valor === 'number') total[clave] = (total[clave] ?? 0) + valor;
      else if (typeof valor === 'boolean') total[clave] = (total[clave] ?? true) && valor;
      else if (valor && typeof valor === 'object') total[clave] = sumarCalidad([total[clave] ?? {}, valor]);
    }
  }
  return total;
}
