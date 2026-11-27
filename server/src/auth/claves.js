// Contraseñas: hash con scrypt (node:crypto, sin dependencias) y comparación en tiempo constante.
// Formato guardado: scrypt$<N>$<r>$<p>$<sal base64>$<hash base64>
import crypto from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const LARGO = 32;

export function hashClave(clave, sal = crypto.randomBytes(16)) {
  const hash = crypto.scryptSync(String(clave), sal, LARGO, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${hash.toString('base64')}`;
}

// Se usa con usuarios que no existen, para que la respuesta tarde lo mismo (no revela quién existe).
const HASH_FICTICIO = hashClave('clave-que-no-existe');

export function verificarClave(clave, guardado) {
  const partes = String(guardado ?? HASH_FICTICIO).split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
  const [, n, r, p, sal, hash] = partes;
  const esperado = Buffer.from(hash, 'base64');
  let calculado;
  try {
    calculado = crypto.scryptSync(String(clave ?? ''), Buffer.from(sal, 'base64'), esperado.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
  } catch {
    return false;
  }
  return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

export function verificarClaveFicticia(clave) {
  verificarClave(clave, HASH_FICTICIO);
  return false;
}
