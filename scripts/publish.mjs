/**
 * Publish DSH plugin bundles in this repository through the GitHub Contents API.
 *
 * Why this exists: this machine has no git binary and no stored GitHub credential,
 * so updates go straight through api.github.com with a personal access token.
 * Every file is PUT with its existing blob sha, so re-running is idempotent and
 * becomes the normal "push my latest edits" command after the first upload.
 *
 * Token resolution, in order:
 *   1. --token-stdin  (recommended: piped from a masked prompt, never touches disk)
 *   2. --token <value>
 *   3. the first line of --token-file (default: <repo parent>/.github-token)
 *   4. env GITHUB_TOKEN / GH_TOKEN (for CI; prefer the temporary forms for interactive use)
 * A token that came from --token-file is deleted after a successful run. Nothing ever
 * prints the token, and no code path writes it back to disk.
 *
 * Usage:
 *   node scripts/publish.mjs --all
 *   node scripts/publish.mjs --plugin dsh-quota-nexus
 *   node scripts/publish.mjs --plugin dsh-agi-federated --dry-run
 *
 * Options:
 *   --plugin <name>    one group from GROUPS below
 *   --all              every group
 *   --dry-run          list the files that would be uploaded, no token needed
 *   --owner <login>    default zyydragon-sys
 *   --repo <name>      default dsh-agi-federated
 *   --branch <name>    default: the repository's default branch
 *   --token-stdin      read the token from stdin (masked prompt / pipe)
 *   --token <value>    inline token (visible to process listing; avoid)
 *   --token-file <p>   read the token from a file, then delete it on success
 *   --keep-token       keep the token file after a successful run
 */
