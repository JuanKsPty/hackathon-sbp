// Orden de las láminas de /presentacion. `titulo` va al lector de pantalla y al título de la pestaña.
import {
  Arquitectura,
  Automatizacion,
  Cascada,
  Cierre,
  DatosEnVivo,
  Decisiones,
  Flujo,
  Ia,
  Lideres,
  Perfiles,
  Plataforma,
  Portada,
  Problema,
  Propuesta,
} from './laminas.jsx'

export const LAMINAS = [
  { id: 'portada', titulo: 'Portada', Componente: Portada },
  { id: 'problema', titulo: 'El problema', Componente: Problema },
  { id: 'propuesta', titulo: 'La propuesta', Componente: Propuesta },
  { id: 'en-vivo', titulo: 'Los datos, en vivo', Componente: DatosEnVivo },
  { id: 'cascada', titulo: 'Cascada E1 a E4', Componente: Cascada },
  { id: 'flujo', titulo: 'Del archivo al ranking', Componente: Flujo },
  { id: 'lideres', titulo: 'Líderes de cada ranking', Componente: Lideres },
  { id: 'plataforma', titulo: 'La plataforma', Componente: Plataforma },
  { id: 'perfiles', titulo: 'Perfiles', Componente: Perfiles },
  { id: 'automatizacion', titulo: 'Automatización', Componente: Automatizacion },
  { id: 'ia', titulo: 'Inteligencia artificial', Componente: Ia },
  { id: 'arquitectura', titulo: 'Arquitectura', Componente: Arquitectura },
  { id: 'decisiones', titulo: 'Decisiones técnicas', Componente: Decisiones },
  { id: 'cierre', titulo: 'Cierre', Componente: Cierre },
]
