# Evaluación del agente (#72)

Mide si el agente de IA responde bien las preguntas típicas del jurado, sin inventar números, respetando los perfiles y guiando por la app.

**Las respuestas esperadas no están escritas en el repo** (regla R2): cada caso las pide a la API al momento de evaluar. Si cambian los datos o se carga otro período, la evaluación sigue valiendo.

## Cómo correrla

Desde la raíz del repo (toma el `.env` de la raíz):

```bash
npm run eval:agente                                   # lista los casos y lo esperado: NO llama a la IA
npm run eval:agente -- --confirmar                    # evalúa de verdad (cada caso es una pregunta a la IA)
npm run eval:agente -- --confirmar --categoria guia   # solo una categoría
npm run eval:agente -- --confirmar --caso guia-carga-admin --repeticiones 3
```

- **Por defecto** levanta la API en memoria con los datos de `data/` y usa `ANTHROPIC_API_KEY` y `AI_MODEL`.
- **Con `EVAL_API_URL=https://…/api`** evalúa una API ya desplegada (la IA la configura ese servidor).
- Sin IA disponible, avisa y no evalúa nada.
- **Costo:** `--confirmar` hace una pregunta por caso y repetición (hoy son 18 casos).

## Qué se evalúa

| Categoría | Qué mide | Punto de la sección 11.1 |
| :--- | :--- | :--- |
| `calidad` | E1–E4, universo válido, reconciliaciones | 1 y 6 |
| `ranking` | Posiciones, saldos y líderes | 2 y 3 |
| `ponderacion` | Total de cartera y ponderación | 4 |
| `subactividad` | Desglose, incluida Tarjeta | 5 |
| `movimientos` | Comparación entre períodos (Analista) | Sección 8 |
| `perfiles` | Público no accede a movimientos | Entregable 8 |
| `limites` | No calcula (por ejemplo, promedios) y no recomienda bancos | Sección 9 |
| `guia` | Señala el elemento correcto y respeta el perfil | #72 |

Un caso aprueba si la respuesta está **verificada** (todo número existe en el motor) y cumple lo esperado:
- **Valores que deben aparecer:** se aceptan con o sin separador de miles y redondeados.
- **Textos prohibidos:** por ejemplo, un promedio que la IA no debe calcular o "te recomiendo".
- **Herramientas:** las que debía usar y las que no.
- **Guía:** los elementos que debía señalar y los que no.

## Resultado

Imprime ✔/✖ por caso con el motivo de cada falla, el porcentaje de aprobados, el de respuestas verificadas, el tiempo promedio y el resultado por categoría. El reporte completo (con cada respuesta) queda en `storage/evals/agente-<fecha>.json`, fuera del repo.

## Archivos

- [`casos.js`](casos.js): las preguntas y cómo obtener lo esperado de la API. Para agregar un caso, copia uno parecido.
- [`calificar.js`](calificar.js): compara una respuesta con lo esperado.
- [`correr.js`](correr.js): el script.
- [`tests/evals.test.js`](../../tests/evals.test.js): valida el set sin IA (cada caso obtiene su respuesta esperada y el calificador funciona). Corre con `npm test`.
