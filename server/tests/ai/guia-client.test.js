// Cada elemento del catálogo del agente guía (#72) existe en el client. Si la IA elige un
// identificador que no está en la pantalla, el cursor no encuentra nada en plena demo (#86, A1).
// Se busca como texto literal ("x" o 'x') en los componentes, sin contar mocks ni tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELEMENTOS_GUIA } from '../../src/ai/guia.js';

const CLIENT = fileURLToPath(new URL('../../../client/src', import.meta.url));

function archivosDelClient(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDelClient(ruta);
    const esCodigo = /\.jsx?$/.test(nombre) && !nombre.endsWith('.test.js') && !nombre.startsWith('mocks');
    return esCodigo ? [ruta] : [];
  });
}

test('cada identificador del catálogo de la guía está en un componente del client', () => {
  const codigo = archivosDelClient(CLIENT).map((archivo) => readFileSync(archivo, 'utf8')).join('\n');
  const faltan = ELEMENTOS_GUIA.map((e) => e.guia).filter((guia) => !codigo.includes(`'${guia}'`) && !codigo.includes(`"${guia}"`));
  assert.deepEqual(faltan, [], `identificadores del catálogo sin data-guia en client/src: ${faltan.join(', ')}`);
});
