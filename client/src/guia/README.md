# Cursor guía (#72)

Cuando el usuario le pregunta al asistente *cómo* o *dónde* hacer algo, la respuesta de `POST /api/ia/preguntar` trae `guia.pasos` (`{ ruta, guia, texto }`). El botón **"Mostrarme en la pantalla"** del mensaje inicia la guía: un cursor recorre la app, resalta cada elemento y muestra un globo con el texto.

## Archivos

| Archivo | Qué hace |
| :--- | :--- |
| [`motor.js`](motor.js) | Lógica pura, sin DOM ni React: estado de la guía (pasos, fase, posición), si hay que cambiar de página y dónde poner el globo sin que se salga de la pantalla. Tests en [`motor.test.js`](motor.test.js) (`npm test`). |
| [`dom.js`](dom.js) | Busca el primer `[data-guia="…"]` visible (espera a que la página lo dibuje), lo lleva a la vista y lo mide. |
| [`GuiaContext.jsx`](GuiaContext.jsx) | `GuiaProvider` y `useGuia()`: navega entre páginas, busca el elemento de cada paso y lo sigue con scroll o resize. Teclado: Esc cierra y las flechas avanzan o retroceden. |
| [`CapaGuia.jsx`](CapaGuia.jsx) | La capa visual: resaltado, cursor y globo con Anterior, Siguiente y Cerrar. **Versión mínima: el diseño final es de @JuanKsPty.** |

## Fases de cada paso

`navegando` (cambia de página si `ruta` no es la actual; `null` = elemento del layout) → `buscando` (espera hasta 4 s a que aparezca) → `mostrando` o `no-encontrado` (el globo lo avisa y se puede seguir).

## Para el diseño

- Cada elemento que la IA puede señalar necesita su `data-guia` (lista en [`contracts/guia.md`](../../../contracts/guia.md)). Si falta, ese paso queda como "no encontrado".
- Para cambiar el aspecto, basta con editar `CapaGuia.jsx`: lee `useGuia()` (`estado.rect`, `estado.fase`, `paso.texto`, `siguiente`, `anterior` y `terminar`).
- Respeta `prefers-reduced-motion`: sin animaciones ni scroll suave.

## Probarlo sin IA

Con `VITE_USAR_MOCKS=true` en el `.env`, `npm run dev` y una pregunta con "cómo" o "dónde" en el chat, el mock devuelve una guía de ejemplo por Rankings.
