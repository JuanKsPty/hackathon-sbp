// Perfiles y control de acceso (sección 10, entregable 8 de las indicaciones).
// Basta con un selector de perfil: la UI manda el perfil elegido en el header X-Perfil.
// Sin header, el perfil es "publico". No hay contraseñas (R5).
import { ErrorApi } from '../routes/errores.js';
import { registrarOperacion } from '../datos/bitacora.js';

export const NOMBRES_PERFIL = {
  publico: 'Público',
  analista: 'Analista',
  admin: 'Administrador',
};

export const PERFILES = Object.keys(NOMBRES_PERFIL);

// Qué puede hacer cada perfil. Es la ÚNICA definición: GET /api/perfil la entrega a la UI
// para armar el menú y requiereOpcion() la usa para responder 403.
export const OPCIONES = [
  { opcion: 'consultar_rankings', nombre: 'Consultar rankings, filtros, gráficos y tablas', perfiles: ['publico', 'analista', 'admin'] },
  { opcion: 'descargar', nombre: 'Descargar reportes', perfiles: ['publico', 'analista', 'admin'] },
  { opcion: 'comparar_periodos', nombre: 'Comparar períodos', perfiles: ['analista', 'admin'] },
  { opcion: 'comparar_entidades', nombre: 'Comparar entidades', perfiles: ['analista', 'admin'] },
  { opcion: 'reportes_personalizados', nombre: 'Reportes personalizados', perfiles: ['analista', 'admin'] },
  { opcion: 'cargar_periodo', nombre: 'Cargar o actualizar un período', perfiles: ['admin'] },
  { opcion: 'administrar_parametros', nombre: 'Parámetros', perfiles: ['admin'] },
  { opcion: 'administrar_catalogos', nombre: 'Catálogos', perfiles: ['admin'] },
  { opcion: 'ver_bitacora', nombre: 'Registro de operaciones', perfiles: ['admin'] },
];

// Opciones de un perfil, en el orden de la tabla.
export function opcionesDe(perfil) {
  return OPCIONES.filter((o) => o.perfiles.includes(perfil)).map(({ opcion, nombre }) => ({ opcion, nombre }));
}

// Middleware: lee X-Perfil y deja el perfil en req.perfil.
export function leerPerfil(req, res, next) {
  const valor = (req.get('X-Perfil') ?? '').trim().toLowerCase();
  if (valor === '') {
    req.perfil = 'publico';
    return next();
  }
  if (!PERFILES.includes(valor)) {
    const mensaje = `El header X-Perfil debe ser ${PERFILES.join(', ')} (llegó "${req.get('X-Perfil')}").`;
    return next(new ErrorApi(400, 'PARAMETRO_INVALIDO', mensaje));
  }
  req.perfil = valor;
  return next();
}

// Middleware de una ruta: solo deja pasar a los perfiles indicados; a los demás, 403.
// El intento rechazado queda en la bitácora (#31).
// Ejemplo: router.post('/periodos', requierePerfil('admin'), cargarPeriodo)
export function requierePerfil(...permitidos) {
  return (req, res, next) => {
    if (permitidos.includes(req.perfil)) return next();
    registrarOperacion({
      operacion: 'acceso_denegado',
      perfil: req.perfil,
      resultado: 'rechazado',
      detalle: `${req.method} ${req.originalUrl}`,
    });
    const quienes = permitidos.map((perfil) => NOMBRES_PERFIL[perfil]).join(' o ');
    const mensaje = `Esta opción es solo para el perfil ${quienes}. Tu perfil es ${NOMBRES_PERFIL[req.perfil]}.`;
    return next(new ErrorApi(403, 'PERFIL_NO_AUTORIZADO', mensaje));
  };
}

// Igual que requierePerfil, pero toma los perfiles de la tabla OPCIONES.
// Ejemplo: router.get('/bitacora', requiereOpcion('ver_bitacora'), ...)
export function requiereOpcion(opcion) {
  const fila = OPCIONES.find((o) => o.opcion === opcion);
  if (!fila) throw new Error(`La opción "${opcion}" no está en la tabla OPCIONES de perfiles.js.`);
  return requierePerfil(...fila.perfiles);
}
