# Guion de la demo en vivo · Hackathon SBP 2026

Demo de unos 10 minutos para el criterio 7 (issue #71), con tiempos, clics exactos, quién habla y qué debe verse. Va junto al deck ([`deck.pptx`](deck.pptx)): la lámina 6 ("Demo en vivo") es el cambio al navegador.

> **Regla de oro (R2):** ninguna cifra se dice de memoria. Todo número sale de la pantalla o de una exportación que se está mostrando. Los datos son ficticios y la app lo dice en cada página.

> **Dos sitios, dos pestañas:** la app son dos sitios (#120). El **público** (`http://localhost:5173`) no pide login y siempre es perfil Público. El **interno** (`http://localhost:5174`) es para Analista y Administrador y pide iniciar sesión en `/entrar`. En todo el guion, "5173" es el público y "5174" es el interno. Ya no hay selector de perfil: el perfil sale de la cuenta con la que se entra.

> **Antes del ensayo:** las etiquetas de este guion se revisaron contra el código de `main` (`client/src/sitios/`, el menú de `client/src/components/layout/navegacion.js`, `SesionUsuario.jsx` y `paginas/Entrar.jsx`). En el ensayo, confirma que se ven igual en la máquina de la demo y, si algo cambió, corrige este guion en el mismo PR.

## Resumen de tiempos y reparto

Quien maneja el teclado en **toda** la demo es Juan (un solo computador, sin cambios de pantalla). Cada quien habla de lo suyo, según la tabla "Equipo" del [README](../README.md#equipo).

| Tiempo | Bloque | Habla | Qué debe verse |
| :--- | :--- | :--- | :--- |
| 0:00–0:40 | 1. Apertura | Juan | Sitio público local (5173), fuente, período y aviso de datos ficticios |
| 0:40–1:40 | 2. Perfiles | Agustín (UI) y Jesús (403) | El público no tiene Administración (404); el interno pide login y el Administrador sí la ve |
| 1:40–3:10 | 3. Cargar septiembre | Jesús | En el interno (5174): cascada E1–E4 del período nuevo y cambios de ranking |
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
| **Jesús** | Motor (cascada, CINU, SB21, rankings, ponderación, reconciliaciones, exportaciones, autoverificación) y API (consulta, descargas, perfiles y sesión, bitácora, carga de período y movimientos) | `server/src/engine/cascada.js`, `clasificacion.js`, `rankings.js`, `montos.js`, `reconciliaciones.js`; `server/src/middleware/perfiles.js`, `server/src/auth/`; `server/src/datos/cargaPeriodo.js` |
| **Juan** | Repo y estructura, front base (layout, navegación, cliente del API, estados), identidad y assets, scripts, Docker y Dokploy, login y los dos sitios, README | `docker-compose.yml`, `client/Dockerfile`, `client/nginx.publico.conf` y `nginx.interno.conf`; `client/src/sitios/`; `client/src/api/cliente.js`; `client/src/components/layout/`; `client/src/styles/tema.css` |
| **Agustín** | Contrato de movimientos, módulos del front, perfiles en la UI, IA (explicar y explorar), cursor guía, MCP, indicadores y extras | `server/src/ai/` (`verificador.js`, `agente.js`, `guia.js`); `client/src/guia/`; `server/src/automation/movimientos.js`; `client/src/paginas/` |

**Repaso cruzado (30 minutos antes de presentar):** cada uno explica su parte en 2 minutos a los otros dos. Después, cada uno responde en voz alta tres preguntas que no son suyas: por qué la cascada E1–E4 va en ese orden, cómo comprueba la IA que no inventa números y cómo se despliega la app (tres servicios, dos sitios).

## Antes de la demo

### T–30 min: dejar la app lista (R1)

1. En el repo, rama `main` al día, `npm install` hecho y el `.env` de la raíz (nunca se sube al repo, R5) con:
   - **`USUARIOS`, con un administrador y un analista locales.** Se genera cada cuenta con `npm run usuarios --prefix server -- admin admin` y `npm run usuarios --prefix server -- analista analista` (cada uno imprime su línea `USUARIOS=usuario:perfil:clave` y la contraseña). En el `.env` van las dos entradas separadas por coma: `USUARIOS=admin:admin:<clave>,analista:analista:<clave>`. Sin `USUARIOS`, y sin `DATABASE_URL` o sin internet, nadie entra al sitio interno. Con `DATABASE_URL` (Supabase) y red, las cuentas salen de `interno.usuarios`; `USUARIOS` es el respaldo.
   - `ANTHROPIC_API_KEY`, si se quiere mostrar la IA.
   - Opcional: `SESION_SECRETO` (cualquier texto largo). Sin él, la sesión se pierde si el server se reinicia.
2. Levantar la app con **solo julio y agosto** cargados:

   ```bash
   node presentacion/preparar-demo.mjs
   ```

   El script copia julio, agosto y los catálogos a una carpeta temporal, deja `AT03_sintetico_202609.csv` aparte e imprime su ruta (la de "Para subir en vivo"). Avisa si `USUARIOS` y `DATABASE_URL` están vacíos en el `.env`. Luego levanta `npm run dev` con esa carpeta como `DATA_DIR` y una carpeta `storage` vacía: el sitio público en `http://localhost:5173` y el interno en `http://localhost:5174`. Para repetir el ensayo desde cero, vuelve a correrlo.
3. Comprobar:
   - el selector de período del encabezado muestra **2 períodos** (julio y agosto de 2026);
   - `curl http://localhost:3001/api/periodos` devuelve 2 períodos;
   - `http://localhost:5174/entrar` abre el inicio de sesión ("Sitio interno para Analistas y Administradores. Datos ficticios.") y entran las dos cuentas: el encabezado muestra el usuario y su perfil;
   - si hay llave, `curl http://localhost:3001/api/ia/estado` dice `ia_disponible: true`.
4. Preparar el respaldo en CSV (plan B) fuera del repo:

   ```bash
   cd server && npm run procesar -- --datos ../data --salida /tmp/sbp-respaldo   # en Windows: %TEMP%\sbp-respaldo
   ```

   Escribe `rankings.csv`, `desglose_subactividades.csv`, `calidad.csv`, `excluidas.csv`, `alertas.csv`, `movimientos.csv` y `descomposicion_movimientos.csv`.

### T–10 min: el escenario

- Navegador a pantalla completa, zoom 110 a 125 %, tema claro, notificaciones apagadas.
- Pestaña 1: `http://localhost:5173` (el sitio público, la demo). Pestaña 2: `http://localhost:5174` (el sitio interno), idealmente **ya con la sesión de Administrador iniciada** (dura 8 horas). Pestaña 3: `https://sbp.juank.tech` (plan B). Pestaña 4: `http://localhost:3001/api/docs` (Swagger).
- El deck abierto en la lámina 6 y una copia en PDF a mano.
- El selector de archivos del sistema ya sabe dónde está `AT03_sintetico_202609.csv` (la ruta que imprimió el script).
- Zapier (opcional, issue #7): solo si hay `ZAPIER_WEBHOOK_URL` en el `.env` de la máquina de la demo. Si no, se omite sin avisar.

## Guion minuto a minuto

### 1. Apertura (0:00–0:40) · Juan

- **Clics:** ninguno. La pestaña 1 es el **sitio público** (`localhost:5173`): está en `/` (Panel), sin iniciar sesión, con perfil Público y el último período cargado (agosto de 2026).
- **Decir:** "Esto corre en local, en esta máquina (R1): fíjense en la barra de direcciones. Este es el sitio público: no pide login y siempre es perfil Público. Arriba siempre están la fuente, el período y el aviso de datos ficticios; es lo que pide la lámina 9 del reto. Ahora tenemos cargados julio y agosto; septiembre lo vamos a cargar en vivo."
- **Debe verse:** `localhost:5173`, la barra de fuente con "Datos ficticios · Uso informativo, no opinión formal de la SBP" y el selector de período con dos opciones.

### 2. Perfiles (0:40–1:40) · Agustín y Jesús

1. **Agustín.** En el sitio público (5173), señala el menú lateral: Panel, Rankings, Reportes, Calidad de datos y Verificación del jurado. **No aparecen** "Comparar períodos" ni "Administración", y en el encabezado no hay inicio de sesión: el público siempre es Público.
2. Escribe `localhost:5173/admin` en la barra de direcciones. Cae en **"Página no encontrada"** (Error 404): el sitio público no tiene esa ruta. "El sitio interno, en cambio, pide iniciar sesión."
3. **Jesús.** "La pantalla es una comodidad. Lo que protege es el servidor." En una terminal (ya abierta, lista para pegar):

   ```bash
   curl -i -X POST http://localhost:5173/api/periodos
   ```

   Debe responder `403` con `PERFIL_NO_AUTORIZADO` ("Esta opción es solo para el perfil Administrador. Tu perfil es Público."): el proxy del sitio público agrega `X-Sitio: publico` y el rechazo queda en la bitácora. Opcional: el mismo `POST` a `http://localhost:5174/api/periodos`, sin sesión, responde `401 SESION_REQUERIDA`. "La tabla de opciones por perfil está en un solo lugar: `server/src/middleware/perfiles.js`, y la sesión en `server/src/auth/`."
4. **Agustín.** Pasa a la pestaña 2, el **sitio interno** (`localhost:5174`). Sin sesión, redirige a `/entrar`; si la sesión ya estaba iniciada, abre `SesionUsuario` en el encabezado y elige **Salir** (vuelve a `/entrar`). Inicia sesión como **admin**. El encabezado muestra `SesionUsuario`: el usuario y su perfil (por ejemplo "admin · Administrador") y, al abrirlo, "Salir". Ahora el menú tiene "Comparar períodos" y "Administración".
   - **Comparar Analista con Administrador:** Salir y entrar con la cuenta de analista (tiene "Comparar períodos", pero no "Administración"); después volver a admin. Si falta tiempo, omitirlo y decirlo.
- **En el celular** (por debajo de 640 px de ancho) `SesionUsuario` (usuario, perfil y Salir) está dentro del menú, no en el encabezado.

### 3. Cargar septiembre (1:40–3:10) · Jesús

Es el **entregable 7**: procesar un período nuevo sin tocar código. **Solo en el sitio interno (5174), con la sesión de Administrador**: el público no tiene esta página.

1. Menú → **Administración**.
2. En la tarjeta **"Cargar o actualizar un período"**, clic en el campo de archivo y elige `AT03_sintetico_202609.csv` (la ruta de "Para subir en vivo").
3. Clic en **"Cargar período"**. Mientras dice "Procesando…" (un par de segundos, el archivo pesa unos 11 MB), explica: "El período sale del campo Fecha, no del nombre del archivo. Si el archivo no fuera válido, no se guarda nada y se ve el error."
4. Debe aparecer el resultado: el período de septiembre de 2026 marcado como **Nuevo**, la **cascada de exclusiones** con su cuadratura y la tabla de **cambios de ranking** por ranking (líder anterior, líder actual, "Nuevo líder" y movimientos significativos).
   - Señala la tabla de cambios y deja que la pantalla hable. En `server/tests/entregable7.test.js` está la prueba que cubre este mismo flujo (julio y agosto, y luego septiembre como Administrador).
5. Abre el **selector de período** del encabezado: ahora hay **3 períodos** y septiembre es el último.
6. Baja a **"Registro de operaciones"**: queda la carga (archivo, perfil, resultado y hora). "Esto es el registro básico del entregable 8." El **usuario** que la hizo también queda en el registro (campo `usuario` de `GET /api/bitacora`); la tabla de la pantalla muestra el perfil.
7. **Opcional, 20 s (issue #7):** si Zapier está activo, mostrar el correo o la fila nueva en la hoja del equipo. "Zapier solo reparte; la app decide qué es significativo."

### 4. Panel (3:10–4:00) · Agustín

- **Clic:** menú → **Panel**, en el interno (5174, sesión de Administrador).
- **Mostrar, en este orden:**
  1. Indicadores del último período (universo válido, saldo total y reconciliaciones).
  2. El líder de cada uno de los 6 rankings.
  3. Los movimientos significativos y su explicación (5174: son de Analista y Administrador).
  4. Los indicadores de **morosidad, concentración y vencimientos**, rotulados como "análisis adicional".
- **Lo de Público, en la pestaña 1 (5173), 10 s:** en el Panel, el aviso **"Opción del Analista"** ("Los movimientos entre períodos son una opción del perfil Analista. Está disponible en el sitio interno, para Analistas y Administradores."). Vuelve a la pestaña 2.
- **Decir:** "Los rankings oficiales son 6. Estos indicadores salen del mismo universo válido, pero no los sustituyen; por eso están rotulados aparte."

### 5. Rankings (4:00–5:00) · Agustín y Jesús

Sigue en la pestaña 2 (5174). Rankings, Calidad y Verificación son iguales en los dos sitios.

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

**Solo en el sitio interno (5174), con la sesión de Administrador** (Comparar es de Analista y Administrador; Administración, solo del Administrador).

1. **Agustín.** Menú → **Comparar períodos**. Elige desde **agosto**, hasta **septiembre** y un ranking (por ejemplo COMERCIO).
2. Muestra en orden: la **tabla ordenable de movimientos** (`Cambio_Posicion`, `Var_Saldo`, `Var_Saldo_Pct`, significativo y motivos), el cambio de líder, el **gráfico de evolución de posiciones**, la **descomposición** (clic en una fila de la tabla de movimientos para ver "Por qué cambió el saldo": préstamos nuevos, los que salen y amortización) y la comparación de **2 bancos** lado a lado.
3. **Jesús.** "¿Qué es significativo? Una regla que se cambia sin tocar código." Menú → **Administración** → tarjeta **"Regla de movimiento significativo"**:
   - cambia **"Cambio de posición mínimo"** a un valor más alto, clic en **"Guardar regla"**;
   - vuelve a **Comparar períodos**: ahora hay menos movimientos marcados como significativos;
   - regresa a Administración y clic en **"Restablecer"**.
- **Si falta tiempo:** omitir el paso 3 y mostrar la tarjeta sin cambiarla.

### 8. Modo verificación (7:00–7:50) · Jesús

- **Clic:** menú → **Verificación del jurado** (o `/verificacion` en la barra de direcciones). Está para los 3 perfiles, en el sitio público y en el interno.
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

Empieza en la pestaña 2 (5174, Administrador); el caso de Público va en la pestaña 1 (5173).

1. Clic en el botón redondo del asistente, **abajo a la derecha** (#127): el chat se abre encima de la pantalla, sin cambiar de página ni bloquearla. (El botón **"Asistente"** del encabezado abre el mismo chat en un panel lateral.)
2. **Pregunta de datos** (la escribe Agustín en el campo de la pregunta): `¿En qué rankings cambió el líder entre agosto y septiembre?`
   - Debe verse la respuesta con su etiqueta y las **consultas que usó la IA** (fuentes).
   - **Ojo, modo ejecutar (#137):** una pregunta de datos que se ve en el dashboard deja la pantalla lista al instante. Por ejemplo, salta a Rankings, elige septiembre, ordena y resalta. La página cambia sola; avísalo antes ("miren cómo deja la pantalla lista"). En el mensaje aparece **"Muéstrame cómo"**: deshace lo aplicado y lo demuestra paso a paso desde donde estaba.
   - **Decir:** "La IA consulta los endpoints del motor como herramientas. Un verificador comprueba que cada número exista en lo que devolvió el motor; si no, no se muestra. Nunca calcula. Las acciones en pantalla las valida el server contra el catálogo y el perfil."
3. **Pregunta de límites** (opcional, 15 s): `¿Cuál es el saldo promedio de los 12 bancos en HIPOTECARIO en septiembre?` La IA no debe calcularlo (sección 9).
4. **Cursor guía** (5174, como Administrador): pregunta `¿Cómo cargo un nuevo período?`. Según cómo responda la IA, pasa una de dos cosas:
   - **Modo demostrar (#137, lo más probable):** el cursor arranca solo, lleva a Administración y señala el campo para subir el archivo con un globo de texto. El botón del mensaje dice **"Ver de nuevo"** y se cierra con Esc (no hay flechas).
   - **Guía clásica (`guiar_usuario`):** aparece **"Mostrarme en la pantalla"**. Al hacer clic, el cursor recorre los pasos, se avanza con las flechas del teclado y se cierra con Esc.
   - **Decir:** "Solo señala lo que el perfil puede ver: en el sitio público, la misma pregunta no señala nada y explica que la carga es del Administrador." (Es el caso `guia-carga-publico` de la evaluación del agente.)
   - **Público, en la pestaña 1 (5173):** repite `¿Cómo cargo un nuevo período?`. La guía no señala la carga (`admin.subir-archivo`) y la respuesta dice que es del Administrador.
   - **Acceso en el prompt:** `sistemaPara` en `server/src/ai/agente.js` le explica a la IA los dos sitios: Público sin login y el interno con cuenta. Si la IA llegara a hablar de un "selector de perfil", aclara que ahora se entra con una cuenta en el sitio interno.
5. **Sin IA:** si no hay llave o falla la red, la app muestra "IA no disponible" y las explicaciones por reglas siguen funcionando en el Panel y en la página del Asistente. Ver el plan B.

### 10. Reportes (9:00–9:40) · Jesús

- **Clic:** menú → **Reportes**, en el interno (5174, Administrador).
- **Mostrar:**
  1. Tarjetas de los entregables: **Rankings** (2), **Desglose por subactividad** (3) y **Calidad de los datos** (4), además de filas excluidas y alertas. Clic en una descarga y abrir el CSV (importarlo con los códigos como texto: `07` no puede pasar a `7`).
  2. **Movimientos de posición** (entregable 5) y **Reporte personalizado** (períodos, rankings y bancos a la medida), que son de Analista y Administrador: se ven completas en 5174.
  3. **Público, en la pestaña 1 (5173), 10 s:** en Reportes esas dos tarjetas están bloqueadas con el aviso "Solo para los perfiles Analista y Administrador".
- **Decir:** "Los cinco entregables de exportación salen del mismo motor que la pantalla, con las columnas que pide la sección 10."

### 11. Cierre (9:40–10:00) · Juan

- **Clic:** vuelve al deck, a la última lámina.
- **Decir:** "Está publicada en `sbp.juank.tech`, el sitio público, y en `interno.sbp.juank.tech`, el sitio interno con login. En `/api/docs` está la API con Swagger y, pegando `/api/mcp` como conector en Claude, se consultan los rankings desde Claude: el del sitio público es de Público, por URL, y el del interno pide un token Bearer. Gracias."
- **Extras si sobra tiempo o a petición:** instalar la app en el celular (PWA) y la API en Swagger.

## Plan B

| Si falla… | Hacer |
| :--- | :--- |
| La red o la URL pública | La demo es **local** (R1) y no depende de la red, salvo la IA y, si no hay `USUARIOS` en el `.env`, el inicio de sesión (Supabase). Quedarse en `localhost:5173` (público) y `localhost:5174` (interno). |
| La IA (sin llave, sin red o `429 DEMASIADOS_PEDIDOS`) | La app muestra "IA no disponible" y sigue con las explicaciones por reglas (Panel y página del Asistente). Mostrar los casos de evaluación sin gastar llamadas: `cd server && npm run eval:agente`. Mostrar el verificador (`server/src/ai/verificador.js`) y sus pruebas (`server/tests/ai/`). Si es un `429`, esperar los segundos del header `Retry-After` (tope de 10 pedidos por minuto por IP). |
| La carga de septiembre desde la pantalla | Subirlo con `curl`: `curl -X POST http://localhost:3001/api/periodos -H "Content-Type: text/csv" -H "X-Perfil: admin" -H "X-Nombre-Archivo: AT03_sintetico_202609.csv" --data-binary @RUTA/AT03_sintetico_202609.csv`, y recargar la página. Es una llamada directa al API: solo desde esta máquina, fuera de pantalla, y solo con `npm run dev` (en Docker el API no publica el puerto 3001). Como evidencia: `cd server && node --test tests/entregable7.test.js`. |
| La app local no arranca (puerto ocupado, versión de Node) | `PORT=3002 node presentacion/preparar-demo.mjs`, o `docker compose up --build` y abrir el público en `http://localhost:8080` y el interno en `http://localhost:8081`, entrando con las cuentas de `USUARIOS` (Docker toma el `.env` de la raíz). Ahí ya están los 3 períodos: en Administración, volver a subir septiembre muestra **Actualización** en lugar de **Nuevo**. |
| El front completo | Trabajar con las exportaciones CSV de `/tmp/sbp-respaldo` (ver T–30), con la tabla que imprime `npm run procesar` (cascada, cuadraturas y líderes) y con Swagger en `http://localhost:3001/api/docs`. |
| Nadie entra al interno ("No se pudo verificar el usuario…" o credenciales que no entran) | Falta `USUARIOS` en el `.env` o Supabase no responde. Generar las cuentas con `npm run usuarios --prefix server -- <usuario> <analista\|admin>`, pegar la línea en el `.env` y volver a correr `node presentacion/preparar-demo.mjs` (vuelve a julio y agosto). Sin interno, mostrar en el público lo que no pide sesión y explicar el resto con la lámina 10. |
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
| ¿Cómo es la regla de movimiento significativo y quién la cambia? | Tres criterios (posiciones, cambio de líder, variación de saldo) con umbrales por defecto 2, `true` y 10 %. El Administrador los cambia en la app y aplican sin reiniciar. | `README.md#movimiento-significativo`, `server/config/parametros.json`, `server/src/automation/reglaMovimientos.js` |
| ¿Cómo se carga un período nuevo y qué pasa si el archivo es inválido? | `POST /api/periodos` (Administrador). Valida las 61 columnas y, si falla, responde `422 ARCHIVO_INVALIDO` y no guarda nada. | `server/src/datos/cargaPeriodo.js`, `server/src/engine/validacion.js`, `contracts/carga.md` |
| ¿Cómo controlan el acceso por perfil? | Dos sitios: el público no pide login y siempre es Público; el interno pide iniciar sesión y el perfil sale de la cuenta, en una cookie HttpOnly firmada. Los cambios llevan `X-Sbp` contra CSRF. El 403 sigue en el servidor, aunque se llame al API directo, y los rechazos quedan en la bitácora. | `server/src/auth/`, `server/src/middleware/perfiles.js`, `contracts/perfiles.md`, `server/tests/perfiles.test.js` |
| ¿Hay credenciales en el repo (R5)? | No. `.env` está en `.gitignore`; `.env.example` va vacío. La llave de IA, el webhook de Zapier, la conexión a Supabase, el secreto de sesión, las cuentas (`USUARIOS`) y el token del MCP viven en variables de entorno. En Supabase las contraseñas van con hash. | `.env.example`, `.gitignore`, `server/db/001_usuarios.sql`, `README.md#variables-de-entorno` |
| ¿Cómo reproducen los resultados? | `npm install` y `npm run dev` (público en :5173, interno en :5174), o `docker compose up --build` (:8080 y :8081). Para entrar al interno hace falta `USUARIOS` en el `.env`. Las pruebas corren sin red ni base de datos. | `README.md`, `server/README.md#pruebas`, `.github/workflows/ci.yml` |
| ¿Qué pasa si falla la IA o Zapier? | La app sigue: explicaciones por reglas con aviso, y la carga termina aunque Zapier falle. | `server/src/ai/README.md`, `contracts/eventos-zapier.md` |
| ¿Por qué no usan base de datos ni TypeScript? | La lámina 7 pide React, Node.js y JavaScript, y los datos suministrados son archivos: los rankings salen de archivos y el motor puro es más fácil de probar y de auditar. La única base de datos son los usuarios del sitio interno (Supabase, tabla `interno.usuarios`), con respaldo en `USUARIOS` para una demo sin internet. | `README.md#arquitectura`, `server/README.md#estructura`, `server/src/auth/usuarios.js` |
| ¿Cómo sabemos que el front y el API no se desalinean? | Los contratos JSON de `contracts/` se comparan con las respuestas reales de la API. | `server/tests/contratos.test.js`, `contracts/README.md` |
| ¿Qué hace el cursor guía y qué evita? | Señala elementos de la lista cerrada de `data-guia` que el perfil puede ver. La ruta la pone el catálogo, no la IA, y el backend valida cada paso. | `client/src/guia/README.md`, `server/src/ai/guia.js`, `contracts/guia.md` |
| ¿Cuántas pruebas tienen y qué cubren? | Pruebas del server con `node:test` (motor, API, perfiles, carga, movimientos, IA, MCP), pruebas del client y cobertura mínima de 90 / 85 / 90. Corre `npm test` y muestra el conteo en vivo. | `server/package.json` (`test`, `test:cobertura`), `.github/workflows/ci.yml` |
| ¿Cómo se despliega? | `docker-compose.yml` con tres servicios (`sbp-server`, `sbp-publico` y `sbp-interno`) y un volumen; cada sitio tiene su dominio y su nginx. Dokploy redespliega con cada push a `main`. | `README.md#en-dokploy`, `docker-compose.yml`, `client/nginx.publico.conf` y `nginx.interno.conf` |
| ¿Qué hay de la seguridad del MCP remoto? | Es de solo lectura y sin sesiones. El del sitio público es siempre Público, por URL; el del interno pide un token Bearer. Las herramientas consultan la API interna, no el header `Host`. | `server/src/routes/mcp.js`, `server/src/middleware/perfiles.js`, `server/src/ai/apiInterna.js` |

## Qué no decir

- No leer saldos, posiciones ni ganadores de memoria ni de este documento: no están aquí a propósito.
- No presentar los indicadores de morosidad, concentración y vencimientos como parte de los rankings oficiales.
- No decir que la IA "calcula" o "recomienda": consulta y explica.
- No afirmar que Zapier está activo si el webhook no está configurado en esa máquina.
- No hablar de un "selector de perfil" ni del header `X-Perfil` como forma de entrar: ya no existe en la UI (solo vale en llamadas directas al API desde la misma máquina). Entrar al interno es con usuario y contraseña.
- No decir que la IA "controla" la app libremente: las acciones de pantalla (#131 y #137: ir, elegir, ordenar, resaltar y señalar) son una lista cerrada que el server valida contra el catálogo y el perfil. El front las ejecuta en dos modos: **ejecutar** (deja la pantalla lista, con "Muéstrame cómo") y **demostrar** (cursor paso a paso).
- No leer ni mostrar contraseñas ni el `.env` en pantalla.
