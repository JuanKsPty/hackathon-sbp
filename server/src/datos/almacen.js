// Períodos procesados, en memoria (sin base de datos). La API lee de aquí y la carga
// de un período nuevo (#29) solo tiene que llamar a almacen.guardar(resultadoDeProcesarPeriodo).
import { procesarCarpeta } from './paquete.js';
import { acumularPeriodos } from '../engine/acumulado.js';

export function crearAlmacen(catalogos, periodos = []) {
  const porFecha = new Map();
  let acumulado = null; // se calcula al pedirlo y se descarta al guardar un período
  const almacen = {
    catalogos,
    guardar(periodo) {
      porFecha.set(periodo.fecha, periodo); // un período ya cargado se reemplaza (actualización)
      acumulado = null;
    },
    obtener(fecha) {
      return porFecha.get(fecha);
    },
    fechas() {
      return [...porFecha.keys()].sort();
    },
    ultimaFecha() {
      return almacen.fechas().at(-1) ?? null;
    },
    todos() {
      return almacen.fechas().map((fecha) => porFecha.get(fecha));
    },
    // Todos los períodos juntos, recalculados por el motor (engine/acumulado.js). null sin períodos.
    acumulado() {
      if (porFecha.size === 0) return null;
      acumulado ??= acumularPeriodos(almacen.todos(), catalogos);
      return acumulado;
    },
  };
  periodos.forEach((periodo) => almacen.guardar(periodo));
  return almacen;
}

// Procesa todos los AT03 de la carpeta (por defecto data/) y los deja listos para consultar.
export function almacenDesdeCarpeta(carpeta) {
  const { catalogos, periodos, avisos } = procesarCarpeta(carpeta);
  avisos.forEach((aviso) => console.warn(`Aviso: ${aviso}`));
  return crearAlmacen(catalogos, periodos);
}
