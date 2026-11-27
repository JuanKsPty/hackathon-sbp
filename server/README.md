# Backend: motor de rankings y API

Calcula los rankings de crédito desde los CSV del reto y los expone en una API local con Express. Todo sale de los archivos (R2): no hay saldos, posiciones ni porcentajes escritos a mano. La clasificación usa solo los catálogos (R3).

## Ejecutar

```bash
cd server
npm install
npm test                  # todas las pruebas (node:test): motor, API, perfiles, carga, movimientos, IA, MCP
npm run test:cobertura    # las mismas pruebas con reporte de cobertura (falla si baja de 90 % de líneas)
npm start                 # API en http://localhost:3001/api; procesa ../data al arrancar
npm run dev               # igual que npm start, pero reinicia al guardar cambios
npm run procesar          # procesa ../data y escribe server/salidas/*.csv
npm run procesar -- --datos ../data --salida salidas
npm run mcp               # servidor MCP por stdio (para Claude Desktop); requiere la API levantada
npm run eval:agente       # evaluación del agente de IA (ver más abajo)
BASE_URL=https://mi-app.ejemplo npm run humo   # prueba de humo contra la app desplegada (por defecto localhost:3001)
```

Desde la raíz del repo, `npm run dev` y `npm start` cargan el `.env` de la raíz (`scripts/con-env.mjs`).

### Variables de entorno
Todas son opcionales. La plantilla es [`.env.example`](../.env.example), en la raíz y con valores vacíos (R5: nunca credenciales en el repo).

| Variable | Por defecto | Para qué |
| :--- | :--- | :--- |
| `PORT` | `3001` | Puerto de la API |
| `DATA_DIR` | `../data` | Carpeta con los AT03 y los catálogos |
| `STORAGE_DIR` | `../storage` (en `.gitignore`) | Períodos cargados, bitácora, parámetros y reportes de la evaluación |
| `PARAMETROS_FILE` | `parametros.json` en `STORAGE_DIR` | Regla de movimiento significativo que guarda el Administrador |
| `ANTHROPIC_API_KEY` | vacío: IA apagada | Explicaciones y agente de IA (sin llave funcionan por reglas o avisan) |
| `AI_MODEL` | `claude-opus-5-5` | Modelo de Claude |
| `MCP_API_URL`, `MCP_PERFIL` | `http://localhost:3001/api`, `publico` | Servidor MCP por stdio |
| `API_INTERNA` (antes `MCP_API_INTERNA`) | `http://127.0.0.1:$PORT/api` | API que consultan las herramientas del agente (`/api/ia/preguntar`) y del MCP remoto (`/api/mcp`); nunca se arma con el header `Host` de la petición (`src/ai/apiInterna.js`) |
| `EVAL_API_URL` | API en memoria | Evaluar el agente contra una API ya desplegada |
| `BASE_URL` | `http://localhost:3001` | App que revisa la prueba de humo (`npm run humo`), con o sin `/api` |

### Salidas de `npm run procesar`
- `rankings.csv` (entregable 2), `desglose_subactividades.csv` (3) y `calidad.csv` (4).
- `movimientos.csv` (5): julio → agosto y agosto → septiembre, con la misma función que `/api/movimientos`.
- `descomposicion_movimientos.csv`: de dónde sale cada `Var_Saldo` (préstamos nuevos, los que salen y la amortización).
- `excluidas.csv` (exclusión auditable) y `alertas.csv`.

## Pruebas

Las pruebas usan `node:test` y corren sin red ni base de datos: procesan los CSV de `data/`. Las cifras de control (`tests/referencia/`) solo viven en las pruebas, nunca en el código de la app (R2).

