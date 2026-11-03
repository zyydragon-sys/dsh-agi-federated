import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * ARCH-01 架构基线插件（Host 半部）。
 *
 * 整篇架构内容只保存在插件包内的一个文件 arch-baseline.md；本模块提供：
 *   1. arch_baseline 工具——给 Agent 一次返回全文；
 *   2. 只读内容路由——给面板读取同一份文件；
 *   3. 运行时状态路由——面板显示真实的插件/工具/文档状态（“活”的架构）；
 *   4. 聚焦与自检路由——外部（含 Agent）可以请求把面板切到前台，并读取页面自检结果。
 */
const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOC_PATH = join(PACKAGE_DIR, 'arch-baseline.md')
const DOC_ROUTE = '/arch-baseline/arch-01.md'
const LIVE_ROUTE = '/arch-baseline/live.json'
const FOCUS_ROUTE = '/arch-baseline/focus.json'
const FOCUS_ACK_ROUTE = '/arch-baseline/focus-ack.json'
const DIAGNOSTICS_ROUTE = '/arch-baseline/diagnostics.json'
const UPDATES_ROUTE = '/arch-baseline/updates.json'
const UPGRADE_ROUTE = '/arch-baseline/upgrade.json'
const REGISTRY_ORIGIN = 'https://registry.npmjs.org'
const UPDATES_TTL_MS = 10 * 60 * 1000

let packageVersion = '0.0.0'
try {
  const manifest = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8'))
  if (manifest && typeof manifest.version === 'string') packageVersion = manifest.version
} catch (error) {
  /* version stays unknown */
}

export const name = 'dsh-arch-baseline'
export const inject = ['tools']

function sendJson(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(JSON.stringify(value))
}

