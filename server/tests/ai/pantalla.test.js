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
