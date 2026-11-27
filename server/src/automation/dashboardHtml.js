// Dashboard descargable: un solo archivo HTML autocontenido (CSS y SVG en línea, sin scripts ni
// recursos externos) con los rankings de un período, armado con los resultados del motor.
// Complementa a los CSV de los entregables 2 a 5, que no cambian.
// Montos a 2 decimales y ponderación a 4, formateados desde centavos como en engine/exportar.js (R2).
import { formatearCentavos, formatearE4 } from '../engine/montos.js';
import { FUENTE, AVISO } from '../routes/formato.js';

const escapar = (valor) =>
  String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// "1234567.89" -> "1,234,567.89" (solo para leer; el valor sale de formatearCentavos).
const conMiles = (texto) => {
  const [enteros, decimales] = texto.split('.');
  return `${enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${decimales !== undefined ? `.${decimales}` : ''}`;
};
const monto = (centavos) => conMiles(formatearCentavos(centavos));
const fechaLegible = (f) => `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`;

// Barras horizontales de saldo por banco (SVG en línea, ancho relativo al mayor saldo).
function barras(filas) {
  const alto = 22;
  const etiqueta = 190;
  const ancho = 720;
  const maximo = Math.max(...filas.map((f) => f.saldoActividad), 1);
  const util = ancho - etiqueta - 130;
  const renglones = filas
    .map((f, i) => {
      const y = i * alto;
      const largo = Math.max((f.saldoActividad / maximo) * util, f.saldoActividad > 0 ? 1 : 0);
      return `<g transform="translate(0,${y})"><text x="0" y="15" class="b-et">${escapar(f.posicion)}. ${escapar(f.banco)}</text>`
        + `<rect x="${etiqueta}" y="4" width="${largo.toFixed(1)}" height="14" rx="2" class="b-bar"/>`
        + `<text x="${(etiqueta + largo + 6).toFixed(1)}" y="15" class="b-val">${monto(f.saldoActividad)}</text></g>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${ancho} ${filas.length * alto}" width="100%" role="img" aria-label="Saldo por banco">${renglones}</svg>`;
}

function tablaRanking(filas) {
  const cuerpo = filas
    .map((f) => `<tr><td>${escapar(f.posicion)}</td><td>${escapar(f.codigoBanco)}</td><td>${escapar(f.banco)}</td>`
      + `<td class="n">${monto(f.saldoActividad)}</td><td class="n">${formatearE4(f.ponderacionE4)}</td><td class="n">${escapar(f.operacionesValidas)}</td></tr>`)
    .join('');
  return `<table><thead><tr><th>Posición</th><th>Código</th><th>Banco</th><th class="n">Saldo</th><th class="n">Ponderación %</th><th class="n">Operaciones</th></tr></thead><tbody>${cuerpo}</tbody></table>`;
}

function seccionBanco(periodo, codigoBanco, nombreBanco) {
  const filas = periodo.rankings.map(({ ranking, filas: bancos }) => {
    const f = bancos.find((b) => b.codigoBanco === codigoBanco);
    return f
      ? `<tr><td>${escapar(ranking)}</td><td>${escapar(f.posicion)} de ${bancos.length}</td><td class="n">${monto(f.saldoActividad)}</td><td class="n">${formatearE4(f.ponderacionE4)}</td><td class="n">${escapar(f.operacionesValidas)}</td></tr>`
      : `<tr><td>${escapar(ranking)}</td><td colspan="4">Sin datos para este banco</td></tr>`;
  });
  return `<section><h2>${escapar(nombreBanco)} (${escapar(codigoBanco)}) en los ${periodo.rankings.length} rankings</h2>`
    + `<table><thead><tr><th>Ranking</th><th>Posición</th><th class="n">Saldo</th><th class="n">Ponderación %</th><th class="n">Operaciones</th></tr></thead><tbody>${filas.join('')}</tbody></table></section>`;
}

function seccionCalidad(c) {
  const fila = (codigo, texto, valor) => `<tr><td>${codigo}</td><td>${texto}</td><td class="n">${escapar(valor)}</td></tr>`;
  return `<section><h2>Calidad de los datos (cascada E1–E4)</h2><table><thead><tr><th>Código</th><th>Regla</th><th class="n">Filas</th></tr></thead><tbody>`
    + fila('', 'Filas leídas', c.filasLeidas)
    + fila('E1', 'Duplicados', c.e1Duplicados)
    + fila('E2', 'Destino extranjero', c.e2DestinoExtranjero)
    + fila('E3', 'Saldo no positivo', c.e3SaldoNoPositivo)
    + fila('E4', 'Actividad no catalogada', c.e4ActividadNoCatalogada)
    + fila('', 'Universo local válido', c.universoValido)
    + `</tbody></table><p class="nota">La cascada ${c.cascadaCuadra ? 'cuadra' : 'NO cuadra'}: filas leídas = E1 + E2 + E3 + E4 + universo válido.</p></section>`;
}

const ESTILOS = `
:root{--fondo:#f6f7f9;--papel:#fff;--texto:#1b2430;--suave:#5b6675;--borde:#dde2e8;--acento:#1f5fa8}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--texto);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 48px}
header{border-bottom:3px solid var(--acento);padding-bottom:12px;margin-bottom:16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:0 0 10px}
.meta{color:var(--suave);font-size:13px;margin:2px 0}.aviso{display:inline-block;margin-top:6px;padding:4px 10px;border-radius:4px;background:#fff4d6;color:#6b4e00;font-weight:600;font-size:13px}
.tarjetas{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:16px 0}
.tarjeta{background:var(--papel);border:1px solid var(--borde);border-radius:8px;padding:12px 14px}
.tarjeta b{display:block;font-size:20px;margin-top:4px}.tarjeta span{color:var(--suave);font-size:12px;text-transform:uppercase;letter-spacing:.03em}
section{background:var(--papel);border:1px solid var(--borde);border-radius:8px;padding:16px;margin:16px 0;overflow-x:auto}
table{border-collapse:collapse;width:100%;margin-top:10px;font-size:13px}th,td{border-bottom:1px solid var(--borde);padding:6px 8px;text-align:left}
th{background:#eef2f7}.n{text-align:right;font-variant-numeric:tabular-nums}
.b-et{font-size:12px;fill:var(--texto)}.b-val{font-size:11px;fill:var(--suave)}.b-bar{fill:var(--acento)}
.nota{color:var(--suave);font-size:12px}footer{color:var(--suave);font-size:12px;margin-top:24px;border-top:1px solid var(--borde);padding-top:10px}
@media print{body{background:#fff}section{break-inside:avoid}}
`;

// Barras horizontales genéricas: [{ etiqueta, centavos }] (SVG en línea, relativas al mayor valor).
function grafico(items, etiquetaAria) {
  const alto = 22;
  const etiqueta = 230;
  const ancho = 720;
  const maximo = Math.max(...items.map((i) => i.centavos), 1);
  const util = ancho - etiqueta - 130;
  const corta = (t) => (t.length > 34 ? `${t.slice(0, 33)}…` : t);
  const renglones = items
    .map((item, i) => {
      const largo = Math.max((item.centavos / maximo) * util, item.centavos > 0 ? 1 : 0);
      return `<g transform="translate(0,${i * alto})"><text x="0" y="15" class="b-et"><title>${escapar(item.etiqueta)}</title>${escapar(corta(item.etiqueta))}</text>`
        + `<rect x="${etiqueta}" y="4" width="${largo.toFixed(1)}" height="14" rx="2" class="b-bar"/>`
        + `<text x="${(etiqueta + largo + 6).toFixed(1)}" y="15" class="b-val">${monto(item.centavos)}</text></g>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${ancho} ${Math.max(items.length, 1) * alto}" width="100%" role="img" aria-label="${escapar(etiquetaAria)}">${renglones}</svg>`;
}

const tarjetas = (pares) =>
  `<div class="tarjetas">${pares.map(([t, v]) => `<div class="tarjeta"><span>${escapar(t)}</span><b>${escapar(v)}</b></div>`).join('')}</div>`;

// Reporte personalizado (Analista y Administrador), enfocado en los bancos: por cada período elegido,
// un comparativo de los bancos, una ficha por banco (posición, saldo, ponderación y operaciones por
// ranking, y su saldo por subactividad) y cada ranking elegido con solo esos bancos.
// Sets vacíos = todos. Todo sale del motor (rankings y desglose); nada fijado a mano (R2).
export function dashboardPersonalizadoHtml({ periodos, rankings = new Set(), bancos = new Set(), catalogos }) {
  const nombre = (codigo) => catalogos?.bancos?.get(codigo) ?? codigo;
  const enRanking = (r) => rankings.size === 0 || rankings.has(r);
  const enBanco = (codigo) => bancos.size === 0 || bancos.has(codigo);
  const filtros = [
    `Períodos: ${periodos.map((p) => fechaLegible(p.fecha)).join(', ')}`,
    rankings.size > 0 ? `Rankings: ${[...rankings].join(', ')}` : 'Todos los rankings',
    bancos.size > 0 ? `Bancos: ${[...bancos].map((b) => `${nombre(b)} (${b})`).join(', ')}` : 'Todos los bancos',
  ];
  const encabezado = `Fuente: ${FUENTE} · Archivos: ${periodos.map((p) => p.nombreArchivo ?? 'AT03').join(', ')}`;

  const cuerpo = periodos
    .map((periodo) => {
      const fecha = fechaLegible(periodo.fecha);
      const elegidos = periodo.rankings.filter((r) => enRanking(r.ranking));
      // Una ficha por banco, ordenadas por su saldo total en los rankings elegidos.
      const codigos = [...new Set(elegidos.flatMap((r) => r.filas.map((f) => f.codigoBanco)))].filter(enBanco);
      const fichas = codigos
        .map((codigo) => {
          const porRanking = elegidos.map((r) => ({ ranking: r.ranking, de: r.filas.length, fila: r.filas.find((f) => f.codigoBanco === codigo) }));
          const conDatos = porRanking.filter((x) => x.fila);
          const saldo = conDatos.reduce((s, x) => s + x.fila.saldoActividad, 0);
          const operaciones = conDatos.reduce((s, x) => s + x.fila.operacionesValidas, 0);
          const mejor = conDatos.reduce((m, x) => (m === null || x.fila.posicion < m.fila.posicion ? x : m), null);
          const subactividades = periodo.desglose
            .filter((d) => d.codigoBanco === codigo && enRanking(d.ranking) && d.saldo > 0)
            .sort((a, b) => b.saldo - a.saldo);
          return { codigo, banco: nombre(codigo), porRanking, saldo, operaciones, mejor, subactividades };
        })
        .sort((a, b) => b.saldo - a.saldo);
      const mejorTexto = (f) => (f.mejor ? `${f.mejor.fila.posicion}º en ${f.mejor.ranking}` : '—');

      const comparativo = `<section><h2>Bancos · ${escapar(fecha)}</h2>`
        + grafico(fichas.map((f) => ({ etiqueta: f.banco, centavos: f.saldo })), 'Saldo por banco en los rankings elegidos')
        + '<table><thead><tr><th>Código</th><th>Banco</th><th class="n">Saldo</th><th class="n">Operaciones</th><th>Mejor posición</th></tr></thead><tbody>'
        + fichas.map((f) => `<tr><td>${escapar(f.codigo)}</td><td>${escapar(f.banco)}</td><td class="n">${monto(f.saldo)}</td><td class="n">${escapar(f.operaciones)}</td><td>${escapar(mejorTexto(f))}</td></tr>`).join('')
        + '</tbody></table></section>';

      const detalle = fichas
        .map((f) => `<section><h2>${escapar(f.banco)} (${escapar(f.codigo)}) · ${escapar(fecha)}</h2>`
          + tarjetas([
            ['Saldo en los rankings elegidos', monto(f.saldo)],
            ['Operaciones', String(f.operaciones)],
            ['Mejor posición', mejorTexto(f)],
          ])
          + '<h3>Saldo por ranking</h3>'
          + grafico(f.porRanking.map((x) => ({ etiqueta: `${x.ranking}${x.fila ? ` · ${x.fila.posicion}º de ${x.de}` : ''}`, centavos: x.fila?.saldoActividad ?? 0 })), `Saldo de ${f.banco} por ranking`)
          + '<table><thead><tr><th>Ranking</th><th>Posición</th><th class="n">Saldo</th><th class="n">Ponderación %</th><th class="n">Operaciones</th></tr></thead><tbody>'
          + f.porRanking.map((x) => (x.fila
            ? `<tr><td>${escapar(x.ranking)}</td><td>${escapar(x.fila.posicion)} de ${x.de}</td><td class="n">${monto(x.fila.saldoActividad)}</td><td class="n">${formatearE4(x.fila.ponderacionE4)}</td><td class="n">${escapar(x.fila.operacionesValidas)}</td></tr>`
            : `<tr><td>${escapar(x.ranking)}</td><td colspan="4">Sin cartera en este ranking</td></tr>`)).join('')
          + '</tbody></table>'
          + (f.subactividades.length > 0
            ? '<h3>Saldo por subactividad</h3>'
              + grafico(f.subactividades.map((d) => ({ etiqueta: d.subactividad, centavos: d.saldo })), `Saldo de ${f.banco} por subactividad`)
              + '<table><thead><tr><th>Ranking</th><th>Subactividad</th><th class="n">Saldo</th></tr></thead><tbody>'
              + f.subactividades.map((d) => `<tr><td>${escapar(d.ranking)}</td><td>${escapar(d.subactividad)}</td><td class="n">${monto(d.saldo)}</td></tr>`).join('')
              + '</tbody></table>'
            : '')
          + '</section>')
        .join('');

      const porRanking = elegidos
        .map((r) => ({ ranking: r.ranking, filas: r.filas.filter((f) => enBanco(f.codigoBanco)) }))
        .map(({ ranking: r, filas }) => `<section><h2>Ranking ${escapar(r)} · ${escapar(fecha)}</h2>${filas.length > 0 ? barras(filas) : ''}${tablaRanking(filas)}</section>`)
        .join('');

      return `<h2 class="periodo">Período ${escapar(fecha)}</h2>${comparativo}${detalle}${porRanking}`;
    })
    .join('');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte personalizado</title><style>${ESTILOS}.periodo{margin:28px 0 0;font-size:19px}h3{font-size:14px;margin:16px 0 6px;color:var(--suave)}</style></head>
<body><main>
<header><h1>Reporte personalizado · Bancos</h1>
<p class="meta">${escapar(encabezado)}</p>
<p class="meta">Filtros: ${escapar(filtros.join(' · '))}</p>
<span class="aviso">${escapar(AVISO)}</span></header>
${cuerpo}
<footer>${escapar(encabezado)}<br>${escapar(AVISO)}. Montos en balboas con 2 decimales; ponderación en % con 4 decimales. Saldos por ranking y por subactividad calculados por el motor (entregables 2 y 3).</footer>
</main></body></html>
`;
}

// periodo: período procesado del almacén. ranking (opcional): un nombre de macroactividad.
// banco (opcional): código del catálogo. catalogos: para el nombre del banco.
export function dashboardHtml({ periodo, ranking = null, banco = null, catalogos }) {
  const c = periodo.calidad;
  const rankings = periodo.rankings.filter((r) => ranking === null || r.ranking === ranking);
  const nombreBanco = banco ? catalogos?.bancos?.get(banco) ?? banco : null;
  const filtros = [ranking ? `Ranking: ${ranking}` : `Los ${periodo.rankings.length} rankings`, banco ? `Banco: ${nombreBanco} (${banco})` : 'Todos los bancos'];
  const encabezado = `Fuente: ${FUENTE} · Archivo: ${periodo.nombreArchivo ?? 'AT03'} · Período: ${fechaLegible(periodo.fecha)}`;

  const tarjetas = [
    ['Cartera local válida', monto(c.saldoTotalValido)],
    ['Universo local válido', `${c.universoValido} operaciones`],
    ['Filas leídas', String(c.filasLeidas)],
  ]
    .map(([t, v]) => `<div class="tarjeta"><span>${escapar(t)}</span><b>${escapar(v)}</b></div>`)
    .join('');

  const secciones = rankings
    .map(({ ranking: nombre, filas }) => `<section><h2>Ranking ${escapar(nombre)}</h2>${barras(filas)}${tablaRanking(filas)}</section>`)
    .join('');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard de rankings ${escapar(periodo.fecha)}</title><style>${ESTILOS}</style></head>
<body><main>
<header><h1>Dashboard de rankings de crédito</h1>
<p class="meta">${escapar(encabezado)}</p>
<p class="meta">Filtros: ${escapar(filtros.join(' · '))}</p>
<span class="aviso">${escapar(AVISO)}</span></header>
<div class="tarjetas">${tarjetas}</div>
${banco ? seccionBanco(periodo, banco, nombreBanco) : ''}
${secciones}
${seccionCalidad(c)}
<footer>${escapar(encabezado)}<br>${escapar(AVISO)}. Montos en balboas con 2 decimales; ponderación en % con 4 decimales. Los CSV de los entregables siguen disponibles en Reportes.</footer>
</main></body></html>
`;
}
