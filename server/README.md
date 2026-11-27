# Backend: motor de rankings

Calcula los rankings de crédito desde los CSV del reto. Todo sale de los archivos: no hay saldos, posiciones ni porcentajes escritos a mano (R2), y la clasificación usa solo los catálogos (R3).

## Ejecutar

```bash
cd server
npm install
npm test            # pruebas: cascada, SB21, rankings, reconciliaciones, exportaciones y API
npm start           # API en http://localhost:3001/api (procesa ../data al arrancar)
npm run dev         # igual, reiniciando al guardar cambios
npm run procesar    # procesa ../data y escribe server/salidas/*.csv
npm run procesar -- --datos ../data --salida salidas
```

Variables de entorno opcionales: `PORT` (por defecto `3001`) y `DATA_DIR` (por defecto `../data`).

Salidas del script: `rankings.csv` (entregable 2), `desglose_subactividades.csv` (3), `calidad.csv` (4), `excluidas.csv` (exclusión auditable) y `alertas.csv`.

## API

Endpoints de consulta y formatos JSON en [`contracts/consulta.md`](../contracts/consulta.md).

- **`src/app.js`:** arma la app de Express con `crearApp({ almacen })`. Las rutas nuevas se montan ahí, antes de los manejadores de errores.
- **`src/datos/almacen.js`:** guarda en memoria los períodos procesados. La carga de un período nuevo solo llama a `almacen.guardar(procesarPeriodo(filas, catalogos))`.
- **`src/datos/cargaPeriodo.js`:** carga de un período nuevo (#29). Valida y procesa el AT03, guarda una copia en `storage/periodos/` y lo publica en el almacén. Al arrancar, `servidor.js` recarga esas copias después de `data/`. El endpoint es `POST /api/periodos`, solo para admin, y su contrato está en [`contracts/carga.md`](../contracts/carga.md). Usa la carpeta `storage/` de la bitácora: la raíz del repo, o `STORAGE_DIR` si está definida.
- **`src/automation/publicacion.js`:** gancho `alPublicarPeriodo(resultado)`, que se llama después de cada carga. Ahí se conectan las alertas por correo (#7).
- **`src/routes/`:**
  - `consulta.js`: los endpoints.
  - `parametros.js`: validación de filtros.
  - `formato.js`: conversión al formato de los contratos.
  - `errores.js`: formato común de errores.

## Estructura

```
src/engine/          JS puro, sin Express ni disco (recibe textos, devuelve objetos)
  csv.js            lectura como texto (bom: true, sin conversión de tipos) y ErrorDeDatos
  catalogos.js      bancos, CINU, SB21 y diccionario
  validacion.js     esquema de 61 columnas, tipos e integridad referencial (alertas)
  cascada.js        exclusiones E1 -> E2 -> E3 -> E4
  clasificacion.js  cruce CINU + regla SB21 de CONSUMO
  agregacion.js     sumas en centavos enteros
  rankings.js       rankings (12 bancos), ponderación y desglose por subactividad
  reconciliaciones.js  R1, R2, R3 y unicidad
  exportar.js       CSV de los entregables
  montos.js         centavos enteros y ponderación con BigInt
  index.js          punto de entrada: leerAT03, procesarPeriodo, procesarArchivo
src/datos/paquete.js   lectura de la carpeta data/ desde disco
scripts/procesar.js    script de consola
tests/                 pruebas (node:test); tests/referencia solo se usa en pruebas
```

## Uso desde la API o la automatización

```js
import { cargarCatalogos, leerAT03, procesarPeriodo, csvRankings } from './src/engine/index.js';

const catalogos = cargarCatalogos({ bancos, cinu, sb21, diccionario }); // textos de los 4 CSV
const periodos = leerAT03(textoAT03, catalogos, 'AT03_sintetico_202610.csv'); // [{ fecha, filas }]
const resultado = procesarPeriodo(periodos[0].filas, catalogos);
```

`procesarPeriodo(filas, catalogos)` recibe las filas de una sola `Fecha` y devuelve:

| Campo | Contenido |
| --- | --- |
| `fecha` | período, tomado del campo `Fecha` |
| `calidad` | filas leídas, E1–E4, universo válido, saldo total, reclasificadas a Tarjeta, conteos de alertas, `cascadaCuadra` y conteos independientes (rotulados aparte) |
| `reconciliaciones` | `r1`, `r2`, `r3`, `unicidad`, cada una con `ok` y sus diferencias |
| `rankings` | `[{ ranking, filas: [{ posicion, codigoBanco, banco, saldoActividad, totalCartera, ponderacionE4, operacionesValidas }] }]` |
| `desglose` | `[{ ranking, subactividad, codigoBanco, saldo }]` |
| `operaciones` | universo válido clasificado, un registro por préstamo (con la fila original en `datos`) |
| `excluidas` | `[{ fila, numeroPrestamo, codigoBanco, motivo, detalle }]` |
| `alertas` | banco o facilidad fuera de catálogo, incoherencias de CONSUMO y tipos de dato |

Los montos vienen en **centavos enteros** y la ponderación en **diezmilésimas**. Para mostrarlos se usan `formatearCentavos` (2 decimales) y `formatearE4` (4 decimales). Si el archivo es inválido se lanza `ErrorDeDatos` con un mensaje claro y `detalles` (por ejemplo, la columna o la fila con problemas).

## Reglas implementadas

- **Lectura:** todo como texto (los códigos conservan los ceros, `NA` es texto) y se quita el BOM, que traen los catálogos y el diccionario.
- **Período:** sale del campo `Fecha`, no del nombre del archivo.
- **Validación:** 61 columnas con el nombre y el orden del diccionario. Si `Fecha` o `Saldo` son inválidos se rechaza el archivo; otros tipos dan alerta. Un banco o una facilidad fuera de catálogo dan alerta, no exclusión.
- **Cascada:** E1 duplicados (se conserva la primera ocurrencia en orden de archivo), E2 `Destino` distinto de `L`, E3 `Saldo <= 0` y E4 `Tipo_Actividad` fuera del CINU. Cada fila cuenta solo en el primer filtro y se verifica `leídas = E1+E2+E3+E4+universo`.
- **Clasificación:** `Tipo_Actividad = Codigo_CINU`; nunca `Codigo_SB08_Referencia`.
- **Regla SB21:** Crédito personal con facilidad `07` pasa a Tarjeta. Una Tarjeta sin `07` o un Automóvil sin `03` dan alerta y conservan la subactividad.
- **Ponderación:** el denominador es todo el universo válido del banco. Se redondea half-up a 4 decimales con BigInt.
- **Ranking:** saldo descendente y, en empate, `Codigo_Banco` ascendente. Siempre salen los 12 bancos (0.00 si no tienen saldo).
