// Carpeta de persistencia local: bitácora (#31) y parámetros que cambia el Administrador (#30).
// Está en .gitignore: no se sube al repo.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CARPETA_RAIZ = fileURLToPath(new URL('../../../', import.meta.url));

// - STORAGE_DIR, si está definida;
// - durante `npm test`, una carpeta temporal, para no ensuciar los datos reales;
// - si no, storage/ en la raíz del repo.
export function carpetaStorage() {
  if (process.env.STORAGE_DIR) return path.resolve(process.env.STORAGE_DIR);
  if (process.env.NODE_TEST_CONTEXT) return path.join(os.tmpdir(), `sbp-pruebas-${process.pid}`);
  return path.join(CARPETA_RAIZ, 'storage');
}
