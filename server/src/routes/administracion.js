// Administración (#30): la regla de movimiento significativo y el estado de los catálogos.
//   GET /api/parametros        todos los perfiles
//   PUT /api/parametros        solo admin; cada cambio queda en la bitácora
//   GET /api/admin/catalogos   solo admin; fuente, archivo, registros y fecha de carga
//   GET /api/admin/catalogos/:clave   solo admin; el contenido del catálogo (bancos, cinu, sb21 o
//                                     diccionario), o el CSV original con ?formato=csv
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { leerCsv } from '../engine/csv.js';
import { requiereOpcion } from '../middleware/perfiles.js';
import { registrarOperacion } from '../datos/bitacora.js';
import { ARCHIVOS_CATALOGO } from '../datos/paquete.js';
import {
  POR_DEFECTO,
  archivoVigente,
  leerReglaMovimientos,
  guardarReglaMovimientos,
  validarRegla,
} from '../automation/reglaMovimientos.js';
import { ErrorApi } from './errores.js';

const FUENTE_CATALOGOS = 'Paquete del reto (SBP), copia en data/';

// La misma carpeta que procesa servidor.js al arrancar (DATA_DIR o data/ en la raíz del repo).
const carpetaDatos = () => path.resolve(process.env.DATA_DIR ?? fileURLToPath(new URL('../../../data/', import.meta.url)));

const NOMBRES_CATALOGO = { cinu: 'CINU/SB109', sb21: 'SB21', bancos: 'Bancos', diccionario: 'Diccionario AT03' };

function respuestaDeParametros() {
  return {
    regla_significativo: leerReglaMovimientos(),
    origen: archivoVigente() === POR_DEFECTO ? 'por_defecto' : 'administrador',
    por_defecto: leerReglaMovimientos(POR_DEFECTO),
  };
}

// Estado de cada catálogo. Los catálogos se leen al arrancar la API, así que
// la fecha de carga es la de creación de la app.
function estadoDeCatalogos(catalogos, fechaCarga) {
  const fila = (catalogo, clave, registros, congelado, nota) => ({
    catalogo,
    archivo: ARCHIVOS_CATALOGO[clave],
    fuente: FUENTE_CATALOGOS,
    fecha_carga: fechaCarga,
    registros,
    congelado,
    nota,
  });
  return [
    fila('CINU/SB109', 'cinu', catalogos.cinu.size, true, 'Congelado: es la única versión válida (sección 2). No se modifica.'),
    fila('SB21', 'sb21', catalogos.facilidades.size, false, 'Solo lectura: viene del paquete del reto.'),
    fila('Bancos', 'bancos', catalogos.bancos.size, false, 'Solo lectura: viene del paquete del reto.'),
    fila('Diccionario AT03', 'diccionario', catalogos.campos.length, false, 'Solo lectura: viene del paquete del reto.'),
  ];
}

export function rutasDeAdministracion(almacen) {
  const rutas = express.Router();
  const fechaCarga = new Date().toISOString();

  rutas.get('/parametros', (req, res) => {
    res.json(respuestaDeParametros());
  });

  rutas.put('/parametros', requiereOpcion('administrar_parametros'), (req, res) => {
    const anterior = leerReglaMovimientos();
    let nueva;
    try {
      nueva = validarRegla(req.body?.regla_significativo);
    } catch (error) {
      registrarOperacion({ operacion: 'cambio_parametros', perfil: req.perfil, usuario: req.usuario?.usuario, resultado: 'error', detalle: error.message });
      throw new ErrorApi(400, 'PARAMETRO_INVALIDO', error.message);
    }
    guardarReglaMovimientos(nueva);
    registrarOperacion({
      operacion: 'cambio_parametros',
      perfil: req.perfil, usuario: req.usuario?.usuario,
      resultado: 'exito',
      detalle: `regla_significativo: ${JSON.stringify(anterior)} -> ${JSON.stringify(nueva)}`,
    });
    res.json(respuestaDeParametros());
  });

  rutas.get('/admin/catalogos', requiereOpcion('administrar_catalogos'), (req, res) => {
    res.json({ catalogos: estadoDeCatalogos(almacen.catalogos, fechaCarga) });
  });

  // Contenido de un catálogo, tal como viene en el paquete del reto. Solo lectura: la clasificación
  // usa únicamente los catálogos suministrados (R3) y el CINU está congelado.
  rutas.get('/admin/catalogos/:clave', requiereOpcion('administrar_catalogos'), (req, res) => {
    const clave = String(req.params.clave).toLowerCase();
    const archivo = ARCHIVOS_CATALOGO[clave];
    if (!archivo) {
      throw new ErrorApi(404, 'CATALOGO_NO_ENCONTRADO', `No existe el catálogo "${req.params.clave}" (usa ${Object.keys(ARCHIVOS_CATALOGO).join(', ')}).`);
    }
    const texto = fs.readFileSync(path.join(carpetaDatos(), archivo), 'utf8');
    if (req.query.formato === 'csv') {
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="${archivo}"`);
      return res.send(texto);
    }
    const { encabezados, filas } = leerCsv(texto, archivo);
    return res.json({
      catalogo: NOMBRES_CATALOGO[clave],
      clave,
      archivo,
      fuente: FUENTE_CATALOGOS,
      congelado: clave === 'cinu',
      columnas: encabezados,
      filas: filas.map(({ datos }) => datos),
    });
  });

  return rutas;
}
