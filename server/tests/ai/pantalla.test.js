// Acciones de pantalla del agente (#121).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTROLES, COLUMNAS_RANKING, contextoPantalla, errorDeValor, validarAccion } from '../../src/ai/pantalla.js';
import { crearAlmacen } from '../../src/datos/almacen.js';
import { paqueteReal } from '../ayuda.js';
import { elementoGuia } from '../../src/ai/guia.js';

test('cada control del catálogo existe en la guía (data-guia) y admite al menos una acción', () => {
  for (const [id, acciones] of Object.entries(CONTROLES)) {
    assert.ok(elementoGuia(id), `${id} no está en contracts/guia.md`);
    assert.ok(Object.keys(acciones).length > 0, id);
  }
});

test('las columnas ordenables de la tabla de rankings son las del contrato /api/rankings', () => {
  assert.deepEqual(COLUMNAS_RANKING, [
    'Posicion', 'Banco', 'Saldo_Actividad', 'Total_Cartera_Local_Valida', 'Ponderacion_Pct', 'Operaciones_Validas',
  ]);
});


const contexto = () => {
  const { catalogos, periodos } = paqueteReal();
  return contextoPantalla(crearAlmacen(catalogos, periodos));
};

test('contextoPantalla toma períodos, rankings, bancos y subactividades del almacén', () => {
  const c = contexto();
  assert.deepEqual(c.fechas, ['20260731', '20260831', '20260930']);
  assert.equal(c.rankings.length, 6);
  assert.equal(c.bancos.size, 12);
  assert.equal(c.subactividades.length, 22);
});

test('errorDeValor acepta valores del catálogo y rechaza inventados', () => {
  const c = contexto();
  assert.equal(errorDeValor('periodo', '20260831', c), null);
  assert.match(errorDeValor('periodo', '20261031', c), /no está cargado/);
  assert.equal(errorDeValor('ranking', 'COMERCIO', c), null);
  assert.match(errorDeValor('ranking', 'VIVIENDA', c), /no existe/);
  assert.equal(errorDeValor('banco', '104', c), null);
  assert.equal(errorDeValor('banco', 'todos', c), null);
  assert.match(errorDeValor('banco', 'Banco Pacifico', c), /código de 3 dígitos/);
  assert.equal(errorDeValor('subactividad', 'Tarjeta', c), null);
  assert.equal(errorDeValor('subactividad', 'todas', c), null);
  assert.match(errorDeValor('subactividad', 'Hipotecas', c), /no existe/);
  assert.match(errorDeValor('periodo', '', c), /falta el valor/);
});

test('ir: solo a páginas que existen y que el perfil puede ver', () => {
  const c = contexto();
  assert.deepEqual(validarAccion({ tipo: 'ir', ruta: '/rankings', texto: 'Vamos a Rankings.' }, { contexto: c }), {
    ok: true, accion: { tipo: 'ir', ruta: '/rankings', texto: 'Vamos a Rankings.' },
  });
  assert.match(validarAccion({ tipo: 'ir', ruta: '/comparar' }, { contexto: c, perfil: 'publico' }).error, /perfil publico/);
  assert.equal(validarAccion({ tipo: 'ir', ruta: '/comparar' }, { contexto: c, perfil: 'analista' }).ok, true);
  assert.equal(validarAccion({ tipo: 'ir', ruta: '/admin' }, { contexto: c, perfil: 'analista' }).ok, false);
  assert.equal(validarAccion({ tipo: 'ir', ruta: 'https://evil.example' }, { contexto: c, perfil: 'admin' }).ok, false);
  assert.match(validarAccion({ tipo: 'volar' }, { contexto: c }).error, /desconocido/);
});

