// Catálogo del agente guía (#72): elementos de la app que la IA puede señalar con el cursor.
// Es la misma lista de contracts/guia.md (un test verifica que coincidan). Cada elemento sabe en qué
// ruta está y, si es de un perfil en particular, qué opción de perfil necesita (middleware/perfiles.js).
import { perfilesConOpcion } from '../middleware/perfiles.js';
import { extraerNumeros } from './verificador.js';

const el = (guia, ruta, descripcion, opcion = null) => ({ guia, ruta, descripcion, opcion });

export const ELEMENTOS_GUIA = [
  // Global (layout): la ruta null significa "en cualquier página".
  el('global.menu-panel', null, 'Enlace del menú a Panel (en el sitio público se llama Inicio)'),
  el('global.menu-rankings', null, 'Enlace del menú a Rankings'),
  el('global.menu-comparar', null, 'Enlace del menú a Comparar períodos', 'comparar_periodos'),
  el('global.menu-reportes', null, 'Enlace del menú a Reportes'),
  el('global.menu-calidad', null, 'Enlace del menú a Calidad de datos'),
  el('global.menu-admin', null, 'Enlace del menú a Administración', 'cargar_periodo'),
  // Solo existe en el sitio interno (SesionUsuario): Público no lo ve, como Analista y Administrador.
  el('global.selector-perfil', null, 'Sesión del sitio interno: usuario, perfil y Salir'),
  el('global.selector-periodo', null, 'Período de los datos (mes), junto al título de Panel, Rankings y Calidad'),
  el('global.selector-tema', null, 'Tema claro, oscuro o sistema'),
  el('global.barra-fuente', null, 'Fuente, período y aviso de datos ficticios, al pie de la página'),
  el('global.abrir-asistente', null, 'Botón que abre el asistente IA'),
  // Panel
  el('panel.indicadores', '/', 'Indicadores del período: universo válido, saldo total y reconciliaciones'),
  el('panel.lideres', '/', 'Líder de cada ranking'),
  el('panel.movimientos', '/', 'Movimientos significativos del último período', 'comparar_periodos'),
  el('panel.explicaciones', '/', 'Explicación de los movimientos', 'comparar_periodos'),
  el('panel.indicadores-adicionales', '/', 'Indicadores adicionales: morosidad, vencimientos y concentración'),
  // Rankings
  el('rankings.selector-ranking', '/rankings', 'Selector de los 6 rankings'),
  el('rankings.filtro-banco', '/rankings', 'Filtro por banco'),
  el('rankings.filtro-subactividad', '/rankings', 'Filtro por subactividad'),
  el('rankings.tabla', '/rankings', 'Tabla del ranking: posición, saldo, total de cartera y ponderación'),
  el('rankings.grafico', '/rankings', 'Gráfico de saldos por banco'),
  el('rankings.desglose-subactividades', '/rankings', 'Desglose por subactividad, incluida Tarjeta en CONSUMO'),
  el('rankings.descargar', '/rankings', 'Descargar el ranking en CSV'),
  // Comparar períodos
  el('comparar.selector-desde', '/comparar', 'Período inicial', 'comparar_periodos'),
  el('comparar.selector-hasta', '/comparar', 'Período final', 'comparar_periodos'),
  el('comparar.selector-ranking', '/comparar', 'Ranking a comparar', 'comparar_periodos'),
  el('comparar.tabla-movimientos', '/comparar', 'Tabla de movimientos: cambio de posición y de saldo', 'comparar_periodos'),
  el('comparar.grafico-posiciones', '/comparar', 'Evolución de posiciones entre períodos', 'comparar_periodos'),
  el('comparar.descomposicion', '/comparar', 'Por qué se movió el saldo: préstamos nuevos, que salen y amortización', 'comparar_periodos'),
  el('comparar.bancos', '/comparar', 'Comparar 2 bancos lado a lado', 'comparar_entidades'),
  // Reportes
  el('reportes.descarga-rankings', '/reportes', 'Descarga del entregable 2: rankings'),
  el('reportes.descarga-subactividades', '/reportes', 'Descarga del entregable 3: subactividades'),
  el('reportes.descarga-calidad', '/reportes', 'Descarga del entregable 4: calidad E1–E4'),
  el('reportes.descarga-movimientos', '/reportes', 'Descarga del entregable 5: movimientos', 'comparar_periodos'),
  el('reportes.personalizado', '/reportes', 'Reporte personalizado', 'reportes_personalizados'),
  el('reportes.suscribirse', '/reportes', 'Alertas por correo: suscribirse con tu correo y, si quieres, los bancos y rankings a seguir'),
  // Calidad de datos
  el('calidad.cascada', '/calidad', 'Exclusiones E1–E4 y universo local válido'),
  el('calidad.reconciliaciones', '/calidad', 'Reconciliaciones 1, 2, 3 y unicidad'),
  el('calidad.alertas', '/calidad', 'Alertas por tipo'),
  el('calidad.excluidas', '/calidad', 'Filas excluidas con su motivo'),
  // Administración
  el('admin.subir-archivo', '/admin', 'Subir un AT03', 'cargar_periodo'),
  el('admin.resultado-carga', '/admin', 'Resultado de la carga: E1–E4, universo y cambios de ranking', 'cargar_periodo'),
  el('admin.regla-significativo', '/admin', 'Regla de movimiento significativo', 'administrar_parametros'),
  el('admin.catalogos', '/admin', 'Estado de los catálogos', 'administrar_catalogos'),
  el('admin.usuarios', '/admin', 'Usuarios: crear, cambiar perfil, contraseña, activar o desactivar', 'gestionar_usuarios'),
  el('admin.permisos', '/admin', 'Perfiles y permisos: qué perfil puede usar cada opción', 'configurar_permisos'),
  el('admin.bitacora', '/admin', 'Registro de operaciones', 'ver_bitacora'),
  // Asistente IA (panel lateral, en cualquier página)
  el('asistente.pregunta', null, 'Campo para escribir la pregunta al asistente'),
];

