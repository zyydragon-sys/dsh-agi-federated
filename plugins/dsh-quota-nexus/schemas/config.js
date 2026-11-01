/**
 * dsh-quota-nexus — 配置模型
 *
 * 该模块被 index.js 以 `import { Config } from './schemas/config.js'` 静态引用，
 * 因此这里承担两件事：
 *   1. 向 Cordis Loader 暴露 `Config`（schemastery Schema），用于配置校验与设置页表单；
 *   2. 暴露 `normalizeConfig()`，供 Host 在 Loader 校验之后再做一次防御式归一化。
 *
 * 依赖解析：bundle 通过 `link:` 装进 profile 时，模块的真实路径在工作区，Node 从
 * 真实路径向上找不到 profile 的 node_modules，裸标识符 `@deepseek-ai/schemastery`
 * 会 ERR_MODULE_NOT_FOUND。Host 进程也未必带着 DSH_PROFILE_DIR 这类 shell 环境变量，
 * 因此按 «裸导入 → 环境变量指向的 profile → ~/.dsh/profiles/<name> → ~/.dsh/profiles/*
 * 逐个扫描 → DSH 安装目录» 依次探测；全部失败时**不导出 Config**（让 Loader 跳过
 * 校验，而不是导出一个不是 Schema 的函数——那会让 Loader 在激活时抛 TypeError），
 * 配置语义由 `normalizeConfig()` 全权保证。
 */

import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const SCHEMASTERM_SEGMENTS = ['node_modules', '@deepseek-ai', 'schemastery']

const pickSchema = (mod) => {
  const candidate = mod?.default ?? mod
  return typeof candidate?.object === 'function' ? candidate : null
}

/** 从一个候选目录里加载 schemastery；目录布局不符或加载失败都返回 null。 */
async function loadFrom(root) {
  if (!root) return null
  const packageDir = join(root, ...SCHEMASTERM_SEGMENTS)
  try {
    const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
    const exported = manifest?.exports?.['.']
    const entry =
      typeof exported === 'string' ? exported : exported?.import ?? exported?.require ?? manifest?.module ?? manifest?.main
    if (!entry) return null
    return pickSchema(await import(pathToFileURL(join(packageDir, entry)).href))
  } catch {
    return null
  }
}

/** 列出 profile 根目录：环境变量优先，其次 ~/.dsh/profiles 下的全部 profile。 */
async function profileRoots() {
  const roots = []
  if (process.env.DSH_PROFILE_DIR) roots.push(process.env.DSH_PROFILE_DIR)
  const home = join(homedir(), '.dsh', 'profiles')
  if (process.env.DSH_HOME) roots.push(join(process.env.DSH_HOME, 'profiles', process.env.DSH_PROFILE ?? ''))
  if (process.env.DSH_PROFILE) roots.push(join(home, process.env.DSH_PROFILE))
  try {
    for (const name of await readdir(home)) {
      if (!name || name.startsWith('.')) continue
      roots.push(join(home, name))
    }
  } catch {
    /* 没有 ~/.dsh/profiles：说明不是 profile 启动，跳过 */
  }
  // DSH 安装目录自带一份（Electron 的 asar 布局）
  if (process.resourcesPath) roots.push(join(process.resourcesPath, 'app.asar', 'dsh'))
  return [...new Set(roots.filter(Boolean))]
}

async function resolveSchema() {
  try {
    const direct = pickSchema(await import('@deepseek-ai/schemastery'))
    if (direct) return direct
  } catch {
    /* 裸导入不可用：走目录探测 */
  }
  for (const root of await profileRoots()) {
    const schema = await loadFrom(root)
    if (schema) return schema
  }
  return null
}

const z = await resolveSchema()

/** 选号策略（与调度器实现一一对应）。 */
export const STRATEGIES = ['priority', 'round-robin', 'balanced', 'sticky']

