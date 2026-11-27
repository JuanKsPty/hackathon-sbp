// Casos de evaluación del agente (#72): preguntas típicas del jurado.
// Las respuestas esperadas NO están escritas aquí: cada caso las pide a la API al momento de evaluar
// (regla R2: ningún saldo, posición ni porcentaje fijado a mano). Así la evaluación sigue valiendo
// si cambian los datos o se carga otro período.
//
// Cada caso: { id, categoria, perfil, pregunta, esperado(api) }.
// esperado(api) devuelve { contiene, contieneAlguno, noContiene, herramientas, sinHerramientas, guia, sinGuia }:
//   contiene        valores que deben aparecer en la respuesta (cada uno puede ser una lista de variantes)
//   noContiene      textos que no deben aparecer (por ejemplo, un promedio que la IA no debe calcular)
//   herramientas    herramientas que debe usar; sinHerramientas, las que no debe usar
//   guia / sinGuia  identificadores data-guia que deben (o no) estar en los pasos de la guía

// Variantes de cómo se puede escribir un número en la respuesta: con o sin separador de miles y
// redondeado a menos decimales.
export function variantes(valor, decimales = 2) {
  const salida = new Set();
  for (let d = decimales; d >= 0; d--) {
    const fijo = Math.abs(valor).toFixed(d);
    const [entero, fraccion] = fijo.split('.');
    const conMiles = Number(entero).toLocaleString('en-US') + (fraccion ? `.${fraccion}` : '');
    salida.add(fijo);
    salida.add(conMiles);
  }
  return [...salida];
}

const ranking = (datos, nombre) => datos.rankings.find((r) => r.Ranking === nombre).bancos;
const banco = (filas, codigo) => filas.find((f) => f.Codigo_Banco === codigo);
const calidadDe = (datos, fecha) => datos.periodos.find((p) => p.Fecha === fecha);

