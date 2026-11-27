// Acciones de pantalla por reglas (#121).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modoDe, columnaDe, ordenDe, bancoArriba, pantallaPorReglas, demostracionPorReglas } from '../../src/ai/pantallaReglas.js';
import { crearAlmacen } from '../../src/datos/almacen.js';
import { paqueteReal } from '../ayuda.js';

test('modoDe: cómo o dónde demuestra; lo demás ejecuta', () => {
  assert.equal(modoDe('¿Cómo veo el banco con más operaciones?'), 'demostrar');
  assert.equal(modoDe('¿Dónde está la tabla de calidad?'), 'demostrar');
  assert.equal(modoDe('¿Cuál es el banco con más operaciones?'), 'ejecutar');
  assert.equal(modoDe('Banco con más saldo en COMERCIO'), 'ejecutar');
});

test('columnaDe reconoce la columna de la pregunta', () => {
  assert.equal(columnaDe('¿Cuál es el banco con más operaciones?'), 'Operaciones_Validas');
  assert.equal(columnaDe('el de mayor ponderación'), 'Ponderacion_Pct');
  assert.equal(columnaDe('mayor cartera total'), 'Total_Cartera_Local_Valida');
  assert.equal(columnaDe('el que tiene más saldo'), 'Saldo_Actividad');
  assert.equal(columnaDe('¿quién lidera?'), 'Posicion');
  assert.equal(columnaDe('hola'), null);
});

test('ordenDe deja arriba lo que se pregunta', () => {
  assert.equal(ordenDe('más operaciones', 'Operaciones_Validas'), 'desc');
  assert.equal(ordenDe('menos operaciones', 'Operaciones_Validas'), 'asc');
  assert.equal(ordenDe('el mejor', 'Posicion'), 'asc');
  assert.equal(ordenDe('el último', 'Posicion'), 'desc');
});

test('bancoArriba ordena las filas del motor como la tabla', () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const filas = almacen.obtener('20260930').rankings.find((r) => r.ranking === 'COMERCIO').filas;
  const maxOperaciones = Math.max(...filas.map((f) => f.operacionesValidas));
  const conMas = bancoArriba(almacen, '20260930', 'COMERCIO', 'Operaciones_Validas', 'desc');
  assert.equal(filas.find((f) => f.codigoBanco === conMas).operacionesValidas, maxOperaciones);
  // El mejor por posición es el líder.
  assert.equal(bancoArriba(almacen, '20260930', 'COMERCIO', 'Posicion', 'asc'), filas.find((f) => f.posicion === 1).codigoBanco);
  // El de menos saldo es el último del ranking (ordenado por saldo).
  assert.equal(bancoArriba(almacen, '20260930', 'COMERCIO', 'Saldo_Actividad', 'asc'), filas.find((f) => f.posicion === filas.length).codigoBanco);
  assert.equal(bancoArriba(almacen, '20261031', 'COMERCIO', 'Posicion', 'asc'), null);
});

test('pantallaPorReglas arma y valida la pantalla de una pregunta típica', () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const p = pantallaPorReglas('¿Cuál es el banco con más operaciones en comercio en agosto?', almacen);
  assert.equal(p.modo, 'ejecutar');
  assert.deepEqual(p.acciones.map((a) => a.tipo), ['ir', 'elegir', 'elegir', 'ordenar', 'resaltar']);
  assert.equal(p.acciones[1].valor, '20260831');
  assert.equal(p.acciones[2].valor, 'COMERCIO');
  assert.deepEqual([p.acciones[3].columna, p.acciones[3].orden], ['Operaciones_Validas', 'desc']);
  assert.equal(p.acciones[4].fila, bancoArriba(almacen, '20260831', 'COMERCIO', 'Operaciones_Validas', 'desc'));

  const demo = pantallaPorReglas('¿Cómo veo el banco con más operaciones?', almacen);
  assert.equal(demo.modo, 'demostrar');
  assert.ok(demo.acciones.every((a) => a.texto));
  assert.equal(demo.acciones[1].valor, '20260930'); // sin mes: el último período

  // Un banco nombrado se resalta con su posición.
  const capital = pantallaPorReglas('¿En qué puesto está Banco Capital en consumo?', almacen);
  assert.equal(capital.acciones.at(-1).fila, '108');

  assert.equal(pantallaPorReglas('Hola, ¿qué tal?', almacen), null);
});

