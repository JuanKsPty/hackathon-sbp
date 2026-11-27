// Informe PDF de un período (tamaño carta, 2 páginas), dibujado en el server con pdfkit: texto,
// recuadros y barras vectoriales, sin navegador ni imágenes. Solo usa las fuentes estándar del PDF
// (Helvetica y Helvetica-Bold, codificación WinAnsi: acentos, ñ, · y – salen bien).
// Todas las cifras salen del motor (R2): montos en centavos, formateados con miles y 2 decimales
// al final; porcentajes en diezmilésimas, con 4 decimales.
import PDFDocument from 'pdfkit';
import { calcularProductos, formatearCentavos, formatearE4, TODOS } from '../engine/index.js';
import { REGLA_CONSUMO } from '../engine/clasificacion.js';
import { FUENTE, AVISO } from '../routes/formato.js';

const MARGEN = 40;
const ALTO_FILA = 13;
const COLOR = { texto: '#1b2430', suave: '#5b6675', borde: '#dde2e8', fondo: '#f6f7f9', azul: '#1f5fa8', verde: '#2a8a6e', ocre: '#b7791f' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MAX_CORTES = 20; // cortes que caben en la tabla de evolución

// Productos destacados (tarjetas y evolución), buscados en el catálogo por su código CINU.
const CINU_VIVIENDA_PROPIA = 'L.68.681.6810.00000';
const DESTACADOS = [
  { titulo: 'Tarjetas de crédito', cinu: REGLA_CONSUMO.cinuTarjeta },
  { titulo: 'Automóvil', cinu: REGLA_CONSUMO.cinuAutomovil },
  { titulo: 'Vivienda propia', cinu: CINU_VIVIENDA_PROPIA },
];

// ---- Formatos (solo para leer; los valores vienen del motor) ----

// "1234567.89" -> "1,234,567.89"
const miles = (texto) => texto.replace(/^(-?\d+)/, (enteros) => enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
const monto = (centavos) => miles(formatearCentavos(centavos));
const entero = (n) => miles(String(n));
const pct = (valorE4) => `${formatearE4(valorE4)} %`;

// "20260930" -> "30 sep 2026"
export function fechaCorta(fecha) {
  return `${Number(fecha.slice(6, 8))} ${MESES[Number(fecha.slice(4, 6)) - 1]} ${fecha.slice(0, 4)}`;
}

function fechaDelPeriodo(periodo) {
  if (periodo.fecha !== TODOS) return fechaCorta(periodo.fecha);
  return `Todos los períodos (${fechaCorta(periodo.fechas[0])} – ${fechaCorta(periodo.fechas.at(-1))})`;
}

// ---- Documento ----

// periodo: resultado del motor. evolucion: los períodos cargados (solo si el perfil compara
// períodos) o null. comprimir: false deja el contenido legible (lo usan las pruebas).
// Devuelve una promesa con el PDF en un Buffer.
export function informePdf({ periodo, catalogos, evolucion = null, comprimir = true }) {
  const datos = calcularProductos(periodo, catalogos);
  const destacados = buscarDestacados(datos.productos, catalogos);
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: MARGEN,
    bufferPages: true, // para escribir el pie de cada página al final
    compress: comprimir,
    info: { Title: 'Rankings de crédito · Informe del período', Author: FUENTE, Subject: AVISO },
  });
  const listo = juntarBytes(doc);

  paginaResumen(doc, periodo, datos, destacados);
  doc.addPage();
  paginaProductos(doc, periodo, datos, evolucion && evolucionPorCorte(evolucion.slice(-MAX_CORTES), catalogos));
  pieDeCadaPagina(doc, fechaDelPeriodo(periodo));
  doc.end();
  return listo;
}

function juntarBytes(doc) {
  return new Promise((resolve, reject) => {
    const partes = [];
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });
}

function buscarDestacados(productos, catalogos) {
  return DESTACADOS.map((d) => {
    const actividad = catalogos.cinu.get(d.cinu);
    const producto = actividad && productos.find((p) => p.ranking === actividad.macro && p.subactividad === actividad.sub);
    return { ...d, producto };
  }).filter((d) => d.producto);
}

// ---- Página 1: indicadores, gráficos y líderes ----

