// Documento OpenAPI 3.1 de la API pública (#9). Se sirve en /api/openapi.json y con Swagger UI en
// /api/docs, para que terceros (Power BI, Excel, scripts) se conecten sin usar el dashboard.
// Los valores válidos (bancos, rankings, subactividades) salen del catálogo cargado, y los ejemplos
// de /contracts, así la documentación no se desactualiza ni fija datos a mano.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FUENTE, AVISO } from '../routes/formato.js';

const CARPETA_CONTRATOS = fileURLToPath(new URL('../../../contracts/', import.meta.url));

// Ejemplo de /contracts si existe (por ejemplo, en una imagen Docker sin esa carpeta se omite).
function ejemplo(archivo) {
  try {
    return JSON.parse(fs.readFileSync(CARPETA_CONTRATOS + archivo, 'utf8'));
  } catch {
    return undefined;
  }
}

const jsonOk = (descripcion, archivoEjemplo) => ({
  200: {
    description: descripcion,
    content: { 'application/json': { schema: { type: 'object' }, ...(archivoEjemplo && ejemplo(archivoEjemplo) ? { example: ejemplo(archivoEjemplo) } : {}) } },
  },
});

const csvOk = (descripcion) => ({
  200: { description: descripcion, content: { 'text/csv': { schema: { type: 'string' } } } },
});

const errores = (...codigos) =>
  Object.fromEntries(codigos.map((c) => [c, { $ref: `#/components/responses/Error${c}` }]));

const ref = (nombre) => ({ $ref: `#/components/parameters/${nombre}` });

// Todas las operaciones aceptan el header X-Perfil (#28).
function conPerfil(paths) {
  for (const operaciones of Object.values(paths)) {
    for (const operacion of Object.values(operaciones)) {
      operacion.parameters = [ref('perfil'), ...(operacion.parameters ?? [])];
    }
  }
  return paths;
}