function readJsonBody(req, limit) {
  return new Promise((resolve) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size <= limit) chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'))
      } catch (error) {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

export function apply(ctx) {
  let cached = null
  const load = () => {
    if (cached === null) cached = readFileSync(DOC_PATH, 'utf8')
    return cached
  }

  let pendingFocus = false
  let pendingView = ''
  let latestDiagnostics = null
  let updatesCache = null
  let upgradeInFlight = false

  function registryUrl(name) {
    return REGISTRY_ORIGIN + '/' + encodeURIComponent(name).replace(/%40/g, '@')
  }

  async function fetchLatestVersion(name) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    try {
      const response = await fetch(registryUrl(name), {
        signal: controller.signal,
        headers: { accept: 'application/vnd.npm.install-v1+json' },
      })
      if (!response.ok) return { error: 'HTTP ' + response.status }
      const body = await response.json()
      const latest = body && body['dist-tags'] && body['dist-tags'].latest
      return latest ? { latest: String(latest) } : { error: 'no dist-tags.latest' }
    } catch (error) {
      return { error: error && error.message ? error.message : String(error) }
    } finally {
      clearTimeout(timer)
    }
  }

  async function buildUpdates(force) {
    if (!force && updatesCache && Date.now() - updatesCache.at < UPDATES_TTL_MS) return updatesCache.data
    const bundles = []
    try {
      const manager = ctx.get('pluginManager')
      if (manager && typeof manager.listBundles === 'function') {
        const rows = await manager.listBundles()
        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (!row || !row.installed || !row.version) continue
            if (typeof row.source === 'string' && row.source.indexOf('link:') === 0) continue
            bundles.push({ name: String(row.name), version: String(row.version), enabled: row.enabled !== false })
          }
        }
      }
    } catch (error) {
      /* manager unavailable: return an empty inventory */
    }
    const queue = bundles.slice()
    const checkOne = async () => {
      while (queue.length > 0) {
        const row = queue.shift()
        const result = await fetchLatestVersion(row.name)
        if (result.error) {
          row.error = result.error
          row.latest = null
          row.updateAvailable = false
        } else {
          row.latest = result.latest
          row.updateAvailable = result.latest !== row.version
        }
      }
    }
    await Promise.all([checkOne(), checkOne(), checkOne(), checkOne()])
    const data = {
      at: new Date().toISOString(),
      registry: REGISTRY_ORIGIN,
      bundles: bundles,
      available: bundles.filter((row) => row.updateAvailable).length,
    }
    updatesCache = { at: Date.now(), data: data }
    return data
  }

  async function buildLive() {
    const plugins = []
    let pluginsError = ''
    try {
      const manager = ctx.get('pluginManager')
      if (manager && typeof manager.listPlugins === 'function') {
        const rows = await manager.listPlugins()
        if (Array.isArray(rows)) {
          for (const row of rows) {
            plugins.push({
              entryId: String(row.entryId || ''),
              moduleName: String(row.moduleName || ''),
              enabled: row.enabled !== false,
              phase: row.fiberPhase || null,
            })
          }
        }
      }
    } catch (error) {
      pluginsError = error && error.message ? error.message : String(error)
    }

    let toolCount = 0
    try {
      const tools = ctx.get('tools')
      if (tools && typeof tools.schemas === 'function') toolCount = tools.schemas().length
    } catch (error) {
      /* tools unavailable */
    }

    let docBytes = 0
    let docMtime = 0
    try {
      const info = statSync(DOC_PATH)
      docBytes = info.size
      docMtime = info.mtimeMs
    } catch (error) {
      /* file unreadable; the content route reports it */
    }

    const counts = { total: plugins.length, active: 0, disabled: 0, failed: 0, other: 0 }
    for (const plugin of plugins) {
      if (!plugin.enabled) counts.disabled += 1
      else if (plugin.phase === 'active') counts.active += 1
      else if (plugin.phase === 'failed') counts.failed += 1
      else counts.other += 1
    }

    return {
      at: new Date().toISOString(),
      plugin: { name: 'dsh-arch-01-baseline', version: packageVersion },
      profile: process.env.DSH_PROFILE || '',
      profileDir: process.env.DSH_PROFILE_DIR || '',
      doc: { path: DOC_PATH, bytes: docBytes, mtimeMs: docMtime },
      tools: toolCount,
      counts: counts,
      plugins: plugins,
      pluginsError: pluginsError || undefined,
      focus: pendingFocus,
      view: pendingView,
    }
  }

  ctx.effect(() => ctx.tools.register({
    name: 'arch_baseline',
    description:
      '读取《DSH 基础安装架构基线 · ARCH-01（v3 MCP 强化版）》全文。整篇架构规范保存在单一文件 arch-baseline.md 中，本工具一次返回全部内容，不按章节拆分、不做过滤。'
      + '内容覆盖：架构分层（L0 宿主 / L1 启动 / L2 基础能力 / L3 增量扩展 / L4 AGI / L-MCP 协议层）、已确认崩盘根因与修复清单、'
      + '硬约束（禁止崩盘、禁止空白、禁止丢数据、禁止越界）、Host/Client 契约、启动契约与双 6 项预检、安全与执行层、多层记忆与召回顺序、'
      + '计费契约、技能与演化契约、可视化与协作契约、UI 契约、AGI 隔离与恢复条件、完整变更流程、v3 验收清单、'
      + 'MCP 服务器矩阵（Tier 1-4：Filesystem / Memory / Fetch / Sequential Thinking / SQLite / PostgreSQL / JSON Schema / GitHub / Puppeteer / Brave Search / Context7 / Everything / Desktop Commander）'
      + '及其配置与健康检查、自建 MCP 源码、附录（版本对照、快速参考卡、关键路径、最小启动集）。'
      + 'GUI 左侧栏「ARCH-01 架构基线」面板提供实时架构视图，可查看运行时状态与全文。'
      + '在安装/升级/卸载插件或 MCP、修改 profile、排查启动崩溃或面板空白、规划 AGI 恢复、审查架构合规、确定记忆与安全边界前调用。',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'ARCH-01 架构基线全文（Markdown）。' },
          path: { type: 'string', description: '单一内容文件在磁盘上的绝对路径，可用 read 工具分段复查。' },
        },
        required: ['content', 'path'],
        additionalProperties: false,
      },
      render(_args, value) {
        return [{ type: 'text', text: value.content }]
      },
    },
    async execute() {
      let text
      try {
        text = load()
      } catch (error) {
        throw new Error('无法读取架构基线文件 ' + DOC_PATH + '：' + (error && error.message ? error.message : String(error)))
      }
      return { content: text, path: DOC_PATH }
    },
    isConcurrencySafe() {
      return true
    },
  }))

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: DOC_ROUTE,
      handler(req, res) {
        const headers = {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        }
        let text
        try {
          text = load()
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end('无法读取架构基线文件：' + (error && error.message ? error.message : String(error)))
          return
        }
        res.writeHead(200, headers)
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        res.end(text)
      },
    }))

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: LIVE_ROUTE,
      async handler(req, res) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          sendJson(res, 405, { error: 'method-not-allowed' })
          return
        }
        try {
          sendJson(res, 200, await buildLive())
        } catch (error) {
          sendJson(res, 500, { error: error && error.message ? error.message : String(error) })
        }
      },
    }))

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: FOCUS_ROUTE,
      async handler(req, res) {
        const url = new URL(req.url || '/', 'http://localhost')
        let action = url.searchParams.get('action') || ''
        const view = url.searchParams.get('view') || ''
        if (!action && (req.method === 'POST' || req.method === 'PUT')) {
          const body = await readJsonBody(req, 8192)
          if (body && typeof body.action === 'string') action = body.action
        }
        if (action === 'set') {
          pendingFocus = true
          pendingView = view === 'mcp' || view === 'pipeline' || view === 'layers' ? view : ''
        } else if (action === 'clear') {
          pendingFocus = false
          pendingView = ''
        }
        sendJson(res, 200, { focus: pendingFocus, view: pendingView })
      },
    }))

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: FOCUS_ACK_ROUTE,
      async handler(req, res) {
        pendingFocus = false
        pendingView = ''
        sendJson(res, 200, { ok: true, focus: pendingFocus })
      },
    }))

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: DIAGNOSTICS_ROUTE,
      async handler(req, res) {
        if (req.method === 'POST' || req.method === 'PUT') {
          const body = await readJsonBody(req, 131072)
          latestDiagnostics = {
            at: new Date().toISOString(),
            payload: body,
          }
          sendJson(res, 200, { ok: true })
          return
        }
        sendJson(res, 200, { latest: latestDiagnostics })
      },
    }))

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: UPDATES_ROUTE,
      async handler(req, res) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          sendJson(res, 405, { error: 'method-not-allowed' })
          return
        }
        const url = new URL(req.url || '/', 'http://localhost')
        const force = url.searchParams.get('refresh') === '1'
        try {
          sendJson(res, 200, await buildUpdates(force))
        } catch (error) {
          sendJson(res, 500, { error: error && error.message ? error.message : String(error) })
        }
      },
    }))

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: UPGRADE_ROUTE,
      async handler(req, res) {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'method-not-allowed' })
          return
        }
        if (upgradeInFlight) {
          sendJson(res, 409, { error: 'upgrade-in-progress' })
          return
        }
        const body = await readJsonBody(req, 8192)
        const targetName = body && typeof body.name === 'string' ? body.name : ''
        const targetVersion = body && typeof body.version === 'string' ? body.version : ''
        if (!targetName || !targetVersion) {
          sendJson(res, 400, { error: 'name-and-version-required' })
          return
        }
        let inventory = null
        try {
          inventory = await buildUpdates(false)
        } catch (error) {
          inventory = null
        }
        const target = inventory ? inventory.bundles.find((row) => row.name === targetName) : undefined
        if (!target) {
          sendJson(res, 400, { error: 'unknown-bundle' })
          return
        }
        if (target.latest !== targetVersion) {
          sendJson(res, 400, { error: 'version-not-latest' })
          return
        }
        const manager = ctx.get('pluginManager')
        if (!manager || typeof manager.removeBundle !== 'function' || typeof manager.installBundle !== 'function') {
          sendJson(res, 503, { error: 'plugin-manager-unavailable' })
          return
        }
        upgradeInFlight = true
        const previousVersion = target.version
        try {
          const removed = await manager.removeBundle(targetName)
          try {
            const installed = await manager.installBundle(targetName + '@' + targetVersion, { enabled: true })
            updatesCache = null
            sendJson(res, 200, {
              ok: true,
              name: targetName,
              from: previousVersion,
              version: targetVersion,
              removed: removed && removed.application,
              installed: installed && installed.application,
              warnings: installed && installed.warnings,
            })
          } catch (error) {
            try {
              await manager.installBundle(targetName + '@' + previousVersion, { enabled: true })
            } catch (restoreError) {
              /* the panel reports the failed upgrade; the backup remains available */
            }
            updatesCache = null
            sendJson(res, 500, {
              error: error && error.message ? error.message : String(error),
              restored: previousVersion,
            })
          }
        } catch (error) {
          sendJson(res, 500, { error: error && error.message ? error.message : String(error) })
        } finally {
          upgradeInFlight = false
        }
      },
    }))
  })
}