- **`npm run test:cobertura`:** corre todas las pruebas con `--experimental-test-coverage` e imprime la cobertura por archivo, sin contar `tests/`. Falla si baja de 90 % de líneas, 85 % de ramas o 90 % de funciones.
- **Contratos (`tests/contratos.test.js`):** cada ejemplo JSON de `/contracts` se compara con la respuesta real de la API, pedida con el perfil que corresponde (`X-Perfil`). Se comparan claves y tipos en todos los niveles, no valores. Si se agrega un ejemplo sin su prueba, el test falla.
- **Entregable 7 (`tests/entregable7.test.js`):** la app arranca con julio y agosto, el Administrador carga septiembre por `POST /api/periodos` y la respuesta trae los cambios de ranking, sin editar código.
- **Prueba de humo (`scripts/humo.js`):** `npm run humo` revisa una app levantada o desplegada.
  - Toma la URL de `BASE_URL`: la raíz de la app, con o sin `/api`.
  - Revisa `/api/salud`, `/api/rankings`, `/api/calidad`, `/api/docs`, `/api/mcp` (initialize) y el 403 de Público.
  - Solo hace lecturas y sale con código 1 si algún control falla.
  - `tests/humo.test.js` la corre contra la app local en cada `npm test`.

## API

**Perfiles:** cada petición lleva el header `X-Perfil` con `publico` (por defecto), `analista` o `admin`. Basta un selector de perfil; no hay contraseñas (R5). Si un perfil pide una opción que no tiene, recibe `403 PERFIL_NO_AUTORIZADO`. La tabla de opciones está en `src/middleware/perfiles.js` y en [`contracts/perfiles.md`](../contracts/perfiles.md).

