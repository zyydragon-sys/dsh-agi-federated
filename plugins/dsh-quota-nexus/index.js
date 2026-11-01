/**
 * dsh-quota-nexus — Host half.
 *
 * 目标：一个不阻塞主循环的多供应商额度池。
 *   · 调度主路径只读内存，绝不做同步磁盘 I/O；
 *   · 活跃池 / 冷却池分离维护，租约即时返回；
 *   · 用量与健康度通过 Write-Behind 队列批量落盘；
 *   · 429 与 5xx 分开计数，按模型冷却，凭据熔断 30 分钟；
 *   · 解析响应头做前瞻限流 + 预冷 + 多级预警；
 *   · 只读状态工具 `quota_nexus_status` + 本地 REST/SSE 面板。
 *
 * 所有 DSH API 访问都走可选链与 try/catch，服务缺失时降级而不是崩溃。
 */

import { createHash, randomBytes } from 'node:crypto'
import { appendFile, chmod, mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { Config, STRATEGIES, normalizeConfig } from './schemas/config.js'

export { Config }

/** `tools` 是硬依赖（host-plugin.md 记载的 `export const inject = ['tools']` 形式）。 */
export const inject = ['tools']

const PLUGIN = 'dsh-quota-nexus'
const POOL_SUBDIR = 'dsh-quota-nexus'
const FALLBACK_DIR = '.dsh-quota-nexus'
const FILE = {
  providers: 'providers.json',
  state: 'state.json',
  alerts: 'alerts.json',
  ledger: 'usage-ledger.jsonl',
  oauth: 'oauth-pending.json',
}

/** 单调时钟：所有冷却/租约剩余时间都基于它，不受系统时间跳变影响。 */
const mono = () => performance.now()
const wallNow = () => Date.now()

const maskSecret = (secret) => {
  if (typeof secret !== 'string' || secret.length === 0) return ''
  if (secret.length <= 8) return `${secret.slice(0, 2)}****`
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`
}

const maskAccount = (provider) => {
  const tail = (provider?.id ?? provider?.accountId ?? '').slice(-6)
  return `${provider?.vendorId ?? 'provider'}#${tail}`
}

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex')

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const randomId = (prefix) => `${prefix}_${randomBytes(9).toString('base64url')}`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, clamp(ms, 0, 60_000)))

const timeoutSignal = (ms) =>
  typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(ms) : undefined

/** 指数退避 + 全抖动，避免集群同相位重试。 */
const backoff = (attempt, baseMs, capMs) => {
  const raw = baseMs * 2 ** clamp(attempt, 0, 16)
  const capped = Math.min(capMs, raw)
  return Math.round(capped / 2 + Math.random() * (capped / 2))
}

const parseDuration = (raw) => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw !== 'string') return undefined
  const text = raw.trim()
  if (!text) return undefined
  if (/^\d+(\.\d+)?$/.test(text)) return Number.parseFloat(text) * 1000
  const unit = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  const re = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/gi
  let total = 0
  let matched = false
  let match
  while ((match = re.exec(text)) !== null) {
    matched = true
    total += Number.parseFloat(match[1]) * (unit[match[2].toLowerCase()] ?? 0)
  }
  if (matched) return total
  const date = Date.parse(text)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined
}

const headerGet = (headers, name) => {
  if (!headers) return undefined
  try {
    if (typeof headers.get === 'function') {
      const value = headers.get(name)
      return value === null ? undefined : value
    }
  } catch {
    /* Headers 实现差异：回落到普通对象读取 */
  }
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) {
      const value = headers[key]
      return Array.isArray(value) ? value[0] : value
    }
  }
  return undefined
}

/**
 * 解析限流响应头。覆盖 OpenAI 兼容的 `x-ratelimit-*`、Anthropic 的
 * `anthropic-ratelimit-*` 以及 `retry-after`。任何一项缺失都只是“未知”，不是错误。
 */
const parseRateLimit = (headers) => {
  const remainingRequests =
    headerGet(headers, 'x-ratelimit-remaining-requests') ??
    headerGet(headers, 'anthropic-ratelimit-requests-remaining')
  const limitRequests =
    headerGet(headers, 'x-ratelimit-limit-requests') ?? headerGet(headers, 'anthropic-ratelimit-requests-limit')
  const remainingTokens =
    headerGet(headers, 'x-ratelimit-remaining-tokens') ??
    headerGet(headers, 'anthropic-ratelimit-tokens-remaining')
  const limitTokens =
    headerGet(headers, 'x-ratelimit-limit-tokens') ?? headerGet(headers, 'anthropic-ratelimit-tokens-limit')
  const resetRequests =
    headerGet(headers, 'x-ratelimit-reset-requests') ??
    headerGet(headers, 'anthropic-ratelimit-requests-reset') ??
    headerGet(headers, 'x-ratelimit-reset')
  const resetTokens =
    headerGet(headers, 'x-ratelimit-reset-tokens') ?? headerGet(headers, 'anthropic-ratelimit-tokens-reset')
  const retryAfter = headerGet(headers, 'retry-after')

  const numeric = (value) => {
    if (value === undefined || value === null) return undefined
    const n = Number.parseFloat(String(value))
    return Number.isFinite(n) ? n : undefined
  }

  const requestPart = { remaining: numeric(remainingRequests), limit: numeric(limitRequests) }
  const tokenPart = { remaining: numeric(remainingTokens), limit: numeric(limitTokens) }
  const resetMs = parseDuration(resetRequests) ?? parseDuration(resetTokens)

  return {
    requests: requestPart,
    tokens: tokenPart,
    resetMs,
    retryAfterMs: parseDuration(retryAfter),
    observed: requestPart.remaining !== undefined || tokenPart.remaining !== undefined,
  }
}

/** 探测响应里值得回传的额度头；只保留这些键，避免把整个响应头写进状态。 */
const QUOTA_HEADER_NAMES = [
  'x-ratelimit-remaining-requests',
  'x-ratelimit-limit-requests',
  'x-ratelimit-remaining-tokens',
  'x-ratelimit-limit-tokens',
  'x-ratelimit-reset-requests',
  'x-ratelimit-reset-tokens',
  'x-ratelimit-reset',
  'anthropic-ratelimit-requests-remaining',
  'anthropic-ratelimit-requests-limit',
  'anthropic-ratelimit-tokens-remaining',
  'anthropic-ratelimit-tokens-limit',
  'anthropic-ratelimit-requests-reset',
  'anthropic-ratelimit-tokens-reset',
  'retry-after',
]

const captureQuotaHeaders = (headers) => {
  const out = {}
  for (const name of QUOTA_HEADER_NAMES) {
    const value = headerGet(headers, name)
    if (value !== undefined && value !== null && value !== '') out[name] = String(value)
  }
  return out
}

/** 剩余比例（0..1）；无数据返回 undefined，绝不猜一个“看起来能用”的数字。 */
const remainingRatio = (part) => {
  if (!part || part.remaining === undefined || !part.limit) return undefined
  return clamp(part.remaining / part.limit, 0, 1)
}

const joinUrl = (base, path) => {
  const left = String(base ?? '').replace(/\/+$/, '')
  const right = String(path ?? '')
  if (!right) return left
  return right.startsWith('/') ? `${left}${right}` : `${left}/${right}`
}

const readJsonBody = async (req, limit = 1_048_576) => {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('request body too large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('invalid JSON body')
  }
}

const writeJson = (res, status, body) => {
  try {
    const payload = JSON.stringify(body)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    res.end(payload)
  } catch {
    try {
      res.destroy()
    } catch {
      /* 连接已断开 */
    }
  }
}

const isLoopback = (req) => {
  const address = req?.socket?.remoteAddress ?? ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

/**
 * 内置供应商目录。
 * 端点/模型为默认值，可在设置页逐个覆盖；上线前请以各厂商最新公开文档核对。
 * `kind` 决定鉴权头形状与请求体协议族，不决定业务逻辑。
 */
const VENDOR_CATALOG = Object.freeze({
  deepseek: {
    label: 'DeepSeek',
    kind: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyEnv: 'DEEPSEEK_API_KEY',
    // 官方余额接口：GET /user/balance（Bearer），响应 balance_infos[].total_balance。
    // 文档：https://api-docs.deepseek.com/api/get-user-balance/
    balance: { baseUrl: 'https://api.deepseek.com', path: '/user/balance' },
    // 官方模型目录：GET https://api.deepseek.com/models（实测 200，data[].id）。
    modelsUrl: 'https://api.deepseek.com/models',
    // 官方充值/用量入口（社区实践：公开的 dsh-deepseek-balance 插件 README 记为 top_up）。
    billing: {
      rechargeUrl: 'https://platform.deepseek.com/top_up',
      usageUrl: 'https://platform.deepseek.com/usage',
    },
  },
  openai: {
    label: 'OpenAI',
    kind: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
    keyEnv: 'OPENAI_API_KEY',
  },
  anthropic: {
    label: 'Anthropic',
    kind: 'anthropic-messages',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-5', 'claude-haiku-4-5'],
    keyEnv: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    label: 'Google Gemini',
    kind: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    keyEnv: 'GEMINI_API_KEY',
  },
  'minimax-cn': {
    label: 'MiniMax（国内）',
    kind: 'openai-compatible',
    baseUrl: 'https://api.minimaxi.com/v1',
    models: ['MiniMax-M2', 'abab6.5s-chat'],
    keyEnv: 'MINIMAX_API_KEY',
    // 控制台套餐/充值页（由操作者提供）。
    billing: { rechargeUrl: 'https://platform.minimax.cn/console/plan' },
  },
  'moonshot-cn': {
    label: 'Moonshot（国内）',
    kind: 'openai-compatible',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2-turbo-preview', 'moonshot-v1-8k'],
    keyEnv: 'MOONSHOT_API_KEY',
  },
  'zhipu-cn': {
    label: '智谱 GLM',
    kind: 'openai-compatible',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.6', 'glm-4-flash'],
    keyEnv: 'ZHIPU_API_KEY',
  },
  'qwen-cn': {
    label: '通义千问（兼容模式）',
    kind: 'openai-compatible',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen3-max', 'qwen-plus'],
    keyEnv: 'DASHSCOPE_API_KEY',
  },
  openrouter: {
    label: 'OpenRouter',
    kind: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4.1', 'anthropic/claude-sonnet-4.5', 'deepseek/deepseek-chat'],
    keyEnv: 'OPENROUTER_API_KEY',
  },
  ollama: {
    label: 'Ollama（本机）',
    kind: 'openai-compatible',
    baseUrl: 'http://127.0.0.1:11434/v1',
    models: ['llama3.3', 'qwen3'],
    keyEnv: 'OLLAMA_API_KEY',
  },
  custom: {
    label: '自定义 OpenAI 兼容服务',
    kind: 'openai-compatible',
    baseUrl: '',
    models: [],
    keyEnv: '',
  },
  /** 自定义 Anthropic Messages 协议端点：base_url 必填，鉴权为 x-api-key + anthropic-version。 */
  'custom-anthropic': {
    label: '自定义 Anthropic 协议服务（Messages）',
    kind: 'anthropic-messages',
    baseUrl: '',
    models: [],
    keyEnv: 'ANTHROPIC_BASE_URL',
  },
})

const vendorOf = (provider) => VENDOR_CATALOG[provider?.vendorId] ?? VENDOR_CATALOG.custom

/** 支持的协议族；provider 上可显式覆盖（同一家厂商的 OpenAI 端点与 Anthropic 端点并存）。 */
const PROTOCOL_KINDS = ['openai-compatible', 'anthropic-messages', 'gemini']

/**
 * 按 baseUrl 形状推断协议：内置厂商默认是 OpenAI 兼容，但如果用户把 baseUrl 指到
 * `/anthropic` 这类 Anthropic Messages 端点，鉴权头必须换成 x-api-key。
 */
const inferProtocol = (provider) => {
  const vendorKind = vendorOf(provider).kind
  const baseUrl = String(provider?.baseUrl ?? '')
  if (vendorKind === 'openai-compatible' && /\/anthropic(?:\/|$)/i.test(baseUrl)) return 'anthropic-messages'
  return vendorKind
}

const kindOf = (provider) =>
  PROTOCOL_KINDS.includes(provider?.protocol) ? provider.protocol : inferProtocol(provider)

const protocolSource = (provider) => (PROTOCOL_KINDS.includes(provider?.protocol) ? 'configured' : 'inferred')

const authHeaders = (provider) => {
  const secret = provider?.credential?.secret
  const kind = kindOf(provider)
  if (!secret) return {}
  if (kind === 'anthropic-messages') return { 'x-api-key': secret, 'anthropic-version': '2023-06-01' }
  if (kind === 'gemini') return { 'x-goog-api-key': secret }
  return { authorization: `Bearer ${secret}` }
}

const probeUrl = (provider) => {
  const vendor = vendorOf(provider)
  const kind = kindOf(provider)
  // 用户常把完整端点（…/v1/messages）贴进来：探测前退回到 API 根。
  const base = String(provider.baseUrl || vendor.baseUrl || '').replace(/\/messages\/?$/i, '')
  if (kind === 'gemini') return joinUrl(base, `/models?key=${encodeURIComponent(provider?.credential?.secret ?? '')}`)
  return joinUrl(base, '/models')
}

/** 该供应商是否必须由用户显式提供 baseUrl（目录里没有默认端点）。 */
const requiresBaseUrl = (vendorId) => !VENDOR_CATALOG[vendorId]?.baseUrl

/** 余额接口 URL：provider 可显式覆盖，否则用厂商目录里的官方余额端点。 */
const balanceUrlOf = (record) => {
  if (!record) return null
  if (typeof record.balanceUrl === 'string' && record.balanceUrl.trim()) return record.balanceUrl.trim()
  const vendor = vendorOf(record)
  const config = vendor.balance
  if (!config?.path) return null
  return joinUrl(config.baseUrl || record.balanceBaseUrl || vendor.baseUrl, config.path)
}

/** 模型目录 URL：provider 覆盖 → 厂商目录 → 按 baseUrl 推导（去掉 /messages 后拼 /models）。 */
const modelsUrlOf = (record) => {
  if (!record) return null
  if (typeof record.modelsUrl === 'string' && record.modelsUrl.trim()) return record.modelsUrl.trim()
  const vendor = vendorOf(record)
  if (typeof vendor.modelsUrl === 'string' && vendor.modelsUrl) return vendor.modelsUrl
  const base = String(record.baseUrl || vendor.baseUrl || '').replace(/\/messages\/?$/i, '').replace(/\/+$/, '')
  return base ? `${base}/models` : null
}

/** 解析模型目录：兼容 OpenAI / Anthropic 的 data[].id 与 Gemini 的 models[].name。 */
const parseModelList = (payload) => {
  if (!payload || typeof payload !== 'object') return []
  const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.models) ? payload.models : []
  const out = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const id = typeof row.id === 'string' ? row.id : typeof row.name === 'string' ? row.name.replace(/^models\//, '') : ''
    if (!id) continue
    out.push({
      id,
      name: typeof row.display_name === 'string' ? row.display_name : typeof row.name === 'string' ? row.name : null,
      contextWindow: Number.isFinite(Number(row.context_window)) ? Number(row.context_window) : null,
      maxOutput: Number.isFinite(Number(row.max_output_tokens)) ? Number(row.max_output_tokens) : null,
      createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    })
  }
  return out
}

