// GET /api/verificacion (#63): un dato de cada punto de la sección 11.1, con sus chequeos, para
// mostrarlo en vivo al jurado. Público para los 3 perfiles: solo usa datos de consulta.
import { Router } from 'express';
import { armarVerificacion } from '../automation/verificacion.js';
import { encabezado } from './formato.js';
import { periodoPedido, bancoPedido } from './parametros.js';

export function rutasDeVerificacion(almacen) {
  const rutas = Router();
  rutas.get('/verificacion', (req, res) => {
    const periodo = periodoPedido(almacen, req.query.periodo);
    const banco = bancoPedido(almacen, req.query.banco);
    const { fuente, aviso } = encabezado();
    res.json({ fuente, aviso, ...armarVerificacion(almacen, periodo, banco) });
  });
  return rutas;
}
