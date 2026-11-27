// Perfiles y permisos (lámina 6, Administrador): el Administrador cambia qué perfil puede usar cada
// opción configurable y el cambio aplica de inmediato al menú (GET /api/perfil) y a los 403.
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { leerOperaciones } from '../src/datos/bitacora.js';
import { archivoPermisos } from '../src/datos/permisos.js';
import { OPCIONES, permisosVigentes, validarPermisos } from '../src/middleware/perfiles.js';
import { paqueteReal } from './ayuda.js';

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-permisos-'));
process.env.STORAGE_DIR = carpeta;

let servidor;
let base;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen) }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => {
  servidor.close();
  fs.rmSync(carpeta, { recursive: true, force: true });
});

beforeEach(() => fs.rmSync(archivoPermisos(), { force: true }));

async function pedir(ruta, { metodo = 'GET', perfil, cuerpo } = {}) {
  const headers = {};
  if (perfil) headers['X-Perfil'] = perfil;
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  const respuesta = await fetch(base + ruta, { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: texto.startsWith('{') ? JSON.parse(texto) : texto };
}

const opcionesDelPerfil = async (perfil) => (await pedir('/perfil', { perfil })).cuerpo.opciones.map((o) => o.opcion);
const guardar = (opciones, perfil = 'admin') => pedir('/admin/permisos', { metodo: 'PUT', perfil, cuerpo: { opciones } });

test('sin cambios, la tabla vigente es la de OPCIONES y el Administrador tiene todas', async () => {
  const { status, cuerpo } = await pedir('/admin/permisos', { perfil: 'admin' });
  assert.equal(status, 200);
  assert.equal(cuerpo.origen, 'por_defecto');
  assert.deepEqual(cuerpo.opciones.map((o) => o.perfiles), OPCIONES.map((o) => o.perfiles));
  assert.ok(cuerpo.opciones.every((o) => o.perfiles.includes('admin')));
  assert.deepEqual(cuerpo.opciones.filter((o) => o.configurable).map((o) => o.opcion), ['descargar', 'comparar_periodos', 'reportes_personalizados']);
  assert.ok(cuerpo.opciones.filter((o) => !o.configurable).every((o) => o.motivo), 'cada opción fija dice por qué');
});

test('Público y Analista no ven ni cambian los permisos: 403 y queda en la bitácora', async () => {
  for (const perfil of [undefined, 'analista']) {
    assert.equal((await pedir('/admin/permisos', { perfil })).status, 403);
    assert.equal((await pedir('/admin/permisos', { metodo: 'PUT', perfil, cuerpo: { opciones: { comparar_periodos: ['publico', 'analista'] } } })).status, 403);
    assert.equal((await pedir('/admin/permisos', { metodo: 'DELETE', perfil })).status, 403);
  }
  assert.equal(fs.existsSync(archivoPermisos()), false);
  assert.equal(leerOperaciones()[0].operacion, 'acceso_denegado');
});

test('dar Comparar períodos al Público: aplica al menú y a la API sin reiniciar, y se registra', async () => {
  assert.equal((await pedir('/movimientos')).status, 403);
  const { status, cuerpo } = await guardar({ comparar_periodos: ['publico', 'analista'] });
  assert.equal(status, 200);
  assert.equal(cuerpo.origen, 'administrador');
  const fila = cuerpo.opciones.find((o) => o.opcion === 'comparar_periodos');
  assert.deepEqual(fila.perfiles, ['publico', 'analista', 'admin']);
  assert.deepEqual(fila.por_defecto, ['analista', 'admin']);
  // Comparar entidades va junto con Comparar períodos.
  assert.deepEqual(cuerpo.opciones.find((o) => o.opcion === 'comparar_entidades').perfiles, ['publico', 'analista', 'admin']);

  assert.ok((await opcionesDelPerfil()).includes('comparar_periodos'));
  assert.equal((await pedir('/movimientos')).status, 200);

  const registro = leerOperaciones()[0];
  assert.equal(registro.operacion, 'cambio_permisos');
  assert.equal(registro.resultado, 'exito');
  assert.match(registro.detalle, /Comparar períodos: Analista → Público y Analista/);
});

test('quitar Descargar reportes al Público: las descargas abiertas responden 403 solo al Público', async () => {
  await guardar({ descargar: ['analista'] });
  assert.equal((await pedir('/exportar/rankings.csv')).status, 403);
  assert.equal((await pedir('/exportar/rankings.csv', { perfil: 'analista' })).status, 200);
  assert.ok(!(await opcionesDelPerfil()).includes('descargar'));
});

test('quitar Reportes personalizados al Analista: solo el Administrador los genera', async () => {
  await guardar({ reportes_personalizados: [] });
  assert.equal((await pedir('/exportar/personalizado.csv', { perfil: 'analista' })).status, 403);
  assert.equal((await pedir('/exportar/personalizado.csv', { perfil: 'admin' })).status, 200);
});

test('DELETE vuelve a los permisos por defecto y lo registra', async () => {
  await guardar({ comparar_periodos: ['publico', 'analista'] });
  const { status, cuerpo } = await pedir('/admin/permisos', { metodo: 'DELETE', perfil: 'admin' });
  assert.equal(status, 200);
  assert.equal(cuerpo.origen, 'por_defecto');
  assert.equal(fs.existsSync(archivoPermisos()), false);
  assert.equal(leerOperaciones()[0].operacion, 'restablecer_permisos');
  assert.equal((await pedir('/movimientos')).status, 403);
});

test('valida lo que manda: opciones fijas, perfiles ajenos y la jerarquía Público ⊂ Analista', async () => {
  const invalidos = [
    [{ cargar_periodo: ['analista'] }, /no se puede cambiar/],
    [{ ver_bitacora: ['analista'] }, /solo del Administrador/],
    [{ no_existe: [] }, /no existe/],
    [{ descargar: 'publico' }, /deben ser una lista/],
    [{ descargar: ['root'] }, /no es un perfil/],
    [{ comparar_periodos: ['publico'] }, /el Analista también/],
  ];
  for (const [opciones, mensaje] of invalidos) {
    const { status, cuerpo } = await guardar(opciones);
    assert.equal(status, 400, JSON.stringify(opciones));
    assert.equal(cuerpo.error.codigo, 'PARAMETRO_INVALIDO');
    assert.match(cuerpo.error.mensaje, mensaje);
  }
  assert.equal((await pedir('/admin/permisos', { metodo: 'PUT', perfil: 'admin', cuerpo: {} })).status, 400);
  assert.equal(fs.existsSync(archivoPermisos()), false);
  assert.equal(leerOperaciones()[0].resultado, 'error');
});

test('el Administrador nunca pierde una opción, aunque el archivo diga otra cosa', () => {
  const vigentes = permisosVigentes({ descargar: [], comparar_periodos: ['publico'] });
  assert.ok(vigentes.every((o) => o.perfiles.includes('admin')));
  assert.deepEqual(validarPermisos({ descargar: ['admin', 'analista'] }).descargar, ['analista']);
});

test('un permisos.json dañado no tumba la API: valen los permisos por defecto', async () => {
  fs.writeFileSync(archivoPermisos(), '{ esto no es json');
  const { status, cuerpo } = await pedir('/admin/permisos', { perfil: 'admin' });
  assert.equal(status, 200);
  assert.equal(cuerpo.origen, 'por_defecto');
  assert.equal((await pedir('/movimientos')).status, 403);
});

test('la IA usa los permisos vigentes: guía, herramientas y prompt; la sesión es solo del sitio interno', async () => {
  const { perfilVeElemento } = await import('../src/ai/guia.js');
  const { definicionesPara } = await import('../src/ai/herramientas.js');
  const nombres = (perfil) => definicionesPara(perfil).map((h) => h.name);

  assert.equal(perfilVeElemento('comparar.tabla-movimientos', 'publico'), false);
  assert.ok(!nombres('publico').includes('consultar_movimientos'));
  // El Administrador le da Comparar períodos al Público; después se lo quita al Público y al Analista.
  await guardar({ comparar_periodos: ['publico', 'analista'] });
  assert.equal(perfilVeElemento('comparar.tabla-movimientos', 'publico'), true);
  assert.ok(nombres('publico').includes('consultar_movimientos'));
  await guardar({ comparar_periodos: [] });
  assert.equal(perfilVeElemento('comparar.tabla-movimientos', 'analista'), false);
  assert.ok(!nombres('analista').includes('consultar_movimientos'));
  assert.ok(nombres('admin').includes('consultar_movimientos'));

  // La sesión (SesionUsuario) no depende de comparar_periodos: el Analista la ve y el Público nunca.
  assert.equal(perfilVeElemento('global.selector-perfil', 'analista'), true);
  await guardar({ comparar_periodos: ['publico', 'analista'] });
  assert.equal(perfilVeElemento('global.selector-perfil', 'publico'), false);
});