/** 套餐描述归一化：只接受已知字段，未知键丢弃。 */
const PLAN_KINDS = ['payg', 'subscription']
const sanitizePlan = (input) => {
  if (!input || typeof input !== 'object') return null
  const kind = PLAN_KINDS.includes(input.kind) ? input.kind : null
  if (!kind) return null
  const limit = Number.isFinite(Number(input.limit)) && Number(input.limit) > 0 ? Number(input.limit) : null
  const unit = input.unit === 'tokens' ? 'tokens' : 'requests'
  const periodMs =
    Number.isFinite(Number(input.periodMs)) && Number(input.periodMs) >= 60_000 ? Number(input.periodMs) : null
  const anchorAt = Number.isFinite(Number(input.anchorAt)) ? Number(input.anchorAt) : null
  return { kind, limit, unit, periodMs, anchorAt }
}

/** 套餐视图：订阅用「声明限额 + 本地周期用量」算剩余与重置倒计时；按量只展示类型。 */
const planViewOf = (record, rt) => {
  const plan = record?.plan
  if (!plan?.kind) return null
  const now = wallNow()
  const periodMs = Number(plan.periodMs) || null
  const anchorAt = Number(plan.anchorAt) || null
  let resetsInMs = 0
  if (plan.kind === 'subscription' && periodMs && anchorAt) {
    const elapsed = Math.max(0, now - anchorAt)
    resetsInMs = periodMs - (elapsed % periodMs)
  }
  const used = rt?.usage
    ? plan.unit === 'tokens'
      ? rt.usage.tokens
      : rt.usage.requests
    : null
  const limit = Number(plan.limit) || null
  return {
    kind: plan.kind,
    unit: plan.unit ?? 'requests',
    limit,
    used,
    remaining: limit !== null && used !== null ? Math.max(0, limit - used) : null,
    periodMs,
    resetsInMs,
    resetsAt: resetsInMs > 0 ? new Date(now + resetsInMs).toISOString() : null,
    source: limit !== null ? 'declared-plan + local-usage' : 'declared-plan',
  }
}

/** 充值入口：provider 可覆盖，否则用厂商目录里的官方入口；没有就返回 null。 */
const rechargeUrlOf = (record) => {
  if (!record) return null
  const direct = record.rechargeUrl ?? vendorOf(record).billing?.rechargeUrl
  return typeof direct === 'string' && direct.trim() ? direct.trim() : null
}

const usageUrlOf = (record) => {
  if (!record) return null
  const direct = record.usageUrl ?? vendorOf(record).billing?.usageUrl
  return typeof direct === 'string' && direct.trim() ? direct.trim() : null
}

/** 解析余额响应：优先 DeepSeek 的 balance_infos[]，其次常见的扁平字段。 */
const parseBalance = (payload) => {
  if (!payload || typeof payload !== 'object') return null
  const toNumber = (value) => {
    const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
    return Number.isFinite(n) ? n : undefined
  }
  const infos = Array.isArray(payload.balance_infos) ? payload.balance_infos : null
  if (infos && infos.length) {
    const info = infos.find((entry) => entry && toNumber(entry.total_balance) !== undefined) ?? infos[0]
    const amount = toNumber(info?.total_balance)
    if (amount === undefined) return null
    return {
      amount,
      currency: typeof info?.currency === 'string' ? info.currency : null,
      granted: toNumber(info?.granted_balance) ?? null,
      toppedUp: toNumber(info?.topped_up_balance) ?? null,
      available: payload.is_available === true,
      field: 'balance_infos.total_balance',
    }
  }
  const candidates = [
    ['balance', payload.balance],
    ['total_balance', payload.total_balance],
    ['data.balance', payload?.data?.balance],
    ['data.total_balance', payload?.data?.total_balance],
  ]
  for (const [field, value] of candidates) {
    const amount = toNumber(value)
    if (amount !== undefined) {
      return { amount, currency: null, granted: null, toppedUp: null, available: true, field }
    }
  }
  return null
}

/* ------------------------------------------------------------------ *
 * 原子持久化
 * ------------------------------------------------------------------ */

class AtomicPool {
  constructor(root, warnings) {
    this.root = root
    this.warnings = warnings
    this.dir = join(root, POOL_SUBDIR)
    this.degraded = false
    this.ready = false
  }

  warn(code, message) {
    this.warnings.push({ code, message, at: new Date().toISOString() })
    if (this.warnings.length > 64) this.warnings.splice(0, this.warnings.length - 64)
  }

  path(name) {
    return join(this.dir, name)
  }

  async probeDir(dir) {
    const file = join(dir, `.probe-${process.pid}-${Date.now().toString(36)}`)
    const handle = await open(file, 'w', 0o600)
    try {
      await handle.writeFile('ok', 'utf8')
    } finally {
      await handle.close()
    }
    await chmod(file, 0o600).catch(() => {})
    await rm(file, { force: true }).catch(() => {})
  }

  async ensure() {
    const candidates = [join(this.root, POOL_SUBDIR), join(homedir(), FALLBACK_DIR)]
    let lastError
    for (let index = 0; index < candidates.length; index += 1) {
      const dir = candidates[index]
      try {
        await mkdir(dir, { recursive: true, mode: 0o700 })
        await this.probeDir(dir)
        this.dir = dir
        this.degraded = index > 0
        if (this.degraded) {
          this.warn(
            'persistence_fallback',
            `持久化目录 ${candidates[0]} 不可写（${lastError?.code ?? 'unknown'}），已降级到 ${dir}`,
          )
        }
        this.ready = true
        return dir
      } catch (error) {
        lastError = error
      }
    }
    this.warn('persistence_unavailable', `无法创建持久化目录：${lastError?.message ?? 'unknown'}`)
    this.ready = false
    return this.dir
  }

  async readJson(name, fallback) {
    if (!this.ready) return fallback
    let text
    try {
      text = await readFile(this.path(name), 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') this.warn('persistence_read_failed', `${name}: ${error?.message ?? error}`)
      return fallback
    }
    try {
      const parsed = JSON.parse(text)
      return parsed ?? fallback
    } catch (error) {
      // 损坏的 JSON 永不覆盖既有状态：先隔离副本，再返回默认值。
      const quarantine = this.path(`${name}.corrupt-${Date.now().toString(36)}`)
      try {
        await rename(this.path(name), quarantine)
        await chmod(quarantine, 0o600).catch(() => {})
        this.warn('state_quarantined', `${name} 解析失败，已隔离到 ${quarantine}（${error?.message ?? error}）`)
      } catch (renameError) {
        this.warn('state_quarantine_failed', `${name}: ${renameError?.message ?? renameError}`)
      }
      return fallback
    }
  }

  async writeJson(name, value, mode = 0o600) {
    if (!this.ready) return false
    const target = this.path(name)
    const temp = `${target}.tmp-${randomBytes(6).toString('hex')}`
    let handle
    try {
      handle = await open(temp, 'w', mode)
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8')
      if (typeof handle.sync === 'function') await handle.sync()
      await handle.close()
      handle = undefined
      await chmod(temp, mode).catch(() => {})
      await rename(temp, target)
      await chmod(target, mode).catch(() => {})
      return true
    } catch (error) {
      this.warn('persistence_write_failed', `${name}: ${error?.message ?? error}`)
      if (handle) await handle.close().catch(() => {})
      await rm(temp, { force: true }).catch(() => {})
      return false
    }
  }

  async appendLines(name, lines) {
    if (!this.ready || !lines.length) return false
    try {
      const payload = `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`
      await appendFile(this.path(name), payload, { encoding: 'utf8', mode: 0o600 })
      return true
    } catch (error) {
      this.warn('ledger_append_failed', `${name}: ${error?.message ?? error}`)
      return false
    }
  }
}

/* ------------------------------------------------------------------ *
 * Write-Behind 落盘队列
 * ------------------------------------------------------------------ */

class WriteBehind {
  constructor({ sink, flushMs, batch, maxQueue, onDrop }) {
    this.sink = sink
    this.flushMs = flushMs
    this.batch = batch
    this.maxQueue = maxQueue
    this.onDrop = onDrop
    this.queue = []
    this.timer = null
    this.flushing = false
    this.flushed = 0
    this.dropped = 0
    this.stopped = false
  }

  push(record) {
    if (this.stopped) return false
    if (this.queue.length >= this.maxQueue) {
      this.dropped += 1
      this.onDrop?.(record)
      return false
    }
    this.queue.push(record)
    this.schedule()
    return true
  }

