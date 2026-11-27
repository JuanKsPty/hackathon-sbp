// Comparación entre períodos y GET /api/movimientos (issue #32, contrato contracts/movimientos.json).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { variacionPctE4 } from '../src/automation/movimientos.js';
import { leerReglaMovimientos, validarRegla } from '../src/automation/reglaMovimientos.js';
import { paqueteReal } from './ayuda.js';

const REGLA = { min_cambio_posicion_abs: 2, cambio_lider: true, min_var_saldo_pct_abs: 10 };

let servidor;
let base;
let almacen;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  almacen = crearAlmacen(catalogos, periodos);
  const obtenerMovimientos = crearObtenerMovimientos(almacen, { obtenerRegla: () => REGLA });
  servidor = crearApp({ almacen, obtenerMovimientos }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

// Comparar períodos es de Analista y Administrador (sección 10).
const COMO_ANALISTA = { 'X-Perfil': 'analista' };

async function pedir(ruta) {
  const respuesta = await fetch(base + ruta, { headers: COMO_ANALISTA });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const centavos = (monto) => Math.round(monto * 100);

test('variacionPctE4: 4 decimales con redondeo aritmético y null sin base', () => {
  assert.equal(variacionPctE4(15_000_000, 125_000_000), 120_000); // +12.0000 %
  assert.equal(variacionPctE4(-3_000_000, 138_000_000), -21_739); // -2.1739 %
  assert.equal(variacionPctE4(1, 3), 333_333); // 33.3333 %
  assert.equal(variacionPctE4(2, 3), 666_667); // 66.6667 %
  assert.equal(variacionPctE4(1, 2_000_000), 1); // 0.00005 % → 0.0001 (half-up)
  assert.equal(variacionPctE4(-1, 2_000_000), -1); // simétrico para bajadas
  assert.equal(variacionPctE4(0, 500), 0);
  assert.equal(variacionPctE4(500, 0), null);
});

test('por defecto compara el último período con el anterior consecutivo', async () => {
  const { status, cuerpo } = await pedir('/movimientos');
  assert.equal(status, 200);
  assert.equal(cuerpo.periodo_anterior, '20260831');
  assert.equal(cuerpo.periodo_actual, '20260930');
  assert.deepEqual(cuerpo.regla_significativo, REGLA);
  assert.match(cuerpo.aviso, /Datos ficticios/);
  assert.equal(cuerpo.rankings.length, 6);
  for (const r of cuerpo.rankings) assert.equal(r.movimientos.length, 12, r.Ranking);
});

test('cada movimiento cuadra con los rankings del motor de ambos períodos', async () => {
  for (const [desde, hasta] of [['20260731', '20260831'], ['20260831', '20260930'], ['20260731', '20260930']]) {
    const { cuerpo } = await pedir(`/movimientos?desde=${desde}&hasta=${hasta}`);
    const antes = (await pedir(`/rankings?periodo=${desde}`)).cuerpo.rankings;
    const ahora = (await pedir(`/rankings?periodo=${hasta}`)).cuerpo.rankings;
    for (const r of cuerpo.rankings) {
      const filaDe = (lista, codigo) =>
        lista.find((x) => x.Ranking === r.Ranking).bancos.find((b) => b.Codigo_Banco === codigo);
      for (const m of r.movimientos) {
        const a = filaDe(antes, m.Codigo_Banco);
        const b = filaDe(ahora, m.Codigo_Banco);
        assert.equal(m.Posicion_anterior, a.Posicion);
        assert.equal(m.Posicion_actual, b.Posicion);
        assert.equal(m.Cambio_Posicion, a.Posicion - b.Posicion); // positivo = sube
        assert.equal(m.Saldo_anterior, a.Saldo_Actividad);
        assert.equal(m.Saldo_actual, b.Saldo_Actividad);
        assert.equal(centavos(m.Var_Saldo), centavos(b.Saldo_Actividad) - centavos(a.Saldo_Actividad));
        if (a.Saldo_Actividad === 0) {
          assert.equal(m.Var_Saldo_Pct, null);
        } else {
          assert.ok(Math.abs(m.Var_Saldo_Pct - (m.Var_Saldo / m.Saldo_anterior) * 100) <= 0.00005 + 1e-9);
        }
      }
      // El líder es quien está en la posición 1 de cada período.
      assert.equal(r.Lider_anterior.Codigo_Banco, antes.find((x) => x.Ranking === r.Ranking).bancos[0].Codigo_Banco);
      assert.equal(r.Lider_actual.Codigo_Banco, ahora.find((x) => x.Ranking === r.Ranking).bancos[0].Codigo_Banco);
      assert.equal(r.Cambio_Lider, r.Lider_anterior.Codigo_Banco !== r.Lider_actual.Codigo_Banco);
    }
  }
});

test('la regla de movimiento significativo se aplica tal como viene de los parámetros', async () => {
  const { cuerpo } = await pedir('/movimientos?desde=20260731&hasta=20260930');
  for (const r of cuerpo.rankings) {
    for (const m of r.movimientos) {
      const esperados = [];
      if (Math.abs(m.Cambio_Posicion) >= 2) esperados.push('cambio_posicion');
      if (r.Cambio_Lider && [r.Lider_anterior.Codigo_Banco, r.Lider_actual.Codigo_Banco].includes(m.Codigo_Banco)) {
        esperados.push('cambio_lider');
      }
      if (m.Var_Saldo_Pct !== null && Math.abs(m.Var_Saldo_Pct) >= 10) esperados.push('var_saldo_pct');
      assert.deepEqual(m.Motivos, esperados, `${r.Ranking} ${m.Codigo_Banco}`);
      assert.equal(m.Significativo, esperados.length > 0);
    }
  }
});

test('cambiar la regla cambia el resultado sin tocar código', () => {
  const estricta = crearObtenerMovimientos(almacen, {
    obtenerRegla: () => ({ min_cambio_posicion_abs: null, cambio_lider: false, min_var_saldo_pct_abs: null }),
  });
  const nada = estricta({ solo_significativos: 'true' });
  assert.ok(nada.rankings.every((r) => r.movimientos.length === 0));

  const amplia = crearObtenerMovimientos(almacen, {
    obtenerRegla: () => ({ min_cambio_posicion_abs: 1, cambio_lider: false, min_var_saldo_pct_abs: null }),
  });
  for (const r of amplia({}).rankings) {
    for (const m of r.movimientos) assert.equal(m.Significativo, m.Cambio_Posicion !== 0);
  }
});

test('filtros: ranking y solo_significativos', async () => {
  const { cuerpo } = await pedir('/movimientos?ranking=HIPOTECARIO&solo_significativos=true');
  assert.deepEqual(cuerpo.rankings.map((r) => r.Ranking), ['HIPOTECARIO']);
  assert.ok(cuerpo.rankings[0].movimientos.every((m) => m.Significativo));
});

test('errores con el formato común', async () => {
  const casos = [
    ['/movimientos?desde=20260930&hasta=20260831', 422, 'PERIODOS_INVALIDOS'],
    ['/movimientos?desde=20260831&hasta=20260831', 422, 'PERIODOS_INVALIDOS'],
    ['/movimientos?hasta=20261031', 404, 'PERIODO_SIN_DATOS'],
    ['/movimientos?hasta=20260731', 404, 'PERIODO_SIN_DATOS'], // no hay período anterior a julio
    ['/movimientos?desde=2026-08', 400, 'PARAMETRO_INVALIDO'],
    ['/movimientos?ranking=VIVIENDA', 400, 'PARAMETRO_INVALIDO'],
    ['/movimientos?solo_significativos=si', 400, 'PARAMETRO_INVALIDO'],
  ];
  for (const [ruta, status, codigo] of casos) {
    const r = await pedir(ruta);
    assert.equal(r.status, status, ruta);
    assert.equal(r.cuerpo.error.codigo, codigo, ruta);
  }
});

test('el entregable 5 (movimientos.csv) sale de los datos reales', async () => {
  const respuesta = await fetch(`${base}/exportar/movimientos.csv`, { headers: COMO_ANALISTA });
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-disposition'), /movimientos_20260831_20260930\.csv/);
  const lineas = (await respuesta.text()).trim().split('\n');
  assert.equal(lineas.length, 1 + 6 * 12);
});

test('la regla por defecto se lee del archivo de parámetros y se valida', () => {
  assert.deepEqual(leerReglaMovimientos(), REGLA);
  assert.throws(() => validarRegla({ min_cambio_posicion_abs: -1, cambio_lider: true, min_var_saldo_pct_abs: 10 }));
  assert.throws(() => validarRegla({ min_cambio_posicion_abs: 2, cambio_lider: 'si', min_var_saldo_pct_abs: 10 }));
});
