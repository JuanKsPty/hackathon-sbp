import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { formatearCentavos } from '../src/engine/index.js';
import { paqueteReal } from './ayuda.js';

let servidor;
let base;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos) }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

async function pedir(ruta) {
  const respuesta = await fetch(base + ruta);
  const texto = await respuesta.text();
  return { status: respuesta.status, texto, cuerpo: JSON.parse(texto) };
}

test('GET /api/periodos lista los 3 períodos y el último', async () => {
  const { status, cuerpo } = await pedir('/periodos');
  assert.equal(status, 200);
  assert.equal(cuerpo.ultimo, '20260930');
  assert.deepEqual(cuerpo.periodos.map((p) => p.Fecha), ['20260731', '20260831', '20260930']);
  assert.equal(cuerpo.periodos[0].Archivo, 'AT03_sintetico_202607.csv');
  assert.equal(cuerpo.periodos.every((p) => p.Reconciliaciones_OK), true);
  assert.match(cuerpo.aviso, /Datos ficticios/);
});

test('GET /api/catalogos trae 12 bancos y 6 rankings con sus subactividades', async () => {
  const { cuerpo } = await pedir('/catalogos');
  assert.equal(cuerpo.bancos.length, 12);
  assert.deepEqual(cuerpo.bancos[0], { Codigo_Banco: '101', Banco: 'Banco Istmo' });
  assert.equal(cuerpo.rankings.length, 6);
  assert.equal(cuerpo.rankings.reduce((n, r) => n + r.Subactividades.length, 0), 22);
});

