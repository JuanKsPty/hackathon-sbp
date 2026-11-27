// Crea o actualiza un usuario del sitio interno. Imprime el SQL para Supabase (tabla interno.usuarios)
// y la línea para el respaldo local USUARIOS del .env. No guarda nada en el repo (R5).
// Uso: npm run usuarios -- <usuario> <analista|admin> [clave] [nombre]
//   Sin clave, genera una aleatoria.
import crypto from 'node:crypto';
import { hashClave } from '../src/auth/claves.js';

const [usuario, perfil, claveDada, ...nombre] = process.argv.slice(2);
if (!usuario || !['analista', 'admin'].includes(perfil)) {
  console.error('Uso: npm run usuarios -- <usuario> <analista|admin> [clave] [nombre]');
  process.exit(1);
}
const clave = claveDada || crypto.randomBytes(12).toString('base64url');
const sql = (texto) => `'${String(texto).replaceAll("'", "''")}'`;
const u = usuario.trim().toLowerCase();
console.log(`-- Supabase (SQL editor):
insert into interno.usuarios (usuario, nombre, perfil, clave_hash) values (${sql(u)}, ${sql(nombre.join(' ') || u)}, ${sql(perfil)}, ${sql(hashClave(clave))})
on conflict (usuario) do update set nombre = excluded.nombre, perfil = excluded.perfil, clave_hash = excluded.clave_hash, activo = true;

# Respaldo local (.env), entradas separadas por coma
USUARIOS=${u}:${perfil}:${clave}

# Contraseña: ${clave}`);
