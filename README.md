# Rankings de Crédito · Hackathon SBP 2026

App web que toma los archivos sintéticos AT03 (julio, agosto y septiembre de 2026, 12 bancos ficticios) y genera rankings de crédito por banco y actividad económica. Compara períodos, señala movimientos significativos, tiene 3 perfiles (Público, Analista, Administrador) y exporta los entregables en CSV.

> **Datos ficticios · Uso informativo, no opinión formal de la SBP.** La app lo muestra siempre, junto con la fuente y el período.

## Información del reto

Todo lo que entregó la SBP está en [`info/`](info/):

| Archivo | Contenido |
| :--- | :--- |
| [`info/INDICACIONES_RETO_RANKING_CREDITO.md`](info/INDICACIONES_RETO_RANKING_CREDITO.md) | Reglas de cálculo, entregables y evaluación. **Manda sobre la presentación.** |
| `info/Hackathon_SBP_2026.pptx` | Presentación del reto: módulos, perfiles, lineamientos técnicos |
| `info/datos/` | AT03 de los 3 períodos, catálogo CINU/SB109, tabla SB21, bancos y diccionario de datos |

## Arquitectura

```
                 navegador
                     │
        ┌────────────▼─────────────┐
        │ client (React + Vite)    │  shadcn/ui, Tailwind, react-router
        │ en Docker: nginx :80     │  /api/* ──► server
        └────────────┬─────────────┘
                     │ HTTP (JSON y CSV) · header X-Perfil
        ┌────────────▼─────────────┐
        │ server (Node.js+Express) │  rutas, perfiles, bitácora, movimientos
        │ :3001                    │
        │   └─ engine/  motor puro │  cascada E1–E4, CINU, SB21, rankings,
        │                          │  ponderación, reconciliaciones
        └──────┬─────────────┬─────┘
               │             │
        data/ (CSV AT03   storage/ (períodos cargados,
        y catálogos)      bitácora, parámetros)
```

- **Motor determinista:** recibe los textos de los CSV y devuelve objetos. Suma en centavos enteros y calcula la ponderación con BigInt. No escribe a mano ningún saldo, posición ni porcentaje (R2).
- **Al arrancar,** el server procesa todos los AT03 de `data/`. Un período nuevo se carga desde la app (perfil Administrador) sin tocar código.
- **El client solo habla con el API** por los contratos de [`contracts/`](contracts/). En desarrollo puede usar esos ejemplos como mocks (`VITE_USAR_MOCKS=true`). El build de producción nunca los incluye.

## Cómo correrlo

### Con npm (local)

Requiere Node.js 22 o superior.

```bash
cp .env.example .env   # opcional: todo vacío usa los valores por defecto
npm install            # instala la raíz, server/ y client/
npm run dev            # API en http://localhost:3001 y app en http://localhost:5173
```

| Script (raíz) | Qué hace |
| :--- | :--- |
| `npm run dev` | server y client juntos, recargando al guardar |
| `npm start` | solo el server (API) |
| `npm test` | pruebas del server, incluida la autoverificación de la sección 12 |
| `npm run build` | build de producción del client |

### Con Docker (local)

```bash
docker compose up --build   # app en http://localhost:8080
```

- `docker-compose.yml` levanta dos servicios:
  - `sbp-server`: el API, con su healthcheck en `/api/salud`;
  - `sbp-client`: nginx, que sirve la app y pasa `/api/` al server.
- Los períodos cargados, la bitácora y los parámetros se guardan en el volumen `sbp-storage`, montado en `/app/storage`. No se pierden al reiniciar ni al reconstruir.
- `docker-compose.override.yml` solo publica el puerto local del client. Se cambia con `CLIENT_PORT`.

### En Dokploy

La app está desplegada en **https://sbp.juank.tech** (proyecto `hackathon-sbp`, servicio Compose `sbp-app`). Usa el mismo `docker-compose.yml`:

