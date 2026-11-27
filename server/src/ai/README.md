# IA para explorar y explicar

**Responsable:** Agustín

La IA solo consulta los resultados que ya calculó el motor: explica los principales movimientos y responde preguntas en lenguaje natural. **Nunca calcula rankings** (sección 9 de las indicaciones).

La API key va en el `.env`, nunca en el repo (R5).

## Explicación de movimientos (#2)

`explicarMovimientos(datos)` en [`explicaciones.js`](explicaciones.js) recibe la respuesta de `/api/movimientos` ([contrato](../../../contracts/movimientos.json)) y devuelve:

```json
{
  "ia_disponible": true,
  "motivo": null,
  "etiqueta": "Explicación generada con IA · los cálculos provienen del motor determinista",
  "items": [
    { "id": "HIPOTECARIO:104", "Ranking": "HIPOTECARIO", "Codigo_Banco": "104", "tipo": "movimiento",
      "texto": "Banco Pacifico sube 2 posiciones en HIPOTECARIO (del 3.º al 1.º), con una variación de saldo de +12.00% (+150,000.00).",
      "fuente": "reglas" }
  ]
}
```

Cómo funciona:

1. **Plantillas por reglas** ([`plantillas.js`](plantillas.js)): arman una frase por cada movimiento significativo y por cada cambio de líder. Siempre están disponibles.
2. **Redacción con IA** ([`redaccionIA.js`](redaccionIA.js)): si hay `ANTHROPIC_API_KEY`, Claude reescribe esas frases usando solo el JSON del motor.
3. **Verificador** ([`verificador.js`](verificador.js)): cada número de una frase de la IA tiene que estar en la respuesta del motor (se admite redondearlo al mostrarlo). Si no está, esa frase se reemplaza por la de reglas. Cada item indica su `fuente` (`ia` o `reglas`).

Sin key, o si la IA falla, todo sale por reglas y `motivo` explica por qué.

Variables en `.env` (ver [`.env.example`](../../../.env.example)): `ANTHROPIC_API_KEY` y `AI_MODEL` (por defecto `claude-opus-5-5`).

Tests: `cd server && npm test`.

## Agente de exploración (#3)

`POST /api/ia/preguntar` ([contrato](../../../contracts/ia.md)): el usuario pregunta en lenguaje natural y Claude responde consultando la API con herramientas de solo lectura.

- [`herramientas.js`](herramientas.js): 7 herramientas, cada una un GET a la API (`/periodos`, `/catalogos`, `/rankings`, `/subactividades`, `/calidad`, `/excluidas`, `/movimientos`). Las listas largas se recortan a una muestra y se indica cuántas se muestran. El servidor MCP (#6) va a reutilizar este módulo.
- [`agente.js`](agente.js): el ciclo de herramientas (Messages API, hasta 8 vueltas). La respuesta final pasa por el verificador contra los resultados que consultó la IA. Si cita un número que no está, se le pide corregir una vez; si vuelve a fallar, no se muestra.
- La respuesta incluye `consultas`, con qué endpoints usó la IA, para mostrarlos como fuentes.

`GET /api/explicaciones` expone la explicación de movimientos (#2) y `GET /api/ia/estado` indica si la IA está disponible.
