/**
 * Compare the local repository files and package version with GitHub.
 * Read-only. Uses GITHUB_TOKEN/GH_TOKEN when present for a higher rate limit.
 */
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OWNER = process.env.SYNC_OWNER || 'zyydragon-sys'
const REPO = process.env.SYNC_REPO || 'dsh-agi-federated'
const BRANCH = process.env.SYNC_BRANCH || 'main'
const PROFILE = process.env.DSH_PROFILE_DIR || 'C:\\Users\\Administrator\\.dsh\\profiles\\desktop'

async function fetchImpl() {
  try {
    const net = await import(pathToFileURL(path.join(PROFILE, 'node_modules', 'dshmarket', 'lib', 'net.js')).href)
    return net.marketFetch
  } catch {
    return fetch
  }
}

async function gh(fetchFn, urlPath) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const res = await fetchFn(`https://api.github.com${urlPath}`, {
    signal: AbortSignal.timeout(30000),
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'dsh-agi-monitor',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${urlPath}`)
  return res.json()
}

async function walk(dir, prefix = '') {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const absolute = path.join(dir, entry.name)
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...(await walk(absolute, relative)))
    else if (entry.isFile()) out.push({ absolute, relative })
  }
  return out
}

const files = []
const seen = new Set()
for (const file of await walk(ROOT)) {
  if (file.relative === '.github-token' || seen.has(file.relative)) continue
  seen.add(file.relative)
  files.push(file)
}

const fetchFn = await fetchImpl()
let drift = 0
for (const file of files) {
  const local = createHash('sha256').update(await readFile(file.absolute)).digest('hex')
  let remoteBytes
  try {
    const entry = await gh(fetchFn, `/repos/${OWNER}/${REPO}/contents/${file.relative.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(BRANCH)}`)
    remoteBytes = Buffer.from(entry.content || '', 'base64')
  } catch (error) {
    if (String(error.message).includes('404')) {
      console.log('MISSING', file.relative)
      drift += 1
      continue
    }
    throw error
  }
  const remote = createHash('sha256').update(remoteBytes).digest('hex')
  if (local !== remote) {
    console.log('DRIFT', file.relative)
    drift += 1
  }
}

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'))
const remotePkg = JSON.parse(Buffer.from((await gh(fetchFn, `/repos/${OWNER}/${REPO}/contents/package.json?ref=${BRANCH}`)).content, 'base64').toString('utf8'))
console.log('local version', pkg.version, 'remote version', remotePkg.version)
console.log(drift === 0 ? 'OK — repository matches local source' : `DRIFT — ${drift} file(s) differ`)
process.exitCode = drift === 0 ? 0 : 1
