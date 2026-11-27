// Orden de las láminas de /presentacion. `titulo` va al lector de pantalla y al título de la pestaña.
// La historia: portada, propuesta y cierre. Después, la arquitectura y, al final, el QR al sitio
// público para que el jurado lo pruebe.
import {
  Arquitectura,
  Cierre,
  Portada,
  Propuesta,
  Qr,
} from './laminas.jsx'

export const LAMINAS = [
  { id: 'portada', titulo: 'Portada', Componente: Portada },
  { id: 'propuesta', titulo: 'La propuesta', Componente: Propuesta },
  { id: 'cierre', titulo: 'Cierre', Componente: Cierre },
  { id: 'arquitectura', titulo: 'Arquitectura', Componente: Arquitectura },
  { id: 'qr', titulo: 'Pruébalo: código QR al sitio público', Componente: Qr },
]
