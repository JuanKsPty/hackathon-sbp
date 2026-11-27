// GET /api/perfil: el perfil actual, sus opciones y la lista de perfiles,
// para que la UI arme el menú y la sesión del sitio interno (#4, #120).
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
      usuario: req.usuario ?? null,
      sitio: req.sitio ?? 'directo',
    });
  });

  return rutas;
}
