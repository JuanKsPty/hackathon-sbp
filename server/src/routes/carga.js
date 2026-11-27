// POST /api/periodos: el Administrador carga o actualiza un período (#29, entregable 7).
// Cuerpo: el AT03 como texto (Content-Type: text/csv). Nombre del archivo: header X-Nombre-Archivo.
// Formato de la respuesta: contracts/carga.md y contracts/carga.json.
import express, { Router } from 'express';
import { requierePerfil } from '../middleware/perfiles.js';
import { cargarPeriodo } from '../datos/cargaPeriodo.js';
import { registrarOperacion } from '../datos/bitacora.js';
import { avisarPublicacion } from '../automation/publicacion.js';
import { ErrorApi } from './errores.js';
import { encabezado, calidadDePeriodo } from './formato.js';

// Los AT03 del reto pesan unos 11 MB: se deja margen.
export const LIMITE_ARCHIVO = '50mb';
const leerCsv = express.text({ type: ['text/csv', 'text/plain', 'application/csv'], limit: LIMITE_ARCHIVO });

// El front manda el nombre con encodeURIComponent (los headers solo admiten ASCII).
function nombreDelHeader(req) {
  const valor = (req.get('X-Nombre-Archivo') ?? '').trim();
  if (valor === '') {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', 'Falta el header X-Nombre-Archivo con el nombre del archivo.');
  }
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

function mensajeDe(accion, fecha) {
  return accion === 'NUEVO'
    ? `Se cargó el período ${fecha}.`
    : `Se actualizó el período ${fecha}: reemplaza al que estaba cargado.`;
}

// Cambios de ranking contra el período anterior, con el cálculo de /api/movimientos (#32).
// Sin obtenerMovimientos (o si la comparación falla) la carga igual se publica, con Comparacion = null.
function compararCon(obtenerMovimientos) {
  return (anterior, actual) => {
    if (!anterior || !obtenerMovimientos) return null;
    try {
      const m = obtenerMovimientos({ desde: anterior.fecha, hasta: actual.fecha });
      return {
        periodo_anterior: m.periodo_anterior,
        periodo_actual: m.periodo_actual,
        regla_significativo: m.regla_significativo,
        rankings: m.rankings,
      };
    } catch (error) {
      console.error(`No se pudo comparar ${anterior.fecha} con ${actual.fecha}: ${error.message}`);
      return null;
    }
  };
}

export function rutasDeCarga(almacen, { obtenerMovimientos } = {}) {
  const rutas = Router();
  const comparar = compararCon(obtenerMovimientos);

  function cargar(req, res) {
    const nombreArchivo = nombreDelHeader(req);
    if (typeof req.body !== 'string') {
      throw new ErrorApi(415, 'FORMATO_NO_SOPORTADO', 'Envía el AT03 como texto con el header Content-Type: text/csv.');
    }
    const carga = cargarPeriodo(almacen, req.body, nombreArchivo);

    const periodos = carga.periodos.map(({ periodo, accion, anterior }) => ({
      Fecha: periodo.fecha,
      Accion: accion,
      Mensaje: mensajeDe(accion, periodo.fecha),
      Periodo_Anterior: anterior?.fecha ?? null,
      Calidad: calidadDePeriodo(periodo),
      Comparacion: comparar(anterior, periodo),
    }));

    for (const p of periodos) {
      registrarOperacion({
        operacion: 'carga_periodo',
        archivo: carga.archivo,
        perfil: req.perfil, usuario: req.usuario?.usuario,
        resultado: 'exito',
        detalle: `Período ${p.Fecha} (${p.Accion})`,
      });
    }
    // Alertas por correo y casos de seguimiento vía Zapier (#7): no hace esperar esta respuesta.
    avisarPublicacion({
      archivo: carga.archivo,
      catalogos: almacen.catalogos,
      periodos: periodos.map((p, i) => ({
        fecha: p.Fecha,
        accion: p.Accion,
        comparacion: p.Comparacion,
        calidad: p.Calidad,
        periodo: carga.periodos[i].periodo,
      })),
    });
    res.json({ ...encabezado(), archivo: carga.archivo, periodos });
  }

  // Una carga fallida (archivo inválido, muy grande...) también queda en la bitácora.
  // El 403 no se registra aquí: requierePerfil ya lo registra como acceso_denegado.
  function registrarFallo(error, req, res, next) {
    if (error.status !== 403) {
      registrarOperacion({
        operacion: 'carga_periodo',
        archivo: req.get('X-Nombre-Archivo') || null,
        perfil: req.perfil, usuario: req.usuario?.usuario,
        resultado: 'error',
        detalle: error.message,
      });
    }
    next(error);
  }

  // requierePerfil va antes de leer el cuerpo: a un perfil sin permiso no se le lee el archivo.
  rutas.post('/periodos', requierePerfil('admin'), leerCsv, cargar, registrarFallo);
  return rutas;
}
