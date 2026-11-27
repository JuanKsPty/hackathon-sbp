# Registro de operaciones (issue #31)

Registro básico de lo que pasa en la plataforma: qué archivo se cargó, cuándo, con qué perfil y con qué resultado (sección 10, entregable 8). Solo lo consulta el **Administrador**.

## `GET /api/bitacora` · [ejemplo](bitacora.json)

- Solo para `X-Perfil: admin`. Los demás perfiles reciben **403** `PERFIL_NO_AUTORIZADO`.
- `operaciones[]` viene de la más reciente a la más antigua y `total` es cuántas hay.

| Campo | Contenido |
| :--- | :--- |
| `fecha_hora` | cuándo, en ISO 8601 (UTC) |
| `operacion` | qué se hizo (tabla de abajo) |
| `archivo` | archivo involucrado, o `null` |
| `perfil` | `publico`, `analista`, `admin`, o `sistema` para la carga al arrancar |
| `resultado` | `exito`, `error` o `rechazado` |
| `detalle` | texto libre: período, mensaje de error o ruta pedida; puede ser `null` |

| `operacion` | Quién la registra |
| :--- | :--- |
| `carga_inicial` | `server/src/servidor.js`, una por archivo AT03 de `data/` al arrancar |
| `carga_periodo` | la carga o actualización de un período (#29) |
| `cambio_parametros` | `PUT /api/parametros` (#30) |
| `acceso_denegado` | `requierePerfil` cada vez que responde 403; `detalle` trae el método y la ruta |

## Dónde se guarda

Una línea JSON por operación en **`storage/operaciones.jsonl`**, en la raíz del repo (la misma carpeta de los parámetros guardados, #32). La carpeta `storage/` está en `.gitignore`: no se sube al repo.

- Con la variable de entorno `STORAGE_DIR` se usa otra carpeta.
- Durante `npm test` se escribe en una carpeta temporal, para no ensuciar la bitácora real.

## Registrar una operación desde otro módulo

```js
import { registrarOperacion } from '../datos/bitacora.js';

registrarOperacion({
  operacion: 'carga_periodo',
  archivo: 'AT03_sintetico_202610.csv', // opcional
  perfil: req.perfil,
  resultado: 'exito',                   // 'exito', 'error' o 'rechazado'
  detalle: 'Período 20261031',          // opcional
});
```

Si no se puede escribir el archivo, se avisa en consola y la operación principal sigue.
