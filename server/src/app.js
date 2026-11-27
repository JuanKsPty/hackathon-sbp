// Aplicación Express. Se arma con un almacén de períodos para poder probarla sin levantar el servidor.
import express from 'express';
import { rutasDeConsulta } from './routes/consulta.js';
import { rutasDeExportacion } from './routes/exportaciones.js';
import { rutaNoEncontrada, manejarErrores } from './routes/errores.js';

// obtenerMovimientos (opcional): función del cálculo de /api/movimientos (#32) para exportar el entregable 5.
export function crearApp({ almacen, obtenerMovimientos }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/salud', (req, res) => res.json({ ok: true, periodos: almacen.fechas() }));
  app.use('/api', rutasDeConsulta(almacen));
  app.use('/api', rutasDeExportacion(almacen, { obtenerMovimientos }));
  // Aquí se montan las demás rutas (perfiles y administración #28-#31, movimientos #32),
  // siempre ANTES de los dos manejadores de abajo.

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
