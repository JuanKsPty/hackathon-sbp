// Lectura de la carpeta de datos desde disco. Es la única parte que toca archivos:
// el motor (src/engine) solo recibe textos.
import fs from 'node:fs';
import path from 'node:path';
import { cargarCatalogos, procesarArchivo } from '../engine/index.js';

export const ARCHIVOS_CATALOGO = {
  bancos: 'Bancos_ficticios.csv',
  cinu: 'Catalogo_CINU_SB109_reto.csv',
  sb21: 'Tabla_SB21_simplificada.csv',
  diccionario: 'Diccionario_datos_AT03_reto.csv',
};

const leerTexto = (ruta) => fs.readFileSync(ruta, 'utf8');

export function leerCatalogosDeCarpeta(carpeta) {
  const textos = {};
  for (const [clave, archivo] of Object.entries(ARCHIVOS_CATALOGO)) {
    textos[clave] = leerTexto(path.join(carpeta, archivo));
  }
  return cargarCatalogos(textos);
}

// Archivos AT03 de la carpeta (AT03*.csv), en orden alfabético.
export function listarArchivosAT03(carpeta) {
  return fs
    .readdirSync(carpeta)
    .filter((nombre) => /^AT03.*\.csv$/i.test(nombre))
    .sort();
}

// Procesa todos los AT03 de la carpeta. Si dos archivos traen la misma Fecha,
// el último reemplaza al anterior y se deja un aviso.
export function procesarCarpeta(carpeta, opciones = {}) {
  const catalogos = leerCatalogosDeCarpeta(carpeta);
  const porFecha = new Map();
  const avisos = [];
  for (const archivo of listarArchivosAT03(carpeta)) {
    const texto = leerTexto(path.join(carpeta, archivo));
    for (const periodo of procesarArchivo(texto, catalogos, { ...opciones, nombreArchivo: archivo })) {
      if (porFecha.has(periodo.fecha)) {
        avisos.push(`El período ${periodo.fecha} de ${archivo} reemplaza al de ${porFecha.get(periodo.fecha).nombreArchivo}.`);
      }
      porFecha.set(periodo.fecha, periodo);
    }
  }
  const periodos = [...porFecha.keys()].sort().map((fecha) => porFecha.get(fecha));
  return { catalogos, periodos, avisos };
}
