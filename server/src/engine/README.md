# Motor de cálculo

**Responsable:** Jesús

Calcula todo lo que va en los rankings, de forma determinista y desde los archivos (regla R2: nada de saldos, posiciones ni porcentajes fijados a mano). Reglas completas en [`info/INDICACIONES_RETO_RANKING_CREDITO.md`](../../../info/INDICACIONES_RETO_RANKING_CREDITO.md), secciones 4 a 8.

- Ingesta y validación de esquema: 61 columnas, códigos como texto, integridad referencial.
- Exclusiones en cascada E1–E4 con lista trazable de filas excluidas.
- Clasificación CINU y regla SB21 de Consumo.
- Agregación en centavos enteros, rankings de 12 bancos, ponderación y desempate.
- Reconciliaciones 1, 2 y 3.

Ojo: los catálogos (`Bancos_ficticios.csv`, `Catalogo_CINU_SB109_reto.csv`, `Tabla_SB21_simplificada.csv`, `Diccionario_datos_AT03_reto.csv`) traen BOM UTF-8 al inicio aunque las indicaciones digan lo contrario; los AT03 no.
