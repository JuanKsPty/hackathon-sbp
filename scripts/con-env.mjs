#!/usr/bin/env node
// Corre un script npm del server con las variables del .env de la raíz del repo.
//   node scripts/con-env.mjs dev      ->  npm run dev --prefix server
//   node scripts/con-env.mjs start    ->  npm run start --prefix server
// Solo llama a los scripts npm del server (nunca a server/src/...): si el backend cambia
// de framework (por ejemplo a NestJS) basta con que mantenga sus scripts dev, start y build.
//
// Reglas del .env:
// - Una variable vacía (PORT=) no se pasa: el server usa su valor por defecto.
// - Lo que ya viene del entorno (PORT=4000 npm run dev) manda sobre el .env.
// - Sin .env todo usa los valores por defecto.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [script, ...resto] = process.argv.slice(2)

if (!script) {
  console.error('Uso: node scripts/con-env.mjs <script-del-server> [argumentos]')
  process.exit(1)
}

try {
  const variables = parseEnv(readFileSync(path.join(raiz, '.env'), 'utf8'))
  for (const [nombre, valor] of Object.entries(variables)) {
    if (valor === '' || process.env[nombre] !== undefined) continue
    process.env[nombre] = valor
  }
} catch (error) {
  if (error?.code !== 'ENOENT') {
    console.error(`No se pudo leer el .env de la raíz: ${error.message}`)
    process.exit(1)
  }
}

const argumentos = ['run', script, '--prefix', path.join(raiz, 'server')]
if (resto.length > 0) argumentos.push('--', ...resto)

const hijo = spawn('npm', argumentos, {
  cwd: raiz,
  env: process.env,
  stdio: 'inherit',
  // En Windows npm es npm.cmd y necesita shell.
  shell: process.platform === 'win32',
})

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => hijo.kill(senal))
}

hijo.on('exit', (codigo, senal) => process.exit(codigo ?? (senal ? 1 : 0)))
hijo.on('error', (error) => {
  console.error(`No se pudo iniciar npm: ${error.message}`)
  process.exit(1)
})
