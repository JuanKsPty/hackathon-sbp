// Permisos que configura el Administrador (perfiles y permisos, lámina 6): qué perfiles tienen cada
// opción configurable. Se guardan en storage/permisos.json (la misma carpeta de la bitácora y los
// parámetros; no se sube al repo). Sin ese archivo valen los permisos por defecto de perfiles.js.
// Este módulo solo lee y escribe el archivo: la validación y las reglas viven en middleware/perfiles.js.
import fs from 'node:fs';
import path from 'node:path';
import { carpetaStorage } from './storage.js';

export function archivoPermisos() {
  return path.join(carpetaStorage(), 'permisos.json');
}

// El archivo se relee solo si cambió (cada petición protegida consulta los permisos).
let cache = { archivo: null, mtimeMs: null, datos: null };

// { opcion: [perfiles] } que guardó el Administrador, o null si no guardó nada.
// Un archivo dañado se ignora (valen los permisos por defecto) y se avisa en consola.
export function leerPermisosGuardados() {
  const archivo = archivoPermisos();
  let mtimeMs;
  try {
    mtimeMs = fs.statSync(archivo).mtimeMs;
  } catch {
    cache = { archivo, mtimeMs: null, datos: null };
    return null;
  }
  if (cache.archivo === archivo && cache.mtimeMs === mtimeMs) return cache.datos;
  let datos = null;
  try {
    const leido = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    if (leido && typeof leido.opciones === 'object' && !Array.isArray(leido.opciones)) datos = leido.opciones;
    else console.warn(`Permisos: ${archivo} no tiene el campo "opciones"; se usan los permisos por defecto.`);
  } catch (error) {
    console.warn(`Permisos: no se pudo leer ${archivo} (${error.message}); se usan los permisos por defecto.`);
  }
  cache = { archivo, mtimeMs, datos };
  return datos;
}

export function guardarPermisos(opciones) {
  fs.mkdirSync(carpetaStorage(), { recursive: true });
  fs.writeFileSync(archivoPermisos(), `${JSON.stringify({ opciones }, null, 2)}\n`, 'utf8');
  cache = { archivo: null, mtimeMs: null, datos: null };
}

export function borrarPermisos() {
  fs.rmSync(archivoPermisos(), { force: true });
  cache = { archivo: null, mtimeMs: null, datos: null };
}