import { readFile, readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_PARENT = path.dirname(REPO_ROOT)

const GROUPS = {
  // The repository-root bundle: its own files plus the maintenance scripts.
  'dsh-agi-federated': {
    prefix: '',
    files: [
      'README.md',
      'package.json',
      'cordis.patch.yml',
      'index.js',
      'client.js',
      'icon.svg',
      'locale/en.json',
      'locale/zh.json',
      'ARCHITECTURE.md',
      'CHANGELOG.md',
      'MAINTENANCE.md',
      'EVOLUTION.md',
      'schemas/config.js',
      'scripts/publish.mjs',
      'scripts/monitor.mjs',
      'scripts/watch.mjs',
      '.github/workflows/ci.yml',
    ],
  },
  // A nested bundle: the whole directory is walked.
  'dsh-quota-nexus': { prefix: 'plugins/dsh-quota-nexus', dir: 'plugins/dsh-quota-nexus' },
}

function parseArgs(argv) {
  const options = { all: false, dryRun: false, owner: 'zyydragon-sys', repo: 'dsh-agi-federated' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--all') options.all = true
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--plugin') options.plugin = argv[++index]
    else if (arg === '--owner') options.owner = argv[++index]
    else if (arg === '--repo') options.repo = argv[++index]
    else if (arg === '--branch') options.branch = argv[++index]
    else if (arg === '--token') options.token = argv[++index]
    else if (arg === '--token-stdin') options.tokenStdin = true
    else if (arg === '--token-file') options.tokenFile = argv[++index]
    else if (arg === '--keep-token') options.keepToken = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  return options
}

/** Read the token from stdin without echoing or persisting it. */
async function readStdinToken() {
  if (process.stdin.isTTY) {
    throw new Error(
      '--token-stdin expects a piped token: e.g. Read-Host "PAT" | node scripts/publish.mjs --all --token-stdin',
    )
  }
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const token = Buffer.concat(chunks).toString('utf8').trim().split(/\r?\n/)[0]
  if (!token) throw new Error('--token-stdin received an empty token')
  return token
}

async function readToken(options) {
  if (options.tokenStdin) return { token: await readStdinToken(), fromFile: null }
  if (options.token) return { token: options.token, fromFile: null }
  const file = options.tokenFile || path.join(REPO_PARENT, '.github-token')
  try {
    const text = await readFile(file, 'utf8')
    const token = text.trim().split(/\r?\n/)[0]
    if (!token) throw new Error('empty')
    return { token, fromFile: file }
  } catch {
    /* fall through to the environment, then fail with every accepted source listed */
  }
  const fromEnv = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim()
  if (fromEnv) return { token: fromEnv, fromFile: null }
  throw new Error(
    'no GitHub token: pipe one with --token-stdin, write a PAT (Contents: read and write) into ' +
      `${file}, or set GITHUB_TOKEN for CI`,
  )
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

async function collect(group) {
  if (group.dir) {
    const files = await walk(path.join(REPO_ROOT, group.dir))
    files.sort((a, b) => a.relative.localeCompare(b.relative))
    return files.map((file) => ({ absolute: file.absolute, remote: `${group.prefix}/${file.relative}` }))
  }
  const out = []
  for (const relative of group.files) {
    const absolute = path.join(REPO_ROOT, relative)
    await stat(absolute) // fail loudly on a missing manifest entry
    out.push({ absolute, remote: relative })
  }
  return out
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const names = options.all ? Object.keys(GROUPS) : options.plugin ? [options.plugin] : []
  if (names.length === 0) throw new Error('choose --all or --plugin <name>')
  for (const name of names) if (!GROUPS[name]) throw new Error(`unknown plugin group: ${name}`)

  const plan = []
  for (const name of names) {
    for (const file of await collect(GROUPS[name])) plan.push({ group: name, ...file })
  }
  console.log(`repo ${options.owner}/${options.repo} · groups ${names.join(', ')} · files ${plan.length}`)

  if (options.dryRun) {
    for (const file of plan) console.log('would upload', file.remote, (await stat(file.absolute)).size)
    return
  }

  const { token, fromFile } = await readToken(options)
  const ghFetch = typeof fetch === 'function' ? fetch : null
  if (!ghFetch) throw new Error('this Node runtime has no global fetch')

  const gh = async (urlPath, request = {}) => {
    const response = await ghFetch(`https://api.github.com${urlPath}`, {
      ...request,
      signal: AbortSignal.timeout(60_000),
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'dsh-bundle-publisher',
        authorization: `Bearer ${token}`,
        ...(request.headers || {}),
      },
    })
    const text = await response.text()
    let body = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }
    if (!response.ok) {
      const error = new Error(
        `GitHub ${request.method || 'GET'} ${urlPath} -> ${response.status}: ${
          typeof body === 'string' ? body : JSON.stringify(body)
        }`,
      )
      error.status = response.status
      throw error
    }
    return body
  }

  const me = await gh('/user')
  console.log('authenticated as', me.login)
  const repo = await gh(`/repos/${options.owner}/${options.repo}`)
  const branch = options.branch || repo.default_branch || 'main'
  console.log('target', repo.full_name, '| branch', branch, '| private', repo.private)
  const canWrite = me.login === options.owner || Boolean(repo.permissions && (repo.permissions.push || repo.permissions.admin))
  if (!canWrite) throw new Error(`${me.login} has no write permission on ${options.owner}/${options.repo}`)

  let added = 0
  let updated = 0
  for (const file of plan) {
    const encoded = file.remote.split('/').map(encodeURIComponent).join('/')
    const content = (await readFile(file.absolute)).toString('base64')
    let sha
    let uploaded = false
    for (let attempt = 0; attempt < 3 && !uploaded; attempt += 1) {
      try {
        const existing = await gh(`/repos/${options.owner}/${options.repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`)
        if (existing && existing.sha) sha = existing.sha
      } catch (error) {
        if (error.status !== 404) throw error
        sha = undefined
      }
      try {
        await gh(`/repos/${options.owner}/${options.repo}/contents/${encoded}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: `${file.group}: ${sha ? 'update' : 'add'} ${file.remote}`,
            content,
            branch,
            ...(sha ? { sha } : {}),
          }),
        })
        uploaded = true
      } catch (error) {
        // A concurrent writer changed the blob between GET and PUT. Re-read
        // the new sha and retry; do not turn a transient race into a partial
        // publish.
        if (error.status === 409 && attempt < 2) {
          console.log('conflict, retrying', file.remote)
          await new Promise((resolve) => setTimeout(resolve, 600))
          continue
        }
        throw error
      }
    }
    if (sha) updated += 1
    else added += 1
    console.log(sha ? 'updated' : 'added  ', file.remote)
  }

  console.log(`done · added ${added} · updated ${updated}`)
  console.log(`repo https://github.com/${options.owner}/${options.repo}/tree/${branch}`)
  if (fromFile && !options.keepToken) {
    try {
      await unlink(fromFile)
      console.log('token file removed')
    } catch {}
  }
}

await main().catch((error) => {
  console.error('publish failed:', error.message)
  process.exitCode = 1
})
