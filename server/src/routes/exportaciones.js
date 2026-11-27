// Descargas CSV de los entregables 2 a 5 (sección 10). Formatos en contracts/exportaciones.md.
// Sin ?periodo exportan todos los períodos cargados (cada fila trae su Fecha).
import { Router } from 'express';
import { csvRankings, csvDesglose, csvCalidad, csvExcluidas, csvAlertas, csvMovimientos } from '../engine/index.js';
import { periodosPedidos, periodoPedido, rankingPedido, bancoPedido } from './parametros.js';
import { ErrorApi } from './errores.js';
import { requiereOpcion } from '../middleware/perfiles.js';
import { dashboardPersonalizadoHtml } from '../automation/dashboardHtml.js';

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

  // Las descargas abiertas son de la opción "descargar": por defecto, los 3 perfiles; el
  // Administrador puede cambiarlo en perfiles y permisos.
  for (const [archivo, generarCsv] of Object.entries(DESCARGAS)) {
    rutas.get(`/exportar/${archivo}`, requiereOpcion('descargar'), (req, res) => {
      const periodos = periodosPedidos(almacen, req.query.periodo);
      const sufijo = req.query.periodo ?? 'todos';
      enviarCsv(res, archivo.replace('.csv', `_${sufijo}.csv`), generarCsv(periodos));
    });
  }

  // Entregable 5: movimientos entre dos períodos (acepta los mismos parámetros que /api/movimientos).
  rutas.get('/exportar/movimientos.csv', async (req, res) => {
    if (!obtenerMovimientos) {
      throw new ErrorApi(501, 'NO_DISPONIBLE', 'La comparación entre períodos (/api/movimientos, #32) todavía no está conectada.');
    }
    const respuesta = await obtenerMovimientos(req.query);
    enviarCsv(res, `movimientos_${respuesta.periodo_anterior}_${respuesta.periodo_actual}.csv`, csvMovimientos(respuesta));
  });

  // Reporte personalizado (solo Analista y Administrador): los períodos, rankings y bancos elegidos,
  // con las mismas columnas del entregable 2. Cada parámetro es una lista separada por comas;
  // si falta o viene vacío, entran todos.
  rutas.get('/exportar/personalizado.csv', requiereOpcion('reportes_personalizados'), (req, res) => {
    const fechas = lista(req.query.periodos);
    const periodos = fechas.length > 0 ? fechas.map((f) => periodoPedido(almacen, f)) : periodosPedidos(almacen);
    const rankings = new Set(lista(req.query.rankings).map((r) => rankingPedido(almacen, r)));
    const bancos = new Set(lista(req.query.bancos).map((b) => bancoPedido(almacen, b)));

    const filtrados = periodos.map((p) => ({
      ...p,
      rankings: p.rankings
        .filter((r) => rankings.size === 0 || rankings.has(r.ranking))
        .map((r) => ({ ...r, filas: r.filas.filter((f) => bancos.size === 0 || bancos.has(f.codigoBanco)) })),
    }));
    enviarCsv(res, 'reporte_personalizado.csv', csvRankings(filtrados));
  });

  // Mismo reporte personalizado, como dashboard HTML autocontenido (mismos parámetros y permiso).
  rutas.get('/exportar/personalizado.html', requiereOpcion('reportes_personalizados'), (req, res) => {
    const fechas = lista(req.query.periodos);
    const periodos = fechas.length > 0 ? fechas.map((f) => periodoPedido(almacen, f)) : periodosPedidos(almacen);
    const rankings = new Set(lista(req.query.rankings).map((r) => rankingPedido(almacen, r)));
    const bancos = new Set(lista(req.query.bancos).map((b) => bancoPedido(almacen, b)));
    res.attachment('reporte_personalizado.html');
    res.type('text/html; charset=utf-8');
    res.send(dashboardPersonalizadoHtml({ periodos, rankings, bancos, catalogos: almacen.catalogos }));
  });

  return rutas;
}

// "a,b,,c" -> ['a', 'b', 'c']. Si el parámetro se repite (?bancos=1&bancos=2), se juntan.
function lista(valor) {
  if (valor === undefined) return [];
  const texto = Array.isArray(valor) ? valor.join(',') : String(valor);
  return [...new Set(texto.split(',').map((v) => v.trim()).filter((v) => v !== ''))];
}

function enviarCsv(res, nombreArchivo, contenido) {
  res.attachment(nombreArchivo); // Content-Disposition: attachment; filename="..."
  res.type('text/csv; charset=utf-8');
  res.send(contenido);
}
