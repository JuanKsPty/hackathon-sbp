// Usuarios del sitio interno (Analista y Administrador). Dos fuentes:
//   1. Supabase (Postgres): tabla interno.usuarios, si DATABASE_URL está definida.
//   2. Respaldo local: la variable USUARIOS del .env, si Supabase no está configurada o no responde
//      (la demo local funciona sin internet, R1). Solo se usa ante fallas de conexión, nunca porque
//      la contraseña no coincida.
// Formato de USUARIOS: "usuario:perfil:clave,usuario2:perfil:clave2" (perfil: analista o admin).
// Las contraseñas viven solo en el .env o en Dokploy, nunca en el repo (R5).
import pg from 'pg';
import { hashClave, verificarClave, verificarClaveFicticia } from './claves.js';

const PERFILES_INTERNOS = ['analista', 'admin'];

export class ErrorUsuariosNoDisponibles extends Error {}

// --- Respaldo local (.env) ---
let cacheLocal;
function usuariosLocales() {
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

// --- Supabase ---
let pool;
function poolSupabase() {
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
  const conexion = poolSupabase();
  const { rows } = await conexion.query(
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

export function fuentesConfiguradas() {
  return { supabase: Boolean(process.env.DATABASE_URL), local: usuariosLocales().size > 0 };
}

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
  }

  if (local) {
    const fila = usuariosLocales().get(nombreUsuario);
    if (!fila) return verificarClaveFicticia(clave) || null;
    if (!verificarClave(clave, fila.clave_hash)) return null;
    return { usuario: fila.usuario, nombre: fila.nombre, perfil: fila.perfil, fuente: 'local' };
  }

  throw new ErrorUsuariosNoDisponibles('No hay usuarios configurados (DATABASE_URL o USUARIOS).');
}