/** 配置默认值：任何字段缺失都落到这里，保证运行时永远拿到完整对象。 */
export const DEFAULTS = Object.freeze({
  /** 【强制锁】持久化根目录。插件在其下建立独立子目录 dsh-quota-nexus/。 */
  persistenceRoot: 'D:\\DeepSeek Harness',
  strategy: 'balanced',
  /** 单次请求最多尝试的不同账号数（硬上限 8）。 */
  maxAttempts: 8,
  /** 高并发满载时轻量内存排队的最大等待（毫秒），超时直接返回结构化背压。 */
  queueWaitMs: 100,
  /** sticky 策略下会话→账号绑定的存活时间。 */
  stickyTtlMs: 1_800_000,
  probeIntervalMs: 60_000,
  cooldown429Ms: 30_000,
  cooldown5xxMs: 15_000,
  cooldownCapMs: 900_000,
  /** 凭据熔断：连续 3 次鉴权拒绝 → 移出池并标记需重新登录，冷却 30 分钟。 */
  credentialFuseThreshold: 3,
  credentialFuseCooldownMs: 1_800_000,
  /** 额度门槛：消耗达 95% 提前切换，剩余低于 5% 预冷。 */
  softSwitchRatio: 0.95,
  hardFloorRatio: 0.05,
  /** 多级预警阈值（消耗比例）与去重窗口。 */
  alertThresholds: [0.8, 0.9, 0.95],
  alertBalanceFloor: 0,
  alertDedupeMs: 600_000,
  alertWebhookUrls: [],
  alertInbox: true,
  /** 本机客户端快照扫描：默认只扫描不导入，绝不静默重复导入。 */
  discoveryAutoScan: true,
  discoveryAutoImport: false,
  /** OAuth（PKCE + state）通道；留空时该通道返回明确的 unavailable。 */
  oauthProviders: [],
  /** Write-Behind 落盘参数。 */
  ledgerFlushMs: 250,
  ledgerBatch: 128,
  ledgerMaxQueue: 4096,
  /** 风暴刹车：窗口内异常数超阈值则暂停自动切换。 */
  stormWindowMs: 60_000,
  stormThreshold: 8,
  stormPauseMs: 120_000,
  /** 网络与超时。 */
  probeTimeoutMs: 5_000,
  requestTimeoutMs: 30_000,
  /** 本地只读 REST/SSE 面板。 */
  httpEnabled: true,
  httpRequireLoopback: true,
  httpBasePath: '/quota-nexus',
})

const num = (value, fallback, min, max) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(n)) return fallback
  if (typeof min === 'number' && n < min) return min
  if (typeof max === 'number' && n > max) return max
  return n
}

const str = (value, fallback) => (typeof value === 'string' && value.trim() ? value.trim() : fallback)

const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback)

const strList = (value, fallback) => {
  if (!Array.isArray(value)) return [...fallback]
  const out = []
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) out.push(item.trim())
  }
  return out
}

const ratioList = (value, fallback) => {
  if (!Array.isArray(value)) return [...fallback]
  const out = []
  for (const item of value) {
    const n = num(item, Number.NaN, 0, 1)
    if (Number.isFinite(n)) out.push(n)
  }
  out.sort((a, b) => a - b)
  return out.length ? out : [...fallback]
}

/**
 * 防御式归一化：未知键丢弃、越界值夹紧、类型错误回落默认值。
 * 绝不抛异常——配置永远不应让插件装配失败。
 */