  schedule() {
    if (this.timer || this.flushing || this.stopped) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, this.flushMs)
    this.timer.unref?.()
  }

  async flush() {
    if (this.flushing || this.stopped) return
    this.flushing = true
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batch)
        try {
          await this.sink(batch)
          this.flushed += batch.length
        } catch {
          this.dropped += batch.length
        }
      }
    } finally {
      this.flushing = false
      if (this.queue.length > 0) this.schedule()
    }
  }

  snapshot() {
    return { queued: this.queue.length, flushed: this.flushed, dropped: this.dropped }
  }

  async stop() {
    this.stopped = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    await this.flush().catch(() => {})
  }
}

/* ------------------------------------------------------------------ *
 * 最小堆：balanced 策略按 lastUsed 取最久未使用者，peek O(1)
 * ------------------------------------------------------------------ */

class MinHeap {
  constructor() {
    this.items = []
  }

  get size() {
    return this.items.length
  }

  push(entry) {
    const items = this.items
    items.push(entry)
    let index = items.length - 1
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (items[parent].key <= items[index].key) break
      ;[items[parent], items[index]] = [items[index], items[parent]]
      index = parent
    }
  }

  peek() {
    return this.items[0]
  }

  pop() {
    const items = this.items
    if (items.length === 0) return undefined
    const top = items[0]
    const last = items.pop()
    if (items.length > 0) {
      items[0] = last
      let index = 0
      for (;;) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index
        if (left < items.length && items[left].key < items[smallest].key) smallest = left
        if (right < items.length && items[right].key < items[smallest].key) smallest = right
        if (smallest === index) break
        ;[items[index], items[smallest]] = [items[smallest], items[index]]
        index = smallest
      }
    }
    return top
  }
}

/* ------------------------------------------------------------------ *
 * 调度器
 * ------------------------------------------------------------------ */

class Scheduler {
  constructor(runtime) {
    this.runtime = runtime
    this.config = runtime.config
    this.accounts = new Map() // id -> runtime account（唯一真源，仅内存）
    this.active = new Map() // 活跃池
    this.cooling = new Map() // 冷却池（与活跃池隔离维护）
    this.ring = [] // round-robin 环形快照
    this.cursor = 0
    this.heap = new MinHeap() // balanced 索引
    this.sticky = new Map() // sessionKey -> {accountId, untilMono}
    this.leases = new Map() // leaseId -> lease
    this.waiters = new Set()
    this.stormHits = []
    this.stormUntilMono = 0
    this.seq = 0
  }

  now() {
    return mono()
  }

  strategy() {
    return this.config.strategy
  }

  rebuild() {
    this.ring = [...this.accounts.values()].filter((rt) => rt.record.enabled !== false)
    this.ring.sort((a, b) => {
      const pa = Number(a.record.priority ?? 100)
      const pb = Number(b.record.priority ?? 100)
      if (pa !== pb) return pa - pb
      return String(a.id).localeCompare(String(b.id))
    })
    this.heap = new MinHeap()
    for (const rt of this.ring) this.heap.push({ key: rt.lastUsedMono, id: rt.id })
    if (this.cursor >= this.ring.length) this.cursor = 0
    this.refreshSets()
  }

  add(account) {
    this.accounts.set(account.id, account)
    this.rebuild()
  }

  remove(id) {
    this.accounts.delete(id)
    this.active.delete(id)
    this.cooling.delete(id)
    for (const [key, value] of this.sticky) if (value.accountId === id) this.sticky.delete(key)
    this.rebuild()
  }

  /** 活跃池 / 冷却池迁移：O(1)，两侧互斥。 */
  refreshSets() {
    const now = this.now()
    for (const rt of this.accounts.values()) {
      const cooling = this.coolingReason(rt, undefined, now) !== null
      if (cooling) {
        this.active.delete(rt.id)
        this.cooling.set(rt.id, rt)
      } else {
        this.cooling.delete(rt.id)
        if (rt.record.enabled !== false) this.active.set(rt.id, rt)
        else this.active.delete(rt.id)
      }
    }
  }

  /** 该账号此刻不可用的原因；`null` 表示可用。纯内存判断，无 I/O。 */
  coolingReason(rt, model, now = this.now()) {
    if (!rt) return 'unknown'
    if (rt.record.enabled === false) return 'disabled'
    if (rt.needsRelogin) return 'needs_relogin'
    if (rt.cooldownUntilMono > now) return rt.cooldownKind === '429' ? 'cooldown_429' : 'cooldown_5xx'
    if (model) {
      const until = rt.modelCooldown.get(model)
      if (until && until > now) return 'model_cooldown'
    }
    if (rt.quotaLimitedUntilMono > now) return 'quota_exhausted'
    if (rt.credentialMissing) return 'credential_missing'
    if (this.stormUntilMono > now) return 'storm_brake'
    return null
  }

  eligible(rt, model) {
    return this.coolingReason(rt, model) === null
  }

  /** sticky：同会话固定账号，命中 O(1)。 */
  stickyFor(sessionKey) {
    if (!sessionKey) return undefined
    const binding = this.sticky.get(sessionKey)
    if (!binding) return undefined
    if (binding.untilMono <= this.now()) {
      this.sticky.delete(sessionKey)
      return undefined
    }
    return this.accounts.get(binding.accountId)
  }

  bindSticky(sessionKey, accountId) {
    if (!sessionKey) return
    this.sticky.set(sessionKey, { accountId, untilMono: this.now() + this.config.stickyTtlMs })
    if (this.sticky.size > 2_048) {
      const oldest = this.sticky.keys().next().value
      if (oldest !== undefined) this.sticky.delete(oldest)
    }
  }

  /** 按策略给出候选顺序（内存快照，无分配以外副作用）。 */
  candidates(token) {
    const strategy = token.strategy
    if (strategy === 'sticky') {
      const bound = this.stickyFor(token.sessionKey)
      if (bound && !token.tried.has(bound.id)) return [bound, ...this.ring.filter((rt) => rt.id !== bound.id)]
      return this.ring.slice()
    }
    if (strategy === 'priority') return this.ring.slice()
    if (strategy === 'round-robin') {
      if (this.ring.length === 0) return []
      const offset = this.cursor % this.ring.length
      return [...this.ring.slice(offset), ...this.ring.slice(0, offset)]
    }
    // balanced：按 lastUsed 升序（偏向闲置最久的号）
    const ordered = this.ring.slice().sort((a, b) => a.lastUsedMono - b.lastUsedMono)
    return ordered
  }

  issue(rt, token) {
    const leaseId = randomId('lse')
    const now = this.now()
    const lease = {
      leaseId,
      accountId: rt.id,
      providerId: rt.id,
      vendorId: rt.record.vendorId,
      label: rt.record.label,
      model: token.model,
      baseUrl: rt.record.baseUrl,
      kind: vendorOf(rt.record).kind,
      headers: authHeaders(rt.record),
      issuedAt: now,
      expiresAt: now + 60_000,
      attempt: token.attempts,
    }
    this.leases.set(leaseId, { rt, lease, token })
    rt.lastUsedMono = now
    rt.lastUsedWall = wallNow()
    rt.inflight += 1
    this.bindSticky(token.sessionKey, rt.id)
    if (token.strategy === 'round-robin') this.cursor = (this.cursor + 1) % Math.max(1, this.ring.length)
    return lease
  }

  /** 单次尝试：取下一个未试过且可用的账号；空池/全不可用返回结构化原因。 */
  take(token) {
    const candidates = this.candidates(token)
    for (const rt of candidates) {
      if (token.tried.has(rt.id)) continue
      if (token.attempts >= this.config.maxAttempts) {
        return {
          ok: false,
          code: 'quota_nexus_attempts_exhausted',
          message: `单次请求最多尝试 ${this.config.maxAttempts} 个账号`,
          excluded: token.excluded,
        }
      }
      const reason = this.coolingReason(rt, token.model)
      if (reason) {
        token.excluded.push({ account: maskAccount(rt.record), reason })
        continue
      }
      token.tried.add(rt.id)
      token.attempts += 1
      return { ok: true, lease: this.issue(rt, token) }
    }
    const code = this.accounts.size === 0 ? 'quota_nexus_empty' : 'quota_nexus_unavailable'
    return {
      ok: false,
      code,
      message:
        code === 'quota_nexus_empty'
          ? '额度池为空：请先在设置页添加模型提供商凭据'
          : '所有账号当前不可用，见 excluded 排除原因',
      excluded: token.excluded,
    }
  }

