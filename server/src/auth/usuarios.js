// Usuarios del sitio interno (Analista y Administrador). Fuentes:
//   1. Supabase (Postgres): tabla interno.usuarios, si DATABASE_URL está definida.
//   2. Sin Supabase: storage/usuarios.json, los que crea el Administrador desde la app (la demo local
//      funciona sin internet, R1). Guarda solo el hash de cada contraseña; storage/ no se sube al repo.
//   3. Respaldo: la variable USUARIOS del .env. Con Supabase se usa solo si Supabase no responde,
//      nunca porque la contraseña no coincida. Desde la app es de solo lectura.
// Formato de USUARIOS: "usuario:perfil:clave,usuario2:perfil:clave2" (perfil: analista o admin).
// Las contraseñas viven solo en el .env, en Dokploy o como hash en Supabase o en storage/, nunca en el repo (R5).
//
// Gestión (perfiles y permisos, lámina 6): listarUsuarios, crearUsuario y actualizarUsuario trabajan
// sobre la fuente editable (Supabase o el archivo). Con Supabase, el rol sbp_api necesita los permisos
// de server/db/002_gestion_usuarios.sql.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { hashClave, verificarClave, verificarClaveFicticia } from './claves.js';
import { carpetaStorage } from '../datos/storage.js';
import { ErrorApi } from '../routes/errores.js';

export const PERFILES_INTERNOS = ['analista', 'admin'];
export const LARGO_MINIMO_CLAVE = 10;
// "mcp" es el usuario con el que entran los clientes MCP (middleware/perfiles.js).
const RESERVADOS = new Set(['mcp', 'sistema', 'publico']);

export class ErrorUsuariosNoDisponibles extends Error {}

// --- Respaldo del .env ---
let cacheLocal;
function usuariosDelEnv() {
  const texto = process.env.USUARIOS ?? '';
  if (cacheLocal?.texto === texto) return cacheLocal.mapa;
  const mapa = new Map();
  for (const entrada of texto.split(/[;,]/).map((e) => e.trim()).filter(Boolean)) {
    const [usuario, perfil, ...resto] = entrada.split(':');
    const clave = resto.join(':');
    const limpio = (usuario ?? '').trim().toLowerCase();
    const perfilLimpio = (perfil ?? '').trim().toLowerCase();
    if (!limpio || !clave || !PERFILES_INTERNOS.includes(perfilLimpio)) {
      console.warn(`USUARIOS: se ignoró una entrada mal formada (usa usuario:perfil:clave, perfil analista o admin).`);
      continue;
    }
    mapa.set(limpio, { usuario: limpio, nombre: limpio, perfil: perfilLimpio, clave_hash: hashClave(clave) });
  }
  cacheLocal = { texto, mapa };
  return mapa;
}

// --- Archivo storage/usuarios.json ---
const archivoUsuarios = () => path.join(carpetaStorage(), 'usuarios.json');

function leerArchivo() {
  try {
    const { usuarios } = JSON.parse(fs.readFileSync(archivoUsuarios(), 'utf8'));
    return Array.isArray(usuarios) ? usuarios : [];
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`Usuarios: no se pudo leer ${archivoUsuarios()} (${error.message}).`);
    return [];
  }
}