function paginaResumen(doc, periodo, datos, destacados) {
  let y = encabezado(doc, 'Rankings de crédito · Informe del período', periodo);
  y = filaDeTarjetas(doc, y, [
    { titulo: 'Saldo total válido', valor: monto(datos.saldoTotal), detalle: 'Universo local válido, las 6 actividades' },
    { titulo: 'Préstamos válidos', valor: entero(datos.universo), detalle: 'Operaciones en el universo local válido' },
  ]);
  y = filaDeTarjetas(doc, y, destacados.map((d) => tarjetaDeProducto(d, datos))) + 6;

  const mitad = (anchoUtil(doc) - 16) / 2;
  const tarjeta = destacados.find((d) => d.cinu === REGLA_CONSUMO.cinuTarjeta).producto;
  const alto = barras(doc, {
    x: MARGEN, y, ancho: mitad, color: COLOR.azul, titulo: 'Saldo total por banco',
    filas: datos.bancos.map((b) => ({ etiqueta: b.banco, valor: b.totalCartera, texto: monto(b.totalCartera) })),
  });
  barras(doc, {
    x: MARGEN + mitad + 16, y, ancho: mitad, color: COLOR.verde, titulo: 'Tarjetas de crédito por banco',
    filas: tarjeta.bancos.map((b) => ({ etiqueta: b.banco, valor: b.saldo, texto: monto(b.saldo) })),
  });
  y += alto + 14;

  y += barras(doc, {
    x: MARGEN, y, ancho: anchoUtil(doc), color: COLOR.ocre, titulo: 'Composición por actividad',
    filas: datos.rankings.map((r) => ({ etiqueta: r.ranking, valor: r.saldo, texto: `${monto(r.saldo)} · ${pct(r.pctTotalE4)}` })),
  }) + 14;

  tabla(doc, {
    y,
    titulo: 'Líder de cada ranking',
    columnas: [{ titulo: 'Ranking', ancho: 110 }, { titulo: 'Banco', ancho: 170 }, { titulo: 'Saldo', ancho: 140, derecha: true }, { titulo: 'Ponderación', ancho: 112, derecha: true }],
    filas: periodo.rankings.map(({ ranking, filas: [lider] }) => [ranking, `${lider.banco} (${lider.codigoBanco})`, monto(lider.saldoActividad), pct(lider.ponderacionE4)]),
  });
}

function tarjetaDeProducto({ titulo, cinu, producto }, datos) {
  let detalle = `${pct(producto.pctRankingE4)} de ${producto.ranking}`;
  if (cinu === REGLA_CONSUMO.cinuTarjeta) detalle += ` · ${entero(datos.reclasificadas)} reclasificadas por SB21`;
  return { titulo, valor: monto(producto.saldo), detalle };
}

// ---- Página 2: los 22 productos y, para Analista y Admin, la evolución por corte ----

function paginaProductos(doc, periodo, datos, evolucion) {
  let y = encabezado(doc, 'Productos de crédito', periodo);
  y += tabla(doc, {
    y,
    titulo: `Los ${datos.productos.length} productos del catálogo`,
    columnas: [{ titulo: 'Ranking', ancho: 85 }, { titulo: 'Subactividad', ancho: 150 }, { titulo: 'Saldo', ancho: 105, derecha: true }, { titulo: '% del ranking', ancho: 72, derecha: true }, { titulo: 'Líder', ancho: 120 }],
    filas: datos.productos.map((p) => [p.ranking, p.subactividad, monto(p.saldo), pct(p.pctRankingE4), p.lider ? `${p.lider.banco} (${p.lider.codigoBanco})` : 'Sin saldo']),
  }) + 14;
  if (evolucion) seccionEvolucion(doc, y, evolucion);
}

// Saldo de cada producto destacado en cada corte cargado, calculado por el mismo motor.
function evolucionPorCorte(periodos, catalogos) {
  const cortes = periodos.map((p) => ({ fecha: p.fecha, destacados: buscarDestacados(calcularProductos(p, catalogos).productos, catalogos) }));
  return { titulos: cortes[0]?.destacados.map((d) => d.titulo) ?? [], cortes };
}

function seccionEvolucion(doc, y, { titulos, cortes }) {
  const ancho = (anchoUtil(doc) - 112) / titulos.length;
  const alto = tabla(doc, {
    y,
    titulo: 'Evolución por corte',
    columnas: [{ titulo: 'Corte', ancho: 112 }, ...titulos.map((titulo) => ({ titulo, ancho, derecha: true }))],
    filas: cortes.map((c) => [fechaCorta(c.fecha), ...c.destacados.map((d) => monto(d.producto.saldo))]),
  });
  nota(doc, 'Saldo de cada producto en los períodos cargados. Solo para los perfiles que comparan períodos.', y + alto + 4);
}

// ---- Piezas de dibujo ----

const anchoUtil = (doc) => doc.page.width - 2 * MARGEN;