  queueWait(waitMs) {
    if (waitMs <= 0) {
      return Promise.resolve({
        ok: false,
        code: 'quota_nexus_backpressure',
        message: '满载且未允许排队，请退避后重试',
        retryAfterMs: 250,
      })
    }
    return new Promise((resolve) => {
      const waiter = { resolve, timer: null }
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter)
        resolve({
          ok: false,
          code: 'quota_nexus_backpressure',
          message: `等待 ${waitMs}ms 仍无可用账号，返回背压建议`,
          retryAfterMs: Math.max(250, waitMs),
        })
      }, waitMs)
      waiter.timer.unref?.()
      this.waiters.add(waiter)
    })
  }

  wakeWaiters() {
    if (this.waiters.size === 0) return
    for (const waiter of [...this.waiters]) {
      this.waiters.delete(waiter)
      if (waiter.timer) clearTimeout(waiter.timer)
      waiter.resolve({ ok: true, woke: true })
    }
  }

  async acquire({ model, sessionKey, strategy, waitMs } = {}) {
    await this.runtime.ready
    this.refreshSets()
    const token = {
      model: model ?? null,
      sessionKey: sessionKey ?? null,
      strategy: STRATEGIES.includes(strategy) ? strategy : this.config.strategy,
      tried: new Set(),
      excluded: [],
      attempts: 0,
    }
    const first = this.take(token)
    if (first.ok) return { ok: true, lease: first.lease, token }
    if (first.code === 'quota_nexus_empty') return first
    if (this.waiters.size >= 1_024) return first

    const wake = await this.queueWait(waitMs ?? this.config.queueWaitMs)
    if (!wake.ok) return { ...first, ...wake, excluded: first.excluded, code: wake.code }
    const retry = this.take(token)
    return retry.ok ? { ok: true, lease: retry.lease, token } : { ...retry, excluded: retry.excluded }
  }

  /** 失败重试：换下一个账号，最多 8 个。 */
  retry(token) {
    const next = this.take(token)
    return next.ok ? { ok: true, lease: next.lease, token } : next
  }

  release(leaseId) {
    const entry = this.leases.get(leaseId)
    if (!entry) return
    this.leases.delete(leaseId)
    entry.rt.inflight = Math.max(0, entry.rt.inflight - 1)
  }

  /** 429 / 5xx 分开计数、按模型冷却、凭据熔断、风暴刹车。 */
  penalize(rt, status, options = {}) {
    const now = this.now()
    const model = options.model
    rt.lastFailureWall = wallNow()
    rt.lastFailureStatus = status
    let cooldownMs = 0
    let kind = '5xx'

    if (status === 401 || status === 403) {
      rt.authStrikes += 1
      rt.lastAuthFailureWall = wallNow()
      if (rt.authStrikes >= this.config.credentialFuseThreshold) {
        rt.needsRelogin = true
        cooldownMs = this.config.credentialFuseCooldownMs
        kind = 'auth'
        this.runtime.alert('credential_fused', {
          level: 'error',
          title: `凭据熔断：${maskAccount(rt.record)}`,
          detail: `连续 ${rt.authStrikes} 次鉴权拒绝，已移出池并冷冻 ${Math.round(cooldownMs / 60_000)} 分钟；请重新登录或更换 API Key。`,
        })
      } else {
        cooldownMs = backoff(rt.authStrikes, 5_000, 60_000)
      }
    } else if (status === 429) {
      rt.failed429 += 1
      kind = '429'
      const base = options.retryAfterMs ?? this.config.cooldown429Ms
      cooldownMs = clamp(options.retryAfterMs ?? backoff(rt.failed429, base, this.config.cooldownCapMs), 1_000, this.config.cooldownCapMs)
    } else if (options.network) {
      rt.networkFailures += 1
      cooldownMs = backoff(rt.networkFailures, 2_000, 30_000)
    } else if (status >= 500 || status === 0) {
      rt.failed5xx += 1
      cooldownMs = backoff(rt.failed5xx, this.config.cooldown5xxMs, this.config.cooldownCapMs)
    }

    if (cooldownMs > 0) {
      rt.cooldownUntilMono = now + cooldownMs
      rt.cooldownMs = cooldownMs
      rt.cooldownKind = kind
      rt.cooldownUntilWall = wallNow() + cooldownMs
    }
    if (model && cooldownMs > 0) rt.modelCooldown.set(model, now + cooldownMs)

    this.stormHits.push(now)
    const windowStart = now - this.config.stormWindowMs
    while (this.stormHits.length > 0 && this.stormHits[0] < windowStart) this.stormHits.shift()
    if (this.stormHits.length >= this.config.stormThreshold && this.stormUntilMono <= now) {
      this.stormUntilMono = now + this.config.stormPauseMs
      this.runtime.alert('storm_brake', {
        level: 'warn',
        title: '风暴刹车已触发',
        detail: `${this.config.stormWindowMs}ms 内异常 ${this.stormHits.length} 次，暂停自动切换 ${Math.round(this.config.stormPauseMs / 1000)}s。`,
      })
    }

    this.refreshSets()
    this.runtime.publish('health', { account: maskAccount(rt.record), status, cooldownMs })
    this.runtime.recordHealth(rt)
    return { cooldownMs, kind, needsRelogin: rt.needsRelogin }
  }

  markHealthy(rt) {
    const now = this.now()
    rt.authStrikes = 0
    rt.failed429 = 0
    rt.failed5xx = 0
    rt.networkFailures = 0
    rt.needsRelogin = false
    rt.cooldownUntilMono = 0
    rt.cooldownMs = 0
    rt.cooldownKind = null
    rt.cooldownUntilWall = 0
    rt.modelCooldown.clear()
    rt.consecutiveSuccess += 1
    rt.lastSuccessWall = wallNow()
    rt.lastProbeWall = wallNow()
    rt.health = 'connected'
    this.stormHits = this.stormHits.filter((at) => at > now - this.config.stormWindowMs)
    this.refreshSets()
    this.runtime.recordHealth(rt)
    return { cooldownMs: 0, kind: 'ok' }
  }

  *snapshotAccounts() {
    for (const rt of this.accounts.values()) {
      const now = this.now()
      yield {
        account: maskAccount(rt.record),
        id: rt.id,
        vendorId: rt.record.vendorId,
        label: rt.record.label,
        baseUrl: rt.record.baseUrl,
        credential: rt.record.credential?.masked ?? '',
        enabled: rt.record.enabled !== false,
        health: rt.health,
        needsRelogin: rt.needsRelogin,
        source: rt.record.source,
        state: this.active.has(rt.id) ? 'active' : this.cooling.has(rt.id) ? 'cooldown' : 'idle',
        cooldownMs: Math.max(0, Math.round(rt.cooldownUntilMono - now)),
        cooldownKind: rt.cooldownKind,
        modelCooldowns: [...rt.modelCooldown.entries()]
          .filter(([, until]) => until > now)
          .map(([model, until]) => ({ model, remainingMs: Math.round(until - now) })),
        quota: {
          remainingRequests: rt.quota.remainingRequests ?? null,
          limitRequests: rt.quota.limitRequests ?? null,
          remainingTokens: rt.quota.remainingTokens ?? null,
          limitTokens: rt.quota.limitTokens ?? null,
          remainingRatio: rt.quota.ratio ?? null,
          observedAt: rt.quota.observedAt ?? null,
        },
        balance: rt.balance ?? null,
        counters: {
          failed429: rt.failed429,
          failed5xx: rt.failed5xx,
          networkFailures: rt.networkFailures,
          authStrikes: rt.authStrikes,
          consecutiveSuccess: rt.consecutiveSuccess,
        },
        lastUsed: rt.lastUsedWall ? new Date(rt.lastUsedWall).toISOString() : null,
      }
    }
  }

  counts() {
    const now = this.now()
    let needsRelogin = 0
    let disabled = 0
    for (const rt of this.accounts.values()) {
      if (rt.needsRelogin) needsRelogin += 1
      if (rt.record.enabled === false) disabled += 1
    }
    return {
      providers: this.accounts.size,
      active: this.active.size,
      cooling: this.cooling.size,
      needsRelogin,
      disabled,
      leases: this.leases.size,
      stormPausedMs: Math.max(0, Math.round(this.stormUntilMono - now)),
    }
  }
}

/* ------------------------------------------------------------------ *
 * 运行时
 * ------------------------------------------------------------------ */

class QuotaNexusRuntime {
  constructor(ctx, config) {
    this.ctx = ctx
    this.config = config
    this.warnings = []
    this.listeners = new Set()
    this.providers = new Map() // id -> provider record
    this.pool = new AtomicPool(config.persistenceRoot, this.warnings)
    this.scheduler = new Scheduler(this)
    this.pendingOAuth = new Map()
    this.discovered = []
    this.alertDedupe = new Map()
    this.inbox = []
    this.lastPublishWall = 0
    this.ready = this.init()
    this.ledger = new WriteBehind({
      flushMs: config.ledgerFlushMs,
      batch: config.ledgerBatch,
      maxQueue: config.ledgerMaxQueue,
      sink: async (batch) => {
        await this.pool.appendLines(FILE.ledger, batch)
      },
      onDrop: () => this.warn('ledger_overflow', '账本队列已满，丢弃部分审计记录（调度主路径未阻塞）'),
    })
    this.stateWriter = null
    this.timers = []
  }

  warn(code, message) {
    this.warnings.push({ code, message, at: new Date().toISOString() })
    if (this.warnings.length > 64) this.warnings.splice(0, this.warnings.length - 64)
  }

  async init() {
    try {
      await this.pool.ensure()
      const providers = await this.pool.readJson(FILE.providers, { version: 1, providers: [] })
      for (const record of Array.isArray(providers?.providers) ? providers.providers : []) {
        if (record && typeof record.id === 'string') this.providers.set(record.id, record)
      }
      const state = await this.pool.readJson(FILE.state, { version: 1, accounts: {} })
      this.restoreState(state)
      this.rebuildAccounts()
      const alerts = await this.pool.readJson(FILE.alerts, { version: 1, delivered: {} })
      for (const key of Object.keys(alerts?.delivered ?? {})) this.alertDedupe.set(key, alerts.delivered[key])
      await this.restoreOAuth()
      this.publish('ready', { providers: this.providers.size })
    } catch (error) {
      this.warn('init_failed', `初始化失败：${error?.message ?? error}`)
    }
    return this
  }

  restoreState(state) {
    const accounts = state?.accounts && typeof state.accounts === 'object' ? state.accounts : {}
    for (const [id, saved] of Object.entries(accounts)) {
      const record = this.providers.get(id)
      if (!record || !saved || typeof saved !== 'object') continue
      const rt = this.makeAccount(record)
      rt.failed429 = Number(saved.failed429 ?? 0)
      rt.failed5xx = Number(saved.failed5xx ?? 0)
      rt.networkFailures = Number(saved.networkFailures ?? 0)
      rt.authStrikes = Number(saved.authStrikes ?? 0)
      rt.consecutiveSuccess = Number(saved.consecutiveSuccess ?? 0)
      rt.needsRelogin = Boolean(saved.needsRelogin)
      rt.lastUsedWall = Number(saved.lastUsedWall ?? 0)
      rt.lastUsedMono = mono() - clamp(wallNow() - (saved.lastUsedWall || wallNow()), 0, 86_400_000)
      rt.health = saved.health ?? 'unknown'
      rt.lastSuccessWall = Number(saved.lastSuccessWall ?? 0)
      rt.lastProbeWall = Number(saved.lastProbeWall ?? 0)
      rt.lastFailureStatus = Number(saved.lastFailureStatus ?? 0)
      if (saved.quota && typeof saved.quota === 'object') rt.quota = { ...rt.quota, ...saved.quota }
      if (saved.balance && typeof saved.balance === 'object') rt.balance = saved.balance
      const remaining = Number(saved.cooldownRemainingMs ?? 0)
      if (remaining > 0 && Number.isFinite(remaining)) {
        rt.cooldownUntilMono = mono() + remaining
        rt.cooldownUntilWall = wallNow() + remaining
        rt.cooldownMs = remaining
        rt.cooldownKind = saved.cooldownKind ?? '5xx'
      }
      this.scheduler.accounts.set(id, rt)
    }
  }

  makeAccount(record) {
    const secret = record?.credential?.secret
    return {
      id: record.id,
      record,
      failed429: 0,
      failed5xx: 0,
      networkFailures: 0,
      authStrikes: 0,
      consecutiveSuccess: 0,
      needsRelogin: false,
      credentialMissing: !secret,
      health: secret ? 'unknown' : 'unauthenticated',
      cooldownUntilMono: 0,
      cooldownUntilWall: 0,
      cooldownMs: 0,
      cooldownKind: null,
      modelCooldown: new Map(),
      quotaLimitedUntilMono: 0,
      lastUsedMono: 0,
      lastUsedWall: 0,
      lastSuccessWall: 0,
      lastProbeWall: 0,
      lastProbeStatus: null,
      lastProbeHttp: 0,
      lastFailureWall: 0,
      lastFailureStatus: 0,
      lastAuthFailureWall: 0,
      inflight: 0,
      balance: null,
      balanceInFlight: false,
      balanceLastAt: 0,
      usage: { requests: 0, tokens: 0, sinceWall: wallNow(), resetsAtWall: 0 },
      quota: {
        remainingRequests: null,
        limitRequests: null,
        remainingTokens: null,
        limitTokens: null,
        ratio: null,
        observedAt: null,
        source: 'none',
      },
    }
  }

  rebuildAccounts() {
    const seen = new Set()
    for (const record of this.providers.values()) {
      seen.add(record.id)
      const existing = this.scheduler.accounts.get(record.id)
      if (existing) {
        existing.record = record
        existing.credentialMissing = !record?.credential?.secret
        continue
      }
      this.scheduler.accounts.set(record.id, this.makeAccount(record))
    }
    for (const id of [...this.scheduler.accounts.keys()]) if (!seen.has(id)) this.scheduler.accounts.delete(id)
    this.scheduler.rebuild()
  }

  accountOf(id) {
    return this.scheduler.accounts.get(id)
  }

  /* ---------------- 事件总线（SSE / UI） ---------------- */

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  publish(type, payload = {}) {
    const now = wallNow()
    if (now - this.lastPublishWall < 40 && type !== 'alert') return
    this.lastPublishWall = now
    const frame = { type, at: new Date(now).toISOString(), payload }
    for (const listener of this.listeners) {
      try {
        listener(frame)
      } catch {
        /* 单个订阅者异常不影响调度 */
      }
    }
  }

  /* ---------------- 额度与预警 ---------------- */

