# Totales por producto de crédito

Un "producto" es cada una de las **22 subactividades** del catálogo CINU (`Subactividad_Reto`), agrupadas en sus 6 rankings. Los totales los calcula el motor (`server/src/engine/productos.js`) a partir del desglose del período, que ya trae la reclasificación SB21: los créditos personales con facilidad `07` cuentan en **CONSUMO / Tarjeta**.

- **Montos:** se suman en centavos enteros y se entregan como número con 2 decimales.
- **Porcentajes:** se calculan con `ponderacionE4` (BigInt, redondeo half-up) y se entregan con 4 decimales.
- **Códigos de banco:** van como texto (`"101"`).

## `GET /api/productos`
| Parámetro (query, opcional) | Por defecto | Efecto |
| :--- | :--- | :--- |
| `periodo` | último cargado | período `AAAAMMDD`, o `todos` para el acumulado de los cortes cargados |

Lo pueden consultar los 3 perfiles. En el sitio público está en la lista blanca de nginx.

### Campos de primer nivel
| Campo | Regla |
| :--- | :--- |
| `fuente`, `aviso`, `periodo`, `archivo` | encabezado común de la API ([consulta.md](consulta.md)) |
| `Saldo_Total_Valido` | saldo del universo local válido del período (igual que `/api/calidad`) |
| `Universo_Local_Valido` | cantidad de préstamos del universo local válido |
| `Reclasificadas_Tarjeta` | operaciones que la regla SB21 movió a Tarjeta |
| `productos[]` | los 22 productos, en el orden del catálogo: cada ranking y luego sus subactividades |
| `bancos[]` | los 12 bancos, ordenados por código |

### `productos[]`
| Campo | Regla |
| :--- | :--- |
| `Ranking`, `Subactividad` | nombres del catálogo CINU |
| `Saldo` | suma del desglose de la subactividad en los 12 bancos |
| `Operaciones` | préstamos válidos de la subactividad (`null` si el período no trae operaciones) |
| `Pct_Del_Ranking` | `Saldo / total del ranking × 100` |
| `Pct_Del_Total` | `Saldo / Saldo_Total_Valido × 100` |
| `Lider` | banco con más saldo en la subactividad; en empate, el código menor. `null` si la subactividad no tiene saldo |
| `Bancos[]` | los 12 bancos por código: `Codigo_Banco`, `Banco`, `Saldo` y `Operaciones` |

### `bancos[]`
| Campo | Regla |
| :--- | :--- |
| `Total_Cartera_Local_Valida` | saldo del banco en las 6 actividades (el mismo denominador de la ponderación) |
| `Operaciones_Validas` | préstamos válidos del banco en todo el universo |

### Controles (pruebas en `server/tests/productos.test.js`)
- La suma de `Bancos[].Saldo` es igual a `Saldo`.
- La suma de los productos de un ranking es igual al total del ranking.
- La suma de todos los productos es igual a `Saldo_Total_Valido`.
- El `Saldo` de Tarjeta es el desglose de CONSUMO / Tarjeta, con la reclasificación SB21 incluida.

### Ejemplo
Los números son **ilustrativos** y el ejemplo está recortado: la respuesta real trae 22 productos, y 12 bancos en cada lista.

```json
{
  "fuente": "AT03 sintético · Hackathon SBP 2026",
  "aviso": "Datos ficticios · Uso informativo, no opinión formal de la SBP",
  "periodo": "20260930",
  "archivo": "AT03_sintetico_202609.csv",
  "Saldo_Total_Valido": 5000000000.00,
  "Universo_Local_Valido": 28000,
  "Reclasificadas_Tarjeta": 350,
  "productos": [
    {
      "Ranking": "CONSUMO",
      "Subactividad": "Tarjeta",
      "Saldo": 30000000.00,
      "Operaciones": 2000,
      "Pct_Del_Ranking": 27.5,
      "Pct_Del_Total": 0.6,
      "Lider": { "Codigo_Banco": "112", "Banco": "Banco Solidez", "Saldo": 3300000.00 },
      "Bancos": [
        { "Codigo_Banco": "101", "Banco": "Banco Istmo", "Saldo": 1900000.00, "Operaciones": 170 },
        { "Codigo_Banco": "102", "Banco": "Banco Horizonte", "Saldo": 2000000.00, "Operaciones": 160 }
      ]
    }
  ],
  "bancos": [
    { "Codigo_Banco": "101", "Banco": "Banco Istmo", "Total_Cartera_Local_Valida": 420000000.00, "Operaciones_Validas": 2300 }
  ]
}
```

## Errores
Usan el formato común de [`consulta.md`](consulta.md#errores): `PARAMETRO_INVALIDO` (400) si `periodo` no es `AAAAMMDD` ni `todos`, y `PERIODO_SIN_DATOS` (404) si el período no está cargado.
