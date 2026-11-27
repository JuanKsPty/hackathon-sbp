// Punto de entrada del backend: procesa data/ al arrancar y expone la API.
// Variables de entorno opcionales: PORT (por defecto 3001) y DATA_DIR (por defecto ../data).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from './app.js';
import { almacenDesdeCarpeta } from './datos/almacen.js';
import { crearObtenerMovimientos } from './routes/movimientos.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpetaDatos = path.resolve(process.env.DATA_DIR ?? path.join(aqui, '..', '..', 'data'));
const puerto = Number(process.env.PORT ?? 3001);

try {
  console.log(`Procesando los AT03 de ${carpetaDatos} ...`);
  const almacen = almacenDesdeCarpeta(carpetaDatos);
  const obtenerMovimientos = crearObtenerMovimientos(almacen);
  crearApp({ almacen, obtenerMovimientos }).listen(puerto, () => {
    console.log(`API lista en http://localhost:${puerto}/api · períodos: ${almacen.fechas().join(', ') || 'ninguno'}`);
  });
} catch (error) {
  console.error(`No se pudo iniciar la API: ${error.message}`);
  (error.detalles ?? []).forEach((d) => console.error(`  - ${d}`));
  process.exitCode = 1;
}