export function normalizeConfig(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const oauthProviders = []
  if (Array.isArray(raw.oauthProviders)) {
    for (const item of raw.oauthProviders) {
      if (!item || typeof item !== 'object') continue
      const id = str(item.id, '')
      const authorizeUrl = str(item.authorizeUrl, '')
      const tokenUrl = str(item.tokenUrl, '')
      const clientId = str(item.clientId, '')
      if (!id || !authorizeUrl || !tokenUrl || !clientId) continue
      oauthProviders.push({
        id,
        authorizeUrl,
        tokenUrl,
        clientId,
        scopes: strList(item.scopes, []),
        redirectUri: str(item.redirectUri, ''),
        deviceCodeUrl: str(item.deviceCodeUrl, ''),
        clientSecret: str(item.clientSecret, ''),
      })
    }
  }

  const strategy = STRATEGIES.includes(raw.strategy) ? raw.strategy : DEFAULTS.strategy

  return {
    persistenceRoot: str(raw.persistenceRoot, DEFAULTS.persistenceRoot),
    strategy,
    maxAttempts: Math.round(num(raw.maxAttempts, DEFAULTS.maxAttempts, 1, 8)),
    queueWaitMs: Math.round(num(raw.queueWaitMs, DEFAULTS.queueWaitMs, 0, 2_000)),
    stickyTtlMs: Math.round(num(raw.stickyTtlMs, DEFAULTS.stickyTtlMs, 1_000, 86_400_000)),
    probeIntervalMs: Math.round(num(raw.probeIntervalMs, DEFAULTS.probeIntervalMs, 10_000, 3_600_000)),
    cooldown429Ms: Math.round(num(raw.cooldown429Ms, DEFAULTS.cooldown429Ms, 1_000, 3_600_000)),
    cooldown5xxMs: Math.round(num(raw.cooldown5xxMs, DEFAULTS.cooldown5xxMs, 1_000, 3_600_000)),
    cooldownCapMs: Math.round(num(raw.cooldownCapMs, DEFAULTS.cooldownCapMs, 1_000, 86_400_000)),
    credentialFuseThreshold: Math.round(num(raw.credentialFuseThreshold, DEFAULTS.credentialFuseThreshold, 1, 20)),
    credentialFuseCooldownMs: Math.round(
      num(raw.credentialFuseCooldownMs, DEFAULTS.credentialFuseCooldownMs, 60_000, 86_400_000),
    ),
    softSwitchRatio: num(raw.softSwitchRatio, DEFAULTS.softSwitchRatio, 0.5, 0.999),
    hardFloorRatio: num(raw.hardFloorRatio, DEFAULTS.hardFloorRatio, 0.001, 0.5),
    alertThresholds: ratioList(raw.alertThresholds, DEFAULTS.alertThresholds),
    alertBalanceFloor: num(raw.alertBalanceFloor, DEFAULTS.alertBalanceFloor, 0, 1_000_000),
    alertDedupeMs: Math.round(num(raw.alertDedupeMs, DEFAULTS.alertDedupeMs, 1_000, 86_400_000)),
    alertWebhookUrls: strList(raw.alertWebhookUrls, DEFAULTS.alertWebhookUrls),
    alertInbox: bool(raw.alertInbox, DEFAULTS.alertInbox),
    discoveryAutoScan: bool(raw.discoveryAutoScan, DEFAULTS.discoveryAutoScan),
    discoveryAutoImport: false,
    oauthProviders,
    ledgerFlushMs: Math.round(num(raw.ledgerFlushMs, DEFAULTS.ledgerFlushMs, 50, 10_000)),
    ledgerBatch: Math.round(num(raw.ledgerBatch, DEFAULTS.ledgerBatch, 1, 2_048)),
    ledgerMaxQueue: Math.round(num(raw.ledgerMaxQueue, DEFAULTS.ledgerMaxQueue, 64, 65_536)),
    stormWindowMs: Math.round(num(raw.stormWindowMs, DEFAULTS.stormWindowMs, 1_000, 600_000)),
    stormThreshold: Math.round(num(raw.stormThreshold, DEFAULTS.stormThreshold, 1, 1_000)),
    stormPauseMs: Math.round(num(raw.stormPauseMs, DEFAULTS.stormPauseMs, 1_000, 3_600_000)),
    probeTimeoutMs: Math.round(num(raw.probeTimeoutMs, DEFAULTS.probeTimeoutMs, 500, 60_000)),
    requestTimeoutMs: Math.round(num(raw.requestTimeoutMs, DEFAULTS.requestTimeoutMs, 1_000, 600_000)),
    httpEnabled: bool(raw.httpEnabled, DEFAULTS.httpEnabled),
    httpRequireLoopback: bool(raw.httpRequireLoopback, DEFAULTS.httpRequireLoopback),
    httpBasePath: str(raw.httpBasePath, DEFAULTS.httpBasePath),
  }
}

/**
 * 拿不到 schemastery 时返回 `undefined`：Cordis 会跳过该行的 Config 校验，
 * 配置语义由 `normalizeConfig()` 保证。绝不导出一个非 Schema 的函数——
 * Loader 会把它当 Schema 使用并在激活阶段抛 TypeError。
 */
