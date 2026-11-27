// Gancho que se llama cada vez que el Administrador publica un período (POST /api/periodos).
// Aquí se conectarán las alertas por correo (#7): por ahora no hace nada.
//
// resultado = { archivo, periodos: [{ fecha, accion, comparacion }] }
//   accion: 'NUEVO' o 'ACTUALIZACION'
//   comparacion: movimientos contra el período anterior (formato de contracts/movimientos.json), o null
export async function alPublicarPeriodo(resultado) {} // eslint-disable-line no-unused-vars

// Llama al gancho sin hacer esperar la respuesta de la carga. Si el gancho falla
// (por ejemplo, no se pudo enviar un correo), la carga ya quedó hecha: solo se registra el error.
export function avisarPublicacion(resultado, gancho = alPublicarPeriodo) {
  return Promise.resolve()
    .then(() => gancho(resultado))
    .catch((error) => console.error(`El aviso de publicación falló: ${error.message}`));
}
