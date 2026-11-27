// Herramientas de consulta que usa el agente de exploración (#3) y que reutilizará el servidor
// MCP (#6). Cada herramienta es un GET de solo lectura a la API del motor: la IA nunca calcula,
// solo lee resultados ya calculados (sección 9 de las indicaciones).
// Respeta los perfiles (#28): cada consulta lleva el X-Perfil del usuario y una herramienta con
// `opcion` solo se ofrece a los perfiles que la tienen (por ejemplo, comparar períodos).
import { perfilesConOpcion } from '../middleware/perfiles.js';
import { MOTIVOS } from '../engine/cascada.js';

const texto = (description) => ({ type: 'string', description });
const PERIODO = texto('Período en formato AAAAMMDD (por ejemplo 20260930). Si se omite, el último cargado.');

function esquema(properties = {}) {
  return { type: 'object', properties, additionalProperties: false };
}

// Los rankings y los bancos que nombran las descripciones salen del catálogo, no se escriben a mano
// (C4 de #86, igual que docs/openapi.js). Sin catálogo (por ejemplo, el MCP por stdio, que solo ve la
// API por HTTP) las descripciones mandan a consultar_catalogos en vez de listarlos.
function descripcionesDelCatalogo(catalogos) {
  const rankings = catalogos?.macroactividades ?? [];
  const codigos = [...(catalogos?.bancos.keys() ?? [])].sort();
  const sinCatalogo = 'Los valores válidos están en consultar_catalogos.';
  return {
    cantidadBancos: codigos.length > 0 ? `${codigos.length} ` : '',
    cantidadRankings: rankings.length > 0 ? `${rankings.length} ` : '',
    ranking: rankings.length > 0 ? `Ranking: ${rankings.join(', ')}.` : `Nombre del ranking. ${sinCatalogo}`,
    banco: codigos.length > 0
      ? `Código de banco de 3 dígitos (${codigos[0]} a ${codigos.at(-1)}). Los nombres y códigos están en consultar_catalogos.`
      : `Código de banco de 3 dígitos. ${sinCatalogo}`,
  };
}

/** Las herramientas con sus descripciones; con `catalogos` (el del almacén) nombran los rankings y bancos reales. */
function crearHerramientas(catalogos) {
  const d = descripcionesDelCatalogo(catalogos);
  const RANKING = texto(d.ranking);
  const BANCO = texto(d.banco);
  return [
    {
      name: 'listar_periodos',
      description: 'Períodos cargados (AAAAMMDD), el último disponible, filas leídas, universo local válido, saldo total válido y si las reconciliaciones cuadran.',
      input_schema: esquema(),
      ruta: '/periodos',
    },
    {
      name: 'consultar_catalogos',
      description: `Catálogo de los ${d.cantidadBancos}bancos (código y nombre) y de los ${d.cantidadRankings}rankings con sus subactividades. Úsala para traducir nombres de banco a código.`,
      input_schema: esquema(),
      ruta: '/catalogos',
    },
    {
      name: 'consultar_rankings',
      description: 'Rankings de un período: por banco, Posicion, Saldo_Actividad, Total_Cartera_Local_Valida, Ponderacion_Pct y Operaciones_Validas. Filtrable por ranking y banco.',
      input_schema: esquema({ periodo: PERIODO, ranking: RANKING, banco: BANCO }),
      ruta: '/rankings',
    },
    {
      name: 'consultar_subactividades',
      description: 'Desglose del saldo por subactividad y banco en un período (incluye la reclasificación SB21 de Crédito personal a Tarjeta en CONSUMO).',
      input_schema: esquema({
        periodo: PERIODO,
        ranking: RANKING,
        banco: BANCO,
        subactividad: texto('Nombre exacto de la subactividad según consultar_catalogos.'),
      }),
      ruta: '/subactividades',
    },
    {
      name: 'consultar_calidad',
      description: 'Reporte de calidad por período: filas leídas, exclusiones en cascada E1 (duplicados), E2 (destino extranjero), E3 (saldo no positivo), E4 (actividad no catalogada), universo local válido, alertas y reconciliaciones.',
      input_schema: esquema({ periodo: PERIODO }),
      ruta: '/calidad',
    },
    {
      name: 'consultar_excluidas',
      description: 'Filas excluidas de un período con su motivo (E1 a E4). Trae "total" y una muestra de filas; usa los filtros para acotar.',
      input_schema: esquema({
        periodo: PERIODO,
        motivo: { type: 'string', enum: Object.keys(MOTIVOS), description: 'Motivo de exclusión.' },
        banco: BANCO,
      }),
      ruta: '/excluidas',
      limite: 20,
    },
    {
      name: 'consultar_movimientos',
      description: 'Comparación de rankings entre dos períodos: Posicion_anterior, Posicion_actual, Cambio_Posicion (positivo = sube), Saldo_anterior, Saldo_actual, Var_Saldo, Var_Saldo_Pct, si es significativo y por qué, y cambios de líder. Por defecto compara el último período con el anterior.',
      input_schema: esquema({
        desde: texto('Período inicial AAAAMMDD.'),
        hasta: texto('Período final AAAAMMDD.'),
        ranking: RANKING,
        solo_significativos: { type: 'string', enum: ['true', 'false'], description: 'true para traer solo los movimientos significativos.' },
      }),
      ruta: '/movimientos',
      opcion: 'comparar_periodos',
    },
  ];
}