  ingestHeaders(rt, headers, meta = {}) {
    const parsed = parseRateLimit(headers)
    const now = mono()
    const quota = rt.quota
    if (parsed.requests.remaining !== undefined) quota.remainingRequests = parsed.requests.remaining
    if (parsed.requests.limit !== undefined) quota.limitRequests = parsed.requests.limit
    if (parsed.tokens.remaining !== undefined) quota.remainingTokens = parsed.tokens.remaining
    if (parsed.tokens.limit !== undefined) quota.limitTokens = parsed.tokens.limit
    if (parsed.observed) {
      quota.observedAt = new Date().toISOString()
      quota.source = meta.source ?? 'response'
      const requestRatio = remainingRatio(parsed.requests)
      const tokenRatio = remainingRatio(parsed.tokens)
      quota.ratio =
        requestRatio !== undefined && tokenRatio !== undefined
          ? Math.min(requestRatio, tokenRatio)
          : requestRatio ?? tokenRatio ?? quota.ratio
    }
    // 官方给的窗口重置时间：用于「套餐/额度重置倒计时」展示。
    if (parsed.resetMs !== undefined && parsed.resetMs > 0) {
      rt.usage.resetsAtWall = wallNow() + Math.round(parsed.resetMs)
    }

    if (parsed.retryAfterMs !== undefined && parsed.retryAfterMs > 0) {
      rt.cooldownUntilMono = Math.max(rt.cooldownUntilMono, now + parsed.retryAfterMs)
      rt.cooldownMs = Math.max(rt.cooldownMs, parsed.retryAfterMs)
      rt.cooldownUntilWall = wallNow() + Math.round(rt.cooldownUntilMono - now)
      rt.cooldownKind = rt.cooldownKind ?? '429'
      this.publish('quota', { account: maskAccount(rt.record), preCool: parsed.retryAfterMs })
    }

    if (quota.ratio !== undefined && quota.ratio !== null) {
      const consumed = 1 - quota.ratio
      if (quota.ratio <= this.config.hardFloorRatio) {
        rt.quotaLimitedUntilMono = now + (parsed.resetMs ?? 60_000)
        this.alert(`quota_floor:${rt.id}`, {
          level: 'error',
          title: `额度触底：${maskAccount(rt.record)}`,
          detail: `剩余 ${(quota.ratio * 100).toFixed(1)}%，已自动跳过该账号直到重置。`,
        })
      } else if (consumed >= this.config.softSwitchRatio) {
        rt.quotaLimitedUntilMono = now + (parsed.resetMs ?? 60_000)
        this.alert(`quota_soft:${rt.id}`, {
          level: 'warn',
          title: `额度软阈值：${maskAccount(rt.record)}`,
          detail: `已消耗 ${(consumed * 100).toFixed(1)}%（阈值 ${(this.config.softSwitchRatio * 100).toFixed(0)}%），提前切换以防触发风控。`,
        })
      }
      for (const threshold of this.config.alertThresholds) {
        if (consumed >= threshold) {
          this.alert(`quota:${rt.id}:${threshold}`, {
            level: threshold >= 0.95 ? 'error' : 'warn',
            title: `额度预警 ${(threshold * 100).toFixed(0)}%：${maskAccount(rt.record)}`,
            detail: `当前消耗 ${(consumed * 100).toFixed(1)}%，剩余 ${(quota.ratio * 100).toFixed(1)}%。`,
          })
        }
      }
      if (this.config.alertBalanceFloor > 0 && quota.remainingRequests !== null) {
        if (quota.remainingRequests <= this.config.alertBalanceFloor) {
          this.alert(`balance:${rt.id}`, {
            level: 'error',
            title: `余额低于阈值：${maskAccount(rt.record)}`,
            detail: `剩余请求额度 ${quota.remainingRequests} ≤ 阈值 ${this.config.alertBalanceFloor}。`,
          })
        }
      }
    }

    this.scheduler.refreshSets()
    this.publish('quota', { account: maskAccount(rt.record), quota: { ...quota } })
    this.recordHealth(rt)
    return { ...quota }
  }

  /** 站内信 + Webhook，防抖去重。 */
  alert(key, { level = 'warn', title = '', detail = '' } = {}) {
    const now = wallNow()
    const last = this.alertDedupe.get(key) ?? 0
    if (now - last < this.config.alertDedupeMs) return false
    this.alertDedupe.set(key, now)
    const entry = { id: randomId('alt'), key, level, title, detail, at: new Date(now).toISOString(), read: false }
    if (this.config.alertInbox) {
      this.inbox.unshift(entry)
      if (this.inbox.length > 200) this.inbox.length = 200
    }
    this.persistAlerts()
    this.publish('alert', { level, title, detail })
    for (const url of this.config.alertWebhookUrls) {
      void this.postWebhook(url, entry)
    }
    return true
  }

