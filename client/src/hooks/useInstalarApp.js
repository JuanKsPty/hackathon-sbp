// Botón "Instalar app" (#8): el navegador avisa con `beforeinstallprompt` cuando la app se puede instalar.
// Guardamos ese aviso y lo mostramos cuando la persona pulsa el botón.
// Expone { disponible, instalar }. En navegadores sin ese evento (Safari/iOS) `disponible` queda en false.
import { useCallback, useEffect, useState } from 'react'

export function useInstalarApp() {
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    const alPoderInstalar = (evento) => {
      // Evita el mini-aviso automático del navegador; lo lanzamos desde el botón.
      evento.preventDefault()
      setAviso(evento)
    }
    const alInstalar = () => setAviso(null)
    window.addEventListener('beforeinstallprompt', alPoderInstalar)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alPoderInstalar)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  const instalar = useCallback(async () => {
    if (!aviso) return
    aviso.prompt()
    // El aviso solo se puede usar una vez, se acepte o no.
    await aviso.userChoice.catch(() => null)
    setAviso(null)
  }, [aviso])

  return { disponible: aviso !== null, instalar }
}