function encabezado(doc, titulo, periodo) {
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.texto).text(titulo, MARGEN, MARGEN, { lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave);
  doc.text(`Período: ${fechaDelPeriodo(periodo)}`, MARGEN, MARGEN + 22, { lineBreak: false });
  doc.text(`Archivo: ${periodo.nombreArchivo}`, MARGEN, MARGEN + 34, { lineBreak: false });
  doc.moveTo(MARGEN, MARGEN + 48).lineTo(MARGEN + anchoUtil(doc), MARGEN + 48).lineWidth(2).strokeColor(COLOR.azul).stroke();
  return MARGEN + 58;
}

// Una fila de recuadros con número grande. Devuelve la y siguiente.
function filaDeTarjetas(doc, y, tarjetas) {
  const espacio = 8;
  const alto = 62;
  const ancho = (anchoUtil(doc) - espacio * (tarjetas.length - 1)) / tarjetas.length;
  tarjetas.forEach((t, i) => {
    const x = MARGEN + i * (ancho + espacio);
    doc.roundedRect(x, y, ancho, alto, 4).lineWidth(0.8).fillAndStroke(COLOR.fondo, COLOR.borde);
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.suave).text(t.titulo.toUpperCase(), x + 10, y + 8, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.texto).text(t.valor, x + 10, y + 20, { lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.suave).text(t.detalle, x + 10, y + 41, { width: ancho - 20 });
  });
  return y + alto + espacio;
}

// Barras horizontales: etiqueta, barra proporcional al mayor valor y el monto. Devuelve la altura.
function barras(doc, { x, y, ancho, titulo, filas, color }) {
  subtitulo(doc, titulo, x, y);
  doc.font('Helvetica').fontSize(7);
  const etiqueta = Math.max(...filas.map((f) => doc.widthOfString(f.etiqueta))) + 6;
  const texto = Math.max(...filas.map((f) => doc.widthOfString(f.texto))) + 6;
  const util = ancho - etiqueta - texto;
  const maximo = Math.max(...filas.map((f) => f.valor), 1);
  filas.forEach((f, i) => {
    const fy = y + 16 + i * ALTO_FILA;
    const largo = f.valor > 0 ? Math.max((f.valor / maximo) * util, 1) : 0;
    doc.fillColor(COLOR.texto).text(f.etiqueta, x, fy + 2, { lineBreak: false });
    if (largo > 0) doc.rect(x + etiqueta, fy + 1, largo, ALTO_FILA - 4).fill(color);
    doc.fillColor(COLOR.suave).text(f.texto, x + etiqueta + largo + 4, fy + 2, { lineBreak: false });
  });
  return 16 + filas.length * ALTO_FILA;
}

// Tabla con título, encabezados en negrita y una línea fina bajo cada fila. Devuelve la altura.
function tabla(doc, { y, titulo, columnas, filas }) {
  subtitulo(doc, titulo, MARGEN, y);
  let fy = y + 16;
  renglon(doc, fy, columnas, columnas.map((c) => c.titulo), true);
  for (const fila of filas) {
    fy += ALTO_FILA;
    renglon(doc, fy, columnas, fila, false);
  }
  return fy + ALTO_FILA - y;
}

function renglon(doc, y, columnas, valores, negrita) {
  doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor(COLOR.texto);
  let x = MARGEN;
  columnas.forEach((c, i) => {
    const texto = String(valores[i]);
    const tx = c.derecha ? x + c.ancho - 4 - doc.widthOfString(texto) : x + 4;
    doc.text(texto, tx, y + 3, { lineBreak: false });
    x += c.ancho;
  });
  doc.moveTo(MARGEN, y + ALTO_FILA).lineTo(x, y + ALTO_FILA).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
}

function subtitulo(doc, texto, x, y) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.texto).text(texto, x, y, { lineBreak: false });
}

function nota(doc, texto, y) {
  doc.font('Helvetica').fontSize(7).fillColor(COLOR.suave).text(texto, MARGEN, y, { lineBreak: false });
}

// Pie de CADA página: aviso, fuente, período y número de página (textos de routes/formato.js).
function pieDeCadaPagina(doc, periodoLegible) {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // escribir dentro del margen sin que pdfkit abra otra página
    const y = doc.page.height - MARGEN;
    doc.moveTo(MARGEN, y - 6).lineTo(MARGEN + anchoUtil(doc), y - 6).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR.texto).text(AVISO, MARGEN, y, { lineBreak: false });
    doc.font('Helvetica').fillColor(COLOR.suave).text(`Fuente: ${FUENTE} · Período: ${periodoLegible}`, MARGEN, y + 11, { lineBreak: false });
    const pagina = `Página ${i - start + 1} de ${count}`;
    doc.text(pagina, MARGEN + anchoUtil(doc) - doc.widthOfString(pagina), y + 11, { lineBreak: false });
  }
}