  async postWebhook(url, entry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: PLUGIN, ...entry }),
        signal: timeoutSignal(this.config.probeTimeoutMs),
      })
      if (!response.ok) this.warn('webhook_status', `Webhook ${url} 返回 ${response.status}`)
    } catch (error) {
      this.warn('webhook_failed', `Webhook ${url} 推送失败：${error?.message ?? error}`)
    }
  }

  persistAlerts() {
    const delivered = Object.fromEntries(this.alertDedupe)
    void this.pool.writeJson(FILE.alerts, { version: 1, delivered, inbox: this.inbox.slice(0, 50) })
  }

  recordHealth(rt) {
    if (!this.stateWriter) {
      this.stateWriter = new WriteBehind({
        flushMs: this.config.ledgerFlushMs,
        batch: 4,
        maxQueue: 256,
        sink: async () => {
          await this.persistState()
        },
        onDrop: () => {},
      })
    }
    this.stateWriter.push({ at: wallNow(), id: rt.id })
  }

  async persistState() {
    const accounts = {}
    for (const rt of this.scheduler.accounts.values()) {
      accounts[rt.id] = {
        failed429: rt.failed429,
        failed5xx: rt.failed5xx,
        networkFailures: rt.networkFailures,
        authStrikes: rt.authStrikes,
        consecutiveSuccess: rt.consecutiveSuccess,
        needsRelogin: rt.needsRelogin,
        health: rt.health,
        lastUsedWall: rt.lastUsedWall,
        lastSuccessWall: rt.lastSuccessWall,
        lastProbeWall: rt.lastProbeWall,
        lastFailureStatus: rt.lastFailureStatus,
        quota: rt.quota,
        balance: rt.balance,
        cooldownRemainingMs: Math.max(0, Math.round(rt.cooldownUntilMono - mono())),
        cooldownKind: rt.cooldownKind,
      }
    }
    await this.pool.writeJson(FILE.state, { version: 1, savedAt: new Date().toISOString(), accounts })
  }

  /* ---------------- 供应商 CRUD ---------------- */

  serializeProviders() {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      providers: [...this.providers.values()],
    }
  }

  async saveProviders() {
    const ok = await this.pool.writeJson(FILE.providers, this.serializeProviders(), 0o600)
    if (!ok) this.warn('providers_save_failed', '供应商凭据写入失败，内存状态仍然有效（下次重试）')
    return ok
  }

  providerView(record) {
    const rt = this.scheduler.accounts.get(record.id)
    return {
      id: record.id,
      vendorId: record.vendorId,
      label: record.label,
      kind: kindOf(record),
      protocol: kindOf(record),
      protocolSource: protocolSource(record),
      baseUrl: record.baseUrl,
      models: Array.isArray(record.models) ? record.models : [],
      enabled: record.enabled !== false,
      priority: Number(record.priority ?? 100),
      source: record.source ?? 'manual',
      credential: {
        type: record.credential?.type ?? 'none',
        masked: record.credential?.masked ?? '',
      },
      status: this.statusOf(record, rt),
      health: rt?.health ?? 'unknown',
      cooldownMs: rt ? Math.max(0, Math.round(rt.cooldownUntilMono - mono())) : 0,
      needsRelogin: Boolean(rt?.needsRelogin),
      quotaRatio: rt?.quota?.ratio ?? null,
      quotaObservedAt: rt?.quota?.observedAt ?? null,
      balance: rt?.balance ?? null,
      balanceUrl: balanceUrlOf(record),
      rechargeUrl: rechargeUrlOf(record),
      usageUrl: usageUrlOf(record),
      modelsUrl: modelsUrlOf(record),
      modelsSyncedAt: record.modelsSyncedAt ?? null,
      modelsCount: Array.isArray(record.models) ? record.models.length : 0,
      modelsPreview: (Array.isArray(record.models) ? record.models : []).slice(0, 5),
      modelMeta: record.modelMeta ?? null,
      plan: planViewOf(record, rt),
      usage: rt?.usage
        ? {
            requests: rt.usage.requests,
            tokens: rt.usage.tokens,
            since: new Date(rt.usage.sinceWall).toISOString(),
            resetsInMs: Math.max(0, Math.round((rt.usage.resetsAtWall || 0) - wallNow())),
          }
        : null,
      lastProbeAt: rt?.lastProbeWall ? new Date(rt.lastProbeWall).toISOString() : null,
      lastProbeStatus: rt?.lastProbeStatus ?? null,
      lastProbeHttp: rt?.lastProbeHttp ?? 0,
      createdAt: record.createdAt ?? null,
    }
  }

  statusOf(record, rt) {
    if (record.enabled === false) return 'disabled'
    if (!record.credential?.secret) return 'unconfigured'
    if (!rt) return 'unknown'
    if (rt.needsRelogin) return 'needs_relogin'
    if (rt.cooldownUntilMono > mono()) return rt.cooldownKind === '429' ? 'rate_limited' : 'cooldown'
    if (rt.quotaLimitedUntilMono > mono()) return 'quota_low'
    if (rt.health === 'connected') return 'connected'
    if (rt.health === 'error' || rt.health === 'unreachable') return 'error'
    return rt.health === 'unauthenticated' ? 'unavailable' : 'unknown'
  }

  async addProvider(input) {
    const vendorId = String(input?.vendorId ?? '').trim()
    if (!vendorId || !VENDOR_CATALOG[vendorId]) {
      return { ok: false, code: 'quota_nexus_unknown_vendor', message: `未知供应商：${vendorId || '(empty)'}` }
    }
    const vendor = VENDOR_CATALOG[vendorId]
    const secret = typeof input?.apiKey === 'string' ? input.apiKey.trim() : ''
    const baseUrl = String(input?.baseUrl || vendor.baseUrl || '').trim()
    if (requiresBaseUrl(vendorId) && !baseUrl) {
      return {
        ok: false,
        code: 'quota_nexus_base_url_required',
        message: `供应商 ${vendor.label} 没有内置端点，必须提供 baseUrl（例如 https://api.anthropic.com/v1）`,
      }
    }
    if (!secret && !input?.allowEmpty) {
      return { ok: false, code: 'quota_nexus_credential_required', message: '缺少 API Key' }
    }
    const fingerprint = secret ? sha256(`${vendorId}:${secret}`).slice(0, 32) : ''
    if (fingerprint) {
      for (const record of this.providers.values()) {
        if (record.fingerprint === fingerprint) {
          return {
            ok: false,
            code: 'quota_nexus_duplicate_credential',
            message: `该凭据已存在于 ${record.label}（${record.credential?.masked ?? ''}），未重复导入`,
          }
        }
      }
    }

    const record = {
      id: randomId('prv'),
      vendorId,
      label: String(input?.label || vendor.label),
      baseUrl,
      models: Array.isArray(input?.models) && input.models.length ? input.models.map(String) : [...vendor.models],
      priority: Number.isFinite(Number(input?.priority)) ? Number(input.priority) : 100,
      enabled: input?.enabled !== false,
      source: input?.source ?? 'manual',
      createdAt: new Date().toISOString(),
      fingerprint,
      ...(PROTOCOL_KINDS.includes(input?.protocol) ? { protocol: input.protocol } : {}),
      ...(typeof input?.balanceUrl === 'string' && input.balanceUrl.trim()
        ? { balanceUrl: input.balanceUrl.trim() }
        : {}),
      ...(typeof input?.rechargeUrl === 'string' && input.rechargeUrl.trim()
        ? { rechargeUrl: input.rechargeUrl.trim() }
        : {}),
      ...(sanitizePlan(input?.plan) ? { plan: sanitizePlan(input.plan) } : {}),
      credential: secret
        ? { type: input?.credentialType === 'oauth' ? 'oauth' : 'api-key', secret, masked: maskSecret(secret) }
        : { type: 'none', secret: '', masked: '' },
    }

    if (input?.validate !== false && secret) {
      const probe = await this.probeRecord(record)
      if (!probe.ok && input?.force !== true) {
        return {
          ok: false,
          code: 'quota_nexus_credential_rejected',
          status: probe.status,
          httpStatus: probe.httpStatus,
          message: probe.message,
        }
      }
    }

    this.providers.set(record.id, record)
    this.rebuildAccounts()
    await this.saveProviders()
    // 新增后立即拉一次官方余额（失败只记 warning，不影响状态）。
    const account = this.scheduler.accounts.get(record.id)
    if (account) void this.fetchBalance(account)
    this.publish('providers', { action: 'add', id: record.id })
    return { ok: true, provider: this.providerView(record) }
  }

  async updateProvider(id, patch) {
    const record = this.providers.get(id)
    if (!record) return { ok: false, code: 'quota_nexus_not_found', message: `未找到供应商 ${id}` }
    const next = { ...record }
    if (typeof patch?.label === 'string' && patch.label.trim()) next.label = patch.label.trim()
    if (typeof patch?.baseUrl === 'string' && patch.baseUrl.trim()) next.baseUrl = patch.baseUrl.trim()
    if (Array.isArray(patch?.models)) next.models = patch.models.map(String)
    if (patch?.priority !== undefined && Number.isFinite(Number(patch.priority))) next.priority = Number(patch.priority)
    if (typeof patch?.enabled === 'boolean') next.enabled = patch.enabled
    if (PROTOCOL_KINDS.includes(patch?.protocol)) next.protocol = patch.protocol
    if (patch?.protocol === null || patch?.protocol === '') delete next.protocol
    if (typeof patch?.balanceUrl === 'string') {
      if (patch.balanceUrl.trim()) next.balanceUrl = patch.balanceUrl.trim()
      else delete next.balanceUrl
    }
    if (typeof patch?.rechargeUrl === 'string') {
      if (patch.rechargeUrl.trim()) next.rechargeUrl = patch.rechargeUrl.trim()
      else delete next.rechargeUrl
    }
    if (patch?.plan && typeof patch.plan === 'object') {
      const plan = sanitizePlan({ ...patch.plan, anchorAt: patch.plan.anchorAt ?? Date.now() })
      if (plan && plan.kind === 'subscription' && !plan.anchorAt) plan.anchorAt = Date.now()
      if (plan) next.plan = plan
    } else if (patch?.plan === null || patch?.plan === '') {
      delete next.plan
    }
    if (typeof patch?.apiKey === 'string' && patch.apiKey.trim()) {
      const secret = patch.apiKey.trim()
      next.credential = { type: record.credential?.type ?? 'api-key', secret, masked: maskSecret(secret) }
      next.fingerprint = sha256(`${next.vendorId}:${secret}`).slice(0, 32)
    }
    this.providers.set(id, next)
    const rt = this.scheduler.accounts.get(id)
    if (rt) {
      rt.record = next
      rt.credentialMissing = !next.credential?.secret
      rt.needsRelogin = false
      rt.authStrikes = 0
    }
    this.rebuildAccounts()
    await this.saveProviders()
    const updated = this.scheduler.accounts.get(id)
    if (updated) void this.fetchBalance(updated)
    this.publish('providers', { action: 'update', id })
    return { ok: true, provider: this.providerView(next) }
  }

  async removeProvider(id) {
    const record = this.providers.get(id)
    if (!record) return { ok: false, code: 'quota_nexus_not_found', message: `未找到供应商 ${id}` }
    this.providers.delete(id)
    this.scheduler.remove(id)
    await this.saveProviders()
    this.publish('providers', { action: 'remove', id })
    return { ok: true, removed: maskAccount(record) }
  }

  /* ---------------- 连通性校验与探活 ---------------- */

  async probeRecord(record) {
    const vendor = vendorOf(record)
    const url = probeUrl(record)
    const started = mono()
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json', ...authHeaders(record) },
        signal: timeoutSignal(this.config.probeTimeoutMs),
      })
      const latencyMs = Math.round(mono() - started)
      const headers = captureQuotaHeaders(response.headers)
      if (response.ok) {
        return { ok: true, status: 'connected', httpStatus: response.status, latencyMs, headers }
      }
      // 中转/自建端点常常没有 /models：404/405 说明端点可达，只是没有探测接口。
      if (response.status === 404 || response.status === 405) {
        return {
          ok: true,
          status: 'reachable',
          httpStatus: response.status,
          latencyMs,
          headers,
          message: `${vendor.label} 可达，但未提供 /models 探测接口（HTTP ${response.status}）`,
        }
      }
      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? 'unauthenticated' : 'error',
        httpStatus: response.status,
        latencyMs,
        headers,
        message: `${vendor.label} 校验失败：HTTP ${response.status}`,
      }
    } catch (error) {
      return {
        ok: false,
        status: 'unreachable',
        httpStatus: 0,
        latencyMs: Math.round(mono() - started),
        message: `${vendor.label} 不可达：${error?.message ?? error}`,
      }
    }
  }

  async probe(id) {
    await this.ready
    const rt = this.scheduler.accounts.get(id)
    if (!rt) return { ok: false, code: 'quota_nexus_not_found', message: `未找到账号 ${id}` }
    const result = await this.probeRecord(rt.record)
    const { headers, ...report } = result
    rt.lastProbeWall = wallNow()
    rt.lastProbeStatus = result.status
    rt.lastProbeHttp = result.httpStatus ?? 0
    if (result.ok) {
      this.scheduler.markHealthy(rt)
      rt.health = 'connected'
      // 探测响应同样可能带额度头：先恢复健康，再回填额度，避免被健康重置覆盖。
      const observed = headers && Object.keys(headers).length
        ? this.ingestHeaders(rt, headers, { source: 'probe' })
        : null
      const balance = await this.fetchBalance(rt)
      this.publish('probe', {
        account: maskAccount(rt.record),
        status: 'connected',
        latencyMs: result.latencyMs,
        quotaObserved: Boolean(observed),
        balance: balance?.amount ?? null,
      })
      return {
        ok: true,
        account: maskAccount(rt.record),
        ...report,
        quota: { ...rt.quota },
        balance: balance ?? null,
      }
    }
    rt.health = result.status
    this.scheduler.penalize(rt, result.httpStatus, { network: result.status === 'unreachable' })
    if (headers && Object.keys(headers).length) this.ingestHeaders(rt, headers, { source: 'probe' })
    await this.fetchBalance(rt)
    this.publish('probe', { account: maskAccount(rt.record), status: result.status, latencyMs: result.latencyMs })
    return { ok: false, account: maskAccount(rt.record), ...report }
  }

  /**
   * 官方余额接口（目前 DeepSeek 已确认：GET /user/balance）。
   * 失败只记录 warning，不影响健康判定——余额接口挂掉不代表推理不可用。
   */
  async fetchBalance(rt, { force = false } = {}) {
    const url = balanceUrlOf(rt.record)
    if (!url) return null
    // 快刷保护：同一账号 800ms 内不重复请求（0s 语义由 SSE 推送承担，不是狂打官方接口）。
    const now = wallNow()
    if (rt.balanceInFlight) return rt.balance ?? null
    if (!force && now - (rt.balanceLastAt ?? 0) < 800) return rt.balance ?? null
    rt.balanceInFlight = true
    rt.balanceLastAt = now
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json', ...authHeaders(rt.record) },
        signal: timeoutSignal(this.config.probeTimeoutMs),
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.warn('balance_unauthorized', `${maskAccount(rt.record)} 余额接口拒绝凭据（HTTP ${response.status}）`)
        }
        return null
      }
      const parsed = parseBalance(await response.json())
      if (!parsed) {
        this.warn('balance_unparsed', `${maskAccount(rt.record)} 余额响应无法解析（来源 ${url}）`)
        return null
      }
      rt.balance = { ...parsed, observedAt: new Date().toISOString(), url }
      this.publish('balance', { account: maskAccount(rt.record), amount: parsed.amount, currency: parsed.currency })
      const floor = Number(this.config.alertBalanceFloor)
      if (floor > 0 && parsed.amount !== null && parsed.amount <= floor) {
        this.alert(`balance_low:${rt.id}`, {
          level: 'error',
          title: `余额低于阈值：${maskAccount(rt.record)}`,
          detail: `当前 ${parsed.currency ?? ''} ${parsed.amount} ≤ 阈值 ${floor}。`,
        })
      }
      return rt.balance
    } catch (error) {
      this.warn('balance_failed', `${maskAccount(rt.record)} 余额查询失败：${error?.message ?? error}`)
      return null
    } finally {
      rt.balanceInFlight = false
    }
  }

  /** 订阅套餐的窗口滚动：进入新周期就把本地周期计数清零并推送。 */
  rollPlanWindows() {
    const now = wallNow()
    for (const rt of this.scheduler.accounts.values()) {
      const plan = rt.record?.plan
      if (!plan || plan.kind !== 'subscription') continue
      const periodMs = Number(plan.periodMs) || 0
      const anchorAt = Number(plan.anchorAt) || 0
      if (!periodMs || !anchorAt) continue
      const windowStart = anchorAt + Math.floor(Math.max(0, now - anchorAt) / periodMs) * periodMs
      if (rt.usage.sinceWall < windowStart) {
        rt.usage.requests = 0
        rt.usage.tokens = 0
        rt.usage.sinceWall = now
        rt.usage.resetsAtWall = windowStart + periodMs
        this.publish('plan', { id: rt.id, windowStart, resetsAtWall: rt.usage.resetsAtWall })
      }
    }
  }

  /** 快刷：余额 + 套餐窗口，默认 5s 一轮；结果经 SSE 立即推给已打开的页面。 */
  async refreshHot() {
    await this.ready
    this.rollPlanWindows()
    const out = []
    for (const rt of this.scheduler.accounts.values()) {
      if (!balanceUrlOf(rt.record)) continue
      const balance = await this.fetchBalance(rt)
      out.push({ id: rt.id, account: maskAccount(rt.record), amount: balance?.amount ?? null, currency: balance?.currency ?? null })
    }
    return out
  }

  async probeAll() {
    const targets = [...this.scheduler.accounts.values()].filter((rt) => !rt.needsRelogin)
    const results = []
    for (const rt of targets) {
      results.push(await this.probe(rt.id))
    }
    return results
  }

  /* ---------------- 请求回报（宿主拦截器调用） ---------------- */

  report(leaseId, outcome = {}) {
    const entry = this.scheduler.leases.get(leaseId)
    if (!entry) return { ok: false, code: 'quota_nexus_unknown_lease' }
    const { rt } = entry
    const status = Number(outcome.status ?? 0)
    const latencyMs = Number(outcome.latencyMs ?? Math.round(mono() - entry.lease.issuedAt))
    this.scheduler.release(leaseId)

    if (outcome.headers) this.ingestHeaders(rt, outcome.headers, { source: 'response' })

    let verdict = 'success'
    if (status >= 200 && status < 400) {
      this.scheduler.markHealthy(rt)
    } else {
      verdict = 'failure'
      this.scheduler.penalize(rt, status, {
        model: entry.token?.model,
        retryAfterMs: outcome.headers ? parseRateLimit(outcome.headers).retryAfterMs : undefined,
        network: status === 0,
      })
    }

    // 本地周期统计：官方不给额度头时，至少让「用了多少」有据可查。
    rt.usage.requests += 1
    if (outcome.usage && typeof outcome.usage === 'object') {
      const input = Number(outcome.usage.input_tokens ?? outcome.usage.prompt_tokens ?? 0)
      const output = Number(outcome.usage.output_tokens ?? outcome.usage.completion_tokens ?? 0)
      if (Number.isFinite(input) && input > 0) rt.usage.tokens += input
      if (Number.isFinite(output) && output > 0) rt.usage.tokens += output
    }

    this.ledger.push({
      at: new Date().toISOString(),
      account: maskAccount(rt.record),
      provider: rt.record.vendorId,
      model: entry.token?.model ?? null,
      status,      verdict,
      latencyMs,
      usage: outcome.usage ?? null,
      remainingRatio: rt.quota.ratio ?? null,
    })
    this.publish('usage', { account: maskAccount(rt.record), status, latencyMs })
    return { ok: true, verdict }
  }

  /* ---------------- OAuth（PKCE + state） ---------------- */

  oauthConfig(id) {
    return this.config.oauthProviders.find((entry) => entry.id === id)
  }

  async beginOAuth(vendorId, { redirectUri } = {}) {
    const config = this.oauthConfig(vendorId)
    if (!config) {
      return {
        ok: false,
        code: 'quota_nexus_oauth_unavailable',
        status: 'unavailable',
        message: `供应商 ${vendorId} 未配置 OAuth 通道（缺少 authorizeUrl / tokenUrl / clientId），请使用 API Key 方式添加`,
      }
    }
    const verifier = randomBytes(32).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const state = randomBytes(16).toString('base64url')
    const effectiveRedirect = redirectUri || config.redirectUri || `http://127.0.0.1/quota-nexus/oauth/callback`
    const url = new URL(config.authorizeUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', config.clientId)
    url.searchParams.set('redirect_uri', effectiveRedirect)
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
    if (config.scopes.length) url.searchParams.set('scope', config.scopes.join(' '))
    const expiresAt = wallNow() + 600_000
    this.pendingOAuth.set(state, {
      vendorId,
      verifier,
      redirectUri: effectiveRedirect,
      createdAt: wallNow(),
      expiresAt,
    })
    await this.persistOAuth()
    return {
      ok: true,
      status: 'pending',
      authorizeUrl: url.toString(),
      state,
      redirectUri: effectiveRedirect,
      expiresAt: new Date(expiresAt).toISOString(),
    }
  }

  async completeOAuth({ code, state }) {
    const pending = this.pendingOAuth.get(String(state ?? ''))
    if (!pending) return { ok: false, code: 'quota_nexus_oauth_state_invalid', message: 'state 校验失败或已过期' }
    this.pendingOAuth.delete(String(state))
    if (pending.expiresAt < wallNow()) {
      await this.persistOAuth()
      return { ok: false, code: 'quota_nexus_oauth_expired', message: '授权请求已过期，请重新发起' }
    }
    const config = this.oauthConfig(pending.vendorId)
    if (!config) return { ok: false, code: 'quota_nexus_oauth_unavailable', message: 'OAuth 通道已移除' }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code ?? ''),
      client_id: config.clientId,
      redirect_uri: pending.redirectUri,
      code_verifier: pending.verifier,
    })
    if (config.clientSecret) body.set('client_secret', config.clientSecret)
    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body,
        signal: timeoutSignal(this.config.probeTimeoutMs),
      })
      if (!response.ok) {
        await this.persistOAuth()
        return { ok: false, code: 'quota_nexus_oauth_exchange_failed', httpStatus: response.status, message: `换取令牌失败：HTTP ${response.status}` }
      }
      const payload = await response.json()
      const accessToken = payload?.access_token
      if (typeof accessToken !== 'string' || !accessToken) {
        return { ok: false, code: 'quota_nexus_oauth_no_token', message: '令牌响应缺少 access_token' }
      }
      await this.persistOAuth()
      const result = await this.addProvider({
        vendorId: pending.vendorId,
        apiKey: accessToken,
        credentialType: 'oauth',
        source: 'oauth',
        validate: false,
      })
      return result.ok ? { ok: true, providerId: result.provider.id, status: 'connected' } : result
    } catch (error) {
      await this.persistOAuth()
      return { ok: false, code: 'quota_nexus_oauth_network', message: `令牌端点不可达：${error?.message ?? error}` }
    }
  }

  async restoreOAuth() {
    const saved = await this.pool.readJson(FILE.oauth, { version: 1, pending: {} })
    const pending = saved?.pending && typeof saved.pending === 'object' ? saved.pending : {}
    for (const [state, value] of Object.entries(pending)) {
      if (!value || typeof value !== 'object') continue
      if (Number(value.expiresAt ?? 0) < wallNow()) continue
      this.pendingOAuth.set(state, value)
    }
  }

  async persistOAuth() {
    await this.pool.writeJson(FILE.oauth, {
      version: 1,
      pending: Object.fromEntries(this.pendingOAuth),
    })
  }

  /**
   * 与官方模型目录同步：成功即覆盖 provider.models 并记录同步时间与元数据。
   * 只读上游 /models，不猜测模型能力。
   */
  async syncModels(id) {
    await this.ready
    const record = this.providers.get(id)
    if (!record) return { ok: false, code: 'quota_nexus_not_found', message: `未找到供应商 ${id}` }
    const url = modelsUrlOf(record)
    if (!url) return { ok: false, code: 'quota_nexus_models_url_missing', message: '该供应商没有可用的模型目录地址' }
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json', ...authHeaders(record) },
        signal: timeoutSignal(this.config.requestTimeoutMs),
      })
      if (!response.ok) {
        return {
          ok: false,
          code: 'quota_nexus_models_unavailable',
          httpStatus: response.status,
          message: `${record.label} 模型目录返回 HTTP ${response.status}（${url}）`,
        }
      }
      const models = parseModelList(await response.json())
      if (!models.length) {
        return { ok: false, code: 'quota_nexus_models_empty', message: `${record.label} 模型目录为空（${url}）` }
      }
      const trimmed = models.slice(0, 60)
      const next = {
        ...record,
        models: trimmed.map((entry) => entry.id),
        modelMeta: Object.fromEntries(
          trimmed.map((entry) => [
            entry.id,
            { name: entry.name, contextWindow: entry.contextWindow, maxOutput: entry.maxOutput },
          ]),
        ),
        modelsSyncedAt: new Date().toISOString(),
        modelsUrl: url,
      }
      this.providers.set(id, next)
      const rt = this.scheduler.accounts.get(id)
      if (rt) rt.record = next
      await this.saveProviders()
      this.publish('models', { id, count: next.models.length })
      return { ok: true, providerId: id, count: next.models.length, models: next.models, syncedAt: next.modelsSyncedAt, url }
    } catch (error) {
      return { ok: false, code: 'quota_nexus_models_network', message: `模型目录不可达：${error?.message ?? error}` }
    }
  }

  async syncAllModels() {
    const results = []
    for (const id of this.providers.keys()) results.push(await this.syncModels(id))
    return { ok: results.some((entry) => entry.ok), results }
  }

  /* ---------------- 本机客户端快照发现（只扫描，不静默导入） ---------------- */

  discoverySources() {
    const sources = []
    for (const [vendorId, vendor] of Object.entries(VENDOR_CATALOG)) {
      if (vendor.keyEnv) sources.push({ id: `env:${vendorId}`, kind: 'env', vendorId, env: vendor.keyEnv })
    }
    sources.push({
      id: 'file:codex-auth',
      kind: 'file',
      vendorId: 'openai',
      path: join(homedir(), '.codex', 'auth.json'),
      pick: (json) => json?.OPENAI_API_KEY ?? json?.apiKey ?? json?.tokens?.access_token,
    })
    sources.push({
      id: 'file:claude-credentials',
      kind: 'file',
      vendorId: 'anthropic',
      path: join(homedir(), '.claude', '.credentials.json'),
      pick: (json) => json?.apiKey ?? json?.claudeAiOauth?.accessToken,
    })
    sources.push({
      id: 'file:gemini-credentials',
      kind: 'file',
      vendorId: 'gemini',
      path: join(homedir(), '.gemini', 'oauth_creds.json'),
      pick: (json) => json?.access_token ?? json?.apiKey,
    })
    return sources
  }

  async scanLocal() {
    await this.ready
    const candidates = []
    const seen = new Set()
    for (const source of this.discoverySources()) {
      try {
        let secret
        if (source.kind === 'env') secret = process.env[source.env]
        else {
          const text = await readFile(source.path, 'utf8')
          secret = source.pick?.(JSON.parse(text))
        }
        if (typeof secret !== 'string' || !secret.trim()) continue
        const fingerprint = sha256(`${source.vendorId}:${secret.trim()}`).slice(0, 32)
        if (seen.has(fingerprint)) continue
        seen.add(fingerprint)
        const duplicate = [...this.providers.values()].some((record) => record.fingerprint === fingerprint)
        candidates.push({
          candidateId: source.id,
          vendorId: source.vendorId,
          label: VENDOR_CATALOG[source.vendorId]?.label ?? source.vendorId,
          source: source.kind,
          origin: source.kind === 'env' ? `env:${source.env}` : source.path,
          masked: maskSecret(secret.trim()),
          fingerprint,
          duplicate,
        })
      } catch {
        /* 单个来源不可读不是错误；继续下一个 */
      }
    }
    this.discovered = candidates
    this.publish('discovery', { count: candidates.length })
    return {
      ok: true,
      scannedAt: new Date().toISOString(),
      imported: false,
      note: '扫描不会自动导入；请显式调用导入接口',
      candidates,
    }
  }

  async importCandidate(candidateId) {
    await this.ready
    const candidate = this.discovered.find((entry) => entry.candidateId === candidateId)
    if (!candidate) return { ok: false, code: 'quota_nexus_candidate_missing', message: '请先重新扫描' }
    if (candidate.duplicate) {
      return { ok: false, code: 'quota_nexus_duplicate_credential', message: '该凭据已在池中，未重复导入' }
    }
    const source = this.discoverySources().find((entry) => entry.id === candidateId)
    if (!source) return { ok: false, code: 'quota_nexus_candidate_missing', message: '来源已不可用' }
    let secret
    try {
      if (source.kind === 'env') secret = process.env[source.env]
      else secret = source.pick?.(JSON.parse(await readFile(source.path, 'utf8')))
    } catch (error) {
      return { ok: false, code: 'quota_nexus_discovery_read_failed', message: error?.message ?? String(error) }
    }
    if (typeof secret !== 'string' || !secret.trim()) {
      return { ok: false, code: 'quota_nexus_candidate_empty', message: '来源中未读取到凭据' }
    }
    const result = await this.addProvider({
      vendorId: candidate.vendorId,
      apiKey: secret.trim(),
      source: 'discovered',
      validate: true,
    })
    if (result.ok) {
      candidate.duplicate = true
      this.publish('discovery', { count: this.discovered.length, imported: result.provider.id })
    }
    return result
  }

  /* ---------------- 状态快照 ---------------- */

  async status(section = 'overview') {
    try {
      await Promise.race([this.ready, sleep(250)])
      const counts = this.scheduler.counts()
      const base = {
        ok: true,
        plugin: PLUGIN,
        generatedAt: new Date().toISOString(),
        pool: {
          path: this.pool.dir,
          degraded: this.pool.degraded,
          writable: this.pool.ready,
        },
        strategy: this.config.strategy,
        counts,
        ledger: this.ledger.snapshot(),
        alerts: this.inbox.slice(0, 20),
        warnings: [...this.warnings],
      }
      if (section === 'quota') {
        return {
          ...base,
          accounts: [...this.scheduler.snapshotAccounts()].map((entry) => ({
            account: entry.account,
            quota: entry.quota,
            balance: entry.balance ?? null,
            state: entry.state,
            cooldownMs: entry.cooldownMs,
          })),
        }
      }
      if (section === 'errors') {
        return {
          ...base,
          accounts: [...this.scheduler.snapshotAccounts()].map((entry) => ({
            account: entry.account,
            counters: entry.counters,
            needsRelogin: entry.needsRelogin,
            cooldownMs: entry.cooldownMs,
            cooldownKind: entry.cooldownKind,
          })),
          warnings: [...this.warnings],
        }
      }
      const providers = [...this.providers.values()].map((record) => this.providerView(record))
      if (section === 'providers') return { ...base, providers }
      return {
        ...base,
        providers,
        accounts: [...this.scheduler.snapshotAccounts()],
        discovered: this.discovered.map((entry) => ({ ...entry })),
      }
    } catch (error) {
      return {
        ok: false,
        plugin: PLUGIN,
        code: 'quota_nexus_status_failed',
        message: `状态读取失败：${error?.message ?? error}`,
        warnings: [...this.warnings],
      }
    }
  }

  /* ---------------- 生命周期 ---------------- */

  startTimers() {
    const disposers = []
    const every = (ms, fn) => {
      const timer = setInterval(() => {
        try {
          void fn()
        } catch (error) {
          this.warn('timer_failed', `定时任务异常：${error?.message ?? error}`)
        }
      }, ms)
      timer.unref?.()
      disposers.push(() => clearInterval(timer))
    }
    every(this.config.probeIntervalMs, () => this.probeAll())
    // 余额/套餐快刷：让「0s 实时」由服务端轮询 + SSE 推送达成，页面无需刷新。
    every(this.config.balanceRefreshMs, () => this.refreshHot())
    every(30_000, () => this.scheduler.refreshSets())
    if (this.config.discoveryAutoScan) {
      const timer = setTimeout(() => {
        void this.scanLocal().catch((error) => this.warn('discovery_failed', `${error?.message ?? error}`))
      }, 5_000)
      timer.unref?.()
      disposers.push(() => clearTimeout(timer))
    }
    this.timers = disposers
    return () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {
          /* 已释放 */
        }
      }
      this.timers = []
    }
  }

  async stop() {
    try {
      await this.ledger.stop()
      await this.stateWriter?.stop()
      await this.persistState()
      await this.saveProviders()
    } catch (error) {
      this.warn('shutdown_failed', `${error?.message ?? error}`)
    }
  }
}