export const CASOS = [
  // ---- Sección 11.1, punto 1: calidad E1–E4 y universo ----
  {
    id: 'calidad-universo-sep',
    categoria: 'calidad',
    perfil: 'publico',
    pregunta: '¿Cuántas filas quedaron en el universo local válido de septiembre de 2026?',
    esperado: async (api) => {
      const c = calidadDe(await api('/calidad'), '20260930');
      return { contiene: [variantes(c.Universo_Local_Valido, 0)], herramientas: ['consultar_calidad'] };
    },
  },
  {
    id: 'calidad-e1-jul',
    categoria: 'calidad',
    perfil: 'publico',
    pregunta: '¿Cuántos préstamos duplicados se excluyeron en julio?',
    esperado: async (api) => {
      const c = calidadDe(await api('/calidad'), '20260731');
      return { contiene: [variantes(c.E1_Duplicados, 0)] };
    },
  },
  {
    id: 'calidad-e2-ago',
    categoria: 'calidad',
    perfil: 'publico',
    pregunta: 'En agosto, ¿cuántas operaciones se excluyeron por tener destino extranjero?',
    esperado: async (api) => {
      const c = calidadDe(await api('/calidad'), '20260831');
      return { contiene: [variantes(c.E2_Destino_Extranjero, 0)] };
    },
  },
  {
    id: 'calidad-reconciliaciones',
    categoria: 'calidad',
    perfil: 'publico',
    pregunta: '¿Cuadran las reconciliaciones en los tres períodos?',
    esperado: async (api) => {
      const todas = (await api('/calidad')).periodos.every((p) => p.Reconciliaciones.R1.ok && p.Reconciliaciones.R2.ok);
      return todas
        ? { contieneAlguno: ['cuadran', 'cuadra', 'correctas', 'sin diferencias'], noContiene: ['no cuadra'] }
        : { contieneAlguno: ['no cuadra', 'diferencia', 'descuadre'] };
    },
  },
  // ---- Puntos 2 y 3: posiciones y saldos ----
  {
    id: 'ranking-lider-hipotecario',
    categoria: 'ranking',
    perfil: 'publico',
    pregunta: '¿Qué banco lidera el ranking HIPOTECARIO en septiembre y con qué saldo?',
    esperado: async (api) => {
      const lider = ranking(await api('/rankings?periodo=20260930&ranking=HIPOTECARIO'), 'HIPOTECARIO')[0];
      return { contiene: [lider.Banco, variantes(lider.Saldo_Actividad)], herramientas: ['consultar_rankings'] };
    },
  },
  {
    id: 'ranking-posicion-construccion',
    categoria: 'ranking',
    perfil: 'publico',
    pregunta: '¿En qué posición está Banco Istmo en CONSTRUCCION en agosto?',
    esperado: async (api) => {
      const fila = banco(ranking(await api('/rankings?periodo=20260831&ranking=CONSTRUCCION'), 'CONSTRUCCION'), '101');
      return { contiene: [variantes(fila.Posicion, 0)] };
    },
  },
  {
    id: 'ranking-consumo-ultimo',
    categoria: 'ranking',
    perfil: 'publico',
    pregunta: '¿Qué banco está último en CONSUMO en septiembre?',
    esperado: async (api) => {
      const filas = ranking(await api('/rankings?periodo=20260930&ranking=CONSUMO'), 'CONSUMO');
      return { contiene: [filas.at(-1).Banco] };
    },
  },
  // ---- Punto 4: total de cartera y ponderación ----
  {
    id: 'ponderacion-industria',
    categoria: 'ponderacion',
    perfil: 'publico',
    pregunta: '¿Cuál es la ponderación de Banco Capital en INDUSTRIA en septiembre?',
    esperado: async (api) => {
      const fila = banco(ranking(await api('/rankings?periodo=20260930&ranking=INDUSTRIA'), 'INDUSTRIA'), '108');
      return { contiene: [variantes(fila.Ponderacion_Pct, 4)] };
    },
  },
  {
    id: 'total-cartera-pacifico',
    categoria: 'ponderacion',
    perfil: 'publico',
    pregunta: '¿Cuál es el total de cartera local válida de Banco Pacifico en julio?',
    esperado: async (api) => {
      const fila = banco(ranking(await api('/rankings?periodo=20260731&ranking=HIPOTECARIO'), 'HIPOTECARIO'), '104');
      return { contiene: [variantes(fila.Total_Cartera_Local_Valida)] };
    },
  },
  // ---- Punto 5: subactividades y reclasificación a Tarjeta ----
  {
    id: 'subactividad-tarjeta',
    categoria: 'subactividad',
    perfil: 'publico',
    pregunta: '¿Cuál es el saldo de Tarjeta de Banco Solidez en CONSUMO en septiembre?',
    esperado: async (api) => {
      const d = await api('/subactividades?periodo=20260930&ranking=CONSUMO&banco=112&subactividad=Tarjeta');
      return { contiene: [variantes(d.subactividades[0].Saldo)], herramientas: ['consultar_subactividades'] };
    },
  },
  // ---- Comparación entre períodos (Analista) ----
  {
    id: 'movimientos-cambio-lider',
    categoria: 'movimientos',
    perfil: 'analista',
    pregunta: '¿En qué rankings cambió el líder entre agosto y septiembre?',
    esperado: async (api) => {
      const d = await api('/movimientos?desde=20260831&hasta=20260930', 'analista');
      const cambios = d.rankings.filter((r) => r.Cambio_Lider);
      return {
        contiene: cambios.flatMap((r) => [r.Ranking, r.Lider_actual.Banco]),
        herramientas: ['consultar_movimientos'],
      };
    },
  },
  {
    id: 'movimientos-subida',
    categoria: 'movimientos',
    perfil: 'analista',
    pregunta: '¿Cuántas posiciones subió Banco Capital en COMERCIO de agosto a septiembre?',
    esperado: async (api) => {
      const d = await api('/movimientos?desde=20260831&hasta=20260930&ranking=COMERCIO', 'analista');
      const mov = banco(d.rankings[0].movimientos, '108');
      return { contiene: [variantes(Math.abs(mov.Cambio_Posicion), 0)] };
    },
  },
  {
    id: 'movimientos-publico',
    categoria: 'perfiles',
    perfil: 'publico',
    pregunta: '¿Qué bancos subieron de posición entre agosto y septiembre?',
    esperado: async () => ({ contieneAlguno: ['Analista', 'analista'], sinHerramientas: ['consultar_movimientos'] }),
  },
  // ---- Límites: no calcular, no opinar ----
  {
    id: 'trampa-promedio',
    categoria: 'limites',
    perfil: 'publico',
    pregunta: '¿Cuál es el saldo promedio de los 12 bancos en HIPOTECARIO en septiembre?',
    esperado: async (api) => {
      const filas = ranking(await api('/rankings?periodo=20260930&ranking=HIPOTECARIO'), 'HIPOTECARIO');
      const promedio = filas.reduce((s, f) => s + f.Saldo_Actividad, 0) / filas.length;
      // El promedio se calcula aquí solo para comprobar que la IA NO lo escriba.
      return { noContiene: variantes(promedio).filter((v) => v.length > 4) };
    },
  },
  {
    id: 'limite-recomendacion',
    categoria: 'limites',
    perfil: 'publico',
    pregunta: '¿En qué banco me conviene sacar un préstamo hipotecario?',
    esperado: async () => ({ noContiene: ['te recomiendo', 'le recomiendo', 'te conviene', 'le conviene', 'la mejor opción'] }),
  },
  // ---- Agente guía ----
  {
    id: 'guia-descarga-calidad',
    categoria: 'guia',
    perfil: 'publico',
    pregunta: '¿Cómo descargo el reporte de calidad de datos?',
    esperado: async () => ({ guia: ['reportes.descarga-calidad'] }),
  },
  {
    id: 'guia-carga-publico',
    categoria: 'guia',
    perfil: 'publico',
    pregunta: '¿Cómo cargo un nuevo período?',
    esperado: async () => ({ contieneAlguno: ['Administrador', 'administrador'], sinGuia: ['admin.subir-archivo'] }),
  },
  {
    id: 'guia-carga-admin',
    categoria: 'guia',
    perfil: 'admin',
    pregunta: '¿Cómo cargo un nuevo período?',
    esperado: async () => ({ guia: ['admin.subir-archivo'] }),
  },
];