**Límite de pedidos de IA (#84):** `POST /api/ia/preguntar` y `GET /api/explicaciones` gastan la llave de IA, así que tienen un límite.
- **Topes:** 10 pedidos por IP por minuto y 300 en total por hora.
- **Al pasarse:** la respuesta es `429 DEMASIADOS_PEDIDOS`, con el header `Retry-After` en segundos.
- **IP real:** detrás del proxy llega en `X-Forwarded-For`; por eso `app.js` fija `trust proxy` para las redes privadas.
- **Detalle:** en [`src/middleware/README.md`](src/middleware/README.md).

**Formato:**
- Las respuestas traen `fuente` y `aviso` ("Datos ficticios · Uso informativo, no opinión formal de la SBP").
- Los montos van con 2 decimales, la ponderación con 4 y los códigos como texto.
- Los errores tienen la forma `{ "error": { "codigo", "mensaje", "detalles"? } }`.
- **Documentación interactiva:** `GET /api/docs` (Swagger UI) y `GET /api/openapi.json`.

| Grupo | Endpoint | Perfil | Contrato |
| :--- | :--- | :--- | :--- |
| Consulta | `GET /api/salud`, `/api/periodos`, `/api/catalogos` | todos | [consulta.md](../contracts/consulta.md) |
| | `GET /api/rankings`, `/api/subactividades`, `/api/calidad`, `/api/excluidas` | todos | [consulta.md](../contracts/consulta.md) |
| | `GET /api/indicadores` (morosidad, vencimientos, concentración; análisis adicional) | todos | [indicadores.md](../contracts/indicadores.md) |
| | `GET /api/verificacion` (un dato de cada punto de la sección 11.1, para el jurado) | todos | [verificacion.md](../contracts/verificacion.md) |
| Comparación | `GET /api/movimientos` | analista, admin | [movimientos.json](../contracts/movimientos.json) |
| | `GET /api/movimientos/descomposicion` (nuevos, salen, amortización) | analista, admin | `src/routes/descomposicion.js` |
| Descargas | `GET /api/exportar/{rankings,subactividades,calidad,excluidas,alertas}.csv` | todos | [exportaciones.md](../contracts/exportaciones.md) |
| | `GET /api/exportar/movimientos.csv` (entregable 5) | analista, admin | [exportaciones.md](../contracts/exportaciones.md) |
| Administración | `GET /api/perfil`, `GET /api/parametros` | todos | [perfiles.md](../contracts/perfiles.md), [administracion.md](../contracts/administracion.md) |
| | `PUT /api/parametros`, `GET /api/admin/catalogos`, `GET /api/bitacora` | admin | [administracion.md](../contracts/administracion.md), [bitacora.md](../contracts/bitacora.md) |
| | `POST /api/periodos` (cargar o actualizar un período; cuerpo: CSV) | admin | [carga.md](../contracts/carga.md) |
| IA | `GET /api/ia/estado`, `GET /api/ia/guia` | todos | [ia.md](../contracts/ia.md), [guia.md](../contracts/guia.md) |
| | `POST /api/ia/preguntar` (agente; con límite de pedidos) | todos | [ia.md](../contracts/ia.md) |
| | `GET /api/explicaciones` (explicación de los movimientos; con límite de pedidos) | analista, admin | [ia.md](../contracts/ia.md) |
| MCP | `POST /api/mcp` (MCP remoto, sin estado; perfil con `?perfil=`) | según `perfil` | [`src/mcp/README.md`](src/mcp/README.md) |

Sin `periodo`, las consultas usan el último período cargado. `/api/calidad` y las descargas son la excepción: traen todos los períodos.

## Estructura

```
src/engine/            JS puro, sin Express ni disco: recibe textos y devuelve objetos
  csv.js               lectura como texto (bom: true, sin conversión de tipos) y ErrorDeDatos
  catalogos.js         bancos, CINU, SB21 y diccionario
  validacion.js        esquema de 61 columnas, tipos e integridad referencial (alertas)
  cascada.js           exclusiones E1 -> E2 -> E3 -> E4
  clasificacion.js     cruce CINU + regla SB21 de CONSUMO
  agregacion.js        sumas en centavos enteros
  rankings.js          rankings (12 bancos), ponderación y desglose por subactividad
  reconciliaciones.js  R1, R2, R3 y unicidad
  indicadores.js       morosidad, vencimientos y concentración (HHI, top 3); análisis adicional
  exportar.js          CSV de los entregables
  montos.js            centavos enteros y porcentajes con BigInt (half-up)
  index.js             punto de entrada: leerAT03, procesarPeriodo, procesarArchivo
src/datos/             disco y memoria
  paquete.js           lectura de la carpeta data/
  almacen.js           períodos procesados en memoria (guardar, obtener, fechas, todos)
  cargaPeriodo.js      carga de un período nuevo y recarga de storage/periodos al arrancar
  bitacora.js          registro de operaciones (storage/operaciones.jsonl)
  storage.js           carpeta de persistencia (STORAGE_DIR; temporal durante npm test)
src/automation/        sobre resultados del motor, sin releer los AT03
  movimientos.js       comparación entre períodos (Cambio_Posicion, Var_Saldo, Var_Saldo_Pct)
  reglaMovimientos.js  regla de movimiento significativo (config/parametros.json o la del Administrador)
  descomposicion.js    Var_Saldo partido en nuevos + salen + amortización (suma exacta)
  verificacion.js      datos y chequeos para el modo verificación del jurado
  publicacion.js       gancho tras cada carga (alertas por correo, #7)
src/ai/                IA que explica y consulta; nunca calcula (ver src/ai/README.md)
src/mcp/               servidor MCP con las mismas herramientas de solo lectura del agente
src/middleware/        perfiles.js (X-Perfil y control de acceso) y limitePedidos.js (429 de la IA)
src/routes/            endpoints; parametros.js valida los filtros de la consulta (periodo, ranking, banco), formato.js da el formato de los contratos, errores.js el formato común de errores
src/docs/openapi.js    documento OpenAPI que sirve /api/docs
src/app.js             crearApp({ almacen, obtenerMovimientos, opcionesIA, opcionesMcp, limiteIA }); las rutas nuevas van antes de los manejadores de errores
src/servidor.js        arranque: procesa data/, recarga storage/, registra la carga inicial y levanta la API
scripts/procesar.js    script de consola de las exportaciones
scripts/humo.js        prueba de humo contra una app levantada o desplegada
evals/agente/          evaluación del agente de IA
tests/                 pruebas (node:test); tests/referencia solo se usa en pruebas
```

## Uso del motor desde la API o la automatización

```js
import { cargarCatalogos, leerAT03, procesarPeriodo, calcularIndicadores } from './src/engine/index.js';

const catalogos = cargarCatalogos({ bancos, cinu, sb21, diccionario }); // textos de los 4 CSV
const periodos = leerAT03(textoAT03, catalogos, 'AT03_sintetico_202610.csv'); // [{ fecha, filas }]
const resultado = procesarPeriodo(periodos[0].filas, catalogos);
almacen.guardar(resultado); // así se publica un período nuevo, sin tocar código
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

Los montos vienen en **centavos enteros** y la ponderación en **diezmilésimas**. Para mostrarlos se usan `formatearCentavos` (2 decimales) y `formatearE4` (4 decimales). Si el archivo es inválido, se lanza `ErrorDeDatos` con un mensaje claro y `detalles` (por ejemplo, la columna o la fila con problemas); la API lo responde como `422 ARCHIVO_INVALIDO`.

`calcularIndicadores(periodo, catalogos, { ranking })` devuelve la morosidad, los vencimientos y la concentración de un período ya procesado. Es la base de `GET /api/indicadores`.

## Evaluación del agente de IA

Mide si el agente responde bien las preguntas típicas del jurado, sin inventar números y respetando los perfiles. Las respuestas esperadas no están en el repo (R2): cada caso las pide a la API en el momento.

```bash
npm run eval:agente                                  # lista los casos y lo esperado; no llama a la IA
npm run eval:agente -- --confirmar                   # evalúa de verdad: requiere ANTHROPIC_API_KEY y tiene costo
npm run eval:agente -- --confirmar --categoria guia  # solo una categoría
```

- **Sin IA disponible:** avisa "No se evaluó nada" y termina con código 1.
- **Reporte:** queda en `storage/evals/`.
- **Detalle:** en [`evals/agente/README.md`](evals/agente/README.md).

## Reglas implementadas

- **Lectura:** todo como texto (los códigos conservan los ceros, `NA` es texto) y se quita el BOM, que traen los catálogos y el diccionario.
- **Período:** sale del campo `Fecha`, no del nombre del archivo.
- **Validación:** 61 columnas con el nombre y el orden del diccionario.
  - Si `Fecha` o `Saldo` son inválidos, se rechaza el archivo; otros tipos dan alerta.
  - Un banco o una facilidad fuera de catálogo dan alerta, no exclusión.
- **Cascada:** se verifica `leídas = E1+E2+E3+E4+universo`, y cada fila cuenta solo en el primer filtro que incumple.
  - E1: duplicados; se conserva la primera ocurrencia en orden de archivo.
  - E2: `Destino` distinto de `L`.
  - E3: `Saldo <= 0`.
  - E4: `Tipo_Actividad` fuera del CINU.
- **Clasificación:** `Tipo_Actividad = Codigo_CINU`; nunca `Codigo_SB08_Referencia`.
- **Regla SB21:** Crédito personal con facilidad `07` pasa a Tarjeta. Una Tarjeta sin `07` o un Automóvil sin `03` dan alerta y conservan la subactividad.
- **Ponderación:** el denominador es todo el universo válido del banco. Se redondea half-up a 4 decimales con BigInt.
- **Ranking:** saldo descendente y, en empate, `Codigo_Banco` ascendente. Siempre salen los 12 bancos (0.00 si no tienen saldo).
- **Movimientos:**
  - `Cambio_Posicion = Posicion_anterior − Posicion_actual` (positivo = sube).
  - `Var_Saldo_Pct` va con 4 decimales y es `null` si el saldo anterior es 0.
  - La regla de movimiento significativo es configurable por el Administrador: `|Cambio_Posicion|`, cambio de líder y `|Var_Saldo_Pct|`.
- **Indicadores (análisis adicional):** se calculan sobre el universo válido.
  - Los tramos `Monto_Vencido_*` y `Monto_por_Vencer_*` salen del diccionario, y en cada préstamo suman su `Saldo`.
  - HHI = `Σ (participación en %)²`, de 0 a 10000.