/* ------------------------------------------------------------------ *
 * 本地 REST + SSE（只读优先，绝不下发完整密钥）
 * ------------------------------------------------------------------ */

class HttpSurface {
  constructor({ runtime, config }) {
    this.runtime = runtime
    this.config = config
    this.base = config.httpBasePath
    this.clients = new Set()
  }

  guard(req, res) {
    if (this.config.httpRequireLoopback && !isLoopback(req)) {
      writeJson(res, 403, {
        ok: false,
        code: 'quota_nexus_forbidden',
        message: '该插件 REST 仅接受回环地址访问',
      })
      return false
    }
    return true
  }

  route(path) {
    return `${this.base}${path}`
  }

  handlers() {
    const list = []
    const add = (method, path, handler) => list.push({ method, path: this.route(path), handler })

    add('GET', '/api/overview', async (req, res) => {
      if (!this.guard(req, res)) return
      const section = new URL(req.url ?? '/', 'http://127.0.0.1').searchParams.get('section') ?? 'overview'
      writeJson(res, 200, await this.runtime.status(section))
    })

    add('GET', '/api/events', async (req, res) => {
      if (!this.guard(req, res)) return
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      })
      res.write('retry: 2000\n\n')
      const send = (frame) => {
        try {
          res.write(`event: ${frame.type}\ndata: ${JSON.stringify(frame)}\n\n`)
        } catch {
          /* 客户端已断开 */
        }
      }
      const unsubscribe = this.runtime.subscribe(send)
      const heartbeat = setInterval(() => {
        try {
          res.write(`event: ping\ndata: ${Date.now()}\n\n`)
        } catch {
          /* 忽略 */
        }
      }, 15_000)
      heartbeat.unref?.()
      const close = () => {
        clearInterval(heartbeat)
        unsubscribe()
        this.clients.delete(close)
      }
      this.clients.add(close)
      req.on('close', close)
      send({ type: 'snapshot', at: new Date().toISOString(), payload: await this.runtime.status('quota') })
    })

    add('POST', '/api/providers', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        writeJson(res, 200, await this.runtime.addProvider(body))
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_request', message: error?.message ?? String(error) })
      }
    })

    add('POST', '/api/providers/edit', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        const id = String(body?.id ?? '')
        writeJson(res, 200, await this.runtime.updateProvider(id, body ?? {}))
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_request', message: error?.message ?? String(error) })
      }
    })

    add('POST', '/api/providers/delete', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        writeJson(res, 200, await this.runtime.removeProvider(String(body?.id ?? '')))
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_request', message: error?.message ?? String(error) })
      }
    })

    add('POST', '/api/providers/probe', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        if (body?.id) writeJson(res, 200, await this.runtime.probe(String(body.id)))
        else writeJson(res, 200, { ok: true, results: await this.runtime.probeAll() })
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_request', message: error?.message ?? String(error) })
      }
    })

    add('POST', '/api/providers/refresh', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const balances = await this.runtime.refreshHot()
        writeJson(res, 200, { ok: true, at: new Date().toISOString(), balances })
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_refresh_failed', message: error?.message ?? String(error) })
      }
    })

    add('POST', '/api/providers/sync-models', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        if (body?.id) writeJson(res, 200, await this.runtime.syncModels(String(body.id)))
        else writeJson(res, 200, await this.runtime.syncAllModels())
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_request', message: error?.message ?? String(error) })
      }
    })

    add('POST', '/api/strategy', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        if (!STRATEGIES.includes(body?.strategy)) {
          writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_strategy', message: `未知策略：${body?.strategy}` })
          return
        }
        this.runtime.config.strategy = body.strategy
        this.runtime.scheduler.rebuild()
        this.runtime.publish('strategy', { strategy: body.strategy })
        writeJson(res, 200, { ok: true, strategy: body.strategy })
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_request', message: error?.message ?? String(error) })
      }
    })

    add('POST', '/api/discovery/scan', async (req, res) => {
      if (!this.guard(req, res)) return
      writeJson(res, 200, await this.runtime.scanLocal())
    })

    add('POST', '/api/discovery/import', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        writeJson(res, 200, await this.runtime.importCandidate(String(body?.candidateId ?? '')))
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_request', message: error?.message ?? String(error) })
      }
    })

    add('GET', '/api/alerts', async (req, res) => {
      if (!this.guard(req, res)) return
      writeJson(res, 200, { ok: true, alerts: this.runtime.inbox.slice(0, 50) })
    })

    add('POST', '/api/oauth/begin', async (req, res) => {
      if (!this.guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        writeJson(res, 200, await this.runtime.beginOAuth(String(body?.vendorId ?? ''), { redirectUri: body?.redirectUri }))
      } catch (error) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_bad_request', message: error?.message ?? String(error) })
      }
    })

    return list
  }

  callbackHandler() {
    return async (req, res) => {
      if (!this.guard(req, res)) return
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const state = url.searchParams.get('state') ?? ''
      const code = url.searchParams.get('code') ?? ''
      if (!state || !code) {
        writeJson(res, 400, { ok: false, code: 'quota_nexus_oauth_missing_params', message: '缺少 state 或 code' })
        return
      }
      const result = await this.runtime.completeOAuth({ code, state })
      writeJson(res, result.ok ? 200 : 400, result)
    }
  }

  /** 注册到 webServer；返回一个集合器，逐个方法按需分发。 */
  register(webServer) {
    const disposers = []
    const table = this.handlers()
    const dispatch = async (req, res) => {
      const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
      const method = (req.method ?? 'GET').toUpperCase()
      // OAuth 回调在同一个前缀路由内分发：不依赖 Host 对 exact/prefix 的匹配顺序。
      if (path === this.route('/oauth/callback')) {
        await this.callbackHandler()(req, res)
        return
      }
      const exact = table.find((entry) => entry.path === path)
      if (exact && exact.method === method) {
        await exact.handler(req, res)
        return
      }
      const fallback = table.find((entry) => entry.path === path)
      if (fallback) {
        writeJson(res, 405, { ok: false, code: 'quota_nexus_method_not_allowed', message: `请使用 ${fallback.method}` })
        return
      }
      writeJson(res, 404, { ok: false, code: 'quota_nexus_not_found', message: `未知路由 ${path}` })
    }
    try {
      disposers.push(webServer.register({ kind: 'prefix', path: this.base, handler: dispatch }))
    } catch (error) {
      this.runtime.warn('http_register_failed', `REST/SSE 注册失败：${error?.message ?? error}`)
    }
    return {
      dispose: () => {
        for (const close of [...this.clients]) close()
        for (const dispose of disposers) {
          try {
            dispose?.()
          } catch {
            /* 已释放 */
          }
        }
      },
    }
  }
}

