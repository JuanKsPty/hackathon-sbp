// Suscripciones a las alertas por correo (#7). La lista oficial vive aquí, en
// storage/suscripciones.json (storage/ está en .gitignore: los correos nunca se suben al repo).
// Zapier solo recibe una copia para el resumen semanal (evento suscripcion_actualizada).
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

// Alta o cambio de preferencias. Devuelve la suscripción guardada.
// bancos y rankings vacíos = sigue todos.
export function suscribir({ correo, bancos, rankings }, catalogos) {
  const limpio = String(correo ?? '').trim().toLowerCase();
  if (!PATRON_CORREO.test(limpio)) {
    throw invalido('Escribe un correo válido, por ejemplo nombre@ejemplo.com.');
  }
  const datos = {
    bancos: validarLista(bancos, [...catalogos.bancos.keys()], 'Los bancos'),
    rankings: validarLista(rankings, catalogos.macroactividades, 'Los rankings'),
  };
  const suscripciones = leerSuscripciones();
  const existente = suscripciones.find((s) => s.correo === limpio);
  const suscripcion = {
    correo: limpio,
    ...datos,
    activo: true,
    token: existente?.token ?? randomUUID(),
    actualizado_en: new Date().toISOString(),
  };
  guardar([...suscripciones.filter((s) => s.correo !== limpio), suscripcion]);
  return suscripcion;
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

// Lo que se puede mostrar (sin el token, que permite dar de baja).
export function sinToken({ token, ...resto }) { // eslint-disable-line no-unused-vars
  return resto;
}
