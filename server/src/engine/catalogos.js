// Carga de los catálogos del paquete: bancos, CINU/SB109, SB21 y diccionario AT03.
// Todo lo que el motor sabe de bancos, actividades y rankings sale de aquí (nada fijado a mano).
import { leerCsv, exigirColumnas } from './csv.js';

// Recibe el TEXTO de los 4 CSV y devuelve estructuras listas para cruzar.
export function cargarCatalogos({ bancos, cinu, sb21, diccionario }) {
  const actividades = leerCinu(cinu);
  return {
    bancos: leerBancos(bancos), // Map Codigo_Banco -> Nombre_Ficticio
    cinu: actividades.porCodigo, // Map Codigo_CINU -> { macro, sub, descripcion }
    macroactividades: actividades.macroactividades, // los 6 rankings, en el orden del catálogo
    subactividadesPorMacro: actividades.subactividadesPorMacro, // Map macro -> [subactividades]
    facilidades: leerFacilidades(sb21), // Map Codigo SB21 -> Descripcion
    campos: leerDiccionario(diccionario), // [{ campo, tipo }] los 61 campos en orden
  };
}

function leerBancos(texto) {
  const nombre = 'Bancos_ficticios.csv';
  const { encabezados, filas } = leerCsv(texto, nombre);
  exigirColumnas(encabezados, ['Codigo_Banco', 'Nombre_Ficticio'], nombre);
  return new Map(filas.map(({ datos }) => [datos.Codigo_Banco, datos.Nombre_Ficticio]));
}

// La llave es Codigo_CINU. Codigo_SB08_Referencia NO se usa como llave (el 2103 se repite).
function leerCinu(texto) {
  const nombre = 'Catalogo_CINU_SB109_reto.csv';
  const { encabezados, filas } = leerCsv(texto, nombre);
  exigirColumnas(encabezados, ['Codigo_CINU', 'Macroactividad_Reto', 'Subactividad_Reto'], nombre);

  const porCodigo = new Map();
  const subactividadesPorMacro = new Map();
  for (const { datos } of filas) {
    const macro = datos.Macroactividad_Reto;
    const sub = datos.Subactividad_Reto;
    porCodigo.set(datos.Codigo_CINU, { macro, sub, descripcion: datos.Descripcion });
    if (!subactividadesPorMacro.has(macro)) subactividadesPorMacro.set(macro, []);
    const subs = subactividadesPorMacro.get(macro);
    if (!subs.includes(sub)) subs.push(sub);
  }
  // El nombre de cada ranking es exactamente Macroactividad_Reto (Sección 5).
  const macroactividades = [...subactividadesPorMacro.keys()];
  return { porCodigo, macroactividades, subactividadesPorMacro };
}

function leerFacilidades(texto) {
  const nombre = 'Tabla_SB21_simplificada.csv';
  const { encabezados, filas } = leerCsv(texto, nombre);
  exigirColumnas(encabezados, ['Codigo'], nombre);
  return new Map(filas.map(({ datos }) => [datos.Codigo, datos.Descripcion]));
}

function leerDiccionario(texto) {
  const nombre = 'Diccionario_datos_AT03_reto.csv';
  const { encabezados, filas } = leerCsv(texto, nombre);
  exigirColumnas(encabezados, ['Campo', 'Tipo'], nombre);
  return filas.map(({ datos }) => ({ campo: datos.Campo, tipo: datos.Tipo }));
}
