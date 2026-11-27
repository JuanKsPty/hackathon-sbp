// Aplicación Express. Se arma con un almacén de períodos para poder probarla sin levantar el servidor.
import express from 'express';
import { rutasDeConsulta } from './routes/consulta.js';
import { rutaNoEncontrada, manejarErrores } from './routes/errores.js';

export function crearApp({ almacen }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/salud', (req, res) => res.json({ ok: true, periodos: almacen.fechas() }));
  app.use('/api', rutasDeConsulta(almacen));
  // Aquí se montan las demás rutas (perfiles y administración #28-#31, movimientos #32),
  // siempre ANTES de los dos manejadores de abajo.

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
