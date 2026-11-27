#!/usr/bin/env node
// Deja la app lista para la demo en vivo (entregable 7): solo julio y agosto cargados, y el AT03 de
// septiembre aparte, para subirlo desde Administración como Administrador.
//
//   node presentacion/preparar-demo.mjs                 prepara las carpetas y levanta el API y los dos sitios (npm run dev)
//   node presentacion/preparar-demo.mjs --sin-arrancar  solo prepara las carpetas e imprime los comandos
//
// No toca data/ ni storage/: copia los archivos a una carpeta temporal (DEMO_DIR, por defecto
// <temporal del sistema>/sbp-demo) y apunta la app a ella con DATA_DIR y STORAGE_DIR.
//
// El sitio interno (localhost:5174) pide iniciar sesión: hacen falta cuentas en USUARIOS (o en Supabase,
// con DATABASE_URL) en el .env de la raíz. El script avisa si faltan, sin imprimir sus valores.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const demo = path.resolve(process.env.DEMO_DIR ?? path.join(os.tmpdir(), 'sbp-demo'))
const datos = path.join(demo, 'datos')
const storage = path.join(demo, 'storage')
const paraSubir = path.join(demo, 'para-subir')

const CATALOGOS = [
  'Bancos_ficticios.csv',
  'Catalogo_CINU_SB109_reto.csv',
  'Tabla_SB21_simplificada.csv',
  'Diccionario_datos_AT03_reto.csv',
]
const INICIALES = ['AT03_sintetico_202607.csv', 'AT03_sintetico_202608.csv']
const A_SUBIR = 'AT03_sintetico_202609.csv'

// Las cuentas del sitio interno: USUARIOS (respaldo local) y DATABASE_URL (Supabase) del .env de la raíz.
// Mismas reglas que scripts/con-env.mjs: lo que viene del entorno manda sobre el .env y vacío es no definido.
// Solo se mira si tienen valor; nunca se imprime.
function variablesDelEnv() {
  try {
    return parseEnv(fs.readFileSync(path.join(raiz, '.env'), 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }
}
const env = variablesDelEnv()
const definida = (nombre) => (process.env[nombre] ?? env[nombre] ?? '').trim() !== ''

function avisarCuentas() {
  const usuarios = definida('USUARIOS')
  const basedatos = definida('DATABASE_URL')
  if (!usuarios && !basedatos) {
    console.log('\nAVISO: USUARIOS y DATABASE_URL están vacíos en el .env de la raíz: nadie podrá entrar al sitio interno.')
    console.log('  Genera un admin y un analista y pega las líneas USUARIOS=... en el .env (separadas por coma):')
    console.log('    npm run usuarios --prefix server -- admin admin')
    console.log('    npm run usuarios --prefix server -- analista analista')
  } else if (!usuarios) {
    console.log('\nNota: USUARIOS está vacío. Sin internet (o si Supabase no responde) nadie podrá entrar al sitio interno.')
  }
}

// Se empieza de cero: sin períodos subidos antes ni bitácora vieja.
fs.rmSync(demo, { recursive: true, force: true })
for (const carpeta of [datos, storage, paraSubir]) fs.mkdirSync(carpeta, { recursive: true })
for (const archivo of [...CATALOGOS, ...INICIALES]) fs.copyFileSync(path.join(raiz, 'data', archivo), path.join(datos, archivo))
fs.copyFileSync(path.join(raiz, 'data', A_SUBIR), path.join(paraSubir, A_SUBIR))

console.log(`Demo preparada en ${demo}`)
console.log(`  Datos iniciales (julio y agosto): ${datos}`)
console.log(`  Para subir en vivo (septiembre):  ${path.join(paraSubir, A_SUBIR)}`)
avisarCuentas()

const entorno = { ...process.env, DATA_DIR: datos, STORAGE_DIR: storage }

function imprimirDirecciones() {
  console.log('  Público: http://localhost:5173')
  console.log('  Interno: http://localhost:5174 (inicia sesión con un usuario de USUARIOS)')
  console.log('  API:     http://localhost:3001/api')
}

if (process.argv.includes('--sin-arrancar')) {
  console.log('\nPara levantar la app a mano, desde la raíz del repo, con DATA_DIR y STORAGE_DIR así:')
  console.log(`  DATA_DIR="${datos}" STORAGE_DIR="${storage}" npm run dev`)
  imprimirDirecciones()
  process.exit(0)
}

console.log('\nLevantando la app (Ctrl+C para detenerla)...')
imprimirDirecciones()
const proceso = spawn('npm', ['run', 'dev'], {
  cwd: raiz,
  env: entorno,
  stdio: 'inherit',
  shell: process.platform === 'win32', // en Windows npm es un .cmd
})
proceso.on('exit', (codigo) => process.exit(codigo ?? 0))
