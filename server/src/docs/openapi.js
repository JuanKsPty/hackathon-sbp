// Documento OpenAPI 3.1 de la API pública (#9). Se sirve en /api/openapi.json y con Swagger UI en
// /api/docs, para que terceros (Power BI, Excel, scripts) se conecten sin usar el dashboard.
// Los valores válidos (bancos, rankings, subactividades) salen del catálogo cargado, y los ejemplos
// de /contracts, así la documentación no se desactualiza ni fija datos a mano.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FUENTE, AVISO } from '../routes/formato.js';
import { PERFILES } from '../middleware/perfiles.js';
import { MOTIVOS } from '../engine/cascada.js';

const CARPETA_CONTRATOS = fileURLToPath(new URL('../../../contracts/', import.meta.url));

// Ejemplo de /contracts si existe (por ejemplo, en una imagen Docker sin esa carpeta se omite).
function ejemplo(archivo) {
  try {
    return JSON.parse(fs.readFileSync(CARPETA_CONTRATOS + archivo, 'utf8'));
  } catch {
    return undefined;
  }
}

function jsonOk(descripcion, archivoEjemplo) {
  const ejemploDeContrato = archivoEjemplo ? ejemplo(archivoEjemplo) : undefined; // se lee una sola vez
  return {
    200: {
      description: descripcion,
      content: { 'application/json': { schema: { type: 'object' }, ...(ejemploDeContrato ? { example: ejemploDeContrato } : {}) } },
    },
  };
}

const csvOk = (descripcion) => ({
  200: { description: descripcion, content: { 'text/csv': { schema: { type: 'string' } } } },
});

const errores = (...codigos) =>
  Object.fromEntries(codigos.map((c) => [c, { $ref: `#/components/responses/Error${c}` }]));

const ref = (nombre) => ({ $ref: `#/components/parameters/${nombre}` });

