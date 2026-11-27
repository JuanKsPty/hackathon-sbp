// Informe PDF del período (automation/informePdf.js y GET /api/exportar/informe.pdf).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { once } from 'node:events';
import { procesarPeriodo } from '../src/engine/index.js';
import { REGLA_CONSUMO } from '../src/engine/clasificacion.js';
import { informePdf, fechaCorta } from '../src/automation/informePdf.js';
import { FUENTE, AVISO } from '../src/routes/formato.js';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { paqueteReal, catalogosReales, filaSintetica, comoFilas } from './ayuda.js';

// Texto visible de cada stream del PDF. pdfkit escribe el texto de las fuentes estándar como
// trozos <hex> en WinAnsi (windows-1252); si el stream va comprimido (FlateDecode), se descomprime.
function textosDelPdf(pdf) {
  const crudo = pdf.toString('latin1');
  return [...crudo.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(([, contenido]) => {
    let operaciones = contenido;
    try {
      operaciones = zlib.inflateSync(Buffer.from(contenido, 'latin1')).toString('latin1');
    } catch {
      // stream sin comprimir
    }
    const hex = (operaciones.match(/<[0-9a-fA-F]+>/g) ?? []).map((trozo) => trozo.slice(1, -1)).join('');
    return new TextDecoder('windows-1252').decode(Buffer.from(hex, 'hex'));
  });
}

const paginasDe = (pdf) => (pdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []).length;

const septiembre = () => paqueteReal().periodos.find((p) => p.fecha === '20260930');

// ---- Generador ----

test('el PDF sin comprimir trae el aviso, la fuente y el período en cada página', async () => {
  const pdf = await informePdf({ periodo: septiembre(), catalogos: catalogosReales(), comprimir: false });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  const paginas = paginasDe(pdf);
  assert.equal(paginas, 2);
  const textos = textosDelPdf(pdf);
  for (const esperado of [AVISO, FUENTE, `Período: ${fechaCorta('20260930')}`]) {
    assert.equal(textos.filter((t) => t.includes(esperado)).length, paginas, esperado);
  }
  const todo = textos.join('\n');
  assert.ok(todo.includes('Rankings de crédito · Informe del período'));
  assert.ok(todo.includes('30 sep 2026'));
  assert.ok(todo.includes(septiembre().nombreArchivo));
  assert.ok(!todo.includes('Evolución por corte'), 'sin evolucion no hay comparación de períodos');
});

test('acentos, ñ, · y – salen bien con las fuentes estándar (Helvetica, WinAnsi)', async () => {
  // Un banco del catálogo con nombre raro: su nombre sale en los gráficos y en las tablas.
  const catalogos = catalogosReales();
  const nombre = 'Banco Peñón – Año Único · crédito';
  const bancos = new Map([...catalogos.bancos].map(([codigo, banco]) => [codigo, codigo === '101' ? nombre : banco]));
  const conNombre = { ...catalogos, bancos };
  const periodo = procesarPeriodo(
    comoFilas([filaSintetica({ Numero_Prestamo: 'A', Codigo_Banco: '101', Tipo_Actividad: REGLA_CONSUMO.cinuTarjeta, Facilidad_Crediticia: '07', Saldo: '100.00' })]),
    conNombre,
  );
  const pdf = await informePdf({ periodo, catalogos: conNombre, comprimir: false });
  const todo = textosDelPdf(pdf).join('\n');
  assert.ok(todo.includes(nombre), 'el nombre con ñ, – y · no se ve igual');
  assert.ok(todo.includes(AVISO));
  // Ninguna fuente embebida ni descargada: solo las estándar del PDF.
  const crudo = pdf.toString('latin1');
  assert.ok(crudo.includes('/BaseFont /Helvetica'));
  assert.ok(!/FontFile/.test(crudo));
});

test('con evolucion (Analista y Admin) agrega la sección "Evolución por corte"', async () => {
  const { periodos } = paqueteReal();
  const pdf = await informePdf({ periodo: septiembre(), catalogos: catalogosReales(), evolucion: periodos, comprimir: false });
  const todo = textosDelPdf(pdf).join('\n');
  assert.ok(todo.includes('Evolución por corte'));
  for (const p of periodos) assert.ok(todo.includes(fechaCorta(p.fecha)), p.fecha);
  assert.equal(paginasDe(pdf), 2);
});

// ---- API ----

let servidor;
let base;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos) }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

async function descargar(ruta, headers = {}) {
  const respuesta = await fetch(base + ruta, { headers });
  return { respuesta, bytes: Buffer.from(await respuesta.arrayBuffer()) };
}

test('GET /api/exportar/informe.pdf: PDF real con content-type y nombre de archivo', async () => {
  const { respuesta, bytes } = await descargar('/exportar/informe.pdf?periodo=20260930', { 'X-Sitio': 'publico' });
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get('content-type'), 'application/pdf');
  assert.equal(respuesta.headers.get('content-disposition'), 'attachment; filename="informe_20260930.pdf"');
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
  // Comprimido también se lee: el aviso va en las 2 páginas.
  assert.equal(textosDelPdf(bytes).filter((t) => t.includes(AVISO)).length, 2);
});

test('responde a Público y Analista; solo el Analista ve la evolución por corte', async () => {
  const publico = await descargar('/exportar/informe.pdf', { 'X-Perfil': 'publico' });
  const analista = await descargar('/exportar/informe.pdf', { 'X-Perfil': 'analista' });
  for (const { respuesta, bytes } of [publico, analista]) {
    assert.equal(respuesta.status, 200);
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
    assert.equal(respuesta.headers.get('content-disposition'), `attachment; filename="informe_${paqueteReal().periodos.at(-1).fecha}.pdf"`);
  }
  assert.ok(!textosDelPdf(publico.bytes).join('\n').includes('Evolución por corte'));
  assert.ok(textosDelPdf(analista.bytes).join('\n').includes('Evolución por corte'));
});

test('período inválido o sin datos: error JSON con el formato común', async () => {
  for (const [ruta, status, codigo] of [
    ['/exportar/informe.pdf?periodo=2026-09', 400, 'PARAMETRO_INVALIDO'],
    ['/exportar/informe.pdf?periodo=20261231', 404, 'PERIODO_SIN_DATOS'],
  ]) {
    const respuesta = await fetch(base + ruta);
    assert.equal(respuesta.status, status, ruta);
    assert.match(respuesta.headers.get('content-type'), /application\/json/);
    assert.equal((await respuesta.json()).error.codigo, codigo, ruta);
  }
});

test('acepta "todos": el acumulado de los cortes cargados', async () => {
  const { respuesta, bytes } = await descargar('/exportar/informe.pdf?periodo=todos');
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get('content-disposition'), 'attachment; filename="informe_todos.pdf"');
  assert.ok(textosDelPdf(bytes).join('\n').includes('Todos los períodos'));
});