const POR_GUIA = new Map(ELEMENTOS_GUIA.map((e) => [e.guia, e]));

// Público solo usa el sitio público (sbp.juank.tech), que no tiene Calidad de datos: la guía no puede
// señalar ni llevar a esa página con ese perfil.
const RUTAS_SOLO_INTERNAS = ['/calidad'];
// La sesión (SesionUsuario) solo existe en el sitio interno: no depende de una opción configurable.
const MENU_SOLO_INTERNO = ['global.menu-calidad', 'global.selector-perfil'];

function puedeVer(elemento, perfil) {
  if (perfil === 'publico' && (RUTAS_SOLO_INTERNAS.includes(elemento.ruta) || MENU_SOLO_INTERNO.includes(elemento.guia))) {
    return false;
  }
  if (!elemento.opcion) return true;
  // Permisos vigentes: los por defecto más lo que guardó el Administrador (perfiles y permisos, #145).
  return perfilesConOpcion(elemento.opcion).includes(perfil);
}

/** Elemento del catálogo por su data-guia, o null si no existe. */
export function elementoGuia(id) {
  return POR_GUIA.get(id) ?? null;
}

/** ¿El perfil puede ver ese elemento? (false si no existe) */
export function perfilVeElemento(id, perfil = 'publico') {
  const elemento = POR_GUIA.get(id);
  return Boolean(elemento && puedeVer(elemento, perfil));
}

/** Elementos que el perfil puede ver (la IA solo puede señalar estos). */
export function elementosPara(perfil = 'publico') {
  return ELEMENTOS_GUIA.filter((e) => puedeVer(e, perfil));
}

export const NOMBRE_HERRAMIENTA_GUIA = 'guiar_usuario';
const MAX_PASOS = 6;

/** Definición de la herramienta de guía para el perfil: solo admite sus identificadores. */
export function definicionGuia(perfil = 'publico') {
  const elementos = elementosPara(perfil);
  const lista = elementos.map((e) => `- ${e.guia}: ${e.descripcion}${e.ruta ? ` (${e.ruta})` : ''}`).join('\n');
  return {
    name: NOMBRE_HERRAMIENTA_GUIA,
    description: `Muestra al usuario, con un cursor sobre la pantalla, cómo hacer algo en la app: una lista ordenada de 1 a ${MAX_PASOS} pasos, cada uno señala un elemento y dice qué hacer ahí en una frase corta. Úsala cuando pregunte cómo o dónde hacer algo en la app. Elementos disponibles:\n${lista}`,
    input_schema: {
      type: 'object',
      properties: {
        pasos: {
          type: 'array',
          minItems: 1,
          maxItems: MAX_PASOS,
          items: {
            type: 'object',
            properties: {
              guia: { type: 'string', enum: elementos.map((e) => e.guia) },
              texto: { type: 'string', description: 'Qué hacer en ese elemento, en una frase corta.' },
            },
            required: ['guia', 'texto'],
            additionalProperties: false,
          },
        },
      },
      required: ['pasos'],
      additionalProperties: false,
    },
  };
}

/**
 * Valida los pasos que propone la IA y les agrega la ruta desde el catálogo (la IA no elige rutas).
 * @returns {{ ok: true, pasos } | { ok: false, errores: string[] }}
 */
export function validarPasos(pasos, perfil = 'publico') {
  if (!Array.isArray(pasos) || pasos.length === 0 || pasos.length > MAX_PASOS) {
    return { ok: false, errores: [`pasos debe ser una lista de 1 a ${MAX_PASOS} pasos.`] };
  }
  const errores = [];
  const validos = pasos.map((paso, i) => {
    const elemento = POR_GUIA.get(paso?.guia);
    if (!elemento) errores.push(`Paso ${i + 1}: "${paso?.guia}" no existe en el catálogo de la guía.`);
    else if (!puedeVer(elemento, perfil)) errores.push(`Paso ${i + 1}: "${paso.guia}" no está disponible para el perfil ${perfil}.`);
    if (typeof paso?.texto !== 'string' || paso.texto.trim() === '') errores.push(`Paso ${i + 1}: falta el texto.`);
    return elemento ? { ruta: elemento.ruta, guia: elemento.guia, texto: String(paso.texto ?? '').trim() } : null;
  });
  return errores.length ? { ok: false, errores } : { ok: true, pasos: validos };
}

/**
 * Números de las descripciones del catálogo de los elementos que señalan los pasos ("entregable 4",
 * "E1–E4"). Son texto fijo de la app, no cifras del motor: en una pregunta solo de guía la IA no
 * consulta datos, y sin esto el verificador descartaría una guía correcta (#86).
 * @param {Array<{ guia: string }>} pasos pasos ya validados
 * @returns {number[]}
 */
export function numerosDelCatalogo(pasos) {
  return pasos.flatMap(({ guia }) => extraerNumeros(POR_GUIA.get(guia)?.descripcion ?? '').map((n) => n.valor));
}
