# Client · Rankings de Crédito

React 19 + Vite (JavaScript), Tailwind CSS v4, shadcn/ui y React Router 7.

## Uso

```bash
npm install
npm run dev      # los dos sitios: público en :5173 e interno en :5174; /api va al server (API_URL o :3001)
npm run build    # genera dist-publico/ y dist-interno/
```

Desde la raíz del repo, `npm run dev` levanta el server y los dos sitios juntos.

## Dos sitios

El mismo código genera dos bundles con `SITIO=publico | interno` (`npm run dev:publico`, `dev:interno`, `build:publico`, `build:interno`):

| | Público (`SITIO=publico`) | Interno (`SITIO=interno`) |
| :--- | :--- | :--- |
| Dominio | `sbp.juank.tech` | `interno.sbp.juank.tech` |
| Inicio de sesión | No: siempre perfil Público | Sí (`/entrar`); el perfil sale de la cuenta |
| Rutas | `src/sitios/publico.jsx`: Panel, Rankings, Reportes, Calidad, Verificación, Asistente y `/presentacion` | `src/sitios/interno.jsx`: además Comparar y Administración |
| Service worker | Sí (#8) | No (borra uno viejo) |
| nginx | `nginx.publico.conf`: lista blanca del API, sin cookies | `nginx.interno.conf`: todo el API |

- `vite.config.js` apunta el alias `#sitio` a la tabla de rutas del sitio y define la constante `__INTERNO__`. El código que va detrás de `__INTERNO__` o solo en `sitios/interno.jsx` no entra en el bundle público (CI lo revisa buscando textos del login y de Administración en `dist-publico`).
- El proxy de Vite y nginx mandan `X-Sitio` en cada petición al API; el navegador no lo elige.
- `api/sesion.js`: `entrar`, `salir`, `rutaSegura` (vuelta después del login, solo rutas propias) y la redirección a `/entrar` ante un 401 `SESION_REQUERIDA`.
- Todas las peticiones mandan `X-Sbp: 1` (el server lo exige en POST, PUT y DELETE contra CSRF).

## Variables (archivo `.env` en la raíz del repo)

| Variable | Uso |
| :--- | :--- |
| `API_URL` | Destino del proxy `/api` en desarrollo. Vacío: `http://localhost:3001`. |
| `VITE_USAR_MOCKS` | `true` responde con los ejemplos de `/contracts` (solo en `npm run dev`; el build no los incluye). |

## Estructura de `src/`

| Carpeta | Contenido |
| :--- | :--- |
| `api/` | Cliente del API (`cliente.js`): header `X-Sbp`, errores `ApiError`, fuente y aviso, modo mock. Sesión en `sesion.js`. |
| `contexto/` | Tema (claro, oscuro, sistema), perfil de la sesión (con sus opciones) y período elegido. |
| `sitios/` | Tabla de rutas de cada sitio (`publico.jsx`, `interno.jsx`). |
| `hooks/` | `useConsulta`: carga, error y reintento de una consulta. |
| `guia/` | Cursor guía del asistente (#72): motor, búsqueda de `data-guia` y capa visual. Ver [`src/guia/README.md`](src/guia/README.md). |
| `components/layout/` | `AppShell`, `Encabezado` (arriba a la derecha solo el botón del agente), `BarraFuente` (siempre visible) y el menú lateral, que cambia según el perfil. Al pie del menú, `PerfilLateral` reúne `SesionUsuario` (usuario y Salir en el sitio interno; "Consulta pública" en el público) y el tema. El período de los datos (`PeriodoDePagina`, por mes: "Septiembre 2026") va junto al título de Panel, Rankings y Calidad, con la prop `acciones` de `Pagina`. |
| `components/estados/` | `Cargando`, `Vacio` y `ErrorApi`. |
| `components/ui/` | Componentes de shadcn/ui (`npx shadcn add <componente>`). |
| `paginas/` | Una página por ruta: `/`, `/rankings`, `/comparar`, `/reportes`, `/calidad`, `/verificacion` (modo verificación del jurado: los 6 puntos de la sección 11.1 con sus chequeos), `/admin` y `/presentacion` (solo sitio público: láminas a pantalla completa, sin el menú, con las cifras del API en vivo; las láminas están en `components/presentacion/`). |
| `styles/tema.css` | Tokens de la base visual (#138, ver [`DISENO.md`](DISENO.md)): único lugar con colores. Se registran como clases en `index.css`. |

## Perfiles

El perfil ya no se elige: en el sitio público siempre es Público y en el interno sale de la cuenta con la que se entró (cookie de sesión HttpOnly). `PerfilContext` pide `GET /api/perfil` y expone:

```jsx
const { perfil, usuario, opciones, puede, opcionesListas, recargar } = usePerfil()
puede('cargar_periodo') // true solo si las opciones del perfil lo incluyen
```

- Las opciones del API son la fuente de verdad del menú: cada sección de `components/layout/navegacion.js` puede pedir una `opcion` y `Navegacion` oculta la que el perfil no tiene.
- Mientras las opciones cargan, o si el API falla, `puede()` responde falso y el menú muestra solo lo público.
- La UI solo oculta: el backend responde 401/403 a lo que el perfil no puede usar.
- En el sitio interno, `RequiereSesion` manda a `/entrar` si no hay sesión; `SesionUsuario` muestra la cuenta y el botón Salir.

## Reglas

- Ninguna cifra (saldos, posiciones, porcentajes) se escribe en el código: todo sale del API (R2).
- Fuente, período y "Datos ficticios · Uso informativo, no opinión formal de la SBP" se ven en todas las páginas.
- El logo es el oficial de la SBP (`public/marca/`: `logo.svg` es el emblema del menú; `sbp-logo.png` y `sbp-logo-blanco.png`, el logo completo para claro y oscuro). El aviso de datos ficticios y de uso informativo nunca se quita.
