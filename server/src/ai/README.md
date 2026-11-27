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

### Qué garantiza el verificador y qué no (límite conocido)

[`verificador.js`](verificador.js) comprueba que **cada número del texto exista entre los valores que devolvió el motor** (en valor absoluto, redondeado a los decimales con que se escribió). No comprueba que sea el número *de ese banco, ese ranking o ese período*, ni que la frase diga lo correcto con ese número. Dos límites concretos:

- **Los enteros pequeños casi siempre pasan.** Del 1 al 12 y los años existen en cualquier respuesta del motor (posiciones, códigos de banco, fechas). "Subió 3 posiciones" cuando fueron 2 pasa si hay un 3 en otro campo.
- **Un número sin decimales coincide con cualquier valor que redondee a él.** "12" pasa si el motor trae `11.7`. Con decimales escritos (`11.70`) se exige el valor.

**Qué no se verifica porque no es una cifra del motor.** `extraerNumeros` ignora los *códigos* y las *referencias*:

- **Códigos:** letras con 1 a 3 dígitos pegados: `E1`, `E1–E4`, `SB21`, `AT03`, `R2`. Son nombres, no cantidades; antes un "(E1)" en la respuesta contaba como el número 1 y, al no estar en los datos, descartaba una respuesta correcta. Un monto pegado a la moneda (`USD9,999,999.00`) no es un código: se verifica.
- **Referencias:** una etiqueta y su número: `entregable 4`, `reconciliación 1 y 2`, `sección 11.1`, `lámina`, `criterio`, `punto`, `paso` o `regla` seguidos de un número. Una lista sigue con `y`, `e`, `a` o un guion, solo con números de 1 o 2 dígitos que no sean una cifra: en "criterio 2, 10.5%" se ignora el 2 y se verifica el 10.5. Si la etiqueta va *después* del número ("subió 3 puntos"), es una cifra y se verifica.

Siguen verificándose los montos (`B/. 1,234.56`), los conteos (`20 duplicados`), los ordinales (`3.º lugar`) y las fechas.

Lo que sí protege de forma práctica es lo que más importa en la demo: **montos con decimales, porcentajes con decimales y cifras grandes inventados**, que no coinciden por azar con ningún valor del motor. Tampoco se verifica el signo ni las palabras ("sube", "baja", "lidera"). Por eso, además:

- Cada respuesta trae `consultas` (qué endpoints leyó la IA) para contrastarla con los datos, y los rankings oficiales y los reportes nunca pasan por la IA: salen del motor.
- Los números que escribe el usuario en la pregunta **no cuentan** como fuente: si repite una cifra falsa, la IA solo puede citarla si el motor también la trae (#86).
  El costo: si la pregunta trae un umbral propio ("bancos con ponderación mayor a 15 %") y la respuesta lo repite, ese número no está en el motor y la respuesta se rechaza. La IA tiene un reintento para reescribirla sin citarlo.

Si hiciera falta endurecerlo: aceptar los enteros pequeños solo cuando vengan de campos como `Posicion` o `Cambio_Posicion`. No está hecho porque obligaría a que el verificador conozca cada campo del motor. Dos tests lo dejan documentado (`tests/ai/explicaciones.test.js`).

Variables en `.env` (ver [`.env.example`](../../../.env.example)): `ANTHROPIC_API_KEY` y `AI_MODEL` (por defecto `claude-opus-5-5`).

Tests: `cd server && npm test`.

## Agente de exploración (#3)

`POST /api/ia/preguntar` ([contrato](../../../contracts/ia.md)): el usuario pregunta en lenguaje natural y Claude responde consultando la API con herramientas de solo lectura.

- [`herramientas.js`](herramientas.js): 7 herramientas, cada una un GET a la API (`/periodos`, `/catalogos`, `/rankings`, `/subactividades`, `/calidad`, `/excluidas`, `/movimientos`). Las listas largas se recortan a una muestra y se indica cuántas se muestran. El servidor MCP (#6) va a reutilizar este módulo.
- [`agente.js`](agente.js): el ciclo de herramientas (Messages API, hasta 8 vueltas). La respuesta final pasa por el verificador contra los resultados que consultó la IA. Si cita un número que no está, se le pide corregir una vez; si vuelve a fallar, no se muestra. Si la IA rechaza la pregunta (`refusal`) o la respuesta se corta (`max_tokens`), responde `ia_disponible: true` con `respuesta: null` y un `motivo`; "IA no disponible" queda solo para cuando falta la llave o la IA falla.
- **Perfiles en el prompt:** el prompt de sistema se arma por perfil (`sistemaPara` en `agente.js`) con las opciones que ese perfil tiene y las que son de otros, tomadas de `OPCIONES` en `middleware/perfiles.js` (no están escritas a mano). Así, si Público pregunta cómo cargar un período o qué bancos subieron entre dos períodos, la IA dice que eso es del Administrador o del Analista y que hay que entrar al sitio interno con una cuenta de ese perfil, en vez de decir que la app no lo tiene o de armar la comparación ella misma con rankings sueltos (eso es calcular). Comparar períodos se hace solo con `consultar_movimientos`.
- La respuesta incluye `consultas`, con qué endpoints usó la IA, para mostrarlos como fuentes.

`GET /api/explicaciones` expone la explicación de movimientos (#2) y `GET /api/ia/estado` indica si la IA está disponible.

## Agente guía (#72)

Si el usuario pregunta *cómo* o *dónde* hacer algo en la app, el agente usa la herramienta `guiar_usuario` y `POST /api/ia/preguntar` devuelve `guia.pasos` (`{ ruta, guia, texto }`), para que el front mueva un cursor por la pantalla.

- [`guia.js`](guia.js): catálogo de elementos (`data-guia`) con su ruta y el permiso de perfil que necesitan. Es la misma lista de [`contracts/guia.md`](../../../contracts/guia.md); un test verifica que coincidan.
- La herramienta solo admite los identificadores del perfil (lista cerrada en el esquema) y el backend vuelve a validar cada paso. La ruta la pone el catálogo, no la IA. Los textos de los pasos pasan por el verificador de números.
- `GET /api/ia/guia` lista los elementos de cada perfil.
- Los números sueltos de las descripciones del catálogo ("Selector de los 6 rankings") cuentan como citables, pero solo los de los elementos que la guía señala: una pregunta de *cómo* o *dónde* no consulta datos y, sin esto, el verificador descartaría una guía correcta. Los códigos y las referencias ("entregable 4", "E1–E4") ya no se verifican (ver el verificador, arriba) (#86).

## Evaluación del agente

[`server/evals/agente/`](../../evals/agente/README.md) mide si el agente responde bien las preguntas típicas del jurado. Cada caso hace una pregunta real a `POST /api/ia/preguntar` y califica la respuesta contra lo que devuelve la API en ese momento (las respuestas esperadas no están escritas en el repo, R2). Comprueba que la respuesta esté verificada, que no calcule ni recomiende, que respete los perfiles y que la guía señale el elemento correcto.

```bash
npm run eval:agente                    # lista los casos; no llama a la IA ni cuesta
npm run eval:agente -- --confirmar     # evalúa de verdad (requiere ANTHROPIC_API_KEY y tiene costo)
```

El reporte queda en `storage/evals/`. Los tests del calificador (`tests/evals.test.js`) corren sin IA en cada `npm test`.

## Acciones de pantalla (#121)

Además de responder, el agente puede dejar el dashboard listo (modo `ejecutar`) o mostrar con el cursor cómo se hace (modo `demostrar`). Contrato en [`contracts/ia.md`](../../../contracts/ia.md).

- [`pantalla.js`](pantalla.js): catálogo de controles (`CONTROLES`) y la herramienta `usar_pantalla`. `validarPantalla` revisa cada acción contra el catálogo, el perfil y los datos cargados; la ruta la pone el catálogo.
- [`pantallaReglas.js`](pantallaReglas.js): sin IA, arma la pantalla de las preguntas sobre la tabla de rankings ("¿cuál es el banco con más operaciones en COMERCIO en agosto?"). Lee y ordena las filas del motor como la tabla; no calcula.
- Los textos de las acciones pasan por el verificador de números. Si la respuesta no se verifica, la pantalla de la IA se descarta.
