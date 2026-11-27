// Sesiones cortadas por el Administrador. La sesión es un token firmado sin estado (auth/sesion.js):
// cuando el Administrador cambia el perfil o la contraseña de un usuario, o lo desactiva, se anota
// aquí la hora del cambio y toda sesión de ese usuario emitida antes deja de valer.
// Se guarda en storage/sesiones-cortadas.json para que sobreviva a un reinicio.
import fs from 'node:fs';
import path from 'node:path';
import { carpetaStorage } from '../datos/storage.js';

const archivo = () => path.join(carpetaStorage(), 'sesiones-cortadas.json');

// Se lee una vez por archivo (cambia con STORAGE_DIR en las pruebas) y luego vive en memoria.
let cache = { archivo: null, cortes: {} };
function cortes() {
  const ruta = archivo();
  if (cache.archivo === ruta) return cache.cortes;
  let leidos = {};
  try {
    leidos = JSON.parse(fs.readFileSync(ruta, 'utf8')) ?? {};
  } catch {
    // Sin archivo (o dañado): no hay sesiones cortadas.
  }
  cache = { archivo: ruta, cortes: leidos };
  return cache.cortes;
}

// Corta las sesiones abiertas de un usuario. ahora en milisegundos.
export function revocarSesiones(usuario, ahora = Date.now()) {
  const todos = cortes();
  todos[usuario] = ahora;
  try {
    fs.mkdirSync(carpetaStorage(), { recursive: true });
    fs.writeFileSync(archivo(), `${JSON.stringify(todos, null, 2)}\n`, 'utf8');
  } catch (error) {
    // En memoria ya vale; solo se perdería al reiniciar.
    console.error(`No se pudieron guardar las sesiones cortadas: ${error.message}`);
  }
}

// true si la sesión de ese usuario se emitió antes del último corte.
export function sesionRevocada(usuario, emitido = 0) {
  const corte = cortes()[usuario];
  return corte !== undefined && emitido < corte;
}
