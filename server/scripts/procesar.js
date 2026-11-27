// Script de consola: procesa todos los AT03 de la carpeta de datos y escribe las exportaciones.
// Uso: npm run procesar -- [--datos ../data] [--salida salidas]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { procesarCarpeta } from '../src/datos/paquete.js';
import { csvRankings, csvDesglose, csvCalidad, csvExcluidas, csvAlertas, formatearCentavos, ErrorDeDatos } from '../src/engine/index.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const argumentos = leerArgumentos(process.argv.slice(2));
const carpetaDatos = path.resolve(argumentos.datos ?? path.join(aqui, '..', '..', 'data'));
const carpetaSalida = path.resolve(argumentos.salida ?? path.join(aqui, '..', 'salidas'));

try {
  const { periodos, avisos } = procesarCarpeta(carpetaDatos);
  if (periodos.length === 0) throw new ErrorDeDatos(`No hay archivos AT03*.csv en ${carpetaDatos}.`);
  avisos.forEach((aviso) => console.warn(`Aviso: ${aviso}`));

  fs.mkdirSync(carpetaSalida, { recursive: true });
  const archivos = {
    'rankings.csv': csvRankings(periodos),
    'desglose_subactividades.csv': csvDesglose(periodos),
    'calidad.csv': csvCalidad(periodos),
    'excluidas.csv': csvExcluidas(periodos),
    'alertas.csv': csvAlertas(periodos),
  };
  for (const [nombre, contenido] of Object.entries(archivos)) {
    fs.writeFileSync(path.join(carpetaSalida, nombre), contenido, 'utf8');
  }

  imprimirResumen(periodos);
  console.log(`\nExportaciones escritas en ${carpetaSalida}: ${Object.keys(archivos).join(', ')}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  (error.detalles ?? []).forEach((d) => console.error(`  - ${d}`));
  process.exitCode = 1;
}

function imprimirResumen(periodos) {
  console.table(
    periodos.map(({ fecha, calidad: c, reconciliaciones: r }) => ({
      Fecha: fecha,
      Leidas: c.filasLeidas,
      E1: c.e1Duplicados,
      E2: c.e2DestinoExtranjero,
      E3: c.e3SaldoNoPositivo,
      E4: c.e4ActividadNoCatalogada,
      Universo: c.universoValido,
      'Saldo total': formatearCentavos(c.saldoTotalValido),
      'A Tarjeta': c.reclasificadasTarjeta,
      'Cuadra cascada': c.cascadaCuadra ? 'SI' : 'NO',
      'R1 R2 R3': [r.r1, r.r2, r.r3].map((x) => (x.ok ? 'OK' : 'X')).join(' '),
    })),
  );
  console.log('Líderes por ranking:');
  for (const { ranking } of periodos[0].rankings) {
    const lideres = periodos.map((p) => p.rankings.find((r) => r.ranking === ranking).filas[0].codigoBanco);
    console.log(`  ${ranking.padEnd(13)} ${lideres.join(' / ')}`);
  }
}

function leerArgumentos(lista) {
  const resultado = {};
  for (let i = 0; i < lista.length; i += 2) {
    if (lista[i]?.startsWith('--')) resultado[lista[i].slice(2)] = lista[i + 1];
  }
  return resultado;
}
