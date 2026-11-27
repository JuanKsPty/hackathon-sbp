// Los 6 puntos de la sección 11.1 de las indicaciones, en el orden en que los pide el jurado.
// Son rótulos, enlaces y descargas de pantalla: los datos y los chequeos siempre vienen de
// GET /api/verificacion (R2).
//
// - `clave`: clave del punto en `puntos` de la respuesta.
// - `alcance`: 'periodo' si el punto sigue el período elegido; 'todos' si trae todos los períodos.
// - `guia`: identificador data-guia (contracts/guia.md).
// - `verEn`: página de la app donde vive ese dato.
// - `csv`: descarga del entregable que lo respalda (api/cliente.js, urlDescarga).
export const PUNTOS = [
  {
    numero: 1,
    clave: 'calidad',
    guia: 'verificacion.punto-1',
    alcance: 'todos',
    pide: 'Los conteos E1–E4 y el universo local válido de cada período.',
    verEn: { ruta: '/calidad', nombre: 'Calidad de datos' },
    csv: { tipo: 'calidad', nombre: 'CSV de calidad', entregable: 4 },
  },
  {
    numero: 2,
    clave: 'rankings_obligatorios',
    guia: 'verificacion.punto-2',
    alcance: 'periodo',
    pide: 'La posición y el saldo de cada banco en los 4 rankings obligatorios.',
    verEn: { ruta: '/rankings', nombre: 'Rankings' },
    csv: { tipo: 'rankings', nombre: 'CSV de rankings', entregable: 2 },
  },
  {
    numero: 3,
    clave: 'rankings_adicionales',
    guia: 'verificacion.punto-3',
    alcance: 'periodo',
    pide: 'La posición y el saldo de cada banco en COMERCIO y CONSUMO.',
    verEn: { ruta: '/rankings', nombre: 'Rankings' },
    csv: { tipo: 'rankings', nombre: 'CSV de rankings', entregable: 2 },
  },
  {
    numero: 4,
    clave: 'ponderacion',
    guia: 'verificacion.punto-4',
    alcance: 'periodo',
    pide: 'El total de cartera local válida y la ponderación, con el denominador correcto.',
    verEn: { ruta: '/rankings', nombre: 'Rankings' },
    csv: { tipo: 'rankings', nombre: 'CSV de rankings', entregable: 2 },
  },
  {
    numero: 5,
    clave: 'subactividades',
    guia: 'verificacion.punto-5',
    alcance: 'periodo',
    pide: 'El desglose por subactividad, con la reclasificación SB21 a Tarjeta.',
    verEn: { ruta: '/rankings', nombre: 'Rankings' },
    csv: { tipo: 'subactividades', nombre: 'CSV de subactividades', entregable: 3 },
  },
  {
    numero: 6,
    clave: 'periodos',
    guia: 'verificacion.punto-6',
    alcance: 'todos',
    pide: 'Los períodos procesados y las reconciliaciones 1 y 2 cuadradas.',
    verEn: { ruta: '/calidad', nombre: 'Calidad de datos' },
    csv: { tipo: 'calidad', nombre: 'CSV de calidad', entregable: 4 },
  },
]

// Un punto cumple si pasan todos sus chequeos (la sección 12 de las indicaciones).
export const cumple = (resultado) => Boolean(resultado?.chequeos?.every((c) => c.ok))
