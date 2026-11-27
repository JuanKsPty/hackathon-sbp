// Suscripción a las alertas por correo (#7), con doble confirmación. Contrato: contracts/eventos-zapier.md.
//   POST /api/suscripciones             cualquier perfil pide suscribirse (o cambiar sus bancos y rankings);
//                                       Zapier le manda un correo con el enlace para confirmar
//   GET  /api/suscripciones/confirmar   enlace del correo: activa la suscripción (?token=...)
//   GET  /api/suscripciones/baja        enlace de las alertas para darse de baja (?token=...)
//   GET  /api/suscripciones             lista de suscriptores, solo Administrador (son datos personales)
import { Router } from 'express';
import { requierePerfil } from '../middleware/perfiles.js';
import { registrarOperacion } from '../datos/bitacora.js';
import {
  solicitarSuscripcion,
  confirmar,
  darDeBaja,
  leerSuscripciones,
  normalizarCorreo,
  ultimaSolicitud,
  sinToken,
} from '../automation/suscripciones.js';
import { eventoConfirmacion, eventoReporteSolicitado, eventoSuscripcion, enviarEvento } from '../automation/zapier.js';
import { crearObtenerMovimientos } from './movimientos.js';
import { ErrorApi } from './errores.js';
import { encabezado, calidadDePeriodo, AVISO, FUENTE } from './formato.js';

// Límite de pedidos: por IP (protege de un script que mande muchos correos de confirmación)
// y por correo (no se reenvía la confirmación al mismo correo antes de esperaMismoCorreoMs).
export const LIMITE_SUSCRIPCIONES = { maximo: 5, ventanaMs: 10 * 60 * 1000, esperaMismoCorreoMs: 60 * 1000 };

const describir = (lista, todos) => (lista.length === 0 ? todos : lista.join(', '));

function demasiados(segundos, mensaje) {
  const error = new ErrorApi(429, 'DEMASIADOS_PEDIDOS', mensaje);
  error.reintentarEn = segundos;
  return error;
}

// Cuenta pedidos por IP en ventanas fijas de tiempo (en memoria).
function limitarPorIp({ maximo, ventanaMs }, ahora) {
  const porIp = new Map();
  return (req, res, next) => {
    const t = ahora().getTime();
    const ip = req.ip ?? 'desconocida';
    const previa = porIp.get(ip);
    const ventana = !previa || t - previa.inicio >= ventanaMs ? { inicio: t, cuenta: 1 } : { ...previa, cuenta: previa.cuenta + 1 };
    porIp.set(ip, ventana);
    if (porIp.size > 10000) {
      for (const [clave, v] of porIp) if (t - v.inicio >= ventanaMs) porIp.delete(clave);
    }
    if (ventana.cuenta <= maximo) return next();
    const segundos = Math.max(1, Math.ceil((ventana.inicio + ventanaMs - t) / 1000));
    res.set('Retry-After', String(segundos));
    return next(demasiados(segundos, `Hiciste muchas solicitudes de suscripción seguidas. Espera ${segundos} segundos y vuelve a intentar.`));
  };
}

