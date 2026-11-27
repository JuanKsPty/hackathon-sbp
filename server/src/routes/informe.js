// GET /api/exportar/informe.pdf?periodo=AAAAMMDD: informe PDF del período, armado en el server
// con pdfkit (automation/informePdf.js). Sin período, el último; acepta "todos" como el resto.
// Es una descarga como los CSV (opción "descargar": los 3 perfiles por defecto). La sección
// "Evolución por corte" compara períodos: solo sale a quien tiene esa opción (Analista y Admin).
import { Router } from 'express';
import { informePdf } from '../automation/informePdf.js';
import { periodoPedido } from './parametros.js';
import { requiereOpcion, perfilesConOpcion } from '../middleware/perfiles.js';

export function rutasDeInforme(almacen) {
  const rutas = Router();

  rutas.get('/exportar/informe.pdf', requiereOpcion('descargar'), async (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo, { permitirTodos: true });
    const comparaPeriodos = perfilesConOpcion('comparar_periodos').includes(req.perfil);
    const pdf = await informePdf({
      periodo,
      catalogos: almacen.catalogos,
      evolucion: comparaPeriodos ? almacen.todos() : null,
    });
    // Con comillas, como pide el contrato (res.attachment las quita si el nombre no las necesita).
    // periodo.fecha es AAAAMMDD o "todos": no hay nada que escapar.
    res.set('Content-Disposition', `attachment; filename="informe_${periodo.fecha}.pdf"`);
    res.type('application/pdf');
    res.send(pdf);
  });

  return rutas;
}