function escribirArchivo(usuarios) {
  fs.mkdirSync(carpetaStorage(), { recursive: true });
  fs.writeFileSync(archivoUsuarios(), `${JSON.stringify({ usuarios }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

// --- Supabase ---
let pool;
let poolDePrueba = null;

// Para las pruebas: un objeto con query(sql, valores) que hace de Supabase. null lo quita.
export function usarPoolDePrueba(conexion) {
  poolDePrueba = conexion;
}

function poolSupabase() {
  if (poolDePrueba) return poolDePrueba;
  if (!process.env.DATABASE_URL) return null;
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 30000,
  });
  pool.on?.('error', (error) => console.error(`Supabase: ${error.message}`));
  return pool;
}

async function buscarEnSupabase(usuario) {
  const { rows } = await poolSupabase().query(
    'select usuario, nombre, perfil, clave_hash from interno.usuarios where usuario = $1 and activo limit 1',
    [usuario],
  );
  return rows[0] ?? null;
}

async function marcarAcceso(usuario) {
  try {
    await poolSupabase()?.query('update interno.usuarios set ultimo_acceso = now() where usuario = $1', [usuario]);
  } catch {
    // No es crítico.
  }
}

function marcarAccesoEnArchivo(usuario) {
  try {
    const usuarios = leerArchivo();
    const fila = usuarios.find((u) => u.usuario === usuario);
    if (!fila) return;
    fila.ultimo_acceso = new Date().toISOString();
    escribirArchivo(usuarios);
  } catch {
    // No es crítico.
  }
}

export function fuentesConfiguradas() {
  return {
    supabase: Boolean(poolDePrueba || process.env.DATABASE_URL),
    archivo: leerArchivo().length > 0,
    local: usuariosDelEnv().size > 0,
  };
}

// Dónde crea y cambia usuarios el Administrador: 'supabase' o 'archivo'.
export const fuenteEditable = () => (fuentesConfiguradas().supabase ? 'supabase' : 'archivo');

// Devuelve { usuario, nombre, perfil, fuente } si las credenciales son válidas; null si no.
// Lanza ErrorUsuariosNoDisponibles si no hay ninguna fuente que responda.
export async function verificarCredenciales(usuario, clave) {
  const nombreUsuario = String(usuario ?? '').trim().toLowerCase();
  const { supabase, local } = fuentesConfiguradas();

  if (supabase) {
    let fila;
    let caida = false;
    try {
      fila = await buscarEnSupabase(nombreUsuario);
    } catch (error) {
      console.error(`Supabase no respondió al iniciar sesión: ${error.message}`);
      caida = true;
    }
    if (!caida) {
      if (!fila || !PERFILES_INTERNOS.includes(fila.perfil)) return verificarClaveFicticia(clave) || null;
      if (!verificarClave(clave, fila.clave_hash)) return null;
      marcarAcceso(fila.usuario);
      return { usuario: fila.usuario, nombre: fila.nombre || fila.usuario, perfil: fila.perfil, fuente: 'supabase' };
    }
    if (!local) throw new ErrorUsuariosNoDisponibles('Supabase no responde y no hay usuarios locales.');
  } else {
    // Sin Supabase: primero los que creó el Administrador. Uno desactivado no entra, aunque esté en el .env.
    const fila = leerArchivo().find((u) => u.usuario === nombreUsuario);
    if (fila) {
      if (!fila.activo || !PERFILES_INTERNOS.includes(fila.perfil) || !verificarClave(clave, fila.clave_hash)) {
        if (!fila.activo) verificarClaveFicticia(clave);
        return null;
      }
      marcarAccesoEnArchivo(fila.usuario);
      return { usuario: fila.usuario, nombre: fila.nombre || fila.usuario, perfil: fila.perfil, fuente: 'archivo' };
    }
  }

  if (local) {
    const fila = usuariosDelEnv().get(nombreUsuario);
    if (!fila) return verificarClaveFicticia(clave) || null;
    if (!verificarClave(clave, fila.clave_hash)) return null;
    return { usuario: fila.usuario, nombre: fila.nombre, perfil: fila.perfil, fuente: 'local' };
  }

  if (!supabase && fuentesConfiguradas().archivo) return verificarClaveFicticia(clave) || null;
  throw new ErrorUsuariosNoDisponibles('No hay usuarios configurados (DATABASE_URL, USUARIOS o usuarios creados desde la app).');
}

// ---------------------------------------------------------------------------------------------
// Gestión desde la app (solo Administrador).

const COLUMNAS = 'usuario, nombre, perfil, activo, creado_en, ultimo_acceso';

const fechaIso = (valor) => (valor ? new Date(valor).toISOString() : null);

// Lo que ve la app de cada usuario: nunca el hash de la contraseña.
function publico(fila, origen) {
  return {
    usuario: fila.usuario,
    nombre: fila.nombre || fila.usuario,
    perfil: fila.perfil,
    activo: fila.activo !== false,
    creado_en: fechaIso(fila.creado_en),
    ultimo_acceso: fechaIso(fila.ultimo_acceso),
    origen,
    editable: origen !== 'env',
  };
}

// Errores de Postgres -> errores de la API.
function errorDeSupabase(error) {
  if (error instanceof ErrorApi) return error;
  if (error?.code === '23505') return new ErrorApi(409, 'USUARIO_EXISTE', 'Ya existe un usuario con ese nombre.');
  if (error?.code === '42501') {
    return new ErrorApi(503, 'USUARIOS_SOLO_LECTURA',
      'La base de datos todavía no permite crear ni cambiar usuarios: falta aplicar server/db/002_gestion_usuarios.sql en Supabase.');
  }
  console.error(`Supabase (gestión de usuarios): ${error?.message}`);
  return new ErrorApi(503, 'USUARIOS_NO_DISPONIBLES', 'No se pudo conectar con la base de usuarios. Intenta de nuevo en un momento.');
}

async function filasEditables() {
  if (fuenteEditable() === 'archivo') return leerArchivo().map((fila) => publico(fila, 'archivo'));
  try {
    const { rows } = await poolSupabase().query(`select ${COLUMNAS} from interno.usuarios order by usuario`);
    return rows.map((fila) => publico(fila, 'supabase'));
  } catch (error) {
    throw errorDeSupabase(error);
  }
}

// { fuente, usuarios[] }: los de la fuente editable y, de solo lectura, los del .env que no están ahí.
export async function listarUsuarios() {
  const editables = await filasEditables();
  const nombres = new Set(editables.map((u) => u.usuario));
  const delEnv = [...usuariosDelEnv().values()].filter((u) => !nombres.has(u.usuario)).map((u) => publico(u, 'env'));
  return { fuente: fuenteEditable(), usuarios: [...editables, ...delEnv] };
}

function validarNombreUsuario(valor) {
  const usuario = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9._-]{1,59}$/.test(usuario)) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'El usuario debe tener de 2 a 60 caracteres: letras, números, punto, guion o guion bajo, sin espacios.');
  }
  if (RESERVADOS.has(usuario)) throw new ErrorApi(400, 'PARAMETRO_INVALIDO', `"${usuario}" es un nombre reservado de la app.`);
  return usuario;
}

function validarNombre(valor, usuario) {
  if (valor === undefined || valor === null) return usuario;
  if (typeof valor !== 'string') throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'El nombre debe ser texto.');
  const nombre = valor.trim().replace(/\s+/g, ' ');
  if (nombre.length > 80) throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'El nombre no puede pasar de 80 caracteres.');
  return nombre || usuario;
}

function validarPerfil(valor) {
  if (!PERFILES_INTERNOS.includes(valor)) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'El perfil debe ser "analista" o "admin" (el Público no inicia sesión).');
  }
  return valor;
}

function validarClave(valor) {
  if (typeof valor !== 'string' || valor.length < LARGO_MINIMO_CLAVE || valor.length > 200) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
  }
  return valor;
}

// Crea un usuario en la fuente editable. Devuelve lo que ve la app (sin el hash).
export async function crearUsuario(datos = {}) {
  const usuario = validarNombreUsuario(datos.usuario);
  const nombre = validarNombre(datos.nombre, usuario);
  const perfil = validarPerfil(datos.perfil);
  const clave_hash = hashClave(validarClave(datos.clave));
  if (usuariosDelEnv().has(usuario)) {
    throw new ErrorApi(409, 'USUARIO_EXISTE', `"${usuario}" ya existe en la variable USUARIOS del .env.`);
  }

  if (fuenteEditable() === 'archivo') {
    const usuarios = leerArchivo();
    if (usuarios.some((u) => u.usuario === usuario)) throw new ErrorApi(409, 'USUARIO_EXISTE', 'Ya existe un usuario con ese nombre.');
    const fila = { usuario, nombre, perfil, clave_hash, activo: true, creado_en: new Date().toISOString(), ultimo_acceso: null };
    escribirArchivo([...usuarios, fila]);
    return publico(fila, 'archivo');
  }
  try {
    const { rows } = await poolSupabase().query(
      `insert into interno.usuarios (usuario, nombre, perfil, clave_hash) values ($1, $2, $3, $4) returning ${COLUMNAS}`,
      [usuario, nombre, perfil, clave_hash],
    );
    return publico(rows[0], 'supabase');
  } catch (error) {
    throw errorDeSupabase(error);
  }
}

// Cambia nombre, perfil, activo y/o contraseña de un usuario de la fuente editable.
// quien: el usuario de la sesión que hace el cambio (no puede quitarse el perfil de Administrador
// ni desactivarse). Siempre queda al menos un Administrador activo.
// Devuelve { antes, despues, cambios } (cambios: lista de lo que cambió, sin contraseñas).
export async function actualizarUsuario(valorUsuario, datos = {}, { quien = null } = {}) {
  const usuario = String(valorUsuario ?? '').trim().toLowerCase();
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'Manda los cambios como un objeto JSON.');
  }
  const desconocido = Object.keys(datos).find((k) => !['nombre', 'perfil', 'activo', 'clave'].includes(k));
  if (desconocido) throw new ErrorApi(400, 'PARAMETRO_INVALIDO', `No se puede cambiar "${desconocido}" (sí: nombre, perfil, activo y clave).`);

  const todos = await filasEditables();
  const antes = todos.find((u) => u.usuario === usuario);
  if (!antes) {
    if (usuariosDelEnv().has(usuario)) {
      throw new ErrorApi(409, 'USUARIO_SOLO_LECTURA', `"${usuario}" viene de la variable USUARIOS del .env: se cambia ahí, no desde la app.`);
    }
    throw new ErrorApi(404, 'USUARIO_NO_ENCONTRADO', `No existe el usuario "${usuario}".`);
  }

  const despues = { ...antes };
  const cambios = [];
  if ('nombre' in datos) {
    despues.nombre = validarNombre(datos.nombre, usuario);
    if (despues.nombre !== antes.nombre) cambios.push(`nombre: "${antes.nombre}" → "${despues.nombre}"`);
  }
  if ('perfil' in datos) {
    despues.perfil = validarPerfil(datos.perfil);
    if (despues.perfil !== antes.perfil) cambios.push(`perfil: ${antes.perfil} → ${despues.perfil}`);
  }
  if ('activo' in datos) {
    if (typeof datos.activo !== 'boolean') throw new ErrorApi(400, 'PARAMETRO_INVALIDO', '"activo" debe ser true o false.');
    despues.activo = datos.activo;
    if (despues.activo !== antes.activo) cambios.push(despues.activo ? 'activado' : 'desactivado');
  }
  let clave_hash = null;
  if ('clave' in datos) {
    clave_hash = hashClave(validarClave(datos.clave));
    cambios.push('contraseña restablecida');
  }
  if (cambios.length === 0) return { antes, despues: antes, cambios };

  const esElMismo = quien && quien === usuario;
  if (esElMismo && (despues.perfil !== 'admin' || !despues.activo)) {
    throw new ErrorApi(409, 'OPERACION_NO_PERMITIDA', 'No puedes quitarte el perfil de Administrador ni desactivar tu propia cuenta.');
  }
  const eraAdminActivo = antes.perfil === 'admin' && antes.activo;
  const sigueAdminActivo = despues.perfil === 'admin' && despues.activo;
  if (eraAdminActivo && !sigueAdminActivo) {
    const otrosAdmins = todos.filter((u) => u.usuario !== usuario && u.perfil === 'admin' && u.activo).length
      + (fuenteEditable() === 'archivo' ? [...usuariosDelEnv().values()].filter((u) => u.perfil === 'admin').length : 0);
    if (otrosAdmins === 0) {
      throw new ErrorApi(409, 'OPERACION_NO_PERMITIDA', 'Debe quedar al menos un Administrador activo.');
    }
  }

  if (fuenteEditable() === 'archivo') {
    const usuarios = leerArchivo();
    const fila = usuarios.find((u) => u.usuario === usuario);
    Object.assign(fila, { nombre: despues.nombre, perfil: despues.perfil, activo: despues.activo });
    if (clave_hash) fila.clave_hash = clave_hash;
    escribirArchivo(usuarios);
    return { antes, despues: publico(fila, 'archivo'), cambios };
  }
  try {
    const { rows } = await poolSupabase().query(
      `update interno.usuarios set nombre = $2, perfil = $3, activo = $4, clave_hash = coalesce($5, clave_hash)
       where usuario = $1 returning ${COLUMNAS}`,
      [usuario, despues.nombre, despues.perfil, despues.activo, clave_hash],
    );
    if (!rows[0]) throw new ErrorApi(404, 'USUARIO_NO_ENCONTRADO', `No existe el usuario "${usuario}".`);
    return { antes, despues: publico(rows[0], 'supabase'), cambios };
  } catch (error) {
    throw errorDeSupabase(error);
  }
}
