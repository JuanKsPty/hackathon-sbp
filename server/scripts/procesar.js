// Script de consola: procesa todos los AT03 de la carpeta de datos y escribe las exportaciones.
// Uso: npm run procesar -- [--datos ../data] [--salida salidas]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { procesarCarpeta } from '../src/datos/paquete.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { crearObtenerDescomposicion } from '../src/routes/descomposicion.js';
import {
  csvRankings, csvDesglose, csvCalidad, csvExcluidas, csvAlertas, csvMovimientos, csvDescomposicion,
  formatearCentavos, ErrorDeDatos,
} from '../src/engine/index.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const argumentos = leerArgumentos(process.argv.slice(2));
const carpetaDatos = path.resolve(argumentos.datos ?? path.join(aqui, '..', '..', 'data'));
const carpetaSalida = path.resolve(argumentos.salida ?? path.join(aqui, '..', 'salidas'));

try {
  const { catalogos, periodos, avisos } = procesarCarpeta(carpetaDatos);
  if (periodos.length === 0) throw new ErrorDeDatos(`No hay archivos AT03*.csv en ${carpetaDatos}.`);
  avisos.forEach((aviso) => console.warn(`Aviso: ${aviso}`));

  // Entregable 5: períodos consecutivos (jul -> ago, ago -> sep), con la misma función que /api/movimientos.
  const almacen = crearAlmacen(catalogos, periodos);
  const obtenerMovimientos = crearObtenerMovimientos(almacen);
  const obtenerDescomposicion = crearObtenerDescomposicion(almacen);
  const pares = periodos.slice(1).map((actual, i) => ({ desde: periodos[i].fecha, hasta: actual.fecha }));

  fs.mkdirSync(carpetaSalida, { recursive: true });
  const archivos = {
    'rankings.csv': csvRankings(periodos),
    'desglose_subactividades.csv': csvDesglose(periodos),
    'calidad.csv': csvCalidad(periodos),
    'excluidas.csv': csvExcluidas(periodos),
    'alertas.csv': csvAlertas(periodos),
  };
  if (pares.length > 0) {
    archivos['movimientos.csv'] = unirCsv(pares.map((par) => csvMovimientos(obtenerMovimientos(par))));
    archivos['descomposicion_movimientos.csv'] = unirCsv(pares.map((par) => csvDescomposicion(obtenerDescomposicion(par))));
  }
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

// Une varios CSV con el mismo encabezado (el encabezado va una sola vez).
function unirCsv(textos) {
  return textos.map((texto, i) => (i === 0 ? texto : texto.slice(texto.indexOf('\n') + 1))).join('');
}

function leerArgumentos(lista) {
  const resultado = {};
  for (let i = 0; i < lista.length; i += 2) {
    if (lista[i]?.startsWith('--')) resultado[lista[i].slice(2)] = lista[i + 1];
  }
  return resultado;
}
