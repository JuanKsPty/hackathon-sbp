// Orden de las láminas de /presentacion. `titulo` va al lector de pantalla y al título de la pestaña.
// La historia va por roles: problema, propuesta, Público, Analista, Administrador, confianza y
// cierre. Después del cierre, el anexo técnico, solo para las preguntas del jurado.
import {
  Anexo,
  Arquitectura,
  Cascada,
  Cierre,
  Confianza,
  Decisiones,
  Flujo,
  Lideres,
  Portada,
  Problema,
  Propuesta,
  RolAdministrador,
  RolAnalista,
  RolPublico,
} from './laminas.jsx'

export const LAMINAS = [
  { id: 'portada', titulo: 'Portada', Componente: Portada },
  { id: 'problema', titulo: 'El problema', Componente: Problema },
  { id: 'propuesta', titulo: 'La propuesta', Componente: Propuesta },
  { id: 'publico', titulo: 'Público', Componente: RolPublico },
  { id: 'lideres', titulo: 'Lo que ve el público', Componente: Lideres },
  { id: 'analista', titulo: 'Analista', Componente: RolAnalista },
  { id: 'administrador', titulo: 'Administrador', Componente: RolAdministrador },
  { id: 'confianza', titulo: 'Por qué confiar en los números', Componente: Confianza },
  { id: 'cierre', titulo: 'Cierre', Componente: Cierre },
  { id: 'anexo', titulo: 'Anexo técnico', Componente: Anexo },
  { id: 'flujo', titulo: 'Anexo: del archivo al ranking', Componente: Flujo },
  { id: 'cascada', titulo: 'Anexo: cascada E1 a E4', Componente: Cascada },
  { id: 'arquitectura', titulo: 'Anexo: arquitectura', Componente: Arquitectura },
  { id: 'decisiones', titulo: 'Anexo: decisiones técnicas', Componente: Decisiones },
]
