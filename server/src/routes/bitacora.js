// GET /api/bitacora: registro de operaciones, solo para el Administrador.
import express from 'express';
import { requiereOpcion } from '../middleware/perfiles.js';
import { leerOperaciones } from '../datos/bitacora.js';

export function rutasDeBitacora() {
  const rutas = express.Router();

  rutas.get('/bitacora', requiereOpcion('ver_bitacora'), (req, res) => {
    const operaciones = leerOperaciones();
    res.json({ total: operaciones.length, operaciones });
  });

  return rutas;
}
