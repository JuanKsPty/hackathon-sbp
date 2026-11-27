// Aplicación Express. Se arma con un almacén de períodos para poder probarla sin levantar el servidor.
import express from 'express';
import { rutasDeConsulta } from './routes/consulta.js';
import { rutasDePerfil } from './routes/perfil.js';
import { rutasDeCarga } from './routes/carga.js';
import { leerPerfil } from './middleware/perfiles.js';
import { rutaNoEncontrada, manejarErrores } from './routes/errores.js';

// carpetaStorage es opcional: las pruebas usan una carpeta temporal en lugar de storage/.
export function crearApp({ almacen, carpetaStorage }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  // Perfil de cada petición (header X-Perfil, por defecto "publico"), antes de todas las rutas.
  app.use('/api', leerPerfil);

  app.get('/api/salud', (req, res) => res.json({ ok: true, periodos: almacen.fechas() }));
  app.use('/api', rutasDePerfil());
  app.use('/api', rutasDeConsulta(almacen));
  app.use('/api', rutasDeCarga(almacen, { carpetaStorage })); // POST /api/periodos, solo admin (#29)
  // Aquí se montan las demás rutas (perfiles y administración #28-#31, movimientos #32),
  // siempre ANTES de los dos manejadores de abajo.

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
