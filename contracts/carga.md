# Carga de un período nuevo (issue #29)

El Administrador sube un AT03 desde la UI. El backend lo valida, lo procesa con el mismo motor que `data/` y lo publica sin tocar código (entregable 7). Sigue las convenciones de [`consulta.md`](consulta.md).

Los números del [ejemplo](carga.json) son **ilustrativos**: los reales los calcula `server/src/engine` (R2). Una prueba (`server/tests/carga-api.test.js`) verifica que el ejemplo tenga la misma forma que la respuesta real.

## `POST /api/periodos` · [ejemplo](carga.json)

**Solo para el perfil Administrador.** A `publico` y `analista` les responde **403** `PERFIL_NO_AUTORIZADO`, sin leer el archivo (ver [`perfiles.md`](perfiles.md)).

| Parte | Valor |
| :--- | :--- |
| Header `X-Perfil` | `admin` |
| Header `X-Nombre-Archivo` | nombre del archivo, con `encodeURIComponent` (por ejemplo `AT03_sintetico_202609.csv`) |
| Header `Content-Type` | `text/csv` (también se acepta `text/plain`) |
| Cuerpo | el texto del CSV tal cual, hasta **50 MB** |

Desde el front:

```js
const archivo = input.files[0];
const respuesta = await fetch('/api/periodos', {
  method: 'POST',
  headers: { 'X-Perfil': 'admin', 'X-Nombre-Archivo': encodeURIComponent(archivo.name), 'Content-Type': 'text/csv' },
  body: await archivo.text(),
});
```

Con curl:

```bash
curl -X POST -H "X-Perfil: admin" -H "X-Nombre-Archivo: AT03_sintetico_202609.csv" \
  -H "Content-Type: text/csv" --data-binary @data/AT03_sintetico_202609.csv http://localhost:3001/api/periodos
```

### Qué hace

1. **Valida y procesa** el archivo con el motor: 61 columnas del diccionario, `Fecha` y `Saldo` válidos, cascada E1–E4, clasificación, rankings y reconciliaciones. El período sale del campo `Fecha`, no del nombre del archivo. Si algo falla, responde **422** y **no guarda nada**: lo que ya estaba cargado no cambia.
2. **Guarda una copia** en `storage/periodos/`, que está ignorada por git. Se llama `<marca de carga>__<nombre original>`.
3. **Publica** el período: desde ese momento lo ven `GET /api/periodos`, `/api/rankings` y las demás consultas.
4. **Al reiniciar** el servidor, las copias se recargan después de `data/`, en el orden en que se subieron. Lo cargado no se pierde.
5. **Avisa** al gancho `alPublicarPeriodo` (`server/src/automation/publicacion.js`). Ahí se conectarán las alertas por correo (#7).

Un período con una `Fecha` que ya estaba cargada **la reemplaza** y se informa como `ACTUALIZACION`. Eso vale también para los de `data/`.

### Respuesta (200)

`archivo` es el nombre limpio: sin carpetas, y con `_` en lugar de los caracteres raros. `periodos[]` trae un elemento por cada `Fecha` del archivo, normalmente uno:

| Campo | Contenido |
| :--- | :--- |
| `Fecha` | período cargado (`AAAAMMDD`) |
| `Accion` | `NUEVO`, o `ACTUALIZACION` si la `Fecha` ya estaba cargada |
| `Mensaje` | texto listo para mostrar |
| `Periodo_Anterior` | la `Fecha` cargada justo antes, contra la que se comparan los rankings, o `null` si es el primero |
| `Calidad` | el mismo formato que un período de `GET /api/calidad`: `Filas_Leidas`, `E1_Duplicados` a `E4_Actividad_No_Catalogada`, `Universo_Local_Valido`, `Saldo_Total_Valido`, `Cascada_Cuadra`, alertas y `Reconciliaciones` (R1, R2, R3 y unicidad) |
| `Comparacion` | cambios de ranking contra `Periodo_Anterior`, con el formato de `GET /api/movimientos` ([`movimientos.json`](https://github.com/JuanKsPty/hackathon-sbp/blob/feat/1-contrato-movimientos/contracts/movimientos.json)), o `null` si no hay período anterior. **Pendiente de #32:** mientras la comparación no esté en `main`, vale `null` |

### Errores

Usan el formato común `{ "error": { "codigo", "mensaje", "detalles"? } }`.

| HTTP | `codigo` | Cuándo |
| :---: | :--- | :--- |
| 400 | `PARAMETRO_INVALIDO` | falta `X-Nombre-Archivo`, o `X-Perfil` no es un perfil válido |
| 403 | `PERFIL_NO_AUTORIZADO` | el perfil no es `admin` |
| 413 | `ARCHIVO_MUY_GRANDE` | el archivo pasa de 50 MB |
| 415 | `FORMATO_NO_SOPORTADO` | el cuerpo no llegó como `text/csv` o `text/plain` |
| 422 | `ARCHIVO_INVALIDO` | archivo vacío, sin filas, que no es `.csv`, con columnas faltantes o fuera de orden, o con `Fecha` o `Saldo` inválidos. `detalles` dice qué columna o qué fila |

Ejemplo de 422:

```json
{
  "error": {
    "codigo": "ARCHIVO_INVALIDO",
    "mensaje": "AT03_octubre.csv tiene 1 valores inválidos en Fecha o Saldo.",
    "detalles": ["Fila 2: Saldo = \"abc\" no cumple el tipo Numerico (Decimal)"]
  }
}
```