function build() {
  if (!z) return undefined
  return z
    .object({
      persistenceRoot: z
        .string()
        .default(DEFAULTS.persistenceRoot)
        .description('持久化根目录；插件在其下创建独立子目录 dsh-quota-nexus/（凭据 0600 原子写）。'),
      strategy: z.union(STRATEGIES).default(DEFAULTS.strategy).description('选号策略。'),
      maxAttempts: z
        .number()
        .min(1)
        .max(8)
        .step(1)
        .default(DEFAULTS.maxAttempts)
        .description('单次请求最多尝试的不同账号数（硬上限 8）。'),
      queueWaitMs: z
        .number()
        .min(0)
        .max(2_000)
        .step(1)
        .default(DEFAULTS.queueWaitMs)
        .description('满载时内存排队最大等待毫秒数；超时返回结构化背压。'),
      stickyTtlMs: z.number().min(1_000).default(DEFAULTS.stickyTtlMs).description('sticky 会话绑定存活毫秒数。'),
      probeIntervalMs: z
        .number()
        .min(10_000)
        .default(DEFAULTS.probeIntervalMs)
        .description('后台低频探活间隔毫秒数。'),
      cooldown429Ms: z.number().min(1_000).default(DEFAULTS.cooldown429Ms).description('429 基础冷却毫秒数。'),
      cooldown5xxMs: z.number().min(1_000).default(DEFAULTS.cooldown5xxMs).description('5xx 基础冷却毫秒数。'),
      cooldownCapMs: z.number().min(1_000).default(DEFAULTS.cooldownCapMs).description('指数退避冷却上限。'),
      credentialFuseThreshold: z
        .number()
        .min(1)
        .default(DEFAULTS.credentialFuseThreshold)
        .description('连续鉴权拒绝多少次后熔断该凭据。'),
      credentialFuseCooldownMs: z
        .number()
        .min(60_000)
        .default(DEFAULTS.credentialFuseCooldownMs)
        .description('凭据熔断冷却毫秒数（默认 30 分钟）。'),
      softSwitchRatio: z
        .number()
        .min(0.5)
        .max(0.999)
        .default(DEFAULTS.softSwitchRatio)
        .description('额度消耗达到该比例时提前切换账号。'),
      hardFloorRatio: z
        .number()
        .min(0.001)
        .max(0.5)
        .default(DEFAULTS.hardFloorRatio)
        .description('额度剩余低于该比例时预冷该账号。'),
      alertThresholds: z
        .array(z.number().min(0).max(1))
        .default([...DEFAULTS.alertThresholds])
        .description('多级额度预警阈值（消耗比例）。'),
      alertBalanceFloor: z.number().min(0).default(DEFAULTS.alertBalanceFloor).description('余额预警下限。'),
      alertDedupeMs: z.number().min(1_000).default(DEFAULTS.alertDedupeMs).description('预警去重窗口毫秒数。'),
      alertWebhookUrls: z.array(z.string()).default([]).description('预警 Webhook 推送地址（空则不推送）。'),
      alertInbox: z.boolean().default(true).description('是否写入站内信收件箱。'),
      discoveryAutoScan: z.boolean().default(true).description('启动后是否自动扫描本机客户端快照。'),
      discoveryAutoImport: z.boolean().default(false).description('保留位；自动导入恒为关闭，导入必须显式触发。'),
      oauthProviders: z
        .array(
          z.object({
            id: z.string().required(),
            authorizeUrl: z.string().required(),
            tokenUrl: z.string().required(),
            clientId: z.string().required(),
            scopes: z.array(z.string()).default([]),
            redirectUri: z.string().default(''),
            deviceCodeUrl: z.string().default(''),
            clientSecret: z.string().role('secret').default(''),
          }),
        )
        .default([])
        .description('可选的 OAuth2 PKCE 通道定义；未配置的厂商 OAuth 返回 unavailable。'),
      ledgerFlushMs: z.number().min(50).default(DEFAULTS.ledgerFlushMs).description('Write-Behind 批量落盘间隔。'),
      ledgerBatch: z.number().min(1).default(DEFAULTS.ledgerBatch).description('每批落盘条数。'),
      ledgerMaxQueue: z.number().min(64).default(DEFAULTS.ledgerMaxQueue).description('账本内存队列上限。'),
      stormWindowMs: z.number().min(1_000).default(DEFAULTS.stormWindowMs).description('风暴刹车统计窗口。'),
      stormThreshold: z.number().min(1).default(DEFAULTS.stormThreshold).description('窗口内异常阈值。'),
      stormPauseMs: z.number().min(1_000).default(DEFAULTS.stormPauseMs).description('风暴刹车暂停自动切换时长。'),
      probeTimeoutMs: z.number().min(500).default(DEFAULTS.probeTimeoutMs).description('探活请求超时毫秒数。'),
      requestTimeoutMs: z.number().min(1_000).default(DEFAULTS.requestTimeoutMs).description('上游请求超时毫秒数。'),
      httpEnabled: z.boolean().default(true).description('是否注册本地只读 REST + SSE 面板。'),
      httpRequireLoopback: z.boolean().default(true).description('REST 仅接受回环地址请求。'),
      httpBasePath: z.string().default('/quota-nexus').description('REST/SSE 路由前缀。'),
    })
    .description('dsh-quota-nexus：多供应商额度池、调度与 0s 实时额度遥测。')
}

/** Cordis 在激活该行时用它校验并补全 config。 */
export const Config = build()