// Los enlaces de suscripción (#7) se abren desde el correo: responden HTML, no JSON.
const paginaHtml = (descripcion) => ({ description: descripcion, content: { 'text/html': { schema: { type: 'string' } } } });
const tokenSuscripcion = { name: 'token', in: 'query', required: true, description: 'Token del enlace del correo', schema: { type: 'string' } };

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
      { name: 'Alertas', description: 'Suscripción a las alertas por correo con doble confirmación (#7, contracts/eventos-zapier.md).' },
    ],
    paths: conPerfil({
      '/sesion': {
        post: {
          tags: ['Perfiles y administración'],
          summary: 'Iniciar sesión en el sitio interno (Analista o Administrador); deja la cookie sbp_sesion',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['usuario', 'clave'], properties: { usuario: { type: 'string' }, clave: { type: 'string' } } } } },
          },
          responses: { 200: { description: 'Sesión iniciada: { usuario, nombre, perfil, nombre_perfil }' }, ...errores(400, 401, 429, 503) },
        },
        delete: { tags: ['Perfiles y administración'], summary: 'Cerrar sesión (borra la cookie)', responses: { 204: { description: 'Sesión cerrada' } } },
      },
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
      '/admin/catalogos/{clave}': {
        get: {
          tags: ['Perfiles y administración'],
          summary: 'Contenido de un catálogo del paquete del reto, o su CSV original con ?formato=csv (solo Administrador)',
          parameters: [
            { name: 'clave', in: 'path', required: true, schema: { type: 'string', enum: ['cinu', 'sb21', 'bancos', 'diccionario'] } },
            { name: 'formato', in: 'query', required: false, schema: { type: 'string', enum: ['csv'] } },
          ],
          responses: { ...jsonOk('Columnas y filas del catálogo'), ...errores(403, 404) },
        },
      },
      '/bitacora': {
        get: { tags: ['Perfiles y administración'], summary: 'Registro de operaciones (solo Administrador)', responses: { ...jsonOk('Operaciones', 'bitacora.json'), ...errores(403) } },
      },
      '/admin/permisos': {
        get: { tags: ['Perfiles y administración'], summary: 'Perfiles y permisos: qué perfil puede usar cada opción (solo Administrador)', responses: { ...jsonOk('Permisos vigentes', 'permisos.json'), ...errores(403) } },
        put: {
          tags: ['Perfiles y administración'],
          summary: 'Cambiar los perfiles de las opciones configurables (solo Administrador). El Administrador siempre las tiene todas.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['opciones'], properties: { opciones: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string', enum: ['publico', 'analista'] } } } } },
                example: { opciones: { descargar: ['publico', 'analista'], comparar_periodos: ['analista'], reportes_personalizados: [] } },
              },
            },
          },
          responses: { ...jsonOk('Permisos guardados'), ...errores(400, 403) },
        },
        delete: { tags: ['Perfiles y administración'], summary: 'Volver a los permisos por defecto (solo Administrador)', responses: { ...jsonOk('Permisos por defecto'), ...errores(403) } },
      },
      '/admin/usuarios': {
        get: { tags: ['Perfiles y administración'], summary: 'Usuarios del sitio interno, sin contraseñas (solo Administrador)', responses: { ...jsonOk('Usuarios', 'usuarios.json'), ...errores(403, 503) } },
        post: {
          tags: ['Perfiles y administración'],
          summary: 'Crear un usuario Analista o Administrador (solo Administrador)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['usuario', 'perfil', 'clave'],
                  properties: { usuario: { type: 'string' }, nombre: { type: 'string' }, perfil: { type: 'string', enum: ['analista', 'admin'] }, clave: { type: 'string', minLength: 10 } },
                },
              },
            },
          },
          responses: { 201: { description: 'Usuario creado (sin la contraseña)' }, ...errores(400, 403, 409, 503) },
        },
      },
      '/admin/usuarios/{usuario}': {
        patch: {
          tags: ['Perfiles y administración'],
          summary: 'Cambiar nombre, perfil, estado o contraseña de un usuario (solo Administrador). Cierra sus sesiones abiertas si cambia perfil, estado o contraseña.',
          parameters: [{ name: 'usuario', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { nombre: { type: 'string' }, perfil: { type: 'string', enum: ['analista', 'admin'] }, activo: { type: 'boolean' }, clave: { type: 'string', minLength: 10 } } },
                example: { perfil: 'admin' },
              },
            },
          },
          responses: { ...jsonOk('Usuario actualizado'), ...errores(400, 403, 404, 409, 503) },
        },
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
            ...errores(400, 403, 413, 415),
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
          parameters: [ref('periodo')],
          responses: { ...jsonOk('Sin periodo devuelve todos los períodos', 'calidad.json'), ...errores(400, 404) },
        },
      },
      '/verificacion': {
        get: {
          tags: ['Consulta'],
          summary: 'Un dato de cada punto de la sección 11.1, con chequeos automáticos (modo verificación del jurado)',
          description: '`puntos` tiene una clave por punto: calidad (1, E1–E4 y universo), rankings_obligatorios (2), rankings_adicionales (3, COMERCIO y CONSUMO), ponderacion (4), subactividades (5, con Tarjeta) y periodos (6, reconciliaciones). Con `banco` se acotan los datos; los chequeos usan siempre todos los bancos.',
          parameters: [ref('periodo'), ref('banco')],
          responses: { ...jsonOk('Los 6 puntos con sus datos y chequeos', 'verificacion.json'), ...errores(400, 404) },
        },
      },
      '/indicadores': {
        get: {
          tags: ['Consulta'],
          summary: 'Indicadores adicionales: morosidad, vencimientos y concentración (análisis adicional, fuera de los 6 rankings)',
          description: 'Se calculan sobre el universo local válido del período. Con `ranking` se limita la morosidad y los vencimientos a esa macroactividad, y la concentración a ese ranking. No forman parte de los 6 rankings oficiales: la respuesta lo indica en `analisis`.',
          parameters: [ref('periodo'), ref('ranking')],
          responses: { ...jsonOk('Morosidad, vencimientos y concentración (top 3 y HHI)', 'indicadores.json'), ...errores(400, 404) },
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
      '/exportar/personalizado.csv': {
        get: {
          tags: ['Descargas'],
          summary: 'Reporte personalizado: períodos, rankings y bancos elegidos (Analista y Admin)',
          parameters: [
            { name: 'periodos', in: 'query', required: false, description: 'Períodos AAAAMMDD, lista separada por comas (vacío = todos)', schema: { type: 'string' } },
            { name: 'rankings', in: 'query', required: false, description: 'Rankings, lista separada por comas (vacío = todos)', schema: { type: 'string' } },
            { name: 'bancos', in: 'query', required: false, description: 'Códigos de banco, lista separada por comas (vacío = todos)', schema: { type: 'string' } },
          ],
          responses: { ...csvOk('CSV con las columnas del entregable 2'), ...errores(400, 403, 404) },
        },
      },
      '/ia/estado': { get: { tags: ['IA'], summary: 'Si la IA está disponible y con qué modelo', responses: jsonOk('Estado de la IA') } },
      '/ia/guia': {
        get: { tags: ['IA'], summary: 'Elementos que el agente guía puede señalar para el perfil (data-guia)', responses: jsonOk('Elementos de la guía') },
      },
      '/mcp': {
        post: {
          tags: ['IA'],
          summary: 'MCP remoto (Streamable HTTP, sin estado): conectar Claude u otro cliente MCP por URL',
          description: 'Mensajes JSON-RPC del protocolo MCP. Expone las mismas herramientas de solo lectura que el servidor MCP local. En el sitio público el perfil es siempre publico; en el interno exige `Authorization: Bearer <MCP_TOKEN>` (perfil analista). `?perfil=` solo vale en llamadas directas al API desde la misma máquina. Solo acepta POST: GET y DELETE responden 405 (modo sin estado). Instrucciones en `server/src/mcp/README.md`.',
          parameters: [{ name: 'perfil', in: 'query', required: false, schema: { type: 'string', enum: PERFILES } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' }, example: { jsonrpc: '2.0', id: 1, method: 'tools/list' } } } },
          responses: { ...jsonOk('Respuesta JSON-RPC'), ...errores(400) },
        },
      },
      '/explicaciones': {
        get: {
          tags: ['IA'],
          summary: 'Explicación en texto de los movimientos significativos (Analista y Admin)',
          parameters: [ref('desde'), ref('hasta'), ref('ranking')],
          responses: { ...jsonOk('Frases con su fuente (ia o reglas)'), ...errores(400, 403, 404, 422, 429) },
        },
      },
      '/ia/preguntar': {
        post: {
          tags: ['IA'],
          summary: 'Pregunta en lenguaje natural; la IA consulta esta misma API',
          description: 'Responde en el chat y puede traer `pantalla` (#121): acciones validadas para ejecutar en el dashboard (ir, elegir, ordenar, resaltar) o demostrarlas con el cursor. Sin IA, las reglas arman la pantalla de las preguntas típicas sobre la tabla de rankings. Ver contracts/ia.md.',
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
          responses: { ...jsonOk('Respuesta verificada contra el motor, con las consultas usadas'), ...errores(400, 429) },
        },
      },
      '/suscripciones': {
        get: {
          tags: ['Alertas'],
          summary: 'Suscriptores de las alertas, sin sus tokens (solo Administrador: son datos personales)',
          responses: { ...jsonOk('Suscriptores'), ...errores(403) },
        },
        post: {
          tags: ['Alertas'],
          summary: 'Pide suscribirse (o cambiar bancos y rankings); Zapier manda el correo para confirmar',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['correo'],
                  properties: {
                    correo: { type: 'string', format: 'email' },
                    bancos: { type: 'array', items: { type: 'string', enum: bancos }, description: 'Vacío: todos' },
                    rankings: { type: 'array', items: { type: 'string', enum: rankings }, description: 'Vacío: todos' },
                  },
                },
              },
            },
          },
          responses: { ...jsonOk('Solicitud guardada y estado del correo de confirmación'), ...errores(400, 429) },
        },
      },
      '/suscripciones/confirmar': {
        get: {
          tags: ['Alertas'],
          summary: 'Enlace del correo: activa la suscripción y responde una página HTML (vence a las 48 horas)',
          parameters: [tokenSuscripcion],
          responses: { 200: paginaHtml('Suscripción confirmada'), 404: paginaHtml('Enlace no válido o vencido') },
        },
      },
      '/suscripciones/baja': {
        get: {
          tags: ['Alertas'],
          summary: 'Enlace de las alertas: da de baja y responde una página HTML',
          parameters: [tokenSuscripcion],
          responses: { 200: paginaHtml('Baja confirmada'), 404: paginaHtml('Enlace no válido') },
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
          schema: { type: 'string', enum: PERFILES, default: 'publico' },
        },
        periodo: periodoParam('periodo', 'Período AAAAMMDD. Si se omite, el último cargado (en /calidad y las descargas: todos).'),
        desde: periodoParam('desde', 'Período inicial AAAAMMDD. Por defecto, el anterior a `hasta`.'),
        hasta: periodoParam('hasta', 'Período final AAAAMMDD. Por defecto, el último cargado.'),
        ranking: { name: 'ranking', in: 'query', required: false, schema: { type: 'string', enum: rankings } },
        banco: { name: 'banco', in: 'query', required: false, description: 'Código de banco', schema: { type: 'string', enum: bancos } },
        subactividad: { name: 'subactividad', in: 'query', required: false, schema: { type: 'string', enum: subactividades } },
        motivo: { name: 'motivo', in: 'query', required: false, schema: { type: 'string', enum: Object.keys(MOTIVOS) } },
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
          [404, 'Período sin datos (PERIODO_SIN_DATOS) o usuario inexistente (USUARIO_NO_ENCONTRADO)'],
          [409, 'Conflicto: el usuario ya existe (USUARIO_EXISTE), viene del .env (USUARIO_SOLO_LECTURA) o el cambio dejaría sin Administrador (OPERACION_NO_PERMITIDA)'],
          [413, 'El archivo supera el límite de 50 MB (ARCHIVO_MUY_GRANDE)'],
          [415, 'Formato no soportado: el cuerpo debe ser texto CSV en UTF-8 (FORMATO_NO_SOPORTADO)'],
          [422, 'Períodos inválidos: desde debe ser anterior a hasta (PERIODOS_INVALIDOS)'],
          [429, 'Demasiados pedidos a la IA (DEMASIADOS_PEDIDOS); el header Retry-After dice cuántos segundos esperar'],
          [503, 'La base de usuarios no responde (USUARIOS_NO_DISPONIBLES) o todavía no permite cambios (USUARIOS_SOLO_LECTURA)'],
        ].map(([codigo, descripcion]) => [
          `Error${codigo}`,
          { description: descripcion, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        ]),
      ),
    },
  };
}
