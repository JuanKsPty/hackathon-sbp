// Sesión del sitio interno: cookie HttpOnly con un token firmado (HMAC-SHA256), sin estado en el server.
// Token: <payload base64url>.<firma base64url>, payload = { u, n, p, exp, iat }.
// iat (milisegundos) sirve para cortar las sesiones emitidas antes de un cambio del usuario
// (auth/revocaciones.js).
// La llave es SESION_SECRETO (.env o Dokploy). Si falta, se genera una al arrancar: funciona, pero las
// sesiones se pierden al reiniciar el server.
import crypto from 'node:crypto';

export const COOKIE_SESION = 'sbp_sesion';
const HORAS = Number(process.env.SESION_HORAS) > 0 ? Number(process.env.SESION_HORAS) : 8;

let secreto;
function llave() {
  if (secreto) return secreto;
  if (process.env.SESION_SECRETO) {
    secreto = process.env.SESION_SECRETO;
  } else {
    secreto = crypto.randomBytes(32).toString('hex');
    console.warn('SESION_SECRETO vacío: se generó uno temporal; las sesiones se pierden al reiniciar.');
  }
  return secreto;
}

const firmar = (texto) => crypto.createHmac('sha256', llave()).update(texto).digest('base64url');

export function crearToken({ usuario, nombre, perfil }, ahora = Date.now()) {
  const exp = Math.floor(ahora / 1000) + HORAS * 3600;
  const payload = Buffer.from(JSON.stringify({ u: usuario, n: nombre, p: perfil, exp, iat: ahora })).toString('base64url');
  return `${payload}.${firmar(payload)}`;
}

// Devuelve { usuario, nombre, perfil, emitido } o null si el token no es válido o venció.
// emitido es 0 en los tokens de antes de que existiera iat.
export function leerToken(token, ahora = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, firma] = token.split('.');
  if (!payload || !firma) return null;
  const esperada = Buffer.from(firmar(payload));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
  try {
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!datos.exp || datos.exp * 1000 < ahora) return null;
    if (!['analista', 'admin'].includes(datos.p)) return null;
    return { usuario: datos.u, nombre: datos.n, perfil: datos.p, emitido: Number(datos.iat) || 0 };
  } catch {
    return null;
  }
}

export function leerCookie(req, nombre = COOKIE_SESION) {
  const encabezado = req.headers.cookie ?? '';
  for (const parte of encabezado.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nombre) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return null;
}

function opcionesCookie(req) {
  return { httpOnly: true, sameSite: 'strict', path: '/', secure: req.secure };
}

export function fijarCookieSesion(req, res, token) {
  res.cookie(COOKIE_SESION, token, { ...opcionesCookie(req), maxAge: HORAS * 3600 * 1000 });
}

export function borrarCookieSesion(req, res) {
  res.clearCookie(COOKIE_SESION, opcionesCookie(req));
}
