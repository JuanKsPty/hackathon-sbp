// Perfiles y permisos (lámina 6, Administrador): qué perfil puede usar cada opción.
//   GET    /api/admin/permisos   tabla vigente, con lo que es configurable y los valores por defecto
//   PUT    /api/admin/permisos   { opciones: { opcion: [perfiles] } } cambia las opciones configurables
//   DELETE /api/admin/permisos   vuelve a los permisos por defecto
// Solo Administrador (opción configurar_permisos). Cada cambio queda en la bitácora y aplica de
// inmediato: GET /api/perfil (el menú) y requiereOpcion() leen la tabla vigente en cada petición.
import express from 'express';
import {
  NOMBRES_PERFIL,
  PERFILES,
  permisosVigentes,
  requiereOpcion,
  validarPermisos,
} from '../middleware/perfiles.js';
import { borrarPermisos, guardarPermisos, leerPermisosGuardados } from '../datos/permisos.js';
import { registrarOperacion } from '../datos/bitacora.js';
import { ErrorApi } from './errores.js';

function respuesta() {
  return {
    origen: leerPermisosGuardados() ? 'administrador' : 'por_defecto',
    perfiles: PERFILES.map((perfil) => ({ perfil, nombre: NOMBRES_PERFIL[perfil] })),
    opciones: permisosVigentes(),
  };
}

// "Comparar períodos: Analista → Público y Analista" por cada opción que cambió.
function diferencias(antes, despues) {
  const nombres = (perfiles) => perfiles.filter((p) => p !== 'admin').map((p) => NOMBRES_PERFIL[p]).join(' y ') || 'solo Administrador';
  return despues
    .map((fila, i) => (fila.perfiles.join() === antes[i].perfiles.join() ? null : `${fila.nombre}: ${nombres(antes[i].perfiles)} → ${nombres(fila.perfiles)}`))
    .filter(Boolean);
}

export function rutasDePermisos() {
  const rutas = express.Router();
  const soloAdmin = requiereOpcion('configurar_permisos');
  const registrar = (req, operacion, resultado, detalle) =>
    registrarOperacion({ operacion, perfil: req.perfil, usuario: req.usuario?.usuario, resultado, detalle });

  rutas.get('/admin/permisos', soloAdmin, (req, res) => {
    res.json(respuesta());
  });

  rutas.put('/admin/permisos', soloAdmin, (req, res) => {
    const antes = permisosVigentes();
    let nuevos;
    try {
      nuevos = validarPermisos(req.body?.opciones);
    } catch (error) {
      registrar(req, 'cambio_permisos', 'error', error.message);
      throw new ErrorApi(400, 'PARAMETRO_INVALIDO', error.message);
    }
    guardarPermisos(nuevos);
    const cambios = diferencias(antes, permisosVigentes());
    registrar(req, 'cambio_permisos', 'exito', cambios.length > 0 ? cambios.join('; ') : 'sin cambios');
    res.json(respuesta());
  });

  rutas.delete('/admin/permisos', soloAdmin, (req, res) => {
    const antes = permisosVigentes();
    borrarPermisos();
    const cambios = diferencias(antes, permisosVigentes());
    registrar(req, 'restablecer_permisos', 'exito', cambios.length > 0 ? cambios.join('; ') : 'ya eran los permisos por defecto');
    res.json(respuesta());
  });

  return rutas;
}
