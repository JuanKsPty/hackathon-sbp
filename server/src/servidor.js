// Punto de entrada del backend: procesa data/ al arrancar y expone la API.
// Variables de entorno opcionales: PORT (por defecto 3001) y DATA_DIR (por defecto ../data).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from './app.js';
import { almacenDesdeCarpeta } from './datos/almacen.js';
import { registrarOperacion } from './datos/bitacora.js';
import { recargarPeriodosGuardados } from './datos/cargaPeriodo.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpetaDatos = path.resolve(process.env.DATA_DIR ?? path.join(aqui, '..', '..', 'data'));
const puerto = Number(process.env.PORT ?? 3001);

try {
  console.log(`Procesando los AT03 de ${carpetaDatos} ...`);
  const almacen = almacenDesdeCarpeta(carpetaDatos);
  // La carga inicial queda en la bitácora: qué archivo, cuándo y con qué resultado (#31).
  for (const periodo of almacen.todos()) {
    registrarOperacion({
      operacion: 'carga_inicial',
      archivo: periodo.nombreArchivo,
      perfil: 'sistema',
      resultado: 'exito',
      detalle: `Período ${periodo.fecha}`,
    });
  }
  // Períodos que subió el Administrador (#29): se recargan después de data/ y la reemplazan si traen la misma Fecha.
  const { recargados, avisos } = recargarPeriodosGuardados(almacen);
  avisos.forEach((aviso) => console.warn(`Aviso: ${aviso}`));
  if (recargados.length > 0) console.log(`Períodos recargados de storage/periodos: ${recargados.join(', ')}`);
  crearApp({ almacen }).listen(puerto, () => {
    console.log(`API lista en http://localhost:${puerto}/api · períodos: ${almacen.fechas().join(', ') || 'ninguno'}`);
  });
} catch (error) {
  console.error(`No se pudo iniciar la API: ${error.message}`);
  (error.detalles ?? []).forEach((d) => console.error(`  - ${d}`));
  registrarOperacion({ operacion: 'carga_inicial', perfil: 'sistema', resultado: 'error', detalle: error.message });
  process.exitCode = 1;
}
