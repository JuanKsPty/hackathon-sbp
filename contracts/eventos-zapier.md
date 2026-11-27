# Eventos hacia Zapier (issue #7)

Avisos automáticos que la app manda a Zapier: alertas por correo a los suscriptores, resumen semanal y casos de seguimiento por banco.

## Reglas
- **Solo la app llama a Zapier.** La app corre en local, así que Zapier no puede llamarla. Cada evento es un `POST` con cuerpo JSON a `ZAPIER_WEBHOOK_URL`.
- **La URL es un secreto (R5).** Va solo en `.env`; en `.env.example` queda vacía. Nunca se escribe en la bitácora ni en los logs.
- **Zapier solo reparte.** La app decide qué movimientos son significativos (regla configurable), a quién le llega cada uno y qué casos se abren. Zapier no calcula ni filtra cifras.
- **Si Zapier falla, la app sigue.** Si no hay URL, no hay internet o Zapier no responde en 5 segundos, la carga del período termina igual. Las alertas siguen visibles en la app y la bitácora registra el evento como `PENDIENTE` o `ERROR`.
- **Convenciones:** las mismas de [`consulta.md`](consulta.md). Códigos como texto, fechas `AAAAMMDD`, montos con 2 decimales, `Var_Saldo_Pct` con 4 y nombres de campo de las indicaciones. Todos los eventos traen `fuente` y `aviso`.

Todos los eventos traen además:
- `evento`: el tipo de evento.
- `id_evento`: identificador único, para que Zapier no procese dos veces el mismo envío.
- `enviado_en`: fecha y hora ISO 8601 con zona horaria.

Los números de los ejemplos son **ilustrativos**: los valores reales los calcula `server/src/engine` (R2).

| Evento | Cuándo lo manda la app | Ejemplo |
| :--- | :--- | :--- |
| `periodo_publicado` | Al publicar un período con `POST /api/periodos` (solo Administrador) | [evento-periodo-publicado.json](evento-periodo-publicado.json) |
| `suscripcion_actualizada` | Cuando alguien se suscribe, cambia sus preferencias o se da de baja | [evento-suscripcion-actualizada.json](evento-suscripcion-actualizada.json) |

## `periodo_publicado`
- **`periodo`, `periodo_anterior` y `archivo`.** `periodo_anterior` es `null` si es el primer período cargado.
- **`resumen`:** `Filas_Leidas`, `E1_Duplicados`, `E2_Destino_Extranjero`, `E3_Saldo_No_Positivo`, `E4_Actividad_No_Catalogada`, `Universo_Local_Valido`, `Saldo_Total_Valido` y `Alertas_Total`.
- **`lideres[]`:** un elemento por ranking, con `Ranking`, `Codigo_Banco`, `Banco` y `Cambio_Lider`.
- **`movimientos_significativos[]`:** los movimientos con `Significativo = true`. Cada uno trae `Ranking` y los mismos campos que un movimiento de `/api/movimientos`, más `Explicacion`: un texto de una línea armado con plantilla, sin IA.
- **`destinatarios[]`:** un elemento por suscriptor activo, con `correo`, `movimientos[]` (solo los de los bancos y rankings que sigue, con la misma forma de arriba) y `enlace_baja`. Si `movimientos` está vacío, el correo dice que no hubo movimientos significativos en lo que sigue.
- **`casos[]`:** los casos de seguimiento que abrió la app, cada uno con `Caso_ID` (`<periodo>-<banco>-<motivo>`), `Codigo_Banco`, `Banco`, `Tipo_Alerta`, `Cantidad` y `Detalle`.

**Qué hace Zapier:**
1. Agrega una fila arriba en la pestaña **Resumen** de la hoja del equipo, para que la fila 2 sea siempre el último período.
2. Envía un correo a cada destinatario con el resumen, sus movimientos, el aviso de datos ficticios y el enlace para darse de baja.
3. Agrega cada caso a la pestaña **Casos** con `Estado = Abierto`.

**Regla para abrir casos:** es un parámetro de la app (issue #30) y no se fija en el código. Por defecto, un caso por banco y motivo cuando `E1` (duplicados) o `E4` (actividad no catalogada) es 1 o más. `E2` no abre casos: un préstamo extranjero no es un error del reporte.

## `suscripcion_actualizada`
Trae `correo`, `accion` (`alta` o `baja`), `bancos[]` y `rankings[]`. Si una lista va vacía, el suscriptor sigue todos los bancos o todos los rankings.

**Qué hace Zapier:** crea o actualiza la fila del correo en la pestaña **Suscriptores** (`Correo, Bancos, Rankings, Estado, Actualizado_En`).

La lista oficial de suscriptores vive en la app, en un archivo local fuera del repo. La pestaña Suscriptores es una copia para el resumen semanal, que se envía aunque la app esté apagada. Para la demo se usan correos del equipo.

## Resumen semanal (sin evento)
Un flujo de Zapier con horario envía el resumen todos los lunes a las 8:00, hora de Panamá. Lee la fila 2 de **Resumen** y lo manda a los suscriptores con `Estado = Activo` en **Suscriptores**. No necesita que la app esté encendida.

## Respuesta y bitácora
Zapier responde `200`. La app registra en la bitácora (issue #31) `evento`, `id_evento` y el estado (`ENVIADO`, `PENDIENTE` o `ERROR`), nunca la URL ni los correos.