test('elegir: control existente, visible para el perfil y con un valor del catálogo', () => {
  const c = contexto();
  assert.deepEqual(validarAccion({ tipo: 'elegir', control: 'rankings.selector-ranking', valor: 'COMERCIO', texto: 'Elige COMERCIO.' }, { contexto: c }), {
    ok: true, accion: { tipo: 'elegir', control: 'rankings.selector-ranking', ruta: '/rankings', valor: 'COMERCIO', texto: 'Elige COMERCIO.' },
  });
  assert.equal(validarAccion({ tipo: 'elegir', control: 'global.selector-periodo', valor: '20260831' }, { contexto: c }).accion.ruta, null);
  assert.match(validarAccion({ tipo: 'elegir', control: 'rankings.selector-ranking', valor: 'VIVIENDA' }, { contexto: c }).error, /no existe/);
  assert.match(validarAccion({ tipo: 'elegir', control: 'rankings.boton-magico', valor: 'x' }, { contexto: c }).error, /no existe o no se puede manejar/);
  assert.match(validarAccion({ tipo: 'elegir', control: 'rankings.tabla', valor: 'x' }, { contexto: c }).error, /no admite "elegir"/);
});

test('ordenar: columna del control y orden asc/desc (desc por defecto)', () => {
  const c = contexto();
  assert.deepEqual(validarAccion({ tipo: 'ordenar', control: 'rankings.tabla', columna: 'Operaciones_Validas' }, { contexto: c }), {
    ok: true, accion: { tipo: 'ordenar', control: 'rankings.tabla', ruta: '/rankings', columna: 'Operaciones_Validas', orden: 'desc', texto: '' },
  });
  assert.equal(validarAccion({ tipo: 'ordenar', control: 'rankings.tabla', columna: 'Posicion', orden: 'asc' }, { contexto: c }).accion.orden, 'asc');
  assert.match(validarAccion({ tipo: 'ordenar', control: 'rankings.tabla', columna: 'Tasa' }, { contexto: c }).error, /no se puede ordenar/);
  assert.match(validarAccion({ tipo: 'ordenar', control: 'rankings.tabla', columna: 'Banco', orden: 'random' }, { contexto: c }).error, /asc.*desc/);
  assert.match(validarAccion({ tipo: 'ordenar', control: 'rankings.selector-ranking', columna: 'Banco' }, { contexto: c }).error, /no admite "ordenar"/);
});

test('resaltar: fila de un banco del catálogo', () => {
  const c = contexto();
  assert.deepEqual(validarAccion({ tipo: 'resaltar', control: 'rankings.tabla', fila: '104', texto: 'Este es Banco Pacifico.' }, { contexto: c }), {
    ok: true, accion: { tipo: 'resaltar', control: 'rankings.tabla', ruta: '/rankings', fila: '104', texto: 'Este es Banco Pacifico.' },
  });
  assert.match(validarAccion({ tipo: 'resaltar', control: 'rankings.tabla', fila: '999' }, { contexto: c }).error, /no existe/);
  assert.match(validarAccion({ tipo: 'resaltar', control: 'rankings.tabla', fila: 'todos' }, { contexto: c }).error, /no "todos"/);
  assert.match(validarAccion({ tipo: 'resaltar', control: 'rankings.filtro-banco', fila: '104' }, { contexto: c }).error, /no admite "resaltar"/);
});

test('señalar: cualquier elemento de la guía visible para el perfil', () => {
  const c = contexto();
  assert.deepEqual(validarAccion({ tipo: 'señalar', control: 'rankings.grafico', texto: 'Aquí ves los saldos.' }, { contexto: c }), {
    ok: true, accion: { tipo: 'señalar', control: 'rankings.grafico', ruta: '/rankings', texto: 'Aquí ves los saldos.' },
  });
  assert.equal(validarAccion({ tipo: 'señalar', control: 'global.selector-perfil' }, { contexto: c }).accion.ruta, null);
  assert.match(validarAccion({ tipo: 'señalar', control: 'admin.bitacora' }, { contexto: c, perfil: 'publico' }).error, /perfil publico/);
  assert.match(validarAccion({ tipo: 'ordenar', control: 'rankings.grafico', columna: 'Banco' }, { contexto: c }).error, /no admite "ordenar"/);
});
