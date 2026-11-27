// Acciones de pantalla del agente (#121).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTROLES, COLUMNAS_RANKING } from '../../src/ai/pantalla.js';
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