test('GET /api/rankings sin parámetros devuelve el último período con 6 rankings de 12 bancos', async () => {
  const { cuerpo } = await pedir('/rankings');
  assert.equal(cuerpo.periodo, '20260930');
  assert.equal(cuerpo.archivo, 'AT03_sintetico_202609.csv');
  assert.equal(cuerpo.rankings.length, 6);
  for (const r of cuerpo.rankings) assert.deepEqual(r.bancos.map((b) => b.Posicion), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('GET /api/rankings serializa montos con 2 decimales y ponderación con 4, iguales al motor', async () => {
  const { cuerpo, texto } = await pedir('/rankings?periodo=20260731&ranking=HIPOTECARIO');
  const motor = paqueteReal().periodos[0].rankings.find((r) => r.ranking === 'HIPOTECARIO').filas;
  cuerpo.rankings[0].bancos.forEach((b, i) => {
    assert.equal(b.Codigo_Banco, motor[i].codigoBanco);
    assert.equal(b.Saldo_Actividad, Number(formatearCentavos(motor[i].saldoActividad)));
    assert.equal(b.Total_Cartera_Local_Valida, Number(formatearCentavos(motor[i].totalCartera)));
  });
  // Lo que viaja en el JSON es exactamente el número con sus decimales (cifra de la referencia de pruebas).
  assert.match(texto, /"Saldo_Actividad":87562053\.92/);
  assert.match(texto, /"Ponderacion_Pct":19\.5397/);
});

test('GET /api/rankings filtra por ranking y banco', async () => {
  const { cuerpo } = await pedir('/rankings?periodo=20260831&banco=111');
  assert.equal(cuerpo.rankings.length, 6);
  assert.equal(cuerpo.rankings.every((r) => r.bancos.length === 1 && r.bancos[0].Codigo_Banco === '111'), true);
  const { cuerpo: construccion } = await pedir('/rankings?periodo=20260831&ranking=CONSTRUCCION');
  assert.equal(construccion.rankings.length, 1);
  assert.equal(construccion.rankings[0].bancos[0].Codigo_Banco, '111'); // líder de agosto según la referencia
});

test('GET /api/subactividades devuelve el desglose filtrado', async () => {
  const { cuerpo } = await pedir('/subactividades?periodo=20260930&ranking=CONSUMO');
  assert.equal(cuerpo.subactividades.length, 3 * 12);
  const { cuerpo: tarjeta } = await pedir('/subactividades?ranking=CONSUMO&subactividad=Tarjeta&banco=106');
  assert.equal(tarjeta.subactividades.length, 1);
  assert.equal(tarjeta.subactividades[0].Banco, 'Banco del Canal');
});

test('GET /api/calidad devuelve los 3 períodos con la cascada y las reconciliaciones', async () => {
  const { cuerpo } = await pedir('/calidad');
  assert.equal(cuerpo.periodos.length, 3);
  const julio = cuerpo.periodos[0];
  assert.deepEqual(
    [julio.Filas_Leidas, julio.E1_Duplicados, julio.E2_Destino_Extranjero, julio.E3_Saldo_No_Positivo, julio.E4_Actividad_No_Catalogada, julio.Universo_Local_Valido],
    [25000, 20, 886, 48, 42, 24004],
  );
  assert.equal(julio.Saldo_Total_Valido, 4342391663.85);
  assert.equal(julio.Reconciliaciones.R1.ok && julio.Reconciliaciones.R2.ok && julio.Reconciliaciones.R3.ok, true);
  const { cuerpo: uno } = await pedir('/calidad?periodo=20260831');
  assert.equal(uno.periodos.length, 1);
});

test('GET /api/excluidas lista las filas excluidas con su motivo', async () => {
  const { cuerpo } = await pedir('/excluidas?periodo=20260731&motivo=E1');
  assert.equal(cuerpo.total, 20);
  assert.equal(cuerpo.excluidas.every((e) => e.Motivo === 'E1' && e.Fila_Archivo >= 2), true);
});

test('errores con el formato común', async () => {
  const casos = [
    ['/rankings?periodo=2026-09', 400, 'PARAMETRO_INVALIDO'],
    ['/rankings?periodo=20261031', 404, 'PERIODO_SIN_DATOS'],
    ['/rankings?ranking=hipotecario', 400, 'PARAMETRO_INVALIDO'],
    ['/rankings?banco=999', 400, 'PARAMETRO_INVALIDO'],
    ['/subactividades?subactividad=Hipotecas', 400, 'PARAMETRO_INVALIDO'],
    ['/excluidas?motivo=E9', 400, 'PARAMETRO_INVALIDO'],
    ['/no-existe', 404, 'RUTA_NO_ENCONTRADA'],
  ];
  for (const [ruta, status, codigo] of casos) {
    const { status: obtenido, cuerpo } = await pedir(ruta);
    assert.equal(obtenido, status, ruta);
    assert.equal(cuerpo.error.codigo, codigo, ruta);
    assert.equal(typeof cuerpo.error.mensaje, 'string', ruta);
  }
});

test('sin períodos cargados responde PERIODO_SIN_DATOS', async () => {
  const vacio = crearApp({ almacen: crearAlmacen(paqueteReal().catalogos, []) }).listen(0);
  await once(vacio, 'listening');
  try {
    const respuesta = await fetch(`http://127.0.0.1:${vacio.address().port}/api/rankings`);
    assert.equal(respuesta.status, 404);
    assert.equal((await respuesta.json()).error.codigo, 'PERIODO_SIN_DATOS');
  } finally {
    vacio.close();
  }
});

// ---- Los ejemplos de /contracts tienen la misma forma que las respuestas reales ----

// Reduce un JSON a su forma: claves y tipos (el primer elemento representa a cada arreglo).
function forma(valor) {
  if (Array.isArray(valor)) return valor.length > 0 ? [forma(valor[0])] : [];
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((clave) => [clave, forma(valor[clave])]));
  }
  return valor === null ? 'null' : typeof valor;
}

const CONTRATOS = {
  'periodos.json': '/periodos',
  'catalogos.json': '/catalogos',
  'rankings.json': '/rankings',
  'subactividades.json': '/subactividades',
  'calidad.json': '/calidad',
  'excluidas.json': '/excluidas',
};

for (const [archivo, ruta] of Object.entries(CONTRATOS)) {
  test(`contracts/${archivo} coincide con la forma de GET /api${ruta}`, async () => {
    const ejemplo = JSON.parse(fs.readFileSync(new URL(`../../contracts/${archivo}`, import.meta.url), 'utf8'));
    const { cuerpo } = await pedir(ruta);
    assert.deepEqual(forma(ejemplo), forma(cuerpo));
  });
}
