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
- Si la IA no logra responder solo con números del motor: `respuesta: null`, `verificada: false` y `motivo` explica por qué.
- Si no hay key o la IA falla: `ia_disponible: false` y `motivo`.
