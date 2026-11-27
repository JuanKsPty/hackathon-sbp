// Despliegue (#84): toda variable de entorno que lee el server en producción la pasa docker-compose.yml
// al contenedor y está documentada en .env.example. Si falta en el compose, Dokploy puede tenerla
// configurada y aun así el server no la ve (pasó con APP_URL: los enlaces de los correos salían a localhost).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const SRC = path.join(RAIZ, 'server', 'src');

// Variables que el server lee pero que no van en el compose, con el motivo.
const FUERA_DEL_COMPOSE = {
  PORT: 'fijada en server/Dockerfile',
  DATA_DIR: 'fijada en server/Dockerfile',
  STORAGE_DIR: 'fijada en server/Dockerfile',
  PARAMETROS_FILE: 'fijada en server/Dockerfile',
  NODE_TEST_CONTEXT: 'la pone node --test',
  API_INTERNA: 'por defecto 127.0.0.1:PORT, que sirve dentro del contenedor',
  MCP_API_INTERNA: 'por defecto 127.0.0.1:PORT, que sirve dentro del contenedor',
  MCP_API_URL: 'la usa el MCP por stdio, que corre en la máquina de quien lo conecta',
  MCP_PERFIL: 'la usa el MCP por stdio, que corre en la máquina de quien lo conecta',
};

function archivosJs(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosJs(ruta);
    return nombre.endsWith('.js') ? [ruta] : [];
  });
}

const leidasPorElServer = [
  ...new Set(archivosJs(SRC).flatMap((archivo) => [...readFileSync(archivo, 'utf8').matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1]))),
].sort();

test('el compose le pasa al server cada variable de entorno que usa en producción', () => {
  const compose = readFileSync(path.join(RAIZ, 'docker-compose.yml'), 'utf8');
  const faltan = leidasPorElServer.filter(
    (nombre) => !(nombre in FUERA_DEL_COMPOSE) && !new RegExp(`^\\s+${nombre}: \\$\\{${nombre}:-\\}`, 'm').test(compose),
  );
  assert.deepEqual(faltan, [], `docker-compose.yml no pasa al server: ${faltan.join(', ')}`);
});

// Basta con que aparezca: una variable propia va como `NOMBRE=`, y un nombre anterior (MCP_API_INTERNA)
// se explica en el comentario de la variable nueva.
test('.env.example documenta cada variable que lee el server', () => {
  const ejemplo = readFileSync(path.join(RAIZ, '.env.example'), 'utf8');
  const sinDocumentar = leidasPorElServer.filter((nombre) => nombre !== 'NODE_TEST_CONTEXT' && !new RegExp(`\\b${nombre}\\b`).test(ejemplo));
  assert.deepEqual(sinDocumentar, [], `.env.example no documenta: ${sinDocumentar.join(', ')}`);
});

test('las excepciones del compose siguen existiendo en el código', () => {
  const sobran = Object.keys(FUERA_DEL_COMPOSE).filter((nombre) => !leidasPorElServer.includes(nombre));
  assert.deepEqual(sobran, [], `ya nadie lee: ${sobran.join(', ')}`);
});
