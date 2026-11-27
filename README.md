# Rankings de crédito · Hackathon SBP 2026

App web que toma los archivos sintéticos AT03 (julio, agosto y septiembre de 2026, 12 bancos ficticios) y genera rankings de crédito por banco y actividad económica, con comparación entre períodos, 3 perfiles (Público, Analista, Administrador) y reportes descargables.

> Datos ficticios · Uso informativo, no opinión formal de la SBP

## Información del reto

Todo lo que entregó la SBP está en [`info/`](info/):

| Archivo | Contenido |
| :--- | :--- |
| [`info/INDICACIONES_RETO_RANKING_CREDITO.md`](info/INDICACIONES_RETO_RANKING_CREDITO.md) | Reglas de cálculo, entregables y evaluación. **Manda sobre la presentación.** |
| `info/Hackathon_SBP_2026.pptx` | Presentación del reto: módulos, perfiles, lineamientos técnicos |
| `info/datos/` | AT03 de los 3 períodos, catálogo CINU/SB109, tabla SB21, bancos y diccionario de datos |

## Estructura

```
/info              paquete original de la SBP (no se modifica)
/data              copia de los CSV que lee la app
/server            Node.js + Express
  /src
    /engine        motor de cálculo (Jesús)
    /routes        endpoints del API
    /automation    automatizaciones (Juan + Agustín)
    /ai            IA para explorar y explicar (Agustín)
    /middleware    perfiles y control de acceso (Juan)
  /tests
/client            React + Vite
  /src
/contracts         formatos JSON de la API con ejemplos
```

Los CSV se guardan sin conversión de fin de línea (`.gitattributes`): abrirlos en Excel borra los ceros a la izquierda de los códigos (`07` → `7`), así que impórtalos siempre como texto.

## Cómo correrlo

Requiere Node.js 22 o superior.

```bash
cp .env.example .env   # opcional: todo vacío usa los valores por defecto
npm install            # instala la raíz, server/ y client/
npm run dev            # API en http://localhost:3001 y client en http://localhost:5173
```

Otros scripts de la raíz: `npm start` (solo el server), `npm test` (pruebas del server) y `npm run build` (build del client).

## Cómo contribuir

Una rama por issue (`feat/<n>-descripcion`), un PR que cierra el issue (`Closes #n`) y merge a `main`. Nunca subas contraseñas, tokens ni llaves (regla R5).

## Equipo

- **Jesús:** backend (motor de cálculo, exclusiones, CINU, SB21, rankings, reconciliaciones, exportaciones, tests) e identidad visual inicial.
- **Juan:** repo, infraestructura, perfiles y control de acceso; luego backend y automatizaciones.
- **Agustín:** frontend, IA para explorar y explicar los datos, y automatizaciones.
