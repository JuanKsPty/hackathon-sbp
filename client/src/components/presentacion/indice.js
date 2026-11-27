// Orden de las láminas de /presentacion. `titulo` va al lector de pantalla y al título de la pestaña.
// La historia: problema, propuesta, Público, lo que nos diferencia y cierre. Después, la
// arquitectura y, al final, el QR al sitio público para que el jurado lo pruebe.
import {
  Arquitectura,
  Cierre,
  Diferencia,
  Portada,
  Problema,
  Propuesta,
  Qr,
  RolPublico,
} from './laminas.jsx'

export const LAMINAS = [
  { id: 'portada', titulo: 'Portada', Componente: Portada },
  { id: 'problema', titulo: 'El problema', Componente: Problema },
  { id: 'propuesta', titulo: 'La propuesta', Componente: Propuesta },
  { id: 'publico', titulo: 'Público', Componente: RolPublico },
  { id: 'diferencia', titulo: 'Lo que nos diferencia', Componente: Diferencia },
  { id: 'cierre', titulo: 'Cierre', Componente: Cierre },
  { id: 'arquitectura', titulo: 'Arquitectura', Componente: Arquitectura },
  { id: 'qr', titulo: 'Pruébalo: código QR al sitio público', Componente: Qr },
]