/* ------------------------------------------------------------------ *
 * 只读状态工具
 * ------------------------------------------------------------------ */

const STATUS_SECTIONS = ['overview', 'providers', 'quota', 'errors']

const statusTool = (runtime) => ({
  name: 'quota_nexus_status',
  description:
    '只读查询 dsh-quota-nexus 的额度池状态：池路径、脱敏账号标识、健康状态、当前调度策略、额度余量、冷却倒计时、错误计数与 warnings。配置文件损坏或上游不可达时返回诊断信息而不是抛错。',
  parameters: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        enum: STATUS_SECTIONS,
        description: 'overview=总览，providers=供应商列表，quota=额度，errors=错误与冷却',
      },
    },
    additionalProperties: false,
  },
  output: {
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        plugin: { type: 'string' },
        pool: { type: 'object' },
        strategy: { type: 'string' },
        counts: { type: 'object' },
        accounts: { type: 'array' },
        providers: { type: 'array' },
        warnings: { type: 'array' },
        code: { type: 'string' },
        message: { type: 'string' },
      },
      additionalProperties: true,
    },
    render: (_args, value) => {
      const text = (() => {
        try {
          return JSON.stringify(value, null, 2)
        } catch {
          return String(value)
        }
      })()
      return [{ type: 'text', text }]
    },
  },
  async execute(args) {
    const section = STATUS_SECTIONS.includes(args?.section) ? args.section : 'overview'
    return runtime.status(section)
  },
})

/* ------------------------------------------------------------------ *
 * 插件入口
 * ------------------------------------------------------------------ */

export function apply(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)
  const runtime = new QuotaNexusRuntime(ctx, config)

  /** 统一的资源注册：ctx.effect 缺失或抛错时退回手工 disposer，绝不装配失败。 */
  const effect = (factory) => {
    try {
      if (typeof ctx?.effect === 'function') {
        const dispose = ctx.effect(factory)
        if (typeof dispose === 'function') return dispose
      }
      const fallback = factory()
      return typeof fallback === 'function' ? fallback : () => {}
    } catch (error) {
      runtime.warn('effect_failed', `资源注册失败：${error?.message ?? error}`)
      return () => {}
    }
  }

  // 1) 只读状态工具（tools 是硬依赖，仍做一次防御检查）。
  effect(() => {
    if (typeof ctx?.tools?.register !== 'function') {
      runtime.warn('tools_unavailable', 'ctx.tools 不可用，quota_nexus_status 未注册')
      return () => {}
    }
    return ctx.tools.register(statusTool(runtime))
  })

  // 2) 定时器（探活 / 活跃池刷新 / 首轮发现扫描）。
  effect(() => runtime.startTimers())

  // 3) 本地 REST + SSE 面板（webServer 可选）。
  effect(() => {
    if (!config.httpEnabled) return () => {}
    const webServer = ctx?.get?.('webServer')
    if (typeof webServer?.register !== 'function') {
      runtime.warn('web_server_unavailable', 'ctx.webServer 不可用，REST/SSE 面板未注册（Host 状态工具仍可用）')
      return () => {}
    }
    const surface = new HttpSurface({ runtime, config })
    const handle = surface.register(webServer)
    return () => handle.dispose()
  })

  // 4) 对外暴露内存运行时：Cordis 要求先 provide 再 set，否则 set 会拒绝。
  effect(() => {
    if (typeof ctx?.set !== 'function' || typeof ctx?.provide !== 'function') return () => {}
    try {
      ctx.provide('quotaNexus')
      ctx.set('quotaNexus', runtime)
    } catch (error) {
      runtime.warn('runtime_expose_failed', `运行时挂载失败（不影响调度与状态工具）：${error?.message ?? error}`)
      return () => {}
    }
    return () => {
      try {
        ctx.set('quotaNexus', undefined)
      } catch {
        /* 已卸载 */
      }
    }
  })

  // 5) 卸载：把 Write-Behind 队列与状态快照落盘。
  effect(() => () => {
    void runtime.stop()
  })

  return () => runtime.stop()
}
