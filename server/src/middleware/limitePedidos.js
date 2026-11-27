// Límite de pedidos para los endpoints que gastan la llave de IA (#84): /api/ia/preguntar y
// /api/explicaciones. Sin límite, cualquiera podría consumir la ANTHROPIC_API_KEY en un ciclo.
// Dos contadores en memoria, por ventanas fijas de tiempo:
//   - por IP:  maximo pedidos cada ventanaMs (protege de un solo usuario o script);
//   - global:  maximoGlobal pedidos cada ventanaGlobalMs (tope del gasto total).
// La IP real llega en X-Forwarded-For desde nginx y el proxy de Dokploy: por eso app.js fija
// `trust proxy` para las redes privadas (ver crearApp).
import { ErrorApi } from '../routes/errores.js';

export const LIMITE_IA_POR_DEFECTO = {
  maximo: 10, // por IP
  ventanaMs: 60 * 1000, // por minuto
  maximoGlobal: 300, // entre todos
  ventanaGlobalMs: 60 * 60 * 1000, // por hora
};

// Cuenta un pedido en la ventana; si la ventana ya venció, empieza una nueva.
function contar(ventana, ahora, duracion) {
  if (!ventana || ahora - ventana.inicio >= duracion) return { inicio: ahora, cuenta: 1 };
  return { inicio: ventana.inicio, cuenta: ventana.cuenta + 1 };
}

const segundosQueFaltan = (ventana, ahora, duracion) => Math.max(1, Math.ceil((ventana.inicio + duracion - ahora) / 1000));

export function limitarPedidos(opciones = {}, ahora = Date.now) {
  const { maximo, ventanaMs, maximoGlobal, ventanaGlobalMs } = { ...LIMITE_IA_POR_DEFECTO, ...opciones };
  const porIp = new Map(); // ip -> { inicio, cuenta }
  let global = null;

  return (req, res, next) => {
    const t = ahora();
    if (porIp.size > 10000) {
      // Limpieza: se borran las ventanas vencidas para que el mapa no crezca sin fin.
      for (const [ip, ventana] of porIp) if (t - ventana.inicio >= ventanaMs) porIp.delete(ip);
    }
    const ip = req.ip ?? 'desconocida';
    const ventanaIp = contar(porIp.get(ip), t, ventanaMs);
    porIp.set(ip, ventanaIp);
    if (ventanaIp.cuenta > maximo) {
      const espera = segundosQueFaltan(ventanaIp, t, ventanaMs);
      res.set('Retry-After', String(espera));
      return next(new ErrorApi(429, 'DEMASIADOS_PEDIDOS', `Hiciste muchas consultas a la IA seguidas. Espera ${espera} segundos y vuelve a intentar.`));
    }
    global = contar(global, t, ventanaGlobalMs);
    if (global.cuenta > maximoGlobal) {
      const espera = segundosQueFaltan(global, t, ventanaGlobalMs);
      res.set('Retry-After', String(espera));
      return next(new ErrorApi(429, 'DEMASIADOS_PEDIDOS', 'La IA alcanzó el límite de consultas de esta hora. Puedes seguir usando los rankings y filtros.'));
    }
    return next();
  };
}
