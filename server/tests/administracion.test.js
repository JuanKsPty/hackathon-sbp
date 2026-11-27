import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { leerOperaciones } from '../src/datos/bitacora.js';
import { POR_DEFECTO, leerReglaMovimientos } from '../src/automation/parametros.js';
import { paqueteReal } from './ayuda.js';

// Parámetros y bitácora de estas pruebas van a una carpeta temporal propia.
const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-admin-'));
process.env.STORAGE_DIR = carpeta;

const REGLA_POR_DEFECTO = leerReglaMovimientos(POR_DEFECTO);
const NUEVA = { min_cambio_posicion_abs: 3, cambio_lider: false, min_var_saldo_pct_abs: 25.5 };

let servidor;
let base;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  // Movimientos con la regla por defecto de la app: se lee del archivo en cada consulta.
  servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen) }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => {
  servidor.close();
  fs.rmSync(carpeta, { recursive: true, force: true });
});

async function pedir(ruta, { metodo = 'GET', perfil, cuerpo } = {}) {
  const headers = {};
  if (perfil !== undefined) headers['X-Perfil'] = perfil;
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  const respuesta = await fetch(base + ruta, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const ponerRegla = (perfil, regla) => pedir('/parametros', { metodo: 'PUT', perfil, cuerpo: { regla_significativo: regla } });

test('GET /api/parametros: todos los perfiles ven la regla; al inicio es la de config/', async () => {
  for (const perfil of [undefined, 'analista', 'admin']) {
    const { status, cuerpo } = await pedir('/parametros', { perfil });
    assert.equal(status, 200);
    assert.deepEqual(cuerpo.regla_significativo, REGLA_POR_DEFECTO);
    assert.equal(cuerpo.origen, 'por_defecto');
    assert.deepEqual(cuerpo.por_defecto, REGLA_POR_DEFECTO);
  }
});

test('PUT /api/parametros: publico y analista reciben 403 y la regla no cambia', async () => {
  for (const perfil of [undefined, 'analista']) {
    const { status, cuerpo } = await ponerRegla(perfil, NUEVA);
    assert.equal(status, 403);
    assert.equal(cuerpo.error.codigo, 'PERFIL_NO_AUTORIZADO');
  }
  assert.equal(fs.existsSync(path.join(carpeta, 'parametros.json')), false);
  assert.equal(leerOperaciones()[0].operacion, 'acceso_denegado');
});

test('PUT /api/parametros valida la regla: 400 y queda en la bitácora como error', async () => {
  const invalidas = [
    { ...NUEVA, min_cambio_posicion_abs: -1 },
    { ...NUEVA, min_var_saldo_pct_abs: '10' },
    { ...NUEVA, cambio_lider: 'si' },
    { cambio_lider: true },
    undefined,
  ];
  for (const regla of invalidas) {
    const { status, cuerpo } = await ponerRegla('admin', regla);
    assert.equal(status, 400, JSON.stringify(regla));
    assert.equal(cuerpo.error.codigo, 'PARAMETRO_INVALIDO');
  }
  const [ultima] = leerOperaciones();
  assert.deepEqual([ultima.operacion, ultima.perfil, ultima.resultado], ['cambio_parametros', 'admin', 'error']);
  assert.equal((await pedir('/parametros')).cuerpo.origen, 'por_defecto');
});

test('PUT /api/parametros como admin guarda la regla, la registra y /api/movimientos la usa', async () => {
  const { status, cuerpo } = await ponerRegla('admin', { ...NUEVA, campo_extra: 1 });
  assert.equal(status, 200);
  assert.deepEqual(cuerpo.regla_significativo, NUEVA); // solo los 3 campos de la regla
  assert.equal(cuerpo.origen, 'administrador');
  assert.deepEqual(cuerpo.por_defecto, REGLA_POR_DEFECTO);

  const guardado = JSON.parse(fs.readFileSync(path.join(carpeta, 'parametros.json'), 'utf8'));
  assert.deepEqual(guardado, { movimientos: NUEVA });

  const [ultima] = leerOperaciones();
  assert.deepEqual([ultima.operacion, ultima.perfil, ultima.resultado], ['cambio_parametros', 'admin', 'exito']);
  assert.match(ultima.detalle, /"min_var_saldo_pct_abs":25\.5/);

  // La comparación entre períodos aplica la regla nueva sin reiniciar.
  const movimientos = await pedir('/movimientos', { perfil: 'analista' });
  assert.deepEqual(movimientos.cuerpo.regla_significativo, NUEVA);

  // Restablecer: se vuelve a poner la regla por defecto.
  const restablecida = await ponerRegla('admin', REGLA_POR_DEFECTO);
  assert.deepEqual(restablecida.cuerpo.regla_significativo, REGLA_POR_DEFECTO);
});

test('GET /api/admin/catalogos: solo admin; CINU congelado y registros desde los catálogos', async () => {
  assert.equal((await pedir('/admin/catalogos')).status, 403);
  assert.equal((await pedir('/admin/catalogos', { perfil: 'analista' })).status, 403);

  const { status, cuerpo } = await pedir('/admin/catalogos', { perfil: 'admin' });
  assert.equal(status, 200);
  const porNombre = Object.fromEntries(cuerpo.catalogos.map((c) => [c.catalogo, c]));
  const { catalogos } = paqueteReal();
  assert.equal(porNombre['CINU/SB109'].archivo, 'Catalogo_CINU_SB109_reto.csv');
  assert.equal(porNombre['CINU/SB109'].registros, catalogos.cinu.size);
  assert.equal(porNombre['CINU/SB109'].congelado, true);
  assert.equal(porNombre.Bancos.registros, catalogos.bancos.size);
  assert.equal(porNombre.SB21.registros, catalogos.facilidades.size);
  assert.equal(porNombre['Diccionario AT03'].registros, 61);
  assert.equal(cuerpo.catalogos.filter((c) => c.congelado).length, 1);
  assert.ok(cuerpo.catalogos.every((c) => !Number.isNaN(Date.parse(c.fecha_carga)) && c.fuente));
});

test('contracts/parametros.json y contracts/catalogos-admin.json tienen los campos reales', async () => {
  const leer = (archivo) => JSON.parse(fs.readFileSync(new URL(`../../contracts/${archivo}`, import.meta.url), 'utf8'));
  const claves = (objeto) => Object.keys(objeto).sort();

  const parametros = leer('parametros.json');
  const { cuerpo: real } = await pedir('/parametros');
  assert.deepEqual(claves(parametros), claves(real));
  assert.deepEqual(claves(parametros.regla_significativo), claves(real.regla_significativo));

  const catalogos = leer('catalogos-admin.json');
  const { cuerpo: realCatalogos } = await pedir('/admin/catalogos', { perfil: 'admin' });
  assert.deepEqual(claves(catalogos), claves(realCatalogos));
  assert.deepEqual(claves(catalogos.catalogos[0]), claves(realCatalogos.catalogos[0]));
});
