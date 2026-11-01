/** Debounced local-to-GitHub publisher. Requires GITHUB_TOKEN in the environment. */
import { watch } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLISH = path.join(ROOT, 'scripts', 'publish.mjs')
const targets = [
  ROOT,
  path.join(ROOT, 'schemas'),
  path.join(ROOT, 'plugins', 'dsh-quota-nexus'),
]
let timer = null
let running = false
let pending = false

function publish() {
  pending = true
  if (running) return
  running = true
  pending = false
  const child = spawn(process.execPath, [PUBLISH, '--all'], { cwd: ROOT, stdio: 'inherit' })
  child.on('exit', (code) => {
    running = false
    if (code !== 0) console.error('publish failed with exit code', code)
    if (pending) publish()
  })
}

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(publish, 1500)
}

for (const target of targets) {
  watch(target, { persistent: true }, schedule)
}
console.log('watching', ROOT, '— press Ctrl+C to stop')
