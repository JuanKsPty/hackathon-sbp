# Guía visual

## Dos estilos

Decisión de Juan:

- **La app** usa la paleta E+ (azul institucional claro): azul medio `#1656A4`, fondos pizarra casi blancos, barra lateral blanca y modo oscuro carbón. Las fuentes son Roboto y Roboto Mono. Los botones y las tarjetas son los de shadcn, con radio 6 px. Las páginas usan `Pagina` (título, descripción y `acciones` a la derecha; ahí va el período en Panel, Rankings y Calidad).
- **La landing** pública (#139) usa la base visual de #138, descrita en el resto de esta guía: blanco y negro con acento verde, Inter, botones en píldora y tarjetas con radio 16 y sombra suave. Para eso, la landing envuelve su contenido en un contenedor con la clase **`estilo-landing`**: dentro, `tema.css` y `index.css` cambian los tokens, la fuente y las formas. Fuera de ese contenedor no se usan `BloqueOscuro`, `TituloDosTonos` ni las píldoras.

El logo es el oficial de la SBP: el emblema en el menú, el favicon y los íconos, y el logo completo en Entrar (`public/marca/`). Layout de la app: barra lateral con las secciones y, al pie, el perfil (sesión, tema y enlace al otro sitio). Arriba a la derecha solo va el botón del agente.

---

# Base visual de la landing (#138)

## Reglas que no se rompen

- La fuente, el período y el aviso "Datos ficticios · Uso informativo, no opinión formal de la SBP" se ven en todas las pantallas.
- Todos los `data-guia` de `contracts/guia.md` siguen en su lugar. Los componentes de `marca/` pasan `...props`, así que `data-guia` se les puede poner directo.
- Ninguna cifra se escribe a mano (R2): `Cifra`, títulos y gráficos reciben valores que salen de los datos.
- Modo oscuro, 360 px, PWA, perfiles y modo mocks (`VITE_USAR_MOCKS=true`), en la landing y en la app.
- Arriba a la derecha del encabezado solo va el botón del agente ("Asistente IA"). Abre el chat flotante debajo de él. El cursor y los resaltados del agente usan el token `agente` (naranja).
- Solo clases de tokens (`bg-background`, `text-sube`, …). Nada de colores sueltos en los componentes.

## Tokens de la landing (`.estilo-landing` en `src/styles/tema.css`)

Los nombres son los de siempre (shadcn más `sube`, `baja`, `igual`, `destacado` y `aviso`). Se suman `marca`, `marca-fondo`, `brillo`, `bloque`, `bloque-foreground`, `bloque-muted` y `seccion`.

| Uso | Claro | Oscuro | Clase |
| --- | --- | --- | --- |
| Fondo | `#FFFFFF` | `#0B0B0C` | `bg-background` |
| Sección gris | `#F4F4F5` | `#111113` | `bg-seccion`, `bg-muted` |
| Tarjeta | `#FFFFFF` | `#141416` | `bg-card` |
| Texto | `#0B0B0C` | `#F4F4F5` | `text-foreground` |
| Texto secundario | `#6B6B70` | `#A1A1A8` | `text-muted-foreground` |
| Borde | `#E7E7EA` | `#26262A` | `border-border` |
| Primario (píldora) | negro `#0B0B0C` | blanco `#FFFFFF` | `bg-primary` |
| Ícono verde | `#1F9D63` | `#34D399` | `text-marca` |
| Texto verde y etiqueta | `#157A4C` sobre `#E7F6EE` | `#34D399` sobre `#0F2A1F` | `text-accent-foreground bg-accent` |
| Brillo menta | `#6EE7B7` | `#6EE7B7` | `brillo-menta` (nunca bajo texto) |
| Sube / baja / igual | `#157A4C` / `#B42318` / `#6B6B70` | `#34D399` / `#F87171` / `#A1A1A8` | `text-sube`, `bg-sube-fondo`, … |
| Destacado y aviso | ámbar `#8A5A00` sobre `#FDF3DC` | `#FBBF24` sobre `#2A2110` | `text-aviso bg-aviso-fondo` |

Contraste: texto 4.5:1 y marcas de gráfico 3:1. El verde `#1F9D63` da 3.5:1 sobre blanco: sirve para íconos y marcas, no para texto chico (por eso el texto verde es `#157A4C`).

Gráficos (Recharts): `--chart-1` verde, `--chart-2` negro (blanco en oscuro), `--chart-3` ámbar, `--chart-4` gris y `--chart-5` gris claro (apagado). Línea o área verde con relleno degradado suave y ejes finos en `var(--border)`.

Radios y sombra: `rounded-tarjeta` (16 px), `rounded-seccion` (24 px), `rounded-bloque` (28 px) y `shadow-tarjeta` (`0 8px 30px rgba(0,0,0,.06)`).

## Tipografía

Inter Variable (`@fontsource-variable/inter`, empaquetada para correr sin internet). Titulares grandes, `font-medium` y `tracking-tight`, en dos tonos con `TituloDosTonos`. Las cifras llevan `tabular-nums` (clase `cifra` o la de Tailwind).

## Primitivas (`src/components/ui/`)

- **Button**: dentro de `.estilo-landing` son píldora (fuera, el botón de siempre). `variant="default"` es el negro (blanco en oscuro) y `variant="outline"` el blanco con borde. Sobre `BloqueOscuro` van `variant="claro"` y `variant="borde-claro"`. `size="pildora"` es la píldora grande de las llamadas a la acción.
- **Card**: `superficie="tarjeta"` (por defecto) es blanca, con radio 16 y sombra. `superficie="seccion"` es gris, con radio 24 y sin sombra.
- **Badge**: píldora. Variantes nuevas: `marca`, `sube`, `baja`, `igual`, `destacado` y `aviso`. `size="pildora"` la hace más alta.

## Componentes de marca (`src/components/marca/`)

```jsx
import { BloqueOscuro, Cifra, Etiqueta, SeccionGris, Segmentado, TituloDosTonos } from '@/components/marca'
```

| Componente | API | Para qué |
| --- | --- | --- |
| `BloqueOscuro` | `({ children, className })` | Bloque negro con radio 28, cuadrícula y brillo menta. Hero y llamadas a la acción. Dentro, `Etiqueta` y `TituloDosTonos` pasan solos a tonos claros. |
| `Etiqueta` | `({ icono, children })` | Píldora chica con ícono lucide sobre los títulos. `icono` es el componente, p. ej. `TrophyIcon`. |
| `TituloDosTonos` | `({ como = 'h2', fuerte, suave, className })` | Titular: `fuerte` en `text-foreground` y `suave` en `text-muted-foreground`. Tamaño según `como` (`h1`, `h2` o `h3`). |
| `SeccionGris` | `({ children, className })` | Sección gris con radio 24, para agrupar tarjetas blancas. |
| `Segmentado` | `({ opciones: [{ valor, etiqueta }], valor, onCambio, ariaLabel })` | Control segmentado tipo píldora. Es un `radiogroup`: Tab entra a la opción elegida y las flechas, Inicio y Fin cambian de opción. |
| `Cifra` | `({ etiqueta, valor, detalle, variacion })` | Tarjeta de cifra clave. `variacion` es opcional: `{ tendencia: 'sube' \| 'baja' \| 'igual', texto }` o un número (el signo da la tendencia). |

Ejemplo:

```jsx
<BloqueOscuro>
  <Etiqueta icono={RadarIcon}>Período {periodo}</Etiqueta>
  <TituloDosTonos como="h1" fuerte="Rankings de crédito" suave="por banco, cada mes" className="mt-4" />
  <Button variant="claro" size="pildora" className="mt-6">Ver rankings</Button>
</BloqueOscuro>

<SeccionGris className="grid gap-4 sm:grid-cols-3">
  <Cifra etiqueta="Saldo total" valor={formatoMonto(total)} variacion={{ tendencia: 'sube', texto: formatoPct(cambio) }} />
</SeccionGris>
```

## Animación

`animate-aparecer` hace una aparición suave (opacidad y 8 px hacia arriba). Con `prefers-reduced-motion: reduce` se apagan todas las animaciones y transiciones.
