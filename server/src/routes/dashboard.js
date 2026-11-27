// GET /api/exportar/dashboard.html?periodo=&ranking=&banco=: reporte HTML autocontenido para
// cualquier combinación de filtros (sin período, el último cargado). No reemplaza a los CSV.
import { Router } from 'express';
import { dashboardHtml } from '../automation/dashboardHtml.js';
import { periodoPedido, rankingPedido, bancoPedido } from './parametros.js';
import { requiereOpcion } from '../middleware/perfiles.js';

export function rutasDeDashboard(almacen) {
  const rutas = Router();
  rutas.get('/exportar/dashboard.html', requiereOpcion('descargar'), (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo, { permitirTodos: true });
    const ranking = rankingPedido(almacen, req.query.ranking);
    const banco = bancoPedido(almacen, req.query.banco);
    const html = dashboardHtml({ periodo, ranking, banco, catalogos: almacen.catalogos });
    res.attachment(`dashboard_${periodo.fecha}${ranking ? `_${ranking}` : ''}${banco ? `_${banco}` : ''}.html`);
    res.type('text/html; charset=utf-8');
    res.send(html);
  });
  return rutas;
}
