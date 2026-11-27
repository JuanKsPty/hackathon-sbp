# Guion de la demo en vivo · Hackathon SBP 2026

Demo de unos 10 minutos para el criterio 7 (issue #71), con tiempos, clics exactos, quién habla y qué debe verse. Va junto al deck ([`deck.pptx`](deck.pptx)): la lámina 6 ("Demo en vivo") es el cambio al navegador.

> **Regla de oro (R2):** ninguna cifra se dice de memoria. Todo número sale de la pantalla o de una exportación que se está mostrando. Los datos son ficticios y la app lo dice en cada página.

> **Antes del ensayo:** los pasos de **Perfiles, Panel, Comparar y Modo verificación** se escribieron con los issues #4, #60, #61 y #63 y con los identificadores de [`contracts/guia.md`](../contracts/guia.md), porque esos módulos se estaban terminando. Cuando se mezclen, confirma las etiquetas exactas (nombre del menú, del selector de perfil y de los botones) y corrige este guion en el mismo PR. Las páginas de Rankings, Calidad, Administración, Reportes y Asistente ya están en `main` y sus etiquetas son las reales.

## Resumen de tiempos y reparto

Quien maneja el teclado en **toda** la demo es Juan (un solo computador, sin cambios de pantalla). Cada quien habla de lo suyo, según la tabla "Equipo" del [README](../README.md#equipo).

| Tiempo | Bloque | Habla | Qué debe verse |
| :--- | :--- | :--- | :--- |
| 0:00–0:40 | 1. Apertura | Juan | App local, fuente, período y aviso de datos ficticios |
| 0:40–1:40 | 2. Perfiles | Agustín (UI) y Jesús (403) | Público no ve Administración; el Administrador sí |
| 1:40–3:10 | 3. Cargar septiembre | Jesús | Cascada E1–E4 del período nuevo y cambios de ranking |
| 3:10–4:00 | 4. Panel | Agustín | Líderes, movimientos e indicadores adicionales |
| 4:00–5:00 | 5. Rankings | Agustín (módulo) y Jesús (SB21) | Filtros, gráfico, tabla ordenable y desglose con Tarjeta |
| 5:00–5:45 | 6. Calidad | Jesús | E1–E4 de los 3 períodos y reconciliaciones |
| 5:45–7:00 | 7. Comparar y regla | Agustín (módulo) y Jesús (regla) | Movimientos, evolución, descomposición y 2 bancos |
| 7:00–7:50 | 8. Modo verificación | Jesús | Los 6 puntos de la sección 11.1 con sus chequeos |
| 7:50–9:00 | 9. Asistente IA y cursor guía | Agustín | Respuesta con fuentes y el cursor señalando la pantalla |
| 9:00–9:40 | 10. Reportes | Jesús | Descargas de los entregables 2 a 5 |
| 9:40–10:00 | 11. Cierre | Juan | URL pública, MCP y Swagger |

Reparto por tema (R6: **todos** deben poder explicar el código, no solo su parte):

| Integrante | Explica | Si el jurado pide ver código, abre |
| :--- | :--- | :--- |
| **Jesús** | Motor (cascada, CINU, SB21, rankings, ponderación, reconciliaciones, exportaciones, autoverificación) y API (consulta, descargas, perfiles, bitácora, carga de período y movimientos) | `server/src/engine/cascada.js`, `clasificacion.js`, `rankings.js`, `montos.js`, `reconciliaciones.js`; `server/src/middleware/perfiles.js`; `server/src/datos/cargaPeriodo.js` |
| **Juan** | Repo y estructura, front base (layout, navegación, cliente del API, estados), identidad y assets, scripts, Docker y Dokploy, README | `docker-compose.yml`, `client/Dockerfile` y `nginx.conf`; `client/src/api/cliente.js`; `client/src/components/layout/`; `client/src/styles/tema.css` |
| **Agustín** | Contrato de movimientos, módulos del front, perfiles en la UI, IA (explicar y explorar), cursor guía, MCP, indicadores y extras | `server/src/ai/` (`verificador.js`, `agente.js`, `guia.js`); `client/src/guia/`; `server/src/automation/movimientos.js`; `client/src/paginas/` |

**Repaso cruzado (30 minutos antes de presentar):** cada uno explica su parte en 2 minutos a los otros dos. Después, cada uno responde en voz alta tres preguntas que no son suyas: por qué la cascada E1–E4 va en ese orden, cómo comprueba la IA que no inventa números y cómo se despliega la app.

## Antes de la demo

### T–30 min: dejar la app lista (R1)

1. En el repo, rama `main` al día, `npm install` hecho y el `.env` de la raíz con `ANTHROPIC_API_KEY` si se quiere mostrar la IA (nunca se sube al repo, R5).
2. Levantar la app con **solo julio y agosto** cargados:

   ```bash
   node presentacion/preparar-demo.mjs
   ```

   El script copia julio, agosto y los catálogos a una carpeta temporal, deja `AT03_sintetico_202609.csv` aparte e imprime su ruta (la de "Para subir en vivo"). Luego levanta `npm run dev` con esa carpeta como `DATA_DIR` y una carpeta `storage` vacía. Abre `http://localhost:5173`. Para repetir el ensayo desde cero, vuelve a correrlo.
3. Comprobar:
   - el selector de período del encabezado muestra **2 períodos** (julio y agosto de 2026);
   - `curl http://localhost:3001/api/periodos` devuelve 2 períodos;
   - si hay llave, `curl http://localhost:3001/api/ia/estado` dice `ia_disponible: true`.
4. Preparar el respaldo en CSV (plan B) fuera del repo:

   ```bash
   cd server && npm run procesar -- --datos ../data --salida /tmp/sbp-respaldo   # en Windows: %TEMP%\sbp-respaldo
   ```

   Escribe `rankings.csv`, `desglose_subactividades.csv`, `calidad.csv`, `excluidas.csv`, `alertas.csv`, `movimientos.csv` y `descomposicion_movimientos.csv`.

### T–10 min: el escenario

- Navegador a pantalla completa, zoom 110 a 125 %, tema claro, notificaciones apagadas.
- Pestaña 1: `http://localhost:5173` (la demo). Pestaña 2: `https://sbp.juank.tech` (plan B). Pestaña 3: `http://localhost:3001/api/docs` (Swagger).
- El deck abierto en la lámina 6 y una copia en PDF a mano.
- El selector de archivos del sistema ya sabe dónde está `AT03_sintetico_202609.csv` (la ruta que imprimió el script).
- Zapier (opcional, issue #7): solo si la rama de alertas ya está mezclada y hay `ZAPIER_WEBHOOK_URL` en el `.env`. Si no, se omite sin avisar.

## Guion minuto a minuto

### 1. Apertura (0:00–0:40) · Juan

- **Clics:** ninguno. La app está en `/` (Panel) con perfil Público y el último período cargado (agosto de 2026).
- **Decir:** "Esto corre en local, en esta máquina (R1): fíjense en la barra de direcciones. Arriba siempre están la fuente, el período y el aviso de datos ficticios; es lo que pide la lámina 9 del reto. Ahora tenemos cargados julio y agosto; septiembre lo vamos a cargar en vivo."
- **Debe verse:** `localhost:5173`, la barra de fuente con "Datos ficticios · Uso informativo, no opinión formal de la SBP" y el selector de período con dos opciones.

### 2. Perfiles (0:40–1:40) · Agustín y Jesús

1. **Agustín.** Con el perfil **Público**, señala el menú lateral: Panel, Rankings, Reportes y Calidad de datos. **No aparecen** "Comparar períodos" ni "Administración".
2. Escribe `localhost:5173/admin` en la barra de direcciones. Debe verse "Esta sección es solo para el perfil Administrador" y que cambies de perfil en el encabezado.
3. **Jesús.** "La pantalla es una comodidad. Lo que protege es el servidor." En una terminal (ya abierta, lista para pegar):

   ```bash
   curl -i -X POST http://localhost:3001/api/periodos -H "X-Perfil: publico"
   ```

   Debe responder `403` con `PERFIL_NO_AUTORIZADO` ("Esta opción es solo para el perfil Administrador. Tu perfil es Público."). "La tabla de opciones por perfil está en un solo lugar: `server/src/middleware/perfiles.js`."
4. **Agustín.** En el encabezado, abre el **selector de perfil** y elige **Administrador**. Ahora el menú tiene "Comparar períodos" y "Administración".
- **Si el selector aún no está:** hacer solo los pasos 2 y 3 y decir que el selector llega con el issue #4.

### 3. Cargar septiembre (1:40–3:10) · Jesús

Es el **entregable 7**: procesar un período nuevo sin tocar código.

1. Menú → **Administración**.
2. En la tarjeta **"Cargar o actualizar un período"**, clic en el campo de archivo y elige `AT03_sintetico_202609.csv` (la ruta de "Para subir en vivo").
3. Clic en **"Cargar período"**. Mientras dice "Procesando…" (un par de segundos, el archivo pesa unos 11 MB), explica: "El período sale del campo Fecha, no del nombre del archivo. Si el archivo no fuera válido, no se guarda nada y se ve el error."
4. Debe aparecer el resultado: el período de septiembre de 2026 marcado como **NUEVO**, la **cascada de exclusiones** con su cuadratura y la tabla de **cambios de ranking** por ranking (líder anterior, líder actual, "Nuevo líder" y movimientos significativos).
   - Señala la tabla de cambios y deja que la pantalla hable. En `server/tests/entregable7.test.js` está la prueba que cubre este mismo flujo (julio y agosto, y luego septiembre como Administrador).
5. Abre el **selector de período** del encabezado: ahora hay **3 períodos** y septiembre es el último.
6. Baja a **"Registro de operaciones"**: queda la carga (archivo, perfil, resultado y hora). "Esto es el registro básico del entregable 8."
7. **Opcional, 20 s (issue #7):** si Zapier está activo, mostrar el correo o la fila nueva en la hoja del equipo. "Zapier solo reparte; la app decide qué es significativo."

### 4. Panel (3:10–4:00) · Agustín

- **Clic:** menú → **Panel**.
- **Mostrar, en este orden:**
  1. Indicadores del último período (universo válido, saldo total y reconciliaciones).
  2. El líder de cada uno de los 6 rankings.
  3. Los movimientos significativos y su explicación (Administrador y Analista; el Público ve el aviso de que es de Analista).
  4. Los indicadores de **morosidad, concentración y vencimientos**, rotulados como "análisis adicional".
- **Decir:** "Los rankings oficiales son 6. Estos indicadores salen del mismo universo válido, pero no los sustituyen; por eso están rotulados aparte."

### 5. Rankings (4:00–5:00) · Agustín y Jesús

1. Menú → **Rankings**. Elige el ranking **CONSUMO** en el selector de rankings.
2. **Filtros:** en el filtro de banco elige uno. Después clic en otra barra del gráfico **"Saldos por banco"** (un clic en una barra filtra ese banco; otro clic lo quita).
3. **Tabla "Posición de los bancos":** clic en el encabezado de una columna para ordenarla.
4. **Jesús.** Baja a **"Desglose por subactividad"**. Lee el aviso de la regla SB21: "los créditos personales con facilidad 07 cuentan en Tarjeta… El total de la actividad no cambia." Aparece cuántas operaciones se reclasificaron, tomado de Calidad.
5. Clic en **"CSV de rankings"**: baja el entregable 2.
- **Cambiar de período:** en el selector del encabezado, elige agosto y mira cómo cambian la tabla y el gráfico (los 3 períodos están procesados).

### 6. Calidad de datos (5:00–5:45) · Jesús

- **Clic:** menú → **Calidad de datos**.
- **Mostrar:**
  1. **"Cascada de exclusiones por período":** filas leídas, E1, E2, E3, E4 y universo local válido de los 3 períodos. "Siempre: leídas = E1 + E2 + E3 + E4 + universo."
  2. **"Reconciliaciones":** R1, R2, R3 y unicidad, al centavo.
  3. **"Filas excluidas":** filtra por un motivo y señala que cada fila tiene su razón (exclusión auditable).
- **Decir:** "Los conteos independientes están rotulados aparte para no confundirlos con la cascada oficial."

### 7. Comparar períodos y regla configurable (5:45–7:00) · Agustín y Jesús

1. **Agustín.** Menú → **Comparar períodos**. Elige desde **agosto**, hasta **septiembre** y un ranking (por ejemplo COMERCIO).
2. Muestra en orden: la **tabla ordenable de movimientos** (`Cambio_Posicion`, `Var_Saldo`, `Var_Saldo_Pct`, significativo y motivos), el cambio de líder, el **gráfico de evolución de posiciones**, la **descomposición** (préstamos nuevos, los que salen y amortización) y la comparación de **2 bancos** lado a lado.
3. **Jesús.** "¿Qué es significativo? Una regla que se cambia sin tocar código." Menú → **Administración** → tarjeta **"Regla de movimiento significativo"**:
   - cambia **"Cambio de posición mínimo"** a un valor más alto, clic en **"Guardar regla"**;
   - vuelve a **Comparar períodos**: ahora hay menos movimientos marcados como significativos;
   - regresa a Administración y clic en **"Restablecer"**.
- **Si falta tiempo:** omitir el paso 3 y mostrar la tarjeta sin cambiarla.

### 8. Modo verificación (7:00–7:50) · Jesús

- **Clic:** abre `/verificacion` (menú **Verificación**, o la barra de direcciones).
- **Mostrar los 6 puntos de la sección 11.1**, cada uno con su chequeo (✓):
  1. **Calidad:** E1–E4 y universo válido por período.
  2. **Rankings obligatorios:** HIPOTECARIO, CONSTRUCCION, INDUSTRIA y AGROPECUARIO, con posición y saldo.
  3. **COMERCIO y CONSUMO.**
  4. **Ponderación:** total de cartera y ponderación por banco, con el mismo denominador en los 6 rankings.
  5. **Subactividades:** CONSUMO con Crédito personal, Automóvil y Tarjeta, y cuántas operaciones movió la regla SB21.
  6. **Los 3 períodos** con las reconciliaciones R1 y R2 cuadradas.
- **Banco:** elige el banco que el jurado pida (conserva su posición real) y vuelve a mostrar el punto 4.
- **Decir:** "El jurado va a pedir un dato de cada punto y, si no lo mostramos, cuenta como incorrecto. Aquí están los seis en una pantalla, y los chequeos usan siempre los 12 bancos."

### 9. Asistente IA y cursor guía (7:50–9:00) · Agustín

1. En el encabezado, clic en **"Asistente"**: se abre el panel lateral.
2. **Pregunta de datos** (la escribe Agustín en el campo de la pregunta): `¿En qué rankings cambió el líder entre agosto y septiembre?`
   - Debe verse la respuesta con su etiqueta y las **consultas que usó la IA** (fuentes).
   - **Decir:** "La IA consulta los endpoints del motor como herramientas. Un verificador comprueba que cada número exista en lo que devolvió el motor; si no, no se muestra. Nunca calcula."
3. **Pregunta de límites** (opcional, 15 s): `¿Cuál es el saldo promedio de los 12 bancos en HIPOTECARIO en septiembre?` La IA no debe calcularlo (sección 9).
4. **Cursor guía** (con el perfil Administrador): pregunta `¿Cómo cargo un nuevo período?` y clic en **"Mostrarme en la pantalla"**. El cursor lleva a Administración y señala el campo para subir el archivo, con un globo de texto. Se puede avanzar con las flechas del teclado y cerrar con Esc.
   - **Decir:** "Solo señala lo que el perfil puede ver: con el perfil Público, la misma pregunta no señala nada y explica que la carga es del Administrador." (Es el caso `guia-carga-publico` de la evaluación del agente.)
5. **Sin IA:** si no hay llave o falla la red, la app muestra "IA no disponible" y las explicaciones por reglas siguen funcionando en Panel y Comparar. Ver el plan B.

### 10. Reportes (9:00–9:40) · Jesús

- **Clic:** menú → **Reportes**.
- **Mostrar:**
  1. Tarjetas de los entregables: **Rankings** (2), **Desglose por subactividad** (3) y **Calidad de los datos** (4), además de filas excluidas y alertas. Clic en una descarga y abrir el CSV (importarlo con los códigos como texto: `07` no puede pasar a `7`).
  2. **Movimientos de posición** (entregable 5) y **Reporte personalizado** (períodos, rankings y bancos a la medida), que son de Analista y Administrador. Con el perfil Público, estas dos tarjetas muestran el aviso de que no corresponden.
- **Decir:** "Los cinco entregables de exportación salen del mismo motor que la pantalla, con las columnas que pide la sección 10."

### 11. Cierre (9:40–10:00) · Juan

- **Clic:** vuelve al deck, a la última lámina.
- **Decir:** "Está publicada en `sbp.juank.tech`. En `/api/docs` está la API con Swagger y, pegando `/api/mcp?perfil=analista` como conector en Claude, se consultan los rankings desde Claude. Gracias."
- **Extras si sobra tiempo o a petición:** instalar la app en el celular (PWA) y la API en Swagger.

## Plan B

| Si falla… | Hacer |
| :--- | :--- |
| La red o la URL pública | La demo es **local** (R1) y no depende de la red, salvo la IA. Quedarse en `localhost:5173`. |
| La IA (sin llave, sin red o `429 DEMASIADOS_PEDIDOS`) | La app muestra "IA no disponible" y sigue con las explicaciones por reglas (Panel y Comparar). Mostrar los casos de evaluación sin gastar llamadas: `cd server && npm run eval:agente`. Mostrar el verificador (`server/src/ai/verificador.js`) y sus pruebas (`server/tests/ai/`). Si es un `429`, esperar los segundos del header `Retry-After` (tope de 10 pedidos por minuto por IP). |
| La carga de septiembre desde la pantalla | Subirlo con `curl`: `curl -X POST http://localhost:3001/api/periodos -H "Content-Type: text/csv" -H "X-Perfil: admin" -H "X-Nombre-Archivo: AT03_sintetico_202609.csv" --data-binary @RUTA/AT03_sintetico_202609.csv`, y recargar la página. Como evidencia: `cd server && node --test tests/entregable7.test.js`. |
| La app local no arranca (puerto ocupado, versión de Node) | `PORT=3002 node presentacion/preparar-demo.mjs`, o `docker compose up --build` y abrir `http://localhost:8080` (ahí ya están los 3 períodos: en Administración, volver a subir septiembre muestra una **ACTUALIZACION** en lugar de una carga nueva). |
| El front completo | Trabajar con las exportaciones CSV de `/tmp/sbp-respaldo` (ver T–30), con la tabla que imprime `npm run procesar` (cascada, cuadraturas y líderes) y con Swagger en `http://localhost:3001/api/docs`. |
| Zapier | No mostrarlo. Explicar el contrato (`contracts/eventos-zapier.md`): si Zapier falla, la carga termina igual y el aviso queda en la bitácora. |
| El proyector o PowerPoint | El PDF del deck (Archivo → Exportar → PDF) y este guion impreso. |

## Preguntas probables del jurado

| Pregunta | Respuesta corta | Dónde está en el repo |
| :--- | :--- | :--- |
| ¿Cómo evitan que la IA invente números? | Un verificador compara cada número del texto con la respuesta del motor. Si no existe, se usa la frase por reglas o no se muestra. | `server/src/ai/verificador.js`, `server/src/ai/README.md`, `server/evals/agente/` |
| ¿Por qué el total de CONSUMO no cambia con la regla SB21? | La reclasificación solo mueve saldo entre subactividades (de Crédito personal a Tarjeta). | `server/src/engine/clasificacion.js`, `server/tests/autoverificacion.test.js`, sección 6 del reto |
| ¿Cómo garantizan exactitud al centavo? | Centavos enteros y ponderación con BigInt, redondeo half-up a 4 decimales. | `server/src/engine/montos.js`, `agregacion.js`, `server/tests/montos.test.js` |
| ¿De dónde sale el denominador de la ponderación? | De toda la cartera local válida del banco, antes de filtrar por ranking. Igual en los 6 rankings. | `server/src/engine/rankings.js`, `server/README.md#reglas-implementadas` |
| ¿Un préstamo en dos meses es un duplicado? | No. E1 se calcula por período (`Fecha`). | `server/src/engine/cascada.js`, sección 13 del reto |
| ¿Cómo prueban que no hay saldos fijados a mano (R2)? | Las cifras de control viven solo en `tests/referencia/`, nunca en el código de la app. | `server/tests/referencia/`, `server/README.md#pruebas` |
| ¿Cómo es la regla de movimiento significativo y quién la cambia? | Tres criterios (posiciones, cambio de líder, variación de saldo) con umbrales por defecto 2, `true` y 10 %. El Administrador los cambia en la app y aplican sin reiniciar. | `README.md#movimiento-significativo`, `server/config/parametros.json`, `server/src/automation/parametros.js` |
| ¿Cómo se carga un período nuevo y qué pasa si el archivo es inválido? | `POST /api/periodos` (Administrador). Valida las 61 columnas y, si falla, responde `422 ARCHIVO_INVALIDO` y no guarda nada. | `server/src/datos/cargaPeriodo.js`, `server/src/engine/validacion.js`, `contracts/carga.md` |
| ¿Cómo controlan el acceso por perfil, si no hay contraseñas? | Selector de perfil (R5), header `X-Perfil` y 403 en el servidor. Los rechazos quedan en la bitácora. | `server/src/middleware/perfiles.js`, `contracts/perfiles.md`, `server/tests/perfiles.test.js` |
| ¿Hay credenciales en el repo (R5)? | No. `.env` está en `.gitignore`; `.env.example` va vacío. La llave de IA y el webhook de Zapier viven en variables de entorno. | `.env.example`, `.gitignore`, `README.md#variables-de-entorno` |
| ¿Cómo reproducen los resultados? | `npm install` y `npm run dev`, o `docker compose up --build`. Las pruebas corren sin red ni base de datos. | `README.md`, `server/README.md#pruebas`, `.github/workflows/ci.yml` |
| ¿Qué pasa si falla la IA o Zapier? | La app sigue: explicaciones por reglas con aviso, y la carga termina aunque Zapier falle. | `server/src/ai/README.md`, `contracts/eventos-zapier.md` |
| ¿Por qué no usan base de datos ni TypeScript? | La lámina 7 pide React, Node.js y JavaScript, y los datos suministrados son archivos. El motor puro es más fácil de probar y de auditar. | `README.md#arquitectura`, `server/README.md#estructura` |
| ¿Cómo sabemos que el front y el API no se desalinean? | Los contratos JSON de `contracts/` se comparan con las respuestas reales de la API. | `server/tests/contratos.test.js`, `contracts/README.md` |
| ¿Qué hace el cursor guía y qué evita? | Señala elementos de la lista cerrada de `data-guia` que el perfil puede ver. La ruta la pone el catálogo, no la IA, y el backend valida cada paso. | `client/src/guia/README.md`, `server/src/ai/guia.js`, `contracts/guia.md` |
| ¿Cuántas pruebas tienen y qué cubren? | Pruebas del server con `node:test` (motor, API, perfiles, carga, movimientos, IA, MCP), pruebas del client y cobertura mínima de 90 / 85 / 90. Corre `npm test` y muestra el conteo en vivo. | `server/package.json` (`test`, `test:cobertura`), `.github/workflows/ci.yml` |
| ¿Cómo se despliega? | `docker-compose.yml` con dos servicios y un volumen; Dokploy redespliega con cada push a `main`. | `README.md#en-dokploy`, `docker-compose.yml` |
| ¿Qué hay de la seguridad del MCP remoto? | Es de solo lectura, sin sesiones, con el perfil como parámetro; las herramientas consultan la API interna, no el header `Host`. | `server/src/mcp/README.md`, `server/src/ai/apiInterna.js` |

## Qué no decir

- No leer saldos, posiciones ni ganadores de memoria ni de este documento: no están aquí a propósito.
- No presentar los indicadores de morosidad, concentración y vencimientos como parte de los rankings oficiales.
- No decir que la IA "calcula" o "recomienda": consulta y explica.
- No afirmar que Zapier está activo si el webhook no está configurado en esa máquina.
