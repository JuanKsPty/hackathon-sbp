# Client · Rankings de Crédito

React 19 + Vite (JavaScript), Tailwind CSS v4, shadcn/ui y React Router 7.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173, /api se envía al server (API_URL o http://localhost:3001)
npm run build    # genera dist/
```

Desde la raíz del repo, `npm run dev` levanta el server y el client juntos.

## Variables (archivo `.env` en la raíz del repo)

| Variable | Uso |
| :--- | :--- |
| `API_URL` | Destino del proxy `/api` en desarrollo. Vacío: `http://localhost:3001`. |
| `VITE_USAR_MOCKS` | `true` responde con los ejemplos de `/contracts` (solo en `npm run dev`; el build no los incluye). |

## Estructura de `src/`

| Carpeta | Contenido |
| :--- | :--- |
| `api/` | Cliente del API (`cliente.js`): header `X-Perfil`, errores `ApiError`, fuente y aviso, modo mock. |
| `contexto/` | Tema (claro, oscuro, sistema), perfil (con sus opciones) y período elegido. |
| `hooks/` | `useConsulta`: carga, error y reintento de una consulta. |
| `guia/` | Cursor guía del asistente (#72): motor, búsqueda de `data-guia` y capa visual. Ver [`src/guia/README.md`](src/guia/README.md). |
| `components/layout/` | `AppShell`, `Encabezado`, `BarraFuente` (siempre visible), `SelectorPerfil` y el menú, que cambia según el perfil. |
| `components/estados/` | `Cargando`, `Vacio` y `ErrorApi`. |
| `components/ui/` | Componentes de shadcn/ui (`npx shadcn add <componente>`). |
| `paginas/` | Una página por ruta: `/`, `/rankings`, `/comparar`, `/reportes`, `/calidad`, `/verificacion` (modo verificación del jurado: los 6 puntos de la sección 11.1 con sus chequeos), `/admin`. |
| `styles/tema.css` | Paleta D (SBP): único lugar con colores. Se registran como clases en `index.css`. |

## Perfiles

El `SelectorPerfil` (Público, Analista, Administrador) está en el encabezado y, por debajo de 640 px, dentro del menú móvil. El perfil elegido va en el header `X-Perfil` de cada petición. `PerfilContext` pide `GET /api/perfil` cada vez que cambia el perfil y expone:

```jsx
const { perfil, cambiarPerfil, opciones, puede, opcionesListas } = usePerfil()
puede('cargar_periodo') // true solo si las opciones del perfil lo incluyen
```

- Las opciones del API son la fuente de verdad del menú: cada sección de `components/layout/navegacion.js` puede pedir una `opcion` y `Navegacion` oculta la que el perfil no tiene.
- Mientras las opciones cargan, o si el API falla, `puede()` responde falso y el menú muestra solo lo público.
- La UI solo oculta: el backend responde 403 a lo que el perfil no puede usar.
- En modo mock (`VITE_USAR_MOCKS=true`), `/perfil` respeta el perfil elegido.

## Reglas

- Ninguna cifra (saldos, posiciones, porcentajes) se escribe en el código: todo sale del API (R2).
- Fuente, período y "Datos ficticios · Uso informativo, no opinión formal de la SBP" se ven en todas las páginas.
- La app no usa el logo ni el nombre de la SBP como marca.
