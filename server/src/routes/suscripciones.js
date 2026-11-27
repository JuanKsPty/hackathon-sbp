// Suscripción a las alertas por correo (#7). Contrato: contracts/eventos-zapier.md.
//   POST /api/suscripciones          cualquier perfil se suscribe (o cambia sus bancos y rankings)
//   GET  /api/suscripciones/baja     enlace del correo para darse de baja (?token=...)
//   GET  /api/suscripciones          lista de suscriptores, solo Administrador (son datos personales)
// Cada alta o baja se avisa a Zapier (evento suscripcion_actualizada) sin hacer esperar la respuesta.
import { Router } from 'express';
import { requierePerfil } from '../middleware/perfiles.js';
import { registrarOperacion } from '../datos/bitacora.js';
import { suscribir, darDeBaja, leerSuscripciones, sinToken } from '../automation/suscripciones.js';
import { eventoSuscripcion, enviarEvento } from '../automation/zapier.js';
import { encabezado, AVISO, FUENTE } from './formato.js';

const describir = (lista, todos) => (lista.length === 0 ? todos : lista.join(', '));

function paginaDeBaja(titulo, mensaje) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Radar SBP</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:40px auto">
<p style="background:#fff4d6;padding:8px"><strong>${AVISO}</strong></p>
<h1>${titulo}</h1><p>${mensaje}</p><p style="color:#555;font-size:12px">Fuente: ${FUENTE}</p>
</body></html>`;
}

export function rutasDeSuscripciones(almacen, { enviar = enviarEvento } = {}) {
  const rutas = Router();

  rutas.post('/suscripciones', (req, res) => {
    const { correo, bancos, rankings } = req.body ?? {};
    const suscripcion = suscribir({ correo, bancos, rankings }, almacen.catalogos);
    registrarOperacion({
      operacion: 'suscripcion',
      perfil: req.perfil,
      resultado: 'exito',
      detalle: `alta: bancos ${describir(suscripcion.bancos, 'todos')}; rankings ${describir(suscripcion.rankings, 'todos')}`,
    });
    void enviar(eventoSuscripcion(suscripcion, 'alta'), { perfil: req.perfil });
    res.json({
      ...encabezado(),
      mensaje: 'Suscripción guardada: recibirás un correo cada vez que se publique un período.',
      suscripcion: sinToken(suscripcion),
    });
  });

  rutas.get('/suscripciones/baja', (req, res) => {
    const suscripcion = darDeBaja(String(req.query.token ?? ''));
    if (!suscripcion) {
      return res
        .status(404)
        .type('html')
        .send(paginaDeBaja('Enlace no válido', 'No encontramos una suscripción con este enlace.'));
    }
    registrarOperacion({ operacion: 'suscripcion', perfil: req.perfil, resultado: 'exito', detalle: 'baja desde el enlace del correo' });
    void enviar(eventoSuscripcion(suscripcion, 'baja'), { perfil: req.perfil });
    res.type('html').send(paginaDeBaja('Te diste de baja', 'Ya no recibirás las alertas por correo de Radar SBP.'));
  });

  rutas.get('/suscripciones', requierePerfil('admin'), (req, res) => {
    const suscripciones = leerSuscripciones().map(sinToken);
    res.json({ ...encabezado(), total: suscripciones.length, suscripciones });
  });

  return rutas;
}
