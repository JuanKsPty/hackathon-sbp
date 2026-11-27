// Catálogo del agente guía (#72).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ELEMENTOS_GUIA, elementosPara, validarPasos } from '../../src/ai/guia.js';

test('el catálogo coincide con contracts/guia.md', () => {
  const md = readFileSync(new URL('../../../contracts/guia.md', import.meta.url), 'utf8');
  const enDocumento = [...md.matchAll(/^\| `([a-z]+\.[a-z0-9-]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual(ELEMENTOS_GUIA.map((e) => e.guia).sort(), [...new Set(enDocumento)].sort());
  assert.equal(enDocumento.length, new Set(enDocumento).size, 'hay identificadores repetidos en el documento');
});

test('cada perfil ve solo sus elementos', () => {
  const publico = elementosPara('publico').map((e) => e.guia);
  const analista = elementosPara('analista').map((e) => e.guia);
  const admin = elementosPara('admin').map((e) => e.guia);
  assert.ok(!publico.includes('comparar.tabla-movimientos'));
  assert.ok(!publico.includes('admin.subir-archivo'));
  assert.ok(analista.includes('comparar.tabla-movimientos'));
  assert.ok(!analista.includes('admin.subir-archivo'));
  assert.equal(admin.length, ELEMENTOS_GUIA.length);
  assert.ok(publico.length < analista.length && analista.length < admin.length);
});

test('validarPasos agrega la ruta del catálogo y rechaza lo que no corresponde', () => {
  const ok = validarPasos([
    { guia: 'global.menu-rankings', texto: 'Entra a Rankings.' },
    { guia: 'rankings.selector-ranking', texto: 'Elige COMERCIO.', ruta: '/otra' },
  ]);
  assert.deepEqual(ok, {
    ok: true,
    pasos: [
      { ruta: null, guia: 'global.menu-rankings', texto: 'Entra a Rankings.' },
      { ruta: '/rankings', guia: 'rankings.selector-ranking', texto: 'Elige COMERCIO.' },
    ],
  });

  const mal = validarPasos([
    { guia: 'rankings.boton-magico', texto: 'x' },
    { guia: 'admin.subir-archivo', texto: 'Sube el archivo.' },
    { guia: 'rankings.tabla', texto: ' ' },
  ], 'publico');
  assert.equal(mal.ok, false);
  assert.equal(mal.errores.length, 3);
  assert.match(mal.errores[0], /no existe/);
  assert.match(mal.errores[1], /no está disponible para el perfil publico/);
  assert.match(mal.errores[2], /falta el texto/);

  assert.equal(validarPasos([]).ok, false);
});
