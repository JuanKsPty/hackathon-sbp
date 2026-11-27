// Gancho que se llama cada vez que el Administrador publica un período (POST /api/periodos).
// Avisa a Zapier (#7) con un evento periodo_publicado por período: Zapier registra el resumen,
// envía las alertas por correo a los suscriptores y abre los casos de seguimiento por banco.
//
// resultado = { archivo, catalogos, periodos: [{ fecha, accion, comparacion, calidad, periodo }] }
//   accion: 'NUEVO' o 'ACTUALIZACION'
//   comparacion: movimientos contra el período anterior (formato de contracts/movimientos.json), o null
//   calidad: reporte de calidad del período (formato de contracts/calidad.json)
//   periodo: resultado del motor (se usa la lista de excluidas para los casos de seguimiento)
import { eventoPeriodoPublicado, enviarEvento } from './zapier.js';
import { suscriptoresActivos } from './suscripciones.js';

export async function alPublicarPeriodo(resultado, { enviar = enviarEvento } = {}) {
  const suscriptores = suscriptoresActivos();
  const envios = [];
  for (const publicado of resultado.periodos ?? []) {
    const evento = eventoPeriodoPublicado(publicado, {
      archivo: resultado.archivo,
      catalogos: resultado.catalogos,
      suscriptores,
    });
    envios.push(await enviar(evento, { perfil: 'admin' }));
  }
  return envios;
}

// Llama al gancho sin hacer esperar la respuesta de la carga. Si el gancho falla
// (por ejemplo, no se pudo enviar un correo), la carga ya quedó hecha: solo se registra el error.
export function avisarPublicacion(resultado, gancho = alPublicarPeriodo) {
  return Promise.resolve()
    .then(() => gancho(resultado))
    .catch((error) => console.error(`El aviso de publicación falló: ${error.message}`));
}
