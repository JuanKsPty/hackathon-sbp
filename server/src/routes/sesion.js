// Inicio y cierre de sesión del sitio interno (Analista y Administrador).
//   POST   /api/sesion  { usuario, clave } -> 200 { usuario, nombre, perfil, nombre_perfil } + cookie sbp_sesion
//   DELETE /api/sesion                     -> 204 y borra la cookie
// En el sitio público no existen (404): ahí no hay inicio de sesión.
import express from 'express';
import { ErrorApi, rutaNoEncontrada } from './errores.js';
import { verificarCredenciales, ErrorUsuariosNoDisponibles } from '../auth/usuarios.js';
import { crearToken, fijarCookieSesion, borrarCookieSesion } from '../auth/sesion.js';
import { NOMBRES_PERFIL } from '../middleware/perfiles.js';
import { registrarOperacion } from '../datos/bitacora.js';

export function rutasDeSesion() {
  const rutas = express.Router();

  rutas.post('/sesion', async (req, res, next) => {
    if (req.sitio === 'publico') return rutaNoEncontrada(req, res);
    const { usuario, clave } = req.body ?? {};
    if (typeof usuario !== 'string' || typeof clave !== 'string' || !usuario.trim() || !clave) {
      return next(new ErrorApi(400, 'PARAMETRO_INVALIDO', 'Escribe tu usuario y tu contraseña.'));
    }
    let encontrado;
    try {
      encontrado = await verificarCredenciales(usuario, clave);
    } catch (error) {
      if (error instanceof ErrorUsuariosNoDisponibles) {
        return next(new ErrorApi(503, 'USUARIOS_NO_DISPONIBLES', 'No se pudo verificar el usuario. Intenta de nuevo en un momento.'));
      }
      return next(error);
    }
    if (!encontrado) {
      registrarOperacion({ operacion: 'inicio_sesion', perfil: 'publico', resultado: 'rechazado', detalle: `usuario "${usuario.trim().slice(0, 60)}"` });
      return next(new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Usuario o contraseña incorrectos.'));
    }
    fijarCookieSesion(req, res, crearToken(encontrado));
    registrarOperacion({ operacion: 'inicio_sesion', perfil: encontrado.perfil, usuario: encontrado.usuario, resultado: 'exito', detalle: `fuente: ${encontrado.fuente}` });
    return res.json({
      usuario: encontrado.usuario,
      nombre: encontrado.nombre,
      perfil: encontrado.perfil,
      nombre_perfil: NOMBRES_PERFIL[encontrado.perfil],
    });
  });

  rutas.delete('/sesion', (req, res) => {
    if (req.sitio === 'publico') return rutaNoEncontrada(req, res);
    if (req.usuario) registrarOperacion({ operacion: 'cierre_sesion', perfil: req.perfil, usuario: req.usuario.usuario, resultado: 'exito' });
    borrarCookieSesion(req, res);
    return res.status(204).end();
  });

  return rutas;
}