1. Servicio **Compose** desde el repo de GitHub, rama `main` y ruta `./docker-compose.yml`. Cada push a `main` (cada PR que se mezcla) lo vuelve a desplegar solo.
2. En **Environment** van solo las variables que se usan: `ANTHROPIC_API_KEY` (y si se quiere `AI_MODEL`) para la IA, y para las alertas por correo `ZAPIER_WEBHOOK_URL` y `APP_URL=https://sbp.juank.tech` (la dirección de los enlaces de confirmar y darse de baja). Nunca van en el repo (R5). `docker-compose.yml` le pasa al server cada una; una prueba (`server/tests/despliegue.test.js`) avisa si el código lee una variable que el compose no pasa.
3. En **Domains**, el dominio apunta al servicio `sbp-client`, puerto `80`, con HTTPS (Let's Encrypt).
4. El volumen `sbp-storage` (períodos cargados, bitácora y parámetros) persiste entre redeploys: el servicio no usa nombres aleatorios (`randomize` apagado).

Prueba rápida después de desplegar:

```bash
curl https://sbp.juank.tech/api/salud                                  # ok y los períodos cargados
curl https://sbp.juank.tech/api/ia/estado                              # ia_disponible: true si hay llave
curl -o /dev/null -w '%{http_code}\n' https://sbp.juank.tech/api/exportar/movimientos.csv   # 403 para Público
```

## Variables de entorno

Todas están en [`.env.example`](.env.example), vacías y con su valor por defecto.

| Grupo | Variables |
| :--- | :--- |
| Server | `PORT` (3001), `DATA_DIR` (`data/`), `STORAGE_DIR` (`storage/`), `PARAMETROS_FILE` (regla de movimientos) |
| IA | `ANTHROPIC_API_KEY`, `AI_MODEL` |
| Alertas | `ZAPIER_WEBHOOK_URL` (webhook de Zapier, #7) |
| Client | `VITE_USAR_MOCKS`, `API_URL` (destino del proxy en desarrollo) |
| Docker | `CLIENT_PORT` (8080) |

## Estructura

```
/info              paquete original de la SBP (no se modifica)
/data              CSV que lee la app (copia de info/datos)
/contracts         formatos JSON y CSV del API, con ejemplos
/server            Node.js + Express
  /src/engine      motor de cálculo puro
  /src/routes      endpoints del API
  /src/middleware  perfiles y control de acceso
  /src/automation  comparación entre períodos y regla de movimientos
  /src/ai          explicación y exploración con IA
  /tests           pruebas (node:test)
/client            React + Vite + shadcn/ui
  /src/styles/tema.css   paleta (tokens de shadcn y propios)
  /public/marca          logo, íconos e ilustraciones
/presentacion/assets     fondos y logo para las láminas
/scripts                 utilidades de la raíz (carga del .env)
```

Los CSV se guardan sin conversión de fin de línea (`.gitattributes`). Si los abres en Excel, se borran los ceros a la izquierda de los códigos (`07` pasa a `7`); impórtalos siempre como texto.

## Reglas implementadas

El detalle está en [`server/README.md`](server/README.md#reglas-implementadas). En resumen:

- **Lectura y validación:**
  - todo se lee como texto (los códigos conservan los ceros) y se quita el BOM de los catálogos;
  - el archivo debe tener las 61 columnas en el orden del diccionario;
  - el período sale del campo `Fecha`;
  - un banco o una facilidad fuera de catálogo es alerta, no exclusión.
- **Exclusiones en cascada:** E1 duplicados (se conserva la primera ocurrencia), E2 `Destino ≠ L`, E3 `Saldo ≤ 0` y E4 actividad fuera del CINU. Cada fila cuenta una sola vez y se verifica `leídas = E1 + E2 + E3 + E4 + universo válido`.
- **Clasificación:** `Tipo_Actividad = Codigo_CINU`. La regla SB21 pasa el Crédito personal con facilidad `07` a Tarjeta. Una Tarjeta sin `07` o un Automóvil sin `03` dan alerta y no se excluyen.
- **Rankings:** 6 rankings con los 12 bancos, ordenados por saldo descendente, con desempate por `Codigo_Banco`. La ponderación usa como denominador toda la cartera local válida del banco y se redondea a 4 decimales.
- **Reconciliaciones:** R1 (subactividades = actividad), R2 (actividades = total del banco), R3 (bancos = universo) y unicidad de `Numero_Prestamo`, todas al centavo.

## Movimiento significativo

Se compara cada ranking entre períodos consecutivos (julio → agosto y agosto → septiembre; también julio → septiembre):

- `Cambio_Posicion = Posicion_anterior − Posicion_actual`. Un valor positivo significa que el banco sube.
- `Var_Saldo = Saldo_actual − Saldo_anterior`.
- `Var_Saldo_Pct = Var_Saldo / Saldo_anterior × 100`. Si el saldo anterior es 0, el porcentaje es `null`.

Un movimiento es **significativo** si cumple al menos uno de estos criterios:

| Criterio | Parámetro | Por defecto |
| :--- | :--- | :---: |
| Cambio de posición en valor absoluto ≥ N | `min_cambio_posicion_abs` | 2 |
| Cambio de líder (marca al anterior y al nuevo) | `cambio_lider` | `true` |
| Variación de saldo en valor absoluto ≥ N % | `min_var_saldo_pct_abs` | 10 |

La regla **no está fija en el código**: vive en `server/config/parametros.json` (o en el archivo que indique `PARAMETROS_FILE`), el Administrador la cambia desde la app y se aplica sin reiniciar. Un umbral en `null` desactiva su criterio. Un umbral en `0` marca todo lo que cambió, pero un cambio de 0 (de posición o de `Var_Saldo_Pct`) nunca es significativo: con umbral 0 no se marcan todos los bancos. Cada respuesta de `/api/movimientos` incluye la regla que se usó.

## Perfiles

| Perfil | Puede |
| :--- | :--- |
| Público | consultar rankings, filtrar, ver gráficos y tablas, descargar |
| Analista | además comparar entidades y períodos y generar reportes personalizados |
| Administrador | además cargar o actualizar un período, administrar parámetros y catálogos y ver la bitácora |

- La app usa un selector de perfil y lo envía en el header `X-Perfil`. No hay contraseñas.
- `GET /api/perfil` le dice a la UI qué opciones mostrar.
- El backend responde 403 (`PERFIL_NO_AUTORIZADO`) a lo que el perfil no puede hacer. Por ejemplo, como Público no se puede cargar un período.

## Uso de IA

La IA **nunca calcula** rankings, saldos ni posiciones (sección 9). Solo:

- **explica los movimientos principales:** hay plantillas por reglas, y la IA las redacta mejor. Un verificador comprueba que todo número del texto exista en la respuesta del motor; si alguno no existe, se usa la versión por reglas;
- **responde preguntas en lenguaje natural:** consulta los endpoints del motor como herramientas.

Sin `ANTHROPIC_API_KEY`, la app funciona igual: usa las explicaciones por reglas y muestra "IA no disponible".

## Identidad visual

- **Paleta D:** índigo y dorado, inspirada en el sitio de la SBP, con tipografía Roboto. Está en `client/src/styles/tema.css`, con los nombres de tokens de shadcn/ui más los propios: `sube`, `baja`, `igual`, `destacado` y `aviso`. Cumple contraste 4.5:1 en modo claro y en oscuro.
- **Logo y assets:** el logo, las ilustraciones, la imagen para compartir y los fondos de la presentación se hicieron con Higgsfield. La app no usa el logo ni la marca de la SBP.

## Cómo contribuir

- Una rama por issue (`feat/<n>-descripcion`) y un PR que cierra el issue (`Closes #n`).
- Las cadenas de cambios dependientes se manejan con [`gh stack`](https://github.com/github/gh-stack):
  - `gh stack add <rama>` crea una capa;
  - `gh stack submit --auto` crea los PRs;
  - `gh stack sync` sincroniza después de un merge.
- Nunca subas contraseñas, tokens ni llaves (R5). El `.env` y `storage/` están en `.gitignore`.

## Equipo

| Integrante | Partes |
| :--- | :--- |
| **Jesús** | Motor de cálculo (ingesta, cascada E1–E4, CINU y SB21, rankings, ponderación, reconciliaciones, exportaciones, autoverificación) y API: consulta, descargas, perfiles, bitácora, carga de período y movimientos |
| **Juan** | Repo y estructura, front base (layout, navegación, cliente del API, estados), identidad visual y paleta, assets con Higgsfield, scripts y `.env.example`, Docker y Dokploy, README |
| **Agustín** | Contrato de movimientos, módulos del front, perfiles en la UI, IA para explicar y explorar, e indicadores y funciones extra |
