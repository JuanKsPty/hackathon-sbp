// Validación del AT03: esquema (61 columnas en orden), tipos de datos e integridad referencial.
import { ErrorDeDatos } from './csv.js';
import { esMontoValido } from './montos.js';

// Sin estos campos no se puede calcular: un valor inválido rechaza el archivo completo.
const CAMPOS_CRITICOS = ['Fecha', 'Saldo'];
const MAX_DETALLES = 10;

// Formato esperado según la columna "Tipo" del diccionario.
const VALIDADORES_POR_TIPO = {
  'Fecha (AAAAMMDD)': (v) => /^\d{8}$/.test(v),
  'Fecha/Texto': (v) => v === 'NA' || /^\d{8}$/.test(v),
  'Numerico (Decimal)': (v) => /^-?\d+(\.\d+)?$/.test(v),
  'Numerico (Entero)': (v) => /^-?\d+$/.test(v),
  'Codigo (Texto)': (v) => v !== '',
  Texto: (v) => v !== '',
};

// El encabezado debe tener exactamente los campos del diccionario y en el mismo orden.
export function validarEsquema(encabezados, campos, nombreArchivo) {
  const esperados = campos.map((c) => c.campo);
  const detalles = [];
  if (encabezados.length !== esperados.length) {
    detalles.push(`Se esperaban ${esperados.length} columnas y el archivo tiene ${encabezados.length}.`);
  }
  esperados.forEach((campo, i) => {
    if (encabezados[i] !== campo) {
      detalles.push(`Columna ${i + 1}: se esperaba "${campo}" y llegó "${encabezados[i] ?? '(ninguna)'}".`);
    }
  });
  if (detalles.length > 0) {
    throw new ErrorDeDatos(
      `${nombreArchivo} no tiene el esquema AT03 del diccionario (61 columnas en orden).`,
      detalles.slice(0, MAX_DETALLES),
    );
  }
}

// Revisa el formato de cada valor. Un error en Fecha o Saldo rechaza el archivo;
// los demás se devuelven como alertas de calidad (no excluyen filas).
export function validarTipos(filas, campos, nombreArchivo) {
  const criticos = [];
  const alertas = [];
  for (const { numeroFila, datos } of filas) {
    for (const { campo, tipo } of campos) {
      const valor = datos[campo];
      if (valorEsValido(campo, tipo, valor)) continue;
      const problema = {
        fila: numeroFila,
        numeroPrestamo: datos.Numero_Prestamo,
        tipo: 'TIPO_DE_DATO',
        detalle: `${campo} = "${valor ?? ''}" no cumple el tipo ${tipo}`,
      };
      if (CAMPOS_CRITICOS.includes(campo)) criticos.push(problema);
      else alertas.push(problema);
    }
  }
  if (criticos.length > 0) {
    throw new ErrorDeDatos(
      `${nombreArchivo} tiene ${criticos.length} valores inválidos en Fecha o Saldo.`,
      criticos.slice(0, MAX_DETALLES).map((p) => `Fila ${p.fila}: ${p.detalle}`),
    );
  }
  return alertas;
}

function valorEsValido(campo, tipo, valor) {
  if (typeof valor !== 'string') return false;
  if (campo === 'Saldo') return esMontoValido(valor); // a lo sumo 2 decimales
  const validador = VALIDADORES_POR_TIPO[tipo];
  return validador ? validador(valor) : true; // tipo no previsto en el diccionario: no se valida
}

// Integridad referencial de banco y facilidad: se reporta como alerta y NO excluye la fila.
// (Tipo_Actividad fuera del catálogo CINU se trata en la cascada como E4.)
export function revisarIntegridad(filas, catalogos) {
  const alertas = [];
  for (const { numeroFila, datos } of filas) {
    if (!catalogos.bancos.has(datos.Codigo_Banco)) {
      alertas.push({
        fila: numeroFila,
        numeroPrestamo: datos.Numero_Prestamo,
        tipo: 'BANCO_FUERA_DE_CATALOGO',
        detalle: `Codigo_Banco "${datos.Codigo_Banco}" no existe en Bancos_ficticios.csv`,
      });
    }
    if (!catalogos.facilidades.has(datos.Facilidad_Crediticia)) {
      alertas.push({
        fila: numeroFila,
        numeroPrestamo: datos.Numero_Prestamo,
        tipo: 'FACILIDAD_FUERA_DE_CATALOGO',
        detalle: `Facilidad_Crediticia "${datos.Facilidad_Crediticia}" no existe en Tabla_SB21_simplificada.csv`,
      });
    }
  }
  return alertas;
}
