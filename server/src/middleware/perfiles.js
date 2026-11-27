// Perfiles y control de acceso (sección 10, entregable 8 de las indicaciones).
// Hay dos sitios, cada uno con su nginx, que marca cada petición con el header X-Sitio:
//   - X-Sitio: publico  -> siempre perfil Público (se ignoran cookies, X-Perfil y tokens).
//   - X-Sitio: interno  -> Analista o Administrador con sesión iniciada (cookie sbp_sesion) o,
//                          para clientes MCP, Authorization: Bearer MCP_TOKEN (perfil Analista).
//                          Sin sesión: 401 SESION_REQUERIDA, salvo login, salud y perfil.
//   - sin X-Sitio       -> llamada directa al API (el puerto nunca se publica): solo desde la misma
//                          máquina (loopback) se acepta X-Perfil, para el agente de IA, el MCP por
//                          stdio y las pruebas. Desde otra IP es Público.
// Las contraseñas viven en Supabase o en el .env, nunca en el repo (R5).
import crypto from 'node:crypto';
import { ErrorApi } from '../routes/errores.js';
import { registrarOperacion } from '../datos/bitacora.js';
import { leerCookie, leerToken } from '../auth/sesion.js';

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

// Rutas del sitio interno que responden sin sesión.
const LIBRES_SIN_SESION = new Set(['/salud', '/perfil', '/sesion', '/ia/estado']);
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

const esLoopback = (req) => {
  const ip = req.socket?.remoteAddress ?? '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

function tokenMcpValido(req) {
  const esperado = process.env.MCP_TOKEN;
  const encabezado = req.get('Authorization') ?? '';
  if (!esperado || !encabezado.startsWith('Bearer ')) return false;
  const a = Buffer.from(encabezado.slice(7).trim());
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function perfilDeHeader(req) {
  const valor = (req.get('X-Perfil') ?? '').trim().toLowerCase();
  if (valor === '') return 'publico';
  if (!PERFILES.includes(valor)) {
    const mensaje = `El header X-Perfil debe ser ${PERFILES.join(', ')} (llegó "${req.get('X-Perfil')}").`;
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', mensaje);
  }
  return valor;
}

// Middleware: deja en req.sitio el sitio, en req.perfil el perfil y en req.usuario el usuario (o null).
export function leerPerfil(req, res, next) {
  const sitio = (req.get('X-Sitio') ?? '').trim().toLowerCase();
  req.usuario = null;

  if (sitio === 'publico') {
    req.sitio = 'publico';
    req.perfil = 'publico';
    return next();
  }

  if (sitio === 'interno') {
    req.sitio = 'interno';
    const sesion = leerToken(leerCookie(req));
    if (sesion) {
      // Defensa CSRF: los cambios con cookie deben traer el header X-Sbp (un sitio ajeno no puede
      // mandarlo sin CORS, y el API no tiene CORS).
      if (!METODOS_SEGUROS.has(req.method) && req.path !== '/sesion' && req.get('X-Sbp') !== '1') {
        return next(new ErrorApi(403, 'CSRF', 'Falta el header X-Sbp en una petición que cambia datos.'));
      }
      req.perfil = sesion.perfil;
      req.usuario = { usuario: sesion.usuario, nombre: sesion.nombre };
      return next();
    }
    if (tokenMcpValido(req)) {
      req.perfil = 'analista';
      req.usuario = { usuario: 'mcp', nombre: 'Cliente MCP' };
      return next();
    }
    req.perfil = 'publico';
    if (LIBRES_SIN_SESION.has(req.path)) return next();
    return next(new ErrorApi(401, 'SESION_REQUERIDA', 'Inicia sesión para usar el sitio interno.'));
  }

  // Llamada directa (sin nginx).
  req.sitio = 'directo';
  try {
    if (tokenMcpValido(req)) {
      req.perfil = 'analista';
      req.usuario = { usuario: 'mcp', nombre: 'Cliente MCP' };
      return next();
    }
    const sesion = leerToken(leerCookie(req));
    if (sesion) {
      req.perfil = sesion.perfil;
      req.usuario = { usuario: sesion.usuario, nombre: sesion.nombre };
      return next();
    }
    const perfil = perfilDeHeader(req);
    req.perfil = esLoopback(req) ? perfil : 'publico';
    return next();
  } catch (error) {
    return next(error);
  }
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
      usuario: req.usuario?.usuario ?? null,
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
