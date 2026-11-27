// Descargas CSV de los entregables 2 a 5 (sección 10). Formatos en contracts/exportaciones.md.
// Sin ?periodo exportan todos los períodos cargados (cada fila trae su Fecha).
import { Router } from 'express';
import { csvRankings, csvDesglose, csvCalidad, csvExcluidas, csvAlertas, csvMovimientos } from '../engine/index.js';
import { periodosPedidos } from './parametros.js';
import { ErrorApi } from './errores.js';
import { requiereOpcion } from '../middleware/perfiles.js';

const DESCARGAS = {
  'rankings.csv': csvRankings, // entregable 2
  'subactividades.csv': csvDesglose, // entregable 3
  'calidad.csv': csvCalidad, // entregable 4
  'excluidas.csv': csvExcluidas, // exclusión auditable
  'alertas.csv': csvAlertas,
};

// obtenerMovimientos(query) lo aporta el cálculo de /api/movimientos (#32) y devuelve el
// mismo objeto que ese endpoint (contracts/movimientos.json). Mientras no exista, responde 501.
export function rutasDeExportacion(almacen, { obtenerMovimientos } = {}) {
  const rutas = Router();

  for (const [archivo, generarCsv] of Object.entries(DESCARGAS)) {
    rutas.get(`/exportar/${archivo}`, (req, res) => {
      const periodos = periodosPedidos(almacen, req.query.periodo);
      const sufijo = req.query.periodo ?? 'todos';
      enviarCsv(res, archivo.replace('.csv', `_${sufijo}.csv`), generarCsv(periodos));
    });
  }

  // Entregable 5: movimientos entre dos períodos (acepta los mismos parámetros que /api/movimientos).
  // Como /api/movimientos, es de Analista y Administrador (sección 10); Público recibe 403.
  rutas.get('/exportar/movimientos.csv', requiereOpcion('comparar_periodos'), async (req, res) => {
    if (!obtenerMovimientos) {
      throw new ErrorApi(501, 'NO_DISPONIBLE', 'La comparación entre períodos (/api/movimientos, #32) todavía no está conectada.');
    }
    const respuesta = await obtenerMovimientos(req.query);
    enviarCsv(res, `movimientos_${respuesta.periodo_anterior}_${respuesta.periodo_actual}.csv`, csvMovimientos(respuesta));
  });

  return rutas;
}

function enviarCsv(res, nombreArchivo, contenido) {
  res.attachment(nombreArchivo); // Content-Disposition: attachment; filename="..."
  res.type('text/csv; charset=utf-8');
  res.send(contenido);
}
