import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const files = {}

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'server' || entry.name === '.openai') continue
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) await collect(path)
    else files[`/${relative(root, path).replaceAll('\\', '/')}`] = (await readFile(path)).toString('base64')
  }
}

await collect(root)

const workerTemplate = await readFile(new URL('../server/index.js', import.meta.url), 'utf8')
const worker = workerTemplate.replace('__ENIU_STATIC_FILES__', JSON.stringify(files))

await mkdir(resolve(root, 'server'), { recursive: true })
await writeFile(resolve(root, 'server/index.js'), worker)
