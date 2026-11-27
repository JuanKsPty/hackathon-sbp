// Aplicación Express. Se arma con un almacén de períodos para poder probarla sin levantar el servidor.
import express from 'express';
import { rutasDeConsulta } from './routes/consulta.js';
import { rutasDeExportacion } from './routes/exportaciones.js';
import { rutasDeMovimientos } from './routes/movimientos.js';
import { crearObtenerDescomposicion, rutasDeDescomposicion } from './routes/descomposicion.js';
import { rutasDePerfil } from './routes/perfil.js';
import { rutasDeBitacora } from './routes/bitacora.js';
import { rutasDeAdministracion } from './routes/administracion.js';
import { rutasDeCarga } from './routes/carga.js';
import { rutasDeIA } from './routes/ia.js';
import { rutasDeDocumentacion } from './routes/docs.js';
import { rutasDeIndicadores } from './routes/indicadores.js';
import { rutasDeMcp } from './routes/mcp.js';
import { rutasDeVerificacion } from './routes/verificacion.js';
import { rutasDeSuscripciones } from './routes/suscripciones.js';
import { leerPerfil, requiereOpcion } from './middleware/perfiles.js';
import { limitarPedidos } from './middleware/limitePedidos.js';
import { rutaNoEncontrada, manejarErrores } from './routes/errores.js';

// obtenerMovimientos (opcional): cálculo de /api/movimientos (#32, crearObtenerMovimientos en
// routes/movimientos.js). Si se pasa, monta GET /api/movimientos y la exportación del entregable 5,
// y la carga de un período (#29) responde también los cambios de ranking.
// opcionesIA (opcional, para tests): { cliente, apiKey, modelo }; por defecto se leen del .env.
// opcionesMcp (opcional, para tests): { apiInterna } para el MCP remoto (#81).
// limiteIA (opcional, para tests): { maximo, ventanaMs, maximoGlobal, ventanaGlobalMs } (#84).
export function crearApp({ almacen, obtenerMovimientos, opcionesIA, opcionesMcp, limiteIA }) {
  const app = express();
  app.disable('x-powered-by');
  // Detrás de nginx (client) y del proxy de Dokploy, la IP real del usuario llega en X-Forwarded-For.
  // Solo se confía en proxies de la red local o privada: un cliente no puede falsificar su IP (#84).
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(express.json({ limit: '1mb' }));
  // Perfil de cada petición (header X-Perfil, por defecto "publico"), antes de todas las rutas.
  app.use('/api', leerPerfil);
  // Comparar períodos es de Analista y Administrador (sección 10): /api/movimientos (y lo que
  // cuelgue de ahí, como /api/movimientos/descomposicion) y su descarga, el entregable 5.
  // La explicación de movimientos (/api/explicaciones, #2) sigue la misma regla.
  app.use(['/api/movimientos', '/api/exportar/movimientos.csv', '/api/explicaciones'], requiereOpcion('comparar_periodos'));
  // Los endpoints que gastan la llave de IA tienen un límite de pedidos por IP y uno global (#84).
  // Va después del control de perfil: un 403 no cuenta.
  app.use(['/api/ia/preguntar', '/api/explicaciones'], limitarPedidos(limiteIA));

  app.get('/api/salud', (req, res) => res.json({ ok: true, periodos: almacen.fechas() }));
  app.use('/api', rutasDePerfil());
  app.use('/api', rutasDeBitacora());
  app.use('/api', rutasDeAdministracion(almacen));
  app.use('/api', rutasDeConsulta(almacen));
  app.use('/api', rutasDeExportacion(almacen, { obtenerMovimientos }));
  if (obtenerMovimientos) app.use('/api', rutasDeMovimientos(obtenerMovimientos));
  // Descomposición de cada movimiento por préstamo (nuevos, salen, amortización) y su evidencia.
  // Queda bajo /api/movimientos, así que la restricción de arriba (comparar_periodos) también la cubre.
  app.use('/api', rutasDeDescomposicion(crearObtenerDescomposicion(almacen)));
  app.use('/api', rutasDeCarga(almacen, { obtenerMovimientos })); // POST /api/periodos, solo admin (#29)
  app.use('/api', rutasDeIA({ almacen, obtenerMovimientos, opcionesIA })); // con almacen: gráficos del chat (#108)
  app.use('/api', rutasDeDocumentacion(almacen));
  app.use('/api', rutasDeIndicadores(almacen)); // morosidad, vencimientos y concentración: análisis adicional (#35)
  app.use('/api', rutasDeMcp(opcionesMcp)); // MCP remoto por HTTP: /api/mcp (#81)
  app.use('/api', rutasDeVerificacion(almacen)); // un dato de cada punto de la sección 11.1 (#63)
  app.use('/api', rutasDeSuscripciones(almacen)); // alertas por correo con Zapier (#7)
  // Las demás rutas se montan aquí, siempre ANTES de los dos manejadores de abajo.

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
