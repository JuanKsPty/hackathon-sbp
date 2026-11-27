// Ficha de un préstamo (Numero_Prestamo) en todos los períodos cargados: dónde cuenta (banco,
// ranking y subactividad), su saldo y su peso en la cartera del banco, si se excluyó o tuvo
// alertas, y los campos del AT03. Usa lo que ya calculó el motor (periodo.operaciones,
// excluidas y alertas); no vuelve a leer los archivos. Montos en centavos (R2: nada fijado a mano).
import { formatearCentavos, formatearE4 } from '../engine/montos.js';
import { FUENTE, AVISO } from '../routes/formato.js';
import { escapar, monto, fechaLegible, ESTILOS } from './dashboardHtml.js';

export const ESTADOS = { VALIDO: 'VALIDO', EXCLUIDO: 'EXCLUIDO', NO_REPORTADO: 'NO_REPORTADO' };

// Devuelve null si el préstamo no aparece en ningún período (ni válido ni excluido).
export function fichaPrestamo(almacen, numero) {
  let saldoPrevio = null;
  const periodos = almacen.todos().map((p) => {
    const op = p.operaciones.find((o) => o.numeroPrestamo === numero);
    const exclusiones = p.excluidas.filter((e) => e.numeroPrestamo === numero).map((e) => ({ motivo: e.motivo, detalle: e.detalle }));
    const alertas = p.alertas.filter((a) => a.numeroPrestamo === numero).map((a) => ({ tipo: a.tipo, detalle: a.detalle }));
    const base = { fecha: p.fecha, archivo: p.nombreArchivo, exclusiones, alertas };
    if (!op) {
      return { ...base, estado: exclusiones.length > 0 ? ESTADOS.EXCLUIDO : ESTADOS.NO_REPORTADO, codigoBanco: exclusiones.length > 0 ? p.excluidas.find((e) => e.numeroPrestamo === numero).codigoBanco : null };
    }
    const ranking = p.rankings.find((r) => r.ranking === op.macro);
    const filaBanco = ranking?.filas.find((f) => f.codigoBanco === op.codigoBanco);
    const variacion = saldoPrevio === null ? null : op.saldo - saldoPrevio;
    saldoPrevio = op.saldo;
    return {
      ...base,
      estado: ESTADOS.VALIDO,
      codigoBanco: op.codigoBanco,
      banco: filaBanco?.banco ?? almacen.catalogos.bancos.get(op.codigoBanco) ?? op.codigoBanco,
      ranking: op.macro,
      subactividad: op.sub,
      tipoActividad: op.tipoActividad,
      facilidad: op.facilidad,
      reclasificada: op.reclasificada,
      saldo: op.saldo,
      variacion, // contra el período válido anterior; null si es el primero
      posicionBanco: filaBanco?.posicion ?? null,
      bancosEnRanking: ranking?.filas.length ?? null,
      saldoBancoRanking: filaBanco?.saldoActividad ?? null,
      // Peso del préstamo en la cartera del banco en ese ranking, en % con 4 decimales (entero E4).
      participacionE4: filaBanco?.saldoActividad > 0 ? Math.round((op.saldo * 1000000) / filaBanco.saldoActividad) : null,
      campos: almacen.catalogos.campos.map(({ campo }) => ({ campo, valor: op.datos[campo] ?? '' })),
    };
  });
  if (periodos.every((p) => p.estado === ESTADOS.NO_REPORTADO)) return null;
  return { numero, periodos };
}

const ETIQUETA_ESTADO = { VALIDO: 'Válido', EXCLUIDO: 'Excluido', NO_REPORTADO: 'No reportado' };
const conSigno = (centavos) => (centavos === null ? '—' : `${centavos > 0 ? '+' : ''}${monto(centavos)}`);

