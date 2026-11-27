// Suscripciones a las alertas por correo (#7). La lista oficial vive aquí, en
// storage/suscripciones.json (storage/ está en .gitignore: los correos nunca se suben al repo).
// Zapier solo recibe una copia de las confirmadas para el resumen semanal (evento suscripcion_actualizada).
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { carpetaStorage } from '../datos/storage.js';
import { ErrorApi } from '../routes/errores.js';

// Un dato inválido responde 400 PARAMETRO_INVALIDO (formato común de errores).
const invalido = (mensaje) => new ErrorApi(400, 'PARAMETRO_INVALIDO', mensaje);

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const archivoSuscripciones = () => path.join(carpetaStorage(), 'suscripciones.json');

export function leerSuscripciones() {
  if (!fs.existsSync(archivoSuscripciones())) return [];
  try {
    const datos = JSON.parse(fs.readFileSync(archivoSuscripciones(), 'utf8'));
    return Array.isArray(datos) ? datos : [];
  } catch {
    console.warn('suscripciones.json no es JSON válido: se trata como lista vacía.');
    return [];
  }
}

function guardar(suscripciones) {
  fs.mkdirSync(carpetaStorage(), { recursive: true });
  fs.writeFileSync(archivoSuscripciones(), JSON.stringify(suscripciones, null, 2), 'utf8');
}

// Lista de códigos sin repetir; cada uno debe existir en el catálogo (bancos o rankings).
function validarLista(valores, permitidos, nombre) {
  if (valores === undefined || valores === null) return [];
  if (!Array.isArray(valores)) throw invalido(`${nombre} debe ser una lista.`);
  const lista = [...new Set(valores.map((v) => String(v).trim()))];
  const invalidos = lista.filter((v) => !permitidos.includes(v));
  if (invalidos.length > 0) {
    throw invalido(`${nombre} no existe(n) en el catálogo: ${invalidos.join(', ')}.`);
  }
  return lista;
}

// Doble confirmación: pedir una suscripción (o cambiar preferencias) no activa nada; solo guarda
// la solicitud y su token. Recién al abrir el enlace del correo se aplica (confirmar).
// Así nadie puede suscribir un correo ajeno, y una solicitud falsa no cambia lo que ya estaba activo.
export const VIGENCIA_CONFIRMACION_MS = 48 * 60 * 60 * 1000;

export function normalizarCorreo(correo) {
  const limpio = String(correo ?? '').trim().toLowerCase();
  if (!PATRON_CORREO.test(limpio)) {
    throw invalido('Escribe un correo válido, por ejemplo nombre@ejemplo.com.');
  }
  return limpio;
}

// Guarda la solicitud y devuelve la suscripción con `confirmacion` (token, bancos y rankings pedidos).
// bancos y rankings vacíos = sigue todos.
export function solicitarSuscripcion({ correo, bancos, rankings }, catalogos, ahora = new Date()) {
  const limpio = normalizarCorreo(correo);
  const confirmacion = {
    token: randomUUID(),
    bancos: validarLista(bancos, [...catalogos.bancos.keys()], 'Los bancos'),
    rankings: validarLista(rankings, catalogos.macroactividades, 'Los rankings'),
    solicitado_en: ahora.toISOString(),
  };
  const suscripciones = leerSuscripciones();
  const existente = suscripciones.find((s) => s.correo === limpio);
  // Si ya existía, se conservan sus preferencias y su estado hasta que confirme el cambio.
  const suscripcion = existente
    ? { ...existente, confirmacion }
    : { correo: limpio, bancos: [], rankings: [], activo: false, token: randomUUID(), actualizado_en: ahora.toISOString(), confirmacion };
  guardar([...suscripciones.filter((s) => s.correo !== limpio), suscripcion]);
  return suscripcion;
}

// Aplica la solicitud del enlace del correo. Devuelve la suscripción activa,
// o null si el token no existe o la solicitud venció (48 horas).
export function confirmar(token, ahora = new Date()) {
  const suscripciones = leerSuscripciones();
  const suscripcion = suscripciones.find((s) => s.confirmacion?.token === token);
  if (!suscripcion) return null;
  const { bancos, rankings, solicitado_en: solicitadoEn } = suscripcion.confirmacion;
  if (ahora.getTime() - new Date(solicitadoEn).getTime() > VIGENCIA_CONFIRMACION_MS) return null;
  const confirmada = { ...suscripcion, bancos, rankings, activo: true, confirmacion: null, actualizado_en: ahora.toISOString() };
  guardar(suscripciones.map((s) => (s.correo === suscripcion.correo ? confirmada : s)));
  return confirmada;
}

// Fecha de la última solicitud de este correo (para no reenviar confirmaciones seguidas), o null.
export function ultimaSolicitud(correo) {
  const existente = leerSuscripciones().find((s) => s.correo === correo);
  return existente?.confirmacion ? new Date(existente.confirmacion.solicitado_en) : null;
}

// Baja con el token del enlace del correo. Devuelve la suscripción o null si el token no existe.
export function darDeBaja(token) {
  const suscripciones = leerSuscripciones();
  const suscripcion = suscripciones.find((s) => s.token === token);
  if (!suscripcion) return null;
  const actualizada = { ...suscripcion, activo: false, actualizado_en: new Date().toISOString() };
  guardar(suscripciones.map((s) => (s.token === token ? actualizada : s)));
  return actualizada;
}

export const suscriptoresActivos = () => leerSuscripciones().filter((s) => s.activo);

// Lo que se puede mostrar: sin los tokens, que permiten dar de baja o confirmar.
export function sinToken({ token, confirmacion, ...resto }) { // eslint-disable-line no-unused-vars
  return { ...resto, pendiente_de_confirmar: Boolean(confirmacion) };
}
