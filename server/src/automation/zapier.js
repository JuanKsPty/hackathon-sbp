// Eventos hacia Zapier (#7): alertas por correo, resumen semanal y casos de seguimiento.
// Formato: contracts/eventos-zapier.md. Solo la app llama a Zapier; Zapier no calcula nada:
// los movimientos, la regla de significativo y los casos ya vienen decididos desde aquí.
// Sin ZAPIER_WEBHOOK_URL (o sin internet) la app sigue igual y el envío queda PENDIENTE en la bitácora.
import { randomUUID } from 'node:crypto';
import { FUENTE, AVISO } from '../routes/formato.js';
import { textoMovimiento } from '../ai/plantillas.js';
import { registrarOperacion } from '../datos/bitacora.js';

export const TIEMPO_MAXIMO_MS = 5000;

// Casos de seguimiento: un caso por banco y motivo cuando el banco tiene al menos `minimo`
// filas excluidas por ese motivo. E2 (destino extranjero) no es un error del reporte, por eso no está.
export const REGLA_CASOS = { motivos: ['E1', 'E4'], minimo: 1 };

const NOMBRE_MOTIVO = {
  E1: 'E1_Duplicados',
  E2: 'E2_Destino_Extranjero',
  E3: 'E3_Saldo_No_Positivo',
  E4: 'E4_Actividad_No_Catalogada',
};

// Sin paréntesis tipo "préstamo(s)": el webhook de Zapier los interpreta como campos.
const prestamos = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
const DETALLE_MOTIVO = {
  E1: (n) => `${prestamos(n, 'préstamo repetido', 'préstamos repetidos')} dentro del período; se conservó la primera ocurrencia.`,
  E2: (n) => `${prestamos(n, 'operación', 'operaciones')} con destino extranjero.`,
  E3: (n) => `${prestamos(n, 'préstamo', 'préstamos')} con saldo cero o negativo.`,
  E4: (n) => `${prestamos(n, 'préstamo', 'préstamos')} con Tipo_Actividad fuera del catálogo CINU.`,
};

// Durante `npm test` nunca se llama a Zapier, aunque la variable esté definida.
export const urlDeZapier = () =>
  process.env.NODE_TEST_CONTEXT ? '' : (process.env.ZAPIER_WEBHOOK_URL ?? '').trim();

// Enlace para darse de baja desde el correo: lo atiende GET /api/suscripciones/baja.
export function enlaceDeBaja(token) {
  const base = `http://localhost:${process.env.PORT || 3001}`;
  return `${base}/api/suscripciones/baja?token=${encodeURIComponent(token)}`;
}

// Fecha y hora de Panamá (UTC-5 todo el año): así la hoja muestra la hora local de la demo.
export function ahoraEnPanama(fecha = new Date()) {
  return new Date(fecha.getTime() - 5 * 3600 * 1000).toISOString().replace('Z', '-05:00');
}

function idEvento(tipo, referencia) {
  return `${tipo}-${referencia}-${randomUUID().slice(0, 8)}`;
}

// ---- Partes del evento periodo_publicado (funciones puras) ----

// Movimientos significativos de la comparación (formato de /api/movimientos), con su frase.
export function movimientosSignificativos(comparacion) {
  const lista = [];
  for (const ranking of comparacion?.rankings ?? []) {
    for (const mov of ranking.movimientos ?? []) {
      if (!mov.Significativo) continue;
      lista.push({ Ranking: ranking.Ranking, ...mov, Explicacion: textoMovimiento(ranking.Ranking, mov) });
    }
  }
  return lista;
}

// Líder de cada ranking: de la comparación si la hay; si es el primer período, de los rankings del motor.
export function lideres(comparacion, periodo) {
  if (comparacion?.rankings?.length) {
    return comparacion.rankings.map((r) => ({
      Ranking: r.Ranking,
      Codigo_Banco: r.Lider_actual?.Codigo_Banco ?? null,
      Banco: r.Lider_actual?.Banco ?? null,
      Cambio_Lider: Boolean(r.Cambio_Lider),
    }));
  }
  return (periodo?.rankings ?? []).map((r) => ({
    Ranking: r.ranking,
    Codigo_Banco: r.filas[0]?.codigoBanco ?? null,
    Banco: r.filas[0]?.banco ?? null,
    Cambio_Lider: false,
  }));
}

