# Alertas por correo con Zapier (issue #7)

Avisos automáticos que la app manda a Zapier: alertas por correo a los suscriptores, resumen semanal y casos de seguimiento por banco.

## Reglas
- **Solo la app llama a Zapier.** La app corre en local, así que Zapier no puede llamarla. Cada evento es un `POST` con cuerpo JSON a `ZAPIER_WEBHOOK_URL`.
- **La URL es un secreto (R5).** Va solo en el `.env` de la raíz. Nunca se escribe en el repo, en la bitácora ni en los logs.
- **Zapier solo reparte.** La app decide qué movimientos son significativos (regla del Administrador, #30), a quién le llega cada uno y qué casos se abren. Zapier no calcula ni filtra cifras.
- **Si Zapier falla, la app sigue.** Sin URL, sin internet o sin respuesta en 5 segundos, la carga del período termina igual y el aviso queda en la bitácora como `PENDIENTE`. Si Zapier responde con error, queda como `ERROR`.
- **Durante `npm test` nunca se llama a Zapier**, aunque la variable esté definida.
- **Enlaces de los correos:** usan `APP_URL` (la dirección pública de la app, donde también responde `/api`). Sin `APP_URL` usan `http://localhost:PORT`, que solo sirve en desarrollo.
- **Convenciones:** las mismas de [`consulta.md`](consulta.md). Códigos como texto, fechas `AAAAMMDD`, montos con 2 decimales y nombres de campo de las indicaciones. Todos los eventos traen `fuente` y `aviso`.

Todos los eventos traen además:
- `evento`: el tipo de evento.
- `id_evento`: identificador único del envío.
- `enviado_en`: fecha y hora ISO 8601.

Los números de los ejemplos son **ilustrativos**: los valores reales los calcula `server/src/engine` (R2).

| Evento | Cuándo lo manda la app | Ejemplo |
| :--- | :--- | :--- |
| `periodo_publicado` | Al publicar un período con `POST /api/periodos` (solo Administrador) | [evento-periodo-publicado.json](evento-periodo-publicado.json) |
| `confirmacion_suscripcion` | Cuando alguien pide suscribirse o cambiar sus preferencias | [evento-confirmacion-suscripcion.json](evento-confirmacion-suscripcion.json) |
| `suscripcion_actualizada` | Cuando alguien confirma la suscripción o se da de baja | [evento-suscripcion-actualizada.json](evento-suscripcion-actualizada.json) |

## `periodo_publicado`
Lo arma `server/src/automation/zapier.js` desde el gancho de la carga (`automation/publicacion.js`), uno por período publicado.

- **`periodo`, `periodo_anterior` y `archivo`.** `periodo_anterior` es `null` si es el primer período cargado.
- **`resumen`:** `Filas_Leidas`, `E1_Duplicados`, `E2_Destino_Extranjero`, `E3_Saldo_No_Positivo`, `E4_Actividad_No_Catalogada`, `Universo_Local_Valido`, `Saldo_Total_Valido` y `Alertas_Total`, iguales a `GET /api/calidad`.
- **`lideres[]`:** un elemento por ranking, con `Ranking`, `Codigo_Banco`, `Banco` y `Cambio_Lider`.
- **`movimientos_significativos[]`:** los movimientos con `Significativo = true` de la comparación con el período anterior. Cada uno trae `Ranking`, los campos de un movimiento de `/api/movimientos` y `Explicacion`: la frase de la plantilla sin IA (`ai/plantillas.js`).
- **`destinatarios[]`:** un elemento por suscriptor activo, con `correo`, `movimientos[]` (solo los de los bancos y rankings que sigue) y `enlace_baja`. Si `movimientos` está vacío, el correo dice que no hubo movimientos significativos en lo que sigue.
- **`casos[]`:** casos de seguimiento por banco, cada uno con `Caso_ID` (`<periodo>-<banco>-<motivo>`), `Codigo_Banco`, `Banco`, `Tipo_Alerta`, `Cantidad` y `Detalle`.

**Regla para abrir casos** (`REGLA_CASOS` en `automation/zapier.js`): un caso por banco y motivo cuando el banco tiene al menos 1 fila excluida por **E1** (duplicados) o **E4** (actividad no catalogada). E2 no abre casos: un préstamo extranjero no es un error del reporte.

**Qué hace Zapier** (flujo "Radar SBP – eventos de la app"):
1. Agrega una fila arriba en la pestaña **Resumen** de la hoja del equipo: la fila 2 es siempre el último período publicado.
2. Envía un correo a cada destinatario con el resumen, sus movimientos, el aviso de datos ficticios y el enlace para darse de baja.
3. Agrega cada caso a la pestaña **Casos** con `Estado = Abierto`. Si el `Caso_ID` ya existe (el período se volvió a publicar), no lo duplica.

## `confirmacion_suscripcion` (doble confirmación)
Trae `correo`, `enlace_confirmacion`, `bancos[]` y `rankings[]` (lo que se pidió seguir).

**Qué hace Zapier:** envía al correo un mensaje con el enlace para confirmar. No toca la hoja: el suscriptor se registra recién cuando confirma. Así nadie puede suscribir un correo ajeno: sin abrir el enlace, ese correo no recibe alertas.

## `suscripcion_actualizada`
Trae `correo`, `accion` (`alta` cuando confirma, `baja` cuando se da de baja), `bancos[]` y `rankings[]`. Una lista vacía significa todos los bancos o todos los rankings.

**Qué hace Zapier:** crea o actualiza la fila del correo en la pestaña **Suscriptores** (`Correo, Bancos, Rankings, Estado, Actualizado_En`).

## Resumen semanal (sin evento)
El flujo "Radar SBP – resumen semanal" se ejecuta los lunes a las 8:00, hora de Panamá. Lee la fila 2 de **Resumen** y la envía a los suscriptores con `Estado = Activo` en **Suscriptores**. No necesita que la app esté encendida.

## Endpoints de suscripción
La lista oficial de suscriptores vive en la app, en `storage/suscripciones.json` (fuera del repo). La pestaña Suscriptores de la hoja es solo una copia para el resumen semanal.

| Endpoint | Perfil | Qué hace |
| :--- | :--- | :--- |
| `POST /api/suscripciones` | todos | Cuerpo `{ "correo", "bancos": [], "rankings": [] }`. Guarda la solicitud y manda el correo de confirmación. No activa nada ni cambia una suscripción activa hasta que se confirme. Responde `{ fuente, aviso, confirmacion_enviada, mensaje, suscripcion }` |
| `GET /api/suscripciones/confirmar?token=...` | todos | Enlace del correo de confirmación. Activa la suscripción (o aplica las preferencias nuevas) y responde una página HTML. Vence a las 48 horas; un token desconocido o vencido responde 404 |
| `GET /api/suscripciones/baja?token=...` | todos | Enlace de las alertas. Da de baja y responde una página HTML; un token desconocido responde 404 |
| `GET /api/suscripciones` | Administrador | `{ fuente, aviso, total, suscripciones[] }`, sin los tokens; `pendiente_de_confirmar` indica si hay una solicitud sin confirmar |

`bancos` y `rankings` deben existir en los catálogos. Si no, o si el correo no es válido, la respuesta es `400 PARAMETRO_INVALIDO` con el formato común de errores.

**Límite de pedidos** (`LIMITE_SUSCRIPCIONES` en `routes/suscripciones.js`): hasta 5 solicitudes por IP cada 10 minutos, y no se reenvía la confirmación al mismo correo antes de 1 minuto. Si se pasa, la respuesta es `429 DEMASIADOS_PEDIDOS` con el header `Retry-After`.

## Bitácora
Cada aviso queda en la bitácora (#31) como `evento_zapier`, con el evento, su id y el estado. Cada alta o baja queda como `suscripcion`. Nunca se guarda la URL ni los correos.
