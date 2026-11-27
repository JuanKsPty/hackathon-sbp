import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarPeriodo } from '../src/engine/index.js';
import { procesarCarpeta } from '../src/datos/paquete.js';
import { catalogosReales, filaSintetica, comoFilas, paqueteReal, CARPETA_DATOS } from './ayuda.js';

const CREDITO_PERSONAL = 'K.64.649.6492.64921';
const AUTOMOVIL = 'K.64.649.6492.64922';
const TARJETA = 'K.64.649.6499.64991';

function clasificar(listaDeDatos, opciones) {
  return procesarPeriodo(comoFilas(listaDeDatos), catalogosReales(), opciones);
}

test('regla SB21: Crédito personal con facilidad 07 pasa a Tarjeta', () => {
  const { operaciones, calidad } = clasificar([
    filaSintetica({ Numero_Prestamo: 'A', Tipo_Actividad: CREDITO_PERSONAL, Facilidad_Crediticia: '07' }),
    filaSintetica({ Numero_Prestamo: 'B', Tipo_Actividad: CREDITO_PERSONAL, Facilidad_Crediticia: '01' }),
    filaSintetica({ Numero_Prestamo: 'C', Tipo_Actividad: AUTOMOVIL, Facilidad_Crediticia: '03' }),
    filaSintetica({ Numero_Prestamo: 'D', Tipo_Actividad: TARJETA, Facilidad_Crediticia: '07' }),
    filaSintetica({ Numero_Prestamo: 'E', Tipo_Actividad: 'L.68.681.6810.00000', Facilidad_Crediticia: '07' }),
  ]);
  const sub = Object.fromEntries(operaciones.map((op) => [op.numeroPrestamo, `${op.macro}/${op.sub}`]));
  assert.deepEqual(sub, {
    A: 'CONSUMO/Tarjeta',
    B: 'CONSUMO/Credito personal',
    C: 'CONSUMO/Automovil',
    D: 'CONSUMO/Tarjeta',
    E: 'HIPOTECARIO/Vivienda propia', // la regla solo aplica al CINU de Crédito personal
  });
  assert.equal(calidad.reclasificadasTarjeta, 1);
  assert.equal(calidad.alertasIncoherenciaConsumo, 0);
});

test('Tarjeta sin 07 o Automóvil sin 03: alerta y se mantiene la subactividad del catálogo', () => {
  const { operaciones, calidad, alertas } = clasificar([
    filaSintetica({ Numero_Prestamo: 'A', Tipo_Actividad: TARJETA, Facilidad_Crediticia: '02' }),
    filaSintetica({ Numero_Prestamo: 'B', Tipo_Actividad: AUTOMOVIL, Facilidad_Crediticia: '07' }),
  ]);
  assert.deepEqual(operaciones.map((op) => op.sub), ['Tarjeta', 'Automovil']);
  assert.equal(calidad.universoValido, 2); // no se excluyen
  assert.equal(calidad.alertasIncoherenciaConsumo, 2);
  assert.deepEqual(alertas.filter((a) => a.tipo === 'INCOHERENCIA_CONSUMO').map((a) => a.fila), [2, 3]);
});

test('la clasificación no depende de datos del cliente (R3)', () => {
  const base = { Numero_Prestamo: 'A', Tipo_Actividad: CREDITO_PERSONAL, Facilidad_Crediticia: '01' };
  const normal = clasificar([filaSintetica(base)]).operaciones[0];
  const disfrazada = clasificar([
    filaSintetica({ ...base, Nombre_Cliente: 'TARJETA DE CREDITO HIPOTECARIA', ID_Cliente: 'CLI99999999', Tipo_Credito: '001' }),
  ]).operaciones[0];
  assert.equal(disfrazada.macro, normal.macro);
  assert.equal(disfrazada.sub, normal.sub);
});

test('sin la regla SB21, Crédito personal con 07 se queda en Credito personal', () => {
  const { operaciones, calidad } = clasificar(
    [filaSintetica({ Numero_Prestamo: 'A', Tipo_Actividad: CREDITO_PERSONAL, Facilidad_Crediticia: '07' })],
    { aplicarReglaConsumo: false },
  );
  assert.equal(operaciones[0].sub, 'Credito personal');
  assert.equal(calidad.reclasificadasTarjeta, 0);
});

// Cifras de control propias (NO son la clave oficial; solo para pruebas).
const RECLASIFICADAS_ESPERADAS = { 20260731: 295, 20260831: 325, 20260930: 362 };

test('datos reales: reclasificadas a Tarjeta y sin alertas de coherencia', () => {
  for (const p of paqueteReal().periodos) {
    assert.equal(p.calidad.reclasificadasTarjeta, RECLASIFICADAS_ESPERADAS[p.fecha], p.fecha);
    assert.equal(p.calidad.alertasIncoherenciaConsumo, 0, p.fecha);
  }
});

test('datos reales: el total de CONSUMO por banco es igual con y sin la regla SB21', () => {
  const sinRegla = procesarCarpeta(CARPETA_DATOS, { aplicarReglaConsumo: false });
  const consumoPorBanco = (periodo) => {
    const totales = {};
    for (const op of periodo.operaciones) {
      if (op.macro === 'CONSUMO') totales[op.codigoBanco] = (totales[op.codigoBanco] ?? 0) + op.saldo;
    }
    return totales;
  };
  paqueteReal().periodos.forEach((conRegla, i) => {
    assert.deepEqual(consumoPorBanco(conRegla), consumoPorBanco(sinRegla.periodos[i]), conRegla.fecha);
    // Lo único que cambia es el reparto entre Credito personal y Tarjeta.
    const tarjetaCon = conRegla.operaciones.filter((op) => op.sub === 'Tarjeta').length;
    const tarjetaSin = sinRegla.periodos[i].operaciones.filter((op) => op.sub === 'Tarjeta').length;
    assert.equal(tarjetaCon - tarjetaSin, conRegla.calidad.reclasificadasTarjeta);
  });
});