function pagina(titulo, mensaje) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Radar SBP</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:40px auto">
<p style="background:#fff4d6;padding:8px"><strong>${AVISO}</strong></p>
<h1>${titulo}</h1><p>${mensaje}</p><p style="color:#555;font-size:12px">Fuente: ${FUENTE}</p>
</body></html>`;
}

export function rutasDeSuscripciones(almacen, { enviar = enviarEvento, limite = LIMITE_SUSCRIPCIONES, ahora = () => new Date() } = {}) {
  const rutas = Router();

  rutas.post('/suscripciones', limitarPorIp(limite, ahora), async (req, res) => {
    const { correo, bancos, rankings } = req.body ?? {};
    const limpio = normalizarCorreo(correo);
    const anterior = ultimaSolicitud(limpio);
    const espera = anterior ? anterior.getTime() + limite.esperaMismoCorreoMs - ahora().getTime() : 0;
    if (espera > 0) {
      const segundos = Math.ceil(espera / 1000);
      res.set('Retry-After', String(segundos));
      throw demasiados(segundos, `Ya enviamos un correo de confirmación a esta dirección. Revisa tu bandeja o espera ${segundos} segundos para pedir otro.`);
    }

    const suscripcion = solicitarSuscripcion({ correo: limpio, bancos, rankings }, almacen.catalogos, ahora());
    const envio = await enviar(eventoConfirmacion(suscripcion), { perfil: req.perfil });
    const pedidos = suscripcion.confirmacion;
    registrarOperacion({
      operacion: 'suscripcion',
      perfil: req.perfil,
      resultado: envio.estado === 'ENVIADO' ? 'exito' : 'error',
      detalle: `solicitud: bancos ${describir(pedidos.bancos, 'todos')}; rankings ${describir(pedidos.rankings, 'todos')}; correo de confirmación ${envio.estado}`,
    });
    const enviado = envio.estado === 'ENVIADO';
    res.json({
      ...encabezado(),
      confirmacion_enviada: enviado,
      mensaje: enviado
        ? 'Te enviamos un correo para confirmar la suscripción. Abre el enlace en las próximas 48 horas.'
        : 'No pudimos enviar el correo de confirmación en este momento. Inténtalo de nuevo en unos minutos.',
      suscripcion: sinToken(suscripcion),
    });
  });

  // Enviar el reporte de un corte a un correo (cualquier perfil). Zapier manda el mismo correo de la
  // alerta, con todos los movimientos significativos del corte frente al anterior. Sin periodo: el último.
  rutas.post('/reportes/correo', limitarPorIp(limite, ahora), async (req, res) => {
    const correo = normalizarCorreo(req.body?.correo);
    const fechas = almacen.fechas();
    const fecha = req.body?.periodo ? String(req.body.periodo) : fechas.at(-1);
    const periodo = fecha ? almacen.obtener(fecha) : null;
    if (!periodo) throw new ErrorApi(404, 'PERIODO_NO_ENCONTRADO', `No hay un período publicado con fecha ${fecha}.`);
    const indice = fechas.indexOf(fecha);
    const comparacion = indice > 0 ? crearObtenerMovimientos(almacen)({ desde: fechas[indice - 1], hasta: fecha }) : null;
    const evento = eventoReporteSolicitado(
      { fecha, comparacion, calidad: calidadDePeriodo(periodo), periodo },
      { catalogos: almacen.catalogos, correo },
    );
    const envio = await enviar(evento, { perfil: req.perfil });
    const enviado = envio.estado === 'ENVIADO';
    res.json({
      ...encabezado(),
      enviado,
      periodo: fecha,
      mensaje: enviado
        ? `Enviamos el reporte del corte del ${fecha.slice(6, 8)}/${fecha.slice(4, 6)}/${fecha.slice(0, 4)} a ${correo}. Llega en uno o dos minutos.`
        : 'No pudimos enviar el reporte en este momento. Inténtalo de nuevo en unos minutos.',
    });
  });

  rutas.get('/suscripciones/confirmar', (req, res) => {
    const suscripcion = confirmar(String(req.query.token ?? ''), ahora());
    if (!suscripcion) {
      return res
        .status(404)
        .type('html')
        .send(pagina('Enlace no válido', 'El enlace no existe o venció. Vuelve a suscribirte desde la app.'));
    }
    registrarOperacion({ operacion: 'suscripcion', perfil: req.perfil, resultado: 'exito', detalle: 'alta confirmada desde el correo' });
    void enviar(eventoSuscripcion(suscripcion, 'alta'), { perfil: req.perfil });
    res.type('html').send(pagina('Suscripción confirmada', 'Recibirás un correo cada vez que se publique un período.'));
  });

  rutas.get('/suscripciones/baja', (req, res) => {
    const suscripcion = darDeBaja(String(req.query.token ?? ''));
    if (!suscripcion) {
      return res
        .status(404)
        .type('html')
        .send(pagina('Enlace no válido', 'No encontramos una suscripción con este enlace.'));
    }
    registrarOperacion({ operacion: 'suscripcion', perfil: req.perfil, resultado: 'exito', detalle: 'baja desde el enlace del correo' });
    void enviar(eventoSuscripcion(suscripcion, 'baja'), { perfil: req.perfil });
    res.type('html').send(pagina('Te diste de baja', 'Ya no recibirás las alertas por correo de Radar SBP.'));
  });

  rutas.get('/suscripciones', requierePerfil('admin'), (req, res) => {
    const suscripciones = leerSuscripciones().map(sinToken);
    res.json({ ...encabezado(), total: suscripciones.length, suscripciones });
  });

  return rutas;
}