test('quién lidera: ordena por posición (el front se salta el paso si ya está así)', () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const p = pantallaPorReglas('¿Quién lidera COMERCIO?', almacen);
  assert.deepEqual(p.acciones.map((a) => a.tipo), ['ir', 'elegir', 'elegir', 'ordenar', 'resaltar']);
  assert.deepEqual([p.acciones[3].columna, p.acciones[3].orden], ['Posicion', 'asc']);
});

test('un banco sin ranking: no cambia de ranking (se queda en el abierto)', () => {
  const { catalogos, periodos } = paqueteReal();
  const p = pantallaPorReglas('muestra el banco 108', crearAlmacen(catalogos, periodos));
  assert.ok(!p.acciones.some((a) => a.control === 'rankings.selector-ranking'));
  assert.equal(p.acciones.at(-1).fila, '108');
})

test('"muéstrame cómo…", "enséñame…" y "paso a paso" son demostraciones', () => {
  for (const q of ['muéstrame cómo descargar el ranking', 'enséñame a comparar períodos', 'guíame paso a paso para ver la calidad']) {
    assert.equal(modoDe(q), 'demostrar', q);
  }
  assert.equal(modoDe('muestra el banco 108'), 'ejecutar');
});

test('"¿cómo hago X?" en la app: entra a la página y señala el elemento', () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const casos = [
    ['muéstrame cómo descargar el ranking en CSV', 'rankings.descargar', '/rankings', 'publico'],
    // Calidad de datos solo existe en el sitio interno: la demostración es para Analista.
    ['¿cómo veo las filas excluidas?', 'calidad.excluidas', '/calidad', 'analista'],
    ['muéstrame cómo hacer un reporte', 'reportes.descarga-rankings', '/reportes', 'publico'],
    ['¿cómo filtro por banco?', 'rankings.filtro-banco', '/rankings', 'publico'],
  ];
  for (const [q, control, ruta, perfil] of casos) {
    const p = demostracionPorReglas(q, almacen, perfil);
    assert.equal(p.modo, 'demostrar', q);
    assert.deepEqual(p.acciones.map((a) => a.tipo), ['ir', 'señalar'], q);
    assert.equal(p.acciones[1].control, control, q);
    assert.equal(p.acciones[0].ruta, ruta, q);
  }
  // Comparar períodos no es del perfil Público.
  assert.equal(demostracionPorReglas('muéstrame cómo comparar períodos', almacen, 'publico')?.acciones.at(-1).control === 'comparar.selector-desde', false);
  // Calidad de datos no existe en el sitio público: a Público no se le lleva a /calidad.
  assert.notEqual(demostracionPorReglas('¿cómo veo las filas excluidas?', almacen, 'publico')?.acciones?.[0]?.ruta, '/calidad');
  assert.equal(demostracionPorReglas('dame el top 5', almacen), null);
  // "¿Cómo cargo un nuevo período?": el Administrador va a subir el archivo; los demás no reciben otra demostración.
  const carga = demostracionPorReglas('¿Cómo cargo un nuevo período?', almacen, 'admin');
  assert.deepEqual(carga.acciones.map((a) => [a.tipo, a.tipo === 'ir' ? a.ruta : a.control]), [['ir', '/admin'], ['señalar', 'admin.subir-archivo']]);
  assert.equal(demostracionPorReglas('¿Cómo cargo un nuevo período?', almacen, 'analista'), null);
  assert.equal(demostracionPorReglas('¿Cómo cargo un nuevo período?', almacen, 'publico'), null);
});
