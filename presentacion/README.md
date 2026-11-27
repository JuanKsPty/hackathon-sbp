# Presentación y demo (criterio 7, issue #71)

Todo lo que el equipo necesita para presentar: el deck, el guion de la demo en vivo y el script que deja la app lista para esa demo.

## Qué hay en la carpeta

| Archivo | Para qué sirve |
| :--- | :--- |
| [`deck.pptx`](deck.pptx) | El deck: 16:9, 15 láminas, con notas del orador en cada una. Es el archivo que se presenta. |
| [`guion.md`](guion.md) | Guion de la demo en vivo (unos 10 minutos): tiempos, clics exactos, quién habla, plan B y preguntas probables del jurado con la ruta donde está la respuesta. |
| [`generar_deck.py`](generar_deck.py) | Genera `deck.pptx` con python-pptx. Los textos, las notas y las cifras están en este archivo. |
| [`preparar-demo.mjs`](preparar-demo.mjs) | Deja la app corriendo con solo julio y agosto cargados, para cargar septiembre en vivo (entregable 7). |
| [`requirements.txt`](requirements.txt) | Dependencia de Python del generador (`python-pptx`). |
| [`assets/`](assets/) | Fondos de portada, sección y contenido, y el logo, hechos con Higgsfield. Ver [`assets/README.md`](assets/README.md). |

## Las láminas

| # | Lámina | Habla | Fondo |
| :-: | :--- | :--- | :--- |
| 1 | Portada | Juan | portada |
| 2 | El problema | Juan | contenido |
| 3 | La propuesta | Juan | contenido |
| 4 | Cómo cumplimos cada criterio de la sección 11 | Juan | contenido |
| 5 | Arquitectura (diagrama con formas) | Juan y Jesús | contenido |
| 6 | Demo en vivo (pasa al navegador; ver `guion.md`) | todos | sección |
| 7 | Motor: cascada de exclusiones E1 a E4 | Jesús | contenido |
| 8 | Motor: clasificación CINU, regla SB21, ponderación y reconciliaciones | Jesús | contenido |
| 9 | Automatización: un período nuevo, sin tocar código | Jesús y Agustín | contenido |
| 10 | Tres perfiles con opciones distintas | Agustín y Jesús | contenido |
| 11 | IA: consulta, explica y guía; nunca calcula | Agustín | contenido |
| 12 | Calidad técnica: pruebas, CI y contratos | Jesús y Juan | contenido |
| 13 | Innovación: más allá de los 6 rankings | Agustín | contenido |
| 14 | Decisiones técnicas y por qué | los tres | contenido |
| 15 | Cierre con la URL pública | Juan | portada |

Con menos tiempo, las láminas 7, 8 y 12 se pueden dejar de respaldo para las preguntas.

## Regenerar el deck

Requiere Python 3.10 o superior. Desde la raíz del repo:

```bash
python3 -m venv presentacion/.venv
presentacion/.venv/bin/pip install -r presentacion/requirements.txt
presentacion/.venv/bin/python presentacion/generar_deck.py
```

En Windows, `presentacion\.venv\Scripts\pip` y `presentacion\.venv\Scripts\python`. El script escribe `presentacion/deck.pptx` y, al final, avisa con los textos que podrían no caber en su caja. `.venv/` está en `presentacion/.gitignore`.

Cómo está armado:

- **Diseños, no imágenes sueltas:** el archivo tiene tres diseños (Portada, Sección y Contenido) con su fondo de `assets/`, y el título de cada lámina es un marcador de posición. Así se puede editar en PowerPoint sin mover el fondo.
- **Colores y tipografía:** la paleta D (índigo y dorado) está en el tema del archivo y la tipografía es Arial, que no depende de fuentes instaladas.
- **Notas del orador:** cada función `lamina_*` de `generar_deck.py` trae sus notas con quién habla y cuánto dura.

### Cifras y contenido

El deck **no tiene cifras de resultados** (saldos, posiciones ni ganadores): esas solo las muestra la app en vivo. Solo usa números del documento del reto (25,000 / 27,500 / 30,000 filas, 61 campos, 12 bancos, 6 rankings y 22 subactividades) y los del bloque `CIFRAS` de `generar_deck.py`, medidos el 27 de noviembre de 2026:

| Cifra | Cómo se mide |
| :--- | :--- |
| 331 pruebas del server | `cd server && npm test` |
| 43 pruebas del client | `cd client && npm test` |
| Cobertura del server: 99 % de líneas, 91 % de ramas y 98 % de funciones | `cd server && npm run test:cobertura` |
| 18 casos de evaluación del agente | `server/evals/agente/casos.js` |

Si cambian, se actualiza el bloque `CIFRAS` y se vuelve a generar. La URL pública y la del repositorio están en `URL_PUBLICA` y `URL_REPO`.

## Revisar cómo se ve

El deck se revisó convirtiéndolo con LibreOffice y mirando cada lámina como imagen:

```bash
cd presentacion
soffice --headless --convert-to pdf --outdir /tmp/deck-revision deck.pptx
pdftoppm -jpeg -r 80 /tmp/deck-revision/deck.pdf /tmp/deck-revision/lamina
```

Qué buscar: texto cortado o fuera de su caja, palabras partidas a mitad, cajas que se tocan y texto de bajo contraste. El mismo PDF sirve de respaldo si falla PowerPoint en el proyector (desde PowerPoint: Archivo, Exportar, PDF).

## Preparar la demo

```bash
node presentacion/preparar-demo.mjs                  # prepara y levanta la app (npm run dev)
node presentacion/preparar-demo.mjs --sin-arrancar   # solo prepara las carpetas e imprime los comandos
```

- Copia julio, agosto y los catálogos a una carpeta temporal (`DEMO_DIR`, por defecto `sbp-demo` dentro del directorio temporal del sistema), deja el AT03 de septiembre aparte e imprime su ruta.
- Apunta la app a esa carpeta con `DATA_DIR` y `STORAGE_DIR`. No toca `data/` ni `storage/`.
- Vuelve a empezar de cero cada vez que se corre. Con `PORT=3002` delante usa otro puerto para la API.
- El guion completo (clics, tiempos, plan B y preguntas del jurado) está en [`guion.md`](guion.md).

## Pendiente antes de presentar

- **Ensayar con la app final:** las etiquetas del guion se revisaron contra el código del selector de perfil (#4), el Panel (#60), Comparar períodos (#61) y la Verificación del jurado (#63). En el ensayo, confirmar que todo se ve igual en la máquina de la demo.
- **Alertas por correo (#7):** ya están en `main`. Mostrarlas en vivo solo si la máquina de la demo tiene `ZAPIER_WEBHOOK_URL` en el `.env`.
- **Cifras de pruebas:** volver a medirlas (tabla de arriba) el día de la presentación.
