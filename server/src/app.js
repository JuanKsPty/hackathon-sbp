// Aplicación Express. Se arma con un almacén de períodos para poder probarla sin levantar el servidor.
import express from 'express';
import { rutasDeConsulta } from './routes/consulta.js';
import { rutasDePerfil } from './routes/perfil.js';
import { rutasDeBitacora } from './routes/bitacora.js';
import { rutasDeCarga } from './routes/carga.js';
import { leerPerfil } from './middleware/perfiles.js';
import { rutaNoEncontrada, manejarErrores } from './routes/errores.js';

// Opcionales:
// - carpetaStorage: dónde guardar las copias de los períodos cargados (las pruebas usan una carpeta temporal).
// - obtenerMovimientos: cálculo de /api/movimientos (#32, crearObtenerMovimientos en routes/movimientos.js).
//   Si se pasa, la carga de un período (#29) responde también los cambios de ranking.
export function crearApp({ almacen, carpetaStorage, obtenerMovimientos }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  // Perfil de cada petición (header X-Perfil, por defecto "publico"), antes de todas las rutas.
  app.use('/api', leerPerfil);

  app.get('/api/salud', (req, res) => res.json({ ok: true, periodos: almacen.fechas() }));
  app.use('/api', rutasDePerfil());
  app.use('/api', rutasDeBitacora());
  app.use('/api', rutasDeConsulta(almacen));
  app.use('/api', rutasDeCarga(almacen, { carpetaStorage, obtenerMovimientos })); // POST /api/periodos, solo admin (#29)
  // Aquí se montan las demás rutas (perfiles y administración #28-#31, movimientos #32),
  // siempre ANTES de los dos manejadores de abajo.

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
