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

// Reporte personalizado (Analista y Administrador): una sección por período elegido, solo con los
// rankings y las filas de los bancos elegidos. Sets vacíos = todos. Con bancos elegidos, además,
// una tabla por banco con sus posiciones en los rankings elegidos.
export function dashboardPersonalizadoHtml({ periodos, rankings = new Set(), bancos = new Set(), catalogos }) {
  const nombre = (codigo) => catalogos?.bancos?.get(codigo) ?? codigo;
  const filtros = [
    `Períodos: ${periodos.map((p) => fechaLegible(p.fecha)).join(', ')}`,
    rankings.size > 0 ? `Rankings: ${[...rankings].join(', ')}` : 'Todos los rankings',
    bancos.size > 0 ? `Bancos: ${[...bancos].map((b) => `${nombre(b)} (${b})`).join(', ')}` : 'Todos los bancos',
  ];
  const encabezado = `Fuente: ${FUENTE} · Archivos: ${periodos.map((p) => p.nombreArchivo ?? 'AT03').join(', ')}`;

  const cuerpo = periodos
    .map((periodo) => {
      const c = periodo.calidad;
      const elegidos = periodo.rankings
        .filter((r) => rankings.size === 0 || rankings.has(r.ranking))
        .map((r) => ({ ...r, filas: r.filas.filter((f) => bancos.size === 0 || bancos.has(f.codigoBanco)) }));
      const tarjetas = [
        ['Cartera local válida', monto(c.saldoTotalValido)],
        ['Universo local válido', `${c.universoValido} operaciones`],
        ['Filas leídas', String(c.filasLeidas)],
      ]
        .map(([t, v]) => `<div class="tarjeta"><span>${escapar(t)}</span><b>${escapar(v)}</b></div>`)
        .join('');
      const porBanco = [...bancos]
        .map((codigo) => seccionBanco({ ...periodo, rankings: periodo.rankings.filter((r) => rankings.size === 0 || rankings.has(r.ranking)) }, codigo, nombre(codigo)))
        .join('');
      const secciones = elegidos
        .map(({ ranking: r, filas }) => `<section><h2>Ranking ${escapar(r)} · ${escapar(fechaLegible(periodo.fecha))}</h2>${filas.length > 0 ? barras(filas) : ''}${tablaRanking(filas)}</section>`)
        .join('');
      return `<h2 class="periodo">Período ${escapar(fechaLegible(periodo.fecha))}</h2><div class="tarjetas">${tarjetas}</div>${porBanco}${secciones}${seccionCalidad(c)}`;
    })
    .join('');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte personalizado</title><style>${ESTILOS}.periodo{margin:28px 0 0;font-size:19px}</style></head>
<body><main>
<header><h1>Reporte personalizado · Dashboard</h1>
<p class="meta">${escapar(encabezado)}</p>
<p class="meta">Filtros: ${escapar(filtros.join(' · '))}</p>
<span class="aviso">${escapar(AVISO)}</span></header>
${cuerpo}
<footer>${escapar(encabezado)}<br>${escapar(AVISO)}. Montos en balboas con 2 decimales; ponderación en % con 4 decimales. Mismos datos que personalizado.csv.</footer>
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
