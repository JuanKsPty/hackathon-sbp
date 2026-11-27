# Agente en pantalla (#119, #122 a #125)

El chat siempre responde. Además, si la respuesta de `POST /api/ia/preguntar` trae `pantalla` (contrato en [`contracts/ia.md`](../../../contracts/ia.md)), la app actúa según el modo:

| Modo | Pregunta típica | Qué pasa |
| :--- | :--- | :--- |
| `ejecutar` | "¿Cuál es el banco con más operaciones?" | Se aplica **al instante**, sin cursor y con el chat abierto: va a Rankings, ordena por Operaciones y resalta el banco. Aparece **"Muéstrame cómo"**: deshace y lo demuestra. |
| `demostrar` | "¿Cómo veo el banco con más operaciones?" | El chat se minimiza y el **cursor celeste** sale de su botón. Recorre cada paso (si es otra página pasa por el menú, y si el elemento está fuera de pantalla hace scroll) y lo "toca". Al final vuelve, desaparece y el chat se reabre. |

## Archivos

| Archivo | Qué hace |
| :--- | :--- |
| [`AgenteFlotante.jsx`](AgenteFlotante.jsx) | Botón abajo a la derecha y chat sobre la pantalla. |
| [`AgenteContext.jsx`](AgenteContext.jsx) | Chat abierto o cerrado, posición del botón, registro de controles, `ejecutarPantalla` y `deshacerUltima`. |
| [`registro.js`](registro.js) | Registro de controles: registrar, obtener y esperar a que aparezca uno (después de navegar). Tests en `registro.test.js`. |
| [`useControlGuia.js`](useControlGuia.js) | Hook para que un componente registre su control mientras está montado. |
| [`ejecutor.js`](ejecutor.js) | Aplica las acciones en orden (navega, espera el control, llama al handler), guarda el estado previo para deshacer y acepta un `antesDe` para animar cada paso. Tests en `ejecutor.test.js`. |
| [`objetivo.js`](objetivo.js) | Qué toca el cursor en cada acción: menú, columna, fila o control. Tests en `objetivo.test.js`. |
| [`DemostracionContext.jsx`](DemostracionContext.jsx) | Recorrido de la demostración: entrar, buscar, moverse, tocar y salir. Esc cancela. |
| [`CapaDemostracion.jsx`](CapaDemostracion.jsx) | Lo visual: cursor (`guia/CursorGuia.jsx`), onda al tocar y globo. **Aspecto provisional** hasta el diseño final. |

## Registrar un control nuevo

1. Agrega su `data-guia` en [`contracts/guia.md`](../../../contracts/guia.md) y en el catálogo del backend (`server/src/ai/guia.js`). Si se puede manejar, también en `CONTROLES` (`server/src/ai/pantalla.js`).
2. En el componente que tiene su estado:

```jsx
useControlGuia('rankings.tabla', {
  ordenar: (columna, orden) => setOrden({ clave: columna, ascendente: orden === 'asc' }),
  resaltar: (codigo) => setDelAgente(codigo),
  estado: () => ({ orden, delAgente }),        // para deshacer
  restaurar: (anterior) => { /* ... */ },
})
```

3. Para que el cursor toque algo más preciso que el control entero (una columna, una fila), marca esos elementos con `data-guia-columna` o `data-fila-banco` y agrega el caso en `objetivo.js`.

Como se engancha al **estado** de cada componente y no a su aspecto, el rediseño no rompe el agente mientras se conserven los `data-guia` y los hooks.

## Probarlo sin IA

En el `.env`, `VITE_USAR_MOCKS=true`; después `npm run dev` y, en el chat flotante:
- **"¿Cuál es el banco con más operaciones?":** ejecutar.
- **"¿Cómo veo el banco con más operaciones?":** demostrar.

Con el API real y sin API key, las reglas del backend (`server/src/ai/pantallaReglas.js`) también arman la pantalla de estas preguntas.
