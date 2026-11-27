# Identificadores para el agente guía (issue #72)

El agente guía mueve un cursor por la app y señala elementos con un globo de texto ("elige el período aquí"). Para encontrarlos necesita que cada elemento clave tenga un **identificador fijo** en el HTML:

```jsx
<Select data-guia="rankings.selector-ranking">…</Select>
```

**Pedido para el diseño (@JuanKsPty):** poner estos `data-guia` mientras se arma cada página. No cambian nada visual y evitan rehacer después. Si un elemento cambia de nombre o se agrega uno nuevo, actualizar esta lista en el mismo PR.

## Reglas

- Formato `pagina.elemento`, en minúsculas y con guiones: `rankings.tabla`, `global.menu-comparar`.
- **Un identificador por elemento y por página** (no se repite).
- Va en el elemento que el usuario toca o mira: el botón, el selector o el contenedor de la tabla o el gráfico. No en un `div` externo que ocupe media pantalla.
- Si el elemento solo existe para un perfil, igual lleva su `data-guia`. El agente no señala lo que el perfil no puede ver (la columna *Perfil* de abajo).
- Los identificadores son para la guía: no se usan como estilos ni como selectores en pruebas de UI.
- Todo identificador de esta lista tiene que existir en `client/src`: lo comprueba `server/tests/ai/guia-client.test.js`. Si la IA eligiera uno que no está en la pantalla, el cursor no encontraría nada.

## Global (layout, todas las páginas)

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `global.menu-panel` | Enlace del menú a Panel | todos |
| `global.menu-rankings` | Enlace a Rankings | todos |
| `global.menu-comparar` | Enlace a Comparar períodos | analista, admin |
| `global.menu-reportes` | Enlace a Reportes | todos |
| `global.menu-calidad` | Enlace a Calidad de datos | todos |
| `global.menu-verificacion` | Enlace a Verificación del jurado | todos |
| `global.menu-admin` | Enlace a Administración | admin |
| `global.selector-perfil` | Sesión del sitio interno: usuario, perfil y Salir (`SesionUsuario`) | analista, admin |
| `global.selector-periodo` | Selector de período | todos |
| `global.selector-tema` | Claro, oscuro o sistema | todos |
| `global.barra-fuente` | Fuente, período y aviso de datos ficticios | todos |
| `global.abrir-asistente` | Botón que abre el asistente IA | todos |

## Panel (`/`)

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `panel.indicadores` | Indicadores del período (universo válido, saldo total, reconciliaciones) | todos |
| `panel.lideres` | Líder de cada ranking | todos |
| `panel.movimientos` | Movimientos significativos del último período | analista, admin |
| `panel.explicaciones` | Explicación de los movimientos (IA o reglas) | analista, admin |
| `panel.indicadores-adicionales` | Indicadores adicionales (morosidad, vencimientos y concentración; análisis fuera de los 6 rankings) | todos |

## Rankings (`/rankings`)

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `rankings.selector-ranking` | Selector de los 6 rankings | todos |
| `rankings.filtro-banco` | Filtro por banco | todos |
| `rankings.filtro-subactividad` | Filtro por subactividad | todos |
| `rankings.tabla` | Tabla del ranking (posición, saldo, total de cartera, ponderación) | todos |
| `rankings.grafico` | Gráfico de saldos por banco | todos |
| `rankings.desglose-subactividades` | Desglose por subactividad (incluye Tarjeta en CONSUMO) | todos |
| `rankings.descargar` | Descargar el ranking en CSV | todos |

## Comparar períodos (`/comparar`)

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `comparar.selector-desde` | Período inicial | analista, admin |
| `comparar.selector-hasta` | Período final | analista, admin |
| `comparar.selector-ranking` | Ranking a comparar | analista, admin |
| `comparar.tabla-movimientos` | Tabla de movimientos (cambio de posición y de saldo) | analista, admin |
| `comparar.grafico-posiciones` | Evolución de posiciones entre períodos | analista, admin |
| `comparar.descomposicion` | Por qué se movió el saldo (préstamos nuevos, que salen, amortización) | analista, admin |
| `comparar.bancos` | Comparar 2 bancos lado a lado | analista, admin |

## Reportes (`/reportes`)

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `reportes.descarga-rankings` | Entregable 2: rankings | todos |
| `reportes.descarga-subactividades` | Entregable 3: subactividades | todos |
| `reportes.descarga-calidad` | Entregable 4: calidad E1–E4 | todos |
| `reportes.descarga-movimientos` | Entregable 5: movimientos | analista, admin |
| `reportes.personalizado` | Reporte personalizado | analista, admin |

## Calidad de datos (`/calidad`)

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `calidad.cascada` | Exclusiones E1–E4 y universo local válido | todos |
| `calidad.reconciliaciones` | Reconciliaciones 1, 2, 3 y unicidad | todos |
| `calidad.alertas` | Alertas por tipo | todos |
| `calidad.excluidas` | Filas excluidas con su motivo | todos |

## Verificación (`/verificacion`)

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `verificacion.filtros` | Filtros de período y banco | todos |
| `verificacion.punto-1` | Punto 1: calidad E1–E4 y universo local válido | todos |
| `verificacion.punto-2` | Punto 2: rankings obligatorios, posiciones y saldos | todos |
| `verificacion.punto-3` | Punto 3: COMERCIO y CONSUMO | todos |
| `verificacion.punto-4` | Punto 4: total de cartera y ponderación | todos |
| `verificacion.punto-5` | Punto 5: desglose por subactividad con la reclasificación a Tarjeta | todos |
| `verificacion.punto-6` | Punto 6: los 3 períodos y las reconciliaciones 1 y 2 | todos |

## Administración (`/admin`)

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `admin.subir-archivo` | Subir un AT03 | admin |
| `admin.resultado-carga` | Resultado de la carga (E1–E4, universo, cambios de ranking) | admin |
| `admin.regla-significativo` | Regla de movimiento significativo | admin |
| `admin.catalogos` | Estado de los catálogos | admin |
| `admin.usuarios` | Usuarios: crear, cambiar perfil, contraseña, activar o desactivar | admin |
| `admin.permisos` | Perfiles y permisos: qué perfil puede usar cada opción | admin |
| `admin.bitacora` | Registro de operaciones | admin |

## Asistente IA

| `data-guia` | Elemento | Perfil |
| :--- | :--- | :--- |
| `asistente.pregunta` | Campo para escribir la pregunta | todos |

## Cómo los usa el agente

Cuando el usuario pregunta *cómo* o *dónde* hacer algo, `POST /api/ia/preguntar` devuelve `guia` con pasos ([ia.md](ia.md)). La IA solo puede usar identificadores de esta lista que el perfil pueda ver, y la `ruta` la pone el backend desde el catálogo ([`server/src/ai/guia.js`](../server/src/ai/guia.js); un test verifica que coincide con este documento). `GET /api/ia/guia` lista los elementos de cada perfil.

```json
{
  "pasos": [
    { "ruta": "/rankings", "guia": "rankings.selector-ranking", "texto": "Elige COMERCIO aquí." },
    { "ruta": "/rankings", "guia": "rankings.tabla", "texto": "En la columna Posición ves el puesto de cada banco." }
  ]
}
```
