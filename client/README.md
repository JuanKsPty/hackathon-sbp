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
| `contexto/` | Tema (claro, oscuro, sistema), perfil y período elegido. |
| `hooks/` | `useConsulta`: carga, error y reintento de una consulta. |
| `components/layout/` | `AppShell`, `Encabezado`, `BarraFuente` (siempre visible) y menú. |
| `components/estados/` | `Cargando`, `Vacio` y `ErrorApi`. |
| `components/ui/` | Componentes de shadcn/ui (`npx shadcn add <componente>`). |
| `paginas/` | Una página por ruta: `/`, `/rankings`, `/comparar`, `/reportes`, `/calidad`, `/admin`. |
| `styles/tema.css` | Paleta D (SBP): único lugar con colores. Se registran como clases en `index.css`. |

## Reglas

- Ninguna cifra (saldos, posiciones, porcentajes) se escribe en el código: todo sale del API (R2).
- Fuente, período y "Datos ficticios · Uso informativo, no opinión formal de la SBP" se ven en todas las páginas.
- La app no usa el logo ni el nombre de la SBP como marca.
