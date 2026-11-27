# Endpoints de IA (issues #2 y #3)

La IA **explica y explora, pero nunca calcula**: solo lee resultados del motor. Todo número que escribe se verifica contra las respuestas de la API, y si no está ahí, no se muestra. Sin `ANTHROPIC_API_KEY` en el `.env`, los endpoints responden igual: las explicaciones salen por reglas y el chat avisa que la IA no está disponible.

**Perfiles** ([perfiles.md](perfiles.md)): `/api/explicaciones` sigue la misma regla que `/api/movimientos` (Analista y Administrador; Público recibe 403). En `/api/ia/preguntar` la IA consulta la API con el `X-Perfil` del usuario y, a Público, no le ofrece la herramienta de movimientos.

La UI debe mostrar `etiqueta` junto al texto ("Explicación generada con IA · los cálculos provienen del motor determinista") y, si `ia_disponible` es `false`, el `motivo`.

## `GET /api/ia/estado`
```json
{ "ia_disponible": true, "modelo": "claude-opus-5-5" }
```

## `GET /api/ia/guia`
Elementos que el agente guía puede señalar para el perfil del `X-Perfil` (ver [guia.md](guia.md)). El front puede usarlo para comprobar que cada uno tiene su `data-guia` en pantalla.
```json
{ "perfil": "publico", "elementos": [{ "guia": "rankings.tabla", "ruta": "/rankings", "descripcion": "Tabla del ranking: posición, saldo, total de cartera y ponderación" }] }
```
`ruta: null` significa que el elemento está en todas las páginas (layout o asistente).

## `GET /api/explicaciones`
Mismos parámetros que [`/api/movimientos`](movimientos.json) (`desde`, `hasta`, `ranking`). Explica los movimientos significativos y los cambios de líder.
```json
{
  "fuente": "AT03 sintético · Hackathon SBP 2026",
  "aviso": "Datos ficticios · Uso informativo, no opinión formal de la SBP",
  "periodo_anterior": "20260831",
  "periodo_actual": "20260930",
  "ia_disponible": true,
  "motivo": null,
  "etiqueta": "Explicación generada con IA · los cálculos provienen del motor determinista",
  "items": [
    { "id": "COMERCIO:lider", "Ranking": "COMERCIO", "Codigo_Banco": "112", "tipo": "cambio_lider",
      "texto": "Banco Solidez pasa a liderar COMERCIO y desplaza a Banco Regional.", "fuente": "reglas" },
    { "id": "COMERCIO:108", "Ranking": "COMERCIO", "Codigo_Banco": "108", "tipo": "movimiento",
      "texto": "Banco Capital sube 4 posiciones en COMERCIO (del 7.º al 3.º), con una variación de saldo de +21.07% (...).", "fuente": "ia" }
  ]
}
```
`fuente` de cada item: `ia` (redactado por la IA y verificado) o `reglas` (plantilla).

## `POST /api/ia/preguntar`
Cuerpo:
```json
{
  "pregunta": "¿Quién lidera HIPOTECARIO en septiembre?",
  "historial": [{ "rol": "usuario", "texto": "..." }, { "rol": "asistente", "texto": "..." }]
}
```
`pregunta` es obligatoria (máximo 500 caracteres). `historial` es opcional y se usan los últimos 6 turnos.

