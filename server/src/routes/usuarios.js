// Usuarios del sitio interno (lámina 6, Administrador: configurar perfiles):
//   GET   /api/admin/usuarios             lista (sin contraseñas): los editables y los del .env
//   POST  /api/admin/usuarios             { usuario, nombre, perfil, clave } crea un usuario
//   PATCH /api/admin/usuarios/:usuario    { nombre?, perfil?, activo?, clave? } lo cambia
// Solo Administrador (opción gestionar_usuarios). Cada alta y cambio queda en la bitácora, nunca con
// la contraseña. Si cambia el perfil, la contraseña o el estado, se cortan las sesiones abiertas de ese
// usuario: la próxima petición le pide iniciar sesión otra vez con sus datos nuevos.
import express from 'express';
import { requiereOpcion } from '../middleware/perfiles.js';
import { registrarOperacion } from '../datos/bitacora.js';
import { actualizarUsuario, crearUsuario, listarUsuarios } from '../auth/usuarios.js';
import { revocarSesiones } from '../auth/revocaciones.js';
import { crearToken, fijarCookieSesion } from '../auth/sesion.js';
import { ErrorApi } from './errores.js';

export function rutasDeUsuarios() {
  const rutas = express.Router();
  const soloAdmin = requiereOpcion('gestionar_usuarios');
  const registrar = (req, operacion, resultado, detalle) =>
    registrarOperacion({ operacion, perfil: req.perfil, usuario: req.usuario?.usuario, resultado, detalle });

  rutas.get('/admin/usuarios', soloAdmin, async (req, res) => {
    res.json(await listarUsuarios());
  });

  rutas.post('/admin/usuarios', soloAdmin, async (req, res) => {
    const nombre = typeof req.body?.usuario === 'string' ? req.body.usuario.trim().toLowerCase().slice(0, 60) : '?';
    try {
      const creado = await crearUsuario(req.body ?? {});
      registrar(req, 'alta_usuario', 'exito', `usuario "${creado.usuario}" (${creado.perfil})`);
      res.status(201).json(creado);
    } catch (error) {
      if (error instanceof ErrorApi) registrar(req, 'alta_usuario', 'error', `usuario "${nombre}": ${error.message}`);
      throw error;
    }
  });

  rutas.patch('/admin/usuarios/:usuario', soloAdmin, async (req, res) => {
    const objetivo = String(req.params.usuario).trim().toLowerCase();
    const quien = req.usuario?.usuario ?? null;
    let resultado;
    try {
      resultado = await actualizarUsuario(objetivo, req.body, { quien });
    } catch (error) {
      if (error instanceof ErrorApi) registrar(req, 'cambio_usuario', 'error', `usuario "${objetivo.slice(0, 60)}": ${error.message}`);
      throw error;
    }
    const { antes, despues, cambios } = resultado;
    if (cambios.length > 0) {
      const cortaSesion = antes.perfil !== despues.perfil || antes.activo !== despues.activo || 'clave' in (req.body ?? {});
      if (cortaSesion) {
        revocarSesiones(despues.usuario);
        // Si el Administrador cambió su propia contraseña, sigue con una sesión nueva.
        if (quien === despues.usuario) fijarCookieSesion(req, res, crearToken(despues));
      }
      registrar(req, 'cambio_usuario', 'exito', `usuario "${despues.usuario}": ${cambios.join('; ')}${cortaSesion && quien !== despues.usuario ? '; sesiones abiertas cerradas' : ''}`);
    }
    res.json(despues);
  });

  return rutas;
}
