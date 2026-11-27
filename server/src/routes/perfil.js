// GET /api/perfil: el perfil actual, sus opciones y la lista de perfiles,
// para que la UI arme el selector de perfil y el menú (#4).
import express from 'express';
import { NOMBRES_PERFIL, PERFILES, opcionesDe } from '../middleware/perfiles.js';

export function rutasDePerfil() {
  const rutas = express.Router();

  rutas.get('/perfil', (req, res) => {
    res.json({
      perfil: req.perfil,
      nombre: NOMBRES_PERFIL[req.perfil],
      opciones: opcionesDe(req.perfil),
      perfiles: PERFILES.map((perfil) => ({ perfil, nombre: NOMBRES_PERFIL[perfil] })),
    });
  });

  return rutas;
}
