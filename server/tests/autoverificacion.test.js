// Lista de autoverificación de la sección 12 de las indicaciones, sobre los 3 períodos reales.
// Cada prueba corresponde a una casilla de la lista, para mostrarla tal cual al jurado.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { leerAT03, procesarPeriodo } from '../src/engine/index.js';
import { procesarCarpeta } from '../src/datos/paquete.js';
import { paqueteReal, CARPETA_DATOS } from './ayuda.js';

const POSICIONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('Sección 12: lista de autoverificación', () => {
  test('los CSV se leyeron con 61 columnas y los códigos conservan los ceros (07, no 7)', () => {
    const { catalogos, periodos } = paqueteReal();
    assert.equal(catalogos.campos.length, 61);
    for (const p of periodos) {
      const facilidades = new Set(p.operaciones.map((op) => op.facilidad));
      assert.ok(facilidades.has('07'), p.fecha);
      assert.ok(!facilidades.has('7'), p.fecha);
    }
  });

  test('para cada período: filas leídas = E1 + E2 + E3 + E4 + universo local válido', () => {
    for (const { fecha, calidad: c } of paqueteReal().periodos) {
      const suma = c.e1Duplicados + c.e2DestinoExtranjero + c.e3SaldoNoPositivo + c.e4ActividadNoCatalogada + c.universoValido;
      assert.equal(c.filasLeidas, suma, fecha);
    }
  });

  test('ningún Numero_Prestamo se repite en el universo local válido de un período', () => {
    for (const p of paqueteReal().periodos) {
      const numeros = p.operaciones.map((op) => op.numeroPrestamo);
      assert.equal(new Set(numeros).size, numeros.length, p.fecha);
    }
  });

  test('cada ranking tiene 12 bancos y posiciones de 1 a 12 sin huecos', () => {
    for (const p of paqueteReal().periodos) {
      assert.equal(p.rankings.length, 6, p.fecha);
      for (const { ranking, filas } of p.rankings) {
        assert.deepEqual(filas.map((f) => f.posicion), POSICIONES, `${p.fecha} ${ranking}`);
        assert.equal(new Set(filas.map((f) => f.codigoBanco)).size, 12, `${p.fecha} ${ranking}`);
      }
    }
  });

  test('las reconciliaciones 1 y 2 cuadran al centavo para los 12 bancos (y la 3)', () => {
    for (const { fecha, reconciliaciones: r } of paqueteReal().periodos) {
      assert.equal(r.r1.ok, true, `${fecha} R1`);
      assert.equal(r.r2.ok, true, `${fecha} R2`);
      assert.equal(r.r3.ok, true, `${fecha} R3`);
    }
  });

  test('el total de CONSUMO por banco es igual con o sin la regla SB21', () => {
    const sinRegla = procesarCarpeta(CARPETA_DATOS, { aplicarReglaConsumo: false }).periodos;
    const consumo = (periodo) =>
      periodo.rankings.find((r) => r.ranking === 'CONSUMO').filas.map((f) => `${f.codigoBanco}:${f.saldoActividad}`).sort();
    paqueteReal().periodos.forEach((conRegla, i) => {
      assert.deepEqual(consumo(conRegla), consumo(sinRegla[i]), conRegla.fecha);
    });
  });

  test('el denominador Total_Cartera_Local_Valida es el mismo en los 6 rankings de un banco', () => {
    for (const p of paqueteReal().periodos) {
      const denominadores = new Map();
      for (const { filas } of p.rankings) {
        for (const f of filas) {
          denominadores.set(f.codigoBanco, (denominadores.get(f.codigoBanco) ?? new Set()).add(f.totalCartera));
        }
      }
      for (const [banco, valores] of denominadores) assert.equal(valores.size, 1, `${p.fecha} ${banco}`);
    }
  });

  test('al agregar un nuevo corte, el sistema lo procesa sin cambiar el código', () => {
    // Simula la carga de septiembre después de julio y agosto: el mismo código lee el archivo
    // nuevo, toma el período del campo Fecha y produce lo mismo que el procesamiento completo.
    const { catalogos, periodos } = paqueteReal();
    const texto = fs.readFileSync(path.join(CARPETA_DATOS, 'AT03_sintetico_202609.csv'), 'utf8');
    const [nuevo] = leerAT03(texto, catalogos, 'AT03_sintetico_202609.csv');
    const resultado = procesarPeriodo(nuevo.filas, catalogos);
    const esperado = periodos.find((p) => p.fecha === resultado.fecha);
    assert.equal(resultado.fecha, '20260930');
    assert.deepEqual(resultado.calidad, esperado.calidad);
    assert.deepEqual(resultado.rankings, esperado.rankings);
  });
});
