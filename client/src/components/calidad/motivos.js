// Nombres para mostrar de los motivos de exclusión de la cascada (sección 6 de las indicaciones).
// Son rótulos de pantalla: los conteos siempre vienen del API (R2).
export const MOTIVOS = [
  { codigo: 'E1', nombre: 'Duplicados', campo: 'E1_Duplicados' },
  { codigo: 'E2', nombre: 'Destino extranjero', campo: 'E2_Destino_Extranjero' },
  { codigo: 'E3', nombre: 'Saldo no positivo', campo: 'E3_Saldo_No_Positivo' },
  { codigo: 'E4', nombre: 'Actividad no catalogada', campo: 'E4_Actividad_No_Catalogada' },
]

export const nombreDeMotivo = (codigo) => MOTIVOS.find((m) => m.codigo === codigo)?.nombre ?? codigo
