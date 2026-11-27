#!/usr/bin/env node
// Deja la app lista para la demo en vivo (entregable 7): solo julio y agosto cargados, y el AT03 de
// septiembre aparte, para subirlo desde Administración como Administrador.
//
//   node presentacion/preparar-demo.mjs                 prepara las carpetas y levanta server y client (npm run dev)
//   node presentacion/preparar-demo.mjs --sin-arrancar  solo prepara las carpetas e imprime los comandos
//
// No toca data/ ni storage/: copia los archivos a una carpeta temporal (DEMO_DIR, por defecto
// <temporal del sistema>/sbp-demo) y apunta la app a ella con DATA_DIR y STORAGE_DIR.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

// Se empieza de cero: sin períodos subidos antes ni bitácora vieja.
fs.rmSync(demo, { recursive: true, force: true })
for (const carpeta of [datos, storage, paraSubir]) fs.mkdirSync(carpeta, { recursive: true })
for (const archivo of [...CATALOGOS, ...INICIALES]) fs.copyFileSync(path.join(raiz, 'data', archivo), path.join(datos, archivo))
fs.copyFileSync(path.join(raiz, 'data', A_SUBIR), path.join(paraSubir, A_SUBIR))

console.log(`Demo preparada en ${demo}`)
console.log(`  Datos iniciales (julio y agosto): ${datos}`)
console.log(`  Para subir en vivo (septiembre):  ${path.join(paraSubir, A_SUBIR)}`)

const entorno = { ...process.env, DATA_DIR: datos, STORAGE_DIR: storage }

if (process.argv.includes('--sin-arrancar')) {
  console.log('\nPara levantar la app a mano, desde la raíz del repo, con DATA_DIR y STORAGE_DIR así:')
  console.log(`  DATA_DIR="${datos}" STORAGE_DIR="${storage}" npm run dev`)
  process.exit(0)
}

console.log('\nLevantando la app (Ctrl+C para detenerla)...')
console.log('  App:  http://localhost:5173')
console.log('  API:  http://localhost:3001/api')
const proceso = spawn('npm', ['run', 'dev'], {
  cwd: raiz,
  env: entorno,
  stdio: 'inherit',
  shell: process.platform === 'win32', // en Windows npm es un .cmd
})
proceso.on('exit', (codigo) => process.exit(codigo ?? 0))