Respuesta (siempre HTTP 200, salvo un 400 si la pregunta es inválida):
```json
{
  "fuente": "AT03 sintético · Hackathon SBP 2026",
  "aviso": "Datos ficticios · Uso informativo, no opinión formal de la SBP",
  "pregunta": "¿Quién lidera HIPOTECARIO en septiembre?",
  "ia_disponible": true,
  "motivo": null,
  "etiqueta": "Respuesta generada con IA · los cálculos provienen del motor determinista",
  "respuesta": "En septiembre de 2026 (20260930) lidera HIPOTECARIO Banco ...",
  "verificada": true,
  "consultas": [
    { "herramienta": "consultar_rankings", "entrada": { "periodo": "20260930", "ranking": "HIPOTECARIO" },
      "ok": true, "ruta": "/rankings?periodo=20260930&ranking=HIPOTECARIO" }
  ]
}
```
- `guia` (#72): `null`, o `{ "pasos": [{ "ruta": "/rankings", "guia": "rankings.selector-ranking", "texto": "Elige COMERCIO aquí." }] }` cuando la pregunta es *cómo* o *dónde* hacer algo en la app. El front mueve el cursor a cada `[data-guia="…"]` en orden (si `ruta` no es `null`, navega primero). Los identificadores salen de [guia.md](guia.md), solo incluyen lo que el perfil puede ver y sus textos pasan por el mismo verificador de números.
- `consultas`: qué endpoints usó la IA. La UI puede mostrarlos como "fuentes" y enlazar a la vista correspondiente.
- `accion` (#108): `null`, o los gráficos que la UI muestra en pantalla junto a la respuesta. Ver abajo.
- Si la IA no logra responder solo con números del motor: `respuesta: null`, `verificada: false` y `motivo` explica por qué.
- Si la IA rechaza la pregunta (`stop_reason: refusal`) o su respuesta se corta (`max_tokens`): `ia_disponible: true`, `respuesta: null`, `verificada: false` y `motivo` ("La IA no responde ese tipo de preguntas…"). La IA sí está disponible: no es una caída.
- Si no hay key o la IA falla: `ia_disponible: false` y `motivo`.

### `accion`: gráficos de la pregunta (#108)
Cuando la pregunta pide ver datos (un informe, un ranking, comparar períodos, cómo va un banco, movimientos o calidad), la respuesta trae qué gráficos mostrar. **Nadie calcula cifras aquí:** la acción solo dice tipo, período, ranking y banco; la UI pide los datos de cada gráfico a `/api/rankings`, `/api/subactividades`, `/api/movimientos` y `/api/calidad`, que salen del motor (R2).

- **Con IA:** la propone la IA con la herramienta `mostrar_graficos`. Su entrada se valida contra los catálogos y los períodos cargados; si no es válida, vuelve a la IA como error y no se muestra.
- **Sin IA** (sin `ANTHROPIC_API_KEY`, o si la IA falla o no pidió gráficos): un intérprete por reglas (`server/src/ai/intencion.js`) reconoce mes, ranking, banco y tipo de informe por palabras clave, y produce **la misma acción**. Si la IA respondió con `guia`, no hay `accion`.
- **Perfiles:** cada gráfico exige su opción de [perfiles.md](perfiles.md). `movimientos` necesita `comparar_periodos` (Analista y Administrador): a Público se le quita y se explica en `avisos`.

```json
{
  "tipo": "informe",
  "origen": "reglas",
  "titulo": "Informe de septiembre de 2026",
  "periodo": "20260930",
  "periodo_anterior": "20260831",
  "periodos": ["20260930"],
  "ranking": null,
  "banco": null,
  "banco_nombre": null,
  "graficos": ["rankings", "movimientos", "calidad"],
  "avisos": [],
  "resumen": "Este es el informe de septiembre de 2026 (20260930): los 6 rankings, los movimientos contra agosto de 2026 (20260831) y la calidad de datos del período."
}
```

| Campo | Qué es |
| :--- | :--- |
| `tipo` | `informe`, `ranking`, `comparar`, `movimientos`, `banco` o `calidad` |
| `origen` | `ia` o `reglas` |
| `periodo` | período de los datos (por defecto el último cargado); `null` si se pidió un mes sin datos |
| `periodo_anterior` | inicio de la comparación de `movimientos`; `null` si no hay movimientos |
| `periodos` | para `banco`: los períodos cargados hasta `periodo`, para su evolución |
| `ranking`, `banco` | el ranking o el banco que nombra la pregunta, o `null` |
| `graficos` | `rankings`, `subactividades`, `banco`, `movimientos` o `calidad`, ya filtrados por perfil |
| `avisos` | lo que no se muestra y por qué (perfil, período sin datos o sin período anterior) |
| `resumen` | frase fija que la UI muestra cuando no hay respuesta de la IA; nombra lo que se muestra, sin cifras del motor |

Gráficos por tipo: `informe` → rankings, movimientos contra el período anterior y calidad; `ranking` → rankings y subactividades; `comparar` y `movimientos` → movimientos; `banco` → posiciones del banco por período y sus movimientos; `calidad` → calidad.

Ejemplos (perfil Analista): "dame el informe de septiembre" → `informe` de `20260930` contra `20260831`; "ranking de construcción de agosto" → `ranking` CONSTRUCCION de `20260831`; "compara julio y septiembre" → `comparar` de `20260731` a `20260930`; "cómo va el banco 108" → `banco` 108.
