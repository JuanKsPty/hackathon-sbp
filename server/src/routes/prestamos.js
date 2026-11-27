// Ficha de cada préstamo (solo Analista y Administrador, como la evidencia préstamo por préstamo de
// /api/movimientos/descomposicion): GET /api/prestamos/:numero en JSON y
// GET /api/exportar/prestamo.html?numero= como informe HTML autocontenido descargable.
import { Router } from 'express';
import { fichaPrestamo, fichaPrestamoHtml, fichaEnContrato } from '../automation/fichaPrestamo.js';
import { encabezado } from './formato.js';
import { ErrorApi } from './errores.js';
import { requiereOpcion } from '../middleware/perfiles.js';

function numeroPedido(valor) {
  if (typeof valor !== 'string' || !/^[\w.-]{1,64}$/.test(valor)) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'numero debe ser un Numero_Prestamo (letras, dígitos, punto, guion o guion bajo; hasta 64).');
  }
  return valor;
}

function fichaPedida(almacen, valor) {
  const numero = numeroPedido(valor);
  if (almacen.fechas().length === 0) throw new ErrorApi(404, 'PERIODO_SIN_DATOS', 'Todavía no hay períodos cargados.');
  const ficha = fichaPrestamo(almacen, numero);
  if (!ficha) throw new ErrorApi(404, 'PRESTAMO_NO_ENCONTRADO', `El préstamo ${numero} no está en ningún período cargado.`);
  return ficha;
}

export function rutasDePrestamos(almacen) {
  const rutas = Router();
  const permiso = requiereOpcion('comparar_periodos');

  rutas.get('/prestamos/:numero', permiso, (req, res) => {
    res.json({ ...encabezado(), ...fichaEnContrato(fichaPedida(almacen, req.params.numero)) });
  });

  rutas.get('/exportar/prestamo.html', permiso, (req, res) => {
    const ficha = fichaPedida(almacen, req.query.numero);
    res.attachment(`prestamo_${ficha.numero}.html`);
    res.type('text/html; charset=utf-8');
    res.send(fichaPrestamoHtml(ficha));
  });

  return rutas;
}
