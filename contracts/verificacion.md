# Verificación del jurado (issue #63)

En la evaluación, el jurado pide mostrar en vivo **un dato de cada punto de la sección 11.1** (si no se puede mostrar, el punto cuenta como incorrecto). Este endpoint los junta en una sola respuesta, cada uno con chequeos automáticos de la sección 12, para que la página "Modo verificación" los muestre con un clic.

Los números del [ejemplo](verificacion.json) son **ilustrativos**: los reales los calcula `server/src/engine` (R2). El endpoint no recalcula nada: ordena los resultados del motor y los compara entre sí.

## `GET /api/verificacion` · [ejemplo](verificacion.json)

Para los 3 perfiles. Parámetros opcionales:

| Parámetro | Uso | Por defecto |
| :--- | :--- | :--- |
| `periodo` | Período de los puntos 2 a 5 (`AAAAMMDD`) | el último cargado |
| `banco` | Acota los datos a un banco (por ejemplo, el que pida el jurado). Conserva su posición real. | todos |

Los puntos 1 y 6 traen siempre todos los períodos. **Los chequeos usan siempre todos los bancos**, aunque se filtre por uno.

## Los 6 puntos

| `punto` | Qué muestra (`datos`) | Chequeos |
| :---: | :--- | :--- |
| 1 | Por período: filas leídas, E1, E2, E3, E4 y universo local válido | leídas = E1+E2+E3+E4+universo; ningún préstamo repetido |
| 2 | HIPOTECARIO, CONSTRUCCION, INDUSTRIA y AGROPECUARIO: posición, banco y saldo | 12 bancos con posiciones 1 a 12 sin huecos |
| 3 | COMERCIO y CONSUMO: posición, banco y saldo | ídem |
| 4 | Por banco: total de cartera local válida y ponderación en cada uno de los 6 rankings | mismo denominador en los 6 rankings; las 6 ponderaciones suman 100 (con el redondeo) |
| 5 | CONSUMO por banco: Crédito personal, Automóvil y Tarjeta, y cuántas operaciones movió la regla SB21 | CONSUMO tiene Tarjeta; la suma de subactividades = saldo de la actividad en cada ranking y banco |
| 6 | Por período: archivo y reconciliaciones R1, R2 y R3 | al menos 3 períodos; R1 y R2 cuadran al centavo |

Cada chequeo es `{ "nombre": "...", "ok": true }`, y `todo_ok` es `true` si pasan todos. La UI puede mostrar ✓ o ✗ junto a cada punto.

## Errores

Formato común ([README.md](README.md)): `400 PARAMETRO_INVALIDO` (período mal formado o banco inexistente) y `404 PERIODO_SIN_DATOS`.
