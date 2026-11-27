// URL del otro sitio (público <-> interno), para el botón píldora de la navegación.
// Los dos sitios salen del mismo código (vite.config.js, PR #120):
// - Producción: sbp.juank.tech <-> interno.sbp.juank.tech.
// - Local: cada sitio tiene su puerto (dev 5173/5174, preview 4173/4174, Docker 8080/8081).
//   Con otro puerto, el interno es el del público más uno.
// VITE_URL_PUBLICO y VITE_URL_INTERNO, si están, mandan sobre todo lo anterior.

const PUERTOS = [
  ['5173', '5174'],
  ['4173', '4174'],
  ['8080', '8081'],
]

const LOCALES = /^(localhost|127\.0\.0\.1|\[::1\]|\d+\.\d+\.\d+\.\d+)$/

export function urlOtroSitio({ interno, ubicacion, env = {} }) {
  const fija = interno ? env.VITE_URL_PUBLICO : env.VITE_URL_INTERNO
  if (fija) return fija

  const url = new URL(ubicacion.origin ?? ubicacion.href)
  const local = LOCALES.test(url.hostname) || url.hostname.endsWith('.localhost')

  if (local || url.port) {
    const par = PUERTOS.find(([pub, int]) => url.port === (interno ? int : pub))
    if (par) url.port = interno ? par[0] : par[1]
    else if (url.port) url.port = String(Number(url.port) + (interno ? -1 : 1))
  } else if (interno) {
    url.hostname = url.hostname.replace(/^interno\./, '')
  } else if (!url.hostname.startsWith('interno.')) {
    url.hostname = `interno.${url.hostname.replace(/^www\./, '')}`
  }
  return `${url.origin}/`
}
