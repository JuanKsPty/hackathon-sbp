import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconciliar } from '../src/engine/reconciliaciones.js';
import { paqueteReal } from './ayuda.js';

for (const fecha of ['20260731', '20260831', '20260930']) {
  test(`reconciliaciones al centavo en ${fecha}`, () => {
    const periodo = paqueteReal().periodos.find((p) => p.fecha === fecha);
    const { r1, r2, r3, unicidad } = periodo.reconciliaciones;
    assert.equal(r1.ok, true, JSON.stringify(r1.diferencias.slice(0, 3)));
    assert.equal(r2.ok, true, JSON.stringify(r2.diferencias.slice(0, 3)));
    assert.equal(r3.ok, true, `${r3.sumaTotales} vs ${r3.sumaUniverso}`);
    assert.equal(unicidad.ok, true);
    assert.equal(r3.sumaUniverso, periodo.calidad.saldoTotalValido);
  });

  test(`reconciliaciones recalculadas desde las operaciones en ${fecha}`, () => {
    // Recalcula en la prueba, sin usar el agregador del motor, y compara con lo publicado.
    const periodo = paqueteReal().periodos.find((p) => p.fecha === fecha);
    const porActividad = new Map();
    const porBanco = new Map();
    for (const op of periodo.operaciones) {
      const clave = `${op.macro}|${op.codigoBanco}`;
      porActividad.set(clave, (porActividad.get(clave) ?? 0) + op.saldo);
      porBanco.set(op.codigoBanco, (porBanco.get(op.codigoBanco) ?? 0) + op.saldo);
    }
    for (const { ranking, filas } of periodo.rankings) {
      for (const f of filas) {
        assert.equal(f.saldoActividad, porActividad.get(`${ranking}|${f.codigoBanco}`) ?? 0, `${ranking} ${f.codigoBanco}`);
        assert.equal(f.totalCartera, porBanco.get(f.codigoBanco) ?? 0, f.codigoBanco);
      }
    }
    // R1 directo: suma de subactividades del desglose = saldo de la actividad.
    for (const { ranking, filas } of periodo.rankings) {
      for (const f of filas) {
        const sumaSubs = periodo.desglose
          .filter((d) => d.ranking === ranking && d.codigoBanco === f.codigoBanco)
          .reduce((s, d) => s + d.saldo, 0);
        assert.equal(sumaSubs, f.saldoActividad, `${ranking} ${f.codigoBanco}`);
      }
    }
  });
}

test('las reconciliaciones detectan un descuadre', () => {
  const periodo = paqueteReal().periodos[0];
  const rankingsAlterados = periodo.rankings.map((r, i) =>
    i === 0 ? { ...r, filas: r.filas.map((f, j) => (j === 0 ? { ...f, saldoActividad: f.saldoActividad + 1 } : f)) } : r,
  );
  const resultado = reconciliar({ operaciones: periodo.operaciones, rankings: rankingsAlterados, desglose: periodo.desglose });
  assert.equal(resultado.r1.ok, false);
  assert.equal(resultado.r2.ok, false);
  assert.equal(resultado.r1.diferencias.length, 1);

  const duplicada = [...periodo.operaciones, periodo.operaciones[0]];
  assert.equal(reconciliar({ operaciones: duplicada, rankings: periodo.rankings, desglose: periodo.desglose }).unicidad.ok, false);
});