// Sin catálogo: sirve para la ruta, el límite y el esquema de cada herramienta (no cambian con el catálogo).
const HERRAMIENTAS = crearHerramientas();
const POR_NOMBRE = new Map(HERRAMIENTAS.map((h) => [h.name, h]));
// Tiempo máximo de cada consulta de herramienta a la API.
const TIMEOUT_MS = 15_000;

const permitida = (herramienta, perfil) =>
  !herramienta.opcion || perfilesConOpcion(herramienta.opcion).includes(perfil);

// Definiciones para la API de Claude (sin los campos internos ruta, limite y opcion).
// `catalogos` (opcional): el catálogo cargado, para que las descripciones nombren los rankings y bancos reales.
export function definicionesPara(perfil = 'publico', catalogos) {
  return crearHerramientas(catalogos).filter((h) => permitida(h, perfil)).map(({ name, description, input_schema }) => ({ name, description, input_schema }));
}

// Todas las herramientas (para documentación y pruebas).
export const DEFINICIONES = definicionesPara('admin');

// Recorta listas largas para no mandar miles de filas al modelo; deja constancia del recorte.
function recortar(datos, limite) {
  const copia = { ...datos };
  for (const [clave, valor] of Object.entries(copia)) {
    if (Array.isArray(valor) && valor.length > limite) {
      copia[clave] = valor.slice(0, limite);
      copia[`${clave}_mostradas`] = limite;
    }
  }
  return copia;
}

/**
 * Crea el ejecutor de herramientas contra la API (baseUrl termina en /api), con el perfil del
 * usuario en X-Perfil. Devuelve { ok, datos } o { ok: false, error } (por ejemplo un 400 por
 * parámetro inválido o un 403 si el perfil no tiene esa opción).
 */
export function crearEjecutor(baseUrl, { perfil = 'publico', fetchImpl = fetch } = {}) {
  return async function ejecutar(nombre, entrada = {}) {
    const herramienta = POR_NOMBRE.get(nombre);
    if (!herramienta) return { ok: false, error: `Herramienta desconocida: ${nombre}` };
    const parametros = new URLSearchParams(
      Object.entries(entrada).filter(([clave, valor]) => clave in herramienta.input_schema.properties && valor !== '' && valor != null),
    );
    const url = `${baseUrl}${herramienta.ruta}${parametros.size ? `?${parametros}` : ''}`;
    // Un fallo de red, un timeout o una respuesta que no es JSON vuelve como error de la herramienta
    // (el modelo lo recibe con is_error y puede seguir o explicarlo), no tumba al agente (#90).
    let respuesta;
    let cuerpo;
    try {
      respuesta = await fetchImpl(url, { headers: { 'X-Perfil': perfil }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      cuerpo = await respuesta.json();
    } catch (error) {
      return { ok: false, error: `No se pudo consultar la API: ${error.message}` };
    }
    if (!respuesta.ok) return { ok: false, error: cuerpo?.error?.mensaje ?? `HTTP ${respuesta.status}` };
    return { ok: true, datos: recortar(cuerpo, herramienta.limite ?? 400), ruta: url.slice(baseUrl.length) };
  };
}