export function crearDocumentoOpenApi(catalogos) {
  const rankings = catalogos.macroactividades;
  const bancos = [...catalogos.bancos.keys()];
  const subactividades = [...catalogos.subactividadesPorMacro.values()].flat();
  const periodoParam = (name, description) => ({
    name, in: 'query', required: false, description, schema: { type: 'string', pattern: '^\\d{8}$', examples: ['20260930'] },
  });

  return {
    openapi: '3.1.0',
    info: {
      title: 'API de rankings de crédito · Hackathon SBP 2026',
      version: '0.1.0',
      description: [
        `Rankings de crédito por banco y actividad económica calculados por un motor determinista a partir de los archivos AT03 sintéticos. Fuente: ${FUENTE}.`,
        '',
        `**${AVISO}.**`,
        '',
        'Convenciones: códigos como texto (`"101"`), fechas `AAAAMMDD`, montos con 2 decimales, `Ponderacion_Pct` con 4. Errores con el formato `{ "error": { "codigo", "mensaje", "detalles"? } }`.',
      ].join('\n'),
    },
    servers: [{ url: '/api' }],
    tags: [
      { name: 'Consulta', description: 'Rankings, subactividades y calidad de datos (solo lectura).' },
      { name: 'Comparación', description: 'Movimientos de posición entre períodos (sección 8).' },
      { name: 'Descargas', description: 'Entregables 2 a 5 en CSV.' },
      { name: 'IA', description: 'Explicación y exploración con IA. La IA nunca calcula: solo cita resultados del motor.' },
      { name: 'Perfiles y administración', description: 'Perfil actual, parámetros, catálogos y registro de operaciones.' },
    ],
    paths: conPerfil({
      '/perfil': {
        get: { tags: ['Perfiles y administración'], summary: 'Perfil actual y sus opciones (para armar el menú)', responses: { ...jsonOk('Perfil y opciones', 'perfil.json'), ...errores(400) } },
      },
      '/parametros': {
        get: { tags: ['Perfiles y administración'], summary: 'Regla vigente de movimiento significativo', responses: jsonOk('Parámetros', 'parametros.json') },
        put: {
          tags: ['Perfiles y administración'],
          summary: 'Cambiar la regla de movimiento significativo (solo Administrador)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['regla_significativo'], properties: { regla_significativo: { type: 'object' } } },
                example: { regla_significativo: { min_cambio_posicion_abs: 3, cambio_lider: true, min_var_saldo_pct_abs: 15 } },
              },
            },
          },
          responses: { ...jsonOk('Regla guardada'), ...errores(400, 403) },
        },
      },
      '/admin/catalogos': {
        get: { tags: ['Perfiles y administración'], summary: 'Estado de los catálogos cargados (solo Administrador)', responses: { ...jsonOk('Catálogos', 'catalogos-admin.json'), ...errores(403) } },
      },
      '/bitacora': {
        get: { tags: ['Perfiles y administración'], summary: 'Registro de operaciones (solo Administrador)', responses: { ...jsonOk('Operaciones', 'bitacora.json'), ...errores(403) } },
      },
      '/salud': { get: { tags: ['Consulta'], summary: 'Estado de la API y períodos cargados', responses: jsonOk('API disponible') } },
      '/periodos': {
        get: { tags: ['Consulta'], summary: 'Períodos cargados con su resumen de calidad', responses: { ...jsonOk('Períodos', 'periodos.json'), ...errores(404) } },
        post: {
          tags: ['Perfiles y administración'],
          summary: 'Cargar o actualizar un período desde un AT03 (solo Administrador)',
          description: 'El cuerpo es el texto del CSV (hasta 50 MB). Valida, procesa con el mismo motor y publica sin tocar código. Responde E1–E4, universo válido y cambios de ranking.',
          parameters: [{ name: 'X-Nombre-Archivo', in: 'header', required: true, description: 'Nombre del archivo, con encodeURIComponent', schema: { type: 'string', examples: ['AT03_sintetico_202609.csv'] } }],
          requestBody: { required: true, content: { 'text/csv': { schema: { type: 'string' } } } },
          responses: {
            ...jsonOk('Período cargado', 'carga.json'),
            ...errores(400, 403),
            422: { description: 'Archivo AT03 inválido (ARCHIVO_INVALIDO), con el detalle en `detalles`', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/catalogos': {
        get: { tags: ['Consulta'], summary: 'Bancos, rankings y subactividades (para filtros)', responses: jsonOk('Catálogos', 'catalogos.json') },
      },
      '/rankings': {
        get: {
          tags: ['Consulta'],
          summary: 'Rankings de un período: posición, saldo, total de cartera y ponderación',
          parameters: [ref('periodo'), ref('ranking'), ref('banco')],
          responses: { ...jsonOk('Rankings con los 12 bancos ordenados por posición', 'rankings.json'), ...errores(400, 404) },
        },
      },
      '/subactividades': {
        get: {
          tags: ['Consulta'],
          summary: 'Desglose por subactividad (incluye la reclasificación SB21 a Tarjeta)',
          parameters: [ref('periodo'), ref('ranking'), ref('banco'), ref('subactividad')],
          responses: { ...jsonOk('Saldo por subactividad y banco', 'subactividades.json'), ...errores(400, 404) },
        },
      },
      '/calidad': {
        get: {
          tags: ['Consulta'],
          summary: 'Reporte de calidad: cascada E1–E4, universo local válido, alertas y reconciliaciones',
          parameters: [{ ...ref('periodo') }],
          responses: { ...jsonOk('Sin periodo devuelve todos los períodos', 'calidad.json'), ...errores(400, 404) },
        },
      },
      '/excluidas': {
        get: {
          tags: ['Consulta'],
          summary: 'Filas excluidas con su motivo (exclusión auditable)',
          parameters: [ref('periodo'), ref('motivo'), ref('banco')],
          responses: { ...jsonOk('Filas excluidas', 'excluidas.json'), ...errores(400, 404) },
        },
      },
      '/movimientos': {
        get: {
          tags: ['Comparación'],
          summary: 'Movimientos de posición y variación de saldo entre dos períodos (Analista y Admin)',
          description: '`Cambio_Posicion = Posicion_anterior − Posicion_actual` (positivo = sube). `Var_Saldo_Pct` es `null` si el saldo anterior es 0. La regla de movimiento significativo es configurable y viene en `regla_significativo`.',
          parameters: [ref('desde'), ref('hasta'), ref('ranking'), ref('soloSignificativos')],
          responses: { ...jsonOk('Comparación por ranking', 'movimientos.json'), ...errores(400, 403, 404, 422) },
        },
      },
      '/movimientos/descomposicion': {
        get: {
          tags: ['Comparación'],
          summary: 'Por qué se movió el saldo de cada banco: préstamos nuevos, que salen y amortización (Analista y Admin)',
          parameters: [
            ref('desde'), ref('hasta'), ref('ranking'), ref('banco'),
            { name: 'evidencia', in: 'query', required: false, description: 'true para incluir el detalle préstamo por préstamo', schema: { type: 'string', enum: ['true', 'false'] } },
          ],
          responses: { ...jsonOk('Descomposición por ranking y banco'), ...errores(400, 403, 404, 422) },
        },
      },
      '/exportar/rankings.csv': { get: { tags: ['Descargas'], summary: 'Entregable 2: rankings', parameters: [ref('periodo')], responses: { ...csvOk('CSV de rankings'), ...errores(400, 404) } } },
      '/exportar/subactividades.csv': { get: { tags: ['Descargas'], summary: 'Entregable 3: desglose por subactividad', parameters: [ref('periodo')], responses: { ...csvOk('CSV de subactividades'), ...errores(400, 404) } } },
      '/exportar/calidad.csv': { get: { tags: ['Descargas'], summary: 'Entregable 4: calidad E1–E4', parameters: [ref('periodo')], responses: { ...csvOk('CSV de calidad'), ...errores(400, 404) } } },
      '/exportar/excluidas.csv': { get: { tags: ['Descargas'], summary: 'Filas excluidas con su motivo', parameters: [ref('periodo')], responses: { ...csvOk('CSV de excluidas'), ...errores(400, 404) } } },
      '/exportar/alertas.csv': { get: { tags: ['Descargas'], summary: 'Alertas de calidad', parameters: [ref('periodo')], responses: { ...csvOk('CSV de alertas'), ...errores(400, 404) } } },
      '/exportar/movimientos.csv': {
        get: {
          tags: ['Descargas'],
          summary: 'Entregable 5: movimientos de posición (Analista y Admin)',
          parameters: [ref('desde'), ref('hasta'), ref('ranking'), ref('soloSignificativos')],
          responses: { ...csvOk('CSV de movimientos'), ...errores(400, 403, 404, 422) },
        },
      },
      '/ia/estado': { get: { tags: ['IA'], summary: 'Si la IA está disponible y con qué modelo', responses: jsonOk('Estado de la IA') } },
      '/mcp': {
        post: {
          tags: ['IA'],
          summary: 'MCP remoto (Streamable HTTP, sin estado): conectar Claude u otro cliente MCP por URL',
          description: 'Mensajes JSON-RPC del protocolo MCP. Expone las mismas herramientas de solo lectura que el servidor MCP local. Perfil con `?perfil=publico|analista|admin` (por defecto publico). Instrucciones en `server/src/mcp/README.md`.',
          parameters: [{ name: 'perfil', in: 'query', required: false, schema: { type: 'string', enum: ['publico', 'analista', 'admin'] } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' }, example: { jsonrpc: '2.0', id: 1, method: 'tools/list' } } } },
          responses: { ...jsonOk('Respuesta JSON-RPC'), ...errores(400) },
        },
      },
      '/explicaciones': {
        get: {
          tags: ['IA'],
          summary: 'Explicación en texto de los movimientos significativos (Analista y Admin)',
          parameters: [ref('desde'), ref('hasta'), ref('ranking')],
          responses: { ...jsonOk('Frases con su fuente (ia o reglas)'), ...errores(400, 403, 404, 422) },
        },
      },
      '/ia/preguntar': {
        post: {
          tags: ['IA'],
          summary: 'Pregunta en lenguaje natural; la IA consulta esta misma API',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['pregunta'],
                  properties: {
                    pregunta: { type: 'string', maxLength: 500 },
                    historial: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['rol', 'texto'],
                        properties: { rol: { type: 'string', enum: ['usuario', 'asistente'] }, texto: { type: 'string' } },
                      },
                    },
                  },
                },
                example: { pregunta: '¿Quién lidera COMERCIO y qué cambió respecto del mes anterior?' },
              },
            },
          },
          responses: { ...jsonOk('Respuesta verificada contra el motor, con las consultas usadas'), ...errores(400) },
        },
      },
    }),
    components: {
      parameters: {
        perfil: {
          name: 'X-Perfil',
          in: 'header',
          required: false,
          description: 'Perfil de quien consulta. Sin header: publico. Comparar períodos es de analista y admin; administrar, solo admin.',
          schema: { type: 'string', enum: ['publico', 'analista', 'admin'], default: 'publico' },
        },
        periodo: periodoParam('periodo', 'Período AAAAMMDD. Si se omite, el último cargado (en /calidad y las descargas: todos).'),
        desde: periodoParam('desde', 'Período inicial AAAAMMDD. Por defecto, el anterior a `hasta`.'),
        hasta: periodoParam('hasta', 'Período final AAAAMMDD. Por defecto, el último cargado.'),
        ranking: { name: 'ranking', in: 'query', required: false, schema: { type: 'string', enum: rankings } },
        banco: { name: 'banco', in: 'query', required: false, description: 'Código de banco', schema: { type: 'string', enum: bancos } },
        subactividad: { name: 'subactividad', in: 'query', required: false, schema: { type: 'string', enum: subactividades } },
        motivo: { name: 'motivo', in: 'query', required: false, schema: { type: 'string', enum: ['E1', 'E2', 'E3', 'E4'] } },
        soloSignificativos: { name: 'solo_significativos', in: 'query', required: false, schema: { type: 'string', enum: ['true', 'false'] } },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['codigo', 'mensaje'],
              properties: { codigo: { type: 'string' }, mensaje: { type: 'string' }, detalles: { type: 'array', items: {} } },
            },
          },
        },
      },
      responses: Object.fromEntries(
        [
          [400, 'Parámetro inválido (PARAMETRO_INVALIDO)'],
          [403, 'El perfil no tiene esta opción (PERFIL_NO_AUTORIZADO)'],
          [404, 'Período sin datos (PERIODO_SIN_DATOS)'],
          [422, 'Períodos inválidos: desde debe ser anterior a hasta (PERIODOS_INVALIDOS)'],
        ].map(([codigo, descripcion]) => [
          `Error${codigo}`,
          { description: descripcion, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        ]),
      ),
    },
  };
}