// Casos de seguimiento por banco según REGLA_CASOS, a partir de la lista auditable de excluidas.
export function casosDeCalidad(periodo, nombresBancos = new Map(), regla = REGLA_CASOS) {
  const conteo = new Map();
  for (const { codigoBanco, motivo } of periodo?.excluidas ?? []) {
    if (!regla.motivos.includes(motivo)) continue;
    const clave = `${codigoBanco}|${motivo}`;
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .filter(([, cantidad]) => cantidad >= regla.minimo)
    .map(([clave, cantidad]) => {
      const [codigoBanco, motivo] = clave.split('|');
      return {
        Caso_ID: `${periodo.fecha}-${codigoBanco}-${motivo}`,
        Codigo_Banco: codigoBanco,
        Banco: nombresBancos.get(codigoBanco) ?? `Banco ${codigoBanco} (no catalogado)`,
        Tipo_Alerta: NOMBRE_MOTIVO[motivo],
        Cantidad: cantidad,
        Detalle: DETALLE_MOTIVO[motivo](cantidad),
      };
    })
    .sort((a, b) => (a.Caso_ID < b.Caso_ID ? -1 : 1));
}

// Cada suscriptor activo recibe solo los movimientos de los bancos y rankings que sigue
// (lista vacía = todos).
export function destinatarios(suscriptores, movimientos) {
  return suscriptores
    .filter((s) => s.activo)
    .map((s) => ({
      correo: s.correo,
      enlace_baja: enlaceDeBaja(s.token),
      movimientos: movimientos.filter(
        (m) =>
          (s.bancos.length === 0 || s.bancos.includes(m.Codigo_Banco)) &&
          (s.rankings.length === 0 || s.rankings.includes(m.Ranking)),
      ),
    }));
}

// ---- Eventos ----

// periodo_publicado. publicado: { fecha, accion, comparacion, calidad, periodo } (gancho de la carga, #29).
export function eventoPeriodoPublicado(publicado, { archivo, catalogos, suscriptores = [], enviadoEn = ahoraEnPanama() } = {}) {
  const { fecha, comparacion, calidad, periodo } = publicado;
  const movimientos = movimientosSignificativos(comparacion);
  return {
    evento: 'periodo_publicado',
    id_evento: idEvento('periodo_publicado', fecha),
    enviado_en: enviadoEn,
    fuente: FUENTE,
    aviso: AVISO,
    periodo: fecha,
    periodo_anterior: comparacion?.periodo_anterior ?? null,
    archivo: archivo ?? calidad?.Archivo ?? null,
    resumen: {
      Filas_Leidas: calidad?.Filas_Leidas ?? null,
      E1_Duplicados: calidad?.E1_Duplicados ?? null,
      E2_Destino_Extranjero: calidad?.E2_Destino_Extranjero ?? null,
      E3_Saldo_No_Positivo: calidad?.E3_Saldo_No_Positivo ?? null,
      E4_Actividad_No_Catalogada: calidad?.E4_Actividad_No_Catalogada ?? null,
      Universo_Local_Valido: calidad?.Universo_Local_Valido ?? null,
      Saldo_Total_Valido: calidad?.Saldo_Total_Valido ?? null,
      Alertas_Total: calidad?.Alertas_Total ?? null,
    },
    lideres: lideres(comparacion, periodo),
    movimientos_significativos: movimientos,
    destinatarios: destinatarios(suscriptores, movimientos),
    casos: casosDeCalidad(periodo, catalogos?.bancos),
  };
}

// suscripcion_actualizada: alta, cambio de preferencias o baja.
export function eventoSuscripcion(suscripcion, accion, { enviadoEn = ahoraEnPanama() } = {}) {
  return {
    evento: 'suscripcion_actualizada',
    id_evento: idEvento('suscripcion_actualizada', accion),
    enviado_en: enviadoEn,
    fuente: FUENTE,
    aviso: AVISO,
    correo: suscripcion.correo,
    accion,
    bancos: suscripcion.bancos,
    rankings: suscripcion.rankings,
  };
}

// ---- Envío ----

// POST del evento a Zapier. Nunca lanza: devuelve { estado, detalle } y lo deja en la bitácora.
//   ENVIADO: Zapier respondió 2xx · PENDIENTE: sin URL, sin internet o sin respuesta a tiempo
//   ERROR: Zapier respondió con error.
// La bitácora guarda el tipo de evento y su id, nunca la URL ni los correos.
export async function enviarEvento(evento, { url = urlDeZapier(), fetchFn = fetch, tiempoMaximoMs = TIEMPO_MAXIMO_MS, perfil = 'sistema' } = {}) {
  const resultado = await intentarEnvio(evento, { url, fetchFn, tiempoMaximoMs });
  registrarOperacion({
    operacion: 'evento_zapier',
    perfil,
    resultado: resultado.estado === 'ENVIADO' ? 'exito' : 'error',
    detalle: `${evento.evento} ${evento.id_evento}: ${resultado.estado}${resultado.detalle ? ` (${resultado.detalle})` : ''}`,
  });
  return resultado;
}

async function intentarEnvio(evento, { url, fetchFn, tiempoMaximoMs }) {
  if (!url) {
    return { estado: 'PENDIENTE', detalle: 'ZAPIER_WEBHOOK_URL no está configurada' };
  }
  try {
    const respuesta = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evento),
      signal: AbortSignal.timeout(tiempoMaximoMs),
    });
    if (!respuesta.ok) return { estado: 'ERROR', detalle: `Zapier respondió ${respuesta.status}` };
    return { estado: 'ENVIADO', detalle: null };
  } catch (error) {
    return { estado: 'PENDIENTE', detalle: `sin respuesta de Zapier: ${error.name}` };
  }
}
