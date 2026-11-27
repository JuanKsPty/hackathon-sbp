// Preferencias del navegador (tema, perfil). localStorage puede fallar (modo privado,
// almacenamiento bloqueado): por eso todo va en try/catch y siempre hay un valor por defecto.

export function leerPreferencia(clave, permitidos, porDefecto) {
  try {
    const valor = window.localStorage.getItem(clave)
    return permitidos.includes(valor) ? valor : porDefecto
  } catch {
    return porDefecto
  }
}

export function guardarPreferencia(clave, valor) {
  try {
    window.localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento la preferencia dura solo esta sesión.
  }
}