// Saldo por período en barras verticales (SVG en línea).
function graficoSaldo(periodos) {
  const ancho = 720;
  const alto = 220;
  const base = alto - 30;
  const maximo = Math.max(...periodos.map((p) => p.saldo ?? 0), 1);
  const paso = ancho / Math.max(periodos.length, 1);
  const columna = Math.min(paso * 0.5, 120);
  const barras = periodos
    .map((p, i) => {
      const x = i * paso + (paso - columna) / 2;
      const h = ((p.saldo ?? 0) / maximo) * (base - 30);
      const etiqueta = p.saldo === undefined ? ETIQUETA_ESTADO[p.estado] : monto(p.saldo);
      return `<rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${columna.toFixed(1)}" height="${h.toFixed(1)}" rx="3" class="b-bar"/>`
        + `<text x="${(x + columna / 2).toFixed(1)}" y="${(base - h - 6).toFixed(1)}" text-anchor="middle" class="b-val">${escapar(etiqueta)}</text>`
        + `<text x="${(x + columna / 2).toFixed(1)}" y="${alto - 10}" text-anchor="middle" class="b-et">${escapar(fechaLegible(p.fecha))}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${ancho} ${alto}" width="100%" role="img" aria-label="Saldo del préstamo por período"><line x1="0" y1="${base}" x2="${ancho}" y2="${base}" stroke="#dde2e8"/>${barras}</svg>`;
}

export function fichaPrestamoHtml(ficha) {
  const validos = ficha.periodos.filter((p) => p.estado === ESTADOS.VALIDO);
  const ultimo = validos.at(-1) ?? null;
  const primero = validos[0] ?? null;
  const encabezado = `Fuente: ${FUENTE} · Archivos: ${ficha.periodos.map((p) => p.archivo ?? 'AT03').join(', ')} · Períodos: ${ficha.periodos.map((p) => fechaLegible(p.fecha)).join(', ')}`;

  const tarjetas = ultimo
    ? [
      ['Banco', `${ultimo.banco} (${ultimo.codigoBanco})`],
      ['Ranking · subactividad', `${ultimo.ranking} · ${ultimo.subactividad}`],
      [`Saldo al ${fechaLegible(ultimo.fecha)}`, monto(ultimo.saldo)],
      ['Variación en el rango', primero === ultimo ? '—' : conSigno(ultimo.saldo - primero.saldo)],
      ['Peso en la cartera del banco en el ranking', ultimo.participacionE4 === null ? '—' : `${formatearE4(ultimo.participacionE4)} %`],
    ]
    : [['Estado', 'Excluido en todos los períodos cargados']];

  const filas = ficha.periodos
    .map((p) => (p.estado === ESTADOS.VALIDO
      ? `<tr><td>${escapar(fechaLegible(p.fecha))}</td><td>${ETIQUETA_ESTADO[p.estado]}</td><td>${escapar(p.banco)} (${escapar(p.codigoBanco)})</td><td>${escapar(p.ranking)}</td><td>${escapar(p.subactividad)}${p.reclasificada ? ' (reclasificado a Tarjeta)' : ''}</td>`
        + `<td class="n">${monto(p.saldo)}</td><td class="n">${conSigno(p.variacion)}</td><td class="n">${p.participacionE4 === null ? '—' : formatearE4(p.participacionE4)}</td><td>${p.posicionBanco ?? '—'} de ${p.bancosEnRanking ?? '—'}</td></tr>`
      : `<tr><td>${escapar(fechaLegible(p.fecha))}</td><td>${ETIQUETA_ESTADO[p.estado]}</td><td colspan="7">${p.exclusiones.map((e) => `${escapar(e.motivo)}: ${escapar(e.detalle)}`).join(' · ') || 'El préstamo no viene en este archivo'}</td></tr>`))
    .join('');

  const avisos = ficha.periodos.flatMap((p) => [
    ...p.exclusiones.map((e) => `<tr><td>${escapar(fechaLegible(p.fecha))}</td><td>Exclusión ${escapar(e.motivo)}</td><td>${escapar(e.detalle)}</td></tr>`),
    ...p.alertas.map((a) => `<tr><td>${escapar(fechaLegible(p.fecha))}</td><td>Alerta ${escapar(a.tipo)}</td><td>${escapar(a.detalle)}</td></tr>`),
  ]);

  const campos = ultimo
    ? `<section><h2>Campos del AT03 al ${escapar(fechaLegible(ultimo.fecha))}</h2><table class="campos"><tbody>${ultimo.campos
      .map((c) => `<tr><th>${escapar(c.campo)}</th><td>${escapar(c.valor)}</td></tr>`)
      .join('')}</tbody></table></section>`
    : '';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Préstamo ${escapar(ficha.numero)}</title><style>${ESTILOS}table.campos th{width:40%;background:#f6f8fb;font-weight:500}</style></head>
<body><main>
<header><h1>Informe del préstamo ${escapar(ficha.numero)}</h1>
<p class="meta">${escapar(encabezado)}</p>
<span class="aviso">${escapar(AVISO)}</span></header>
<div class="tarjetas">${tarjetas.map(([t, v]) => `<div class="tarjeta"><span>${escapar(t)}</span><b>${escapar(v)}</b></div>`).join('')}</div>
<section><h2>Saldo por período</h2>${graficoSaldo(ficha.periodos)}</section>
<section><h2>Historial por período</h2><table><thead><tr><th>Período</th><th>Estado</th><th>Banco</th><th>Ranking</th><th>Subactividad</th><th class="n">Saldo</th><th class="n">Variación</th><th class="n">Peso en el banco %</th><th>Posición del banco</th></tr></thead><tbody>${filas}</tbody></table></section>
${avisos.length > 0 ? `<section><h2>Exclusiones y alertas</h2><table><thead><tr><th>Período</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>${avisos.join('')}</tbody></table></section>` : ''}
${campos}
<footer>${escapar(encabezado)}<br>${escapar(AVISO)}. Montos en balboas con 2 decimales; peso en % con 4 decimales, sobre el saldo del banco en ese ranking calculado por el motor.</footer>
</main></body></html>
`;
}

// Formato JSON del API: montos como número con 2 decimales (centavos / 100), como el resto de contratos.
export function fichaEnContrato(ficha) {
  const numeroDe = (centavos) => (centavos === null || centavos === undefined ? null : Number(formatearCentavos(centavos)));
  return {
    Numero_Prestamo: ficha.numero,
    periodos: ficha.periodos.map((p) => ({
      Fecha: p.fecha,
      Archivo: p.archivo,
      Estado: p.estado,
      Codigo_Banco: p.codigoBanco ?? null,
      Banco: p.banco ?? null,
      Ranking: p.ranking ?? null,
      Subactividad: p.subactividad ?? null,
      Tipo_Actividad: p.tipoActividad ?? null,
      Facilidad_Crediticia: p.facilidad ?? null,
      Reclasificada_Tarjeta: p.reclasificada ?? false,
      Saldo: numeroDe(p.saldo),
      Var_Saldo: numeroDe(p.variacion),
      Posicion_Banco: p.posicionBanco ?? null,
      Bancos_en_Ranking: p.bancosEnRanking ?? null,
      Saldo_Banco_Ranking: numeroDe(p.saldoBancoRanking),
      Participacion_Pct: p.participacionE4 === null || p.participacionE4 === undefined ? null : Number(formatearE4(p.participacionE4)),
      Exclusiones: p.exclusiones.map((e) => ({ Motivo: e.motivo, Detalle: e.detalle })),
      Alertas: p.alertas.map((a) => ({ Tipo: a.tipo, Detalle: a.detalle })),
      Campos: p.campos ? Object.fromEntries(p.campos.map((c) => [c.campo, c.valor])) : null,
    })),
  };
}
